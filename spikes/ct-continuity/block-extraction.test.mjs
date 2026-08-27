import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { FIXTURES_DIR } from "../lib/paths.mjs";
import { EXTRACTION_STATE, IDENTITY_SOURCE, detectBoilerplate, extractAvisBlocks } from "./block-extraction.mjs";

const FIXTURE = resolve(FIXTURES_DIR, "ct-continuity-blocks/rapport-synthetique.txt");

/** La fixture reproduit la structure d'un rapport paginé : deux pages. */
async function loadFixture() {
  const text = await readFile(FIXTURE, "utf8");
  const [first, second] = text.split(/\n\s*\n/).reduce(
    (acc, chunk) => {
      acc[acc[0].includes("Dispositions du projet") ? 1 : 0].push(chunk);
      return acc;
    },
    [[], []]
  ).map((chunks) => chunks.join("\n"));

  const pages = [
    { page: 1, text: text.slice(0, text.indexOf("Dispositions du projet")) },
    { page: 2, text: text.slice(text.indexOf("Dispositions du projet")) }
  ];

  return {
    source_id: "rapport-demo",
    pages,
    content: pages.map((page) => page.text).join("\n"),
    content_available: true
  };
}

test("les avis sont lus en blocs, avec leur libellé de légende", async () => {
  const { occurrences, legend } = extractAvisBlocks(await loadFixture());

  assert.deepEqual(legend.map((entry) => entry.code), ["F", "D", "S", "HM", "PM", "SO"]);
  assert.deepEqual(occurrences.map((occurrence) => occurrence.opinion_raw), ["F", "F", "F", "S", "D", "SO"]);
  assert.equal(occurrences[0].opinion_label, "Favorable");
  assert.equal(occurrences[0].opinion_normalized, "favorable");
});

test("le titre, l'avis et le commentaire sont séparés", async () => {
  const { occurrences } = extractAvisBlocks(await loadFixture());
  const [vent] = occurrences;

  assert.equal(vent.title_raw, "Vent");
  assert.equal(vent.description_raw, "Vent Région 1");
  assert.equal(vent.source_page, 2);
});

test("un titre coupé sur plusieurs lignes est recomposé", async () => {
  const { occurrences } = extractAvisBlocks(await loadFixture());
  const sondages = occurrences.find((occurrence) => occurrence.title_raw.includes("maillage"));

  assert.equal(sondages.title_raw, "Nombre et maillage des sondages");
  assert.equal(sondages.description_raw, "");
});

test("le numéro de la colonne N° devient la référence externe", async () => {
  const { occurrences } = extractAvisBlocks(await loadFixture());
  const numbered = occurrences.filter((occurrence) => occurrence.external_reference_raw);

  assert.deepEqual(numbered.map((occurrence) => occurrence.external_reference_raw), ["43", "47"]);
  assert.equal(numbered[0].identity_source, IDENTITY_SOURCE.NUMBER_COLUMN);
  assert.equal(numbered[0].extraction_state, EXTRACTION_STATE.EXTRACTED);
  assert.equal(numbered[0].title_raw, "Caractéristiques des portes d'intercommunication");
  assert.equal(numbered[0].section_number_raw, "3.2.1");
  assert.equal(numbered[0].regulation_article_raw, "XX6§1");
  assert.match(numbered[0].description_raw, /^Les portes devront être CF 1\/2h/);
});

test("un avis sans numéro est extrait mais déclaré non suivable", async () => {
  const { occurrences } = extractAvisBlocks(await loadFixture());
  const unnumbered = occurrences.filter((occurrence) => !occurrence.external_reference_raw);

  assert.equal(unnumbered.length, 4);
  for (const occurrence of unnumbered) {
    assert.equal(occurrence.identity_source, IDENTITY_SOURCE.NONE);
    assert.equal(occurrence.extraction_state, EXTRACTION_STATE.NO_EXTERNAL_REFERENCE);
  }
});

test("le sommaire ne produit aucun avis : hors tableau, il n'y en a pas", async () => {
  const { occurrences } = extractAvisBlocks(await loadFixture());

  assert.ok(
    occurrences.every((occurrence) => !occurrence.title_raw.includes("OBJET DU PRESENT RAPPORT")),
    "« ÉLÉMENTS D » du sommaire ne doit pas être lu comme un avis D"
  );
  assert.equal(occurrences.length, 6);
});

test("un numéro issu d'une référence d'article coupée n'est pas un numéro d'avis", async () => {
  const { occurrences } = extractAvisBlocks(await loadFixture());

  // « XX14§1 » puis « 2 » est l'article XX14§12, pas l'observation n° 2.
  assert.ok(occurrences.every((occurrence) => occurrence.external_reference_raw !== "2"));
});

test("la ligne de légende ne produit pas d'avis", async () => {
  const { occurrences } = extractAvisBlocks(await loadFixture());

  assert.ok(occurrences.every((occurrence) => !occurrence.title_raw.includes("Hors Mission")));
});

test("sans légende, rien n'est extrait plutôt qu'inventé", async () => {
  const result = extractAvisBlocks({
    source_id: "sans-legende",
    content: "Un texte sans légende.\nAvis n° 65 : Défavorable.",
    content_available: true
  });

  assert.deepEqual(result.occurrences, []);
  assert.match(result.reason, /aucune légende/);
});

test("detectBoilerplate repère ce qui se répète de page en page", () => {
  const pages = Array.from({ length: 4 }, (_, index) => ({
    page: index + 1,
    text: `PIED DE PAGE RÉPÉTÉ\ncontenu unique ${index}`
  }));

  const boilerplate = detectBoilerplate(pages);

  assert.ok(boilerplate.has("PIED DE PAGE RÉPÉTÉ"));
  assert.ok(!boilerplate.has("contenu unique 0"));
});

test("deux occurrences d'un même numéro qui concordent sont une seule observation", () => {
  const text = [
    "Dispositions du projet Avis* Observations et commentaires N°",
    "Récapitulatif",
    "Alarme D Prévoir un déclencheur manuel.",
    "57",
    "Détail",
    "Alarme D Prévoir un déclencheur manuel.",
    "57",
    "* F: Favorable , D: Défavorable , S: Suspendu , HM: Hors Mission , PM: Pour Mémoire , SO: Sans Objet"
  ].join("\n");

  const { occurrences } = extractAvisBlocks({ source_id: "doc", content: text, content_available: true });
  const numbered = occurrences.filter((occurrence) => occurrence.external_reference_raw === "57");

  assert.equal(numbered.length, 1, "le récapitulatif et le détail décrivent la même observation");
  assert.equal(numbered[0].occurrence_count_in_document, 2);
  assert.notEqual(numbered[0].extraction_state, EXTRACTION_STATE.AMBIGUOUS_REFERENCE);
});

test("deux occurrences d'un même numéro qui se contredisent restent ambiguës", () => {
  const text = [
    "Dispositions du projet Avis* Observations et commentaires N°",
    "Alarme D Prévoir un déclencheur manuel.",
    "57",
    "Alarme F Rien à signaler.",
    "57",
    "* F: Favorable , D: Défavorable , S: Suspendu , HM: Hors Mission , PM: Pour Mémoire , SO: Sans Objet"
  ].join("\n");

  const { occurrences } = extractAvisBlocks({ source_id: "doc", content: text, content_available: true });
  const numbered = occurrences.filter((occurrence) => occurrence.external_reference_raw === "57");

  assert.equal(numbered.length, 2);
  for (const occurrence of numbered) {
    assert.equal(occurrence.extraction_state, EXTRACTION_STATE.AMBIGUOUS_REFERENCE);
    assert.equal(occurrence.confidence, null);
  }
});

test("un code d'avis seul sur sa ligne n'est jamais pris pour un pied de page", () => {
  const pages = Array.from({ length: 4 }, (_, index) => ({
    page: index + 1,
    text: [
      "Éléments examinés Avis* Observations et commentaires N°",
      "PIED DE PAGE RÉPÉTÉ",
      `Élément examiné ${index}`,
      "F",
      "* D: Défavorable , F: Favorable"
    ].join("\n")
  }));

  const { occurrences } = extractAvisBlocks({
    source_id: "fiche",
    pages,
    content: pages.map((page) => page.text).join("\n"),
    content_available: true
  });

  assert.equal(occurrences.length, 4, "chaque page porte un avis, malgré la répétition du code");
  assert.ok(occurrences.every((occurrence) => occurrence.opinion_raw === "F"));
});
