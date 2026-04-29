import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { resolveCurrentBackendProjectId } from "./project-supabase-sync.js";

const SUPABASE_URL = getSupabaseUrl();
const PROJECT_CONTEXT_FACT_KEYS = new Set([
  "address",
  "seismic_zone",
  "snow_zone",
  "wind_zone",
  "frost_depth",
  "natural_risks",
  "technological_risks",
  "floors_count",
  "fire_regulation",
  "acoustic_requirement",
  "pmr_slope",
  "georisques_summary"
]);

function safeString(value = "") {
  return String(value ?? "").trim();
}

function toNullableText(value = "") {
  const normalized = safeString(value);
  return normalized || null;
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

export function normalizeProjectContextFactKey(factKey = "") {
  return safeString(factKey).toLowerCase().replace(/\s+/g, "_");
}

export async function upsertProjectContextFact({ projectId, factKey, factValue, sourceType = "manual", sourceRef = "", confidence = null } = {}) {
  const resolvedProjectId = await resolveProjectId(projectId);
  const normalizedFactKey = normalizeProjectContextFactKey(factKey);
  if (!resolvedProjectId) throw new Error("projectId is required");
  if (!normalizedFactKey) throw new Error("factKey is required");

  const normalizedSourceType = safeString(sourceType) || "manual";
  const normalizedSourceRef = toNullableText(sourceRef);
  const payload = {
    project_id: resolvedProjectId,
    fact_key: normalizedFactKey,
    fact_value: factValue && typeof factValue === "object" ? factValue : {},
    source_type: normalizedSourceType,
    source_ref: normalizedSourceRef,
    confidence: confidence == null ? null : Number(confidence)
  };

  console.info("[project-context-facts] upsert.start", {
    projectId: resolvedProjectId,
    factKey: normalizedFactKey,
    sourceType: normalizedSourceType,
    sourceRef: normalizedSourceRef
  });

  const findUrl = new URL(`${SUPABASE_URL}/rest/v1/project_context_facts`);
  findUrl.searchParams.set("select", "id");
  findUrl.searchParams.set("project_id", `eq.${resolvedProjectId}`);
  findUrl.searchParams.set("fact_key", `eq.${normalizedFactKey}`);
  findUrl.searchParams.set("source_type", `eq.${normalizedSourceType}`);
  findUrl.searchParams.set("source_ref", normalizedSourceRef == null ? "is.null" : `eq.${normalizedSourceRef}`);
  findUrl.searchParams.set("limit", "1");

  try {
    const findRes = await fetchJsonOrThrow(findUrl.toString(), {
      method: "GET",
      headers: await getAuthHeaders({ Accept: "application/json" }),
      cache: "no-store"
    }, "project_context_facts pre-upsert lookup failed");

    const existing = (await findRes.json().catch(() => []))?.[0] || null;
    let row = null;

    if (existing?.id) {
      const updateUrl = new URL(`${SUPABASE_URL}/rest/v1/project_context_facts`);
      updateUrl.searchParams.set("id", `eq.${existing.id}`);
      updateUrl.searchParams.set("select", "id,project_id,fact_key,fact_value,source_type,source_ref,confidence,created_at,updated_at");
      const updateRes = await fetchJsonOrThrow(updateUrl.toString(), {
        method: "PATCH",
        headers: await getAuthHeaders({
          "Content-Type": "application/json",
          Prefer: "return=representation"
        }),
        body: JSON.stringify({ fact_value: payload.fact_value, confidence: payload.confidence })
      }, "project_context_facts update failed");
      const rows = await updateRes.json().catch(() => []);
      row = Array.isArray(rows) ? (rows[0] || null) : rows;
    } else {
      const insertUrl = new URL(`${SUPABASE_URL}/rest/v1/project_context_facts`);
      insertUrl.searchParams.set("select", "id,project_id,fact_key,fact_value,source_type,source_ref,confidence,created_at,updated_at");
      const insertRes = await fetchJsonOrThrow(insertUrl.toString(), {
        method: "POST",
        headers: await getAuthHeaders({
          "Content-Type": "application/json",
          Prefer: "return=representation"
        }),
        body: JSON.stringify(payload)
      }, "project_context_facts insert failed");
      const rows = await insertRes.json().catch(() => []);
      row = Array.isArray(rows) ? (rows[0] || null) : rows;
    }

    console.info("[project-context-facts] upsert.success", {
      projectId: resolvedProjectId,
      factKey: normalizedFactKey,
      id: safeString(row?.id || "") || null
    });
    return row;
  } catch (error) {
    console.error("[project-context-facts] upsert.failure", {
      projectId: resolvedProjectId,
      factKey: normalizedFactKey,
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function getProjectContextFact({ projectId, factKey, sourceType = "", sourceRef = "" } = {}) {
  const resolvedProjectId = await resolveProjectId(projectId);
  const normalizedFactKey = normalizeProjectContextFactKey(factKey);
  if (!resolvedProjectId || !normalizedFactKey) return null;
  const rows = await listProjectContextFacts(resolvedProjectId, {
    factKey: normalizedFactKey,
    sourceType,
    sourceRef,
    limit: 1
  });
  return rows[0] || null;
}

export async function listProjectContextFacts(projectId, { factKey = "", sourceType = "", sourceRef = "", limit = 200 } = {}) {
  const resolvedProjectId = await resolveProjectId(projectId);
  if (!resolvedProjectId) return [];
  const url = new URL(`${SUPABASE_URL}/rest/v1/project_context_facts`);
  url.searchParams.set("project_id", `eq.${resolvedProjectId}`);
  url.searchParams.set("select", "id,project_id,fact_key,fact_value,source_type,source_ref,confidence,created_at,updated_at");
  if (safeString(factKey)) url.searchParams.set("fact_key", `eq.${normalizeProjectContextFactKey(factKey)}`);
  if (safeString(sourceType)) url.searchParams.set("source_type", `eq.${safeString(sourceType)}`);
  if (safeString(sourceRef)) url.searchParams.set("source_ref", `eq.${safeString(sourceRef)}`);
  url.searchParams.set("order", "updated_at.desc");
  url.searchParams.set("limit", String(Math.max(1, Number(limit) || 200)));

  const res = await fetchJsonOrThrow(url.toString(), {
    method: "GET",
    headers: await getAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  }, "project_context_facts fetch failed");

  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

export { PROJECT_CONTEXT_FACT_KEYS };
