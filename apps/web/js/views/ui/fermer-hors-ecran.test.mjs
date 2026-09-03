/**
 * Ce qui sort de l'écran se referme — et à quel moment exactement.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { estHorsCadre, fermerQuandSorti } from "./fermer-hors-ecran.js";

const ECRAN = { top: 0, bottom: 800 };

test("ce qui est en vue reste ouvert", () => {
  assert.equal(estHorsCadre({ top: 100, bottom: 400 }, ECRAN), false);
});

test("un débordement partiel ne referme pas", () => {
  // Un éditeur dont il reste deux lignes visibles se voit encore : le refermer
  // arracherait le texte sous les doigts de celui qui écrit.
  assert.equal(estHorsCadre({ top: -300, bottom: 40 }, ECRAN), false);
  assert.equal(estHorsCadre({ top: 780, bottom: 1100 }, ECRAN), false);
});

test("sorti par le haut, sorti par le bas", () => {
  assert.equal(estHorsCadre({ top: -400, bottom: -10 }, ECRAN), true);
  assert.equal(estHorsCadre({ top: 810, bottom: 1200 }, ECRAN), true);
});

test("la tolérance avance la fermeture", () => {
  // Un en-tête collant recouvre le haut de la zone : ce qui passe dessous
  // n'est plus lisible, même si ses coordonnées disent le contraire.
  assert.equal(estHorsCadre({ top: -300, bottom: 40 }, ECRAN, { marge: 60 }), true);
});

test("sans cadre, on ne referme rien", () => {
  assert.equal(estHorsCadre(null, ECRAN), false);
  assert.equal(estHorsCadre({ top: 0, bottom: 10 }, null), false);
});

test("un élément remplacé n'est pas un élément sorti", () => {
  // Un rafraîchissement retire l'élément observé et en remet un autre. Sans ce
  // garde-fou, chaque enregistrement refermait l'éditeur qu'il venait de
  // redessiner.
  const anciens = { IntersectionObserver: globalThis.IntersectionObserver, window: globalThis.window };
  let signaler = null;
  globalThis.IntersectionObserver = class {
    constructor(rappel) { signaler = rappel; }
    observe() {}
    disconnect() {}
  };
  globalThis.window = { innerHeight: 800 };
  try {
    let referme = 0;
    const element = { isConnected: false, getBoundingClientRect: () => ({ top: -900, bottom: -800 }) };
    fermerQuandSorti(element, { onSortie: () => { referme += 1; } });
    signaler([{ isIntersecting: true }]);
    signaler([{ isIntersecting: false }]);
    assert.equal(referme, 0);
  } finally {
    globalThis.IntersectionObserver = anciens.IntersectionObserver;
    globalThis.window = anciens.window;
  }
});
