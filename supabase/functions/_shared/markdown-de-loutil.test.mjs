import test from "node:test";
import assert from "node:assert/strict";

import { lireLaReponseDeLoutil, pagesDuMarkdown } from "./markdown-de-loutil.js";

/* ── Le découpage en pages ───────────────────────────────────────────────── */

test("un document d'un bloc se découpe à ses marqueurs de page", () => {
  const pages = pagesDuMarkdown([
    "=== PAGE 1 ===",
    "# Réunion n° 7",
    "",
    "Reprise d'étanchéité.",
    "=== PAGE 2 ===",
    "## Lot 05"
  ].join("\n"));

  assert.deepEqual(pages.map((page) => page.page), [1, 2]);
  assert.match(pages[0].markdown, /# Réunion n° 7/);
  assert.match(pages[0].markdown, /Reprise d'étanchéité\./);
  assert.equal(pages[1].markdown, "## Lot 05");
});

/**
 * **Un texte sans marqueur ne devient pas une page 1.** Un document sans pages
 * ne peut pas être aligné contre l'autre restitution, et le présenter comme une
 * page unique ferait tout diverger contre un document identique (règle 5).
 */
test("un texte sans marqueur ne s'invente pas une page", () => {
  assert.deepEqual(pagesDuMarkdown("# Un document sans pages"), []);
  assert.deepEqual(pagesDuMarkdown(""), []);
});

test("ce qui précède le premier marqueur n'appartient à aucune page", () => {
  const pages = pagesDuMarkdown("un en-tête perdu\n=== PAGE 1 ===\n# Un");

  assert.equal(pages.length, 1);
  assert.doesNotMatch(pages[0].markdown, /en-tête perdu/);
});

/* ── Les deux formes de réponse ──────────────────────────────────────────── */

test("la forme JSON est prise telle quelle, et rangée", () => {
  const pages = lireLaReponseDeLoutil({ pages: [
    { page: 3, markdown: "trois" }, { page: 1, markdown: "un" }
  ] });

  assert.deepEqual(pages.map((page) => page.page), [1, 3]);
});

test("la forme Markdown passe par le découpage", () => {
  const pages = lireLaReponseDeLoutil({ markdown: "=== PAGE 2 ===\ndeux\n=== PAGE 1 ===\nun" });

  assert.deepEqual(pages.map((page) => page.page), [1, 2]);
  assert.equal(pages[0].markdown, "un");
});

test("une chaîne toute nue est du Markdown", () => {
  assert.deepEqual(lireLaReponseDeLoutil("=== PAGE 1 ===\nun").map((page) => page.page), [1]);
});

/**
 * Une page sans numéro n'a pas de place dans le document, et une page rendue
 * deux fois le doublerait.
 */
test("une page sans numéro ou rendue deux fois ne passe pas", () => {
  const pages = lireLaReponseDeLoutil({ pages: [
    { page: null, markdown: "sans place" },
    { page: 0, markdown: "page zéro" },
    { page: 1, markdown: "le bon" },
    { page: 1, markdown: "le second" }
  ] });

  assert.equal(pages.length, 1);
  assert.equal(pages[0].markdown, "le bon");
});

test("une page rendue vide est une réponse, pas une absence", () => {
  const pages = lireLaReponseDeLoutil({ pages: [{ page: 1, markdown: "" }] });

  assert.equal(pages.length, 1);
  assert.equal(pages[0].markdown, "");
});

test("une réponse qu'on ne sait pas lire ne rend rien", () => {
  assert.deepEqual(lireLaReponseDeLoutil(null), []);
  assert.deepEqual(lireLaReponseDeLoutil({}), []);
  assert.deepEqual(lireLaReponseDeLoutil({ pages: "pas une liste" }), []);
});

/* ── Le relais ───────────────────────────────────────────────────────────── */

/**
 * **Aucune adresse par défaut, et il n'y en aura pas.** Un défaut enverrait le
 * PDF d'un chantier à une adresse que personne n'a choisie.
 */
test("le relais n'a pas d'adresse par défaut, et le dit quand elle manque", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const fonction = readFileSync(
    fileURLToPath(new URL("../reconstituer-par-loutil/index.ts", import.meta.url)), "utf8"
  );

  assert.match(fonction, /Deno\.env\.get\("OPENDATALOADER_URL"\) \?\? ""/);
  assert.match(fonction, /motif: "outil-non-branche"/);
  // La porte : un jeton présent n'est pas quelqu'un de connu.
  assert.match(fonction, /const garde = await requireUser\(req, corsHeaders\)/);
});

/**
 * **Cette restitution ne coûte aucun jeton**, et c'est tout son intérêt : elle
 * n'a donc rien à déposer au compteur. Un dépôt ici ferait apparaître une
 * consommation qui n'a pas eu lieu.
 */
test("le relais ne dépose aucune consommation, parce qu'il n'y en a pas", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const fonction = readFileSync(
    fileURLToPath(new URL("../reconstituer-par-loutil/index.ts", import.meta.url)), "utf8"
  );

  assert.doesNotMatch(fonction, /deposerLaConsommation/);
  assert.doesNotMatch(fonction, /api\.openai\.com|OPENAI/);
});

/**
 * L'adresse de l'outil vit au serveur. Descendue dans le navigateur, elle serait
 * lisible par quiconque ouvre les outils de développement — et le PDF d'un
 * chantier partirait vers une adresse visible de tous.
 */
test("l'adresse de l'outil ne descend pas dans le navigateur", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const service = readFileSync(
    fileURLToPath(new URL("../../../apps/web/js/services/markdown-par-loutil.js", import.meta.url)),
    "utf8"
  );

  assert.doesNotMatch(service, /OPENDATALOADER_URL/);
  assert.match(service, /functions\/v1\/reconstituer-par-loutil/);
});
