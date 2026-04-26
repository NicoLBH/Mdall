import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

const BACKEND_MOCK_MARKDOWN = `### Résolution

On cherche à calculer :

$$
I = \\int_0^1 x^2 \\, dx
$$

On utilise :

$$
\\int x^n dx = \\frac{x^{n+1}}{n+1}
$$

Donc :

$$
I = \\left[ \\frac{x^3}{3} \\right]_0^1 = \\frac{1}{3}
$$

Conclusion : \\( I = \\frac{1}{3} \\).`;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders
  });
}

function toString(value: unknown) {
  return String(value || "").trim();
}

function hasProviderSecretsConfigured() {
  // Placeholder for future provider wiring (Mathpix/MyScript/OpenAI Vision, etc.)
  // Keep keys strictly server-side in Supabase secrets.
  const mathpixAppId = toString(Deno.env.get("MATHPIX_APP_ID"));
  const mathpixAppKey = toString(Deno.env.get("MATHPIX_APP_KEY"));
  const myscriptAppKey = toString(Deno.env.get("MYSCRIPT_APP_KEY"));
  const openAiApiKey = toString(Deno.env.get("OPENAI_API_KEY"));

  return Boolean(
    (mathpixAppId && mathpixAppKey)
    || myscriptAppKey
    || openAiApiKey
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const body = (await req.json().catch(() => null)) as RecognizeRequest | null;
    const strokes = Array.isArray(body?.strokes) ? body?.strokes : [];
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

    if (!strokes.length && !imageDataUrl) {
      return json({ error: "strokes or imageDataUrl is required", code: "INVALID_PAYLOAD" }, 400);
    }

    if (!hasProviderSecretsConfigured()) {
      return json({
        markdown: BACKEND_MOCK_MARKDOWN,
        provider: "mock-backend",
        confidence: 0.89,
        warnings: ["No provider secrets configured: returning backend mock response."]
      }, 200);
    }

    // Future provider integration hook:
    // - call selected OCR/handwriting provider here
    // - never expose provider keys to frontend
    // - return Markdown + LaTeX only
    return json({
      markdown: BACKEND_MOCK_MARKDOWN,
      provider: "provider-not-implemented-yet",
      warnings: [
        "Provider secrets are configured but provider integration is not implemented yet.",
        `context.subjectId=${context?.subjectId || ""}`,
        `context.composerKind=${context?.composerKind || "main"}`,
        `canvas=${canvasSize ? `${canvasSize.width}x${canvasSize.height}` : "unknown"}`
      ]
    }, 200);
  } catch (error) {
    return json({
      error: String((error as Error)?.message || "Unexpected error"),
      code: "UNEXPECTED_ERROR"
    }, 500);
  }
});
