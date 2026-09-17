/**
 * « Transformer » — la seule sortie d'un agent de l'Atelier, et ses issues.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderTransformer, TRANSFORMER, brancheDeLAction } from "./transformer.js";

const OUVERTES = [
  { id: "p1", number: 58, title: "Reprise des fondations", status: "open" },
  { id: "p2", number: 61, title: "Mise à jour incendie", status: "open" }
];

test("les deux issues d'origine sont toujours là, et aucune n'écrit", () => {
  // Un écran d'Atelier propose « Transformer », jamais un bouton qui écrit.
  const html = renderTransformer();
  assert.match(html, new RegExp(`data-menu-action="${TRANSFORMER.SUJET}"`));
  assert.match(html, new RegExp(`data-menu-action="${TRANSFORMER.PROPOSITION}"`));
  assert.match(html, /Ouvrir un sujet/);
  assert.match(html, /Faire une proposition/);
});

test("chaque proposition ouverte devient une ligne, qui la nomme", () => {
  // « Ajouter à une proposition ouverte » sans dire laquelle demanderait un
  // deuxième clic pour savoir de quoi le menu parle.
  const html = renderTransformer({ ouvertes: OUVERTES });
  assert.match(html, new RegExp(`data-menu-action="${TRANSFORMER.AJOUTER}:p1"`));
  assert.match(html, new RegExp(`data-menu-action="${TRANSFORMER.AJOUTER}:p2"`));
  assert.match(html, /Ajouter à #58 Reprise des fondations/);
  assert.match(html, /Ajouter à #61 Mise à jour incendie/);
});

test("aucune proposition ouverte : pas de rubrique vide", () => {
  // Une rubrique vide ferait chercher ce qui devrait s'y trouver.
  const html = renderTransformer({ ouvertes: [] });
  assert.doesNotMatch(html, new RegExp(TRANSFORMER.AJOUTER));
  assert.doesNotMatch(html, /gh-menu__separator|role="separator"/);
});

test("une base muette le dit, au lieu de laisser croire qu'il n'y en a aucune", () => {
  // Sinon on ouvrirait une deuxième proposition à côté de celle qu'on ne voyait
  // pas. Règle 5.
  const html = renderTransformer({ ouvertes: null });
  assert.match(html, /lecture impossible/);
  assert.match(html, /disabled/);
});

test("un appelant qui ne dit rien n'offre rien, et ne prétend rien", () => {
  // `ouvertes` non passé vaut `[]` : le bouton garde ses deux issues d'origine.
  // Ce n'est pas la même chose que `null`, qui est une lecture ratée.
  const html = renderTransformer({ id: "x" });
  assert.doesNotMatch(html, /lecture impossible/);
  assert.doesNotMatch(html, new RegExp(TRANSFORMER.AJOUTER));
});

test("l'identifiant se relit d'un seul endroit", () => {
  assert.equal(brancheDeLAction(`${TRANSFORMER.AJOUTER}:p1`), "p1");
  assert.equal(brancheDeLAction(TRANSFORMER.PROPOSITION), "");
  assert.equal(brancheDeLAction(TRANSFORMER.SUJET), "");
  assert.equal(brancheDeLAction(""), "");
  assert.equal(brancheDeLAction(null), "");
  // La ligne éteinte d'une base muette ne vise aucune proposition : la cliquer
  // ne doit pas ouvrir une branche vide.
  assert.equal(brancheDeLAction(`${TRANSFORMER.AJOUTER}:`), "");
});
