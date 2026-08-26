/**
 * Enregistrement d'un run : tout ce qu'il faut pour rejouer et auditer.
 *
 * L'horloge est injectable (`clock`) afin que les tests produisent des
 * enregistrements strictement identiques d'une exécution à l'autre.
 */

import { slugifyIdentifier, slugifyTimestamp } from "./normalize.mjs";

export const RUN_SCHEMA = "mdall.spike.run/1";

export function buildRunId({ spike, caseId, startedAt }) {
  return `${slugifyIdentifier(spike)}__${slugifyIdentifier(caseId)}__${slugifyTimestamp(startedAt)}`;
}

export function buildRunRecord({
  spike,
  caseId,
  title = null,
  pipeline = {},
  params = {},
  startedAt,
  finishedAt,
  sources = [],
  groundTruth = null,
  predictions = [],
  evaluation = { counts: {}, outcomes: [], metrics: [] },
  guardViolations = [],
  llmCalls = [],
  notes = ""
}) {
  const started = startedAt instanceof Date ? startedAt : new Date(startedAt);
  const finished = finishedAt instanceof Date ? finishedAt : new Date(finishedAt ?? started);

  return {
    schema: RUN_SCHEMA,
    run_id: buildRunId({ spike, caseId, startedAt: started }),
    spike,
    case_id: caseId,
    title,
    pipeline: {
      id: pipeline.id ?? "unknown",
      version: pipeline.version ?? "0.0.0",
      description: pipeline.description ?? ""
    },
    params,
    started_at: started.toISOString(),
    finished_at: finished.toISOString(),
    duration_ms: finished.getTime() - started.getTime(),
    sources: sources.map((source) => ({
      source_id: source.source_id,
      source_type: source.source_type,
      order: source.order,
      issued_at: source.issued_at ?? null,
      issuer: source.issuer ?? null,
      content_available: source.content_available ?? false,
      content_sha256: source.content_sha256 ?? null
    })),
    ground_truth: groundTruth
      ? {
          path: groundTruth.path,
          annotator: groundTruth.annotator,
          annotated_at: groundTruth.annotatedAt,
          item_count: groundTruth.items.length
        }
      : null,
    expected: groundTruth?.items ?? [],
    predictions,
    counts: evaluation.counts ?? {},
    metrics: evaluation.metrics ?? [],
    outcomes: evaluation.outcomes ?? [],
    guard_violations: guardViolations,
    llm_calls: llmCalls,
    notes
  };
}
