import test from "node:test";
import assert from "node:assert/strict";
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
