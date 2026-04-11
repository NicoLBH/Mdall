import { store } from "../store.js";
import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
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
      situationsById: {},
      subjectIdsBySituationId: {}
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
