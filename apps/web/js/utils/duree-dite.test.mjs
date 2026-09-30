import test from "node:test";
import assert from "node:assert/strict";

import { PAS_DE_DUREE, dureeDite } from "./duree-dite.js";

test("sous la seconde, on dit que cela a été rapide", () => {
  // « 681 ms » ne se lit pas : personne ne sait combien cela fait.
  assert.equal(dureeDite(681), "moins d'une seconde");
  assert.equal(dureeDite(12), "moins d'une seconde");
  assert.equal(dureeDite(999), "moins d'une seconde");
  assert.doesNotMatch(dureeDite(681), /ms/);
});

test("les secondes s'accordent", () => {
  assert.equal(dureeDite(1000), "1 seconde");
  assert.equal(dureeDite(1400), "1 seconde");
  assert.equal(dureeDite(2000), "2 secondes");
  assert.equal(dureeDite(59_000), "59 secondes");
});

test("les minutes, avec leurs secondes quand il y en a", () => {
  assert.equal(dureeDite(60_000), "1 minute");
  assert.equal(dureeDite(90_000), "1 min 30 s");
  assert.equal(dureeDite(120_000), "2 minutes");
  assert.equal(dureeDite(3_599_000), "59 min 59 s");
});

test("les heures, avec leurs minutes quand il y en a", () => {
  assert.equal(dureeDite(3_600_000), "1 heure");
  assert.equal(dureeDite(5_400_000), "1 h 30 min");
  assert.equal(dureeDite(7_200_000), "2 heures");
});

test("une durée absente n'est pas une durée nulle", () => {
  // `Number(null)` vaut 0 : sans ce test, une exécution jamais chronométrée
  // s'affiche « instantanée ».
  assert.equal(dureeDite(null), PAS_DE_DUREE);
  assert.equal(dureeDite(undefined), PAS_DE_DUREE);
  assert.equal(dureeDite(""), PAS_DE_DUREE);
  assert.equal(dureeDite("bonjour"), PAS_DE_DUREE);
  assert.equal(dureeDite(-5), PAS_DE_DUREE, "une durée négative n'en est pas une");
});

test("zéro milliseconde est une durée, et elle se dit", () => {
  // Elle a été mesurée : c'est différent de ne pas l'avoir été.
  assert.equal(dureeDite(0), "moins d'une seconde");
});
