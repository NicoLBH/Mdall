import { store } from "../store.js";
import { buildSubjectHierarchyIndexes } from "./subject-hierarchy.js";
import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { loadSituationsForCurrentProject, loadSituationSubjectIdsMap } from "./project-situations-supabase.js";
import { resolveCurrentBackendProjectId, resolveCurrentUserDirectoryPersonId } from "./project-supabase-sync.js";
import { invalidateSubjectRefIndex } from "../utils/subject-ref-index.js";
import { normalizeAssigneeIds } from "./subject-assignees-service.js";

const SUPABASE_URL = getSupabaseUrl();
const FRONT_PROJECT_MAP_STORAGE_KEY = "mdall.supabaseProjectMap.v1";
const SUBJECT_DESCRIPTION_DEBUG_FLAG = "__MDALL_DEBUG_SUBJECT_DESCRIPTION__";



function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
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
  return map[frontendProjectKey] || "";
}


async function getSupabaseAuthHeaders(extra = {}) {
  return buildSupabaseAuthHeaders(extra);
}

function isSubjectDescriptionDebugEnabled() {
  return typeof window !== "undefined" && window?.[SUBJECT_DESCRIPTION_DEBUG_FLAG] === true;
}

function truncateDescriptionPreview(value = "", maxLength = 160) {
  const raw = String(value || "");
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength)}…`;
}

function safeJsonParse(text = "") {
  const raw = String(text || "");
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildSubjectDescriptionDebugRequestId() {
  return `subject-description-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function rpcCall(functionName, payload = {}) {
  const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload || {})
  });

  if (!response.ok) {
    const rawBody = await response.text().catch(() => "");
    const parsedBody = safeJsonParse(rawBody);
    const error = new Error(`${functionName} failed (${response.status}): ${rawBody || response.statusText || "Unknown error"}`);
    error.status = response.status;
    error.rawBody = rawBody;
    error.parsedBody = parsedBody;
    error.rpcUrl = rpcUrl;
    error.payload = payload;
    throw error;
  }

  const payloadText = await response.text().catch(() => "");
  if (!payloadText) return null;
  try {
    return JSON.parse(payloadText);
  } catch {
    return null;
  }
}

async function gatherSubjectDescriptionFailureDiagnostics({
  subjectId = "",
  uploadSessionId = "",
  actorPersonId = "",
  description = ""
} = {}) {
  const payload = {
    p_subject_id: normalizeUuid(subjectId) || null,
    p_upload_session_id: normalizeUuid(uploadSessionId) || null,
    p_actor_person_id: normalizeUuid(actorPersonId) || null,
    p_description: String(description || "")
  };

  try {
    const response = await rpcCall("debug_update_subject_description_context", payload);
    return {
      ok: true,
      payload,
      data: Array.isArray(response) ? (response[0] || null) : response
    };
  } catch (error) {
    return {
      ok: false,
      payload,
      error: {
        message: String(error?.message || error || ""),
        status: Number(error?.status || 0) || null,
        rawBody: String(error?.rawBody || ""),
        parsedBody: error?.parsedBody ?? null
      }
    };
  }
}

async function fetchProjectFlatSubjects(projectId) {
  if (!projectId) {
    return [];
  }

  const selectWithRefs = "id,subject_number,project_id,document_id,document_ref_ids,analysis_run_id,situation_id,parent_subject_id,parent_linked_at,parent_child_order,assignee_person_id,title,description,priority,status,closure_reason,subject_type,created_at,updated_at,closed_at";
  const selectWithoutRefs = "id,subject_number,project_id,document_id,analysis_run_id,situation_id,parent_subject_id,parent_linked_at,parent_child_order,assignee_person_id,title,description,priority,status,closure_reason,subject_type,created_at,updated_at,closed_at";
  const headers = await getSupabaseAuthHeaders({ Accept: "application/json" });

  const fetchSubjects = async (selectQuery) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/subjects`);
    url.searchParams.set("select", selectQuery);
    url.searchParams.set("project_id", `eq.${projectId}`);
    url.searchParams.set("order", "created_at.asc");
    return fetch(url.toString(), {
      method: "GET",
      headers,
      cache: "no-store"
    });
  };

  let res = await fetchSubjects(selectWithRefs);
  if (!res.ok && Number(res.status || 0) === 400) {
    const rawBody = await res.text().catch(() => "");
    const parsedBody = safeJsonParse(rawBody);
    const details = String(
      parsedBody?.message
      || parsedBody?.details
      || parsedBody?.hint
      || rawBody
      || ""
    ).toLowerCase();
    const missingDocumentRefsColumn = details.includes("document_ref_ids");
    if (missingDocumentRefsColumn) {
      console.warn("[project-subjects] subjects table has no document_ref_ids column; falling back to legacy select", {
        projectId: String(projectId || ""),
        status: Number(res.status || 0),
        details: String(parsedBody?.message || parsedBody?.details || rawBody || "")
      });
      res = await fetchSubjects(selectWithoutRefs);
    } else {
      throw new Error(`subjects fetch failed (${res.status}): ${rawBody}`);
    }
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subjects fetch failed (${res.status}): ${txt}`);
  }

  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : [];
}


async function fetchProjectSubjectMessageCounts(projectId) {
  if (!projectId) {
    return {};
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_messages`);
  url.searchParams.set("select", "subject_id");
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("deleted_at", "is.null");

  const headers = await getSupabaseAuthHeaders({ Accept: "application/json" });

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_messages fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  const countsBySubjectId = {};
  for (const row of (Array.isArray(rows) ? rows : [])) {
    const subjectId = String(row?.subject_id || "").trim();
    if (!subjectId) continue;
    countsBySubjectId[subjectId] = Number(countsBySubjectId[subjectId] || 0) + 1;
  }
  return countsBySubjectId;
}
async function fetchProjectSubjectLinks(projectId) {
  if (!projectId) {
    return [];
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_links`);
  url.searchParams.set(
    "select",
    "id,project_id,source_subject_id,target_subject_id,link_type,score,explanation,created_at"
  );
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const headers = await getSupabaseAuthHeaders({ Accept: "application/json" });

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_links fetch failed (${res.status}): ${txt}`);
  }

  const json = await res.json();
  return json;
}

function normalizeUuid(value) {
  const normalized = String(value || "").trim();
  return normalized || "";
}

function normalizeObjectiveStatus(value) {
  return String(value || "open").trim().toLowerCase() === "closed" ? "closed" : "open";
}

function normalizeSubjectLabelKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeProjectLabelRow(row = {}) {
  const id = normalizeUuid(row.id);
  const projectId = normalizeUuid(row.project_id);
  const labelKey = firstNonEmpty(row.label_key, row.name, id);
  const name = firstNonEmpty(row.name, row.label_key, "Label");
  const description = firstNonEmpty(row.description, "");
  const textColor = firstNonEmpty(row.text_color, "rgb(208, 215, 222)");
  const backgroundColor = firstNonEmpty(row.background_color, "rgba(110, 118, 129, 0.18)");
  const borderColor = firstNonEmpty(row.border_color, textColor);
  const hexColor = firstNonEmpty(row.hex_color, "");
  const sortOrder = Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0;
  return {
    ...row,
    id,
    project_id: projectId,
    label_key: labelKey,
    labelKey,
    key: labelKey,
    name,
    label: name,
    description,
    text_color: textColor,
    textColor,
    background_color: backgroundColor,
    backgroundColor,
    color: backgroundColor,
    border_color: borderColor,
    borderColor,
    hex_color: hexColor,
    hexColor,
    sort_order: sortOrder,
    sortOrder,
    created_at: row.created_at || "",
    updated_at: row.updated_at || ""
  };
}


async function getResolvedProjectId(projectId) {
  const explicitProjectId = normalizeUuid(projectId);
  if (explicitProjectId) return explicitProjectId;

  const mappedProjectId = getMappedBackendProjectId();
  if (mappedProjectId) return mappedProjectId;

  return normalizeUuid(await resolveCurrentBackendProjectId().catch(() => ""));
}

function getMilestonesSelectClause() {
  return "id,project_id,title,description,due_date,status,created_at,updated_at,closed_at";
}

async function fetchProjectMilestoneById(objectiveId) {
  const normalizedObjectiveId = normalizeUuid(objectiveId);
  if (!normalizedObjectiveId) throw new Error("objectiveId is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/milestones`);
  url.searchParams.set("select", getMilestonesSelectClause());
  url.searchParams.set("id", `eq.${normalizedObjectiveId}`);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return (Array.isArray(rows) ? rows[0] : rows) || null;
}

export async function createObjective(projectId, payload = {}) {
  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!resolvedProjectId) throw new Error("projectId is required");

  const body = {
    project_id: resolvedProjectId,
    title: firstNonEmpty(payload.title, "Nouvel objectif"),
    description: firstNonEmpty(payload.description, "") || null,
    due_date: firstNonEmpty(payload.dueDate, "") || null,
    status: normalizeObjectiveStatus(payload.status),
    closed_at: normalizeObjectiveStatus(payload.status) === "closed" ? new Date().toISOString() : null
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/milestones`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone create failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  const created = normalizeObjectiveRow((Array.isArray(rows) ? rows[0] : rows) || {});
  await loadObjectivesForProject(resolvedProjectId);
  return created;
}

export async function updateObjective(objectiveId, patch = {}) {
  const normalizedObjectiveId = normalizeUuid(objectiveId);
  if (!normalizedObjectiveId) throw new Error("objectiveId is required");

  const current = await fetchProjectMilestoneById(normalizedObjectiveId);
  if (!current?.id) throw new Error("objective not found");

  const nextStatus = Object.prototype.hasOwnProperty.call(patch, "status")
    ? normalizeObjectiveStatus(patch.status)
    : normalizeObjectiveStatus(current.status);

  const body = {};
  if (Object.prototype.hasOwnProperty.call(patch, "title")) body.title = firstNonEmpty(patch.title, current.title, "Objectif");
  if (Object.prototype.hasOwnProperty.call(patch, "description")) body.description = firstNonEmpty(patch.description, "") || null;
  if (Object.prototype.hasOwnProperty.call(patch, "dueDate")) body.due_date = firstNonEmpty(patch.dueDate, "") || null;
  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    body.status = nextStatus;
    body.closed_at = nextStatus === "closed" ? new Date().toISOString() : null;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/milestones?id=eq.${normalizedObjectiveId}`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone update failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  const updated = normalizeObjectiveRow((Array.isArray(rows) ? rows[0] : rows) || {});
  await loadObjectivesForProject(updated.project_id || normalizeUuid(current.project_id));
  return updated;
}

export async function closeObjective(objectiveId) {
  return updateObjective(objectiveId, { status: "closed" });
}

export async function reopenObjective(objectiveId) {
  return updateObjective(objectiveId, { status: "open" });
}

export async function addSubjectToObjective(objectiveId, subjectId) {
  const normalizedObjectiveId = normalizeUuid(objectiveId);
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedObjectiveId) throw new Error("objectiveId is required");
  if (!normalizedSubjectId) throw new Error("subjectId is required");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/milestone_subjects`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify({
      milestone_id: normalizedObjectiveId,
      subject_id: normalizedSubjectId
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone_subject create failed (${res.status}): ${txt}`);
  }

  return true;
}

export async function removeSubjectFromObjective(objectiveId, subjectId) {
  const normalizedObjectiveId = normalizeUuid(objectiveId);
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedObjectiveId) throw new Error("objectiveId is required");
  if (!normalizedSubjectId) throw new Error("subjectId is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/milestone_subjects`);
  url.searchParams.set("milestone_id", `eq.${normalizedObjectiveId}`);
  url.searchParams.set("subject_id", `eq.${normalizedSubjectId}`);

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone_subject delete failed (${res.status}): ${txt}`);
  }

  return true;
}

function normalizeObjectiveRow(row = {}, subjectIds = []) {
  const normalizedSubjectIds = [...new Set((Array.isArray(subjectIds) ? subjectIds : []).map((value) => String(value || "").trim()).filter(Boolean))];
  const status = normalizeObjectiveStatus(row.status);
  return {
    ...row,
    id: normalizeUuid(row.id),
    project_id: normalizeUuid(row.project_id),
    title: firstNonEmpty(row.title, "Objectif"),
    description: firstNonEmpty(row.description, ""),
    dueDate: row.due_date || "",
    status,
    closed: status === "closed",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
    closed_at: row.closed_at || null,
    subjectIds: normalizedSubjectIds
  };
}

async function fetchProjectMilestones(projectId) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/milestones`);
  url.searchParams.set(
    "select",
    "id,project_id,title,description,due_date,status,created_at,updated_at,closed_at"
  );
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestones fetch failed (${res.status}): ${txt}`);
  }

  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : [];
}

async function fetchProjectMilestoneSubjects(projectId, milestoneIds = []) {
  const normalizedMilestoneIds = [...new Set((Array.isArray(milestoneIds) ? milestoneIds : []).map((value) => normalizeUuid(value)).filter(Boolean))];
  if (!normalizedMilestoneIds.length) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/milestone_subjects`);
  url.searchParams.set("select", "id,milestone_id,subject_id,created_at");
  url.searchParams.set("milestone_id", `in.(${normalizedMilestoneIds.join(',')})`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`milestone_subjects fetch failed (${res.status}): ${txt}`);
  }

  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : [];
}

async function loadObjectivesForProject(projectId) {
  const milestoneRows = await fetchProjectMilestones(projectId);
  const milestoneIds = milestoneRows.map((row) => normalizeUuid(row?.id)).filter(Boolean);
  const milestoneSubjectRows = await fetchProjectMilestoneSubjects(projectId, milestoneIds);
  return buildObjectivesResult(milestoneRows, milestoneSubjectRows);
}

function buildObjectivesResult(milestoneRows = [], milestoneSubjectRows = []) {
  const orderedMilestoneIds = (milestoneRows || []).map((row) => normalizeUuid(row?.id)).filter(Boolean);
  const orderedMilestoneIdSet = new Set(orderedMilestoneIds);
  const subjectIdsByMilestoneId = {};
  const objectiveIdsBySubjectId = {};

  for (const link of milestoneSubjectRows || []) {
    const milestoneId = normalizeUuid(link?.milestone_id);
    const subjectId = normalizeUuid(link?.subject_id);
    if (!milestoneId || !subjectId || !orderedMilestoneIdSet.has(milestoneId)) continue;

    if (!Array.isArray(subjectIdsByMilestoneId[milestoneId])) subjectIdsByMilestoneId[milestoneId] = [];
    if (!subjectIdsByMilestoneId[milestoneId].includes(subjectId)) {
      subjectIdsByMilestoneId[milestoneId].push(subjectId);
    }

    if (!Array.isArray(objectiveIdsBySubjectId[subjectId])) objectiveIdsBySubjectId[subjectId] = [];
    if (!objectiveIdsBySubjectId[subjectId].includes(milestoneId)) {
      objectiveIdsBySubjectId[subjectId].push(milestoneId);
    }
  }

  const objectives = (milestoneRows || []).map((row) => normalizeObjectiveRow(row, subjectIdsByMilestoneId[normalizeUuid(row?.id)] || []));
  const objectivesById = Object.fromEntries(objectives.map((objective) => [String(objective.id || ""), objective]).filter(([id]) => !!id));

  return {
    objectives,
    objectivesById,
    objectiveIdsBySubjectId
  };
}


async function fetchProjectLabels(projectId) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/project_labels`);
  url.searchParams.set(
    "select",
    "id,project_id,label_key,name,description,text_color,background_color,border_color,hex_color,sort_order,created_at,updated_at"
  );
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "sort_order.asc,name.asc,created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_labels fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows.map((row) => normalizeProjectLabelRow(row)) : [];
}

async function fetchProjectSubjectLabels(projectId) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_labels`);
  url.searchParams.set("select", "id,project_id,subject_id,label_id,created_at");
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_labels fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

async function fetchProjectSubjectAssignees(projectId) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_assignees`);
  url.searchParams.set("select", "id,project_id,subject_id,person_id,created_at");
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("order", "created_at.asc");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_assignees fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}


async function fetchSubjectProjectId(subjectId) {
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");

  const cachedProjectId = normalizeUuid(
    store.projectSubjectsView?.rawSubjectsResult?.subjectsById?.[normalizedSubjectId]?.project_id
  );
  if (cachedProjectId) return cachedProjectId;

  const url = new URL(`${SUPABASE_URL}/rest/v1/subjects`);
  url.searchParams.set("select", "id,project_id");
  url.searchParams.set("id", `eq.${normalizedSubjectId}`);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  const row = (Array.isArray(rows) ? rows[0] : rows) || {};
  const projectId = normalizeUuid(row.project_id);
  if (!projectId) throw new Error("subject project_id not found");
  return projectId;
}

async function fetchLabelProjectId(labelId) {
  const normalizedLabelId = normalizeUuid(labelId);
  if (!normalizedLabelId) throw new Error("labelId is required");

  const cachedProjectId = normalizeUuid(
    store.projectSubjectsView?.rawSubjectsResult?.labelsById?.[normalizedLabelId]?.project_id
  );
  if (cachedProjectId) return cachedProjectId;

  const url = new URL(`${SUPABASE_URL}/rest/v1/project_labels`);
  url.searchParams.set("select", "id,project_id");
  url.searchParams.set("id", `eq.${normalizedLabelId}`);
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_label fetch failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  const row = (Array.isArray(rows) ? rows[0] : rows) || {};
  const projectId = normalizeUuid(row.project_id);
  if (!projectId) throw new Error("label project_id not found");
  return projectId;
}

async function resolveSubjectLabelProjectId(subjectId, labelId) {
  const [subjectProjectId, labelProjectId] = await Promise.all([
    fetchSubjectProjectId(subjectId),
    fetchLabelProjectId(labelId)
  ]);

  if (!subjectProjectId || !labelProjectId || subjectProjectId !== labelProjectId) {
    throw new Error("subject and label must belong to the same project");
  }

  return subjectProjectId;
}


function normalizeLabelHexColor(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^#([0-9a-fA-F]{6})$/);
  return match ? `#${String(match[1] || "").toLowerCase()}` : "#8b949e";
}

function buildProjectLabelWritePayload(projectId, payload = {}, current = null) {
  const name = firstNonEmpty(payload.name, current?.name, "").trim();
  if (!name) throw new Error("Le nom du label est requis.");

  const hexColor = normalizeLabelHexColor(firstNonEmpty(payload.hexColor, payload.color, current?.hex_color, current?.hexColor, "#8b949e"));
  const description = Object.prototype.hasOwnProperty.call(payload, "description")
    ? firstNonEmpty(payload.description, "")
    : firstNonEmpty(current?.description, "");

  return {
    project_id: normalizeUuid(firstNonEmpty(projectId, current?.project_id, current?.projectId, "")),
    label_key: normalizeSubjectLabelKey(firstNonEmpty(payload.labelKey, payload.label_key, current?.label_key, current?.labelKey, name)),
    name,
    description: description || null,
    text_color: hexColor,
    background_color: `${hexColor}22`,
    border_color: `${hexColor}66`,
    hex_color: hexColor
  };
}

function buildLabelsResult(labelRows = [], subjectLabelRows = []) {
  const labels = (Array.isArray(labelRows) ? labelRows : []).map((row) => normalizeProjectLabelRow(row));
  const labelsById = {};
  const labelsByKey = {};
  const labelIdsBySubjectId = {};
  const subjectIdsByLabelId = {};

  for (const label of labels) {
    const labelId = normalizeUuid(label?.id);
    if (!labelId) continue;
    labelsById[labelId] = label;
    const normalizedKey = normalizeSubjectLabelKey(label?.label_key || label?.labelKey || label?.key || label?.name || labelId);
    if (normalizedKey && !labelsByKey[normalizedKey]) {
      labelsByKey[normalizedKey] = label;
    }
    subjectIdsByLabelId[labelId] = [];
  }

  for (const row of Array.isArray(subjectLabelRows) ? subjectLabelRows : []) {
    const subjectId = normalizeUuid(row?.subject_id);
    const labelId = normalizeUuid(row?.label_id);
    if (!subjectId || !labelId || !labelsById[labelId]) continue;

    if (!Array.isArray(labelIdsBySubjectId[subjectId])) labelIdsBySubjectId[subjectId] = [];
    if (!labelIdsBySubjectId[subjectId].includes(labelId)) labelIdsBySubjectId[subjectId].push(labelId);

    if (!Array.isArray(subjectIdsByLabelId[labelId])) subjectIdsByLabelId[labelId] = [];
    if (!subjectIdsByLabelId[labelId].includes(subjectId)) subjectIdsByLabelId[labelId].push(subjectId);
  }

  return {
    labels,
    labelsById,
    labelsByKey,
    labelIdsBySubjectId,
    subjectIdsByLabelId
  };
}



export async function createLabel(projectId, payload = {}) {
  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!resolvedProjectId) throw new Error("projectId is required");

  const body = buildProjectLabelWritePayload(resolvedProjectId, payload);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_labels`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_label create failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return normalizeProjectLabelRow((Array.isArray(rows) ? rows[0] : rows) || {});
}

export async function updateLabel(labelId, patch = {}) {
  const normalizedLabelId = normalizeUuid(labelId);
  if (!normalizedLabelId) throw new Error("labelId is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/project_labels`);
  url.searchParams.set(
    "select",
    "id,project_id,label_key,name,description,text_color,background_color,border_color,hex_color,sort_order,created_at,updated_at"
  );
  url.searchParams.set("id", `eq.${normalizedLabelId}`);
  url.searchParams.set("limit", "1");

  const currentRes = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!currentRes.ok) {
    const txt = await currentRes.text().catch(() => "");
    throw new Error(`project_label fetch failed (${currentRes.status}): ${txt}`);
  }

  const currentRows = await currentRes.json().catch(() => []);
  const current = normalizeProjectLabelRow((Array.isArray(currentRows) ? currentRows[0] : currentRows) || {});
  if (!current?.id) throw new Error("label not found");

  const body = buildProjectLabelWritePayload(current.project_id, patch, current);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_labels?id=eq.${normalizedLabelId}`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_label update failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return normalizeProjectLabelRow((Array.isArray(rows) ? rows[0] : rows) || {});
}

export async function deleteLabel(labelId) {
  const normalizedLabelId = normalizeUuid(labelId);
  if (!normalizedLabelId) throw new Error("labelId is required");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_labels?id=eq.${normalizedLabelId}`, {
    method: "DELETE",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      Prefer: "return=minimal"
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_label delete failed (${res.status}): ${txt}`);
  }

  return true;
}

export async function addLabelToSubject(subjectId, labelId) {
  const normalizedSubjectId = normalizeUuid(subjectId);
  const normalizedLabelId = normalizeUuid(labelId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");
  if (!normalizedLabelId) throw new Error("labelId is required");

  const projectId = await resolveSubjectLabelProjectId(normalizedSubjectId, normalizedLabelId);

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_labels`);
  url.searchParams.set("on_conflict", "subject_id,label_id");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify({
      project_id: projectId,
      subject_id: normalizedSubjectId,
      label_id: normalizedLabelId
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_label create failed (${res.status}): ${txt}`);
  }

  const rows = await res.json().catch(() => []);
  return (Array.isArray(rows) ? rows[0] : rows) || {
    project_id: projectId,
    subject_id: normalizedSubjectId,
    label_id: normalizedLabelId
  };
}

export async function removeLabelFromSubject(subjectId, labelId) {
  const normalizedSubjectId = normalizeUuid(subjectId);
  const normalizedLabelId = normalizeUuid(labelId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");
  if (!normalizedLabelId) throw new Error("labelId is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/subject_labels`);
  url.searchParams.set("subject_id", `eq.${normalizedSubjectId}`);
  url.searchParams.set("label_id", `eq.${normalizedLabelId}`);

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      Prefer: "return=minimal"
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_label delete failed (${res.status}): ${txt}`);
  }

  return true;
}

export async function replaceSubjectAssignees(subjectId, personIds = []) {
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");
  const uniquePersonIds = [...new Set(normalizeAssigneeIds(personIds).map((value) => normalizeUuid(value)).filter(Boolean))];
  const projectId = await fetchSubjectProjectId(normalizedSubjectId);

  const deleteUrl = new URL(`${SUPABASE_URL}/rest/v1/subject_assignees`);
  deleteUrl.searchParams.set("subject_id", `eq.${normalizedSubjectId}`);

  const deleteRes = await fetch(deleteUrl.toString(), {
    method: "DELETE",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      Prefer: "return=minimal"
    })
  });

  if (!deleteRes.ok) {
    const txt = await deleteRes.text().catch(() => "");
    throw new Error(`subject_assignees delete failed (${deleteRes.status}): ${txt}`);
  }

  if (uniquePersonIds.length) {
    const insertUrl = new URL(`${SUPABASE_URL}/rest/v1/subject_assignees`);
    insertUrl.searchParams.set("on_conflict", "subject_id,person_id");
    const insertRes = await fetch(insertUrl.toString(), {
      method: "POST",
      headers: await getSupabaseAuthHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      }),
      body: JSON.stringify(uniquePersonIds.map((personId) => ({
        project_id: projectId,
        subject_id: normalizedSubjectId,
        person_id: personId
      })))
    });

    if (!insertRes.ok) {
      const txt = await insertRes.text().catch(() => "");
      throw new Error(`subject_assignees insert failed (${insertRes.status}): ${txt}`);
    }
  }

  const primaryPersonId = uniquePersonIds[0] || null;
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/subjects?id=eq.${normalizedSubjectId}`, {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    }),
    body: JSON.stringify({ assignee_person_id: primaryPersonId })
  });

  if (!patchRes.ok) {
    const txt = await patchRes.text().catch(() => "");
    throw new Error(`subjects assignee_person_id update failed (${patchRes.status}): ${txt}`);
  }

  return uniquePersonIds;
}

export async function replaceSubjectLabels(subjectId, labelIds = []) {
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");

  const nextLabelIds = [...new Set((Array.isArray(labelIds) ? labelIds : []).map((value) => normalizeUuid(value)).filter(Boolean))];
  const currentLabelIds = [
    ...new Set((store.projectSubjectsView?.rawSubjectsResult?.labelIdsBySubjectId?.[normalizedSubjectId] || []).map((value) => normalizeUuid(value)).filter(Boolean))
  ];

  const currentSet = new Set(currentLabelIds);
  const nextSet = new Set(nextLabelIds);
  const labelIdsToRemove = currentLabelIds.filter((labelId) => !nextSet.has(labelId));
  const labelIdsToAdd = nextLabelIds.filter((labelId) => !currentSet.has(labelId));

  for (const labelId of labelIdsToRemove) {
    await removeLabelFromSubject(normalizedSubjectId, labelId);
  }
  for (const labelId of labelIdsToAdd) {
    await addLabelToSubject(normalizedSubjectId, labelId);
  }

  return true;
}

export async function updateSubjectDescription({ subjectId, description, uploadSessionId = "" } = {}) {
  const debugEnabled = isSubjectDescriptionDebugEnabled();
  const debugRequestId = debugEnabled ? buildSubjectDescriptionDebugRequestId() : null;
  const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/update_subject_description`;
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");
  const rawDescription = typeof description === "string" ? description : String(description || "");
  const normalizedDescription = rawDescription.trim();
  const nextDescription = normalizedDescription ? rawDescription : "";
  const normalizedUploadSessionId = normalizeUuid(uploadSessionId);
  if (!normalizedDescription && !normalizedUploadSessionId) {
    throw new Error("description or uploadSessionId is required");
  }

  let actorPersonId = "";
  try {
    actorPersonId = normalizeUuid(await resolveCurrentUserDirectoryPersonId());
  } catch (error) {
    throw new Error(`update_subject_description identity resolution failed: ${String(error?.message || error || "unknown identity resolution error")}`);
  }
  if (!actorPersonId) {
    throw new Error("update_subject_description identity resolution failed: no linked directory person found for current user");
  }

  const rpcPayload = {
    p_subject_id: normalizedSubjectId,
    p_description: nextDescription,
    p_upload_session_id: normalizedUploadSessionId || null,
    p_actor_person_id: actorPersonId
  };
  if (debugEnabled) rpcPayload.p_debug_request_id = debugRequestId;

  if (debugEnabled) {
    console.info("[subject-description] rpc request", {
      timestamp: new Date().toISOString(),
      subjectId: normalizedSubjectId,
      uploadSessionId: normalizedUploadSessionId || null,
      actorPersonId,
      descriptionLength: rawDescription.length,
      descriptionPreview: truncateDescriptionPreview(rawDescription),
      rpcUrl,
      payload: rpcPayload
    });
  }

  let payload = null;
  try {
    payload = await rpcCall("update_subject_description", rpcPayload);
  } catch (error) {
    const statusCode = Number(error?.status || 0) || null;
    const rawError = String(error?.rawBody || error?.message || error || "");
    const parsedBody = error?.parsedBody ?? safeJsonParse(rawError);
    let preflight = null;

    if (debugEnabled) {
      preflight = await gatherSubjectDescriptionFailureDiagnostics({
        subjectId: normalizedSubjectId,
        uploadSessionId: normalizedUploadSessionId,
        actorPersonId,
        description: nextDescription
      });
    }

    if (debugEnabled) {
      console.error("[subject-description] rpc failure", {
        timestamp: new Date().toISOString(),
        subjectId: normalizedSubjectId,
        uploadSessionId: normalizedUploadSessionId || null,
        actorPersonId,
        descriptionLength: rawDescription.length,
        descriptionPreview: truncateDescriptionPreview(rawDescription),
        rpcUrl: String(error?.rpcUrl || rpcUrl),
        payload: rpcPayload,
        statusCode,
        rawBody: rawError,
        parsedBody,
        preflight
      });
      if (preflight && !preflight.ok) {
        console.error("[subject-description] debug preflight failure", {
          timestamp: new Date().toISOString(),
          rpc: "debug_update_subject_description_context",
          payload: preflight.payload,
          error: preflight.error
        });
      }
    }

    const preflightSummary = debugEnabled && preflight?.ok ? ` | preflight=${JSON.stringify(preflight.data)}` : "";
    throw new Error(`update_subject_description failed (${statusCode || "unknown"}): ${rawError}${preflightSummary}`);
  }

  const row = Array.isArray(payload) ? payload[0] : payload;
  const descriptionAttachments = Array.isArray(row?.description_attachments) ? row.description_attachments : [];
  return {
    ...(row || {}),
    id: String(row?.id || normalizedSubjectId),
    project_id: String(row?.project_id || ""),
    description: String(row?.description || nextDescription),
    updated_at: String(row?.updated_at || ""),
    description_attachments: descriptionAttachments
  };
}

export async function loadSubjectDescriptionVersions(subjectId, options = {}) {
  const logPrefix = "[subject-description-versions]";
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");
  const limit = Math.min(100, Math.max(1, Number(options?.limit || 50)));

  const versionsUrl = new URL(`${SUPABASE_URL}/rest/v1/subject_description_versions`);
  versionsUrl.searchParams.set("select", "id,subject_id,actor_user_id,actor_person_id,description_markdown,created_at");
  versionsUrl.searchParams.set("subject_id", `eq.${normalizedSubjectId}`);
  versionsUrl.searchParams.set("order", "created_at.desc");
  versionsUrl.searchParams.set("limit", String(limit));
  console.info(`${logPrefix} fetch start`, {
    timestamp: new Date().toISOString(),
    subjectId: normalizedSubjectId,
    limit,
    url: versionsUrl.toString()
  });

  const versionsResponse = await fetch(versionsUrl.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });
  console.info(`${logPrefix} fetch response`, {
    timestamp: new Date().toISOString(),
    subjectId: normalizedSubjectId,
    status: Number(versionsResponse.status || 0),
    statusText: String(versionsResponse.statusText || "")
  });
  if (!versionsResponse.ok) {
    const txt = await versionsResponse.text().catch(() => "");
    const parsed = safeJsonParse(txt);
    console.error(`${logPrefix} fetch failed`, {
      timestamp: new Date().toISOString(),
      subjectId: normalizedSubjectId,
      status: Number(versionsResponse.status || 0),
      statusText: String(versionsResponse.statusText || ""),
      rawBody: txt,
      parsedBody: parsed
    });
    const detailMessage = String(
      parsed?.message
      || parsed?.error_description
      || parsed?.error
      || txt
      || "Unknown error"
    ).trim();
    const error = new Error(
      `subject_description_versions fetch failed (${versionsResponse.status} ${versionsResponse.statusText || ""}): ${detailMessage}`
    );
    error.status = Number(versionsResponse.status || 0);
    error.details = detailMessage;
    error.code = String(parsed?.code || "");
    throw error;
  }
  const versionRows = await versionsResponse.json().catch(() => []);
  const rows = Array.isArray(versionRows) ? versionRows : [];
  console.info(`${logPrefix} fetch success`, {
    timestamp: new Date().toISOString(),
    subjectId: normalizedSubjectId,
    rowsCount: rows.length,
    sample: rows.slice(0, 3).map((row) => ({
      id: normalizeUuid(row?.id),
      subject_id: normalizeUuid(row?.subject_id),
      actor_user_id: normalizeUuid(row?.actor_user_id),
      actor_person_id: normalizeUuid(row?.actor_person_id),
      created_at: String(row?.created_at || "")
    }))
  });
  if (!rows.length) {
    console.warn(`${logPrefix} fetch succeeded but returned no version rows`, {
      timestamp: new Date().toISOString(),
      subjectId: normalizedSubjectId
    });
  }
  const personIds = [...new Set(rows.map((row) => normalizeUuid(row?.actor_person_id)).filter(Boolean))];
  console.info(`${logPrefix} directory_people fetch candidates`, {
    timestamp: new Date().toISOString(),
    subjectId: normalizedSubjectId,
    personIds
  });
  const peopleById = {};
  if (personIds.length) {
    const peopleUrl = new URL(`${SUPABASE_URL}/rest/v1/directory_people`);
    peopleUrl.searchParams.set("select", "id,first_name,last_name,email");
    peopleUrl.searchParams.set("id", `in.(${personIds.join(",")})`);

    const peopleRequest = fetch(peopleUrl.toString(), {
      method: "GET",
      headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
      cache: "no-store"
    });
    const timeoutRequest = new Promise((resolve) => {
      setTimeout(() => resolve(null), 1500);
    });
    const peopleResponse = await Promise.race([peopleRequest, timeoutRequest]).catch(() => null);
    if (!peopleResponse) {
      console.warn(`${logPrefix} directory_people fetch timeout or network failure`, {
        timestamp: new Date().toISOString(),
        subjectId: normalizedSubjectId,
        personIds
      });
    }
    if (peopleResponse?.ok) {
      const peopleRows = await peopleResponse.json().catch(() => []);
      console.info(`${logPrefix} directory_people fetch success`, {
        timestamp: new Date().toISOString(),
        subjectId: normalizedSubjectId,
        status: Number(peopleResponse.status || 0),
        rowsCount: Array.isArray(peopleRows) ? peopleRows.length : 0
      });
      (Array.isArray(peopleRows) ? peopleRows : []).forEach((person) => {
        const personId = normalizeUuid(person?.id);
        if (!personId) return;
        peopleById[personId] = person;
      });
    } else if (peopleResponse) {
      const peopleRawBody = await peopleResponse.text().catch(() => "");
      console.warn(`${logPrefix} directory_people fetch failed`, {
        timestamp: new Date().toISOString(),
        subjectId: normalizedSubjectId,
        status: Number(peopleResponse.status || 0),
        statusText: String(peopleResponse.statusText || ""),
        rawBody: peopleRawBody
      });
    }
  }

  return rows.map((row) => {
    const actorPersonId = normalizeUuid(row?.actor_person_id);
    const person = peopleById[actorPersonId] || {};
    const actorUserId = normalizeUuid(row?.actor_user_id);
    const isSystemActor = !actorPersonId && !actorUserId;
    const firstName = String(person?.first_name || "").trim();
    const lastName = String(person?.last_name || "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const fallbackName = String(person?.email || "").trim();
    return {
      id: normalizeUuid(row?.id),
      subject_id: normalizeUuid(row?.subject_id || normalizedSubjectId),
      actor_user_id: actorUserId,
      actor_person_id: actorPersonId,
      actor_first_name: firstName,
      actor_last_name: lastName,
      actor_name: fullName || fallbackName || (isSystemActor ? "Mdall" : "Utilisateur"),
      actor_email: fallbackName,
      actor_is_system: isSystemActor,
      description_markdown: String(row?.description_markdown || ""),
      created_at: String(row?.created_at || "")
    };
  });
}

export async function loadLabelsForProject(projectId) {
  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!resolvedProjectId) {
    return {
      labels: [],
      labelsById: {},
      labelsByKey: {},
      labelIdsBySubjectId: {},
      subjectIdsByLabelId: {},
      labelsHydrated: false
    };
  }

  const [labelRows, subjectLabelRows] = await Promise.all([
    fetchProjectLabels(resolvedProjectId),
    fetchProjectSubjectLabels(resolvedProjectId)
  ]);

  return {
    ...buildLabelsResult(labelRows, subjectLabelRows),
    labelsHydrated: true
  };
}

function buildProjectFlatSubjectsResult(subjectRows = [], subjectLinks = [], options = {}) {
  const subjectsById = {};
  const linksBySubjectId = {};
  const relationIdsBySubjectId = {};
  const relationOptionsById = {};

  for (const subject of subjectRows || []) {
    const subjectId = String(subject?.id || "");
    if (!subjectId) continue;
    const normalizedSubject = { ...subject, id: subjectId };
    subjectsById[subjectId] = normalizedSubject;
    linksBySubjectId[subjectId] = [];
    relationIdsBySubjectId[subjectId] = [];

    const relationId = String(subject?.situation_id || "").trim();
    if (relationId) {
      relationIdsBySubjectId[subjectId].push(relationId);
      if (!relationOptionsById[relationId]) {
        relationOptionsById[relationId] = {
          id: relationId,
          title: relationId,
          status: "open"
        };
      }
    }
  }

  const {
    parentBySubjectId,
    childrenBySubjectId,
    rootSubjectIds
  } = buildSubjectHierarchyIndexes(subjectRows, subjectsById);

  for (const link of subjectLinks || []) {
    const sourceId = String(link?.source_subject_id || "");
    const targetId = String(link?.target_subject_id || "");
    if (!sourceId || !targetId) continue;
    const normalizedLink = { ...link, source_subject_id: sourceId, target_subject_id: targetId };
    if (!Array.isArray(linksBySubjectId[sourceId])) linksBySubjectId[sourceId] = [];
    if (!Array.isArray(linksBySubjectId[targetId])) linksBySubjectId[targetId] = [];
    linksBySubjectId[sourceId].push(normalizedLink);
    linksBySubjectId[targetId].push(normalizedLink);
  }

  const flatSubjects = Object.values(subjectsById).sort((left, right) => {
    const leftTs = Date.parse(left?.created_at || "") || 0;
    const rightTs = Date.parse(right?.created_at || "") || 0;
    if (leftTs != rightTs) return leftTs - rightTs;
    return String(firstNonEmpty(left?.title, left?.id, "")).localeCompare(String(firstNonEmpty(right?.title, right?.id, "")), "fr");
  });

  return {
    run_id: options.runId || "",
    status: "SUCCEEDED",
    subjects: flatSubjects,
    subjectsById,
    rootSubjectIds,
    childrenBySubjectId,
    parentBySubjectId,
    linksBySubjectId,
    relationIdsBySubjectId,
    relationOptionsById
  };
}

export async function loadFlatSubjectsForCurrentProject(options = {}) {
  const force = !!options.force;
  const currentProjectScopeId = String(store.currentProjectId || "").trim() || null;
  const existing = Array.isArray(store.projectSubjectsView?.subjectsData) ? store.projectSubjectsView.subjectsData : [];
  if (!force && existing.length && store.projectSubjectsView?.projectScopeId === currentProjectScopeId) {
    return existing;
  }

  if (store.projectSubjectsView && typeof store.projectSubjectsView === "object") {
    store.projectSubjectsView.loading = true;
  }

  const previousExpandedSubjectIds = Array.isArray(store.projectSubjectsView?.expandedSubjectIds)
    ? store.projectSubjectsView.expandedSubjectIds
    : (store.projectSubjectsView?.expandedSubjectIds instanceof Set
      ? Array.from(store.projectSubjectsView.expandedSubjectIds)
      : []);
  const previousPage = Number.isFinite(Number(store.projectSubjectsView?.page))
    ? Math.max(1, Number(store.projectSubjectsView.page))
    : 1;

  try {
    const mappedBackendProjectId = normalizeUuid(getMappedBackendProjectId());
    const backendProjectId = await getResolvedProjectId();
    const previousSelectedSubjectId = normalizeUuid(
      store.projectSubjectsView?.selectedSubjectId
      || store.projectSubjectsView?.selectedSujetId
    );
    const previousSelectedSituationId = normalizeUuid(
      store.projectSubjectsView?.selectedSituationId
    );

    if (!backendProjectId) {
      store.projectSubjectsView.subjectsData = [];
      store.projectSubjectsView.projectScopeId = currentProjectScopeId;
      store.projectSubjectsView.rawSubjectsResult = {
        run_id: store.ui.runId || "",
        status: "IDLE",
        subjects: [],
        subjectsById: {},
        rootSubjectIds: [],
        childrenBySubjectId: {},
        parentBySubjectId: {},
        linksBySubjectId: {},
        relationIdsBySubjectId: {},
        relationOptionsById: {},
        assigneePersonIdsBySubjectId: {},
        subjectMessageCountsBySubjectId: {},
        labels: [],
        labelsById: {},
        labelsByKey: {},
        labelIdsBySubjectId: {},
        subjectIdsByLabelId: {},
        labelsHydrated: false,
        situationsById: {},
        subjectIdsBySituationId: {},
        objectives: [],
        objectivesById: {},
        objectiveIdsBySubjectId: {},
        objectivesHydrated: false,
        pagination: {
          entity: "subjects",
          mode: "full",
          sourceComplete: true,
          loadedItems: 0,
          totalItems: 0,
          hasNextPage: false,
          nextCursor: null
        }
      };
      store.projectSubjectsView.rawResult = store.projectSubjectsView.rawSubjectsResult;
      invalidateSubjectRefIndex(store.projectSubjectsView);
      store.projectSubjectsView.loading = false;
      store.projectSubjectsView.loaded = true;
      return [];
    }

    const subjects = await fetchProjectFlatSubjects(backendProjectId);
    const subjectLinks = await fetchProjectSubjectLinks(backendProjectId).catch(() => []);
    const subjectAssignees = await fetchProjectSubjectAssignees(backendProjectId).catch(() => []);
    const subjectMessageCountsBySubjectId = await fetchProjectSubjectMessageCounts(backendProjectId).catch(() => ({}));
    const situations = await loadSituationsForCurrentProject(backendProjectId).catch(() => []);
    const manualSituationIds = situations
      .filter((situation) => String(situation?.mode || "manual").trim().toLowerCase() === "manual")
      .map((situation) => String(situation?.id || "").trim())
      .filter(Boolean);
    const subjectIdsBySituationId = await loadSituationSubjectIdsMap(manualSituationIds).catch(() => ({}));
    const result = buildProjectFlatSubjectsResult(subjects, subjectLinks, { runId: store.ui.runId || "" });
    result.assigneePersonIdsBySubjectId = {};
    result.subjectMessageCountsBySubjectId = subjectMessageCountsBySubjectId && typeof subjectMessageCountsBySubjectId === "object"
      ? subjectMessageCountsBySubjectId
      : {};
    for (const row of subjectAssignees) {
      const subjectId = normalizeUuid(row?.subject_id);
      const personId = normalizeUuid(row?.person_id);
      if (!subjectId || !personId) continue;
      if (!Array.isArray(result.assigneePersonIdsBySubjectId[subjectId])) result.assigneePersonIdsBySubjectId[subjectId] = [];
      if (!result.assigneePersonIdsBySubjectId[subjectId].includes(personId)) {
        result.assigneePersonIdsBySubjectId[subjectId].push(personId);
      }
    }
    result.situationsById = Object.fromEntries(situations.map((situation) => [String(situation?.id || ""), situation]).filter(([id]) => !!id));
    result.subjectIdsBySituationId = subjectIdsBySituationId;
    result.pagination = {
      entity: "subjects",
      mode: "full",
      sourceComplete: true,
      loadedItems: Array.isArray(result.subjects) ? result.subjects.length : 0,
      totalItems: Array.isArray(result.subjects) ? result.subjects.length : 0,
      hasNextPage: false,
      nextCursor: null
    };

    try {
      const labelsResult = await loadLabelsForProject(backendProjectId);
      result.labels = Array.isArray(labelsResult?.labels) ? labelsResult.labels : [];
      result.labelsById = labelsResult?.labelsById && typeof labelsResult.labelsById === "object" ? labelsResult.labelsById : {};
      result.labelsByKey = labelsResult?.labelsByKey && typeof labelsResult.labelsByKey === "object" ? labelsResult.labelsByKey : {};
      result.labelIdsBySubjectId = labelsResult?.labelIdsBySubjectId && typeof labelsResult.labelIdsBySubjectId === "object" ? labelsResult.labelIdsBySubjectId : {};
      result.subjectIdsByLabelId = labelsResult?.subjectIdsByLabelId && typeof labelsResult.subjectIdsByLabelId === "object" ? labelsResult.subjectIdsByLabelId : {};
      result.labelsHydrated = true;
    } catch (error) {
      console.warn("[project-subjects] labels load failed", error);
      result.labels = [];
      result.labelsById = {};
      result.labelsByKey = {};
      result.labelIdsBySubjectId = {};
      result.subjectIdsByLabelId = {};
      result.labelsHydrated = false;
    }

    try {
      const objectivesResult = await loadObjectivesForProject(backendProjectId);
      result.objectives = Array.isArray(objectivesResult?.objectives) ? objectivesResult.objectives : [];
      result.objectivesById = objectivesResult?.objectivesById && typeof objectivesResult.objectivesById === "object" ? objectivesResult.objectivesById : {};
      result.objectiveIdsBySubjectId = objectivesResult?.objectiveIdsBySubjectId && typeof objectivesResult.objectiveIdsBySubjectId === "object" ? objectivesResult.objectiveIdsBySubjectId : {};
      result.objectivesHydrated = true;
    } catch (error) {
      console.warn("[project-subjects] objectives load failed", error);
      result.objectives = [];
      result.objectivesById = {};
      result.objectiveIdsBySubjectId = {};
      result.objectivesHydrated = false;
    }

    result.relationOptionsById = {
      ...(result.relationOptionsById && typeof result.relationOptionsById === "object" ? result.relationOptionsById : {}),
      ...result.situationsById
    };

    store.projectSubjectsView.subjectsData = result.subjects;
    store.projectSubjectsView.rawSubjectsResult = result;
    store.projectSubjectsView.rawResult = result;
    invalidateSubjectRefIndex(store.projectSubjectsView);
    store.projectSubjectsView.projectScopeId = currentProjectScopeId;
    store.projectSubjectsView.page = previousPage;
    store.projectSubjectsView.pagination = {
      mode: "full",
      pageSize: null,
      currentPage: 1,
      totalItems: result.pagination?.totalItems || (Array.isArray(result.subjects) ? result.subjects.length : 0),
      loadedItems: result.pagination?.loadedItems || (Array.isArray(result.subjects) ? result.subjects.length : 0),
      hasNextPage: false,
      nextCursor: null,
      sourceComplete: true
    };
    store.projectSubjectsView.expandedSubjectIds = new Set(
      previousExpandedSubjectIds.filter((subjectId) => !!result.subjectsById?.[subjectId])
    );
    store.projectSubjectsView.expandedSujets = store.projectSubjectsView.expandedSubjectIds;
    const nextSelectedSubjectId = previousSelectedSubjectId && result.subjectsById?.[previousSelectedSubjectId]
      ? previousSelectedSubjectId
      : (result.subjects[0]?.id || null);
    const nextSelectedSituationId = previousSelectedSituationId && result.situationsById?.[previousSelectedSituationId]
      ? previousSelectedSituationId
      : (store.projectSubjectsView.selectedSituationId || null);

    store.projectSubjectsView.selectedSubjectId = nextSelectedSubjectId;
    store.projectSubjectsView.selectedSujetId = nextSelectedSubjectId;
    store.projectSubjectsView.selectedSituationId = nextSelectedSituationId;
    store.projectSubjectsView.subjectsSelectedNodeId = nextSelectedSubjectId || "";
    store.projectSubjectsView.loading = false;
    store.projectSubjectsView.loaded = true;


    return result.subjects;
  } catch (error) {
    if (store.projectSubjectsView && typeof store.projectSubjectsView === "object") {
      store.projectSubjectsView.loading = false;
    }
    throw error;
  }
}

export function resetFlatSubjectsForCurrentProject() {
  store.projectSubjectsView.subjectsData = [];
  store.projectSubjectsView.rawSubjectsResult = null;
  store.projectSubjectsView.rawResult = null;
  invalidateSubjectRefIndex(store.projectSubjectsView);
  store.projectSubjectsView.projectScopeId = String(store.currentProjectId || "").trim() || null;
  store.projectSubjectsView.loading = false;
  store.projectSubjectsView.loaded = false;
  store.projectSubjectsView.expandedSubjectIds = new Set();
  store.projectSubjectsView.expandedSujets = store.projectSubjectsView.expandedSubjectIds;
  store.projectSubjectsView.selectedSubjectId = null;
  store.projectSubjectsView.selectedSujetId = null;
  store.projectSubjectsView.subjectsSelectedNodeId = "";
  store.projectSubjectsView.search = "";
  store.projectSubjectsView.page = 1;
}
