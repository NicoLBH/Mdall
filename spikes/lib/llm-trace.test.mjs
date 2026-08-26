import test from "node:test";
import assert from "node:assert/strict";

import { createLlmTraceCollector, redactDeep, redactSecrets } from "./llm-trace.mjs";
import { sha256 } from "./json-io.mjs";

test("redactSecrets masque les formes de clés les plus courantes", () => {
  assert.equal(redactSecrets("clé sk-abcdefghijklmnop1234"), "clé [REDACTED]");
  assert.equal(redactSecrets("Authorization: Bearer abcdefghijklmnop"), "Authorization: [REDACTED]");
  assert.match(redactSecrets('{"api_key": "abcdefghijklmnop"}'), /\[REDACTED\]/);
  assert.match(redactSecrets("SUPABASE service_role_key = abcdefghijklmnop"), /\[REDACTED\]/);
  assert.equal(redactSecrets("aucun secret ici"), "aucun secret ici");
});

test("redactDeep parcourt objets et tableaux sans casser la structure", () => {
  const redacted = redactDeep({
    prompt: "utilise sk-abcdefghijklmnop1234",
    nested: [{ token: "Bearer abcdefghijklmnop" }],
    keep: 42,
    nothing: null
  });

  assert.equal(redacted.prompt, "utilise [REDACTED]");
  assert.equal(redacted.nested[0].token, "[REDACTED]");
  assert.equal(redacted.keep, 42);
  assert.equal(redacted.nothing, null);
});

test("le collecteur enregistre modèle, version de prompt et empreintes", () => {
  const trace = createLlmTraceCollector();
  const call = trace.record({
    model: "modele-test",
    promptId: "ct-extraction",
    promptVersion: "2026-08-26.1",
    promptText: "Extrais les avis du rapport.",
    rawResponse: '{"avis": []}',
    normalizedOutput: { avis: [] },
    params: { temperature: 0 },
    at: new Date("2026-08-26T10:00:00.000Z")
  });

  assert.equal(call.model, "modele-test");
  assert.equal(call.prompt_version, "2026-08-26.1");
  assert.equal(call.prompt_sha256, sha256("Extrais les avis du rapport."));
  assert.equal(call.raw_response_sha256, sha256('{"avis": []}'));
  assert.equal(call.recorded_at, "2026-08-26T10:00:00.000Z");
  assert.equal(trace.count, 1);
  assert.equal(trace.list().length, 1);
});

test("aucun secret ne survit dans un appel enregistré", () => {
  const trace = createLlmTraceCollector();
  const call = trace.record({
    model: "modele-test",
    promptText: "utilise la clé sk-abcdefghijklmnop1234 pour appeler l'API",
    rawResponse: "réponse contenant sk-abcdefghijklmnop1234",
    params: { authorization: "Bearer abcdefghijklmnop" }
  });

  const serialized = JSON.stringify(call);
  assert.ok(!serialized.includes("sk-abcdefghijklmnop1234"));
  assert.ok(serialized.includes("[REDACTED]"));
  assert.equal(call.params.authorization, "[REDACTED]");
});

test("les previews sont tronqués mais l'empreinte reste celle du texte complet", () => {
  const trace = createLlmTraceCollector({ previewLength: 20 });
  const longPrompt = "a".repeat(500);
  const call = trace.record({ model: "modele-test", promptText: longPrompt });

  assert.ok(call.prompt_preview.length < longPrompt.length);
  assert.match(call.prompt_preview, /tronqué, 500 caractères/);
  assert.equal(call.prompt_sha256, sha256(longPrompt));
});

test("un appel sans modèle est refusé", () => {
  const trace = createLlmTraceCollector();
  assert.throws(() => trace.record({ promptText: "x" }), /'model' est obligatoire/);
});

test("list() renvoie une copie : le journal ne peut pas être modifié de l'extérieur", () => {
  const trace = createLlmTraceCollector();
  trace.record({ model: "modele-test" });
  const calls = trace.list();
  calls.push({ model: "injecté" });

  assert.equal(trace.count, 1);
});
