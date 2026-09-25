/**
 * La poignée de redimensionnement : le sens du geste, et l'axe.
 *
 * ## Pourquoi cette épreuve existe
 *
 * Le composant savait déjà tirer dans les deux sens et sur les deux axes. Ce
 * qu'on n'avait jamais éprouvé, c'est **ce que `sens` et `axe` font** — et la
 * console de l'écran « Écrire du Mdall » en a fait les frais : son commentaire
 * annonçait « elle se tire depuis la gauche », le code ne passait pas le sens,
 * et le panneau rétrécissait quand la souris l'élargissait. Personne ne pouvait
 * le voir en relisant : le commentaire disait la bonne règle (règle 12 — une
 * consigne qu'on ne vérifie pas est une intention).
 *
 * ## Le faux DOM tient en vingt lignes, et c'est voulu
 *
 * Le composant ne demande que trois choses : une poignée qui écoute, une fenêtre
 * qui écoute, et des événements qui portent une position. Monter un navigateur
 * pour éprouver cela cacherait ce qui est en jeu derrière ce qui ne l'est pas.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { bindSideResizer } from "./side-resizer.js";

/** Un élément qui retient ses écoutes, et sait les déclencher. */
function unElement() {
  const ecoutes = new Map();
  return {
    style: {},
    addEventListener: (quoi, fait) => ecoutes.set(quoi, fait),
    removeEventListener: (quoi) => ecoutes.delete(quoi),
    declencher: (quoi, evenement) => ecoutes.get(quoi)?.({ preventDefault() {}, ...evenement }),
    ecoute: (quoi) => ecoutes.has(quoi)
  };
}

/**
 * Tirer la poignée de `depart` à `arrivee`, et rendre les largeurs vues.
 *
 * La fenêtre est posée le temps du geste : le composant y écoute le mouvement
 * et le relâchement, parce qu'on sort de la poignée dès le premier pixel.
 */
function tirer(poignee, { depart, arrivee, axe = "x" }) {
  const fenetre = new Map();
  const avant = globalThis.window;
  globalThis.window = {
    addEventListener: (quoi, fait) => fenetre.set(quoi, fait),
    removeEventListener: (quoi) => fenetre.delete(quoi)
  };

  try {
    const cle = axe === "y" ? "clientY" : "clientX";
    poignee.declencher("pointerdown", { [cle]: depart });
    fenetre.get("pointermove")?.({ [cle]: arrivee });
    fenetre.get("pointerup")?.({ [cle]: arrivee });
  } finally {
    globalThis.window = avant;
  }
}

function brancher({ largeur = 300, ...reste } = {}) {
  const poignee = unElement();
  const vues = [];
  const debrancher = bindSideResizer({
    handle: poignee,
    getWidth: () => largeur,
    onResize: (une) => vues.push(une),
    ...reste
  });
  return { poignee, vues, debrancher };
}

test("sans sens, tirer vers la droite agrandit", () => {
  // Le cas d'un panneau collé au bord gauche : sa poignée est du côté qui bouge.
  const { poignee, vues } = brancher({ largeur: 300, min: 100, max: 600 });
  tirer(poignee, { depart: 300, arrivee: 340 });

  assert.deepEqual(vues, [340]);
});

test("avec sens -1, tirer vers la gauche agrandit", () => {
  // **Le défaut vu à l'écran.** La console est collée au bord droit : sa poignée
  // est du côté opposé à celui qui bouge, et tirer vers la gauche l'élargit.
  // Sans ce sens, la largeur diminuait quand la souris partait à gauche — le
  // panneau faisait l'inverse du geste.
  const { poignee, vues } = brancher({ largeur: 300, min: 100, max: 600, sens: -1 });
  tirer(poignee, { depart: 300, arrivee: 260 });

  assert.deepEqual(vues, [340]);

  // Et dans l'autre sens, il rétrécit : ce n'est pas « toujours plus grand ».
  const droite = brancher({ largeur: 300, min: 100, max: 600, sens: -1 });
  tirer(droite.poignee, { depart: 300, arrivee: 340 });
  assert.deepEqual(droite.vues, [260]);
});

test("sur l'axe y, c'est la position verticale qui compte", () => {
  // Une hauteur se tire de haut en bas. Lire `clientX` ici rendrait une poignée
  // qui ne bouge que si l'on va de travers.
  const { poignee, vues } = brancher({ largeur: 200, min: 50, max: 500, axe: "y", sens: -1 });
  tirer(poignee, { depart: 400, arrivee: 330, axe: "y" });

  assert.deepEqual(vues, [270]);

  // Un mouvement horizontal ne fait rien du tout : `clientY` ne bouge pas.
  const detravers = brancher({ largeur: 200, min: 50, max: 500, axe: "y", sens: -1 });
  tirer(detravers.poignee, { depart: 400, arrivee: 400, axe: "y" });
  assert.deepEqual(detravers.vues, [200]);
});

test("les bornes tiennent, dans les deux sens", () => {
  // Sans elles, on ferait disparaître un panneau ou l'on mangerait l'écran — et
  // il n'y aurait plus de poignée pour revenir.
  const petit = brancher({ largeur: 300, min: 240, max: 600, sens: -1 });
  tirer(petit.poignee, { depart: 300, arrivee: 900 });
  assert.deepEqual(petit.vues, [240]);

  const grand = brancher({ largeur: 300, min: 240, max: 600, sens: -1 });
  tirer(grand.poignee, { depart: 900, arrivee: 0 });
  assert.deepEqual(grand.vues, [600]);
});

test("le guide suit le pointeur sur l'axe qu'on tire", () => {
  // Il dit où l'on va tomber, y compris quand la largeur bute : sans lui, on
  // continue de tirer sans comprendre que rien ne bouge.
  const guide = { style: {} };
  const { poignee } = brancher({ largeur: 200, min: 50, max: 500, axe: "y", sens: -1, guide });
  tirer(poignee, { depart: 400, arrivee: 330, axe: "y" });

  assert.equal(guide.style.top, "270px");
  assert.equal(guide.style.left, undefined, "un guide de hauteur ne se place pas en largeur");
  // Et il s'efface au relâchement : un trait bleu oublié à l'écran se lit comme
  // une bordure.
  assert.equal(guide.style.display, "none");
});

test("le relâchement rend la largeur finale, une seule fois", () => {
  // L'écran entier se refait là, et non à chaque pixel : à chaque pixel, il
  // serait poussif.
  const fins = [];
  const { poignee } = brancher({ largeur: 300, min: 100, max: 600, sens: -1, onEnd: (une) => fins.push(une) });
  tirer(poignee, { depart: 300, arrivee: 250 });

  assert.deepEqual(fins, [350]);
});

test("débrancher retire l'écoute : sinon chaque rendu en ajouterait une", () => {
  const { poignee, debrancher } = brancher({});
  assert.equal(poignee.ecoute("pointerdown"), true);
  debrancher();
  assert.equal(poignee.ecoute("pointerdown"), false);
});

test("sans poignée ni rappel, on rend de quoi débrancher plutôt que rien", () => {
  // L'appelant débranche toujours ; rendre `undefined` ferait tomber l'écran au
  // rendu suivant, là où il n'y avait qu'un panneau absent.
  assert.equal(typeof bindSideResizer({}), "function");
  assert.equal(typeof bindSideResizer({ handle: unElement() }), "function");
  bindSideResizer({});
});
