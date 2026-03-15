import { escapeHtml } from "../../utils/escape-html.js";

function buildTableVars(gridTemplate = "") {
  if (!gridTemplate) return "";
  const safe = escapeHtml(gridTemplate);
  return `style="--data-table-cols:${safe};--issues-cols:${safe};"`;
}

export function renderDataTableHead({ columns = [] } = {}) {
  return columns.map((column) => {
    if (typeof column === "string") {
      return `<div class="data-table-shell__col">${escapeHtml(column)}</div>`;
    }

    const className = column.className ? ` ${escapeHtml(column.className)}` : "";
    const content = column.html ?? escapeHtml(column.label ?? "");

    return `<div class="data-table-shell__col${className}">${content}</div>`;
  }).join("");
}

export function renderDataTableEmptyState({
  title = "Aucun résultat",
  description = "",
  className = ""
} = {}) {
  return `
    <div class="data-table-shell__empty emptyState ${className}">
      ${title ? `<div class="data-table-shell__empty-title">${escapeHtml(title)}</div>` : ""}
      ${description ? `<div class="data-table-shell__empty-description">${escapeHtml(description)}</div>` : ""}
    </div>
  `;
}

export function renderDataTableLoadingState({
  title = "Chargement…",
  description = "",
  className = ""
} = {}) {
  return `
    <div class="data-table-shell__loading emptyState ${className}">
      ${title ? `<div class="data-table-shell__loading-title">${escapeHtml(title)}</div>` : ""}
      ${description ? `<div class="data-table-shell__loading-description">${escapeHtml(description)}</div>` : ""}
    </div>
  `;
}

export function renderDataTableShell({
  headHtml = "",
  bodyHtml = "",
  className = "",
  headClassName = "",
  bodyClassName = "",
  gridTemplate = "",
  state = "ready", // ready | empty | loading
  emptyHtml = "",
  loadingHtml = ""
} = {}) {
  let resolvedBody = bodyHtml;

  if (state === "loading") {
    resolvedBody = loadingHtml || renderDataTableLoadingState();
  } else if (state === "empty") {
    resolvedBody = emptyHtml || renderDataTableEmptyState();
  }

  const classes = [
    "data-table-shell",
    className,
    state === "loading" ? "data-table-shell--loading" : "",
    state === "empty" ? "data-table-shell--empty" : ""
  ].filter(Boolean).join(" ");

  return `
    <div class="${classes}" ${buildTableVars(gridTemplate)}>
      ${headHtml ? `
        <div class="data-table-shell__head ${headClassName}">
          ${headHtml}
        </div>
      ` : ""}
      <div class="data-table-shell__body ${bodyClassName}">
        ${resolvedBody}
      </div>
    </div>
  `;
}
