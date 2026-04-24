import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderSettingsModal } from "../ui/settings-modal.js";
import { renderStatusBadge } from "../ui/status-badges.js";
import { renderSideNavGroup, renderSideNavItem } from "../ui/side-nav-layout.js";
import { renderLightTabs } from "../ui/light-tabs.js";
import { renderSvgLineChart } from "../../utils/svg-line-chart.js";
import { renderSituationForm } from "./project-situations-form.js";
import { renderSituationGridView } from "./project-situations-view-grid.js";
import { renderSituationRoadmapView } from "./project-situations-view-roadmap.js";

export function createProjectSituationsView({
  store,
  uiState,
  getDefaultCreateForm,
  getSituationEditForm,
  normalizeSituationMode,
  renderSituationsTable,
  getSituationById,
  renderSituationKanban
}) {
  function renderSituationInsightsBarChart({ labels = [], values = [], yTicks = [0, 1], yMax = 1 } = {}) {
    const safeLabels = Array.isArray(labels) ? labels : [];
    const safeValues = Array.isArray(values) ? values : [];
    const width = 964;
    const height = 478;
    const margin = { top: 24, right: 24, bottom: 120, left: 56 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const barGap = 10;
    const barCount = Math.max(1, safeLabels.length);
    const barWidth = Math.max(12, (innerWidth - (barGap * (barCount - 1))) / barCount);
    const domainMax = Math.max(1, Number(yMax) || 1);
    const scaleY = (value) => innerHeight - ((Math.max(0, Number(value) || 0) / domainMax) * innerHeight);
    const truncate = (value, max = 14) => {
      const raw = String(value || "");
      return raw.length > max ? `${raw.slice(0, max - 1)}…` : raw;
    };

    return `
      <div class="svg-line-chart">
        <div class="svg-line-chart__frame">
          <svg class="svg-line-chart__svg" width="${width}" height="${height}" role="img" aria-label="Distribution des sujets">
            <g transform="translate(${margin.left},${margin.top})">
              <g class="svg-line-chart__grid svg-line-chart__grid--y svg-line-chart__grid--dashed">
                ${(Array.isArray(yTicks) ? yTicks : []).filter((_, index) => index !== 0).map((tick) => {
                  const y = scaleY(tick);
                  return `<g class="svg-line-chart__tick" transform="translate(0,${y.toFixed(3)})"><line x2="${innerWidth}" y2="0"></line></g>`;
                }).join("")}
              </g>
              <g class="svg-line-chart__axis svg-line-chart__axis--x" transform="translate(0,${innerHeight})">
                <path d="M0.5,0.5H${(innerWidth + 0.5).toFixed(1)}"></path>
                ${safeLabels.map((label, index) => {
                  const x = index * (barWidth + barGap) + (barWidth / 2);
                  return `<g class="svg-line-chart__axis-tick" transform="translate(${x.toFixed(3)},0)"><text y="16" transform="rotate(35 0 16)" text-anchor="start">${escapeHtml(truncate(label))}</text></g>`;
                }).join("")}
              </g>
              <g class="svg-line-chart__axis svg-line-chart__axis--y">
                <path d="M0.5,${(innerHeight + 0.5).toFixed(1)}V0.5"></path>
                ${(Array.isArray(yTicks) ? yTicks : []).map((tick) => {
                  const y = scaleY(tick);
                  return `<g class="svg-line-chart__axis-tick" transform="translate(0,${y.toFixed(3)})"><text x="-8" dy="0.32em">${escapeHtml(String(tick))}</text></g>`;
                }).join("")}
              </g>
              <g>
                ${safeValues.map((value, index) => {
                  const barHeight = Math.max(0, innerHeight - scaleY(value));
                  const x = index * (barWidth + barGap);
                  const y = innerHeight - barHeight;
                  return `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${barWidth.toFixed(3)}" height="${barHeight.toFixed(3)}" rx="4" class="svg-line-chart__area"></rect>`;
                }).join("")}
              </g>
            </g>
          </svg>
        </div>
      </div>
    `;
  }

  function getSelectedSituationLayout() {
    const layout = String(store.situationsView?.selectedSituationLayout || "").trim().toLowerCase();
    if (layout === "planning") return "roadmap";
    return ["grille", "tableau", "roadmap"].includes(layout) ? layout : "tableau";
  }

  function renderSituationLayoutTabs() {
    return renderLightTabs({
      tabs: [
        { id: "grille", label: "Grille", iconName: "table" },
        { id: "tableau", label: "Tableau", iconName: "project-view" },
        { id: "roadmap", label: "Trajectoire", iconName: "project-roadmap" }
      ],
      activeTabId: getSelectedSituationLayout(),
      ariaLabel: "Modes d'affichage de la situation",
      className: "settings-lots-tabs project-situation-layout-tabs"
    });
  }

  function renderSelectedSituationLayoutBody(selectedSituation) {
    const selectedLayout = getSelectedSituationLayout();
    if (selectedLayout === "tableau") {
      return renderSituationKanban(selectedSituation, uiState.selectedSituationSubjects, { loading: uiState.selectedSituationLoading });
    }
    if (selectedLayout === "grille") {
      return renderSituationGridView(selectedSituation, uiState.selectedSituationSubjects);
    }
    return renderSituationRoadmapView(selectedSituation, uiState.selectedSituationSubjects);
  }

  function renderSituationInsightsPanel() {
    const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
    const selectedSituation = getSituationById(selectedSituationId);
    if (!selectedSituation) return renderSelectedSituationDetails();

    const activeChart = String(uiState.insightsActiveChart || "burnup");
    const chartLabels = {
      burnup: "Évolution des sujets",
      labels: "Répartition par Labels",
      objectives: "Répartition par objectifs"
    };
    const chartDescriptions = {
      burnup: "Ce graphique montre l'évolution des sujets ouverts et fermés sur la période sélectionnée, afin de suivre la dynamique globale de traitement.",
      labels: "Ce graphique présente la répartition des sujets par Labels pour identifier rapidement les thématiques les plus représentées.",
      objectives: "Ce graphique présente la répartition des sujets par objectifs pour visualiser les axes projet qui concentrent le plus de sujets."
    };

    const navHtml = renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      items: [
        renderSideNavItem({
          label: "Évolution des sujets",
          targetId: "situation-insights-panel",
          iconHtml: svgIcon("situation-insights"),
          isActive: activeChart === "burnup",
          isPrimary: true,
          dataAttributes: {
            "data-situation-insights-chart": "burnup"
          }
        }),
        renderSideNavItem({
          label: "Répartition par Labels",
          targetId: "situation-insights-panel",
          iconHtml: svgIcon("labels-distribution"),
          isActive: activeChart === "labels",
          dataAttributes: {
            "data-situation-insights-chart": "labels"
          }
        }),
        renderSideNavItem({
          label: "Répartition par objectifs",
          targetId: "situation-insights-panel",
          iconHtml: svgIcon("graph"),
          isActive: activeChart === "objectives",
          dataAttributes: {
            "data-situation-insights-chart": "objectives"
          }
        })
      ]
    });

    const activeRange = String(uiState.insightsRange || "2w");
    const burnupData = uiState.insightsData?.burnup || null;
    const labelsData = uiState.insightsData?.labels || null;
    const objectivesData = uiState.insightsData?.objectives || null;
    const hasSituationSubjects = Array.isArray(uiState.selectedSituationSubjects) && uiState.selectedSituationSubjects.length > 0;
    const labels = Array.isArray(burnupData?.labels) ? burnupData.labels : [];
    const chartHtml = renderSvgLineChart({
      width: 964,
      height: 478,
      xLabel: "",
      yLabel: "",
      xDomain: [0, Math.max(1, labels.length - 1)],
      yDomain: [0, Math.max(1, Number(burnupData?.yMax) || 1)],
      xTicks: Array.isArray(burnupData?.xTicks) ? burnupData.xTicks : [0],
      yTicks: Array.isArray(burnupData?.yTicks) ? burnupData.yTicks : [0, 1],
      xTickFormatter: (tick) => {
        const index = Number(tick);
        const label = labels[index] || "";
        return label ? label.slice(5) : "";
      },
      series: Array.isArray(burnupData?.series) ? burnupData.series : []
    });
    const labelsChartHtml = renderSituationInsightsBarChart({
      labels: labelsData?.labels || [],
      values: labelsData?.values || [],
      yTicks: labelsData?.yTicks || [0, 1],
      yMax: labelsData?.yMax || 1
    });
    const objectivesLineChartHtml = renderSvgLineChart({
      width: 964,
      height: 478,
      xLabel: "",
      yLabel: "",
      xDomain: [0, Math.max(1, (objectivesData?.labels || []).length - 1)],
      yDomain: [0, Math.max(1, Number(objectivesData?.yMax) || 1)],
      xTicks: Array.from({ length: (objectivesData?.labels || []).length }, (_, index) => index),
      yTicks: Array.isArray(objectivesData?.yTicks) ? objectivesData.yTicks : [0, 1],
      xTickFormatter: (tick) => {
        const label = (objectivesData?.labels || [])[Number(tick)] || "";
        return label.length > 16 ? `${label.slice(0, 15)}…` : label;
      },
      series: [{
        label: "Count of Items",
        points: (objectivesData?.values || []).map((value, index) => ({ x: index, y: Number(value) || 0 })),
        fill: true,
        color: "#0078ff",
        areaColor: "color(srgb 0 0.101961 0.278431 / 0.5)",
        areaOpacity: 1,
        lineWidth: 2,
        lineDasharray: "none",
        legendMarker: "circle",
        curve: "smooth"
      }]
    });
    let chartShellContent = "";
    if (uiState.insightsLoading) {
      chartShellContent = `<div class="settings-empty-state">Chargement des indicateurs…</div>`;
    } else if (uiState.insightsError) {
      chartShellContent = `<div class="settings-inline-error">${escapeHtml(uiState.insightsError)}</div>`;
    } else if (!hasSituationSubjects) {
      chartShellContent = `<div class="settings-empty-state">Aucun sujet rattaché à cette situation.</div>`;
    } else if (activeChart === "burnup") {
      chartShellContent = chartHtml;
    } else if (activeChart === "labels") {
      chartShellContent = (labelsData?.labels || []).length
        ? labelsChartHtml
        : `<div class="settings-empty-state">Aucun label trouvé pour les sujets de cette situation.</div>`;
    } else {
      chartShellContent = (objectivesData?.labels || []).length
        ? objectivesLineChartHtml
        : `<div class="settings-empty-state">Aucun objectif trouvé pour les sujets de cette situation.</div>`;
    }

    return `
      <div class="settings-shell settings-shell--parametres settings-shell--situation-edit settings-shell--situation-insights">
        <div class="project-situation-edit project-situation-insights">
          <div class="project-situation-edit__header">
            <button type="button" class="project-situation-edit__back" data-close-situation-insights>
              <span class="project-situation-edit__back-icon">${svgIcon("arrow-left", { className: "octicon octicon-arrow-left route-title-module__Octicon__vxu4r", width: 24, height: 24 })}</span>
            </button>
            <h1 class="project-situation-edit__title">Indicateurs</h1>
          </div>
          <div class="project-situation-edit__main">
            <aside class="project-situation-edit__aside settings-nav settings-nav--parametres settings-nav--situation-edit">
              ${navHtml}
            </aside>
            <div class="project-situation-edit__content settings-content settings-content--parametres settings-content--situation-edit" data-side-nav-panel="situation-insights-panel">
              <section class="gh-panel gh-panel--details project-situation-edit__panel project-situation-insights__panel">
                <div class="gh-panel__head gh-panel__head--tight">
                  <div>
                    <div class="details-title">${escapeHtml(chartLabels[activeChart] || chartLabels.burnup)}</div>
                  </div>
                </div>
                <div class="details-body project-situation-insights__body">
                  <p class="project-situation-insights__description">${escapeHtml(chartDescriptions[activeChart] || chartDescriptions.burnup)}</p>
                  ${activeChart === "burnup" ? `
                    <div class="project-situation-insights__ranges" role="tablist" aria-label="Plage temporelle des indicateurs">
                      <button type="button" class="project-situation-insights__range ${activeRange === "2w" ? "is-active" : ""}" data-situation-insights-range="2w">2 semaines</button>
                      <button type="button" class="project-situation-insights__range ${activeRange === "1m" ? "is-active" : ""}" data-situation-insights-range="1m">1 mois</button>
                      <button type="button" class="project-situation-insights__range ${activeRange === "3m" ? "is-active" : ""}" data-situation-insights-range="3m">3 mois</button>
                      <button type="button" class="project-situation-insights__range ${activeRange === "max" ? "is-active" : ""}" data-situation-insights-range="max">Max</button>
                    </div>
                  ` : ""}
                  <div class="project-situation-insights__chart-shell">
                    ${chartShellContent}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderCreateSituationModal() {
    if (!uiState.createModalOpen) return "";

    const form = uiState.createForm || getDefaultCreateForm();

    return renderSettingsModal({
      modalId: "projectCreateSituationModal",
      title: "Nouvelle situation",
      subtitle: "Crée une vraie situation projet stockée dans Supabase.",
      closeDataAttribute: "data-close-project-situation-modal",
      bodyHtml: renderSituationForm({
        form,
        mode: "create",
        normalizeSituationMode,
        error: uiState.createError,
        submitting: uiState.createSubmitting,
        submitButtonId: "projectCreateSituationSubmit",
        submitLabel: "Créer la situation",
        submitPendingLabel: "Création…"
      })
    });
  }

  function renderSelectedSituationDetails() {
    const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
    const selectedSituation = getSituationById(selectedSituationId);

    if (!selectedSituation) {
      return `
        <section class="gh-panel gh-panel--details gh-panel--details-situation-kanban" aria-label="Situation sélectionnée">
          <div class="gh-panel__head gh-panel__head--tight">Aucune situation sélectionnée</div>
          <div class="details-body situation-kanban-modal-detail">Sélectionne une situation dans le tableau pour ouvrir son détail.</div>
        </section>
      `;
    }

    const modeBadge = renderStatusBadge({
      label: normalizeSituationMode(selectedSituation.mode) === "automatic" ? "Automatique" : "Manuelle",
      tone: normalizeSituationMode(selectedSituation.mode) === "automatic" ? "accent" : "default"
    });
    const statusBadge = renderStatusBadge({
      label: String(selectedSituation.status || "open") === "closed" ? "Fermée" : "Ouverte",
      tone: String(selectedSituation.status || "open") === "closed" ? "muted" : "success"
    });

    return `
      <section id="situationsKanbanDetailsChrome" class="gh-panel gh-panel--details gh-panel--details-situation-kanban" aria-label="Détail de situation">
        <div id="situationsKanbanDetailsTitle" class="gh-panel__head gh-panel__head--tight details-head--expanded">
          <div class="project-situation-detail-head">
            <div class="project-situation-detail-head__main">
              <div class="project-situation-title-row">
                <div class="project-situation-title-row__group">
                  <h2 class="project-situation-title-row__title">${escapeHtml(selectedSituation.title || "Situation")}</h2>
                  <button
                    type="button"
                    class="project-situation-title-row__edit"
                    data-open-situation-edit="${escapeHtml(selectedSituation.id)}"
                    aria-label="Modifier la situation"
                    title="Modifier la situation"
                  >${svgIcon("pencil", { className: "octicon octicon-pencil" })}</button>
                </div>
                <div class="project-situation-title-row__right">
                  <div class="project-situation-detail-head__meta">${statusBadge}${modeBadge}<span class="mono-small">${uiState.selectedSituationSubjects.length} sujet(s)</span></div>
                  <div class="project-situation-title-row__actions">
                    <button type="button" class="gh-btn gh-action__main gh-btn--default gh-btn--md" data-open-situation-insights>
                      ${svgIcon("graph", { className: "octicon octicon-graph" })}<span>Indicateurs</span>
                    </button>
                    <button
                      type="button"
                      class="gh-btn gh-action__main gh-btn--default gh-btn--md"
                      data-open-situation-drilldown
                      aria-label="Étendre la barre latérale"
                      title="Étendre la barre latérale"
                    >
                      ${svgIcon("sidebar-expand", { className: "octicon octicon-sidebar-expand" })}
                    </button>
                  </div>
                </div>
              </div>
              ${renderSituationLayoutTabs()}
            </div>
          </div>
        </div>
        <div class="details-body situation-kanban-modal-detail">
          ${uiState.selectedSituationError ? `<div class="settings-inline-error">${escapeHtml(uiState.selectedSituationError)}</div>` : ""}
          ${uiState.selectedSituationLoading
            ? `<div class="settings-empty-state">Chargement des sujets de la situation…</div>`
            : renderSelectedSituationLayoutBody(selectedSituation)}
        </div>
      </section>
    `;
  }

  function renderEditSituationPanel() {
    const selectedSituationId = String(store.situationsView?.selectedSituationId || "").trim();
    const selectedSituation = getSituationById(selectedSituationId);
    const form = uiState.editForm || getSituationEditForm(selectedSituation);

    if (!selectedSituation) {
      return renderSelectedSituationDetails();
    }

    const navHtml = renderSideNavGroup({
      className: "settings-nav__group settings-nav__group--project",
      items: [renderSideNavItem({
        label: "Paramètres de la situation",
        targetId: "situation-settings-panel",
        iconHtml: svgIcon("gear", { className: "octicon octicon-gear" }),
        isActive: true,
        isPrimary: true
      })]
    });

    return `
      <div class="settings-shell settings-shell--parametres settings-shell--situation-edit">
        <div class="project-situation-edit">
          <div class="project-situation-edit__header">
            <button type="button" class="project-situation-edit__back" data-close-situation-edit>
              <span class="project-situation-edit__back-icon">${svgIcon("arrow-left", { className: "octicon octicon-arrow-left route-title-module__Octicon__vxu4r", width: 24, height: 24 })}</span>
            </button>
            <h1 class="project-situation-edit__title">Paramètres</h1>
            <div class="project-situation-edit__header-actions">
              <button type="button" class="gh-btn gh-action__main gh-btn--default gh-btn--md" data-open-situation-insights>
                ${svgIcon("graph", { className: "octicon octicon-graph" })}<span>Indicateurs</span>
              </button>
            </div>
          </div>
          <div class="project-situation-edit__main">
            <aside class="project-situation-edit__aside settings-nav settings-nav--parametres settings-nav--situation-edit">
              ${navHtml}
            </aside>
            <div class="project-situation-edit__content settings-content settings-content--parametres settings-content--situation-edit" data-side-nav-panel="situation-settings-panel">
              <section class="gh-panel gh-panel--details project-situation-edit__panel">
                <div class="gh-panel__head gh-panel__head--tight">
                  <div>
                    <div class="details-title">Paramètres de la situation</div>
                  </div>
                </div>
                <div class="details-body project-situation-edit__body">
                  ${renderSituationForm({
                    form,
                    mode: "edit",
                    normalizeSituationMode,
                    error: uiState.editError,
                    submitting: uiState.editSubmitting,
                    submitButtonId: "projectEditSituationSubmit",
                    submitLabel: "Mettre à jour les paramètres",
                    submitPendingLabel: "Mise à jour…"
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPage() {
    const hasSelectedSituation = !!String(store.situationsView?.selectedSituationId || "").trim();
    const selectedLayout = getSelectedSituationLayout();
    const layoutClassSuffix = hasSelectedSituation
      ? (selectedLayout === "tableau" ? "kanban" : selectedLayout)
      : "";

    return `
      <section class="project-simple-page project-simple-page--settings${hasSelectedSituation ? " project-simple-page--situation-view" : ""}">
        <div class="project-simple-scroll${hasSelectedSituation ? ` project-simple-scroll--situation-view project-simple-scroll--situation-${layoutClassSuffix}` : ""}" id="projectSituationsScroll">
          <div class="settings-content project-page-shell project-page-shell--content${hasSelectedSituation ? ` project-page-shell--situation-view project-page-shell--situation-${layoutClassSuffix}` : ""}">
            ${hasSelectedSituation
              ? `${uiState.insightsPanelOpen ? renderSituationInsightsPanel() : (uiState.editPanelOpen ? renderEditSituationPanel() : renderSelectedSituationDetails())}`
              : `
                <div style="display:flex;justify-content:flex-end;align-items:center;margin:0 0 16px;">
                  <button type="button" class="gh-btn gh-btn--primary" id="openCreateSituationButton">Nouvelle situation</button>
                </div>
                <section class="gh-panel gh-panel--results" aria-label="Results">
                  ${renderSituationsTable()}
                </section>
              `}
          </div>
        </div>
        ${renderCreateSituationModal()}
      </section>
    `;
  }

  function bindViewEvents() {}

  return {
    renderCreateSituationModal,
    renderSelectedSituationDetails,
    renderEditSituationPanel,
    renderPage,
    bindViewEvents
  };
}
