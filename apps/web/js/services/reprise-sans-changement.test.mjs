import test from "node:test";
import assert from "node:assert/strict";

import {
  REPRISES_QUI_INTERPELLENT, mentionsDesLignes, repriseQuiInterpelle, repriseQuiTraine,
  repriseSansChangement, reprisesAEnregistrer, sourceDuPoint
} from "./reprise-sans-changement.js";

/** Un compte rendu qui reprend le point. Aucun nom réel. */
const cr = (numero, tenueLe, aChange = false) => ({ numero: String(numero), tenueLe, aChange });

const enFrancais = (iso) => iso.split("-").reverse().join("/");

/* ── Une ligne, et elle s'étend ──────────────────────────────────────────── */

test("un seul compte rendu ne compte pas les réunions", () => {
  // « 1 réunion » se lit comme un décompte qui n'a pas commencé.
  const dit = repriseSansChangement([cr(15, "2026-11-12")], { dater: enFrancais });

  assert.equal(dit.texte, "Pas de modification au compte rendu n° 15 du 12/11/2026.");
  assert.doesNotMatch(dit.texte, /réunions/);
});

test("la ligne s'étend au lieu de se répéter", () => {
  const dit = repriseSansChangement(
    [cr(15, "2026-11-12"), cr(16, "2026-11-19")],
    { dater: enFrancais }
  );

  assert.match(dit.texte, /comptes rendus n° 15 à 16/);
  assert.match(dit.texte, /2 réunions/);
});

/**
 * Le signal que la première version du § 39 jetait avec le bruit. Un point
 * relancé depuis neuf réunions sans que rien ne bouge est **exactement**
 * l'information qu'on cherche : c'est elle qui distingue un chantier qui avance
 * d'un chantier qui piétine.
 */
test("neuf réunions sans mouvement se lisent d'un coup d'œil", () => {
  const mentions = Array.from({ length: 9 }, (_, rang) => cr(15 + rang, "2026-11-12"));
  const dit = repriseSansChangement(mentions, { dater: enFrancais });

  assert.match(dit.texte, /n° 15 à 23/);
  assert.match(dit.texte, /9 réunions depuis le 12\/11\/2026/);
  assert.equal(dit.combien, 9);
});

/* ── La ligne repart de ce qui a bougé ───────────────────────────────────── */

/**
 * Ce qui a changé a son propre commentaire, daté ; la ligne repart de là. Sans
 * cela elle annoncerait « rien n'a bougé depuis la première réunion » sur un
 * sujet qui a changé trois fois.
 */
test("la suite s'arrête au dernier mouvement", () => {
  const dit = repriseSansChangement([
    cr(12, "2026-10-01"),
    cr(13, "2026-10-08"),
    cr(14, "2026-10-15", true),
    cr(15, "2026-10-22"),
    cr(16, "2026-10-29")
  ], { dater: enFrancais });

  assert.match(dit.texte, /n° 15 à 16/);
  assert.equal(dit.combien, 2);
  assert.equal(dit.depuis, "22/10/2026");
});

test("un sujet qui vient de bouger ne dit rien", () => {
  const dit = repriseSansChangement([cr(15, "2026-11-12"), cr(16, "2026-11-19", true)]);

  assert.equal(dit.texte, "", "la ligne se tait : le commentaire du mouvement dit déjà tout");
  assert.equal(dit.combien, 0);
});

test("aucun compte rendu, aucune ligne", () => {
  assert.equal(repriseSansChangement([]).texte, "");
  assert.deepEqual(repriseQuiTraine(), []);
});

/* ── Ce qui manque se voit ───────────────────────────────────────────────── */

/**
 * Un compte rendu peut ne pas reprendre le point du tout. Les bornes disent
 * alors lesquels, le compte dit combien, et les deux ne concordent pas — c'est
 * une information, pas une incohérence.
 */
test("les bornes et le compte peuvent ne pas concorder", () => {
  const dit = repriseSansChangement([cr(15, "2026-11-12"), cr(18, "2026-12-03")]);

  assert.match(dit.texte, /n° 15 à 18/);
  assert.match(dit.texte, /2 réunions/);
});

test("une date manquante ne s'invente pas", () => {
  const dit = repriseSansChangement([cr(15, ""), cr(16, "")]);

  assert.match(dit.texte, /n° 15 à 16/);
  assert.doesNotMatch(dit.texte, /depuis le/);
});

/* ── Ce qui se remarque, et ce qui ne juge pas ───────────────────────────── */

test("ce qui traîne depuis longtemps se remarque", () => {
  const court = Array.from({ length: REPRISES_QUI_INTERPELLENT - 1 }, (_, r) => cr(10 + r, "2026-01-01"));
  const long = Array.from({ length: REPRISES_QUI_INTERPELLENT }, (_, r) => cr(10 + r, "2026-01-01"));

  assert.equal(repriseQuiInterpelle(court), false);
  assert.equal(repriseQuiInterpelle(long), true);
});

test("la ligne donne le compte, elle ne juge pas", () => {
  const mentions = Array.from({ length: 34 }, (_, r) => cr(10 + r, "2026-01-01"));
  const dit = repriseSansChangement(mentions);

  assert.match(dit.texte, /34 réunions/);
  for (const interdit of [/urgent/i, /grave/i, /bloqué/i, /retard/i, /oubli/i, /visa/i]) {
    assert.doesNotMatch(dit.texte, interdit, `« ${dit.texte} » juge`);
  }
});

/* ── Ce qu'un dépôt laisse comme reprises ────────────────────────────────── */

/**
 * L'identité d'un compte rendu se range par **étiquette de lecture** — « cr-1 »,
 * « cr-2 » —, et c'est elle qui porte l'identifiant du document en base. Un
 * point ne connaît que l'étiquette : la confondre avec l'identifiant poserait
 * une reprise sur un document qui n'existe pas.
 */
const DOCUMENTS = {
  "cr-1": { documentId: "doc-14", numero: "14", tenueLe: "2026-03-12" },
  "cr-2": { documentId: "doc-15", numero: "15", tenueLe: "2026-03-19" }
};

const point = ({ sourceId = "cr-2", ...champs } = {}) => ({
  titre: "Étanchéité",
  etat: "en cours",
  // Le serveur écrit l'origine **dans la provenance**, avec la page et la
  // citation. La chercher à la racine rend une chaîne vide, en silence.
  provenance: { source_id: sourceId, page: 4, excerpt: "…" },
  ...champs
});

/**
 * Le compte rendu qui **ouvre** un sujet l'a fait apparaître : c'est un
 * mouvement, et la ligne des reprises suivantes repartira d'après lui.
 */
test("un sujet ouvert par ce compte rendu compte comme un mouvement", () => {
  const aEcrire = reprisesAEnregistrer({
    ouverts: [{ subjectId: "sujet-1", point: point({ sourceId: "cr-1" }) }],
    documents: DOCUMENTS
  });

  assert.deepEqual(aEcrire, [{
    subjectId: "sujet-1", documentId: "doc-14",
    numero: "14", tenueLe: "2026-03-12", etat: "en cours", aChange: true
  }]);
});

test("un point déjà suivi dont l'état n'a pas bougé ne compte pas comme un mouvement", () => {
  const aEcrire = reprisesAEnregistrer({
    deja: [{ ...point(), sujet: { id: "sujet-1" } }],
    documents: DOCUMENTS,
    connues: [{ subject_id: "sujet-1", etat: "en cours" }]
  });

  assert.equal(aEcrire.length, 1);
  assert.equal(aEcrire[0].aChange, false);
  assert.equal(aEcrire[0].numero, "15");
});

test("un point dont l'état a changé rompt la suite", () => {
  const aEcrire = reprisesAEnregistrer({
    deja: [{ ...point({ etat: "soldé" }), sujet: { id: "sujet-1" } }],
    documents: DOCUMENTS,
    connues: [{ subject_id: "sujet-1", etat: "en cours" }]
  });

  assert.equal(aEcrire[0].aChange, true);
});

/**
 * **Règle 5.** Un sujet qui existait avant qu'on suive les reprises n'a rien à
 * quoi se comparer. On enregistre son état sans prétendre qu'il a bougé :
 * annoncer un mouvement qu'on n'a pas constaté serait inventer.
 */
test("sans reprise précédente, on ne prétend pas que le point a bougé", () => {
  const aEcrire = reprisesAEnregistrer({
    deja: [{ ...point(), sujet: { id: "sujet-vieux" } }],
    documents: DOCUMENTS
  });

  assert.equal(aEcrire[0].aChange, false);
  assert.equal(aEcrire[0].etat, "en cours");
});

test("un point déjà suivi sans sujet connu ne laisse rien", () => {
  // « déjà écarté », « déjà versé », « deux fois dans le lot » : aucun ne
  // désigne un sujet, et une reprise sans sujet ne se range nulle part.
  assert.deepEqual(reprisesAEnregistrer({ deja: [point()], documents: DOCUMENTS }), []);
});

test("deux points du même compte rendu sur le même sujet ne font qu'une reprise", () => {
  const aEcrire = reprisesAEnregistrer({
    deja: [
      { ...point(), sujet: { id: "sujet-1" } },
      { ...point({ titre: "Étanchéité (suite)" }), sujet: { id: "sujet-1" } }
    ],
    documents: DOCUMENTS
  });

  assert.equal(aEcrire.length, 1);
});

/**
 * Un compte rendu qui ne se nomme pas laisse quand même sa reprise : c'est le
 * fait qui compte. La phrase, elle, dira « au compte rendu suivant » plutôt
 * qu'un numéro inventé.
 */
test("un compte rendu anonyme laisse tout de même sa reprise", () => {
  const aEcrire = reprisesAEnregistrer({
    ouverts: [{ subjectId: "sujet-1", point: point({ sourceId: "cr-3" }) }],
    documents: { "cr-3": { documentId: "doc-16", numero: "", tenueLe: "" } }
  });

  assert.equal(aEcrire.length, 1);
  assert.equal(aEcrire[0].documentId, "doc-16");
  assert.equal(aEcrire[0].numero, "");
  assert.equal(aEcrire[0].tenueLe, "");
});

/**
 * Un point venu d'un document que l'analyse ne connaît plus ne laisse rien :
 * une reprise qui citerait un document introuvable ne se vérifie pas.
 */
test("un point sans document connu ne laisse pas de reprise", () => {
  assert.deepEqual(
    reprisesAEnregistrer({
      ouverts: [{ subjectId: "sujet-1", point: point({ sourceId: "cr-inconnu" }) }],
      documents: DOCUMENTS
    }),
    []
  );
});

test("sans rien lui donner, rien à écrire", () => {
  assert.deepEqual(reprisesAEnregistrer(), []);
});

/* ── De la base à la phrase ──────────────────────────────────────────────── */

test("les lignes de la base deviennent des mentions, dans l'ordre du temps", () => {
  const mentions = mentionsDesLignes([
    { numero: "16", tenue_le: "2026-03-26", a_change: false },
    { numero: "15", tenue_le: "2026-03-19", a_change: true }
  ]);

  assert.deepEqual(mentions.map((mention) => mention.numero), ["15", "16"]);
  assert.equal(mentions[0].aChange, true);
  assert.equal(mentions[1].aChange, false);
});

test("la traduction se branche sur la phrase sans rien de plus", () => {
  const dit = repriseSansChangement(mentionsDesLignes([
    { numero: "15", tenue_le: "2026-03-19", a_change: true },
    { numero: "16", tenue_le: "2026-03-26", a_change: false },
    { numero: "17", tenue_le: "2026-04-02", a_change: false }
  ]));

  assert.match(dit.texte, /n° 16 à 17/);
  assert.equal(dit.combien, 2);
});

/**
 * **Le défaut qui aurait tout fait disparaître sans un mot.** Un point porte
 * son origine dans sa provenance, pas à sa racine. La lire au mauvais endroit
 * rend une chaîne vide : aucune reprise ne s'écrit, aucun document ne se
 * nomme, et rien ne signale que quoi que ce soit ait manqué.
 */
test("l'origine d'un point se lit dans sa provenance", () => {
  assert.equal(sourceDuPoint({ provenance: { source_id: "cr-2" } }), "cr-2");
  assert.equal(sourceDuPoint({ sourceId: "cr-2" }), "cr-2", "l'ancienne forme reste lue");
  assert.equal(sourceDuPoint({}), "");
  assert.equal(sourceDuPoint(null), "");
});

test("un point tel que le serveur le rend laisse bien sa reprise", () => {
  // La forme exacte de `sujetsAuFormatDuMoteur`, provenance comprise.
  const duServeur = {
    key: "cr:12.02.1",
    titre: "Étanchéité",
    etat: "en cours",
    provenance: { source_id: "cr-1", page: 4, excerpt: "…" },
    lu_par: "modele"
  };

  const aEcrire = reprisesAEnregistrer({
    ouverts: [{ subjectId: "sujet-1", point: duServeur }],
    documents: DOCUMENTS
  });

  assert.equal(aEcrire.length, 1);
  assert.equal(aEcrire[0].documentId, "doc-14");
  assert.equal(aEcrire[0].numero, "14");
});

/* ── La chaîne est branchée, d'un bout à l'autre ─────────────────────────── */

const lire = async (chemin) => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  return readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
};

/**
 * **Le garde-fou de la chaîne.** Ce service a été écrit un tour avant d'être
 * branché à quoi que ce soit : il rendait la bonne phrase, et personne ne la
 * lisait. Un service juste que rien n'appelle ne se distingue pas d'un service
 * absent, et il faut trois tours pour s'en apercevoir.
 *
 * Les quatre maillons, chacun vérifié là où il vit.
 */
test("le compte rendu dit son numéro, et il part avec l'analyse", async () => {
  const recogniser = await lire("./document-recognizer-cr.js");
  const analyse = await lire("./proposition-analysis.js");

  assert.match(recogniser, /declaredReference: identite\.numero \|\| null/);
  assert.match(recogniser, /issuedAt: identite\.tenueLe \|\| null/);
  assert.match(analyse, /identiteDesComptesRendus\.push\(/);
  assert.match(analyse, /identiteDesComptesRendus,/);
});

test("la fusion enregistre les reprises", async () => {
  const vue = await lire("../views/project-propositions.js");

  assert.match(vue, /await enregistrerLesReprises\(proposition, nes\)/);
  assert.match(vue, /reprisesAEnregistrer\(\{/);
  assert.match(vue, /recordSubjectCrMentions\(aEcrire/);
});

test("la base sait les lire et les écrire", async () => {
  const base = await lire("./project-subjects-supabase.js");

  assert.match(base, /export async function listSubjectCrMentions/);
  assert.match(base, /export async function recordSubjectCrMentions/);
  assert.match(base, /rest\/v1\/subject_cr_mentions/);
});

test("la discussion d'un sujet porte la ligne", async () => {
  const fil = await lire("../views/project-subjects/project-subjects-thread.js");

  assert.match(fil, /repriseSansChangement\(mentions, \{ dater: enFrancais \}\)/);
  assert.match(fil, /assurerLesReprises\(sujetRegarde\)/);
  // Un sujet ouvert par un compte rendu n'a parfois aucun message : s'arrêter
  // sur une discussion vide ferait disparaître ce qu'on cherchait à voir.
  assert.match(fil, /if \(!thread\.length && !repriseHtml\) return "";/);
});

test("la table existe, et elle est additive", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const migration = readFileSync(
    fileURLToPath(new URL("../../../../supabase/migrations/202609210001_subject_cr_mentions.sql", import.meta.url)),
    "utf8"
  );

  assert.match(migration, /create table if not exists public\.subject_cr_mentions/);
  assert.match(migration, /unique \(subject_id, document_id\)/);
  // Strictement additive : rien n'est supprimé ni renommé.
  assert.doesNotMatch(migration, /\bdrop\s+(table|column)\b/i);
  assert.doesNotMatch(migration, /\balter\s+table\s+\S+\s+drop\b/i);
});
