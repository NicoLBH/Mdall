import { renderProjectDocuments } from "./project-documents.js";
import { renderProjectSituations } from "./project-situations.js";
import { renderProjectHeader } from "./project-header.js";
import { renderProjectSituationsTopBanner } from "./project-situations-runbar.js";
import { mountProjectShellChrome } from "./project-shell-chrome.js";
import { renderProjectPropositions } from "./project-propositions.js";
import { renderProjectCoordination } from "./project-coordination.js";
import { renderProjectWorkflows } from "./project-workflows.js";
import { renderProjectJalons } from "./project-jalons.js";
import { renderProjectReferentiel } from "./project-referentiel.js";
import { renderProjectRisquesSecurite } from "./project-risques-securite.js";
import { renderProjectPilotage } from "./project-pilotage.js";
import { renderProjectParametres } from "./project-parametres.js";

export function renderProjectLayout(root, projectId, tab) {
  root.innerHTML = `
    <div class="project-shell" id="projectShell">
      ${renderProjectHeader(projectId, tab)}

      <div class="project-shell__body">
        ${renderProjectSituationsTopBanner()}
        <div id="projectViewHeaderHost" class="project-view-header-host"></div>
        <div id="project-content" class="project-shell__content"></div>
      </div>
    </div>
  `;

  mountProjectShellChrome({ projectId, tab });

  const content = document.getElementById("project-content");
  if (!content) return;

  switch (tab) {
    case "documents":
      renderProjectDocuments(content);
      break;
    case "situations":
      renderProjectSituations(content);
      break;
    case "propositions":
      renderProjectPropositions(content);
      break;
    case "coordination":
      renderProjectCoordination(content);
      break;
    case "workflows":
      renderProjectWorkflows(content);
      break;
    case "jalons":
      renderProjectJalons(content);
      break;
    case "referentiel":
      renderProjectReferentiel(content);
      break;
    case "risques-securite":
      renderProjectRisquesSecurite(content);
      break;
    case "pilotage":
      renderProjectPilotage(content);
      break;
    case "parametres":
      renderProjectParametres(content);
      break;
    default:
      renderProjectDocuments(content);
      break;
  }
}
