import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { resolveCurrentBackendProjectId } from "./project-supabase-sync.js";

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

export async function upsertProjectContextFact({ projectId, factKey, factValue, sourceType = "manual", sourceRef = "", confidence = null } = {}) {
  const resolvedProjectId = await resolveProjectId(projectId);
  const normalizedFactKey = safeString(factKey);
  if (!resolvedProjectId) throw new Error("projectId is required");
  if (!normalizedFactKey) throw new Error("factKey is required");

  const payload = {
    project_id: resolvedProjectId,
    fact_key: normalizedFactKey,
    fact_value: factValue && typeof factValue === "object" ? factValue : {},
    source_type: safeString(sourceType) || "manual",
    source_ref: toNullableText(sourceRef),
    confidence: confidence == null ? null : Number(confidence)
  };

  const url = `${SUPABASE_URL}/rest/v1/project_context_facts`;
  const res = await fetchJsonOrThrow(url, {
    method: "POST",
    headers: await getAuthHeaders({
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify(payload)
  }, "project_context_facts upsert failed");

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? (rows[0] || null) : rows;
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
  const resolvedProjectId = await resolveProjectId(projectId);
  if (!resolvedProjectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/project_context_facts`);
  url.searchParams.set("project_id", `eq.${resolvedProjectId}`);
  url.searchParams.set("select", "id,project_id,fact_key,fact_value,source_type,source_ref,confidence,created_at,updated_at");
  url.searchParams.set("order", "updated_at.desc");

  const res = await fetchJsonOrThrow(url.toString(), {
    method: "GET",
    headers: await getAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  }, "project_context_facts fetch failed");

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}
