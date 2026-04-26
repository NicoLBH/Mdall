const HANDWRITING_MOCK_STORAGE_KEY = "mdall:debug-handwriting-document-mock";

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

/**
 * Architecture note:
 * - Real handwriting recognition MUST be executed by a backend / Edge Function.
 * - Provider secrets (Mathpix/MyScript/etc.) must never be exposed in frontend code.
 * - This service is expected to return Markdown + LaTeX content compatible with existing KaTeX rendering.
 */
export async function recognizeHandwrittenDocument({ strokes = [], canvasSize = null, subjectContext = null } = {}) {
  const safeStrokes = Array.isArray(strokes) ? strokes : [];
  const safeCanvasSize = canvasSize && typeof canvasSize === "object" ? canvasSize : null;
  const safeSubjectContext = subjectContext && typeof subjectContext === "object" ? subjectContext : null;

  if (isHandwritingMockEnabled()) {
    return {
      markdown: MOCK_MARKDOWN,
      provider: "mock-local",
      confidence: 0.93,
      warnings: []
    };
  }

  const error = new Error("Reconnaissance manuscrite non configurée");
  error.code = "HANDWRITING_RECOGNITION_NOT_CONFIGURED";
  error.meta = {
    strokeCount: safeStrokes.length,
    hasCanvasSize: !!safeCanvasSize,
    hasSubjectContext: !!safeSubjectContext
  };
  throw error;
}

export const __handwritingRecognitionMock = {
  HANDWRITING_MOCK_STORAGE_KEY,
  MOCK_MARKDOWN,
  isHandwritingMockEnabled
};
