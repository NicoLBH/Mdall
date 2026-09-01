import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSIST_AUTH_MISSING,
  ASSIST_TOKEN_MARGIN_MS,
  assistHeaders,
  isTokenStale
} from "./assist-auth.js";

test("un jeton absent ne produit pas d'en-têtes : il arrête l'envoi", () => {
  assert.throws(() => assistHeaders(""), new RegExp(ASSIST_AUTH_MISSING));
  assert.throws(() => assistHeaders(null), new RegExp(ASSIST_AUTH_MISSING));
  assert.throws(() => assistHeaders(undefined), new RegExp(ASSIST_AUTH_MISSING));
});

test("un jeton fait d'espaces est un jeton absent", () => {
  // `fetch` enverrait « Authorization: Bearer    » sans broncher, et le
  // webhook le lirait comme une requête signée. C'est le cas qu'il faut
  // fermer, pas la chaîne vide.
  assert.throws(() => assistHeaders("   "), new RegExp(ASSIST_AUTH_MISSING));
});

test("un jeton présent devient un en-tête porteur, avec le type du corps", () => {
  const headers = assistHeaders("  abc.def.ghi  ");

  assert.equal(headers.Authorization, "Bearer abc.def.ghi");
  assert.equal(headers["Content-Type"], "application/json");
});

test("une session sans échéance connue n'est pas déclarée périmée", () => {
  // Ne pas savoir n'autorise pas à prétendre qu'elle est morte : on la
  // renouvellerait à chaque message, sans raison.
  assert.equal(isTokenStale({}), false);
  assert.equal(isTokenStale(null), false);
});

test("une session qui expire dans la minute est déjà trop vieille pour partir", () => {
  const now = 1_700_000_000_000;
  const dansTrenteSecondes = { expires_at: (now + 30_000) / 1000 };

  assert.equal(isTokenStale(dansTrenteSecondes, { now }), true);
});

test("une session qui vit encore une heure part telle quelle", () => {
  const now = 1_700_000_000_000;
  const dansUneHeure = { expires_at: (now + 3_600_000) / 1000 };

  assert.equal(isTokenStale(dansUneHeure, { now }), false);
});

test("l'échéance se lit en secondes, pas en millisecondes", () => {
  // Lue en millisecondes, une échéance passée depuis longtemps paraîtrait
  // lointaine : le jeton mort serait envoyé, et personne ne le verrait.
  const now = 1_700_000_000_000;
  const perimeeDepuisUnJour = { expires_at: (now - 86_400_000) / 1000 };

  assert.equal(isTokenStale(perimeeDepuisUnJour, { now }), true);
});

test("la marge par défaut est d'une minute, et elle se règle", () => {
  const now = 1_700_000_000_000;
  const dansDeuxMinutes = { expires_at: (now + 120_000) / 1000 };

  assert.equal(ASSIST_TOKEN_MARGIN_MS, 60_000);
  assert.equal(isTokenStale(dansDeuxMinutes, { now }), false);
  assert.equal(isTokenStale(dansDeuxMinutes, { now, marginMs: 300_000 }), true);
});
