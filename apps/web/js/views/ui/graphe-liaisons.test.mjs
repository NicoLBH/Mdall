/**
 * Le graphe de liaisons : ce qu'il range, et ce qu'il allume.
 *
 * Les tests parlent d'un graphe quelconque, exprès : ce composant est né dans
 * l'écran Incendie mais ne doit rien en savoir — c'est ce qui permettra de
 * montrer un jour les liaisons de la Mémoire avec le même dessin.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { rangerParProfondeur, cheminAmont } from "./graphe-liaisons.js";

/** a → b → d, et a → c → d : un losange, la forme qui piège les tris. */
const LOSANGE = {
  noeuds: [
    { id: "d", produit: "D", demande: ["B", "C"], titre: "D" },
    { id: "b", produit: "B", demande: ["A"], titre: "B" },
    { id: "a", produit: "A", demande: [], titre: "A" },
    { id: "c", produit: "C", demande: ["A"], titre: "C" }
  ],
  liens: [
    { de: "a", vers: "b", fait: "A" }, { de: "a", vers: "c", fait: "A" },
    { de: "b", vers: "d", fait: "B" }, { de: "c", vers: "d", fait: "C" }
  ]
};

test("les colonnes se lisent de gauche à droite : ce qui décide d'abord", () => {
  const colonnes = rangerParProfondeur(LOSANGE);
  assert.deepEqual(colonnes.map((c) => c.map((n) => n.id)), [["a"], ["b", "c"], ["d"]]);
});

test("un nœud est d'un cran après le plus profond de ses amonts", () => {
  const chaine = {
    noeuds: [
      { id: "x", produit: "X", demande: [] },
      { id: "y", produit: "Y", demande: ["X"] },
      { id: "z", produit: "Z", demande: ["X", "Y"] }
    ],
    liens: []
  };
  // z dépend de x et de y : il se range après y, pas à côté.
  assert.deepEqual(rangerParProfondeur(chaine).map((c) => c.map((n) => n.id)), [["x"], ["y"], ["z"]]);
});

test("un cycle ne fige pas la page", () => {
  // Le graphe est censé ne pas en avoir — le moteur le refuse —, mais un dessin
  // ne doit pas bloquer un navigateur pour autant.
  const boucle = { noeuds: [{ id: "p", produit: "P", demande: ["Q"] }, { id: "q", produit: "Q", demande: ["P"] }], liens: [] };
  assert.ok(rangerParProfondeur(boucle).length >= 1);
});

test("le chemin amont donne la distance de chacun, pas seulement le premier rang", () => {
  // C'est la chaîne entière qui explique une conclusion ; l'intensité du trait
  // décroît avec le rang, sans quoi on ne saurait plus par où l'on est arrivé.
  const rangs = cheminAmont("d", LOSANGE);
  assert.equal(rangs.get("d"), 0);
  assert.equal(rangs.get("b"), 1);
  assert.equal(rangs.get("c"), 1);
  assert.equal(rangs.get("a"), 2);
});

test("un nœud atteint par deux chemins garde le plus court", () => {
  const graphe = {
    noeuds: [
      { id: "r", produit: "R", demande: ["S", "T"] },
      { id: "s", produit: "S", demande: ["T"] },
      { id: "t", produit: "T", demande: [] }
    ],
    liens: []
  };
  // t est à un cran de r directement, à deux en passant par s : c'est un.
  assert.equal(cheminAmont("r", graphe).get("t"), 1);
});

test("sans nœud désigné, rien n'est allumé", () => {
  assert.equal(cheminAmont(null, LOSANGE).size, 0);
  assert.equal(cheminAmont("d", null).size, 0);
});

test("un graphe vide ne rend pas de colonne", () => {
  assert.deepEqual(rangerParProfondeur({ noeuds: [], liens: [] }), []);
  assert.deepEqual(rangerParProfondeur(null), []);
});
