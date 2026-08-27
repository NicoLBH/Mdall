/**
 * Point d'entrée du harness : charge un cas, exécute un pipeline de spike,
 * confronte le résultat à la ground truth, écrit outputs + rapport.
 *
 * Contrat de pipeline attendu :
 *
 *   const pipeline = {
 *     id: "ct-continuity",
 *     version: "0.1.0",
 *     async run({ sources, params, groundTruth, trace }) {
 *       return { predictions: [...], notes: "" };
 *     }
 *   };
 *
 * Une prédiction a la forme :
 *   {
 *     key: "avis-65@rapport-b",   // clé de confrontation avec la ground truth
 *     kind: "extraction",
 *     value: { ... },             // interprétation normalisée
 *     state: "PREDICTED" | "ABSTAINED" | "AMBIGUOUS",
 *     confidence: 0.82 | null,    // null = inconnue, jamais 0 par défaut
 *     provenance: { source_id, page, excerpt },
 *     candidates: [...]           // optionnel, rapprochements concurrents
 *   }
 */

import { join } from "node:path";

import { loadCase } from "./dataset.mjs";
import { commonGuards, runGuards } from "./guards.mjs";
import { writeJsonFile, writeTextFile } from "./json-io.mjs";
import { createLlmTraceCollector } from "./llm-trace.mjs";
import {
  compareItems,
  defaultIsMatch,
  defaultKeyOf,
  isAbstentionByDefault,
  standardMetrics
} from "./metrics.mjs";
import { OUTPUTS_DIR, REPORTS_DIR } from "./paths.mjs";
import { renderRunReport } from "./report.mjs";
import { buildRunRecord } from "./run-record.mjs";

/**
 * Confronte prédictions et ground truth et produit compteurs, issues et métriques.
 * `extraMetrics` permet à chaque spike d'ajouter ses métriques propres sans
 * modifier le harness : [{ id, label, compute(context) -> {value, numerator, denominator, note} }]
 */
/**
 * Construit le filtre de périmètre d'une ground truth partielle.
 *
 * `scope: { key_prefixes: [...], keys: [...] }` — une prédiction hors périmètre
 * est ignorée : ni vraie, ni fausse, simplement non évaluée.
 */
export function createScopeFilter(scope) {
  if (!scope) return () => true;

  const prefixes = scope.key_prefixes ?? [];
  const keys = new Set(scope.keys ?? []);
  if (prefixes.length === 0 && keys.size === 0) return () => true;

  return (prediction) => {
    const key = String(prediction?.key ?? "");
    return keys.has(key) || prefixes.some((prefix) => key.startsWith(prefix));
  };
}

export function evaluateCase({
  expected = [],
  predicted = [],
  keyOf = defaultKeyOf,
  isMatch = defaultIsMatch,
  isAbstention = isAbstentionByDefault,
  extraMetrics = [],
  scope = null
} = {}) {
  const inScope = createScopeFilter(scope);
  const scopedPredictions = predicted.filter(inScope);
  const ignoredCount = predicted.length - scopedPredictions.length;

  const { counts, outcomes } = compareItems({
    expected,
    predicted: scopedPredictions,
    keyOf,
    isMatch,
    isAbstention
  });
  counts.outOfScopePredictions = ignoredCount;
  const context = { expected, predicted: scopedPredictions, counts, outcomes };

  const metrics = [...standardMetrics(counts)];
  for (const metric of extraMetrics) {
    const computed = metric.compute(context) ?? {};
    metrics.push({
      id: metric.id,
      label: metric.label ?? metric.id,
      kind: computed.kind ?? metric.kind ?? "ratio",
      value: computed.value ?? null,
      numerator: computed.numerator,
      denominator: computed.denominator,
      note: computed.note ?? ""
    });
  }

  return { counts, outcomes, metrics };
}

/**
 * Exécute un cas complet.
 *
 * @param {object} options
 * @param {string} options.manifestPath chemin du `case.json`
 * @param {object} options.pipeline     pipeline du spike (cf. contrat ci-dessus)
 * @param {Function} [options.clock]    horloge injectable (tests reproductibles)
 * @param {Array|Function} [options.extraMetrics] métriques du spike, ou fabrique recevant le cas chargé
 * @param {boolean} [options.write]     écrire outputs/ et reports/ (défaut: true)
 */
export async function runSpikeCase({
  manifestPath,
  pipeline,
  keyOf,
  isMatch,
  isAbstention,
  extraMetrics = [],
  guards = commonGuards,
  clock = () => new Date(),
  write = true,
  outputsDir = OUTPUTS_DIR,
  reportsDir = REPORTS_DIR,
  paramOverrides = {}
}) {
  if (!pipeline || typeof pipeline.run !== "function") {
    throw new Error("harness: `pipeline.run` est obligatoire");
  }

  const testCase = await loadCase(manifestPath);
  const params = { ...testCase.params, ...paramOverrides };
  const trace = createLlmTraceCollector();
  const startedAt = clock();

  const result = (await pipeline.run({
    sources: testCase.sources,
    params,
    groundTruth: testCase.groundTruth,
    trace
  })) ?? {};

  const predictions = result.predictions ?? [];
  const finishedAt = clock();

  const evaluation = evaluateCase({
    expected: testCase.groundTruth?.items ?? [],
    predicted: predictions,
    keyOf,
    isMatch,
    isAbstention,
    // Un spike peut avoir besoin du cas lui-même pour construire ses métriques
    // (vérifier une provenance suppose d'avoir les sources sous la main).
    extraMetrics: typeof extraMetrics === "function" ? extraMetrics(testCase) : extraMetrics,
    scope: testCase.groundTruth?.scope ?? null
  });

  const guardViolations = runGuards(guards, {
    expected: testCase.groundTruth?.items ?? [],
    predicted: predictions,
    outcomes: evaluation.outcomes,
    counts: evaluation.counts,
    sources: testCase.sources,
    params
  });

  const record = buildRunRecord({
    spike: testCase.spike,
    caseId: testCase.caseId,
    title: testCase.title,
    pipeline,
    params,
    startedAt,
    finishedAt,
    sources: testCase.sources,
    groundTruth: testCase.groundTruth,
    predictions,
    evaluation,
    guardViolations,
    llmCalls: trace.list(),
    notes: result.notes ?? ""
  });

  const report = renderRunReport(record);
  const written = { runPath: null, reportPath: null };

  if (write) {
    written.runPath = await writeJsonFile(
      join(outputsDir, testCase.spike, testCase.caseId, `${record.run_id}.json`),
      record
    );
    written.reportPath = await writeTextFile(
      join(reportsDir, testCase.spike, testCase.caseId, `${record.run_id}.md`),
      report
    );
  }

  return { testCase, record, report, ...written };
}
