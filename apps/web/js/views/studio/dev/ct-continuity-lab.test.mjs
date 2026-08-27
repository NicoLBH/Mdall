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
import { toAvisCsv, toStatusCsv } from "./ct-continuity-lab.js";

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
