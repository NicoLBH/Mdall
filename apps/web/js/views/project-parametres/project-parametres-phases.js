import { store } from "../../store.js";
import { escapeHtml } from "../../utils/escape-html.js";
import {
  renderSettingsBlock,
  renderSectionCard,
  bindBaseParametresUi,
  rerenderProjectParametres
} from "./project-parametres-core.js";

function getProjectPhasesCatalog() {
  const phases = Array.isArray(store.projectForm.phasesCatalog)
    ? store.projectForm.phasesCatalog
    : [];

  return phases.map((item) => ({
    code: String(item?.code || "").trim(),
    label: String(item?.label || "").trim(),
    enabled: item?.enabled !== false
  })).filter((item) => item.code && item.label);
}

function getEnabledProjectPhases() {
  return getProjectPhasesCatalog().filter((item) => item.enabled);
}

function renderProjectPhasesCard() {
  const items = getProjectPhasesCatalog();

  return `
    <div class="settings-features-card">
      <div class="settings-features-card__title">Phases disponibles</div>
      <div class="settings-features-list">
        ${items.map((item) => {
          const inputId = `projectPhaseToggle_${item.code}`;
          return `
            <label class="settings-feature-row" for="${escapeHtml(inputId)}">
              <div class="settings-feature-row__control">
                <input
                  id="${escapeHtml(inputId)}"
                  type="checkbox"
                  data-project-phase-toggle="${escapeHtml(item.code)}"
                  ${item.enabled ? "checked" : ""}
                >
              </div>
              <div class="settings-feature-row__body">
                <div class="settings-feature-row__label">
                  ${escapeHtml(item.code)} - ${escapeHtml(item.label)}
                </div>
              </div>
            </label>
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

export function renderPhasesParametresContent() {
  return `${renderSettingsBlock({
    id: "parametres-phase",
    title: "",
    lead: "",
    cards: [
      renderSectionCard({
        title: "Phases",
        description: "Les cases sont toutes cochées par défaut. Cette structure est stockée dans le store pour préparer le branchement backend.",
        body: renderProjectPhasesCard()
      })
    ]
  })}`;
}

export function bindPhasesParametresSection(root) {
  bindBaseParametresUi();
  bindProjectPhaseToggles();
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
