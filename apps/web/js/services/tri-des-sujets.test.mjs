import test from "node:test";
import assert from "node:assert/strict";

import {
  TRI, derniereActivite, motDuTri, normaliserLeTri, trierLesSujets, triSuivant
} from "./tri-des-sujets.js";

const sujet = (id, dates = {}) => ({ id, title: `Sujet ${id}`, ...dates });

/* ── Ce que le tri sert à savoir ─────────────────────────────────────────── */

/**
 * La question d'origine : « est-ce que des sujets continuent d'arriver ? ». Le
 * compteur seul n'y répond pas ; ce qui a bougé en dernier, en tête de liste,
 * y répond.
 */
test("ce qui a bougé en dernier passe devant", () => {
  const range = trierLesSujets([
    sujet("vieux", { updated_at: "2026-01-04T10:00:00Z" }),
    sujet("recent", { updated_at: "2026-03-02T09:00:00Z" }),
    sujet("moyen", { updated_at: "2026-02-11T18:00:00Z" })
  ], TRI.DERNIERE_ACTIVITE);

  assert.deepEqual(range.map((element) => element.id), ["recent", "moyen", "vieux"]);
});

test("sans tri demandé, l'ordre du projet reste intact", () => {
  const sujets = [sujet("b", { updated_at: "2026-01-01T00:00:00Z" }), sujet("a", { updated_at: "2026-09-01T00:00:00Z" })];
  assert.deepEqual(trierLesSujets(sujets, TRI.PROJET).map((element) => element.id), ["b", "a"]);
});

/* ── Ne pas savoir n'est pas « à l'instant » ─────────────────────────────── */

/**
 * **Règle 5.** La lecture qui sert à écrire « ouvert il y a trois jours »
 * retombe sur la date du jour quand elle ne trouve rien : tolérable pour une
 * phrase, ruineux pour un tri, où un sujet sans date remonterait en tête comme
 * s'il venait de bouger — exactement le contraire de ce qu'on cherche à voir.
 */
test("un sujet sans date ne se dit pas fraîchement modifié", () => {
  assert.equal(derniereActivite(sujet("nu")), "");
  assert.equal(derniereActivite(null), "");
});

test("les sujets sans date se rangent derrière, dans leur ordre", () => {
  const range = trierLesSujets([
    sujet("nu-1"),
    sujet("date", { updated_at: "2026-01-04T10:00:00Z" }),
    sujet("nu-2")
  ], TRI.DERNIERE_ACTIVITE);

  assert.deepEqual(range.map((element) => element.id), ["date", "nu-1", "nu-2"]);
});

test("une date illisible se traite comme une absence, pas comme un zéro", () => {
  // `Date.parse("bientôt")` rend `NaN` ; le laisser passer rangerait le sujet
  // à une place tirée au sort.
  const range = trierLesSujets([
    sujet("casse", { updated_at: "bientôt" }),
    sujet("date", { updated_at: "2020-01-01T00:00:00Z" })
  ], TRI.DERNIERE_ACTIVITE);

  assert.deepEqual(range.map((element) => element.id), ["date", "casse"]);
});

/* ── Où la date se lit ───────────────────────────────────────────────────── */

test("la modification prime sur la création", () => {
  assert.equal(
    derniereActivite(sujet("x", { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-05-05T00:00:00Z" })),
    "2026-05-05T00:00:00Z"
  );
});

test("un sujet jamais modifié se range à sa création", () => {
  assert.equal(derniereActivite(sujet("x", { created_at: "2026-01-01T00:00:00Z" })), "2026-01-01T00:00:00Z");
});

test("la date se lit aussi dans la ligne brute de la base", () => {
  assert.equal(derniereActivite({ id: "x", raw: { updated_at: "2026-04-04T00:00:00Z" } }), "2026-04-04T00:00:00Z");
});

/* ── Ce que le tri ne doit jamais faire ──────────────────────────────────── */

/**
 * Le compteur et la liste se lisent sur la même collection. Trier en place
 * changerait l'ordre sous les pieds de tout ce qui la parcourt, et perdre ou
 * dupliquer une ligne ferait diverger le compte de ce qui s'affiche — la panne
 * même qu'on vient de passer trois tours à poursuivre.
 */
test("trier ne change ni le nombre de sujets ni la liste d'origine", () => {
  const sujets = [sujet("a", { updated_at: "2026-01-01T00:00:00Z" }), sujet("b"), sujet("c", { updated_at: "2026-06-01T00:00:00Z" })];
  const range = trierLesSujets(sujets, TRI.DERNIERE_ACTIVITE);

  assert.equal(range.length, sujets.length);
  assert.deepEqual(sujets.map((element) => element.id), ["a", "b", "c"], "la liste d'origine a été triée en place");
  assert.deepEqual(new Set(range.map((element) => element.id)), new Set(["a", "b", "c"]));
});

test("sans rien lui donner, le tri ne se plaint pas", () => {
  assert.deepEqual(trierLesSujets(), []);
  assert.deepEqual(trierLesSujets(null, TRI.DERNIERE_ACTIVITE), []);
});

/* ── La bascule ──────────────────────────────────────────────────────────── */

test("le bouton met le tri, puis le retire", () => {
  assert.equal(triSuivant(TRI.PROJET), TRI.DERNIERE_ACTIVITE);
  assert.equal(triSuivant(TRI.DERNIERE_ACTIVITE), TRI.PROJET);
});

test("un tri inconnu se lit comme l'ordre du projet", () => {
  assert.equal(normaliserLeTri("par couleur"), TRI.PROJET);
  assert.equal(normaliserLeTri(undefined), TRI.PROJET);
});

/**
 * L'info-bulle annonce ce que le clic va faire. Décrire l'état courant se lit à
 * l'envers une fois sur deux : « trié par dernière activité » sur un bouton qui
 * va justement défaire ce tri.
 */
test("l'info-bulle annonce le geste, pas l'état", () => {
  assert.match(motDuTri(TRI.PROJET), /Trier par dernière activité/);
  assert.match(motDuTri(TRI.DERNIERE_ACTIVITE), /Revenir à l'ordre du projet/);
});

test("aucun mot du tri ne parle comme un outil de visa", () => {
  // Règle 12 : le mot du métier reste dans le code, jamais à l'écran.
  for (const tri of Object.values(TRI)) {
    for (const interdit of [/visa/i, /à valider/i, /approbation/i]) {
      assert.doesNotMatch(motDuTri(tri), interdit);
    }
  }
});
