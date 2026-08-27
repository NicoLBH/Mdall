import test from "node:test";
import assert from "node:assert/strict";

import * as pipeline from "../../../../../../spikes/ct-continuity/pipeline.mjs";
import * as libGuards from "../../../../../../spikes/lib/guards.mjs";
import * as ctGuards from "../../../../../../spikes/ct-continuity/guards.mjs";
import * as ctMetrics from "../../../../../../spikes/ct-continuity/metrics.mjs";
import * as report from "../../../../../../spikes/lib/report.mjs";
import * as runRecord from "../../../../../../spikes/lib/run-record.mjs";
import * as status from "../../../../../../spikes/ct-continuity/status.mjs";

import { runCtLab } from "../../../services/ct-lab-engine.js";
import { TABS, tabLabel, toAvisCsv, toStatusCsv } from "./ct-continuity-lab.js";

/**
 * Les CSV sont ce qu'un humain ouvre dans Excel pour relire un dossier : ils
 * doivent citer des noms de fichiers, jamais les identifiants internes.
 */
const MODULES = { pipeline, libGuards, ctGuards, ctMetrics, report, runRecord, status };
const NOW = () => new Date("2026-08-26T12:00:00.000Z");

const REPORTS = [
  {
    sourceId: "doc-1",
    filename: "fiche-3.pdf",
    pages: [
      {
        page: 1,
        text: [
          "FICHE D'AVIS EN PHASE DE REALISATION",
          "CT/13860/0925/0260",
          "FICHE N° : 3",
          "Date d’émission : 12/09/2025",
          "Avis n° 65 : Défavorable — note de calcul toujours attendue.",
          "L'avis n° 67 est levé après réception du PV de désenfumage."
        ].join("\n")
      }
    ]
  },
  {
    sourceId: "doc-2",
    filename: "fiche-1.pdf",
    pages: [
      {
        page: 1,
        text: [
          "FICHE D'AVIS EN PHASE DE REALISATION",
          "CT/13860/0525/0179",
          "FICHE N° : 1",
          "Date d’émission : 20/05/2025",
          "Avis n° 65 : Suspendu — note de calcul non transmise.",
          "Avis n° 67 : Défavorable — désenfumage non justifié."
        ].join("\n")
      }
    ]
  }
];

const run = () => runCtLab(REPORTS, { modules: MODULES, now: NOW });

test("le CSV des avis cite le nom du fichier et sa date d'émission", async () => {
  const csv = toAvisCsv(await run());
  const [header, ...rows] = csv.split("\r\n");

  assert.equal(header.split(";")[0], "Document");
  assert.ok(rows.every((row) => row.startsWith("fiche-1.pdf;2025-05-20") || row.startsWith("fiche-3.pdf;2025-09-12")));
  assert.ok(!csv.includes("doc-1"), "aucun identifiant interne dans un export lu par un humain");
});

test("le CSV d'état porte la levée, sa preuve et le document qui la déclare", async () => {
  const csv = toStatusCsv(await run());
  const [header, ...rows] = csv.split("\r\n");

  assert.deepEqual(header.split(";"), [
    "N°",
    "État",
    "Motif",
    "Soulevé dans",
    "Soulevé le",
    "Ancienneté (jours)",
    "Levé dans",
    "Levé le",
    "Vu pour la dernière fois",
    "Preuve"
  ]);

  const lifted = rows.find((row) => row.startsWith("67;"));
  const cells = lifted.split(";");
  assert.equal(cells[1], "RESOLVED");
  assert.equal(cells[2], "DECLARED_LIFTED");
  assert.equal(cells[3], "fiche-1.pdf", "l'avis est né dans le premier document, pas dans le premier chargé");
  assert.equal(cells[6], "fiche-3.pdf");
  assert.equal(cells[7], "2025-09-12");
  assert.ok(cells[9].includes("est levé"), "une levée n'est exportée qu'avec la phrase qui la prouve");
  assert.ok(!csv.includes("doc-1"));
});

test("l'ancienneté d'un avis levé s'arrête le jour de sa levée", async () => {
  const { avisStatus } = await run();

  const lifted = avisStatus.find((entry) => entry.reference === "67");
  assert.equal(lifted.age_days, 115, "20/05/2025 → 12/09/2025");

  const open = avisStatus.find((entry) => entry.reference === "65");
  assert.equal(open.resolved_at, null);
  assert.equal(open.age_days, 115, "un avis ouvert vieillit jusqu'au dernier rapport du lot");
});

test("« vu pour la dernière fois » désigne le dernier document où l'avis figure", async () => {
  const { avisStatus } = await run();

  const open = avisStatus.find((entry) => entry.reference === "65");
  assert.equal(open.status, "OPEN");
  assert.equal(open.last_seen_document_id, "doc-1", "fiche-3.pdf, le dernier rapport, où il figure encore");
});

test("la matrice de suivi est construite sur les colonnes chronologiques", async () => {
  const { timeline, sources } = await run();

  const row = timeline.find((entry) => entry.reference === "65");
  assert.deepEqual(row.cells.map((cell) => cell.documentId), sources.map((source) => source.source_id));
  assert.deepEqual(row.cells.map((cell) => cell.documentId), ["doc-2", "doc-1"]);
  assert.equal(row.cells[0].continuity.value.state, "NEW", "l'avis naît dans le rapport le plus ancien");
  assert.equal(row.cells[1].continuity.value.state, "MATCHED");
});

test("les onglets annoncent leur effectif", async () => {
  const result = await run();
  const labels = TABS.map((tab) => tabLabel(tab, { result }));

  assert.deepEqual(labels, ["Où en est-on", "Documents (2)", "Avis (3)", "Preuves (1)", "Technique"]);
});

test("sans résultat, un onglet ne prétend pas contenir quelque chose", () => {
  assert.deepEqual(
    TABS.map((tab) => tabLabel(tab, { result: null })),
    TABS.map((tab) => tab.label)
  );
});

test("l'onglet Preuves compte aussi les clôtures générales", async () => {
  const withClearance = [
    REPORTS[1],
    {
      sourceId: "doc-3",
      filename: "rapport-final.pdf",
      pages: [
        {
          page: 1,
          text: [
            "RAPPORT FINAL",
            "CONTROLE TECHNIQUE",
            "CT/13860/0125/0283",
            "Date d’émission : 29/01/2026",
            "À notre connaissance, l'ensemble des avis que nous avons émis ont été suivis d'effet."
          ].join("\n")
        }
      ]
    }
  ];

  const result = await runCtLab(withClearance, { modules: MODULES, now: NOW });

  assert.equal(result.globalClearances.length, 1);
  assert.equal(tabLabel({ id: "evidence", label: "Preuves" }, { result }), "Preuves (1)");

  // Et l'effet sur le fond : les avis du dossier sont réputés suivis d'effet.
  const avis = result.avisStatus.find((entry) => entry.reference === "65");
  assert.equal(avis.status, "RESOLVED");
  assert.equal(avis.resolution_reason, "DECLARED_GLOBALLY");
});

test("le CSV d'état nomme le rapport qui a prononcé la clôture générale", async () => {
  const result = await runCtLab(
    [
      REPORTS[1],
      {
        sourceId: "doc-3",
        filename: "rapport-final.pdf",
        pages: [
          {
            page: 1,
            text: [
              "RAPPORT FINAL",
              "CONTROLE TECHNIQUE",
              "Date d’émission : 29/01/2026",
              "Tous les avis ont été suivis d'effet."
            ].join("\n")
          }
        ]
      }
    ],
    { modules: MODULES, now: NOW }
  );

  const csv = toStatusCsv(result);
  const row = csv.split("\r\n").find((line) => line.startsWith("65;"));

  assert.equal(row.split(";")[6], "rapport-final.pdf", "« Levé dans »");
  assert.equal(row.split(";")[7], "2026-01-29");
});
