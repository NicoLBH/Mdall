import test from "node:test";
import assert from "node:assert/strict";

import {
  LE_GESTE, SORTE, laLigneDunVersement, leMotDeLaBarre, leMotDeLaFin, leMotDuDebut,
  leNomDeLaction, leSortDeLaction, lesEtapesDunVersement
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

/* ── Ce qu'un versement laisse en base ───────────────────────────────────── */

test("le geste porte le même nom que l'onglet qui le range", async () => {
  const { ORIGINE } = await import("./run-partition.js");
  assert.equal(LE_GESTE, ORIGINE.VERSEMENT);
});

test("un versement est écrit personnel, sans quoi il serait lu par le projet", () => {
  const ligne = laLigneDunVersement({
    journal: { fichiers: 24, lus: 24, verses: 187 }, dite: "187 messages versés",
    startedAt: Date.now()
  });
  assert.equal(ligne.personnelle, true);
  assert.equal(ligne.geste, LE_GESTE);
  assert.equal(ligne.statut, "ok");
  assert.match(ligne.titre, /24 fichiers/);
  assert.equal(ligne.resume, "187 messages versés");
});

test("un dépôt arrêté est consigné en échec", () => {
  const ligne = laLigneDunVersement({
    journal: { fichiers: 24, arrete: "ce projet n'accepte pas d'écriture depuis votre session" },
    dite: "", startedAt: Date.now()
  });
  assert.equal(ligne.statut, "echec");
  assert.match(ligne.resume, /interrompu/);
});

test("le versement est daté de son début, pas de sa fin", () => {
  const debut = Date.now() - 90_000;
  const ligne = laLigneDunVersement({ journal: { fichiers: 2 }, dite: "x", startedAt: debut });
  assert.equal(ligne.startedAt, new Date(debut).toISOString());
  assert.ok(ligne.durationMs >= 90_000, "une ligne datée de sa fin durerait zéro");
  assert.ok(new Date(ligne.finishedAt).getTime() >= debut);
});

test("sans début connu, on ne prétend pas une durée", () => {
  // Zéro milliseconde serait faux ; un tiret dit qu'on ne sait pas (règle 5).
  const ligne = laLigneDunVersement({ journal: { fichiers: 2 }, dite: "x" });
  assert.equal(ligne.startedAt, null);
  assert.equal(ligne.durationMs, null);
});

test("un versement ne porte ni expéditeur, ni objet, ni nom de fichier", () => {
  // Le journal des Actions n'est pas un second index de la correspondance.
  const ligne = laLigneDunVersement({
    journal: {
      fichiers: 1, lus: 1, verses: 1,
      accrocs: ["Ourdine Ferrand - devis.msg"]
    },
    dite: "1 message versé", startedAt: Date.now()
  });
  const tout = JSON.stringify(ligne);
  assert.doesNotMatch(tout, /Ourdine/);
  assert.doesNotMatch(tout, /\.msg/);
});

test("les trois comptes sont toujours des étapes, même à zéro", () => {
  const etapes = lesEtapesDunVersement({ fichiers: 3, lus: 3, verses: 0, pieces: 0 });
  assert.deepEqual(etapes.map((une) => une.id), ["lecture", "messages", "pieces"]);
  assert.deepEqual(etapes[2].lignes, ["Pièces : 0"]);
});

test("les doublons évités et les accrocs ne s'ajoutent que s'il y en a", () => {
  const sans = lesEtapesDunVersement({ fichiers: 1, lus: 1, verses: 1 });
  assert.equal(sans.some((une) => une.id === "deja"), false);
  assert.equal(sans.some((une) => une.id === "accrocs"), false);

  const avec = lesEtapesDunVersement({ dejaLa: 2, piecesDejaLa: 3, refuses: 1 });
  assert.deepEqual(avec.find((une) => une.id === "deja").lignes, ["Exemplaires : 5"]);
  assert.equal(avec.find((une) => une.id === "accrocs").statut, "echec");
});

/* ── `arrete: false` n'est pas un motif d'arrêt ──────────────────────────── */

/**
 * **Le défaut que ce banc a trouvé dans un navigateur, et qu'aucune épreuve ne
 * voyait.** Un dépôt réussi porte `arrete: false` (`unJournalNeuf()`). Lu par
 * `String(valeur ?? "")`, cela donne `"false"` — une chaîne non vide, donc vraie.
 * Tout dépôt réussi était donc consigné « Dépouillement interrompu : false », en
 * échec, alors que les mails étaient rangés.
 */
test("un dépôt réussi n'est pas dit interrompu", () => {
  const reussi = { fichiers: 2, lus: 2, verses: 2, fini: true, arrete: false };

  assert.equal(leMotDeLaFin(reussi, "2 messages versés"), "2 messages versés");
  assert.doesNotMatch(leMotDeLaFin(reussi, "2 messages versés"), /interrompu/);
  assert.doesNotMatch(leMotDeLaFin(reussi, "2 messages versés"), /false/);
  assert.equal(leSortDeLaction(reussi), "success");
  assert.equal(laLigneDunVersement({ journal: reussi, dite: "2 messages versés" }).statut, "ok");
});

test("un arrêt qui est une phrase reste un arrêt", () => {
  const arrete = { fichiers: 2, arrete: "la base n'a pas répondu : le lot n'a pas été rangé" };
  assert.match(leMotDeLaFin(arrete, ""), /interrompu : la base n'a pas répondu/);
  assert.equal(leSortDeLaction(arrete), "error");
  assert.equal(laLigneDunVersement({ journal: arrete }).statut, "echec");
});

test("un arrêt qui serait `true` n'est pas un motif non plus", () => {
  // `true` ne dit pas ce qui s'est passé. Le donner à lire comme motif
  // afficherait « Dépouillement interrompu : true ».
  const journal = { fichiers: 1, arrete: true };
  assert.doesNotMatch(leMotDeLaFin(journal, "1 message versé"), /true/);
});
