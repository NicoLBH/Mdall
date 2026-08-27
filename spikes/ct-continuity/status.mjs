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
 *
 * Encore faut-il qu'une disparition en soit une. Un avis ne « disparaît » que
 * d'un document qui avait vocation à le porter : un récapitulatif — RICT,
 * rapport d'étape, rapport final, APD — reprend l'état complet des avis à sa
 * date. Une fiche, non : elle traite son sujet et ignore les autres.
 *
 * D'où la règle, qui est le cœur de ce module : la disparition ne se lit qu'aux
 * **points de contrôle**. Tant qu'aucun récapitulatif n'a été émis depuis la
 * dernière apparition d'un avis, son silence ne prouve rien et l'avis reste
 * ouvert. Sans cette règle, un chantier livrant surtout des fiches voit tous
 * ses avis basculer « sans nouvelles » dès la fiche suivante — ce qui n'a
 * aucun sens et noie les vrais oubliés.
 */

import { CONTINUITY_STATE } from "./continuity.mjs";
import { requiresAction } from "./block-extraction.mjs";

export const AVIS_STATUS = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
  NO_NEWS: "NO_NEWS"
};

export const RESOLUTION_REASON = {
  DECLARED_LIFTED: "DECLARED_LIFTED",
  BACK_TO_FAVOURABLE: "BACK_TO_FAVOURABLE",
  /**
   * Le rapport final déclare l'ensemble des avis suivis d'effet. C'est la
   * clôture la plus forte du corpus : une phrase datée qui couvre tout le
   * dossier. Elle ne vaut que pour les avis émis avant elle, et elle tombe si
   * un document postérieur ressort l'avis.
   */
  DECLARED_GLOBALLY: "DECLARED_GLOBALLY"
};

/** Pourquoi un avis est encore ouvert — deux situations très différentes. */
export const OPEN_REASON = {
  /** Il figure toujours dans le dernier récapitulatif : ouvert, sans ambiguïté. */
  STILL_LISTED: "STILL_LISTED",
  /** Il a disparu, mais aucun récapitulatif n'a été émis depuis : rien ne prouve
   *  qu'il soit tombé, rien ne prouve qu'il tienne. On ne conclut pas. */
  NO_CHECKPOINT_SINCE: "NO_CHECKPOINT_SINCE"
};

/** Un avis figure-t-il dans ce document, ou en est-il absent ? */
function isPresent(state) {
  return (
    state === CONTINUITY_STATE.NEW ||
    state === CONTINUITY_STATE.MATCHED ||
    state === CONTINUITY_STATE.MATCHED_BY_TITLE
  );
}

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
export function summariseAvisStatus(predictions, documents, { globalClearances = [] } = {}) {
  const order = new Map(documents.map((document, index) => [document.source_id, index]));
  const dateOf = new Map(documents.map((document) => [document.source_id, document.issued_at ?? null]));
  const lastDate = documents.length > 0 ? documents[documents.length - 1].issued_at ?? null : null;

  // Les points de contrôle, dans l'ordre : les seuls documents dont le silence
  // ait valeur de constat.
  const checkpoints = documents
    .map((document, index) => ({ ...document, position: index }))
    .filter((document) => document.recapitulative === true);

  // Clôtures globales retenues dans l'ordre, avec la position de leur document.
  const clearances = globalClearances
    .filter((clearance) => order.has(clearance.source_document_id))
    .map((clearance) => ({ ...clearance, position: order.get(clearance.source_document_id) }))
    .sort((a, b) => a.position - b.position);

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

    // Le dernier document où l'avis figure réellement — pas le dernier du lot.
    const presentSteps = entry.steps.filter((step) =>
      isPresent(step.prediction.state === "AMBIGUOUS" ? CONTINUITY_STATE.AMBIGUOUS : step.prediction.value?.state)
    );
    const lastPresent = presentSteps[presentSteps.length - 1] ?? entry.steps[0];

    // Récapitulatifs postérieurs à cette dernière apparition : ceux-là auraient
    // dû le reprendre. Leur silence, et lui seul, fait la disparition.
    const missedCheckpoints = checkpoints.filter(
      (document) => document.position > lastPresent.position
    );

    let status = AVIS_STATUS.OPEN;
    let reason = null;
    let openReason = OPEN_REASON.STILL_LISTED;
    let evidence = null;
    let resolvedIn = null;

    // Une levée déclarée, où qu'elle figure dans la série, vaut preuve — et
    // elle prime sur tout le reste : c'est la seule clôture admissible.
    const lifted = entry.steps.find((step) => step.prediction.lifting_statement);

    // Une clôture globale ne couvre que ce qui la précède : si l'avis reparaît
    // après elle, elle ne dit plus rien de lui.
    const globalClearance = clearances.find((clearance) => clearance.position >= lastPresent.position) ?? null;

    if (lifted) {
      status = AVIS_STATUS.RESOLVED;
      reason = RESOLUTION_REASON.DECLARED_LIFTED;
      evidence = lifted.prediction.lifting_statement;
      resolvedIn = lifted.documentId;
    } else if (state === CONTINUITY_STATE.MATCHED_BY_TITLE) {
      status = AVIS_STATUS.RESOLVED;
      reason = RESOLUTION_REASON.BACK_TO_FAVOURABLE;
      evidence = last.prediction.provenance ?? null;
      resolvedIn = last.documentId;
    } else if (globalClearance) {
      status = AVIS_STATUS.RESOLVED;
      reason = RESOLUTION_REASON.DECLARED_GLOBALLY;
      evidence = globalClearance;
      resolvedIn = globalClearance.source_document_id;
    } else if (missedCheckpoints.length > 0) {
      status = AVIS_STATUS.NO_NEWS;
    } else if (!isPresent(state)) {
      // Disparu, mais d'aucun document qui avait vocation à le porter.
      openReason = OPEN_REASON.NO_CHECKPOINT_SINCE;
    }

    // L'ancienneté d'un avis levé s'arrête le jour de sa levée : la faire
    // courir jusqu'au dernier rapport ferait vieillir un dossier déjà clos.
    const resolvedAt = resolvedIn ? dateOf.get(resolvedIn) ?? null : null;

    summaries.push({
      reference: entry.reference,
      status,
      resolution_reason: reason,
      open_reason: status === AVIS_STATUS.OPEN ? openReason : null,
      // Le récapitulatif qui aurait dû le reprendre et ne l'a pas fait : c'est
      // lui qu'on cite au bureau de contrôle, pas une absence en général.
      missed_checkpoint_id: status === AVIS_STATUS.NO_NEWS ? missedCheckpoints[0].source_id : null,
      missed_checkpoint_at: status === AVIS_STATUS.NO_NEWS ? missedCheckpoints[0].issued_at ?? null : null,
      missed_checkpoints: status === AVIS_STATUS.NO_NEWS ? missedCheckpoints.length : 0,
      evidence,
      resolved_in: resolvedIn,
      resolved_at: resolvedAt,
      last_state: state ?? null,
      last_document_id: last.documentId,
      // « Vu pour la dernière fois » n'a de sens que s'il a disparu : tant
      // qu'il figure encore, le dernier document où il apparaît est le dernier
      // document tout court.
      last_seen_document_id: lastPresent.documentId,
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


/**
 * Ce qu'une apparition d'avis raconte, d'un document à l'autre.
 *
 * La distinction qui compte est celle entre un **rappel** et une
 * **réouverture**, et elle n'a rien à voir avec la présence ou l'absence :
 *
 *  - un rapport d'étape **rappelle** les avis en cours. L'avis reparaît après
 *    plusieurs fiches qui ne le mentionnaient pas, mais rien n'a changé : il
 *    n'a jamais cessé d'être suspendu.
 *  - une **réouverture** est un retour en arrière du dossier : un point jugé
 *    favorable, pour mémoire, hors mission ou sans objet redevient suspendu,
 *    défavorable ou non conforme. C'est un fait de chantier, pas un effet de
 *    mise en page.
 *
 * Confondre les deux faisait annoncer « RÉOUVERT » à chaque récapitulatif, et
 * noyait les vraies régressions dans le bruit.
 */
export const APPEARANCE = {
  /** Première apparition connue. */
  NEW: "NEW",
  /** Présent dans le document précédent, toujours là. */
  TRACKED: "TRACKED",
  /** Reparaît après une absence, sans changement d'appréciation. */
  RECALLED: "RECALLED",
  /** Repasse d'une appréciation sans suite à une appréciation qui en appelle une. */
  REOPENED: "REOPENED"
};

/**
 * @param {{opinion_raw: string, opinion_label: string}|null} previous dernière apparition connue
 * @param {{opinion_raw: string, opinion_label: string}|null} current apparition courante
 * @param {{afterGap: boolean}} context le document précédent ne le mentionnait pas
 */
export function classifyAppearance(previous, current, { afterGap = false } = {}) {
  if (!previous) return APPEARANCE.NEW;
  if (!current) return APPEARANCE.TRACKED;

  // Le retour en arrière se lit sur l'appréciation, pas sur la présence.
  if (!requiresAction(previous) && requiresAction(current)) return APPEARANCE.REOPENED;

  return afterGap ? APPEARANCE.RECALLED : APPEARANCE.TRACKED;
}
