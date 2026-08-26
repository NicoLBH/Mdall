import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { FIXTURES_DIR } from "../lib/paths.mjs";
import { buildSourceFromPdf, extractPages } from "./pdf-adapter.mjs";
import { extractOccurrences } from "./extraction.mjs";

const PDF = resolve(FIXTURES_DIR, "ct-continuity-pdf/rapport-demo.pdf");

test("extractPages rend le texte page par page, pagination conservée", async () => {
  const { pages, pageCount } = await extractPages({ path: PDF });

  assert.equal(pageCount, 2);
  assert.deepEqual(pages.map((page) => page.page), [1, 2]);
  assert.match(pages[0].text, /RAPPORT DE DÉMONSTRATION/);
  assert.match(pages[1].text, /Avis n° 65/);
  assert.ok(!pages[0].text.includes("Avis n° 65"), "les pages ne doivent pas être fusionnées");
});

test("les accents et le glyphe n° survivent à l'extraction", async () => {
  const { pages } = await extractPages({ path: PDF });

  assert.match(pages[1].text, /À préciser/);
  assert.match(pages[1].text, /étanchéité/);
});

test("extractPages accepte aussi des octets déjà lus", async () => {
  const bytes = new Uint8Array(await readFile(PDF));
  const { pageCount } = await extractPages({ bytes });

  assert.equal(pageCount, 2);
});

test("buildSourceFromPdf produit une source directement exploitable par le moteur", async () => {
  const source = await buildSourceFromPdf({ path: PDF, sourceId: "rapport-demo", order: 1 });

  assert.equal(source.source_id, "rapport-demo");
  assert.equal(source.metadata.page_count, 2);

  const { occurrences } = extractOccurrences({
    ...source,
    content: source.pages.map((page) => page.text).join("\n"),
    content_available: true
  });

  assert.deepEqual(occurrences.map((occurrence) => occurrence.external_reference_normalized), ["65", "66"]);
  assert.equal(occurrences[0].opinion_raw, "À préciser");
  assert.equal(occurrences[0].source_page, 2, "la page réelle doit remonter jusqu'à la provenance");
});

test("un appel sans chemin ni octets est refusé explicitement", async () => {
  await assert.rejects(() => extractPages({}), /fournir `path` ou `bytes`/);
});
