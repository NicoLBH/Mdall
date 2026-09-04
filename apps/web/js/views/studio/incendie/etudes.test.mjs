import test from "node:test";
import assert from "node:assert/strict";

import {
  empreinteDesConclusions, ceQuiAChange, titreParDefaut, rangSuivant, etudeAOuvrir, compterLesReponses
} from "./etudes.js";

const MODULES = [
  { id: "famille", statut: "conclu", valeur: "3e famille B" },
  { id: "planchers", statut: "conclu", valeur: { degre: "CF 1h" } },
  { id: "parcs", statut: "enAttente", valeur: null, sansObjet: true }
];

test("l'ordre des modules n'entre pas dans l'empreinte", () => {
  const droite = empreinteDesConclusions(MODULES);
  const gauche = empreinteDesConclusions([...MODULES].reverse());
  assert.equal(gauche, droite);
  assert.match(droite, /^[0-9a-f]{8}$/);
});

test("une conclusion qui change change l'empreinte", () => {
  const avant = empreinteDesConclusions(MODULES);
  const apres = empreinteDesConclusions(
    MODULES.map((m) => (m.id === "planchers" ? { ...m, valeur: { degre: "CF 1h30" } } : m)));
  assert.notEqual(avant, apres);
});

test("ce qui ne décide de rien ne change pas l'empreinte", () => {
  // Un titre réécrit, un article mieux cité : la conclusion est la même.
  const avant = empreinteDesConclusions(MODULES);
  const apres = empreinteDesConclusions(MODULES.map((m) => ({ ...m, titre: "autre", article: "AR 7" })));
  assert.equal(avant, apres);
});

test("aucune conclusion ne fait aucune empreinte", () => {
  assert.equal(empreinteDesConclusions([]), "");
  assert.equal(empreinteDesConclusions(null), "");
});

test("une étude sans empreinte ne fait annoncer aucun changement", () => {
  // Elle a été enregistrée avant que l'empreinte n'existe : on ne constate
  // rien, donc on ne dit rien.
  assert.deepEqual(ceQuiAChange({ empreinte: "" }, MODULES, "V1"), { conclusions: false, referentiel: false });
});

test("l'empreinte dit qu'une conclusion a bougé, le référentiel dit qu'il a bougé", () => {
  const etude = { empreinte: empreinteDesConclusions(MODULES), referentiel: "Incendie_Habitation_V1" };

  assert.deepEqual(ceQuiAChange(etude, MODULES, "Incendie_Habitation_V1"),
    { conclusions: false, referentiel: false });

  const autres = MODULES.map((m) => (m.id === "famille" ? { ...m, valeur: "2e famille" } : m));
  assert.deepEqual(ceQuiAChange(etude, autres, "Incendie_Habitation_V2"),
    { conclusions: true, referentiel: true });
});

test("le nom par défaut porte la date, et ne se répète pas", () => {
  const le = new Date("2026-09-04T10:00:00Z");
  assert.equal(titreParDefaut([], le), "Étude du 4 septembre 2026");
  assert.equal(titreParDefaut([{ titre: "Étude du 4 septembre 2026" }], le), "Étude du 4 septembre 2026 (2)");
  assert.equal(
    titreParDefaut([{ titre: "Étude du 4 septembre 2026" }, { titre: "Étude du 4 septembre 2026 (2)" }], le),
    "Étude du 4 septembre 2026 (3)");
});

test("une étude neuve se range après les autres", () => {
  assert.equal(rangSuivant([]), 1);
  assert.equal(rangSuivant([{ rang: 3 }, { rang: 1 }]), 4);
});

test("on rouvre la dernière touchée, pas la première créée", () => {
  const etudes = [
    { id: "a", updated_at: "2026-09-01T08:00:00Z" },
    { id: "b", updated_at: "2026-09-03T08:00:00Z" },
    { id: "c", updated_at: "2026-09-02T08:00:00Z" }
  ];
  assert.equal(etudeAOuvrir(etudes)?.id, "b");
  assert.equal(etudeAOuvrir([]), null);
  // Une ligne sans identifiant n'est pas une étude : on ne l'ouvre pas.
  assert.equal(etudeAOuvrir([{ updated_at: "2030-01-01T00:00:00Z" }]), null);
});

test("le compte des réponses ne compte pas ce qui n'en est pas", () => {
  assert.equal(compterLesReponses({ reponses: { a: 1, b: false } }), 2);
  assert.equal(compterLesReponses({ reponses: null }), 0);
  assert.equal(compterLesReponses(null), 0);
});
