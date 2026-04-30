const DEFAULT_PAGE_SIZE = 25;
const EDGE_WINDOW_SIZE = 2;
const MIDDLE_WINDOW_SIZE = 3;

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizePaginationState({ totalItems, pageSize, currentPage } = {}) {
  const safeTotalItems = Math.max(0, Number.parseInt(totalItems, 10) || 0);
  const safePageSize = normalizePositiveInteger(pageSize, DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize));
  const normalizedPage = clamp(normalizePositiveInteger(currentPage, 1), 1, totalPages);
  const startIndex = (normalizedPage - 1) * safePageSize;
  const endIndex = Math.min(safeTotalItems, startIndex + safePageSize);

  return {
    totalItems: safeTotalItems,
    pageSize: safePageSize,
    totalPages,
    currentPage: normalizedPage,
    startIndex,
    endIndex,
    hasPreviousPage: normalizedPage > 1,
    hasNextPage: normalizedPage < totalPages
  };
}

export function paginateItems(items = [], paginationState) {
  const safeItems = Array.isArray(items) ? items : [];
  const normalized = normalizePaginationState({
    totalItems: safeItems.length,
    pageSize: paginationState?.pageSize,
    currentPage: paginationState?.currentPage
  });

  return {
    ...normalized,
    items: safeItems.slice(normalized.startIndex, normalized.endIndex)
  };
}

function getVisiblePages(currentPage, totalPages) {
  const pages = new Set();

  for (let page = 1; page <= Math.min(totalPages, EDGE_WINDOW_SIZE); page += 1) pages.add(page);
  const middleStart = Math.max(1, currentPage - 1);
  const middleEnd = Math.min(totalPages, middleStart + MIDDLE_WINDOW_SIZE - 1, currentPage + 1);
  for (let page = middleStart; page <= middleEnd; page += 1) pages.add(page);
  for (let page = Math.max(1, totalPages - EDGE_WINDOW_SIZE + 1); page <= totalPages; page += 1) pages.add(page);

  const sorted = [...pages].sort((a, b) => a - b);
  const tokens = [];

  for (const page of sorted) {
    const previous = tokens.length ? tokens[tokens.length - 1] : null;
    if (typeof previous === 'number' && page - previous > 1) tokens.push('ellipsis');
    tokens.push(page);
  }

  return tokens;
}

function renderPaginationButton({ entity, page, label, isActive = false, isDisabled = false }) {
  const classes = ["project-pagination__button"];
  if (isActive) classes.push("project-pagination__button--active");
  if (isDisabled) classes.push("project-pagination__button--disabled");

  const disabledAttr = isDisabled ? ' aria-disabled="true" tabindex="-1"' : "";

  return `<button type="button" class="${classes.join(" ")}" data-pagination-entity="${entity}" data-pagination-page="${page}"${disabledAttr}>${label}</button>`;
}

export function renderPaginationControls(paginationState, options = {}) {
  const entity = String(options.entity || "").trim();
  if (!entity) return "";

  const normalized = normalizePaginationState(paginationState);
  if (normalized.totalPages <= 1) return "";

  const pageTokens = getVisiblePages(normalized.currentPage, normalized.totalPages);
  const pageButtons = pageTokens.map((token) => {
    if (token === 'ellipsis') return '<span class="project-pagination__ellipsis" aria-hidden="true">...</span>';

    return renderPaginationButton({
      entity,
      page: token,
      label: String(token),
      isActive: token === normalized.currentPage
    });
  }).join("");

  return `<nav class="project-pagination" aria-label="Pagination">
    ${renderPaginationButton({
      entity,
      page: normalized.currentPage - 1,
      label: "Previous",
      isDisabled: !normalized.hasPreviousPage
    })}
    ${pageButtons}
    ${renderPaginationButton({
      entity,
      page: normalized.currentPage + 1,
      label: "Next",
      isDisabled: !normalized.hasNextPage
    })}
  </nav>`;
}
