import { store } from "../store.js";
import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { resolveCurrentBackendProjectId } from "./project-supabase-sync.js";

const SUPABASE_URL = getSupabaseUrl();
const FRONT_PROJECT_MAP_STORAGE_KEY = "mdall.supabaseProjectMap.v1";

function logSituationCreate(step, payload = undefined) {
  if (payload === undefined) {
    console.log(`[situations:create] ${step}`);
    return;
  }
  console.log(`[situations:create] ${step}`, payload);
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
    logSituationCreate("resolved project id from explicit input", { projectId: explicitProjectId });
    return explicitProjectId;
  }

  const mappedProjectId = getMappedBackendProjectId();
  if (mappedProjectId) {
    logSituationCreate("resolved project id from frontend map", {
      frontendProjectKey: getFrontendProjectKey(),
      projectId: mappedProjectId
    });
    return mappedProjectId;
  }

  const resolvedProjectId = normalizeUuid(await resolveCurrentBackendProjectId().catch((error) => {
    logSituationCreate("resolveCurrentBackendProjectId failed", {
      message: error instanceof Error ? error.message : String(error || "")
    });
    return "";
  }));
  logSituationCreate("resolved project id from backend resolver", { projectId: resolvedProjectId || null });
  return resolvedProjectId;
}

function getSituationsSelectClause() {
  return "id,project_id,title,description,objective_text,progress_percent,status,mode,filter_definition,created_at,updated_at,closed_at";
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
  store.situationsView.rawResult = {
    situations: normalizedSituations,
    situationsById: Object.fromEntries(normalizedSituations.map((situation) => [situation.id, situation]))
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

export async function loadSituationsForCurrentProject(projectId) {
  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!resolvedProjectId) {
    store.situationsView.data = [];
    store.situationsView.rawResult = { situations: [], situationsById: {} };
    store.situationsView.projectScopeId = String(store.currentProjectId || "").trim() || null;
    store.situationsView.selectedSituationId = null;
    return [];
  }

  const situations = await fetchSituationsByProject(resolvedProjectId);
  return syncSituationsStore(resolvedProjectId, situations);
}

export async function createSituation(projectId, payload = {}) {
  logSituationCreate("createSituation called", {
    projectIdInput: normalizeUuid(projectId) || String(projectId || "") || null,
    payload
  });

  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!resolvedProjectId) {
    logSituationCreate("createSituation aborted: missing project id", {
      currentProjectId: String(store.currentProjectId || "") || null,
      currentProject: store.currentProject || null
    });
    throw new Error("projectId is required");
  }

  const body = {
    project_id: resolvedProjectId,
    title: firstNonEmpty(payload.title, "Nouvelle situation"),
    description: firstNonEmpty(payload.description, "") || null,
    objective_text: payload.objective_text ?? (firstNonEmpty(payload.description, "") || null),
    progress_percent: Number.isFinite(payload.progress_percent) ? payload.progress_percent : 0,
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

  logSituationCreate("sending POST /situations", {
    url: requestUrl,
    body,
    hasAuthorization: Boolean(headers?.Authorization || headers?.authorization),
    hasApiKey: Boolean(headers?.apikey || headers?.Apikey)
  });

  const res = await fetch(requestUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const responseText = await res.text().catch(() => "");
  logSituationCreate("received POST /situations response", {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    body: responseText
  });

  if (!res.ok) {
    throw new Error(`situation create failed (${res.status}): ${responseText}`);
  }

  let parsed = [];
  try {
    parsed = responseText ? JSON.parse(responseText) : [];
  } catch (error) {
    logSituationCreate("failed to parse create response as JSON", {
      message: error instanceof Error ? error.message : String(error || ""),
      responseText
    });
  }

  const created = normalizeSituationRow((safeArray(parsed)[0]) || {});
  logSituationCreate("normalized created situation", created);
  await loadSituationsForCurrentProject(resolvedProjectId);
  logSituationCreate("reloaded situations after create", {
    projectId: resolvedProjectId,
    situationsCount: safeArray(store.situationsView?.data).length
  });
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
  if (Object.prototype.hasOwnProperty.call(patch, "objective_text")) {
    body.objective_text = firstNonEmpty(patch.objective_text, "") || null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "progress_percent")) {
    body.progress_percent = Number.isFinite(patch.progress_percent) ? patch.progress_percent : current.progress_percent;
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
  url.searchParams.set("select", "subject_id,created_at");
  url.searchParams.set("situation_id", `eq.${normalizedSituationId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`situation_subjects fetch failed (${res.status}): ${text}`);
  }

  return normalizeArrayOfStrings(safeArray(await res.json()).map((row) => row?.subject_id));
}

export async function addSubjectToSituation(situationId, subjectId) {
  const normalizedSituationId = normalizeUuid(situationId);
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedSituationId) throw new Error("situationId is required");
  if (!normalizedSubjectId) throw new Error("subjectId is required");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/situation_subjects`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify({
      situation_id: normalizedSituationId,
      subject_id: normalizedSubjectId
    })
  });

  if (!res.ok) {
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
    return sortSubjects(subjectIds.map((subjectId) => subjectsById[subjectId]).filter(Boolean));
  }

  const flatSubjects = Object.values(subjectsById);
  return sortSubjects(flatSubjects.filter((subject) => subjectMatchesAutomaticFilter(subject, normalizedSituation.filter_definition, projectSubjectsState)));
}

export function resetSituationsForCurrentProject() {
  store.situationsView.data = [];
  store.situationsView.rawResult = null;
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
