import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viewPath = path.resolve(__dirname, "./project-subjects-view.js");
const viewSource = fs.readFileSync(viewPath, "utf8");
const detailsRendererPath = path.resolve(__dirname, "./project-subjects-details-renderer.js");
const detailsRendererSource = fs.readFileSync(detailsRendererPath, "utf8");
const eventsPath = path.resolve(__dirname, "./project-subjects-events.js");
const eventsSource = fs.readFileSync(eventsPath, "utf8");
const statePath = path.resolve(__dirname, "./project-subjects-state.js");
const stateSource = fs.readFileSync(statePath, "utf8");
const stylePath = path.resolve(__dirname, "../../../style.css");
const styleSource = fs.readFileSync(stylePath, "utf8");

test("rend le bouton Ajouter sous-sujet dans la description quand il n'y a aucun sous-sujet", () => {
  assert.match(detailsRendererSource, /shouldRenderDescriptionAddSubissueAction = selection\.type === "sujet" && childSubjects\.length === 0/);
  assert.match(detailsRendererSource, /renderDescriptionCard\(selection, \{/);
  assert.match(detailsRendererSource, /footerActionsHtml:[\s\S]*renderAddSubissueActionButton\(item\.id, \{ placement: "description" \}\)/);
  assert.match(detailsRendererSource, /const descriptionAddSubissueActionHtml = "";/);
});

test("rend le bouton Ajouter sous-sujet en bas du panneau des sous-sujets quand il y a des enfants", () => {
  assert.match(viewSource, /bodyHtml: `\$\{body\}\$\{renderAddSubissueActionButton\(sujet\?\.id, \{ placement: "subissues" \}\)\}`/);
});

test("le dropdown Ajouter sous-sujet expose exactement les deux actions attendues", () => {
  assert.match(viewSource, /if \(field === "subissue-actions"\)/);
  assert.match(viewSource, /subissueActionsView === "existing-subissue"/);
  assert.match(viewSource, /data-action="subissue-actions-back"/);
  assert.match(viewSource, /subject-subissue-existing-entry/);
  assert.match(viewSource, /data-action="open-create-subissue"/);
  assert.match(viewSource, /Créer un sous-sujet/);
  assert.match(viewSource, /data-action="open-link-existing-subissue"/);
  assert.match(viewSource, /Ajouter un sujet existant/);
});

test("l'événement d'ouverture du menu sous-sujet utilise le dropdown mutualisé", () => {
  assert.match(eventsSource, /\[data-action='open-subissue-action-menu'\]/);
  assert.match(eventsSource, /debugSubissueFlow\("menu-open", \{/);
  assert.match(eventsSource, /dropdownController\(\)\.openMeta\(\{ field: "subissue-actions" \}\)/);
  assert.match(eventsSource, /dropdownController\(\)\.closeKanban\(\);/);
  assert.match(eventsSource, /dropdown\.subissueActionsView = "menu";/);
  assert.match(eventsSource, /const syncSubissueActionTriggerUi = \(\) => \{/);
  assert.match(eventsSource, /refreshSubjectMetaDropdownUi\(root, \{ preserveScroll: true, preserveFocus: false \}\);/);
});

test("l'action Ajouter un sujet existant ouvre une sous-vue latérale sans fermer le dropdown", () => {
  assert.match(eventsSource, /\[data-action='open-link-existing-subissue'\]/);
  assert.match(eventsSource, /dropdownHost\.querySelectorAll\("\[data-action='open-link-existing-subissue'\]"\)/);
  assert.match(eventsSource, /debugSubissueFlow\("menu-open-existing-view", \{/);
  assert.match(eventsSource, /dropdown\.subissueActionsView = "existing-subissue";/);
  assert.match(eventsSource, /dropdownController\(\)\.focusSearch\(\{ field: "subissue-actions" \}\);/);
  assert.match(eventsSource, /\[data-action='open-link-existing-subissue'\][\s\S]{0,600}refreshSubjectMetaDropdownUi\(root, \{ preserveScroll: true, preserveFocus: false \}\);/);
});

test("la sélection d'un sujet existant utilise setSubjectParent puis referme le dropdown", () => {
  assert.match(eventsSource, /\[data-subject-subissue-existing-entry\]/);
  assert.match(eventsSource, /await setSubjectParent\(childSubjectId, parentSubjectId, \{ root, skipRerender: true \}\);/);
  assert.match(eventsSource, /debugSubissueFlow\("parent-linked", \{/);
  assert.match(eventsSource, /debugSubissueFlow\("final-selection", \{/);
  assert.match(eventsSource, /dropdownController\(\)\.closeMeta\(\);/);
});

test("les data attributes et l'état UI dédié sont présents", () => {
  assert.match(viewSource, /data-action="open-subissue-action-menu"/);
  assert.match(stateSource, /subissueActionSubjectId: ""/);
  assert.match(stateSource, /subissueActionsView: "menu"/);
  assert.match(stateSource, /subissueActionScopeHost: "main"/);
  assert.match(stateSource, /subissueActionIntent: ""/);
});

test("le style du bouton est défini pour les emplacements description et sous-sujets", () => {
  assert.match(styleSource, /\.subject-add-subissue-action--description/);
  assert.match(styleSource, /\.subject-add-subissue-action--subissues/);
});
