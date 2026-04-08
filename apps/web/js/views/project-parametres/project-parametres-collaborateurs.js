import { store } from "../../store.js";
import { svgIcon } from "../../ui/icons.js";
import { escapeHtml } from "../../utils/escape-html.js";
import {
  syncProjectCollaboratorsFromSupabase,
  searchProjectCollaboratorCandidates,
  addProjectCollaboratorToSupabase,
  deleteProjectCollaboratorFromSupabase,
  syncProjectLotsFromSupabase
} from "../../services/project-supabase-sync.js";
import { renderLightTabs, bindLightTabs } from "../ui/light-tabs.js";
import {
  bindBaseParametresUi,
  renderSectionCard,
  renderSettingsBlock,
  rerenderProjectParametres,
  getParametresUiState
} from "./project-parametres-core.js";

const DEFAULT_GROUP_CODE = "groupe-maitrise-ouvrage";

function ensureCollaborateursUiState() {
  const uiState = getParametresUiState();

  if (typeof uiState.collaboratorsModalOpen !== "boolean") uiState.collaboratorsModalOpen = false;
  if (typeof uiState.collaboratorSearchTerm !== "string") uiState.collaboratorSearchTerm = "";
  if (!Array.isArray(uiState.collaboratorSuggestions)) uiState.collaboratorSuggestions = [];
  if (!uiState.selectedCollaboratorCandidate || typeof uiState.selectedCollaboratorCandidate !== "object") uiState.selectedCollaboratorCandidate = null;
  if (typeof uiState.collaboratorSearchLoading !== "boolean") uiState.collaboratorSearchLoading = false;
  if (typeof uiState.collaboratorModalSubmitting !== "boolean") uiState.collaboratorModalSubmitting = false;
  if (typeof uiState.collaboratorModalError !== "string") uiState.collaboratorModalError = "";
  if (typeof uiState.collaboratorSearchRequestId !== "number") uiState.collaboratorSearchRequestId = 0;
  if (typeof uiState.collaboratorSearchDebounceId !== "number") uiState.collaboratorSearchDebounceId = 0;
  if (typeof uiState.collaboratorActiveGroupCode !== "string" || !uiState.collaboratorActiveGroupCode.trim()) uiState.collaboratorActiveGroupCode = DEFAULT_GROUP_CODE;
  if (typeof uiState.selectedCollaboratorProjectLotId !== "string") uiState.selectedCollaboratorProjectLotId = "";
  if (typeof uiState.collaboratorsLoadedProjectKey !== "string") uiState.collaboratorsLoadedProjectKey = "";
  if (!uiState.collaboratorModalFieldIds || typeof uiState.collaboratorModalFieldIds !== "object") uiState.collaboratorModalFieldIds = null;
  if (typeof uiState.collaboratorCreateMore !== "boolean") uiState.collaboratorCreateMore = false;

  return uiState;
}


function createCollaboratorModalFieldIds() {
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    searchInputId: `projectCollaboratorSearch_${uniqueSuffix}`,
    submitButtonId: `projectCollaboratorSubmit_${uniqueSuffix}`,
    lotInputPrefix: `projectCollaboratorLot_${uniqueSuffix}`
  };
}

function getCollaboratorModalFieldIds(uiState = ensureCollaborateursUiState()) {
  if (!uiState.collaboratorModalFieldIds) {
    uiState.collaboratorModalFieldIds = createCollaboratorModalFieldIds();
  }
  return uiState.collaboratorModalFieldIds;
}

function getProjectLotGroupDefinitions() {
  return [
    { code: "groupe-maitrise-ouvrage", title: "Maîtrise d'ouvrage" },
    { code: "groupe-maitrise-oeuvre", title: "Maîtrise d'oeuvre" },
    { code: "groupe-entreprise", title: "Entreprises" },
    { code: "groupe-divers", title: "Divers" }
  ];
}

function getActiveProjectLotsByGroup() {
  const groups = getProjectLotGroupDefinitions().map((group) => ({ ...group, items: [] }));
  const map = new Map(groups.map((group) => [group.code, group]));

  const lots = Array.isArray(store.projectLots?.items) ? [...store.projectLots.items] : [];
  lots
    .filter((item) => item?.activated)
    .sort((a, b) => {
      const groupA = groups.findIndex((item) => item.code === a.groupCode);
      const groupB = groups.findIndex((item) => item.code === b.groupCode);
      if (groupA !== groupB) return groupA - groupB;
      const sortCompare = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
      if (sortCompare !== 0) return sortCompare;
      return String(a.label || "").localeCompare(String(b.label || ""), "fr");
    })
    .forEach((lot) => {
      const bucket = map.get(String(lot.groupCode || ""));
      if (bucket) bucket.items.push(lot);
    });

  return groups;
}

function renderCollaboratorsRows(collaborators = []) {
  if (!collaborators.length) {
    return `
      <div class="project-collaborators__empty">
        Aucun collaborateur pour le moment.
      </div>
    `;
  }

  return collaborators.map((item) => {
    const displayName = String(item.name || "").trim() || String(item.email || "").trim() || "Utilisateur";
    const subtitleParts = [String(item.email || "").trim(), String(item.company || "").trim()].filter(Boolean);
    return `
      <div class="project-collaborators__row">
        <div class="project-collaborators__cell project-collaborators__cell--checkbox">
          <input type="checkbox" disabled>
        </div>

        <div class="project-collaborators__cell project-collaborators__cell--mail-icon">
          <span class="project-collaborators__mail-icon">
            ${svgIcon("mail", { width: 20, height: 20 })}
          </span>
        </div>

        <div class="project-collaborators__cell project-collaborators__cell--email">
          <div class="project-collaborators__email">${escapeHtml(displayName)}</div>
          <div class="project-collaborators__sub mono">${escapeHtml(subtitleParts.join(" · ") || "—")}</div>
        </div>

        <div class="project-collaborators__cell project-collaborators__cell--role mono">
          ${escapeHtml(item.role || "—")}
        </div>

        <div class="project-collaborators__cell project-collaborators__cell--status mono">
          ${escapeHtml(item.status || "Actif")}
        </div>

        <div class="project-collaborators__cell project-collaborators__cell--action">
          <button
            type="button"
            class="project-collaborators__remove"
            data-remove-collaborator-id="${escapeHtml(item.id)}"
          >
            Supprimer
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function renderCollaboratorsCard() {
  const collaborators = Array.isArray(store.projectForm.collaborators)
    ? store.projectForm.collaborators
    : [];

  return `
    <div class="project-collaborators">
      <div class="project-collaborators__intro">Recherchez des utilisateurs existants puis affectez-les à un lot activé du projet.</div>

      <div class="project-collaborators__table">
        <div class="project-collaborators__head">
          <div class="project-collaborators__cell project-collaborators__cell--checkbox">
            <input type="checkbox" disabled>
          </div>
          <div class="project-collaborators__cell project-collaborators__cell--mail-icon"></div>
          <div class="project-collaborators__cell project-collaborators__cell--email">Collaborateur</div>
          <div class="project-collaborators__cell project-collaborators__cell--role">Rôle</div>
          <div class="project-collaborators__cell project-collaborators__cell--status">Statut</div>
          <div class="project-collaborators__cell project-collaborators__cell--action"></div>
        </div>

        <div class="project-collaborators__body">
          ${renderCollaboratorsRows(collaborators)}
        </div>
      </div>
    </div>
  `;
}

function renderCollaboratorSuggestionList(uiState) {
  const suggestions = Array.isArray(uiState.collaboratorSuggestions) ? uiState.collaboratorSuggestions : [];
  const hasSearch = Boolean(String(uiState.collaboratorSearchTerm || "").trim());

  if (uiState.collaboratorSearchLoading) {
    return '<div class="project-collaborators-modal__suggestions-empty">Recherche en cours…</div>';
  }

  if (!hasSearch) {
    return '<div class="project-collaborators-modal__suggestions-empty">Commencez à saisir un nom ou une adresse mail.</div>';
  }

  if (!suggestions.length) {
    return '<div class="project-collaborators-modal__suggestions-empty">Aucun utilisateur trouvé.</div>';
  }

  return suggestions.map((candidate) => {
    const isSelected = String(uiState.selectedCollaboratorCandidate?.userId || "") === String(candidate.userId || "");
    const company = String(candidate.company || "").trim();
    return `
      <button
        type="button"
        class="project-collaborators-modal__suggestion ${isSelected ? 'is-selected' : ''}"
        data-collaborator-candidate-id="${escapeHtml(candidate.userId)}"
      >
        <span class="project-collaborators-modal__suggestion-name">${escapeHtml(candidate.name || candidate.email || "Utilisateur")}</span>
        <span class="project-collaborators-modal__suggestion-meta">${escapeHtml([candidate.email, company].filter(Boolean).join(" · ") || "—")}</span>
      </button>
    `;
  }).join("");
}

function renderCollaboratorLotsPicker(uiState) {
  const groups = getActiveProjectLotsByGroup().filter((group) => group.items.length);
  const fieldIds = getCollaboratorModalFieldIds(uiState);

  if (!groups.length) {
    return '<div class="settings-empty-note">Aucun lot actif n est disponible. Activez d abord des lots dans Paramètres → Lots.</div>';
  }

  const activeGroupCode = groups.some((group) => group.code === uiState.collaboratorActiveGroupCode)
    ? uiState.collaboratorActiveGroupCode
    : groups[0].code;
  const activeGroup = groups.find((group) => group.code === activeGroupCode) || groups[0];

  return `
    ${renderLightTabs({
      tabs: groups.map((group) => ({ id: group.code, label: group.title })),
      activeTabId: activeGroupCode,
      ariaLabel: "Catégories de rôles",
      className: "project-collaborators-modal__tabs"
    })}

    <div class="project-collaborators-modal__lots" role="radiogroup" aria-label="Lots activés du projet">
      ${activeGroup.items.map((lot) => {
        const inputId = `${fieldIds.lotInputPrefix}_${lot.id}`;
        return `
          <label class="project-collaborators-modal__lot" for="${escapeHtml(inputId)}">
            <input
              id="${escapeHtml(inputId)}"
              type="radio"
              name="projectCollaboratorLot"
              value="${escapeHtml(lot.id)}"
              ${uiState.selectedCollaboratorProjectLotId === lot.id ? "checked" : ""}
            >
            <span>${escapeHtml(lot.label || "")}</span>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function renderCollaboratorCreatePage() {
  const uiState = ensureCollaborateursUiState();
  if (!uiState.collaboratorsModalOpen) return "";

  const fieldIds = getCollaboratorModalFieldIds(uiState);
  const selectedCandidate = uiState.selectedCollaboratorCandidate;
  const submitDisabled = uiState.collaboratorModalSubmitting
    || !selectedCandidate?.userId
    || !String(uiState.selectedCollaboratorProjectLotId || "").trim();

  return `
    <section class="project-collaborator-create-shell" id="projectCollaboratorsCreatePage" data-collaborator-create-page>
      <div class="project-collaborator-create">
        <div class="project-collaborator-create__header">
          <span class="project-collaborator-create__avatar" aria-hidden="true">${svgIcon("people", { width: 18, height: 18 })}</span>
          <div class="project-collaborator-create__title-wrap">
            <div class="project-collaborator-create__title">Ajouter un collaborateur au projet</div>
            <div class="project-collaborator-create__subtitle">Recherchez un collaborateur par son adresse mail ou son nom et affectez-lui un rôle.</div>
          </div>
        </div>

        <div class="project-collaborator-create__body">
          <div class="project-collaborators-modal__section">
            <label class="settings-modal__label" for="${escapeHtml(fieldIds.searchInputId)}">Rechercher un collaborateur</label>
            <div class="project-collaborators-modal__search-wrap">
              <span class="project-collaborators-modal__search-icon">${svgIcon("search", { width: 18, height: 18 })}</span>
              <input
                id="${escapeHtml(fieldIds.searchInputId)}"
                class="gh-input project-collaborators-modal__search-input"
                type="text"
                autocomplete="off"
                spellcheck="false"
                value="${escapeHtml(uiState.collaboratorSearchTerm)}"
                placeholder="nom@entreprise.com ou Nom Prénom"
              >
            </div>
            <div class="project-collaborators-modal__suggestions">
              ${renderCollaboratorSuggestionList(uiState)}
            </div>
          </div>

          <div class="project-collaborators-modal__section">
            <div class="settings-modal__label">Rôle</div>
            ${renderCollaboratorLotsPicker(uiState)}
          </div>

          ${selectedCandidate?.userId ? `
            <div class="project-collaborators-modal__selection">
              Collaborateur sélectionné : <strong>${escapeHtml(selectedCandidate.name || selectedCandidate.email || "Utilisateur")}</strong>
            </div>
          ` : ""}

          ${uiState.collaboratorModalError ? `<div class="gh-alert gh-alert--error settings-modal__feedback">${escapeHtml(uiState.collaboratorModalError)}</div>` : ""}
        </div>

        <div class="project-collaborator-create__footer">
          <div class="project-collaborator-create__footer-left">
            <label class="subject-create-checkbox">
              <input type="checkbox" data-collaborator-create-more ${uiState.collaboratorCreateMore ? "checked" : ""}>
              <span>Créer un autre</span>
            </label>
          </div>
          <div class="project-collaborator-create__footer-right">
            <button type="button" class="gh-btn" data-close-collaborator-modal="true">Annuler</button>
            <button
              type="button"
              class="gh-btn gh-btn--primary"
              id="${escapeHtml(fieldIds.submitButtonId)}"
              ${submitDisabled ? "disabled" : ""}
            >
              ${uiState.collaboratorModalSubmitting ? "Ajout en cours…" : "Ajouter"}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}


function restoreCollaboratorSearchFocus(fieldIds, cursorPosition = null) {
  if (!fieldIds?.searchInputId) return;
  window.requestAnimationFrame(() => {
    const input = document.getElementById(fieldIds.searchInputId);
    if (!input) return;
    input.focus();
    if (typeof cursorPosition === "number") {
      try {
        input.setSelectionRange(cursorPosition, cursorPosition);
      } catch (error) {
        // no-op
      }
    }
  });
}

function rerenderCollaboratorCreatePageInPlace({ preserveSearchFocus = false } = {}) {
  const uiState = ensureCollaborateursUiState();
  const existingPage = document.getElementById("projectCollaboratorsCreatePage");
  const nextPageHtml = renderCollaboratorCreatePage();
  const fieldIds = getCollaboratorModalFieldIds(uiState);
  const activeElement = document.activeElement;
  const shouldRestoreFocus = preserveSearchFocus && activeElement?.id === fieldIds.searchInputId;
  const cursorPosition = shouldRestoreFocus && typeof activeElement.selectionStart === "number"
    ? activeElement.selectionStart
    : null;

  if (!existingPage) {
    rerenderProjectParametres();
    return;
  }

  existingPage.outerHTML = nextPageHtml;
  bindCollaboratorCreatePage(document.getElementById("projectCollaboratorsCreatePage"));

  if (shouldRestoreFocus) {
    restoreCollaboratorSearchFocus(fieldIds, cursorPosition);
  }
}

function openCollaboratorModal() {
  const uiState = ensureCollaborateursUiState();
  const groups = getActiveProjectLotsByGroup().filter((group) => group.items.length);

  uiState.collaboratorsModalOpen = true;
  uiState.collaboratorSearchTerm = "";
  uiState.collaboratorSuggestions = [];
  uiState.selectedCollaboratorCandidate = null;
  uiState.collaboratorSearchLoading = false;
  uiState.collaboratorModalSubmitting = false;
  uiState.collaboratorModalError = "";
  uiState.collaboratorActiveGroupCode = groups[0]?.code || DEFAULT_GROUP_CODE;
  uiState.selectedCollaboratorProjectLotId = groups[0]?.items?.[0]?.id || "";
  uiState.collaboratorModalFieldIds = createCollaboratorModalFieldIds();
  uiState.collaboratorCreateMore = false;
  rerenderProjectParametres();
}

function closeCollaboratorModal() {
  const uiState = ensureCollaborateursUiState();
  uiState.collaboratorsModalOpen = false;
  uiState.collaboratorSearchTerm = "";
  uiState.collaboratorSuggestions = [];
  uiState.selectedCollaboratorCandidate = null;
  uiState.collaboratorSearchLoading = false;
  uiState.collaboratorModalSubmitting = false;
  uiState.collaboratorModalError = "";
  uiState.collaboratorModalFieldIds = null;
  uiState.collaboratorCreateMore = false;
  rerenderProjectParametres();
}

async function runCollaboratorSearch(query) {
  const uiState = ensureCollaborateursUiState();
  const requestId = uiState.collaboratorSearchRequestId + 1;
  uiState.collaboratorSearchRequestId = requestId;

  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) {
    uiState.collaboratorSuggestions = [];
    uiState.selectedCollaboratorCandidate = null;
    uiState.collaboratorSearchLoading = false;
    rerenderCollaboratorCreatePageInPlace({ preserveSearchFocus: true });
    return;
  }

  uiState.collaboratorSearchLoading = true;

  try {
    const suggestions = await searchProjectCollaboratorCandidates(trimmedQuery, { limit: 8 });
    if (ensureCollaborateursUiState().collaboratorSearchRequestId !== requestId) return;

    uiState.collaboratorSuggestions = suggestions;
    if (uiState.selectedCollaboratorCandidate?.userId) {
      const selectedStillPresent = suggestions.find((item) => item.userId === uiState.selectedCollaboratorCandidate.userId);
      uiState.selectedCollaboratorCandidate = selectedStillPresent || null;
    }
    uiState.collaboratorSearchLoading = false;
    uiState.collaboratorModalError = "";
    rerenderCollaboratorCreatePageInPlace({ preserveSearchFocus: true });
  } catch (error) {
    if (ensureCollaborateursUiState().collaboratorSearchRequestId !== requestId) return;
    uiState.collaboratorSuggestions = [];
    uiState.selectedCollaboratorCandidate = null;
    uiState.collaboratorSearchLoading = false;
    uiState.collaboratorModalError = error instanceof Error ? error.message : String(error || "Erreur de recherche");
    rerenderCollaboratorCreatePageInPlace({ preserveSearchFocus: true });
  }
}

function scheduleCollaboratorSearch(query) {
  const uiState = ensureCollaborateursUiState();
  if (uiState.collaboratorSearchDebounceId) {
    window.clearTimeout(uiState.collaboratorSearchDebounceId);
  }
  uiState.collaboratorSearchDebounceId = window.setTimeout(() => {
    uiState.collaboratorSearchDebounceId = 0;
    void runCollaboratorSearch(query);
  }, 220);
}

function selectCollaboratorCandidate(candidateId) {
  const uiState = ensureCollaborateursUiState();
  const nextCandidate = (uiState.collaboratorSuggestions || []).find((item) => String(item.userId) === String(candidateId));
  if (!nextCandidate) return;
  uiState.selectedCollaboratorCandidate = nextCandidate;
  uiState.collaboratorModalError = "";
  rerenderCollaboratorCreatePageInPlace();
}

async function submitCollaboratorDraft() {
  const uiState = ensureCollaborateursUiState();
  if (!uiState.selectedCollaboratorCandidate?.userId || !uiState.selectedCollaboratorProjectLotId) return;

  uiState.collaboratorModalSubmitting = true;
  uiState.collaboratorModalError = "";
  rerenderCollaboratorCreatePageInPlace();

  try {
    await addProjectCollaboratorToSupabase({
      userId: uiState.selectedCollaboratorCandidate.userId,
      projectLotId: uiState.selectedCollaboratorProjectLotId,
      status: "Actif"
    });

    if (uiState.collaboratorCreateMore) {
      const groups = getActiveProjectLotsByGroup().filter((group) => group.items.length);
      uiState.collaboratorSearchTerm = "";
      uiState.collaboratorSuggestions = [];
      uiState.selectedCollaboratorCandidate = null;
      uiState.collaboratorSearchLoading = false;
      uiState.collaboratorModalSubmitting = false;
      uiState.collaboratorModalError = "";
      uiState.collaboratorActiveGroupCode = groups[0]?.code || uiState.collaboratorActiveGroupCode || DEFAULT_GROUP_CODE;
      uiState.selectedCollaboratorProjectLotId = groups[0]?.items?.[0]?.id || "";
      uiState.collaboratorModalFieldIds = createCollaboratorModalFieldIds();
      rerenderProjectParametres();
      return;
    }

    closeCollaboratorModal();
  } catch (error) {
    uiState.collaboratorModalSubmitting = false;
    uiState.collaboratorModalError = error instanceof Error ? error.message : String(error || "Erreur d'ajout du collaborateur");
    rerenderCollaboratorCreatePageInPlace();
  }
}

async function removeCollaborator(id) {
  if (!id) return;
  try {
    await deleteProjectCollaboratorFromSupabase(id);
    rerenderProjectParametres();
  } catch (error) {
    console.warn("deleteProjectCollaboratorFromSupabase failed", error);
  }
}

function ensureCollaboratorsLoaded(root) {
  const uiState = ensureCollaborateursUiState();
  const currentProjectKey = String(store.currentProjectId || store.currentProject?.id || "default");
  if (uiState.collaboratorsLoadedProjectKey === currentProjectKey) return;

  uiState.collaboratorsLoadedProjectKey = currentProjectKey;
  store.projectForm.collaborators = [];

  Promise.all([
    syncProjectLotsFromSupabase({ force: true }),
    syncProjectCollaboratorsFromSupabase({ force: true })
  ]).then(() => {
    if (!root?.isConnected) return;
    rerenderProjectParametres();
  }).catch((error) => {
    console.warn("Collaborateurs sync failed", error);
    if (!root?.isConnected) return;
    rerenderProjectParametres();
  });
}

export function renderCollaborateursParametresContent() {
  const uiState = ensureCollaborateursUiState();
  if (uiState.collaboratorsModalOpen) {
    return renderCollaboratorCreatePage();
  }

  return renderSettingsBlock({
    id: "parametres-collaborateurs",
    title: "",
    lead: "",
    cards: [
      renderSectionCard({
        title: "Collaborateurs",
        action: `
          <button
            type="button"
            class="gh-btn"
            data-open-collaborator-modal="true"
          >
            Ajouter une personne
          </button>
        `,
        body: renderCollaboratorsCard()
      })
    ]
  });
}

export function bindCollaborateursParametresSection(root) {
  bindBaseParametresUi();
  ensureCollaboratorsLoaded(root);

  root.querySelectorAll("[data-open-collaborator-modal]").forEach((btn) => btn.addEventListener("click", () => openCollaboratorModal()));
  root.querySelectorAll("[data-remove-collaborator-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeCollaborator(btn.getAttribute("data-remove-collaborator-id"));
    });
  });

  bindCollaboratorCreatePage(document.getElementById("projectCollaboratorsCreatePage"));
}

function bindCollaboratorCreatePage(page) {
  if (!page || page.dataset.bound === "1") return;
  page.dataset.bound = "1";

  page.addEventListener("click", (event) => {
    const closeTarget = event.target.closest?.("[data-close-collaborator-modal]");
    if (closeTarget) {
      closeCollaboratorModal();
      return;
    }

    const candidateButton = event.target.closest?.("[data-collaborator-candidate-id]");
    if (candidateButton) {
      selectCollaboratorCandidate(candidateButton.getAttribute("data-collaborator-candidate-id"));
    }
  });

  bindLightTabs(page, {
    selector: ".project-collaborators-modal__tabs [data-light-tab-target]",
    onChange: (nextTabId) => {
      const uiState = ensureCollaborateursUiState();
      if (uiState.collaboratorActiveGroupCode === nextTabId) return;
      uiState.collaboratorActiveGroupCode = nextTabId;
      const activeGroup = getActiveProjectLotsByGroup().find((group) => group.code === nextTabId);
      const hasSelectedLotInGroup = (activeGroup?.items || []).some((item) => item.id === uiState.selectedCollaboratorProjectLotId);
      if (!hasSelectedLotInGroup) {
        uiState.selectedCollaboratorProjectLotId = activeGroup?.items?.[0]?.id || "";
      }
      rerenderCollaboratorCreatePageInPlace();
    }
  });

  const fieldIds = getCollaboratorModalFieldIds();
  const searchInput = page.querySelector(`#${CSS.escape(fieldIds.searchInputId)}`);
  searchInput?.addEventListener("input", (event) => {
    const uiState = ensureCollaborateursUiState();
    uiState.collaboratorSearchTerm = event.target.value || "";
    uiState.collaboratorModalError = "";
    uiState.selectedCollaboratorCandidate = null;
    scheduleCollaboratorSearch(uiState.collaboratorSearchTerm);
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const firstCandidate = ensureCollaborateursUiState().collaboratorSuggestions?.[0];
      if (firstCandidate?.userId) {
        selectCollaboratorCandidate(firstCandidate.userId);
      }
    }
  });

  page.querySelectorAll('input[name="projectCollaboratorLot"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      const uiState = ensureCollaborateursUiState();
      uiState.selectedCollaboratorProjectLotId = event.target.value || "";
      uiState.collaboratorModalError = "";
      rerenderCollaboratorCreatePageInPlace();
    });
  });

  page.querySelector('[data-collaborator-create-more]')?.addEventListener("change", (event) => {
    const uiState = ensureCollaborateursUiState();
    uiState.collaboratorCreateMore = !!event.target.checked;
  });

  page.querySelector(`#${CSS.escape(fieldIds.submitButtonId)}`)?.addEventListener("click", () => {
    void submitCollaboratorDraft();
  });

  page.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCollaboratorModal();
    }
  });

  window.requestAnimationFrame(() => {
    const input = document.getElementById(fieldIds.searchInputId);
    if (input && document.activeElement !== input && !ensureCollaborateursUiState().collaboratorSearchTerm) {
      input.focus();
    }
  });
}

export function isCollaborateursParametresStandalone() {
  return !!ensureCollaborateursUiState().collaboratorsModalOpen;
}

export function getCollaborateursProjectParametresTab() {
  return {
    id: "parametres-collaborateurs",
    label: "Collaborateurs",
    iconName: "people",
    isPrimary: false,
    isStandalone: () => isCollaborateursParametresStandalone(),
    renderContent: () => renderCollaborateursParametresContent(),
    bind: (root) => bindCollaborateursParametresSection(root)
  };
}
