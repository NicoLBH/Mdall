import test from "node:test";
import assert from "node:assert/strict";

import {
  CONSIGNES_DE_RECONSTITUTION, SCHEMA_DU_DOCUMENT, pagesDuTexte, pagesRefaites
} from "./document-en-markdown.js";
import { pagesEnTexte } from "./citation-verifiee.js";

/* ── La consigne ─────────────────────────────────────────────────────────── */

/**
 * **C'est une transcription, pas une lecture.** Une consigne qui laisserait
 * juger rendrait un document déjà interprété, dans lequel on ne pourrait plus
 * distinguer ce que le PDF disait de ce que le modèle en a compris — et c'est
 * exactement cette distinction qu'on vient voir.
 */
test("la consigne interdit de résumer, de reformuler et de compléter", () => {
  assert.match(CONSIGNES_DE_RECONSTITUTION, /Ne résume pas/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /Ne reformule pas/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /Ne complète pas/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /N'invente pas/);
  // Les tableaux sont la moitié d'un compte rendu de chantier.
  assert.match(CONSIGNES_DE_RECONSTITUTION, /tableaux Markdown/);
  // Et les nombres en sont la moitié qui coûte cher quand elle bouge.
  assert.match(CONSIGNES_DE_RECONSTITUTION, /caractère pour caractère/);
});

test("le schéma ne laisse rendre qu'une page et son Markdown", () => {
  const page = SCHEMA_DU_DOCUMENT.schema.properties.pages.items;
  assert.deepEqual(Object.keys(page.properties).sort(), ["markdown", "page"]);
  assert.equal(page.additionalProperties, false);
  assert.deepEqual(page.required.sort(), ["markdown", "page"]);
});

/* ── Les pages qui partent vraiment ──────────────────────────────────────── */

/**
 * **Le plafond coupe en silence.** Un document long part amputé, et le modèle
 * en rend alors une reconstitution très fidèle… d'un document tronqué. On relit
 * donc le texte qui part plutôt que de refaire le calcul de la coupe : deux
 * calculs finiraient par diverger (règle 4).
 */
test("les pages parties se relisent dans le texte qui part", () => {
  const pages = [
    { page: 1, text: "a".repeat(50) },
    { page: 2, text: "b".repeat(50) },
    { page: 3, text: "c".repeat(50) }
  ];

  assert.deepEqual(pagesDuTexte(pagesEnTexte(pages, { maxCaracteres: 120000 })), [1, 2, 3]);

  // Un plafond qui ne laisse passer que les deux premières.
  const coupe = pagesDuTexte(pagesEnTexte(pages, { maxCaracteres: 140 }));
  assert.deepEqual(coupe, [1, 2]);
});

test("une page sans texte ne part pas, et ne se compte donc pas", () => {
  const parties = pagesDuTexte(pagesEnTexte([
    { page: 1, text: "quelque chose" },
    { page: 2, text: "   " }
  ]));
  assert.deepEqual(parties, [1]);
});

/* ── Ce que le modèle rend ───────────────────────────────────────────────── */

test("les pages reviennent dans l'ordre, quelles qu'elles soient dans la réponse", () => {
  const { pages } = pagesRefaites({ pages: [
    { page: 3, markdown: "trois" }, { page: 1, markdown: "un" }
  ] }, [1, 2, 3]);

  assert.deepEqual(pages.map((page) => page.page), [1, 3]);
});

/**
 * **Une page rendue sous un numéro qu'on n'a pas envoyé ne peut être confrontée
 * à rien.** La laisser passer ferait afficher comme « document » une page que le
 * document ne contient pas.
 */
test("une page qu'on n'a pas envoyée est écartée, et nommée", () => {
  const { pages, inconnues } = pagesRefaites({ pages: [
    { page: 1, markdown: "un" }, { page: 9, markdown: "inventée" }
  ] }, [1, 2]);

  assert.deepEqual(pages.map((page) => page.page), [1]);
  assert.deepEqual(inconnues, [9]);
});

/**
 * Une page envoyée dont rien ne revient se nomme : c'est le seul défaut de
 * reconstitution qui ne se voit pas en lisant le résultat (règle 5).
 */
test("une page envoyée dont rien ne revient se nomme", () => {
  const { absentes } = pagesRefaites({ pages: [{ page: 1, markdown: "un" }] }, [1, 2, 3]);
  assert.deepEqual(absentes, [2, 3]);
});

test("une page rendue deux fois ne double pas le document", () => {
  const { pages } = pagesRefaites({ pages: [
    { page: 1, markdown: "le bon" }, { page: 1, markdown: "le second" }
  ] }, [1]);

  assert.equal(pages.length, 1);
  assert.equal(pages[0].markdown, "le bon");
});

/**
 * Une page vide est une **réponse** — « il n'y avait rien à lire ici ». Elle ne
 * se confond pas avec une page absente, et ne doit donc pas être écartée.
 */
test("une page rendue vide est une réponse, pas une absence", () => {
  const { pages, absentes } = pagesRefaites({ pages: [{ page: 1, markdown: "" }] }, [1]);

  assert.equal(pages.length, 1);
  assert.deepEqual(absentes, []);
});

test("une réponse sans pages ne fait rien sortir", () => {
  assert.deepEqual(pagesRefaites(null, [1, 2]).pages, []);
  assert.deepEqual(pagesRefaites({}, [1, 2]).absentes, [1, 2]);
});

/* ── L'appel se compte, et l'on ne lit pas par un chemin non compté ──────── */

/**
 * **Un utilitaire qui lirait par un chemin non compté ferait grossir la facture
 * sans apparaître nulle part** — et c'est précisément ce que le compteur existe
 * pour empêcher (fondamental 13).
 */
test("la fonction dépose sa consommation et garde la clé au serveur", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const fonction = readFileSync(
    fileURLToPath(new URL("../reconstituer-en-markdown/index.ts", import.meta.url)), "utf8"
  );

  assert.match(fonction, /deposerLaConsommation\(\{/);
  assert.match(fonction, /usageKind: "reconstitution-markdown"/);
  // La porte : un jeton présent n'est pas quelqu'un de connu.
  assert.match(fonction, /const garde = await requireUser\(req, corsHeaders\)/);

  const service = readFileSync(
    fileURLToPath(new URL("../../../apps/web/js/services/markdown-par-le-modele.js", import.meta.url)),
    "utf8"
  );
  // Le navigateur n'appelle jamais le modèle lui-même : il ne saurait ni se
  // compter, ni garder la consigne.
  assert.doesNotMatch(service, /api\.openai\.com|OPENAI/);
  assert.match(service, /project_id: await projetCourant\(\)/);
});

/**
 * **Ce que cette fonction rend ne s'exploite pas.** Le document refait sert à
 * être regardé : il n'alimente aucune extraction et n'ouvre aucun sujet — la
 * chaîne qui écrit passe par une proposition (règle 1).
 */
test("la reconstitution n'écrit rien et n'ouvre rien", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  for (const chemin of [
    "../reconstituer-en-markdown/index.ts",
    "../../../apps/web/js/services/markdown-par-le-modele.js",
    "../../../apps/web/js/services/reconstitution-markdown.js"
  ]) {
    const source = readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
    assert.doesNotMatch(source, /createManualSubject|createSubject|\.insert\(|\.upsert\(/,
      `${chemin} écrit quelque chose`);
  }
});
