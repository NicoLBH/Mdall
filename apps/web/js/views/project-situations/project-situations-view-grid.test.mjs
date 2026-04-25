import test from "node:test";
import assert from "node:assert/strict";
import { __situationGridTestUtils, renderSituationGridView } from "./project-situations-view-grid.js";

test("resolveSituationTreeData remonte en racine les sujets dont le parent n'est pas sélectionné", () => {
  const { resolveSituationTreeData } = __situationGridTestUtils();
  const data = resolveSituationTreeData(
    [{ id: "child" }, { id: "sibling" }],
    {
      subjectsById: {
        parent: { id: "parent", title: "Parent" },
        child: { id: "child", title: "Child", parent_subject_id: "parent" },
        sibling: { id: "sibling", title: "Sibling" }
      },
      childrenBySubjectId: {
        parent: ["child"],
        child: [],
        sibling: []
      },
      parentBySubjectId: {
        child: "parent",
        sibling: null
      }
    }
  );

  assert.deepEqual(data.rootSubjectIds, ["child", "sibling"]);
  assert.deepEqual(data.childrenBySubjectId.child, []);
});

test("renderSituationGridView rend la grille et la colonne titre sans balise table", () => {
  const html = renderSituationGridView(
    { id: "sit-1", title: "Situation" },
    [{ id: "subject-1", title: "Sujet 1", status: "open" }],
    {
      store: {
        situationsView: {},
        projectSubjectsView: {
          rawSubjectsResult: {
            subjectsById: {
              "subject-1": { id: "subject-1", title: "Sujet 1", status: "open" }
            },
            childrenBySubjectId: {
              "subject-1": []
            },
            parentBySubjectId: {
              "subject-1": null
            }
          }
        }
      }
    }
  );

  assert.match(html, /project-situation-grid__header/);
  assert.match(html, /situation-grid__subject-title/);
  assert.match(html, /situation-grid__cell--assignees/);
  assert.match(html, /situation-grid__cell--kanban/);
  assert.match(html, /situation-grid__cell--progress/);
  assert.match(html, /situation-grid__cell--labels/);
  assert.match(html, /situation-grid__cell--objectives/);
  assert.match(html, /data-subissue-sortable-row="true"/);
  assert.match(html, /draggable="true"/);
  assert.doesNotMatch(html, /<table|<tr|<td/i);
});

test("renderSituationGridView utilise le statut kanban de la situation et évite les undefined", () => {
  const html = renderSituationGridView(
    { id: "sit-42", title: "Situation" },
    [{ id: "subject-1", title: "Sujet 1", status: "open" }],
    {
      store: {
        situationsView: {
          kanbanStatusBySituationId: {
            "sit-42": {
              "subject-1": "in_progress"
            }
          }
        },
        projectForm: {
          collaborators: []
        },
        projectSubjectsView: {
          rawSubjectsResult: {
            subjectsById: {
              "subject-1": { id: "subject-1", title: "Sujet 1", status: "open" }
            },
            childrenBySubjectId: {
              "subject-1": []
            },
            parentBySubjectId: {
              "subject-1": null
            },
            labelsById: {},
            labelIdsBySubjectId: {},
            objectivesById: {},
            objectiveIdsBySubjectId: {},
            assigneePersonIdsBySubjectId: {}
          }
        }
      }
    }
  );

  assert.match(html, /En cours/);
  assert.match(html, /data-situation-grid-edit-cell="kanban"/);
  assert.match(html, /data-subject-kanban-anchor="subject-1::sit-42"/);
  assert.match(html, /data-situation-grid-edit-cell="assignees"/);
  assert.match(html, /data-subject-meta-anchor="situation-grid:main:subject-1:assignees:situation-grid"/);
  assert.match(html, /situation-grid__editable-caret/);
  assert.doesNotMatch(html, /undefined/);
});

test("normalizeSituationGridColumnWidths respecte les largeurs minimales par colonne", () => {
  const { normalizeSituationGridColumnWidths } = __situationGridTestUtils();
  const widths = normalizeSituationGridColumnWidths({
    title: 120,
    assignees: 400,
    kanban: "20",
    labels: 480
  });

  assert.equal(widths.title, 320);
  assert.equal(widths.assignees, 400);
  assert.equal(widths.kanban, 160);
  assert.equal(widths.progress, 180);
  assert.equal(widths.labels, 480);
  assert.equal(widths.objectives, 220);
});

test("renderSituationGridView affiche l'indicateur blocked même si le bloqueur n'est pas dans la situation", () => {
  const html = renderSituationGridView(
    { id: "sit-1", title: "Situation" },
    [{ id: "subject-1", title: "Sujet 1", status: "open" }],
    {
      store: {
        situationsView: {},
        projectSubjectsView: {
          subjectLinks: [
            {
              id: "l-1",
              link_type: "blocked_by",
              source_subject_id: "subject-1",
              target_subject_id: "subject-x"
            }
          ],
          rawSubjectsResult: {
            subjectsById: {
              "subject-1": { id: "subject-1", title: "Sujet 1", status: "open" }
            },
            childrenBySubjectId: {
              "subject-1": []
            },
            parentBySubjectId: {
              "subject-1": null
            }
          }
        }
      }
    }
  );

  assert.match(html, /subject-status-blocked-indicator/);
  assert.match(html, /situation-grid__status-blocked-indicator/);
});
