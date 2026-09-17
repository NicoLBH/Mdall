import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  LIAISON, MOT_A_LECRAN, intituleDuPoint, liensAPoser, phraseDesPointsOuverts,
  pointsQuiPortentSur, portagePropose
} from "./point-porte-sur.js";

/** Une affirmation de la mémoire, de la forme que la base rend. */
function valeur(id, sujet, dite) {
  return {
    id,
    subject_key: sujet,
    statement: `${sujet} : ${dite}`,
    payload: { subject: sujet, value: dite },
    kind: "base-datum",
    nature: "donnee-de-base",
    superseded_by: null
  };
}

const MEMOIRE = [
  valeur("v-sol", "Classe de sol", "C"),
  valeur("v-neige", "Zone de neige", "A2"),
  valeur("v-sol-b", "Classe de sol", "D")
];

/* ── Le mot, tranché ─────────────────────────────────────────────────────── */

test("le code dit « point », l'écran écrit « sujet »", () => {
  // C'est l'étape 0, et elle se vérifie plutôt qu'elle ne se raconte : le
  // fichier s'appelle `point-porte-sur.js`, ses fonctions parlent de points, et
  // **tout ce qu'il rend à lire dit « sujet »**. Le jour où une phrase d'écran
  // dirait « point », ce test tombe.
  assert.equal(MOT_A_LECRAN.un, "sujet");
  assert.equal(MOT_A_LECRAN.plusieurs, "sujets");

  for (const dite of [phraseDesPointsOuverts([{}]), phraseDesPointsOuverts([{}, {}])]) {
    assert.match(dite, /sujets?\b/);
    assert.doesNotMatch(dite, /\bpoints?\b/i);
  }
});

test("le mot de l'écran est écrit une fois", () => {
  // Deux endroits qui le disent finiraient par ne plus dire la même chose. Les
  // phrases le lisent, elles ne le recopient pas (règle 10).
  const source = readFileSync(new URL("./point-porte-sur.js", import.meta.url), "utf8");
  const apres = source.slice(source.indexOf("export const MOT_A_LECRAN"));

  // Après la déclaration, le mot n'apparaît plus dans une ligne de code : la
  // prose des commentaires, elle, en parle tant qu'elle veut.
  const enDur = apres
    .split("\n")
    .filter((ligne) => !ligne.trimStart().startsWith("*") && !ligne.trimStart().startsWith("//"))
    .filter((ligne) => /\bsujets?\b/i.test(ligne))
    .filter((ligne) => !ligne.includes("MOT_A_LECRAN ="));

  assert.deepEqual(enDur, []);
});

/* ── Ce sur quoi un point porte ──────────────────────────────────────────── */

test("un point s'accroche à la valeur que son titre nomme", () => {
  const rendu = portagePropose({ title: "La classe de sol est-elle bien C ?" }, MEMOIRE);

  // Les deux portées du même sujet : rien dans le titre ne dit laquelle, et en
  // choisir une serait deviner.
  assert.deepEqual(rendu.assertions.map((a) => a.id), ["v-sol", "v-sol-b"]);
  assert.equal(rendu.motif, LIAISON.TOUTES_LES_PORTEES);
  assert.ok(rendu.phrase, "un motif sans phrase se lit comme un code d'erreur");
});

test("ce qu'on ne reconnaît pas ne s'accroche pas", () => {
  // Un point mal accroché contesterait en silence une valeur que personne n'a
  // mise en doute. Mieux vaut un point sans arête qu'une arête inventée.
  const rendu = portagePropose({ title: "Revoir le calepinage des faux plafonds" }, MEMOIRE);
  assert.deepEqual(rendu.assertions, []);
  assert.equal(rendu.motif, LIAISON.SANS_SUJET);

  assert.equal(portagePropose({ title: "" }, MEMOIRE).motif, LIAISON.SANS_INTITULE);
  assert.equal(portagePropose(null, MEMOIRE).motif, LIAISON.SANS_INTITULE);
});

test("la reconnaissance est celle des avis, pas une seconde", () => {
  // Deux reconnaissances écrites séparément auraient divergé à la première
  // correction — et c'est toujours celle qu'on ne regarde pas qui reste fausse.
  const source = readFileSync(new URL("./point-porte-sur.js", import.meta.url), "utf8");
  assert.match(source, /liaisonDunIntitule/);
  // Aucun mot entier réimplémenté ici : on n'en garde pas une copie.
  assert.doesNotMatch(source, /nommeEntierement|indexOf\(nom/);
});

test("le titre d'abord, la description à défaut", () => {
  assert.equal(intituleDuPoint({ title: "Un titre", description: "Une description" }), "Un titre");
  assert.equal(intituleDuPoint({ description: "Une description" }), "Une description");
  assert.equal(intituleDuPoint({}), "");
});

/* ── Les lignes qu'on écrira, et qui ne s'écrivent pas ici ───────────────── */

test("une arête proposée n'a pas d'auteur", () => {
  // Nul dit « proposé, pas encore confirmé ». L'écran doit pouvoir le distinguer
  // d'un geste humain, sinon une reconnaissance passerait pour une décision.
  const [ligne] = liensAPoser({
    point: { id: "p1", project_id: "proj" }, assertions: [MEMOIRE[0]]
  });

  assert.equal(ligne.declared_by, null);
  assert.equal(ligne.subject_id, "p1");
  assert.equal(ligne.assertion_id, "v-sol");
  assert.equal(ligne.project_id, "proj");
});

test("un point ne porte pas deux fois sur la même version", () => {
  // La base le refuse, et un envoi refusé en bloc perdrait les autres lignes.
  const lignes = liensAPoser({
    point: { id: "p1", project_id: "proj" },
    assertions: [MEMOIRE[0], MEMOIRE[0], MEMOIRE[1]],
    declarePar: "u1"
  });

  assert.deepEqual(lignes.map((l) => l.assertion_id), ["v-sol", "v-neige"]);
  assert.equal(lignes[0].declared_by, "u1");
});

test("sans point ou sans projet, il n'y a rien à écrire", () => {
  assert.deepEqual(liensAPoser({ point: { id: "p1" }, assertions: [MEMOIRE[0]] }), []);
  assert.deepEqual(liensAPoser({ point: {}, assertions: [MEMOIRE[0]], projectId: "proj" }), []);
  assert.deepEqual(liensAPoser({}), []);
});

/* ── Ce qui porte sur une valeur ─────────────────────────────────────────── */

const LIENS = [
  { subject_id: "p1", assertion_id: "v-sol" },
  { subject_id: "p2", assertion_id: "v-sol" },
  { subject_id: "p3", assertion_id: "v-neige" }
];

test("une valeur en débat cesse de se présenter comme acquise", () => {
  // C'est le premier effet visible de l'arête, et il vaut à lui seul l'étape.
  const points = [
    { id: "p1", status: "open", title: "Classe de sol à confirmer" },
    { id: "p2", status: "open", title: "Sondage complémentaire" }
  ];

  const dessus = pointsQuiPortentSur("v-sol", { liens: LIENS, points });
  assert.deepEqual(dessus.map((p) => p.id), ["p1", "p2"]);
  assert.equal(phraseDesPointsOuverts(dessus), "2 sujets ouverts portent sur cette valeur");
});

test("un point fermé ne met plus rien en question", () => {
  // Il a fait son travail. Le compter ferait présenter comme « en débat » une
  // valeur que plus personne ne discute, et un écran qui signale tout ne signale
  // plus rien.
  const points = [
    { id: "p1", status: "closed", title: "Classe de sol à confirmer" },
    { id: "p2", status: "closed_duplicate", title: "Doublon" }
  ];

  assert.deepEqual(pointsQuiPortentSur("v-sol", { liens: LIENS, points }), []);
  assert.equal(phraseDesPointsOuverts([]), "");
});

test("un point qu'on ne connaît pas ne se compte pas", () => {
  // On ne sait pas s'il est ouvert, et le supposer ouvert ferait dire « en
  // débat » à tort (règle 5).
  assert.deepEqual(pointsQuiPortentSur("v-sol", { liens: LIENS, points: [] }), []);
  assert.deepEqual(pointsQuiPortentSur("", { liens: LIENS, points: [{ id: "p1", status: "open" }] }), []);
});

test("le même point cité deux fois ne compte qu'une", () => {
  const doubles = [...LIENS, { subject_id: "p1", assertion_id: "v-sol" }];
  const points = [{ id: "p1", status: "open" }];
  assert.deepEqual(pointsQuiPortentSur("v-sol", { liens: doubles, points }).map((p) => p.id), ["p1"]);
});

/* ── Le schéma le permet ─────────────────────────────────────────────────── */

test("un point peut naître d'une valeur, ou de rien", async () => {
  // C'était le premier obstacle, et il était physique : dans le schéma, un point
  // était l'enfant d'un document analysé. Le code s'en accommodait en fabriquant
  // un faux document pour chaque projet.
  const migration = readFileSync(
    new URL("../../../../supabase/migrations/202610130001_un_point_porte_sur_une_affirmation.sql",
      import.meta.url),
    "utf8"
  );

  assert.match(migration, /alter column document_id drop not null/);
  assert.match(migration, /alter column analysis_run_id drop not null/);

  // Et plus personne ne fabrique le faux document.
  assert.doesNotMatch(migration, /manual_subjects_system/);
  assert.match(migration, /create or replace function public\.create_manual_subject/);

  // L'arête, elle, pointe une **version** d'affirmation.
  assert.match(migration, /assertion_id uuid not null references public\.project_assertions\(id\)/);
  assert.match(migration, /unique \(subject_id, assertion_id\)/);
});
