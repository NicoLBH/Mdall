import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { runSpikeCase } from "../lib/harness.mjs";
import { commonGuards, createAbsenceIsNotAConclusion, createAmbiguityNotPresentedAsCertain } from "../lib/guards.mjs";
import { FIXTURES_DIR } from "../lib/paths.mjs";
import { ctGuards } from "./guards.mjs";
import { buildCtMetrics } from "./metrics.mjs";
import { ctContinuityPipeline } from "./pipeline.mjs";

const CASE = resolve(FIXTURES_DIR, "ct-continuity-synthetic/case.json");
const FIXED_DATE = new Date("2026-08-26T12:00:00.000Z");

const GUARDS = [
  ...commonGuards.filter((guard) => guard.id !== "absence_is_not_a_conclusion"),
  createAbsenceIsNotAConclusion({ nonConclusiveStates: ["NOT_FOUND"] }),
  createAmbiguityNotPresentedAsCertain({ assertionThreshold: 0.6 }),
  ...ctGuards
];

function runCase(overrides = {}) {
  return runSpikeCase({
    manifestPath: CASE,
    pipeline: ctContinuityPipeline,
    guards: GUARDS,
    extraMetrics: (testCase) => buildCtMetrics({ sources: testCase.sources }),
    clock: () => FIXED_DATE,
    write: false,
    ...overrides
  });
}

function metric(record, id) {
  return record.metrics.find((entry) => entry.id === id);
}

test("la fixture synthétique passe sans violation de garde-fou", async () => {
  const { record } = await runCase();

  assert.deepEqual(record.guard_violations, []);
});

test("aucune erreur individuelle sur la fixture synthétique", async () => {
  const { record } = await runCase();

  assert.equal(record.counts.falsePositives, 0);
  assert.equal(record.counts.falseNegatives, 0);
  assert.equal(record.counts.truePositives, 34);
});

test("les deux compteurs critiques valent zéro et sont affichés comme des effectifs", async () => {
  const { record, report } = await runCase();

  assert.equal(metric(record, "false_merge_count").value, 0);
  assert.equal(metric(record, "false_closure_count").value, 0);
  assert.ok(report.includes("| False merge count | 0 |"), "un effectif ne s'affiche pas en pourcentage");
});

test("la provenance est vérifiée jusqu'à la page pour chaque prédiction", async () => {
  const { record } = await runCase();
  const provenance = metric(record, "provenance_accuracy");

  assert.equal(provenance.value, 1);
  assert.equal(provenance.denominator, 36);
});

test("les deux abstentions attendues sont produites et jugées correctes", async () => {
  const { record } = await runCase();

  assert.equal(record.counts.correctAbstentions, 2);
  assert.equal(record.counts.incorrectAbstentions, 0);
  assert.equal(metric(record, "abstention_count").value, 2);
});

test("la référence mal lue 6S reste un avis nouveau, jamais rapprochée de 65", async () => {
  const { record } = await runCase();
  const prediction = record.predictions.find((entry) => entry.key === "continuity:rapport-c:6S");

  assert.equal(prediction.value.state, "NEW");
  assert.equal(prediction.value.previous_document_id, null);
});

test("un avis disparu produit NOT_FOUND, avec la preuve de sa dernière lecture", async () => {
  const { record } = await runCase();
  const prediction = record.predictions.find((entry) => entry.key === "continuity:rapport-b:67");

  assert.equal(prediction.value.state, "NOT_FOUND");
  assert.equal(prediction.derived_from_absence, true);
  assert.equal(prediction.absent_from_document_id, "rapport-b");
  assert.equal(prediction.provenance.source_id, "rapport-a");
  assert.equal(prediction.provenance.page, 2);
});

test("aucune prédiction ne porte de statut de sujet Mdall", async () => {
  const { record } = await runCase();
  const serialized = JSON.stringify(record.predictions);

  for (const forbidden of ["subject_status", "mdall_status", '"status"']) {
    assert.ok(!serialized.includes(forbidden), `le champ ${forbidden} ne doit pas apparaître`);
  }
});

test("les suggestions expérimentales restent hors des prédictions", async () => {
  const result = await ctContinuityPipeline.run({
    sources: [
      { source_id: "a", content_available: true, content: "Avis n° 65 : Défavorable — texte.", pages: null },
      { source_id: "b", content_available: true, content: "Avis n° 65 : Favorable — PV reçu.", pages: null }
    ],
    params: {}
  });

  assert.equal(result.experimental_suggestions.length, 1);
  assert.ok(
    result.predictions.every((prediction) => prediction.kind === "extraction" || prediction.kind === "continuity"),
    "aucune suggestion ne doit se glisser parmi les prédictions"
  );
});

test("une source sans contenu est ignorée sans produire de conclusion", async () => {
  const result = await ctContinuityPipeline.run({
    sources: [
      { source_id: "a", content_available: true, content: "Avis n° 65 : Favorable — texte.", pages: null },
      { source_id: "pdf-non-extrait", content_available: false, content: null, pages: null }
    ],
    params: {}
  });

  assert.ok(result.notes.includes("pdf-non-extrait"));
  const forSecond = result.predictions.filter((prediction) => prediction.key.includes("pdf-non-extrait"));
  assert.deepEqual(
    forSecond.map((prediction) => prediction.value?.state),
    ["NOT_FOUND"],
    "une source illisible ne prouve rien d'autre qu'une absence de lecture"
  );
});

test("le lexique et les motifs sont surchargeables par le cas", async () => {
  const result = await ctContinuityPipeline.run({
    sources: [{ source_id: "a", content_available: true, content: "REM 12 >> conforme >> texte", pages: null }],
    params: {
      extraction: {
        patterns: [{ id: "custom", source: "^REM\\s+(?<reference>[0-9]+)\\s*>>\\s*(?<rest>.+)$", flags: "u" }],
        lexicon: [{ id: "conforme", labels: ["conforme"] }]
      }
    }
  });

  const extraction = result.predictions.find((prediction) => prediction.kind === "extraction");
  assert.equal(extraction.value.external_reference_raw, "12");
  assert.equal(extraction.value.opinion_raw, "conforme");
  assert.equal(extraction.pattern_id, "custom");
});

test("deux runs avec la même horloge produisent le même enregistrement", async () => {
  const first = await runCase();
  const second = await runCase();

  assert.equal(JSON.stringify(first.record), JSON.stringify(second.record));
  assert.equal(first.report, second.report);
});
