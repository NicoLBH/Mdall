import { store } from "../../store.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import {
  syncProjectLotsFromSupabase,
  persistProjectLotActivationToSupabase,
  addCustomProjectLotToSupabase,
  deleteCustomProjectLotFromSupabase
} from "../../services/project-supabase-sync.js";
import { renderSettingsModal } from "../ui/settings-modal.js";
import {
  renderSettingsBlock,
  renderSectionCard,
  bindBaseParametresUi,
  rerenderProjectParametres,
  getParametresUiState
} from "./project-parametres-core.js";

function ensureLotsUiState() {
  const parametresUiState = getParametresUiState();

  if (typeof parametresUiState.addLotModalOpen !== "boolean") {
    parametresUiState.addLotModalOpen = false;
  }
  if (typeof parametresUiState.addLotGroupCode !== "string" || !parametresUiState.addLotGroupCode.trim()) {
    parametresUiState.addLotGroupCode = "groupe-maitrise-ouvrage";
  }
  if (typeof parametresUiState.addLotTitle !== "string") {
    parametresUiState.addLotTitle = "";
  }
  if (typeof parametresUiState.addLotSubmitting !== "boolean") {
    parametresUiState.addLotSubmitting = false;
  }
  if (typeof parametresUiState.addLotErrorMessage !== "string") {
    parametresUiState.addLotErrorMessage = "";
  }

  return parametresUiState;
}

function getProjectLotsViewState() {
  const state = store.projectLots && typeof store.projectLots === "object"
    ? store.projectLots
    : { items: [], loading: false, loaded: false, error: "", projectKey: "" };

  if (store.projectLots !== state) {
    store.projectLots = state;
  }

  if (!Array.isArray(state.items)) {
    state.items = [];
  }

  if (typeof state.loading !== "boolean") {
    state.loading = false;
  }

  if (typeof state.loaded !== "boolean") {
    state.loaded = false;
  }

  if (typeof state.error !== "string") {
    state.error = "";
  }

  if (typeof state.projectKey !== "string") {
    state.projectKey = "";
  }

  return state;
}

function getProjectLotGroupDefinitions() {
  return [
    { code: "groupe-maitrise-ouvrage", title: "Maîtrise d'ouvrage" },
    { code: "groupe-maitrise-oeuvre", title: "Maîtrise d'oeuvre" },
    { code: "groupe-entreprise", title: "Entreprises" },
    { code: "groupe-divers", title: "Divers" }
  ];
}

function renderAddProjectLotModal() {
  const parametresUiState = ensureLotsUiState();
  if (!parametresUiState.addLotModalOpen) return "";

  const radioOptions = getProjectLotGroupDefinitions();
  const submitDisabled = parametresUiState.addLotSubmitting || !String(parametresUiState.addLotTitle || "").trim();

  return renderSettingsModal({
    modalId: "projectAddLotModal",
    title: "Ajouter un lot",
    closeDataAttribute: "data-close-project-lot-modal",
    bodyHtml: `
      <div class="project-lot-modal__groups" role="radiogroup" aria-label="Groupe du lot">
        ${radioOptions.map((option) => `
          <label class="project-lot-modal__radio">
            <input
              type="radio"
              name="projectLotGroupCode"
              value="${escapeHtml(option.code)}"
              ${parametresUiState.addLotGroupCode === option.code ? "checked" : ""}
            >
            <span>${escapeHtml(option.title)}</span>
          </label>
        `).join("")}
      </div>

      <label class="personal-settings-delete-modal__field">
        <span class="personal-settings-delete-modal__label">Saisssisez le titre du lot à ajouter :</span>
        <input
          type="text"
          class="gh-input personal-settings-delete-modal__input"
          id="projectAddLotTitle"
          value="${escapeHtml(parametresUiState.addLotTitle)}"
          autocomplete="off"
          spellcheck="false"
        >
      </label>

      ${parametresUiState.addLotErrorMessage ? `<div class="gh-alert gh-alert--error personal-settings-delete-modal__feedback">${escapeHtml(parametresUiState.addLotErrorMessage)}</div>` : ""}

      <button
        type="button"
        class="gh-btn gh-btn--primary personal-settings-delete-modal__submit"
        id="projectAddLotSubmit"
        ${submitDisabled ? "disabled" : ""}
      >
        ${parametresUiState.addLotSubmitting ? "Enregistrement…" : "Enregistrer"}
      </button>
    `
  });
}

function renderProjectLotsCard() {
  const lotsState = getProjectLotsViewState();
  const groups = getProjectLotGroupDefinitions().map((definition) => ({
    ...definition,
    items: []
  }));
  const groupsMap = new Map(groups.map((group) => [group.code, group]));

  const lots = Array.isArray(lotsState.items) ? [...lotsState.items] : [];
  lots.sort((a, b) => {
    const groupA = getProjectLotGroupDefinitions().findIndex((item) => item.code === a.groupCode);
    const groupB = getProjectLotGroupDefinitions().findIndex((item) => item.code === b.groupCode);
    if (groupA !== groupB) return groupA - groupB;
    const sortCompare = Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
    if (sortCompare !== 0) return sortCompare;
    return String(a.label || "").localeCompare(String(b.label || ""), "fr");
  }).forEach((item) => {
    const bucket = groupsMap.get(String(item.groupCode || ""));
    if (bucket) {
      bucket.items.push(item);
    }
  });

  let content = "";

  if (lotsState.loading && !lots.length) {
    content = '<div class="settings-empty-note">Chargement des lots…</div>';
  } else if (lotsState.error) {
    content = `<div class="settings-inline-error">${escapeHtml(lotsState.error)}</div>`;
  } else if (!lots.length) {
    content = '<div class="settings-empty-note">Aucun lot disponible pour ce projet.</div>';
  } else {
    content = `
      <div class="settings-lots-grid">
        ${groups.map((group) => `
          <section class="settings-features-card settings-lots-card">
            <div class="settings-features-card__title">${escapeHtml(group.title)}</div>
            <div class="settings-features-list">
              ${group.items.map((item) => {
                const inputId = `projectLotToggle_${item.id}`;
                return `
                  <label class="settings-feature-row settings-feature-row--lot" for="${escapeHtml(inputId)}">
                    <div class="settings-feature-row__control">
                      <input
                        id="${escapeHtml(inputId)}"
                        type="checkbox"
                        data-project-lot-toggle="${escapeHtml(item.id)}"
                        ${item.activated ? "checked" : ""}
                      >
                    </div>
                    <div class="settings-feature-row__body settings-feature-row__body--lot">
                      <div class="settings-feature-row__top settings-feature-row__top--lot">
                        <div class="settings-feature-row__label">${escapeHtml(item.label)}</div>
                        ${item.isCustom ? `<button type="button" class="settings-lot-delete-button" data-project-lot-delete="${escapeHtml(item.id)}">supprimer</button>` : ""}
                      </div>
                    </div>
                  </label>
                `;
              }).join("") || '<div class="settings-empty-note settings-empty-note--card">Aucun lot.</div>'}
            </div>
          </section>
        `).join("")}
      </div>
    `;
  }

  return `
    <div class="settings-features-toolbar settings-features-toolbar--lots">
      <button type="button" class="gh-btn settings-lots-add-button" data-project-lot-add>
        ${svgIcon("book")}
        <span>Ajouter un lot</span>
      </button>
    </div>
    ${content}
    ${renderAddProjectLotModal()}
  `;
}

function openAddProjectLotModal() {
  const parametresUiState = ensureLotsUiState();
  parametresUiState.addLotModalOpen = true;
  parametresUiState.addLotGroupCode = "groupe-maitrise-ouvrage";
  parametresUiState.addLotTitle = "";
  parametresUiState.addLotSubmitting = false;
  parametresUiState.addLotErrorMessage = "";
  document.body.classList.add("modal-open");
  rerenderProjectParametres();

  queueMicrotask(() => {
    document.getElementById("projectAddLotTitle")?.focus();
  });
}

function closeAddProjectLotModal() {
  const parametresUiState = ensureLotsUiState();
  parametresUiState.addLotModalOpen = false;
  parametresUiState.addLotSubmitting = false;
  parametresUiState.addLotErrorMessage = "";
  document.body.classList.remove("modal-open");
  rerenderProjectParametres();
}

async function submitAddProjectLotModal() {
  const parametresUiState = ensureLotsUiState();
  if (parametresUiState.addLotSubmitting) return;

  const label = String(parametresUiState.addLotTitle || "").trim();
  if (!label) return;

  parametresUiState.addLotSubmitting = true;
  parametresUiState.addLotErrorMessage = "";
  rerenderProjectParametres();

  try {
    await addCustomProjectLotToSupabase({
      groupCode: parametresUiState.addLotGroupCode,
      label
    });
    closeAddProjectLotModal();
  } catch (error) {
    parametresUiState.addLotSubmitting = false;
    parametresUiState.addLotErrorMessage = error instanceof Error ? error.message : String(error || "Erreur d'ajout du lot");
    rerenderProjectParametres();
  }
}

async function handleProjectLotToggle(input, activated) {
  input.disabled = true;

  try {
    await persistProjectLotActivationToSupabase(input.getAttribute("data-project-lot-toggle"), activated);
    rerenderProjectParametres();
  } catch (error) {
    console.warn("persistProjectLotActivationToSupabase failed", error);
    input.checked = !activated;
  } finally {
    input.disabled = false;
  }
}

function bindProjectLotToggles() {
  ensureLotsUiState();

  document.querySelectorAll("[data-project-lot-toggle]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const target = event.target;
      handleProjectLotToggle(target, !!target.checked);
    });
  });

  document.querySelectorAll("[data-project-lot-add]").forEach((button) => {
    button.addEventListener("click", () => {
      openAddProjectLotModal();
    });
  });

  document.querySelectorAll("[data-project-lot-delete]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      const lotId = target?.getAttribute("data-project-lot-delete");
      if (!lotId) return;
      target.disabled = true;
      try {
        await deleteCustomProjectLotFromSupabase(lotId);
        rerenderProjectParametres();
      } catch (error) {
        console.warn("deleteCustomProjectLotFromSupabase failed", error);
        target.disabled = false;
      }
    });
  });

  const modal = document.getElementById("projectAddLotModal");
  if (!modal) return;

  modal.addEventListener("click", (event) => {
    const closeTarget = event.target.closest?.("[data-close-project-lot-modal]");
    if (closeTarget) {
      closeAddProjectLotModal();
    }
  });

  modal.querySelectorAll('input[name="projectLotGroupCode"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      ensureLotsUiState().addLotGroupCode = event.target.value || "groupe-maitrise-ouvrage";
    });
  });

  const titleInput = modal.querySelector("#projectAddLotTitle");
  const submitButton = modal.querySelector("#projectAddLotSubmit");

  const syncSubmitState = () => {
    const parametresUiState = ensureLotsUiState();
    parametresUiState.addLotTitle = titleInput?.value || "";
    if (submitButton) {
      submitButton.disabled = parametresUiState.addLotSubmitting || !String(parametresUiState.addLotTitle || "").trim();
    }
  };

  titleInput?.addEventListener("input", () => {
    const parametresUiState = ensureLotsUiState();
    parametresUiState.addLotTitle = titleInput?.value || "";
    if (parametresUiState.addLotErrorMessage) {
      parametresUiState.addLotErrorMessage = "";
      rerenderProjectParametres();
      return;
    }
    syncSubmitState();
  });

  titleInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void submitAddProjectLotModal();
    }
  });

  submitButton?.addEventListener("click", () => {
    void submitAddProjectLotModal();
  });

  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAddProjectLotModal();
    }
  });

  syncSubmitState();
}

function ensureProjectLotsLoaded(root) {
  const lotsState = getProjectLotsViewState();
  const currentLotsProjectKey = String(store.currentProjectId || store.currentProject?.id || "default");
  if (lotsState.projectKey !== currentLotsProjectKey) {
    lotsState.projectKey = currentLotsProjectKey;
    lotsState.items = [];
    lotsState.loaded = false;
    lotsState.error = "";
  }

  if (!lotsState.loading && !lotsState.loaded) {
    lotsState.loading = true;
    syncProjectLotsFromSupabase({ force: true })
      .then(() => {
        if (!root?.isConnected) return;
        rerenderProjectParametres();
      })
      .catch((error) => {
        console.warn("syncProjectLotsFromSupabase failed", error);
        if (!root?.isConnected) return;
        rerenderProjectParametres();
      });
  }
}

export function renderLotsParametresContent() {
  return `${renderSettingsBlock({
    id: "parametres-lots",
    title: "",
    lead: "",
    cards: [
      renderSectionCard({
        title: "Lots",
        description: "Activez les lots présents sur le projet pour organiser les Documents et les Collaborateurs. Les lots personnalisés peuvent être ajoutés puis supprimés.",
        body: renderProjectLotsCard()
      })
    ]
  })}`;
}

export function bindLotsParametresSection(root) {
  bindBaseParametresUi();
  bindProjectLotToggles();
  ensureProjectLotsLoaded(root);
}

export function getLotsProjectParametresTab() {
  return {
    id: "parametres-lots",
    label: "Lots",
    iconName: "book",
    isPrimary: false,
    renderContent: () => renderLotsParametresContent(),
    bind: (root) => bindLotsParametresSection(root)
  };
}
