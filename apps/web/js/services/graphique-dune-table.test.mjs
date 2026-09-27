/**
 * Regarder un tableau autrement, et ce que cela écarte.
 *
 * **Les tableaux viennent d'une vraie boucle**, et jamais d'objets façonnés
 * ici : une table écrite à la main prendrait les hypothèses du code pour des
 * faits, et cesserait d'éprouver ce que le langage produit vraiment.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  DIT_DE_LA_LECTURE, LECTURE,
  lectureDite, lectureQuiVaDeSoi, lectureRetenue, lecturesPossibles, phraseDesEcartees, seriesDuTableau
} from "./graphique-dune-table.js";
import { lancerLeBrouillon } from "./bac-dessai.js";

/** Le tableau qu'une fonction déroule vraiment, pour les réponses données. */
const tableauDe = (corps, reponses) => lancerLeBrouillon(
  [{ nom: "essai.ref", contenu: `fonction F(zones, Section, Charge) {\n${corps}\n}\n` }],
  reponses
)[0].tableau;

const DEUX_COLONNES = tableauDe([
  "   pour chaque Hauteur de 1 m à 4 m par pas de 1 m",
  "      calcule Volume = Hauteur * Section;",
  "      calcule Double = Volume * 2;",
  "   calcule Total = la somme de Volume;",
  "   si (Total > 0 m³)",
  "   alors (Total);"
].join("\n"), { Section: "0,5 m²" });

/* ── Les séries ──────────────────────────────────────────────────────────── */

test("une colonne fait une série, et l'abscisse est la variable de boucle", () => {
  /**
   * **Il n'y a pas de choix à faire** : c'est ce qui change d'une ligne à
   * l'autre, et tout le reste en découle. Une abscisse qu'on choisirait à
   * l'écran ferait dessiner une colonne contre une autre, ce qui est un nuage
   * de points — une autre question.
   */
  const rendu = seriesDuTableau(DEUX_COLONNES);

  assert.equal(rendu.abscisse, "Hauteur");
  assert.equal(rendu.unite, "m");
  assert.deepEqual(rendu.series.map((une) => une.nom), ["Volume", "Double"]);
  assert.deepEqual(rendu.series[0].points.map((un) => [un.x, un.y]),
    [[1, 0.5], [2, 1], [3, 1.5], [4, 2]]);
  // Ce qui était écrit voyage avec le point : c'est ce qu'on lit au survol.
  assert.deepEqual(rendu.series[0].points[0], { x: 1, y: 0.5, dit: "1 m", vaut: "0,5 m³" });
  assert.equal(rendu.dessinable, true);
});

test("une colonne d'une autre grandeur est écartée, et nommée", () => {
  /**
   * **Une colonne en mètres cubes et une en tonnes sur la même grille se
   * croisent là où elles ne se croisent pas**, et l'on lit un rapport qui
   * n'existe pas. Les taire ferait pire : on compterait deux courbes là où le
   * tableau a trois colonnes (règle 5).
   */
  const tableau = tableauDe([
    "   pour chaque Hauteur de 1 m à 3 m par pas de 1 m",
    "      calcule Volume = Hauteur * Section;",
    "      calcule Deux fois la hauteur = Hauteur * 2;",
    "   calcule Total = la somme de Volume;",
    "   si (Total > 0 m³)",
    "   alors (Total);"
  ].join("\n"), { Section: "0,5 m²" });

  // **La colonne écartée se calcule très bien** : c'est justement le cas qu'il
  // faut éprouver. Une colonne qu'aucune ligne n'a su calculer serait écartée
  // pour une autre raison, et ne dirait rien de celle-ci.
  const brutes = tableau.lignes.map((une) => une.cases.map((quoi) => quoi.connu));
  assert.ok(brutes.every((une) => une.every(Boolean)), "les deux colonnes se calculent");

  const rendu = seriesDuTableau(tableau);
  assert.deepEqual(rendu.series.map((une) => une.nom), ["Volume"]);
  assert.deepEqual(rendu.ecartees, ["Deux fois la hauteur"]);
  assert.match(phraseDesEcartees(rendu.ecartees), /« Deux fois la hauteur » n'est pas dessinée/);
});

test("ce qu'on a choisi à la main gagne, et ne se perd pas à la frappe suivante", () => {
  /**
   * **Un dessin qui se refermerait à chaque caractère tapé ne se regarderait
   * jamais** — et c'est précisément quand on tape qu'on veut voir la courbe
   * bouger. Ce qu'on a choisi gagne donc sur ce que la fonction suggère.
   */
  assert.equal(lectureRetenue(DEUX_COLONNES, { choisie: "barres", suggeree: "courbe" }), LECTURE.BARRES);
  assert.equal(lectureRetenue(DEUX_COLONNES, { suggeree: "courbe" }), LECTURE.COURBE);
  assert.equal(lectureRetenue(DEUX_COLONNES, {}), LECTURE.TABLEAU);

  // Un choix devenu impossible — la fonction a changé, le tableau n'a plus
  // qu'une ligne — retombe sur ce qui va de soi plutôt que d'ouvrir un cadre
  // vide.
  assert.equal(lectureRetenue(null, { choisie: "courbe", suggeree: "barres" }), LECTURE.TABLEAU);
  assert.equal(lectureRetenue(DEUX_COLONNES, { choisie: "camembert" }), LECTURE.TABLEAU);
});

test("une colonne que rien n'a su calculer est écartée aussi", () => {
  // Elle reste au tableau, avec ses cases vides : c'est là qu'on la lit. Sur le
  // dessin, elle n'aurait aucun point à poser.
  const tableau = tableauDe([
    "   pour chaque Hauteur de 1 m à 3 m par pas de 1 m",
    "      calcule Volume = Hauteur * Section;",
    "      calcule Impossible = Hauteur * Charge;",
    "   calcule Total = la somme de Volume;",
    "   si (Total > 0 m³)",
    "   alors (Total);"
  ].join("\n"), { Section: "0,5 m²" });

  const rendu = seriesDuTableau(tableau);
  assert.deepEqual(rendu.series.map((une) => une.nom), ["Volume"]);
  assert.deepEqual(rendu.ecartees, ["Impossible"]);
});

test("une ligne manquée laisse un trou, et ne déplace pas les autres", () => {
  /**
   * **Le point n'est pas posé, et les suivants gardent leur abscisse.** Décaler
   * ferait glisser toute la fin de la courbe d'un cran, et le dessin serait
   * faux sans que rien ne le dise.
   */
  const tableau = tableauDe([
    "   pour chaque Hauteur de 1 m à 3 m par pas de 1 m",
    "      calcule Écart = Hauteur - Charge;",
    "   calcule Total = la somme de Écart;",
    "   si (Total > 0 m)",
    "   alors (Total);"
  ].join("\n"), { Charge: "1 m" });

  // Les trois lignes se calculent ici ; on coupe la première en lui ôtant son
  // unité comparable pour éprouver le trou.
  const troue = {
    ...tableau,
    lignes: tableau.lignes.map((une, rang) => (rang === 1
      ? { ...une, cases: une.cases.map((quoi) => ({ ...quoi, connu: false, valeur: "" })) }
      : une))
  };

  const rendu = seriesDuTableau(troue);
  assert.deepEqual(rendu.series[0].points.map((un) => un.x), [1, 3]);
  assert.deepEqual(rendu.series[0].points.map((un) => un.dit), ["1 m", "3 m"]);
});

test("un tableau qu'on ne peut pas dessiner le dit, et n'offre pas de bouton", () => {
  // Un bouton qui ouvre un cadre vide apprend à ne plus cliquer sur les
  // boutons.
  const unSeulPoint = tableauDe([
    "   pour chaque Hauteur de 1 m à 1 m par pas de 1 m",
    "      calcule Volume = Hauteur * Section;",
    "   calcule Total = la somme de Volume;",
    "   si (Total > 0 m³)",
    "   alors (Total);"
  ].join("\n"), { Section: "0,5 m²" });

  assert.equal(seriesDuTableau(unSeulPoint).dessinable, false);
  assert.deepEqual(lecturesPossibles(unSeulPoint), [LECTURE.TABLEAU]);
  assert.deepEqual(lecturesPossibles(DEUX_COLONNES), [LECTURE.TABLEAU, LECTURE.COURBE, LECTURE.BARRES]);
});

test("sans tableau, rien ne se dessine et rien ne tombe", () => {
  assert.equal(seriesDuTableau(null).dessinable, false);
  assert.deepEqual(seriesDuTableau().series, []);
  assert.deepEqual(lecturesPossibles(null), [LECTURE.TABLEAU]);
  assert.equal(phraseDesEcartees([]), "");
  assert.equal(phraseDesEcartees(), "");
});

/* ── Ce qui s'ouvre en premier ───────────────────────────────────────────── */

test("le tableau reste le défaut, et ce n'est pas de la timidité", () => {
  /**
   * **C'est lui qui se compare au texte d'origine**, et c'est la vérification.
   * Un dessin qui s'ouvrirait tout seul ferait croire qu'on a vérifié parce
   * qu'on a regardé.
   */
  assert.equal(lectureQuiVaDeSoi(DEUX_COLONNES, ""), LECTURE.TABLEAU);
  assert.equal(lectureQuiVaDeSoi(DEUX_COLONNES), LECTURE.TABLEAU);
});

test("ce que la fonction suggère s'ouvre en premier, quand c'est dessinable", () => {
  assert.equal(lectureQuiVaDeSoi(DEUX_COLONNES, "courbe"), LECTURE.COURBE);
  assert.equal(lectureQuiVaDeSoi(DEUX_COLONNES, "barres"), LECTURE.BARRES);

  // Une suggestion qu'on ne peut pas dessiner retombe sur le tableau : un cadre
  // vide se lirait comme un dessin qui n'a pas su s'afficher.
  assert.equal(lectureQuiVaDeSoi(null, "courbe"), LECTURE.TABLEAU);
});

test("un mot qu'on n'a pas prévu ne se lit pas", () => {
  assert.equal(lectureDite("courbe"), LECTURE.COURBE);
  assert.equal(lectureDite("  BARRES "), LECTURE.BARRES);
  assert.equal(lectureDite("camembert"), "");
  assert.equal(lectureDite(""), "");
});

test("chaque lecture dit ce qu'elle montre", () => {
  // Un bouton dont l'intitulé est le seul indice ne dit pas ce qu'on va voir :
  // « barres » et « courbe » ne se choisissent pas au hasard.
  for (const une of Object.values(LECTURE)) {
    assert.ok(DIT_DE_LA_LECTURE[une], `pas de phrase : ${une}`);
  }
  assert.equal(Object.keys(DIT_DE_LA_LECTURE).length, Object.values(LECTURE).length);
});
