import assert from "node:assert/strict";
import test from "node:test";

import { TEMPERATURE_REPRODUCTIBLE, refuseLaTemperature } from "./reglage-du-modele.js";

// ── La température fixée ───────────────────────────────────────────────────

test("la température est zéro, et non une valeur basse", () => {
  // Une valeur basse laisse passer les tirages rares, qui sont précisément
  // ceux qui coupent une liste trop tôt : sur un fil réel, trois passages ont
  // rendu 12, 14 et 17 prises, et le plus pauvre perdait la position contestée
  // du litige.
  assert.equal(TEMPERATURE_REPRODUCTIBLE, 0);
});

// ── Le refus d'un modèle qui n'en veut pas ─────────────────────────────────

test("un 400 qui nomme la température est un refus", () => {
  // Les modèles de raisonnement la rejettent, et le modèle est un réglage :
  // sans cette lecture, le relevé tomberait pour un paramètre de trop et
  // l'écran annoncerait un fournisseur injoignable.
  assert.equal(refuseLaTemperature(
    '{"error":{"message":"Unsupported parameter: \'temperature\' is not supported with this model."}}',
    400
  ), true);
  assert.equal(refuseLaTemperature("Unsupported value: 'temperature' does not support 0", 400), true);
});

test("une panne qui ne nomme pas la température n'en est pas un", () => {
  // Deviner plus largement ferait réessayer sur des pannes qui n'ont rien à
  // voir, et ferait payer deux fois.
  assert.equal(refuseLaTemperature('{"error":{"message":"model not found"}}', 400), false);
  assert.equal(refuseLaTemperature("", 400), false);
});

test("un refus ne se lit que sur un 400", () => {
  // Une limite de débit ou une panne du fournisseur peut mentionner n'importe
  // quoi : seul le rejet d'un paramètre est un 400.
  const corps = "Unsupported parameter: 'temperature'";
  assert.equal(refuseLaTemperature(corps, 429), false);
  assert.equal(refuseLaTemperature(corps, 500), false);
  assert.equal(refuseLaTemperature(corps, 200), false);
});

test("la casse ne cache pas un refus", () => {
  assert.equal(refuseLaTemperature("Unsupported parameter: 'TEMPERATURE'", 400), true);
});

test("rien qui entre ne fait pas un refus", () => {
  assert.equal(refuseLaTemperature(null, null), false);
  assert.equal(refuseLaTemperature(undefined, 400), false);
});
