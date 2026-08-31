import test from "node:test";
import assert from "node:assert/strict";

import {
  FIGURE,
  describeRowOf,
  inkRatio,
  isFigure,
  isFigureRect,
  multiplyMatrices,
  readTableColumns,
  rectFromImageMatrix,
  toCanvasRect,
  trimBlankMargins
} from "./avis-figures.js";

// La mise en page d'une fiche d'avis travaux, relevée sur un rapport réel :
// quatre colonnes déclarées par leurs en-têtes, une rubrique par ligne, une
// lettre d'avis à mi-hauteur, un numéro seulement quand l'avis est défavorable.
const ITEMS = [
  { text: "Éléments examinés", x: 106, y: 772, width: 95, height: 10 },
  { text: "Avis*", x: 274, y: 772, width: 25, height: 10 },
  { text: "Observations et commentaires", x: 334, y: 772, width: 149, height: 10 },
  { text: "N°", x: 534, y: 772, width: 11, height: 10 },

  { text: "Principe d'étanchéité", x: 37, y: 756, width: 94, height: 10 },
  { text: "F", x: 281, y: 653, width: 6, height: 10 },

  { text: "Structure béton armé ou précontraint", x: 37, y: 534, width: 167, height: 10 },
  { text: "Absence de quelques U horizontaux", x: 300, y: 534, width: 187, height: 10 },
  { text: "à compléter avant coulage", x: 300, y: 511, width: 119, height: 10 },
  { text: "D", x: 281, y: 432, width: 7, height: 10 },
  { text: "382", x: 531, y: 432, width: 17, height: 10 }
];

const PHOTO_HAUTE = { x: 37, y: 574, width: 231, height: 174 };
const PHOTO_BASSE = { x: 37, y: 352, width: 231, height: 174 };

test("une matrice pose une image à un endroit précis", () => {
  // C'est ce qui remplace la bande devinée sous un texte : le PDF dit où il
  // pose ses images, il suffit de le suivre.
  const rect = rectFromImageMatrix([231, 0, 0, 174, 37, 574]);

  assert.deepEqual(rect, { x: 37, y: 574, width: 231, height: 174 });
});

test("une image retournée occupe quand même son rectangle", () => {
  const rect = rectFromImageMatrix([231, 0, 0, -174, 37, 748]);

  assert.deepEqual(rect, { x: 37, y: 574, width: 231, height: 174 });
});

test("deux matrices s'enchaînent", () => {
  const identite = [1, 0, 0, 1, 0, 0];
  assert.deepEqual(multiplyMatrices([2, 0, 0, 3, 10, 20], identite), [2, 0, 0, 3, 10, 20]);
  assert.deepEqual(multiplyMatrices([1, 0, 0, 1, 5, 5], [1, 0, 0, 1, 10, 20]), [1, 0, 0, 1, 15, 25]);
});

test("un logo et un bandeau ne sont pas des figures", () => {
  // Relevés sur le rapport : le logo fait 57 × 55, le bandeau d'en-tête
  // 461 × 52. La hauteur les trie tous les deux sans les connaître.
  assert.equal(isFigureRect({ x: 510, y: 790, width: 38, height: 37 }), false);
  assert.equal(isFigureRect({ x: 504, y: 746, width: 57, height: 55 }), false);
  assert.equal(isFigureRect({ x: 34, y: 744, width: 461, height: 52 }), false);
  assert.equal(isFigureRect(PHOTO_HAUTE), true);
  assert.equal(isFigureRect(null), false);
});

test("les colonnes sont celles que le document déclare", () => {
  // Aucune abscisse n'est supposée : la fiche écrit ses en-têtes.
  const colonnes = readTableColumns(ITEMS);

  assert.ok(colonnes.elements.right < 274, "la colonne des éléments s'arrête avant celle des avis");
  assert.ok(colonnes.avis.left <= 274 && colonnes.avis.right < 334);
  assert.equal(colonnes.headerY, 772);
});

test("un document sans en-têtes ne rend pas de colonnes", () => {
  // On ne lit pas des colonnes dans un document qui n'en a pas : deviner ferait
  // rattacher des figures à des lignes inventées.
  assert.equal(readTableColumns([{ text: "Un rapport ordinaire", x: 60, y: 700, width: 200, height: 10 }]), null);
  assert.equal(readTableColumns([]), null);
});

test("une photo appartient à la ligne dont elle porte la rubrique", () => {
  const ligne = describeRowOf(ITEMS, PHOTO_HAUTE, readTableColumns(ITEMS));

  assert.equal(ligne.rubric, "Principe d'étanchéité");
  assert.equal(ligne.letter, "F");
  assert.equal(ligne.number, "", "une ligne favorable ne porte pas de numéro");
  assert.equal(ligne.observation, "");
});

test("un numéro n'est lu que sur sa propre ligne", () => {
  // C'est le défaut qu'on corrige : le numéro 382 appartient à la ligne
  // défavorable. L'attribuer à la ligne favorable qui porte le même intitulé
  // fabriquerait un avis qui n'existe pas.
  const basse = describeRowOf(ITEMS, PHOTO_BASSE, readTableColumns(ITEMS));

  assert.equal(basse.rubric, "Structure béton armé ou précontraint");
  assert.equal(basse.letter, "D");
  assert.equal(basse.number, "382");
  assert.equal(
    basse.observation,
    "Absence de quelques U horizontaux à compléter avant coulage",
    "les lignes se lisent de haut en bas, donc par ordonnées décroissantes"
  );

  const haute = describeRowOf(ITEMS, PHOTO_HAUTE, readTableColumns(ITEMS));
  assert.equal(haute.number, "", "la ligne du dessus n'hérite pas du numéro de celle du dessous");
});

test("sans colonnes, on ne décrit aucune ligne", () => {
  assert.deepEqual(describeRowOf(ITEMS, PHOTO_HAUTE, null), {
    rubric: "",
    letter: "",
    number: "",
    observation: ""
  });
});

function image(width, height, painter) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  painter?.((x, y, r, g, b) => {
    const rang = (y * width + x) * 4;
    data[rang] = r;
    data[rang + 1] = g;
    data[rang + 2] = b;
    data[rang + 3] = 255;
  });
  return { data, width, height };
}

test("une image blanche n'est pas une figure", () => {
  // La géométrie ne suffit pas : une image posée peut être un cadre blanc.
  assert.equal(inkRatio(image(40, 40)), 0);
  assert.equal(isFigure(0), false);
  assert.equal(isFigure(FIGURE.MIN_INK_RATIO), true);
});

test("une photographie n'est pas écartée pour être trop pleine", () => {
  // Un plafond d'encre écartait quatre photos sur cinq d'un rapport réel : une
  // photo couvre à peu près tous ses pixels, c'est ce qu'est une photo.
  const pleine = image(20, 20, (poser) => {
    for (let y = 0; y < 20; y += 1) for (let x = 0; x < 20; x += 1) poser(x, y, 30, 40, 50);
  });

  assert.equal(inkRatio(pleine), 1);
  assert.equal(isFigure(1), true);
});

test("un pixel transparent est du papier, pas de l'encre", () => {
  assert.equal(inkRatio({ data: new Uint8ClampedArray(4 * 16), width: 4, height: 4 }), 0);
});

test("le blanc autour d'une figure se rogne", () => {
  const peinte = image(40, 40, (poser) => {
    for (let y = 16; y < 24; y += 1) for (let x = 16; x < 24; x += 1) poser(x, y, 10, 10, 10);
  });

  assert.deepEqual(trimBlankMargins(peinte, { padding: 2 }), { x: 14, y: 14, width: 12, height: 12 });
  assert.equal(trimBlankMargins(image(20, 20)), null);
});

test("le PDF compte ses y depuis le bas, un canevas depuis le haut", () => {
  const rect = toCanvasRect({ x: 60, y: 400, width: 480, height: 200 }, { pageHeight: 842, scale: 2 });

  assert.deepEqual(rect, { x: 120, y: (842 - 400 - 200) * 2, width: 960, height: 400 });
  assert.equal(toCanvasRect(null, { pageHeight: 842 }), null);
});

test("un intitulé qui passe à la ligne reste un intitulé", () => {
  // « Etanchéité de toiture - élément porteur / béton » : ne prendre que la
  // ligne la plus proche de l'image rendait la rubrique « béton », ce qui ne
  // désigne rien.
  const items = [
    { text: "Éléments examinés", x: 98, y: 773, width: 111, height: 10 },
    { text: "Avis*", x: 274, y: 773, width: 29, height: 10 },
    { text: "N°", x: 533, y: 773, width: 14, height: 10 },
    { text: "Etanchéité de toiture - élément porteur", x: 37, y: 759, width: 201, height: 10 },
    { text: "béton", x: 37, y: 747, width: 30, height: 10 }
  ];

  const ligne = describeRowOf(items, { x: 37, y: 565, width: 231, height: 174 }, readTableColumns(items));

  assert.equal(ligne.rubric, "Etanchéité de toiture - élément porteur béton");
});

test("une cellule d'avis vide reste vide", () => {
  // Sur un rapport réel, la première ligne d'une page n'en portait aucun : le
  // document lui-même laisse la case blanche. Lui prêter la lettre de la ligne
  // voisine inventerait un avis.
  const items = [
    { text: "Éléments examinés", x: 98, y: 773, width: 111, height: 10 },
    { text: "Avis*", x: 274, y: 773, width: 29, height: 10 },
    { text: "Structure béton armé ou précontraint", x: 37, y: 759, width: 192, height: 10 },
    { text: "Structure béton armé ou précontraint", x: 37, y: 548, width: 192, height: 10 },
    { text: "F", x: 282, y: 451, width: 6, height: 10 }
  ];

  const premiere = describeRowOf(items, { x: 37, y: 577, width: 231, height: 174 }, readTableColumns(items));
  assert.equal(premiere.letter, "", "la case est blanche sur le rapport : elle le reste ici");

  const seconde = describeRowOf(items, { x: 37, y: 366, width: 231, height: 174 }, readTableColumns(items));
  assert.equal(seconde.letter, "F");
});
