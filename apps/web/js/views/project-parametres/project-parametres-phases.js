import { store } from "../../store.js";
import { escapeHtml } from "../../utils/escape-html.js";
import {
  syncProjectPhasesFromSupabase,
  persistProjectPhaseDatesToSupabase
} from "../../services/project-supabase-sync.js";
import {
  formatSharedDateInputValue,
  parseSharedDateInputValue,
  renderSharedDatePicker,
  shiftSharedCalendarMonth,
  toSharedDateInputValue
} from "../ui/shared-date-picker.js";
import { svgIcon } from "../../ui/icons.js";
import {
  renderSettingsBlock,
  renderSectionCard,
  bindBaseParametresUi,
  rerenderProjectParametres,
  getParametresUiState
} from "./project-parametres-core.js";

function ensurePhasesUiState() {
  const parametresUiState = getParametresUiState();

  if (typeof parametresUiState.projectPhasesLoading !== "boolean") {
    parametresUiState.projectPhasesLoading = false;
  }
  if (typeof parametresUiState.projectPhasesLoadedProjectKey !== "string") {
    parametresUiState.projectPhasesLoadedProjectKey = "";
  }
  if (typeof parametresUiState.projectPhasesLoaded !== "boolean") {
    parametresUiState.projectPhasesLoaded = false;
  }
  if (typeof parametresUiState.projectPhasesSubmitting !== "boolean") {
    parametresUiState.projectPhasesSubmitting = false;
  }
  if (typeof parametresUiState.projectPhasesError !== "string") {
    parametresUiState.projectPhasesError = "";
  }
  if (typeof parametresUiState.projectPhaseEditingCode !== "string") {
    parametresUiState.projectPhaseEditingCode = "";
  }
  if (typeof parametresUiState.projectPhaseSubmittingCode !== "string") {
    parametresUiState.projectPhaseSubmittingCode = "";
  }
  if (!parametresUiState.projectPhaseDateDrafts || typeof parametresUiState.projectPhaseDateDrafts !== "object") {
    parametresUiState.projectPhaseDateDrafts = {};
  }
  if (typeof parametresUiState.projectPhaseDateOpenPickerCode !== "string") {
    parametresUiState.projectPhaseDateOpenPickerCode = "";
  }
  if (!parametresUiState.projectPhaseDateCalendarViews || typeof parametresUiState.projectPhaseDateCalendarViews !== "object") {
    parametresUiState.projectPhaseDateCalendarViews = {};
  }
  if (typeof parametresUiState.projectPhaseDateDocumentBound !== "boolean") {
    parametresUiState.projectPhaseDateDocumentBound = false;
  }

  return parametresUiState;
}

function getCurrentProjectOwnerId() {
  const currentProjectId = String(store.currentProjectId || store.currentProject?.id || "").trim();
  const currentProject = store.currentProject && typeof store.currentProject === "object"
    ? store.currentProject
    : (Array.isArray(store.projects)
      ? store.projects.find((project) => String(project?.id || "").trim() === currentProjectId)
      : null);

  return String(currentProject?.ownerId || currentProject?.owner_id || "").trim();
}

function canCurrentUserEditProjectPhaseDates() {
  const currentUserId = String(store.user?.id || "").trim();
  const ownerId = getCurrentProjectOwnerId();
  return Boolean(currentUserId && ownerId && currentUserId === ownerId);
}

function getProjectPhasesCatalog() {
  const phases = Array.isArray(store.projectForm.phasesCatalog)
    ? store.projectForm.phasesCatalog
    : [];

  return phases.map((item) => ({
    code: String(item?.code || "").trim(),
    label: String(item?.label || "").trim(),
    enabled: item?.enabled !== false,
    phaseDate: String(item?.phaseDate || item?.phase_date || "").trim()
  })).filter((item) => item.code && item.label);
}

function getEnabledProjectPhases() {
  return getProjectPhasesCatalog().filter((item) => item.enabled);
}

function formatPhaseDateDisplay(value = "") {
  const date = parseSharedDateInputValue(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function getPhaseDateDraftValue(code = "", fallbackValue = "") {
  const parametresUiState = ensurePhasesUiState();
  const draftValue = parametresUiState.projectPhaseDateDrafts?.[code];
  return typeof draftValue === "string" ? draftValue : String(fallbackValue || "").trim();
}

function syncPhaseDateCalendarView(code = "", rawValue = "") {
  const parametresUiState = ensurePhasesUiState();
  const existingView = parametresUiState.projectPhaseDateCalendarViews?.[code];
  if (existingView && Number.isFinite(existingView.year) && Number.isFinite(existingView.month)) {
    return existingView;
  }

  const selectedDate = parseSharedDateInputValue(rawValue);
  const fallback = selectedDate || new Date();
  const nextView = {
    year: fallback.getFullYear(),
    month: fallback.getMonth()
  };
  parametresUiState.projectPhaseDateCalendarViews[code] = nextView;
  return nextView;
}

function stopProjectPhaseInlineEdition({ clearDraft = true } = {}) {
  const parametresUiState = ensurePhasesUiState();
  const code = String(parametresUiState.projectPhaseEditingCode || "").trim();
  parametresUiState.projectPhaseEditingCode = "";
  parametresUiState.projectPhaseDateOpenPickerCode = "";
  if (clearDraft && code) {
    delete parametresUiState.projectPhaseDateDrafts[code];
  }
}

function startProjectPhaseInlineEdition(code = "", fallbackValue = "") {
  if (!canCurrentUserEditProjectPhaseDates()) return;
  const normalizedCode = String(code || "").trim();
  if (!normalizedCode) return;

  const parametresUiState = ensurePhasesUiState();
  parametresUiState.projectPhasesError = "";
  parametresUiState.projectPhaseEditingCode = normalizedCode;
  parametresUiState.projectPhaseDateOpenPickerCode = normalizedCode;
  parametresUiState.projectPhaseDateDrafts[normalizedCode] = String(fallbackValue || "").trim();
  syncPhaseDateCalendarView(normalizedCode, fallbackValue);
}

async function saveSingleProjectPhaseDate(code = "", nextValue = "") {
  const normalizedCode = String(code || "").trim();
  if (!normalizedCode || !canCurrentUserEditProjectPhaseDates()) return;

  const parametresUiState = ensurePhasesUiState();
  if (parametresUiState.projectPhaseSubmittingCode === normalizedCode) return;

  parametresUiState.projectPhasesSubmitting = true;
  parametresUiState.projectPhaseSubmittingCode = normalizedCode;
  parametresUiState.projectPhasesError = "";
  parametresUiState.projectPhaseDateDrafts[normalizedCode] = String(nextValue || "").trim();
  rerenderProjectParametres();

  try {
    await persistProjectPhaseDatesToSupabase({
      [normalizedCode]: String(nextValue || "").trim()
    });
    stopProjectPhaseInlineEdition();
  } catch (error) {
    parametresUiState.projectPhasesError = error instanceof Error ? error.message : String(error || "Erreur de mise à jour des dates de phases");
  } finally {
    parametresUiState.projectPhasesSubmitting = false;
    parametresUiState.projectPhaseSubmittingCode = "";
    rerenderProjectParametres();
  }
}

function renderProjectPhaseDateControl(item) {
  const parametresUiState = ensurePhasesUiState();
  const code = String(item?.code || "").trim();
  const phaseDate = getPhaseDateDraftValue(code, item?.phaseDate || "");
  const isEditable = canCurrentUserEditProjectPhaseDates();
  const isEditing = parametresUiState.projectPhaseEditingCode === code;
  const isSubmitting = parametresUiState.projectPhaseSubmittingCode === code;

  if (!isEditing) {
    return `
      <div class="settings-phase-date-display">
        <span class="settings-phase-date-text">${escapeHtml(formatPhaseDateDisplay(item?.phaseDate || ""))}</span>
        ${isEditable ? `
          <button
            type="button"
            class="settings-phase-edit-btn"
            data-project-phase-edit="${escapeHtml(code)}"
            aria-label="Modifier la date de la phase ${escapeHtml(code)}"
            title="Modifier la date"
          >
            ${svgIcon("pencil", { className: "octicon" })}
          </button>
        ` : ""}
      </div>
    `;
  }

  const pickerId = `projectPhaseDate-${code}`;
  const selectedDate = parseSharedDateInputValue(phaseDate);
  const calendarView = syncPhaseDateCalendarView(code, phaseDate);

  return `
    <div class="settings-phase-date-picker" data-project-phase-date-picker-wrap data-phase-code="${escapeHtml(code)}">
      ${renderSharedDatePicker({
        idBase: pickerId,
        value: phaseDate,
        selectedDate,
        viewYear: calendarView.year,
        viewMonth: calendarView.month,
        isOpen: parametresUiState.projectPhaseDateOpenPickerCode === code,
        placeholder: "Sélectionner une date",
        inputLabel: isSubmitting ? "Mise à jour…" : (formatSharedDateInputValue(selectedDate) || "Sélectionner une date"),
        calendarLabel: `Sélectionner une date pour la phase ${code}`
      })}
    </div>
  `;
}

function renderProjectPhasesCard() {
  const items = getProjectPhasesCatalog();
  const parametresUiState = ensurePhasesUiState();
  const canEditPhases = canCurrentUserEditProjectPhaseDates();

  if (parametresUiState.projectPhasesLoading && !items.length) {
    return '<div class="settings-empty-note settings-empty-note--card">Chargement des phases…</div>';
  }

  if (!items.length) {
    return '<div class="settings-empty-note settings-empty-note--card">Aucune phase disponible pour ce projet.</div>';
  }

  return `
    <div class="settings-features-card settings-features-card--phases">
      <div class="settings-features-list">
        ${items.map((item) => {
          const inputId = `projectPhaseToggle_${item.code}`;
          const isInlineEditing = ensurePhasesUiState().projectPhaseEditingCode === item.code;
          return `
            <div class="settings-feature-row settings-feature-row--phase${isInlineEditing ? " is-inline-editing" : ""}" data-project-phase-row="${escapeHtml(item.code)}">
              ${canEditPhases ? `
                <div class="settings-feature-row__control">
                  <input
                    id="${escapeHtml(inputId)}"
                    type="checkbox"
                    data-project-phase-toggle="${escapeHtml(item.code)}"
                    ${item.enabled ? "checked" : ""}
                  >
                </div>
                <label class="settings-feature-row__body settings-feature-row__body--phase" for="${escapeHtml(inputId)}">
                  <div class="settings-feature-row__label">
                    ${escapeHtml(item.code)} - ${escapeHtml(item.label)}
                  </div>
                </label>
              ` : `
                <div class="settings-feature-row__body settings-feature-row__body--phase settings-feature-row__body--phase-readonly">
                  <div class="settings-feature-row__label">
                    ${escapeHtml(item.code)} - ${escapeHtml(item.label)}
                  </div>
                </div>
              `}
              <div class="settings-feature-row__aside settings-feature-row__aside--phase">
                ${renderProjectPhaseDateControl(item)}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function bindProjectPhaseToggles() {
  document.querySelectorAll("[data-project-phase-toggle]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const code = event.target.getAttribute("data-project-phase-toggle");
      if (!code || !Array.isArray(store.projectForm.phasesCatalog)) return;

      const item = store.projectForm.phasesCatalog.find((phase) => phase.code === code);
      if (!item) return;

      item.enabled = !!event.target.checked;

      const enabledPhases = getEnabledProjectPhases();

      if (!enabledPhases.length) {
        item.enabled = true;
        event.target.checked = true;
        return;
      }

      if (!enabledPhases.some((phase) => phase.code === store.projectForm.currentPhase)) {
        store.projectForm.currentPhase = enabledPhases[0].code;
      }

      if (!enabledPhases.some((phase) => phase.code === store.projectForm.phase)) {
        store.projectForm.phase = enabledPhases[0].code;
      }

      rerenderProjectParametres();
    });
  });
}

function bindProjectPhaseOutsideClose() {
  const parametresUiState = ensurePhasesUiState();
  if (parametresUiState.projectPhaseDateDocumentBound) return;

  document.addEventListener("mousedown", (event) => {
    const uiState = ensurePhasesUiState();
    const editingCode = String(uiState.projectPhaseEditingCode || "").trim();
    if (!editingCode || uiState.projectPhaseSubmittingCode === editingCode) return;

    const pickerWrap = Array.from(document.querySelectorAll('[data-project-phase-date-picker-wrap]'))
      .find((node) => String(node?.getAttribute('data-phase-code') || '').trim() === editingCode);
    if (!pickerWrap) return;
    if (pickerWrap.contains(event.target)) return;

    stopProjectPhaseInlineEdition();
    rerenderProjectParametres();
  });

  parametresUiState.projectPhaseDateDocumentBound = true;
}

function bindProjectPhaseDateEditor() {
  const parametresUiState = ensurePhasesUiState();

  document.querySelectorAll("[data-project-phase-edit]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const code = String(button.getAttribute("data-project-phase-edit") || "").trim();
      const item = getProjectPhasesCatalog().find((phase) => phase.code === code);
      startProjectPhaseInlineEdition(code, item?.phaseDate || "");
      rerenderProjectParametres();
    });
  });

  if (!parametresUiState.projectPhaseEditingCode) return;

  getProjectPhasesCatalog().forEach((item) => {
    const code = String(item.code || "").trim();
    if (parametresUiState.projectPhaseEditingCode !== code) return;

    const pickerId = `projectPhaseDate-${code}`;

    document.querySelectorAll(`[data-shared-date-input-trigger='${pickerId}']`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        parametresUiState.projectPhaseDateOpenPickerCode = code;
        rerenderProjectParametres();
      });
    });

    document.querySelectorAll(`[data-shared-date-nav='${pickerId}-prev']`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const view = syncPhaseDateCalendarView(code, getPhaseDateDraftValue(code, item.phaseDate));
        const shifted = shiftSharedCalendarMonth(view.year, view.month, -1);
        parametresUiState.projectPhaseDateCalendarViews[code] = shifted;
        rerenderProjectParametres();
      });
    });

    document.querySelectorAll(`[data-shared-date-nav='${pickerId}-next']`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const view = syncPhaseDateCalendarView(code, getPhaseDateDraftValue(code, item.phaseDate));
        const shifted = shiftSharedCalendarMonth(view.year, view.month, 1);
        parametresUiState.projectPhaseDateCalendarViews[code] = shifted;
        rerenderProjectParametres();
      });
    });

    document.querySelectorAll(`[data-shared-date-owner='${pickerId}'][data-shared-date-day]`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextValue = String(button.getAttribute("data-shared-date-day") || "");
        const selectedDate = parseSharedDateInputValue(nextValue);
        if (selectedDate) {
          parametresUiState.projectPhaseDateCalendarViews[code] = {
            year: selectedDate.getFullYear(),
            month: selectedDate.getMonth()
          };
        }
        void saveSingleProjectPhaseDate(code, nextValue);
      });
    });

    document.querySelectorAll(`[data-shared-date-clear='${pickerId}']`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void saveSingleProjectPhaseDate(code, "");
      });
    });

    document.querySelectorAll(`[data-shared-date-today='${pickerId}']`).forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const today = new Date();
        parametresUiState.projectPhaseDateCalendarViews[code] = {
          year: today.getFullYear(),
          month: today.getMonth()
        };
        void saveSingleProjectPhaseDate(code, toSharedDateInputValue(today));
      });
    });
  });
}

function ensureProjectPhasesLoaded(root) {
  const parametresUiState = ensurePhasesUiState();
  const currentProjectKey = String(store.currentProjectId || store.currentProject?.id || "default");

  if (parametresUiState.projectPhasesLoadedProjectKey !== currentProjectKey) {
    parametresUiState.projectPhasesLoadedProjectKey = currentProjectKey;
    parametresUiState.projectPhasesLoaded = false;
    parametresUiState.projectPhasesLoading = false;
    stopProjectPhaseInlineEdition();
    parametresUiState.projectPhaseDateCalendarViews = {};
  }

  if (!parametresUiState.projectPhasesLoading && !parametresUiState.projectPhasesLoaded) {
    parametresUiState.projectPhasesLoading = true;
    syncProjectPhasesFromSupabase({ force: true })
      .catch((error) => {
        console.warn("syncProjectPhasesFromSupabase failed", error);
        parametresUiState.projectPhasesError = error instanceof Error ? error.message : String(error || "Erreur de chargement des phases");
      })
      .finally(() => {
        parametresUiState.projectPhasesLoading = false;
        parametresUiState.projectPhasesLoaded = true;
        if (!root?.isConnected) return;
        rerenderProjectParametres();
      });
  }
}

export function renderPhasesParametresContent() {
  const parametresUiState = ensurePhasesUiState();
  const canEditPhases = canCurrentUserEditProjectPhaseDates();
  return `${renderSettingsBlock({
    id: "parametres-phase",
    title: "",
    lead: "",
    cards: [
      renderSectionCard({
        title: "Phases",
        description: canEditPhases
          ? "Vous pouvez choisir les phases que vous voulez activer sur votre projet et définir leurs échéances."
          : "Les phases actives et leurs échéances sont définies par l'administrateur du projet.",
        body: `
          ${renderProjectPhasesCard()}
          ${parametresUiState.projectPhasesError ? `<div class="settings-inline-error">${escapeHtml(parametresUiState.projectPhasesError)}</div>` : ""}
        `
      })
    ]
  })}`;
}

export function bindPhasesParametresSection(root) {
  bindBaseParametresUi();
  bindProjectPhaseToggles();
  bindProjectPhaseOutsideClose();
  bindProjectPhaseDateEditor();
  ensureProjectPhasesLoaded(root);
}

export function getPhasesProjectParametresTab() {
  return {
    id: "parametres-phase",
    label: "Phases",
    iconName: "checklist",
    isPrimary: false,
    renderContent: () => renderPhasesParametresContent(),
    bind: (root) => bindPhasesParametresSection(root)
  };
}
