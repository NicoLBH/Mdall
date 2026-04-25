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
  assert.match(eventsSource, /const eventTarget = event\.target instanceof Element \? event\.target : null;/);
  assert.match(eventsSource, /document\.addEventListener\("pointerdown", \(event\) => \{/);
  assert.match(eventsSource, /document\.addEventListener\("keydown", \(event\) => \{\s*if \(event\.key !== "Escape"\) return;/s);
});

test("la mise à jour kanban snapshot les ids avant fermeture et rollback avec ces constantes", () => {
  assert.match(eventsSource, /const subjectId = String\(state\.subjectId \|\| ""\)\.trim\(\);/);
  assert.match(eventsSource, /const situationId = String\(state\.situationId \|\| ""\)\.trim\(\);/);
  assert.match(eventsSource, /closeSituationGridCellDropdown\(\);\s*try \{\s*[\s\S]*await setSituationGridKanbanStatus\?\.\(situationId, subjectId, nextStatus\);/s);
  assert.match(eventsSource, /\[situationId\]: \{[\s\S]*\[subjectId\]: previousStatus/s);
  assert.match(eventsSource, /patchSituationGridKanbanCell\(\{ root, subjectId, situationId \}\);/);
});

test("les actions assignés labels objectifs utilisent skipRerender true et rerender de la grille", () => {
  assert.match(eventsSource, /toggleSubjectAssigneeFromSharedDropdown\?\.\(subjectId, assigneeId, \{ root, skipRerender: true \}\);/);
  assert.match(eventsSource, /toggleSubjectLabelFromSharedDropdown\?\.\(subjectId, labelKey, \{ root, skipRerender: true \}\);/);
  assert.match(eventsSource, /toggleSubjectObjectiveFromSharedDropdown\?\.\(subjectId, objectiveId, \{ root, skipRerender: true \}\);/);
  assert.match(eventsSource, /await toggleSubjectObjectiveFromSharedDropdown\?\.\([\s\S]*\);\s*rerender\(root\);/s);
});
