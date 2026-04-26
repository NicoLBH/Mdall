import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type RecognizeRequest = {
  strokes?: unknown[];
  imageDataUrl?: string;
  canvasSize?: { width?: number; height?: number } | null;
  context?: {
    subjectId?: string;
    composerKind?: "main" | "reply" | "edit" | string;
  } | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json"
};

const HANDWRITING_INSTRUCTIONS = `Tu es un moteur de transcription pour une application de discussion académique.
À partir de l’image manuscrite fournie, produis uniquement du Markdown compatible avec KaTeX.

Règles de sortie :
- Retourne uniquement le Markdown final, sans commentaire, sans balise \`\`\`markdown.
- Respecte l’ordre spatial de lecture : de haut en bas, de gauche à droite.
- Reconstitue les titres avec #, ## ou ### si l’écriture indique un titre ou un sous-titre.
- Les sous-titres soulignés doivent devenir des titres Markdown.
- Les paragraphes manuscrits doivent devenir du texte Markdown normal.
- Les formules mathématiques inline doivent être encadrées par \\( ... \\).
- Les formules mathématiques en bloc doivent être encadrées par $$ ... $$.
- Utilise du LaTeX compatible KaTeX.
- Les flèches manuscrites doivent devenir des flèches textuelles ou LaTeX : \\Rightarrow, \\to, \\Longrightarrow selon le contexte.
- Préserve les listes si l’écriture ressemble à une liste.
- Ne devine pas du contenu absent.
- Si une zone est illisible, écris [illisible] plutôt que d’inventer.
- N’ajoute aucune explication extérieure.`;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders
  });
}

function toString(value: unknown) {
  return String(value || "").trim();
}

function extractOpenAiText(payload: any): string {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const outputs = Array.isArray(payload?.output) ? payload.output : [];
  const chunks: string[] = [];

  for (const output of outputs) {
    const content = Array.isArray(output?.content) ? output.content : [];
    for (const item of content) {
      if (typeof item?.text === "string" && item.text.trim()) {
        chunks.push(item.text);
      }
    }
  }

  if (chunks.length) {
    return chunks.join("\n").trim();
  }

  const fallback = toString(payload?.response?.output_text);
  return fallback;
}

function cleanupMarkdown(markdown: string): string {
  const raw = String(markdown || "").trim();
  if (!raw) return "";
  return raw
    .replace(/^```markdown\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function buildPrompt({ context, canvasSize, strokeCount }: { context: RecognizeRequest["context"]; canvasSize: RecognizeRequest["canvasSize"]; strokeCount: number }) {
  const composerKind = toString(context?.composerKind || "main") || "main";
  const subjectId = toString(context?.subjectId || "");
  const width = Number(canvasSize?.width || 0);
  const height = Number(canvasSize?.height || 0);

  return [
    "Contexte de saisie manuscrite :",
    `- composerKind: ${composerKind}`,
    `- subjectId: ${subjectId || "unknown"}`,
    `- canvasSize: ${width > 0 && height > 0 ? `${width}x${height}` : "unknown"}`,
    `- strokeCount: ${Math.max(0, Number(strokeCount || 0))}`,
    "",
    "Transcris l'image en Markdown + LaTeX, en appliquant strictement les règles système."
  ].join("\n");
}

function serializeError(error: unknown) {
  return {
    message: toString((error as Error)?.message || "Unexpected error"),
    name: toString((error as Error)?.name || "Error")
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Missing Authorization bearer token", code: "AUTH_REQUIRED" }, 401);
    }

    const body = (await req.json().catch(() => null)) as RecognizeRequest | null;
    const strokes = Array.isArray(body?.strokes) ? body.strokes : [];
    const imageDataUrl = toString(body?.imageDataUrl);
    const canvasSize = body?.canvasSize && typeof body.canvasSize === "object"
      ? {
          width: Number(body.canvasSize.width || 0),
          height: Number(body.canvasSize.height || 0)
        }
      : null;
    const context = body?.context && typeof body.context === "object"
      ? {
          subjectId: toString(body.context.subjectId),
          composerKind: toString(body.context.composerKind || "main") || "main"
        }
      : null;

    if (!imageDataUrl) {
      return json({ error: "imageDataUrl is required", code: "INVALID_PAYLOAD" }, 400);
    }

    const supabaseUrl = toString(Deno.env.get("SUPABASE_URL"));
    const supabaseAnonKey = toString(Deno.env.get("SUPABASE_ANON_KEY"));
    const openAiApiKey = toString(Deno.env.get("OPENAI_API_KEY"));
    const mockEnabled = toString(Deno.env.get("HANDWRITING_RECOGNITION_MOCK")) === "1";

    if (!supabaseUrl || !supabaseAnonKey) {
      return json({ error: "Supabase auth is not configured", code: "SUPABASE_NOT_CONFIGURED" }, 503);
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: authData, error: authError } = await userSupabase.auth.getUser();
    const userId = toString(authData?.user?.id);
    if (authError || !userId) {
      return json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
    }

    console.log("recognize-handwritten-document:start", {
      user_id: userId,
      composerKind: context?.composerKind || "main",
      hasImage: !!imageDataUrl,
      strokeCount: strokes.length
    });

    if (!openAiApiKey) {
      if (mockEnabled) {
        return json({
          markdown: "[illisible]",
          provider: "mock-backend",
          model: "mock",
          confidence: null,
          warnings: ["OPENAI_API_KEY missing: mock mode enabled"]
        }, 200);
      }
      return json({ error: "OpenAI is not configured", code: "OPENAI_NOT_CONFIGURED" }, 503);
    }

    const MODEL = toString(Deno.env.get("OPENAI_HANDWRITING_MODEL")) || "gpt-4.1-mini";
    const prompt = buildPrompt({ context, canvasSize, strokeCount: strokes.length });

    console.log("recognize-handwritten-document:openai-request", {
      model: MODEL,
      imageDataUrlLength: imageDataUrl.length
    });

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        instructions: HANDWRITING_INSTRUCTIONS,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: imageDataUrl }
            ]
          }
        ],
        max_output_tokens: 2000
      })
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text().catch(() => "");
      console.error("recognize-handwritten-document:openai-error", {
        status: openAiResponse.status,
        excerpt: errorText.slice(0, 400)
      });
      return json({ error: "OpenAI request failed", code: "OPENAI_REQUEST_FAILED" }, 502);
    }

    const openAiJson = await openAiResponse.json();
    const markdown = cleanupMarkdown(extractOpenAiText(openAiJson));

    if (!markdown) {
      console.error("recognize-handwritten-document:error", { code: "OPENAI_EMPTY_RESPONSE", message: "Empty markdown after extraction" });
      return json({ error: "OpenAI empty response", code: "OPENAI_EMPTY_RESPONSE" }, 502);
    }

    console.log("recognize-handwritten-document:success", {
      user_id: userId,
      markdownLength: markdown.length
    });

    return json({
      markdown,
      provider: "openai",
      model: MODEL,
      confidence: null,
      warnings: []
    }, 200);
  } catch (error) {
    console.error("recognize-handwritten-document:error", serializeError(error));
    return json({
      error: "Unexpected error",
      code: "UNEXPECTED_ERROR"
    }, 500);
  }
});
