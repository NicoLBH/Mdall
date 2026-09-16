/**
 * L'état d'une ligne, et le signe qui le dit.
 *
 * ## Ce que ces gardes attrapent
 *
 * Un sujet **abandonné** — clos parce qu'il ne tenait pas, ou parce qu'il
 * faisait double emploi — prenait la coche verte de ce qui est fait dans deux
 * des trois tableaux qui montrent des sujets. C'est le contraire de ce qui
 * s'est passé, et c'est muet : la ligne est là, lisible, avec le mauvais signe.
 *
 * L'abandon s'écrit de trois façons selon d'où vient la ligne — le statut de la
 * base, le motif de fermeture, l'état de relecture. Chaque cas est ici, parce
 * qu'un module qui n'en lirait qu'un seul passerait tous les tests d'un écran
 * et se tromperait sur l'autre.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ETAT_DU_SUJET, etatDeLaProposition, etatDunSujet, renderIconeDetat, sujetOuvert
} from "./etats-des-lignes.js";
import { PROPOSITION } from "../../services/proposition-state.js";

/* ── Les sujets ──────────────────────────────────────────────────────────── */

test("un sujet ouvert porte le signe de ce qui est en cours", () => {
  const etat = etatDunSujet({ id: "s-1", status: "open" });

  assert.equal(etat.cle, ETAT_DU_SUJET.OUVERT);
  assert.equal(etat.icone, "issue-opened");
  assert.equal(etat.mot, "Ouvert");
  assert.ok(sujetOuvert({ status: "open" }));
});

test("un sujet fermé parce qu'il est fait porte la coche", () => {
  const etat = etatDunSujet({ id: "s-2", status: "closed", closure_reason: "realized" });

  assert.equal(etat.cle, ETAT_DU_SUJET.FERME);
  assert.equal(etat.icone, "check-circle");
  assert.equal(etat.mot, "Fermé");
  assert.ok(!sujetOuvert({ status: "closed" }));
});

/**
 * **Les trois écritures de l'abandon**, et pourquoi elles y sont toutes.
 *
 * La charge qui traverse les projets lit les colonnes de la base — `status` et
 * `closure_reason`. L'écran d'un projet, lui, lit ce que le geste vient
 * d'écrire dans son propre état — `review_state`. Elles ne disent pas la même
 * chose au même moment, et n'en regarder qu'une revient à ne voir l'abandon que
 * sur l'écran qui l'a provoqué.
 */
for (const [comment, sujet] of [
  ["le statut de la base : non pertinent", { status: "closed_invalid" }],
  ["le statut de la base : doublon", { status: "closed_duplicate" }],
  ["le motif de fermeture", { status: "closed", closure_reason: "non_pertinent" }],
  ["le motif de fermeture, doublon", { status: "closed", closure_reason: "duplicate" }],
  ["l'état de relecture : écarté", { status: "closed", review_state: "dismissed" }],
  ["l'état de relecture : rejeté", { status: "closed", review_state: "rejected" }],
  ["ce que `raw` porte, quand l'entité le range là", { raw: { status: "closed_duplicate" } }]
]) {
  test(`un sujet abandonné ne prend pas la coche de ce qui est fait — ${comment}`, () => {
    const etat = etatDunSujet(sujet);

    assert.equal(etat.cle, ETAT_DU_SUJET.ABANDONNE, comment);
    assert.equal(etat.icone, "skip", "le signe de ce qu'on a passé");
    assert.notEqual(etat.icone, "check-circle", "et surtout pas celui de ce qui est fait");
    assert.equal(etat.mot, "Abandonné");
  });
}

/**
 * **Un sujet abandonné n'est pas ouvert.** Compter les ouverts comme « tout ce
 * qui n'est pas fermé » les y remettrait, et le compte du filtre dirait autre
 * chose que la liste qu'il montre.
 */
test("un sujet abandonné ne compte pas parmi les ouverts", () => {
  assert.ok(!sujetOuvert({ status: "closed_duplicate" }));
  assert.ok(!sujetOuvert({ status: "open", review_state: "rejected" }));
});

/** Sans rien savoir, on ne prétend pas qu'un sujet est clos (règle 5). */
test("un sujet sans statut se lit comme ouvert, et rien ne s'écrit à sa place", () => {
  const etat = etatDunSujet(null);

  assert.equal(etat.cle, ETAT_DU_SUJET.OUVERT);
  assert.ok(!String(etat.mot).includes("undefined"));
});

/* ── Les propositions ────────────────────────────────────────────────────── */

test("les trois états d'une proposition ont trois signes", () => {
  assert.equal(etatDeLaProposition({ status: PROPOSITION.OPEN }).icone, "git-pull-request");
  assert.equal(etatDeLaProposition({ status: PROPOSITION.MERGED }).icone, "git-compare");
  assert.equal(etatDeLaProposition({ status: PROPOSITION.CLOSED }).icone, "git-pull-request-closed");

  assert.equal(etatDeLaProposition({ status: PROPOSITION.CLOSED }).mot, "Refusée");
  assert.equal(etatDeLaProposition().cle, PROPOSITION.OPEN, "sans statut, elle attend encore");
});

/**
 * **Le même signe est lu d'un seul endroit.** Le tableau des propositions de
 * tous les projets le nommait chez lui ; il continue de le proposer, et c'est
 * le même objet — deux définitions auraient divergé au premier réglage.
 */
test("le tableau des propositions lit l'état du même endroit", async () => {
  const { etatDeLaProposition: depuisLeTableau } = await import("./tableau-des-propositions.js");

  assert.equal(depuisLeTableau, etatDeLaProposition);
});

/* ── Le signe lui-même ───────────────────────────────────────────────────── */

/**
 * La couleur est **dans l'attribut de style**, comme l'icône de l'onglet d'un
 * projet l'a toujours été : une seconde façon de peindre la même icône
 * divergerait au premier réglage.
 */
test("le signe porte sa couleur et la coquille commune", () => {
  const html = renderIconeDetat(etatDunSujet({ status: "open" }));

  assert.match(html, /class="issue-status-icon"/);
  assert.match(html, /style="color: var\(--fgColor-open\)"/);

  const abandonne = renderIconeDetat(etatDunSujet({ status: "closed_invalid" }));
  assert.match(abandonne, /xlink:href="[^"]*#skip"|href="[^"]*#skip"/, "et c'est bien l'icône demandée");
});
