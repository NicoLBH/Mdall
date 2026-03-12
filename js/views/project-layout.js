import { PROJECT_TABS } from "../constants.js";
import { renderProjectDocuments } from "./project-documents.js";
import { renderProjectSituations } from "./project-situations.js";
import { renderProjectIntervenants } from "./project-intervenants.js";
import { renderProjectDashboard } from "./project-dashboard.js";
import { renderProjectIdentity } from "./project-identity.js";

function projectTitle(projectId) {
  return projectId ? `Projet ${projectId}` : "Projet";
}

export function renderProjectLayout(root, projectId, tab) {
  root.innerHTML = `
    <div class="project-shell">
      <section class="project-context-header">
        <div class="project-context-header__left">
          <div class="project-context-header__kicker mono">PROJECT</div>
          <h1 class="project-context-header__title">${projectTitle(projectId)}</h1>
        </div>

        <div class="project-context-header__right">
          <div class="project-context-header__meta mono">Contexte projet actif</div>
        </div>
      </section>

      <div class="project-tabs">
        ${PROJECT_TABS.map((t) => `
          <a
            href="#project/${projectId}/${t.id}"
            class="${t.id === tab ? "active" : ""}"
          >
            ${t.label}
          </a>
        `).join("")}
      </div>

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
}
