import test from "node:test";
import assert from "node:assert/strict";

import {
  FIGURE,
  expandBlockToParagraph,
  figureZoneBelow,
  inkRatio,
  isFigure,
  locateTextBlock,
  pageTextBounds,
  toCanvasRect,
  trimBlankMargins
} from "./avis-figures.js";

// Une page de rapport : un avis en haut, une photo dessous, un paragraphe plus bas.
const ITEMS = [
  { text: "Avis 145 — Fissuration en pied de voile", x: 60, y: 700, width: 300, height: 10 },
  { text: "constatée lors de la visite du 12 août", x: 60, y: 688, width: 280, height: 10 },
  { text: "Avis 146 — Ventilation du local technique", x: 60, y: 400, width: 300, height: 10 }
];

test("un avis se retrouve sur la page par ses mots longs", () => {
  const bloc = locateTextBlock(ITEMS, "Fissuration en pied de voile");

  assert.equal(bloc.top, 710);
  assert.equal(bloc.bottom, 700);
  assert.equal(bloc.left, 60);
});

test("des mots trop courts ne localisent rien", () => {
  // Chercher « de » trouverait la page entière ; placer la bande au jugé
  // produirait une figure qui n'illustre pas ce qu'elle prétend illustrer.
  assert.equal(locateTextBlock(ITEMS, "de la"), null);
  assert.equal(locateTextBlock(ITEMS, ""), null);
});

test("un extrait introuvable ne donne pas de bande", () => {
  assert.equal(locateTextBlock(ITEMS, "acoustique du plancher haut"), null);
  assert.equal(figureZoneBelow(ITEMS, null, {}), null);
});

test("la bande s'arrête au texte suivant", () => {
  // Une bande qui l'engloberait afficherait des phrases comme si elles
  // faisaient partie de l'image.
  const bloc = locateTextBlock(ITEMS, "Fissuration en pied de voile");
  const zone = figureZoneBelow(ITEMS, bloc, { textWidth: 480, textLeft: 60 });

  assert.equal(zone.y, 414, "le haut du bloc suivant, plus la marge");
  assert.equal(zone.height, 696 - 414, "jusqu'au bas de l'avis, moins la marge");
  assert.equal(zone.width, 480);
});

test("sans rien en dessous, la bande descend jusqu'à la marge basse", () => {
  const bloc = locateTextBlock(ITEMS, "Ventilation du local technique");
  const zone = figureZoneBelow(ITEMS, bloc, { textWidth: 480, textLeft: 60, marginBottom: 50 });

  assert.equal(zone.y, 50);
  assert.equal(zone.height, 396 - 50);
});

test("un interligne n'est pas une figure", () => {
  const items = [
    { text: "Avis 145 — Fissuration en pied de voile", x: 60, y: 700, width: 300, height: 10 },
    { text: "Paragraphe suivant, juste dessous", x: 60, y: 670, width: 300, height: 10 }
  ];
  const bloc = locateTextBlock(items, "Fissuration en pied de voile");

  assert.equal(figureZoneBelow(items, bloc, { textWidth: 480 }), null, "vingt points ne font pas une photo");
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

test("une bande blanche ne porte pas d'encre", () => {
  assert.equal(inkRatio(image(40, 40)), 0);
  assert.equal(isFigure(0), false, "un rectangle blanc affiché comme une figure ferait douter de l'écran entier");
});

test("une bande peinte porte de l'encre", () => {
  const peinte = image(40, 40, (poser) => {
    for (let y = 0; y < 40; y += 1) for (let x = 0; x < 40; x += 1) poser(x, y, 20, 20, 20);
  });

  assert.equal(inkRatio(peinte), 1);
  assert.equal(isFigure(1), false, "une page entièrement noire est un fond, pas une figure");
  assert.equal(isFigure(0.4), true);
});

test("un pixel transparent est du papier, pas de l'encre", () => {
  const vide = { data: new Uint8ClampedArray(4 * 16), width: 4, height: 4 };

  assert.equal(inkRatio(vide), 0);
});

test("le seuil se lit dans le fichier, pas dans les têtes", () => {
  assert.equal(isFigure(FIGURE.MIN_INK_RATIO), true);
  assert.equal(isFigure(FIGURE.MIN_INK_RATIO - 0.001), false);
});

test("le PDF compte ses y depuis le bas, un canevas depuis le haut", () => {
  // C'est le genre d'inversion qu'on rate une fois sur deux : elle est écrite
  // une fois ici plutôt que recopiée à chaque découpe.
  const rect = toCanvasRect({ x: 60, y: 400, width: 480, height: 200 }, { pageHeight: 842, scale: 2 });

  assert.deepEqual(rect, { x: 120, y: (842 - 400 - 200) * 2, width: 960, height: 400 });
});

test("sans zone, rien à dessiner", () => {
  assert.equal(toCanvasRect(null, { pageHeight: 842 }), null);
});

test("un avis sur deux lignes est un seul bloc", () => {
  // Sans cela, la bande commencerait au-dessus de la seconde ligne, et la
  // figure emporterait une phrase en l'affichant comme si elle en faisait
  // partie.
  const bloc = expandBlockToParagraph(ITEMS, locateTextBlock(ITEMS, "Fissuration en pied de voile"));

  assert.equal(bloc.top, 710);
  assert.equal(bloc.bottom, 688, "la seconde ligne appartient au même avis");
});

test("le paragraphe suivant n'est pas absorbé", () => {
  const items = [
    { text: "Avis 145 — Fissuration en pied de voile", x: 60, y: 700, width: 300, height: 10 },
    { text: "Un autre paragraphe, cent points plus bas", x: 60, y: 600, width: 300, height: 10 }
  ];
  const bloc = expandBlockToParagraph(items, locateTextBlock(items, "Fissuration en pied de voile"));

  assert.equal(bloc.bottom, 700, "cent points ne sont pas un interligne");
});

test("une colonne voisine n'est pas la suite du paragraphe", () => {
  const items = [
    { text: "Avis 145 — Fissuration en pied de voile", x: 60, y: 700, width: 200, height: 10 },
    { text: "Colonne de droite", x: 320, y: 694, width: 200, height: 10 }
  ];
  const bloc = expandBlockToParagraph(items, locateTextBlock(items, "Fissuration en pied de voile"));

  assert.equal(bloc.bottom, 700);
});

test("la colonne de texte se mesure sur la page", () => {
  // Une figure est presque toujours plus large que la phrase qui la cite.
  const bornes = pageTextBounds(ITEMS);

  assert.equal(bornes.left, 60);
  assert.equal(bornes.width, 300);
  assert.equal(pageTextBounds([]), null);
});

test("le blanc autour d'une figure se rogne", () => {
  // La bande va d'un bloc au suivant : la figure y flotte. Garder ce blanc
  // donnerait des vignettes où l'on ne distingue rien.
  const peinte = image(40, 40, (poser) => {
    for (let y = 16; y < 24; y += 1) for (let x = 16; x < 24; x += 1) poser(x, y, 10, 10, 10);
  });

  const rect = trimBlankMargins(peinte, { padding: 2 });

  assert.deepEqual(rect, { x: 14, y: 14, width: 12, height: 12 });
});

test("une image entièrement blanche n'a rien à rogner", () => {
  assert.equal(trimBlankMargins(image(20, 20)), null);
});
