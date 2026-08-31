import test from "node:test";
import assert from "node:assert/strict";

import {
  MEMORY_EXPORT_FORMAT,
  buildMemoryExport,
  memoryExportCsv,
  memoryExportFilename,
  memoryExportRows
} from "./project-memory-export.js";

const ASSERTIONS = [
  {
    id: "a-2",
    kind: "avis",
    subject_key: "166",
    statement: "Avis n° 166 — Réserve béton",
    detail: "Ouvert · avis S",
    status: "assumed",
    payload: { reference: "166", title: "Réserve béton", status: "OPEN", opinion: "S" },
    proposition_id: "prop-2",
    proposition_number: 13,
    decided_at: "2026-03-20T10:00:00.000Z"
  },
  {
    id: "a-1",
    kind: "avis",
    subject_key: "166",
    statement: "Avis n° 166 — Réserve béton",
    status: "assumed",
    payload: { reference: "166", status: "OPEN" },
    proposition_number: 12,
    decided_at: "2026-03-12T10:00:00.000Z",
    superseded_by: "a-2",
    superseded_at: "2026-03-20T10:00:00.000Z"
  },
  {
    id: "a-3",
    kind: "attachment",
    subject_key: "affaire:13861",
    statement: "Affaire 13861",
    status: "rejected",
    payload: { label: "13861", verdict: "FOREIGN", reason: "Autre maître d'ouvrage", markers: [] },
    proposition_number: 12,
    decided_at: "2026-03-12T10:00:00.000Z"
  }
];

test("l'export porte sa version", () => {
  assert.equal(buildMemoryExport({ assertions: ASSERTIONS }).format, MEMORY_EXPORT_FORMAT);
});

test("une lecture ratée ne s'exporte pas comme une mémoire vide", () => {
  const exporte = buildMemoryExport({ assertions: null });
  assert.equal(exporte.lecture.aboutie, false);
  assert.equal(exporte.affirmations, null);
  assert.equal(exporte.resume, null);
  assert.ok(exporte.lecture.message);
});

test("un projet sans mémoire s'exporte vide, et cela se distingue de l'ignorance", () => {
  const exporte = buildMemoryExport({ assertions: [] });
  assert.equal(exporte.lecture.aboutie, true);
  assert.deepEqual(exporte.affirmations, []);
  assert.equal(exporte.resume.total, 0);
});

test("ce qui a été remplacé reste : une mémoire sans histoire ne se conteste pas", () => {
  const exporte = buildMemoryExport({ assertions: ASSERTIONS });
  assert.equal(exporte.affirmations.length, 3);
  assert.equal(exporte.enVigueur.length, 2);
  assert.ok(exporte.affirmations.some((entry) => entry.enVigueur === false));
});

test("l'ordre est déterministe : deux exports se comparent ligne à ligne", () => {
  const premier = buildMemoryExport({ assertions: ASSERTIONS }).affirmations.map((entry) => entry.id);
  const second = buildMemoryExport({ assertions: [...ASSERTIONS].reverse() }).affirmations.map((entry) => entry.id);
  assert.deepEqual(premier, second);
});

test("l'ordre range par nature, puis par clé, puis par date", () => {
  const ids = buildMemoryExport({ assertions: ASSERTIONS }).affirmations.map((entry) => entry.id);
  assert.deepEqual(ids, ["a-3", "a-1", "a-2"]);
});

test("une affirmation écartée reste dans l'export : un refus est une information", () => {
  const exporte = buildMemoryExport({ assertions: ASSERTIONS });
  const ecartee = exporte.affirmations.find((entry) => entry.id === "a-3");
  assert.equal(ecartee.statutLabel, "écartée");
  assert.equal(ecartee.enVigueur, true);
});

test("chaque affirmation porte ce sur quoi elle s'appuie", () => {
  const exporte = buildMemoryExport({ assertions: ASSERTIONS });
  const courante = exporte.affirmations.find((entry) => entry.id === "a-2");
  assert.equal(courante.faits["Intitulé"], "Réserve béton");
  assert.equal(courante.faits["État"], "Ouvert");
});

test("chaque affirmation nomme la proposition qui l'a versée", () => {
  const exporte = buildMemoryExport({ assertions: ASSERTIONS });
  assert.equal(exporte.affirmations.find((entry) => entry.id === "a-2").proposition, 13);
});

test("le CSV porte une ligne par affirmation, remplacées comprises", () => {
  const { rows } = memoryExportRows(buildMemoryExport({ assertions: ASSERTIONS }));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.vigueur).sort(), ["non", "oui", "oui"]);
});

test("le CSV d'une mémoire illisible est vide plutôt que faux", () => {
  const { rows } = memoryExportRows(buildMemoryExport({ assertions: null }));
  assert.deepEqual(rows, []);
});

test("le CSV porte son en-tête", () => {
  assert.ok(memoryExportCsv(buildMemoryExport({ assertions: ASSERTIONS })).includes("Nature;Clé;Affirmation"));
});

test("le nom du fichier porte le projet et le jour", () => {
  const exporte = buildMemoryExport({
    project: { name: "Aurora Campus" },
    assertions: ASSERTIONS,
    generatedAt: "2026-03-21T08:00:00.000Z"
  });
  assert.equal(memoryExportFilename(exporte, "json"), "memoire-aurora-campus-2026-03-21.json");
});

test("l'export se sérialise en JSON", () => {
  assert.doesNotThrow(() => JSON.stringify(buildMemoryExport({ assertions: ASSERTIONS })));
});
