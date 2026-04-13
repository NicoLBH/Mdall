import { escapeHtml } from "../utils/escape-html.js";
import { setProjectViewHeader } from "./project-shell-chrome.js";
import { getRunMetrics } from "../services/project-automation.js";
import { getProjectInsightsMetrics } from "../services/project-insights-metrics.js";
import { renderSvgLineChart, getNiceChartTicks } from "../utils/svg-line-chart.js";

function formatDuration(value) {
  const ms = Number(value);

  if (!Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;

  const seconds = ms / 1000;
  if (seconds < 60) {
    return seconds < 10 ? `${seconds.toFixed(1)} s` : `${Math.round(seconds)} s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes} min ${remainingSeconds}s`
      : `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

function formatPercent(value) {
  const num = Number(value);
  return Number.isFinite(num) ? `${num} %` : "—";
}

function formatInteger(value) {
  const num = Number(value);
  return Number.isFinite(num) ? String(num) : "—";
}

function formatMinutes(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(num >= 10 ? 0 : 1).replace(/\.0$/, "")} min`;
}

function renderMetricCard({ label, value, hint = "" }) {
  return `
    <article class="pilotage-metric-card">
      <div class="pilotage-metric-card__label">${escapeHtml(label)}</div>
      <div class="pilotage-metric-card__value">${escapeHtml(value)}</div>
      ${hint ? `<div class="pilotage-metric-card__hint">${escapeHtml(hint)}</div>` : ""}
    </article>
  `;
}

function renderExecutionInsightsCardsSection() {
  const metrics = getRunMetrics();

  return `
    <section class="settings-section" id="insights-execution">
      <div class="settings-card settings-card-less">
        <div class="settings-card__head">
          <div>
            <h4>Indicateurs d’exécution</h4>
            <p>
              Indicateurs alimentés par le run log partagé du PoC.
            </p>
          </div>
          <span class="settings-badge mono">LIVE METRICS</span>
        </div>

        <div class="pilotage-metrics-grid">
          ${renderMetricCard({
            label: "Actions exécutées",
            value: formatInteger(metrics.totalRuns),
            hint: "Nombre total d’actions journalisées."
          })}

          ${renderMetricCard({
            label: "Actions terminées",
            value: formatInteger(metrics.completedRuns),
            hint: "Actions terminées avec un état final exploitable."
          })}

          ${renderMetricCard({
            label: "Taux de succès",
            value: formatPercent(metrics.successRate),
            hint: "Part des actions terminées avec succès."
          })}

          ${renderMetricCard({
            label: "Durée moyenne",
            value: formatDuration(metrics.averageDurationMs),
            hint: "Moyenne calculée sur les runs terminés."
          })}
        </div>
      </div>
    </section>
  `;
}

function renderPilotageMetricStrip(summary) {
  return `
    <section class="settings-section" id="insights-pilotage-summary">
      <div class="settings-card settings-card-less">
        <div class="settings-card__head">
          <div>
            <h4>Indicateurs de pilotage</h4>
            <p>Vue projet calculée localement à partir des sujets, de leurs relations et des runs disponibles.</p>
          </div>
          <span class="settings-badge mono">PROJECT METRICS</span>
        </div>

        <div class="pilotage-metrics-grid pilotage-metrics-grid--6">
          ${renderMetricCard({ label: "Situations actives", value: formatInteger(summary.activeSituations), hint: "Nombre de situations actuellement ouvertes dans le projet." })}
          ${renderMetricCard({ label: "Sous-sujets", value: formatInteger(summary.childSubjects), hint: "Volume de sujets enfants dans la hiérarchie courante." })}
          ${renderMetricCard({ label: "Sujets ouverts", value: formatInteger(summary.backlog), hint: "Backlog courant encore ouvert." })}
          ${renderMetricCard({ label: "Sujets bloqués", value: formatInteger(summary.blocking), hint: "Sujets actuellement bloqués par au moins un autre sujet." })}
          ${renderMetricCard({ label: "Taux critique", value: formatPercent(summary.criticalRate), hint: "Part des sujets critiques dans le snapshot courant." })}
          ${renderMetricCard({ label: "Taux de fermeture", value: formatPercent(summary.closureRate), hint: "Part du backlog courant déjà traité depuis le dernier snapshot." })}
        </div>
      </div>
    </section>
  `;
}

function renderChartPanel({ chart, bodyHtml }) {
  return `
    <article class="pilotage-chart-card">
      <div class="pilotage-chart-card__head">
        <div>
          <h4>${escapeHtml(chart.title)}</h4>
          <p>${escapeHtml(chart.subtitle || "")}</p>
        </div>
      </div>
      <div class="pilotage-chart-card__body">
        ${bodyHtml}
      </div>
    </article>
  `;
}

function buildLineChartHtml(chart) {
  const values = chart.series.flatMap((serie) => serie.values || []);
  const yMax = Math.max(Number(chart.yMax || 0), ...values, 1);
  const xTicks = chart.labels.map((_, index) => index);
  const yTicks = getNiceChartTicks(yMax, 4);

  return renderSvgLineChart({
    title: chart.title,
    subtitle: chart.subtitle,
    xLabel: "période",
    yLabel: chart.yLabel || "valeur",
    xDomain: [0, Math.max(chart.labels.length - 1, 1)],
    yDomain: [0, Math.max(yTicks[yTicks.length - 1] || yMax, 1)],
    xTicks,
    yTicks,
    xTickFormatter: (tick) => chart.labels[tick] || "",
    yTickFormatter: (tick) => Number(tick).toString().replace(".", ","),
    xGrid: { show: false },
    yGrid: { show: true, lineStyle: "dashed" },
    series: chart.series.map((serie) => ({
      label: serie.label,
      points: (serie.values || []).map((value, index) => ({ x: index, y: Number(value || 0) })),
      fill: serie.fill === true,
      pointsVisible: true
    }))
  });
}

function renderStackedBars(chart) {
  const maxTotal = Math.max(
    1,
    ...chart.labels.map((_, index) => chart.series.reduce((sum, serie) => sum + Number(serie.values?.[index] || 0), 0))
  );

  return `
    <div class="pilotage-stacked-bars">
      <div class="pilotage-stacked-bars__plot">
        ${chart.labels.map((label, index) => {
          const total = chart.series.reduce((sum, serie) => sum + Number(serie.values?.[index] || 0), 0);
          const height = `${Math.max(8, (total / maxTotal) * 180)}px`;
          return `
            <div class="pilotage-stacked-bars__column">
              <div class="pilotage-stacked-bars__bar" style="height:${height}">
                ${chart.series.map((serie, serieIndex) => {
                  const value = Number(serie.values?.[index] || 0);
                  const share = total > 0 ? (value / total) * 100 : 0;
                  return `<span class="pilotage-stacked-bars__segment pilotage-stacked-bars__segment--${serieIndex + 1}" style="height:${share}%" title="${escapeHtml(serie.label)} : ${escapeHtml(String(value))}"></span>`;
                }).join("")}
              </div>
              <div class="pilotage-stacked-bars__total">${escapeHtml(String(total))}</div>
              <div class="pilotage-stacked-bars__label">${escapeHtml(label)}</div>
            </div>
          `;
        }).join("")}
      </div>
      <div class="svg-line-chart__legend">
        ${chart.series.map((serie, index) => `<div class="svg-line-chart__legend-item"><span class="svg-line-chart__legend-swatch svg-line-chart__legend-swatch--${index + 1}"></span><span>${escapeHtml(serie.label)}</span></div>`).join("")}
      </div>
    </div>
  `;
}

function renderChartsSection(insights) {
  const { charts } = insights;
  const chartCards = [
    renderChartPanel({ chart: charts.confidence, bodyHtml: renderStackedBars(charts.confidence) }),
    renderChartPanel({ chart: charts.validationTime, bodyHtml: buildLineChartHtml(charts.validationTime) }),
    renderChartPanel({ chart: charts.backlogBlocking, bodyHtml: buildLineChartHtml(charts.backlogBlocking) }),
    renderChartPanel({ chart: charts.criticalRate, bodyHtml: buildLineChartHtml(charts.criticalRate) }),
    renderChartPanel({ chart: charts.flow, bodyHtml: buildLineChartHtml(charts.flow) }),
    renderChartPanel({ chart: charts.closureRate, bodyHtml: buildLineChartHtml(charts.closureRate) }),
    renderChartPanel({ chart: charts.activity, bodyHtml: buildLineChartHtml(charts.activity) })
  ].join("");

  return `
    <section class="settings-section" id="insights-project-charts">
      <div class="pilotage-charts-grid">
        ${chartCards}
      </div>
    </section>
  `;
}

export function renderProjectInsights(root) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Indicateurs",
    variant: "insights"
  });

  const insights = getProjectInsightsMetrics();

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="settings-content settings-content--project-page" style="max-width:1216px;margin:0 auto;padding:24px 32px 40px;">
        ${renderExecutionInsightsCardsSection()}
        ${renderPilotageMetricStrip(insights.summary)}
        ${renderChartsSection(insights)}
      </div>
    </section>
  `;
}
