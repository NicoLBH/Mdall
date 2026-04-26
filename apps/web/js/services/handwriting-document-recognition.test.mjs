import test from "node:test";
import assert from "node:assert/strict";

import {
  recognizeHandwrittenDocument,
  __handwritingRecognitionMock
} from "./handwriting-document-recognition.js";

const { HANDWRITING_MOCK_STORAGE_KEY, RECOGNITION_FUNCTION_NAME } = __handwritingRecognitionMock;

function withLocalStorage(initialValue = "") {
  const data = new Map([[HANDWRITING_MOCK_STORAGE_KEY, initialValue]]);
  globalThis.localStorage = {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}

test("recognizeHandwrittenDocument retourne Markdown + LaTeX en mode mock", async () => {
  withLocalStorage("1");

  const result = await recognizeHandwrittenDocument({
    strokes: [{ id: "s1", points: [{ x: 0.1, y: 0.2, t: 1, pressure: 0.5 }] }],
    canvasSize: { width: 1024, height: 768 },
    subjectContext: { subjectId: "subject-1" }
  });

  assert.equal(typeof result.markdown, "string");
  assert.equal(result.provider, "mock-local");
  assert.match(result.markdown, /\$\$/);
  assert.match(result.markdown, /\\int_0\^1/);
});

test("recognizeHandwrittenDocument appelle l'Edge Function hors mock avec headers Supabase", async () => {
  withLocalStorage("0");
  globalThis.window = { MDALL_CONFIG: { supabaseUrl: "https://example.supabase.co" } };
  globalThis.__MDALL_TEST_BUILD_SUPABASE_AUTH_HEADERS__ = async (extra = {}) => ({
    ...extra,
    Authorization: "Bearer test-token",
    apikey: "test-anon-key"
  });

  let calledUrl = "";
  let calledPayload = null;
  let calledHeaders = null;
  globalThis.fetch = async (url, options = {}) => {
    calledUrl = String(url || "");
    calledHeaders = options.headers || null;
    calledPayload = JSON.parse(String(options.body || "{}"));
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ markdown: "## depuis edge", provider: "openai" });
      }
    };
  };

  const result = await recognizeHandwrittenDocument({
    strokes: [{ id: "s1", points: [{ x: 0.2, y: 0.3 }] }],
    imageDataUrl: "data:image/jpeg;base64,abc",
    canvasSize: { width: 1200, height: 800 },
    subjectContext: { subjectId: "subject-1", composerKind: "main" }
  });

  assert.equal(result.markdown, "## depuis edge");
  assert.equal(result.provider, "openai");
  assert.match(calledUrl, new RegExp(`/functions/v1/${RECOGNITION_FUNCTION_NAME}$`));
  assert.equal(calledPayload.imageDataUrl, "data:image/jpeg;base64,abc");
  assert.equal(calledHeaders.Authorization, "Bearer test-token");
  assert.equal(calledHeaders.apikey, "test-anon-key");

  delete globalThis.__MDALL_TEST_BUILD_SUPABASE_AUTH_HEADERS__;
});

test("recognizeHandwrittenDocument remonte une erreur claire si l'Edge Function répond en erreur", async () => {
  withLocalStorage("0");
  globalThis.window = { MDALL_CONFIG: { supabaseUrl: "https://example.supabase.co" } };
  globalThis.__MDALL_TEST_BUILD_SUPABASE_AUTH_HEADERS__ = async (extra = {}) => ({ ...extra, Authorization: "Bearer test-token", apikey: "anon" });
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    async text() {
      return JSON.stringify({ error: "Reconnaissance manuscrite non configurée" });
    }
  });

  await assert.rejects(
    () => recognizeHandwrittenDocument({ strokes: [], imageDataUrl: "data:image/jpeg;base64,abc" }),
    /Reconnaissance manuscrite non configurée/
  );

  delete globalThis.__MDALL_TEST_BUILD_SUPABASE_AUTH_HEADERS__;
});

test("le markdown mock contient des blocs mathématiques $$...$$", async () => {
  withLocalStorage("1");

  const { markdown } = await recognizeHandwrittenDocument();
  const blockCount = (markdown.match(/\$\$/g) || []).length;

  assert.ok(blockCount >= 2);
});
