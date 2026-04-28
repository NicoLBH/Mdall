import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProjectSituationsKanbanView } from "./project-situations-view-kanban.js";

test("renderSituationKanban affiche l'indicateur blocked selon les liens globaux du sujet", () => {
  const store = {
    projectSubjectsView: {
      subjectLinks: [
        {
          id: "link-1",
          link_type: "blocked_by",
          source_subject_id: "subject-1",
          target_subject_id: "subject-z"
        }
      ],
      rawSubjectsResult: {
        subjectsById: {
          "subject-1": { id: "subject-1", title: "Sujet 1", status: "open" }
        },
        childrenBySubjectId: {
          "subject-1": []
        }
      }
    }
  };

  const kanban = createProjectSituationsKanbanView({
    store,
    getSujetKanbanStatus: () => "to_activate",
    setSujetKanbanStatus: async () => true,
    openSubjectDrilldown: () => undefined,
    refreshAfterKanbanChange: async () => undefined
  });

  const html = kanban.renderSituationKanban(
    { id: "sit-1", title: "Situation" },
    [{ id: "subject-1", title: "Sujet 1", status: "open" }],
    {}
  );

  assert.match(html, /subject-status-blocked-indicator/);
  assert.match(html, /situation-kanban-card__status-blocked-indicator/);
});

test("renderSituationKanban conserve l'ordre fourni et expose data-situation-kanban-order-index", () => {
  const store = { projectSubjectsView: { rawSubjectsResult: { subjectsById: {}, childrenBySubjectId: {} } } };
  const kanban = createProjectSituationsKanbanView({
    store,
    getSujetKanbanStatus: () => "non_active",
    setSujetKanbanStatus: async () => true,
    reorderSituationKanbanSubjects: async () => [],
    openSubjectDrilldown: () => undefined,
    refreshAfterKanbanChange: async () => undefined
  });

  const html = kanban.renderSituationKanban(
    { id: "sit-1", title: "Situation" },
    [
      { id: "subject-a", title: "Sujet A", status: "open" },
      { id: "subject-b", title: "Sujet B", status: "open" }
    ],
    {}
  );

  assert.match(html, /data-situation-kanban-subject-id="subject-a"[\s\S]*data-situation-kanban-order-index="0"/);
  assert.match(html, /data-situation-kanban-subject-id="subject-b"[\s\S]*data-situation-kanban-order-index="1"/);
});

test("renderSituationKanban expose les attributs drag/drop attendus", () => {
  const store = { projectSubjectsView: { rawSubjectsResult: { subjectsById: {}, childrenBySubjectId: {} } } };
  const kanban = createProjectSituationsKanbanView({
    store,
    getSujetKanbanStatus: () => "to_activate",
    setSujetKanbanStatus: async () => true,
    reorderSituationKanbanSubjects: async () => [],
    openSubjectDrilldown: () => undefined,
    refreshAfterKanbanChange: async () => undefined
  });

  const html = kanban.renderSituationKanban(
    { id: "sit-attrs", title: "Situation" },
    [{ id: "subject-attrs", title: "Sujet attrs", status: "open" }],
    {}
  );

  assert.match(html, /data-situation-kanban-dropzone="to_activate"/);
  assert.match(html, /data-situation-kanban-situation-id="sit-attrs"/);
  assert.match(html, /data-situation-kanban-card="subject-attrs"/);
  assert.match(html, /data-situation-kanban-subject-id="subject-attrs"/);
  assert.match(html, /data-situation-kanban-status="to_activate"/);
  assert.match(html, /draggable="true"/);
});

test("bindKanbanEvents ne court-circuite plus fromStatus===targetStatus et prépare un reorder intra-colonne", () => {
  const source = readFileSync(new URL("./project-situations-view-kanban.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fromStatus\s*===\s*targetStatus\)\s*return/);
  assert.match(source, /const targetOrderedSubjectIds = getOrderedSubjectIds\(zone\);/);
  assert.match(source, /await reorderSituationKanbanSubjects\?\.\(situationId,\s*targetStatus,\s*targetOrderedSubjectIds\);/);
  assert.match(source, /if \(fromStatus !== targetStatus\)/);
  assert.match(source, /reorderSituationKanbanSubjects\?\.\(situationId,\s*targetStatus,\s*targetOrderedSubjectIds\)/);
});
