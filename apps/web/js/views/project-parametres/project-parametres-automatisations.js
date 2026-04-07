import {
  getAutomationCatalogList,
  isAutomationEnabled,
  setAutomationEnabled
} from "../../services/project-automation.js";
import { persistCurrentProjectState } from "../../services/project-state-storage.js";
import { escapeHtml } from "../../utils/escape-html.js";
import {
  renderSettingsBlock,
  renderSectionCard,
  bindBaseParametresUi,
  rerenderProjectParametres
} from "./project-parametres-core.js";

function getAutomationItemDescription(item) {
  const descriptions = {
    autoProjectBaseDataEnrichment: "Lance automatiquement l’enrichissement des données Géorisques après modification de la localisation projet.",
    autoAnalysisAfterUpload: "Lance automatiquement l’analyse spécialisée après dépôt réussi d’un document.",
    autoComparePreviousVersion: "Prévu pour comparer automatiquement une version déposée à la précédente.",
    autoDetectInconsistencies: "Prévu pour signaler automatiquement des incohérences inter-documents ou intra-document.",
    autoGenerateReport: "Prévu pour générer automatiquement un rapport ou une synthèse d’analyse.",
    autoNotify: "Prévu pour déclencher automatiquement les notifications liées aux activités du projet."
  };

  return descriptions[item.key] || "Automatisation projet configurable.";
}

function renderAutomationsFeatureCard() {
  return `
    <div class="settings-features-card">
      <div class="settings-features-card__title">Principales automatisations</div>
      <div class="settings-features-list">
        ${getAutomationCatalogList().map((item) => {
          const isImplemented = !!item.implemented;
          const inputId = `automationToggle_${item.key}`;
          const checked = isAutomationEnabled(item.key);

          return `
            <label
              class="settings-feature-row ${isImplemented ? "" : "settings-feature-row--disabled"}"
              for="${escapeHtml(inputId)}"
            >
              <div class="settings-feature-row__control">
                <input
                  id="${escapeHtml(inputId)}"
                  type="checkbox"
                  data-project-automation-toggle="${escapeHtml(item.key)}"
                  ${checked ? "checked" : ""}
                  ${isImplemented ? "" : "disabled"}
                >
              </div>
              <div class="settings-feature-row__body">
                <div class="settings-feature-row__top">
                  <div class="settings-feature-row__label">${escapeHtml(item.label)}</div>
                  ${isImplemented
                    ? `<span class="settings-feature-row__meta">PoC actif</span>`
                    : `<span class="settings-feature-row__meta settings-feature-row__meta--muted">Non implémenté</span>`}
                </div>
                <div class="settings-feature-row__desc">${escapeHtml(getAutomationItemDescription(item))}</div>
              </div>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function bindProjectAutomationToggles() {
  document.querySelectorAll("[data-project-automation-toggle]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const target = event.currentTarget;
      const automationKey = target?.getAttribute("data-project-automation-toggle");
      if (!automationKey) return;

      const applied = setAutomationEnabled(automationKey, !!target.checked);
      if (!applied) {
        target.checked = isAutomationEnabled(automationKey);
        return;
      }

      persistCurrentProjectState();
      rerenderProjectParametres();
    });
  });
}

export function renderAutomatisationsParametresContent() {
  return `${renderSettingsBlock({
    id: "parametres-automatisations",
    title: "",
    lead: "",
    cards: [
      renderSectionCard({
        title: "Automatisations",
        description: "Ces réglages préfigurent une future logique de niveau de service. Deux automatisations sont activables dans le PoC actuel.",
        badge: "PoC",
        body: renderAutomationsFeatureCard()
      })
    ]
  })}`;
}

export function bindAutomatisationsParametresSection(root) {
  bindBaseParametresUi();
  bindProjectAutomationToggles();
}

export function getAutomatisationsProjectParametresTab() {
  return {
    id: "parametres-automatisations",
    label: "Automatisations",
    iconName: "checklist",
    isPrimary: false,
    renderContent: () => renderAutomatisationsParametresContent(),
    bind: (root) => bindAutomatisationsParametresSection(root)
  };
}
