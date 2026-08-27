import test from "node:test";
import assert from "node:assert/strict";

import * as pipeline from "../../../../spikes/ct-continuity/pipeline.mjs";
import * as libGuards from "../../../../spikes/lib/guards.mjs";
import * as ctGuards from "../../../../spikes/ct-continuity/guards.mjs";
import * as ctMetrics from "../../../../spikes/ct-continuity/metrics.mjs";
import * as report from "../../../../spikes/lib/report.mjs";
import * as runRecord from "../../../../spikes/lib/run-record.mjs";

import {
  buildCaseExport,
  buildFullExport,
  buildSources,
  buildTimeline,
  collectAvis,
  indicatorsAsMetrics,
  runCtLab
} from "./ct-lab-engine.js";

/**
 * Le laboratoire charge le moteur depuis apps/web/vendor (copié au build).
 * Les tests, eux, injectent directement les modules de `spikes/` : c'est la
 * même source, sans dépendre d'un build préalable.
 */
const MODULES = { pipeline, libGuards, ctGuards, ctMetrics, report, runRecord };
const NOW = () => new Date("2026-08-26T12:00:00.000Z");

const REPORTS = [
  {
    sourceId: "rapport-1",
    filename: "rapport-1.pdf",
    pages: [
      { page: 1, text: "RAPPORT INITIAL\nDate : 12/03/2026" },
      {
        page: 2,
        text:
          "Avis n° 65 : À préciser — note de calcul non transmise.\n" +
          "Avis n° 67 : Défavorable — désenfumage non justifié."
      }
    ]
  },
  {
    sourceId: "rapport-2",
    filename: "rapport-2.pdf",
    pages: [
      { page: 1, text: "RAPPORT DE SUIVI\nDate : 25/03/2026" },
      { page: 2, text: "Avis n° 65 : Favorable — PV reçu." }
    ]
  }
];

function run(reports = REPORTS) {
  return runCtLab(reports, { modules: MODULES, now: NOW });
}

test("buildSources conserve la pagination et l'ordre de chargement", () => {
  const sources = buildSources(REPORTS);

  assert.deepEqual(sources.map((source) => source.source_id), ["rapport-1", "rapport-2"]);
  assert.deepEqual(sources.map((source) => source.order), [1, 2]);
  assert.equal(sources[0].pages.length, 2);
  assert.equal(sources[0].content_available, true);
});

test("un PDF sans texte est marqué indisponible plutôt qu'ignoré en silence", () => {
  const sources = buildSources([{ sourceId: "scanne", pages: [{ page: 1, text: "   " }] }]);

  assert.equal(sources[0].content_available, false);
});

test("le run produit la continuité attendue sur deux rapports", async () => {
  const { predictions } = await run();

  const continuity = predictions.find((prediction) => prediction.key === "continuity:rapport-2:65");
  assert.equal(continuity.value.state, "MATCHED");
  assert.equal(continuity.value.opinion_change, "CHANGED");
  assert.equal(continuity.value.previous_document_id, "rapport-1");
});

test("un avis disparu reste NOT_FOUND et n'est jamais présenté comme levé", async () => {
  const { predictions } = await run();

  const disappeared = predictions.find((prediction) => prediction.key === "continuity:rapport-2:67");
  assert.equal(disappeared.value.state, "NOT_FOUND");
  assert.equal(disappeared.derived_from_absence, true);
  assert.ok(!JSON.stringify(disappeared).includes("CLOSED"));
});

test("la timeline aligne une ligne par référence et une colonne par rapport", async () => {
  const { timeline } = await run();

  assert.deepEqual(timeline.map((row) => row.reference), ["65", "67"]);
  for (const row of timeline) {
    assert.deepEqual(row.cells.map((cell) => cell.documentId), ["rapport-1", "rapport-2"]);
  }

  const [avis65] = timeline;
  assert.equal(avis65.cells[0].extraction.value.opinion_raw, "À préciser");
  assert.equal(avis65.cells[1].extraction.value.opinion_raw, "Favorable");
});

test("la provenance est vérifiée contre les pages réellement chargées", async () => {
  const { indicators } = await run();

  assert.equal(indicators.provenance.total > 0, true);
  assert.equal(indicators.provenance.correct, indicators.provenance.total);
  assert.deepEqual(indicators.provenance.failures, []);
});

test("aucun garde-fou n'est violé sur un cas propre", async () => {
  const { indicators } = await run();

  assert.deepEqual(indicators.guardViolations, []);
});

test("un rapport sans texte extrait déclenche une alerte critique", async () => {
  const { indicators } = await run([
    REPORTS[0],
    { sourceId: "scanne", filename: "scan.pdf", pages: [{ page: 1, text: "" }] }
  ]);

  const alert = indicators.alerts.find((entry) => entry.sourceId === "scanne");
  assert.equal(alert.level, "critique");
  assert.match(alert.message, /scanné/);
});

test("un rapport lisible mais sans avis reconnu est signalé comme artefact", async () => {
  const { indicators } = await run([
    REPORTS[0],
    { sourceId: "autre-format", filename: "autre.pdf", pages: [{ page: 1, text: "Tableau de suivi sans motif connu." }] }
  ]);

  const alert = indicators.alerts.find((entry) => entry.sourceId === "autre-format");
  assert.equal(alert.level, "critique");
  assert.match(alert.message, /artefacts/);
});

test("une page sans avis est une information de couverture, pas une alerte critique", async () => {
  const { indicators } = await run();

  const alert = indicators.alerts.find((entry) => entry.sourceId === "rapport-1");
  assert.equal(alert.level, "info");
  assert.match(alert.message, /page de garde/);
});

test("les indicateurs n'inventent ni precision ni recall", async () => {
  const { record, reportMarkdown } = await run();
  const ids = record.metrics.map((entry) => entry.id);

  assert.ok(!ids.includes("precision"));
  assert.ok(!ids.includes("recall"));
  assert.ok(reportMarkdown.includes("precision et recall ne sont pas calculables"));
  assert.equal(record.ground_truth, null);
});

test("les compteurs restent des compteurs dans le rapport exporté", async () => {
  const { reportMarkdown } = await run();

  assert.ok(reportMarkdown.includes("| Violations de garde-fou | 0 |"));
});

test("indicatorsAsMetrics renvoie null plutôt qu'un score quand rien n'est mesurable", () => {
  const metrics = indicatorsAsMetrics({
    provenance: { correct: 0, total: 0, failures: [] },
    recognizedOpinions: { correct: 0, total: 0 },
    abstentionCount: 0,
    guardViolations: []
  });

  assert.equal(metrics.find((entry) => entry.id === "provenance_self_check").value, null);
  assert.equal(metrics.find((entry) => entry.id === "recognized_opinions").value, null);
});

test("l'export ne contient que la couche source, jamais l'interprétation", async () => {
  const { sources } = await run();
  const exported = buildCaseExport(sources, { caseId: "mon-cas" });

  assert.equal(exported.schema, "mdall.spike.case/1");
  assert.equal(exported.case_id, "mon-cas");
  assert.equal(exported.sources.length, 2);
  assert.ok(exported.sources.every((source) => Array.isArray(source.pages)));

  const serialized = JSON.stringify(exported);
  for (const interpretationKey of ["opinion_raw", "external_reference_normalized", "predictions", "provenance", "extraction_state"]) {
    assert.ok(!serialized.includes(interpretationKey), `${interpretationKey} ne doit pas fuiter dans le cas exporté`);
  }
});

test("un run sans rapport échoue clairement", async () => {
  await assert.rejects(() => run([]), /Aucun rapport chargé/);
});

test("buildTimeline tolère une référence absente d'un rapport", () => {
  const sources = buildSources(REPORTS);
  const timeline = buildTimeline(sources, [
    { key: "extraction:rapport-2:99", kind: "extraction", value: { opinion_raw: "Favorable" } }
  ]);

  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].cells[0].extraction, undefined);
  assert.equal(timeline[0].cells[1].extraction.value.opinion_raw, "Favorable");
});

const SOCOTEC_STYLE = [
  {
    sourceId: "rapport-1",
    filename: "rapport-1.pdf",
    pages: [
      { page: 1, text: "SOMMAIRE\n2. MISSION L RELATIVE À LA SOLIDITÉ DES ÉLÉMENTS D\n´ÉQUIPEMENT INDISSOCIABLES\n7" },
      {
        page: 2,
        text: [
          "Dispositions du projet Avis* Observations et commentaires N°",
          "PARAMÈTRES CLIMATIQUES",
          "Vent F Vent Région 1",
          "Portes d'intercommunication S Les portes devront être CF 1/2h",
          "et équipées de ferme porte.",
          "43",
          "* F: Favorable , D: Défavorable , S: Suspendu , HM: Hors Mission , PM: Pour Mémoire , SO: Sans Objet"
        ].join("\n")
      }
    ]
  },
  {
    sourceId: "rapport-2",
    filename: "rapport-2.pdf",
    pages: [
      {
        page: 1,
        text: [
          "Dispositions du projet Avis* Observations et commentaires N°",
          "Portes d'intercommunication D Prévoir crémone pompier à",
          "rotation.",
          "43",
          "* F: Favorable , D: Défavorable , S: Suspendu , HM: Hors Mission , PM: Pour Mémoire , SO: Sans Objet"
        ].join("\n")
      }
    ]
  }
];

test("un rapport à colonnes est lu en blocs, sans qu'on ait à le demander", async () => {
  const { record, strategy } = await runCtLab(SOCOTEC_STYLE, { modules: MODULES, now: NOW });

  assert.equal(strategy, "blocks");
  const avis = record.predictions.filter((prediction) => prediction.kind === "extraction" || prediction.kind === "observation");
  assert.ok(avis.length >= 3);
  assert.equal(avis[0].opinion_label, "Favorable", "le libellé vient de la légende du document");
});

test("le numéro de la colonne N° porte la continuité, pas l'intitulé", async () => {
  const { record } = await runCtLab(SOCOTEC_STYLE, { modules: MODULES, now: NOW });
  const continuity = record.predictions.find((prediction) => prediction.key === "continuity:rapport-2:43");

  assert.equal(continuity.value.state, "MATCHED");
  assert.equal(continuity.value.opinion_change, "CHANGED");
});

test("un avis sans numéro est listé mais reste hors de la continuité", async () => {
  const { record, timeline } = await runCtLab(SOCOTEC_STYLE, { modules: MODULES, now: NOW });

  const unnumbered = record.predictions.filter((prediction) => prediction.kind === "observation");
  assert.ok(unnumbered.length >= 1);
  assert.ok(unnumbered.every((prediction) => prediction.identity_source === "NONE"));
  assert.deepEqual(timeline.map((row) => row.reference), ["43"], "seuls les avis numérotés entrent dans la matrice");
});

test("collectAvis rend tous les avis lus, numérotés ou non", async () => {
  const { record, indicators } = await runCtLab(SOCOTEC_STYLE, { modules: MODULES, now: NOW });

  assert.equal(collectAvis(record.predictions).length, indicators.extractionCount);
  assert.equal(indicators.numberedCount + indicators.unnumberedCount, indicators.extractionCount);
  assert.ok(indicators.byOpinion.some((entry) => entry.code === "F" && entry.label === "Favorable"));
});

test("l'export complet réunit sources, avis, continuité, indicateurs et rapport", async () => {
  const result = await runCtLab(SOCOTEC_STYLE, { modules: MODULES, now: NOW });
  const exported = buildFullExport(result, { generatedAt: "2026-08-26T12:00:00.000Z" });

  assert.equal(exported.schema, "mdall.spike.ct-lab-export/1");
  assert.equal(exported.strategy, "blocks");
  assert.equal(exported.case.sources.length, 2);
  assert.ok(exported.avis.length >= 3);
  assert.ok(exported.continuity.length >= 1);
  assert.ok(exported.report_markdown.includes("Spike run"));
  assert.deepEqual(exported.run.guard_violations, []);
  assert.ok(exported.legends["rapport-1"].some((entry) => entry.code === "SO"));
});
