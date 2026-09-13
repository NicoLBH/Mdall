import test from "node:test";
import assert from "node:assert/strict";

import {
  actionDuMarquage, etatDeLaCaseDeTete, MARQUAGES, phraseDeLaSelection,
  selectionApresLeTout, selectionApresUnClic, selectionVisible
} from "./selection-des-sujets.js";

/**
 * Cocher des sujets, et agir sur tous à la fois.
 *
 * Ce qui se teste ici est la seule chose qui puisse faire un dommage : **sur
 * quoi l'action de groupe va porter**. Une sélection qui garde un sujet sorti
 * de la liste modifie quelque chose qu'on n'a pas sous les yeux, et l'on ne
 * saurait même pas quoi.
 */

test("cliquer une ligne la coche, la recliquer la décoche", () => {
  assert.deepEqual(selectionApresUnClic({ selection: [], id: "s1" }), ["s1"]);
  assert.deepEqual(selectionApresUnClic({ selection: ["s1", "s2"], id: "s1" }), ["s2"]);
});

test("un identifiant vide ne change rien", () => {
  assert.deepEqual(selectionApresUnClic({ selection: ["s1"], id: "" }), ["s1"]);
  assert.deepEqual(selectionApresUnClic({ selection: ["s1"], id: "  " }), ["s1"]);
});

/**
 * **« Tout » veut dire la sélection filtrée, pas la page affichée.** C'est ce
 * qu'on demande en cochant après avoir filtré ; se limiter à la page ferait
 * ranger un cinquième du lot sans que rien ne le dise.
 */
test("la case de tête prend tout ce que la requête retient", () => {
  const visibles = ["s1", "s2", "s3", "s4"];

  assert.deepEqual(selectionApresLeTout({ selection: [], visibles }), visibles);
  assert.deepEqual(selectionApresLeTout({ selection: ["s2"], visibles }), visibles,
    "une sélection partielle se complète, elle ne se vide pas");
  assert.deepEqual(selectionApresLeTout({ selection: visibles, visibles }), [],
    "tout coché : on décoche");
});

test("la case de tête dit aucune, partielle ou toutes", () => {
  const visibles = ["s1", "s2"];

  assert.equal(etatDeLaCaseDeTete({ selection: [], visibles }), "aucune");
  assert.equal(etatDeLaCaseDeTete({ selection: ["s1"], visibles }), "partielle");
  assert.equal(etatDeLaCaseDeTete({ selection: ["s1", "s2"], visibles }), "toutes");
  assert.equal(etatDeLaCaseDeTete({ selection: ["s1"], visibles: [] }), "aucune",
    "une liste vide n'est pas « tout coché »");
});

/**
 * **Le garde-fou de ce module.** On coche trois sujets, on change de filtre,
 * ils sortent de la liste : agir sur eux ensuite modifierait des sujets qu'on
 * n'a pas sous les yeux.
 */
test("ce qui sort de la liste sort de la sélection", () => {
  assert.deepEqual(
    selectionVisible({ selection: ["s1", "s2", "s3"], visibles: ["s2", "s9"] }),
    ["s2"]
  );
});

test("un sujet coché deux fois ne compte qu'une", () => {
  assert.deepEqual(selectionVisible({ selection: ["s1", "s1"], visibles: ["s1"] }), ["s1"]);
  assert.deepEqual(etatDeLaCaseDeTete({ selection: ["s1", "s1"], visibles: ["s1", "s2"] }), "partielle");
});

/**
 * Les marquages sont **ceux qui existent déjà** pour un sujet seul : un lot n'a
 * pas ses propres verbes, sans quoi fermer quarante sujets ne ferait pas la
 * même chose que fermer quarante fois un sujet (règle 10).
 */
test("chaque marquage porte l'action que l'écran connaît déjà", () => {
  assert.deepEqual(MARQUAGES.map((marquage) => marquage.cle), ["ouvert", "ferme", "non-planifie"]);

  assert.equal(actionDuMarquage("ouvert"), "issue:reopen");
  assert.equal(actionDuMarquage("ferme"), "issue:close:realized");
  assert.equal(actionDuMarquage("non-planifie"), "issue:close:dismissed");
  assert.equal(actionDuMarquage("effacer"), "", "un marquage inventé n'a pas d'action");
});

test("le nombre sélectionné se dit, et rien ne se dit à zéro", () => {
  assert.equal(phraseDeLaSelection(0), "");
  assert.equal(phraseDeLaSelection(1), "1 sujet sélectionné");
  assert.equal(phraseDeLaSelection(12), "12 sujets sélectionnés");
});
