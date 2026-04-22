import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const detailsRendererPath = path.resolve(__dirname, "./project-subjects-details-renderer.js");
const detailsRendererSource = fs.readFileSync(detailsRendererPath, "utf8");
const detailControllerPath = path.resolve(__dirname, "./project-subject-detail.js");
const detailControllerSource = fs.readFileSync(detailControllerPath, "utf8");
const drilldownPath = path.resolve(__dirname, "./project-subject-drilldown.js");
const drilldownSource = fs.readFileSync(drilldownPath, "utf8");
const eventsPath = path.resolve(__dirname, "./project-subjects-events.js");
const eventsSource = fs.readFileSync(eventsPath, "utf8");
const viewPath = path.resolve(__dirname, "./project-subjects-view.js");
const viewSource = fs.readFileSync(viewPath, "utf8");
const statePath = path.resolve(__dirname, "./project-subjects-state.js");
const stateSource = fs.readFileSync(statePath, "utf8");
const stylePath = path.resolve(__dirname, "../../../style.css");
const styleSource = fs.readFileSync(stylePath, "utf8");

test("le header normal de détail sujet expose le bouton Nouveau sujet au même niveau que Modifier", () => {
  assert.match(detailsRendererSource, /<div class="subject-title-display__actions">[\s\S]*data-action="edit-subject-title"[\s\S]*data-action="open-create-subject-from-detail"/);
  assert.match(detailsRendererSource, /subject-title-display__edit-action/);
  assert.match(detailsRendererSource, /class="gh-btn gh-action__main gh-btn--primary gh-btn--md subject-title-display__create-from-detail-action"/);
  assert.match(styleSource, /\.subject-title-display__edit-action\{height:32px;\}/);
  assert.match(styleSource, /\.subject-title-display__create-from-detail-action\{margin-left:8px;\}/);
  assert.match(detailControllerSource, /showCreateFromDetailAction: true/);
});

test("le drilldown ne rend pas le bouton Nouveau sujet", () => {
  assert.doesNotMatch(drilldownSource, /open-create-subject-from-detail/);
});

test("openCreateSubjectForm accepte un contexte explicite origin\/sourceSubjectId", () => {
  assert.match(viewSource, /function openCreateSubjectForm\(options = \{\}\)/);
  assert.match(viewSource, /const mode = String\(options\.mode \|\| ""\)\.trim\(\)\.toLowerCase\(\) === "subissue" \? "subissue" : "standard";/);
  assert.match(viewSource, /const origin = mode === "subissue" \? "detail" : \(requestedOrigin === "detail" \? "detail" : "table"\);/);
  assert.match(viewSource, /sourceSubjectId/);
  assert.match(viewSource, /parentSubjectId/);
  assert.match(stateSource, /origin: "table"/);
  assert.match(stateSource, /mode: "standard"/);
  assert.match(stateSource, /sourceSubjectId: null/);
});

test("le clic depuis le détail ouvre le formulaire en mode detail avec le sujet source", () => {
  assert.match(eventsSource, /\[data-action='open-create-subject-from-detail'\]/);
  assert.match(eventsSource, /openCreateSubjectForm\(\{ origin: "detail", sourceSubjectId: activeSubjectId \}\);/);
});

test("Annuler depuis une création ouverte depuis le détail restaure le sujet source", () => {
  assert.match(eventsSource, /const formOrigin = String\(formContext\.origin \|\| ""\)\.trim\(\)\.toLowerCase\(\) === "detail" \? "detail" : "table";/);
  assert.match(eventsSource, /if \(formOrigin === "detail" && sourceSubjectId && getNestedSujet\(sourceSubjectId\)\) \{/);
  assert.match(eventsSource, /selectSubject\(sourceSubjectId\) \|\| selectSujet\(sourceSubjectId\);/);
});

test("Ajouter conserve En ajouter d'autres et distingue le flux detail/table", () => {
  assert.match(eventsSource, /openCreateSubjectForm\(\{\s*origin: formOrigin,\s*sourceSubjectId\s*\}\);/);
  assert.match(eventsSource, /if \(formOrigin === "detail"\) \{\s*store\.situationsView\.showTableOnly = false;/);
  assert.match(eventsSource, /openCreateSubjectForm\(\{ origin: "table", sourceSubjectId: null \}\);/);
});

test("Créer un sous-sujet ouvre le create form en mode subissue (modale)", () => {
  assert.match(eventsSource, /openCreateSubjectForm\(\{\s*mode: "subissue",[\s\S]*parentSubjectId,[\s\S]*scopeHost:/);
  assert.match(viewSource, /function renderCreateSubissueModalHtml\(\)/);
  assert.match(viewSource, /subjectCreateSubissueModal/);
  assert.match(stateSource, /mode: "standard"/);
  assert.match(stateSource, /parentSubjectId: null/);
});
