import {
  getAgentCatalogList,
  isAgentEnabled,
  setAgentEnabled
} from "../../services/project-automation.js";
import { persistCurrentProjectState } from "../../services/project-state-storage.js";
import { escapeHtml } from "../../utils/escape-html.js";
import {
  renderSettingsBlock,
  renderSectionCard,
  bindBaseParametresUi,
  rerenderProjectParametres
} from "./project-parametres-core.js";

function getAgentItemDescription(item) {
  const descriptions = {
    solidite: "Visible pour exposer la trajectoire produit. Non implémenté dans le PoC actuel.",
    incendie: "Visible pour exposer la trajectoire produit. Non implémenté dans le PoC actuel.",
    pmr: "Visible pour exposer la trajectoire produit. Non implémenté dans le PoC actuel.",
    parasismique: "Agent actuellement opérationnel dans le PoC. Utilisé pour les analyses spécialisées disponibles.",
    thermique: "Visible pour exposer la trajectoire produit. Non implémenté dans le PoC actuel.",
    acoustique: "Visible pour exposer la trajectoire produit. Non implémenté dans le PoC actuel."
  };

  return descriptions[item.key] || "Configuration d’agent spécialisée du projet.";
}

function renderAgentsFeatureCard() {
  return `
    <div class="settings-features-card">
      <div class="settings-features-card__title">Agents spécialisés activables</div>
      <div class="settings-features-list">
        ${getAgentCatalogList().map((item) => {
          const isImplemented = !!item.implemented;
          const inputId = `agentToggle_${item.key}`;
          const checked = isAgentEnabled(item.key);

          return `
            <label
              class="settings-feature-row ${isImplemented ? "" : "settings-feature-row--disabled"}"
              for="${escapeHtml(inputId)}"
            >
              <div class="settings-feature-row__control">
                <input
                  id="${escapeHtml(inputId)}"
                  type="checkbox"
                  data-project-agent-toggle="${escapeHtml(item.key)}"
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
                <div class="settings-feature-row__desc">${escapeHtml(getAgentItemDescription(item))}</div>
              </div>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function bindProjectAgentToggles() {
  document.querySelectorAll("[data-project-agent-toggle]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const target = event.currentTarget;
      const agentKey = target?.getAttribute("data-project-agent-toggle");
      if (!agentKey) return;

      const applied = setAgentEnabled(agentKey, !!target.checked);
      if (!applied) {
        target.checked = isAgentEnabled(agentKey);
        return;
      }

      persistCurrentProjectState();
      rerenderProjectParametres();
    });
  });
}

export function renderAgentsParametresContent() {
  return `${renderSettingsBlock({
    id: "parametres-agents-actives",
    title: "",
    lead: "",
    cards: [
      renderSectionCard({
        title: "Agents activés",
        description: "Active les agents spécialisés disponibles pour ce projet. Le PoC expose déjà la structure cible, avec un seul agent actuellement implémenté.",
        badge: "PoC",
        body: renderAgentsFeatureCard()
      })
    ]
  })}`;
}

export function bindAgentsParametresSection(root) {
  bindBaseParametresUi();
  bindProjectAgentToggles();
}

export function getAgentsProjectParametresTab() {
  return {
    id: "parametres-agents-actives",
    label: "Agents activés",
    iconName: "shield",
    isPrimary: false,
    renderContent: () => renderAgentsParametresContent(),
    bind: (root) => bindAgentsParametresSection(root)
  };
}
