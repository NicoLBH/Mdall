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
