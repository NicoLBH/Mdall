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
  assert.doesNotMatch(eventsSource, /document\.body\.dataset\.situationGridDropdownGlobalBound/);
  assert.match(eventsSource, /uiState\?\.situationGridDropdownAbortController\?\.abort\?\.\(\);/);
  assert.match(eventsSource, /uiState\.situationGridDropdownAbortController = new AbortController\(\);/);
  assert.match(eventsSource, /document\.addEventListener\("pointerdown", \(event\) => \{[\s\S]*closeSituationGridCellDropdown\(\);[\s\S]*\}, \{ capture: true, signal \}\);/s);
});

test("la mise à jour kanban snapshot les ids avant fermeture et rollback avec ces constantes", () => {
  assert.match(eventsSource, /const subjectId = String\(state\.subjectId \|\| ""\)\.trim\(\);/);
  assert.match(eventsSource, /const situationId = String\(state\.situationId \|\| ""\)\.trim\(\);/);
  assert.match(eventsSource, /closeSituationGridCellDropdown\(\);\s*try \{\s*[\s\S]*await setSituationGridKanbanStatus\?\.\(situationId, subjectId, nextStatus\);/s);
  assert.match(eventsSource, /\[situationId\]: \{[\s\S]*\[subjectId\]: previousStatus/s);
  assert.match(eventsSource, /patchSituationGridKanbanCell\(\{ root, subjectId, situationId \}\);/);
});

test("les actions shared snapshotent le contexte, utilisent skipRerender true et rerender conditionnel", () => {
  assert.match(eventsSource, /const subjectId = String\(state\.subjectId \|\| actionNode\?\.getAttribute\("data-subject-id"\) \|\| ""\)\.trim\(\);/);
  assert.match(eventsSource, /const situationId = String\(state\.situationId \|\| actionNode\?\.getAttribute\("data-situation-id"\) \|\| ""\)\.trim\(\);/);
  assert.match(eventsSource, /const field = String\(state\.field \|\| ""\)\.trim\(\)\.toLowerCase\(\);/);
  assert.match(eventsSource, /closeSituationGridCellDropdown\(\);\s*if \(!value\) return true;/s);
  assert.match(eventsSource, /const success = await action\?\.\(subjectId, value, \{ root, skipRerender: true \}\);/);
  assert.match(eventsSource, /if \(success === true\) \{[\s\S]*rerender\(root\);[\s\S]*return true;[\s\S]*\}/s);
  assert.match(eventsSource, /shared-action:false-result/);
  assert.match(eventsSource, /showSituationGridInlineError\(root, "La mise à jour a échoué\."\);/);
});

test("la fermeture extérieure utilise closeSituationGridCellDropdown et closeSharedSubjectDropdowns", () => {
  assert.match(eventsSource, /function closeSituationGridCellDropdown\(\) \{[\s\S]*closeSharedSubjectDropdowns\?\.\(\);[\s\S]*\}/s);
  assert.match(eventsSource, /outside-click-close/);
  assert.match(eventsSource, /outside-pointerdown-close/);
  assert.match(eventsSource, /if \(shouldIgnoreOutsideClose\(eventTarget, state\)\) return;/);
  assert.match(eventsSource, /closeSituationGridCellDropdown\(\);/);
});

test("la grille situation bind un DnD multi-niveaux avec instrumentation dédiée", () => {
  assert.match(eventsSource, /function bindSituationGridDnd\(root\)/);
  assert.match(eventsSource, /data-subissue-sortable-row='true'/);
  assert.match(eventsSource, /logSituationGridDnd\("dragstart"/);
  assert.match(eventsSource, /logSituationGridDnd\("dragover"/);
  assert.match(eventsSource, /logSituationGridDnd\("drop"/);
  assert.match(eventsSource, /logSituationGridDnd\("persist-success"/);
  assert.match(eventsSource, /logSituationGridDnd\("persist-error"/);
  assert.match(eventsSource, /await setSituationGridSubjectParent\?\.\(sourceId, nextParentId \|\| null\);/);
  assert.match(eventsSource, /await reorderSituationGridSubjectChildren\?\.\(nextParentId, nextTargetSiblings\);/);
  assert.match(eventsSource, /bindSituationGridDnd\(root\);/);
});
