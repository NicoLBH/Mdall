import test from "node:test";
import assert from "node:assert/strict";

import { locateExcerpt } from "./ct-lab-pdf-view.js";

/** Ce que pdf.js rend : des fragments, découpés selon la mise en page. */
const ITEMS = [
  { str: "L'emplacement des dispositifs de" },
  { str: "coupure prévus dans le sas" },
  { str: "principal est à reporter sur le plan." }
];

test("une phrase citée est localisée sur les fragments qui la portent", () => {
  const found = locateExcerpt(ITEMS, "L'emplacement des dispositifs de coupure prévus dans le sas principal est à reporter sur le plan.");

  assert.equal(found.from, 0);
  assert.equal(found.to, 2);
});

test("accents et casse ne font pas échouer la localisation", () => {
  const found = locateExcerpt(ITEMS, "L'EMPLACEMENT DES DISPOSITIFS DE COUPURE PREVUS DANS LE SAS");

  assert.equal(found.from, 0);
  assert.equal(found.to, 1);
});

test("un extrait plus long que le texte rendu retombe sur son préfixe", () => {
  // Les deux lectures du PDF ne découpent pas le texte de la même façon :
  // l'extrait cité peut contenir des morceaux que pdf.js place ailleurs.
  const found = locateExcerpt(
    ITEMS,
    "L'emplacement des dispositifs de coupure prévus dans le sas principal au § 4.5.2 et §7.5.2 du CCTP est à reporter."
  );

  assert.equal(found.from, 0);
  assert.ok(found.matched.length >= 24, "on ne surligne pas sur trois mots");
});

test("une phrase absente n'est pas surlignée au hasard", () => {
  assert.equal(locateExcerpt(ITEMS, "cette phrase ne figure pas sur la page"), null);
});

test("un extrait trop court ne déclenche aucun surlignage", () => {
  // « le » se trouve partout : surligner là-dessus tromperait le lecteur sur
  // ce que le document dit vraiment.
  assert.equal(locateExcerpt(ITEMS, "le"), null);
  assert.equal(locateExcerpt(ITEMS, ""), null);
});

test("les fragments vides ne décalent pas l'index", () => {
  const withHoles = [{ str: "" }, ITEMS[0], { str: null }, ITEMS[1], ITEMS[2]];
  const found = locateExcerpt(withHoles, "coupure prévus dans le sas principal");

  assert.equal(withHoles[found.from].str, "coupure prévus dans le sas");
  assert.equal(withHoles[found.to].str, "principal est à reporter sur le plan.");
});
