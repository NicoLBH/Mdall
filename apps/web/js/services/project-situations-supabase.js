import { store } from "../store.js";
import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { resolveCurrentBackendProjectId } from "./project-supabase-sync.js";

const SUPABASE_URL = getSupabaseUrl();
const FRONT_PROJECT_MAP_STORAGE_KEY = "mdall.supabaseProjectMap.v1";

function logSituationKanbanOrder(event, payload = {}) {
  console.info(`[situation-kanban-order] ${event}`, payload);
}


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

function normalizeUuid(value) {
  const normalized = String(value || "").trim();
  return normalized || "";
}

function normalizeSituationStatus(value) {
  return String(value || "open").trim().toLowerCase() === "closed" ? "closed" : "open";
}

function normalizeSituationMode(value) {
  return String(value || "manual").trim().toLowerCase() === "automatic" ? "automatic" : "manual";
}

function normalizeArrayOfStrings(value) {
  return [...new Set(safeArray(value).map((entry) => String(entry || "").trim()).filter(Boolean))];
}

const SITUATION_KANBAN_STATUS_KEYS = new Set(["non_active", "to_activate", "in_progress", "in_arbitration", "resolved"]);

function normalizeSituationKanbanStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SITUATION_KANBAN_STATUS_KEYS.has(normalized) ? normalized : "";
}


function normalizeFilterDefinition(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const normalized = {
    status: normalizeArrayOfStrings(value.status).map((entry) => entry.toLowerCase()).filter((entry) => entry === "open" || entry === "closed"),
    priorities: normalizeArrayOfStrings(value.priorities).map((entry) => entry.toLowerCase()).filter((entry) => ["low", "medium", "high", "critical"].includes(entry)),
    objectiveIds: normalizeArrayOfStrings(value.objectiveIds),
    labelIds: normalizeArrayOfStrings(value.labelIds).map((entry) => entry.toLowerCase()),
    assigneeIds: normalizeArrayOfStrings(value.assigneeIds),
    blockedOnly: Boolean(value.blockedOnly)
  };

  return normalized;
}

function normalizeSituationRow(row = {}) {
  const filterDefinition = normalizeFilterDefinition(row.filter_definition);
  return {
    ...row,
    id: normalizeUuid(row.id),
    project_id: normalizeUuid(row.project_id),
    title: firstNonEmpty(row.title, "Situation"),
    description: firstNonEmpty(row.description, ""),
    status: normalizeSituationStatus(row.status),
    mode: normalizeSituationMode(row.mode),
    filter_definition: filterDefinition,
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
    closed_at: row.closed_at || null
  };
}

function readFrontendProjectMap() {
  try {
    const raw = localStorage.getItem(FRONT_PROJECT_MAP_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getFrontendProjectKey() {
  return String(store.currentProjectId || store.currentProject?.id || "default").trim() || "default";
}

function getMappedBackendProjectId() {
  const frontendProjectKey = getFrontendProjectKey();
  const map = readFrontendProjectMap();
  return normalizeUuid(map[frontendProjectKey]);
}

async function getSupabaseAuthHeaders(extra = {}) {
  return buildSupabaseAuthHeaders(extra);
}

async function getResolvedProjectId(projectId) {
  const explicitProjectId = normalizeUuid(projectId);
  if (explicitProjectId) {
    return explicitProjectId;
  }

  const mappedProjectId = getMappedBackendProjectId();
  if (mappedProjectId) {
    return mappedProjectId;
  }

  const resolvedProjectId = normalizeUuid(await resolveCurrentBackendProjectId().catch(() => ""));
  return resolvedProjectId;
}

function getSituationsSelectClause() {
  return "id,project_id,title,description,status,mode,filter_definition,created_at,updated_at,closed_at";
}

async function fetchSituationsByProject(projectId) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/situations`);
  url.searchParams.set("select", getSituationsSelectClause());
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`situations fetch failed (${res.status}): ${text}`);
  }

  return safeArray(await res.json()).map(normalizeSituationRow);
}

async function fetchSituationById(situationId) {
  const normalizedSituationId = normalizeUuid(situationId);
  if (!normalizedSituationId) throw new Error("situationId is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/situations`);
  url.searchParams.set("select", getSituationsSelectClause());
  url.searchParams.set("id", `eq.${normalizedSituationId}`);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`situation fetch failed (${res.status}): ${text}`);
  }

  return normalizeSituationRow((safeArray(await res.json())[0]) || {});
}

function syncSituationsStore(projectId, situations) {
  const normalizedProjectScopeId = String(store.currentProjectId || "").trim() || null;
  const normalizedSituations = safeArray(situations).map(normalizeSituationRow);
  store.situationsView.data = normalizedSituations;
  store.situationsView.pagination = {
    mode: "full",
    pageSize: null,
    currentPage: 1,
    totalItems: normalizedSituations.length,
    loadedItems: normalizedSituations.length,
    hasNextPage: false,
    nextCursor: null,
    sourceComplete: true
  };
  store.situationsView.projectScopeId = normalizedProjectScopeId;
  store.situationsView.page = 1;
  return normalizedSituations;
}

function getSubjectMetaMap(projectSubjectsState = store.projectSubjectsView) {
  const rawBucketMeta = projectSubjectsState?.bucket?.subjectMeta?.sujet;
  if (rawBucketMeta && typeof rawBucketMeta === "object") return rawBucketMeta;
  return {};
}

function getLinksBySubjectIdMap(projectSubjectsState = store.projectSubjectsView) {
  const rawLinks = projectSubjectsState?.rawSubjectsResult?.linksBySubjectId;
  if (rawLinks && typeof rawLinks === "object") return rawLinks;
  return {};
}

function getSubjectsByIdMap(projectSubjectsState = store.projectSubjectsView) {
  const rawSubjects = projectSubjectsState?.rawSubjectsResult?.subjectsById;
  if (rawSubjects && typeof rawSubjects === "object") return rawSubjects;

  const fallback = {};
  for (const subject of safeArray(projectSubjectsState?.subjectsData)) {
    const subjectId = normalizeUuid(subject?.id);
    if (!subjectId) continue;
    fallback[subjectId] = { ...subject, id: subjectId };
  }
  return fallback;
}

function getSubjectObjectiveIds(subjectId, projectSubjectsState = store.projectSubjectsView) {
  const meta = getSubjectMetaMap(projectSubjectsState)[normalizeUuid(subjectId)] || {};
  return normalizeArrayOfStrings(meta.objectiveIds);
}

function getSubjectLabelKeys(subjectId, projectSubjectsState = store.projectSubjectsView) {
  const meta = getSubjectMetaMap(projectSubjectsState)[normalizeUuid(subjectId)] || {};
  return normalizeArrayOfStrings(meta.labels).map((entry) => entry.toLowerCase());
}

function getSubjectAssigneeIds(subjectId, projectSubjectsState = store.projectSubjectsView) {
  const meta = getSubjectMetaMap(projectSubjectsState)[normalizeUuid(subjectId)] || {};
  return normalizeArrayOfStrings(meta.assignees);
}

function getSubjectEffectiveStatus(subject, projectSubjectsState = store.projectSubjectsView) {
  const subjectId = normalizeUuid(subject?.id);
  const decision = projectSubjectsState?.rawSubjectsResult?.decisions?.sujet?.[subjectId]
    || projectSubjectsState?.rawSubjectsResult?.decisions?.subject?.[subjectId]
    || null;
  const normalizedDecision = String(decision?.decision || "").trim().toUpperCase();
  if (normalizedDecision === "CLOSED") return "closed";
  if (normalizedDecision === "REOPENED") return "open";
  return String(subject?.status || "open").trim().toLowerCase() === "closed" ? "closed" : "open";
}

function isSubjectBlocked(subjectId, projectSubjectsState = store.projectSubjectsView) {
  const links = safeArray(getLinksBySubjectIdMap(projectSubjectsState)[normalizeUuid(subjectId)]);
  return links.some((link) => {
    const linkType = String(link?.link_type || "").trim().toLowerCase();
    const sourceId = normalizeUuid(link?.source_subject_id);
    return linkType === "blocked_by" && sourceId === normalizeUuid(subjectId);
  });
}

function subjectMatchesAutomaticFilter(subject, filterDefinition, projectSubjectsState = store.projectSubjectsView) {
  if (!subject) return false;

  const normalizedFilter = normalizeFilterDefinition(filterDefinition) || {};
  const subjectId = normalizeUuid(subject.id);
  const effectiveStatus = getSubjectEffectiveStatus(subject, projectSubjectsState);
  const priority = String(subject?.priority || "medium").trim().toLowerCase();
  const subjectObjectiveIds = getSubjectObjectiveIds(subjectId, projectSubjectsState);
  const subjectLabelIds = getSubjectLabelKeys(subjectId, projectSubjectsState);
  const subjectAssigneeIds = getSubjectAssigneeIds(subjectId, projectSubjectsState);

  if (normalizedFilter.status?.length && !normalizedFilter.status.includes(effectiveStatus)) return false;
  if (normalizedFilter.priorities?.length && !normalizedFilter.priorities.includes(priority)) return false;
  if (normalizedFilter.objectiveIds?.length && !normalizedFilter.objectiveIds.some((id) => subjectObjectiveIds.includes(id))) return false;
  if (normalizedFilter.labelIds?.length && !normalizedFilter.labelIds.some((id) => subjectLabelIds.includes(id))) return false;
  if (normalizedFilter.assigneeIds?.length && !normalizedFilter.assigneeIds.some((id) => subjectAssigneeIds.includes(id))) return false;
  if (normalizedFilter.blockedOnly && !isSubjectBlocked(subjectId, projectSubjectsState)) return false;

  return true;
}

function sortSubjects(subjects = []) {
  return [...subjects].sort((left, right) => {
    const leftTs = Date.parse(left?.created_at || "") || 0;
    const rightTs = Date.parse(right?.created_at || "") || 0;
    if (leftTs !== rightTs) return leftTs - rightTs;
    return firstNonEmpty(left?.title, left?.id, "").localeCompare(firstNonEmpty(right?.title, right?.id, ""), "fr");
  });
}

function getRangeDayCount(range) {
  if (range === "1m") return 30;
  if (range === "3m") return 90;
  return 14;
}

function toDayStartTimestamp(value) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return NaN;
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

function buildEvenTicks(maxValue, targetSteps = 5) {
  const safeMax = Math.max(0, Number(maxValue) || 0);
  const step = Math.max(1, Math.ceil(safeMax / Math.max(1, targetSteps)));
  const ticks = [0];
  for (let value = step; value <= safeMax; value += step) ticks.push(value);
  if (ticks[ticks.length - 1] !== safeMax) ticks.push(safeMax);
  return [...new Set(ticks)];
}

function buildSituationBurnupChartData(subjects = [], range = "2w") {
  const safeSubjects = safeArray(subjects);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  const filteredRange = String(range || "2w").trim().toLowerCase();
  let startTs = todayTs;
  if (filteredRange === "max") {
    const minCreatedTs = safeSubjects
      .map((subject) => toDayStartTimestamp(subject?.created_at))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)[0];
    startTs = Number.isFinite(minCreatedTs) ? minCreatedTs : todayTs;
  } else {
    startTs = todayTs - ((getRangeDayCount(filteredRange) - 1) * 86400000);
  }

  const dayCount = Math.max(1, Math.floor((todayTs - startTs) / 86400000) + 1);
  const dayTimestamps = Array.from({ length: dayCount }, (_, index) => startTs + (index * 86400000));

  const openedSeries = [];
  const closedSeries = [];

  // NOTE: la précision historique dépend des colonnes disponibles (status/created_at/updated_at/closed_at) ;
  // sans journal d'événements complet, on ne peut pas reconstruire parfaitement les fermetures/réouvertures successives.
  dayTimestamps.forEach((dayTs, index) => {
    const dayEndTs = dayTs + 86399999;
    let openCount = 0;
    let closedCount = 0;

    safeSubjects.forEach((subject) => {
      const createdTs = Date.parse(subject?.created_at || "");
      if (!Number.isFinite(createdTs) || createdTs > dayEndTs) return;

      const closedAtTs = Date.parse(subject?.closed_at || "");
      const effectiveClosedTs = Number.isFinite(closedAtTs) ? closedAtTs : NaN;
      const effectiveStatus = String(subject?.status || "open").trim().toLowerCase() === "closed" ? "closed" : "open";

      if (Number.isFinite(effectiveClosedTs) && effectiveClosedTs <= dayEndTs) {
        closedCount += 1;
        return;
      }
      if (effectiveStatus === "closed" && !Number.isFinite(effectiveClosedTs)) {
        closedCount += 1;
        return;
      }
      openCount += 1;
    });

    openedSeries.push({ x: index, y: openCount });
    closedSeries.push({ x: index, y: closedCount });
  });

  const yMax = Math.max(
    1,
    ...openedSeries.map((point) => point.y),
    ...closedSeries.map((point) => point.y)
  );

  const xTicks = (() => {
    if (dayCount <= 7) return Array.from({ length: dayCount }, (_, index) => index);
    const step = Math.max(1, Math.floor(dayCount / 6));
    const ticks = [0];
    for (let tick = step; tick < dayCount - 1; tick += step) ticks.push(tick);
    if (ticks[ticks.length - 1] !== dayCount - 1) ticks.push(dayCount - 1);
    return [...new Set(ticks)];
  })();

  return {
    labels: dayTimestamps.map((dayTs) => new Date(dayTs).toISOString().slice(0, 10)),
    xTicks,
    yTicks: buildEvenTicks(yMax, 5),
    yMax,
    series: [
      {
        label: "Completed",
        points: closedSeries,
        fill: true,
        color: "#8957e5",
        areaColor: "#271052",
        areaOpacity: 0.5,
        lineDasharray: "6 2",
        lineWidth: 2,
        legendMarker: "circle",
        curve: "smooth"
      },
      {
        label: "Open",
        points: openedSeries,
        fill: true,
        color: "#238636",
        areaColor: "#04260f",
        areaOpacity: 0.5,
        areaBaselinePoints: closedSeries,
        lineDasharray: "none",
        lineWidth: 2,
        legendMarker: "circle",
        curve: "smooth"
      }
    ]
  };
}

function getRawSubjectsResult(projectSubjectsState = store.projectSubjectsView) {
  const raw = projectSubjectsState?.rawSubjectsResult;
  return raw && typeof raw === "object" ? raw : null;
}

function buildSituationLabelDistribution(subjects = [], projectSubjectsState = store.projectSubjectsView) {
  const raw = getRawSubjectsResult(projectSubjectsState);
  const labelsById = raw?.labelsById && typeof raw.labelsById === "object" ? raw.labelsById : {};
  const labelsByKey = raw?.labelsByKey && typeof raw.labelsByKey === "object" ? raw.labelsByKey : {};
  const labelIdsBySubjectId = raw?.labelIdsBySubjectId && typeof raw.labelIdsBySubjectId === "object" ? raw.labelIdsBySubjectId : {};
  const countsByLabel = new Map();

  safeArray(subjects).forEach((subject) => {
    const subjectId = normalizeUuid(subject?.id);
    if (!subjectId) return;

    const linkedLabelIds = normalizeArrayOfStrings(labelIdsBySubjectId[subjectId]);
    if (linkedLabelIds.length) {
      linkedLabelIds.forEach((labelId) => {
        const label = labelsById[labelId] || {};
        const labelName = firstNonEmpty(label?.name, label?.label_key, label?.id, labelId);
        if (!labelName) return;
        countsByLabel.set(labelName, (countsByLabel.get(labelName) || 0) + 1);
      });
      return;
    }

    // Fallback: si rawSubjectsResult n'expose pas encore labelIdsBySubjectId, on exploite la méta sujet déjà hydratée.
    const fallbackLabelKeys = getSubjectLabelKeys(subjectId, projectSubjectsState);
    fallbackLabelKeys.forEach((labelKey) => {
      const label = labelsByKey[String(labelKey || "").toLowerCase()] || {};
      const labelName = firstNonEmpty(label?.name, label?.label_key, label?.id, labelKey);
      if (!labelName) return;
      countsByLabel.set(labelName, (countsByLabel.get(labelName) || 0) + 1);
    });
  });

  const sorted = [...countsByLabel.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return String(left[0]).localeCompare(String(right[0]), "fr");
    });

  const labels = sorted.map(([name]) => name);
  const values = sorted.map(([, count]) => count);
  const yMax = Math.max(1, ...values, 0);

  return {
    labels,
    values,
    yTicks: buildEvenTicks(yMax, 5),
    yMax
  };
}

function buildSituationObjectiveDistribution(subjects = [], projectSubjectsState = store.projectSubjectsView) {
  const raw = getRawSubjectsResult(projectSubjectsState);
  const objectivesById = raw?.objectivesById && typeof raw.objectivesById === "object" ? raw.objectivesById : {};
  const objectiveIdsBySubjectId = raw?.objectiveIdsBySubjectId && typeof raw.objectiveIdsBySubjectId === "object" ? raw.objectiveIdsBySubjectId : {};
  const countsByObjective = new Map();
  const dueDateByObjective = new Map();

  safeArray(subjects).forEach((subject) => {
    const subjectId = normalizeUuid(subject?.id);
    if (!subjectId) return;

    const linkedObjectiveIds = normalizeArrayOfStrings(objectiveIdsBySubjectId[subjectId]);
    if (linkedObjectiveIds.length) {
      linkedObjectiveIds.forEach((objectiveId) => {
        const objective = objectivesById[objectiveId] || {};
        const objectiveTitle = firstNonEmpty(objective?.title, objective?.name, objective?.id, objectiveId);
        if (!objectiveTitle) return;
        countsByObjective.set(objectiveTitle, (countsByObjective.get(objectiveTitle) || 0) + 1);
        dueDateByObjective.set(objectiveTitle, firstNonEmpty(objective?.dueDate, objective?.due_date, ""));
      });
      return;
    }

    // Fallback: si objectiveIdsBySubjectId n'est pas disponible dans rawSubjectsResult, on lit les objectiveIds de la méta sujet.
    const fallbackObjectiveIds = getSubjectObjectiveIds(subjectId, projectSubjectsState);
    fallbackObjectiveIds.forEach((objectiveId) => {
      const objective = objectivesById[objectiveId] || {};
      const objectiveTitle = firstNonEmpty(objective?.title, objective?.name, objective?.id, objectiveId);
      if (!objectiveTitle) return;
      countsByObjective.set(objectiveTitle, (countsByObjective.get(objectiveTitle) || 0) + 1);
      dueDateByObjective.set(objectiveTitle, firstNonEmpty(objective?.dueDate, objective?.due_date, ""));
    });
  });

  const sorted = [...countsByObjective.entries()]
    .sort((left, right) => {
      const leftDueTs = Date.parse(dueDateByObjective.get(String(left[0])) || "");
      const rightDueTs = Date.parse(dueDateByObjective.get(String(right[0])) || "");
      const leftHasDue = Number.isFinite(leftDueTs);
      const rightHasDue = Number.isFinite(rightDueTs);
      if (leftHasDue && rightHasDue && leftDueTs !== rightDueTs) return leftDueTs - rightDueTs;
      if (leftHasDue !== rightHasDue) return leftHasDue ? -1 : 1;
      return String(left[0]).localeCompare(String(right[0]), "fr");
    });

  const labels = sorted.map(([name]) => name);
  const values = sorted.map(([, count]) => count);
  const yMax = Math.max(1, ...values, 0);

  return {
    labels,
    values,
    yTicks: buildEvenTicks(yMax, 5),
    yMax
  };
}

export async function loadSituationsForCurrentProject(projectId) {
  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!resolvedProjectId) throw new Error("projectId is required");
  if (!resolvedProjectId) {
    store.situationsView.data = [];
    store.situationsView.projectScopeId = String(store.currentProjectId || "").trim() || null;
    store.situationsView.selectedSituationId = null;
    return [];
  }

  const situations = await fetchSituationsByProject(resolvedProjectId);
  return syncSituationsStore(resolvedProjectId, situations);
}

export async function createSituation(projectId, payload = {}) {
  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!resolvedProjectId) throw new Error("projectId is required");

  const body = {
    project_id: resolvedProjectId,
    title: firstNonEmpty(payload.title, "Nouvelle situation"),
    description: firstNonEmpty(payload.description, "") || null,
    status: normalizeSituationStatus(payload.status),
    mode: normalizeSituationMode(payload.mode),
    filter_definition: normalizeSituationMode(payload.mode) === "automatic"
      ? normalizeFilterDefinition(payload.filter_definition) || {}
      : null,
    closed_at: normalizeSituationStatus(payload.status) === "closed" ? new Date().toISOString() : null
  };

  const requestUrl = `${SUPABASE_URL}/rest/v1/situations`;
  const headers = await getSupabaseAuthHeaders({
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: "return=representation"
  });

  const res = await fetch(requestUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const responseText = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`situation create failed (${res.status}): ${responseText}`);
  }

  let parsed = [];
  try {
    parsed = responseText ? JSON.parse(responseText) : [];
  } catch {
    parsed = [];
  }

  const created = normalizeSituationRow((safeArray(parsed)[0]) || {});
  await loadSituationsForCurrentProject(resolvedProjectId);
  return created;
}

export async function updateSituation(situationId, patch = {}) {
  const normalizedSituationId = normalizeUuid(situationId);
  if (!normalizedSituationId) throw new Error("situationId is required");

  const current = await fetchSituationById(normalizedSituationId);
  const nextStatus = Object.prototype.hasOwnProperty.call(patch, "status")
    ? normalizeSituationStatus(patch.status)
    : current.status;
  const nextMode = current.mode;

  const body = {};

  if (Object.prototype.hasOwnProperty.call(patch, "title")) {
    body.title = firstNonEmpty(patch.title, current.title, "Situation");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "description")) {
    body.description = firstNonEmpty(patch.description, "") || null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    body.status = nextStatus;
    body.closed_at = nextStatus === "closed" ? new Date().toISOString() : null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "filter_definition") && nextMode === "automatic") {
    body.filter_definition = normalizeFilterDefinition(patch.filter_definition) || {};
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/situations?id=eq.${normalizedSituationId}`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`situation update failed (${res.status}): ${text}`);
  }

  const updated = normalizeSituationRow((safeArray(await res.json())[0]) || {});
  await loadSituationsForCurrentProject(updated.project_id || current.project_id);
  return updated;
}

export async function closeSituation(situationId) {
  return updateSituation(situationId, { status: "closed" });
}

export async function reopenSituation(situationId) {
  return updateSituation(situationId, { status: "open" });
}

export async function loadManualSituationSubjectIds(situationId) {
  const normalizedSituationId = normalizeUuid(situationId);
  if (!normalizedSituationId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/situation_subjects`);
  url.searchParams.set("select", "subject_id,created_at,kanban_status,kanban_order");
  url.searchParams.set("situation_id", `eq.${normalizedSituationId}`);
  url.searchParams.set("order", "kanban_order.asc,created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`situation_subjects fetch failed (${res.status}): ${text}`);
  }

  const rows = safeArray(await res.json());
  const subjectIds = normalizeArrayOfStrings(rows.map((row) => row?.subject_id));
  logSituationKanbanOrder("load", {
    source: "loadManualSituationSubjectIds",
    situationId: normalizedSituationId,
    count: subjectIds.length
  });
  return subjectIds;
}

export async function loadSituationSubjectIdsMap(situationIds = []) {
  const normalizedIds = normalizeArrayOfStrings(situationIds).map(normalizeUuid).filter(Boolean);
  if (!normalizedIds.length) return {};

  const url = new URL(`${SUPABASE_URL}/rest/v1/situation_subjects`);
  url.searchParams.set("select", "situation_id,subject_id,created_at,kanban_status,kanban_order");
  url.searchParams.set("situation_id", `in.(${normalizedIds.join(",")})`);
  url.searchParams.set("order", "situation_id.asc,kanban_order.asc,created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`situation_subjects fetch failed (${res.status}): ${text}`);
  }

  const rows = safeArray(await res.json());
  const map = Object.fromEntries(normalizedIds.map((id) => [id, []]));
  rows.forEach((row) => {
    const situationId = normalizeUuid(row?.situation_id);
    const subjectId = normalizeUuid(row?.subject_id);
    if (!situationId || !subjectId) return;
    if (!Array.isArray(map[situationId])) map[situationId] = [];
    if (!map[situationId].includes(subjectId)) map[situationId].push(subjectId);
  });
  logSituationKanbanOrder("load", {
    source: "loadSituationSubjectIdsMap",
    situations: normalizedIds.length,
    rows: rows.length
  });
  return map;
}


export async function loadSituationKanbanStatusMap(situationIds = []) {
  const normalizedIds = normalizeArrayOfStrings(situationIds).map(normalizeUuid).filter(Boolean);
  if (!normalizedIds.length) return {};

  const url = new URL(`${SUPABASE_URL}/rest/v1/situation_subjects`);
  url.searchParams.set("select", "situation_id,subject_id,kanban_status,created_at,kanban_order");
  url.searchParams.set("situation_id", `in.(${normalizedIds.join(",")})`);
  url.searchParams.set("order", "situation_id.asc,kanban_order.asc,created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`situation_subjects kanban fetch failed (${res.status}): ${text}`);
  }

  const rows = safeArray(await res.json());
  const map = Object.fromEntries(normalizedIds.map((id) => [id, {}]));
  rows.forEach((row) => {
    const situationId = normalizeUuid(row?.situation_id);
    const subjectId = normalizeUuid(row?.subject_id);
    const kanbanStatus = normalizeSituationKanbanStatus(row?.kanban_status);
    if (!situationId || !subjectId || !kanbanStatus) return;
    if (!map[situationId] || typeof map[situationId] !== "object" || Array.isArray(map[situationId])) map[situationId] = {};
    map[situationId][subjectId] = kanbanStatus;
  });
  logSituationKanbanOrder("load", {
    source: "loadSituationKanbanStatusMap",
    situations: normalizedIds.length,
    rows: rows.length
  });
  return map;
}

export async function reorderSituationKanbanSubjects(situationId, kanbanStatus, orderedSubjectIds = []) {
  const normalizedSituationId = normalizeUuid(situationId);
  const normalizedStatus = normalizeSituationKanbanStatus(kanbanStatus);
  const normalizedSubjectIds = normalizeArrayOfStrings(orderedSubjectIds).map(normalizeUuid).filter(Boolean);
  if (!normalizedSituationId) throw new Error("situationId is required");
  if (!normalizedStatus) throw new Error("kanbanStatus is required");
  if (!normalizedSubjectIds.length) throw new Error("orderedSubjectIds is required");

  const payload = {
    p_situation_id: normalizedSituationId,
    p_kanban_status: normalizedStatus,
    p_subject_ids: normalizedSubjectIds
  };

  logSituationKanbanOrder("reorder:start", {
    situationId: normalizedSituationId,
    kanbanStatus: normalizedStatus,
    count: normalizedSubjectIds.length
  });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reorder_situation_kanban_subjects`, {
      method: "POST",
      headers: await getSupabaseAuthHeaders({
        Accept: "application/json",
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`reorder_situation_kanban_subjects failed (${res.status}): ${text}`);
    }

    const rows = safeArray(await res.json());
    logSituationKanbanOrder("reorder:success", {
      situationId: normalizedSituationId,
      kanbanStatus: normalizedStatus,
      updated: rows.length
    });
    return rows;
  } catch (error) {
    logSituationKanbanOrder("reorder:error", {
      situationId: normalizedSituationId,
      kanbanStatus: normalizedStatus,
      message: error instanceof Error ? error.message : String(error || "unknown")
    });
    throw error;
  }
}

export async function setSituationSubjectKanbanStatus(situationId, subjectId, kanbanStatus) {
  const normalizedSituationId = normalizeUuid(situationId);
  const normalizedSubjectId = normalizeUuid(subjectId);
  const normalizedStatus = normalizeSituationKanbanStatus(kanbanStatus);
  if (!normalizedSituationId) throw new Error("situationId is required");
  if (!normalizedSubjectId) throw new Error("subjectId is required");
  if (!normalizedStatus) throw new Error("kanbanStatus is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/situation_subjects`);
  url.searchParams.set("situation_id", `eq.${normalizedSituationId}`);
  url.searchParams.set("subject_id", `eq.${normalizedSubjectId}`);

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify({
      kanban_status: normalizedStatus
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`situation_subjects kanban update failed (${res.status}): ${text}`);
  }

  return (safeArray(await res.json())[0]) || null;
}

export async function addSubjectToSituation(situationId, subjectId, options = {}) {
  const normalizedSituationId = normalizeUuid(situationId);
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedSituationId) throw new Error("situationId is required");
  if (!normalizedSubjectId) throw new Error("subjectId is required");

  const explicitStatus = normalizeSituationKanbanStatus(options.kanbanStatus);
  const targetStatus = explicitStatus || "non_active";

  const existingUrl = new URL(`${SUPABASE_URL}/rest/v1/situation_subjects`);
  existingUrl.searchParams.set("select", "situation_id,subject_id,kanban_status,kanban_order");
  existingUrl.searchParams.set("situation_id", `eq.${normalizedSituationId}`);
  existingUrl.searchParams.set("subject_id", `eq.${normalizedSubjectId}`);
  existingUrl.searchParams.set("limit", "1");

  const existingRes = await fetch(existingUrl.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!existingRes.ok) {
    const text = await existingRes.text().catch(() => "");
    throw new Error(`situation_subjects existing fetch failed (${existingRes.status}): ${text}`);
  }

  const existingRow = (safeArray(await existingRes.json())[0]) || null;
  if (existingRow) {
    return existingRow;
  }

  const orderUrl = new URL(`${SUPABASE_URL}/rest/v1/situation_subjects`);
  orderUrl.searchParams.set("select", "kanban_order");
  orderUrl.searchParams.set("situation_id", `eq.${normalizedSituationId}`);
  orderUrl.searchParams.set("kanban_status", `eq.${targetStatus}`);
  orderUrl.searchParams.set("order", "kanban_order.desc");
  orderUrl.searchParams.set("limit", "1");

  const orderRes = await fetch(orderUrl.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!orderRes.ok) {
    const text = await orderRes.text().catch(() => "");
    throw new Error(`situation_subjects order fetch failed (${orderRes.status}): ${text}`);
  }

  const highestOrderRow = (safeArray(await orderRes.json())[0]) || null;
  const nextOrder = Number.isFinite(Number(highestOrderRow?.kanban_order))
    ? (Number(highestOrderRow.kanban_order) + 1)
    : 0;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/situation_subjects`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify({
      situation_id: normalizedSituationId,
      subject_id: normalizedSubjectId,
      kanban_status: targetStatus,
      kanban_order: nextOrder
    })
  });

  if (!res.ok) {
    if (res.status === 409) {
      const conflictRes = await fetch(existingUrl.toString(), {
        method: "GET",
        headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
        cache: "no-store"
      });
      if (conflictRes.ok) {
        return (safeArray(await conflictRes.json())[0]) || null;
      }
    }
    const text = await res.text().catch(() => "");
    throw new Error(`situation_subjects insert failed (${res.status}): ${text}`);
  }

  return (safeArray(await res.json())[0]) || null;
}

export async function removeSubjectFromSituation(situationId, subjectId) {
  const normalizedSituationId = normalizeUuid(situationId);
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedSituationId) throw new Error("situationId is required");
  if (!normalizedSubjectId) throw new Error("subjectId is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/situation_subjects`);
  url.searchParams.set("situation_id", `eq.${normalizedSituationId}`);
  url.searchParams.set("subject_id", `eq.${normalizedSubjectId}`);

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: await getSupabaseAuthHeaders({ Prefer: "return=representation" })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`situation_subjects delete failed (${res.status}): ${text}`);
  }

  return true;
}

export async function loadSubjectsForSituation(situation, projectSubjectsState = store.projectSubjectsView) {
  const normalizedSituation = normalizeSituationRow(situation || {});
  if (!normalizedSituation.id) return [];

  const subjectsById = getSubjectsByIdMap(projectSubjectsState);

  if (normalizedSituation.mode === "manual") {
    const subjectIds = await loadManualSituationSubjectIds(normalizedSituation.id);
    return subjectIds.map((subjectId) => subjectsById[subjectId]).filter(Boolean);
  }

  const flatSubjects = Object.values(subjectsById);
  return sortSubjects(flatSubjects.filter((subject) => subjectMatchesAutomaticFilter(subject, normalizedSituation.filter_definition, projectSubjectsState)));
}

export async function loadSituationInsightsData(situation, options = {}) {
  const range = String(options?.range || "2w").trim().toLowerCase();
  const normalizedRange = ["2w", "1m", "3m", "max"].includes(range) ? range : "2w";
  const subjects = await loadSubjectsForSituation(situation, store.projectSubjectsView);
  const labelDistribution = buildSituationLabelDistribution(subjects, store.projectSubjectsView);
  const objectiveDistribution = buildSituationObjectiveDistribution(subjects, store.projectSubjectsView);
  return {
    burnup: buildSituationBurnupChartData(subjects, normalizedRange),
    labels: labelDistribution,
    objectives: objectiveDistribution
  };
}

export function resetSituationsForCurrentProject() {
  store.situationsView.data = [];
  store.situationsView.projectScopeId = String(store.currentProjectId || "").trim() || null;
  store.situationsView.expandedSituations = new Set();
  store.situationsView.expandedSujets = new Set();
  store.situationsView.selectedSituationId = null;
  store.situationsView.selectedSujetId = null;
  store.situationsView.selectedSubjectId = null;
  store.situationsView.subjectsSelectedNodeId = "";
  store.situationsView.search = "";
  store.situationsView.page = 1;
}

export function situationMatchesAutomaticFilter(subject, filterDefinition, projectSubjectsState = store.projectSubjectsView) {
  return subjectMatchesAutomaticFilter(subject, filterDefinition, projectSubjectsState);
}
