import { escapeHtml } from "../utils/escape-html.js";
import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import { getRunMetrics } from "../services/project-automation.js";

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

function renderMetricCard({ label, value, hint = "" }) {
  return `
    <article class="pilotage-metric-card">
      <div class="pilotage-metric-card__label">${escapeHtml(label)}</div>
      <div class="pilotage-metric-card__value">${escapeHtml(value)}</div>
      ${hint ? `<div class="pilotage-metric-card__hint">${escapeHtml(hint)}</div>` : ""}
    </article>
  `;
}

export function renderExecutionInsightsCardsSection() {
  const metrics = getRunMetrics();

  return `
    <section class="settings-section" id="insights-execution">
      <div class="settings-card">
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
            hint: "Actions ayant produit un verdict d’exécution."
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

export function renderProjectInsights(root) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Indicateurs",
    variant: "insights"
  });

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="projectInsightsScroll">
        <div class="settings-content" style="max-width:1216px;margin:0 auto;padding:24px 32px 40px;">
          <header class="settings-page-header">
            <h2>Indicateurs</h2>
            <p>
              Cet onglet devient le vrai point d’entrée des indicateurs d’exécution.
            </p>
          </header>

          ${renderExecutionInsightsCardsSection()}
        </div>
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(document.getElementById("projectInsightsScroll"));
}
