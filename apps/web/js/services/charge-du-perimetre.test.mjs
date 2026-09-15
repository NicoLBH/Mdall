import test from "node:test";
import assert from "node:assert/strict";

import { fusionnerLesCharges } from "./charge-du-perimetre.js";

const BERTRAND = {
  subjects: [{ id: "s-1" }],
  subjectsById: { "s-1": { id: "s-1" } },
  rootSubjectIds: ["s-1"],
  labelIdsBySubjectId: { "s-1": ["lot"] },
  labels: [{ id: "lot" }],
  labelsHydrated: true,
  objectivesHydrated: true
};

const NOVACLIM = {
  subjects: [{ id: "s-2" }],
  subjectsById: { "s-2": { id: "s-2" } },
  rootSubjectIds: ["s-2"],
  labelIdsBySubjectId: { "s-2": ["chauffage"] },
  labels: [{ id: "chauffage" }],
  labelsHydrated: true,
  objectivesHydrated: true
};

test("deux chantiers font une charge", () => {
  const charge = fusionnerLesCharges([BERTRAND, NOVACLIM]);

  assert.deepEqual(charge.subjects.map((sujet) => sujet.id), ["s-1", "s-2"]);
  assert.deepEqual(Object.keys(charge.subjectsById), ["s-1", "s-2"]);
  assert.deepEqual(charge.rootSubjectIds, ["s-1", "s-2"]);
  assert.deepEqual(charge.labelIdsBySubjectId, { "s-1": ["lot"], "s-2": ["chauffage"] });
  assert.equal(charge.labels.length, 2);
});

/**
 * **Un chantier muet n'est pas un chantier vide.**
 *
 * Si les labels d'un chantier n'ont pas pu être lus, son index est vide — et
 * fusionné sans précaution, ce vide devient indiscernable d'un chantier sans
 * labels. Une situation filtrant par label s'afficherait vide, ce qui se lit
 * comme « rien à faire ici » (règle 5).
 */
test("une lecture qui a échoué quelque part n'est plus une certitude nulle part", () => {
  const muet = { ...NOVACLIM, labelIdsBySubjectId: {}, labels: [], labelsHydrated: false };
  const charge = fusionnerLesCharges([BERTRAND, muet]);

  assert.equal(charge.labelsHydrated, false, "un seul silence et l'on ne sait plus");
  assert.equal(charge.objectivesHydrated, true, "mais ce qu'on sait, on continue de le savoir");
});

/** Le même sujet cité par deux chantiers réunit ses listes plutôt que d'en perdre une. */
test("une clé qui revient réunit, elle n'écrase pas", () => {
  const charge = fusionnerLesCharges([
    { labelIdsBySubjectId: { "s-1": ["a"] } },
    { labelIdsBySubjectId: { "s-1": ["b", "a"] } }
  ]);

  assert.deepEqual(charge.labelIdsBySubjectId, { "s-1": ["a", "b"] });
});

/** Une seule charge se rend telle quelle : rien à réunir, rien à recopier. */
test("un seul chantier se rend sans détour", () => {
  assert.equal(fusionnerLesCharges([BERTRAND]), BERTRAND);
});

/**
 * Aucun chantier rend une charge vide mais **utilisable** : l'écran se dessine
 * avant que quoi que ce soit soit chargé, et il ne doit pas lever pour autant.
 */
test("aucun chantier rend une charge vide, pas une absence de charge", () => {
  const charge = fusionnerLesCharges([]);

  assert.deepEqual(charge.subjects, []);
  assert.deepEqual(charge.subjectsById, {});
  assert.deepEqual(fusionnerLesCharges().subjects, []);
  assert.deepEqual(fusionnerLesCharges([null, undefined]).subjects, []);
});

/** Les champs qui ne sont ni listes ni index gardent la première réponse reçue. */
test("le reste garde ce que le premier chantier en disait", () => {
  const charge = fusionnerLesCharges([
    { run_id: "run-1", status: "SUCCEEDED" },
    { run_id: "run-2", status: "SUCCEEDED" }
  ]);

  assert.equal(charge.run_id, "run-1");
});
