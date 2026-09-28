/**
 * Ce qui décide de la forme d'un dessin.
 *
 * **Une géométrie fausse ne casse rien** : elle rend un dessin parfaitement
 * lisible, dont on tire un rapport qui n'existe pas. C'est la seule famille de
 * défaut qu'un graphique produit, et elle ne se voit qu'en comparant les
 * nombres au dessin — c'est-à-dire ici.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { traceDesSeries } from "./trace-dun-graphique.js";

const serie = (nom, ...couples) => ({
  nom,
  points: couples.map(([x, y]) => ({ x, y, dit: String(x), vaut: String(y) }))
});

test("les points se ramènent entre 0 et 1, aux deux bouts compris", () => {
  const trace = traceDesSeries([serie("A", [0, 10], [5, 20], [10, 30])]);

  assert.deepEqual(trace.series[0].points.map((un) => [un.x, un.y]),
    [[0, 0], [0.5, 0.5], [1, 1]]);
  assert.deepEqual(trace.bornes, { x: [0, 10], y: [10, 30] });
  // Ce qui était écrit voyage avec le point : c'est ce qu'on lit au survol.
  assert.deepEqual(trace.series[0].points.map((un) => [un.dit, un.vaut]),
    [["0", "10"], ["5", "20"], ["10", "30"]]);
});

test("toutes les séries partagent une seule grille", () => {
  /**
   * **C'est le point.** Deux courbes dessinées chacune à son échelle se
   * croisent là où elles ne se croisent pas, et l'on lit un rapport qui
   * n'existe pas. Elles partagent donc leurs bornes.
   */
  const trace = traceDesSeries([
    serie("A", [0, 0], [10, 10]),
    serie("B", [0, 5], [10, 5])
  ]);

  assert.deepEqual(trace.bornes, { x: [0, 10], y: [0, 10] });
  // B est à mi-hauteur de la grille de A, et non aplatie au milieu de la sienne.
  assert.deepEqual(trace.series[1].points.map((un) => un.y), [0.5, 0.5]);
});

test("une barre part de zéro, une ligne part de ses valeurs", () => {
  /**
   * **C'est la faute classique du graphique.** Une barre dit une quantité, et
   * la tronquer à la base fait lire un rapport de trois pour un là où il est de
   * un pour un virgule un. Douze kilonewtons sur une échelle qui commence à
   * douze se dessinent d'une hauteur nulle, et la première barre disparaît.
   */
  const montante = [serie("A", [1, 12], [2, 48], [3, 96])];

  const enLignes = traceDesSeries(montante);
  assert.deepEqual(enLignes.bornes.y, [12, 96]);
  assert.equal(enLignes.series[0].points[0].y, 0, "une ligne part de ses valeurs");

  const enBarres = traceDesSeries(montante, { depuisZero: true });
  assert.deepEqual(enBarres.bornes.y, [0, 96]);
  assert.equal(enBarres.series[0].points[0].y, 0.125, "12 sur 96 fait un huitième");
});

test("une série qui descend sous zéro garde son minimum", () => {
  // Une barre négative part de zéro vers le bas ; couper à zéro la ferait
  // disparaître.
  const trace = traceDesSeries([serie("A", [1, -5], [2, 10])], { depuisZero: true });
  assert.deepEqual(trace.bornes.y, [-5, 10]);
});

test("une série plate se dessine au milieu, et non sur un bord", () => {
  // Divisée par une hauteur nulle, elle sortirait du cadre ou n'apparaîtrait
  // pas du tout.
  const trace = traceDesSeries([serie("A", [0, 5], [10, 5])]);
  assert.deepEqual(trace.series[0].points.map((un) => un.y), [0.5, 0.5]);
});

test("une marque se pose sur la même grille que les séries", () => {
  const trace = traceDesSeries([serie("A", [0, 0], [10, 10])], { marque: { x: 5, y: 2 } });
  assert.deepEqual(trace.marque, { x: 0.5, y: 0.2 });
});

test("une marque hors des points étire la grille jusqu'à elle", () => {
  // C'est voulu ici : la géométrie place ce qu'on lui donne. C'est à l'appelant
  // de décider s'il veut marquer un point hors du dessin — et l'écran de la
  // courbe, lui, pose la marque sur l'extrémité plutôt que dehors.
  const trace = traceDesSeries([serie("A", [0, 0], [10, 10])], { marque: { x: 20, y: 10 } });
  assert.deepEqual(trace.bornes.x, [0, 20]);
});

test("ce qui n'est pas un nombre ne se dessine pas, et ne fait pas tomber le cadre", () => {
  const trace = traceDesSeries([{
    nom: "A",
    points: [{ x: 0, y: 0 }, { x: NaN, y: 5 }, { x: 10, y: 10 }, { x: 5, y: null }]
  }]);
  assert.equal(trace.series[0].points.length, 2);
  assert.deepEqual(trace.bornes.x, [0, 10]);
});

test("rien à dessiner ne dessine rien, et le dit par un cadre nul", () => {
  const vide = { series: [], marque: null, bornes: { x: [0, 0], y: [0, 0] } };
  assert.deepEqual(traceDesSeries([]), vide);
  assert.deepEqual(traceDesSeries(), vide);
  assert.deepEqual(traceDesSeries([{ nom: "A", points: [] }]), vide);
  assert.deepEqual(traceDesSeries("une série"), vide);
});

test("une marque seule ne fait pas un dessin", () => {
  // Sans série, il n'y a pas de grille : poser la marque sur un cadre inventé
  // la placerait n'importe où, et l'on croirait la lire.
  assert.equal(traceDesSeries([], { marque: { x: 1, y: 1 } }).marque, null);
});
