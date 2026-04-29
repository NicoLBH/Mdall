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

    console.log("[resolve-climate-tool] resolve.start", { projectId, toolKey, userId: authData.user.id });

    const { data: membershipCheck, error: membershipError } = await authClient
      .from("project_tool_results")
      .select("project_id")
      .eq("project_id", projectId)
      .limit(1);

    if (membershipError) return json({ error: "Forbidden", details: membershipError.message }, 403);

    // fallback membership check if no rows yet in project_tool_results
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

    console.log("[resolve-climate-tool] resolve.success", { projectId, toolKey, inputSignature });
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
  console.log("[resolve-climate-tool] location input", { toolKey, location, codeInsee, altitude });
  if (!codeInsee) {
    throw new HttpError(400, "code_insee is required in location payload");
  }

  const { data: commune, error: communeError } = await supabase
    .from("mdall_climate_commune_cantons")
    .select("insee_code,canton_code_2014,canton_name_2014,canton_name_current,department_code")
    .eq("insee_code", codeInsee)
    .maybeSingle();

  if (communeError) throw new Error(`commune lookup failed: ${communeError.message}`);

  const fallbackDepartmentCode = inferDepartmentCodeFromInsee(codeInsee);
  const resolvedCommune = commune ?? {
    insee_code: codeInsee,
    canton_code_2014: null,
    canton_name_2014: null,
    canton_name_current: null,
    department_code: fallbackDepartmentCode
  };

  if (!resolvedCommune.department_code) {
    throw new HttpError(400, `No commune mapping found for code_insee=${codeInsee}`);
  }
  const resolvedDepartmentCode = normalizeDepartmentCode(resolvedCommune.department_code);
  console.log("[resolve-climate-tool] resolved department_code", {
    raw: resolvedCommune.department_code,
    normalized: resolvedDepartmentCode,
    toolKey
  });

  if (toolKey === "snow") {
    const attemptedQueries: Array<{ type: string; department_code: string; row_count: number; raw: unknown }> = [];
    const warning = resolvedCommune.canton_name_current && resolvedCommune.canton_name_2014 && resolvedCommune.canton_name_current !== resolvedCommune.canton_name_2014
      ? `Le canton courant (${resolvedCommune.canton_name_current}) diffère du canton réglementaire 2014 (${resolvedCommune.canton_name_2014}).`
      : null;

    const { data: override } = await supabase
      .from("mdall_climate_snow_canton_overrides")
      .select("resolved_zone")
      .eq("department_code", resolvedDepartmentCode)
      .eq("canton_name_normalized", normalizeName(resolvedCommune.canton_name_2014 || resolvedCommune.canton_name_current || ""))
      .maybeSingle();

    let zone = override?.resolved_zone ?? null;
    if (!zone) {
      const { count: snowTableCount, error: snowTableCountError } = await supabase
        .from("mdall_climate_snow_departments")
        .select("department_code", { count: "exact", head: true });
      console.log("[resolve-climate-tool] snow table count", { count: snowTableCount, error: snowTableCountError?.message ?? null });
      if (snowTableCountError) throw new Error(`snow table count failed: ${snowTableCountError.message}`);
      if ((snowTableCount ?? 0) === 0) {
        throw new HttpError(400, "Snow data not seeded in database");
      }

      console.log("[resolve-climate-tool] snow query start", { department_code: resolvedDepartmentCode, column: "department_code" });
      const { data: deptRows, error: deptError } = await supabase
        .from("mdall_climate_snow_departments")
        .select("department_code,resolved_zone")
        .eq("department_code", resolvedDepartmentCode);
      if (deptError) throw new Error(`snow dept lookup failed: ${deptError.message}`);
      attemptedQueries.push({ type: "eq", department_code: resolvedDepartmentCode, row_count: deptRows?.length ?? 0, raw: deptRows ?? null });
      console.log("[resolve-climate-tool] snow query result", {
        department_code: resolvedDepartmentCode,
        row_count: deptRows?.length ?? 0,
        raw: deptRows ?? null
      });
      zone = deptRows?.[0]?.resolved_zone ?? null;

      if (!zone) {
        console.log("[resolve-climate-tool] snow fallback attempt", { department_code: resolvedDepartmentCode, strategy: "ilike-trim-leading-zeroes" });
        const fallbackPattern = `%${resolvedDepartmentCode}%`;
        const { data: fallbackRows, error: fallbackError } = await supabase
          .from("mdall_climate_snow_departments")
          .select("department_code,resolved_zone")
          .ilike("department_code", fallbackPattern);
        if (fallbackError) throw new Error(`snow fallback lookup failed: ${fallbackError.message}`);

        const normalizedMatches = (fallbackRows ?? []).filter((row: any) =>
          normalizeDepartmentCode(row?.department_code) === resolvedDepartmentCode
        );
        attemptedQueries.push({
          type: "ilike-normalized-match",
          department_code: resolvedDepartmentCode,
          row_count: normalizedMatches.length,
          raw: fallbackRows ?? null
        });
        console.log("[resolve-climate-tool] snow fallback", {
          department_code: resolvedDepartmentCode,
          row_count: normalizedMatches.length,
          raw: fallbackRows ?? null
        });
        zone = normalizedMatches[0]?.resolved_zone ?? null;
      }
    }
    if (!zone) {
      throw new HttpError(400, JSON.stringify({
        code: "SNOW_ZONE_NOT_FOUND",
        message: "No snow zone found",
        debug: { department_code: resolvedDepartmentCode, attempted_queries: attemptedQueries }
      }));
    }

    const result = { department_code: resolvedDepartmentCode, canton_code_2014: resolvedCommune.canton_code_2014, canton_name_2014: resolvedCommune.canton_name_2014, canton_name_current: resolvedCommune.canton_name_current, snow_zone: zone, warning };
    return { result, markdownSummary: `## Neige\n- Zone neige: **${zone}**\n- Département: **${resolvedDepartmentCode}**\n${warning ? `- ⚠️ ${warning}\n` : ""}` };
  }

  if (toolKey === "wind") {
    const warning = resolvedCommune.canton_name_current && resolvedCommune.canton_name_2014 && resolvedCommune.canton_name_current !== resolvedCommune.canton_name_2014
      ? `Le canton courant (${resolvedCommune.canton_name_current}) diffère du canton réglementaire 2014 (${resolvedCommune.canton_name_2014}).`
      : null;

    const { data: override } = await supabase
      .from("mdall_climate_wind_canton_overrides")
      .select("resolved_zone")
      .eq("department_code", resolvedCommune.department_code)
      .eq("canton_name_normalized", normalizeName(resolvedCommune.canton_name_2014 || resolvedCommune.canton_name_current || ""))
      .maybeSingle();

    let zone = override?.resolved_zone ?? null;
    if (!zone) {
      const { data: dept } = await supabase
        .from("mdall_climate_wind_departments")
        .select("resolved_zone")
        .eq("department_code", resolvedCommune.department_code)
        .limit(1)
        .maybeSingle();
      zone = dept?.resolved_zone ?? null;
    }
    if (!zone) throw new HttpError(400, `No wind zone found for department=${resolvedCommune.department_code}`);

    const result = { department_code: resolvedCommune.department_code, canton_code_2014: resolvedCommune.canton_code_2014, canton_name_2014: resolvedCommune.canton_name_2014, canton_name_current: resolvedCommune.canton_name_current, wind_zone: zone, warning };
    return { result, markdownSummary: `## Vent\n- Zone vent: **${zone}**\n- Département: **${resolvedCommune.department_code}**\n${warning ? `- ⚠️ ${warning}\n` : ""}` };
  }

  const { data: frost } = await supabase
    .from("mdall_climate_frost_departments")
    .select("h0_min_m,h0_max_m,h0_default_m")
    .eq("department_code", resolvedCommune.department_code)
    .maybeSingle();

  if (!frost) throw new HttpError(400, `No frost data found for department=${resolvedCommune.department_code}`);

  const h0 = Number(frost.h0_default_m ?? frost.h0_max_m ?? frost.h0_min_m ?? 0);
  const h = h0 + ((altitude - 150) / 4000);
  const warning = frost.h0_min_m !== frost.h0_max_m
    ? `Plusieurs valeurs H0 existent (${frost.h0_min_m} à ${frost.h0_max_m}).`
    : null;

  const result = {
    department_code: resolvedCommune.department_code,
    altitude,
    h0_min_m: frost.h0_min_m,
    h0_max_m: frost.h0_max_m,
    h0_selected_m: h0,
    frost_depth_m: h,
    formula: "H = H0 + ((altitude - 150) / 4000)",
    warning
  };

  return { result, markdownSummary: `## Gel\n- H0 retenu: **${h0} m**\n- Altitude: **${altitude} m**\n- Profondeur hors gel (H): **${h.toFixed(3)} m**\n- Formule: \`H = H0 + ((altitude - 150) / 4000)\`\n${warning ? `- ⚠️ ${warning}\n` : ""}` };
}

function normalizeDepartmentCode(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "";
  if (raw === "2A" || raw === "2B") return raw;
  if (/^\d+$/.test(raw)) return String(Number(raw));
  return raw.replace(/^0+/, "") || "0";
}


function inferDepartmentCodeFromInsee(codeInsee: string) {
  const normalized = String(codeInsee ?? "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.startsWith("2A") || normalized.startsWith("2B")) return normalized.slice(0, 2);
  if (/^97[1-6]/.test(normalized) || /^98[4678]/.test(normalized)) return normalized.slice(0, 3);
  if (/^\d{5}$/.test(normalized)) return normalized.slice(0, 2);
  return null;
}

function normalizeName(value: string) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’'\-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
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
