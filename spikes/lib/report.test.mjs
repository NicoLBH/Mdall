import test from "node:test";
import assert from "node:assert/strict";

import { OUTCOME, REASON } from "./metrics.mjs";
import { escapeCell, formatRatio, renderRunReport } from "./report.mjs";

function baseRecord(overrides = {}) {
  return {
    schema: "mdall.spike.run/1",
    run_id: "demo__cas__20260826T120000Z",
    spike: "demo",
    case_id: "cas",
    title: "Cas de test",
    pipeline: { id: "demo-pipeline", version: "0.1.0" },
    params: { seuil: 0.6 },
    started_at: "2026-08-26T12:00:00.000Z",
    finished_at: "2026-08-26T12:00:01.000Z",
    duration_ms: 1000,
    sources: [{ source_id: "doc-a" }],
    ground_truth: { item_count: 3 },
    predictions: [],
    counts: { truePositives: 1, falsePositives: 1, falseNegatives: 1 },
    metrics: [{ id: "precision", label: "Precision", value: 0.5, numerator: 1, denominator: 2 }],
    outcomes: [],
    guard_violations: [],
    llm_calls: [],
    notes: "",
    ...overrides
  };
}

test("formatRatio affiche n/a plutôt qu'un score inventé quand le dénominateur est nul", () => {
  assert.equal(formatRatio({ value: null, numerator: 0, denominator: 0 }), "n/a (dénominateur = 0)");
  assert.equal(formatRatio(undefined), "n/a (dénominateur = 0)");
  assert.equal(formatRatio({ value: 0.5, numerator: 1, denominator: 2 }), "0.500 — 50.0 % (1/2)");
  assert.equal(formatRatio({ value: 0, numerator: 0, denominator: 3 }), "0.000 — 0.0 % (0/3)");
});

test("escapeCell neutralise les pipes et les retours ligne, et tronque", () => {
  assert.equal(escapeCell("a | b\nc"), "a \\| b c");
  assert.equal(escapeCell(null), "—");
  assert.equal(escapeCell("   "), "—");
  assert.equal(escapeCell("x".repeat(200)).length, 121);
});

test("le rapport contient les sections attendues et le run_id", () => {
  const report = renderRunReport(baseRecord());

  for (const section of ["## Run", "## Garde-fous", "## Erreurs individuelles", "## Abstentions", "## Comptages", "## Métriques"]) {
    assert.ok(report.includes(section), `section manquante : ${section}`);
  }
  assert.ok(report.includes("demo__cas__20260826T120000Z"));
  assert.ok(report.endsWith("\n"));
});

test("les violations de garde-fou sont listées une par une avant les scores", () => {
  const report = renderRunReport(
    baseRecord({
      guard_violations: [
        { guard_id: "provenance_required", key: "avis-65", message: "affirmation sans provenance vérifiable" },
        { guard_id: "absence_is_not_a_conclusion", key: "avis-67", message: "conclusion affirmée à partir d'une absence" }
      ]
    })
  );

  assert.ok(report.includes("**2 violation(s) — bloquant.**"));
  assert.ok(report.includes("provenance_required"));
  assert.ok(report.includes("avis-67"));
  assert.ok(
    report.indexOf("## Garde-fous") < report.indexOf("## Métriques"),
    "les garde-fous doivent précéder les métriques"
  );
});

test("chaque erreur apparaît individuellement, avec sa raison et sa confiance", () => {
  const report = renderRunReport(
    baseRecord({
      outcomes: [
        {
          key: "avis-65",
          outcome: OUTCOME.FALSE_POSITIVE,
          reason: REASON.WRONG_VALUE,
          expected: { value: { statut: "défavorable" } },
          predicted: { value: { statut: "favorable" } },
          confidence: 0.91
        },
        {
          key: "avis-66",
          outcome: OUTCOME.TRUE_POSITIVE,
          reason: REASON.MATCHED,
          expected: { value: { statut: "favorable" } },
          predicted: { value: { statut: "favorable" } },
          confidence: 0.8
        }
      ]
    })
  );

  assert.ok(report.includes("WRONG_VALUE"));
  assert.ok(report.includes("0.91"));
  assert.ok(!report.includes("avis-66"), "les succès ne polluent pas la table des erreurs");
});

test("les abstentions sont présentées à part des erreurs", () => {
  const report = renderRunReport(
    baseRecord({
      outcomes: [
        {
          key: "avis-67",
          outcome: OUTCOME.TRUE_NEGATIVE,
          reason: REASON.ABSTAINED_AS_EXPECTED,
          expected: null,
          predicted: { state: "AMBIGUOUS" },
          confidence: null
        }
      ]
    })
  );

  assert.ok(report.includes("Aucune erreur individuelle."));
  assert.ok(report.includes("ABSTAINED_AS_EXPECTED"));
});

test("les appels LLM apparaissent avec modèle et version de prompt", () => {
  const report = renderRunReport(
    baseRecord({
      llm_calls: [
        { index: 0, model: "modele-test", prompt_id: "extraction", prompt_version: "v3", prompt_sha256: "abcdef0123456789" }
      ]
    })
  );

  assert.ok(report.includes("## Appels LLM"));
  assert.ok(report.includes("modele-test"));
  assert.ok(report.includes("abcdef012345"));
});

test("le rendu est déterministe pour un même enregistrement", () => {
  const record = baseRecord();
  assert.equal(renderRunReport(record), renderRunReport(record));
});
