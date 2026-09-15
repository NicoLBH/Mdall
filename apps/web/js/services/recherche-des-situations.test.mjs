import test from "node:test";
import assert from "node:assert/strict";

import { phraseSansResultat, situationsQuiRepondent } from "./recherche-des-situations.js";

const CARNET = [
  { id: "s-1", title: "Ma semaine", description: "Ce que je dois avoir fini vendredi" },
  { id: "s-2", title: "Avant la réunion", description: "Les points à trancher" },
  { id: "s-3", title: "Étanchéité", description: "" }
];

/**
 * **Une recherche vide n'est pas un filtre.** Rendre zéro ferait croire à un
 * carnet vide au premier affichage, avant même qu'on ait tapé quoi que ce soit
 * (règle 5).
 */
test("une recherche vide rend le carnet entier", () => {
  assert.equal(situationsQuiRepondent(CARNET, "").length, 3);
  assert.equal(situationsQuiRepondent(CARNET, "   ").length, 3);
  assert.equal(situationsQuiRepondent(CARNET).length, 3);
});

test("un mot du titre suffit", () => {
  assert.deepEqual(situationsQuiRepondent(CARNET, "semaine").map((s) => s.id), ["s-1"]);
});

/**
 * **La description compte aussi.** Un carnet se range par intentions, et l'on
 * s'en souvient par un mot de la phrase qu'on a écrite — pas forcément du titre.
 */
test("un mot de la description suffit aussi", () => {
  assert.deepEqual(situationsQuiRepondent(CARNET, "trancher").map((s) => s.id), ["s-2"]);
});

/** On tape ce dont on se souvient, pas ce qu'on a écrit. */
test("les mots se cherchent dans n'importe quel ordre", () => {
  assert.deepEqual(situationsQuiRepondent(CARNET, "vendredi semaine").map((s) => s.id), ["s-1"]);
});

test("ni l'accent ni la casse n'empêchent de trouver", () => {
  assert.deepEqual(situationsQuiRepondent(CARNET, "ETANCHEITE").map((s) => s.id), ["s-3"]);
  assert.deepEqual(situationsQuiRepondent(CARNET, "étanchéité").map((s) => s.id), ["s-3"]);
});

/** Tous les mots, et non l'un d'eux : sinon une recherche précise élargit. */
test("deux mots restreignent, ils n'élargissent pas", () => {
  assert.deepEqual(situationsQuiRepondent(CARNET, "semaine réunion"), []);
});

/**
 * **Nommer ce qu'on a cherché.** « Aucun résultat » laisse se demander si le
 * carnet est vide ou si l'on a mal tapé — et c'est presque toujours la seconde.
 */
test("quand rien ne répond, on dit à quoi", () => {
  assert.match(phraseSansResultat("zoiseau"), /« zoiseau »/);
  assert.equal(phraseSansResultat(""), "", "un carnet vide n'est pas une recherche sans résultat");
});
