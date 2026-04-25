import test from "node:test";
import assert from "node:assert/strict";
import { renderSubjectTreeGrid } from "./subject-tree-grid.js";

test("renderSubjectTreeGrid limite le drag au premier niveau en mode first-level", () => {
  const html = renderSubjectTreeGrid({
    subjectsById: {
      root: { id: "root", title: "Root" },
      child: { id: "child", title: "Child" }
    },
    childrenBySubjectId: {
      root: ["child"],
      child: []
    },
    rootSubjectIds: ["root"],
    expandedSubjectIds: new Set(["root"]),
    dndMode: "first-level",
    renderTitleCell: () => "<div></div>",
    renderExtraCells: () => ""
  });

  assert.match(html, /data-child-subject-id="root"[\s\S]*?draggable="true"/);
  assert.match(html, /data-child-subject-id="child"[\s\S]*?draggable="false"/);
  assert.match(html, /subissues-sortable-row[\s\S]*data-child-subject-id="root"/);
  assert.match(html, /subissues-tree-row[\s\S]*data-child-subject-id="child"/);
});
