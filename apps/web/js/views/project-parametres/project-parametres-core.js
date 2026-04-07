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
  getAutomationCatalogList,
  isAutomationEnabled,
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

const DEFAULT_PROJECT_COLLABORATORS = [
  { id: "collab-1", email: "nicolas.lebihan@socotec.com", status: "Actif", role: "Admin" },
  { id: "collab-2", email: "nicolas.lebihan@yahoo.fr", status: "Invitation en attente", role: "Lecteur" },
  { id: "collab-3", email: "marie.durand@socotec.com", status: "Actif", role: "Éditeur" },
  { id: "collab-4", email: "paul.martin@bet-structure.fr", status: "Actif", role: "Contributeur" }
];

const parametresUiState = {
  activeSectionId: "parametres-general"
};

let currentParametresRoot = null;
let projectParametresRerender = null;

function cloneDefaultProjectPhases() {
  return DEFAULT_PROJECT_PHASES.map((item) => ({ ...item }));
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
  items = []
}) {
  return `
    <div class="settings-features-card">
      <div class="settings-features-card__title">${escapeHtml(title)}</div>
      <div class="settings-features-list">
        ${items.map((item) => {
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


function renderAutomationsFeatureCard() {
  return renderToggleSettingsCard({
    title: "Principales automatisations",
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

export function setCurrentProjectParametresRoot(root) {
  currentParametresRoot = root || currentParametresRoot;
  return currentParametresRoot;
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



export function getParametresUiState() {
  return parametresUiState;
}

export function setActiveParametresSectionId(sectionId = "") {
  parametresUiState.activeSectionId = String(sectionId || "").trim() || "parametres-general";
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





export function bindAutomatisationsParametresSection(root) {
  currentParametresRoot = root || currentParametresRoot;
  bindBaseParametresUi();
  bindProjectAutomationToggles();
}
