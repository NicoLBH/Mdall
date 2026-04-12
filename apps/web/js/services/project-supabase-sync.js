import { store } from "../store.js";
import { buildSupabaseAuthHeaders, getCurrentUser, getSupabaseUrl } from "../../assets/js/auth.js";
import { loadSituationsForCurrentProject, loadSituationSubjectIdsMap } from "./project-situations-supabase.js";

const SUPABASE_URL = getSupabaseUrl();
const FRONT_PROJECT_MAP_STORAGE_KEY = "mdall.supabaseProjectMap.v1";



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

export async function resolveCurrentBackendProjectId() {
  const mappedProjectId = normalizeUuid(getMappedBackendProjectId());
  if (mappedProjectId) return mappedProjectId;

  const currentProjectBackendId = normalizeUuid(
    store.currentProject?.backendProjectId
    || store.currentProject?.project_id
    || store.currentProject?.supabaseProjectId
    || store.currentProject?.supabase_project_id
  );
  if (currentProjectBackendId) return currentProjectBackendId;

  return "";
}

async function getSupabaseAuthHeaders(extra = {}) {
  return buildSupabaseAuthHeaders(extra);
}

async function fetchProjectFlatSubjects(projectId) {
  if (!projectId) {
    return [];
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/subjects`);
  url.searchParams.set(
    "select",
    "id,project_id,document_id,analysis_run_id,situation_id,parent_subject_id,title,description,priority,status,closure_reason,subject_type,created_at,updated_at,closed_at"
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
    throw new Error(`subjects fetch failed (${res.status}): ${txt}`);
  }

  const json = await res.json();
  return json;
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



function normalizeLabelHexColor(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^#([0-9a-fA-F]{6})$/);
  return match ? `#${match.group(1).lower()}` : "#8b949e";
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

async function fetchSubjectProjectId(subjectId) {
  const normalizedSubjectId = normalizeUuid(subjectId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");

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
  return normalizeUuid(row.project_id);
}

export async function addLabelToSubject(subjectId, labelId) {
  const normalizedSubjectId = normalizeUuid(subjectId);
  const normalizedLabelId = normalizeUuid(labelId);
  if (!normalizedSubjectId) throw new Error("subjectId is required");
  if (!normalizedLabelId) throw new Error("labelId is required");

  const projectId = await fetchSubjectProjectId(normalizedSubjectId);
  const resolvedProjectId = await getResolvedProjectId(projectId);
  if (!resolvedProjectId) throw new Error("projectId is required");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/subject_labels`, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify({
      project_id: resolvedProjectId,
      subject_id: normalizedSubjectId,
      label_id: normalizedLabelId
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_label create failed (${res.status}): ${txt}`);
  }

  return true;
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
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`subject_label delete failed (${res.status}): ${txt}`);
  }

  return true;
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
  const parentBySubjectId = {};
  const childrenBySubjectId = {};
  const linksBySubjectId = {};
  const rootSubjectIds = [];
  const relationIdsBySubjectId = {};
  const relationOptionsById = {};

  for (const subject of subjectRows || []) {
    const subjectId = String(subject?.id || "");
    if (!subjectId) continue;
    const normalizedSubject = { ...subject, id: subjectId };
    subjectsById[subjectId] = normalizedSubject;
    childrenBySubjectId[subjectId] = [];
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

  for (const subject of subjectRows || []) {
    const subjectId = String(subject?.id || "");
    if (!subjectId) continue;
    const parentId = String(subject?.parent_subject_id || "");
    parentBySubjectId[subjectId] = parentId || null;
    if (parentId && subjectsById[parentId] && parentId !== subjectId) childrenBySubjectId[parentId].push(subjectId);
    else rootSubjectIds.push(subjectId);
  }

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

  const backendProjectId = getMappedBackendProjectId();

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
      objectivesHydrated: false
    };
    store.projectSubjectsView.rawResult = store.projectSubjectsView.rawSubjectsResult;
    return [];
  }

  const subjects = await fetchProjectFlatSubjects(backendProjectId);
  const subjectLinks = await fetchProjectSubjectLinks(backendProjectId).catch(() => []);
  const situations = await loadSituationsForCurrentProject(backendProjectId).catch(() => []);
  const manualSituationIds = situations
    .filter((situation) => String(situation?.mode || "manual").trim().toLowerCase() === "manual")
    .map((situation) => String(situation?.id || "").trim())
    .filter(Boolean);
  const subjectIdsBySituationId = await loadSituationSubjectIdsMap(manualSituationIds).catch(() => ({}));
  const result = buildProjectFlatSubjectsResult(subjects, subjectLinks, { runId: store.ui.runId || "" });
  result.situationsById = Object.fromEntries(situations.map((situation) => [String(situation?.id || ""), situation]).filter(([id]) => !!id));
  result.subjectIdsBySituationId = subjectIdsBySituationId;

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
  store.projectSubjectsView.projectScopeId = currentProjectScopeId;
  store.projectSubjectsView.page = 1;
  store.projectSubjectsView.expandedSubjectIds = new Set();
  store.projectSubjectsView.expandedSujets = store.projectSubjectsView.expandedSubjectIds;
  store.projectSubjectsView.selectedSubjectId = result.subjects[0]?.id || null;
  store.projectSubjectsView.selectedSujetId = result.subjects[0]?.id || null;
  store.projectSubjectsView.subjectsSelectedNodeId = result.subjects[0]?.id || "";

  return result.subjects;
}

export function resetFlatSubjectsForCurrentProject() {
  store.projectSubjectsView.subjectsData = [];
  store.projectSubjectsView.rawSubjectsResult = null;
  store.projectSubjectsView.rawResult = null;
  store.projectSubjectsView.projectScopeId = String(store.currentProjectId || "").trim() || null;
  store.projectSubjectsView.expandedSubjectIds = new Set();
  store.projectSubjectsView.expandedSujets = store.projectSubjectsView.expandedSubjectIds;
  store.projectSubjectsView.selectedSubjectId = null;
  store.projectSubjectsView.selectedSujetId = null;
  store.projectSubjectsView.subjectsSelectedNodeId = "";
  store.projectSubjectsView.search = "";
  store.projectSubjectsView.page = 1;
}


export const PROJECT_SUPABASE_SYNC_EVENT = "project:supabase-sync";
export const PROJECT_IDENTITY_UPDATED_EVENT = "project:identity-updated";

const projectSubjectCountersCache = {
  frontendProjectId: "",
  openSujets: 0
};

function writeFrontendProjectMap(map) {
  try {
    localStorage.setItem(FRONT_PROJECT_MAP_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    // no-op
  }
}

function dispatchProjectSupabaseSync(frontendProjectId) {
  window.dispatchEvent(new CustomEvent(PROJECT_SUPABASE_SYNC_EVENT, {
    detail: {
      frontendProjectId: String(frontendProjectId || store.currentProjectId || "").trim()
    }
  }));
}

function dispatchProjectIdentityUpdated(frontendProjectId, backendProjectId) {
  window.dispatchEvent(new CustomEvent(PROJECT_IDENTITY_UPDATED_EVENT, {
    detail: {
      frontendProjectId: String(frontendProjectId || store.currentProjectId || "").trim(),
      backendProjectId: String(backendProjectId || "").trim()
    }
  }));
}

function normalizeProjectRow(row = {}) {
  const id = normalizeUuid(row.id);
  return {
    ...row,
    id,
    backendProjectId: id,
    project_id: id,
    name: firstNonEmpty(row.name, row.title, "Projet"),
    description: firstNonEmpty(row.description, ""),
    city: firstNonEmpty(row.city, ""),
    clientName: firstNonEmpty(row.project_owner_name, row.client_name, ""),
    projectOwnerName: firstNonEmpty(row.project_owner_name, row.client_name, ""),
    currentPhase: firstNonEmpty(row.current_phase_code, row.currentPhase, "PC"),
    current_phase_code: firstNonEmpty(row.current_phase_code, row.currentPhase, "PC"),
    ownerId: firstNonEmpty(row.owner_id, row.ownerId, ""),
    owner_id: firstNonEmpty(row.owner_id, row.ownerId, ""),
    created_at: row.created_at || "",
    updated_at: row.updated_at || ""
  };
}

async function restSelect(path, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${path} fetch failed (${res.status}): ${txt}`);
  }
  return res.json().catch(() => []);
}

async function restInsert(path, body, select = "*") {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  if (select) url.searchParams.set("select", select);
  const res = await fetch(url.toString(), {
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
    throw new Error(`${path} create failed (${res.status}): ${txt}`);
  }
  const rows = await res.json().catch(() => []);
  return (Array.isArray(rows) ? rows[0] : rows) || null;
}

async function restPatch(path, filterParams = {}, body = {}, select = "*") {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  Object.entries(filterParams || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  if (select) url.searchParams.set("select", select);
  const res = await fetch(url.toString(), {
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
    throw new Error(`${path} update failed (${res.status}): ${txt}`);
  }
  const rows = await res.json().catch(() => []);
  return (Array.isArray(rows) ? rows[0] : rows) || null;
}

function getCurrentFrontendProjectKey() {
  return getFrontendProjectKey();
}

export async function syncProjectsCatalogFromSupabase() {
  const rows = await restSelect("projects", {
    select: "id,name,description,postal_code,city,project_owner_name,current_phase_code,owner_id,created_at,updated_at",
    order: "created_at.asc"
  });
  const projects = (Array.isArray(rows) ? rows : []).map((row) => normalizeProjectRow(row));
  store.projects = projects;
  dispatchProjectSupabaseSync(store.currentProjectId);
  return projects;
}

export async function syncCurrentProjectIdentityFromSupabase() {
  const frontendProjectId = getCurrentFrontendProjectKey();
  let backendProjectId = await resolveCurrentBackendProjectId().catch(() => "");

  let current = Array.isArray(store.projects)
    ? store.projects.find((project) => String(project?.id || "").trim() === backendProjectId)
    : null;

  if (!current && backendProjectId) {
    const catalog = await syncProjectsCatalogFromSupabase().catch(() => []);
    current = Array.isArray(catalog)
      ? catalog.find((project) => String(project?.id || "").trim() === backendProjectId)
      : null;
  }

  if (!current && !backendProjectId && store.currentProjectId) {
    const catalog = Array.isArray(store.projects) && store.projects.length
      ? store.projects
      : await syncProjectsCatalogFromSupabase().catch(() => []);
    current = Array.isArray(catalog)
      ? catalog.find((project) => String(project?.id || "").trim() === String(store.currentProjectId || "").trim())
      : null;
    backendProjectId = String(current?.id || "").trim();
  }

  if (current) {
    store.currentProject = { ...(store.currentProject || {}), ...current };
    if (!store.currentProjectId) store.currentProjectId = frontendProjectId;
    dispatchProjectIdentityUpdated(frontendProjectId, backendProjectId || current.id);
    return store.currentProject;
  }

  dispatchProjectIdentityUpdated(frontendProjectId, backendProjectId);
  return store.currentProject || null;
}

export async function createProjectWithDefaultPhases(payload = {}) {
  const currentUser = await getCurrentUser().catch(() => null);
  if (!currentUser?.id) throw new Error("Utilisateur authentifié introuvable pour la création du projet.");

  const frontendProjectKey = String(payload.frontendProjectId || payload.id || `project-${Date.now()}`).trim();
  const row = await restInsert("projects", {
    name: firstNonEmpty(payload.projectName, payload.name, "Nouveau projet"),
    description: firstNonEmpty(payload.description, "") || null,
    postal_code: firstNonEmpty(payload.postalCode, "") || null,
    city: firstNonEmpty(payload.city, "") || null,
    project_owner_name: firstNonEmpty(payload.clientName, payload.projectOwnerName, "") || null,
    current_phase_code: firstNonEmpty(payload.currentPhaseCode, payload.currentPhase, "PC"),
    owner_id: currentUser.id
  }, "id,name,description,postal_code,city,project_owner_name,current_phase_code,owner_id,created_at,updated_at");

  if (!row?.id) throw new Error("projects insert succeeded without id");

  const map = readFrontendProjectMap();
  map[frontendProjectKey] = row.id;
  writeFrontendProjectMap(map);

  const createdProject = normalizeProjectRow(row);
  store.projects = [...(Array.isArray(store.projects) ? store.projects.filter((project) => String(project?.id || "").trim() !== createdProject.id) : []), createdProject];
  dispatchProjectSupabaseSync(frontendProjectKey);
  return createdProject;
}

export function getCurrentProjectSubjectCounters() {
  return { openSujets: Number(projectSubjectCountersCache.openSujets || 0) };
}

export async function syncProjectSubjectCountersFromSupabase(options = {}) {
  const backendProjectId = options?.projectId
    ? await getResolvedProjectId(options.projectId)
    : await resolveCurrentBackendProjectId().catch(() => "");

  if (!backendProjectId) {
    projectSubjectCountersCache.frontendProjectId = String(store.currentProjectId || "").trim();
    projectSubjectCountersCache.openSujets = 0;
    dispatchProjectSupabaseSync(projectSubjectCountersCache.frontendProjectId);
    return getCurrentProjectSubjectCounters();
  }

  const rows = await restSelect("subjects", {
    select: "id,status",
    project_id: `eq.${backendProjectId}`
  });
  const openSujets = (Array.isArray(rows) ? rows : []).reduce((count, row) => count + (String(row?.status || "open").trim().toLowerCase() === "open" ? 1 : 0), 0);
  projectSubjectCountersCache.frontendProjectId = String(store.currentProjectId || "").trim();
  projectSubjectCountersCache.openSujets = openSujets;
  dispatchProjectSupabaseSync(projectSubjectCountersCache.frontendProjectId);
  return getCurrentProjectSubjectCounters();
}

function normalizeDocumentRow(row = {}) {
  const id = normalizeUuid(row.id);
  const filename = firstNonEmpty(row.original_filename, row.filename, "Document");
  return {
    id,
    name: filename,
    title: filename,
    note: firstNonEmpty(row.upload_status, "Document"),
    phaseCode: firstNonEmpty(row.document_kind, store.projectForm?.currentPhase, store.projectForm?.phase, "APS"),
    phaseLabel: "",
    updatedAt: row.updated_at || row.created_at || "",
    createdAt: row.created_at || "",
    fileName: filename,
    filename,
    kind: "file",
    mimeType: firstNonEmpty(row.mime_type, "application/pdf"),
    previewUrl: "",
    localPreviewUrl: "",
    extension: filename.includes('.') ? filename.split('.').pop().toLowerCase() : "",
    storageBucket: firstNonEmpty(row.storage_bucket, ""),
    storagePath: firstNonEmpty(row.storage_path, ""),
    uploadStatus: firstNonEmpty(row.upload_status, "uploaded"),
    pageCount: Number(row.page_count || 0) || 0,
    document_id: id
  };
}

export async function syncProjectDocumentsFromSupabase(options = {}) {
  const backendProjectId = options?.projectId
    ? await getResolvedProjectId(options.projectId)
    : await resolveCurrentBackendProjectId().catch(() => "");
  if (!backendProjectId) {
    store.projectDocuments.items = [];
    return [];
  }
  const rows = await restSelect("documents", {
    select: "id,project_id,filename,original_filename,mime_type,storage_bucket,storage_path,file_size_bytes,upload_status,document_kind,page_count,created_at,updated_at,deleted_at",
    project_id: `eq.${backendProjectId}`,
    deleted_at: "is.null",
    order: "created_at.desc"
  });
  const documents = (Array.isArray(rows) ? rows : []).map((row) => normalizeDocumentRow(row));
  store.projectDocuments.items = documents;
  if (!documents.some((item) => item.id === store.projectDocuments.activeDocumentId)) {
    store.projectDocuments.activeDocumentId = documents[0]?.id || null;
  }
  dispatchProjectSupabaseSync(store.currentProjectId);
  return documents;
}

function normalizeAnalysisRunRow(row = {}) {
  const startedAt = Date.parse(row.started_at || row.created_at || "") || Date.now();
  const endedAt = row.finished_at ? (Date.parse(row.finished_at) || startedAt) : null;
  const rawStatus = String(row.status || "queued").toLowerCase();
  const isRunning = rawStatus === "queued" || rawStatus === "running";
  const outcomeStatus = rawStatus === "succeeded" ? "success" : (rawStatus === "failed" ? "error" : (rawStatus === "canceled" ? "cancelled" : null));
  return {
    id: normalizeUuid(row.id),
    name: "Analyse de document",
    kind: "analysis",
    agentKey: "parasismique",
    lifecycleStatus: isRunning ? "running" : "completed",
    outcomeStatus,
    status: isRunning ? "running" : "completed",
    triggerType: String(row.trigger_source || "manual").toLowerCase() === "upload" ? "document-upload" : "manual",
    triggerLabel: String(row.trigger_source || "manual").toLowerCase() === "upload" ? "Dépôt de document" : "Lancement manuel",
    documentName: firstNonEmpty(row.documents?.original_filename, row.documents?.filename, ""),
    startedAt,
    endedAt,
    durationMs: endedAt != null ? Math.max(0, endedAt - startedAt) : null,
    summary: firstNonEmpty(row.error_message, ""),
    details: null,
    createdAt: Date.parse(row.created_at || row.started_at || "") || startedAt,
    updatedAt: Date.parse(row.updated_at || row.finished_at || row.created_at || "") || (endedAt ?? startedAt)
  };
}

export async function syncProjectActionsFromSupabase(options = {}) {
  const backendProjectId = options?.projectId
    ? await getResolvedProjectId(options.projectId)
    : await resolveCurrentBackendProjectId().catch(() => "");
  if (!backendProjectId) {
    store.projectAutomation.runLog = [];
    return [];
  }
  const rows = await restSelect("analysis_runs", {
    select: "id,project_id,document_id,status,trigger_source,started_at,finished_at,error_message,created_at,updated_at,documents(filename,original_filename)",
    project_id: `eq.${backendProjectId}`,
    order: "created_at.desc"
  });
  const runLog = (Array.isArray(rows) ? rows : []).map((row) => normalizeAnalysisRunRow(row));
  if (!store.projectAutomation || typeof store.projectAutomation !== "object") store.projectAutomation = { catalog: { agents: {}, automations: {} }, settings: { enabledAgents: {}, enabledAutomations: {} }, runLog: [] };
  store.projectAutomation.runLog = runLog;
  dispatchProjectSupabaseSync(store.currentProjectId);
  return runLog;
}

export async function persistCurrentProjectNameToSupabase(projectName = "") {
  const backendProjectId = await resolveCurrentBackendProjectId().catch(() => "");
  if (!backendProjectId) return null;
  const row = await restPatch("projects", { id: `eq.${backendProjectId}` }, { name: firstNonEmpty(projectName, "Projet") }, "id,name,description,postal_code,city,project_owner_name,current_phase_code,owner_id,created_at,updated_at");
  const normalized = normalizeProjectRow(row || { id: backendProjectId, name: projectName });
  store.currentProject = { ...(store.currentProject || {}), ...normalized };
  store.projectForm.projectName = normalized.name;
  if (Array.isArray(store.projects)) {
    store.projects = store.projects.map((project) => String(project?.id || "") === normalized.id ? { ...project, ...normalized } : project);
  }
  dispatchProjectSupabaseSync(store.currentProjectId);
  return normalized;
}

function normalizePhaseRow(row = {}) {
  return {
    id: normalizeUuid(row.id),
    code: firstNonEmpty(row.phase_code, row.code, ""),
    label: firstNonEmpty(row.phase_label, row.label, ""),
    enabled: row.enabled !== false,
    phaseDate: firstNonEmpty(row.phase_date, row.phaseDate, ""),
    phase_date: firstNonEmpty(row.phase_date, row.phaseDate, ""),
    phaseOrder: Number(row.phase_order || row.phaseOrder || 0) || 0
  };
}

export async function syncProjectPhasesFromSupabase(options = {}) {
  const backendProjectId = options?.projectId
    ? await getResolvedProjectId(options.projectId)
    : await resolveCurrentBackendProjectId().catch(() => "");
  if (!backendProjectId) return [];
  const rows = await restSelect("project_phases", {
    select: "id,project_id,phase_code,phase_label,phase_order,phase_date,enabled,created_at,updated_at",
    project_id: `eq.${backendProjectId}`,
    order: "phase_order.asc"
  }).catch(() => []);
  const phases = (Array.isArray(rows) ? rows : []).map((row) => normalizePhaseRow(row));
  if (phases.length) {
    store.projectForm.phasesCatalog = phases;
  }
  dispatchProjectSupabaseSync(store.currentProjectId);
  return phases;
}

export async function persistProjectPhaseDatesToSupabase(phaseDateByCode = {}) {
  const backendProjectId = await resolveCurrentBackendProjectId().catch(() => "");
  if (!backendProjectId) return [];
  const updated = [];
  for (const [code, phaseDate] of Object.entries(phaseDateByCode || {})) {
    const normalizedCode = String(code || "").trim();
    if (!normalizedCode) continue;
    const row = await restPatch("project_phases", { project_id: `eq.${backendProjectId}`, phase_code: `eq.${normalizedCode}` }, { phase_date: firstNonEmpty(phaseDate, "") || null }, "id,project_id,phase_code,phase_label,phase_order,phase_date,enabled,created_at,updated_at");
    if (row) updated.push(normalizePhaseRow(row));
  }
  await syncProjectPhasesFromSupabase({ projectId: backendProjectId }).catch(() => undefined);
  return updated;
}

export async function persistProjectPhaseEnabledToSupabase(code = "", enabled = true) {
  const backendProjectId = await resolveCurrentBackendProjectId().catch(() => "");
  const normalizedCode = String(code || "").trim();
  if (!backendProjectId || !normalizedCode) return null;
  const row = await restPatch("project_phases", { project_id: `eq.${backendProjectId}`, phase_code: `eq.${normalizedCode}` }, { enabled: !!enabled }, "id,project_id,phase_code,phase_label,phase_order,phase_date,enabled,created_at,updated_at");
  await syncProjectPhasesFromSupabase({ projectId: backendProjectId }).catch(() => undefined);
  return row ? normalizePhaseRow(row) : null;
}

function normalizeProjectLotRow(row = {}) {
  return {
    id: normalizeUuid(row.id),
    projectId: normalizeUuid(row.project_id),
    project_id: normalizeUuid(row.project_id),
    lotCatalogId: normalizeUuid(row.lot_catalog_id),
    label: firstNonEmpty(row.label, row.role_label, "Lot"),
    code: firstNonEmpty(row.code, row.role_code, row.id),
    groupCode: firstNonEmpty(row.group_code, row.role_group_code, "groupe-divers"),
    groupLabel: firstNonEmpty(row.group_label, row.role_group_label, "Divers"),
    activated: row.activated !== false,
    isCustom: String(row.code || "").startsWith("custom-") || String(row.code || "").startsWith("personnalise-") || !!row.is_custom,
    sortOrder: Number(row.sort_order || 0) || 0,
    created_at: row.created_at || "",
    updated_at: row.updated_at || ""
  };
}

export async function syncProjectLotsFromSupabase(options = {}) {
  const backendProjectId = options?.projectId
    ? await getResolvedProjectId(options.projectId)
    : await resolveCurrentBackendProjectId().catch(() => "");
  if (!backendProjectId) {
    store.projectLots.items = [];
    return [];
  }
  const rows = await restSelect("project_lots", {
    select: "id,project_id,lot_catalog_id,activated,created_at,updated_at,lot_catalog:lot_catalog_id(id,group_code,group_label,code,label,sort_order)",
    project_id: `eq.${backendProjectId}`,
    order: "created_at.asc"
  });
  const items = (Array.isArray(rows) ? rows : []).map((row) => normalizeProjectLotRow({
    ...row,
    ...(row?.lot_catalog || {})
  })).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.label || "").localeCompare(String(b.label || ""), "fr"));
  store.projectLots.items = items;
  store.projectLots.loading = false;
  store.projectLots.loaded = true;
  store.projectLots.error = "";
  store.projectLots.projectKey = String(store.currentProjectId || backendProjectId || "");
  dispatchProjectSupabaseSync(store.currentProjectId);
  return items;
}

export async function persistProjectLotActivationToSupabase(projectLotId = "", activated = true) {
  const normalizedProjectLotId = normalizeUuid(projectLotId);
  if (!normalizedProjectLotId) return null;
  const row = await restPatch("project_lots", { id: `eq.${normalizedProjectLotId}` }, { activated: !!activated }, "id,project_id,lot_catalog_id,activated,created_at,updated_at");
  await syncProjectLotsFromSupabase({ force: true }).catch(() => undefined);
  return row;
}

function slugifyCode(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `custom-${Date.now()}`;
}

export async function addCustomProjectLotToSupabase(payload = {}) {
  const backendProjectId = await resolveCurrentBackendProjectId().catch(() => "");
  if (!backendProjectId) throw new Error("projectId is required");
  const label = firstNonEmpty(payload.title, payload.label, "");
  if (!label) throw new Error("Le titre du lot est requis.");
  const groupCode = firstNonEmpty(payload.groupCode, "groupe-divers");
  const groupLabelMap = {
    "groupe-maitrise-ouvrage": "Maîtrise d'ouvrage",
    "groupe-maitrise-oeuvre": "Maîtrise d'oeuvre",
    "groupe-entreprise": "Entreprises",
    "groupe-divers": "Divers"
  };
  const catalogRow = await restInsert("lot_catalog", {
    group_code: groupCode,
    group_label: groupLabelMap[groupCode] || "Divers",
    code: `custom-${slugifyCode(label)}-${Date.now()}`,
    label,
    default_activated: true,
    sort_order: Date.now()
  }, "id,group_code,group_label,code,label,default_activated,sort_order,created_at,updated_at");
  const projectLotRow = await restInsert("project_lots", {
    project_id: backendProjectId,
    lot_catalog_id: catalogRow.id,
    activated: true
  }, "id,project_id,lot_catalog_id,activated,created_at,updated_at");
  await syncProjectLotsFromSupabase({ force: true }).catch(() => undefined);
  return { ...projectLotRow, lot_catalog: catalogRow };
}

export async function deleteCustomProjectLotFromSupabase(projectLotId = "") {
  const normalizedProjectLotId = normalizeUuid(projectLotId);
  if (!normalizedProjectLotId) return false;
  const rows = await restSelect("project_lots", { select: "id,lot_catalog_id", id: `eq.${normalizedProjectLotId}`, limit: "1" });
  const current = (Array.isArray(rows) ? rows[0] : rows) || null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_lots?id=eq.${normalizedProjectLotId}`, {
    method: "DELETE",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`project_lots delete failed (${res.status}): ${txt}`);
  }
  if (current?.lot_catalog_id) {
    await fetch(`${SUPABASE_URL}/rest/v1/lot_catalog?id=eq.${encodeURIComponent(current.lot_catalog_id)}`, {
      method: "DELETE",
      headers: await getSupabaseAuthHeaders({ Accept: "application/json" })
    }).catch(() => undefined);
  }
  await syncProjectLotsFromSupabase({ force: true }).catch(() => undefined);
  return true;
}

function normalizeCollaboratorCandidate(row = {}) {
  return {
    candidateKey: firstNonEmpty(row.id, row.user_id, row.email, `${Date.now()}`),
    userId: normalizeUuid(row.user_id),
    email: firstNonEmpty(row.email, ""),
    firstName: firstNonEmpty(row.first_name, ""),
    lastName: firstNonEmpty(row.last_name, ""),
    name: firstNonEmpty(row.full_name, [row.first_name, row.last_name].filter(Boolean).join(" "), ""),
    company: firstNonEmpty(row.company, ""),
    hasMdallAccount: !!row.user_id,
    source: row.user_id ? "mdall_account" : "directory"
  };
}

function normalizeProjectCollaboratorRow(row = {}) {
  const name = firstNonEmpty(row.full_name, row.name, [row.first_name, row.last_name].filter(Boolean).join(" "), row.email, "Utilisateur");
  return {
    id: normalizeUuid(row.id),
    projectId: normalizeUuid(row.project_id),
    project_id: normalizeUuid(row.project_id),
    personId: normalizeUuid(row.person_id),
    collaboratorUserId: normalizeUuid(row.collaborator_user_id),
    email: firstNonEmpty(row.email, row.collaborator_email, ""),
    firstName: firstNonEmpty(row.first_name, ""),
    lastName: firstNonEmpty(row.last_name, ""),
    name,
    company: firstNonEmpty(row.company, ""),
    hasMdallAccount: !!row.collaborator_user_id,
    projectLotId: normalizeUuid(row.project_lot_id),
    role: firstNonEmpty(row.role_label, row.role, ""),
    roleCode: firstNonEmpty(row.role_code, ""),
    roleGroupCode: firstNonEmpty(row.role_group_code, ""),
    roleGroupLabel: firstNonEmpty(row.role_group_label, ""),
    status: firstNonEmpty(row.status, "Actif"),
    addedAt: row.created_at || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    removedAt: String(row.status || "") === "Retiré" ? (row.updated_at || "") : ""
  };
}

export async function searchProjectCollaboratorCandidates(query = "", options = {}) {
  const trimmedQuery = String(query || "").trim();
  const limit = Number(options?.limit || 8) || 8;
  const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/search_project_collaborator_candidates`;
  let results = [];
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: await getSupabaseAuthHeaders({ Accept: "application/json", "Content-Type": "application/json" }),
      body: JSON.stringify({ p_query: trimmedQuery, p_limit: limit })
    });
    if (res.ok) {
      const rows = await res.json().catch(() => []);
      results = Array.isArray(rows) ? rows.map((row) => normalizeCollaboratorCandidate(row)) : [];
    }
  } catch {
    // fallback below
  }
  if (!results.length && trimmedQuery) {
    const rows = await restSelect("directory_people", {
      select: "id,email,first_name,last_name,company,linked_user_id",
      or: `(email.ilike.*${trimmedQuery}*,first_name.ilike.*${trimmedQuery}*,last_name.ilike.*${trimmedQuery}*)`,
      order: "email.asc",
      limit: String(limit)
    }).catch(() => []);
    results = (Array.isArray(rows) ? rows : []).map((row) => normalizeCollaboratorCandidate({
      user_id: row.linked_user_id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      full_name: [row.first_name, row.last_name].filter(Boolean).join(" "),
      company: row.company,
      id: row.id
    }));
  }
  return results;
}

export async function syncProjectCollaboratorsFromSupabase(options = {}) {
  const backendProjectId = options?.projectId
    ? await getResolvedProjectId(options.projectId)
    : await resolveCurrentBackendProjectId().catch(() => "");
  if (!backendProjectId) {
    store.projectForm.collaborators = [];
    return [];
  }
  const rows = await restSelect("project_collaborators_view", {
    select: "id,project_id,collaborator_user_id,project_lot_id,collaborator_email,status,created_at,updated_at,first_name,last_name,full_name,email,company,role_group_code,role_group_label,role_code,role_label",
    project_id: `eq.${backendProjectId}`,
    order: "created_at.asc"
  }).catch(() => []);
  const collaborators = (Array.isArray(rows) ? rows : []).map((row) => normalizeProjectCollaboratorRow(row));
  store.projectForm.collaborators = collaborators;
  dispatchProjectSupabaseSync(store.currentProjectId);
  return collaborators;
}

async function resolveDirectoryPersonId(candidate = {}) {
  const email = firstNonEmpty(candidate.email, "").toLowerCase();
  if (!email) throw new Error("Email collaborateur requis.");
  const existing = await restSelect("directory_people", { select: "id,email,linked_user_id", email_normalized: `eq.${email}`, limit: "1" }).catch(() => []);
  const current = (Array.isArray(existing) ? existing[0] : existing) || null;
  if (current?.id) return current.id;
  const created = await restInsert("directory_people", {
    email,
    first_name: firstNonEmpty(candidate.firstName, "") || null,
    last_name: firstNonEmpty(candidate.lastName, "") || null,
    company: firstNonEmpty(candidate.company, "") || null,
    linked_user_id: normalizeUuid(candidate.userId) || null,
    created_by_user_id: normalizeUuid(store.user?.id) || null
  }, "id,email,linked_user_id");
  return created?.id || "";
}

export async function addProjectCollaboratorToSupabase(payload = {}) {
  const backendProjectId = await resolveCurrentBackendProjectId().catch(() => "");
  if (!backendProjectId) throw new Error("projectId is required");
  const projectLotId = normalizeUuid(payload.projectLotId);
  if (!projectLotId) throw new Error("projectLotId is required");
  const candidate = payload.candidate || payload;
  const personId = await resolveDirectoryPersonId(candidate);
  const row = await restInsert("project_collaborators", {
    project_id: backendProjectId,
    person_id: personId,
    collaborator_user_id: normalizeUuid(candidate.userId) || null,
    collaborator_email: firstNonEmpty(candidate.email, "") || null,
    invited_by_user_id: normalizeUuid(store.user?.id) || null,
    project_lot_id: projectLotId,
    status: "Actif"
  }, "id,project_id,person_id,collaborator_user_id,project_lot_id,collaborator_email,status,created_at,updated_at");
  await syncProjectCollaboratorsFromSupabase({ force: true }).catch(() => undefined);
  return row;
}

export async function deleteProjectCollaboratorFromSupabase(collaboratorId = "") {
  const normalizedCollaboratorId = normalizeUuid(collaboratorId);
  if (!normalizedCollaboratorId) return null;
  const row = await restPatch("project_collaborators", { id: `eq.${normalizedCollaboratorId}` }, { status: "Retiré" }, "id,project_id,status,updated_at");
  await syncProjectCollaboratorsFromSupabase({ force: true }).catch(() => undefined);
  return row;
}

export async function updateProjectCollaboratorRoleInSupabase(collaboratorId = "", projectLotId = "") {
  const normalizedCollaboratorId = normalizeUuid(collaboratorId);
  const normalizedProjectLotId = normalizeUuid(projectLotId);
  if (!normalizedCollaboratorId || !normalizedProjectLotId) return null;
  const row = await restPatch("project_collaborators", { id: `eq.${normalizedCollaboratorId}` }, { project_lot_id: normalizedProjectLotId, status: "Actif" }, "id,project_id,project_lot_id,status,updated_at");
  await syncProjectCollaboratorsFromSupabase({ force: true }).catch(() => undefined);
  return row;
}

export async function persistSubjectIssueActionToSupabase(subject = {}, action = "") {
  const subjectId = normalizeUuid(subject?.id || subject?.raw?.id);
  if (!subjectId) throw new Error("subjectId is required");
  const normalized = String(action || "").trim().toLowerCase();
  const patch = {};
  if (normalized === "issue:reopen") {
    patch.status = "open";
    patch.closure_reason = null;
    patch.closed_at = null;
  } else if (normalized === "issue:close:realized") {
    patch.status = "closed";
    patch.closure_reason = "realized";
    patch.closed_at = new Date().toISOString();
  } else if (normalized === "issue:close:dismissed") {
    patch.status = "closed_invalid";
    patch.closure_reason = "dismissed";
    patch.closed_at = new Date().toISOString();
  } else if (normalized === "issue:close:duplicate") {
    patch.status = "closed_duplicate";
    patch.closure_reason = "duplicate";
    patch.closed_at = new Date().toISOString();
  } else {
    throw new Error(`Action non supportée: ${action}`);
  }
  const row = await restPatch("subjects", { id: `eq.${subjectId}` }, patch, "id,project_id,status,closure_reason,closed_at,updated_at");
  return row;
}
