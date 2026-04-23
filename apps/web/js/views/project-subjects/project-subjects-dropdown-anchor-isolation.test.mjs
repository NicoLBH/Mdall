import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viewSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-view.js"), "utf8");
const eventsSource = fs.readFileSync(path.resolve(__dirname, "./project-subjects-events.js"), "utf8");
const controllerSource = fs.readFileSync(path.resolve(__dirname, "../ui/select-dropdown-controller.js"), "utf8");

test("les ancres meta utilisent une clé unique scope + host + subjectId + field + instance", () => {
  assert.match(controllerSource, /export function buildSubjectMetaAnchorKey\(/);
  assert.match(controllerSource, /\[normalizedScope, normalizedScopeHost, normalizedSubjectId, normalizedField, normalizedInstance\]\.join\(":"\)/);
  assert.match(viewSource, /data-subject-meta-anchor="\$\{escapeHtml\(anchorKey\)\}"/);
});

test("l'état visuel ouvert compare le contexte complet et la clé d'ancre", () => {
  assert.match(controllerSource, /export function isMetaDropdownOpenForAnchor\(/);
  assert.match(controllerSource, /String\(dropdown\.anchorKey \|\| ""\) === expectedAnchorKey/);
  assert.match(viewSource, /const isOpen = isMetaDropdownOpenForAnchor\(dropdown, \{ field, subjectId, scope, scopeHost, anchorKey \}\);/);
});

test("le contrôleur positionne via anchorKey sans fallback ambigu basé sur field", () => {
  assert.match(controllerSource, /const anchorKey = String\(viewState\.subjectMetaDropdown\?\.anchorKey \|\| ""\)\.trim\(\);/);
  assert.match(controllerSource, /anchorSelector = `\[data-subject-meta-anchor="\$\{CSS\.escape\(anchorKey\)\}"\]`;/);
  assert.doesNotMatch(controllerSource, /data-subject-meta-anchor="\$\{field\}"/);
});

test("la modale subissue bloque les triggers de l'aside sous-jacent", () => {
  assert.match(eventsSource, /function isBlockedBySubissueModal\(root, trigger = null\)/);
  assert.match(eventsSource, /if \(isBlockedBySubissueModal\(root, btn\)\) return;/);
});

test("fermeture dropdown nettoie la session d'ancre", () => {
  assert.match(controllerSource, /dropdown\.anchorKey = "";/);
  assert.match(controllerSource, /dropdown\.instanceKey = "";/);
  assert.match(controllerSource, /dropdown\.openedFrom = "";/);
});

test("le refresh de dropdown lit explicitement l'état dropdown courant", () => {
  assert.match(eventsSource, /function refreshSubjectMetaDropdownUi\(root, \{ field = "", preserveScroll = false, preserveFocus = false, focusArgs = null \} = \{\}\) \{\s*if \(!root\) return null;\s*const dropdown = getSubjectsViewState\(\)\.subjectMetaDropdown \|\| \{\};/s);
});
