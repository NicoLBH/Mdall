import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderSettingsModal } from "../ui/settings-modal.js";
import { renderStatusBadge } from "../ui/status-badges.js";
import { renderSideNavLayout, renderSideNavGroup, renderSideNavItem } from "../ui/side-nav-layout.js";
import { renderLightTabs } from "../ui/light-tabs.js";
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
                    <button type="button" class="gh-btn gh-action__main gh-btn--default gh-btn--md">
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

    const contentHtml = `
      <div class="project-situation-edit" data-side-nav-panel="situation-settings-panel">
        <div class="project-situation-edit__header">
          <button type="button" class="project-situation-edit__back" data-close-situation-edit>
            <span class="project-situation-edit__back-icon">${svgIcon("arrow-left", { className: "octicon octicon-arrow-left route-title-module__Octicon__vxu4r", width: 24, height: 24 })}</span>
          </button>
          <h1 class="project-situation-edit__title">Paramètres</h1>
        </div>
        <section class="gh-panel gh-panel--details project-situation-edit__panel">
          <div class="gh-panel__head gh-panel__head--tight">
            <div>
              <div class="details-title">Paramètres de la situation</div>
              <div class="issue-row-meta-text" style="margin-top:6px;">Mets à jour les informations de la situation sans changer son mode.</div>
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
    `;

    return `
      <div class="settings-shell settings-shell--parametres settings-shell--situation-edit">
        ${renderSideNavLayout({
          className: "settings-layout settings-layout--parametres settings-layout--situation-edit",
          navClassName: "settings-nav settings-nav--parametres settings-nav--situation-edit",
          contentClassName: "settings-content settings-content--parametres settings-content--situation-edit",
          navHtml,
          contentHtml
        })}
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
              ? `${uiState.editPanelOpen ? renderEditSituationPanel() : renderSelectedSituationDetails()}`
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
