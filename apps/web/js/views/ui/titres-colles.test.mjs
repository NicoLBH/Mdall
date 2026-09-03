/**
 * Les titres collés : ce qui reste affiché quand on descend dans un texte.
 *
 * Seule la décision se teste ici — quel titre montrer à quelle hauteur. Le
 * branchement au défilement demande un navigateur ; la règle, non, et c'est
 * elle qu'on peut se tromper en écrivant.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { titresCourants, dessinerLesTitresColles } from "./titres-colles.js";

const TEXTE = [
  { niveau: 1, texte: "1. Renseignements", haut: 0 },
  { niveau: 2, texte: "1.1 Le terrain", haut: 100 },
  { niveau: 2, texte: "1.2 Le bâtiment", haut: 200 },
  { niveau: 1, texte: "2. Structures", haut: 300 },
  { niveau: 2, texte: "2.1 Les planchers", haut: 400 }
];

test("avant le premier titre, rien à coller", () => {
  const courants = titresCourants(TEXTE, -1);
  assert.equal(courants.niveau1, null);
  assert.equal(courants.niveau2, null);
});

test("le titre en cours est le dernier franchi", () => {
  assert.equal(titresCourants(TEXTE, 150).niveau1, "1. Renseignements");
  assert.equal(titresCourants(TEXTE, 150).niveau2, "1.1 Le terrain");
  assert.equal(titresCourants(TEXTE, 250).niveau2, "1.2 Le bâtiment");
});

test("un chapitre neuf efface la sous-partie du précédent", () => {
  // Sinon, en entrant dans « 2. Structures », on garderait affiché
  // « 1.2 Le bâtiment » — c'est pire que de ne rien afficher, parce que c'est
  // faux et que rien ne le signale.
  const courants = titresCourants(TEXTE, 320);
  assert.equal(courants.niveau1, "2. Structures");
  assert.equal(courants.niveau2, null);
});

test("la sous-partie revient dès qu'elle est franchie", () => {
  const courants = titresCourants(TEXTE, 450);
  assert.equal(courants.niveau1, "2. Structures");
  assert.equal(courants.niveau2, "2.1 Les planchers");
});

test("un texte qui commence par une sous-partie se dit quand même", () => {
  // Un extrait de CCTP peut n'avoir aucun titre de premier rang : se taire
  // vaudrait moins que de montrer ce qu'on a.
  const courants = titresCourants([{ niveau: 2, texte: "3.4 Enduits", haut: 0 }], 10);
  assert.equal(courants.niveau1, null);
  assert.equal(courants.niveau2, "3.4 Enduits");
});

test("le bandeau vide ne porte aucun texte", () => {
  const html = dessinerLesTitresColles({});
  assert.match(html, /titres-colles__un/);
  assert.doesNotMatch(html, /null/);
});
