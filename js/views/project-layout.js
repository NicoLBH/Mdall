import {
  PROJECT_TAB_IDS,
  normalizeProjectTabId,
  isProjectTabAllowedForUser
} from "../constants.js";
import { store } from "../store.js";
import { renderProjectDocuments } from "./project-documents.js";
import { renderProjectAvis } from "./project-avis.js";
import { renderProjectSituations } from "./project-situations.js";
import { renderProjectHeader } from "./project-header.js";
import { renderProjectSituationsTopBanner } from "./project-situations-runbar.js";
import { mountProjectShellChrome } from "./project-shell-chrome.js";
import { renderProjectPropositions } from "./project-propositions.js";
import { renderProjectDiscussions } from "./project-discussions.js";
import { renderProjectActions } from "./project-actions.js";
import { renderProjectInsights } from "./project-insights.js";
import { renderProjectReferentiel } from "./project-referentiel.js";
import { renderProjectRisquesSecurite } from "./project-risques-securite.js";
import { renderProjectPilotage } from "./project-oversight.js";
import { renderProjectSubjects } from "./project-subjects.js";
import { renderProjectParametres } from "./project-parametres.js";

function normalizeProjectTab(tab) {
  const normalized = normalizeProjectTabId(tab);

  let resolvedTab;
  switch (normalized) {
    case PROJECT_TAB_IDS.DOCUMENTS:
    case PROJECT_TAB_IDS.AVIS:
    case PROJECT_TAB_IDS.SUBJECTS:
    case PROJECT_TAB_IDS.SITUATIONS:
    case PROJECT_TAB_IDS.PROPOSITIONS:
    case PROJECT_TAB_IDS.DISCUSSIONS:
    case PROJECT_TAB_IDS.ACTIONS:
    case PROJECT_TAB_IDS.PILOTAGE:
    case PROJECT_TAB_IDS.REFERENTIEL:
    case PROJECT_TAB_IDS.RISQUES_SECURITE:
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

  root.innerHTML = `
    <div class="project-shell" id="projectShell">
      ${renderProjectHeader(projectId, normalizedTab)}

      <div class="project-shell__body">
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

    case PROJECT_TAB_IDS.AVIS:
      renderProjectAvis(content);
      break;

    case PROJECT_TAB_IDS.SUBJECTS:
      renderProjectSubjects(content);
      break;
    
    case PROJECT_TAB_IDS.SITUATIONS:
      renderProjectSituations(content);
      break;

    case PROJECT_TAB_IDS.PROPOSITIONS:
      renderProjectPropositions(content);
      break;

    case PROJECT_TAB_IDS.DISCUSSIONS:
      renderProjectDiscussions(content);
      break;

    case PROJECT_TAB_IDS.ACTIONS:
      renderProjectActions(content);
      break;

    case PROJECT_TAB_IDS.PILOTAGE:
      renderProjectPilotage(content);
      break;

    case PROJECT_TAB_IDS.REFERENTIEL:
      renderProjectReferentiel(content);
      break;

    case PROJECT_TAB_IDS.RISQUES_SECURITE:
      renderProjectRisquesSecurite(content);
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
}
