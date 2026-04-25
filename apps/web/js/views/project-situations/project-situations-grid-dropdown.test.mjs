import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsSource = fs.readFileSync(path.resolve(__dirname, "./project-situations-events.js"), "utf8");

test("la grille situation ouvre un dropdown éditable ancré aux cellules", () => {
  assert.match(eventsSource, /openSituationGridCellDropdown\(root, \{ field, anchor: node, subjectId, situationId \}\)/);
  assert.match(eventsSource, /openSharedSubjectMetaDropdown\?\.\(/);
  assert.match(eventsSource, /openSharedSubjectKanbanDropdown\?\.\(/);
  assert.match(eventsSource, /document\.addEventListener\("keydown", \(event\) => \{\s*if \(event\.key !== "Escape"\) return;/s);
});

test("la mise à jour kanban utilise le service dédié avec rollback local", () => {
  assert.match(eventsSource, /await setSituationGridKanbanStatus\?\.\(state\.situationId, state\.subjectId, nextStatus\)/);
  assert.match(eventsSource, /store\.situationsView\.kanbanStatusBySituationId = \{[\s\S]*\[state\.subjectId\]: previousStatus/s);
  assert.match(eventsSource, /showSituationGridInlineError\(root, error instanceof Error \? error\.message : "La mise à jour du statut kanban a échoué\."\)/);
});

test("la grille réutilise les actions dropdown mutualisées pour assignés, labels et objectifs", () => {
  assert.match(eventsSource, /toggleSubjectAssigneeFromSharedDropdown\?\.\(/);
  assert.match(eventsSource, /toggleSubjectLabelFromSharedDropdown\?\.\(/);
  assert.match(eventsSource, /toggleSubjectObjectiveFromSharedDropdown\?\.\(/);
});
