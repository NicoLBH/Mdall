import test from "node:test";
import assert from "node:assert/strict";

import {
  fichiersDeLaMemoire, dossiersDeLaMemoire, blameDeLaLigne, histoireDeLaLigne,
  chaleurDeLaLigne, bornesDuFichier, propositionsSansTrace, dernierVersementDe, versementsDeLaMemoire
} from "./memoire-blame.js";

const assertion = (id, cle, valeur, extra = {}) => ({
  id, subject_key: cle, kind: "base-datum", nature: "contrainte", domain: "incendie",
  status: "assumed", payload: { subject: cle, value: valeur },
  proposition_id: "p1", proposition_number: 4, decided_at: "2026-09-01T10:00:00Z",
  decided_by: "u1", superseded_by: null, supersedes: null, ...extra
});

test("un fichier ne contient que ce qui vaut aujourd'hui", () => {
  const fichiers = fichiersDeLaMemoire([
    assertion("a0", "degre-cf", "CF 1/2 h", { superseded_by: "a1" }),
    assertion("a1", "degre-cf", "CF 1 h", { supersedes: "a0" }),
    assertion("a2", "famille", "3e famille B")
  ]);

  assert.equal(fichiers.length, 1);
  assert.equal(fichiers[0].fichier, "contraintes/incendie.mdall");
  assert.deepEqual(fichiers[0].lignes.map((l) => l.payload.value), ["CF 1 h", "3e famille B"]);
});

test("ce qui a été écarté a sa section, il ne se lit pas comme acquis", () => {
  const fichiers = fichiersDeLaMemoire([
    assertion("a1", "degre-cf", "CF 1 h"),
    assertion("a2", "desenfumage", "naturel", { status: "rejected" })
  ]);

  assert.deepEqual(fichiers[0].lignes.map((l) => l.subject_key), ["degre-cf"]);
  assert.deepEqual(fichiers[0].ecartees.map((l) => l.subject_key), ["desenfumage"]);
});

test("le rangement suit la nature : deux natures font deux fichiers", () => {
  const fichiers = fichiersDeLaMemoire([
    assertion("a1", "zone-neige", "A2", { nature: "donnee-de-base", domain: "structure" }),
    assertion("a2", "hors-gel", "0,80 m", { nature: "contrainte", domain: "structure" })
  ]);

  assert.deepEqual(fichiers.map((f) => f.fichier).sort(),
    ["contraintes/structure.mdall", "donnees-de-base/structure.mdall"]);
});

test("un dossier vide ne s'affiche pas : un projet neuf n'a rien perdu", () => {
  assert.deepEqual(dossiersDeLaMemoire([]), []);
  const dossiers = dossiersDeLaMemoire([assertion("a1", "degre-cf", "CF 1 h")]);
  assert.deepEqual(dossiers.map((d) => d.nom), ["Contraintes"]);
  assert.equal(dossiers[0].lignes, 1);
});

test("le blâme d'une ligne mène à la proposition qui l'a versée", () => {
  const blame = blameDeLaLigne(assertion("a1", "degre-cf", "CF 1 h"), new Map([["u1", "Nicolas LE BIHAN"]]));

  assert.equal(blame.intitule, "#P4");
  assert.equal(blame.propositionId, "p1");
  assert.equal(blame.qui, "Nicolas LE BIHAN");
});

test("une ligne sans proposition n'est pas une ligne sans origine", () => {
  const blame = blameDeLaLigne(assertion("a1", "x", "y", { proposition_id: null, proposition_number: null }));
  assert.equal(blame.intitule, "déclarée à la main");
  assert.equal(blame.propositionId, null);
});

test("l'histoire d'une ligne remonte par les remplacements, pas par la date", () => {
  const memoire = [
    assertion("a0", "degre-cf", "CF 1/4 h", { superseded_by: "a1" }),
    assertion("a1", "degre-cf", "CF 1/2 h", { supersedes: "a0", superseded_by: "a2" }),
    assertion("a2", "degre-cf", "CF 1 h", { supersedes: "a1" })
  ];

  const histoire = histoireDeLaLigne(memoire, memoire[2]);
  assert.deepEqual(histoire.map((l) => l.payload.value), ["CF 1 h", "CF 1/2 h", "CF 1/4 h"]);
});

test("une histoire qui boucle sur elle-même s'arrête", () => {
  const boucle = [
    assertion("a1", "x", "1", { supersedes: "a2" }),
    assertion("a2", "x", "2", { supersedes: "a1" })
  ];
  assert.equal(histoireDeLaLigne(boucle, boucle[0]).length, 2);
});

test("la marge se colore par ancienneté, du plus ancien au plus récent", () => {
  const lignes = [
    assertion("a1", "x", "1", { decided_at: "2026-01-01T00:00:00Z" }),
    assertion("a2", "y", "2", { decided_at: "2026-09-01T00:00:00Z" })
  ];
  const bornes = bornesDuFichier(lignes);

  assert.equal(chaleurDeLaLigne(lignes[0], bornes), 0);
  assert.equal(chaleurDeLaLigne(lignes[1], bornes), 4);
});

test("un fichier d'une seule ligne ne se colore pas à moitié", () => {
  const seule = assertion("a1", "x", "1");
  assert.equal(chaleurDeLaLigne(seule, bornesDuFichier([seule])), 4);
});

test("une proposition fusionnée qui n'a rien laissé en mémoire se repère", () => {
  const propositions = [
    { id: "p1", status: "merged", number: 1 },
    { id: "p2", status: "merged", number: 2 },
    { id: "p3", status: "open", number: 3 }
  ];
  const memoire = [assertion("a1", "x", "1", { proposition_id: "p1" })];

  const manquantes = propositionsSansTrace(propositions, memoire);

  assert.deepEqual(manquantes.map((p) => p.id), ["p2"]);
});

test("aucune proposition fusionnée, rien à rattraper", () => {
  assert.deepEqual(propositionsSansTrace([{ id: "p1", status: "open" }], []), []);
  assert.deepEqual(propositionsSansTrace(), []);
});

test("une proposition vide n'a rien manqué de verser : la bannière se tait", () => {
  const propositions = [
    { id: "p-vide", number: 1, status: "merged" },
    { id: "p-pleine", number: 2, status: "merged" }
  ];

  // Sans la liste des propositions porteuses, on signale : ne pas savoir
  // n'autorise pas à se taire.
  assert.deepEqual(propositionsSansTrace(propositions, []).map((p) => p.id), ["p-vide", "p-pleine"]);

  const porteuses = new Set(["p-pleine"]);
  assert.deepEqual(
    propositionsSansTrace(propositions, [], { porteuses }).map((p) => p.id),
    ["p-pleine"]
  );

  // Et une fois versée, plus rien.
  assert.deepEqual(
    propositionsSansTrace(propositions, [{ proposition_id: "p-pleine" }], { porteuses }),
    []
  );
});

test("les versements se comptent en actes, pas en lignes", () => {
  const { versements, plusRecent } = versementsDeLaMemoire([
    { proposition_id: "p1", decided_at: "2026-01-10T00:00:00Z" },
    { proposition_id: "p1", decided_at: "2026-01-10T00:00:00Z" },
    { proposition_id: "p2", decided_at: "2026-03-02T00:00:00Z" },
    { id: "a-la-main", decided_at: "2026-02-01T00:00:00Z" }
  ]);

  assert.equal(versements, 3);
  assert.equal(plusRecent, "2026-03-02T00:00:00.000Z");
});

test("le dernier versement prend le titre de la proposition pour message", () => {
  const dernier = dernierVersementDe(
    [
      { proposition_id: "p1", proposition_number: 7, decided_at: "2026-01-10T00:00:00Z", decided_by: "u1" },
      { proposition_id: "p2", proposition_number: 8, decided_at: "2026-03-02T00:00:00Z", decided_by: "u2" }
    ],
    {
      auteurs: new Map([["u2", "Camille Roux"]]),
      propositions: new Map([["p2", { id: "p2", title: "Contraintes incendie du bâtiment A" }]])
    }
  );

  assert.equal(dernier.intitule, "#P8");
  assert.equal(dernier.qui, "Camille Roux");
  assert.equal(dernier.message, "Contraintes incendie du bâtiment A");
});
