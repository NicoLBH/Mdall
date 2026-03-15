import { store, DEFAULT_PROJECT_PHASES } from "../store.js";
import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import {
  DEFAULT_PROJECT_TABS_VISIBILITY,
  PROJECT_TAB_IDS,
  isToggleableProjectTab
} from "../constants.js";
import { svgIcon } from "../ui/icons.js";
import { renderGhEditableField, bindGhEditableFields } from "./ui/gh-input.js";
import { renderGhSelectMenu, bindGhSelectMenus, bindGhActionButtons } from "./ui/gh-split-button.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem,
  renderSideNavSeparator,
  bindSideNavPanels
} from "./ui/side-nav-layout.js";
import {
  ensureProjectAutomationDefaults,
  getAgentCatalogList,
  getAutomationCatalogList,
  isAgentEnabled,
  isAutomationEnabled,
  setAgentEnabled,
  setAutomationEnabled
} from "../services/project-automation.js";
import { escapeHtml } from "../utils/escape-html.js";

const DEFAULT_PROJECT_COLLABORATORS = [
  { id: "collab-1", email: "nicolas.lebihan@socotec.com", status: "Actif", role: "Admin" },
  { id: "collab-2", email: "nicolas.lebihan@yahoo.fr", status: "Invitation en attente", role: "Lecteur" },
  { id: "collab-3", email: "marie.durand@socotec.com", status: "Actif", role: "Éditeur" },
  { id: "collab-4", email: "paul.martin@bet-structure.fr", status: "Actif", role: "Contributeur" }
];

const parametresUiState = {
  collaboratorsModalOpen: false,
  collaboratorDraftEmail: "",
  activeSectionId: "parametres-general"
};

let currentParametresRoot = null;

function cloneDefaultProjectPhases() {
  return DEFAULT_PROJECT_PHASES.map((item) => ({ ...item }));
}

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

function renderCurrentProjectPhaseCard() {
  const enabledPhases = getEnabledProjectPhases();
  const fallbackPhase = enabledPhases[0]?.code || "APS";
  const currentPhase = enabledPhases.some((item) => item.code === store.projectForm.currentPhase)
    ? store.projectForm.currentPhase
    : fallbackPhase;

  return `
    <div class="settings-form-grid settings-form-grid--thirds">
      ${renderSelectField({
        id: "currentProjectPhase",
        label: "",
        value: currentPhase,
        options: enabledPhases.map((item) => ({
          value: item.code,
          label: `${item.code} - ${item.label}`
        }))
      })}
    </div>
  `;
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

function importanceCodeToLabel(value) {
  const normalized = String(value || "").trim();

  if (normalized === "I" || normalized === "Catégorie d'importance I") return "Catégorie d'importance I";
  if (normalized === "II" || normalized === "Catégorie d'importance II") return "Catégorie d'importance II";
  if (normalized === "III" || normalized === "Catégorie d'importance III") return "Catégorie d'importance III";
  if (normalized === "IV" || normalized === "Catégorie d'importance IV") return "Catégorie d'importance IV";

  return "Catégorie d'importance II";
}

function importanceLabelToCode(value) {
  const normalized = String(value || "").trim();

  if (normalized === "Catégorie d'importance I" || normalized === "I") return "I";
  if (normalized === "Catégorie d'importance II" || normalized === "II") return "II";
  if (normalized === "Catégorie d'importance III" || normalized === "III") return "III";
  if (normalized === "Catégorie d'importance IV" || normalized === "IV") return "IV";

  return "II";
}

function liquefactionCodeToLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "yes" ||
    normalized === "true" ||
    normalized === "sol liquéfiable" ||
    normalized === "sol liquefiable"
  ) {
    return "Sol liquéfiable";
  }

  if (
    normalized === "no" ||
    normalized === "false" ||
    normalized === "sol non liquéfiable" ||
    normalized === "sol non liquefiable" ||
    normalized === ""
  ) {
    return "Sol non liquéfiable";
  }

  if (normalized === "non défini à ce stade" || normalized === "non defini a ce stade") {
    return "Non défini à ce stade";
  }

  return "Sol non liquéfiable";
}

function liquefactionLabelToCode(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "sol liquéfiable" || normalized === "sol liquefiable") return "yes";
  if (normalized === "non défini à ce stade" || normalized === "non defini a ce stade") return "";
  return "no";
}

function ensureProjectFormDefaults() {
  const form = store.projectForm;

  if (typeof form.projectName !== "string" || !form.projectName.trim()) {
    form.projectName = "Projet demo";
  }

  if (typeof form.city !== "string" || !form.city.trim()) {
    form.city = "Annecy";
  }

  if (typeof form.postalCode !== "string" || !form.postalCode.trim()) {
    form.postalCode = "74000";
  }

  if (typeof form.zoneSismique !== "string" || !form.zoneSismique.trim()) {
    form.zoneSismique = "4";
  }

  const rawCatalog = Array.isArray(form.phasesCatalog) ? form.phasesCatalog : [];
  const defaultCatalog = cloneDefaultProjectPhases();

  form.phasesCatalog = defaultCatalog.map((defaultItem) => {
    const existing = rawCatalog.find((item) => String(item?.code || "").trim() === defaultItem.code);
    return {
      code: defaultItem.code,
      label: defaultItem.label,
      enabled: existing?.enabled !== false
    };
  });

  const enabledPhases = form.phasesCatalog.filter((item) => item.enabled);
  const fallbackPhase = enabledPhases[0]?.code || defaultCatalog[0]?.code || "APS";

  const legacyPhase =
    typeof form.phase === "string" && form.phase.trim()
      ? form.phase.trim()
      : "";

  if (
    typeof form.currentPhase !== "string" ||
    !form.currentPhase.trim() ||
    !enabledPhases.some((item) => item.code === form.currentPhase)
  ) {
    form.currentPhase = enabledPhases.some((item) => item.code === legacyPhase)
      ? legacyPhase
      : fallbackPhase;
  }

  if (
    typeof form.phase !== "string" ||
    !form.phase.trim() ||
    !enabledPhases.some((item) => item.code === form.phase)
  ) {
    form.phase = form.currentPhase;
  }

  if (typeof form.referential !== "string" || !form.referential.trim()) {
    form.referential = "EC8";
  }

  if (typeof form.soilClass !== "string" || !form.soilClass.trim()) {
    form.soilClass = "A";
  }

  if (typeof form.riskCategory !== "string" || !form.riskCategory.trim()) {
    form.riskCategory = "Risque normal";
  }

  if ((!form.city || !form.postalCode) && form.communeCp) {
    const raw = String(form.communeCp).trim();
    const match = raw.match(/^(.*?)(?:\s*[,-]?\s*)(\d{4,5})$/);
    if (match) {
      form.city = form.city || match[1].trim();
      form.postalCode = form.postalCode || match[2].trim();
    } else {
      form.city = form.city || raw;
    }
  }

  form.communeCp = [form.city, form.postalCode].filter(Boolean).join(" ").trim();

  form.importance = importanceLabelToCode(form.importance || form.importanceCategory || "II");
  form.importanceCategory = importanceCodeToLabel(form.importanceCategory || form.importance || "II");

  form.liquefactionText = liquefactionCodeToLabel(form.liquefactionText || form.liquefaction || "no");
  form.liquefaction = liquefactionLabelToCode(form.liquefactionText || form.liquefaction || "no");

  form.projectTabs = Object.fromEntries(
    Object.entries(DEFAULT_PROJECT_TABS_VISIBILITY).map(([tabId, defaultValue]) => {
      const currentValue = form.projectTabs?.[tabId];
      return [tabId, typeof currentValue === "boolean" ? currentValue : defaultValue];
    })
  );

  if (!Array.isArray(form.collaborators) || !form.collaborators.length) {
    form.collaborators = DEFAULT_PROJECT_COLLABORATORS.map((item) => ({ ...item }));
  }
}

function renderNavIcon(name) {
  const icons = {
    general: svgIcon("gear", { className: "octicon octicon-gear" }),
    people: svgIcon("people", { className: "octicon octicon-people" }),
    pin: svgIcon("pin", { className: "octicon" }),
    book: svgIcon("book", { className: "octicon" }),
    shield: svgIcon("shield", { className: "octicon" }),
    checklist: svgIcon("checklist", { className: "octicon" })
  };
  return icons[name] || icons.general;
}

const PARAMETRES_NAV_GROUPS = [
  {
    title: "Paramètres",
    items: [
      { targetId: "parametres-general", label: "Général", icon: "general", isPrimary: true, isActive: true }
    ]
  },
  {
    sectionLabel: "Données de base projet",
    items: [
      { targetId: "parametres-localisation", label: "Localisation", icon: "pin" },
      { targetId: "parametres-phase", label: "Phase", icon: "checklist" },
      { targetId: "parametres-collaborateurs", label: "Collaborateurs", icon: "people" },
      { targetId: "parametres-agents-actives", label: "Agents activés", icon: "shield" },
      { targetId: "parametres-lots", label: "Lots", icon: "book" },
      { targetId: "parametres-zones-batiments", label: "Zones / bâtiments / niveaux", icon: "book" }
    ]
  },
  {
    sectionLabel: "Référentiels techniques et réglementaires",
    items: [
      { targetId: "parametres-zones-reglementaires", label: "Solidité des ouvrages", icon: "shield" },
      { targetId: "parametres-incendie", label: "Sécurité incendie", icon: "shield" },
      { targetId: "parametres-accessibilite", label: "Accessibilité PMR", icon: "shield" },
      { targetId: "parametres-parasismiques", label: "Protection parasismique", icon: "shield" },
      { targetId: "parametres-thermiques", label: "Performances thermiques", icon: "book" },
      { targetId: "parametres-acoustique", label: "Performances acoustiques", icon: "book" },
      { targetId: "parametres-normes", label: "DTU / Eurocodes / normes", icon: "book" },
      { targetId: "parametres-doctrines", label: "Doctrines particulières MOA", icon: "book" }
    ]
  },
  {
    sectionLabel: "Gouvernance",
    items: [
      { targetId: "parametres-droits", label: "Droits par acteur", icon: "people" },
      { targetId: "parametres-circuits", label: "Circuits de validation", icon: "checklist" },
      { targetId: "parametres-taxonomie", label: "Taxonomie des sujets", icon: "book" },
      { targetId: "parametres-criticite", label: "Règles de criticité", icon: "shield" },
      { targetId: "parametres-nomenclature", label: "Nomenclature documentaire", icon: "book" },
      { targetId: "parametres-workflow-pr", label: "Workflow de PR", icon: "checklist" },
      { targetId: "parametres-cloture", label: "Politique de clôture des sujets", icon: "shield" }
    ]
  },
  {
    sectionLabel: "Paramètres opérationnels",
    items: [
      { targetId: "parametres-jalons", label: "Jalons", icon: "checklist" },
      { targetId: "parametres-responsabilites", label: "Responsabilités", icon: "people" },
      { targetId: "parametres-automatisations", label: "Automatisations", icon: "checklist" },
      { targetId: "parametres-champs", label: "Champs obligatoires", icon: "checklist" },
      { targetId: "parametres-modeles", label: "Modèles de documents", icon: "book" },
      { targetId: "parametres-templates", label: "Templates de remarques", icon: "book" },
      { targetId: "parametres-diffusion", label: "Matrices de diffusion", icon: "people" }
    ]
  }
];

function renderParametresNav() {
  return PARAMETRES_NAV_GROUPS.map((group, groupIndex) => {
    const html = renderSideNavGroup({
      title: group.title || "",
      sectionLabel: group.sectionLabel || "",
      className: groupIndex === 0 ? "settings-nav__group settings-nav__group--project" : "settings-nav__group settings-nav__group--project",
      items: group.items.map((item) =>
        renderSideNavItem({
          label: item.label,
          targetId: item.targetId,
          iconHtml: renderNavIcon(item.icon),
          isActive: !!item.isActive,
          isPrimary: !!item.isPrimary
        })
      )
    });

    if (groupIndex === PARAMETRES_NAV_GROUPS.length - 1) return html;
    return `${html}${renderSideNavSeparator()}`;
  }).join("");
}

function renderSectionCard({ id = "", title, description = "", body = "", badge = "" }) {
  return `
    <div class="settings-card settings-card--param" ${id ? `id="${escapeHtml(id)}"` : ""}>
      <div class="settings-card__head">
        <div>
          <h4>${escapeHtml(title)}</h4>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
        ${badge ? `<span class="settings-badge mono">${escapeHtml(badge)}</span>` : ""}
      </div>
      ${body}
    </div>
  `;
}

function renderInputField({ id, label, value = "", placeholder = "", width = "" }) {
  return `
    <div class="${width}">
      ${renderGhEditableField({
        id,
        label,
        value,
        placeholder
      })}
    </div>
  `;
}

function renderSelectField({ id, label, value = "", options = [] }) {
  return renderGhSelectMenu({
    id,
    label,
    value,
    options,
    tone: "default",
    size: "md"
  });
}

function renderPlaceholderList(items) {
  return `
    <ul class="settings-list settings-list--tight">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderProjectTabsFeatureCard(projectTabs) {
  const items = [
    {
      id: "tabVisibilityPropositions",
      key: PROJECT_TAB_IDS.PROPOSITIONS,
      label: "Propositions",
      description: "Affiche l’onglet Propositions dans la barre d’onglets du projet."
    },
    {
      id: "tabVisibilityDiscussions",
      key: PROJECT_TAB_IDS.DISCUSSIONS,
      label: "Discussions",
      description: "Affiche l’onglet Discussions pour les échanges de coordination."
    },
    {
      id: "tabVisibilityPilotage",
      key: PROJECT_TAB_IDS.PILOTAGE,
      label: "Pilotage",
      description: "Affiche l’onglet Pilotage actuellement branché sur les jalons projet."
    },
    {
      id: "tabVisibilityReferentiel",
      key: PROJECT_TAB_IDS.REFERENTIEL,
      label: "Référentiel",
      description: "Affiche l’onglet Référentiel dans la navigation projet."
    },
    {
      id: "tabVisibilityRisquesSecurite",
      key: PROJECT_TAB_IDS.RISQUES_SECURITE,
      label: "Risques & sécurité",
      description: "Affiche l’onglet Risques & sécurité dans la navigation projet."
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

function getAutomationItemDescription(item) {
  const descriptions = {
    autoAnalysisAfterUpload: "Lance automatiquement l’analyse spécialisée après dépôt réussi d’un document.",
    autoComparePreviousVersion: "Prévu pour comparer automatiquement une version déposée à la précédente.",
    autoDetectInconsistencies: "Prévu pour signaler automatiquement des incohérences inter-documents ou intra-document.",
    autoGenerateReport: "Prévu pour générer automatiquement un rapport ou une synthèse d’analyse.",
    autoNotify: "Prévu pour déclencher automatiquement les notifications liées aux activités du projet."
  };

  return descriptions[item.key] || "Automatisation projet configurable.";
}

function renderToggleSettingsCard({
  title,
  items = [],
  kind = "automation"
}) {
  return `
    <div class="settings-features-card">
      <div class="settings-features-card__title">${escapeHtml(title)}</div>
      <div class="settings-features-list">
        ${items.map((item) => {
          const isImplemented = !!item.implemented;
          const inputId = `${kind}Toggle_${item.key}`;
          const dataAttr =
            kind === "agent"
              ? `data-project-agent-toggle="${escapeHtml(item.key)}"`
              : `data-project-automation-toggle="${escapeHtml(item.key)}"`;
          const checked =
            kind === "agent"
              ? isAgentEnabled(item.key)
              : isAutomationEnabled(item.key);

          return `
            <label
              class="settings-feature-row ${isImplemented ? "" : "settings-feature-row--disabled"}"
              for="${escapeHtml(inputId)}"
            >
              <div class="settings-feature-row__control">
                <input
                  id="${escapeHtml(inputId)}"
                  type="checkbox"
                  ${dataAttr}
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
                <div class="settings-feature-row__desc">
                  ${escapeHtml(
                    kind === "agent"
                      ? getAgentItemDescription(item)
                      : getAutomationItemDescription(item)
                  )}
                </div>
              </div>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderAgentsFeatureCard() {
  return renderToggleSettingsCard({
    title: "Agents spécialisés activables",
    kind: "agent",
    items: getAgentCatalogList()
  });
}

function renderAutomationsFeatureCard() {
  return renderToggleSettingsCard({
    title: "Principales automatisations",
    kind: "automation",
    items: getAutomationCatalogList()
  });
}

function renderSettingsBlock({ id, title, lead = "", cards = [], isActive = false, isHero = false }) {
  return `
    <section
      class="settings-block ${isActive ? "is-active" : ""} ${isHero ? "settings-block--hero" : ""}"
      data-settings-block="${escapeHtml(id)}"
      data-side-nav-panel="${escapeHtml(id)}"
    >
      ${isHero ? `
        <header class="settings-page-header settings-page-header--parametres">
          <h2>${escapeHtml(title)}</h2>
          ${lead ? `<p>${escapeHtml(lead)}</p>` : ""}
        </header>
      ` : `
        <div class="settings-block__head">
          <h3>${escapeHtml(title)}</h3>
          ${lead ? `<p class="settings-lead">${escapeHtml(lead)}</p>` : ""}
        </div>
      `}
      ${cards.join("")}
    </section>
  `;
}

function renderCollaboratorsRows(collaborators = []) {
  if (!collaborators.length) {
    return `
      <div class="project-collaborators__empty">
        Aucun collaborateur pour le moment.
      </div>
    `;
  }

  return collaborators.map((item) => `
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
        <div class="project-collaborators__email">${escapeHtml(item.email)}</div>
        <div class="project-collaborators__sub mono">${escapeHtml(item.status || "Actif")}</div>
      </div>

      <div class="project-collaborators__cell project-collaborators__cell--role mono">
        ${escapeHtml(item.role || "Lecteur")}
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
  `).join("");
}

function renderCollaboratorsCard() {
  const collaborators = Array.isArray(store.projectForm.collaborators)
    ? store.projectForm.collaborators
    : [];

  return `
    <div class="project-collaborators">
      <div class="project-collaborators__toolbar">
        <div class="project-collaborators__toolbar-left">
          <div class="project-collaborators__toolbar-title">Liste des collaborateurs</div>
          <div class="project-collaborators__toolbar-sub">Quelques données fictives pour la démo UI.</div>
        </div>

        <div class="project-collaborators__toolbar-right">
          <button
            type="button"
            class="gh-btn"
            data-open-collaborator-modal="true"
          >
            Ajouter une personne
          </button>
        </div>
      </div>

      <div class="project-collaborators__table">
        <div class="project-collaborators__head">
          <div class="project-collaborators__cell project-collaborators__cell--checkbox">
            <input type="checkbox" disabled>
          </div>
          <div class="project-collaborators__cell project-collaborators__cell--mail-icon"></div>
          <div class="project-collaborators__cell project-collaborators__cell--email">Adresse e-mail</div>
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

function renderCollaboratorModal() {
  if (!parametresUiState.collaboratorsModalOpen) return "";

  return `
    <div class="project-collaborators-modal" id="projectCollaboratorsModal">
      <div class="project-collaborators-modal__backdrop" data-close-collaborator-modal="true"></div>

      <div class="project-collaborators-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="projectCollaboratorsModalTitle">
        <div class="project-collaborators-modal__head">
          <h3 id="projectCollaboratorsModalTitle" class="project-collaborators-modal__title">
            Ajouter une personne
          </h3>

          <button
            type="button"
            class="project-collaborators-modal__close"
            data-close-collaborator-modal="true"
            aria-label="Fermer"
          >
            ${svgIcon("x")}
          </button>
        </div>

        <div class="project-collaborators-modal__body">
          <label class="project-collaborators-modal__label" for="projectCollaboratorEmail">
            Adresse e-mail
          </label>

          <div class="project-collaborators-modal__input-wrap">
            <span class="project-collaborators-modal__input-icon">
              ${svgIcon("mail", { width: 18, height: 18 })}
            </span>

            <input
              id="projectCollaboratorEmail"
              class="project-collaborators-modal__input"
              type="email"
              value="${escapeHtml(parametresUiState.collaboratorDraftEmail)}"
              placeholder="prenom.nom@entreprise.com"
            >
          </div>
        </div>

        <div class="project-collaborators-modal__footer">
          <button
            type="button"
            class="gh-btn"
            data-close-collaborator-modal="true"
          >
            Annuler
          </button>

          <button
            type="button"
            class="gh-btn gh-btn--primary"
            data-submit-collaborator="true"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  `;
}

function captureActiveParametresSection() {
  const activeNavBtn = document.querySelector(".project-settings-nav__item.is-active,[data-settings-nav].is-active");
  if (activeNavBtn) {
    const target =
      activeNavBtn.getAttribute("data-settings-nav-target") ||
      activeNavBtn.getAttribute("data-target") ||
      activeNavBtn.dataset.settingsNavTarget ||
      activeNavBtn.dataset.target;

    if (target) {
      parametresUiState.activeSectionId = target;
      return;
    }
  }

  const visibleSection = document.querySelector(".project-settings-section.is-active,[data-settings-section].is-active");
  if (visibleSection?.id) {
    parametresUiState.activeSectionId = visibleSection.id;
  }
}

function rerenderProjectParametres() {
  if (!currentParametresRoot) return;
  captureActiveParametresSection();
  renderProjectParametres(currentParametresRoot);
}

function openCollaboratorModal() {
  parametresUiState.collaboratorsModalOpen = true;
  parametresUiState.collaboratorDraftEmail = "";
  rerenderProjectParametres();
}

function closeCollaboratorModal() {
  parametresUiState.collaboratorsModalOpen = false;
  parametresUiState.collaboratorDraftEmail = "";
  rerenderProjectParametres();
}

function submitCollaboratorDraft() {
  const email = String(parametresUiState.collaboratorDraftEmail || "").trim();
  if (!email) return;

  if (!Array.isArray(store.projectForm.collaborators)) {
    store.projectForm.collaborators = [];
  }

  store.projectForm.collaborators.unshift({
    id: `collab-${Date.now()}`,
    email,
    status: "Invitation en attente",
    role: "Lecteur"
  });

  parametresUiState.collaboratorsModalOpen = false;
  parametresUiState.collaboratorDraftEmail = "";
  rerenderProjectParametres();
}

function getPageHtml(form) {
  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--parametres">
      <div class="project-simple-scroll project-simple-scroll--parametres" id="projectParametresScroll">
        <div class="settings-shell settings-shell--parametres">
          ${renderSideNavLayout({
            className: "settings-layout settings-layout--parametres",
            navClassName: "settings-nav settings-nav--parametres",
            contentClassName: "settings-content settings-content--parametres",
            navHtml: renderParametresNav(),
            contentHtml: `
              ${renderSettingsBlock({
                id: "parametres-general",
                title: "General",
                lead: "",
                isActive: true,
                isHero: false,
                cards: [
                  renderSectionCard({
                    title: "Nom du projet",
                    description: "Description",
                    body: `<div class="settings-form-grid settings-form-grid--thirds">
                      ${renderInputField({ id: "projectName", label: "Nom de projet", value: form.projectName || "", placeholder: "Projet demo" })}
                    </div>`
                  }),
                  renderSectionCard({
                    title: "Fonctionnalités du projet",
                    description: "Active ou masque certaines fonctionnalités optionnelles dans l’en-tête projet.",
                    body: renderProjectTabsFeatureCard(form.projectTabs || {})
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-localisation",
                title: "Données de base projet",
                lead: "",
                cards: [
                  renderSectionCard({
                    title: "Localisation",
                    description: "Localisation administrative et d’usage du projet.",
                    badge: "LIVE",
                    body: `<div class="settings-form-grid settings-form-grid--thirds">
                      ${renderInputField({ id: "projectCity", label: "Ville", value: form.city || "", placeholder: "Ex. Annecy" })}
                      ${renderInputField({ id: "projectPostalCode", label: "CP", value: form.postalCode || "", placeholder: "Ex. 74000" })}
                    </div>`
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-phase",
                title: "Données de base projet",
                lead: "La phase en cours structure le projet. La liste des phases activées alimente ensuite le menu déroulant de l’onglet Documents.",
                cards: [
                  renderSectionCard({
                    title: "Phase",
                    description: "Phase en cours du projet.",
                    body: renderCurrentProjectPhaseCard()
                  }),
                  renderSectionCard({
                    title: "Phases activables",
                    description: "Les cases sont toutes cochées par défaut. Cette structure est stockée dans le store pour préparer le branchement backend.",
                    body: renderProjectPhasesCard()
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-collaborateurs",
                title: "Données de base projet",
                lead: "",
                cards: [
                  renderSectionCard({
                    title: "Collaborateurs",
                    description: "Gestion des accès projet et suivi des invitations.",
                    body: renderCollaboratorsCard()
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-agents-actives",
                title: "Données de base projet",
                lead: "",
                cards: [
                  renderSectionCard({
                    title: "Agents activés",
                    description: "Active les agents spécialisés disponibles pour ce projet. Le PoC expose déjà la structure cible, avec un seul agent actuellement implémenté.",
                    badge: "PoC",
                    body: renderAgentsFeatureCard()
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-lots",
                title: "Données de base projet",
                lead: "",
                cards: [
                  renderSectionCard({
                    title: "Lots",
                    description: "Organisation des disciplines et périmètres techniques du projet.",
                    body: renderPlaceholderList([
                      "Gros œuvre, structure, fluides, électricité, SSI, VRD, enveloppe, second œuvre, exploitation.",
                      "Découpage compatible avec les tableaux Documents, Situations et Propositions."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-zones-batiments",
                title: "Données de base projet",
                lead: "",
                cards: [
                  renderSectionCard({
                    title: "Zones / bâtiments / niveaux",
                    description: "Découpage spatial utilisé dans les analyses et les livrables.",
                    body: renderPlaceholderList([
                      "Bâtiments, ailes, niveaux, zones techniques, secteurs fonctionnels et zones de diffusion."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-zones-reglementaires",
                title: "Référentiels techniques et réglementaires",
                lead: "Cadre réglementaire principal lié à la solidité et à la structure.",
                cards: [
                  renderSectionCard({
                    title: "Solidité des ouvrages",
                    description: "Références réglementaires, hypothèses générales et domaine d’application.",
                    body: renderPlaceholderList([
                      "Code de la construction, Eurocodes, règles professionnelles, cas particuliers et exigences du programme."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-incendie",
                title: "Référentiels techniques et réglementaires",
                lead: "Corpus incendie principal retenu pour le projet.",
                cards: [
                  renderSectionCard({
                    title: "Règlement incendie applicable",
                    description: "Corpus incendie principal retenu pour le projet.",
                    body: renderPlaceholderList([
                      "ERP / IGH / habitation / bureaux / code du travail / ICPE selon le cas.",
                      "Références d’arrêtés, versions et doctrines internes applicables."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-accessibilite",
                title: "Référentiels techniques et réglementaires",
                lead: "Base normative accessibilité PMR et dispositions complémentaires retenues.",
                cards: [
                  renderSectionCard({
                    title: "Règlement accessibilité",
                    description: "Base normative accessibilité PMR et dispositions complémentaires retenues.",
                    body: renderPlaceholderList([
                      "Exigences réglementaires, cas particuliers, dérogations et pièces justificatives attendues."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-parasismiques",
                title: "Référentiels techniques et réglementaires",
                lead: "Cadre réglementaire et hypothèses d’entrée du lot parasismique.",
                cards: [
                  renderSectionCard({
                    title: "Protection parasismique",
                    description: "Centralise désormais les paramètres auparavant répartis entre type d’ouvrage et solidité des ouvrages.",
                    badge: "LIVE",
                    body: `<div class="settings-form-grid settings-form-grid--thirds">
                      ${renderSelectField({ id: "riskCategory", label: "Catégorie de risque", value: form.riskCategory || form.risk || "Risque normal", options: ["Risque normal", "Risque spécial"] })}
                      ${renderSelectField({ id: "importanceCategory", label: "Catégorie d'importance", value: form.importanceCategory || form.importance || "II", options: ["Catégorie d'importance I", "Catégorie d'importance II", "Catégorie d'importance III", "Catégorie d'importance IV"] })}
                      ${renderSelectField({ id: "zoneSismique", label: "Zone sismique", value: form.zoneSismique || "4", options: ["1", "2", "3", "4", "5"] })}
                      ${renderSelectField({ id: "liquefactionText", label: "Liquéfaction", value: form.liquefactionText || "Sol non liquéfiable", options: ["Sol non liquéfiable", "Sol liquéfiable", "Non défini à ce stade"] })}
                      ${renderSelectField({ id: "soilClass", label: "Classe de sol", value: form.soilClass || "A", options: ["A", "B", "C", "D", "E"] })}
                      ${renderSelectField({ id: "referential", label: "Référentiel parasismique", value: form.referential || "EC8", options: ["EC8", "PS92"] })}
                    </div>`
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-thermiques",
                title: "Référentiels techniques et réglementaires",
                lead: "Références thermiques et énergétiques applicables.",
                cards: [
                  renderSectionCard({
                    title: "Référentiels thermiques",
                    description: "Références thermiques et énergétiques applicables.",
                    body: renderPlaceholderList([
                      "RE2020, RT existant, labels et exigences contractuelles complémentaires."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-acoustique",
                title: "Référentiels techniques et réglementaires",
                lead: "Normes, objectifs contractuels et seuils d’acceptation acoustiques.",
                cards: [
                  renderSectionCard({
                    title: "Référentiels acoustique",
                    description: "Normes, objectifs contractuels et seuils d’acceptation acoustiques.",
                    body: renderPlaceholderList([
                      "NRA, programmes spécifiques, cahiers des charges de performance et modalités de contrôle."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-normes",
                title: "Référentiels techniques et réglementaires",
                lead: "Bibliothèque normative de référence du projet.",
                cards: [
                  renderSectionCard({
                    title: "DTU / Eurocodes / normes projet",
                    description: "Bibliothèque normative de référence du projet.",
                    body: renderPlaceholderList([
                      "DTU, Eurocodes, NF, guides, règles professionnelles et prescriptions spécifiques."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-doctrines",
                title: "Référentiels techniques",
                lead: "Exigences internes et doctrines projet non strictement réglementaires.",
                cards: [
                  renderSectionCard({
                    title: "Doctrines particulières du maître d’ouvrage",
                    description: "Exigences internes et doctrines projet non strictement réglementaires.",
                    body: renderPlaceholderList([
                      "Standards internes, listes rouges, bibliothèques de détails, prescriptions d’exploitation et d’entretien."
                    ])
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-droits",
                title: "Gouvernance",
                lead: "Garde-fous organisationnels qui encadrent la production, la revue, la qualification et la clôture.",
                cards: [
                  renderSectionCard({ title: "Droits par acteur", body: renderPlaceholderList(["Droits d’ouverture, commentaire, validation, rejet, diffusion et clôture par rôle."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-circuits",
                title: "Gouvernance",
                lead: "Règles d’approbation et d’escalade du projet.",
                cards: [
                  renderSectionCard({ title: "Circuits de validation", body: renderPlaceholderList(["Règles d’approbation, escalade, quorum et cas bloquants selon la nature du sujet."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-taxonomie",
                title: "Gouvernance",
                lead: "Structuration de la classification métier.",
                cards: [
                  renderSectionCard({ title: "Taxonomie des sujets", body: renderPlaceholderList(["Arborescence de thèmes, sous-thèmes, disciplines et codes de classification réutilisés partout."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-criticite",
                title: "Gouvernance",
                lead: "Critères de sévérité, impact et urgence.",
                cards: [
                  renderSectionCard({ title: "Règles de criticité", body: renderPlaceholderList(["Critères de sévérité, probabilité, impact, urgence et seuils d’alerte."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-nomenclature",
                title: "Gouvernance",
                lead: "Convention de nommage et d’identification documentaire.",
                cards: [
                  renderSectionCard({ title: "Nomenclature documentaire", body: renderPlaceholderList(["Convention de nommage, identifiants, versions, lots, zones et statuts documentaires."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-workflow-pr",
                title: "Gouvernance",
                lead: "Cadre de traitement des propositions.",
                cards: [
                  renderSectionCard({ title: "Workflow de PR", body: renderPlaceholderList(["Règles d’ouverture, revue, approbation, intégration et traçabilité des propositions."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-cloture",
                title: "Gouvernance",
                lead: "Règles de fermeture et de réouverture.",
                cards: [
                  renderSectionCard({ title: "Politique de clôture des sujets", body: renderPlaceholderList(["Preuves minimales, validations attendues et critères de fermeture / réouverture."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-jalons",
                title: "Paramètres opérationnels",
                lead: "Échéances et points de passage du projet.",
                cards: [
                  renderSectionCard({ title: "Jalons", body: renderPlaceholderList(["Jalons de revue, échéances, fenêtres de diffusion et points de contrôle."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-responsabilites",
                title: "Paramètres opérationnels",
                lead: "Répartition des rôles d’exécution.",
                cards: [
                  renderSectionCard({ title: "Responsabilités", body: renderPlaceholderList(["Répartition RACI ou équivalent par type d’action, lot et phase."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-champs",
                title: "Paramètres opérationnels",
                lead: "Informations minimales imposées selon les objets créés.",
                cards: [
                  renderSectionCard({ title: "Champs obligatoires", body: renderPlaceholderList(["Données minimales exigées selon l’objet créé : sujet, avis, document, proposition, diffusion."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-modeles",
                title: "Paramètres opérationnels",
                lead: "Gabarits de livrables et supports projet.",
                cards: [
                  renderSectionCard({ title: "Modèles de documents", body: renderPlaceholderList(["Gabarits de fiches, bordereaux, rapports, notices et documents de synthèse."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-automatisations",
                title: "Paramètres opérationnels",
                lead: "Configuration des comportements automatiques principaux de Rapsobot pour ce projet.",
                cards: [
                  renderSectionCard({
                    title: "Automatisations",
                    description: "Ces réglages préfigurent une future logique de niveau de service. Une seule automatisation est activable dans le PoC actuel.",
                    badge: "PoC",
                    body: renderAutomationsFeatureCard()
                  })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-templates",
                title: "Paramètres opérationnels",
                lead: "Bibliothèque de formulations réutilisables.",
                cards: [
                  renderSectionCard({ title: "Templates de remarques", body: renderPlaceholderList(["Bibliothèque de formulations normalisées par discipline et niveau de criticité."]) })
                ]
              })}

              ${renderSettingsBlock({
                id: "parametres-diffusion",
                title: "Paramètres opérationnels",
                lead: "Règles de diffusion selon le contexte et les destinataires.",
                cards: [
                  renderSectionCard({ title: "Matrices de diffusion", body: renderPlaceholderList(["Destinataires, visas, pièces jointes et conditions de diffusion selon le contexte."]) })
                ]
              })}
            `
          })}
        </div>
      </div>
    </section>
    
    ${renderCollaboratorModal()}
  `;
}

export function renderProjectParametres(root) {
  ensureProjectFormDefaults();
  ensureProjectAutomationDefaults();

  root.className = "project-shell__content";

  currentParametresRoot = root;

  setProjectViewHeader({
    contextLabel: "Paramètres",
    variant: "parametres",
    title: "",
    subtitle: "",
    metaHtml: "",
    toolbarHtml: ""
  });

  root.innerHTML = getPageHtml(store.projectForm);

  setTimeout(() => {
    const targetId = parametresUiState.activeSectionId || "parametres-general";

    const navBtn = root.querySelector(
      `[data-settings-nav-target="${targetId}"], [data-target="${targetId}"]`
    );
    if (navBtn) {
      navBtn.click();
    }
  }, 0);

  registerProjectPrimaryScrollSource(document.getElementById("projectParametresScroll"));
  bindParametresEvents();
  bindParametresNav();
}

function bindValue(id, handler, eventName = "input") {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(eventName, (e) => handler(e.target.value));
}

function refreshProjectTabsVisibility() {
  const tabsRoot = document.querySelector(".project-tabs");
  if (!tabsRoot) return;

  const visibility = store.projectForm.projectTabs || {};

  tabsRoot.querySelectorAll("[data-project-tab-id]").forEach((link) => {
    const tabId = link.getAttribute("data-project-tab-id");
    if (!isToggleableProjectTab(tabId)) return;

    const isVisible = visibility[tabId] !== false;
    link.style.display = isVisible ? "" : "none";
    link.setAttribute("aria-hidden", isVisible ? "false" : "true");
  });
}

function bindProjectTabToggles() {
  document.querySelectorAll("[data-project-tab-toggle]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const key = event.target.getAttribute("data-project-tab-toggle");
      if (!key) return;
      store.projectForm.projectTabs[key] = !!event.target.checked;
      refreshProjectTabsVisibility();
    });
  });
}

function bindProjectAutomationToggles() {
  const emitAutomationChanged = () => {
    document.dispatchEvent(new CustomEvent("projectAutomationChanged"));
  };

  document.querySelectorAll("[data-project-agent-toggle]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const key = event.target.getAttribute("data-project-agent-toggle");
      if (!key) return;

      const ok = setAgentEnabled(key, !!event.target.checked);
      if (!ok) {
        event.target.checked = isAgentEnabled(key);
        return;
      }

      emitAutomationChanged();
    });
  });

  document.querySelectorAll("[data-project-automation-toggle]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const key = event.target.getAttribute("data-project-automation-toggle");
      if (!key) return;

      const ok = setAutomationEnabled(key, !!event.target.checked);
      if (!ok) {
        event.target.checked = isAutomationEnabled(key);
        return;
      }

      emitAutomationChanged();
    });
  });
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

function bindParametresEvents() {
  bindGhActionButtons();
  
  bindGhEditableFields(document, {
    onValidate: (id, value) => {
      switch (id) {
        case "projectName":
          store.projectForm.projectName = value;
          break;
        case "projectCity":
          store.projectForm.city = value;
          store.projectForm.communeCp = [store.projectForm.city, store.projectForm.postalCode].filter(Boolean).join(" ").trim();
          break;
        case "projectPostalCode":
          store.projectForm.postalCode = value;
          store.projectForm.communeCp = [store.projectForm.city, store.projectForm.postalCode].filter(Boolean).join(" ").trim();
          break;
        case "climateZoneWinter":
          store.projectForm.climateZoneWinter = value;
          break;
        case "climateZoneSummer":
          store.projectForm.climateZoneSummer = value;
          break;
        case "climateBaseTemperatures":
          store.projectForm.climateBaseTemperatures = value;
          break;
        default:
          break;
      }
    }
  });

  bindGhSelectMenus(document, {
    onChange: (id, value) => {
      switch (id) {
        case "currentProjectPhase":
          store.projectForm.currentPhase = value;
          break;
          
        case "riskCategory":
          store.projectForm.riskCategory = value;
          store.projectForm.risk = value;
          break;

        case "importanceCategory":
          store.projectForm.importanceCategory = value;
          store.projectForm.importance = importanceLabelToCode(value);
          break;

        case "zoneSismique":
          store.projectForm.zoneSismique = value;
          break;

        case "liquefactionText":
          store.projectForm.liquefactionText = value;
          store.projectForm.liquefaction = liquefactionLabelToCode(value);
          break;

        case "referential":
          store.projectForm.referential = value;
          break;

        case "soilClass":
          store.projectForm.soilClass = value;
          break;

        default:
          break;
      }
    }
  });

  bindProjectTabToggles();
  bindProjectPhaseToggles();
  bindProjectAutomationToggles();
  refreshProjectTabsVisibility();

  document.querySelectorAll("[data-open-collaborator-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openCollaboratorModal();
    });
  });

  document.querySelectorAll("[data-close-collaborator-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeCollaboratorModal();
    });
  });

  document.querySelectorAll("[data-submit-collaborator]").forEach((btn) => {
    btn.addEventListener("click", () => {
      submitCollaboratorDraft();
    });
  });

  const collaboratorEmailInput = document.getElementById("projectCollaboratorEmail");
  if (collaboratorEmailInput) {
    collaboratorEmailInput.addEventListener("input", (event) => {
      parametresUiState.collaboratorDraftEmail = event.target.value || "";
    });

    collaboratorEmailInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitCollaboratorDraft();
      }
    });

    setTimeout(() => collaboratorEmailInput.focus(), 0);
  }

  document.querySelectorAll("[data-remove-collaborator-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-remove-collaborator-id");
      if (!id || !Array.isArray(store.projectForm.collaborators)) return;

      store.projectForm.collaborators = store.projectForm.collaborators.filter((item) => item.id !== id);
      rerenderProjectParametres();
    });
  });
}

function bindParametresNav() {
  const scrollEl = document.getElementById("projectParametresScroll");
  if (!scrollEl) return;

  bindSideNavPanels(document, {
    navSelector: "[data-side-nav-target]",
    panelSelector: "[data-side-nav-panel]",
    defaultTarget: parametresUiState.activeSectionId || "parametres-general",
    scrollContainer: scrollEl
  });

  document.querySelectorAll("[data-side-nav-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-side-nav-target");
      if (targetId) {
        parametresUiState.activeSectionId = targetId;
      }
    });
  });
}
