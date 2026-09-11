import test from "node:test";
import assert from "node:assert/strict";

import {
  REPRISES_QUI_INTERPELLENT,
  repriseQuiInterpelle,
  repriseQuiTraine,
  repriseSansChangement
} from "./reprise-sans-changement.js";

/** Un compte rendu qui reprend le point. Aucun nom réel. */
const cr = (numero, tenueLe, aChange = false) => ({ numero: String(numero), tenueLe, aChange });

const enFrancais = (iso) => iso.split("-").reverse().join("/");

/* ── Une ligne, et elle s'étend ──────────────────────────────────────────── */

test("un seul compte rendu ne compte pas les réunions", () => {
  // « 1 réunion » se lit comme un décompte qui n'a pas commencé.
  const dit = repriseSansChangement([cr(15, "2026-11-12")], { dater: enFrancais });

  assert.equal(dit.texte, "Pas de modification au compte rendu n° 15 du 12/11/2026.");
  assert.doesNotMatch(dit.texte, /réunions/);
});

test("la ligne s'étend au lieu de se répéter", () => {
  const dit = repriseSansChangement(
    [cr(15, "2026-11-12"), cr(16, "2026-11-19")],
    { dater: enFrancais }
  );

  assert.match(dit.texte, /comptes rendus n° 15 à 16/);
  assert.match(dit.texte, /2 réunions/);
});

/**
 * Le signal que la première version du § 39 jetait avec le bruit. Un point
 * relancé depuis neuf réunions sans que rien ne bouge est **exactement**
 * l'information qu'on cherche : c'est elle qui distingue un chantier qui avance
 * d'un chantier qui piétine.
 */
test("neuf réunions sans mouvement se lisent d'un coup d'œil", () => {
  const mentions = Array.from({ length: 9 }, (_, rang) => cr(15 + rang, "2026-11-12"));
  const dit = repriseSansChangement(mentions, { dater: enFrancais });

  assert.match(dit.texte, /n° 15 à 23/);
  assert.match(dit.texte, /9 réunions depuis le 12\/11\/2026/);
  assert.equal(dit.combien, 9);
});

/* ── La ligne repart de ce qui a bougé ───────────────────────────────────── */

/**
 * Ce qui a changé a son propre commentaire, daté ; la ligne repart de là. Sans
 * cela elle annoncerait « rien n'a bougé depuis la première réunion » sur un
 * sujet qui a changé trois fois.
 */
test("la suite s'arrête au dernier mouvement", () => {
  const dit = repriseSansChangement([
    cr(12, "2026-10-01"),
    cr(13, "2026-10-08"),
    cr(14, "2026-10-15", true),
    cr(15, "2026-10-22"),
    cr(16, "2026-10-29")
  ], { dater: enFrancais });

  assert.match(dit.texte, /n° 15 à 16/);
  assert.equal(dit.combien, 2);
  assert.equal(dit.depuis, "22/10/2026");
});

test("un sujet qui vient de bouger ne dit rien", () => {
  const dit = repriseSansChangement([cr(15, "2026-11-12"), cr(16, "2026-11-19", true)]);

  assert.equal(dit.texte, "", "la ligne se tait : le commentaire du mouvement dit déjà tout");
  assert.equal(dit.combien, 0);
});

test("aucun compte rendu, aucune ligne", () => {
  assert.equal(repriseSansChangement([]).texte, "");
  assert.deepEqual(repriseQuiTraine(), []);
});

/* ── Ce qui manque se voit ───────────────────────────────────────────────── */

/**
 * Un compte rendu peut ne pas reprendre le point du tout. Les bornes disent
 * alors lesquels, le compte dit combien, et les deux ne concordent pas — c'est
 * une information, pas une incohérence.
 */
test("les bornes et le compte peuvent ne pas concorder", () => {
  const dit = repriseSansChangement([cr(15, "2026-11-12"), cr(18, "2026-12-03")]);

  assert.match(dit.texte, /n° 15 à 18/);
  assert.match(dit.texte, /2 réunions/);
});

test("une date manquante ne s'invente pas", () => {
  const dit = repriseSansChangement([cr(15, ""), cr(16, "")]);

  assert.match(dit.texte, /n° 15 à 16/);
  assert.doesNotMatch(dit.texte, /depuis le/);
});

/* ── Ce qui se remarque, et ce qui ne juge pas ───────────────────────────── */

test("ce qui traîne depuis longtemps se remarque", () => {
  const court = Array.from({ length: REPRISES_QUI_INTERPELLENT - 1 }, (_, r) => cr(10 + r, "2026-01-01"));
  const long = Array.from({ length: REPRISES_QUI_INTERPELLENT }, (_, r) => cr(10 + r, "2026-01-01"));

  assert.equal(repriseQuiInterpelle(court), false);
  assert.equal(repriseQuiInterpelle(long), true);
});

test("la ligne donne le compte, elle ne juge pas", () => {
  const mentions = Array.from({ length: 34 }, (_, r) => cr(10 + r, "2026-01-01"));
  const dit = repriseSansChangement(mentions);

  assert.match(dit.texte, /34 réunions/);
  for (const interdit of [/urgent/i, /grave/i, /bloqué/i, /retard/i, /oubli/i, /visa/i]) {
    assert.doesNotMatch(dit.texte, interdit, `« ${dit.texte} » juge`);
  }
});
