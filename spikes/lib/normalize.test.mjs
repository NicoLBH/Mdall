import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeConfidence,
  normalizeReferenceKey,
  normalizeTextKey,
  normalizeWhitespace,
  slugifyIdentifier,
  slugifyTimestamp,
  stripDiacritics
} from "./normalize.mjs";

const SAMPLES = [
  "",
  "   ",
  "Avis n° 65",
  "  Avis   n°   65  ",
  "OBS_65/A",
  "Étanchéité   toiture — reprise",
  "ITEM 67 bis",
  "déjà-vu\tet\nretours"
];

test("les normalisations sont idempotentes (f(f(x)) === f(x))", () => {
  for (const fn of [normalizeWhitespace, stripDiacritics, normalizeTextKey, normalizeReferenceKey, slugifyIdentifier]) {
    for (const sample of SAMPLES) {
      const once = fn(sample);
      assert.equal(fn(once), once, `${fn.name} n'est pas stable sur ${JSON.stringify(sample)}`);
    }
  }
});

test("normalizeWhitespace réduit les blancs et tolère null/undefined", () => {
  assert.equal(normalizeWhitespace("  a   b \n c "), "a b c");
  assert.equal(normalizeWhitespace(null), "");
  assert.equal(normalizeWhitespace(undefined), "");
});

test("stripDiacritics conserve la casse et retire les accents", () => {
  assert.equal(stripDiacritics("Étanchéité"), "Etancheite");
  assert.equal(stripDiacritics("béton armé"), "beton arme");
});

test("normalizeReferenceKey unifie casse, accents et séparateurs", () => {
  assert.equal(normalizeReferenceKey("  obs_65 / a "), "OBS-65-A");
  assert.equal(normalizeReferenceKey("Avis n° 65"), "AVIS-N°-65");
  assert.equal(normalizeReferenceKey("avis   n°   65"), normalizeReferenceKey("Avis n° 65"));
});

test("normalizeReferenceKey ne fusionne pas deux références différentes", () => {
  assert.notEqual(normalizeReferenceKey("ITEM 67"), normalizeReferenceKey("ITEM 67 bis"));
  assert.notEqual(normalizeReferenceKey("65"), normalizeReferenceKey("651"));
});

test("normalizeTextKey produit une clé comparable insensible à la casse et aux accents", () => {
  assert.equal(normalizeTextKey(" Reprendre l'ÉTANCHÉITÉ  toiture "), "reprendre l'etancheite toiture");
});

test("normalizeConfidence : inconnu vaut null, jamais 0", () => {
  assert.equal(normalizeConfidence(undefined), null);
  assert.equal(normalizeConfidence(null), null);
  assert.equal(normalizeConfidence(""), null);
  assert.equal(normalizeConfidence("abc"), null);
  assert.equal(normalizeConfidence(0), 0);
  assert.equal(normalizeConfidence(0.42), 0.42);
  assert.equal(normalizeConfidence(-1), 0);
  assert.equal(normalizeConfidence(4), 1);
});

test("slugifyTimestamp et slugifyIdentifier produisent des identifiants stables", () => {
  assert.equal(slugifyTimestamp(new Date("2026-08-26T13:45:00.000Z")), "20260826T134500Z");
  assert.equal(slugifyIdentifier("Rapport CT — Avis n° 65"), "rapport-ct-avis-n-65");
  assert.equal(slugifyIdentifier("   "), "sans-id");
});
