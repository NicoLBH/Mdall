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
const MAX_RAW_TEXT_CHARS = 120000;
const MAX_OUTPUT_TOKENS = 4000;

const observationsJsonSchema = {
  name: "subject_observations_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      observations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            observation_type: {
              anyOf: [{ type: "string" }, { type: "null" }]
            },
            priority: {
              anyOf: [
                {
                  type: "string",
                  enum: ["low", "medium", "high", "critical"]
                },
                { type: "null" }
              ]
            },
            confidence_score: {
              anyOf: [{ type: "number" }, { type: "null" }]
            },
            source_excerpt: {
              anyOf: [{ type: "string" }, { type: "null" }]
            },
            source_page: {
              anyOf: [{ type: "integer" }, { type: "null" }]
            }
          },
          required: [
            "title",
            "description",
            "observation_type",
            "priority",
            "confidence_score",
            "source_excerpt",
            "source_page"
          ]
        }
      }
    },
    required: ["observations"]
  }
};

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
      instructions:
        "Tu extrais des observations candidates à partir d'un document technique. " +
        "Tu ne crées jamais de sujets finaux. " +
        "Tu réponds uniquement avec un JSON conforme au schéma fourni.",
      input: prompt,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      text: {
        format: {
          type: "json_schema",
          ...observationsJsonSchema
        }
      }
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
      await persistRunDebug(supabase, analysisRunId, {
        stage: "generate_observations",
        llm_request_error: errText,
        llm_prompt_char_count: prompt.length,
        raw_text_char_count: run.raw_text.length
      });
      return jsonResponse(
        { error: "OpenAI request failed", details: errText },
        502
      );
    }

    const openAiJson = await openAiResponse.json();
    const llmText = extractTextFromOpenAiResponse(openAiJson);

    if (!llmText) {
      await persistRunDebug(supabase, analysisRunId, {
        stage: "generate_observations",
        llm_prompt_char_count: prompt.length,
        raw_text_char_count: run.raw_text.length,
        llm_output_raw: openAiJson
      });
      return jsonResponse(
        { error: "No text output returned by OpenAI", raw: openAiJson },
        502
      );
    }

    let parsed: LlmResponse;
    try {
      parsed = JSON.parse(llmText);
    } catch (_e) {
      await persistRunDebug(supabase, analysisRunId, {
        stage: "generate_observations",
        observations: [],
        next_step: "resolve_observations",
        raw_text_output: llmText,
        llm_output_raw: openAiJson
      });

      return jsonResponse(
        { error: "LLM output is not valid JSON", raw_text_output: llmText },
        502
      );
    }

    const observations = sanitizeObservations(parsed?.observations ?? []);

    if (observations.length === 0) {
      await persistRunDebug(supabase, analysisRunId, {
        observations: [],
        llm_output_raw: openAiJson
      });

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

    await persistRunDebug(supabase, analysisRunId, {
      stage: "generate_observations",
      observations,
      next_step: "resolve_observations",
      llm_output_raw: openAiJson
    });

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
  const prepared = prepareRawTextForPrompt(rawText);

  return `
Analyse le texte suivant et extrais uniquement des observations candidates.

Consignes :
- Ne crée jamais de sujets finaux.
- Retourne uniquement des observations candidates.
- Chaque observation doit être autonome et exploitable.
- Le champ priority doit rester strictement dans : low, medium, high, critical, ou null.
- Le champ source_page doit être un entier >= 1 ou null.

Texte du document :
${prepared}
`.trim();
}

function prepareRawTextForPrompt(rawText: string): string {
  const normalized = String(rawText ?? "").trim();

  if (normalized.length <= MAX_RAW_TEXT_CHARS) {
    return normalized;
  }

  const headLength = Math.floor(MAX_RAW_TEXT_CHARS * 0.7);
  const tailLength = MAX_RAW_TEXT_CHARS - headLength;
  const head = normalized.slice(0, headLength);
  const tail = normalized.slice(-tailLength);

  return [
    head,
    "\n\n[... TEXTE TRONQUÉ POUR RESTER DANS LA FENÊTRE DU MODÈLE ...]\n\n",
    tail
  ].join("");
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
  if (!payload) return null;

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (Array.isArray(payload.output_text)) {
    const joined = payload.output_text.filter((item: unknown) => typeof item === "string").join("\n").trim();
    if (joined) return joined;
  }

  if (!Array.isArray(payload.output)) return null;

  const chunks: string[] = [];

  for (const item of payload.output) {
    if (!item) continue;

    if (Array.isArray(item.content)) {
      for (const contentItem of item.content) {
        const text =
          typeof contentItem?.text === "string"
            ? contentItem.text
            : typeof contentItem?.output_text === "string"
              ? contentItem.output_text
              : null;

        if (text) {
          chunks.push(text);
        }
      }
    }
  }

  const result = chunks.join("\n").trim();
  return result.length > 0 ? result : null;
}

async function persistRunDebug(
  supabase: ReturnType<typeof createClient>,
  analysisRunId: string,
  data: {
    stage?: string;
    observations?: Observation[];
    next_step?: string;
    raw_text_output?: string;
    llm_output_raw?: unknown;
    llm_request_error?: string;
    llm_prompt_char_count?: number;
    raw_text_char_count?: number;
  }
) {
  await supabase
    .from("analysis_runs")
    .update({
      llm_output_raw: data.llm_output_raw ?? null,
      structured_output_json: {
        stage: data.stage ?? "generate_observations",
        observations: data.observations ?? [],
        next_step: data.next_step ?? null,
        raw_text_output: data.raw_text_output ?? null,
        llm_request_error: data.llm_request_error ?? null,
        llm_prompt_char_count: data.llm_prompt_char_count ?? null,
        raw_text_char_count: data.raw_text_char_count ?? null
      },
      updated_at: new Date().toISOString()
    })
    .eq("id", analysisRunId);
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
