import { store, DEFAULT_PROJECT_PHASES } from "../../store.js";
import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "../project-shell-chrome.js";
import {
  DEFAULT_PROJECT_TABS_VISIBILITY,
  isToggleableProjectTab
} from "../../constants.js";
import { svgIcon } from "../../ui/icons.js";
import { renderGhEditableField, bindGhEditableFields } from "../ui/gh-input.js";
import { renderGhSelectMenu, bindGhSelectMenus, bindGhActionButtons } from "../ui/gh-split-button.js";
import {
  ensureProjectAutomationDefaults,
  getAgentCatalogList,
  getAutomationCatalogList,
  isAgentEnabled,
  isAutomationEnabled,
  setAgentEnabled,
  setAutomationEnabled,
  shouldAutoRunProjectBaseDataEnrichment,
  startRunLogEntry,
  finishRunLogEntry
} from "../../services/project-automation.js";
import { escapeHtml } from "../../utils/escape-html.js";
import {
  getSeismicSizingValues,
  buildElasticResponseSpectrumTable,
  computeElasticResponseValue
} from "../../services/seismic-spectrum.js";
import { renderSvgLineChart, getNiceChartTicks } from "../../utils/svg-line-chart.js";
import { persistCurrentProjectState } from "../../services/project-state-storage.js";
import {
  syncProjectLotsFromSupabase,
  persistProjectLotActivationToSupabase,
  addCustomProjectLotToSupabase,
  deleteCustomProjectLotFromSupabase
} from "../../services/project-supabase-sync.js";
import { renderSettingsModal } from "../ui/settings-modal.js";

const DEFAULT_PROJECT_COLLABORATORS = [
  { id: "collab-1", email: "nicolas.lebihan@socotec.com", status: "Actif", role: "Admin" },
  { id: "collab-2", email: "nicolas.lebihan@yahoo.fr", status: "Invitation en attente", role: "Lecteur" },
  { id: "collab-3", email: "marie.durand@socotec.com", status: "Actif", role: "Éditeur" },
  { id: "collab-4", email: "paul.martin@bet-structure.fr", status: "Actif", role: "Contributeur" }
];

const parametresUiState = {
  collaboratorsModalOpen: false,
  collaboratorDraftEmail: "",
  activeSectionId: "parametres-general",
  addLotModalOpen: false,
  addLotGroupCode: "groupe-maitrise-ouvrage",
  addLotTitle: "",
  addLotSubmitting: false,
  addLotErrorMessage: ""
};

let currentParametresRoot = null;
let projectParametresRerender = null;

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

  if (typeof form.address !== "string") {
    form.address = "";
  }

  if (typeof form.city !== "string" || !form.city.trim()) {
    form.city = "Annecy";
  }

  if (typeof form.postalCode !== "string" || !form.postalCode.trim()) {
    form.postalCode = "74000";
  }

  if (typeof form.latitude !== "number" || !Number.isFinite(form.latitude)) {
    form.latitude = null;
  }

  if (typeof form.longitude !== "number" || !Number.isFinite(form.longitude)) {
    form.longitude = null;
  }

  if (typeof form.altitude !== "number" || !Number.isFinite(form.altitude)) {
    form.altitude = null;
  }

  if (typeof form.dampingRatio !== "string" || !form.dampingRatio.trim()) {
    form.dampingRatio = "5";
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

  if (!form.baseDataEnrichment || typeof form.baseDataEnrichment !== "object") {
    form.baseDataEnrichment = {
      lastLocationSignature: ""
    };
  }

  if (typeof form.baseDataEnrichment.lastLocationSignature !== "string") {
    form.baseDataEnrichment.lastLocationSignature = "";
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
    title: "",
    items: [
      { targetId: "parametres-general", label: "Général", icon: "general", isPrimary: true, isActive: true }
    ]
  },
  {
    sectionLabel: "Données de base projet",
    items: [
      { targetId: "parametres-localisation", label: "Localisation", icon: "pin" },
      { targetId: "parametres-phase", label: "Phases", icon: "checklist" },
      { targetId: "parametres-lots", label: "Lots", icon: "book" },
      { targetId: "parametres-collaborateurs", label: "Collaborateurs", icon: "people" },
      { targetId: "parametres-agents-actives", label: "Agents activés", icon: "shield" }
    ]
  },
  {
    sectionLabel: "Paramètres opérationnels",
    items: [
      { targetId: "parametres-automatisations", label: "Automatisations", icon: "checklist" }
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

export function renderSectionCard({ id = "", title, description = "", body = "", badge = "", action = "" }) {
  return `
    <div class="settings-card settings-card--param" ${id ? `id="${escapeHtml(id)}"` : ""}>
      <div class="settings-card__head">
        <div>
          <span class="settings-card__head-title">
            <h4>${escapeHtml(title)}</h4>
            ${action || (badge ? `<span class="settings-badge mono">${escapeHtml(badge)}</span>` : "")}
          </span>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
        
      </div>
      ${body}
    </div>
  `;
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

function getProjectLotGroupTitle(groupCode = "") {
  return getProjectLotGroupDefinitions().find((item) => item.code === groupCode)?.title || "Divers";
}

function renderAddProjectLotModal() {
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
        class="gh-btn gh-btn--success personal-settings-delete-modal__submit"
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


export function renderInputField({ id, label, value = "", placeholder = "", width = "", inputMode = "text" }) {
  return `
    <div class="${width}">
      ${renderGhEditableField({
        id,
        label,
        value,
        placeholder,
        type: "text"
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

function formatSizingValue(value, unit = "") {
  if (!Number.isFinite(value)) return "—";
  const text = String(value).replace(/\.0+$/, "").replace(".", ",");
  return unit ? `${text} ${unit}` : text;
}

function formatSpectrumCell(value, unit = "") {
  if (!Number.isFinite(value)) return "—";
  const text = value.toFixed(3).replace(/\.?0+$/, '').replace('.', ',');
  return unit ? `${text} ${unit}` : text;
}

function renderElasticSpectrumTable(form) {
  const rows = buildElasticResponseSpectrumTable(form, { step: 0.1, maxPeriod: 4 });

  return `
    <div class="settings-seismic-spectrum-table-wrap">
      <table class="settings-seismic-spectrum-table">
        <thead>
          <tr>
            <th>T (s)</th>
            <th>Se(T) (m/s²)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(formatSpectrumCell(row.T))}</td>
              <td>${escapeHtml(formatSpectrumCell(row.Se))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSeismicSummaryCard(title, items = []) {
  return `
    <div class="settings-seismic-summary-card">
      <div class="settings-seismic-summary-card__title">${escapeHtml(title)}</div>
      <div class="settings-seismic-summary-list">
        ${items.map((item) => `
          <div class="settings-seismic-summary-item">
            <div class="settings-seismic-summary-item__head">
              <strong>${escapeHtml(item.symbol || item.label || "")}</strong>
              <span>${escapeHtml(item.label || "")}</span>
            </div>
            <div class="settings-seismic-summary-item__value">${escapeHtml(formatSizingValue(item.value, item.unit || ""))}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderSeismicPeriodsMiniTable(form) {
  const sizing = getSeismicSizingValues(form);
  const periodItems = [
    { key: "TB", value: sizing.TB, tooltip: "Limite inférieure du palier d’accélération spectrale constante" },
    { key: "TC", value: sizing.TC, tooltip: "Limite supérieure du palier d’accélération spectrale constante" },
    { key: "TD", value: sizing.TD, tooltip: "Début de la branche à déplacement spectral constant" }
  ];
  const spectralValues = periodItems.map((item) => ({
    key: item.key,
    value: computeElasticResponseValue({
      T: item.value,
      ag: sizing.ag,
      S: sizing.S,
      eta: sizing.eta,
      TB: sizing.TB,
      TC: sizing.TC,
      TD: sizing.TD
    })
  }));

  return `
    <div class="settings-seismic-periods-mini-table-wrap">
      <table class="settings-seismic-periods-mini-table">
        <thead>
          <tr>
            <th><span class="settings-seismic-periods-mini-table__rowhead">T</span></th>
            ${periodItems.map((item) => `<th title="${escapeHtml(item.tooltip)}">${escapeHtml(item.key)} <span class="settings-seismic-periods-mini-table__meta">(${escapeHtml(formatSizingValue(item.value, "s"))})</span></th>`).join("")}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th><span class="settings-seismic-periods-mini-table__rowhead">Se(T)</span></th>
            ${spectralValues.map((item, index) => `<td>${escapeHtml(formatSizingValue(item.value, "m/s2"))}</td>`).join("")}
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderSeismicChartLegend(items = []) {
  const labeled = items.filter((item) => item?.label);
  if (!labeled.length) return "";
  return `
    <div class="svg-line-chart__legend">
      ${labeled.map((item, index) => `
        <div class="svg-line-chart__legend-item">
          <span class="svg-line-chart__legend-swatch svg-line-chart__legend-swatch--${index + 1}"></span>
          <span>${escapeHtml(item.label)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSeismicSpectrumChart(form) {
  const riskCategory = String(form.riskCategory || form.risk || "Risque normal").trim().toLowerCase();
  if (riskCategory === "risque spécial" || riskCategory === "risque special") {
    return `
      <div class="settings-seismic-chart-placeholder">
        <div class="settings-seismic-chart-placeholder__title">Graphique du spectre de réponse élastique normalisé</div>
        <div class="settings-seismic-chart-placeholder__text">Pour les ouvrages classés à risque spécial, le spectre doit être définit par une étude spécifique</div>
      </div>
    `;
  }

  const rows = buildElasticResponseSpectrumTable(form, { step: 0.1, maxPeriod: 4 });
  const points = rows.filter((row) => Number.isFinite(row.Se)).map((row) => ({ x: row.T, y: row.Se }));
  const maxY = points.reduce((acc, point) => Math.max(acc, point.y), 0);
  const yTicks = getNiceChartTicks(maxY, 4);
  const xTicks = [0, 1, 2, 3, 4];
  const chartSeries = [{
    label: "spectre élastique normalisé",
    points,
    stroke: true,
    fill: false,
    pointsVisible: false
  }];

  return `
    <div class="settings-seismic-chart-card">
      <div class="svg-line-chart__meta svg-line-chart__meta--top">
        <div class="svg-line-chart__title">Graphique du spectre de réponse élastique normalisé</div>
        <div class="svg-line-chart__subtitle">Spectre Se(T) calculé automatiquement à partir des paramètres réglementaires du projet.</div>
      </div>
      ${renderSvgLineChart({
        ariaDescription: "Graphique du spectre de réponse élastique normalisé du projet.",
        xLabel: "Période T (s)",
        yLabel: "Se(T)",
        xDomain: [0, 4],
        yDomain: [0, yTicks[yTicks.length - 1] || 1],
        xTicks,
        yTicks,
        xGrid: { skipFirst: true, lineStyle: "dashed" },
        yGrid: { skipFirst: true, lineStyle: "solid" },
        interactive: true,
        series: chartSeries.map((item) => ({ ...item, label: "" }))
      })}
      ${renderSeismicChartLegend(chartSeries)}
      ${renderSeismicPeriodsMiniTable(form)}
    </div>
  `;
}

function renderSeismicAccelerationCard(form) {
  const sizing = getSeismicSizingValues(form);
  return renderSeismicSummaryCard("Accélérations et coefficients", [
    { symbol: "agr", label: "Accélération de référence au rocher", value: sizing.agr, unit: "m/s²" },
    { symbol: "γI", label: "Coefficient d’importance", value: sizing.gl },
    { symbol: "ag", label: "Accélération horizontale de calcul", value: sizing.ag, unit: "m/s²" },
    { symbol: "η", label: "Coefficient de correction d’amortissement", value: sizing.eta },
    { symbol: "S", label: "Paramètre de sol", value: sizing.S }
  ]);
}

function renderPlaceholderList(items) {
  return `
    <ul class="settings-list settings-list--tight">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
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
    autoProjectBaseDataEnrichment: "Lance automatiquement l’enrichissement des données Géorisques après modification de la localisation projet.",
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

export function renderSettingsBlock({ id, title, lead = "", cards = [], isActive = false, isHero = false, hideHead = false }) {
  const hasHeadContent = Boolean(String(title || "").trim() || String(lead || "").trim());
  const shouldRenderHead = !hideHead && hasHeadContent;
  return `
    <section
      class="settings-block ${isActive ? "is-active" : ""} ${isHero ? "settings-block--hero" : ""} ${!isHero && !shouldRenderHead ? "settings-block--no-head" : ""}"
      data-settings-block="${escapeHtml(id)}"
      data-side-nav-panel="${escapeHtml(id)}"
    >
      ${isHero ? `
        <header class="settings-page-header settings-page-header--parametres">
          <h2>${escapeHtml(title)}</h2>
          ${lead ? `<p>${escapeHtml(lead)}</p>` : ""}
        </header>
      ` : (shouldRenderHead ? `
        <div class="settings-block__head">
          <h3>${escapeHtml(title)}</h3>
          ${lead ? `<p class="settings-lead">${escapeHtml(lead)}</p>` : ""}
        </div>
      ` : "")}
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

export function rerenderProjectParametres() {
  if (!currentParametresRoot || typeof projectParametresRerender !== "function") return;
  captureActiveParametresSection();
  projectParametresRerender(currentParametresRoot);
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

function openAddProjectLotModal() {
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
  parametresUiState.addLotModalOpen = false;
  parametresUiState.addLotSubmitting = false;
  parametresUiState.addLotErrorMessage = "";
  document.body.classList.remove("modal-open");
  rerenderProjectParametres();
}

async function submitAddProjectLotModal() {
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


function bindValue(id, handler, eventName = "input") {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(eventName, (e) => handler(e.target.value));
}


export function refreshProjectTabsVisibility() {
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

export function bindProjectTabToggles() {
  document.querySelectorAll("[data-project-tab-toggle]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const key = event.target.getAttribute("data-project-tab-toggle");
      if (!key) return;
      store.projectForm.projectTabs[key] = !!event.target.checked;
      persistCurrentProjectState();
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
      rerenderProjectParametres();
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
      rerenderProjectParametres();
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

async function handleProjectLotToggle(input, activated) {
  const previousChecked = input.checked;
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
      parametresUiState.addLotGroupCode = event.target.value || "groupe-maitrise-ouvrage";
    });
  });

  const titleInput = modal.querySelector("#projectAddLotTitle");
  const submitButton = modal.querySelector("#projectAddLotSubmit");

  const syncSubmitState = () => {
    parametresUiState.addLotTitle = titleInput?.value || "";
    if (submitButton) {
      submitButton.disabled = parametresUiState.addLotSubmitting || !String(parametresUiState.addLotTitle || "").trim();
    }
  };

  titleInput?.addEventListener("input", () => {
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


function bindInteractiveSvgLineCharts() {
  document.querySelectorAll('.svg-line-chart[data-chart-model]').forEach((chartNode) => {
    if (chartNode.dataset.bound === '1') return;
    chartNode.dataset.bound = '1';

    let model = null;
    try {
      model = JSON.parse(decodeURIComponent(chartNode.dataset.chartModel || ''));
    } catch (error) {
      model = null;
    }
    if (!model) return;

    const frame = chartNode.querySelector('.svg-line-chart__frame');
    const svg = chartNode.querySelector('.svg-line-chart__svg');
    const hover = chartNode.querySelector('[data-chart-hover]');
    const hoverPoint = hover?.querySelector('.svg-line-chart__hover-point');
    const tooltip = chartNode.querySelector('[data-chart-tooltip]');
    const firstSeries = Array.isArray(model.series) ? model.series.find((item) => Array.isArray(item?.points) && item.points.length) : null;
    if (!frame || !svg || !hover || !hoverPoint || !tooltip || !firstSeries) return;

    const { width, height, margin, xDomain, yDomain } = model;
    const innerWidth = Math.max(1, width - margin.left - margin.right);
    const innerHeight = Math.max(1, height - margin.top - margin.bottom);
    const xMin = Number(xDomain?.[0] ?? 0);
    const xMax = Number(xDomain?.[1] ?? 1);
    const yMin = Number(yDomain?.[0] ?? 0);
    const yMax = Number(yDomain?.[1] ?? 1);
    const points = firstSeries.points;

    const formatValue = (value, digits = 2) => Number(value).toFixed(digits).replace(/\.?0+$/, '').replace('.', ',');

    const hideHover = () => {
      hover.setAttribute('hidden', 'hidden');
      tooltip.setAttribute('hidden', 'hidden');
    };

    const updateHover = (event) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        hideHover();
        return;
      }
      const svgX = ((event.clientX - rect.left) / rect.width) * width;
      const svgY = ((event.clientY - rect.top) / rect.height) * height;
      const innerX = svgX - margin.left;
      const innerY = svgY - margin.top;
      if (innerX < 0 || innerX > innerWidth || innerY < 0 || innerY > innerHeight) {
        hideHover();
        return;
      }

      let nearest = points[0];
      let minDistance = Math.abs(points[0].x - (xMin + (innerX / innerWidth) * (xMax - xMin)));
      for (const point of points) {
        const distance = Math.abs(point.x - (xMin + (innerX / innerWidth) * (xMax - xMin)));
        if (distance < minDistance) {
          minDistance = distance;
          nearest = point;
        }
      }

      const pointX = ((nearest.x - xMin) / ((xMax - xMin) || 1)) * innerWidth;
      const pointY = innerHeight - ((nearest.y - yMin) / ((yMax - yMin) || 1)) * innerHeight;
      hoverPoint.setAttribute('cx', pointX.toFixed(3));
      hoverPoint.setAttribute('cy', pointY.toFixed(3));
      hover.removeAttribute('hidden');

      tooltip.textContent = `T = ${formatValue(nearest.x, 1)} s, Se(T) = ${formatValue(nearest.y, 3)} m/s²`;
      tooltip.removeAttribute('hidden');

      const frameRect = frame.getBoundingClientRect();
      const pointLeft = (pointX + margin.left) * (frameRect.width / width);
      const pointTop = (pointY + margin.top) * (frameRect.height / height);
      tooltip.style.left = `${pointLeft}px`;
      tooltip.style.top = `${pointTop}px`;
    };

    frame.addEventListener('mousemove', updateHover);
    frame.addEventListener('mouseleave', hideHover);
    frame.addEventListener('touchstart', hideHover, { passive: true });
    hideHover();
  });
}

export function setProjectParametresRerender(handler) {
  projectParametresRerender = typeof handler === "function" ? handler : null;
}

export function ensureProjectParametresSetup(root) {
  ensureProjectFormDefaults();
  ensureProjectAutomationDefaults();

  if (root) {
    root.className = "project-shell__content";
    currentParametresRoot = root;
  }
}

export function ensureProjectLotsLoaded(root = currentParametresRoot) {
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

export function getParametresUiState() {
  return parametresUiState;
}

export function setActiveParametresSectionId(sectionId = "") {
  parametresUiState.activeSectionId = String(sectionId || "").trim() || "parametres-general";
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
  })}
      ${renderAddProjectLotModal()}`;
}

export function renderCollaborateursParametresContent() {
  return `${renderSettingsBlock({
    id: "parametres-collaborateurs",
    title: "",
    lead: "",
    cards: [
      renderSectionCard({
        title: "Collaborateurs",
        description: "Gestion des accès projet et suivi des invitations.",
        body: renderCollaboratorsCard()
      })
    ]
  })}
      ${renderCollaboratorModal()}`;
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

export function bindBaseParametresUi() {
  bindGhActionButtons();
  bindInteractiveSvgLineCharts();
}


export function bindPhasesParametresSection(root) {
  currentParametresRoot = root || currentParametresRoot;
  bindBaseParametresUi();
  bindProjectPhaseToggles();
}

export function bindLotsParametresSection(root) {
  currentParametresRoot = root || currentParametresRoot;
  bindBaseParametresUi();
  bindProjectLotToggles();
  ensureProjectLotsLoaded(currentParametresRoot);
}

export function bindCollaborateursParametresSection(root) {
  currentParametresRoot = root || currentParametresRoot;
  bindBaseParametresUi();
  document.querySelectorAll("[data-open-collaborator-modal]").forEach((btn) => btn.addEventListener("click", () => openCollaboratorModal()));
  document.querySelectorAll("[data-close-collaborator-modal]").forEach((btn) => btn.addEventListener("click", () => closeCollaboratorModal()));
  document.querySelectorAll("[data-submit-collaborator]").forEach((btn) => btn.addEventListener("click", () => submitCollaboratorDraft()));
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

export function bindAgentsParametresSection(root) {
  currentParametresRoot = root || currentParametresRoot;
  bindBaseParametresUi();
  bindProjectAutomationToggles();
}

export function bindAutomatisationsParametresSection(root) {
  currentParametresRoot = root || currentParametresRoot;
  bindBaseParametresUi();
  bindProjectAutomationToggles();
}
