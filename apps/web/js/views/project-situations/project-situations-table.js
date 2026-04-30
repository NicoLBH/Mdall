import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderStatusBadge } from "../ui/status-badges.js";
import { renderTableHeadFilterToggle } from "../ui/table-head-filter-toggle.js";
import { renderDataTableHead } from "../ui/data-table-shell.js";
import { renderIssuesTable } from "../ui/issues-table.js";
import { normalizePaginationState, renderPaginationControls } from "../ui/pagination.js";

export function createProjectSituationsTable({
  store,
  uiState,
  getSituations,
  getPaginatedSituations,
  getSituationsPaginationState,
  normalizeSituationMode,
  normalizeSituationStatus,
  renderSituationCount,
  formatSituationUpdatedLabel,
  getCurrentSituationsStatusFilter,
  getSituationsStatusCounts
}) {
  function renderModePill(mode) {
    return renderStatusBadge({
      label: normalizeSituationMode(mode) === "automatic" ? "Automatique" : "Manuelle",
      tone: normalizeSituationMode(mode) === "automatic" ? "accent" : "default"
    });
  }

  function getSituationsTableHeadHtml() {
    const current = getCurrentSituationsStatusFilter();
    const counts = getSituationsStatusCounts();
    return renderDataTableHead({
      columns: [
        {
          className: "cell cell-theme",
          html: renderTableHeadFilterToggle({
            activeValue: current,
            items: [
              { label: "Ouverts", value: "open", count: counts.open, dataAttr: "situations-status-filter" },
              { label: "Fermés", value: "closed", count: counts.closed, dataAttr: "situations-status-filter" }
            ]
          })
        },
        { className: "cell", label: "Nb sujets" }
      ]
    });
  }

  function renderSituationTitleCell(situation) {
    const title = escapeHtml(situation.title);
    const updatedLabel = escapeHtml(formatSituationUpdatedLabel(situation.updated_at || situation.created_at || ""));
    const selectedClass = store.situationsView?.selectedSituationId === situation.id ? " selected subissue-row--selected" : "";

    return `
      <div class="issue-row issue-row--sit${selectedClass}">
        <div class="cell cell-theme lvl0">
          <span class="issue-row-title-grid">
            <span class="issue-row-title-grid__status" aria-hidden="true">${svgIcon(normalizeSituationStatus(situation.status) === "closed" ? "table-check" : "table", { className: "octicon" })}</span>
            <span class="issue-row-title-grid__title">
              <span class="project-situations-table__title-inline">
                <button type="button" class="row-title-trigger theme-text theme-text--sit project-situations-table__title-trigger" data-open-situation="${escapeHtml(situation.id)}">${title}</button>
                ${renderModePill(situation.mode)}
              </span>
            </span>
            <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${updatedLabel}</span>
          </span>
        </div>
        <div class="cell mono">${escapeHtml(renderSituationCount(situation.id))}</div>
      </div>
    `;
  }

  function renderSituationsTable() {
    const allSituations = getSituations();
    const selectorPagination = typeof getSituationsPaginationState === "function" ? getSituationsPaginationState(allSituations.length) : null;
    const pagination = normalizePaginationState({
      totalItems: allSituations.length,
      pageSize: store?.situationsView?.pagination?.pageSize ?? selectorPagination?.pageSize,
      currentPage: store?.situationsView?.pagination?.currentPage ?? selectorPagination?.currentPage
    });
    const situations = typeof getPaginatedSituations === "function" ? getPaginatedSituations() : allSituations;

    if (uiState.error) {
      return `<div class="settings-inline-error">${escapeHtml(uiState.error)}</div>`;
    }

    if (uiState.loading && !situations.length) {
      return renderIssuesTable({
        gridTemplate: "minmax(420px, 1.6fr) 90px",
        headHtml: getSituationsTableHeadHtml(),
        emptyTitle: "Chargement des situations…",
        emptyDescription: ""
      });
    }

    const tableHtml = renderIssuesTable({
      gridTemplate: "minmax(420px, 1.6fr) 90px",
      headHtml: getSituationsTableHeadHtml(),
      rowsHtml: situations.map((situation) => renderSituationTitleCell(situation)).join(""),
      emptyTitle: "Aucune situation",
      emptyDescription: "Aucune situation n’est disponible pour ce projet."
    });
    const paginationHtml = renderPaginationControls(pagination, { entity: "situations" });
    return `${tableHtml}${paginationHtml}`;
  }

  return {
    renderModePill,
    getSituationsTableHeadHtml,
    renderSituationTitleCell,
    renderSituationsTable
  };
}
