import test from "node:test";
import assert from "node:assert/strict";

import { renderFlatSujetRow } from "./project-subjects-table.js";

function buildDeps(overrides = {}) {
  return {
    escapeHtml: (value) => String(value ?? ""),
    svgIcon: () => "",
    issueIcon: () => "",
    getEffectiveSujetStatus: () => "open",
    getEntityReviewMeta: () => ({ review_state: "", is_seen: true }),
    getReviewTitleStateClass: () => "",
    getEntityDisplayRef: () => "S-1",
    getEntityDescriptionState: () => ({ author: "System", agent: "system" }),
    formatRelativeTimeLabel: () => "opened now",
    getEntityListTimestamp: () => Date.now(),
    getSubjectSidebarMeta: () => ({ labels: [], objectiveIds: [] }),
    getSubjectLabelDefinition: () => null,
    renderSubjectLabelBadge: () => "",
    getObjectiveById: () => null,
    getChildSubjects: () => [],
    getBlockedBySubjects: () => [{ id: "A" }],
    getHeadVisibleBlockedBySubjects: () => [],
    firstNonEmpty: (...values) => values.find((value) => value !== undefined && value !== null && value !== "") || "",
    store: { user: null, projectForm: { collaborators: [] } },
    ...overrides
  };
}

test("renderFlatSujetRow masque le pill Bloqué si le head Bloqué par est masqué", () => {
  const html = renderFlatSujetRow({ id: "B", title: "Sujet B", status: "open" }, "sit-1", {
    deps: buildDeps({
      getBlockedBySubjects: () => [{ id: "A" }],
      getHeadVisibleBlockedBySubjects: () => []
    })
  });

  assert.doesNotMatch(html, /issue-row-blocked-pill/);
  assert.doesNotMatch(html, />Bloqué</);
});

test("renderFlatSujetRow affiche le pill Bloqué quand le head Bloqué par est visible", () => {
  const html = renderFlatSujetRow({ id: "B", title: "Sujet B", status: "open" }, "sit-1", {
    deps: buildDeps({
      getHeadVisibleBlockedBySubjects: () => [{ id: "D" }]
    })
  });

  assert.match(html, /issue-row-blocked-pill/);
  assert.match(html, />Bloqué</);
});
