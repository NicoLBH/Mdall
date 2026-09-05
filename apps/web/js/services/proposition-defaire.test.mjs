import test from "node:test";
import assert from "node:assert/strict";

import {
  ceQuUnePropositionADonne, itemsPourDefaire, titreDuDefaire, descriptionDuDefaire,
  itemsPourRetirerDesDocuments, descriptionDuRetrait, RETRAIT
} from "./proposition-defaire.js";

const PROPOSITION = { id: "p1", number: 12, title: "Zones climatiques", merged_at: "2026-09-04T10:00:00Z" };

function assertion(id, cle, valeur, extra = {}) {
  return {
    id, subject_key: cle, kind: "base-datum", nature: "contrainte", domain: "structure",
    statement: `${cle} : ${valeur}`, payload: { subject: cle, value: valeur },
    proposition_id: null, supersedes: null, superseded_by: null, zones: null, ...extra
  };
}

test("ce qu'une proposition a écrit se lit dans la mémoire", () => {
  const avant = assertion("a0", "zone-de-neige", "A1", { superseded_by: "a1" });
  const apres = assertion("a1", "zone-de-neige", "A2", { proposition_id: "p1", supersedes: "a0" });
  const neuve = assertion("a2", "zone-de-vent", "2", { proposition_id: "p1" });

  const rendu = ceQuUnePropositionADonne(PROPOSITION, [avant, apres, neuve]);

  assert.equal(rendu.restaurations.length, 1);
  assert.equal(rendu.restaurations[0].avant.id, "a0");
  assert.equal(rendu.retraits.length, 1);
  assert.equal(rendu.retraits[0].ecrite.id, "a2");
  assert.deepEqual(rendu.depassees, []);
});

test("une affirmation déjà remplacée depuis n'est pas défaite", () => {
  // La défaire ressusciterait une valeur périmée par-dessus un choix
  // postérieur, que personne n'a demandé de défaire.
  const posee = assertion("a1", "zone-de-neige", "A2", { proposition_id: "p1", superseded_by: "a9" });
  const rendu = ceQuUnePropositionADonne(PROPOSITION, [posee]);

  assert.deepEqual(rendu.restaurations, []);
  assert.deepEqual(rendu.retraits, []);
  assert.equal(rendu.depassees.length, 1);
});

test("une restauration remet la valeur d'avant, telle qu'elle était", () => {
  const avant = assertion("a0", "zone-de-neige", "A1", { superseded_by: "a1", zones: ["batiment-b"] });
  const apres = assertion("a1", "zone-de-neige", "A2", { proposition_id: "p1", supersedes: "a0" });

  const [item] = itemsPourDefaire({ restaurations: [{ ecrite: apres, avant }] });

  assert.equal(item.itemKey, "zone-de-neige");
  assert.equal(item.payload.value, "A1");
  assert.deepEqual(item.payload.zones, ["batiment-b"]);
  assert.equal(item.status, "proposed");
  // La ligne dit ce qu'elle remplace, sans qu'on ait à ouvrir l'histoire.
  assert.equal(item.payload.defait.valeur, "A2");
});

test("un retrait est un item refusé — c'est ce que la fusion sait appliquer", () => {
  const neuve = assertion("a2", "zone-de-vent", "2", { proposition_id: "p1" });
  const [item] = itemsPourDefaire({ retraits: [{ ecrite: neuve }] });

  assert.equal(item.status, RETRAIT);
  assert.equal(item.status, "refused");
  assert.equal(item.payload.retrait, true);
  assert.equal(item.payload.value, "2");
});

test("un document retiré est un item de document, refusé", () => {
  const [item] = itemsPourRetirerDesDocuments([{ id: "d1", original_filename: "plan.pdf" }]);

  assert.equal(item.itemType, "document");
  assert.equal(item.itemKey, "d1");
  assert.equal(item.status, "refused");
  assert.equal(item.payload.name, "plan.pdf");
});

test("un item sans clé n'entre pas", () => {
  assert.deepEqual(itemsPourRetirerDesDocuments([{ original_filename: "sans-id.pdf" }]), []);
  assert.deepEqual(itemsPourDefaire({}), []);
});

test("le titre dit quelle proposition on défait", () => {
  assert.equal(titreDuDefaire(PROPOSITION), "Défaire #12 — Zones climatiques");
  assert.equal(titreDuDefaire({ title: "Sans numéro" }), "Défaire — Sans numéro");
});

test("la description dit ce qui est remis, écarté, et ce qui ne l'est pas", () => {
  const avant = assertion("a0", "zone-de-neige", "A1");
  const apres = assertion("a1", "zone-de-neige", "A2", { proposition_id: "p1", supersedes: "a0" });
  const neuve = assertion("a2", "zone-de-vent", "2", { proposition_id: "p1" });
  const depassee = assertion("a3", "altitude", "241 m", { proposition_id: "p1", superseded_by: "a9" });

  const texte = descriptionDuDefaire({
    proposition: PROPOSITION,
    restaurations: [{ ecrite: apres, avant }],
    retraits: [{ ecrite: neuve }],
    depassees: [depassee],
    documents: [{ id: "d1", original_filename: "plan.pdf" }]
  });

  assert.match(texte, /Revient sur la proposition #12, fusionnée le 4 septembre 2026/);
  assert.match(texte, /Rien n'est effacé/);
  assert.match(texte, /zone-de-neige : A1 _\(au lieu de A2\)_/);
  assert.match(texte, /zone-de-vent : 2/);
  assert.match(texte, /plan\.pdf/);
  // Ce qui n'est pas défait se dit : taire cela ferait croire à un retour
  // complet qui n'a pas eu lieu.
  assert.match(texte, /n'est pas défaite.*décision plus récente/s);
});

test("le retrait d'un document dit qu'il n'est pas effacé", () => {
  const texte = descriptionDuRetrait([{ id: "d1", original_filename: "plan.pdf" }], "Déposé par erreur.");

  assert.match(texte, /Retire un document du corpus/);
  assert.match(texte, /- plan\.pdf/);
  assert.match(texte, /Déposé par erreur\./);
  assert.match(texte, /n'est pas effacé/);
  assert.match(texte, /tant que cette proposition\s*\n?\s*n'est pas signée/);
});
