import { escapeHtml } from "../utils/escape-html.js";
import { renderDoctrinePage } from "./project-doctrine-page.js";
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

function renderActionPerformanceSection() {
  const metrics = getRunMetrics();

  return `
    <section class="settings-section" id="pilotage-actions-performance">
      <h3>Actions - Suivi des performances</h3>
      <p class="settings-lead">
        Première vue de pilotage alimentée par le run log partagé. Elle expose les performances d’exécution observées localement dans le PoC.
      </p>

      <div class="settings-card">
        <div class="settings-card__head">
          <div>
            <h4>Indicateurs d’exécution</h4>
            <p>
              Ces indicateurs préfigurent le futur suivi opérationnel des actions Rapsobot : cadence d’usage, succès des traitements et temps d’exécution.
            </p>
          </div>
          <span class="settings-badge mono">LIVE METRICS</span>
        </div>

        <div class="pilotage-metrics-grid">
          ${renderMetricCard({
            label: "Dernier traitement",
            value: formatDuration(metrics.lastRunDurationMs),
            hint: "Durée du run le plus récent terminé ou en échec."
          })}

          ${renderMetricCard({
            label: "Nombre d’actions exécutées",
            value: formatInteger(metrics.totalRuns),
            hint: "Nombre total d’entrées actuellement présentes dans le journal d’exécution."
          })}

          ${renderMetricCard({
            label: "Taux de succès",
            value: formatPercent(metrics.successRate),
            hint: "Part des actions terminées avec succès parmi les actions journalisées."
          })}

          ${renderMetricCard({
            label: "Durée moyenne",
            value: formatDuration(metrics.averageDurationMs),
            hint: "Moyenne calculée sur les runs terminés avec succès ou échec."
          })}
        </div>
      </div>
    </section>
  `;
}

export function renderProjectPilotage(root) {
  renderDoctrinePage(root, {
    contextLabel: "Indicateurs",
    variant: "pilotage",
    scrollId: "projectPilotageScroll",
    navTitle: "Indicateurs",
    pageTitle: "Indicateurs",
    pageIntro: "Cet onglet structure le pilotage du projet : activité, performance, risques, goulots d’étranglement et charge de traitement. La première implémentation du PoC commence par le suivi des actions exécutées.",
    navItems: [
      { id: "pilotage-actions-performance", label: "Actions - Suivi des performances" },
      { id: "pilotage-activite", label: "Activité" },
      { id: "pilotage-risques", label: "Risques" },
      { id: "pilotage-charge", label: "Charge" }
    ],
    topHtml: renderActionPerformanceSection(),
    sections: [
      {
        id: "pilotage-activite",
        title: "Activité",
        lead: "L’activité agrègera le volume de sujets, d’avis, de propositions et d’actions, ainsi que leur dynamique dans le temps.",
        blocks: [
          {
            title: "Indicateurs visés",
            description: "Cette zone affichera ensuite des tendances et des ventilations par phase, lot, criticité ou intervenant.",
            items: [
              "Nombre de sujets ouverts / fermés par période.",
              "Répartition des avis par statut et par domaine.",
              "Volume de propositions émises, approuvées, rejetées.",
              "Évolution des temps de traitement et de relecture."
            ]
          }
        ]
      },
      {
        id: "pilotage-risques",
        title: "Risques",
        lead: "Le pilotage des risques fera ressortir les points sensibles : blocages, écarts critiques, accumulation d’incohérences ou zones du projet insuffisamment couvertes.",
        blocks: [
          {
            title: "Angles de lecture",
            description: "Le but n’est pas seulement de compter, mais d’orienter l’attention des acteurs vers les points à arbitrer.",
            items: [
              "Sujets bloquants non traités avant jalon.",
              "Accumulation d’avis défavorables ou réservés.",
              "Lots ou zones du projet insuffisamment documentés.",
              "Retards de validation sur les actions critiques."
            ]
          }
        ]
      },
      {
        id: "pilotage-charge",
        title: "Charge",
        lead: "La charge suivra l’intensité opérationnelle du projet : volume à traiter, files d’attente, pics d’activité et répartition des efforts.",
        blocks: [
          {
            title: "Mesures de charge à terme",
            description: "Ces indicateurs aideront à piloter l’absorption des flux documentaires et des demandes de validation.",
            items: [
              "Nombre d’actions en attente ou en cours.",
              "Temps moyen de passage entre étapes.",
              "Répartition des charges par acteur ou discipline.",
              "Détection des goulots d’étranglement de validation."
            ]
          }
        ]
      }
    ]
  });
}
