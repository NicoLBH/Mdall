import { store } from "../store.js";
import { buildSubjectHierarchyIndexes, getChildrenBySubjectIdMapFromRawResult, getRootSubjectIdsFromRawResult } from "./subject-hierarchy.js";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function getRawSubjectsResult() {
  const projectRaw = store.projectSubjectsView?.rawSubjectsResult || store.projectSubjectsView?.rawResult;
  if (projectRaw && typeof projectRaw === "object") return projectRaw;
  const legacyRaw = store.situationsView?.rawResult;
  if (legacyRaw && typeof legacyRaw === "object") return legacyRaw;
  return {};
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

  return {};
}

function getHierarchyFromIndexedSources() {
  const raw = getRawSubjectsResult();

  const rawChildrenBySubjectId = raw.childrenBySubjectId && typeof raw.childrenBySubjectId === "object"
    ? getChildrenBySubjectIdMapFromRawResult(raw)
    : {};
  const rawRootSubjectIds = Array.isArray(raw.rootSubjectIds)
    ? getRootSubjectIdsFromRawResult(raw)
    : [];

  if (Object.keys(rawChildrenBySubjectId).length || rawRootSubjectIds.length) {
    return {
      childrenBySubjectId: rawChildrenBySubjectId,
      rootSubjectIds: rawRootSubjectIds
    };
  }

  const subjectsById = getSubjectsByIdMap();
  if (!Object.keys(subjectsById).length) {
    return {
      childrenBySubjectId: {},
      rootSubjectIds: []
    };
  }

  const { childrenBySubjectId, rootSubjectIds } = buildSubjectHierarchyIndexes(Object.values(subjectsById), subjectsById);
  return {
    childrenBySubjectId,
    rootSubjectIds
  };
}

function getChildrenBySubjectIdMap() {
  return getHierarchyFromIndexedSources().childrenBySubjectId;
}

function getRootSubjectIds() {
  return getHierarchyFromIndexedSources().rootSubjectIds;
}

function getLinksBySubjectIdMap() {
  const raw = getRawSubjectsResult();
  if (raw.linksBySubjectId && typeof raw.linksBySubjectId === "object") return raw.linksBySubjectId;
  return {};
}

function getSituationsByIdMap() {
  const raw = getRawSubjectsResult();
  if (raw.situationsById && typeof raw.situationsById === "object") return raw.situationsById;
  if (raw.relationOptionsById && typeof raw.relationOptionsById === "object") return raw.relationOptionsById;

  const fallback = {};
  for (const situation of safeArray(store.situationsView?.data)) {
    const id = String(situation?.id || "");
    if (!id) continue;
    fallback[id] = situation;
  }
  return fallback;
}

function getSubjectIdsBySituationIdMap() {
  const raw = getRawSubjectsResult();
  if (raw.subjectIdsBySituationId && typeof raw.subjectIdsBySituationId === "object") return raw.subjectIdsBySituationId;

  const relationIdsBySubjectId = raw.relationIdsBySubjectId && typeof raw.relationIdsBySubjectId === "object"
    ? raw.relationIdsBySubjectId
    : {};

  const fallback = {};
  for (const [subjectId, relationIds] of Object.entries(relationIdsBySubjectId)) {
    for (const relationId of safeArray(relationIds)) {
      const normalizedId = String(relationId || "");
      if (!normalizedId) continue;
      if (!Array.isArray(fallback[normalizedId])) fallback[normalizedId] = [];
      fallback[normalizedId].push(String(subjectId || ""));
    }
  }

  return fallback;
}

function isClosedStatus(status) {
  return String(status || "open").toLowerCase() === "closed";
}

function isBlockedSubject(subjectId) {
  return (getLinksBySubjectIdMap()[String(subjectId || "")] || []).some((link) => {
    return String(link?.source_subject_id || "") === String(subjectId || "")
      && String(link?.link_type || "").toLowerCase() === "blocked_by";
  });
}

function isBlockingSubject(subjectId) {
  return (getLinksBySubjectIdMap()[String(subjectId || "")] || []).some((link) => {
    return String(link?.target_subject_id || "") === String(subjectId || "")
      && String(link?.link_type || "").toLowerCase() === "blocked_by";
  });
}

function getAllSubjects() {
  const subjectsById = getSubjectsByIdMap();
  return Object.values(subjectsById);
}

function getRunLogDates() {
  const entries = safeArray(store.projectAutomation?.runLog);
  const dates = entries
    .map((entry) => new Date(entry?.finishedAt || entry?.startedAt || entry?.createdAt || Date.now()))
    .filter((date) => Number.isFinite(date.getTime()));

  if (!dates.length) {
    dates.push(new Date());
  }

  return dates.sort((left, right) => left - right);
}

function formatLabel(date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(date);
}

function zeroes(length) {
  return Array.from({ length }, () => 0);
}

export function getProjectInsightsMetrics() {
  const subjects = getAllSubjects();
  const runDates = getRunLogDates();
  const labels = runDates.map(formatLabel);
  const childrenBySubjectId = getChildrenBySubjectIdMap();
  const situationsById = getSituationsByIdMap();
  const subjectIdsBySituationId = getSubjectIdsBySituationIdMap();

  const totalSubjects = subjects.length;
  const openSubjects = subjects.filter((subject) => !isClosedStatus(subject?.status)).length;
  const closedSubjects = Math.max(0, totalSubjects - openSubjects);
  const criticalSubjects = subjects.filter((subject) => String(subject?.priority || "").toLowerCase() === "critical").length;
  const blockedSubjects = subjects.filter((subject) => isBlockedSubject(subject?.id)).length;
  const blockingSubjects = subjects.filter((subject) => isBlockingSubject(subject?.id)).length;
  const rootSubjects = getRootSubjectIds().length;
  const childSubjects = Math.max(0, totalSubjects - rootSubjects);
  const activeSituations = Object.keys(situationsById).filter((situationId) => {
    const situation = situationsById[situationId] || null;
    if (!situation) return false;
    if (!isClosedStatus(situation?.status)) return true;
    return safeArray(subjectIdsBySituationId[situationId]).some((subjectId) => !isClosedStatus(getSubjectsByIdMap()[String(subjectId || "")]?.status));
  }).length;

  const runCountSeries = zeroes(labels.length);
  const createdSubjectSeries = zeroes(labels.length);
  const closedSubjectSeries = zeroes(labels.length);
  const openBacklogSeries = zeroes(labels.length);
  const criticalSeries = zeroes(labels.length);
  const hierarchySeries = zeroes(labels.length);
  const blockedSeries = zeroes(labels.length);

  safeArray(store.projectAutomation?.runLog).forEach((entry, index) => {
    const targetIndex = Math.min(index, labels.length - 1);
    if (targetIndex >= 0) runCountSeries[targetIndex] += 1;
  });

  labels.forEach((_, index) => {
    createdSubjectSeries[index] = totalSubjects;
    closedSubjectSeries[index] = closedSubjects;
    openBacklogSeries[index] = openSubjects;
    criticalSeries[index] = criticalSubjects;
    hierarchySeries[index] = childSubjects;
    blockedSeries[index] = blockedSubjects;
  });

  const closureRate = totalSubjects > 0 ? Math.round((closedSubjects / totalSubjects) * 100) : 0;
  const criticalRate = totalSubjects > 0 ? Math.round((criticalSubjects / totalSubjects) * 100) : 0;

  return {
    summary: {
      activeSituations,
      childSubjects,
      backlog: openSubjects,
      blocking: blockedSubjects,
      blockedSubjects,
      blockingSubjects,
      criticalRate,
      closureRate
    },
    charts: {
      confidence: {
        title: "Répartition du backlog",
        subtitle: "Répartition actuelle des sujets ouverts, fermés et critiques.",
        labels,
        series: [
          { label: "Sujets ouverts", values: openBacklogSeries },
          { label: "Sujets fermés", values: closedSubjectSeries },
          { label: "Sujets critiques", values: criticalSeries }
        ]
      },
      validationTime: {
        title: "Structure hiérarchique",
        subtitle: "Comparaison entre sujets racines et sous-sujets.",
        yLabel: "sujets",
        labels,
        yMax: Math.max(rootSubjects, childSubjects, 1),
        series: [
          { label: "Sujets racines", values: zeroes(labels.length).map(() => rootSubjects) },
          { label: "Sous-sujets", values: hierarchySeries, fill: true }
        ]
      },
      backlogBlocking: {
        title: "Backlog et blocages",
        subtitle: "Volume ouvert et sous-ensemble actuellement bloqué.",
        yLabel: "sujets",
        labels,
        yMax: Math.max(...openBacklogSeries, ...blockedSeries, 1),
        series: [
          { label: "Backlog ouvert", values: openBacklogSeries, fill: true },
          { label: "Sujets bloqués", values: blockedSeries }
        ]
      },
      criticalRate: {
        title: "Taux critique",
        subtitle: "Part des sujets critiques dans le périmètre courant.",
        yLabel: "%",
        labels,
        yMax: 100,
        series: [
          { label: "Taux critique", values: zeroes(labels.length).map(() => criticalRate), fill: true }
        ]
      },
      flow: {
        title: "Flux de sujets",
        subtitle: "Total détecté versus sous-ensemble déjà fermé.",
        yLabel: "sujets",
        labels,
        yMax: Math.max(...createdSubjectSeries, ...closedSubjectSeries, 1),
        series: [
          { label: "Sujets détectés", values: createdSubjectSeries },
          { label: "Sujets fermés", values: closedSubjectSeries }
        ]
      },
      closureRate: {
        title: "Taux de fermeture",
        subtitle: "Part des sujets fermés dans le snapshot courant.",
        yLabel: "%",
        labels,
        yMax: 100,
        series: [
          { label: "Taux de fermeture", values: zeroes(labels.length).map(() => closureRate), fill: true }
        ]
      },
      activity: {
        title: "Activité projet",
        subtitle: "Runs exécutés, sujets totaux et sujets bloqués.",
        yLabel: "volume",
        labels,
        yMax: Math.max(...runCountSeries, ...createdSubjectSeries, ...blockedSeries, 1),
        series: [
          { label: "Runs", values: runCountSeries },
          { label: "Sujets", values: createdSubjectSeries },
          { label: "Sujets bloqués", values: blockedSeries }
        ]
      }
    }
  };
}
