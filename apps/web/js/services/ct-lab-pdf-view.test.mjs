/**
 * Le lecteur de PDF : le repérage d'une citation, et ce qu'il fait des octets.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { locateExcerpt, octetsPourPdfJs } from "./ct-lab-pdf-view.js";

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

/* ── Les octets qu'on donne au moteur ────────────────────────────────────── */

/**
 * **pdf.js prend possession du tampon et le détache.**
 *
 * Le `Uint8Array` qu'on lui a passé devient vide, et la lecture suivante des
 * mêmes octets lève `DataCloneError` — au fond d'un `try`, donc sans rien à
 * l'écran : le lecteur se vide, la barre d'outils continue de répondre, et la
 * page qu'on vient de grossir a simplement disparu.
 *
 * C'est le cas dès qu'un appelant relit le même document, ce que font tous ceux
 * qui grossissent ou pivotent. Un lecteur qui détruit ce qu'on lui donne est un
 * piège pour chacun d'eux : la copie se fait donc une fois, ici (règle 4).
 *
 * Aucune exécution ne montrerait le détachement — il demande un vrai navigateur
 * — mais la copie, si : une vue sur le tampon de l'appelant serait détachée
 * avec lui.
 */
test("les octets donnés au moteur ne sont pas ceux de l'appelant", () => {
  const siens = new Uint8Array([37, 80, 68, 70, 45]); // « %PDF- »
  const copie = octetsPourPdfJs(siens);

  assert.deepEqual([...copie], [...siens], "mêmes octets");
  assert.notEqual(copie.buffer, siens.buffer, "mais pas le même tampon");

  copie[0] = 0;
  assert.equal(siens[0], 37, "toucher la copie ne touche pas l'original");
});

test("un ArrayBuffer devient lui aussi une copie", () => {
  const tampon = new Uint8Array([1, 2, 3]).buffer;
  const copie = octetsPourPdfJs(tampon);

  assert.deepEqual([...copie], [1, 2, 3]);
  assert.notEqual(copie.buffer, tampon);
});

/**
 * **Une vue partielle ne rend pas tout le tampon.** Les octets d'une note lue
 * par morceaux arrivent parfois comme une fenêtre sur un tampon plus grand ;
 * copier le tampon entier donnerait au moteur ce qui est autour — c'est-à-dire
 * autre chose que le document.
 */
test("une vue sur une partie du tampon ne rend que cette partie", () => {
  const tout = new Uint8Array([9, 9, 37, 80, 68, 70, 9]);
  const dedans = tout.subarray(2, 6);

  assert.deepEqual([...octetsPourPdfJs(dedans)], [37, 80, 68, 70]);
});
