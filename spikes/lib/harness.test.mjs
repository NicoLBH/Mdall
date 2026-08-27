import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { demoPipeline } from "../fixtures/example-harness-case/demo-pipeline.mjs";
import { faultyPipeline } from "../fixtures/example-harness-case/faulty-pipeline.mjs";
import { commonGuards, createAmbiguityNotPresentedAsCertain } from "./guards.mjs";
import { evaluateCase, runSpikeCase } from "./harness.mjs";
import { REASON } from "./metrics.mjs";
import { FIXTURES_DIR } from "./paths.mjs";

const EXAMPLE_CASE = resolve(FIXTURES_DIR, "example-harness-case/case.json");
const FIXED_DATE = new Date("2026-08-26T12:00:00.000Z");
const fixedClock = () => FIXED_DATE;

const GUARDS = [...commonGuards, createAmbiguityNotPresentedAsCertain({ assertionThreshold: 0.6 })];

test("evaluateCase accepte des métriques spécifiques à un spike", () => {
  const evaluation = evaluateCase({
    expected: [{ key: "a", kind: "k", value: { x: 1 } }],
    predicted: [{ key: "a", kind: "k", state: "PREDICTED", value: { x: 1 }, confidence: 0.9 }],
    extraMetrics: [
      {
        id: "false_merge_count",
        label: "False merge count",
        compute: ({ outcomes }) => ({
          value: outcomes.filter((outcome) => outcome.reason === REASON.WRONG_VALUE).length,
          note: "métrique propre au spike"
        })
      }
    ]
  });

  const custom = evaluation.metrics.find((metric) => metric.id === "false_merge_count");
  assert.equal(custom.value, 0);
  assert.equal(custom.note, "métrique propre au spike");
  assert.equal(evaluation.metrics.length, 6);
});

test("run complet sur la fixture : un pipeline correct ne déclenche aucun garde-fou", async () => {
  const { record } = await runSpikeCase({
    manifestPath: EXAMPLE_CASE,
    pipeline: demoPipeline,
    guards: GUARDS,
    clock: fixedClock,
    write: false
  });

  assert.equal(record.guard_violations.length, 0);
  assert.equal(record.counts.truePositives, 4);
  assert.equal(record.counts.falsePositives, 0);
  assert.equal(record.counts.falseNegatives, 0);
  assert.equal(record.counts.correctAbstentions, 1, "le cas ambigu doit rester une abstention");
  assert.equal(record.metrics.find((metric) => metric.id === "precision").value, 1);
});

test("run complet : les quatre fautes interdites sont détectées individuellement", async () => {
  const { record } = await runSpikeCase({
    manifestPath: EXAMPLE_CASE,
    pipeline: faultyPipeline,
    guards: GUARDS,
    clock: fixedClock,
    write: false
  });

  const byGuard = new Map(record.guard_violations.map((violation) => [violation.guard_id, violation]));

  assert.ok(byGuard.has("provenance_required"), "affirmation sans provenance non détectée");
  assert.ok(byGuard.has("excerpt_must_exist_in_source"), "citation inventée non détectée");
  assert.ok(byGuard.has("absence_is_not_a_conclusion"), "clôture déduite d'une absence non détectée");
  assert.ok(byGuard.has("ambiguity_not_presented_as_certain"), "ambiguïté tranchée non détectée");

  const forced = record.outcomes.find((outcome) => outcome.key === "doc-a:item-67");
  assert.equal(forced.reason, REASON.FORCED_DECISION);

  const absence = record.outcomes.find((outcome) => outcome.key === "doc-b:item-67");
  assert.equal(absence.reason, REASON.SPURIOUS, "une absence affirmée est un faux positif");

  const missed = record.outcomes.find((outcome) => outcome.key === "doc-b:item-65");
  assert.equal(missed.reason, REASON.MISSED);
});

test("le rapport du run fautif montre les erreurs, pas seulement un score", async () => {
  const { report } = await runSpikeCase({
    manifestPath: EXAMPLE_CASE,
    pipeline: faultyPipeline,
    guards: GUARDS,
    clock: fixedClock,
    write: false
  });

  assert.ok(report.includes("violation(s) — bloquant."));
  assert.ok(report.includes("doc-b:item-67"));
  assert.ok(report.includes("FORCED_DECISION"));
});

test("l'enregistrement du run porte tout ce qu'il faut pour rejouer", async () => {
  const { record } = await runSpikeCase({
    manifestPath: EXAMPLE_CASE,
    pipeline: demoPipeline,
    guards: GUARDS,
    clock: fixedClock,
    write: false
  });

  assert.equal(record.run_id, "harness-selfcheck__example-harness-case__20260826T120000Z");
  assert.equal(record.case_id, "example-harness-case");
  assert.equal(record.pipeline.id, "harness-selfcheck-demo");
  assert.equal(record.pipeline.version, "0.1.0");
  assert.equal(record.started_at, FIXED_DATE.toISOString());
  assert.deepEqual(record.params, { assertion_threshold: 0.6 });
  assert.equal(record.sources.length, 2);
  assert.match(record.sources[0].content_sha256, /^[0-9a-f]{64}$/);
  assert.equal(record.ground_truth.item_count, 6);
  assert.ok(Array.isArray(record.expected) && record.expected.length === 6);
  assert.ok(Array.isArray(record.predictions) && record.predictions.length === 5);
});

test("paramOverrides surchargent les paramètres du manifest", async () => {
  const { record } = await runSpikeCase({
    manifestPath: EXAMPLE_CASE,
    pipeline: demoPipeline,
    guards: GUARDS,
    clock: fixedClock,
    write: false,
    paramOverrides: { assertion_threshold: 0.9, extra: true }
  });

  assert.deepEqual(record.params, { assertion_threshold: 0.9, extra: true });
});

test("les appels LLM du pipeline sont tracés dans le run", async () => {
  const tracingPipeline = {
    id: "tracing",
    version: "0.0.1",
    async run({ trace }) {
      trace.record({
        model: "modele-test",
        promptId: "demo",
        promptVersion: "v1",
        promptText: "prompt",
        rawResponse: "réponse",
        at: FIXED_DATE
      });
      return { predictions: [] };
    }
  };

  const { record } = await runSpikeCase({
    manifestPath: EXAMPLE_CASE,
    pipeline: tracingPipeline,
    guards: GUARDS,
    clock: fixedClock,
    write: false
  });

  assert.equal(record.llm_calls.length, 1);
  assert.equal(record.llm_calls[0].prompt_version, "v1");
});

test("write: true produit un JSON relisible et un rapport, de façon reproductible", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mdall-spikes-"));
  try {
    const options = {
      manifestPath: EXAMPLE_CASE,
      pipeline: demoPipeline,
      guards: GUARDS,
      clock: fixedClock,
      write: true,
      outputsDir: join(dir, "outputs"),
      reportsDir: join(dir, "reports")
    };

    const first = await runSpikeCase(options);
    assert.ok((await stat(first.runPath)).isFile());
    assert.ok((await stat(first.reportPath)).isFile());

    const written = JSON.parse(await readFile(first.runPath, "utf8"));
    assert.equal(written.run_id, first.record.run_id);
    assert.equal(written.schema, "mdall.spike.run/1");

    const firstJson = await readFile(first.runPath, "utf8");
    const firstReport = await readFile(first.reportPath, "utf8");

    const second = await runSpikeCase(options);
    assert.equal(second.runPath, first.runPath, "même horloge et même cas => même chemin");
    assert.equal(await readFile(second.runPath, "utf8"), firstJson);
    assert.equal(await readFile(second.reportPath, "utf8"), firstReport);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("un pipeline sans run() est refusé explicitement", async () => {
  await assert.rejects(
    () => runSpikeCase({ manifestPath: EXAMPLE_CASE, pipeline: {}, write: false }),
    /`pipeline.run` est obligatoire/
  );
});

test("une ground truth partielle déclare son périmètre : hors périmètre, rien n'est pénalisé", () => {
  const evaluation = evaluateCase({
    expected: [{ key: "extraction:a:1", kind: "extraction", value: { x: 1 } }],
    predicted: [
      { key: "extraction:a:1", kind: "extraction", state: "PREDICTED", value: { x: 1 } },
      { key: "observation:a:0", kind: "observation", state: "PREDICTED", value: { x: 9 } },
      { key: "observation:a:1", kind: "observation", state: "PREDICTED", value: { x: 9 } }
    ],
    scope: { key_prefixes: ["extraction:"] }
  });

  assert.equal(evaluation.counts.truePositives, 1);
  assert.equal(evaluation.counts.falsePositives, 0, "les prédictions hors périmètre ne sont pas des faux positifs");
  assert.equal(evaluation.counts.outOfScopePredictions, 2);
});

test("le périmètre accepte aussi des clés explicites", () => {
  const evaluation = evaluateCase({
    expected: [{ key: "continuity:b:7", kind: "continuity", value: { state: "MATCHED" } }],
    predicted: [
      { key: "continuity:b:7", kind: "continuity", state: "PREDICTED", value: { state: "MATCHED" } },
      { key: "continuity:b:8", kind: "continuity", state: "PREDICTED", value: { state: "NEW" } }
    ],
    scope: { keys: ["continuity:b:7"] }
  });

  assert.equal(evaluation.counts.truePositives, 1);
  assert.equal(evaluation.counts.falsePositives, 0);
  assert.equal(evaluation.counts.outOfScopePredictions, 1);
});

test("sans périmètre déclaré, tout est évalué comme avant", () => {
  const evaluation = evaluateCase({
    expected: [{ key: "a", kind: "k", value: { x: 1 } }],
    predicted: [
      { key: "a", kind: "k", state: "PREDICTED", value: { x: 1 } },
      { key: "b", kind: "k", state: "PREDICTED", value: { x: 2 } }
    ]
  });

  assert.equal(evaluation.counts.truePositives, 1);
  assert.equal(evaluation.counts.falsePositives, 1);
  assert.equal(evaluation.counts.outOfScopePredictions, 0);
});
