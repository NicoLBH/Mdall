import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const RESOLVE_CLIMATE_TOOL_FN_URL = `${SUPABASE_URL}/functions/v1/resolve-climate-tool`;

function safeString(value = "") {
  return String(value ?? "").trim();
}

function toNullableNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildInputError(message) {
  return new Error(`[studio-tools] ${message}`);
}

async function parseJsonResponseOrThrow(response, errorPrefix = "Studio tools request failed") {
  const text = await response.text().catch(() => "");
  const payload = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const details = payload?.error || payload?.details || text || `HTTP ${response.status}`;
    throw new Error(`${errorPrefix} (${response.status}): ${details}`);
  }

  return payload;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function buildClimateToolLocationPayload(location = {}) {
  return {
    city: safeString(location.city),
    postal_code: safeString(location.postalCode || location.postal_code),
    code_insee: safeString(location.codeInsee || location.code_insee),
    latitude: toNullableNumber(location.latitude),
    longitude: toNullableNumber(location.longitude),
    altitude: toNullableNumber(location.altitude)
  };
}

export async function resolveStudioClimateTool({ projectId, toolKey, location } = {}) {
  const normalizedProjectId = safeString(projectId);
  const normalizedToolKey = safeString(toolKey);

  if (!normalizedProjectId) throw buildInputError("projectId is required");
  if (!normalizedToolKey) throw buildInputError("toolKey is required");

  const payload = {
    project_id: normalizedProjectId,
    tool_key: normalizedToolKey,
    location: buildClimateToolLocationPayload(location)
  };

  console.info("[studio-tools] resolve.start", {
    projectId: normalizedProjectId,
    toolKey: normalizedToolKey,
    hasCodeInsee: Boolean(payload.location.code_insee)
  });

  try {
    const response = await fetch(RESOLVE_CLIMATE_TOOL_FN_URL, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({
        Accept: "application/json",
        "Content-Type": "application/json"
      }),
      cache: "no-store",
      body: JSON.stringify(payload)
    });

    const data = await parseJsonResponseOrThrow(response, "resolve-climate-tool failed");

    console.info("[studio-tools] resolve.success", {
      projectId: normalizedProjectId,
      toolKey: normalizedToolKey,
      hasResult: Boolean(data?.result)
    });

    return data;
  } catch (error) {
    console.error("[studio-tools] resolve.failure", {
      projectId: normalizedProjectId,
      toolKey: normalizedToolKey,
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function getLastStudioToolResult({ projectId, toolKey } = {}) {
  const normalizedProjectId = safeString(projectId);
  const normalizedToolKey = safeString(toolKey);

  if (!normalizedProjectId) throw buildInputError("projectId is required");
  if (!normalizedToolKey) throw buildInputError("toolKey is required");

  const url = new URL(`${SUPABASE_URL}/rest/v1/project_tool_results`);
  url.searchParams.set("project_id", `eq.${normalizedProjectId}`);
  url.searchParams.set("tool_key", `eq.${normalizedToolKey}`);
  url.searchParams.set("select", "id,project_id,tool_key,input_signature,input_payload,result_payload,markdown_summary,created_at,updated_at");
  url.searchParams.set("order", "updated_at.desc");
  url.searchParams.set("limit", "1");

  console.info("[studio-tools] previous-result.fetch", {
    projectId: normalizedProjectId,
    toolKey: normalizedToolKey
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: await buildSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  const rows = await parseJsonResponseOrThrow(response, "project_tool_results fetch failed");
  return Array.isArray(rows) ? rows[0] || null : null;
}
