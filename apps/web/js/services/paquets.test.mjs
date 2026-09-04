/**
 * Le découpage d'un travail trop grand pour un envoi.
 *
 * Le défaut corrigé ici avait l'air d'une limite métier — « plus de 60 semelles
 * seraient nécessaires » — alors que c'était une limite de transport. Sept
 * appuis suffisaient à la franchir, parce que la recherche essaie neuf cotes
 * par appui.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { enPaquets, parPaquets } from "./paquets.js";

test("ce qui dépasse un envoi se découpe", () => {
  const essais = Array.from({ length: 63 }, (_, rang) => rang);
  const paquets = enPaquets(essais, 60);

  assert.deepEqual(paquets.map((paquet) => paquet.length), [60, 3]);
  // Rien ne se perd, rien ne double, et l'ordre tient.
  assert.deepEqual(paquets.flat(), essais);
});

test("ce qui tient dans un envoi part en un seul, et le vide ne part pas", () => {
  assert.equal(enPaquets(Array.from({ length: 60 }, (_, r) => r), 60).length, 1);
  assert.deepEqual(enPaquets([], 60), []);
});

test("les résultats reviennent dans l'ordre de la demande", async () => {
  // C'est la garantie qui compte : le rang d'un essai dans la réponse est celui
  // de l'essai dans la question. Sans elle, les cotes d'un appui iraient à son
  // voisin — un résultat faux qui a l'air juste.
  const liste = Array.from({ length: 25 }, (_, rang) => rang);
  const vus = [];

  const rendu = await parPaquets(liste, 10, async (paquet, rang) => {
    vus.push({ rang, taille: paquet.length });
    // Le paquet du milieu répond en dernier : recoller sur l'ordre d'arrivée
    // mélangerait les résultats.
    await new Promise((suite) => setTimeout(suite, rang === 1 ? 20 : 0));
    return paquet.map((valeur) => valeur * 2);
  });

  assert.deepEqual(rendu, liste.map((valeur) => valeur * 2));
  assert.deepEqual(vus.map((envoi) => envoi.taille), [10, 10, 5]);
});

test("une liste vide ne déclenche aucun envoi", async () => {
  let envois = 0;
  const rendu = await parPaquets([], 10, async () => { envois += 1; return []; });
  assert.deepEqual(rendu, []);
  assert.equal(envois, 0);
});

test("une taille absurde ne fait pas une boucle infinie", () => {
  assert.equal(enPaquets([1, 2, 3], 0).length, 3);
  assert.equal(enPaquets([1, 2, 3], -5).length, 3);
});
