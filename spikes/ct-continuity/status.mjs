/**
 * Spike 1 — état des avis à une date.
 *
 * Trois états, et le troisième est le plus important :
 *
 *  - `OPEN` — l'avis figure encore, numéroté, dans le dernier document où il
 *    apparaît. Il appelle une action.
 *  - `RESOLVED` — un document le déclare levé, ou il a perdu son numéro en
 *    repassant favorable. Dans les deux cas, une preuve existe.
 *  - `NO_NEWS` — il a disparu sans que rien ne l'explique. Ce n'est pas une
 *    clôture (§28.5), ce n'est pas non plus un avis ouvert : c'est une question
 *    à poser au bureau de contrôle. L'outil ne tranche pas à sa place.
 */

import { CONTINUITY_STATE } from "./continuity.mjs";

export const AVIS_STATUS = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
  NO_NEWS: "NO_NEWS"
};

export const RESOLUTION_REASON = {
  DECLARED_LIFTED: "DECLARED_LIFTED",
  BACK_TO_FAVOURABLE: "BACK_TO_FAVOURABLE"
};

function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null;
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.round((to - from) / 86400000);
}

/**
 * Résume l'état de chaque avis numéroté.
 *
 * @param {object[]} predictions sorties du pipeline
 * @param {{source_id: string, issued_at: string|null}[]} documents dans l'ordre chronologique
 */
export function summariseAvisStatus(predictions, documents) {
  const order = new Map(documents.map((document, index) => [document.source_id, index]));
  const dateOf = new Map(documents.map((document) => [document.source_id, document.issued_at ?? null]));
  const lastDate = documents.length > 0 ? documents[documents.length - 1].issued_at ?? null : null;

  const byReference = new Map();

  for (const prediction of predictions) {
    if (prediction.kind !== "continuity") continue;
    const [, documentId, reference] = prediction.key.split(":");
    if (!order.has(documentId)) continue;

    const entry = byReference.get(reference) ?? { reference, steps: [] };
    entry.steps.push({ documentId, prediction, position: order.get(documentId) });
    byReference.set(reference, entry);
  }

  const summaries = [];

  for (const entry of byReference.values()) {
    entry.steps.sort((a, b) => a.position - b.position);
    const last = entry.steps[entry.steps.length - 1];
    const state = last.prediction.state === "AMBIGUOUS" ? CONTINUITY_STATE.AMBIGUOUS : last.prediction.value?.state;

    // Première apparition : c'est de là que court l'ancienneté.
    const first = entry.steps[0];
    const raisedIn = first.documentId;
    const raisedAt = dateOf.get(raisedIn) ?? null;

    let status = AVIS_STATUS.OPEN;
    let reason = null;
    let evidence = null;
    let resolvedIn = null;

    if (state === CONTINUITY_STATE.MATCHED_BY_TITLE) {
      status = AVIS_STATUS.RESOLVED;
      reason = RESOLUTION_REASON.BACK_TO_FAVOURABLE;
      evidence = last.prediction.provenance ?? null;
      resolvedIn = last.documentId;
    } else if (state === CONTINUITY_STATE.NOT_FOUND) {
      // Une levée déclarée, où qu'elle figure dans la série, vaut preuve.
      const lifted = entry.steps.find((step) => step.prediction.lifting_statement);
      if (lifted) {
        status = AVIS_STATUS.RESOLVED;
        reason = RESOLUTION_REASON.DECLARED_LIFTED;
        evidence = lifted.prediction.lifting_statement;
        resolvedIn = lifted.documentId;
      } else {
        status = AVIS_STATUS.NO_NEWS;
      }
    }

    // L'ancienneté d'un avis levé s'arrête le jour de sa levée : la faire
    // courir jusqu'au dernier rapport ferait vieillir un dossier déjà clos.
    const resolvedAt = resolvedIn ? dateOf.get(resolvedIn) ?? null : null;

    summaries.push({
      reference: entry.reference,
      status,
      resolution_reason: reason,
      evidence,
      resolved_in: resolvedIn,
      resolved_at: resolvedAt,
      last_state: state ?? null,
      last_document_id: last.documentId,
      // « Vu pour la dernière fois » n'a de sens que s'il a disparu : tant
      // qu'il figure encore, le dernier document où il apparaît est le dernier
      // document tout court.
      last_seen_document_id:
        state === CONTINUITY_STATE.NOT_FOUND
          ? last.prediction.value?.previous_document_id ?? last.documentId
          : last.documentId,
      raised_in: raisedIn,
      raised_at: raisedAt,
      age_days: daysBetween(raisedAt, resolvedAt ?? lastDate),
      opinion_raw:
        last.prediction.matched_opinion_raw ??
        entry.steps.map((step) => step.prediction.value?.opinion_change).at(-1) ??
        null,
      steps: entry.steps.length
    });
  }

  const rank = { [AVIS_STATUS.OPEN]: 0, [AVIS_STATUS.NO_NEWS]: 1, [AVIS_STATUS.RESOLVED]: 2 };
  summaries.sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return (b.age_days ?? 0) - (a.age_days ?? 0);
  });

  return summaries;
}

export function countByStatus(summaries) {
  return summaries.reduce(
    (counts, summary) => ({ ...counts, [summary.status]: (counts[summary.status] ?? 0) + 1 }),
    { OPEN: 0, RESOLVED: 0, NO_NEWS: 0 }
  );
}
