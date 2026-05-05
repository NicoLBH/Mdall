import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

type ToolKey = "snow" | "wind" | "frost";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ResolvedCommune = {
  insee_code: string;
  department_code: string;
  canton_code_2014: string | null;
  canton_name_2014: string | null;
  canton_name_current: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: jsonHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) throw new Error("Missing required Supabase env vars");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) return json({ error: "Unauthorized" }, 401);

    const payload = await req.json().catch(() => null);
    const projectId = payload?.project_id;
    const toolKey = payload?.tool_key as ToolKey;
    const location = payload?.location ?? {};

    if (!projectId || !toolKey || !["snow", "wind", "frost"].includes(toolKey)) {
      return json({ error: "Invalid payload: project_id and tool_key(snow|wind|frost) are required" }, 400);
    }

    const { data: membershipCheck, error: membershipError } = await authClient
      .from("project_tool_results")
      .select("project_id")
      .eq("project_id", projectId)
      .limit(1);

    if (membershipError) return json({ error: "Forbidden", details: membershipError.message }, 403);

    if (!membershipCheck || membershipCheck.length === 0) {
      const { data: projectCheck, error: projectCheckError } = await authClient
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .limit(1)
        .single();
      if (projectCheckError || !projectCheck?.id) return json({ error: "Forbidden" }, 403);
    }

    const resolution = await resolveClimateTool(serviceClient, toolKey, location);
    const inputSignature = await buildInputSignature({ toolKey, location });

    const { error: resultUpsertError } = await serviceClient
      .from("project_tool_results")
      .upsert({
        project_id: projectId,
        tool_key: toolKey,
        input_signature: inputSignature,
        input_payload: location,
        result_payload: resolution.result,
        markdown_summary: resolution.markdownSummary,
        created_by: authData.user.id
      }, { onConflict: "project_id,tool_key,input_signature" });

    if (resultUpsertError) throw new Error(`Failed to persist project_tool_results: ${resultUpsertError.message}`);

    const contextFact = mapToolResultToContextFact(toolKey, resolution.result);
    const { error: contextUpsertError } = await serviceClient
      .from("project_context_facts")
      .upsert({
        project_id: projectId,
        fact_key: contextFact.fact_key,
        fact_value: contextFact.fact_value,
        source_type: "studio_tool",
        source_ref: toolKey,
        confidence: 1
      }, { onConflict: "project_id,fact_key,source_type,source_ref" });

    if (contextUpsertError) throw new Error(`Failed to upsert project_context_facts: ${contextUpsertError.message}`);

    return json({ tool_key: toolKey, input_signature: inputSignature, result: resolution.result, markdown_summary: resolution.markdownSummary });
  } catch (error) {
    console.error("[resolve-climate-tool] resolve.failure", error);
    if (error instanceof HttpError) {
      const parsed = tryParseJson(error.message);
      return json(parsed ?? { error: error.message }, error.status);
    }
    return json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

async function resolveClimateTool(supabase: any, toolKey: ToolKey, location: any) {
  const codeInsee = String(location?.code_insee ?? "").trim();
  const altitude = Number(location?.altitude ?? 0);
  if (!codeInsee) throw new HttpError(400, "code_insee is required in location payload");

  const commune = await resolveCommune(supabase, codeInsee, toolKey);
  const departmentCode = normalizeDepartmentCode(commune.department_code);
  const warning = commune.canton_name_current && commune.canton_name_2014 && commune.canton_name_current !== commune.canton_name_2014
    ? `Le canton courant (${commune.canton_name_current}) diffère du canton réglementaire 2014 (${commune.canton_name_2014}).`
    : null;

  if (toolKey === "snow" || toolKey === "wind") {
    const zoning = await resolveZonedClimate({
      supabase,
      toolKey,
      codeInsee,
      departmentCode,
      cantonCode2014: commune.canton_code_2014,
      cantonName2014: commune.canton_name_2014,
      cantonNameCurrent: commune.canton_name_current
    });

    const result = {
      department_code: departmentCode,
      canton_code_2014: commune.canton_code_2014,
      canton_name_2014: commune.canton_name_2014,
      canton_name_current: commune.canton_name_current,
      ...(toolKey === "snow" ? { snow_zone: zoning.zone } : { wind_zone: zoning.zone }),
      warning,
      debug: zoning.debug
    };

    const title = toolKey === "snow" ? "Neige" : "Vent";
    const zoneLabel = toolKey === "snow" ? "Zone neige" : "Zone vent";
    return { result, markdownSummary: `## ${title}\n- ${zoneLabel}: **${zoning.zone}**\n- Département: **${departmentCode}**\n${warning ? `- ⚠️ ${warning}\n` : ""}` };
  }

  const { data: frost } = await supabase
    .from("mdall_climate_frost_departments")
    .select("department_code,h0_min_m,h0_max_m,h0_default_m")
    .eq("department_code", departmentCode)
    .maybeSingle();

  if (!frost) throw new HttpError(400, `No frost data found for department=${departmentCode}`);

  const h0 = Number(frost.h0_default_m ?? frost.h0_max_m ?? frost.h0_min_m ?? 0);
  const h = h0 + ((altitude - 150) / 4000);
  const frostWarning = frost.h0_min_m !== frost.h0_max_m
    ? `Plusieurs valeurs H0 existent (${frost.h0_min_m} à ${frost.h0_max_m}).`
    : null;

  const result = {
    department_code: departmentCode,
    altitude,
    h0_min_m: frost.h0_min_m,
    h0_max_m: frost.h0_max_m,
    h0_selected_m: h0,
    frost_depth_m: h,
    formula: "H = H0 + ((altitude - 150) / 4000)",
    warning: frostWarning
  };

  return { result, markdownSummary: `## Gel\n- H0 retenu: **${h0} m**\n- Altitude: **${altitude} m**\n- Profondeur hors gel (H): **${h.toFixed(3)} m**\n- Formule: \`H = H0 + ((altitude - 150) / 4000)\`\n${frostWarning ? `- ⚠️ ${frostWarning}\n` : ""}` };
}

async function resolveCommune(supabase: any, codeInsee: string, toolKey: ToolKey): Promise<ResolvedCommune> {
  const { data: commune, error: communeError } = await supabase
    .from("mdall_climate_commune_cantons")
    .select("insee_code,canton_code_2014,canton_name_2014,canton_name_current,department_code")
    .eq("insee_code", codeInsee)
    .maybeSingle();
  if (communeError) throw new Error(`commune lookup failed: ${communeError.message}`);

  console.log("[resolve-climate-tool] commune.resolve", { toolKey, codeInsee, departmentCode: commune?.department_code ?? null, cantonCode2014: commune?.canton_code_2014 ?? null });

  let cantonLookup: any = null;
  if (commune?.canton_code_2014) {
    const { data: lookup, error: lookupError } = await supabase
      .from("mdall_climate_commune_cantons")
      .select("canton_code_2014,canton_name_2014,canton_name_current")
      .is("insee_code", null)
      .eq("canton_code_2014", commune.canton_code_2014)
      .maybeSingle();
    if (lookupError) throw new Error(`canton lookup failed: ${lookupError.message}`);
    cantonLookup = lookup;
  }

  console.log("[resolve-climate-tool] canton.lookup", { toolKey, codeInsee, departmentCode: commune?.department_code ?? inferDepartmentCodeFromInsee(codeInsee), cantonCode2014: commune?.canton_code_2014 ?? null, cantonName2014: cantonLookup?.canton_name_2014 ?? commune?.canton_name_2014 ?? null, cantonNameCurrent: cantonLookup?.canton_name_current ?? commune?.canton_name_current ?? null });

  const fallbackDepartmentCode = inferDepartmentCodeFromInsee(codeInsee);
  const department_code = normalizeDepartmentCode(commune?.department_code ?? fallbackDepartmentCode ?? "");
  if (!department_code) throw new HttpError(400, `No commune mapping found for code_insee=${codeInsee}`);

  return {
    insee_code: codeInsee,
    department_code,
    canton_code_2014: commune?.canton_code_2014 ?? null,
    canton_name_2014: cantonLookup?.canton_name_2014 ?? commune?.canton_name_2014 ?? null,
    canton_name_current: cantonLookup?.canton_name_current ?? commune?.canton_name_current ?? null
  };
}

async function resolveZonedClimate(params: any) {
  const { supabase, toolKey, codeInsee, departmentCode, cantonCode2014, cantonName2014, cantonNameCurrent } = params;
  const departmentsTable = toolKey === "snow" ? "mdall_climate_snow_departments" : "mdall_climate_wind_departments";
  const overridesTable = toolKey === "snow" ? "mdall_climate_snow_canton_overrides" : "mdall_climate_wind_canton_overrides";

  console.log("[resolve-climate-tool] zone.resolve.start", { toolKey, codeInsee, departmentCode, cantonCode2014, cantonName2014, cantonNameCurrent, matchType: null });

  const { data: departmentRows, error: departmentError } = await supabase
    .from(departmentsTable)
    .select("department_code,resolved_zone")
    .eq("department_code", departmentCode);

  if (departmentError) throw new Error(`${toolKey} department lookup failed: ${departmentError.message}`);
  if (!departmentRows || departmentRows.length === 0) {
    throw new HttpError(400, JSON.stringify({ code: `${toolKey.toUpperCase()}_ZONE_NOT_FOUND`, message: `No ${toolKey} zone found`, debug: { department_code: departmentCode, matchType: "missing_department_rows" } }));
  }

  if (departmentRows.length === 1) {
    const zone = departmentRows[0].resolved_zone;
    console.log("[resolve-climate-tool] zone.resolve.result", { toolKey, codeInsee, departmentCode, cantonCode2014, cantonName2014, cantonNameCurrent, matchType: "single_department_zone" });
    return { zone, debug: { match_type: "single_department_zone" } };
  }

  const candidates = buildNameCandidates(cantonName2014, cantonNameCurrent);
  const otherCandidates = [normalizeFrontName("Tous les autres cantons"), normalizeLegacyName("Tous les autres cantons"), normalizeMinimalName("Tous les autres cantons")];

  for (const candidate of candidates) {
    const { data: override } = await supabase
      .from(overridesTable)
      .select("resolved_zone")
      .eq("department_code", departmentCode)
      .eq("canton_name_normalized", candidate.value)
      .maybeSingle();
    if (override?.resolved_zone) {
      console.log("[resolve-climate-tool] zone.resolve.result", { toolKey, codeInsee, departmentCode, cantonCode2014, cantonName2014, cantonNameCurrent, matchType: candidate.matchType });
      return { zone: override.resolved_zone, debug: { match_type: candidate.matchType, matched_key: candidate.value } };
    }
  }

  for (const candidate of otherCandidates) {
    const { data: override } = await supabase
      .from(overridesTable)
      .select("resolved_zone")
      .eq("department_code", departmentCode)
      .eq("canton_name_normalized", candidate)
      .maybeSingle();
    if (override?.resolved_zone) {
      console.log("[resolve-climate-tool] zone.resolve.result", { toolKey, codeInsee, departmentCode, cantonCode2014, cantonName2014, cantonNameCurrent, matchType: "fallback_other_cantons" });
      return { zone: override.resolved_zone, debug: { match_type: "fallback_other_cantons", matched_key: candidate } };
    }
  }

  console.error("[resolve-climate-tool] zone.resolve.failure", { toolKey, codeInsee, departmentCode, cantonCode2014, cantonName2014, cantonNameCurrent, matchType: "cantons_required" });
  throw new HttpError(400, JSON.stringify({
    code: `${toolKey.toUpperCase()}_CANTON_REQUIRED`,
    message: `Multiple ${toolKey} zones exist for department ${departmentCode}; canton resolution is required`,
    debug: { department_code: departmentCode, canton_code_2014: cantonCode2014, canton_name_2014: cantonName2014, canton_name_current: cantonNameCurrent, department_zone_count: departmentRows.length }
  }));
}

function buildNameCandidates(cantonName2014: string | null, cantonNameCurrent: string | null) {
  const all = [
    { name: cantonName2014, prefix: "canton_2014" },
    { name: cantonNameCurrent, prefix: "canton_current" }
  ];
  const result: Array<{ value: string; matchType: string }> = [];
  for (const entry of all) {
    if (!entry.name) continue;
    const values = [normalizeLegacyName(entry.name), normalizeFrontName(entry.name), normalizeMinimalName(entry.name)];
    for (const value of values) {
      if (value && !result.some((x) => x.value === value)) result.push({ value, matchType: `${entry.prefix}_${value}` });
    }
  }
  return result;
}

function normalizeDepartmentCode(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "";
  if (raw === "2A" || raw === "2B") return raw;
  if (/^\d+$/.test(raw)) return raw.padStart(2, "0");
  return raw;
}

function inferDepartmentCodeFromInsee(codeInsee: string) {
  const normalized = String(codeInsee ?? "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.startsWith("2A") || normalized.startsWith("2B")) return normalized.slice(0, 2);
  if (/^97[1-6]/.test(normalized) || /^98[4678]/.test(normalized)) return normalized.slice(0, 3);
  if (/^\d{5}$/.test(normalized)) return normalized.slice(0, 2);
  return null;
}

function normalizeLegacyName(value: string) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’'\-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeFrontName(value: string) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[\-/]/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\bsaint\b/g, "st")
    .replace(/\bsainte\b/g, "ste")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMinimalName(value: string) {
  return String(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function buildInputSignature(input: unknown) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(input))).then((buffer) =>
    Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("")
  );
}

function mapToolResultToContextFact(toolKey: ToolKey, result: any) {
  if (toolKey === "snow") return { fact_key: "snow_zone", fact_value: { zone: result.snow_zone, department_code: result.department_code } };
  if (toolKey === "wind") return { fact_key: "wind_zone", fact_value: { zone: result.wind_zone, department_code: result.department_code } };
  return { fact_key: "frost_depth", fact_value: { frost_depth_m: result.frost_depth_m, h0_selected_m: result.h0_selected_m, altitude: result.altitude } };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
