import test from "node:test";
import assert from "node:assert/strict";

import {
  avanceeDunLot, ICONES_DU_TON, PHRASE_DU_SOUCI, phraseDeLAvancee, TON
} from "./avancee-dun-lot.js";
import { renderAvanceeDunLotHtml } from "../views/ui/avancee-dun-lot.js";

/**
 * Où en est une modification qui porte sur quarante sujets.
 *
 * Poser un label sur quarante sujets, c'est quarante écritures en base, puis
 * une relecture complète de la liste. Pendant ces secondes, l'écran ne bougeait
 * pas : on recliquait, on doutait d'avoir cliqué, on changeait de filtre au
 * milieu. Une attente qui ne se voit pas se lit comme une panne.
 */

test("en cours : le compte, et la part du cercle", () => {
  const ou = avanceeDunLot({ faits: 3, total: 40 });

  assert.equal(ou.ton, TON.COURS);
  assert.equal(ou.phrase, "3/40 sujets");
  assert.equal(ou.part, 3 / 40);
  assert.equal(ou.icone, "", "un lot en cours n'a pas de symbole : il a un cercle");
});

/**
 * **Pendant, on compte ; après, on conclut.** Le compte n'a d'intérêt que tant
 * qu'il bouge : le laisser affiché ferait relire « 40/40 » pour comprendre que
 * c'est terminé, alors que le mot le dit.
 */
test("terminé : le mot, la coche, et le cercle plein", () => {
  const ou = avanceeDunLot({ faits: 40, total: 40, fini: true });

  assert.equal(ou.ton, TON.FINI);
  assert.equal(ou.phrase, "Terminé");
  assert.equal(ou.part, 1);
  assert.equal(ou.icone, ICONES_DU_TON[TON.FINI]);
});

/**
 * **L'échec se dit, et il dit ce qui est passé.** Une modification de lot peut
 * échouer au douzième sujet ; afficher « terminé » sur un rangement fait à
 * moitié ne se découvrirait qu'en cherchant, des semaines plus tard, pourquoi
 * douze sujets n'ont pas le label qu'on croyait leur avoir posé (règle 5).
 */
test("en souci : la phrase de l'échec l'emporte sur la fin", () => {
  const ou = avanceeDunLot({ faits: 12, total: 40, fini: true, souci: "La base a refusé" });

  assert.equal(ou.ton, TON.SOUCI);
  assert.equal(ou.phrase, "La base a refusé");
  assert.equal(ou.icone, ICONES_DU_TON[TON.SOUCI]);
});

test("un échec sans phrase en a tout de même une", () => {
  assert.equal(phraseDeLAvancee({ ton: TON.SOUCI }), PHRASE_DU_SOUCI);
});

/**
 * Un cercle plein sur un lot qu'on n'a pas compté dirait « c'est fait ». Et un
 * compte qui dépasse son total ferait douter de tout le reste.
 */
test("la part reste entre rien et tout", () => {
  assert.equal(avanceeDunLot({ faits: 3, total: 0 }).part, 0);
  assert.equal(avanceeDunLot({ faits: 41, total: 40 }).part, 1);
  assert.equal(avanceeDunLot({ faits: 41, total: 40 }).faits, 40);
  assert.equal(avanceeDunLot({ faits: -2, total: 40 }).faits, 0);
});

test("le singulier s'accorde sur un lot d'un seul sujet", () => {
  assert.equal(avanceeDunLot({ faits: 0, total: 1 }).phrase, "0/1 sujet");
  assert.equal(avanceeDunLot({ faits: 0, total: 2 }).phrase, "0/2 sujets");
});

/* ── Ce qui se dessine ───────────────────────────────────────────────────── */

test("rien à montrer ne dessine rien", () => {
  assert.equal(renderAvanceeDunLotHtml(null), "");
  assert.equal(renderAvanceeDunLotHtml({}), "");
});

/**
 * La part passe par une variable CSS : c'est elle que le dégradé conique suit,
 * et la faire varier ne redessine rien d'autre que le cercle.
 */
test("le cercle porte la part, et le ton porte la couleur", () => {
  const html = renderAvanceeDunLotHtml(avanceeDunLot({ faits: 10, total: 40 }));

  assert.match(html, /--avancee-part:25\.0%/);
  assert.match(html, /avancee-lot--cours/);
  assert.match(html, /avancee-lot__cercle/);
  assert.match(html, /10\/40 sujets/);
});

/**
 * **La coche prend la place du cercle.** Un symbole ajouté à côté de lui, ou
 * plus petit que lui, ferait sursauter le bloc au moment où il change d'état.
 */
test("terminé : la coche remplace le cercle", () => {
  const html = renderAvanceeDunLotHtml(avanceeDunLot({ faits: 40, total: 40, fini: true }));

  assert.match(html, /avancee-lot--fini/);
  assert.match(html, /icons\.svg#check/);
  assert.doesNotMatch(html, /avancee-lot__cercle/);
});

test("en souci : le triangle, et la phrase telle quelle", () => {
  const html = renderAvanceeDunLotHtml(avanceeDunLot({ faits: 12, total: 40, souci: "<script>" }));

  assert.match(html, /avancee-lot--souci/);
  assert.match(html, /icons\.svg#alert/);
  assert.match(html, /&lt;script&gt;/, "la phrase d'un échec est échappée");
});

/** Elle se lit à voix haute sans qu'on ait à la chercher. */
test("la notification s'annonce", () => {
  const html = renderAvanceeDunLotHtml(avanceeDunLot({ faits: 1, total: 4 }));

  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
});
