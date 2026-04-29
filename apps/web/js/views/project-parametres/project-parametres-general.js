import { store } from "../../store.js";
import { PROJECT_TAB_IDS } from "../../constants.js";
import { escapeHtml } from "../../utils/escape-html.js";
import { bindGhEditableFields, renderGhEditableField } from "../ui/gh-input.js";
import {
  persistCurrentProjectNameToSupabase,
  syncCurrentProjectIdentityFromSupabase
} from "../../services/project-supabase-sync.js";
import {
  renderSettingsBlock,
  renderSectionCard,
  bindBaseParametresUi,
  bindProjectTabToggles,
  refreshProjectTabsVisibility
} from "./project-parametres-core.js";

function renderProjectTabsFeatureCard(projectTabs) {
  const items = [
    {
      id: "tabVisibilityAtelier",
      key: PROJECT_TAB_IDS.STUDIO,
      label: "Atelier",
      description: "Affiche l’onglet Atelier et ses vues métier de travail projet."
    },
    {
      id: "tabVisibilitySituations",
      key: PROJECT_TAB_IDS.SITUATIONS,
      label: "Situations",
      description: "Affiche l’onglet Situations pour suivre les jalons et points clés du projet."
    }
  ];

  return `
    <div class="settings-features-card">
      <div class="settings-features-card__title">Fonctionnalités</div>
      <div class="settings-features-list">
        ${items.map((item) => `
          <label class="settings-feature-row" for="${escapeHtml(item.id)}">
            <div class="settings-feature-row__control">
              <input
                id="${escapeHtml(item.id)}"
                type="checkbox"
                data-project-tab-toggle="${escapeHtml(item.key)}"
                ${projectTabs?.[item.key] !== false ? "checked" : ""}
              >
            </div>
            <div class="settings-feature-row__body">
              <div class="settings-feature-row__label">${escapeHtml(item.label)}</div>
              <div class="settings-feature-row__desc">${escapeHtml(item.description)}</div>
            </div>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function resolveProjectCreatedAt() {
  return store?.currentProject?.created_at
    || store?.projectForm?.project?.created_at
    || store?.projectForm?.created_at
    || null;
}

function formatProjectCreatedAt(createdAtValue) {
  const createdAt = new Date(createdAtValue || "");
  if (Number.isNaN(createdAt.getTime())) return "Date inconnue";
  return createdAt.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC"
  }).replace(",", " ·");
}

export function renderGeneralParametresContent() {
  const form = store.projectForm;
  const projectCreatedAt = formatProjectCreatedAt(resolveProjectCreatedAt());

  return `${renderSettingsBlock({
    id: "parametres-general",
    title: "",
    lead: "",
    isActive: true,
    isHero: false,
    cards: [
      renderSectionCard({
        title: "Nom du projet",
        description: "Ajouter ou modifier le nom de votre projet.",
        body: `<div class="form-row form-row--settings"><label for="projectName">Nom de projet</label></div>
        ${renderGhEditableField({ id: "projectName", label: "", value: form.projectName || "", placeholder: "Projet demo" })}
        <div class="form-row form-row--settings"><label>Date de création du projet</label></div>
        <div class="project-general-created-at">
          <div class="project-general-created-at__value">${escapeHtml(projectCreatedAt)}</div>
        </div>`
      }),
      renderSectionCard({
        title: "Fonctionnalités du projet",
        description: "Active ou masque certaines fonctionnalités optionnelles dans l’en-tête projet.",
        body: renderProjectTabsFeatureCard(form.projectTabs || {})
      })
    ]
  })}`;
}

export function bindGeneralParametresSection(root) {
  bindBaseParametresUi();

  if (!resolveProjectCreatedAt()) {
    syncCurrentProjectIdentityFromSupabase().catch((error) => {
      console.warn("syncCurrentProjectIdentityFromSupabase failed", error);
    });
  }

  bindGhEditableFields(document, {
    onValidate: async (id, value) => {
      if (id !== "projectName") return;

      const previousProjectName = String(store.projectForm.projectName || store.currentProject?.name || "Projet demo");
      persistCurrentProjectNameToSupabase(value).catch((error) => {
        console.warn("persistCurrentProjectNameToSupabase failed", error);
        persistCurrentProjectNameToSupabase(previousProjectName).catch(() => undefined);
      });
    }
  });

  bindProjectTabToggles();
  refreshProjectTabsVisibility();
}

export function getGeneralProjectParametresTab() {
  return {
    id: "parametres-general",
    label: "Général",
    iconName: "gear",
    isPrimary: true,
    renderContent: () => renderGeneralParametresContent(),
    bind: (root) => bindGeneralParametresSection(root)
  };
}
