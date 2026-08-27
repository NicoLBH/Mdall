import test from "node:test";
import assert from "node:assert/strict";

import * as pipeline from "../../../../spikes/ct-continuity/pipeline.mjs";
import * as libGuards from "../../../../spikes/lib/guards.mjs";
import * as ctGuards from "../../../../spikes/ct-continuity/guards.mjs";
import * as ctMetrics from "../../../../spikes/ct-continuity/metrics.mjs";
import * as report from "../../../../spikes/lib/report.mjs";
import * as runRecord from "../../../../spikes/lib/run-record.mjs";
import * as status from "../../../../spikes/ct-continuity/status.mjs";
import * as analytics from "../../../../spikes/ct-continuity/analytics.mjs";

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
const MODULES = { pipeline, libGuards, ctGuards, ctMetrics, report, runRecord, status, analytics };
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
  assert.ok(exported.legends["rapport-1"].codes.some((entry) => entry.code === "SO"));
  assert.equal(exported.legends["rapport-1"].source, "own_document", "la légende doit venir du document lui-même");
});

/**
 * Un chantier livre ses rapports dans le désordre : déposés en vrac, ils
 * arrivent triés par nom de fichier. L'ordre doit se reconstruire depuis le
 * contenu — date d'émission et référence chrono — jamais depuis l'ordre de
 * chargement.
 */
const OUT_OF_ORDER = [
  {
    sourceId: "c-rapport-etape",
    filename: "rapport-etape.pdf",
    pages: [
      {
        page: 1,
        text: [
          "RAPPORT D'ETAPE DE CONTROLE TECHNIQUE",
          "CT/13860/1125/0301",
          "Date d’émission : 10/11/2025",
          "Liste des documents adressés au maître d'ouvrage :",
          "CT/13860/0525/0179 Fiche avis travaux N°1 20/05/2025",
          "CT/13860/0725/0221 Fiche avis travaux N°2 15/07/2025",
          "CT/13860/0925/0260 Fiche avis travaux N°3 12/09/2025"
        ].join("\n")
      },
      {
        page: 2,
        text:
          "Synthèse des avis en cours à la date d'émission :\n" +
          "Avis n° 65 : Défavorable — note de calcul toujours attendue."
      }
    ]
  },
  {
    sourceId: "b-fiche-3",
    filename: "fiche-3.pdf",
    pages: [
      {
        page: 1,
        text: [
          "FICHE D'AVIS EN PHASE DE REALISATION",
          "CT/13860/0925/0260",
          "FICHE N° : 3",
          "Date d’émission : 12/09/2025"
        ].join("\n")
      },
      {
        page: 2,
        text: "Avis n° 65 : Défavorable — note de calcul toujours attendue.\nL'avis n° 67 est levé après réception du PV de désenfumage."
      }
    ]
  },
  {
    sourceId: "a-fiche-1",
    filename: "fiche-1.pdf",
    pages: [
      {
        page: 1,
        text: [
          "FICHE D'AVIS EN PHASE DE REALISATION",
          "CT/13860/0525/0179",
          "FICHE N° : 1",
          "Date d’émission : 20/05/2025"
        ].join("\n")
      },
      {
        page: 2,
        text:
          "Avis n° 65 : Suspendu — note de calcul non transmise.\n" +
          "Avis n° 67 : Défavorable — désenfumage non justifié."
      }
    ]
  }
];

test("la chronologie se reconstruit depuis le contenu, pas depuis l'ordre de chargement", async () => {
  const { chronology, sources } = await runCtLab(OUT_OF_ORDER, { modules: MODULES, now: NOW });

  assert.deepEqual(chronology.ordered_source_ids, ["a-fiche-1", "b-fiche-3", "c-rapport-etape"]);
  assert.deepEqual(sources.map((source) => source.source_id), chronology.ordered_source_ids);
  assert.deepEqual(chronology.documents.map((document) => document.issued_at), [
    "2025-05-20",
    "2025-09-12",
    "2025-11-10"
  ]);
  assert.deepEqual(chronology.undated_source_ids, []);
});

test("un livrable déclaré par un rapport mais absent du lot est signalé, jamais comblé", async () => {
  const { completeness } = await runCtLab(OUT_OF_ORDER, { modules: MODULES, now: NOW });

  assert.equal(completeness.declared.length, 3);
  assert.deepEqual(
    completeness.missing.map((entry) => entry.chrono_reference),
    ["CT/13860/0725/0221"]
  );
  assert.equal(completeness.missing[0].declared_in, "c-rapport-etape");
  assert.deepEqual(completeness.sequenceGaps, [2], "la fiche N°2 manque aussi dans la séquence");
});

test("l'alerte de complétude cite le document qui la révèle, dans les notes du run", async () => {
  const { record } = await runCtLab(OUT_OF_ORDER, { modules: MODULES, now: NOW });

  assert.match(record.notes, /1 livrable\(s\) déclaré\(s\)/);
});

test("les avis sont classés OPEN, RESOLVED ou NO_NEWS, sans jamais conclure d'une absence", async () => {
  const { avisStatus, statusCounts } = await runCtLab(OUT_OF_ORDER, { modules: MODULES, now: NOW });

  const avis65 = avisStatus.find((entry) => entry.reference === "65");
  assert.equal(avis65.status, "OPEN");
  assert.equal(avis65.raised_in, "a-fiche-1");
  assert.equal(avis65.raised_at, "2025-05-20");
  assert.equal(avis65.age_days, 174);

  const avis67 = avisStatus.find((entry) => entry.reference === "67");
  assert.equal(avis67.status, "RESOLVED");
  assert.equal(avis67.resolution_reason, "DECLARED_LIFTED");
  assert.ok(avis67.evidence, "une levée n'est admise que sur preuve citée");

  assert.equal(statusCounts.OPEN + statusCounts.RESOLVED + statusCounts.NO_NEWS, avisStatus.length);
});

test("un avis disparu sans explication reste NO_NEWS : ce n'est pas une clôture", async () => {
  const withoutLifting = OUT_OF_ORDER.map((report) =>
    report.sourceId !== "b-fiche-3"
      ? report
      : {
          ...report,
          pages: report.pages.map((page) =>
            page.page !== 2 ? page : { ...page, text: "Avis n° 65 : Défavorable — note de calcul toujours attendue." }
          )
        }
  );

  const { avisStatus } = await runCtLab(withoutLifting, { modules: MODULES, now: NOW });
  const avis67 = avisStatus.find((entry) => entry.reference === "67");

  assert.equal(avis67.status, "NO_NEWS");
  assert.equal(avis67.resolution_reason, null);
  assert.ok(!JSON.stringify(avis67).includes("CLOSED"));
});

test("« que savait-on à telle date ? » écarte les documents postérieurs sans les oublier", async () => {
  const { chronology, avisStatus } = await runCtLab(OUT_OF_ORDER, {
    modules: MODULES,
    now: NOW,
    params: { chronology: { asOf: "2025-06-30" } }
  });

  assert.equal(chronology.as_of, "2025-06-30");
  assert.deepEqual(chronology.ordered_source_ids, ["a-fiche-1"]);
  assert.equal(chronology.excluded_by_date, 2);

  // Au 30/06/2025, l'avis 67 était encore ouvert : la levée du 12/09 n'existe pas encore.
  const avis67 = avisStatus.find((entry) => entry.reference === "67");
  assert.equal(avis67.status, "OPEN");
});

test("le run arrêté à une date le dit dans ses notes", async () => {
  const { record } = await runCtLab(OUT_OF_ORDER, {
    modules: MODULES,
    now: NOW,
    params: { chronology: { asOf: "2025-06-30" } }
  });

  assert.match(record.notes, /État arrêté au 2025-06-30 : 2 document\(s\) postérieur\(s\) écarté\(s\)/);
});

test("un document sans date lisible est placé en fin de série et signalé", async () => {
  const { chronology, record } = await runCtLab(
    [...OUT_OF_ORDER, { sourceId: "z-sans-date", filename: "sans-date.pdf", pages: [{ page: 1, text: "Note interne sans en-tête." }] }],
    { modules: MODULES, now: NOW }
  );

  assert.equal(chronology.ordered_source_ids.at(-1), "z-sans-date");
  assert.deepEqual(chronology.undated_source_ids, ["z-sans-date"]);
  assert.match(record.notes, /Date d'émission illisible pour : z-sans-date/);
});

test("l'export complet emporte la chronologie, la complétude et l'état des avis", async () => {
  const result = await runCtLab(OUT_OF_ORDER, { modules: MODULES, now: NOW });
  const exported = buildFullExport(result, { generatedAt: "2026-08-26T12:00:00.000Z" });

  assert.deepEqual(exported.chronology.ordered_source_ids, ["a-fiche-1", "b-fiche-3", "c-rapport-etape"]);
  assert.equal(exported.completeness.missing.length, 1);
  assert.ok(exported.avis_status.some((entry) => entry.reference === "65"));
});
