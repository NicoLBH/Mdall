import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderFlatSujetRow } from "./project-subjects-table.js";
import { renderProblemsCountsIconHtml } from "../ui/subissues-counts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("renderFlatSujetRow affiche fermé/total pour les enfants directs", () => {
  const subject = { id: "parent", title: "Sujet parent", status: "open" };
  const childrenById = {
    parent: [
      { id: "child-open", status: "open" },
      { id: "child-closed", status: "closed" }
    ],
    "child-open": [{ id: "grand-child-closed", status: "closed" }]
  };

  const html = renderFlatSujetRow(subject, "sit-1", {
    deps: {
      escapeHtml: (value) => String(value ?? ""),
      svgIcon: () => "",
      issueIcon: () => "",
      getEffectiveSujetStatus: (id) => {
        if (id === "child-closed") return "closed";
        return "open";
      },
      getEntityReviewMeta: () => ({ review_state: "", is_seen: true }),
      getReviewTitleStateClass: () => "",
      getEntityDisplayRef: () => "S-1",
      getEntityDescriptionState: () => ({ author: "System" }),
      formatRelativeTimeLabel: () => "opened now",
      getEntityListTimestamp: () => Date.now(),
      getSubjectSidebarMeta: () => ({ labels: [], objectiveIds: [] }),
      getSubjectLabelDefinition: () => null,
      renderSubjectLabelBadge: () => "",
      getObjectiveById: () => null,
      getChildSubjects: (id) => childrenById[id] || [],
      firstNonEmpty: (...values) => values.find((value) => value !== undefined && value !== null && value !== "") || "",
      store: { user: null, projectForm: { collaborators: [] } }
    }
  });

  assert.match(html, />1 \/ 2<\//);
  assert.doesNotMatch(html, />2 \/ 3<\//);
});

test("subissues-counts utilise bien le ratio fermé/total pour le ring", () => {
  const complete = renderProblemsCountsIconHtml(2, 2);
  const partial = renderProblemsCountsIconHtml(1, 2);

  assert.match(complete, /subissues-problems-icon--complete/);
  assert.doesNotMatch(partial, /subissues-problems-icon--complete/);
  assert.match(partial, /stroke-dasharray="50 100"/);
});

test("project-subjects-view garde un seul rendu inline cohérent en fermé/total", () => {
  const viewPath = path.resolve(__dirname, "./project-subjects-view.js");
  const source = fs.readFileSync(viewPath, "utf8");

  const declarations = source.match(/function renderSubissueInlineMetaHtml\(/g) ?? [];
  assert.equal(declarations.length, 1);
  assert.doesNotMatch(source, /\$\{openChildren\} \/ \$\{childSubjects\.length\}/);
});
