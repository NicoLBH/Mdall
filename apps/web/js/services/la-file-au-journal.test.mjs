import test from "node:test";
import assert from "node:assert/strict";

import { laFileAuJournal, leMotDeLaFile, lesVersementsAuJournal } from "./la-file-au-journal.js";
import { ORIGINE, executionsAGarder, partitionnerActions } from "./run-partition.js";

const uneLigne = (des = {}) => ({
  id: "versement-1", statut: "en_cours", fichiers: [{ nom: "a.eml" }, { nom: "b.eml" }],
  avancement: {}, cree_le: "2026-01-12T09:14:00.000Z", ...des
});

test("un versement en cours devient une exécution vive", () => {
  const vue = laFileAuJournal(uneLigne());
  // C'est ce mot qui fait le sablier, et qui fait qu'une relecture de la base
  // ne l'efface pas.
  assert.equal(vue.status, "running");
  assert.equal(vue.lifecycleStatus, "running");
  assert.equal(vue.endedAt, null);
  assert.equal(vue.durationMs, null, "une exécution en cours n'a pas de durée");
});

test("un versement se range dans l'onglet des Versements, et se dit privé", () => {
  const vue = laFileAuJournal(uneLigne());
  assert.equal(vue.origine, ORIGINE.VERSEMENT);
  assert.equal(vue.privee, true);
  const piles = partitionnerActions([vue]);
  assert.equal(piles[ORIGINE.VERSEMENT].length, 1);
  assert.equal(piles[ORIGINE.PROJET].length, 0, "un dépôt annoncé partagé est une promesse fausse");
});

test("une ligne finie n'est plus vive", () => {
  // Sa trace est dans `project_runs` : la garder ici ferait deux lignes pour un
  // seul dépôt.
  assert.equal(laFileAuJournal(uneLigne({ statut: "fini" })), null);
  assert.equal(laFileAuJournal(uneLigne({ statut: "echec" })), null);
  assert.equal(laFileAuJournal(null), null);
  assert.equal(laFileAuJournal(uneLigne({ id: "" })), null, "une ligne sans identifiant ne se suit pas");
});

test("« en attente » et « en cours » ne disent pas la même chose", () => {
  // Un dépôt qui attend depuis dix minutes n'a pas le même problème qu'un dépôt
  // qui travaille depuis dix minutes.
  const attend = leMotDeLaFile(uneLigne({ statut: "en_attente" }));
  const travaille = leMotDeLaFile(uneLigne({ avancement: { fichiers: 2, lus: 2, verses: 5 } }));
  assert.match(attend, /le serveur va les prendre/);
  assert.notEqual(attend, travaille);
  assert.match(travaille, /5 messages versés/);
});

test("un rangement sans nouvelles se dit quand même", () => {
  // Le serveur n'a pas encore écrit d'avancement : une phrase vide laisserait
  // une ligne muette dans le journal.
  assert.match(leMotDeLaFile(uneLigne({ avancement: {} })), /en cours/);
});

test("la ligne est datée de son dépôt, pas de l'instant où on la regarde", () => {
  const vue = laFileAuJournal(uneLigne());
  assert.equal(vue.startedAt, new Date("2026-01-12T09:14:00.000Z").getTime());
});

test("une exécution vive de la file survit à la relecture de la base", () => {
  // C'est ce qui manquait au tour précédent : la ligne disparaissait au moment
  // même où l'on allait la regarder.
  const vue = laFileAuJournal(uneLigne());
  const gardees = executionsAGarder([vue], [{ id: "course-ancienne", status: "completed" }]);
  assert.deepEqual(gardees.map((une) => une.id), ["versement-1"]);
});

test("le détail porte les comptes, et il existe même sans avancement", () => {
  // Sans étapes, la ligne s'ouvre sur une page vide.
  const vue = laFileAuJournal(uneLigne());
  const etapes = vue.details.corpus.steps;
  assert.equal(etapes.length, 1);
  assert.deepEqual(etapes[0].lignes, ["Fichiers : 2", "Messages versés : 0"]);
});

test("une file mêlée ne rend que ses lignes vives", () => {
  const vues = lesVersementsAuJournal([
    uneLigne({ id: "a", statut: "en_attente" }),
    uneLigne({ id: "b", statut: "fini" }),
    uneLigne({ id: "c", statut: "en_cours" })
  ]);
  assert.deepEqual(vues.map((une) => une.id), ["a", "c"]);
  assert.deepEqual(lesVersementsAuJournal(null), []);
});

/**
 * **Un dépôt, une ligne — même à la deuxième relecture.**
 *
 * L'onglet Actions relit la base à chaque venue. `executionsAGarder` garde
 * toute exécution vive que la base ne porte pas ; or la file n'est pas dans ce
 * que la base rend comme exécutions. À la seconde relecture, le versement
 * apparaissait donc deux fois : celui que la file vient de rendre, et celui que
 * la page gardait depuis la première.
 *
 * Le banc l'a montré au premier essai — « Versements 2 » pour un seul dépôt.
 */
test("un versement vif ne se double pas d'une relecture à l'autre", () => {
  const vue = laFileAuJournal(uneLigne());
  const enMemoire = [vue];
  const enFile = lesVersementsAuJournal([uneLigne()]);

  // Ce que la relecture garde en plus de la file : rien.
  const gardees = executionsAGarder(enMemoire, [...enFile]);
  assert.deepEqual(gardees, [], "la ligne de la file est comptée deux fois");
});

/**
 * **Une étape en cours ne porte pas de coche verte.**
 *
 * L'écran montrait « Rangement en cours sur le serveur… » sous un bandeau
 * « En cours », et juste en dessous une boîte verte cochée « Rangement en
 * cours ». Deux choses contraires dans la même vue — et c'est la rassurante
 * qu'on croit.
 */
test("l'étape d'un versement en cours se dit en cours", async () => {
  const { buildRunGraph } = await import("./run-workflow.js");
  const vue = laFileAuJournal(uneLigne());

  assert.equal(vue.details.corpus.steps[0].statut, "en-cours");

  const noeuds = buildRunGraph(vue);
  const boite = noeuds.find((un) => un.id === "en_cours");
  assert.ok(boite, "l'étape n'est pas dans le chemin d'exécution");
  assert.equal(boite.enCours, true);
  assert.equal(boite.icon, "sync", "une coche dit que c'est terminé");
  assert.notEqual(boite.tone, "ok");
});

test("l'étape d'un versement en attente se dit en cours, elle aussi", () => {
  // Elle n'est pas terminée non plus : rien n'a encore été pris.
  const vue = laFileAuJournal(uneLigne({ statut: "en_attente" }));
  assert.equal(vue.details.corpus.steps[0].statut, "en-cours");
  assert.equal(vue.details.corpus.steps[0].label, "En attente du serveur");
});
