import { store, DEFAULT_PROJECT_PHASES } from "../store.js";

const SUPABASE_URL = "https://olgxhfgdzyghlzxmremz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_08nUL61_ATl-6KpD8dOYPw_RM5lMtEz";

function safeString(value = "") {
  return String(value ?? "").trim();
}

function getSupabaseAuthHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra
  };
}

function buildStorageAuthenticatedUrl(bucket = "", path = "") {
  const safeBucket = safeString(bucket);
  const safePath = safeString(path);
  if (!safeBucket || !safePath) return "";
  return `${SUPABASE_URL}/storage/v1/object/authenticated/${encodeURIComponent(safeBucket)}/${safePath.split("/").map(encodeURIComponent).join("/")}`;
}


export function ensureProjectDocumentsState() {
  if (!store.projectDocuments || typeof store.projectDocuments !== "object") {
    store.projectDocuments = {
      items: [],
      activeDocumentId: null,
      lastAnalysisDocumentIds: []
    };
  }

  if (!Array.isArray(store.projectDocuments.items)) {
    store.projectDocuments.items = [];
  }

  if (!Array.isArray(store.projectDocuments.lastAnalysisDocumentIds)) {
    store.projectDocuments.lastAnalysisDocumentIds = [];
  }

  if (store.projectDocuments.activeDocumentId === undefined) {
    store.projectDocuments.activeDocumentId = null;
  }

  return store.projectDocuments;
}

export function getEnabledProjectPhasesCatalog() {
  const rawCatalog = Array.isArray(store.projectForm?.phasesCatalog)
    ? store.projectForm.phasesCatalog
    : DEFAULT_PROJECT_PHASES;

  return rawCatalog
    .map((item) => ({
      code: safeString(item?.code),
      label: safeString(item?.label),
      enabled: item?.enabled !== false
    }))
    .filter((item) => item.code && item.label && item.enabled);
}

export function getProjectDocuments() {
  return ensureProjectDocumentsState().items;
}

export function getProjectDocumentById(documentId) {
  const safeId = safeString(documentId);
  if (!safeId) return null;
  return getProjectDocuments().find((item) => item.id === safeId) || null;
}

export function addProjectDocument(documentInput = {}) {
  const docsState = ensureProjectDocumentsState();
  const now = Date.now();
  const document = {
    id: safeString(documentInput.id) || `doc-${now}`,
    name: safeString(documentInput.name) || "Document",
    title: safeString(documentInput.title) || safeString(documentInput.name) || "Document",
    note: safeString(documentInput.note) || "Document prêt pour l'analyse",
    phaseCode: safeString(documentInput.phaseCode) || safeString(store.projectForm?.currentPhase) || safeString(store.projectForm?.phase) || "APS",
    phaseLabel: safeString(documentInput.phaseLabel),
    updatedAt: safeString(documentInput.updatedAt) || "À l'instant",
    createdAt: documentInput.createdAt || new Date(now).toISOString(),
    fileName: safeString(documentInput.fileName) || safeString(documentInput.name),
    kind: safeString(documentInput.kind) || "file",
    mimeType: safeString(documentInput.mimeType),
    previewUrl: safeString(documentInput.previewUrl),
    localPreviewUrl: safeString(documentInput.localPreviewUrl),
    localFile: documentInput.localFile || null,
    extension: safeString(documentInput.extension)
  };

  docsState.items.unshift(document);
  docsState.activeDocumentId = document.id;
  return document;
}

export function setActiveProjectDocument(documentId) {
  const docsState = ensureProjectDocumentsState();
  const safeId = safeString(documentId);
  docsState.activeDocumentId = getProjectDocumentById(safeId)?.id || null;
  return docsState.activeDocumentId;
}

export function setLastAnalysisDocumentIds(documentIds = []) {
  const docsState = ensureProjectDocumentsState();
  docsState.lastAnalysisDocumentIds = normalizeDocumentRefIds(documentIds);
  return docsState.lastAnalysisDocumentIds;
}

export function getPreferredAnalysisDocumentIds(explicitIds = []) {
  const safeExplicitIds = normalizeDocumentRefIds(explicitIds);
  if (safeExplicitIds.length) return safeExplicitIds;

  const docsState = ensureProjectDocumentsState();
  if (docsState.activeDocumentId) {
    return [docsState.activeDocumentId];
  }

  return normalizeDocumentRefIds(docsState.lastAnalysisDocumentIds);
}

export function normalizeDocumentRefIds(documentIds = []) {
  const docs = ensureProjectDocumentsState();
  const knownIds = new Set(docs.items.map((item) => item.id));
  const source = Array.isArray(documentIds) ? documentIds : [documentIds];
  const unique = [];

  for (const value of source) {
    const safeId = safeString(value);
    if (!safeId || !knownIds.has(safeId) || unique.includes(safeId)) continue;
    unique.push(safeId);
  }

  return unique;
}

export function resolveDocumentRefs(documentIds = []) {
  return normalizeDocumentRefIds(documentIds)
    .map((documentId) => getProjectDocumentById(documentId))
    .filter(Boolean);
}

export function decorateDocumentWithPhase(document = null) {
  if (!document) return null;

  const enabledPhases = getEnabledProjectPhasesCatalog();
  const phaseCode = safeString(document.phaseCode);
  const matchingPhase = enabledPhases.find((item) => item.code === phaseCode) || null;

  return {
    ...document,
    phaseCode: phaseCode || matchingPhase?.code || "",
    phaseLabel: safeString(document.phaseLabel) || matchingPhase?.label || ""
  };
}


export function getProjectDocumentPreviewUrl(documentOrId) {
  const document = typeof documentOrId === "string"
    ? getProjectDocumentById(documentOrId)
    : documentOrId;

  if (!document) return "";

  const remoteUrl = safeString(document.previewUrl);
  if (remoteUrl) return remoteUrl;

  if (safeString(document.localPreviewUrl)) {
    return document.localPreviewUrl;
  }

  if (typeof URL !== "undefined" && document.localFile instanceof File) {
    document.localPreviewUrl = URL.createObjectURL(document.localFile);
    return document.localPreviewUrl;
  }

  return "";
}

export async function ensureProjectDocumentPreviewUrl(documentOrId) {
  const document = typeof documentOrId === "string"
    ? getProjectDocumentById(documentOrId)
    : documentOrId;

  if (!document) return "";

  const existingUrl = getProjectDocumentPreviewUrl(document);
  if (existingUrl) return existingUrl;

  const storageBucket = safeString(document.storageBucket || document.storage_bucket);
  const storagePath = safeString(document.storagePath || document.storage_path);
  if (!storageBucket || !storagePath) return "";

  if (document.previewFetchPromise) {
    return document.previewFetchPromise;
  }

  const requestUrl = buildStorageAuthenticatedUrl(storageBucket, storagePath);
  document.previewFetchPromise = fetch(requestUrl, {
    method: "GET",
    headers: getSupabaseAuthHeaders(),
    cache: "no-store"
  })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`storage preview fetch failed (${response.status}): ${text}`);
      }

      const blob = await response.blob();
      if (typeof URL === "undefined") {
        throw new Error("URL API unavailable for PDF preview.");
      }

      if (safeString(document.localPreviewUrl).startsWith("blob:")) {
        try {
          URL.revokeObjectURL(document.localPreviewUrl);
        } catch {
          // ignore
        }
      }

      const blobUrl = URL.createObjectURL(blob);
      document.localPreviewUrl = blobUrl;
      return blobUrl;
    })
    .catch((error) => {
      document.previewError = error instanceof Error ? error.message : String(error || "Erreur de prévisualisation PDF");
      throw error;
    })
    .finally(() => {
      document.previewFetchPromise = null;
    });

  return document.previewFetchPromise;
}
