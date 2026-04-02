import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let runId: string | null = null;

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    runId = body?.run_id ?? null;

    if (!runId) {
      return new Response(JSON.stringify({ error: "Missing run_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
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
      throw new Error(`extract-pdf-text failed: ${invokeExtract.error.message}`);
    }

    const invokeGenerate = await supabase.functions.invoke("generate-observations", {
      body: { analysis_run_id: runId }
    });

    if (invokeGenerate.error) {
      throw new Error(`generate-observations failed: ${invokeGenerate.error.message}`);
    }

    const invokeResolve = await supabase.functions.invoke("resolve-observations", {
      body: { analysis_run_id: runId }
    });

    if (invokeResolve.error) {
      throw new Error(`resolve-observations failed: ${invokeResolve.error.message}`);
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
        headers: { "Content-Type": "application/json" }
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
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});
