import { store } from "../store.js";

const STORAGE_PREFIX = "rapsobot.projectState";

function getStorageKey(projectId) {
  const safeProjectId = String(projectId || "").trim();
  return safeProjectId ? `${STORAGE_PREFIX}.${safeProjectId}` : "";
}

function cloneJsonSafe(value, fallback) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function sanitizeProjectFormForStorage(projectForm = {}) {
  const safeForm = cloneJsonSafe(projectForm, {}) || {};
  delete safeForm.pdfFile;
  return safeForm;
}

function sanitizeProjectAutomationForStorage(projectAutomation = {}) {
  return {
    settings: cloneJsonSafe(projectAutomation?.settings || {}, {}) || {}
  };
}

export function persistCurrentProjectState() {
  const projectId = String(store.currentProjectId || "").trim();
  const storageKey = getStorageKey(projectId);
  if (!storageKey) return false;

  const payload = {
    version: 1,
    projectForm: sanitizeProjectFormForStorage(store.projectForm),
    projectAutomation: sanitizeProjectAutomationForStorage(store.projectAutomation),
    savedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function hydrateProjectState(projectId) {
  const storageKey = getStorageKey(projectId);
  if (!storageKey) return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    if (parsed.projectForm && typeof parsed.projectForm === "object") {
      store.projectForm = {
        ...store.projectForm,
        ...cloneJsonSafe(parsed.projectForm, {})
      };
    }

    if (parsed.projectAutomation?.settings && typeof parsed.projectAutomation.settings === "object") {
      store.projectAutomation = {
        ...store.projectAutomation,
        settings: {
          ...cloneJsonSafe(parsed.projectAutomation.settings, {})
        }
      };
    }

    return parsed;
  } catch {
    return null;
  }
}
