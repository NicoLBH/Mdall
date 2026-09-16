import {
  PROJECT_TAB_IDS,
  normalizeProjectTabId,
  isProjectTabAllowedForUser
} from "../constants.js";
import { store } from "../store.js";

import { renderProjectDocuments } from "./project-documents.js";
import { renderProjectSubjects } from "./project-subjects.js";
import { renderProjectPropositions } from "./project-propositions.js";
import { renderProjectMemory } from "./project-memory.js";
import { renderProjectActions } from "./project-actions.js";
import { renderProjectStudio } from "./project-studio.js";
import { renderProjectInsights } from "./project-insights.js";
import { renderProjectParametres } from "./project-parametres.js";

import { renderProjectHeader, bindProjectHeaderNavigation } from "./project-header.js";
import { renderProjectSituationsTopBanner } from "./project-situations-runbar.js";
import { mountProjectShellChrome, debugProjectScrollPolicy } from "./project-shell-chrome.js";
import { abandonnerLaVariante } from "../services/variante-en-cours.js";


function normalizeProjectTab(tab) {
  const normalized = normalizeProjectTabId(tab);

  let resolvedTab;
  switch (normalized) {
    case PROJECT_TAB_IDS.DOCUMENTS:
    case PROJECT_TAB_IDS.SUBJECTS:
    case PROJECT_TAB_IDS.PROPOSITIONS:
    case PROJECT_TAB_IDS.MEMOIRE:
    case PROJECT_TAB_IDS.STUDIO:
    case PROJECT_TAB_IDS.ACTIONS:
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

/**
 * @param {object} [options]
 * @param {string} [options.ouvrir] ce que l'onglet doit ouvrir en arrivant —
 *   un sujet, une proposition. Vide, il s'ouvre sur sa liste.
 */
export function renderProjectLayout(root, projectId, tab, { ouvrir = "" } = {}) {
  const normalizedTab = normalizeProjectTab(tab);

  // Une variante est une **lecture de la mémoire** : elle vit tant qu'on la lit,
  // et quitter l'onglet y met fin.
  //
  // Ce n'est pas une commodité, c'est le garde-fou principal. Le seul vrai
  // danger d'une variante est d'oublier qu'on y est ; le bandeau ne vit que sur
  // l'écran de la mémoire, et laisser la variante courir derrière un autre
  // onglet ferait exactement ce qu'on veut interdire — lire une valeur fausse
  // sur une page qui n'a pas l'air d'être en variante.
  if (normalizedTab !== PROJECT_TAB_IDS.MEMOIRE) abandonnerLaVariante();

  bindProjectHeaderNavigation();

  root.innerHTML = `
    <div class="project-shell" id="projectShell" data-project-id="${projectId}">
      ${renderProjectHeader(projectId, normalizedTab)}

      <div class="project-shell__body">
        ${renderProjectSituationsTopBanner()}
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
      renderProjectSubjects(content, { ouvrir });
      break;

    case PROJECT_TAB_IDS.PROPOSITIONS:
      renderProjectPropositions(content, { ouvrir });
      break;

    case PROJECT_TAB_IDS.MEMOIRE:
      renderProjectMemory(content);
      break;

    case PROJECT_TAB_IDS.STUDIO:
      renderProjectStudio(content);
      break;

    case PROJECT_TAB_IDS.ACTIONS:
      renderProjectActions(content);
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
