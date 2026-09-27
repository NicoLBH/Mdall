/**
 * Les unités du bâtiment, et ce qui se convertit en quoi.
 *
 * Une erreur d'unité est la faute la plus chère du bâtiment, et la plus
 * discrète : rien ne la signale avant le chantier. Ce qui s'éprouve ici est la
 * règle en une phrase — **deux unités d'une même grandeur se convertissent, deux
 * grandeurs différentes se refusent** — et les deux moitiés comptent autant.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  GRANDEUR, convertir, ecrireUneUnite, grandeurDeLUnite, lireUneUnite,
  memeGrandeur, nomDeLaGrandeur, phraseDesUnites
} from "./unites-du-metier.js";

test("deux unités d'une même grandeur se convertissent", () => {
  assert.equal(convertir(1, "m", "cm"), 100);
  assert.equal(convertir(35, "cm", "m"), 0.35);
  assert.equal(convertir(1, "km", "m"), 1000);
  assert.equal(convertir(1, "t", "kg"), 1000);
  assert.equal(convertir(1, "MN", "kN"), 1000);
  assert.equal(convertir(1, "MPa", "kPa"), 1000);
  assert.equal(convertir(90, "min", "h"), 1.5);
  assert.equal(convertir(1, "bar", "kPa"), 100);
});

test("deux grandeurs différentes ne se convertissent pas, et le disent", () => {
  // **C'est la moitié qui protège.** Une longueur comparée à une force ne
  // devient pas comparable parce qu'on sait maintenant convertir.
  assert.equal(convertir(1, "m", "kN"), null);
  assert.equal(convertir(1, "kg", "L"), null);
  assert.equal(convertir(1, "h", "m"), null);

  assert.equal(memeGrandeur("m", "kN"), false);
  assert.match(phraseDesUnites("m", "kN"), /une longueur et une force — m et kN/);
});

test("le carré d'un facteur est son carré, et on ne liste pas les surfaces", () => {
  /**
   * **Une table qui énumérerait `m²`, `cm²`, `dm²`… aurait un trou dès la
   * première unité oubliée**, et ce trou se lirait « incomparables ». On liste
   * les bases ; les exposants s'en déduisent.
   */
  assert.equal(convertir(1, "m²", "cm²"), 10000);
  assert.equal(convertir(1, "m³", "cm³"), 1000000);
  assert.equal(convertir(1, "m³", "L"), 1000);
  assert.equal(convertir(1, "ha", "m²"), 10000);

  assert.equal(grandeurDeLUnite("m²").grandeur, GRANDEUR.SURFACE);
  assert.equal(grandeurDeLUnite("m³").grandeur, GRANDEUR.VOLUME);
  assert.equal(grandeurDeLUnite("m").grandeur, GRANDEUR.LONGUEUR);

  // **Seule la longueur s'élève.** Un `kg²` ne veut rien dire dans ce métier, et
  // lui inventer une grandeur ferait accepter une conversion invérifiable.
  assert.equal(grandeurDeLUnite("kg²"), null);
});

test("la casse compte : « mN » et « MN » diffèrent d'un milliard", () => {
  // Confondre milli et méga est l'erreur la plus chère qu'une table d'unités
  // puisse laisser passer.
  assert.equal(grandeurDeLUnite("MN").facteur, 1000);
  assert.equal(grandeurDeLUnite("mN"), null);
  assert.equal(grandeurDeLUnite("MPa").facteur, 1);
  assert.equal(grandeurDeLUnite("mPa"), null);
});

test("rien ne se devine : un symbole inconnu reste lui-même", () => {
  /**
   * Un symbole mal orthographié n'est pas rapproché du plus proche. `kN/m` non
   * plus : ce fichier ne compose pas les unités, et deux unités composées ne se
   * comparent que si elles s'écrivent exactement pareil.
   */
  assert.equal(grandeurDeLUnite("dN"), null);
  assert.equal(grandeurDeLUnite("kN/m"), null);

  assert.equal(memeGrandeur("kN/m", "kN/m"), true);
  assert.equal(memeGrandeur("kN/m", "N/mm"), false);
  assert.equal(convertir(1, "kN/m", "N/mm"), null);

  // Et la phrase ne prétend pas savoir ce qu'elles mesurent.
  assert.equal(phraseDesUnites("kN/m", "N/mm"), "kN/m et N/mm");
});

test("une température ne se convertit qu'à elle-même, et c'est dit", () => {
  // Un degré Celsius n'est pas un facteur : c'est un facteur **et** un décalage.
  // Le modèle de ce fichier est multiplicatif, et l'y forcer rendrait des sommes
  // fausses.
  assert.equal(grandeurDeLUnite("°C").grandeur, GRANDEUR.TEMPERATURE);
  assert.equal(convertir(20, "°C", "°C"), 20);
  assert.equal(convertir(20, "°C", "K"), null);
});

test("sans unité d'un côté, il n'y a rien à ramener", () => {
  // C'est ce que le langage fait déjà quand on écrit `2 * 3 m` : le facteur nu
  // vaut ce qu'il vaut. L'addition, elle, refuse — mais c'est sa règle à elle,
  // et elle vit dans le calculateur.
  assert.equal(convertir(5, "", "m"), 5);
  assert.equal(convertir(5, "m", ""), 5);
  assert.equal(memeGrandeur("", "m"), true);
});

test("lire et écrire une unité : la base et son exposant", () => {
  // Ces deux-là vivaient dans le calculateur. Elles sont ici parce que le
  // vocabulaire d'une unité précède ce qu'on en fait — et les trois lecteurs
  // s'en servent.
  assert.deepEqual(lireUneUnite("m²"), { base: "m", exposant: 2, opaque: false });
  assert.deepEqual(lireUneUnite("m"), { base: "m", exposant: 1, opaque: false });
  assert.deepEqual(lireUneUnite(""), { base: "", exposant: 0, opaque: false });
  assert.equal(lireUneUnite("km/h").opaque, true);

  assert.equal(ecrireUneUnite({ base: "m", exposant: 3 }), "m³");
  assert.equal(ecrireUneUnite({ base: "m", exposant: 0 }), "");
  assert.equal(ecrireUneUnite({ base: "m", exposant: 4 }), null);
});

test("chaque grandeur a son nom, pour que la phrase se comprenne", () => {
  // « une longueur et une force » se comprend d'un coup d'œil ; « m et kN »
  // demande de réfléchir — et c'est quand on est pressé qu'on lit ce message.
  for (const grandeur of Object.values(GRANDEUR)) {
    assert.notEqual(nomDeLaGrandeur(grandeur), "", grandeur);
  }
  assert.equal(nomDeLaGrandeur("inconnue"), "");
});
