import test from "node:test";
import assert from "node:assert/strict";

import { assessCompleteness, findCrossReferences, findSequenceGaps, readDeclaredInventory } from "./completeness.mjs";
import { orderChronologically } from "./document-meta.mjs";

const INVENTAIRE = [
  "3. COMPTE RENDU DE LA MISSION",
  "A ce jour, SOCOTEC a formulé des avis dans les documents suivants :",
  "Référence Chrono Désignation Date",
  "CT/13860/0923/0222 Rapport préalable APD 1 15/09/2023",
  "CT/13860/0923/0288 Attestations Parasismique Initiale 1 20/09/2023",
  "CT/13860/0525/0179 Fiche avis travaux N°2 20/05/2025"
].join("\n");

function doc(id, extra = "", { date = "27/08/2026", chrono = "CT/13860/0826/0133", sheet = null } = {}) {
  const content = [
    "RAPPORT D'ETAPE DE CONTROLE TECHNIQUE",
    sheet === null ? "" : `FICHE N° : ${sheet}`,
    `Date d’émission ${date}`,
    `Référence chrono : ${chrono}`,
    extra
  ]
    .filter(Boolean)
    .join("\n");

  return { source_id: id, content, content_available: true, content_sha256: `hash-${id}` };
}

test("l'inventaire déclaré par un rapport d'étape est lu ligne à ligne", () => {
  const entries = readDeclaredInventory(doc("etape", INVENTAIRE));

  assert.equal(entries.length, 3);
  assert.deepEqual(entries[1], {
    chrono_reference: "CT/13860/0923/0288",
    designation: "Attestations Parasismique Initiale 1",
    issued_at: "2023-09-20",
    declared_in: "etape"
  });
});

test("un document qui ne déclare rien ne produit aucun inventaire", () => {
  assert.deepEqual(readDeclaredInventory(doc("simple")), []);
});

test("les livrables déclarés mais absents du lot sont nommés, avec leur source", () => {
  const { ordered } = orderChronologically([
    doc("etape", INVENTAIRE),
    doc("prealable", "", { date: "15/09/2023", chrono: "CT/13860/0923/0222" })
  ]);

  const { missing } = assessCompleteness(ordered);

  assert.deepEqual(missing.map((entry) => entry.chrono_reference), [
    "CT/13860/0923/0288",
    "CT/13860/0525/0179"
  ]);
  assert.equal(missing[0].declared_in, "etape");
});

test("un lot complet ne signale aucun manquement", () => {
  const { ordered } = orderChronologically([
    doc("etape", INVENTAIRE),
    doc("a", "", { date: "15/09/2023", chrono: "CT/13860/0923/0222" }),
    doc("b", "", { date: "20/09/2023", chrono: "CT/13860/0923/0288" }),
    doc("c", "", { date: "20/05/2025", chrono: "CT/13860/0525/0179", sheet: 2 })
  ]);

  assert.deepEqual(assessCompleteness(ordered).missing, []);
});

test("les trous de numérotation des fiches sont détectés, même sans inventaire", () => {
  assert.deepEqual(findSequenceGaps([{ sheet_number: 1 }, { sheet_number: 4 }, { sheet_number: 5 }]), [2, 3]);
  assert.deepEqual(findSequenceGaps([{ sheet_number: 1 }, { sheet_number: 2 }]), []);
  assert.deepEqual(findSequenceGaps([{ sheet_number: 3 }]), [], "un seul numéro ne prouve aucun trou");
});

test("un renvoi vers une fiche absente est signalé", () => {
  const references = findCrossReferences(doc("etape", "Parois verticales ( Fiche avis travaux N°9 ) S Merci de transmettre le PV"));

  assert.deepEqual(references, [
    { label: "Fiche avis travaux N°9", number: 9, cited_in: "etape" }
  ]);
});

test("un renvoi résolu par une fiche présente n'est pas signalé", () => {
  const { ordered } = orderChronologically([
    doc("etape", "( Fiche avis travaux N°2 )"),
    doc("fiche", "", { date: "20/05/2025", chrono: "CT/13860/0525/0179", sheet: 2 })
  ]);

  assert.deepEqual(assessCompleteness(ordered).unresolvedReferences, []);
});

test("le même document chargé deux fois est repéré par son empreinte", () => {
  const twice = [
    { ...doc("a"), content_sha256: "identique" },
    { ...doc("b"), content_sha256: "identique" }
  ];

  const { duplicates } = assessCompleteness(orderChronologically(twice).ordered);

  assert.deepEqual(duplicates, [{ source_ids: ["a", "b"] }]);
});

test("le lot rétrécit la liste des manquements à mesure qu'on l'enrichit", () => {
  const etape = doc("etape", INVENTAIRE);
  const a = doc("a", "", { date: "15/09/2023", chrono: "CT/13860/0923/0222" });
  const c = doc("c", "", { date: "20/05/2025", chrono: "CT/13860/0525/0179", sheet: 2 });

  const premier = assessCompleteness(orderChronologically([etape, a]).ordered);
  const second = assessCompleteness(orderChronologically([etape, a, c]).ordered);

  assert.equal(premier.missing.length, 2);
  assert.equal(second.missing.length, 1);
});
