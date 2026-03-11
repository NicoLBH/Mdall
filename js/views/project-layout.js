import { PROJECT_TABS } from "../constants.js";
import { renderProjectDocuments } from "./project-documents.js";
import { renderProjectSituations } from "./project-situations.js";
import { renderProjectIntervenants } from "./project-intervenants.js";
import { renderProjectDashboard } from "./project-dashboard.js";
import { renderProjectIdentity } from "./project-identity.js";

export function renderProjectLayout(root, projectId, tab) {
  root.innerHTML = `
    <div class="project">
      <div class="project-tabs">
        ${PROJECT_TABS.map(t => `
          <a
            href="#project/${projectId}/${t.id}"
            class="${t.id === tab ? "active" : ""}"
          >
            ${t.label}
          </a>
        `).join("")}
      </div>

      <div id="project-content"></div>
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
}
