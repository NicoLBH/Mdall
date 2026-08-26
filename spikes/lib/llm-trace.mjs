/**
 * Traçabilité des appels LLM.
 *
 * Aucun spike ne doit pouvoir produire un résultat non rejouable : si un LLM
 * intervient, on enregistre le modèle, la version du prompt, l'empreinte du
 * prompt, la sortie brute (ou une référence vers elle) et la sortie normalisée.
 *
 * Aucune clé d'API n'est lue ni écrite par ce module. Les valeurs enregistrées
 * passent par une redaction défensive avant d'atteindre un fichier.
 */

import { sha256 } from "./json-io.mjs";

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{12,}/g,
  /\bBearer\s+[A-Za-z0-9._-]{12,}/gi,
  /\beyJ[A-Za-z0-9._-]{20,}/g,
  /\b(?:api[_-]?key|apikey|access[_-]?token|service[_-]?role[_-]?key|anon[_-]?key)\b["']?\s*[:=]\s*["']?[A-Za-z0-9._-]{8,}["']?/gi
];

/** Remplace toute chaîne ressemblant à un secret par [REDACTED]. */
export function redactSecrets(value) {
  if (typeof value !== "string") return value;
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, "[REDACTED]"), value);
}

export function redactDeep(value) {
  if (typeof value === "string") return redactSecrets(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, entry] of Object.entries(value)) out[key] = redactDeep(entry);
    return out;
  }
  return value;
}

function truncate(text, maxLength) {
  if (typeof text !== "string") return null;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}… [tronqué, ${text.length} caractères]`;
}

/**
 * Collecteur d'appels LLM à passer au pipeline d'un spike.
 * `previewLength` borne ce qui est stocké en clair dans le fichier de run.
 */
export function createLlmTraceCollector({ previewLength = 600 } = {}) {
  const calls = [];

  return {
    record({
      model,
      promptId = null,
      promptVersion = null,
      promptText = null,
      rawResponse = null,
      rawResponseRef = null,
      normalizedOutput = null,
      params = null,
      at = null
    }) {
      if (!model) throw new Error("llm-trace: le champ 'model' est obligatoire");
      const call = {
        index: calls.length,
        model,
        prompt_id: promptId,
        prompt_version: promptVersion,
        prompt_sha256: promptText === null ? null : sha256(promptText),
        prompt_preview: truncate(redactSecrets(promptText), previewLength),
        raw_response_sha256: rawResponse === null ? null : sha256(rawResponse),
        raw_response_preview: truncate(redactSecrets(rawResponse), previewLength),
        raw_response_ref: rawResponseRef,
        normalized_output: redactDeep(normalizedOutput),
        params: redactDeep(params),
        recorded_at: at instanceof Date ? at.toISOString() : at
      };
      calls.push(call);
      return call;
    },
    list() {
      return calls.slice();
    },
    get count() {
      return calls.length;
    }
  };
}
