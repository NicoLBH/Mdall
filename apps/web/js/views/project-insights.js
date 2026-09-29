import { escapeHtml } from "../utils/escape-html.js";
import { setProjectViewHeader, clearProjectActiveScrollSource, debugProjectScrollPolicy } from "./project-shell-chrome.js";
import { getRunMetrics } from "../services/project-automation.js";
import { getAllSubjects, getProjectInsightsMetrics } from "../services/project-insights-metrics.js";
import { renderSvgLineChart, getNiceChartTicks } from "../utils/svg-line-chart.js";
import { store } from "../store.js";
import {
  bornesDuMois, moisEnCours, moisEnFrancais, partDeLaPersonne
} from "../services/consommation-ia.js";
import {
  renderAttente, renderCarteDeConsommation, renderConsommation
} from "./consommation/ecran-de-consommation.js";
import { vecteurDeContexte } from "../services/vecteur-de-contexte.js";
import { episodeDuProjet } from "../services/episode-du-projet.js";
import { renderLaForme } from "./ui/forme-du-chantier.js";

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
  clearProjectActiveScrollSource();

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
        <div id="projectInsightsForme"></div>
        <div id="projectInsightsConsommation"></div>
      </div>
    </section>
  `;

  dessinerLaForme(root);
  dessinerLaConsommation(root);
  debugProjectScrollPolicy("render-project-insights");
}

/* ── La forme de ce chantier, et sa suite ────────────────────────────────── */

/**
 * Ce qui a été lu du contexte, et pour quel projet.
 *
 * Les faits de contexte et la mémoire viennent de la base ; la phase, les
 * rôles et les sujets sont déjà dans le magasin. On ne relit que ce qu'on n'a
 * pas.
 */
const formeDuProjetLue = { projetId: "", faits: null, assertions: null, enCours: false, echec: false };

/**
 * La forme d'un chantier, telle que ce projet la donne aujourd'hui.
 *
 * **Chaque valeur est prise là où elle vit déjà** : la phase et les rôles dans
 * le magasin, les zones dans les faits de contexte. Les redécouvrir ici en
 * ferait deux lectures du même fait (règle 10).
 */
function laFormeDeCeChantier() {
  const faits = new Map(
    (formeDuProjetLue.faits ?? []).map((fait) => [String(fait?.fact_key ?? ""), fait?.fact_value])
  );

  return vecteurDeContexte({
    phase: store.projectForm?.currentPhase ?? "",
    sismique: faits.get("seismic_zone"),
    neige: faits.get("snow_zone"),
    vent: faits.get("wind_zone"),
    niveaux: faits.get("floors_count"),
    // **Les codes, jamais les noms.** Un collaborateur porte un nom et une
    // société ; sa place sur le chantier est un code du catalogue, et c'est
    // tout ce que la forme retient.
    roles: (store.projectForm?.collaborators ?? []).map((un) => String(un?.roleCode ?? ""))
  });
}

function dessinerLaForme(root) {
  const hote = root?.querySelector?.("#projectInsightsForme");
  if (!hote) return;

  const projet = String(store.currentProjectId || "").trim();
  if (!projet) return;

  if (formeDuProjetLue.projetId === projet && !formeDuProjetLue.enCours) {
    peindreLaForme(hote);
    return;
  }

  if (formeDuProjetLue.enCours) return;
  formeDuProjetLue.enCours = true;
  formeDuProjetLue.projetId = projet;
  peindreLaForme(hote);

  (async () => {
    try {
      const [{ listProjectContextFacts }, { resolveCurrentBackendProjectId }, memoire] =
        await Promise.all([
          import("../services/project-context-facts-service.js"),
          import("../services/project-supabase-sync.js"),
          import("../services/project-memory-supabase.js")
        ]);

      // **Deux identifiants, et il faut le bon** : la route porte celui du
      // frontal, la base classe tout par un UUID.
      const backendProjectId = await resolveCurrentBackendProjectId();
      const [faits, assertions] = await Promise.all([
        backendProjectId ? listProjectContextFacts(backendProjectId).catch(() => null) : null,
        backendProjectId ? memoire.listProjectAssertions(backendProjectId).catch(() => null) : null
      ]);

      formeDuProjetLue.echec = faits === null && assertions === null;
      formeDuProjetLue.faits = faits;
      formeDuProjetLue.assertions = assertions;
    } catch {
      formeDuProjetLue.echec = true;
      formeDuProjetLue.faits = null;
      formeDuProjetLue.assertions = null;
    } finally {
      formeDuProjetLue.enCours = false;
      peindreLaForme(hote);
    }
  })();
}

function peindreLaForme(hote) {
  if (!hote?.isConnected) return;

  if (formeDuProjetLue.enCours) {
    hote.innerHTML = renderAttente("Lecture de la forme du chantier");
    return;
  }

  const vecteur = laFormeDeCeChantier();
  const episode = episodeDuProjet({
    contexte: vecteur,
    // Les sujets sont déjà dans le magasin : les relire ferait un aller-retour
    // pour une liste qu'on a sous la main. Et c'est le fichier des indicateurs
    // qui sait où le magasin les range — à trois endroits selon l'écran ouvert.
    sujets: getAllSubjects(),
    assertions: formeDuProjetLue.assertions ?? []
  });

  hote.innerHTML = renderLaForme(vecteur, episode);
}

/* ── Ce que l'IA a consommé sur ce projet ────────────────────────────────── */

/**
 * Deux totaux, et c'est délibéré.
 *
 * **Le projet entier** répond à « combien ce chantier a-t-il coûté », qui est la
 * question du projet. **Ma part** répond à « combien y ai-je dépensé », qui est
 * la question de celui qui regarde. Ne montrer que le premier laisserait chacun
 * deviner sa part ; ne montrer que le second cacherait le coût du chantier.
 *
 * On ne détaille **pas par collaborateur** : le total s'explique par le projet
 * et par soi, et afficher qui a consommé quoi ferait du compteur un outil de
 * surveillance — ce que sa table refuse déjà de rendre possible.
 */
const consommationDuProjetLue = {
  projetId: "", appels: null, enCours: false, echec: false,
  // Le journal des pannes du mois, et son échec à part : une lecture ratée du
  // compteur ne dit rien de celle du journal.
  refus: null, refusEchec: false
};

function dessinerLaConsommation(root) {
  const hote = root?.querySelector?.("#projectInsightsConsommation");
  if (!hote) return;

  const projet = String(store.currentProjectId || "").trim();
  if (!projet) return;

  if (consommationDuProjetLue.projetId === projet && !consommationDuProjetLue.enCours) {
    peindreLaConsommation(hote);
    return;
  }

  if (consommationDuProjetLue.enCours) return;
  consommationDuProjetLue.enCours = true;
  consommationDuProjetLue.projetId = projet;
  peindreLaConsommation(hote);

  (async () => {
    try {
      const [{ consommationDuProjet }, { resolveCurrentBackendProjectId }, { refusDuProjet }] =
        await Promise.all([
          import("../services/consommation-ia-supabase.js"),
          import("../services/project-supabase-sync.js"),
          import("../services/journal-des-refus-supabase.js")
        ]);

      // **Deux identifiants, et il faut le bon.** La route porte celui du
      // frontal, la base classe tout par un UUID : passer le premier rendrait
      // une liste vide, qui ressemble à « rien n'a été consommé ».
      const backendProjectId = await resolveCurrentBackendProjectId();
      const bornes = bornesDuMois(moisEnCours());
      // **Les deux lectures ensemble.** Ce qui a coûté et ce qui n'a pas abouti
      // se lisent d'un même mouvement ; en série, on attendrait deux fois pour
      // un seul écran.
      const [lues, pannes] = await Promise.all([
        backendProjectId ? consommationDuProjet({ projectId: backendProjectId, ...bornes }) : null,
        backendProjectId ? refusDuProjet({ projectId: backendProjectId, ...bornes }) : null
      ]);

      consommationDuProjetLue.echec = lues === null;
      consommationDuProjetLue.appels = lues;
      consommationDuProjetLue.refusEchec = pannes === null;
      consommationDuProjetLue.refus = pannes;
    } catch {
      consommationDuProjetLue.echec = true;
      consommationDuProjetLue.appels = null;
      consommationDuProjetLue.refusEchec = true;
      consommationDuProjetLue.refus = null;
    } finally {
      consommationDuProjetLue.enCours = false;
      peindreLaConsommation(hote);
    }
  })();
}

function peindreLaConsommation(hote) {
  if (!hote?.isConnected) return;

  if (consommationDuProjetLue.enCours) {
    hote.innerHTML = renderAttente("Lecture de la consommation du projet");
    return;
  }

  const appels = consommationDuProjetLue.echec ? null : (consommationDuProjetLue.appels ?? []);
  const mois = moisEnFrancais(moisEnCours());
  const bornes = bornesDuMois(moisEnCours());
  const moi = String(store.user?.id ?? "").trim();

  hote.innerHTML = renderConsommation({
    appels,
    bornes,
    parProjets: false,
    titreDuTotal: `Ce projet — ${mois}`,
    detailDuTotal: "Tous les collaborateurs de ce projet.",
    refus: consommationDuProjetLue.refusEchec ? null : (consommationDuProjetLue.refus ?? []),
    enTeteHtml: appels === null || !moi ? "" : renderCarteDeConsommation({
      total: partDeLaPersonne(appels, moi),
      titre: "Ma part sur ce projet",
      detail: "Vos appels uniquement."
    })
  });
}


