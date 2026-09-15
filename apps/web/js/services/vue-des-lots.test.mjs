/**
 * La vue qui range un chantier par lot.
 *
 * Ce qui est éprouvé ici : les trois cas où elle ne se propose **pas**. Une vue
 * proposée à tort est une vue qu'on enregistre, qui prend une place dans un rail
 * court, et qu'on ne retire jamais.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  REQUETE_DES_LOTS, VUE_DES_LOTS, laVueDesLotsSePropose, phraseDeLaVueDesLots
} from "./vue-des-lots.js";
import { LABEL_DU_LOT } from "./label-du-cr.js";

/** Le nom du label vit à un seul endroit, et la requête le lit. */
test("la requête se compose du label, pas d'une chaîne recopiée", () => {
  assert.equal(REQUETE_DES_LOTS, `label:${LABEL_DU_LOT}`);
  assert.equal(VUE_DES_LOTS.requete, REQUETE_DES_LOTS);
  assert.equal(VUE_DES_LOTS.nom, "Lots");
});

test("la vue se propose quand le projet a des lots et pas encore la vue", () => {
  assert.equal(laVueDesLotsSePropose([], 14), true);
  assert.equal(laVueDesLotsSePropose([{ requete: "is:open" }], 14), true);
});

/** Le projet la porte déjà : la reproposer ferait douter de celle qui existe. */
test("une vue déjà là ne se repropose pas, quelle que soit sa graphie", () => {
  assert.equal(laVueDesLotsSePropose([{ requete: REQUETE_DES_LOTS }], 14), false);
  assert.equal(laVueDesLotsSePropose([{ requete: "  label:lot  " }], 14), false);
  // La forme que la base rend s'écrit `query` : les deux se lisent.
  assert.equal(laVueDesLotsSePropose([{ query: "LABEL:LOT" }], 14), false);
});

/**
 * **Ne pas savoir n'autorise pas à proposer.** Une vue créée en double parce
 * qu'on n'a pas pu lire celles du projet prendrait une place dans un rail court,
 * et personne ne la retirerait (règle 5).
 */
test("sans les vues du projet, on ne propose rien", () => {
  assert.equal(laVueDesLotsSePropose(null, 14), false);
  assert.equal(laVueDesLotsSePropose(undefined, 14), false);
});

/**
 * **Une vue qui ne rendrait rien ferait croire que le chantier n'a pas de
 * lots**, alors qu'il n'a pas encore été rangé. On ne propose que ce qui
 * montrera quelque chose.
 */
test("sans lot ouvert, la vue ne se propose pas", () => {
  assert.equal(laVueDesLotsSePropose([], 0), false);
  assert.equal(laVueDesLotsSePropose([]), false);
});

test("la phrase dit combien de lots la vue rassemblerait", () => {
  assert.match(phraseDeLaVueDesLots(14), /14 lots/);
  assert.match(phraseDeLaVueDesLots(1), /1 lot\b/);
});
