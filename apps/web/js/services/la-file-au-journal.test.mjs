import test from "node:test";
import assert from "node:assert/strict";

import {
  combienDePieces,
  enDuree, estUnGesteDeLaFile, laFileAuJournal, laProvenanceDuGeste, leMotDeLaFile,
  lesEtapesDeLaFile, lesVersementsAuJournal
} from "./la-file-au-journal.js";
import {
  LE_BATTEMENT_DU_JOURNAL, ORIGINE, executionsAGarder, partitionnerActions, quelqueChoseTourne
} from "./run-partition.js";

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
  // **Le même sablier que dans le titre de l'exécution.** Le graphe portait une
  // double flèche — celle d'une synchronisation —, et le bandeau une pastille
  // qui bat : deux dessins pour « ça tourne », à trois centimètres l'un de
  // l'autre sur le même écran (règle 10).
  assert.equal(boite.icon, "dot-fill-pending", "une coche dit que c'est terminé");
  assert.notEqual(boite.tone, "ok");
});

test("l'étape d'un versement en attente se dit en cours, elle aussi", () => {
  // Elle n'est pas terminée non plus : rien n'a encore été pris.
  const vue = laFileAuJournal(uneLigne({ statut: "en_attente" }));
  assert.equal(vue.details.corpus.steps[0].statut, "en-cours");
  assert.equal(vue.details.corpus.steps[0].label, "En attente du serveur");
});

/**
 * **Le serveur ne prévient personne.** Depuis que le versement a lieu hors de
 * la page, rien n'annonce au navigateur qu'une étape vient de finir : la ligne
 * gardait son disque orange jusqu'à ce qu'on recharge. Le journal relit donc
 * tant qu'il lui reste quelque chose de vif — et cesse dès qu'il n'en reste
 * plus, sans quoi un onglet oublié interroge la base toute la nuit.
 */
test("le journal relit tant qu'une exécution tourne, et pas après", () => {
  assert.equal(quelqueChoseTourne([{ status: "completed" }, { status: "running" }]), true);
  assert.equal(quelqueChoseTourne([{ status: "completed" }, { status: "failed" }]), false);
  assert.equal(quelqueChoseTourne([]), false);
  assert.equal(quelqueChoseTourne(null), false);
});

/**
 * **La même marque du vivant que pour `executionsAGarder`.** Une ligne de file
 * naît « running » ; deux définitions du vivant auraient fini par ne pas dire
 * la même chose (règle 4).
 */
test("une ligne de la file compte comme vive pour le battement", () => {
  const vives = lesVersementsAuJournal([uneLigne({ statut: "en_cours" })]);
  assert.equal(quelqueChoseTourne(vives), true);
  assert.equal(executionsAGarder(vives, []).length, 1);
});

test("le battement ne descend pas sous la seconde", () => {
  // Une relecture par seconde ferait, sur un versement de vingt mails, plus de
  // requêtes que le versement n'a de fichiers.
  assert.equal(Number.isInteger(LE_BATTEMENT_DU_JOURNAL), true);
  assert.equal(LE_BATTEMENT_DU_JOURNAL >= 1000, true);
});

/* ── La lecture de comptes rendus se montre aussi ─────────────────────────── */

const uneLecture = (surcharge = {}) => ({
  id: "f1",
  geste: "comptes_rendus",
  statut: "en_cours",
  fichiers: [],
  documents: [{ id: "d1", nom: "CR 01.pdf" }, { id: "d2", nom: "CR 02.pdf" }],
  avancement: {},
  cree_le: "2026-10-01T09:00:00Z",
  ...surcharge
});

/**
 * **Le geste dit quelle colonne compter.** Les mails portent des chemins
 * d'octets, les comptes rendus des identifiants de documents : compter sur la
 * mauvaise annonçait « Versement de 0 fichier » sur une lecture de dix-neuf.
 */
test("une lecture de comptes rendus se nomme pour ce qu'elle est", () => {
  const ligne = laFileAuJournal(uneLecture());

  assert.equal(ligne.name, "Lecture de 2 comptes rendus de chantier");
  assert.equal(ligne.triggerLabel, "Lecture de comptes rendus");
  assert.equal(ligne.status, "running", "le sablier ne s'affiche pas");
});

test("un dépôt de messagerie garde son nom", () => {
  const ligne = laFileAuJournal({
    id: "f2", statut: "en_cours", fichiers: [{ nom: "a.msg" }], cree_le: "2026-10-01T09:00:00Z"
  });
  assert.match(ligne.name, /Versement de 1 fichier de messagerie/);
  assert.equal(ligne.triggerLabel, "Dépôt de messagerie");
});

/**
 * **L'avancement se dit avec la phrase de la file**, celle que l'écran emploie
 * déjà. En écrire une seconde ici aurait fait deux comptes rendus du même
 * travail, et l'un aurait fini par ne pas dire la même chose (règle 4).
 *
 * **Et le chemin montre un compte rendu par étape.** Il n'en montrait qu'une —
 * « Lecture en cours » — derrière laquelle dix-neuf comptes rendus tournaient
 * une heure : rien ne distinguait une file qui avance d'une file bloquée.
 */
test("l'avancement d'une lecture reprend la phrase de la file", () => {
  const ligne = laFileAuJournal(uneLecture({
    avancement: {
      arretee: false,
      pas: [
        { id: "d1", nom: "CR 01.pdf", ou: "lu", motif: "", lecture: "4 points relevés" },
        { id: "d2", nom: "CR 02.pdf", ou: "echoue", motif: "aucune page lisible" }
      ]
    }
  }));

  assert.match(ligne.summary, /1 compte rendu lu/);
  assert.match(ligne.summary, /1 n'a pas pu être lu/);

  const etapes = ligne.details.corpus.steps;
  assert.deepEqual(etapes.map((une) => une.label), ["CR 01.pdf", "CR 02.pdf"]);
  assert.deepEqual(etapes.map((une) => une.statut), ["ok", "echec"]);
  assert.deepEqual(etapes[0].lignes, ["4 points relevés"]);
  // Un échec sans motif serait une ligne rouge dont on ne saurait rien.
  assert.deepEqual(etapes[1].lignes, [{ niveau: "echec", texte: "aucune page lisible" }]);
});

/**
 * **« Depuis quand », et non « en cours ».** Une étape qui tourne depuis huit
 * minutes et une étape qui vient de partir se lisaient pareil — et c'est la
 * seule chose qu'on cherche à savoir en regardant.
 */
test("une étape qui court dit depuis combien de temps", () => {
  const maintenant = Date.parse("2026-10-01T09:10:00Z");
  const etapes = lesEtapesDeLaFile(
    {
      avancement: {
        pas: [
          { id: "d1", nom: "CR 01.pdf", ou: "lu", dureeMs: 42_000 },
          // **Une durée d'une lecture précédente traîne sur le pas qui court.**
          // Le serveur ne l'efface pas en reprenant : la file garde ce qu'elle a
          // écrit. L'écran doit donc refuser de la montrer — figée sous une
          // icône qui tourne, elle se lirait comme un temps total.
          { id: "d2", nom: "CR 02.pdf", ou: "en-cours",
            commenceLe: maintenant - 94_000, dureeMs: 12_000 },
          { id: "d3", nom: "CR 03.pdf", ou: "attend" }
        ]
      }
    },
    { statut: "en_cours", geste: "comptes_rendus", combien: 3, maintenant }
  );

  assert.deepEqual(etapes[1].lignes, ["depuis 1 min 34 s"]);
  assert.equal(etapes[1].statut, "en-cours");
  // Une durée figée sous une icône qui tourne se lirait comme un temps total.
  assert.equal(etapes[1].ms, null);
  assert.equal(etapes[0].ms, 42_000);
  assert.deepEqual(etapes[2].lignes, ["en attente"]);
  assert.equal(etapes[2].statut, "attente");
});

/** Sans début connu, on ne compte pas : un « depuis 0 s » serait faux. */
test("une étape sans date de départ ne compte pas", () => {
  const etapes = lesEtapesDeLaFile(
    { avancement: { pas: [{ id: "d1", nom: "CR.pdf", ou: "en-cours" }] } },
    { statut: "en_cours", geste: "comptes_rendus", combien: 1 }
  );
  assert.deepEqual(etapes[0].lignes, ["en cours…"]);
});

/** Un dépôt de messagerie n'a pas de pas nommés : il garde son bloc et ses nombres. */
test("un dépôt de messagerie garde son bloc unique", () => {
  const etapes = lesEtapesDeLaFile(
    { avancement: { verses: 18 } },
    { statut: "en_cours", geste: "mails", combien: 3 }
  );
  assert.equal(etapes.length, 1);
  assert.equal(etapes[0].label, "Rangement en cours");
  assert.deepEqual(etapes[0].lignes, ["Fichiers : 3", "Messages versés : 18"]);
});

/**
 * **Rien n'est pris : une seule étape.** Détailler dix-neuf attentes avant que
 * le serveur ait seulement répondu ferait un mur de gris qui n'apprend rien.
 */
test("une file qui attend ne détaille pas ses dix-neuf attentes", () => {
  const etapes = lesEtapesDeLaFile(
    { avancement: { pas: [{ id: "d1", ou: "attend" }, { id: "d2", ou: "attend" }] } },
    { statut: "en_attente", geste: "comptes_rendus", combien: 2 }
  );
  assert.equal(etapes.length, 1);
  assert.equal(etapes[0].label, "En attente du serveur");
});

test("une durée se dit en secondes, puis en minutes, puis en heures", () => {
  assert.equal(enDuree(0), "0 s");
  assert.equal(enDuree(42_000), "42 s");
  assert.equal(enDuree(60_000), "1 min");
  assert.equal(enDuree(94_000), "1 min 34 s");
  assert.equal(enDuree(3_600_000), "1 h");
  assert.equal(enDuree(3_900_000), "1 h 5 min");
});

test("une lecture qui attend dit qu'elle attend, et combien", () => {
  const ligne = laFileAuJournal(uneLecture({ statut: "en_attente" }));
  assert.match(ligne.summary, /2 comptes rendus envoyés/);
  assert.match(ligne.summary, /le serveur va les prendre/);
  assert.equal(ligne.details.corpus.steps[0].label, "En attente du serveur");
});

/**
 * **En cours n'est pas fait.** L'étape porte « en-cours », que le graphe peint
 * en icône qui tourne. « ok » l'aurait peinte en vert avec sa coche, sous un
 * bandeau qui dit « En cours » — deux choses contraires dans la même vue, et
 * c'est la rassurante qu'on croit.
 */
test("une lecture en cours n'est jamais peinte comme faite", () => {
  const ligne = laFileAuJournal(uneLecture());
  assert.equal(ligne.details.corpus.steps[0].statut, "en-cours");
  assert.equal(ligne.endedAt, null);
  assert.equal(ligne.durationMs, null);
});

/**
 * **Le geste décide de l'onglet, et l'onglet décide de qui lit.**
 *
 * Une course rangée dans « Partagées » annoncerait comme lue par tout le projet
 * ce que la base ne rend qu'à son auteur. Les deux gestes de la file — les mails
 * et les comptes rendus — vont donc dans « Versements », et rien d'autre n'y va.
 */
test("les deux gestes de la file se reconnaissent, et eux seuls", () => {
  assert.equal(estUnGesteDeLaFile("mails"), true);
  assert.equal(estUnGesteDeLaFile("comptes_rendus"), true);
  assert.equal(estUnGesteDeLaFile("versement"), false);
  assert.equal(estUnGesteDeLaFile("fusion"), false);
  assert.equal(estUnGesteDeLaFile(""), false);
  assert.equal(estUnGesteDeLaFile(), false);
});

/**
 * **Le défaut vu à l'écran** : une lecture de trois comptes rendus portait
 * « Dépôt de messagerie » en sous-titre, parce que la course finie et la ligne
 * vive ne lisaient pas la même phrase.
 */
test("une lecture de comptes rendus ne se dit pas dépôt de messagerie", () => {
  assert.equal(laProvenanceDuGeste("comptes_rendus"), "Lecture de comptes rendus");
  assert.equal(laProvenanceDuGeste("mails"), "Dépôt de messagerie");
});

/**
 * **L'origine décide de l'onglet, et elle vient du geste.**
 *
 * Une lecture de comptes rendus se lance depuis l'Atelier et relit des documents
 * déjà là : c'est un essai, pas un apport. Elle s'affichait pourtant sous
 * « Versements », où l'on cherche ce qu'on a apporté
 * (`docs/dou-vient-une-execution.md`).
 */
test("une lecture en cours se range dans l'Atelier, un dépôt dans les Versements", () => {
  const lecture = laFileAuJournal({
    id: "f-1", geste: "comptes_rendus", statut: "en_cours",
    documents: [{ id: "d-1", nom: "1824_CR_12.pdf" }], cree_le: "2026-10-01T09:18:00Z"
  });
  const depot = laFileAuJournal({
    id: "f-2", statut: "en_attente",
    fichiers: [{ chemin: "a.msg" }], cree_le: "2026-10-01T09:18:00Z"
  });

  assert.equal(lecture.origine, "atelier");
  assert.equal(depot.origine, "versement");
  // Et les deux restent personnelles : l'onglet range, il ne décide pas de qui lit.
  assert.equal(lecture.privee, true);
  assert.equal(depot.privee, true);
});

test("la ligne vive et la course finie disent la même provenance", () => {
  const ligne = laFileAuJournal({
    id: "f-1", geste: "comptes_rendus", statut: "en_cours",
    documents: [{ id: "d-1", nom: "1824_CR_12.pdf" }], cree_le: "2026-10-01T09:18:00Z"
  });

  assert.equal(ligne.triggerLabel, laProvenanceDuGeste("comptes_rendus"));
  assert.equal(ligne.trigger.label, laProvenanceDuGeste("comptes_rendus"));
});

/* ── Quand chaque compte rendu a été pris ────────────────────────────────── */

/**
 * **Le chemin ne peut empiler que ce qu'il sait daté.**
 *
 * Depuis que la file lit trois comptes rendus de front, un chemin qui les
 * dessine à la suite dit que le quatrième a attendu le troisième — et l'on
 * additionne les durées de l'œil. Pour savoir ce qui a tourné ensemble, il faut
 * l'instant où le serveur a pris chacun, et c'est la file qui le porte.
 */
test("chaque pas dit quand il a commencé", () => {
  const etapes = lesEtapesDeLaFile({
    avancement: { pas: [
      { id: "a", nom: "CR 12", ou: "lu", commenceLe: 1000, dureeMs: 4000 },
      { id: "b", nom: "CR 13", ou: "en-cours", commenceLe: 1000 },
      { id: "c", nom: "CR 14", ou: "attend" }
    ] }
  }, { geste: "comptes_rendus", combien: 3, maintenant: 6000 });

  assert.deepEqual(etapes.map((une) => une.debut), [1000, 1000, null]);
});

/**
 * **Rien n'est pas zéro.** `Number(null)` vaut 0, qui est un instant fini :
 * un pas en attente se rangerait au tout début de l'exécution, avec ceux qui
 * ont réellement démarré (règle 5).
 */
test("un pas qui n'a pas commencé n'a pas d'instant", () => {
  const etapes = lesEtapesDeLaFile({
    avancement: { pas: [
      { id: "a", nom: "CR 12", ou: "attend", commenceLe: null },
      { id: "b", nom: "CR 13", ou: "attend" },
      { id: "c", nom: "CR 14", ou: "attend", commenceLe: "" },
      { id: "d", nom: "CR 15", ou: "attend", commenceLe: "bientôt" }
    ] }
  }, { geste: "comptes_rendus", combien: 4, maintenant: 6000 });

  assert.deepEqual(etapes.map((une) => une.debut), [null, null, null, null]);
});

/* ── Une famille nomme sa propre file ─────────────────────────────────────── */

test("une lecture de rapports ne s'annonce plus comme un dépôt de mails", () => {
  // C'est ce que l'écran faisait : le nom venait d'un binaire « est-ce un compte
  // rendu ? », et tout le reste tombait du côté des mails. Une analyse de rapport
  // s'affichait « Versement de 0 fichier de messagerie », déclencheur compris —
  // faux sur le travail, faux sur le nombre, faux sur l'origine.
  const vive = laFileAuJournal({
    id: "v-1", statut: "en_cours", geste: "rapports", cree_le: "2026-10-02T09:18:00Z",
    documents: [{ id: "d-1", nom: "RICT-03.pdf" }, { id: "d-2", nom: "RICT-04.pdf" }]
  });

  assert.equal(vive.name, "Lecture de 2 rapports de bureau de contrôle");
  assert.equal(vive.triggerLabel, "Lecture de rapports de contrôle");
  assert.equal(vive.origine, "atelier");

  const etapes = vive.details.corpus.steps;
  assert.equal(etapes[0].label, "Lecture en cours");
  assert.match(etapes[0].lignes.join(" "), /Rapports : 2/);
  assert.doesNotMatch(JSON.stringify(vive), /messagerie/);
});

test("les pièces se comptent dans la colonne de la famille", () => {
  // Les mails portent des chemins d'octets, les lectures des identifiants de
  // documents : compter sur la mauvaise annonce « 0 » sur une file de dix-neuf.
  assert.equal(combienDePieces({ geste: "rapports", documents: [{}, {}], fichiers: [] }), 2);
  assert.equal(combienDePieces({ geste: "mails", fichiers: [{}, {}, {}], documents: [] }), 3);
  // Une ligne sans geste est un dépôt de messagerie, comme la base le déclare.
  assert.equal(combienDePieces({ fichiers: [{}] }), 1);
});

test("un geste inconnu garde l'ancien nom, et ne se range nulle part", () => {
  // Une ligne posée par une version plus récente que cet écran reste lisible,
  // et ne se fait pas passer pour autre chose (règle 5).
  const vive = laFileAuJournal({
    id: "v-2", statut: "en_attente", geste: "plans", documents: [{ id: "d-1" }]
  });

  assert.match(vive.name, /Versement de/);
  assert.equal(vive.origine, null);
});
