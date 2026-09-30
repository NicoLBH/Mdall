import test from "node:test";
import assert from "node:assert/strict";

import {
  SORTE, leMotDeLaBarre, leMotDeLaFin, leMotDuDebut, leNomDeLaction, leSortDeLaction
} from "./le-journal-du-depouillement.js";

test("l'action porte un nom qui compte ses fichiers, et s'accorde", () => {
  assert.equal(leNomDeLaction(1), "Dépouillement de 1 fichier de messagerie");
  assert.equal(leNomDeLaction(20), "Dépouillement de 20 fichiers de messagerie");
  assert.equal(SORTE, "depouillement");
});

/**
 * **Le mot du début dit que ce n'est pas fini.** Une ligne qui ressemble à une
 * ligne terminée ferait croire que les mails sont rangés alors qu'ils partent.
 */
test("le journal dit que le traitement n'est pas terminé, et qu'on peut partir", () => {
  const dit = leMotDuDebut(20);
  assert.match(dit, /en cours/);
  assert.match(dit, /continuer ailleurs/);
  assert.match(dit, /se mettra à jour/);
});

/**
 * **La phrase de la fin est celle du convoi.** Deux comptes rendus du même
 * dépôt auraient fini par ne pas dire la même chose (règle 4).
 */
test("la fin reprend la phrase du convoi", () => {
  assert.equal(leMotDeLaFin({ fini: true }, "3 fichiers · 187 messages versés"),
    "3 fichiers · 187 messages versés");
});

test("un arrêt se dit comme un arrêt, et nomme sa cause", () => {
  const dit = leMotDeLaFin({ arrete: "votre session n'a pas répondu" });
  assert.match(dit, /^Dépouillement interrompu/);
  assert.match(dit, /votre session n'a pas répondu/);
});

test("rien de dépouillé ne laisse pas la ligne muette", () => {
  assert.equal(leMotDeLaFin(null, ""), "Rien n'a été dépouillé.");
});

/**
 * **Un fichier illisible ne fait pas échouer le dépôt** : les autres sont
 * rangés, et le journal les nomme. Ce qui échoue, c'est un arrêt — plus rien
 * n'est parti après lui.
 */
test("le sort distingue l'accroc de l'échec", () => {
  assert.equal(leSortDeLaction({ verses: 20 }), "success");
  assert.equal(leSortDeLaction({ verses: 19, illisibles: 1 }), "warning");
  assert.equal(leSortDeLaction({ verses: 19, refuses: 1 }), "warning");
  assert.equal(leSortDeLaction({ arrete: "la base n'a pas répondu" }), "error");
  assert.equal(leSortDeLaction(null), "success");
});

/** La barre dit où l'on en est en fichiers, et que le journal prendra la suite. */
test("le mot de la barre compte les fichiers et annonce le relais", () => {
  const dit = leMotDeLaBarre({ fichiers: 20, lus: 7 });
  assert.match(dit, /7 sur 20 fichiers/);
  assert.match(dit, /journal des Actions/);
  assert.equal(leMotDeLaBarre({ fichiers: 0 }), "");
  assert.equal(leMotDeLaBarre(null), "");
});
