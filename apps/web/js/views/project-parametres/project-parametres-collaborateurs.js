import { store } from "../../store.js";
import { registerProjectPrimaryScrollSource } from "../project-shell-chrome.js";
import { svgIcon } from "../../ui/icons.js";
import { escapeHtml } from "../../utils/escape-html.js";
import {
  syncProjectCollaboratorsFromSupabase,
  searchProjectCollaboratorCandidates,
  addProjectCollaboratorToSupabase,
  deleteProjectCollaboratorFromSupabase,
  updateProjectCollaboratorRoleInSupabase,
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
  if (typeof uiState.collaboratorCreateFirstName !== "string") uiState.collaboratorCreateFirstName = "";
  if (typeof uiState.collaboratorCreateLastName !== "string") uiState.collaboratorCreateLastName = "";
  if (typeof uiState.collaboratorCreateCompany !== "string") uiState.collaboratorCreateCompany = "";
  if (typeof uiState.collaboratorStatusFilter !== "string" || !uiState.collaboratorStatusFilter.trim()) uiState.collaboratorStatusFilter = "Actif";
  if (typeof uiState.collaboratorStatusFilterOpen !== "boolean") uiState.collaboratorStatusFilterOpen = false;
  if (typeof uiState.editingCollaboratorId !== "string") uiState.editingCollaboratorId = "";

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


function formatCollaboratorCandidateInputValue(candidate) {
  if (!candidate || typeof candidate !== "object") return "";
  const firstName = String(candidate.firstName || "").trim();
  const lastName = String(candidate.lastName || "").trim();
  const computedName = [firstName, lastName].filter(Boolean).join(" ");
  const name = String(candidate.name || computedName).trim();
  const email = String(candidate.email || "").trim();
  const company = String(candidate.company || "").trim();
  return [name, email, company].filter(Boolean).join(" · ");
}

function isValidEmailAddress(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

function shouldShowInlineDirectoryCreate(uiState) {
  const query = String(uiState?.collaboratorSearchTerm || "").trim();
  const suggestions = Array.isArray(uiState?.collaboratorSuggestions) ? uiState.collaboratorSuggestions : [];
  return !uiState?.collaboratorSearchLoading && !suggestions.length && isValidEmailAddress(query);
}

function getCollaboratorSearchExactMatch(uiState) {
  const query = String(uiState?.collaboratorSearchTerm || "").trim().toLowerCase();
  const suggestions = Array.isArray(uiState?.collaboratorSuggestions) ? uiState.collaboratorSuggestions : [];
  return suggestions.find((candidate) => String(candidate.email || "").trim().toLowerCase() === query) || null;
}

function getCollaboratorSourceLabel(candidate) {
  if (!candidate) return "Annuaire";
  return candidate.hasMdallAccount ? "Compte Mdall" : "Annuaire";
}

function formatCollaboratorDisplayDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function getFilteredCollaborators(uiState = ensureCollaborateursUiState()) {
  const collaborators = Array.isArray(store.projectForm.collaborators)
    ? store.projectForm.collaborators
    : [];
  const filter = String(uiState?.collaboratorStatusFilter || "Actif").trim() || "Actif";
  return collaborators.filter((item) => String(item?.status || "Actif").trim() === filter);
}



function getCollaboratorById(collaboratorId = "") {
  const collaborators = Array.isArray(store.projectForm.collaborators) ? store.projectForm.collaborators : [];
  return collaborators.find((item) => String(item?.id || "") === String(collaboratorId || "")) || null;
}

function isEditingCollaborator(uiState = ensureCollaborateursUiState()) {
  return !!String(uiState?.editingCollaboratorId || "").trim();
}

function createInlineDirectoryCandidate(uiState = ensureCollaborateursUiState()) {
  const email = String(uiState.collaboratorSearchTerm || "").trim();
  const firstName = String(uiState.collaboratorCreateFirstName || "").trim();
  const lastName = String(uiState.collaboratorCreateLastName || "").trim();
  const company = String(uiState.collaboratorCreateCompany || "").trim();
  const name = [firstName, lastName].filter(Boolean).join(" ");
  return {
    candidateKey: `inline-create:${email.toLowerCase()}`,
    email,
    firstName,
    lastName,
    name,
    company,
    hasMdallAccount: false,
    source: "directory_inline"
  };
}

function resetCollaboratorInlineCreation(uiState = ensureCollaborateursUiState(), { clearSearchTerm = false } = {}) {
  if (clearSearchTerm) uiState.collaboratorSearchTerm = "";
  uiState.collaboratorSuggestions = [];
  uiState.selectedCollaboratorCandidate = null;
  uiState.collaboratorSearchLoading = false;
  uiState.collaboratorModalError = "";
  uiState.collaboratorCreateFirstName = "";
  uiState.collaboratorCreateLastName = "";
  uiState.collaboratorCreateCompany = "";
}

function cancelInlineDirectoryCreation() {
  const uiState = ensureCollaborateursUiState();
  resetCollaboratorInlineCreation(uiState, { clearSearchTerm: true });
  rerenderCollaboratorCreatePageInPlace({ preserveSearchFocus: true });
}

function confirmInlineDirectoryCreation() {
  const uiState = ensureCollaborateursUiState();
  if (!shouldShowInlineDirectoryCreate(uiState)) return;

  const inlineCandidate = createInlineDirectoryCandidate(uiState);
  uiState.selectedCollaboratorCandidate = inlineCandidate;
  uiState.collaboratorSearchTerm = formatCollaboratorCandidateInputValue(inlineCandidate);
  uiState.collaboratorSuggestions = [];
  uiState.collaboratorSearchLoading = false;
  uiState.collaboratorModalError = "";
  rerenderCollaboratorCreatePageInPlace();
}

function getProjectLotGroupDefinitions() {
  return [
    { code: "groupe-maitrise-ouvrage", title: "Maîtrise d'ouvrage" },
    { code: "groupe-maitrise-oeuvre", title: "Maîtrise d'oeuvre" },
    { code: "groupe-entreprise", title: "Entreprises" },
    { code: "groupe-divers", title: "Divers" }
  ];
}

function getCollaboratorDisplayGroupDefinitions() {
  return [
    { code: "groupe-maitrise-ouvrage", title: "Maîtrise d'ouvrage" },
    { code: "groupe-maitrise-oeuvre", title: "Maîtrise d'oeuvre" },
    { code: "groupe-divers", title: "Divers" },
    { code: "groupe-entreprise", title: "Entreprises" }
  ];
}

function getProjectLotSortMetaMap() {
  const items = Array.isArray(store.projectLots?.items) ? store.projectLots.items : [];
  return new Map(items.map((item) => [String(item.id || ""), {
    id: String(item.id || ""),
    groupCode: String(item.groupCode || ""),
    groupLabel: String(item.groupLabel || ""),
    sortOrder: Number(item.sortOrder || 0),
    label: String(item.label || "")
  }]));
}

function getSortedCollaboratorGroups(collaborators = []) {
  const definitions = getCollaboratorDisplayGroupDefinitions();
  const buckets = definitions.map((group) => ({ ...group, items: [] }));
  const bucketMap = new Map(buckets.map((group) => [group.code, group]));
  const projectLotSortMetaMap = getProjectLotSortMetaMap();

  collaborators
    .map((item, index) => {
      const lotMeta = projectLotSortMetaMap.get(String(item?.projectLotId || "")) || null;
      const groupCode = String(lotMeta?.groupCode || item?.roleGroupCode || "").trim();
      return {
        item,
        index,
        groupCode,
        sortOrder: Number(lotMeta?.sortOrder || 0),
        roleLabel: String(lotMeta?.label || item?.role || "").trim()
      };
    })
    .sort((a, b) => {
      const groupIndexA = definitions.findIndex((group) => group.code === a.groupCode);
      const groupIndexB = definitions.findIndex((group) => group.code === b.groupCode);
      const normalizedGroupIndexA = groupIndexA >= 0 ? groupIndexA : Number.MAX_SAFE_INTEGER;
      const normalizedGroupIndexB = groupIndexB >= 0 ? groupIndexB : Number.MAX_SAFE_INTEGER;
      if (normalizedGroupIndexA !== normalizedGroupIndexB) return normalizedGroupIndexA - normalizedGroupIndexB;
      const sortCompare = a.sortOrder - b.sortOrder;
      if (sortCompare !== 0) return sortCompare;
      const roleCompare = a.roleLabel.localeCompare(b.roleLabel, "fr");
      if (roleCompare !== 0) return roleCompare;
      const nameCompare = String(a.item?.name || a.item?.email || "").localeCompare(String(b.item?.name || b.item?.email || ""), "fr");
      if (nameCompare !== 0) return nameCompare;
      return a.index - b.index;
    })
    .forEach((entry) => {
      const bucket = bucketMap.get(entry.groupCode);
      if (bucket) {
        bucket.items.push(entry.item);
      }
    });

  return buckets.filter((group) => group.items.length);
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

function renderCollaboratorRow(item) {
  const displayName = String(item.name || "").trim() || String(item.email || "").trim() || "Utilisateur";
  const subtitleParts = [String(item.email || "").trim(), String(item.company || "").trim(), item.hasMdallAccount ? "Compte Mdall" : "Annuaire"].filter(Boolean);
  const status = String(item.status || "Actif").trim() || "Actif";
  const displayDate = status === "Retiré"
    ? formatCollaboratorDisplayDate(item.removedAt || item.updatedAt)
    : formatCollaboratorDisplayDate(item.addedAt || item.createdAt);
  return `
    <div class="project-collaborators__row">
      <div class="project-collaborators__cell project-collaborators__cell--mail-icon">
        <span class="project-collaborators__mail-icon">
          ${svgIcon("mail", { width: 20, height: 20 })}
        </span>
      </div>

      <div class="project-collaborators__cell project-collaborators__cell--email">
        <button
          type="button"
          class="row-title-trigger project-collaborators__name-trigger"
          data-edit-collaborator-id="${escapeHtml(item.id)}"
        >${escapeHtml(displayName)}</button>
        <div class="project-collaborators__sub mono">${escapeHtml(subtitleParts.join(" · ") || "—")}</div>
      </div>

      <div class="project-collaborators__cell project-collaborators__cell--role mono">
        ${escapeHtml(item.role || "—")}
      </div>

      <div class="project-collaborators__cell project-collaborators__cell--date mono">
        ${escapeHtml(displayDate)}
      </div>

      <div class="project-collaborators__cell project-collaborators__cell--status mono">
        ${escapeHtml(status)}
      </div>

      <div class="project-collaborators__cell project-collaborators__cell--action">
        ${status === "Actif" ? `
          <button
            type="button"
            class="settings-lot-delete-button"
            data-remove-collaborator-id="${escapeHtml(item.id)}"
          >
            Retirer
          </button>
        ` : `
          <button
            type="button"
            class="settings-lot-delete-button"
            data-restore-collaborator-id="${escapeHtml(item.id)}"
          >
            Rétablir
          </button>
        `}
      </div>
    </div>
  `;
}

function renderCollaboratorsRows(collaborators = []) {
  if (!collaborators.length) {
    return `
      <div class="project-collaborators__empty">
        Aucun collaborateur pour ce filtre.
      </div>
    `;
  }

  return getSortedCollaboratorGroups(collaborators).map((group) => `
    <div class="project-collaborators__group-divider" role="presentation">
      <span class="project-collaborators__group-divider-label">${escapeHtml(group.title)}</span>
    </div>
    ${group.items.map((item) => renderCollaboratorRow(item)).join("")}
  `).join("");
}

function renderCollaboratorsCard() {
  const uiState = ensureCollaborateursUiState();
  const collaborators = getFilteredCollaborators(uiState);
  const currentFilter = String(uiState.collaboratorStatusFilter || "Actif").trim() || "Actif";

  return `
    <div class="project-collaborators">
      <div class="project-collaborators__intro">Recherchez une personne existante ou ajoutez-la à l'annuaire, puis affectez-la à un lot activé du projet.</div>

      <div class="project-collaborators__table">
        <div class="project-collaborators__head">
          <div class="project-collaborators__cell project-collaborators__cell--mail-icon"></div>
          <div class="project-collaborators__cell project-collaborators__cell--email">Collaborateur</div>
          <div class="project-collaborators__cell project-collaborators__cell--role">Rôle</div>
          <div class="project-collaborators__cell project-collaborators__cell--date">Date</div>
          <div class="project-collaborators__cell project-collaborators__cell--status">
            <div class="project-collaborators__status-filter">
              <button
                type="button"
                class="project-collaborators__status-filter-trigger"
                data-collaborator-status-filter-trigger="true"
                aria-expanded="${uiState.collaboratorStatusFilterOpen ? "true" : "false"}"
              >
                <span>Statut</span>
                <span class="project-collaborators__status-filter-chevron">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
              </button>
              <div class="project-collaborators__status-filter-menu ${uiState.collaboratorStatusFilterOpen ? "is-open" : ""}">
                <button type="button" class="project-collaborators__status-filter-item ${currentFilter === "Actif" ? "is-active" : ""}" data-collaborator-status-filter-value="Actif">Actif</button>
                <button type="button" class="project-collaborators__status-filter-item ${currentFilter === "Retiré" ? "is-active" : ""}" data-collaborator-status-filter-value="Retiré">Retiré</button>
              </div>
            </div>
          </div>
          <div class="project-collaborators__cell project-collaborators__cell--action"></div>
        </div>

        <div class="project-collaborators__body">
          ${renderCollaboratorsRows(collaborators)}
        </div>
      </div>
    </div>
  `;
}

function shouldShowCollaboratorSuggestionsDropdown(uiState) {
  return !!(uiState?.collaboratorSearchLoading
    || (Array.isArray(uiState?.collaboratorSuggestions) && uiState.collaboratorSuggestions.length)
    || shouldShowInlineDirectoryCreate(uiState));
}

function renderCollaboratorSuggestionList(uiState) {
  const suggestions = Array.isArray(uiState.collaboratorSuggestions) ? uiState.collaboratorSuggestions : [];

  if (uiState.collaboratorSearchLoading) {
    return '<div class="project-collaborators-modal__suggestions-empty">Recherche en cours…</div>';
  }

  const blocks = [];

  if (suggestions.length) {
    blocks.push(suggestions.map((candidate) => {
      const isSelected = String(uiState.selectedCollaboratorCandidate?.candidateKey || "") === String(candidate.candidateKey || "");
      const company = String(candidate.company || "").trim();
      return `
        <button
          type="button"
          class="project-collaborators-modal__suggestion ${isSelected ? 'is-selected' : ''}"
          data-collaborator-candidate-key="${escapeHtml(candidate.candidateKey || candidate.email || "")}" 
        >
          <span class="project-collaborators-modal__suggestion-name-wrap">
            <span class="project-collaborators-modal__suggestion-name">${escapeHtml(candidate.name || candidate.email || "Utilisateur")}</span>
            <span class="project-collaborators-modal__suggestion-badge">${escapeHtml(getCollaboratorSourceLabel(candidate))}</span>
          </span>
          <span class="project-collaborators-modal__suggestion-meta">${escapeHtml([candidate.email, company].filter(Boolean).join(" · ") || "—")}</span>
        </button>
      `;
    }).join(""));
  }

  if (shouldShowInlineDirectoryCreate(uiState)) {
    const email = String(uiState.collaboratorSearchTerm || "").trim();
    blocks.push(`
      <div class="project-collaborators-modal__create-card">
        <div class="project-collaborators-modal__create-title">Personne absente de l'annuaire, ajoutez-la :</div>
        <div class="project-collaborators-modal__create-email mono">${escapeHtml(email)}</div>
        <div class="project-collaborators-modal__create-grid">
          <input type="text" class="subject-create-input project-collaborators-modal__create-input" data-collaborator-create-field="lastName" value="${escapeHtml(uiState.collaboratorCreateLastName)}" placeholder="Nom">
          <input type="text" class="subject-create-input project-collaborators-modal__create-input" data-collaborator-create-field="firstName" value="${escapeHtml(uiState.collaboratorCreateFirstName)}" placeholder="Prénom">
          <input type="text" class="subject-create-input project-collaborators-modal__create-input project-collaborators-modal__create-input--full" data-collaborator-create-field="company" value="${escapeHtml(uiState.collaboratorCreateCompany)}" placeholder="Entreprise">
        </div>
        <div class="project-collaborators-modal__create-actions">
          <button type="button" class="gh-btn" data-collaborator-inline-cancel="true">Annuler</button>
          <button type="button" class="gh-btn gh-btn--primary" data-collaborator-inline-confirm="true">Valider</button>
        </div>
      </div>
    `);
  }

  return blocks.join("");
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
  const editingMode = isEditingCollaborator(uiState);
  const editingCollaborator = editingMode ? getCollaboratorById(uiState.editingCollaboratorId) : null;
  const canCreateDirectoryPerson = shouldShowInlineDirectoryCreate(uiState)
    && String(uiState.collaboratorCreateLastName || "").trim()
    && String(uiState.collaboratorCreateFirstName || "").trim();
  const submitDisabled = uiState.collaboratorModalSubmitting
    || (!editingMode && !selectedCandidate?.candidateKey && !canCreateDirectoryPerson)
    || !String(uiState.selectedCollaboratorProjectLotId || "").trim();

  const currentUserAvatar = String(store.user?.avatar || "assets/images/260093543.png").trim() || "assets/images/260093543.png";

  return `
    <section class="project-collaborator-create-shell" id="projectCollaboratorsCreatePage" data-collaborator-create-page>
      <div class="project-collaborator-create-shell__inner">
      <div class="project-collaborator-create">
        <div class="project-collaborator-create__header">
          <img src="${escapeHtml(currentUserAvatar)}" alt="Photo de profil" class="project-collaborator-create__avatar">
          <div class="project-collaborator-create__title-wrap">
            <div class="project-collaborator-create__title">${editingMode ? "Modifier le rôle d'un collaborateur du projet" : "Ajouter un collaborateur au projet"}</div>
          </div>
        </div>

        <div class="project-collaborator-create__body">
          <div class="project-collaborators-modal__section">
            <label class="settings-modal__label" for="${escapeHtml(fieldIds.searchInputId)}">${editingMode ? "Vous pouvez modifier le rôle d'un collaborateur du projet" : "Recherchez un collaborateur par son adresse mail ou son nom"}</label>
            <div class="project-collaborators-modal__search-wrap">
              <span class="project-collaborators-modal__search-icon">${svgIcon("search", { width: 18, height: 18 })}</span>
              <div class="project-collaborators-modal__search-field">
                <input
                  id="${escapeHtml(fieldIds.searchInputId)}"
                  class="subject-create-input project-collaborators-modal__search-input ${editingMode ? 'is-readonly' : ''}"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  value="${escapeHtml(uiState.collaboratorSearchTerm)}"
                  placeholder="nom@entreprise.com ou Nom Prénom"
                  aria-autocomplete="list"
                  aria-expanded="${!editingMode && shouldShowCollaboratorSuggestionsDropdown(uiState) ? "true" : "false"}"
                  ${editingMode ? 'readonly tabindex="-1" aria-readonly="true"' : ''}
                >
                ${editingMode ? '' : `
                <div class="project-collaborators-modal__suggestions ${shouldShowCollaboratorSuggestionsDropdown(uiState) ? 'is-open' : ''}">
                  ${renderCollaboratorSuggestionList(uiState)}
                </div>`}
              </div>
            </div>
          </div>

          <div class="project-collaborators-modal__section">
            <div class="settings-modal__label">Rôle</div>
            ${renderCollaboratorLotsPicker(uiState)}
          </div>

          ${uiState.collaboratorModalError ? `<div class="gh-alert gh-alert--error settings-modal__feedback">${escapeHtml(uiState.collaboratorModalError)}</div>` : ""}
        </div>

        <div class="project-collaborator-create__footer">
          <div class="project-collaborator-create__footer-left">
            ${editingMode ? "" : `
            <label class="subject-create-checkbox">
              <input type="checkbox" data-collaborator-create-more ${uiState.collaboratorCreateMore ? "checked" : ""}>
              <span>Créer un autre</span>
            </label>`}
          </div>
          <div class="project-collaborator-create__footer-right">
            <button type="button" class="gh-btn" data-close-collaborator-modal="true">Annuler</button>
            <button
              type="button"
              class="gh-btn gh-btn--primary"
              id="${escapeHtml(fieldIds.submitButtonId)}"
              ${submitDisabled ? "disabled" : ""}
            >
              ${uiState.collaboratorModalSubmitting ? (editingMode ? "Mise à jour…" : "Ajout en cours…") : (editingMode ? "Mettre à jour" : "Ajouter")}
            </button>
          </div>
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

function syncCollaboratorSubmitButtonState(page, fieldIds = getCollaboratorModalFieldIds()) {
  if (!page) return;
  const uiState = ensureCollaborateursUiState();
  const canCreateDirectoryPerson = shouldShowInlineDirectoryCreate(uiState)
    && String(uiState.collaboratorCreateLastName || "").trim()
    && String(uiState.collaboratorCreateFirstName || "").trim();
  const submitDisabled = uiState.collaboratorModalSubmitting
    || (!uiState.selectedCollaboratorCandidate?.candidateKey && !canCreateDirectoryPerson)
    || !String(uiState.selectedCollaboratorProjectLotId || "").trim();
  const submitButton = page.querySelector(`#${CSS.escape(fieldIds.submitButtonId)}`);
  if (submitButton) {
    submitButton.disabled = submitDisabled;
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
  uiState.selectedCollaboratorProjectLotId = "";
  uiState.collaboratorModalFieldIds = createCollaboratorModalFieldIds();
  uiState.collaboratorCreateMore = false;
  uiState.collaboratorCreateFirstName = "";
  uiState.collaboratorCreateLastName = "";
  uiState.collaboratorCreateCompany = "";
  uiState.collaboratorStatusFilterOpen = false;
  uiState.editingCollaboratorId = "";
  uiState.editingCollaboratorId = "";
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
  uiState.collaboratorCreateFirstName = "";
  uiState.collaboratorCreateLastName = "";
  uiState.collaboratorCreateCompany = "";
  uiState.collaboratorStatusFilterOpen = false;
  rerenderProjectParametres();
}

function openEditCollaboratorModal(collaboratorId = "") {
  const collaborator = getCollaboratorById(collaboratorId);
  if (!collaborator) return;
  const uiState = ensureCollaborateursUiState();
  const groups = getActiveProjectLotsByGroup().filter((group) => group.items.length);
  const selectedGroupCode = String(collaborator.roleGroupCode || "");

  uiState.collaboratorsModalOpen = true;
  uiState.editingCollaboratorId = String(collaborator.id || "");
  uiState.collaboratorSearchTerm = formatCollaboratorCandidateInputValue(collaborator);
  uiState.collaboratorSuggestions = [];
  uiState.selectedCollaboratorCandidate = collaborator;
  uiState.collaboratorSearchLoading = false;
  uiState.collaboratorModalSubmitting = false;
  uiState.collaboratorModalError = "";
  uiState.collaboratorActiveGroupCode = groups.some((group) => group.code === selectedGroupCode) ? selectedGroupCode : (groups[0]?.code || DEFAULT_GROUP_CODE);
  uiState.selectedCollaboratorProjectLotId = String(collaborator.projectLotId || "");
  uiState.collaboratorModalFieldIds = createCollaboratorModalFieldIds();
  uiState.collaboratorCreateMore = false;
  uiState.collaboratorCreateFirstName = String(collaborator.firstName || "");
  uiState.collaboratorCreateLastName = String(collaborator.lastName || "");
  uiState.collaboratorCreateCompany = String(collaborator.company || "");
  uiState.collaboratorStatusFilterOpen = false;
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
    if (uiState.selectedCollaboratorCandidate?.candidateKey) {
      const selectedStillPresent = suggestions.find((item) => item.candidateKey === uiState.selectedCollaboratorCandidate.candidateKey);
      uiState.selectedCollaboratorCandidate = selectedStillPresent || getCollaboratorSearchExactMatch(uiState) || null;
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

function selectCollaboratorCandidate(candidateKey) {
  const uiState = ensureCollaborateursUiState();
  const nextCandidate = (uiState.collaboratorSuggestions || []).find((item) => String(item.candidateKey) === String(candidateKey));
  if (!nextCandidate) return;
  uiState.selectedCollaboratorCandidate = nextCandidate;
  uiState.collaboratorSearchTerm = formatCollaboratorCandidateInputValue(nextCandidate);
  uiState.collaboratorSuggestions = [];
  uiState.collaboratorSearchLoading = false;
  uiState.collaboratorModalError = "";
  uiState.collaboratorCreateFirstName = String(nextCandidate.firstName || "");
  uiState.collaboratorCreateLastName = String(nextCandidate.lastName || "");
  uiState.collaboratorCreateCompany = String(nextCandidate.company || "");
  rerenderCollaboratorCreatePageInPlace();
}

async function submitCollaboratorDraft() {
  const uiState = ensureCollaborateursUiState();
  if (!uiState.selectedCollaboratorProjectLotId) return;

  if (isEditingCollaborator(uiState)) {
    uiState.collaboratorModalSubmitting = true;
    uiState.collaboratorModalError = "";
    rerenderCollaboratorCreatePageInPlace();

    try {
      await updateProjectCollaboratorRoleInSupabase(uiState.editingCollaboratorId, uiState.selectedCollaboratorProjectLotId);
      closeCollaboratorModal();
    } catch (error) {
      uiState.collaboratorModalSubmitting = false;
      uiState.collaboratorModalError = error instanceof Error ? error.message : String(error || "Erreur de mise à jour du collaborateur");
      rerenderCollaboratorCreatePageInPlace();
    }
    return;
  }

  const shouldCreateInline = shouldShowInlineDirectoryCreate(uiState) && !uiState.selectedCollaboratorCandidate?.candidateKey;
  if (shouldCreateInline && (!String(uiState.collaboratorCreateLastName || "").trim() || !String(uiState.collaboratorCreateFirstName || "").trim())) {
    uiState.collaboratorModalError = "Renseignez au minimum le nom et le prénom pour ajouter cette personne à l'annuaire.";
    rerenderCollaboratorCreatePageInPlace({ preserveSearchFocus: true });
    return;
  }

  uiState.collaboratorModalSubmitting = true;
  uiState.collaboratorModalError = "";
  rerenderCollaboratorCreatePageInPlace();

  try {
    await addProjectCollaboratorToSupabase({
      personId: uiState.selectedCollaboratorCandidate?.personId || "",
      userId: uiState.selectedCollaboratorCandidate?.linkedUserId || uiState.selectedCollaboratorCandidate?.userId || "",
      email: String(uiState.selectedCollaboratorCandidate?.email || uiState.collaboratorSearchTerm || "").trim(),
      firstName: String(uiState.selectedCollaboratorCandidate?.firstName || uiState.collaboratorCreateFirstName || "").trim(),
      lastName: String(uiState.selectedCollaboratorCandidate?.lastName || uiState.collaboratorCreateLastName || "").trim(),
      company: String(uiState.selectedCollaboratorCandidate?.company || uiState.collaboratorCreateCompany || "").trim(),
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
      uiState.selectedCollaboratorProjectLotId = "";
      uiState.collaboratorModalFieldIds = createCollaboratorModalFieldIds();
      uiState.collaboratorCreateFirstName = "";
      uiState.collaboratorCreateLastName = "";
      uiState.collaboratorCreateCompany = "";
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

async function restoreCollaborator(id) {
  const collaborator = getCollaboratorById(id);
  if (!collaborator) return;
  try {
    await addProjectCollaboratorToSupabase({
      personId: collaborator.personId,
      userId: collaborator.linkedUserId || collaborator.userId,
      email: collaborator.email,
      firstName: collaborator.firstName,
      lastName: collaborator.lastName,
      company: collaborator.company,
      projectLotId: collaborator.projectLotId,
      status: "Actif"
    });
    rerenderProjectParametres();
  } catch (error) {
    console.warn("restore collaborator failed", error);
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
  root.querySelectorAll("[data-restore-collaborator-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      restoreCollaborator(btn.getAttribute("data-restore-collaborator-id"));
    });
  });
  root.querySelectorAll("[data-edit-collaborator-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openEditCollaboratorModal(btn.getAttribute("data-edit-collaborator-id"));
    });
  });
  root.querySelectorAll("[data-collaborator-status-filter-trigger]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const uiState = ensureCollaborateursUiState();
      uiState.collaboratorStatusFilterOpen = !uiState.collaboratorStatusFilterOpen;
      rerenderProjectParametres();
    });
  });
  root.querySelectorAll("[data-collaborator-status-filter-value]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const uiState = ensureCollaborateursUiState();
      uiState.collaboratorStatusFilter = btn.getAttribute("data-collaborator-status-filter-value") || "Actif";
      uiState.collaboratorStatusFilterOpen = false;
      rerenderProjectParametres();
    });
  });
  if (!root.__collaboratorStatusFilterOutsideBound) {
    root.__collaboratorStatusFilterOutsideBound = true;
    document.addEventListener("click", (event) => {
      const uiState = ensureCollaborateursUiState();
      if (!uiState.collaboratorStatusFilterOpen) return;
      const filterHost = root.querySelector(".project-collaborators__status-filter");
      if (filterHost && filterHost.contains(event.target)) return;
      uiState.collaboratorStatusFilterOpen = false;
      rerenderProjectParametres();
    });
  }

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

    const candidateButton = event.target.closest?.("[data-collaborator-candidate-key]");
    if (candidateButton) {
      selectCollaboratorCandidate(candidateButton.getAttribute("data-collaborator-candidate-key"));
      return;
    }

    const inlineCancelButton = event.target.closest?.("[data-collaborator-inline-cancel]");
    if (inlineCancelButton) {
      cancelInlineDirectoryCreation();
      return;
    }

    const inlineConfirmButton = event.target.closest?.("[data-collaborator-inline-confirm]");
    if (inlineConfirmButton) {
      confirmInlineDirectoryCreation();
    }
  });

  bindLightTabs(page, {
    selector: ".project-collaborators-modal__tabs [data-light-tab-target]",
    onChange: (nextTabId) => {
      const uiState = ensureCollaborateursUiState();
      if (uiState.collaboratorActiveGroupCode === nextTabId) return;
      uiState.collaboratorActiveGroupCode = nextTabId;
      rerenderCollaboratorCreatePageInPlace();
    }
  });

  registerProjectPrimaryScrollSource(document.getElementById("projectParametresScroll"));

  const uiState = ensureCollaborateursUiState();
  const editingMode = isEditingCollaborator(uiState);
  const fieldIds = getCollaboratorModalFieldIds();
  const searchInput = page.querySelector(`#${CSS.escape(fieldIds.searchInputId)}`);
  if (!editingMode) searchInput?.addEventListener("input", (event) => {
    const uiState = ensureCollaborateursUiState();
    uiState.collaboratorSearchTerm = event.target.value || "";
    uiState.collaboratorModalError = "";
    uiState.selectedCollaboratorCandidate = null;
    if (!String(uiState.collaboratorSearchTerm || "").trim()) {
      uiState.collaboratorCreateFirstName = "";
      uiState.collaboratorCreateLastName = "";
      uiState.collaboratorCreateCompany = "";
    }
    scheduleCollaboratorSearch(uiState.collaboratorSearchTerm);
  });

  if (!editingMode) searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const firstCandidate = ensureCollaborateursUiState().collaboratorSuggestions?.[0];
      if (firstCandidate?.candidateKey) {
        selectCollaboratorCandidate(firstCandidate.candidateKey);
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

  page.querySelectorAll('[data-collaborator-create-field]').forEach((input) => {
    input.addEventListener("input", (event) => {
      const uiState = ensureCollaborateursUiState();
      const field = event.target.getAttribute("data-collaborator-create-field");
      const value = event.target.value || "";
      if (field === "firstName") uiState.collaboratorCreateFirstName = value;
      if (field === "lastName") uiState.collaboratorCreateLastName = value;
      if (field === "company") uiState.collaboratorCreateCompany = value;
      uiState.collaboratorModalError = "";
      syncCollaboratorSubmitButtonState(page, fieldIds);
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
    if (!editingMode && input && document.activeElement !== input && !ensureCollaborateursUiState().collaboratorSearchTerm) {
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
