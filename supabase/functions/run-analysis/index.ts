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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let runId: string | null = null;

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: corsHeaders
      });
    }

    const body = await req.json();
    runId = body?.run_id ?? null;

    if (!runId) {
      return new Response(JSON.stringify({ error: "Missing run_id" }), {
        status: 400,
        headers: corsHeaders
      });
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

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: runId,
        extract: invokeExtract.data,
        generate: invokeGenerate.data,
        resolve: invokeResolve.data
      }),
      {
        status: 200,
        headers: corsHeaders
      }
    );
  } catch (error) {
    if (runId) {
      await supabase
        .from("analysis_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error)
        })
        .eq("id", runId);
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
});

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
