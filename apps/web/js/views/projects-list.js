import { setCurrentDemoProject } from "../demo-context.js";
import { store } from "../store.js";
import { syncProjectsCatalogFromSupabase } from "../services/project-supabase-sync.js";
import { searchFrenchCommunes } from "../services/georisques-service.js";
import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";
import {
  renderDataTableShell,
  renderDataTableHead,
  renderDataTableEmptyState
} from "./ui/data-table-shell.js";

const projectCreateUiState = {
  ownerMenuOpen: false,
  cityLoading: false,
  citySuggestions: [],
  cityRequestSeq: 0,
  draft: {
    owner: "mdall",
    projectName: "",
    description: "",
    city: "",
    postalCode: "",
    communeCp: "",
    clientName: ""
  }
};

function parseHash() {
  const hash = String(location.hash || "").replace(/^#/, "").trim();
  if (!hash) return ["projects"];
  return hash.split("/");
}

function isProjectsCreateRoute() {
  const parts = parseHash();
  return parts[0] === "projects" && parts[1] === "new";
}

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

function renderProjectsToolbar() {
  return `
    <div class="projects-page__toolbar">
      <a href="#projects/new" class="gh-btn gh-btn--primary projects-page__new-btn" id="projectsNewBtn">
        ${svgIcon("repo", { className: "octicon octicon-repo" })}
        <span>Nouveau projet</span>
      </a>
    </div>
  `;
}

function renderOwnerTrigger() {
  const ownerLabel = projectCreateUiState.draft.owner === "private"
    ? (store.user?.name || "Utilisateur")
    : "Mdall";
  const ownerIcon = projectCreateUiState.draft.owner === "private"
    ? svgIcon("avatar-human", { className: "octicon octicon-person" })
    : svgIcon("heimdall", { className: "octicon octicon-heimdall" });

  return `
    <button
      id="projectCreateOwnerBtn"
      class="project-create-form__owner-trigger"
      type="button"
      aria-haspopup="menu"
      aria-expanded="${projectCreateUiState.ownerMenuOpen ? "true" : "false"}"
    >
      <span class="project-create-form__owner-trigger-icon">${ownerIcon}</span>
      <span class="project-create-form__owner-trigger-label">${escapeHtml(ownerLabel)}</span>
      <span class="project-create-form__owner-trigger-chevron">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
    </button>
  `;
}

function renderOwnerMenu() {
  return `
    <div class="project-create-form__owner-menu ${projectCreateUiState.ownerMenuOpen ? "is-open" : ""}" id="projectCreateOwnerMenu" role="menu">
      <button type="button" class="project-create-form__owner-option" data-owner-value="mdall" role="menuitem">
        <span class="project-create-form__owner-option-icon">${svgIcon("heimdall", { className: "octicon octicon-heimdall" })}</span>
        <span class="project-create-form__owner-option-main">Mdall</span>
      </button>
      <button type="button" class="project-create-form__owner-option" data-owner-value="private" role="menuitem">
        <span class="project-create-form__owner-option-icon">${svgIcon("avatar-human", { className: "octicon octicon-person" })}</span>
        <span class="project-create-form__owner-option-meta">
          <span class="project-create-form__owner-option-main">${escapeHtml(store.user?.name || "Utilisateur")}</span>
          <span class="project-create-form__owner-option-sub">(Privé)</span>
        </span>
      </button>
    </div>
  `;
}

function renderCitySuggestions() {
  if (!projectCreateUiState.citySuggestions.length) return "";

  return `
    <div class="project-create-form__autocomplete" id="projectCreateCityAutocomplete" role="listbox">
      ${projectCreateUiState.citySuggestions.map((item, index) => `
        <button
          type="button"
          class="project-create-form__autocomplete-item"
          data-city-suggestion-index="${index}"
          role="option"
        >
          <span class="project-create-form__autocomplete-title">${escapeHtml(item.name || item.label || "")}</span>
          <span class="project-create-form__autocomplete-meta">${escapeHtml(item.postalCode || "")}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderProjectCreatePage(root) {
  const draft = projectCreateUiState.draft;
  const descriptionCount = draft.description.length;

  root.innerHTML = `
    <section class="page projects-page projects-page--create">
      <div class="projects-page__head">
        <h1>Nouveau projet</h1>
        <p class="projects-page__lead">Prépare l’espace projet avant le branchement à Supabase.</p>
      </div>

      <div class="project-create-shell">
        <div class="project-create-shell__timeline" aria-hidden="true">
          <div class="project-create-shell__timeline-step is-active">1</div>
          <div class="project-create-shell__timeline-line"></div>
          <div class="project-create-shell__timeline-step">2</div>
        </div>

        <div class="project-create-shell__content">
          <section class="project-create-card">
            <div class="project-create-card__section-head">
              <h2>General</h2>
            </div>

            <div class="project-create-form__grid project-create-form__grid--first-row">
              <label class="project-create-form__field project-create-form__field--owner">
                <span class="project-create-form__label">Owner <span class="project-create-form__required">*</span></span>
                <div class="project-create-form__owner-wrap">
                  ${renderOwnerTrigger()}
                  ${renderOwnerMenu()}
                </div>
              </label>

              <label class="project-create-form__field">
                <span class="project-create-form__label">Nom du projet <span class="project-create-form__required">*</span></span>
                <input id="projectCreateNameInput" class="project-create-form__input" type="text" maxlength="120" value="${escapeHtml(draft.projectName)}">
              </label>
            </div>

            <label class="project-create-form__field">
              <span class="project-create-form__label">Description</span>
              <textarea id="projectCreateDescriptionInput" class="project-create-form__textarea" maxlength="350">${escapeHtml(draft.description)}</textarea>
              <span class="project-create-form__hint"><span id="projectCreateDescriptionCount">${descriptionCount}</span> / 350 characters</span>
            </label>
          </section>

          <section class="project-create-card">
            <div class="project-create-card__section-head">
              <h2>Configuration</h2>
            </div>

            <div class="project-create-form__grid">
              <label class="project-create-form__field project-create-form__field--autocomplete">
                <span class="project-create-form__label">Ville</span>
                <input
                  id="projectCreateCityInput"
                  class="project-create-form__input"
                  type="text"
                  autocomplete="off"
                  placeholder="Ex : Annecy"
                  value="${escapeHtml(draft.communeCp || [draft.city, draft.postalCode].filter(Boolean).join(" ").trim())}"
                >
                ${renderCitySuggestions()}
              </label>

              <label class="project-create-form__field">
                <span class="project-create-form__label">Nom du Maître d'Ouvrage</span>
                <input id="projectCreateClientInput" class="project-create-form__input" type="text" maxlength="140" value="${escapeHtml(draft.clientName)}">
              </label>
            </div>
          </section>

          <div class="project-create-shell__footer">
            <button id="projectCreateSubmitBtn" class="gh-btn gh-btn--primary project-create-shell__submit" type="button">
              Ajouter le projet
            </button>
          </div>
        </div>
      </div>
    </section>
  `;

  bindProjectCreatePage(root);
}

function closeOwnerMenu() {
  projectCreateUiState.ownerMenuOpen = false;
  const menu = document.getElementById("projectCreateOwnerMenu");
  const btn = document.getElementById("projectCreateOwnerBtn");
  menu?.classList.remove("is-open");
  btn?.setAttribute("aria-expanded", "false");
}

function toggleOwnerMenu() {
  projectCreateUiState.ownerMenuOpen = !projectCreateUiState.ownerMenuOpen;
  const menu = document.getElementById("projectCreateOwnerMenu");
  const btn = document.getElementById("projectCreateOwnerBtn");
  menu?.classList.toggle("is-open", projectCreateUiState.ownerMenuOpen);
  btn?.setAttribute("aria-expanded", projectCreateUiState.ownerMenuOpen ? "true" : "false");
}

function clearCitySuggestions() {
  projectCreateUiState.citySuggestions = [];
  const panel = document.getElementById("projectCreateCityAutocomplete");
  panel?.remove();
}

function renderCitySuggestionsPanel() {
  const field = document.querySelector(".project-create-form__field--autocomplete");
  if (!field) return;

  const existing = document.getElementById("projectCreateCityAutocomplete");
  existing?.remove();

  if (!projectCreateUiState.citySuggestions.length) return;
  field.insertAdjacentHTML("beforeend", renderCitySuggestions());

  field.querySelectorAll("[data-city-suggestion-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.citySuggestionIndex || -1);
      const item = projectCreateUiState.citySuggestions[index];
      if (!item) return;
      projectCreateUiState.draft.city = item.name || "";
      projectCreateUiState.draft.postalCode = item.postalCode || "";
      projectCreateUiState.draft.communeCp = [item.name, item.postalCode].filter(Boolean).join(" ").trim();
      const cityInput = document.getElementById("projectCreateCityInput");
      if (cityInput) cityInput.value = projectCreateUiState.draft.communeCp;
      clearCitySuggestions();
    });
  });
}

async function updateCitySuggestions(query) {
  const safeQuery = String(query || "").trim();
  const requestId = ++projectCreateUiState.cityRequestSeq;

  if (safeQuery.length < 2) {
    clearCitySuggestions();
    return;
  }

  projectCreateUiState.cityLoading = true;

  try {
    const items = await searchFrenchCommunes({ query: safeQuery, limit: 6 });
    if (requestId !== projectCreateUiState.cityRequestSeq) return;
    projectCreateUiState.citySuggestions = Array.isArray(items) ? items.slice(0, 6) : [];
    renderCitySuggestionsPanel();
  } catch (error) {
    if (requestId !== projectCreateUiState.cityRequestSeq) return;
    projectCreateUiState.citySuggestions = [];
    renderCitySuggestionsPanel();
  } finally {
    if (requestId === projectCreateUiState.cityRequestSeq) {
      projectCreateUiState.cityLoading = false;
    }
  }
}

function bindProjectCreatePage(root) {
  const ownerBtn = root.querySelector("#projectCreateOwnerBtn");
  const descriptionInput = root.querySelector("#projectCreateDescriptionInput");
  const descriptionCount = root.querySelector("#projectCreateDescriptionCount");
  const nameInput = root.querySelector("#projectCreateNameInput");
  const cityInput = root.querySelector("#projectCreateCityInput");
  const clientInput = root.querySelector("#projectCreateClientInput");
  const submitBtn = root.querySelector("#projectCreateSubmitBtn");

  ownerBtn?.addEventListener("click", () => {
    toggleOwnerMenu();
  });

  root.querySelectorAll("[data-owner-value]").forEach((button) => {
    button.addEventListener("click", () => {
      projectCreateUiState.draft.owner = button.dataset.ownerValue || "mdall";
      projectCreateUiState.ownerMenuOpen = false;
      renderProjectCreatePage(root);
    });
  });

  nameInput?.addEventListener("input", () => {
    projectCreateUiState.draft.projectName = nameInput.value;
  });

  descriptionInput?.addEventListener("input", () => {
    projectCreateUiState.draft.description = descriptionInput.value.slice(0, 350);
    if (descriptionCount) {
      descriptionCount.textContent = String(projectCreateUiState.draft.description.length);
    }
  });

  cityInput?.addEventListener("input", () => {
    projectCreateUiState.draft.communeCp = cityInput.value;
    updateCitySuggestions(cityInput.value);
  });

  cityInput?.addEventListener("focus", () => {
    if (projectCreateUiState.citySuggestions.length) {
      renderCitySuggestionsPanel();
    }
  });

  cityInput?.addEventListener("blur", () => {
    window.setTimeout(() => {
      clearCitySuggestions();
    }, 150);
  });

  clientInput?.addEventListener("input", () => {
    projectCreateUiState.draft.clientName = clientInput.value;
  });

  submitBtn?.addEventListener("click", () => {
    submitBtn.blur();
  });
}

export function renderProjectsList(root) {
  syncProjectsCatalogFromSupabase().catch(() => undefined);

  if (isProjectsCreateRoute()) {
    renderProjectCreatePage(root);
    return;
  }

  const projects = Array.isArray(store.projects) ? store.projects : [];
  const rows = projects.map(renderProjectRow).join("");

  root.innerHTML = `
    <section class="page projects-page">
      <div class="projects-page__head">
        <h1>Projets</h1>
        <p class="projects-page__lead">Sélection du contexte projet pour la démonstration.</p>
      </div>

      ${renderProjectsToolbar()}

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

let projectCreateDocumentClickBound = false;
function handleProjectCreateDocumentClick(event) {
  if (!isProjectsCreateRoute()) return;
  const ownerWrap = document.querySelector(".project-create-form__owner-wrap");
  if (!ownerWrap?.contains(event.target)) {
    closeOwnerMenu();
  }
}

if (!projectCreateDocumentClickBound) {
  document.addEventListener("click", handleProjectCreateDocumentClick);
  projectCreateDocumentClickBound = true;
}
