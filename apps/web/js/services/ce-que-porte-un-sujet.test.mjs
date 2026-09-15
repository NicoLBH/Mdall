import test from "node:test";
import assert from "node:assert/strict";

import {
  assignesDuSujet,
  cePortePar,
  labelsDuSujet,
  objectifsDuSujet
} from "./ce-que-porte-un-sujet.js";

const SUJET = "sujet-1";

/**
 * **La panne d'origine.** La résolution des situations automatiques ne lisait
 * que la surcouche de l'écran, que rien ne remplit tant qu'on n'a rien modifié
 * à la main. Un filtre par label ou par assigné ne trouvait donc aucun sujet,
 * et la situation s'affichait vide — ce qui se lit comme « rien à faire ici ».
 */
test("ce que la base sait se lit, même sans rien avoir modifié à l'écran", () => {
  const index = { [SUJET]: ["label-a", "label-b"] };

  assert.deepEqual(labelsDuSujet({ index, surcouche: {}, sujet: SUJET }), ["label-a", "label-b"]);
  assert.deepEqual(objectifsDuSujet({ index: { [SUJET]: ["obj-1"] }, sujet: SUJET }), ["obj-1"]);
  assert.deepEqual(assignesDuSujet({ index: { [SUJET]: ["p-1"] }, sujet: SUJET }), ["p-1"]);
});

/**
 * **Ce qu'on vient de poser à l'écran doit se voir tout de suite.** Sinon
 * cocher un label ferait disparaître le sujet de la situation qu'on regarde,
 * le temps d'un aller-retour avec la base.
 */
test("la surcouche de l'écran passe devant la charge", () => {
  const index = { [SUJET]: ["label-a"] };
  const surcouche = { [SUJET]: { labels: ["label-z"] } };

  assert.deepEqual(labelsDuSujet({ index, surcouche, sujet: SUJET }), ["label-z"]);
});

/**
 * **Une surcouche absente n'est pas une liste vide.** Elle dit « rien n'a
 * changé ici », et c'est la charge qui répond. Confondre les deux viderait
 * tous les sujets dès qu'un seul a été modifié.
 */
test("un sujet noté à l'écran pour un champ n'efface pas les autres", () => {
  const surcouche = { [SUJET]: { assignees: ["p-9"] } };

  // Le sujet a une surcouche, mais pas pour les labels : la charge répond.
  assert.deepEqual(labelsDuSujet({ index: { [SUJET]: ["label-a"] }, surcouche, sujet: SUJET }), ["label-a"]);
  assert.deepEqual(assignesDuSujet({ index: {}, surcouche, sujet: SUJET }), ["p-9"]);
});

/** Et une surcouche qui a vidé la liste dit bien « plus rien ». */
test("une liste vidée à l'écran est une décision, pas une absence", () => {
  const index = { [SUJET]: ["label-a"] };
  const surcouche = { [SUJET]: { labels: [] } };

  assert.deepEqual(labelsDuSujet({ index, surcouche, sujet: SUJET }), []);
});

/** Le filtre compare en minuscules : les labels arrivent donc en minuscules. */
test("les labels se comparent en minuscules", () => {
  assert.deepEqual(labelsDuSujet({ index: { [SUJET]: ["Gros Œuvre", "LOT"] }, sujet: SUJET }), ["gros œuvre", "lot"]);
});

/** Les blancs et les doublons d'une liste ne comptent pas deux fois. */
test("un identifiant écrit deux fois ne compte qu'une", () => {
  assert.deepEqual(
    cePortePar({ index: { [SUJET]: ["a", " ", "a", null, "b"] }, champ: "labels", sujet: SUJET }),
    ["a", "b"]
  );
});

/** Rien à lire ne lève pas : un écran se dessine avant que tout soit chargé. */
test("sans charge et sans sujet, on ne devine rien et on ne casse rien", () => {
  assert.deepEqual(cePortePar(), []);
  assert.deepEqual(labelsDuSujet({ sujet: SUJET }), []);
  assert.deepEqual(labelsDuSujet({ index: { [SUJET]: ["a"] }, sujet: "" }), []);
});
