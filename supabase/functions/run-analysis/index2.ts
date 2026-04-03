import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders
    });
  }

  let runId: string | null = null;

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    runId = body?.run_id ?? null;

    if (!runId) {
      return jsonResponse({ error: "Missing run_id" }, 400);
    }

    const now = new Date().toISOString();

    const { error: setRunningError } = await supabase
      .from("analysis_runs")
      .update({
        status: "running",
        started_at: now,
        finished_at: null,
        error_message: null
      })
      .eq("id", runId);

    if (setRunningError) throw setRunningError;

    const invokeExtract = await supabase.functions.invoke("extract-pdf-text", {
      body: { run_id: runId }
    });

    if (invokeExtract.error) {
      throw new Error(await formatFunctionInvokeError("extract-pdf-text", invokeExtract.error));
    }

    const invokeGenerate = await supabase.functions.invoke("generate-observations", {
      body: { analysis_run_id: runId }
    });

    if (invokeGenerate.error) {
      throw new Error(await formatFunctionInvokeError("generate-observations", invokeGenerate.error));
    }

    const invokeResolve = await supabase.functions.invoke("resolve-observations", {
      body: { analysis_run_id: runId }
    });

    if (invokeResolve.error) {
      throw new Error(await formatFunctionInvokeError("resolve-observations", invokeResolve.error));
    }

    const finishedAt = new Date().toISOString();

    const { error: setSucceededError } = await supabase
      .from("analysis_runs")
      .update({
        status: "succeeded",
        finished_at: finishedAt,
        error_message: null
      })
      .eq("id", runId);

    if (setSucceededError) throw setSucceededError;

    return jsonResponse({
      ok: true,
      run_id: runId,
      extract: invokeExtract.data,
      generate: invokeGenerate.data,
      resolve: invokeResolve.data
    });
  } catch (error) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (runId && supabaseUrl && serviceRoleKey) {
      try {
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        await supabase
          .from("analysis_runs")
          .update({
            status: "failed",
            finished_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : String(error)
          })
          .eq("id", runId);
      } catch {
        // ignore secondary logging failure
      }
    }

    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders
  });
}

async function formatFunctionInvokeError(functionName: string, error: any): Promise<string> {
  const genericMessage = `${functionName} failed: ${error?.message ?? "Unknown error"}`;
  const context = error?.context;

  if (!context) {
    return genericMessage;
  }

  try {
    const payload = await context.json();
    if (payload?.error) {
      return `${functionName} failed: ${payload.error}${payload.details ? ` | details: ${stringifyForLog(payload.details)}` : ""}`;
    }
    return `${functionName} failed: ${stringifyForLog(payload)}`;
  } catch {
    try {
      const text = await context.text();
      return text ? `${functionName} failed: ${text}` : genericMessage;
    } catch {
      return genericMessage;
    }
  }
}

function stringifyForLog(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
