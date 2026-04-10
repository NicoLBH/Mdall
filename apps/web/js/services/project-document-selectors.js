import { resolveDocumentRefs, decorateDocumentWithPhase } from "./project-documents-store.js";
import { store } from "../store.js";
import { normalizeReviewState } from "../views/ui/status-badges.js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getRawSubjectsResult() {
  const projectRaw = store.projectSubjectsView?.rawSubjectsResult || store.projectSubjectsView?.rawResult;
  if (projectRaw && typeof projectRaw === "object") return projectRaw;
  const legacyRaw = store.situationsView?.rawResult;
  if (legacyRaw && typeof legacyRaw === "object") return legacyRaw;
  return {};
}

function normalizeEntityDocumentRefs(entity = {}) {
  const directRefs = Array.isArray(entity?.document_ref_ids) ? entity.document_ref_ids : [];
  const rawRefs = Array.isArray(entity?.raw?.document_ref_ids) ? entity.raw.document_ref_ids : [];
  const singleDocumentIds = [entity?.document_id, entity?.raw?.document_id].filter(Boolean);
  return [...new Set([...directRefs, ...rawRefs, ...singleDocumentIds].map((value) => String(value || "")).filter(Boolean))];
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

function getSubjectsByIdMap() {
  const raw = getRawSubjectsResult();
  if (raw.subjectsById && typeof raw.subjectsById === "object") return raw.subjectsById;

  const fromProjectView = safeArray(store.projectSubjectsView?.subjectsData);
  if (fromProjectView.length) {
    return Object.fromEntries(fromProjectView
      .map((subject) => [String(subject?.id || ""), subject])
      .filter(([id]) => !!id));
  }

  const fallback = {};
  const situations = Array.isArray(store.situationsView?.data) ? store.situationsView.data : [];
  for (const situation of situations) {
    for (const subject of flattenSubjects(situation?.sujets)) {
      const id = String(subject?.id || "");
      if (!id) continue;
      fallback[id] = subject;
    }
  }
  return fallback;
}

function getLinksBySubjectIdMap() {
  const raw = getRawSubjectsResult();
  if (raw.linksBySubjectId && typeof raw.linksBySubjectId === "object") return raw.linksBySubjectId;
  return {};
}

function getRelationIdsBySubjectIdMap() {
  const raw = getRawSubjectsResult();
  if (raw.relationIdsBySubjectId && typeof raw.relationIdsBySubjectId === "object") return raw.relationIdsBySubjectId;

  const fallback = {};
  const situations = Array.isArray(store.situationsView?.data) ? store.situationsView.data : [];
  for (const situation of situations) {
    const situationId = String(situation?.id || "");
    for (const subject of flattenSubjects(situation?.sujets)) {
      const subjectId = String(subject?.id || "");
      if (!subjectId) continue;
      if (!Array.isArray(fallback[subjectId])) fallback[subjectId] = [];
      if (situationId) fallback[subjectId].push(situationId);
    }
  }
  return fallback;
}

function getSituationsByIdMap() {
  const raw = getRawSubjectsResult();
  if (raw.situationsById && typeof raw.situationsById === "object") return raw.situationsById;
  if (raw.relationOptionsById && typeof raw.relationOptionsById === "object") return raw.relationOptionsById;

  const fallback = {};
  const situations = Array.isArray(store.situationsView?.data) ? store.situationsView.data : [];
  for (const situation of situations) {
    const id = String(situation?.id || "");
    if (!id) continue;
    fallback[id] = situation;
  }
  return fallback;
}

function getBlockedByCount(subjectId) {
  return (getLinksBySubjectIdMap()[String(subjectId || "")] || []).filter((link) => {
    return String(link?.source_subject_id || "") === String(subjectId || "")
      && String(link?.link_type || "").toLowerCase() === "blocked_by";
  }).length;
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
  const subjectsById = getSubjectsByIdMap();
  const relationIdsBySubjectId = getRelationIdsBySubjectIdMap();
  const situationsById = getSituationsByIdMap();
  const openSituationIdsByDocumentId = new Map();

  function ensureStats(documentId) {
    if (!statsMap.has(documentId)) {
      statsMap.set(documentId, {
        openSituations: 0,
        openSujets: 0,
        totalSubjects: 0,
        linkedSituations: 0,
        blockedSubjects: 0
      });
    }

    return statsMap.get(documentId);
  }

  function bump(refIds = [], updater) {
    for (const documentId of resolveDocumentRefs(refIds).map((item) => item.id)) {
      updater(ensureStats(documentId));
    }
  }

  for (const subject of Object.values(subjectsById)) {
    if (!isEntityCounted(subject)) continue;

    const docRefs = normalizeEntityDocumentRefs(subject);
    if (!docRefs.length) continue;

    bump(docRefs, (stats) => {
      stats.totalSubjects += 1;
    });

    const effectiveSujetStatus = typeof getSujetStatus === "function"
      ? getSujetStatus(subject.id)
      : subject.status;

    if (isOpenStatus(effectiveSujetStatus)) {
      bump(docRefs, (stats) => {
        stats.openSujets += 1;
      });
    }

    if (getBlockedByCount(subject.id) > 0) {
      bump(docRefs, (stats) => {
        stats.blockedSubjects += 1;
      });
    }

    for (const situationId of safeArray(relationIdsBySubjectId[String(subject?.id || "")] || [subject?.situation_id])) {
      const normalizedSituationId = String(situationId || "");
      if (!normalizedSituationId) continue;

      const situation = situationsById[normalizedSituationId] || null;
      const effectiveSituationStatus = typeof getSituationStatus === "function"
        ? getSituationStatus(normalizedSituationId)
        : situation?.status;

      for (const documentId of resolveDocumentRefs(docRefs).map((item) => item.id)) {
        const bucket = openSituationIdsByDocumentId.get(documentId) || new Set();
        bucket.add(`all:${normalizedSituationId}`);
        if (isOpenStatus(effectiveSituationStatus)) {
          bucket.add(`open:${normalizedSituationId}`);
        }
        openSituationIdsByDocumentId.set(documentId, bucket);
      }
    }
  }

  for (const [documentId, keys] of openSituationIdsByDocumentId.entries()) {
    const stats = ensureStats(documentId);
    stats.linkedSituations = [...keys].filter((key) => key.startsWith("all:")).length;
    stats.openSituations = [...keys].filter((key) => key.startsWith("open:")).length;
  }

  return statsMap;
}
