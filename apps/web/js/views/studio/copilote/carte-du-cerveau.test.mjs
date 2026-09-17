/**
 * La carte du cerveau dans le fil.
 *
 * ## Ce que ces gardes attrapent
 *
 * **Un pourcentage qui ne dit pas s'il est bon.** « 67 % » tout seul se lit
 * comme une note ; ce qui compte est ce que les 33 % restants coûtent — un
 * changement en amont qui ne recalcule rien en aval.
 *
 * **Et un bouton qui rouvre le mauvais dessin.** La carte désigne son matériau
 * par la place de l'exécution dans le fil ; une place perdue rouvre celui d'un
 * autre message, ou rien.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { motDeLaRejouabilite, renderCarteDuCerveau } from "./carte-du-cerveau.js";

const lecture = (liens) => ({
  valeurs: { total: 12, socle: 4 }, regles: 3, profondeur: 5, liens
});

test("le taux de rejouabilité dit aussi ce qu'il veut dire", () => {
  assert.deepEqual(
    motDeLaRejouabilite(lecture({ total: 10, parUneRegle: 10, sansRegle: 0, partParUneRegle: 100 })),
    { mot: "100 %", quoi: "tout le dessin se rejoue" }
  );
  assert.deepEqual(
    motDeLaRejouabilite(lecture({ total: 10, parUneRegle: 0, sansRegle: 10, partParUneRegle: 0 })),
    { mot: "0 %", quoi: "rien ne se rejoue encore" }
  );

  const moitie = motDeLaRejouabilite(lecture({ total: 9, parUneRegle: 6, sansRegle: 3, partParUneRegle: 67 }));
  assert.equal(moitie.mot, "67 %");
  assert.match(moitie.quoi, /3 liens orange ne passent par aucune règle/);
});

/** Zéro lien n'est pas zéro pour cent : l'un est une absence, l'autre un état. */
test("sans lien, la carte ne prétend pas à un pourcentage", () => {
  assert.deepEqual(
    motDeLaRejouabilite(lecture({ total: 0, parUneRegle: 0, sansRegle: 0, partParUneRegle: null })),
    { mot: "—", quoi: "aucun lien dessiné" }
  );
  assert.equal(motDeLaRejouabilite({}).mot, "—");
});

test("la carte porte les trois chiffres et de quoi ouvrir le dessin", () => {
  const html = renderCarteDuCerveau(
    lecture({ total: 9, parUneRegle: 6, sansRegle: 3, partParUneRegle: 67 }), "2:0");

  assert.match(html, /12<\/b>\s*<span>affirmations/);
  assert.match(html, /3<\/b>\s*<span>règles/);
  assert.match(html, /67 %<\/b>\s*<span>se rejoue/);
  assert.match(html, /5 pas de chaîne/);
  assert.match(html, /data-copilote-cerveau="2:0"/, "le bouton sait quel dessin rouvrir");
  assert.match(html, /Ouvrir le cerveau/);
});

/**
 * **La carte marque la place du dessin, elle ne le monte pas.**
 *
 * Un module qui dessine ne s'importe pas dans un test — c'est une toile et une
 * boucle d'animation. Celui-ci rend du HTML et un creux ; c'est l'écran qui y
 * pose le dessin après le rendu, et c'est lui qui le retire.
 */
test("la carte laisse un creux, désigné par la place du dessin", () => {
  const html = renderCarteDuCerveau(lecture({ total: 2, parUneRegle: 2, sansRegle: 0, partParUneRegle: 100 }), "4:1");

  assert.match(html, /data-copilote-cerveau-scene="4:1"/);
  assert.doesNotMatch(html, /<canvas/, "le creux est vide : la carte ne dessine pas");
});

/**
 * **Le bouton dit ce qu'on gagne à ouvrir.** « Ouvrir le cerveau » sous un
 * dessin déjà visible ne promet rien : ce qui manque au cadre — les réglages,
 * les secteurs, l'onde au clic — doit se lire, sinon personne ne clique.
 */
test("le bouton promet ce que le cadre n'a pas", () => {
  const html = renderCarteDuCerveau(lecture({ total: 2, parUneRegle: 1, sansRegle: 1, partParUneRegle: 50 }), 0);

  assert.match(html, /Ouvrir le cerveau en grand/);
  assert.match(html, /les réglages, les secteurs, l'onde au clic/);
});

test("sans lecture, il n'y a pas de carte", () => {
  assert.equal(renderCarteDuCerveau(null), "");
  assert.equal(renderCarteDuCerveau(), "");
});

/** La sélection se dit : un dessin filtré qui se présente comme le tout est faux. */
test("une sélection se lit dans l'en-tête de la carte", () => {
  const html = renderCarteDuCerveau({
    ...lecture({ total: 2, parUneRegle: 1, sansRegle: 1, partParUneRegle: 50 }),
    selection: "nature:constat"
  }, 0);

  assert.match(html, /nature:constat/);
});
