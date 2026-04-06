import { store } from "../store.js";
import { ensureProjectDocumentsState } from "./project-documents-store.js";
import { ensureProjectAutomationDefaults } from "./project-automation.js";
import { buildSupabaseAuthHeaders, getCurrentUser, getSupabaseUrl, getSupabaseAnonKey } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = getSupabaseAnonKey();
const FRONT_PROJECT_MAP_STORAGE_KEY = "mdall.supabaseProjectMap.v1";
const PROJECT_SUPABASE_SYNC_EVENT = "project:supabase-sync";
const PROJECT_IDENTITY_UPDATED_EVENT = "project:identity-updated";

function safeString(value = "") {
  return String(value ?? "").trim();
}

function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeString(value));
}

function getFrontendProjectKey() {
  return safeString(store.currentProjectId || store.currentProject?.id || "default") || "default";
}

function getCurrentProjectName() {
  return safeString(store.currentProject?.name || store.projectForm?.projectName || "");
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

function writeFrontendProjectMap(map) {
  try {
    localStorage.setItem(FRONT_PROJECT_MAP_STORAGE_KEY, JSON.stringify(map || {}));
  } catch {
    // ignore
  }
}

async function getSupabaseAuthHeaders(extra = {}) {
  return buildSupabaseAuthHeaders(extra);
}

async function restFetch(table, params = new URLSearchParams()) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [key, value] of params.entries()) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${table} fetch failed (${res.status}): ${txt}`);
  }

  return res.json();
}


async function restUpdate(table, match = {}, payload = {}, options = {}) {
  const select = typeof options.select === "string" ? options.select.trim() : "";
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (select) {
    url.searchParams.set("select", select);
  }

  Object.entries(match || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, `eq.${value}`);
  });

  const res = await fetch(url.toString(), {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Prefer: select ? "return=representation" : "return=minimal"
    }),
    body: JSON.stringify(payload || {})
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${table} update failed (${res.status}): ${txt}`);
  }

  if (!select) return null;

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? (rows[0] || null) : rows;
}

async function restInsert(table, payload, options = {}) {
  const select = typeof options.select === "string" ? options.select.trim() : "";
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (select) {
    url.searchParams.set("select", select);
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Prefer: select ? "return=representation" : "return=minimal"
    }),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${table} insert failed (${res.status}): ${txt}`);
  }

  if (!select) return null;

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? (rows[0] || null) : rows;
}

async function rpcCall(functionName, payload = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Accept: "application/json"
    }),
    body: JSON.stringify(payload || {})
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`rpc ${functionName} failed (${res.status}): ${txt}`);
  }

  return res.json().catch(() => null);
}

function ensureSupabaseSyncState() {
  if (!store.projectSupabaseSync || typeof store.projectSupabaseSync !== "object") {
    store.projectSupabaseSync = {
      byFrontendProject: {}
    };
  }

  if (!store.projectSupabaseSync.byFrontendProject || typeof store.projectSupabaseSync.byFrontendProject !== "object") {
    store.projectSupabaseSync.byFrontendProject = {};
  }

  return store.projectSupabaseSync;
}

function getProjectSyncBucket(frontendProjectId = getFrontendProjectKey()) {
  const syncState = ensureSupabaseSyncState();
  const key = safeString(frontendProjectId) || "default";

  if (!syncState.byFrontendProject[key] || typeof syncState.byFrontendProject[key] !== "object") {
    syncState.byFrontendProject[key] = {
      backendProjectId: "",
      subjectCounters: {
        openSujets: 0,
        totalSujets: 0
      },
      documentsLoaded: false,
      actionsLoaded: false,
      subjectsCountLoaded: false,
      lastDocumentsAt: 0,
      lastActionsAt: 0,
      lastSubjectsCountAt: 0
    };
  }

  return syncState.byFrontendProject[key];
}

function dispatchProjectSupabaseSync(detail = {}) {
  window.dispatchEvent(new CustomEvent(PROJECT_SUPABASE_SYNC_EVENT, {
    detail: {
      frontendProjectId: getFrontendProjectKey(),
      ...detail
    }
  }));
}

export { PROJECT_SUPABASE_SYNC_EVENT, PROJECT_IDENTITY_UPDATED_EVENT };

export async function resolveCurrentBackendProjectId(options = {}) {
  const force = Boolean(options.force);
  const frontendProjectId = getFrontendProjectKey();
  const projectBucket = getProjectSyncBucket(frontendProjectId);

  if (!force && projectBucket.backendProjectId) {
    return projectBucket.backendProjectId;
  }

  const explicitCurrentId = safeString(store.currentProjectId || store.currentProject?.id || "");
  if (looksLikeUuid(explicitCurrentId)) {
    projectBucket.backendProjectId = explicitCurrentId;
    return explicitCurrentId;
  }

  const frontendMap = readFrontendProjectMap();
  const mappedId = safeString(frontendMap[frontendProjectId] || "");
  if (mappedId) {
    projectBucket.backendProjectId = mappedId;
    return mappedId;
  }

  const projectName = getCurrentProjectName();
  if (!projectName) return "";

  const params = new URLSearchParams();
  params.set("select", "id,name,created_at");
  params.set("name", `eq.${projectName}`);
  params.set("order", "created_at.desc");
  params.set("limit", "1");

  const rows = await restFetch("projects", params);
  const backendProjectId = safeString(rows?.[0]?.id || "");

  if (backendProjectId) {
    frontendMap[frontendProjectId] = backendProjectId;
    writeFrontendProjectMap(frontendMap);
    projectBucket.backendProjectId = backendProjectId;
  }

  return backendProjectId;
}

function applyProjectIdentityLocally({ frontendProjectId = getFrontendProjectKey(), backendProjectId = "", name = "" } = {}) {
  const nextName = safeString(name);
  const frontendKey = safeString(frontendProjectId);

  let changed = false;

  if (nextName && frontendKey) {
    const currentList = Array.isArray(store.projects) ? store.projects : [];
    const nextProjects = currentList.map((project) => {
      if (safeString(project?.id) !== frontendKey) return project;
      if (safeString(project?.name) === nextName) return project;
      changed = true;
      return { ...project, name: nextName };
    });
    store.projects = nextProjects;
  }

  if (frontendKey && safeString(store.currentProjectId || "") === frontendKey) {
    const currentProject = store.currentProject && typeof store.currentProject === "object"
      ? store.currentProject
      : { id: frontendKey };

    if (nextName && safeString(currentProject.name) !== nextName) {
      store.currentProject = { ...currentProject, name: nextName };
      changed = true;
    } else if (!store.currentProject) {
      store.currentProject = currentProject;
    }

    if (nextName && safeString(store.projectForm?.projectName) !== nextName) {
      store.projectForm.projectName = nextName;
      changed = true;
    }
  }

  if (backendProjectId && frontendKey) {
    const bucket = getProjectSyncBucket(frontendKey);
    if (safeString(bucket.backendProjectId) !== safeString(backendProjectId)) {
      bucket.backendProjectId = safeString(backendProjectId);
      changed = true;
    }

    const frontendMap = readFrontendProjectMap();
    if (safeString(frontendMap[frontendKey]) !== safeString(backendProjectId)) {
      frontendMap[frontendKey] = safeString(backendProjectId);
      writeFrontendProjectMap(frontendMap);
      changed = true;
    }
  }

  return changed;
}

function dispatchProjectIdentityUpdated(detail = {}) {
  window.dispatchEvent(new CustomEvent(PROJECT_IDENTITY_UPDATED_EVENT, {
    detail: {
      frontendProjectId: getFrontendProjectKey(),
      ...detail
    }
  }));
}


function mapProjectRowToCatalogItem(row = {}) {
  return {
    id: safeString(row.id),
    name: safeString(row.name) || "Projet sans nom",
    clientName: safeString(row.project_owner_name) || "—",
    city: safeString(row.city) || "—",
    postalCode: safeString(row.postal_code) || "",
    currentPhase: safeString(row.current_phase_code) || "—",
    description: safeString(row.description || ""),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

function haveSameProjectCatalog(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index] || {};
    const right = b[index] || {};
    if (
      safeString(left.id) !== safeString(right.id)
      || safeString(left.name) !== safeString(right.name)
      || safeString(left.description) !== safeString(right.description)
      || safeString(left.clientName) !== safeString(right.clientName)
      || safeString(left.city) !== safeString(right.city)
      || safeString(left.currentPhase) !== safeString(right.currentPhase)
      || safeString(left.updatedAt) !== safeString(right.updatedAt)
    ) {
      return false;
    }
  }
  return true;
}

export async function syncProjectsCatalogFromSupabase() {
  const params = new URLSearchParams();
  params.set("select", "id,name,description,postal_code,city,project_owner_name,current_phase_code,created_at,updated_at");
  params.set("archived_at", "is.null");
  params.set("order", "updated_at.desc.nullslast,created_at.desc");

  const rows = await restFetch("projects", params);
  const nextProjects = (Array.isArray(rows) ? rows : [])
    .map(mapProjectRowToCatalogItem)
    .filter((project) => safeString(project.id));

  const currentProjects = Array.isArray(store.projects) ? store.projects : [];
  const changed = !haveSameProjectCatalog(currentProjects, nextProjects);

  if (changed) {
    store.projects = nextProjects;

    const activeProjectId = safeString(store.currentProjectId || store.currentProject?.id || "");
    const activeProject = nextProjects.find((project) => safeString(project.id) === activeProjectId) || null;

    if (activeProject) {
      store.currentProject = { ...activeProject };
      store.projectForm.projectName = activeProject.name;
    } else if (!nextProjects.length) {
      store.currentProject = null;
      if (!activeProjectId) {
        store.currentProjectId = null;
      }
    }

    dispatchProjectIdentityUpdated({
      section: "projects",
      projectsCount: nextProjects.length
    });
  }

  return Array.isArray(store.projects) ? store.projects : [];
}

export async function syncKnownProjectNamesFromSupabase() {
  const frontendMap = readFrontendProjectMap();
  const entries = Object.entries(frontendMap).filter(([frontendProjectId, backendProjectId]) => (
    safeString(frontendProjectId) && looksLikeUuid(backendProjectId)
  ));

  if (!entries.length) return Array.isArray(store.projects) ? store.projects : [];

  const backendIds = [...new Set(entries.map(([, backendProjectId]) => safeString(backendProjectId)).filter(Boolean))];
  if (!backendIds.length) return Array.isArray(store.projects) ? store.projects : [];

  const params = new URLSearchParams();
  params.set("select", "id,name");
  params.set("id", `in.(${backendIds.join(",")})`);

  const rows = await restFetch("projects", params);
  const rowsById = new Map((Array.isArray(rows) ? rows : []).map((row) => [safeString(row?.id), row]));

  let changed = false;
  entries.forEach(([frontendProjectId, backendProjectId]) => {
    const row = rowsById.get(safeString(backendProjectId));
    if (!row) return;
    changed = applyProjectIdentityLocally({
      frontendProjectId,
      backendProjectId,
      name: row.name
    }) || changed;
  });

  if (changed) {
    dispatchProjectIdentityUpdated({
      section: "projects",
      projectsCount: Array.isArray(store.projects) ? store.projects.length : 0
    });
  }

  return store.projects;
}

export async function syncCurrentProjectIdentityFromSupabase(options = {}) {
  const backendProjectId = await resolveCurrentBackendProjectId(options);
  if (!backendProjectId) return null;

  const params = new URLSearchParams();
  params.set("select", "id,name");
  params.set("id", `eq.${backendProjectId}`);
  params.set("limit", "1");

  const rows = await restFetch("projects", params);
  const row = Array.isArray(rows) ? (rows[0] || null) : null;
  if (!row) return null;

  const changed = applyProjectIdentityLocally({
    frontendProjectId: getFrontendProjectKey(),
    backendProjectId,
    name: row.name
  });

  if (changed) {
    dispatchProjectIdentityUpdated({
      section: "project",
      backendProjectId,
      projectName: safeString(row.name)
    });
  }

  return row;
}

export async function createProjectWithDefaultPhases(payload = {}) {
  const row = await rpcCall("create_project_with_default_phases", {
    p_project_name: safeString(payload.projectName),
    p_description: safeString(payload.description) || null,
    p_city: safeString(payload.city),
    p_postal_code: safeString(payload.postalCode),
    p_department_code: safeString(payload.departmentCode),
    p_project_owner_name: safeString(payload.clientName),
    p_current_phase_code: safeString(payload.currentPhaseCode || "PC") || "PC"
  });

  const project = mapProjectRowToCatalogItem(row || {});
  if (!safeString(project.id)) {
    throw new Error("Project creation returned an empty payload.");
  }

  const currentProjects = Array.isArray(store.projects) ? store.projects : [];
  const hasProject = currentProjects.some((item) => safeString(item.id) === safeString(project.id));
  store.projects = hasProject
    ? currentProjects.map((item) => safeString(item.id) === safeString(project.id) ? { ...item, ...project } : item)
    : [project, ...currentProjects];

  applyProjectIdentityLocally({
    frontendProjectId: project.id,
    backendProjectId: project.id,
    name: project.name
  });

  dispatchProjectIdentityUpdated({
    section: "projects",
    backendProjectId: project.id,
    projectName: project.name,
    projectsCount: store.projects.length
  });

  return project;
}

export async function persistCurrentProjectNameToSupabase(nextProjectName) {
  const trimmedName = safeString(nextProjectName).trim();
  const fallbackName = trimmedName || "Projet demo";
  const frontendProjectId = getFrontendProjectKey();

  applyProjectIdentityLocally({
    frontendProjectId,
    name: fallbackName
  });
  dispatchProjectIdentityUpdated({
    section: "project",
    projectName: fallbackName,
    optimistic: true
  });

  const backendProjectId = await resolveCurrentBackendProjectId();
  if (!backendProjectId) {
    throw new Error("Unable to resolve backend project id before updating project name.");
  }

  const updatedProject = await restUpdate(
    "projects",
    { id: backendProjectId },
    { name: fallbackName },
    { select: "id,name,updated_at" }
  );

  applyProjectIdentityLocally({
    frontendProjectId,
    backendProjectId,
    name: updatedProject?.name || fallbackName
  });
  dispatchProjectIdentityUpdated({
    section: "project",
    backendProjectId,
    projectName: safeString(updatedProject?.name || fallbackName)
  });

  return updatedProject;
}

function formatDocumentUpdatedAt(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function buildStoragePublicUrl(bucket, path) {
  const safeBucket = safeString(bucket);
  const safePath = safeString(path);
  if (!safeBucket || !safePath) return "";
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(safeBucket)}/${safePath.split("/").map(encodeURIComponent).join("/")}`;
}

function mapDocumentRowToViewModel(row = {}) {
  const displayName = safeString(row.original_filename || row.filename || "Document");
  const mimeType = safeString(row.mime_type || "");

  return {
    id: safeString(row.id),
    name: displayName,
    title: displayName,
    note: safeString(row.document_kind || row.upload_status || "Document prêt pour l'analyse"),
    phaseCode: safeString(store.projectForm?.currentPhase || store.projectForm?.phase || ""),
    phaseLabel: "",
    updatedAt: formatDocumentUpdatedAt(row.updated_at || row.created_at),
    createdAt: row.created_at || null,
    fileName: displayName,
    kind: "file",
    mimeType,
    previewUrl: "",
    localPreviewUrl: "",
    localFile: null,
    extension: displayName.includes(".") ? displayName.split(".").pop().toLowerCase() : "",
    storageBucket: safeString(row.storage_bucket),
    storagePath: safeString(row.storage_path),
    uploadStatus: safeString(row.upload_status)
  };
}

function mapRunRowToLogEntry(row = {}) {
  const startedAt = row.started_at || row.created_at || new Date().toISOString();
  const endedAt = row.finished_at || null;
  const lifecycleStatus = String(row.status || "queued").toLowerCase() === "running"
    ? "running"
    : "completed";

  const outcomeStatus = String(row.status || "").toLowerCase() === "succeeded"
    ? "success"
    : (["failed", "canceled"].includes(String(row.status || "").toLowerCase()) ? "error" : null);

  const documentMeta = Array.isArray(row.documents) ? row.documents[0] : row.documents;
  const documentName = safeString(documentMeta?.original_filename || documentMeta?.filename || "");
  const triggerType = safeString(row.trigger_source || "manual");
  const triggerLabel = triggerType === "document-upload"
    ? "Dépôt de document"
    : triggerType === "automatic"
      ? "Déclenchement automatique"
      : "Lancement manuel";

  return {
    id: safeString(row.id),
    name: "Analyse de document",
    kind: "analysis",
    agentKey: safeString(row.llm_model ? "parasismique" : "parasismique"),
    lifecycleStatus,
    outcomeStatus,
    status: lifecycleStatus,
    triggerType,
    triggerLabel,
    trigger: {
      type: triggerType,
      label: triggerLabel
    },
    documentName,
    subject: {
      documentName
    },
    startedAt,
    endedAt,
    durationMs: endedAt ? Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime()) : null,
    summary: safeString(row.error_message || row.status || ""),
    details: null,
    createdAt: row.created_at || startedAt,
    updatedAt: row.updated_at || endedAt || startedAt
  };
}

export async function syncProjectDocumentsFromSupabase(options = {}) {
  const force = Boolean(options.force);
  const frontendProjectId = getFrontendProjectKey();
  const projectBucket = getProjectSyncBucket(frontendProjectId);
  const backendProjectId = await resolveCurrentBackendProjectId();

  ensureProjectDocumentsState();

  if (!backendProjectId) {
    store.projectDocuments.items = [];
    store.projectDocuments.activeDocumentId = null;
    projectBucket.documentsLoaded = true;
    dispatchProjectSupabaseSync({ section: "documents", documentsCount: 0 });
    return [];
  }

  if (!force && projectBucket.documentsLoaded && Array.isArray(store.projectDocuments?.items) && store.projectDocuments.items.length) {
    return store.projectDocuments.items;
  }

  const params = new URLSearchParams();
  params.set("select", "id,filename,original_filename,mime_type,storage_bucket,storage_path,document_kind,upload_status,created_at,updated_at");
  params.set("project_id", `eq.${backendProjectId}`);
  params.set("deleted_at", "is.null");
  params.set("order", "created_at.desc");

  const rows = await restFetch("documents", params);
  const nextItems = (Array.isArray(rows) ? rows : []).map(mapDocumentRowToViewModel);

  store.projectDocuments.items = nextItems;
  store.projectDocuments.activeDocumentId = nextItems[0]?.id || null;
  projectBucket.backendProjectId = backendProjectId;
  projectBucket.documentsLoaded = true;
  projectBucket.lastDocumentsAt = Date.now();

  dispatchProjectSupabaseSync({ section: "documents", documentsCount: nextItems.length });
  return nextItems;
}

export async function syncProjectActionsFromSupabase(options = {}) {
  const force = Boolean(options.force);
  const frontendProjectId = getFrontendProjectKey();
  const projectBucket = getProjectSyncBucket(frontendProjectId);
  const backendProjectId = await resolveCurrentBackendProjectId();

  ensureProjectAutomationDefaults();

  if (!backendProjectId) {
    store.projectAutomation.runLog = [];
    projectBucket.actionsLoaded = true;
    dispatchProjectSupabaseSync({ section: "actions", actionsCount: 0 });
    return [];
  }

  if (!force && projectBucket.actionsLoaded && Array.isArray(store.projectAutomation?.runLog) && store.projectAutomation.runLog.length) {
    return store.projectAutomation.runLog;
  }

  const params = new URLSearchParams();
  params.set("select", "id,status,trigger_source,started_at,finished_at,created_at,updated_at,error_message,llm_model,document_id,documents(id,original_filename,filename)");
  params.set("project_id", `eq.${backendProjectId}`);
  params.set("order", "created_at.desc");

  const rows = await restFetch("analysis_runs", params);
  const nextItems = (Array.isArray(rows) ? rows : []).map(mapRunRowToLogEntry);

  store.projectAutomation.runLog = nextItems;
  projectBucket.backendProjectId = backendProjectId;
  projectBucket.actionsLoaded = true;
  projectBucket.lastActionsAt = Date.now();

  dispatchProjectSupabaseSync({ section: "actions", actionsCount: nextItems.length });
  return nextItems;
}

export async function syncProjectSubjectCountersFromSupabase(options = {}) {
  const force = Boolean(options.force);
  const frontendProjectId = getFrontendProjectKey();
  const projectBucket = getProjectSyncBucket(frontendProjectId);
  const backendProjectId = await resolveCurrentBackendProjectId();

  if (!backendProjectId) {
    projectBucket.subjectCounters = { openSujets: 0, totalSujets: 0 };
    projectBucket.subjectsCountLoaded = true;
    dispatchProjectSupabaseSync({ section: "subjects", subjectCounters: projectBucket.subjectCounters });
    return projectBucket.subjectCounters;
  }

  if (!force && projectBucket.subjectsCountLoaded) {
    return projectBucket.subjectCounters;
  }

  const params = new URLSearchParams();
  params.set("select", "id,status,parent_subject_id");
  params.set("project_id", `eq.${backendProjectId}`);
  params.set("order", "created_at.asc");

  const rows = await restFetch("subjects", params);
  const topLevelRows = (Array.isArray(rows) ? rows : []).filter((row) => !safeString(row.parent_subject_id));
  const openSujets = topLevelRows.filter((row) => !String(row.status || "open").toLowerCase().startsWith("closed")).length;
  const totalSujets = topLevelRows.length;

  projectBucket.backendProjectId = backendProjectId;
  projectBucket.subjectCounters = { openSujets, totalSujets };
  projectBucket.subjectsCountLoaded = true;
  projectBucket.lastSubjectsCountAt = Date.now();

  dispatchProjectSupabaseSync({ section: "subjects", subjectCounters: projectBucket.subjectCounters });
  return projectBucket.subjectCounters;
}


function mapIssueActionToSubjectUpdate(action) {
  const normalizedAction = safeString(action);

  switch (normalizedAction) {
    case "issue:reopen":
      return {
        status: "open",
        closure_reason: null,
        closed_at: null,
        history: {
          event_type: "subject_reopened",
          title: "Sujet rouvert",
          description: "Le sujet a été rouvert depuis l’interface Mdall."
        }
      };
    case "issue:close:realized":
      return {
        status: "closed",
        closure_reason: "realized",
        closed_at: new Date().toISOString(),
        history: {
          event_type: "subject_closed",
          title: "Sujet fermé comme réalisé",
          description: "Le sujet a été marqué comme réalisé depuis l’interface Mdall."
        }
      };
    case "issue:close:dismissed":
      return {
        status: "closed_invalid",
        closure_reason: "non_pertinent",
        closed_at: new Date().toISOString(),
        history: {
          event_type: "subject_closed",
          title: "Sujet fermé comme non pertinent",
          description: "Le sujet a été marqué comme non pertinent depuis l’interface Mdall."
        }
      };
    case "issue:close:duplicate":
      return {
        status: "closed_duplicate",
        closure_reason: "duplicate",
        closed_at: new Date().toISOString(),
        history: {
          event_type: "subject_marked_duplicate",
          title: "Sujet fermé comme dupliqué",
          description: "Le sujet a été marqué comme dupliqué depuis l’interface Mdall."
        }
      };
    default:
      return null;
  }
}

export async function persistSubjectIssueActionToSupabase(subject = {}, action = "") {
  const actionConfig = mapIssueActionToSubjectUpdate(action);
  const subjectId = safeString(subject?.id || subject?.raw?.id || "");
  const projectId = safeString(subject?.raw?.project_id || subject?.project_id || "");
  const analysisRunId = safeString(subject?.raw?.analysis_run_id || subject?.analysis_run_id || "");
  const documentId = safeString(subject?.raw?.document_id || subject?.document_id || "");
  const situationId = safeString(subject?.raw?.situation_id || subject?.situation_id || "");

  if (!actionConfig) {
    throw new Error(`Unsupported subject issue action: ${action}`);
  }

  if (!subjectId) {
    throw new Error("Subject id missing for Supabase status update.");
  }

  const updatedSubject = await restUpdate(
    "subjects",
    { id: subjectId },
    {
      status: actionConfig.status,
      closure_reason: actionConfig.closure_reason,
      closed_at: actionConfig.closed_at
    },
    {
      select: "id,status,closure_reason,closed_at,updated_at"
    }
  );

  if (projectId) {
    await restInsert("subject_history", {
      project_id: projectId,
      subject_id: subjectId,
      analysis_run_id: analysisRunId || null,
      document_id: documentId || null,
      event_type: actionConfig.history.event_type,
      actor_type: "user",
      actor_label: String((await getCurrentUser())?.email || "Mdall"),
      actor_user_id: (await getCurrentUser())?.id || null,
      title: actionConfig.history.title,
      description: actionConfig.history.description,
      event_payload: {
        source: "mdall_frontend",
        action: safeString(action),
        previous_status: safeString(subject?.raw?.status || subject?.status || ""),
        new_status: actionConfig.status,
        closure_reason: actionConfig.closure_reason
      }
    });
  }

  if (situationId) {
    try {
      await rpcCall("refresh_situation_progress", {
        p_situation_id: situationId
      });
    } catch (error) {
      console.warn("refresh_situation_progress failed", error);
    }
  }

  const frontendProjectId = getFrontendProjectKey();
  const projectBucket = getProjectSyncBucket(frontendProjectId);
  projectBucket.subjectsCountLoaded = false;
  projectBucket.lastSubjectsCountAt = 0;
  await syncProjectSubjectCountersFromSupabase({ force: true });

  dispatchProjectSupabaseSync({
    section: "subjects",
    subjectId,
    action: safeString(action),
    status: actionConfig.status
  });

  return updatedSubject;
}

export function getCurrentProjectSubjectCounters() {
  const frontendProjectId = getFrontendProjectKey();
  const bucket = getProjectSyncBucket(frontendProjectId);
  return {
    openSujets: Number(bucket.subjectCounters?.openSujets || 0),
    totalSujets: Number(bucket.subjectCounters?.totalSujets || 0)
  };
}
