/**
 * **Une lecture de compte rendu se garde entière, et se rouvre.**
 *
 * ## Ce qui s'est perdu
 *
 * La lecture est passée au serveur, et l'écran n'a plus rien montré : dix-neuf
 * comptes rendus partaient, une proposition tombait, et tout ce que l'Atelier
 * affichait n'existait nulle part. Il y avait déjà, avant, une perte plus
 * discrète : une fois le compte rendu transformé, son analyse était perdue.
 *
 * ## Ce que ces épreuves tiennent
 *
 * Que la photographie est **gelée** — c'est ce qui répond à la question des
 * sujets ouverts et fermés —, que l'ordre est celui des réunions et non celui
 * des lectures, et que « je ne sais pas » ne devient jamais « il n'y a rien ».
 */

import test from "node:test";
import assert from "node:assert/strict";

import { leSchema } from "../../../../scripts/les-colonnes-du-schema.mjs";
import {
  LE_PROCEDE_DE_LECTURE,
  LE_SELECT_DUNE_LECTURE,
  LE_SELECT_DUNE_LIGNE,
  ceQueLeSujetEstDevenu,
  laLigneDuneLecture,
  laVueDuneLecture,
  lanalyseAConserver,
  leLecteur,
  lesComptesRendusLus,
  lesLecturesEnOrdre
} from "./la-lecture-conservee.js";

const UN_POINT = {
  rang: 1, titre: "Planchers béton : reprise de nivellement", lot: "02 — GROS ŒUVRE",
  citation: "…reprise de nivellement au droit de la trémie…", page: 3, retrouve: true,
  manques: [], labels: ["CR chantier"], liens: [], sujetExistant: "s-1"
};

const UNE_LECTURE = {
  nom: "1824_CR_12.pdf",
  identite: { numero: "12", tenueLe: "2026-03-12" },
  pages: [{ page: 1, caracteres: 4200 }],
  rubriques: [{ ordre: 1, titre: "02 — GROS ŒUVRE" }],
  groupesParLot: [],
  points: [UN_POINT],
  ecartes: 0,
  mesure: { points: 1, retrouves: 1, orphelins: 0 },
  lueSur: "restitution",
  luPar: "gpt · lecture de CR v1",
  liensEcartes: [],
  coupee: false
};

const UNE_VUE = {
  lecture: UNE_LECTURE,
  confrontes: [{ rang: 1, sort: "suite", sujet: { id: "s-1", title: "Planchers", status: "open" } }],
  sujetsDuProjet: [{ id: "s-1", subject_number: 7, title: "Planchers", status: "open", parent_subject_id: null }]
};

/* ── Les colonnes existent pour de vrai ──────────────────────────────────── */

const SCHEMA = leSchema();

test("chaque colonne écrite ou relue existe dans la base", () => {
  const colonnes = SCHEMA.get("cr_lectures");
  assert.ok(colonnes?.size, "aucune migration ne déclare « cr_lectures »");

  const ligne = laLigneDuneLecture(UNE_VUE, { projectId: "c-1", documentId: "d-1" });
  const inconnues = Object.keys(ligne).filter((nom) => !colonnes.has(nom));
  assert.deepEqual(inconnues, [], `la base refuserait : ${inconnues.join(", ")}`);

  for (const select of [LE_SELECT_DUNE_LECTURE, LE_SELECT_DUNE_LIGNE]) {
    const absentes = select.split(",").map((un) => un.trim()).filter((nom) => !colonnes.has(nom));
    assert.deepEqual(absentes, [], `« cr_lectures » n'a pas : ${absentes.join(", ")}`);
  }
});

/**
 * **La liste se charge sans les analyses.** C'est la plus grosse colonne, et la
 * liste n'en montre rien : la charger pour cinquante lignes afin d'en ouvrir
 * une ferait passer cinquante analyses sur le réseau pour en regarder une.
 */
test("la liste ne demande pas les analyses, l'ouverture si", () => {
  assert.ok(!LE_SELECT_DUNE_LIGNE.split(",").includes("analyse"));
  assert.ok(LE_SELECT_DUNE_LECTURE.split(",").includes("analyse"));
});

/* ── Ce qu'on gèle ───────────────────────────────────────────────────────── */

test("l'analyse garde les points et la confrontation", () => {
  const analyse = lanalyseAConserver(UNE_VUE);

  assert.deepEqual(analyse.lecture.points, [UN_POINT]);
  assert.deepEqual(analyse.confrontes, UNE_VUE.confrontes);
  assert.equal(analyse.lecture.identite.numero, "12");
  assert.deepEqual(analyse.lecture.rubriques, UNE_LECTURE.rubriques);
  assert.equal(analyse.lecture.lueSur, "restitution");
});

/**
 * **`null` est gardé pour ce qu'il dit** : on n'a pas pu lire les sujets du
 * projet. Le remplacer par `[]` ferait rouvrir, dans six mois, une lecture qui
 * prétendrait que le chantier ne suivait rien (règle 5).
 */
test("une confrontation impossible reste impossible, et ne devient pas vide", () => {
  const analyse = lanalyseAConserver({ ...UNE_VUE, confrontes: null, sujetsDuProjet: null });
  assert.equal(analyse.confrontes, null);
  assert.equal(analyse.sujetsDuProjet, null);

  const vide = lanalyseAConserver({ ...UNE_VUE, confrontes: [], sujetsDuProjet: [] });
  assert.deepEqual(vide.confrontes, []);
  assert.deepEqual(vide.sujetsDuProjet, []);
});

test("une lecture sans point ne se gèle pas", () => {
  assert.equal(lanalyseAConserver({ lecture: { ...UNE_LECTURE, points: [] } }), null);
  assert.equal(lanalyseAConserver({ lecture: null }), null);
  assert.equal(lanalyseAConserver(), null);
});

test("une ligne sans projet ou sans mesure ne s'écrit pas", () => {
  assert.equal(laLigneDuneLecture(UNE_VUE, { projectId: "" }), null);
  assert.equal(laLigneDuneLecture({ lecture: { ...UNE_LECTURE, mesure: null } }, { projectId: "c-1" }), null);
});

/**
 * **Une chaîne vide n'est pas un identifiant absent** : la colonne est une clé
 * étrangère, et PostgreSQL refuserait la ligne entière.
 */
test("un document hors projet laisse la clé nulle, jamais vide", () => {
  const ligne = laLigneDuneLecture(UNE_VUE, { projectId: "c-1" });
  assert.equal(ligne.document_id, null);
  assert.equal(ligne.proposition_id, null);
  assert.equal(ligne.document, "1824_CR_12.pdf");
});

test("la ligne porte la réunion et le lecteur", () => {
  const ligne = laLigneDuneLecture(UNE_VUE, {
    projectId: "c-1", documentId: "d-1", propositionId: "p-1"
  });
  assert.equal(ligne.numero_de_reunion, "12");
  assert.equal(ligne.tenue_le, "2026-03-12");
  assert.equal(ligne.document_id, "d-1");
  assert.equal(ligne.proposition_id, "p-1");
  assert.equal(ligne.lu_par, "gpt · lecture de CR v1");
});

/**
 * **Le procédé s'écrit à un seul endroit.** Il vivait dans l'écran de l'Atelier,
 * et le serveur — qui lit par les mêmes services — ne l'écrivait pas : deux
 * lectures du même procédé se disaient faites par deux procédés différents.
 */
test("le lecteur nomme le modèle et le procédé", () => {
  assert.equal(leLecteur("gpt-5"), `gpt-5 · ${LE_PROCEDE_DE_LECTURE}`);
  assert.equal(leLecteur(""), LE_PROCEDE_DE_LECTURE);
  assert.equal(leLecteur(), LE_PROCEDE_DE_LECTURE);
});

/* ── Ce qu'on rouvre ─────────────────────────────────────────────────────── */

test("une lecture gardée se rouvre telle qu'elle était", () => {
  const ligne = { id: "l-1", created_at: "2026-03-13T09:00:00Z", document_id: "d-1",
    proposition_id: "p-1", analyse: lanalyseAConserver(UNE_VUE) };
  const vue = laVueDuneLecture(ligne, { sujetsDuProjet: [] });

  assert.equal(vue.phase, "lue");
  assert.equal(vue.conservee.id, "l-1");
  assert.equal(vue.conservee.documentId, "d-1");
  assert.deepEqual(vue.lecture.points, [UN_POINT]);
  assert.deepEqual(vue.confrontes, UNE_VUE.confrontes);
});

/**
 * **Le gelé et le vivant ne se mêlent jamais.** `sujetsDuProjet` est ce que la
 * lecture avait sous les yeux ; `sujetsAujourdhui` est ce que le projet suit
 * maintenant. Les confondre ferait une lecture qui change toute seule, et qu'on
 * ne peut plus opposer à personne (règle 6).
 */
test("ce que la lecture a vu et ce qui est vrai aujourd'hui tiennent deux places", () => {
  const aujourdhui = [{ id: "s-1", title: "Planchers", status: "closed" }];
  const vue = laVueDuneLecture(
    { id: "l-1", analyse: lanalyseAConserver(UNE_VUE) },
    { sujetsDuProjet: aujourdhui }
  );

  assert.equal(vue.sujetsDuProjet[0].status, "open", "le gelé a changé");
  assert.equal(vue.sujetsAujourdhui[0].status, "closed");
});

/** Les lignes d'avant la migration n'ont pas d'analyse : on le dit. */
test("une lecture sans analyse ne s'ouvre pas, et ne s'invente pas", () => {
  assert.equal(laVueDuneLecture({ id: "l-1", analyse: null }), null);
  assert.equal(laVueDuneLecture({ id: "l-1" }), null);
  assert.equal(laVueDuneLecture(null), null);
});

/** Rien du projet n'est gelé : l'inventer ferait dire à l'écran ce qu'il ignore. */
test("une lecture rouverte ne prétend pas connaître les labels ni les lots", () => {
  const vue = laVueDuneLecture({ id: "l-1", analyse: lanalyseAConserver(UNE_VUE) });
  for (const cle of ["labels", "lots", "objectifs", "situations", "suivi"]) {
    assert.equal(vue[cle], null, `« ${cle} » est inventé à la relecture`);
  }
});

/* ── Ce que le sujet est devenu ──────────────────────────────────────────── */

test("un sujet retrouvé rend son état d'aujourd'hui", () => {
  const devenu = ceQueLeSujetEstDevenu("s-1", [{ id: "s-1", title: "Planchers", status: "closed" }]);
  assert.deepEqual(devenu, { connu: true, statut: "closed", titre: "Planchers" });
});

/**
 * **« On n'a pas pu lire » et « il n'y est plus » rendent la même chose ici**,
 * et c'est voulu : l'appelant les distingue par `sujetsAujourdhui === null`,
 * qu'il a déjà sous la main. Les distinguer deux fois aurait fait deux endroits
 * où la règle 5 se tient, et l'un des deux aurait fini par mentir.
 */
test("un sujet absent ou illisible ne se déclare pas ouvert", () => {
  assert.equal(ceQueLeSujetEstDevenu("s-1", null).connu, false);
  assert.equal(ceQueLeSujetEstDevenu("s-1", []).connu, false);
  assert.equal(ceQueLeSujetEstDevenu("s-9", [{ id: "s-1" }]).connu, false);
});

/* ── L'ordre des réunions ────────────────────────────────────────────────── */

const ligne = (id, tenue, numero, lue) => ({
  id, tenue_le: tenue, numero_de_reunion: numero, created_at: lue, document: `${id}.pdf`
});

/**
 * **Le cas que l'utilisateur a posé** : on ajoute le n° 12 après avoir analysé
 * les n° 15 et 16. Il reprend sa place, parce que rien ne dépend de l'ordre
 * dans lequel on a lu.
 */
test("un compte rendu ajouté après coup reprend sa place", () => {
  const range = lesLecturesEnOrdre([
    ligne("cr15", "2026-04-02", "15", "2026-09-01T10:00:00Z"),
    ligne("cr16", "2026-04-16", "16", "2026-09-01T10:05:00Z"),
    ligne("cr12", "2026-02-19", "12", "2026-09-30T18:00:00Z")
  ]);

  assert.deepEqual(range.map((une) => une.id), ["cr16", "cr15", "cr12"]);
});

/**
 * **C'est bien la date qui range, et non le numéro.**
 *
 * Sur un chantier ordinaire les deux montent ensemble, et une liste rangée par
 * numéro rendrait exactement la même chose — une épreuve qui ne les oppose pas
 * ne dit donc rien de ce qui range vraiment (règle 12).
 *
 * Ici ils se contredisent : un compte rendu numéroté 3 tenu après le n° 40.
 * C'est le cas réel d'un chantier qui recommence sa numérotation à la tranche
 * suivante, ou d'une réunion exceptionnelle glissée dans la série.
 */
test("la date de la réunion range, pas son numéro", () => {
  const range = lesLecturesEnOrdre([
    ligne("tranche1", "2026-02-19", "40", "2026-09-01T10:00:00Z"),
    ligne("tranche2", "2026-06-11", "3", "2026-09-01T10:05:00Z")
  ]);

  assert.deepEqual(range.map((une) => une.id), ["tranche2", "tranche1"],
    "la liste se range sur le numéro : un n° 3 de juin passerait derrière un n° 40 de février");
});

/** Sans date, le numéro ; sans numéro, la fin — on n'invente pas une place. */
test("une lecture sans date se range sur son numéro, et sans numéro, en dernier", () => {
  const range = lesLecturesEnOrdre([
    ligne("sansRien", "", "", "2026-01-01T00:00:00Z"),
    ligne("numero7", "", "7", "2026-01-01T00:00:00Z"),
    ligne("date", "2026-02-19", "12", "2026-01-01T00:00:00Z"),
    ligne("numero9", "", "n° 9", "2026-01-01T00:00:00Z")
  ]);

  assert.deepEqual(range.map((une) => une.id), ["date", "numero9", "numero7", "sansRien"]);
});

/** À réunion égale, la dernière lecture passe devant : c'est celle qu'on ouvre. */
test("deux lectures du même compte rendu : la plus récente d'abord", () => {
  const range = lesLecturesEnOrdre([
    { ...ligne("vieille", "2026-03-12", "12", "2026-03-13T09:00:00Z"), document_id: "d-1" },
    { ...ligne("neuve", "2026-03-12", "12", "2026-05-02T09:00:00Z"), document_id: "d-1" }
  ]);
  assert.deepEqual(range.map((une) => une.id), ["neuve", "vieille"]);
});

/**
 * **L'accueil liste des comptes rendus, pas des essais.** Relire le même
 * document écrit une seconde ligne — c'est voulu, c'est ainsi qu'on compare
 * deux consignes (règle 6) —, mais trois lignes pour le même document feraient
 * croire à trois réunions.
 */
test("un compte rendu relu ne compte qu'une fois, et le dit", () => {
  const lus = lesComptesRendusLus([
    { ...ligne("a1", "2026-03-12", "12", "2026-03-13T09:00:00Z"), document_id: "d-1" },
    { ...ligne("a2", "2026-03-12", "12", "2026-05-02T09:00:00Z"), document_id: "d-1" },
    { ...ligne("b1", "2026-04-02", "15", "2026-05-02T09:00:00Z"), document_id: "d-2" }
  ]);

  assert.deepEqual(lus.map((une) => une.id), ["b1", "a2"]);
  assert.deepEqual(lus.map((une) => une.relectures), [1, 2]);
});

/** Deux dépôts du même PDF depuis le disque sont bien un seul compte rendu. */
test("sans ligne dans Fichiers, c'est le nom du fichier qui identifie", () => {
  const lus = lesComptesRendusLus([
    ligne("a1", "2026-03-12", "12", "2026-03-13T09:00:00Z"),
    { ...ligne("a2", "2026-03-12", "12", "2026-05-02T09:00:00Z"), document: "a1.pdf" }
  ]);
  assert.equal(lus.length, 1);
  assert.equal(lus[0].relectures, 2);
});

test("une liste vide ou illisible ne fabrique aucune ligne", () => {
  assert.deepEqual(lesLecturesEnOrdre([]), []);
  assert.deepEqual(lesLecturesEnOrdre(null), []);
  assert.deepEqual(lesComptesRendusLus(null), []);
});
