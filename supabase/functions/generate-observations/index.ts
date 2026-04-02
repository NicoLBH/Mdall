import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Observation = {
  title: string;
  description: string;
  observation_type?: string | null;
  priority?: "low" | "medium" | "high" | "critical" | null;
  confidence_score?: number | null;
  source_excerpt?: string | null;
  source_page?: number | null;
};

type LlmResponse = {
  observations: Observation[];
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = await req.json();
    const analysisRunId = body?.analysis_run_id;

    if (!analysisRunId || typeof analysisRunId !== "string") {
      return jsonResponse({ error: "analysis_run_id is required" }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: run, error: runError } = await supabase
      .from("analysis_runs")
      .select("id, project_id, document_id, raw_text")
      .eq("id", analysisRunId)
      .single();

    if (runError || !run) {
      return jsonResponse({ error: "analysis_run not found", details: runError }, 404);
    }

    if (!run.raw_text || typeof run.raw_text !== "string" || run.raw_text.trim().length === 0) {
      return jsonResponse({ error: "analysis_run.raw_text is empty" }, 400);
    }

    const prompt = buildPrompt(run.raw_text);

    const llmPayload = {
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Tu extrais des observations candidates à partir d'un document technique. " +
                "Tu ne crées jamais de sujets finaux. " +
                "Tu réponds uniquement en JSON valide au format demandé."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt
            }
          ]
        }
      ]
    };

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(llmPayload)
    });

    if (!openAiResponse.ok) {
      const errText = await openAiResponse.text();
      return jsonResponse(
        { error: "OpenAI request failed", details: errText },
        502
      );
    }

    const openAiJson = await openAiResponse.json();
    const llmText = extractTextFromOpenAiResponse(openAiJson);

    if (!llmText) {
      return jsonResponse(
        { error: "No text output returned by OpenAI", raw: openAiJson },
        502
      );
    }

    let parsed: LlmResponse;
    try {
      parsed = JSON.parse(llmText);
    } catch (e) {
      await supabase
        .from("analysis_runs")
        .update({
          llm_output_raw: openAiJson,
          structured_output_json: {
            stage: "generate_observations",
            observations: [],
            next_step: "resolve_observations"
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", analysisRunId);

      return jsonResponse(
        { error: "LLM output is not valid JSON", raw_text_output: llmText },
        502
      );
    }

    const observations = sanitizeObservations(parsed?.observations ?? []);

    if (observations.length === 0) {
      await supabase
        .from("analysis_runs")
        .update({
          llm_output_raw: openAiJson,
          structured_output_json: { observations: [] },
          updated_at: new Date().toISOString()
        })
        .eq("id", analysisRunId);

      return jsonResponse({
        success: true,
        analysis_run_id: analysisRunId,
        observations_created: 0
      });
    }

    const rowsToInsert = observations.map((obs) => ({
      project_id: run.project_id,
      document_id: run.document_id,
      analysis_run_id: run.id,
      title: obs.title,
      description: obs.description,
      observation_type: obs.observation_type ?? null,
      priority: obs.priority ?? null,
      confidence_score: obs.confidence_score ?? null,
      source_excerpt: obs.source_excerpt ?? null,
      source_page: obs.source_page ?? null,
      raw_llm_payload: obs,
      resolution_status: "pending"
    }));

    const { data: insertedRows, error: insertError } = await supabase
      .from("subject_observations")
      .insert(rowsToInsert)
      .select("id");

    if (insertError) {
      return jsonResponse(
        { error: "Failed to insert subject_observations", details: insertError },
        500
      );
    }

    await supabase
      .from("analysis_runs")
      .update({
        llm_output_raw: openAiJson,
        structured_output_json: {
          stage: "generate_observations",
          observations,
          next_step: "resolve_observations"
        },
        updated_at: new Date().toISOString()
      })
      .eq("id", analysisRunId);

    return jsonResponse({
      success: true,
      analysis_run_id: analysisRunId,
      observations_created: insertedRows?.length ?? 0
    });
  } catch (error) {
    return jsonResponse(
      { error: "Unhandled error", details: String(error) },
      500
    );
  }
});

function buildPrompt(rawText: string): string {
  return `
Analyse le texte suivant et extrais uniquement des observations candidates.

Consignes :
- Ne crée jamais de sujets finaux.
- Retourne uniquement un JSON valide.
- Format exact attendu :
{
  "observations": [
    {
      "title": "string",
      "description": "string",
      "observation_type": "string ou null",
      "priority": "low|medium|high|critical ou null",
      "confidence_score": "number ou null",
      "source_excerpt": "string ou null",
      "source_page": "number ou null"
    }
  ]
}

Texte du document :
${rawText}
`.trim();
}

function sanitizeObservations(input: Observation[]): Observation[] {
  return input
    .filter((obs) => obs && typeof obs.title === "string" && typeof obs.description === "string")
    .map((obs) => ({
      title: obs.title.trim(),
      description: obs.description.trim(),
      observation_type: normalizeOptionalString(obs.observation_type),
      priority: normalizePriority(obs.priority),
      confidence_score: normalizeConfidence(obs.confidence_score),
      source_excerpt: normalizeOptionalString(obs.source_excerpt),
      source_page: normalizePage(obs.source_page)
    }))
    .filter((obs) => obs.title.length > 0 && obs.description.length > 0);
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePriority(value: unknown): "low" | "medium" | "high" | "critical" | null {
  if (value !== "low" && value !== "medium" && value !== "high" && value !== "critical") {
    return null;
  }
  return value;
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (value < 0 || value > 1) return null;
  return value;
}

function normalizePage(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1) return null;
  return value;
}

function extractTextFromOpenAiResponse(payload: any): string | null {
  if (!payload || !Array.isArray(payload.output)) return null;

  const chunks: string[] = [];

  for (const item of payload.output) {
    if (!item || !Array.isArray(item.content)) continue;

    for (const contentItem of item.content) {
      if (contentItem?.type === "output_text" && typeof contentItem.text === "string") {
        chunks.push(contentItem.text);
      }
    }
  }

  const result = chunks.join("\n").trim();
  return result.length > 0 ? result : null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
