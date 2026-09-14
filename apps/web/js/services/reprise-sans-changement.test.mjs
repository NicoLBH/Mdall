import test from "node:test";
import assert from "node:assert/strict";

import {
  REPRISES_QUI_INTERPELLENT, mentionsDesLignes, observationsDesReprises, phraseDeLObservation,
  repriseQuiInterpelle, repriseQuiTraine,
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
    numero: "14", tenueLe: "2026-03-12", etat: "en cours", aChange: true,
    // Ce que le compte rendu en écrit, et où le vérifier : c'est ce que le
    // commentaire de relance portait, et la ligne d'activité le reprend.
    observation: "…", page: 4
  }]);
});

/**
 * **La citation se lit à deux endroits.** Le serveur l'écrit dans la
 * provenance, la proposition la remonte à la racine. N'en lire qu'un revenait à
 * n'en lire aucun — en silence, avec une ligne d'activité qui ne dirait rien.
 */
test("l'observation se lit où qu'elle soit écrite", () => {
  const depuisLaRacine = reprisesAEnregistrer({
    ouverts: [{
      subjectId: "sujet-1",
      point: { ...point({ sourceId: "cr-1" }), evidence: "Reprise du carrelage", page: 9 }
    }],
    documents: DOCUMENTS
  });
  assert.deepEqual(
    [depuisLaRacine[0].observation, depuisLaRacine[0].page],
    ["Reprise du carrelage", 9]
  );

  // Sans citation, ce qu'on sait du point plutôt qu'un blanc.
  const sansCitation = reprisesAEnregistrer({
    ouverts: [{
      subjectId: "sujet-1",
      point: { titre: "Étanchéité", provenance: { source_id: "cr-1" } }
    }],
    documents: DOCUMENTS
  });
  assert.deepEqual([sansCitation[0].observation, sansCitation[0].page], ["Étanchéité", null]);
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
  // Un sujet ouvert par un compte rendu n'a parfois aucun message, et sa seule
  // activité est d'être repris de réunion en réunion : s'arrêter sur une
  // discussion vide ferait disparaître ce qu'on cherchait à voir.
  assert.match(fil, /if \(!thread\.length && !repriseHtml && !observationsHtml\) return "";/);
  // Et ce que les comptes rendus en disent y est aussi, regroupé.
  assert.match(fil, /observationsDesReprises\(mentionsDesLignes\(lignes\)\)/);
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


/* ── Ce que les comptes rendus disent, sans le répéter dix fois ──────────── */

/**
 * **Le défilé de commentaires.** Chaque reprise écrivait « CR n° 11 reporte ce
 * point » dans le fil ; sur dix réunions, la discussion devient un journal de
 * machine où l'on ne retrouve plus ce que les gens ont écrit. Et un compte
 * rendu **reporte** : c'est mot pour mot la même phrase qui revient.
 */
test("dix fois la même observation ne se dit qu'une fois", () => {
  const groupes = observationsDesReprises([
    { numero: "8", tenueLe: "2026-01-08", observation: "Inspections communes à mettre en place", page: 4, documentId: "doc-8" },
    { numero: "9", tenueLe: "2026-01-15", observation: "Inspections communes à mettre en place", page: 5, documentId: "doc-9" },
    { numero: "10", tenueLe: "2026-01-22", observation: "Inspections communes à mettre en place", documentId: "doc-10" }
  ]);

  assert.equal(groupes.length, 1);
  assert.deepEqual(groupes[0].numeros, ["8", "9", "10"]);
  assert.equal(groupes[0].combien, 3);
  // On va la vérifier là où on l'a lue la première fois : la dernière reprise
  // n'est pas plus vraie que la première.
  assert.deepEqual([groupes[0].page, groupes[0].documentId], [4, "doc-8"]);
  assert.equal(
    phraseDeLObservation(groupes[0]),
    "Observation présente dans les comptes rendus n° 8, 9 et 10 — 3 réunions."
  );
});

/**
 * Une observation qui revient **après** en avoir remplacé une autre est un
 * second groupe : le point a bougé entre les deux, et fondre les deux effacerait
 * ce mouvement.
 */
test("une observation qui revient après une autre fait un second groupe", () => {
  const groupes = observationsDesReprises([
    { numero: "8", tenueLe: "2026-01-08", observation: "À faire" },
    { numero: "9", tenueLe: "2026-01-15", observation: "En cours avec l'entreprise" },
    { numero: "10", tenueLe: "2026-01-22", observation: "À faire" }
  ]);

  assert.deepEqual(groupes.map((groupe) => groupe.numeros), [["8"], ["9"], ["10"]]);
});

/** Une seule reprise se nomme, elle ne se compte pas : « 1 réunion » ne se dit pas. */
test("un compte rendu seul nomme son numéro et son jour", () => {
  const [groupe] = observationsDesReprises([
    { numero: "11", tenueLe: "2025-08-06", observation: "Transmettre le plan S35" }
  ]);

  assert.equal(
    phraseDeLObservation(groupe, { dater: enFrancais }),
    "Le compte rendu n° 11 du 06/08/2025 reporte ce point."
  );
});

/** Une reprise sans observation n'a rien à dire : le compte des reprises a sa ligne. */
test("une reprise muette ne fait pas une ligne vide", () => {
  assert.deepEqual(observationsDesReprises([
    { numero: "8", tenueLe: "2026-01-08", observation: "" },
    { numero: "9", tenueLe: "2026-01-15", observation: "   " }
  ]), []);
  assert.deepEqual(observationsDesReprises(), []);
});

/**
 * Trente numéros ne se lisent plus : au-delà de ce qu'on embrasse d'un coup
 * d'œil, ce qu'on veut est la borne et la durée.
 */
test("une longue suite donne ses bornes plutôt que sa liste", () => {
  const mentions = Array.from({ length: 9 }, (_, rang) => ({
    numero: String(8 + rang), tenueLe: `2026-01-0${(rang % 9) + 1}`, observation: "La même chose"
  }));

  const [groupe] = observationsDesReprises(mentions);
  assert.equal(phraseDeLObservation(groupe), "Observation présente dans les comptes rendus n° 8 à 16 — 9 réunions.");
});

/** Un compte rendu qui ne se nommait pas se dit quand même (règle 5). */
test("sans numéro, la durée se dit tout de même", () => {
  const [groupe] = observationsDesReprises([
    { numero: "", tenueLe: "2026-01-08", observation: "La même chose" },
    { numero: "", tenueLe: "2026-01-15", observation: "La même chose" }
  ]);

  assert.equal(
    phraseDeLObservation(groupe, { dater: enFrancais }),
    "Observation reprise à 2 réunions depuis le 08/01/2026."
  );
});

/** Les colonnes de la base deviennent des mentions, observation comprise. */
test("la traduction des colonnes emporte l'observation et la page", () => {
  const [mention] = mentionsDesLignes([{
    numero: "8", tenue_le: "2026-01-08", document_id: "doc-8",
    observation: "Inspections communes", page: 4, a_change: false
  }]);

  assert.deepEqual(
    [mention.observation, mention.page, mention.documentId],
    ["Inspections communes", 4, "doc-8"]
  );
});
