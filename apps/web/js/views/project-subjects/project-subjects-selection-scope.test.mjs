import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createProjectSubjectsSelection } from "./project-subjects-selection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createSelectionHarness() {
  const situations = new Map([["sit-1", { id: "sit-1", title: "Situation 1" }]]);
  const subjects = new Map([
    ["A", { id: "A", title: "Sujet A" }],
    ["B", { id: "B", title: "Sujet B" }]
  ]);
  const store = {
    situationsView: {
      selectedSituationId: "sit-1",
      selectedSubjectId: "A",
      selectedSujetId: "A",
      data: [{ id: "sit-1", title: "Situation 1" }],
      drilldown: {
        selectedSituationId: "sit-1",
        selectedSubjectId: "B",
        selectedSujetId: "B"
      }
    }
  };
  store.projectSubjectsView = store.situationsView;

  const selectionApi = createProjectSubjectsSelection({
    store,
    ensureViewUiState: () => store.situationsView,
    getNestedSituation: (id) => situations.get(id) || null,
    getNestedSujet: (id) => subjects.get(id) || null,
    getSituationBySujetId: () => situations.get("sit-1"),
    getDraftSubjectSelection: () => ({ type: "sujet", item: { id: "DRAFT" } }),
    rerenderPanels: () => {},
    markEntitySeen: () => {}
  });

  return { store, selectionApi };
}

test("getSelectionForScope('drilldown') retourne la sélection drilldown et pas la sélection active", () => {
  const { selectionApi } = createSelectionHarness();

  const active = selectionApi.getSelectionForScope("active");
  const drilldown = selectionApi.getSelectionForScope("drilldown");

  assert.equal(active?.item?.id, "A");
  assert.equal(drilldown?.item?.id, "B");
  assert.notEqual(drilldown?.item?.id, active?.item?.id);
});

test("getSelectionForScope('drilldown') ne retombe pas silencieusement sur active quand drilldown est vide", () => {
  const { store, selectionApi } = createSelectionHarness();
  store.situationsView.drilldown.selectedSubjectId = null;
  store.situationsView.drilldown.selectedSujetId = null;
  store.situationsView.drilldown.selectedSituationId = null;

  const drilldown = selectionApi.getSelectionForScope("drilldown");
  const drilldownWithFallback = selectionApi.getSelectionForScope("drilldown", { fallbackToActive: true });

  assert.equal(drilldown, null);
  assert.equal(drilldownWithFallback?.item?.id, "A");
});

test("getScopedSelectionFromRoot résout correctement draft / drilldown / active via closest", () => {
  const { selectionApi } = createSelectionHarness();
  const rootFor = (scope) => ({
    closest: (selector) => {
      if (scope === "draft" && selector === "[data-create-subject-form]") return true;
      if (scope === "drilldown" && selector === "#drilldownPanel") return true;
      return false;
    }
  });

  assert.equal(selectionApi.getScopedSelectionFromRoot(rootFor("draft"))?.item?.id, "DRAFT");
  assert.equal(selectionApi.getScopedSelectionFromRoot(rootFor("drilldown"))?.item?.id, "B");
  assert.equal(selectionApi.getScopedSelectionFromRoot(rootFor("main"), { fallbackToActive: true })?.item?.id, "A");
});

test("project-subjects-view utilise getSelectionForScope pour la discussion drilldown", () => {
  const viewPath = path.resolve(__dirname, "./project-subjects-view.js");
  const source = fs.readFileSync(viewPath, "utf8");

  assert.match(source, /selectionOverride: getSelectionForScope\("drilldown"\)/);
  assert.match(source, /const scopedSelection = selectionOverride \|\| getSelectionForScope\(scopeHost\);/);
});
