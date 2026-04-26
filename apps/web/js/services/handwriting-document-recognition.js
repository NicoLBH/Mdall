const HANDWRITING_MOCK_STORAGE_KEY = "mdall:debug-handwriting-document-mock";
const RECOGNITION_FUNCTION_NAME = "recognize-handwritten-document";
const DEFAULT_SUPABASE_URL = "https://olgxhfgdzyghlzxmremz.supabase.co";

const MOCK_MARKDOWN = `### Résolution

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

function isHandwritingMockEnabled(env = globalThis) {
  try {
    const raw = String(env?.localStorage?.getItem?.(HANDWRITING_MOCK_STORAGE_KEY) || "").trim();
    return raw === "1";
  } catch {
    return false;
  }
}

function normalizeResult(payload = {}) {
  return {
    markdown: String(payload?.markdown || ""),
    provider: typeof payload?.provider === "string" ? payload.provider : undefined,
    confidence: Number.isFinite(Number(payload?.confidence)) ? Number(payload.confidence) : undefined,
    warnings: Array.isArray(payload?.warnings) ? payload.warnings.map((item) => String(item || "")).filter(Boolean) : undefined
  };
}

async function callRecognitionEdgeFunction({ strokes = [], canvasSize = null, subjectContext = null } = {}) {
  const supabaseUrl = String(
    globalThis?.window?.MDALL_CONFIG?.supabaseUrl
    || globalThis?.window?.SUPABASE_URL
    || DEFAULT_SUPABASE_URL
  ).trim();
  if (!supabaseUrl) {
    throw new Error("Reconnaissance manuscrite non configurée");
  }

  const endpoint = `${supabaseUrl}/functions/v1/${RECOGNITION_FUNCTION_NAME}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    cache: "no-store",
    body: JSON.stringify({
      strokes: Array.isArray(strokes) ? strokes : [],
      canvasSize: canvasSize && typeof canvasSize === "object" ? canvasSize : null,
      context: subjectContext && typeof subjectContext === "object" ? subjectContext : null
    })
  });

  const text = await response.text().catch(() => "");
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const errorMessage = String(json?.error || text || `HTTP ${response.status}`).trim();
    throw new Error(errorMessage || "Reconnaissance manuscrite non configurée");
  }

  return normalizeResult(json || {});
}

/**
 * Architecture note:
 * - Real handwriting recognition MUST be executed by a backend / Edge Function.
 * - Provider secrets (Mathpix/MyScript/etc.) must never be exposed in frontend code.
 * - This service is expected to return Markdown + LaTeX content compatible with existing KaTeX rendering.
 */
export async function recognizeHandwrittenDocument({ strokes = [], canvasSize = null, subjectContext = null } = {}) {
  if (isHandwritingMockEnabled()) {
    return {
      markdown: MOCK_MARKDOWN,
      provider: "mock-local",
      confidence: 0.93,
      warnings: []
    };
  }

  try {
    return await callRecognitionEdgeFunction({ strokes, canvasSize, subjectContext });
  } catch (error) {
    const message = String(error?.message || "").trim();
    const normalizedMessage = message || "Reconnaissance manuscrite non configurée";
    throw new Error(normalizedMessage);
  }
}

export const __handwritingRecognitionMock = {
  HANDWRITING_MOCK_STORAGE_KEY,
  MOCK_MARKDOWN,
  isHandwritingMockEnabled,
  RECOGNITION_FUNCTION_NAME
};
