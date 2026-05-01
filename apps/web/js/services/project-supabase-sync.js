import { store } from "../store.js";
import { ensureProjectDocumentsState } from "./project-documents-store.js";
import { ensureProjectAutomationDefaults } from "./project-automation.js";
import { supabase, buildSupabaseAuthHeaders, getCurrentUser, getSupabaseUrl, getSupabaseAnonKey } from "../../assets/js/auth.js";
import { resolveAvatarUrl } from "./avatar-url.js";

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

function buildHeadersWithGuaranteedApiKey(baseHeaders = {}, extra = {}) {
  const headers = new Headers();

  const applyEntries = (source = {}) => {
    if (!source) return;
    if (source instanceof Headers) {
      source.forEach((value, key) => {
        if (value === undefined || value === null || value === "") return;
        headers.set(key, value);
      });
      return;
    }

    Object.entries(source).forEach(([key, value]) => {
      if (!key || value === undefined || value === null || value === "") return;
      headers.set(key, value);
    });
  };

  applyEntries(baseHeaders);
  applyEntries(extra);

  if (!headers.get("apikey") && SUPABASE_ANON_KEY) {
    headers.set("apikey", SUPABASE_ANON_KEY);
  }

  return headers;
}

async function getSupabaseAuthHeaders(extra = {}) {
  let baseHeaders = null;

  try {
    baseHeaders = await buildSupabaseAuthHeaders(extra);
  } catch {
    baseHeaders = null;
  }

  const headers = buildHeadersWithGuaranteedApiKey(baseHeaders, extra);
  const hasAuthorization = Boolean(headers.get("authorization") || headers.get("Authorization"));

  if (!hasAuthorization) {
    let session = null;
    const sessionResult = await supabase.auth.getSession().catch(() => null);
    session = sessionResult?.data?.session || null;

    if (!session?.access_token && session?.refresh_token) {
      const refreshResult = await supabase.auth.refreshSession().catch(() => null);
      session = refreshResult?.data?.session || session;
    }

    const accessToken = String(session?.access_token || "").trim();
    if (!accessToken) {
      throw new Error("Session utilisateur introuvable. Reconnectez-vous puis réessayez.");
    }

    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

async function restFetch(table, params = new URLSearchParams()) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [key, value] of params.entries()) {
    url.searchParams.set(key, value);
  }

  const result = await fetchSupabaseRest(url.toString(), {
    method: "GET",
    headers: await getSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  const res = result?.response || result;
  const txt = result?.responseText;

  if (!res.ok) {
    throw new Error(`${table} fetch failed (${res.status}): ${txt ?? ""}`);
  }

  return res.json();
}

function shouldRetryMissingApiKeyResponse(status, responseText = "") {
  return Number(status) === 403 && /No API key found in request/i.test(String(responseText || ""));
}

async function fetchSupabaseRest(url, init = {}) {
  const response = await fetch(url, init);
  if (response.ok) return response;

  const responseText = await response.text().catch(() => "");
  if (!shouldRetryMissingApiKeyResponse(response.status, responseText)) {
    return { response, responseText };
  }

  const retryHeaders = await getSupabaseAuthHeaders(init?.headers || {});
  const retriedResponse = await fetch(url, {
    ...init,
    headers: retryHeaders
  });

  if (retriedResponse.ok) return retriedResponse;
  const retriedText = await retriedResponse.text().catch(() => "");
  return { response: retriedResponse, responseText: retriedText };
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

  const result = await fetchSupabaseRest(url.toString(), {
    method: "PATCH",
    headers: await getSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Prefer: select ? "return=representation" : "return=minimal"
    }),
    body: JSON.stringify(payload || {})
  });

  const res = result?.response || result;
  const txt = result?.responseText;

  if (!res.ok) {
    throw new Error(`${table} update failed (${res.status}): ${txt ?? ""}`);
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

  const result = await fetchSupabaseRest(url.toString(), {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Prefer: select ? "return=representation" : "return=minimal"
    }),
    body: JSON.stringify(payload)
  });

  const res = result?.response || result;
  const txt = result?.responseText;

  if (!res.ok) {
    throw new Error(`${table} insert failed (${res.status}): ${txt ?? ""}`);
  }

  if (!select) return null;

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? (rows[0] || null) : rows;
}


async function restDelete(table, match = {}, options = {}) {
  const select = typeof options.select === "string" ? options.select.trim() : "";
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (select) {
    url.searchParams.set("select", select);
  }

  Object.entries(match || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, `eq.${value}`);
  });

  const result = await fetchSupabaseRest(url.toString(), {
    method: "DELETE",
    headers: await getSupabaseAuthHeaders({
      Prefer: select ? "return=representation" : "return=minimal"
    })
  });

  const res = result?.response || result;
  const txt = result?.responseText;

  if (!res.ok) {
    throw new Error(`${table} delete failed (${res.status}): ${txt ?? ""}`);
  }

  if (!select) return null;

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? (rows[0] || null) : rows;
}

async function rpcCall(functionName, payload = {}) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  const result = await fetchSupabaseRest(url, {
    method: "POST",
    headers: await getSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Accept: "application/json"
    }),
    body: JSON.stringify(payload || {})
  });

  const res = result?.response || result;
  const txt = result?.responseText;

  if (!res.ok) {
    throw new Error(`rpc ${functionName} failed (${res.status}): ${txt ?? ""}`);
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
      lotsLoaded: false,
      collaboratorsLoaded: false,
      lastDocumentsAt: 0,
      lastActionsAt: 0,
      lastSubjectsCountAt: 0,
      lastLotsAt: 0,
      lastCollaboratorsAt: 0
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

  const frontendMap = readFrontendProjectMap();
  const mappedId = safeString(frontendMap[frontendProjectId] || "");
  if (looksLikeUuid(mappedId)) {
    projectBucket.backendProjectId = mappedId;
    return mappedId;
  }

  const explicitBackendId = [
    store.currentProject?.backendProjectId,
    store.currentProject?.backend_project_id,
    store.currentProject?.supabaseProjectId,
    store.currentProject?.supabase_project_id,
    store.projectForm?.backendProjectId,
    store.projectForm?.backend_project_id
  ].map((value) => safeString(value)).find((value) => looksLikeUuid(value));

  if (explicitBackendId) {
    frontendMap[frontendProjectId] = explicitBackendId;
    writeFrontendProjectMap(frontendMap);
    projectBucket.backendProjectId = explicitBackendId;
    return explicitBackendId;
  }

  const explicitCurrentId = safeString(store.currentProjectId || store.currentProject?.id || "");
  if (looksLikeUuid(explicitCurrentId)) {
    const idParams = new URLSearchParams();
    idParams.set("select", "id");
    idParams.set("id", `eq.${explicitCurrentId}`);
    idParams.set("limit", "1");

    const idRows = await restFetch("projects", idParams).catch(() => []);
    const verifiedBackendId = safeString(idRows?.[0]?.id || "");

    if (looksLikeUuid(verifiedBackendId)) {
      frontendMap[frontendProjectId] = verifiedBackendId;
      writeFrontendProjectMap(frontendMap);
      projectBucket.backendProjectId = verifiedBackendId;
      return verifiedBackendId;
    }
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

function applyProjectIdentityLocally({
  frontendProjectId = getFrontendProjectKey(),
  backendProjectId = "",
  name = "",
  createdAt = null
} = {}) {
  const nextName = safeString(name);
  const frontendKey = safeString(frontendProjectId);
  const nextCreatedAt = safeString(createdAt);

  let changed = false;

  if ((nextName || nextCreatedAt) && frontendKey) {
    const currentList = Array.isArray(store.projects) ? store.projects : [];
    const nextProjects = currentList.map((project) => {
      if (safeString(project?.id) !== frontendKey) return project;
      const sameName = !nextName || safeString(project?.name) === nextName;
      const sameCreatedAt = !nextCreatedAt || safeString(project?.createdAt || project?.created_at) === nextCreatedAt;
      if (sameName && sameCreatedAt) return project;
      changed = true;
      return {
        ...project,
        ...(nextName ? { name: nextName } : {}),
        ...(nextCreatedAt ? { createdAt: nextCreatedAt, created_at: nextCreatedAt } : {})
      };
    });
    store.projects = nextProjects;
  }

  if (frontendKey && safeString(store.currentProjectId || "") === frontendKey) {
    const currentProject = store.currentProject && typeof store.currentProject === "object"
      ? store.currentProject
      : { id: frontendKey };

    const currentProjectCreatedAt = safeString(currentProject?.created_at || currentProject?.createdAt);
    if ((nextName && safeString(currentProject.name) !== nextName)
      || (nextCreatedAt && currentProjectCreatedAt !== nextCreatedAt)) {
      store.currentProject = {
        ...currentProject,
        ...(nextName ? { name: nextName } : {}),
        ...(nextCreatedAt ? { created_at: nextCreatedAt, createdAt: nextCreatedAt } : {})
      };
      changed = true;
    } else if (!store.currentProject) {
      store.currentProject = currentProject;
    }

    if (nextName && safeString(store.projectForm?.projectName) !== nextName) {
      store.projectForm.projectName = nextName;
      changed = true;
    }
    if (nextCreatedAt) {
      if (!store.projectForm.project || typeof store.projectForm.project !== "object") {
        store.projectForm.project = {};
      }
      if (safeString(store.projectForm.project.created_at) !== nextCreatedAt) {
        store.projectForm.project.created_at = nextCreatedAt;
        changed = true;
      }
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
    ownerId: safeString(row.owner_id || ""),
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
      || safeString(left.ownerId) !== safeString(right.ownerId)
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
  params.set("select", "id,name,description,postal_code,city,project_owner_name,current_phase_code,owner_id,created_at,updated_at");
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
  params.set("select", "id,name,created_at");
  params.set("id", `eq.${backendProjectId}`);
  params.set("limit", "1");

  const rows = await restFetch("projects", params);
  const row = Array.isArray(rows) ? (rows[0] || null) : null;
  if (!row) return null;

  const changed = applyProjectIdentityLocally({
    frontendProjectId: getFrontendProjectKey(),
    backendProjectId,
    name: row.name,
    createdAt: row.created_at || null
  });

  if (changed) {
    dispatchProjectIdentityUpdated({
      section: "project",
      backendProjectId,
      projectName: safeString(row.name),
      createdAt: row.created_at || null
    });
  }

  return row;
}

export async function createProjectWithDefaultPhases(payload = {}) {
  const rpcPayload = {
    p_project_name: safeString(payload.projectName),
    p_description: safeString(payload.description) || null,
    p_city: safeString(payload.city),
    p_postal_code: safeString(payload.postalCode),
    p_department_code: safeString(payload.departmentCode),
    p_project_owner_name: safeString(payload.clientName),
    p_current_phase_code: safeString(payload.currentPhaseCode || "PC") || "PC"
  };

  let row;
  try {
    row = await rpcCall("create_project_with_default_phases", rpcPayload);
  } catch (error) {
    const message = safeString(error?.message || "");
    const missingDepartmentSignature = message.includes("create_project_with_default_phases")
      && message.includes("p_department_code")
      && (message.includes("PGRST202") || message.includes("Could not find the function"));

    if (!missingDepartmentSignature) {
      throw error;
    }

    const { p_department_code, ...legacyRpcPayload } = rpcPayload;
    row = await rpcCall("create_project_with_default_phases", legacyRpcPayload);
  }

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
  const documentKind = safeString(row.document_kind || "");

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
    uploadStatus: safeString(row.upload_status),
    documentKind
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

function ensureBackendProjectIdOrThrow(projectId = "") {
  const normalizedProjectId = safeString(projectId);
  if (!normalizedProjectId) {
    throw new Error("Project id is required.");
  }

  return normalizedProjectId;
}

export async function listDocumentFolders(projectId = "") {
  const backendProjectId = ensureBackendProjectIdOrThrow(projectId);
  console.info("[documents-folders] list.start", { projectId: backendProjectId, parentFolderId: null });

  try {
    const params = new URLSearchParams();
    params.set("select", "id,project_id,parent_folder_id,name,created_at,updated_at,created_by");
    params.set("project_id", `eq.${backendProjectId}`);
    params.set("order", "name.asc");
    const rows = await restFetch("project_document_folders", params);
    const items = Array.isArray(rows) ? rows : [];
    console.info("[documents-folders] list.success", { projectId: backendProjectId, count: items.length, parentFolderId: null });
    return items;
  } catch (error) {
    console.error("[documents-folders] failure", { action: "listDocumentFolders", projectId: backendProjectId, error: error instanceof Error ? error.message : String(error || "") });
    throw error;
  }
}

export async function listDocumentFolderChildren(projectId = "", parentFolderId = null) {
  const backendProjectId = ensureBackendProjectIdOrThrow(projectId);
  const normalizedParentFolderId = safeString(parentFolderId || "") || null;
  console.info("[documents-folders] list.start", { projectId: backendProjectId, parentFolderId: normalizedParentFolderId });

  try {
    const params = new URLSearchParams();
    params.set("select", "id,project_id,parent_folder_id,name,created_at,updated_at,created_by");
    params.set("project_id", `eq.${backendProjectId}`);
    if (normalizedParentFolderId) {
      params.set("parent_folder_id", `eq.${normalizedParentFolderId}`);
    } else {
      params.set("parent_folder_id", "is.null");
    }
    params.set("order", "name.asc");
    const rows = await restFetch("project_document_folders", params);
    const items = Array.isArray(rows) ? rows : [];
    console.info("[documents-folders] list.success", { projectId: backendProjectId, count: items.length, parentFolderId: normalizedParentFolderId });
    return items;
  } catch (error) {
    console.error("[documents-folders] failure", { action: "listDocumentFolderChildren", projectId: backendProjectId, parentFolderId: normalizedParentFolderId, error: error instanceof Error ? error.message : String(error || "") });
    throw error;
  }
}

export async function createDocumentFolder(projectId = "", parentFolderId = null, name = "") {
  const backendProjectId = ensureBackendProjectIdOrThrow(projectId);
  const normalizedParentFolderId = safeString(parentFolderId || "") || null;
  const normalizedName = safeString(name);
  if (!normalizedName) throw new Error("Folder name is required.");
  console.info("[documents-folders] create.start", { projectId: backendProjectId, parentFolderId: normalizedParentFolderId, name: normalizedName });

  try {
    return await restInsert("project_document_folders", {
      project_id: backendProjectId,
      parent_folder_id: normalizedParentFolderId,
      name: normalizedName
    }, {
      select: "id,project_id,parent_folder_id,name,created_at,updated_at,created_by"
    });
  } catch (error) {
    console.error("[documents-folders] failure", { action: "createDocumentFolder", projectId: backendProjectId, parentFolderId: normalizedParentFolderId, error: error instanceof Error ? error.message : String(error || "") });
    throw error;
  }
}

export async function renameDocumentFolder(projectId = "", folderId = "", name = "") {
  const backendProjectId = ensureBackendProjectIdOrThrow(projectId);
  const normalizedFolderId = safeString(folderId);
  const normalizedName = safeString(name);
  if (!normalizedFolderId) throw new Error("Folder id is required.");
  if (!normalizedName) throw new Error("Folder name is required.");
  console.info("[documents-folders] rename.start", { projectId: backendProjectId, folderId: normalizedFolderId, name: normalizedName });

  try {
    const updated = await restUpdate("project_document_folders", {
      id: normalizedFolderId,
      project_id: backendProjectId
    }, {
      name: normalizedName
    }, {
      select: "id,project_id,parent_folder_id,name,created_at,updated_at,created_by"
    });
    if (!updated) {
      throw new Error("Folder not found or update not allowed.");
    }
    return updated;
  } catch (error) {
    console.error("[documents-folders] failure", { action: "renameDocumentFolder", projectId: backendProjectId, folderId: normalizedFolderId, error: error instanceof Error ? error.message : String(error || "") });
    throw error;
  }
}

export async function getDocumentFolderPath(projectId = "", folderId = null) {
  const backendProjectId = ensureBackendProjectIdOrThrow(projectId);
  const normalizedFolderId = safeString(folderId || "") || null;
  if (!normalizedFolderId) return [];

  const folders = await listDocumentFolders(backendProjectId);
  const foldersById = new Map(folders.map((folder) => [safeString(folder.id), folder]));
  const breadcrumb = [];
  let cursorId = normalizedFolderId;

  while (cursorId) {
    const folder = foldersById.get(cursorId);
    if (!folder || safeString(folder.project_id) !== backendProjectId) break;
    breadcrumb.unshift(folder);
    const nextCursor = safeString(folder.parent_folder_id || "");
    if (!nextCursor || nextCursor === cursorId) break;
    cursorId = nextCursor;
  }

  return breadcrumb;
}

export async function listDocumentDirectory(projectId = "", folderId = null) {
  const backendProjectId = ensureBackendProjectIdOrThrow(projectId);
  const normalizedFolderId = safeString(folderId || "") || null;
  console.info("[documents-folders] list.start", { projectId: backendProjectId, folderId: normalizedFolderId });

  try {
    const [allFolders, breadcrumb] = await Promise.all([
      listDocumentFolders(backendProjectId),
      getDocumentFolderPath(backendProjectId, normalizedFolderId)
    ]);
    const currentFolder = normalizedFolderId
      ? (allFolders.find((folder) => safeString(folder.id) === normalizedFolderId) || null)
      : null;
    const folders = allFolders.filter((folder) => safeString(folder.parent_folder_id || "") === safeString(normalizedFolderId || ""));

    const fileParams = new URLSearchParams();
    fileParams.set("select", "id,project_id,folder_id,filename,original_filename,mime_type,storage_bucket,storage_path,document_kind,upload_status,created_at,updated_at,deleted_at");
    fileParams.set("project_id", `eq.${backendProjectId}`);
    fileParams.set("deleted_at", "is.null");
    if (normalizedFolderId) {
      fileParams.set("folder_id", `eq.${normalizedFolderId}`);
    } else {
      fileParams.set("folder_id", "is.null");
    }
    fileParams.set("order", "created_at.desc");

    const fileRows = await restFetch("documents", fileParams);
    const files = (Array.isArray(fileRows) ? fileRows : []).map(mapDocumentRowToViewModel);
    console.info("[documents-folders] list.success", { projectId: backendProjectId, folderId: normalizedFolderId, foldersCount: folders.length, filesCount: files.length });

    return {
      currentFolder,
      breadcrumb,
      folders,
      files
    };
  } catch (error) {
    console.error("[documents-folders] failure", { action: "listDocumentDirectory", projectId: backendProjectId, folderId: normalizedFolderId, error: error instanceof Error ? error.message : String(error || "") });
    throw error;
  }
}

export async function moveDocumentFile(projectId = "", fileId = "", targetFolderId = null) {
  const backendProjectId = ensureBackendProjectIdOrThrow(projectId);
  const normalizedFileId = safeString(fileId);
  const normalizedTargetFolderId = safeString(targetFolderId || "") || null;
  if (!normalizedFileId) throw new Error("File id is required.");
  console.info("[documents-files] move.start", { projectId: backendProjectId, fileId: normalizedFileId, targetFolderId: normalizedTargetFolderId });

  try {
    const payload = await rpcCall("move_project_document_file", {
      file_id: normalizedFileId,
      target_folder_id: normalizedTargetFolderId
    });
    const moved = Array.isArray(payload) ? (payload[0] || null) : payload;
    if (!moved) {
      throw new Error("No row returned by move_project_document_file.");
    }
    if (safeString(moved.project_id) !== backendProjectId) {
      throw new Error("Moved file does not belong to the requested project.");
    }
    console.info("[documents-files] move.success", { projectId: backendProjectId, fileId: normalizedFileId, targetFolderId: normalizedTargetFolderId });
    return moved;
  } catch (error) {
    console.error("[documents-files] move.failure", { projectId: backendProjectId, fileId: normalizedFileId, targetFolderId: normalizedTargetFolderId, error: error instanceof Error ? error.message : String(error || "") });
    throw error;
  }
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
  const subjectRows = Array.isArray(rows) ? rows : [];
  const openSujets = subjectRows.filter((row) => !String(row.status || "open").toLowerCase().startsWith("closed")).length;
  const totalSujets = subjectRows.length;

  projectBucket.backendProjectId = backendProjectId;
  projectBucket.subjectCounters = { openSujets, totalSujets };
  projectBucket.subjectsCountLoaded = true;
  projectBucket.lastSubjectsCountAt = Date.now();

  dispatchProjectSupabaseSync({ section: "subjects", subjectCounters: projectBucket.subjectCounters });
  return projectBucket.subjectCounters;
}



function mapProjectLotRowToViewModel(row = {}) {
  return {
    id: safeString(row.id),
    projectId: safeString(row.project_id),
    activated: row.activated === true,
    lotCatalogId: safeString(row.lot_catalog_id || row.lot_catalog?.id || ""),
    code: safeString(row.lot_catalog?.code || ""),
    label: safeString(row.lot_catalog?.label || ""),
    groupCode: safeString(row.lot_catalog?.group_code || ""),
    groupLabel: safeString(row.lot_catalog?.group_label || ""),
    defaultActivated: row.lot_catalog?.default_activated === true,
    isCustom: row.lot_catalog?.is_custom === true,
    createdByProjectId: safeString(row.lot_catalog?.created_by_project_id || ""),
    sortOrder: Number(row.lot_catalog?.sort_order || 0),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    raw: row
  };
}
function mapProjectPhaseRowToViewModel(row = {}) {
  return {
    id: safeString(row.id),
    projectId: safeString(row.project_id),
    code: safeString(row.phase_code),
    label: safeString(row.phase_label),
    order: Number(row.phase_order || 0),
    phaseDate: safeString(row.phase_date),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    raw: row
  };
}

function normalizeProjectPhaseCode(code = "") {
  return safeString(code).toUpperCase();
}

function getProjectPhaseFallbackDefinition(code = "") {
  const normalizedCode = normalizeProjectPhaseCode(code);
  const currentCatalog = Array.isArray(store.projectForm?.phasesCatalog) ? store.projectForm.phasesCatalog : [];
  const normalizedCatalog = currentCatalog.map((item, index) => ({
    code: normalizeProjectPhaseCode(item?.code),
    label: safeString(item?.label),
    order: Number(item?.order || item?.phaseOrder || index + 1) || index + 1
  }));

  const existing = normalizedCatalog.find((item) => item.code === normalizedCode);
  if (existing) {
    return {
      code: existing.code,
      label: existing.label || normalizedCode,
      order: existing.order || 1
    };
  }

  return {
    code: normalizedCode,
    label: normalizedCode,
    order: normalizedCatalog.length + 1
  };
}

const PROJECT_PHASES_SELECT = "id,project_id,phase_code,phase_label,phase_order,phase_date,created_at,updated_at";

async function fetchProjectPhasesRows(backendProjectId) {
  const params = new URLSearchParams();
  params.set("select", PROJECT_PHASES_SELECT);
  params.set("project_id", `eq.${backendProjectId}`);
  params.set("order", "phase_order.asc,created_at.asc");

  const rows = await restFetch("project_phases", params);
  return Array.isArray(rows) ? rows : [];
}

async function fetchProjectPhasesRowsByCode(backendProjectId) {
  const rows = await fetchProjectPhasesRows(backendProjectId);
  return new Map(rows.map((row) => {
    const item = mapProjectPhaseRowToViewModel(row || {});
    return [normalizeProjectPhaseCode(item.code), item];
  }));
}

export async function syncProjectPhasesFromSupabase(options = {}) {
  const backendProjectId = await resolveCurrentBackendProjectId(options);
  if (!backendProjectId) {
    return Array.isArray(store.projectForm?.phasesCatalog) ? store.projectForm.phasesCatalog : [];
  }

  const rows = await fetchProjectPhasesRows(backendProjectId);
  const phaseRows = rows
    .map(mapProjectPhaseRowToViewModel)
    .filter((row) => safeString(row.code));
  const phaseRowsByCode = new Map(
    phaseRows.map((row) => [normalizeProjectPhaseCode(row.code), row])
  );
  const currentCatalog = Array.isArray(store.projectForm?.phasesCatalog) ? store.projectForm.phasesCatalog : [];
  const fallbackCatalog = currentCatalog.length
    ? currentCatalog
    : [];

  if (!fallbackCatalog.length && !phaseRows.length) {
    store.projectForm.phasesCatalog = [];
    return store.projectForm.phasesCatalog;
  }

  const mergedCatalogSource = fallbackCatalog.length
    ? fallbackCatalog
    : phaseRows.map((row) => ({
      code: row.code,
      label: row.label || row.code,
      enabled: true,
      phaseDate: safeString(row.phaseDate),
      order: row.order
    }));

  store.projectForm.phasesCatalog = mergedCatalogSource.map((item, index) => {
    const fallback = getProjectPhaseFallbackDefinition(item?.code || "") || {};
    const code = normalizeProjectPhaseCode(item?.code || fallback.code || "");
    const row = phaseRowsByCode.get(code);
    const itemOrder = Number(item?.order || item?.phaseOrder || fallback.order || index + 1) || index + 1;

    return {
      code,
      label: safeString(row?.label) || safeString(item?.label) || safeString(fallback.label) || code,
      enabled: phaseRows.length ? phaseRowsByCode.has(code) : item?.enabled !== false,
      phaseDate: row ? safeString(row.phaseDate) : safeString(item?.phaseDate || item?.phase_date),
      order: row?.order || itemOrder
    };
  }).sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));

  return Array.isArray(store.projectForm?.phasesCatalog) ? store.projectForm.phasesCatalog : [];
}

async function updateProjectPhaseDateById(phaseId, phaseDate) {
  return restUpdate(
    "project_phases",
    { id: phaseId },
    { phase_date: phaseDate },
    { select: PROJECT_PHASES_SELECT }
  );
}

async function insertProjectPhaseRow(payload) {
  return restInsert("project_phases", payload, { select: PROJECT_PHASES_SELECT });
}

export async function persistProjectPhaseEnabledToSupabase(phaseCode, isEnabled) {
  const backendProjectId = await resolveCurrentBackendProjectId();
  if (!backendProjectId) {
    throw new Error("Projet Supabase introuvable pour la mise à jour des phases.");
  }

  const normalizedCode = normalizeProjectPhaseCode(phaseCode);
  if (!normalizedCode) {
    throw new Error("Code de phase introuvable pour la mise à jour.");
  }

  const existingRowsByCode = await fetchProjectPhasesRowsByCode(backendProjectId);
  const existingRow = existingRowsByCode.get(normalizedCode);

  if (isEnabled) {
    if (existingRow?.id) {
      return existingRow;
    }

    const fallback = getProjectPhaseFallbackDefinition(normalizedCode);
    return insertProjectPhaseRow({
      project_id: backendProjectId,
      phase_code: fallback.code,
      phase_label: fallback.label,
      phase_order: fallback.order,
      phase_date: null
    });
  }

  if (!existingRow?.id) {
    return null;
  }

  await restDelete("project_phases", { id: existingRow.id });
  return null;
}

export async function persistProjectPhaseDatesToSupabase(phaseDatesByCode = {}) {
  const backendProjectId = await resolveCurrentBackendProjectId();
  if (!backendProjectId) {
    throw new Error("Projet Supabase introuvable pour la mise à jour des dates de phases.");
  }

  const entries = Object.entries(phaseDatesByCode || {})
    .map(([code, phaseDate]) => [normalizeProjectPhaseCode(code), safeString(phaseDate) || null])
    .filter(([code]) => safeString(code));

  if (!entries.length) {
    return Array.isArray(store.projectForm?.phasesCatalog) ? store.projectForm.phasesCatalog : [];
  }

  const existingRowsByCode = await fetchProjectPhasesRowsByCode(backendProjectId);

  const updatedRows = await Promise.all(entries.map(async ([code, phaseDate]) => {
    const existingRow = existingRowsByCode.get(code);

    if (existingRow?.id) {
      const updatedRow = await updateProjectPhaseDateById(existingRow.id, phaseDate);

      if (!updatedRow) {
        throw new Error(`Aucune ligne project_phases mise à jour pour la phase ${code}.`);
      }

      return updatedRow;
    }

    const fallback = getProjectPhaseFallbackDefinition(code);
    return insertProjectPhaseRow({
      project_id: backendProjectId,
      phase_code: fallback.code,
      phase_label: fallback.label,
      phase_order: fallback.order,
      phase_date: phaseDate
    });
  }));

  const rowsByCode = new Map(updatedRows.map((row) => {
    const item = mapProjectPhaseRowToViewModel(row || {});
    return [normalizeProjectPhaseCode(item.code), item];
  }));

  const currentCatalog = Array.isArray(store.projectForm?.phasesCatalog) ? store.projectForm.phasesCatalog : [];
  store.projectForm.phasesCatalog = currentCatalog.map((item) => {
    const updated = rowsByCode.get(normalizeProjectPhaseCode(item?.code));
    if (!updated) return item;
    return {
      ...item,
      code: updated.code || safeString(item?.code),
      label: updated.label || safeString(item?.label),
      phaseDate: updated.phaseDate
    };
  });

  return store.projectForm.phasesCatalog;
}


function mapIssueActionToSubjectUpdate(action) {
  const normalizedAction = safeString(action);

  switch (normalizedAction) {
    case "issue:reopen":
      return { action: "issue:reopen" };
    case "issue:close:realized":
      return { action: "issue:close:realized" };
    case "issue:close:dismissed":
      return { action: "issue:close:dismissed" };
    case "issue:close:duplicate":
      return { action: "issue:close:duplicate" };
    default:
      return null;
  }
}


export async function syncProjectLotsFromSupabase(options = {}) {
  const force = Boolean(options.force);
  const frontendProjectId = getFrontendProjectKey();
  const projectBucket = getProjectSyncBucket(frontendProjectId);
  const backendProjectId = await resolveCurrentBackendProjectId();

  store.projectLots = store.projectLots && typeof store.projectLots === "object"
    ? store.projectLots
    : { items: [], loading: false, loaded: false, error: "", projectKey: "" };

  const currentProjectKey = frontendProjectId;
  const hasProjectMismatch = safeString(store.projectLots.projectKey) !== currentProjectKey;

  if (hasProjectMismatch) {
    store.projectLots.items = [];
    store.projectLots.loaded = false;
    store.projectLots.error = "";
    store.projectLots.projectKey = currentProjectKey;
  }

  if (!backendProjectId) {
    store.projectLots.items = [];
    store.projectLots.loading = false;
    store.projectLots.loaded = true;
    store.projectLots.error = "";
    projectBucket.lotsLoaded = true;
    projectBucket.lastLotsAt = Date.now();
    dispatchProjectSupabaseSync({ section: "lots", lotsCount: 0 });
    return [];
  }

  if (!force && projectBucket.lotsLoaded && store.projectLots.loaded) {
    return Array.isArray(store.projectLots.items) ? store.projectLots.items : [];
  }

  store.projectLots.loading = true;
  store.projectLots.error = "";

  const params = new URLSearchParams();
  params.set("select", "id,project_id,lot_catalog_id,activated,created_at,updated_at,lot_catalog:lot_catalog_id(id,group_code,group_label,code,label,default_activated,sort_order,is_custom,created_by_project_id)");
  params.set("project_id", `eq.${backendProjectId}`);
  params.set("order", "created_at.asc");

  try {
    const rows = await restFetch("project_lots", params);
    const nextItems = (Array.isArray(rows) ? rows : [])
      .map(mapProjectLotRowToViewModel)
      .sort((a, b) => {
        const groupCompare = String(a.groupLabel || "").localeCompare(String(b.groupLabel || ""), "fr");
        if (groupCompare !== 0) return groupCompare;
        const sortCompare = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
        if (sortCompare !== 0) return sortCompare;
        return String(a.label || "").localeCompare(String(b.label || ""), "fr");
      });

    store.projectLots.items = nextItems;
    store.projectLots.loading = false;
    store.projectLots.loaded = true;
    store.projectLots.error = "";
    store.projectLots.projectKey = currentProjectKey;

    projectBucket.backendProjectId = backendProjectId;
    projectBucket.lotsLoaded = true;
    projectBucket.lastLotsAt = Date.now();

    dispatchProjectSupabaseSync({ section: "lots", lotsCount: nextItems.length });
    return nextItems;
  } catch (error) {
    store.projectLots.loading = false;
    store.projectLots.loaded = false;
    store.projectLots.error = error instanceof Error ? error.message : String(error || "Erreur de chargement des lots");
    throw error;
  }
}

export async function persistProjectLotActivationToSupabase(projectLotId = "", activated = false) {
  const lotId = safeString(projectLotId);
  if (!lotId) {
    throw new Error("Project lot id missing for Supabase update.");
  }

  const updatedLot = await restUpdate(
    "project_lots",
    { id: lotId },
    { activated: activated === true },
    { select: "id,project_id,lot_catalog_id,activated,created_at,updated_at,lot_catalog:lot_catalog_id(id,group_code,group_label,code,label,default_activated,sort_order,is_custom,created_by_project_id)" }
  );

  const nextLot = mapProjectLotRowToViewModel(updatedLot || {});
  const currentItems = Array.isArray(store.projectLots?.items) ? store.projectLots.items : [];
  store.projectLots.items = currentItems.map((item) => item.id === nextLot.id ? nextLot : item);

  dispatchProjectSupabaseSync({
    section: "lots",
    lotId: nextLot.id,
    activated: nextLot.activated
  });

  return nextLot;
}


export async function addCustomProjectLotToSupabase({ groupCode = "", label = "" } = {}) {
  const backendProjectId = await resolveCurrentBackendProjectId();
  if (!backendProjectId) {
    throw new Error("Projet Supabase introuvable pour l'ajout du lot.");
  }

  const row = await rpcCall("add_custom_project_lot", {
    p_project_id: backendProjectId,
    p_group_code: safeString(groupCode),
    p_label: safeString(label)
  });

  const nextLot = mapProjectLotRowToViewModel(Array.isArray(row) ? (row[0] || {}) : (row || {}));
  const currentItems = Array.isArray(store.projectLots?.items) ? [...store.projectLots.items] : [];
  currentItems.push(nextLot);
  store.projectLots.items = currentItems.sort((a, b) => {
    const groupCompare = String(a.groupLabel || "").localeCompare(String(b.groupLabel || ""), "fr");
    if (groupCompare !== 0) return groupCompare;
    const sortCompare = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    if (sortCompare !== 0) return sortCompare;
    return String(a.label || "").localeCompare(String(b.label || ""), "fr");
  });

  dispatchProjectSupabaseSync({
    section: "lots",
    lotId: nextLot.id,
    added: true
  });

  return nextLot;
}

export async function deleteCustomProjectLotFromSupabase(projectLotId = "") {
  const backendProjectId = await resolveCurrentBackendProjectId();
  const lotId = safeString(projectLotId);

  if (!backendProjectId || !lotId) {
    throw new Error("Lot projet introuvable pour la suppression.");
  }

  const deleted = await rpcCall("delete_custom_project_lot", {
    p_project_lot_id: lotId,
    p_project_id: backendProjectId
  });

  if (deleted !== true) {
    throw new Error("Suppression du lot impossible.");
  }

  const currentItems = Array.isArray(store.projectLots?.items) ? store.projectLots.items : [];
  store.projectLots.items = currentItems.filter((item) => item.id !== lotId);

  dispatchProjectSupabaseSync({
    section: "lots",
    lotId,
    deleted: true
  });

  return true;
}

async function mapProjectCollaboratorRow(row = {}) {
  const profile = row.user_public_profiles || row.profile || {};
  const firstName = safeString(profile.first_name || row.first_name || "");
  const lastName = safeString(profile.last_name || row.last_name || "");
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const email = safeString(profile.public_email || row.collaborator_email || row.email || "");
  const lot = row.project_lot || {};
  const lotCatalog = lot.lot_catalog || {};
  const linkedUserId = safeString(row.linked_user_id || row.collaborator_user_id || row.user_id || "");
  const avatarStoragePath = safeString(profile.avatar_storage_path || row.avatar_storage_path || "");
  const avatarUrl = await resolveAvatarUrl({
    avatarUrl: safeString(profile.avatar_url || row.avatar_url || ""),
    avatar: safeString(profile.avatar || ""),
    avatarStoragePath,
    fallback: ""
  });

  return {
    id: safeString(row.id || ""),
    personId: safeString(row.person_id || ""),
    userId: linkedUserId,
    linkedUserId,
    hasMdallAccount: Boolean(linkedUserId),
    email,
    firstName,
    lastName,
    name: fullName || email || "Utilisateur",
    role: safeString(lotCatalog.label || row.role_label || ""),
    roleCode: safeString(lotCatalog.code || row.role_code || ""),
    projectLotId: safeString(row.project_lot_id || lot.id || ""),
    roleGroupCode: safeString(lotCatalog.group_code || row.role_group_code || ""),
    roleGroupLabel: safeString(lotCatalog.group_label || row.role_group_label || ""),
    status: safeString(row.status || "Actif") || "Actif",
    addedAt: row.created_at || null,
    removedAt: row.removed_at || null,
    company: safeString(profile.company || row.company || ""),
    avatarStoragePath,
    avatarUrl,
    sourceType: safeString(row.source_type || (linkedUserId ? "mdall_user" : "directory_person")) || "directory_person"
  };
}

export async function syncProjectCollaboratorsFromSupabase(options = {}) {
  const force = Boolean(options.force);
  const backendProjectId = await resolveCurrentBackendProjectId();
  const frontendProjectId = getFrontendProjectKey();
  const projectBucket = getProjectSyncBucket(frontendProjectId);

  if (!backendProjectId) {
    store.projectForm.collaborators = [];
    projectBucket.collaboratorsLoaded = true;
    projectBucket.lastCollaboratorsAt = Date.now();
    dispatchProjectSupabaseSync({ section: "collaborators", collaboratorsCount: 0 });
    return [];
  }

  if (!force && projectBucket.collaboratorsLoaded) {
    return Array.isArray(store.projectForm.collaborators) ? store.projectForm.collaborators : [];
  }

  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("project_id", `eq.${backendProjectId}`);
  params.set("order", "created_at.asc");

  const rows = await restFetch("project_collaborators_view", params);
  const items = Array.isArray(rows) ? await Promise.all(rows.map((row) => mapProjectCollaboratorRow(row))) : [];

  store.projectForm.collaborators = items;
  projectBucket.collaboratorsLoaded = true;
  projectBucket.lastCollaboratorsAt = Date.now();
  dispatchProjectSupabaseSync({ section: "collaborators", collaboratorsCount: items.length });
  return items;
}

export async function searchProjectCollaboratorCandidates(searchTerm = "", options = {}) {
  const query = safeString(searchTerm);
  if (!query) return [];

  const limit = Number.isFinite(options.limit) ? Number(options.limit) : 8;
  const projectId = await resolveCurrentBackendProjectId();
  const rows = await rpcCall("search_project_collaborator_candidates", {
    p_query: query,
    p_project_id: projectId || null,
    p_limit: Math.max(1, Math.min(20, limit))
  });

  return Array.isArray(rows) ? rows.map((row) => ({
    candidateKey: safeString(row.candidate_key || row.person_id || row.user_id || row.email || ""),
    sourceType: safeString(row.source_type || "directory_person") || "directory_person",
    personId: safeString(row.person_id || ""),
    userId: safeString(row.user_id || row.linked_user_id || ""),
    linkedUserId: safeString(row.linked_user_id || row.user_id || ""),
    hasMdallAccount: Boolean(safeString(row.user_id || row.linked_user_id || "")),
    email: safeString(row.email || ""),
    firstName: safeString(row.first_name || ""),
    lastName: safeString(row.last_name || ""),
    name: safeString(row.full_name || [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || "Utilisateur"),
    company: safeString(row.company || "")
  })) : [];
}

function isValidEmailAddress(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeString(value).toLowerCase());
}

async function ensureDirectoryPerson({ personId = "", email = "", firstName = "", lastName = "", company = "", userId = "" } = {}) {
  const explicitPersonId = safeString(personId);
  if (explicitPersonId) {
    return {
      id: explicitPersonId,
      linkedUserId: safeString(userId)
    };
  }

  const normalizedEmail = safeString(email).toLowerCase();
  if (!normalizedEmail || !isValidEmailAddress(normalizedEmail)) {
    throw new Error("Adresse mail invalide.");
  }

  const existingRows = await restFetch("directory_people", new URLSearchParams([
    ["select", "id,email,linked_user_id"],
    ["email_normalized", `eq.${normalizedEmail}`],
    ["limit", "1"]
  ]));
  const existingPerson = Array.isArray(existingRows) ? (existingRows[0] || null) : null;
  if (existingPerson?.id) {
    return {
      id: safeString(existingPerson.id),
      linkedUserId: safeString(existingPerson.linked_user_id || userId)
    };
  }

  const currentUser = await getCurrentUser().catch(() => null);
  const insertedPerson = await restInsert("directory_people", {
    email: normalizedEmail,
    first_name: safeString(firstName) || null,
    last_name: safeString(lastName) || null,
    company: safeString(company) || null,
    linked_user_id: safeString(userId) || null,
    created_by_user_id: safeString(currentUser?.id || "") || null
  }, {
    select: "id,email,linked_user_id"
  });

  return {
    id: safeString(insertedPerson?.id || ""),
    linkedUserId: safeString(insertedPerson?.linked_user_id || userId)
  };
}

export async function resolveCurrentUserDirectoryPersonId(options = {}) {
  const {
    email = "",
    firstName = "",
    lastName = "",
    company = ""
  } = options || {};

  const currentUser = await getCurrentUser().catch(() => null);
  const resolvedEmail = safeString(email || currentUser?.email || "").toLowerCase();
  if (!resolvedEmail || !isValidEmailAddress(resolvedEmail)) {
    return "";
  }

  const person = await ensureDirectoryPerson({
    email: resolvedEmail,
    userId: safeString(currentUser?.id || ""),
    firstName: safeString(firstName || currentUser?.user_metadata?.first_name || ""),
    lastName: safeString(lastName || currentUser?.user_metadata?.last_name || ""),
    company: safeString(company)
  });

  return safeString(person?.id || "");
}

export async function addProjectCollaboratorToSupabase({ personId = "", userId = "", email = "", firstName = "", lastName = "", company = "", projectLotId = "", status = "Actif" } = {}) {
  const backendProjectId = await resolveCurrentBackendProjectId();
  const lotId = safeString(projectLotId);

  if (!backendProjectId) {
    throw new Error("Projet Supabase introuvable pour l'ajout du collaborateur.");
  }
  if (!lotId) {
    throw new Error("Aucun rôle sélectionné.");
  }

  const collaboratorPerson = await ensureDirectoryPerson({ personId, email, firstName, lastName, company, userId });
  const resolvedPersonId = safeString(collaboratorPerson.id);
  if (!resolvedPersonId) {
    throw new Error("Aucune personne sélectionnée.");
  }

  const currentUser = await getCurrentUser().catch(() => null);
  const existing = Array.isArray(store.projectForm.collaborators) ? store.projectForm.collaborators : [];
  const existingAssignment = existing.find((item) => safeString(item.personId) === resolvedPersonId && safeString(item.projectLotId) === lotId) || null;
  if (existingAssignment && safeString(existingAssignment.status) === "Actif") {
    throw new Error("Cette personne est déjà affectée à ce rôle sur le projet.");
  }

  let inserted = null;
  if (existingAssignment && safeString(existingAssignment.status) === "Retiré") {
    inserted = await restUpdate("project_collaborators", { id: safeString(existingAssignment.id) }, {
      status: safeString(status) || "Actif",
      removed_at: null,
      collaborator_user_id: safeString(collaboratorPerson.linkedUserId || userId) || null,
      collaborator_email: safeString(email) || null
    }, {
      select: "id,project_id,person_id,collaborator_user_id,project_lot_id,status,created_at,collaborator_email,removed_at"
    });
  } else {
    inserted = await restInsert("project_collaborators", {
      project_id: backendProjectId,
      person_id: resolvedPersonId,
      collaborator_user_id: safeString(collaboratorPerson.linkedUserId || userId) || null,
      collaborator_email: safeString(email) || null,
      project_lot_id: lotId,
      status: safeString(status) || "Actif",
      invited_by_user_id: safeString(currentUser?.id || "") || null
    }, {
      select: "id,project_id,person_id,collaborator_user_id,project_lot_id,status,created_at,collaborator_email,removed_at"
    });
  }

  const items = await syncProjectCollaboratorsFromSupabase({ force: true });
  const nextItem = items.find((item) => safeString(item.id) === safeString(inserted?.id || ""))
    || items.find((item) => safeString(item.personId) === resolvedPersonId && safeString(item.projectLotId) === lotId && safeString(item.status) === (safeString(status) || "Actif"))
    || null;

  dispatchProjectSupabaseSync({ section: "collaborators", collaboratorId: safeString(nextItem?.id || inserted?.id || ""), collaboratorsCount: items.length });
  return nextItem;
}

export async function updateProjectCollaboratorRoleInSupabase(projectCollaboratorId = "", projectLotId = "") {
  const collaboratorId = safeString(projectCollaboratorId);
  const lotId = safeString(projectLotId);
  if (!collaboratorId) throw new Error("Identifiant du collaborateur manquant.");
  if (!lotId) throw new Error("Aucun rôle sélectionné.");

  const currentItems = Array.isArray(store.projectForm.collaborators) ? store.projectForm.collaborators : [];
  const currentItem = currentItems.find((item) => safeString(item.id) === collaboratorId) || null;
  if (!currentItem) throw new Error("Collaborateur introuvable.");
  if (safeString(currentItem.projectLotId) === lotId) return currentItem;

  const duplicateActive = currentItems.find((item) => safeString(item.id) !== collaboratorId
    && safeString(item.personId) === safeString(currentItem.personId)
    && safeString(item.projectLotId) === lotId
    && safeString(item.status) === "Actif");
  if (duplicateActive) {
    throw new Error("Cette personne est déjà affectée à ce rôle sur le projet.");
  }

  await restUpdate("project_collaborators", { id: collaboratorId }, {
    project_lot_id: lotId
  }, {
    select: "id"
  });

  const items = await syncProjectCollaboratorsFromSupabase({ force: true });
  const nextItem = items.find((item) => safeString(item.id) === collaboratorId) || null;
  dispatchProjectSupabaseSync({ section: "collaborators", collaboratorId, collaboratorsCount: items.length });
  return nextItem;
}

export async function deleteProjectCollaboratorFromSupabase(projectCollaboratorId = "") {
  const collaboratorId = safeString(projectCollaboratorId);
  if (!collaboratorId) {
    throw new Error("Identifiant du collaborateur manquant.");
  }

  await restUpdate("project_collaborators", { id: collaboratorId }, {
    status: "Retiré",
    removed_at: new Date().toISOString()
  }, {
    select: "id"
  });

  const items = await syncProjectCollaboratorsFromSupabase({ force: true });
  const projectBucket = getProjectSyncBucket(getFrontendProjectKey());
  projectBucket.collaboratorsLoaded = true;
  projectBucket.lastCollaboratorsAt = Date.now();
  dispatchProjectSupabaseSync({ section: "collaborators", collaboratorId, collaboratorsCount: items.length });
  return true;
}

export async function persistSubjectIssueActionToSupabase(subject = {}, action = "") {
  const actionConfig = mapIssueActionToSubjectUpdate(action);
  const subjectId = safeString(subject?.id || subject?.raw?.id || "");
  const situationId = safeString(subject?.raw?.situation_id || subject?.situation_id || "");

  if (!actionConfig) {
    throw new Error(`Unsupported subject issue action: ${action}`);
  }

  if (!subjectId) {
    throw new Error("Subject id missing for Supabase status update.");
  }

  const actorPersonId = safeString(await resolveCurrentUserDirectoryPersonId());
  const payload = await rpcCall("update_subject_issue_status", {
    p_subject_id: subjectId,
    p_action: actionConfig.action,
    p_actor_person_id: actorPersonId || null
  });
  const updatedSubject = Array.isArray(payload) ? (payload[0] || {}) : (payload || {});

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
    status: safeString(updatedSubject?.status || "")
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
