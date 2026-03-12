import { PROJECT_TABS } from "../constants.js";
import { store } from "../store.js";

function getProjectDisplayName(projectId) {
  const explicitName =
    store.currentProject?.name ||
    store.currentProject?.title ||
    "";

  if (explicitName) return explicitName;
  if (projectId) return `Projet ${projectId}`;
  return "Projet";
}

export function renderProjectHeader(projectId, activeTab) {
  return `
    <section class="project-context-header" style="display:none">
      <div class="project-context-header__top">
        <div class="project-context-header__left">
          <div class="project-context-header__kicker mono">PROJECT</div>
          <h1 class="project-context-header__title">${getProjectDisplayName(projectId)}</h1>
        </div>

        <div class="project-context-header__right">
          <div class="project-context-header__meta mono">
            ${projectId ? `project_id=${projectId}` : ""}
          </div>
        </div>
      </div>

      <nav class="project-tabs" aria-label="Project navigation">
        ${PROJECT_TABS.map((t) => `
          <a
            href="#project/${projectId}/${t.id}"
            class="${t.id === activeTab ? "active" : ""}"
          >
            ${t.label}
          </a>
        `).join("")}
      </nav>
    </section>
  `;
}
