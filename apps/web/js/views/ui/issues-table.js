import { escapeHtml } from "../../utils/escape-html.js";
import {
  renderDataTableShell,
  renderDataTableEmptyState,
  renderDataTableLoadingState
} from "./data-table-shell.js";

export function renderIssuesTable({
  headHtml = "",
  rowsHtml = "",
  gridTemplate = "",
  className = "issues-table",
  headClassName = "",
  bodyClassName = "",
  emptyTitle = "Aucun résultat",
  emptyDescription = "",
  state = "auto",
  loadingTitle = "Chargement…",
  loadingDescription = ""
} = {}) {
  const hasRows = typeof rowsHtml === "string"
    ? rowsHtml.trim().length > 0
    : !!rowsHtml;

  const resolvedState = state === "auto"
    ? (hasRows ? "ready" : "empty")
    : state;

  return renderDataTableShell({
    className,
    headHtml,
    bodyHtml: hasRows ? rowsHtml : "",
    headClassName,
    bodyClassName,
    gridTemplate,
    state: resolvedState,
    emptyHtml: renderDataTableEmptyState({
      title: emptyTitle,
      description: emptyDescription
    }),
    loadingHtml: renderDataTableLoadingState({
      title: loadingTitle,
      description: loadingDescription
    })
  });
}

export function renderSubIssuesTable({
  rowsHtml = "",
  className = "issues-table subissues-table",
  emptyTitle = "Aucun résultat",
  emptyDescription = ""
} = {}) {
  return renderIssuesTable({
    className,
    rowsHtml,
    emptyTitle,
    emptyDescription
  });
}

export function renderSubIssuesPanel({
  title,
  leftMetaHtml = "",
  rightMetaHtml = "",
  bodyHtml = "",
  isOpen = false
} = {}) {
  const chevronIcon = `
    <span class="subject-meta-collapsible-toggle__chevron" aria-hidden="true">
      <svg class="${isOpen ? "octicon octicon-chevron-up" : "octicon octicon-chevron-down"}" viewBox="0 0 16 16" width="16" height="16" role="img">
        <use href="assets/icons.svg#${isOpen ? "chevron-up" : "chevron-down"}" xlink:href="assets/icons.svg#${isOpen ? "chevron-up" : "chevron-down"}"></use>
      </svg>
    </span>
  `;
  return `
    <div class="details-subissues">
      <div class="subissues-head click" data-action="toggle-subissues">
        <div class="subissues-head-left">
          ${chevronIcon}
          <span class="subissues-title">${escapeHtml(title || "")}</span>
          ${leftMetaHtml || ""}
        </div>
        <div class="subissues-head-right">
          ${rightMetaHtml || ""}
        </div>
      </div>
      <div class="subissues-body ${isOpen ? "" : "hidden"}">
        ${bodyHtml || ""}
      </div>
    </div>
  `;
}
