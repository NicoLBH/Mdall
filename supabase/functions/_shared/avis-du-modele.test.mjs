import test from "node:test";
import assert from "node:assert/strict";

import {
  ECART, SCHEMA_DES_AVIS, avisAuFormatDuMoteur, pagesEnTexte, verifierLesAvis
} from "./avis-du-modele.js";

/** Un rapport, dans la forme qu'une extraction de PDF rend. */
const PAGES = [
  { page: 7, text: "PARAMÈTRES CLIMATIQUES\nVent F Région 2, site normal\nNeige F Région A2, altitude 260 m" },
  { page: 8, text: "FONDATIONS SUPERFICIELLES\nDispositions constructives S Absence d'information" }
];

const lu = (reste = {}) => ({
  reference: null, intitule: "Neige", teneur: "F", teneur_libelle: "Favorable",
  constat: "Région A2, altitude 260 m", page: 7,
  citation: "Neige F Région A2, altitude 260 m", ...reste
});

/* ── Le garde-fou : la citation ──────────────────────────────────────────── */

/**
 * Le seul garde-fou qui compte. Un modèle peut inventer une ligne entière — un
 * avis plausible sur un point plausible —, et rien dans sa réponse ne le
 * trahit. Ce qui le trahit, c'est le **document**.
 */
test("un avis dont la citation se retrouve dans le document entre", () => {
  const { retenus, ecartes } = verifierLesAvis({ avis: [lu()], pages: PAGES });

  assert.equal(retenus.length, 1);
  assert.equal(retenus[0].citationVerifiee, true);
  assert.equal(retenus[0].pageVerifiee, true);
  assert.deepEqual(ecartes, []);
});

test("un avis inventé n'entre pas", () => {
  const invente = lu({
    intitule: "Sismicité", constat: "Zone 4",
    citation: "Sismicité F Zone 4, catégorie III"
  });

  const { retenus, ecartes } = verifierLesAvis({ avis: [invente], pages: PAGES });

  assert.deepEqual(retenus, []);
  assert.equal(ecartes[0].motif, ECART.INTROUVABLE);
});

test("un avis sans citation n'entre pas non plus", () => {
  // Rien à vérifier, donc rien à croire.
  const { ecartes } = verifierLesAvis({ avis: [lu({ citation: "" })], pages: PAGES });
  assert.equal(ecartes[0].motif, ECART.SANS_CITATION);
});

test("une ligne qui ne porte ni intitulé ni teneur n'est pas un avis", () => {
  const { ecartes } = verifierLesAvis({
    avis: [lu({ intitule: "", teneur: "" })], pages: PAGES
  });
  assert.equal(ecartes[0].motif, ECART.VIDE);
});

/* ── Ce que la typographie ne doit pas casser ────────────────────────────── */

/**
 * Une extraction de PDF coupe les lignes où la mise en page le veut, double les
 * espaces et garde les insécables. Comparer des chaînes brutes ferait échouer
 * des citations exactes pour des raisons de typographie — et l'on jetterait de
 * vrais avis.
 */
test("espaces, accents et apostrophes ne font pas échouer une citation exacte", () => {
  const pages = [{ page: 1, text: "Dispositions   constructives S  Absence d’information" }];
  const ligne = lu({
    page: 1, intitule: "Dispositions constructives", teneur: "S",
    citation: "dispositions constructives s absence d'information"
  });

  assert.equal(verifierLesAvis({ avis: [ligne], pages }).retenus.length, 1);
});

/* ── La page annoncée ────────────────────────────────────────────────────── */

/**
 * La citation existe, mais pas là où le modèle l'a dite. On garde l'avis — il a
 * bien été lu — et l'on corrige sa page : sans cela, le lien vers le PDF
 * ouvrirait la mauvaise, et la vérification par un humain échouerait sur une
 * ligne pourtant juste.
 */
test("une page annoncée fausse se corrige, elle ne fait pas perdre l'avis", () => {
  const { retenus, pagesCorrigees } = verifierLesAvis({
    avis: [lu({ page: 3 })], pages: PAGES
  });

  assert.equal(retenus.length, 1);
  assert.equal(retenus[0].page, 7, "la vraie page");
  assert.equal(retenus[0].pageVerifiee, false, "et l'on sait qu'elle a été corrigée");
  assert.equal(pagesCorrigees, 1);
});

/* ── Ce que le document donne à lire ─────────────────────────────────────── */

test("le document part au modèle page par page, numérotée", () => {
  // Sans les numéros, le modèle ne peut pas citer une page, donc rien n'est
  // vérifiable et rien n'est cliquable.
  const texte = pagesEnTexte(PAGES);

  assert.match(texte, /=== PAGE 7 ===/);
  assert.match(texte, /=== PAGE 8 ===/);
  assert.match(texte, /Région A2, altitude 260 m/);
});

test("un document trop long s'arrête à une page entière", () => {
  const texte = pagesEnTexte(PAGES, { maxCaracteres: 120 });

  assert.match(texte, /=== PAGE 7 ===/);
  assert.doesNotMatch(texte, /=== PAGE 8 ===/, "on ne coupe pas au milieu d'une page");
});

/* ── La forme que le reste de Mdall attend ───────────────────────────────── */

/**
 * Ce qui change est **d'où** viennent les avis, pas ce qu'on en fait. Les quatre
 * modules qui suivent — liaison, versement, engagement, lot — ne doivent rien
 * apprendre.
 */
test("les avis du modèle prennent la forme du moteur, et le constat entre enfin", () => {
  const [avis] = avisAuFormatDuMoteur(
    verifierLesAvis({ avis: [lu()], pages: PAGES }).retenus,
    { sourceId: "doc-1" }
  );

  assert.equal(avis.title_raw, "Neige");
  assert.equal(avis.opinion_label, "Favorable");
  assert.equal(avis.value.opinion_raw, "F");
  assert.equal(avis.provenance.source_id, "doc-1");
  assert.equal(avis.provenance.page, 7);
  // Ce que l'extraction en dur perdait, et sans quoi un engagement ne se
  // vérifie pas.
  assert.equal(avis.description_raw, "Région A2, altitude 260 m");
});

test("un avis numéroté et un avis sans numéro se distinguent", () => {
  const rendus = avisAuFormatDuMoteur([
    { intitule: "Dimensionnement", teneur: "S", reference: "20", citation: "x" },
    { intitule: "Neige", teneur: "F", reference: null, citation: "y" }
  ], { sourceId: "doc-1" });

  assert.deepEqual(rendus.map((a) => a.kind), ["extraction", "observation"]);
  assert.equal(rendus[0].value.external_reference_raw, "20");
  assert.equal(rendus[1].value.external_reference_raw, null);
});

/* ── Ce qu'on ne demande pas au modèle ───────────────────────────────────── */

/**
 * Si la légende du document dit « A : Acceptable », l'avis rendu porte « A ».
 * Traduire en « Favorable » ferait dire au rapport ce qu'il n'écrit pas — et
 * c'est précisément ce qui rend la lecture indépendante de l'émetteur.
 */
test("le schéma demande le code tel qu'écrit, et la légende à part", () => {
  const avis = SCHEMA_DES_AVIS.schema.properties.avis.items;

  assert.ok(avis.required.includes("teneur"), "le code brut");
  assert.ok(avis.required.includes("teneur_libelle"), "ce que la légende en dit");
  assert.ok(avis.required.includes("constat"), "et ce qui a été examiné");
  assert.ok(avis.required.includes("citation"), "sans quoi rien n'est vérifiable");
  assert.ok(SCHEMA_DES_AVIS.schema.properties.legende, "la légende se lit dans le document");
  assert.equal(SCHEMA_DES_AVIS.strict, true);
});
