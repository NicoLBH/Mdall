import { renderProjectDocuments } from "./project-documents.js";
import { renderProjectSituations } from "./project-situations.js";
import { renderProjectIntervenants } from "./project-intervenants.js";
import { renderProjectDashboard } from "./project-dashboard.js";
import { renderProjectIdentity } from "./project-identity.js";
import { renderProjectHeader } from "./project-header.js";
import { renderProjectSituationsTopBanner } from "./project-situations-runbar.js";
import { mountProjectShellChrome } from "./project-shell-chrome.js";

export function renderProjectLayout(root, projectId, tab) {
  root.innerHTML = `
    <div class="project-shell" id="projectShell">
      ${renderProjectHeader(projectId, tab)}
      ${renderProjectSituationsTopBanner()}
      <div id="project-content" class="gh-page gh-page--2col"></div>
    </div>
  `;

  const content = document.getElementById("project-content");
  if (!content) return;

  switch (tab) {
    case "documents":
      renderProjectDocuments(content);
      break;
    case "situations":
      renderProjectSituations(content);
      break;
    case "intervenants":
      renderProjectIntervenants(content);
      break;
    case "dashboard":
      renderProjectDashboard(content);
      break;
    case "identity":
      renderProjectIdentity(content);
      break;
    default:
      renderProjectDashboard(content);
      break;
  }

  mountProjectShellChrome({ tab });
}
