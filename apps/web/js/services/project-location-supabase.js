import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { store } from "../store.js";
import { resolveCurrentBackendProjectId } from "./project-supabase-sync.js";
import { listProjectContextFacts, upsertProjectContextFact } from "./project-context-facts-service.js";
import { readPersistedProjectState } from "./project-state-storage.js";

const SUPABASE_URL = getSupabaseUrl();

function safeString(value = "") {
  return String(value ?? "").trim();
}

function toNullableText(value = "") {
  const normalized = safeString(value);
  return normalized || null;
}

function toNullableNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

async function getAuthHeaders(extra = {}) {
  return buildSupabaseAuthHeaders(extra);
}

async function resolveProjectId(projectId = "") {
  const explicit = safeString(projectId);
  if (explicit) return explicit;
  return safeString(await resolveCurrentBackendProjectId().catch(() => ""));
}

async function fetchJsonOrThrow(url, init = {}, errorPrefix = "Supabase request failed") {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${errorPrefix} (${res.status}): ${text}`);
  }
  return res;
}


export async function saveProjectLocationToSupabase({ projectId, address, city, postalCode, latitude, longitude, altitude, codeInsee } = {}) {
  const resolvedProjectId = await resolveProjectId(projectId);
  if (!resolvedProjectId) throw new Error("projectId is required");

  const locationPayload = {
    address: toNullableText(address),
    city: toNullableText(city),
    postal_code: toNullableText(postalCode),
    latitude: toNullableNumber(latitude),
    longitude: toNullableNumber(longitude),
    altitude: toNullableNumber(altitude),
    code_insee: toNullableText(codeInsee)
  };

  const projectsUrl = new URL(`${SUPABASE_URL}/rest/v1/projects`);
  projectsUrl.searchParams.set("id", `eq.${resolvedProjectId}`);
  projectsUrl.searchParams.set("select", "id,address,city,postal_code,latitude,longitude,altitude,code_insee");

  const projectRes = await fetchJsonOrThrow(projectsUrl.toString(), {
    method: "PATCH",
    headers: await getAuthHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(locationPayload)
  }, "projects location update failed");

  const updatedRows = await projectRes.json().catch(() => []);

  try {
    await upsertProjectContextFact({
      projectId: resolvedProjectId,
      factKey: "address",
      sourceType: "manual",
      factValue: {
        address: toNullableText(address),
        city: toNullableText(city),
        postalCode: toNullableText(postalCode),
        latitude: toNullableNumber(latitude),
        longitude: toNullableNumber(longitude),
        altitude: toNullableNumber(altitude),
        codeInsee: toNullableText(codeInsee)
      }
    });
  } catch (error) {
    console.warn("[project-location] context-fact.upsert.failure", {
      projectId: resolvedProjectId,
      message: error instanceof Error ? error.message : String(error)
    });
  }

  return Array.isArray(updatedRows) ? (updatedRows[0] || null) : updatedRows;
}

export async function loadProjectLocationFromSupabase(projectId) {
  const resolvedProjectId = await resolveProjectId(projectId);
  if (!resolvedProjectId) return null;

  const url = new URL(`${SUPABASE_URL}/rest/v1/projects`);
  url.searchParams.set("id", `eq.${resolvedProjectId}`);
  url.searchParams.set("select", "id,address,city,postal_code,latitude,longitude,altitude,code_insee");
  url.searchParams.set("limit", "1");

  const res = await fetchJsonOrThrow(url.toString(), {
    method: "GET",
    headers: await getAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  }, "projects location fetch failed");

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? (rows[0] || null) : null;
}

export async function loadProjectContextFacts(projectId) {
  return listProjectContextFacts(projectId);
}

function applyLocationToStore(row = {}) {
  const toText = (value) => safeString(value);
  const toNumberOrNull = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };
  store.projectForm = {
    ...store.projectForm,
    address: toText(row?.address),
    city: toText(row?.city),
    postalCode: toText(row?.postal_code),
    latitude: toNumberOrNull(row?.latitude),
    longitude: toNumberOrNull(row?.longitude),
    altitude: toNumberOrNull(row?.altitude),
    codeInsee: toText(row?.code_insee)
  };
}

function applyContextFactsToStore(facts = []) {
  const normalizedFacts = Array.isArray(facts) ? facts : [];
  store.projectContextFacts = normalizedFacts;
  store.projectForm = {
    ...store.projectForm,
    contextFacts: normalizedFacts
  };
}

export async function hydrateProjectLocationAndContextFromSupabase(projectId) {
  const resolvedProjectId = await resolveProjectId(projectId);
  if (!resolvedProjectId) return { source: "none", location: null, contextFacts: [] };

  console.info("[project-location] hydrate.start", { projectId: resolvedProjectId });
  try {
    const [locationRow, contextFacts] = await Promise.all([
      loadProjectLocationFromSupabase(resolvedProjectId),
      loadProjectContextFacts(resolvedProjectId)
    ]);
    if (locationRow && typeof locationRow === "object") {
      applyLocationToStore(locationRow);
    }
    applyContextFactsToStore(contextFacts);
    console.info("[project-location] hydrate.success", {
      projectId: resolvedProjectId,
      locationLoaded: Boolean(locationRow),
      contextFactsCount: Array.isArray(contextFacts) ? contextFacts.length : 0,
      source: "supabase"
    });
    return { source: "supabase", location: locationRow, contextFacts: contextFacts || [] };
  } catch (error) {
    console.error("[project-location] hydrate.failure", {
      projectId: resolvedProjectId,
      message: error instanceof Error ? error.message : String(error)
    });
    const persistedState = readPersistedProjectState(resolvedProjectId);
    const persistedForm = persistedState?.projectForm && typeof persistedState.projectForm === "object"
      ? persistedState.projectForm
      : null;
    if (persistedForm) {
      store.projectForm = {
        ...store.projectForm,
        ...persistedForm
      };
      applyContextFactsToStore(Array.isArray(persistedForm.contextFacts) ? persistedForm.contextFacts : []);
    }
    return { source: "localStorage", location: null, contextFacts: store.projectContextFacts || [] };
  }
}
