import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { setCurrentDemoProject } from "../demo-context.js";
import { store } from "../store.js";
import { createProjectWithDefaultPhases, syncProjectsCatalogFromSupabase } from "../services/project-supabase-sync.js";
import { searchFrenchCommunes } from "../services/georisques-service.js";
import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";
import {
  renderDataTableShell,
  renderDataTableHead,
  renderDataTableEmptyState
} from "./ui/data-table-shell.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem
} from "./ui/side-nav-layout.js";

const SUPABASE_URL = getSupabaseUrl();

const PROJECT_LIST_FILTERS = {
  contributions: {
    id: "contributions",
    label: "Mes contributions",
    href: "#projects",
    iconName: "people"
  },
  mine: {
    id: "mine",
    label: "Mes projets",
    href: "#projects/mine",
    iconName: "person"
  }
};

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
    clientName: "",
    departmentCode: ""
  },
  isSubmitting: false,
  submitError: ""
};

const projectListUiState = {
  loadingAccess: false,
  accessLoaded: false,
  accessError: "",
  contributorProjectIds: new Set()
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

function getActiveProjectsFilterId() {
  const parts = parseHash();
  if (parts[0] !== "projects") return PROJECT_LIST_FILTERS.contributions.id;
  if (parts[1] === "mine") return PROJECT_LIST_FILTERS.mine.id;
  if (parts[1] === "contributions" || !parts[1]) return PROJECT_LIST_FILTERS.contributions.id;
  return PROJECT_LIST_FILTERS.contributions.id;
}

function getCurrentUserId() {
  return String(store.user?.id || "").trim();
}

function getProjectsSignature(projects = []) {
  return (Array.isArray(projects) ? projects : []).map((project) => ([
    String(project?.id || "").trim(),
    String(project?.ownerId || "").trim(),
    String(project?.updatedAt || "").trim()
  ].join(":"))).join("|");
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
    <a href="#projects/new" class="gh-btn gh-btn--primary projects-page__new-btn" id="projectsNewBtn">
      <span>Nouveau projet</span>
    </a>
  `;
}

function renderProjectsNav(activeFilterId) {
  return renderSideNavGroup({
    className: "projects-layout__nav-group",
    items: [PROJECT_LIST_FILTERS.contributions, PROJECT_LIST_FILTERS.mine].map((item) => renderSideNavItem({
      as: "a",
      href: item.href,
      label: item.label,
      iconHtml: svgIcon(item.iconName, { className: `octicon octicon-${item.iconName}` }),
      isActive: item.id === activeFilterId,
      className: "projects-layout__nav-item"
    }))
  });
}

async function fetchContributorProjectIds() {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    projectListUiState.contributorProjectIds = new Set();
    projectListUiState.accessLoaded = true;
    return projectListUiState.contributorProjectIds;
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/project_collaborators_view`);
  url.searchParams.set("select", "project_id,linked_user_id,collaborator_user_id,status");
  url.searchParams.set("status", "eq.Actif");
  url.searchParams.set("or", `(linked_user_id.eq.${currentUserId},collaborator_user_id.eq.${currentUserId})`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: await buildSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`project_collaborators_view fetch failed (${response.status}): ${text}`);
  }

  const rows = await response.json().catch(() => []);
  const nextIds = new Set(
    (Array.isArray(rows) ? rows : [])
      .map((row) => String(row?.project_id || "").trim())
      .filter(Boolean)
  );

  projectListUiState.contributorProjectIds = nextIds;
  projectListUiState.accessLoaded = true;
  projectListUiState.accessError = "";
  return nextIds;
}

function ensureProjectAccessLoaded(root) {
  if (projectListUiState.loadingAccess || projectListUiState.accessLoaded) return;

  projectListUiState.loadingAccess = true;
  fetchContributorProjectIds()
    .catch((error) => {
      projectListUiState.accessError = error instanceof Error ? error.message : String(error || "Erreur de chargement des contributions");
      projectListUiState.accessLoaded = true;
      projectListUiState.contributorProjectIds = new Set();
    })
    .finally(() => {
      projectListUiState.loadingAccess = false;
      if (root?.isConnected) {
        renderProjectsList(root);
      }
    });
}

function getFilteredProjects(activeFilterId) {
  const projects = Array.isArray(store.projects) ? store.projects : [];
  const currentUserId = getCurrentUserId();
  const contributorProjectIds = projectListUiState.contributorProjectIds;

  if (activeFilterId === PROJECT_LIST_FILTERS.mine.id) {
    return projects.filter((project) => String(project.ownerId || "").trim() === currentUserId);
  }

  return projects.filter((project) => {
    const projectId = String(project.id || "").trim();
    const ownerId = String(project.ownerId || "").trim();
    return Boolean(projectId) && ownerId !== currentUserId && contributorProjectIds.has(projectId);
  });
}

function renderProjectsListContent(activeFilterId) {
  const title = PROJECT_LIST_FILTERS[activeFilterId]?.label || PROJECT_LIST_FILTERS.contributions.label;
  const projects = getFilteredProjects(activeFilterId);
  const rows = projects.map(renderProjectRow).join("");
  const isLoading = activeFilterId === PROJECT_LIST_FILTERS.contributions.id && !projectListUiState.accessLoaded;

  return `
    <div class="projects-layout__content-inner">
      <div class="projects-page__head projects-page__head--listing">
        <h1>${escapeHtml(title)}</h1>
        <div class="projects-page__head-actions">
          ${renderProjectsToolbar()}
        </div>
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
        state: isLoading ? "loading" : (projects.length ? "ready" : "empty"),
        emptyHtml: renderDataTableEmptyState({
          title: activeFilterId === PROJECT_LIST_FILTERS.mine.id ? "Aucun projet créé" : "Aucune contribution",
          description: activeFilterId === PROJECT_LIST_FILTERS.mine.id
            ? "Créez un projet pour le retrouver ici."
            : "Les projets créés par d'autres utilisateurs dans lesquels vous êtes collaborateur apparaîtront ici."
        })
      })}
      ${projectListUiState.accessError && activeFilterId === PROJECT_LIST_FILTERS.contributions.id
        ? `<div class="projects-page__access-error">${escapeHtml(projectListUiState.accessError)}</div>`
        : ""}
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
        <p class="projects-page__lead">Crée un nouveau projet et initialise automatiquement ses phases dans Supabase.</p>
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
                <span class="project-create-form__label">Ville <span class="project-create-form__required">*</span></span>
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
                <span class="project-create-form__label">Nom du Maître d'Ouvrage <span class="project-create-form__required">*</span></span>
                <input id="projectCreateClientInput" class="project-create-form__input" type="text" maxlength="140" value="${escapeHtml(draft.clientName)}">
              </label>
            </div>
          </section>

          <div class="project-create-shell__footer">
            <div class="project-create-shell__footer-main">
            <button id="projectCreateSubmitBtn" class="gh-btn gh-btn--primary project-create-shell__submit" type="button" ${projectCreateUiState.isSubmitting ? "disabled" : ""}>
              ${projectCreateUiState.isSubmitting ? "Ajout du projet…" : "Ajouter le projet"}
            </button>
            ${projectCreateUiState.submitError ? `<p class="project-create-shell__error">${escapeHtml(projectCreateUiState.submitError)}</p>` : ""}
          </div>
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
      projectCreateUiState.draft.departmentCode = item.departmentCode || "";
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

  submitBtn?.addEventListener("click", async () => {
    submitBtn.blur();
    if (projectCreateUiState.isSubmitting) return;

    projectCreateUiState.submitError = "";

    const projectName = String(projectCreateUiState.draft.projectName || "").trim();
    const city = String(projectCreateUiState.draft.city || "").trim();
    const postalCode = String(projectCreateUiState.draft.postalCode || "").trim();
    const clientName = String(projectCreateUiState.draft.clientName || "").trim();
    const departmentCode = String(projectCreateUiState.draft.departmentCode || "").trim();

    if (!projectName) {
      projectCreateUiState.submitError = "Le nom du projet est obligatoire.";
      renderProjectCreatePage(root);
      return;
    }

    if (!city || !postalCode) {
      projectCreateUiState.submitError = "Sélectionne une ville dans l’autocomplétion pour récupérer la commune et le code postal.";
      renderProjectCreatePage(root);
      return;
    }

    if (!clientName) {
      projectCreateUiState.submitError = "Le nom du Maître d’Ouvrage est obligatoire.";
      renderProjectCreatePage(root);
      return;
    }

    projectCreateUiState.isSubmitting = true;
    renderProjectCreatePage(root);

    try {
      const createdProject = await createProjectWithDefaultPhases({
        projectName,
        description: projectCreateUiState.draft.description,
        city,
        postalCode,
        departmentCode,
        clientName,
        currentPhaseCode: "PC"
      });

      await syncProjectsCatalogFromSupabase();
      setCurrentDemoProject(createdProject.id);
      projectCreateUiState.isSubmitting = false;
      projectCreateUiState.submitError = "";
      location.hash = `#project/${createdProject.id}/documents`;
    } catch (error) {
      projectCreateUiState.isSubmitting = false;
      projectCreateUiState.submitError = error instanceof Error ? error.message : "Impossible de créer le projet.";
      renderProjectCreatePage(root);
    }
  });
}

export function renderProjectsList(root) {
  const projectsSignatureBeforeSync = getProjectsSignature(store.projects);
  syncProjectsCatalogFromSupabase()
    .then(() => {
      const projectsSignatureAfterSync = getProjectsSignature(store.projects);
      if (projectsSignatureAfterSync !== projectsSignatureBeforeSync && root?.isConnected && !isProjectsCreateRoute()) {
        renderProjectsList(root);
      }
    })
    .catch(() => undefined);

  if (isProjectsCreateRoute()) {
    document.body.classList.remove("route--projects-list");
    renderProjectCreatePage(root);
    return;
  }

  document.body.classList.add("route--projects-list");
  root.style.padding = "0";

  const activeFilterId = getActiveProjectsFilterId();
  ensureProjectAccessLoaded(root);

  root.innerHTML = `
    <section class="page projects-page projects-page--listing">
      ${renderSideNavLayout({
        className: "settings-layout settings-layout--parametres projects-layout",
        navClassName: "settings-nav settings-nav--parametres projects-layout__nav",
        contentClassName: "settings-content settings-content--parametres projects-layout__content",
        navHtml: renderProjectsNav(activeFilterId),
        contentHtml: renderProjectsListContent(activeFilterId)
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
