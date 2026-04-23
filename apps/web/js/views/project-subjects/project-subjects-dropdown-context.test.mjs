import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventsSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-events.js"), "utf8");
const stateSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-state.js"), "utf8");
const dropdownControllerSource = fs.readFileSync(path.resolve(__dirname, "../ui/select-dropdown-controller.js"), "utf8");
const actionsSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-actions.js"), "utf8");

test("subjectMetaDropdown stocke un contexte explicite (scope + subjectId)", () => {
  assert.match(stateSource, /scope:\s*""/);
  assert.match(stateSource, /scopeHost:\s*"main"/);
  assert.match(stateSource, /subjectId:\s*""/);
});

test("les ouvertures de dropdown méta fournissent scope et subjectId explicites", () => {
  assert.match(eventsSource, /openMeta\(\{\s*field,\s*scope,\s*scopeHost:\s*scope === "drilldown" \? "drilldown" : "main",\s*subjectId:\s*targetSubjectId/s);
  assert.match(eventsSource, /openMeta\(\{\s*field:\s*"subissue-actions",\s*scope,\s*scopeHost:\s*scope === "drilldown" \? "drilldown" : "main",\s*subjectId:\s*targetSubjectId/s);
});

test("les actions dropdown utilisent le sujet du contexte explicite", () => {
  assert.match(eventsSource, /function getDropdownContextSubject\(root, options = \{\}\)/);
  assert.match(eventsSource, /const targetSubject = getDropdownContextSubject\(root\);/);
  assert.doesNotMatch(eventsSource, /toggleSubjectObjective\(subjectSelection\.item\.id/);
  assert.doesNotMatch(eventsSource, /toggleSubjectSituation\(subjectSelection\.item\.id/);
  assert.doesNotMatch(eventsSource, /toggleSubjectLabel\(subjectSelection\.item\.id/);
  assert.doesNotMatch(eventsSource, /toggleSubjectAssignee\(subjectSelection\.item\.id/);
});

test("le contrôleur dropdown conserve le subjectId explicite pendant la session", () => {
  assert.match(dropdownControllerSource, /dropdown\.subjectId = String\(subjectId \|\| ""\);/);
  assert.match(dropdownControllerSource, /dropdown\.subjectId = "";/);
  assert.match(dropdownControllerSource, /const explicitSubjectId = String\(viewState\.subjectMetaDropdown\?\.subjectId \|\| ""\)\.trim\(\);/);
});

test("setSubjectLabels écrit aussi pour un sujet persistant", () => {
  assert.match(actionsSource, /if \(subjectKey !== DRAFT_SUBJECT_ID\) \{/);
  assert.match(actionsSource, /bucket\.subjectMeta\.sujet\[subjectKey\] = \{/);
  assert.match(actionsSource, /labels:\s*nextLabels/);
});
