import test from "node:test";
import assert from "node:assert/strict";

import * as pipeline from "../../../../../../spikes/ct-continuity/pipeline.mjs";
import * as libGuards from "../../../../../../spikes/lib/guards.mjs";
import * as ctGuards from "../../../../../../spikes/ct-continuity/guards.mjs";
import * as ctMetrics from "../../../../../../spikes/ct-continuity/metrics.mjs";
import * as report from "../../../../../../spikes/lib/report.mjs";
import * as runRecord from "../../../../../../spikes/lib/run-record.mjs";
import * as status from "../../../../../../spikes/ct-continuity/status.mjs";
import * as analytics from "../../../../../../spikes/ct-continuity/analytics.mjs";

import { runCtLab } from "../../../services/ct-lab-engine.js";
import {
  TABS,
  firstText,
  lastSeenWording,
  pickAxisTicks,
  shortDocumentName,
  tabLabel,
  titleCase,
  toAvisCsv,
  withArticle,
  toStatusCsv
} from "./ct-continuity-lab.js";

/**
 * Les CSV sont ce qu'un humain ouvre dans Excel pour relire un dossier : ils
 * doivent citer des noms de fichiers, jamais les identifiants internes.
 */
const MODULES = { pipeline, libGuards, ctGuards, ctMetrics, report, runRecord, status, analytics };
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

  assert.deepEqual(labels, ["Où en est-on", "Documents (2)", "Avis (3)", "Indicateurs", "Preuves (1)", "Qualité de lecture"]);
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

test("l'axe des abscisses ne montre que les graduations qui tiennent", () => {
  // 19 trimestres sur 396 px de tracé : au-delà de six étiquettes elles se
  // chevauchent, et un graphique illisible ne vaut pas mieux qu'aucun.
  const ticks = pickAxisTicks(19, 396, 58);

  assert.ok(ticks.length <= 7, `six à sept graduations au plus, pas ${ticks.length}`);
  assert.equal(ticks[0], 0, "la première borne est toujours montrée");
  assert.equal(ticks.at(-1), 18, "la dernière aussi");
  assert.deepEqual([...ticks].sort((a, b) => a - b), ticks, "les graduations restent ordonnées");
});

test("peu de points : toutes les graduations sont montrées", () => {
  assert.deepEqual(pickAxisTicks(4, 396, 58), [0, 1, 2, 3]);
  assert.deepEqual(pickAxisTicks(1, 396), [0]);
  assert.deepEqual(pickAxisTicks(0, 396), []);
});

test("un tracé étroit ne garde que ses bornes", () => {
  assert.deepEqual(pickAxisTicks(10, 100, 58), [0, 9]);
});

test("les états d'avis s'écrivent en capitale initiale, pas en capitales", () => {
  assert.equal(titleCase("SANS NOUVELLES"), "Sans Nouvelles");
  assert.equal(titleCase("LEVÉ"), "Levé");
  assert.equal(titleCase(""), "");
});

test("un intitulé vide n'est pas un intitulé absent", () => {
  // L'extraction rend "" et non null : `??` ne se déclenchait pas, et
  // 290 intitulés sur 1 024 s'affichaient vides sur un corpus réel.
  assert.equal(firstText("", "commentaire de repli"), "commentaire de repli");
  assert.equal(firstText("   ", null, "défaut"), "défaut");
  assert.equal(firstText("intitulé", "commentaire"), "intitulé");
  assert.equal(firstText(null, undefined, ""), "");
});

test("la formulation de référence remonte à la dernière apparition réelle", () => {
  // Un avis 238 réel : le RICT et le rapport d'étape suivant le rattachent à
  // deux lignes différentes du référentiel, avec le même numéro et le même
  // commentaire. Entre les deux, plusieurs rapports ne le mentionnent pas.
  const steps = [
    { cell: { extraction: { title_raw: "Les organes des coupures du bâtiment", description_raw: "À reporter sur le plan." } } },
    { cell: { extraction: null } },
    { cell: { extraction: null } },
    { cell: { extraction: { title_raw: "Pour tout circuit terminal", description_raw: "À reporter sur le plan." } } }
  ];

  assert.equal(lastSeenWording(steps, 0), null, "la première étape n'a rien avant elle");
  assert.deepEqual(lastSeenWording(steps, 3), {
    title: "Les organes des coupures du bâtiment",
    comment: "À reporter sur le plan."
  });
  assert.deepEqual(
    lastSeenWording(steps, 2),
    { title: "Les organes des coupures du bâtiment", comment: "À reporter sur le plan." },
    "les rapports muets ne disent rien du libellé : on remonte au-delà"
  );
});

test("un intitulé vide ne compte pas comme une formulation", () => {
  const steps = [
    { cell: { extraction: { title_raw: "Vrai intitulé", description_raw: "" } } },
    { cell: { extraction: { title_raw: "   ", description_raw: "commentaire" } } }
  ];

  assert.equal(lastSeenWording(steps, 1).title, "Vrai intitulé");
});

test("un document se nomme par ce qu'il déclare, pas par son fichier", () => {
  // « 12_09-10-25 - 74LEREPOSOIRMAIRIEREHABILITATION DU PRESBYTERECT-Rapport
  // RICT-CT-13860-1025-0114.pdf » écrase tout ce qui l'entoure sur une frise.
  assert.equal(
    shortDocumentName({ document_type: "rapport_initial", version: 4, issued_at: "2025-10-09" }),
    "RICT version 4"
  );
  assert.equal(
    shortDocumentName({ document_type: "fiche_examen_document", sheet_number: 3, issued_at: "2025-05-26" }),
    "Fiche examen n° 3"
  );
  assert.equal(
    shortDocumentName({ document_type: "rapport_etape", issued_at: "2026-08-27" }),
    "Rapport d'étape du 27/08/2026",
    "sans version ni numéro, la date sert de repère"
  );
});

test("un type non reconnu garde le nom du fichier", () => {
  // Deviner un nom court pour un document qu'on n'a pas su typer reviendrait à
  // masquer la seule identité vérifiable qu'on ait : son fichier.
  assert.equal(shortDocumentName({ issued_at: "2025-01-01" }, "rapport-mystere.pdf"), "rapport-mystere.pdf");
  assert.equal(shortDocumentName(null, "rapport-mystere.pdf"), "rapport-mystere.pdf");
});

test("un type connu sans repère se nomme quand même", () => {
  assert.equal(shortDocumentName({ document_type: "rapport_final" }), "Rapport final");
  assert.equal(
    shortDocumentName({ document_type_label: "Attestation Handicap" }),
    "Attestation Handicap",
    "un type hors liste garde son libellé complet"
  );
});

test("l'article s'accorde au document cité", () => {
  // « Absent du fiche travaux n° 9 » se lit mal ; le genre se déduit du type,
  // que le document déclare lui-même.
  assert.equal(withArticle("RICT version 4", "rapport_initial"), "du RICT version 4", "un sigle garde ses capitales");
  assert.equal(withArticle("Fiche travaux n° 9", "fiche_avis_travaux"), "de la fiche travaux n° 9");
  assert.equal(withArticle("Fiche examen n° 8", "fiche_examen_document"), "de la fiche examen n° 8");
  assert.equal(withArticle("Rapport d'étape du 27/08/2026", "rapport_etape"), "du rapport d'étape du 27/08/2026");
});

test("un document non typé garde un article neutre", () => {
  assert.equal(withArticle("rapport-mystere.pdf", null), "du rapport-mystere.pdf");
  assert.equal(withArticle("", "rapport_initial"), "ce document");
});
