import { store } from "../../../store.js";
import { escapeHtml } from "../../../utils/escape-html.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { renderGhEditableField, bindGhEditableFields } from "../../ui/gh-input.js";
import { renderGhSelectMenu, bindGhSelectMenus, bindGhActionButtons } from "../../ui/gh-split-button.js";
import {
  getSeismicSizingValues,
  buildElasticResponseSpectrumTable,
  computeElasticResponseValue
} from "../../../services/seismic-spectrum.js";
import { renderSvgLineChart, getNiceChartTicks } from "../../../utils/svg-line-chart.js";

let currentSeismicRoot = null;

function ensureSeismicDefaults() {
  const form = store.projectForm || (store.projectForm = {});

  if (typeof form.riskCategory !== "string" || !form.riskCategory.trim()) {
    form.riskCategory = form.risk || "Risque normal";
  }
  if (typeof form.risk !== "string" || !form.risk.trim()) {
    form.risk = form.riskCategory || "Risque normal";
  }
  if (typeof form.importanceCategory !== "string" || !form.importanceCategory.trim()) {
    form.importanceCategory = "Catégorie d'importance II";
  }
  if (typeof form.importance !== "string" || !form.importance.trim()) {
    form.importance = "II";
  }
  if (typeof form.zoneSismique !== "string" || !form.zoneSismique.trim()) {
    form.zoneSismique = "4";
  }
  if (typeof form.liquefactionText !== "string" || !form.liquefactionText.trim()) {
    form.liquefactionText = "Sol non liquéfiable";
  }
  if (typeof form.soilClass !== "string" || !form.soilClass.trim()) {
    form.soilClass = "A";
  }
  if (typeof form.referential !== "string" || !form.referential.trim()) {
    form.referential = "EC8";
  }
  if (typeof form.dampingRatio !== "string" || !form.dampingRatio.trim()) {
    form.dampingRatio = "5";
  }
  if (typeof form.city !== "string") form.city = "";
  if (typeof form.postalCode !== "string") form.postalCode = "";
  if (!form.georisques || typeof form.georisques !== "object") {
    form.georisques = { query: { city: "", postalCode: "" }, datasets: [] };
  }
  if (!Array.isArray(form.georisques.datasets)) {
    form.georisques.datasets = [];
  }
  if (!form.georisques.query || typeof form.georisques.query !== "object") {
    form.georisques.query = { city: "", postalCode: "" };
  }
}

function importanceLabelToCode(value = "") {
  const match = String(value || "").match(/\b([IV]+)\b/i);
  return match ? match[1].toUpperCase() : "II";
}

function liquefactionLabelToCode(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "sol liquéfiable" || normalized === "sol liquefiable") return "yes";
  if (normalized === "non défini à ce stade" || normalized === "non defini a ce stade") return "";
  return "no";
}

function renderInputField({ id, label, value = "", placeholder = "" }) {
  return renderGhEditableField({ id, label, value, placeholder, type: "text" });
}

function renderSelectField({ id, label, value = "", options = [] }) {
  return renderGhSelectMenu({ id, label, value, options, tone: "default", size: "md" });
}

function renderSectionCard({ title, description = "", badge = "", body = "" }) {
  return `
    <div class="settings-card settings-card--param">
      <div class="settings-card__head">
        <div>
          <span class="settings-card__head-title">
            <h4>${escapeHtml(title)}</h4>
            ${badge ? `<span class="settings-badge mono">${escapeHtml(badge)}</span>` : ""}
          </span>
          ${description ? `<p>${escapeHtml(description)}</p>` : ""}
        </div>
      </div>
      ${body}
    </div>
  `;
}

function getGeorisquesRequestKey(city = "", postalCode = "") {
  return `${String(city || "").trim().toLowerCase()}::${String(postalCode || "").trim()}`;
}

function hasStaleLocationDerivedData() {
  const georisques = store.projectForm?.georisques || {};
  const currentKey = getGeorisquesRequestKey(store.projectForm?.city, store.projectForm?.postalCode);
  const resolvedKey = getGeorisquesRequestKey(georisques.query?.city, georisques.query?.postalCode);
  if (!resolvedKey) return false;
  return currentKey !== resolvedKey;
}

function normalizeFlatValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "string") return value.trim();
  return "";
}

function findDatasetByKey(datasetKey = "") {
  const datasets = Array.isArray(store.projectForm?.georisques?.datasets) ? store.projectForm.georisques.datasets : [];
  return datasets.find((item) => String(item?.key || "").trim() === datasetKey) || null;
}

function flattenRows(input, acc = []) {
  if (Array.isArray(input)) {
    input.forEach((item) => flattenRows(item, acc));
    return acc;
  }
  if (!input || typeof input !== "object") return acc;
  acc.push(input);
  Object.values(input).forEach((value) => {
    if (value && typeof value === "object") {
      flattenRows(value, acc);
    }
  });
  return acc;
}

function extractZoneNumber(value = "") {
  const text = normalizeFlatValue(value);
  const match = text.match(/\b([1-5])\b/);
  return match ? match[1] : "";
}

function getGeorisquesSismiqueSummary() {
  const dataset = findDatasetByKey("zonage_sismique");
  if (!dataset || dataset.status !== "success") return "";

  const rows = flattenRows(dataset.data);
  const zoneKeyPattern = /(zone(_sismique|_sismicite)?|code_zone|niveau_zone)/i;
  const labelKeyPattern = /(libelle|label|intitule|niveau|qualification)/i;

  for (const row of rows) {
    let zoneValue = "";
    let labelValue = "";

    for (const [key, rawValue] of Object.entries(row || {})) {
      const value = normalizeFlatValue(rawValue);
      if (!value) continue;
      if (!zoneValue && zoneKeyPattern.test(key) && extractZoneNumber(value)) {
        zoneValue = value;
        continue;
      }
      if (!labelValue && labelKeyPattern.test(key)) {
        labelValue = value;
      }
    }

    const zoneNumber = extractZoneNumber(zoneValue || labelValue);
    if (zoneNumber && labelValue && !labelValue.includes(zoneNumber)) {
      return `${zoneNumber} - ${labelValue}`;
    }
    if (zoneNumber) return zoneNumber;
    if (zoneValue) return zoneValue;
    if (labelValue) return labelValue;
  }

  return "";
}

function renderAutoResolvedField(label, value, hint, options = {}) {
  const mutedClass = options.muted ? " is-muted" : "";
  return `
    <div class="settings-auto-field${mutedClass}" data-location-derived>
      <div class="settings-auto-field__label"><strong>${escapeHtml(label)} <span class="settings-auto-field__asterisk">*</span></strong></div>
      <div class="settings-auto-field__value">${escapeHtml(value || "—")}</div>
      <div class="settings-auto-field__hint">${escapeHtml(hint || "")}</div>
    </div>
  `;
}

function formatSizingValue(value, unit = "") {
  if (!Number.isFinite(value)) return "—";
  const text = String(value).replace(/\.0+$/, "").replace(".", ",");
  return unit ? `${text} ${unit}` : text;
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
            ${spectralValues.map((item) => `<td>${escapeHtml(formatSizingValue(item.value, "m/s2"))}</td>`).join("")}
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

function renderSeismicCards(form) {
  return [
    renderSectionCard({
      title: "Protection parasismique",
      description: "Paramètres d’entrée du cadre parasismique à utiliser pour le projet.",
      badge: "LIVE",
      body: `${getGeorisquesSismiqueSummary() ? `
        <div class="settings-auto-fields settings-auto-fields--single">
          ${renderAutoResolvedField("Zone sismique Géorisques", getGeorisquesSismiqueSummary(), "Données récupérées automatiquement sur Géorisques.", { muted: hasStaleLocationDerivedData() })}
        </div>
      ` : ""}
      <div class="settings-form-grid settings-form-grid--thirds">
        ${renderSelectField({ id: "riskCategory", label: "Catégorie de risque", value: form.riskCategory || form.risk || "Risque normal", options: ["Risque normal", "Risque spécial"] })}
        ${renderSelectField({ id: "importanceCategory", label: "Catégorie d'importance", value: form.importanceCategory || "Catégorie d'importance II", options: ["Catégorie d'importance I", "Catégorie d'importance II", "Catégorie d'importance III", "Catégorie d'importance IV"] })}
        ${renderSelectField({ id: "zoneSismique", label: "Zone sismique", value: form.zoneSismique || "4", options: ["1", "2", "3", "4", "5"] })}
        ${renderSelectField({ id: "liquefactionText", label: "Liquéfaction", value: form.liquefactionText || "Sol non liquéfiable", options: ["Sol non liquéfiable", "Sol liquéfiable", "Non défini à ce stade"] })}
        ${renderSelectField({ id: "soilClass", label: "Classe de sol", value: form.soilClass || "A", options: ["A", "B", "C", "D", "E"] })}
        ${renderSelectField({ id: "referential", label: "Référentiel parasismique", value: form.referential || "EC8", options: ["EC8", "PS92"] })}
      </div>`
    }),
    renderSectionCard({
      title: "Données de dimensionnement",
      description: "Premières données de calcul du spectre de dimensionnement élastique et des accélérations réglementaires du projet.",
      body: `<div class="settings-seismic-sizing-layout">
        <div class="settings-form-grid settings-form-grid--thirds settings-seismic-sizing-layout__controls">
          ${renderInputField({ id: "dampingRatio", label: "ξ coefficient d'amortissement visqueux, exprimé en pourcentage", value: form.dampingRatio || "5", placeholder: "5" })}
        </div>
        <div class="settings-seismic-sizing-layout__row settings-seismic-sizing-layout__row--top">
          <div class="settings-seismic-sizing-main">
            ${renderSeismicSpectrumChart(form)}
          </div>
          <div class="settings-seismic-sizing-side">
            ${renderSeismicAccelerationCard(form)}
          </div>
        </div>
      </div>`
    })
  ];
}

function getPageHtml(form) {
  return `
    <section class="settings-section is-active" id="projectSeismicPanel">
      ${renderSeismicCards(form).join("")}
    </section>
  `;
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

function rerenderProjectSeismic() {
  if (!currentSeismicRoot) return;
  renderProjectSeismic(currentSeismicRoot);
}

function bindSeismicEvents() {
  bindGhActionButtons();
  bindInteractiveSvgLineCharts();

  bindGhEditableFields(document, {
    onValidate: async (id, value) => {
      if (id !== "dampingRatio") return;
      store.projectForm.dampingRatio = value;
      rerenderProjectSeismic();
    }
  });

  bindGhSelectMenus(document, {
    onChange: (id, value) => {
      switch (id) {
        case "riskCategory":
          store.projectForm.riskCategory = value;
          store.projectForm.risk = value;
          rerenderProjectSeismic();
          break;
        case "importanceCategory":
          store.projectForm.importanceCategory = value;
          store.projectForm.importance = importanceLabelToCode(value);
          rerenderProjectSeismic();
          break;
        case "zoneSismique":
          store.projectForm.zoneSismique = value;
          rerenderProjectSeismic();
          break;
        case "liquefactionText":
          store.projectForm.liquefactionText = value;
          store.projectForm.liquefaction = liquefactionLabelToCode(value);
          rerenderProjectSeismic();
          break;
        case "referential":
          store.projectForm.referential = value;
          rerenderProjectSeismic();
          break;
        case "soilClass":
          store.projectForm.soilClass = value;
          rerenderProjectSeismic();
          break;
        default:
          break;
      }
    }
  });
}

export function renderSeismicGeneral(root) {
  ensureSeismicDefaults();

  currentSeismicRoot = root;
  root.innerHTML = getPageHtml(store.projectForm);
  registerProjectPrimaryScrollSource(root.closest("#projectSeismicRouterScroll") || document.getElementById("projectSeismicRouterScroll"));
  bindSeismicEvents();
}
