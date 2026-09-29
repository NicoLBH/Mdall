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
  memeGrandeur, nomDeLaGrandeur, phraseDesUnites, auJusteNecessaire
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

  /**
   * **Toute base s'élève désormais**, et non plus la seule longueur.
   *
   * On refusait `kg²` au motif qu'il « ne veut rien dire dans ce métier ». Ce
   * n'était pas une question de sens mais de modèle : une unité portait **une**
   * grandeur, et l'on ne savait pas écrire « masse au carré ». Depuis qu'elle
   * porte un exposant par grandeur, `1 kg²` vaut `1 000 000 g²` — une
   * conversion parfaitement vérifiable —, et le refuser demanderait une règle
   * de plus qui ne protège de rien : `kg²` ne se compare toujours pas à `m²`.
   */
  assert.equal(convertir(1, "kg²", "g²"), 1000000);
  assert.equal(memeGrandeur("kg²", "m²"), false);
});

test("la casse compte : « mN » et « MN » diffèrent d'un milliard", () => {
  /**
   * Confondre milli et méga est l'erreur la plus chère qu'une table d'unités
   * puisse laisser passer.
   *
   * **On éprouve la conversion, pas le facteur interne.** La référence des
   * pressions a changé — elles se disent maintenant en kN/m², puisqu'elles sont
   * une force par une surface —, et une épreuve qui regardait le nombre brut
   * tombait sans qu'aucune conversion ait bougé. Ce qui compte est ce qu'un
   * mégapascal vaut, pas dans quelle unité on l'a rangé.
   */
  assert.equal(convertir(1, "MN", "kN"), 1000);
  assert.equal(grandeurDeLUnite("mN"), null);
  assert.equal(convertir(1, "MPa", "kPa"), 1000);
  assert.equal(grandeurDeLUnite("mPa"), null);
});

test("rien ne se devine : un symbole inconnu reste lui-même", () => {
  /**
   * Un symbole mal orthographié n'est pas rapproché du plus proche, et ne se
   * compare qu'à lui-même.
   */
  assert.equal(grandeurDeLUnite("dN"), null);
  assert.equal(memeGrandeur("dN", "dN"), true);
  assert.equal(memeGrandeur("dN", "daN"), false);

  // `%` et `€` non plus : ils ne mesurent rien qu'on sache convertir.
  assert.equal(grandeurDeLUnite("%"), null);
  assert.equal(grandeurDeLUnite("€"), null);
  assert.equal(memeGrandeur("€", "€"), true);
  assert.equal(memeGrandeur("€", "m"), false);
});

test("les unités composées se composent : `kN/m` et `N/mm` sont la même chose", () => {
  /**
   * **C'était la limite la plus chère du tableau.** Deux écritures de la même
   * chose se refusaient l'une à l'autre — une charge linéique en kN/m dans une
   * note, la même en N/mm dans un logiciel de calcul —, et il fallait convertir
   * de tête avant d'écrire la ligne.
   *
   * Ce qui manquait n'était pas un cas de plus : c'était un **exposant par
   * grandeur** au lieu d'une grandeur unique.
   */
  assert.equal(memeGrandeur("kN/m", "N/mm"), true);
  assert.equal(convertir(1, "kN/m", "N/mm"), 1);
  assert.equal(convertir(1, "kN/m", "daN/cm"), 1);

  /**
   * **Une pression est une force par une surface**, et le dire suffit :
   * `1 MPa` vaut `1000 kN/m²`. Le béton se dit en MPa, la descente de charge en
   * kN/m², et les deux se rencontrent tous les jours.
   */
  assert.equal(memeGrandeur("MPa", "kN/m²"), true);
  assert.equal(convertir(1, "MPa", "kN/m²"), 1000);
  assert.equal(convertir(1, "bar", "kPa"), 100);
  // Chaque unité de la famille porte son facteur, et chacun compte : le pascal
  // est mille fois plus petit que le kilopascal, ni plus ni moins.
  assert.equal(convertir(1, "kPa", "Pa"), 1000);
  assert.equal(convertir(1, "GPa", "MPa"), 1000);
  assert.equal(grandeurDeLUnite("kN/m²").grandeur, GRANDEUR.PRESSION);

  assert.equal(convertir(1, "km/h", "m/s"), auJusteNecessaire(1000 / 3600));
  assert.equal(convertir(1, "t/m³", "kg/m³"), 1000);

  // Et ce qui ne mesure pas la même chose se refuse toujours.
  assert.equal(memeGrandeur("kN/m", "kN/m²"), false);
  assert.equal(memeGrandeur("kN/m", "m"), false);
});

test("un rapport sans dimension ne se compare à rien", () => {
  /**
   * `m/m` et `kN/kN` sont tous deux « un nombre nu ». Les rendre comparables
   * ferait additionner un rapport de longueurs à un rapport de forces — deux
   * choses sans rapport, que seule leur absence d'unité rapproche. On refuse,
   * comme pour un symbole inconnu.
   */
  assert.equal(grandeurDeLUnite("m/m"), null);
  assert.equal(memeGrandeur("m/m", "kN/kN"), false);
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
