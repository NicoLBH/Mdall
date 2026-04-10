import { resolveDocumentRefs, decorateDocumentWithPhase } from "./project-documents-store.js";
import { store } from "../store.js";
import { normalizeReviewState } from "../views/ui/status-badges.js";

function normalizeEntityDocumentRefs(entity = {}) {
  return Array.isArray(entity?.document_ref_ids) ? entity.document_ref_ids : [];
}

function isEntityCounted(entity = {}) {
  const reviewState = normalizeReviewState(entity.review_state || entity?.raw?.review_state || "pending");
  return reviewState !== "rejected" && reviewState !== "dismissed";
}

function isOpenStatus(status = "open") {
  return String(status || "open").toLowerCase() !== "closed";
}

function flattenSubjects(subjects = [], acc = []) {
  for (const subject of Array.isArray(subjects) ? subjects : []) {
    acc.push(subject);
    flattenSubjects(subject?.children, acc);
  }
  return acc;
}

export function getSelectionDocumentRefs(selection) {
  const item = selection?.item || null;
  if (!item) return [];
  return resolveDocumentRefs(normalizeEntityDocumentRefs(item)).map(decorateDocumentWithPhase).filter(Boolean);
}

export function getDocumentStatsMap({
  getSituationStatus,
  getSujetStatus
} = {}) {
  const statsMap = new Map();
  const situations = Array.isArray(store.situationsView?.data) ? store.situationsView.data : [];

  function ensureStats(documentId) {
    if (!statsMap.has(documentId)) {
      statsMap.set(documentId, {
        openSituations: 0,
        openSujets: 0
      });
    }

    return statsMap.get(documentId);
  }

  function bump(refIds = [], updater) {
    for (const documentId of resolveDocumentRefs(refIds).map((item) => item.id)) {
      updater(ensureStats(documentId));
    }
  }

  for (const situation of situations) {
    if (isEntityCounted(situation)) {
      const effectiveSituationStatus = typeof getSituationStatus === "function"
        ? getSituationStatus(situation.id)
        : situation.status;

      if (isOpenStatus(effectiveSituationStatus)) {
        bump(normalizeEntityDocumentRefs(situation), (stats) => {
          stats.openSituations += 1;
        });
      }
    }

    for (const sujet of flattenSubjects(situation?.sujets)) {
      if (!isEntityCounted(sujet)) continue;

      const effectiveSujetStatus = typeof getSujetStatus === "function"
        ? getSujetStatus(sujet.id)
        : sujet.status;

      if (isOpenStatus(effectiveSujetStatus)) {
        bump(normalizeEntityDocumentRefs(sujet), (stats) => {
          stats.openSujets += 1;
        });
      }
    }
  }

  return statsMap;
}
