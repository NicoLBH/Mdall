/**
 * La largeur du papier, et ce qu'elle vaut à l'écran.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { formatDuDocument, largeurDeLaPage, phraseDuFormat } from "./format-du-document.js";

/**
 * **Un rapport, pas une table de formats.** Un point PostScript vaut 1/72 de
 * pouce, un pixel CSS 1/96 : la conversion vaut donc pour l'A3, le Letter et le
 * format bâtard qu'un traceur a produit. Une constante « 794 » ferait un A4
 * portrait de tous les documents — y compris des plannings en paysage, là où la
 * largeur compte le plus.
 */
test("la largeur se convertit des points du PDF aux pixels de l'écran", () => {
  assert.equal(largeurDeLaPage({ largeur: 595 }), 793);   // A4 portrait
  assert.equal(largeurDeLaPage({ largeur: 842 }), 1123);  // A4 paysage
  assert.equal(largeurDeLaPage({ largeur: 612 }), 816);   // US Letter
});

/**
 * **Zéro n'est pas « étroit »** : c'est l'absence de mesure, et l'écran doit
 * pouvoir la distinguer d'une page fine (règle 5).
 */
test("une page non mesurée rend zéro, pas une largeur supposée", () => {
  for (const page of [{}, { largeur: 0 }, { largeur: null }, { largeur: "large" }, undefined]) {
    assert.equal(largeurDeLaPage(page), 0);
  }
});

/** En deçà c'est une vignette, au-delà c'est un plan : ni l'un ni l'autre ne se compose. */
test("une taille invraisemblable ne s'applique pas", () => {
  assert.equal(largeurDeLaPage({ largeur: 40 }), 0);
  assert.equal(largeurDeLaPage({ largeur: 20000 }), 0);
});

/**
 * **La plus large, et non la plus fréquente.** Un compte rendu de douze pages
 * portrait dont une seule est un planning paysage doit pouvoir montrer ce
 * planning : le composer dans la largeur des onze autres le tronquerait. Le
 * contraire ne coûte que du blanc.
 */
test("le document prend la largeur de sa page la plus large", () => {
  const format = formatDuDocument([{ largeur: 595 }, { largeur: 842 }, { largeur: 595 }]);

  assert.equal(format.largeur, 1123);
  assert.equal(format.mesuree, 3);
  assert.equal(format.total, 3);
});

/** Les pages non mesurées ne comptent pas, et se disent. */
test("les pages non mesurées se comptent à part", () => {
  const format = formatDuDocument([{ largeur: 595 }, {}, { largeur: 0 }]);

  assert.equal(format.largeur, 793);
  assert.equal(format.mesuree, 1);
  assert.equal(format.total, 3);
});

test("un document dont aucune page ne se mesure rend zéro", () => {
  assert.deepEqual(formatDuDocument([{}, {}]), { largeur: 0, mesuree: 0, total: 2 });
  assert.deepEqual(formatDuDocument(), { largeur: 0, mesuree: 0, total: 0 });
});

/**
 * **Une phrase qui s'affiche toujours ne s'affiche plus.** Le cas normal ne se
 * commente pas ; seule l'absence de mesure parle, parce qu'elle explique
 * pourquoi la restitution s'étale au lieu de tenir dans une feuille.
 */
test("seule l'absence de mesure se dit", () => {
  assert.equal(phraseDuFormat(formatDuDocument([{ largeur: 595 }])), "");
  assert.equal(phraseDuFormat(formatDuDocument([])), "");
  assert.equal(phraseDuFormat({}), "");

  const dite = phraseDuFormat(formatDuDocument([{}, {}]));
  assert.match(dite, /n'a pas pu être lue/);
  assert.match(dite, /pleine largeur/);
});
