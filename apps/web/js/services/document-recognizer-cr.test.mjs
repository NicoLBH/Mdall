import test from "node:test";
import assert from "node:assert/strict";

import { createCrChantierRecognizer } from "./document-recognizer-cr.js";
import { RECOGNITION, recognizeDocument } from "./document-recognition.js";

const reconnaisseur = createCrChantierRecognizer();
const lit = (document) => recognizeDocument(document, { recognizers: [reconnaisseur] });

/** Aucun nom réel, aucune entreprise réelle : ce sont des formes, pas des pièces. */
const CR = [
  "COMPTE RENDU DE RÉUNION DE CHANTIER N° 12",
  "Réunion du 03/09/2026 — Maître d'œuvre : Atelier Nord",
  "PRÉSENTS : maîtrise d'œuvre, entreprise de gros œuvre",
  "DIFFUSION : l'ensemble des participants",
  "",
  "LOT 02 — GROS ŒUVRE",
  "12.02.1  Le ferraillage du voile V12 ne suit pas le plan BA-102.",
  "12.02.4  Les réservations du plancher haut R+1 restent à confirmer.",
  "",
  "PROCHAINE RÉUNION : le 10/09/2026"
].join("\n");

/**
 * La forme réelle, et celle que la première version rejetait.
 *
 * Aucun compte rendu ne s'appelle « compte rendu de chantier ». Ils s'appellent
 * **« compte rendu de réunion n° 14 »**, et c'est une ligne plus bas, dans un
 * tableau d'en-tête, qu'on lit « Objet : suivi de chantier ». Les points ne sont
 * pas numérotés : ce sont des puces sous une rubrique de lot.
 *
 * Cette forme est celle du document déposé pour l'essai, ramenée à sa structure.
 * Aucun nom, aucune commune, aucune entreprise réels.
 */
const CR_REEL = [
  "BUREAU D'ÉTUDES DU NORD 00000 VILLE",
  "1234_CR_14 Page 1 sur 5",
  "",
  "Réhabilitation d'un bâtiment communal",
  "",
  "compte rendu de réunion n° 14",
  "Objet Suivi de chantier",
  "Date de réunion 20/08/2026",
  "Auteur du compte rendu D. R.",
  "",
  "Représenté par Téléphone email présent absent Convoqué prochain rdv diffusion CR",
  "Maître d'ouvrage Commune X",
  "Maîtrise d'œuvre Atelier Nord",
  "",
  "A) OBSERVATIONS SUR COMPTE RENDU PRECEDENT",
  "Aucune observation des intervenants sur le compte rendu précédent.",
  "",
  "C) PREPARATION / AVANCEMENT / OBSERVATIONS / SUITE DES OPERATIONS",
  "",
  "Lot n° 1 : Démolition / Gros Œuvre : Entreprise Alpha",
  "❑ Préparation coffrage dalle en cours, nappe inférieure en place au plus tard le 26/08/2026",
  "❑ Il faudra déplacer les barrières au plus près de l'angle du bâtiment",
  "",
  "Lot n°2 : CHARPENTE : Entreprise Beta",
  "❑ Etablir vos plans de fabrication et notes de calcul"
].join("\n");

const pagesDe = (texte) =>
  texte.split("\n\n").map((bloc, rang) => ({ page: rang + 1, text: bloc }));

/* ── Le titre tranche ────────────────────────────────────────────────────── */

test("un compte rendu de chantier se reconnaît à son titre", () => {
  const verdict = lit({ text: CR, pages: pagesDe(CR), filename: "cr-12.pdf" });

  assert.equal(verdict.status, RECOGNITION.RECOGNIZED);
  assert.equal(verdict.kind, "cr_chantier");
  assert.equal(verdict.kindLabel, "Compte rendu de chantier");
  assert.equal(verdict.confidence, "certain");
});

test("le verdict porte la ligne qui l'établit, et sa page", () => {
  // Un verdict sans preuve ne vaut pas mieux qu'une intuition : c'est la règle
  // du registre, et elle vaut pour cette famille comme pour l'autre.
  const verdict = lit({ text: CR, pages: pagesDe(CR) });

  assert.match(verdict.evidence.text, /COMPTE RENDU DE RÉUNION DE CHANTIER/);
  assert.equal(verdict.evidence.page, 1);
});

/**
 * Le cas qui a été rejeté à l'essai, et la raison pour laquelle ce fichier a été
 * réécrit. Le titre ne dit pas « chantier » : c'est le corps qui le dit.
 */
test("un compte rendu qui ne dit « chantier » que dans son objet est reconnu", () => {
  const verdict = lit({ text: CR_REEL, pages: pagesDe(CR_REEL), filename: "1234_CR_14.pdf" });

  assert.equal(verdict.status, RECOGNITION.RECOGNIZED);
  assert.equal(verdict.kind, "cr_chantier");
  assert.equal(verdict.confidence, "certain");
  assert.match(verdict.evidence.text, /compte rendu de réunion n° 14/);
});

/**
 * Et il porte bien de quoi en tirer des points. La première version n'y voyait
 * que des points numérotés « 12.02.4 » ; la forme la plus répandue est la puce
 * sous une rubrique de lot, et la manquer rendrait « sans contenu » un compte
 * rendu qui en porte trente.
 */
test("des puces sous une rubrique de lot font un compte rendu exploitable", () => {
  const sansNumeros = [
    "compte rendu de réunion n° 14",
    "Objet Suivi de chantier",
    "Lot n° 1 : Gros Œuvre : Entreprise Alpha",
    "❑ Préparation coffrage dalle en cours"
  ].join("\n");

  assert.equal(lit({ text: sansNumeros }).status, RECOGNITION.RECOGNIZED);
});

test("les abréviations du métier se lisent aussi", () => {
  for (const titre of [
    "CR de chantier n° 4",
    "C.R. de chantier",
    "PROCÈS-VERBAL DE RÉUNION DE CHANTIER",
    "Compte-rendu n° 7 de chantier",
    "RÉUNION DE CHANTIER N°3"
  ]) {
    const texte = `${titre}\nLOT 01 — TERRASSEMENT\n1.1  Un point à traiter.`;
    assert.equal(lit({ text: texte }).kind, "cr_chantier", `« ${titre} » n'est pas reconnu`);
  }
});

/* ── Ce qui ne suffit pas ────────────────────────────────────────────────── */

/**
 * Le piège de cette famille. Un livrable de bureau de contrôle cite les
 * réunions de chantier, nomme la maîtrise d'œuvre et porte une liste de
 * diffusion. Le prendre pour un compte rendu l'enverrait vers les sujets au
 * lieu des avis — c'est-à-dire vers le mauvais atelier, en silence.
 */
test("un rapport de bureau de contrôle qui cite une réunion de chantier n'en est pas un", () => {
  const rapport = [
    "RAPPORT INITIAL DE CONTRÔLE TECHNIQUE",
    "Établi à la suite de la réunion de chantier du 03/09/2026.",
    "Maîtrise d'œuvre : Atelier Nord",
    "PARAMÈTRES CLIMATIQUES",
    "Vent F Région 2, site normal"
  ].join("\n");

  assert.equal(lit({ text: rapport }).status, RECOGNITION.UNRECOGNIZED);
});

test("une seule marque de forme ne fait pas un compte rendu", () => {
  const texte = "Réunion de chantier du 03/09/2026.\nDIFFUSION : l'ensemble des participants";
  assert.equal(lit({ text: texte }).status, RECOGNITION.UNRECOGNIZED);
});

test("deux marques de forme et une réunion donnent un probable, jamais un certain", () => {
  const texte = [
    "Suites de la réunion de chantier du 03/09/2026",
    "DIFFUSION : l'ensemble des participants",
    "PROCHAINE RÉUNION : le 10/09/2026",
    "LOT 03 — CHARPENTE",
    "3.1  Un point à traiter."
  ].join("\n");

  const verdict = lit({ text: texte });
  assert.equal(verdict.kind, "cr_chantier");
  assert.equal(verdict.confidence, "probable");
});

/* ── Reconnu, et pourtant rien à en tirer ────────────────────────────────── */

/**
 * Une convocation est un compte rendu de chantier au sens du titre, et il n'y a
 * rien dedans. La reconnaître sans contenu plutôt que la rejeter évite
 * d'écarter une pièce légitime du dossier.
 */
test("une convocation est reconnue, mais sans contenu à exploiter", () => {
  const texte = [
    "COMPTE RENDU DE RÉUNION DE CHANTIER N° 13",
    "La réunion du 10/09/2026 est reportée au 17/09/2026.",
    "PROCHAINE RÉUNION : le 17/09/2026"
  ].join("\n");

  const verdict = lit({ text: texte });
  assert.equal(verdict.status, RECOGNITION.RECOGNIZED_WITHOUT_CONTENT);
  assert.match(verdict.reason, /pas de sujet à en tirer/);
});

test("un PDF sans couche de texte ne devient pas un compte rendu vide", () => {
  assert.equal(lit({ text: "", pages: [] }).status, RECOGNITION.NO_TEXT_LAYER);
});

/* ── L'auteur ne se devine pas ───────────────────────────────────────────── */

/**
 * Règle 5. Un compte rendu nomme tout le monde — maître d'ouvrage, entreprises,
 * bureau de contrôle. Choisir le premier nom venu attribuerait un document sur
 * deux au mauvais auteur.
 */
test("plusieurs mentions légales : aucun auteur n'est nommé", () => {
  const texte = [
    CR,
    "Atelier Nord - S.A.R.L. au capital de 10 000 euros",
    "Entreprise du Levant - S.A.S. au capital de 50 000 euros"
  ].join("\n");

  assert.equal(lit({ text: texte }).authorLabel, null);
});

test("une seule mention légale : c'est celle de celui qui rédige", () => {
  const texte = `${CR}\nAtelier Nord - S.A.R.L. au capital de 10 000 euros`;
  assert.match(lit({ text: texte }).authorLabel ?? "", /Atelier Nord/);
});

test("un compte rendu ne prétend porter aucun marqueur d'affaire", () => {
  // Il n'en porte pas, et en inventer ferait poser une question à laquelle rien
  // ne répond.
  assert.deepEqual(lit({ text: CR }).markers, []);
});

/* ── Quand les deux familles se disputent un document ─────────────────────── */

/**
 * Un rapport de bureau de contrôle peut porter les mots « compte rendu » et
 * « chantier » — un rapport de visite en porte souvent les deux. Les deux
 * reconnaisseurs le réclament alors, et il faut que ce soit **celui du bureau de
 * contrôle qui gagne** : ses avis sont ce qu'on vient y chercher, et l'envoyer
 * vers les sujets les perdrait en silence.
 *
 * Ce n'est pas au reconnaisseur des comptes rendus de s'en occuper — il
 * redirait alors ce que l'autre sait déjà (règle 10). C'est le registre qui
 * tranche, par l'ordre d'enregistrement, et c'est ce que ce test garde.
 */
test("un livrable de bureau de contrôle reste un livrable de bureau de contrôle", async () => {
  const { createCtReportRecognizer } = await import("./document-recognizer-ct.js");

  // Le moteur de l'atelier, réduit à ce que le reconnaisseur lui demande.
  const ct = createCtReportRecognizer({
    readDocumentMeta: () => ({
      document_type: "RVRAT", document_type_label: "Rapport de visite",
      chrono_reference: "1234/5678", issued_at: "2026-09-03",
      chrono_affaire: null, affaire_reference: null
    }),
    discoverLegend: () => ({ codes: [{ code: "F", libelle: "Favorable" }] })
  });

  const ambigu = [
    "SOCOTEC — RAPPORT DE VISITE DE CHANTIER",
    "Compte rendu de la visite du 03/09/2026",
    "Maîtrise d'œuvre : Atelier Nord",
    "Lot n° 1 : Gros Œuvre",
    "Vent F Région 2, site normal"
  ].join("\n");

  // Les deux le réclament…
  assert.equal(lit({ text: ambigu }).kind, "cr_chantier", "le reconnaisseur des comptes rendus le réclame");

  // …et c'est celui du bureau de contrôle qui l'emporte, dans l'ordre du
  // catalogue.
  const ensemble = recognizeDocument({ text: ambigu }, { recognizers: [ct, reconnaisseur] });
  assert.equal(ensemble.kind, "ct_report");
});
