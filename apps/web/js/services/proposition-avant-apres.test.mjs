import test from "node:test";
import assert from "node:assert/strict";

import {
  tableauAvantApres, affirmationsDUneProposition, resumeDuTableau, CHANGEMENT
} from "./proposition-avant-apres.js";

const OUVERTE = { id: "p1", number: 4, title: "Incendie habitation", status: "open" };

function item(cle, valeur, extra = {}) {
  return {
    item_type: "base-datum",
    item_key: cle,
    payload: { subject: cle, value: valeur, nature: "contrainte", domain: "incendie" },
    status: "proposed",
    ...extra
  };
}

function assertion(id, cle, valeur, extra = {}) {
  return {
    id, subject_key: cle, kind: "base-datum", nature: "contrainte", domain: "incendie",
    statement: `${cle} : ${valeur}`, payload: { subject: cle, value: valeur },
    status: "assumed", proposition_id: null, supersedes: null, superseded_by: null, ...extra
  };
}

test("l'intendance ne s'y compare pas : un fichier n'a pas de valeur d'avant", () => {
  const garde = affirmationsDUneProposition([
    item("degre-coupe-feu", "CF 1 h"),
    { item_type: "document", item_key: "d1", payload: { name: "Rapport.pdf" } },
    { item_type: "avis", item_key: "A12", payload: {} },
    { item_type: "attachment", item_key: "af1", payload: {} }
  ]);

  assert.equal(garde.length, 1);
  assert.equal(garde[0].item_key, "degre-coupe-feu");
});

test("une ligne sans valeur d'avant est une entrée nouvelle", () => {
  const { lignes, compte } = tableauAvantApres({
    proposition: OUVERTE,
    items: [item("degre-coupe-feu", "CF 1 h")],
    assertions: []
  });

  assert.equal(lignes.length, 1);
  assert.equal(lignes[0].avant, "");
  assert.equal(lignes[0].apres, "CF 1 h");
  assert.equal(lignes[0].changement, CHANGEMENT.NOUVEAU);
  assert.equal(compte.nouveau, 1);
});

test("deux valeurs qui diffèrent font une correction, et c'est ce qu'on vient lire", () => {
  const { lignes, compte } = tableauAvantApres({
    proposition: OUVERTE,
    items: [item("degre-coupe-feu", "CF 1 h")],
    assertions: [assertion("a1", "degre-coupe-feu", "CF 1/2 h")]
  });

  assert.equal(lignes[0].avant, "CF 1/2 h");
  assert.equal(lignes[0].apres, "CF 1 h");
  assert.equal(lignes[0].changement, CHANGEMENT.CORRECTION);
  assert.equal(compte.correction, 1);
});

test("une valeur identique reste affichée : confirmer est une information", () => {
  const { lignes, compte } = tableauAvantApres({
    proposition: OUVERTE,
    items: [item("degre-coupe-feu", "CF 1 h")],
    assertions: [assertion("a1", "degre-coupe-feu", "CF 1 h")]
  });

  assert.equal(lignes[0].changement, CHANGEMENT.IDENTIQUE);
  assert.equal(compte.identique, 1);
});

test("une affirmation remplacée ne sert pas de valeur d'avant", () => {
  const { lignes } = tableauAvantApres({
    proposition: OUVERTE,
    items: [item("degre-coupe-feu", "CF 1 h")],
    assertions: [
      assertion("a0", "degre-coupe-feu", "CF 1/4 h", { superseded_by: "a1" }),
      assertion("a1", "degre-coupe-feu", "CF 1/2 h", { supersedes: "a0" })
    ]
  });

  assert.equal(lignes[0].avant, "CF 1/2 h");
});

test("un retrait vide la colonne de droite", () => {
  const { lignes, compte } = tableauAvantApres({
    proposition: OUVERTE,
    items: [item("degre-coupe-feu", "CF 1 h", { status: "refused", payload: { retrait: true, subject: "degre-coupe-feu", value: "CF 1 h" } })],
    assertions: [assertion("a1", "degre-coupe-feu", "CF 1 h")]
  });

  assert.equal(lignes[0].avant, "CF 1 h");
  assert.equal(lignes[0].apres, "");
  assert.equal(lignes[0].changement, CHANGEMENT.RETRAIT);
  assert.equal(compte.retrait, 1);
});

test("une proposition fusionnée compare ce qu'elle a écrit à ce qu'elle remplaçait", () => {
  const fusionnee = { id: "p1", number: 4, title: "Incendie", status: "merged" };
  // La mémoire porte déjà la nouvelle valeur : lire « aujourd'hui » ferait dire
  // que rien n'a changé.
  const { lignes } = tableauAvantApres({
    proposition: fusionnee,
    items: [item("degre-coupe-feu", "CF 1 h")],
    assertions: [
      assertion("a0", "degre-coupe-feu", "CF 1/2 h", { superseded_by: "a1" }),
      assertion("a1", "degre-coupe-feu", "CF 1 h", { proposition_id: "p1", supersedes: "a0" })
    ]
  });

  assert.equal(lignes[0].avant, "CF 1/2 h");
  assert.equal(lignes[0].apres, "CF 1 h");
  assert.equal(lignes[0].changement, CHANGEMENT.CORRECTION);
});

test("une mémoire illisible ne fait passer aucune ligne pour nouvelle", () => {
  const { lignes, memoireLue, compte } = tableauAvantApres({
    proposition: OUVERTE,
    items: [item("degre-coupe-feu", "CF 1 h")],
    assertions: null
  });

  assert.equal(memoireLue, false);
  assert.equal(lignes[0].changement, CHANGEMENT.INCONNU);
  assert.equal(compte.nouveau, 0);
  assert.match(resumeDuTableau({ compte, memoireLue }), /n'a pas pu être lue/);
});

test("les lignes se rangent par domaine du métier, puis par sujet", () => {
  const { lignes } = tableauAvantApres({
    proposition: OUVERTE,
    items: [
      item("zone-de-neige", "A1", { payload: { subject: "Zone de neige", value: "A1", domain: "structure" } }),
      item("degre-coupe-feu", "CF 1 h", { payload: { subject: "Degré coupe-feu", value: "CF 1 h", domain: "incendie" } }),
      item("contrainte-de-sol", "2 bars", { payload: { subject: "Contrainte de sol", value: "2 bars", domain: "sol" } })
    ],
    assertions: []
  });

  assert.deepEqual(lignes.map((ligne) => ligne.domaine), ["structure", "sol", "incendie"]);
});

test("le résumé met les corrections en tête : c'est ce qui engage", () => {
  const resume = resumeDuTableau({ compte: { correction: 2, nouveau: 1, retrait: 0, identique: 5 }, memoireLue: true });
  assert.match(resume, /^2 corrections · 1 entrée nouvelle · 5 valeurs confirmées$/);
});

test("une nature écrite prime sur celle qu'on déduirait du type", () => {
  const { lignes } = tableauAvantApres({
    proposition: OUVERTE,
    items: [item("degre-coupe-feu", "CF 1 h", { payload: { subject: "Degré", value: "CF 1 h", nature: "contrainte", domain: "incendie" } })],
    assertions: []
  });

  assert.equal(lignes[0].nature, "contrainte");
  assert.equal(lignes[0].domaineLabel, "Incendie");
});
