import test from "node:test";
import assert from "node:assert/strict";

import { orderChronologically, readDocumentMeta } from "./document-meta.mjs";

function doc(id, text) {
  return { source_id: id, content: text, content_available: true };
}

const RAPPORT = doc(
  "r1",
  [
    "RAPPORT PREALABLE / APD",
    "CONTROLE TECHNIQUE",
    "Date d’émission 15/09/2023",
    "N° d’affaire : 230113860000087",
    "Référence chrono : CT/13860/0923/0222",
    "Version : 1"
  ].join("\n")
);

const FICHE = doc(
  "f2",
  [
    "AVIS EN PHASE DE RÉALISATION DES TRAVAUX",
    "FICHE N° : 2",
    "Date d’émission : 20/05/2025",
    "Référence du chrono: CT/13860/0525/0179",
    "Nous vous remercions de nous indiquer les suites données, afin qu'ils ne soient pas repris",
    "dans notre Rapport Final de Contrôle technique."
  ].join("\n")
);

test("la date d'émission, la référence chrono et la version sont lues", () => {
  const meta = readDocumentMeta(RAPPORT);

  assert.equal(meta.issued_at, "2023-09-15");
  assert.equal(meta.issued_at_source, "declared");
  assert.equal(meta.chrono_reference, "CT/13860/0923/0222");
  assert.equal(meta.version, 1);
});

test("le type est lu dans le titre, pas dans le corps", () => {
  // La fiche mentionne « Rapport Final » dans son texte : ce n'en est pas un.
  assert.equal(readDocumentMeta(FICHE).document_type, "fiche_avis_travaux");
  assert.equal(readDocumentMeta(FICHE).sheet_number, 2);
  assert.equal(readDocumentMeta(RAPPORT).document_type, "rapport_prealable");
});

test("un type inconnu reste inconnu plutôt que d'être forcé", () => {
  const meta = readDocumentMeta(doc("x", "NOTE DE SYNTHÈSE\nDate d’émission 01/01/2026"));

  assert.equal(meta.document_type, null);
  assert.equal(meta.document_type_label, null);
  assert.equal(meta.issued_at, "2026-01-01");
});

test("à défaut de date déclarée, la première date trouvée sert, et le dit", () => {
  const meta = readDocumentMeta(doc("x", "RAPPORT\nÉtabli le 04/06/2026 à Chavanod"));

  assert.equal(meta.issued_at, "2026-06-04");
  assert.equal(meta.issued_at_source, "first_date_found");
});

test("un dépôt alphabétique est remis dans l'ordre des documents", () => {
  // « 10_… » passe avant « 2_… » dans un tri de noms de fichiers.
  const sources = [
    doc("10", "RAPPORT\nDate d’émission 08/10/2025\nRéférence chrono : CT/13860/1025/0104"),
    doc("2", "RAPPORT\nDate d’émission 27/08/2024\nRéférence chrono : CT/13860/0824/0139"),
    doc("1", "RAPPORT\nDate d’émission 15/09/2023\nRéférence chrono : CT/13860/0923/0222")
  ];

  const { ordered } = orderChronologically(sources);

  assert.deepEqual(ordered.map((entry) => entry.source_id), ["1", "2", "10"]);
  assert.deepEqual(ordered.map((entry) => entry.order), [1, 2, 3]);
});

test("à date égale, la référence chrono départage", () => {
  const sources = [
    doc("b", "RAPPORT\nDate d’émission 09/10/2025\nRéférence chrono : CT/13860/1025/0114"),
    doc("a", "RAPPORT\nDate d’émission 09/10/2025\nRéférence chrono : CT/13860/1025/0112")
  ];

  assert.deepEqual(orderChronologically(sources).ordered.map((e) => e.source_id), ["a", "b"]);
});

test("un document sans date lisible est rejeté en fin de liste et signalé", () => {
  const sources = [
    doc("sans-date", "DOCUMENT SANS DATE"),
    doc("daté", "RAPPORT\nDate d’émission 15/09/2023")
  ];

  const { ordered, undatedSourceIds } = orderChronologically(sources);

  assert.deepEqual(ordered.map((entry) => entry.source_id), ["daté", "sans-date"]);
  assert.deepEqual(undatedSourceIds, ["sans-date"]);
});


/**
 * Un type de rapport que l'outil ne reconnaît pas se rabat sur son nom de
 * fichier — cent trente caractères d'affaire, de commune et de chrono, là où
 * une frise attend trois mots.
 */
test("les autres livrables du bureau de contrôle se nomment aussi", () => {
  const lire = (titre) =>
    readDocumentMeta({ content_available: true, content: `${titre}\nCONTROLE TECHNIQUE\nDate d’émission : 12/03/2025` });

  assert.equal(lire("RAPPORT DE VERIFICATIONS REGLEMENTAIRES APRES TRAVAUX").document_type, "rvrat");
  assert.equal(lire("RVRAT - INSTALLATIONS ELECTRIQUES").document_type, "rvrat");
  assert.equal(lire("FICHE DE CORRESPONDANCE").document_type, "fiche_correspondance");
  assert.equal(lire("RAPPORT FINAL DE CONTROLE TECHNIQUE").document_type, "rapport_final");
  assert.equal(lire("RFCT").document_type, "rapport_final");
  assert.equal(lire("RAPPORT PREALABLE / APS").document_type, "rapport_prealable_aps");
  assert.equal(lire("RAPPORT PREALABLE / APD").document_type, "rapport_prealable");
  assert.equal(lire("Rapport RICT").document_type, "rapport_initial");
});

/**
 * Une vérification après travaux constate la conformité d'installations ; elle
 * ne reprend pas l'état des avis. En faire un point de contrôle déclarerait
 * disparus des avis que ce rapport n'avait jamais vocation à porter.
 */
test("seuls les livrables qui reprennent tout font point de contrôle", () => {
  const type = (titre) =>
    readDocumentMeta({ content_available: true, content: `${titre}\nDate d’émission : 12/03/2025` }).recapitulative;

  assert.equal(type("RAPPORT PREALABLE / APS"), true);
  assert.equal(type("RAPPORT FINAL DE CONTROLE TECHNIQUE"), true);
  assert.equal(type("RVRAT"), false);
  assert.equal(type("FICHE DE CORRESPONDANCE"), false);
});
