import { setCurrentDemoProject } from "../demo-context.js";
import { store } from "../store.js";
import { syncKnownProjectNamesFromSupabase } from "../services/project-supabase-sync.js";
import {
  renderDataTableShell,
  renderDataTableHead,
  renderDataTableEmptyState
} from "./ui/data-table-shell.js";

function renderProjectRow(project) {
  return `
    <button class="projects-repo__row" type="button" data-project-id="${project.id}">
      <div class="projects-repo__cell projects-repo__cell--name">
        <span class="projects-repo__name">${project.name}</span>
      </div>
      <div class="projects-repo__cell projects-repo__cell--client">${project.clientName}</div>
      <div class="projects-repo__cell projects-repo__cell--city">${project.city}</div>
      <div class="projects-repo__cell projects-repo__cell--phase">${project.currentPhase}</div>
    </button>
  `;
}

export function renderProjectsList(root) {
  syncKnownProjectNamesFromSupabase().catch(() => undefined);
  const projects = Array.isArray(store.projects) ? store.projects : [];
  const rows = projects.map(renderProjectRow).join("");

  root.innerHTML = `
    <section class="page projects-page">
      <div class="projects-page__head">
        <h1>Projets</h1>
        <p class="projects-page__lead">Sélection du contexte projet pour la démonstration.</p>
      </div>

      ${renderDataTableShell({
        className: "projects-repo",
        gridTemplate: "minmax(260px, 2fr) minmax(220px, 1.5fr) minmax(120px, 1fr) minmax(120px, .8fr)",
        headHtml: renderDataTableHead({
          columns: [
            "Nom du projet",
            "Nom du client",
            "Ville",
            "Phase en cours"
          ]
        }),
        bodyHtml: rows,
        state: projects.length ? "ready" : "empty",
        emptyHtml: renderDataTableEmptyState({
          title: "Aucun projet",
          description: "Ajoutez un projet pour démarrer."
        })
      })}
    </section>
  `;

  root.querySelectorAll("[data-project-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const projectId = button.dataset.projectId || "";
      const project = setCurrentDemoProject(projectId);
      location.hash = `#project/${project.id}/documents`;
    });
  });
}
