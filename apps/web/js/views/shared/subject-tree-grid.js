function normalizeSubjectId(value) {
  return String(value || "").trim();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function getExpandedIdsSet(expandedSubjectIds) {
  if (expandedSubjectIds instanceof Set) return expandedSubjectIds;
  if (Array.isArray(expandedSubjectIds)) return new Set(expandedSubjectIds.map((value) => normalizeSubjectId(value)).filter(Boolean));
  return new Set();
}

function getChildrenList(childrenBySubjectId, subjectId) {
  const key = normalizeSubjectId(subjectId);
  if (!key) return [];
  return toArray(childrenBySubjectId?.[key]);
}

function resolveSubjectNode(subjectsById, subjectId) {
  const key = normalizeSubjectId(subjectId);
  if (!key) return null;
  return subjectsById?.[key] || null;
}

function resolveCanDrag(dndMode, depth) {
  if (dndMode === "all-levels") return true;
  if (dndMode === "first-level") return depth === 0;
  return false;
}

export function renderSubjectTreeGrid(options = {}) {
  const {
    subjects = [],
    subjectsById = {},
    childrenBySubjectId = {},
    rootSubjectIds = [],
    rootIds = rootSubjectIds,
    expandedSubjectIds = new Set(),
    getSubjectStatus = () => "",
    renderTitleCell = () => "",
    renderExtraCells = () => "",
    dndMode = "none",
    className = "",
    rowClassName = "",
    context = {},
    escapeHtml = (value) => String(value || "")
  } = options;

  const expandedIdsSet = getExpandedIdsSet(expandedSubjectIds);
  const normalizedRootIds = toArray(rootIds)
    .map((value) => normalizeSubjectId(value))
    .filter(Boolean);

  const fallbackSubjectsById = normalizedRootIds.length
    ? subjectsById
    : Object.fromEntries(toArray(subjects).map((subject) => [normalizeSubjectId(subject?.id), subject]));

  const rows = [];

  const walkTree = (subjectId, depth = 0, parentId = "") => {
    const normalizedSubjectId = normalizeSubjectId(subjectId);
    if (!normalizedSubjectId) return;

    const subjectNode = resolveSubjectNode(fallbackSubjectsById, normalizedSubjectId);
    if (!subjectNode) return;

    const nestedChildren = getChildrenList(childrenBySubjectId, normalizedSubjectId)
      .map((value) => normalizeSubjectId(value))
      .filter(Boolean);
    const hasChildren = nestedChildren.length > 0;
    const isExpanded = hasChildren && expandedIdsSet.has(normalizedSubjectId);
    const canDrag = resolveCanDrag(dndMode, depth);

    const rowContext = {
      subject: subjectNode,
      subjectId: normalizedSubjectId,
      depth,
      parentId,
      hasChildren,
      isExpanded,
      canDrag,
      status: getSubjectStatus(normalizedSubjectId),
      context
    };

    const titleCellHtml = renderTitleCell(rowContext);
    const extraCellsHtml = renderExtraCells(rowContext);

    rows.push(`
      <div
        class="issue-row issue-row--pb click ${rowClassName}${canDrag ? " subissues-sortable-row" : " subissues-tree-row"}"
        data-sujet-id="${escapeHtml(normalizedSubjectId)}"
        ${canDrag ? 'data-subissue-sortable-row="true"' : ""}
        data-subissue-tree-row="${escapeHtml(normalizedSubjectId)}"
        data-subissue-depth="${depth}"
        data-parent-subject-id="${escapeHtml(normalizeSubjectId(parentId))}"
        data-child-subject-id="${escapeHtml(normalizedSubjectId)}"
        draggable="${canDrag ? "true" : "false"}"
      >
        ${titleCellHtml}
        ${extraCellsHtml}
      </div>
    `);

    if (!isExpanded) return;
    nestedChildren.forEach((childId) => walkTree(childId, depth + 1, normalizedSubjectId));
  };

  normalizedRootIds.forEach((subjectId) => walkTree(subjectId, 0, context?.rootParentId || ""));

  if (!className) return rows.join("");
  return `<div class="${className}">${rows.join("")}</div>`;
}

export function __subjectTreeGridTestUtils() {
  return {
    resolveCanDrag
  };
}
