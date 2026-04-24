import {
  PROJECT_TAB_IDS,
  normalizeProjectTabId,
  isProjectTabAllowedForUser
} from "../constants.js";
import { store } from "../store.js";

import { renderProjectDocuments } from "./project-documents.js";
import { renderProjectSubjects } from "./project-subjects.js";
import { renderProjectActions } from "./project-actions.js";
import { renderProjectStudio } from "./project-studio.js";
import { renderProjectSituations } from "./project-situations.js";
import { renderProjectInsights } from "./project-insights.js";
import { renderProjectParametres } from "./project-parametres.js";

import { renderProjectHeader, bindProjectHeaderNavigation } from "./project-header.js";
import { renderProjectSituationsTopBanner } from "./project-situations-runbar.js";
import { mountProjectShellChrome, debugProjectScrollPolicy } from "./project-shell-chrome.js";


function normalizeProjectTab(tab) {
  const normalized = normalizeProjectTabId(tab);

  let resolvedTab;
  switch (normalized) {
    case PROJECT_TAB_IDS.DOCUMENTS:
    case PROJECT_TAB_IDS.SUBJECTS:
    case PROJECT_TAB_IDS.STUDIO:
    case PROJECT_TAB_IDS.ACTIONS:
    case PROJECT_TAB_IDS.SITUATIONS:
    case PROJECT_TAB_IDS.INSIGHTS:
    case PROJECT_TAB_IDS.PARAMETRES:
      resolvedTab = normalized;
      break;

    default:
      resolvedTab = PROJECT_TAB_IDS.DOCUMENTS;
      break;
  }

  if (!isProjectTabAllowedForUser(resolvedTab, store.user)) {
    return PROJECT_TAB_IDS.DOCUMENTS;
  }

  return resolvedTab;
}

export function renderProjectLayout(root, projectId, tab) {
  const normalizedTab = normalizeProjectTab(tab);
  const shellBodyClassName = `project-shell__body${normalizedTab === PROJECT_TAB_IDS.SITUATIONS ? " project-shell__body--situations" : ""}`;

  bindProjectHeaderNavigation();

  root.innerHTML = `
    <div class="project-shell" id="projectShell" data-project-id="${projectId}">
      ${renderProjectHeader(projectId, normalizedTab)}

      <div class="${shellBodyClassName}">
        ${renderProjectSituationsTopBanner()}
        <div id="projectViewHeaderHost" class="project-view-header-host"></div>
        <div id="situationsToolbarHost" class="project-situations-toolbar-host"></div>
        <div id="project-content" class="project-shell__content"></div>
      </div>
    </div>
  `;

  mountProjectShellChrome({ projectId, tab: normalizedTab });

  const content = document.getElementById("project-content");
  if (!content) return;

  switch (normalizedTab) {
    case PROJECT_TAB_IDS.DOCUMENTS:
      renderProjectDocuments(content);
      break;


    case PROJECT_TAB_IDS.SUBJECTS:
      renderProjectSubjects(content);
      break;

    case PROJECT_TAB_IDS.STUDIO:
      renderProjectStudio(content);
      break;

    case PROJECT_TAB_IDS.ACTIONS:
      renderProjectActions(content);
      break;
    
    case PROJECT_TAB_IDS.SITUATIONS:
      renderProjectSituations(content);
      break;
    
    case PROJECT_TAB_IDS.INSIGHTS:
      renderProjectInsights(content);
      break;

    case PROJECT_TAB_IDS.PARAMETRES:
      renderProjectParametres(content);
      break;

    default:
      renderProjectDocuments(content);
      break;
  }

  debugProjectScrollPolicy("project-tab-render", {
    tab: normalizedTab
  });
}
