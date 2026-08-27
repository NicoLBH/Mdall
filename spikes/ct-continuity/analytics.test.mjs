import test from "node:test";
import assert from "node:assert/strict";

import { buildAnalytics, quarterRange, toQuarter } from "./analytics.mjs";

const DOCUMENTS = [
  { source_id: "d1", issued_at: "2024-01-15", recapitulative: true, document_type_label: "Rapport initial (RICT)" },
  { source_id: "d2", issued_at: "2024-04-10", recapitulative: false, document_type_label: "Fiche avis travaux" },
  { source_id: "d3", issued_at: "2024-10-20", recapitulative: true, document_type_label: "Rapport d'étape" }
];

const AVIS = [
  { reference: "1", status: "RESOLVED", raised_at: "2024-01-15", resolved_at: "2024-04-10", age_days: 86 },
  { reference: "2", status: "RESOLVED", raised_at: "2024-01-15", resolved_at: "2024-10-20", age_days: 279 },
  { reference: "3", status: "OPEN", raised_at: "2024-04-10", resolved_at: null, age_days: 193 }
];

test("le trimestre se lit dans la date, sans bibliothèque", () => {
  assert.equal(toQuarter("2024-01-15"), "2024-T1");
  assert.equal(toQuarter("2024-12-31"), "2024-T4");
  assert.equal(toQuarter(null), null);
});

test("la série de trimestres ne saute pas les trous", () => {
  assert.deepEqual(quarterRange("2024-T3", "2025-T2"), ["2024-T3", "2024-T4", "2025-T1", "2025-T2"]);
  assert.deepEqual(quarterRange("2025-T1", "2024-T1"), [], "un ordre inversé ne produit rien");
  assert.deepEqual(quarterRange(null, "2024-T1"), []);
});

test("le flux distingue ce qui est émis de ce qui est levé", () => {
  const { flow } = buildAnalytics(AVIS, DOCUMENTS);

  assert.deepEqual(flow, [
    { quarter: "2024-T1", raised: 2, resolved: 0 },
    { quarter: "2024-T2", raised: 1, resolved: 1 },
    { quarter: "2024-T3", raised: 0, resolved: 0 },
    { quarter: "2024-T4", raised: 0, resolved: 1 }
  ]);
});

test("l'encours se mesure aux jalons, pas à chaque document", () => {
  const { backlog } = buildAnalytics(AVIS, DOCUMENTS);

  assert.deepEqual(
    backlog.map((entry) => [entry.at, entry.open]),
    [
      ["2024-01-15", 2],
      ["2024-10-20", 1]
    ]
  );
  assert.equal(backlog.length, 2, "la fiche du 10/04 n'est pas un point de contrôle");
});

test("le délai de levée est une médiane, calculée sur les seuls avis levés", () => {
  const { delay } = buildAnalytics(AVIS, DOCUMENTS);

  assert.equal(delay.count, 2);
  assert.equal(delay.median, 183, "moyenne des deux valeurs centrales : 86 et 279");
});

test("sans aucun avis levé, le délai est nul et non pas zéro", () => {
  const { delay } = buildAnalytics([{ reference: "9", status: "OPEN", raised_at: "2024-01-15", resolved_at: null, age_days: 40 }], DOCUMENTS);

  assert.equal(delay.median, null, "un délai inconnu n'est pas un délai instantané");
  assert.equal(delay.count, 0);
});

test("l'ancienneté des avis encore ouverts se range par tranche", () => {
  const { ageBands, stillOpenCount } = buildAnalytics(AVIS, DOCUMENTS);

  assert.equal(stillOpenCount, 1);
  assert.deepEqual(
    ageBands.map((band) => [band.id, band.count]),
    [
      ["0-3", 0],
      ["3-6", 0],
      ["6-12", 1],
      ["12+", 0]
    ]
  );
});

test("la production documentaire compte les livrables par trimestre et par nature", () => {
  const { production, documentsByType } = buildAnalytics(AVIS, DOCUMENTS);

  assert.deepEqual(production, [
    { quarter: "2024-T1", count: 1 },
    { quarter: "2024-T2", count: 1 },
    { quarter: "2024-T3", count: 0 },
    { quarter: "2024-T4", count: 1 }
  ]);
  assert.equal(documentsByType.length, 3);
});

test("ce qui n'est pas calculable est dit, pas passé sous silence", () => {
  const { notAvailable } = buildAnalytics(AVIS, DOCUMENTS);

  assert.equal(notAvailable.length, 1);
  assert.match(notAvailable[0], /lot ou par entreprise/);
});

test("un lot vide ne fabrique aucune série", () => {
  const analytics = buildAnalytics([], []);

  assert.deepEqual(analytics.quarters, []);
  assert.deepEqual(analytics.flow, []);
  assert.deepEqual(analytics.backlog, []);
  assert.equal(analytics.delay.median, null);
});
