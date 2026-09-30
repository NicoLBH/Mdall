/**
 * Le découpage en lots, et ce qu'il refuse de faire.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { PAR_LOT, lesLots, rendreLaMain } from "./par-lots.js";

test("les éléments se découpent en lots de la taille demandée", () => {
  assert.deepEqual(lesLots([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(lesLots([1, 2], 5), [[1, 2]]);
  assert.deepEqual(lesLots([], 5), []);
  assert.deepEqual(lesLots(null, 5), []);
});

/**
 * **Jamais zéro ni moins.** Une taille de lot nulle ferait une boucle qui ne
 * termine pas, sur un écran qu'on n'aurait plus aucun moyen de quitter.
 */
test("une taille absurde retombe sur quelque chose qui termine", () => {
  assert.deepEqual(lesLots([1, 2, 3], 0), lesLots([1, 2, 3], PAR_LOT));
  assert.deepEqual(lesLots([1, 2, 3], -4), [[1], [2], [3]]);
  assert.deepEqual(lesLots([1, 2, 3], 1.7), [[1], [2], [3]]);
  assert.deepEqual(lesLots([1, 2, 3], null), lesLots([1, 2, 3], PAR_LOT));
});

/** Rien n'est perdu ni répété au découpage. */
test("les lots remis bout à bout redonnent la liste", () => {
  const vingtSix = Array.from({ length: 26 }, (un, rang) => rang);
  assert.deepEqual(lesLots(vingtSix, PAR_LOT).flat(), vingtSix);
  assert.equal(lesLots(vingtSix, PAR_LOT).length, 6);
});

/**
 * **Le lot doit être une poignée, pas un fichier ni la liste entière.** Un lot
 * de un redessine l'écran vingt-six fois ; un lot de cinquante ne montre plus
 * rien.
 */
test("la taille par défaut est une poignée", () => {
  assert.equal(PAR_LOT > 1 && PAR_LOT <= 10, true, String(PAR_LOT));
});

/**
 * **`setTimeout`, pas une promesse déjà tenue.** Celle-ci reprend la main dans
 * le même tour de boucle : le navigateur n'a pas l'occasion de peindre, et
 * l'écran reste figé exactement comme avant.
 */
test("rendre la main laisse passer un tour de boucle", async () => {
  const ordre = [];
  setTimeout(() => ordre.push("boucle"), 0);
  Promise.resolve().then(() => ordre.push("promesse"));

  await rendreLaMain();
  assert.equal(ordre.includes("boucle"), true,
    "la main n'a pas été rendue à la boucle d'événements");
});
