import test from "node:test";
import assert from "node:assert/strict";

import {
  PROPOSITION_EXPORT_FORMAT,
  buildPropositionExport,
  propositionExportCsv,
  propositionExportFilename,
  propositionExportRows
} from "./proposition-export.js";

const PROPOSITION = {
  id: "prop-1",
  project_id: "projet-1",
  number: 12,
  title: "Rapport de visite du 12 mars",
  status: "open",
  body: "Trois fiches d'avis sur travaux.",
  created_at: "2026-03-12T09:00:00.000Z",
  created_by: "u-1"
};

const NAMES = new Map([
  ["u-1", { name: "Nicolas", avatarUrl: "https://exemple/nicolas.png" }],
  ["u-2", "Camille"]
]);

function reviewComplete(patch = {}) {
  return {
    running: false,
    frozen: false,
    error: null,
    authors: NAMES,
    unreachable: [],
    deposits: [{ at: "2026-03-12T09:05:00.000Z", who: "Nicolas", documents: [{ original_filename: "fiche.pdf" }] }],
    documentRows: [
      {
        id: "doc-1",
        original_filename: "fiche.pdf",
        detected_kind_label: "Fiche d'avis sur travaux",
        detection_reason: "Titre reconnu",
        created_at: "2026-03-12T09:05:00.000Z",
        storage_path: "documents/projet-1/fiche.pdf"
      }
    ],
    diff: {
      added: [{ reference: "166", title: "Réserve béton", status: "OPEN", opinion_raw: "S" }],
      changed: [],
      silent: [{ reference: "42", title: "Ancienne réserve", status: "NO_NEWS", previousStatus: "OPEN" }],
      unchanged: 3
    },
    items: [
      { itemType: "avis", itemKey: "166", status: "proposed", reason: null, payload: { change: "added", reference: "166", title: "Réserve béton", status: "OPEN", opinion: "S" } },
      { itemType: "document", itemKey: "doc-1", status: "accepted", reason: null, payload: { name: "fiche.pdf", kindLabel: "Fiche d'avis sur travaux" } }
    ],
    conflicts: [],
    figures: [
      { id: "fig-1", document_id: "doc-1", page: 1, rubric: "Structure béton armé", avis_letter: "F", avis_reference: null, sha256: "abc" }
    ],
    note: { markdown: "Ce dépôt porte trois fiches.", model: "gpt-4.1-mini", created_at: "2026-03-12T09:07:00.000Z" },
    noteState: "idle",
    story: [{ kind: "opened", at: PROPOSITION.created_at, who: "Nicolas", text: "a ouvert cette proposition", detail: "" }],
    ...patch
  };
}

test("l'export porte sa version : un fichier sans version ne se relit pas dans six mois", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete() });
  assert.equal(exporte.format, PROPOSITION_EXPORT_FORMAT);
});

test("sans proposition, il n'y a rien à exporter", () => {
  assert.equal(buildPropositionExport({ proposition: null, review: reviewComplete() }), null);
});

test("l'auteur s'écrit par son nom, jamais par son identifiant", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete() });
  assert.equal(exporte.proposition.ouvertePar, "Nicolas");
});

test("la table des auteurs se lit sous ses deux formes — chaîne ou objet", () => {
  const exporte = buildPropositionExport({
    proposition: { ...PROPOSITION, merged_by: "u-2", merged_at: "2026-03-13T10:00:00.000Z" },
    review: reviewComplete()
  });
  assert.equal(exporte.proposition.fusionneePar, "Camille");
});

test("les avis non repris sortent à part : ce n'est pas un mouvement", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete() });
  assert.equal(exporte.avis.nonRepris.length, 1);
  assert.equal(exporte.avis.nonRepris[0].reference, "42");
  assert.equal(exporte.avis.apparus.length, 1);
});

test("le nombre d'avis inchangés est un compte, pas une estimation", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete() });
  assert.equal(exporte.avis.inchanges, 3);
});

test("une analyse en cours n'exporte pas des listes vides : elle exporte l'ignorance", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: { running: true } });
  assert.equal(exporte.analyse.faite, false);
  assert.equal(exporte.documents, null);
  assert.equal(exporte.elements, null);
  assert.equal(exporte.depots, null);
});

test("des figures non lues valent `null`, des figures absentes valent `[]`", () => {
  const inconnues = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete({ figures: undefined }) });
  assert.equal(inconnues.figures, null);

  const aucune = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete({ figures: [] }) });
  assert.deepEqual(aucune.figures, []);
});

test("une figure sans numéro d'avis garde `null` : un numéro pris ailleurs serait un faux", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete() });
  assert.equal(exporte.figures[0].reference, null);
  assert.equal(exporte.figures[0].evaluation, "F");
  assert.equal(exporte.figures[0].rubrique, "Structure béton armé");
});

test("les livrables illisibles se lisent dans l'export : l'analyse portait sur moins de documents", () => {
  const exporte = buildPropositionExport({
    proposition: PROPOSITION,
    review: reviewComplete({ unreachable: [{ original_filename: "perdu.pdf" }] })
  });
  assert.deepEqual(exporte.analyse.livrablesIllisibles, ["perdu.pdf"]);
});

test("un conflit exporte son avant, son après, et s'il est réglé", () => {
  const item = { itemType: "avis", itemKey: "166", status: "proposed", payload: {} };
  const exporte = buildPropositionExport({
    proposition: PROPOSITION,
    review: reviewComplete({
      conflicts: [{ kind: "refused-reaffirmed", item, before: "Ouvert", after: "Levé", reason: "déjà écarté", decidedAt: "2026-01-05T00:00:00.000Z" }]
    })
  });
  assert.equal(exporte.conflits[0].avant, "Ouvert");
  assert.equal(exporte.conflits[0].maintenant, "Levé");
  assert.equal(exporte.conflits[0].regle, false);
});

test("la note de dépôt part avec son modèle : une prose dérivée se signe", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete() });
  assert.equal(exporte.noteDeDepot.modele, "gpt-4.1-mini");
});

test("le CSV porte une ligne par élément, avec sa section", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete() });
  const { rows } = propositionExportRows(exporte);
  const sections = rows.map((row) => row.section);

  assert.ok(sections.includes("Proposition"));
  assert.ok(sections.includes("Document"));
  assert.ok(sections.includes("Avis apparu"));
  assert.ok(sections.includes("Avis non repris"));
  assert.ok(sections.includes("Figure"));
  assert.ok(sections.includes("Note de dépôt"));
});

test("toutes les lignes du CSV portent les mêmes colonnes : rien ne se décale", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete() });
  const { columns, rows } = propositionExportRows(exporte);
  for (const row of rows) {
    for (const column of columns) assert.ok(column.key in row, `${column.key} manque`);
  }
});

test("des avis non calculés se disent dans le CSV, ils ne s'omettent pas", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete({ diff: null }) });
  const { rows } = propositionExportRows(exporte);
  assert.ok(rows.some((row) => row.section === "Avis" && row.libelle === "Non calculés"));
});

test("le CSV est un texte, avec son en-tête", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete() });
  assert.ok(propositionExportCsv(exporte).includes("Section;Clé;Libellé"));
});

test("le nom du fichier porte le numéro de la proposition et le jour", () => {
  const exporte = buildPropositionExport({
    proposition: PROPOSITION,
    review: reviewComplete(),
    generatedAt: "2026-03-14T08:00:00.000Z"
  });
  assert.equal(propositionExportFilename(exporte, "csv"), "proposition-P12-2026-03-14.csv");
});

test("l'export se sérialise en JSON sans boucle ni fonction", () => {
  const exporte = buildPropositionExport({ proposition: PROPOSITION, review: reviewComplete() });
  assert.doesNotThrow(() => JSON.stringify(exporte));
});
