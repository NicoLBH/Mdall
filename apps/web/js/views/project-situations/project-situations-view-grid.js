import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderSubjectTreeGrid } from "../shared/subject-tree-grid.js";
import { buildSubjectMetaAnchorKey } from "../ui/select-dropdown-controller.js";

const GRID_COLUMN_DEFINITIONS = [
  { key: "title", label: "Titre", minWidth: 320, className: "title" },
  { key: "assignees", label: "Assignés", minWidth: 160, className: "assignees" },
  { key: "kanban", label: "Statut", minWidth: 160, className: "kanban" },
  { key: "progress", label: "Progression", minWidth: 180, className: "progress" },
  { key: "labels", label: "Labels", minWidth: 220, className: "labels" },
  { key: "objectives", label: "Objectifs", minWidth: 220, className: "objectives" },
  { key: "priority", label: "Priorité", minWidth: 120, className: "priority" },
  { key: "dates", label: "Créé · MAJ", minWidth: 160, className: "dates" }
];

export function getSituationGridColumnDefinitions() {
  return GRID_COLUMN_DEFINITIONS.map((column) => ({ ...column }));
}

const KANBAN_STATUS_META = {
  non_active: { label: "Non activé", bg: "rgba(46, 160, 67, 0.15)", border: "rgb(35, 134, 54)", text: "rgb(63, 185, 80)" },
  to_activate: { label: "À activer", bg: "rgba(56, 139, 253, 0.1)", border: "rgb(31, 111, 235)", text: "rgb(88, 166, 255)" },
  in_progress: { label: "En cours", bg: "rgba(187, 128, 9, 0.15)", border: "rgb(158, 106, 3)", text: "rgb(210, 153, 34)" },
  in_arbitration: { label: "En arbitrage", bg: "rgba(171, 125, 248, 0.15)", border: "rgb(137, 87, 229)", text: "rgb(188, 140, 255)" },
  resolved: { label: "Résolu", bg: "rgba(219, 109, 40, 0.1)", border: "rgb(189, 86, 29)", text: "rgb(255, 161, 107)" }
};

function normalizeIssueLifecycleStatus(status = "") {
  return String(status || "").trim().toLowerCase() === "closed" ? "closed" : "open";
}

function normalizeId(value) {
  return String(value || "").trim();
}

function hasBlockedByRelation(subjectId, store = {}, rawSubjectsResult = {}) {
  const normalizedSubjectId = normalizeId(subjectId);
  if (!normalizedSubjectId) return false;
  const linksBySubjectId = rawSubjectsResult?.linksBySubjectId && typeof rawSubjectsResult.linksBySubjectId === "object"
    ? rawSubjectsResult.linksBySubjectId
    : (store?.projectSubjectsView?.linksBySubjectId && typeof store.projectSubjectsView.linksBySubjectId === "object"
      ? store.projectSubjectsView.linksBySubjectId
      : {});
  const scopedLinks = Array.isArray(linksBySubjectId?.[normalizedSubjectId]) ? linksBySubjectId[normalizedSubjectId] : [];
  const subjectLinks = Array.isArray(store?.projectSubjectsView?.subjectLinks) ? store.projectSubjectsView.subjectLinks : [];
  return [...scopedLinks, ...subjectLinks].some((link) => {
    const linkType = String(link?.link_type || "").trim().toLowerCase();
    if (linkType !== "blocked_by") return false;
    const sourceId = normalizeId(link?.source_subject_id);
    return sourceId === normalizedSubjectId;
  });
}

export function buildSituationGridColumnWidthsScopeKey(projectId, situationId) {
  const normalizedProjectId = normalizeId(projectId) || "project";
  const normalizedSituationId = normalizeId(situationId) || "situation";
  return `project:${normalizedProjectId}:situation:${normalizedSituationId}`;
}

export function normalizeSituationGridColumnWidths(rawWidths = {}) {
  const source = rawWidths && typeof rawWidths === "object" ? rawWidths : {};
  return GRID_COLUMN_DEFINITIONS.reduce((acc, column) => {
    const rawValue = Number(source[column.key]);
    const normalizedValue = Number.isFinite(rawValue)
      ? Math.max(column.minWidth, Math.round(rawValue))
      : column.minWidth;
    acc[column.key] = normalizedValue;
    return acc;
  }, {});
}

export function getSituationGridColumnCssVariables(widths = {}) {
  return GRID_COLUMN_DEFINITIONS.reduce((acc, column) => {
    acc[`--situation-grid-col-${column.key}`] = `${Math.max(column.minWidth, Number(widths?.[column.key]) || 0)}px`;
    return acc;
  }, {});
}

function getGridContainerInlineStyle(widths = {}) {
  const cssVars = getSituationGridColumnCssVariables(widths);
  return Object.entries(cssVars)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
}

function getStoredGridColumnWidths(store = {}, scopeKey = "") {
  if (!scopeKey) return normalizeSituationGridColumnWidths();
  const widthsByScope = store?.situationsView?.gridColumnWidthsByScope;
  const scoped = widthsByScope && typeof widthsByScope === "object" ? widthsByScope[scopeKey] : null;
  return normalizeSituationGridColumnWidths(scoped || {});
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function renderIssueStateIcon(subject, { isBlocked = false } = {}) {
  const isClosed = normalizeIssueLifecycleStatus(subject?.status) === "closed";
  return `<span class="issue-status-icon situation-grid__status-icon" aria-hidden="true">${
    isClosed
      ? svgIcon("check-circle", { style: "color: var(--fgColor-done)" })
      : svgIcon("issue-opened", { style: "color: var(--fgColor-open)" })
  }${isBlocked
    ? `<span class="subject-status-blocked-indicator situation-grid__status-blocked-indicator" aria-hidden="true">${svgIcon("blocked", { className: "octicon octicon-blocked", width: 12, height: 12 })}</span>`
    : ""}</span>`;
}

function sortSubjectIds(subjectIds = [], subjectsById = {}) {
  return [...subjectIds].sort((leftId, rightId) => {
    const left = subjectsById[leftId] || {};
    const right = subjectsById[rightId] || {};

    const leftOrder = Number(left?.parent_child_order ?? left?.raw?.parent_child_order);
    const rightOrder = Number(right?.parent_child_order ?? right?.raw?.parent_child_order);
    const leftHasOrder = Number.isFinite(leftOrder) && leftOrder > 0;
    const rightHasOrder = Number.isFinite(rightOrder) && rightOrder > 0;

    if (leftHasOrder && rightHasOrder && leftOrder !== rightOrder) return leftOrder - rightOrder;
    if (leftHasOrder !== rightHasOrder) return leftHasOrder ? -1 : 1;

    const leftTs = Date.parse(String(left?.created_at || left?.raw?.created_at || "")) || 0;
    const rightTs = Date.parse(String(right?.created_at || right?.raw?.created_at || "")) || 0;
    if (leftTs !== rightTs) return leftTs - rightTs;

    return String(left?.title || leftId).localeCompare(String(right?.title || rightId), "fr");
  });
}

function resolveSituationTreeData(situationSubjects = [], rawSubjectsResult = {}) {
  const selectedSubjectIds = new Set(
    (Array.isArray(situationSubjects) ? situationSubjects : [])
      .map((subject) => normalizeId(subject?.id))
      .filter(Boolean)
  );

  const rawSubjectsById = rawSubjectsResult?.subjectsById && typeof rawSubjectsResult.subjectsById === "object"
    ? rawSubjectsResult.subjectsById
    : {};
  const rawChildrenBySubjectId = rawSubjectsResult?.childrenBySubjectId && typeof rawSubjectsResult.childrenBySubjectId === "object"
    ? rawSubjectsResult.childrenBySubjectId
    : {};
  const rawParentBySubjectId = rawSubjectsResult?.parentBySubjectId && typeof rawSubjectsResult.parentBySubjectId === "object"
    ? rawSubjectsResult.parentBySubjectId
    : {};

  const subjectsById = {};
  selectedSubjectIds.forEach((subjectId) => {
    const selectedSubject = (situationSubjects || []).find((subject) => normalizeId(subject?.id) === subjectId);
    subjectsById[subjectId] = rawSubjectsById[subjectId] || selectedSubject || null;
  });

  const childrenBySubjectId = {};
  selectedSubjectIds.forEach((subjectId) => {
    const childIds = Array.isArray(rawChildrenBySubjectId?.[subjectId])
      ? rawChildrenBySubjectId[subjectId]
      : [];
    childrenBySubjectId[subjectId] = sortSubjectIds(
      childIds
        .map((childId) => normalizeId(childId))
        .filter((childId) => selectedSubjectIds.has(childId)),
      subjectsById
    );
  });

  const rootSubjectIds = sortSubjectIds(
    [...selectedSubjectIds].filter((subjectId) => {
      const subject = subjectsById?.[subjectId] || {};
      const parentFromRaw = normalizeId(rawParentBySubjectId?.[subjectId]);
      const parentFromSubject = normalizeId(subject?.parent_subject_id || subject?.raw?.parent_subject_id);
      const parentId = parentFromRaw || parentFromSubject;
      return !parentId || !selectedSubjectIds.has(parentId);
    }),
    subjectsById
  );

  return {
    selectedSubjectIds,
    subjectsById,
    childrenBySubjectId,
    rootSubjectIds
  };
}

function getExpandedSubjectIdsSet({ store, situationId, rootSubjectIds = [], fallbackExpandedIds = [] }) {
  const bySituation = store?.situationsView?.gridExpandedSubjectIdsBySituationId;
  const stored = bySituation && typeof bySituation === "object" ? bySituation[situationId] : null;

  if (stored instanceof Set) return stored;
  if (Array.isArray(stored)) {
    return new Set(stored.map((value) => normalizeId(value)).filter(Boolean));
  }

  const seed = Array.isArray(fallbackExpandedIds) && fallbackExpandedIds.length
    ? fallbackExpandedIds
    : rootSubjectIds;
  return new Set(seed.map((value) => normalizeId(value)).filter(Boolean));
}

function getSubjectDisplayIdentifier(subject = {}) {
  const orderNumber = Number(subject?.subject_number ?? subject?.subjectNumber ?? subject?.raw?.subject_number ?? subject?.raw?.subjectNumber);
  if (Number.isFinite(orderNumber) && orderNumber > 0) return `#${Math.floor(orderNumber)}`;
  const subjectId = normalizeId(subject?.id);
  return subjectId ? `#${subjectId}` : "";
}

function getSituationGridMetaAnchorKey(field = "", subjectId = "") {
  return buildSubjectMetaAnchorKey({
    field,
    scope: "situation-grid",
    scopeHost: "main",
    subjectId,
    instance: "situation-grid"
  });
}

function getSubjectProgress(subject, subjectsById = {}, childrenBySubjectId = {}) {
  const subjectId = normalizeId(subject?.id);
  const childIds = Array.isArray(childrenBySubjectId?.[subjectId]) ? childrenBySubjectId[subjectId] : [];
  const childSubjects = childIds.map((id) => subjectsById?.[id]).filter(Boolean);
  const total = childSubjects.length;
  if (!total) return null;
  const resolved = childSubjects.filter((child) => normalizeIssueLifecycleStatus(child?.status) === "closed").length;
  const percent = Math.max(0, Math.min(100, Math.round((resolved / total) * 100)));
  return { resolved, total, percent };
}

function getKanbanStatusMeta(subjectId, situationId, store) {
  const normalizedSubjectId = normalizeId(subjectId);
  const normalizedSituationId = normalizeId(situationId);
  const key = String(store?.situationsView?.kanbanStatusBySituationId?.[normalizedSituationId]?.[normalizedSubjectId] || "non_active").trim().toLowerCase();
  return KANBAN_STATUS_META[key] || KANBAN_STATUS_META.non_active;
}

function getActiveProjectCollaborators(store) {
  const collaborators = Array.isArray(store?.projectForm?.collaborators) ? store.projectForm.collaborators : [];
  return collaborators
    .filter((collaborator) => String(collaborator?.status || "Actif").toLowerCase() !== "retiré")
    .map((collaborator) => ({
      id: firstNonEmpty(collaborator?.personId, collaborator?.id),
      name: firstNonEmpty(collaborator?.name, [collaborator?.firstName, collaborator?.lastName].filter(Boolean).join(" "), collaborator?.email, "Utilisateur"),
      avatarUrl: firstNonEmpty(collaborator?.avatarUrl, collaborator?.avatar, "")
    }))
    .filter((collaborator) => !!collaborator.id);
}

function renderAssigneesCell(subjectId, rawSubjectsResult = {}, store = {}) {
  const assigneeMap = rawSubjectsResult?.assigneePersonIdsBySubjectId && typeof rawSubjectsResult.assigneePersonIdsBySubjectId === "object"
    ? rawSubjectsResult.assigneePersonIdsBySubjectId
    : {};
  const assigneeIds = Array.isArray(assigneeMap?.[subjectId]) ? assigneeMap[subjectId].map((value) => normalizeId(value)).filter(Boolean) : [];
  if (!assigneeIds.length) {
    return `
      <button
        type="button"
        class="situation-grid__editable-trigger situation-grid__editable-trigger--empty"
        data-situation-grid-edit-cell="assignees"
        data-situation-grid-subject-id="${escapeHtml(subjectId)}"
        data-subject-meta-anchor="${escapeHtml(getSituationGridMetaAnchorKey("assignees", subjectId))}"
        aria-haspopup="menu"
        aria-expanded="false"
        title="Modifier les assignés"
      >
        <span class="situation-grid__empty-cell"></span>
        <span class="situation-grid__editable-caret" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
      </button>
    `;
  }

  const collaboratorsById = new Map(getActiveProjectCollaborators(store).map((item) => [item.id, item]));
  const firstAssignees = assigneeIds.slice(0, 3).map((id) => collaboratorsById.get(id) || { id, name: `Collaborateur ${id.slice(0, 8)}`, avatarUrl: "" });
  const overflowCount = Math.max(0, assigneeIds.length - firstAssignees.length);

  return `
    <button
      type="button"
      class="situation-grid__editable-trigger"
      data-situation-grid-edit-cell="assignees"
      data-situation-grid-subject-id="${escapeHtml(subjectId)}"
      data-subject-meta-anchor="${escapeHtml(getSituationGridMetaAnchorKey("assignees", subjectId))}"
      aria-haspopup="menu"
      aria-expanded="false"
      title="Modifier les assignés"
    >
      <span class="situation-grid__assignees" aria-label="${escapeHtml(`${assigneeIds.length} assigné(s)`)}">
      ${firstAssignees.map((assignee) => {
        const initials = String(assignee?.name || "U")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join("") || "U";
        return assignee?.avatarUrl
          ? `<img class="situation-grid__assignee-avatar" src="${escapeHtml(assignee.avatarUrl)}" alt="${escapeHtml(assignee.name || "Assigné")}" loading="lazy">`
          : `<span class="situation-grid__assignee-avatar situation-grid__assignee-avatar--fallback" aria-hidden="true">${escapeHtml(initials)}</span>`;
      }).join("")}
      ${overflowCount > 0 ? `<span class="situation-grid__assignee-overflow mono">+${overflowCount}</span>` : ""}
      </span>
      <span class="situation-grid__editable-caret" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
    </button>
  `;
}

function renderKanbanCell(subjectId, situationId, store) {
  const meta = getKanbanStatusMeta(subjectId, situationId, store);
  return `
    <button
      type="button"
      class="situation-grid__editable-trigger"
      data-situation-grid-edit-cell="kanban"
      data-situation-grid-subject-id="${escapeHtml(subjectId)}"
      data-situation-grid-situation-id="${escapeHtml(situationId)}"
      data-subject-kanban-anchor="${escapeHtml(`${subjectId}::${situationId}`)}"
      aria-haspopup="menu"
      aria-expanded="false"
      title="Modifier le statut kanban"
    >
      <span class="subject-kanban-badge" style="--subject-kanban-badge-bg:${meta.bg};--subject-kanban-badge-border:${meta.border};--subject-kanban-badge-text:${meta.text};">${escapeHtml(meta.label)}</span>
      <span class="situation-grid__editable-caret" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
    </button>
  `;
}

function renderProgressCell(subject, subjectsById = {}, childrenBySubjectId = {}) {
  const progress = getSubjectProgress(subject, subjectsById, childrenBySubjectId);
  if (!progress) return "<span class=\"situation-grid__empty-cell\"></span>";
  return `
    <span class="situation-grid__progress">
      <span class="situation-grid__progress-meta mono">${progress.resolved} / ${progress.total}</span>
      <span class="situation-grid__progress-bar" aria-hidden="true"><span class="situation-grid__progress-value" style="width:${progress.percent}%"></span></span>
      <span class="situation-grid__progress-percent mono">${progress.percent}%</span>
    </span>
  `;
}

function renderLabelsCell(subjectId, rawSubjectsResult = {}) {
  const labelsById = rawSubjectsResult?.labelsById && typeof rawSubjectsResult.labelsById === "object" ? rawSubjectsResult.labelsById : {};
  const labelIdsBySubjectId = rawSubjectsResult?.labelIdsBySubjectId && typeof rawSubjectsResult.labelIdsBySubjectId === "object" ? rawSubjectsResult.labelIdsBySubjectId : {};
  const labelIds = Array.isArray(labelIdsBySubjectId?.[subjectId]) ? labelIdsBySubjectId[subjectId] : [];
  if (!labelIds.length) {
    return `
      <button
        type="button"
        class="situation-grid__editable-trigger situation-grid__editable-trigger--empty"
        data-situation-grid-edit-cell="labels"
        data-situation-grid-subject-id="${escapeHtml(subjectId)}"
        data-subject-meta-anchor="${escapeHtml(getSituationGridMetaAnchorKey("labels", subjectId))}"
        aria-haspopup="menu"
        aria-expanded="false"
        title="Modifier les labels"
      >
        <span class="situation-grid__empty-cell"></span>
        <span class="situation-grid__editable-caret" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
      </button>
    `;
  }

  const labels = labelIds
    .map((labelId) => labelsById[normalizeId(labelId)] || null)
    .filter(Boolean);
  if (!labels.length) {
    return `
      <button
        type="button"
        class="situation-grid__editable-trigger situation-grid__editable-trigger--empty"
        data-situation-grid-edit-cell="labels"
        data-situation-grid-subject-id="${escapeHtml(subjectId)}"
        data-subject-meta-anchor="${escapeHtml(getSituationGridMetaAnchorKey("labels", subjectId))}"
        aria-haspopup="menu"
        aria-expanded="false"
        title="Modifier les labels"
      >
        <span class="situation-grid__empty-cell"></span>
        <span class="situation-grid__editable-caret" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
      </button>
    `;
  }

  const visible = labels.slice(0, 2);
  const overflow = Math.max(0, labels.length - visible.length);
  const getLabelBadgeStyle = (label) => {
    const border = firstNonEmpty(label?.border_color, label?.borderColor, label?.text_color, label?.textColor, label?.hex_color, "#656d76");
    const background = firstNonEmpty(label?.background_color, label?.backgroundColor, `${border}22`, "#21262d");
    const text = firstNonEmpty(label?.text_color, label?.textColor, label?.hex_color, "#d0d7de");
    return `--subject-label-border:${escapeHtml(border)};--subject-label-bg:${escapeHtml(background)};--subject-label-fg:${escapeHtml(text)};`;
  };
  return `
    <button
      type="button"
      class="situation-grid__editable-trigger"
      data-situation-grid-edit-cell="labels"
      data-situation-grid-subject-id="${escapeHtml(subjectId)}"
      data-subject-meta-anchor="${escapeHtml(getSituationGridMetaAnchorKey("labels", subjectId))}"
      aria-haspopup="menu"
      aria-expanded="false"
      title="Modifier les labels"
    >
      <span class="situation-grid__labels">
      ${visible.map((label) => {
        const labelName = firstNonEmpty(label?.name, label?.label, label?.key, label?.id, "Label");
        return `<span class="subject-label-badge" style="${getLabelBadgeStyle(label)}">${escapeHtml(labelName)}</span>`;
      }).join("")}
      ${overflow > 0 ? `<span class="situation-grid__pill-overflow mono">+${overflow}</span>` : ""}
      </span>
      <span class="situation-grid__editable-caret" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
    </button>
  `;
}

function renderObjectivesCell(subjectId, rawSubjectsResult = {}) {
  const objectivesById = rawSubjectsResult?.objectivesById && typeof rawSubjectsResult.objectivesById === "object" ? rawSubjectsResult.objectivesById : {};
  const objectiveIdsBySubjectId = rawSubjectsResult?.objectiveIdsBySubjectId && typeof rawSubjectsResult.objectiveIdsBySubjectId === "object" ? rawSubjectsResult.objectiveIdsBySubjectId : {};
  const objectiveIds = Array.isArray(objectiveIdsBySubjectId?.[subjectId]) ? objectiveIdsBySubjectId[subjectId] : [];
  if (!objectiveIds.length) {
    return `
      <button
        type="button"
        class="situation-grid__editable-trigger situation-grid__editable-trigger--empty"
        data-situation-grid-edit-cell="objectives"
        data-situation-grid-subject-id="${escapeHtml(subjectId)}"
        data-subject-meta-anchor="${escapeHtml(getSituationGridMetaAnchorKey("objectives", subjectId))}"
        aria-haspopup="menu"
        aria-expanded="false"
        title="Modifier les objectifs"
      >
        <span class="situation-grid__empty-cell"></span>
        <span class="situation-grid__editable-caret" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
      </button>
    `;
  }

  const objectives = objectiveIds
    .map((objectiveId) => objectivesById[normalizeId(objectiveId)] || null)
    .filter(Boolean);
  if (!objectives.length) {
    return `
      <button
        type="button"
        class="situation-grid__editable-trigger situation-grid__editable-trigger--empty"
        data-situation-grid-edit-cell="objectives"
        data-situation-grid-subject-id="${escapeHtml(subjectId)}"
        data-subject-meta-anchor="${escapeHtml(getSituationGridMetaAnchorKey("objectives", subjectId))}"
        aria-haspopup="menu"
        aria-expanded="false"
        title="Modifier les objectifs"
      >
        <span class="situation-grid__empty-cell"></span>
        <span class="situation-grid__editable-caret" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
      </button>
    `;
  }

  const visible = objectives.slice(0, 1);
  const overflow = Math.max(0, objectives.length - visible.length);
  return `
    <button
      type="button"
      class="situation-grid__editable-trigger"
      data-situation-grid-edit-cell="objectives"
      data-situation-grid-subject-id="${escapeHtml(subjectId)}"
      data-subject-meta-anchor="${escapeHtml(getSituationGridMetaAnchorKey("objectives", subjectId))}"
      aria-haspopup="menu"
      aria-expanded="false"
      title="Modifier les objectifs"
    >
      <span class="situation-grid__objectives">
      ${visible.map((objective) => `<span class="situation-grid__objective-pill"><span class="situation-grid__objective-icon" aria-hidden="true">${svgIcon("milestone", { className: "octicon octicon-milestone" })}</span>${escapeHtml(firstNonEmpty(objective?.title, objective?.name, objective?.id, "Objectif"))}</span>`).join("")}
      ${overflow > 0 ? `<span class="situation-grid__pill-overflow mono">+${overflow}</span>` : ""}
      </span>
      <span class="situation-grid__editable-caret" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
    </button>
  `;
}

function renderPriorityCell(subject = {}) {
  const priority = firstNonEmpty(subject?.priority, subject?.raw?.priority, "");
  if (!priority) return "<span class=\"situation-grid__empty-cell\"></span>";
  return `<span class="situation-grid__priority-pill">${escapeHtml(priority)}</span>`;
}

function formatDateCellValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function renderDatesCell(subject = {}) {
  const created = formatDateCellValue(subject?.created_at || subject?.raw?.created_at);
  const updated = formatDateCellValue(subject?.updated_at || subject?.raw?.updated_at);
  if (!created && !updated) return "<span class=\"situation-grid__empty-cell\"></span>";
  return `<span class="situation-grid__dates mono-small">${escapeHtml(created || "—")} · ${escapeHtml(updated || "—")}</span>`;
}

function renderGridHeaderRow() {
  return `
    <header class="project-situation-grid__header situation-grid__header" role="row">
      ${GRID_COLUMN_DEFINITIONS.map((column) => `
        <div class="project-situation-grid__head-cell situation-grid__head-cell situation-grid__head-cell--${column.className}" role="columnheader" data-situation-grid-column-key="${escapeHtml(column.key)}">
          <span class="situation-grid__head-cell-label">${escapeHtml(column.label)}</span>
          <button
            type="button"
            class="situation-grid__resize-handle"
            data-situation-grid-resize-handle="${escapeHtml(column.key)}"
            aria-label="Redimensionner la colonne ${escapeHtml(column.label)}"
          ></button>
        </div>
      `).join("")}
    </header>
  `;
}

export function renderSituationGridView(situation, subjects = [], options = {}) {
  const title = String(situation?.title || "Situation");
  const normalizedSituationId = normalizeId(situation?.id);
  const normalizedProjectId = normalizeId(
    options?.projectId
      || options?.store?.currentProjectId
      || options?.store?.projectForm?.projectId
      || options?.store?.projectForm?.id
  );
  if (!normalizedSituationId) {
    return `
      <section class="project-situation-alt-view project-situation-alt-view--grid" aria-label="Vue grille">
        <div class="settings-empty-state">Sélectionne une situation pour afficher la grille.</div>
      </section>
    `;
  }

  if (!Array.isArray(subjects) || !subjects.length) {
    return `
      <section class="project-situation-alt-view project-situation-alt-view--grid" aria-label="Vue grille">
        <div class="settings-empty-state">Aucun sujet n’est actuellement rattaché à <strong>${escapeHtml(title)}</strong>.</div>
      </section>
    `;
  }

  const rawSubjectsResult = options?.store?.projectSubjectsView?.rawSubjectsResult && typeof options.store.projectSubjectsView.rawSubjectsResult === "object"
    ? options.store.projectSubjectsView.rawSubjectsResult
    : {};

  const {
    selectedSubjectIds,
    subjectsById,
    childrenBySubjectId,
    rootSubjectIds
  } = resolveSituationTreeData(subjects, rawSubjectsResult);

  if (!selectedSubjectIds.size || !rootSubjectIds.length) {
    return `
      <section class="project-situation-alt-view project-situation-alt-view--grid" aria-label="Vue grille">
        <div class="settings-empty-state">Aucun sujet exploitable n’a été trouvé pour cette situation.</div>
      </section>
    `;
  }

  const expandedSubjectIds = getExpandedSubjectIdsSet({
    store: options?.store,
    situationId: normalizedSituationId,
    rootSubjectIds,
    fallbackExpandedIds: [...selectedSubjectIds]
  });
  const columnWidthsScopeKey = buildSituationGridColumnWidthsScopeKey(normalizedProjectId, normalizedSituationId);
  const columnWidths = getStoredGridColumnWidths(options?.store || {}, columnWidthsScopeKey);
  const gridContainerStyle = getGridContainerInlineStyle(columnWidths);

  const rowsHtml = renderSubjectTreeGrid({
    subjectsById,
    childrenBySubjectId,
    rootSubjectIds,
    expandedSubjectIds,
    dndMode: "all-levels",
    rowClassName: "situation-grid__row project-situation-grid__row",
    escapeHtml,
    context: {
      situationId: normalizedSituationId
    },
    renderTitleCell: ({ subject, subjectId, depth, hasChildren, isExpanded }) => {
      const indentWidth = Math.max(0, depth) * 20;
      const identifier = getSubjectDisplayIdentifier(subject);
      const subjectTitle = String(subject?.title || subjectId || "Sujet");
      const isBlocked = hasBlockedByRelation(subjectId, options?.store || {}, rawSubjectsResult);
      return `
        <div class="situation-grid__cell situation-grid__cell--title project-situation-grid__cell project-situation-grid__cell--title">
          <div class="situation-grid__title-content" style="--situation-grid-indent:${indentWidth}px;">
            <span class="situation-grid__indent" aria-hidden="true"></span>
            ${hasChildren
              ? `<button
                  type="button"
                  class="situation-grid__toggle"
                  data-situation-grid-toggle="${escapeHtml(subjectId)}"
                  data-situation-grid-situation-id="${escapeHtml(normalizedSituationId)}"
                  aria-expanded="${isExpanded ? "true" : "false"}"
                  aria-label="${isExpanded ? "Replier" : "Déplier"} ${escapeHtml(subjectTitle)}"
                >
                  ${svgIcon(isExpanded ? "chevron-down" : "chevron-right", { className: isExpanded ? "octicon octicon-chevron-down" : "octicon octicon-chevron-right" })}
                </button>`
              : `<span class="situation-grid__toggle situation-grid__toggle--placeholder" aria-hidden="true"></span>`}
            ${renderIssueStateIcon(subject, { isBlocked })}
            <button type="button" class="situation-grid__subject-title" data-open-situation-subject="${escapeHtml(subjectId)}">${escapeHtml(subjectTitle)}</button>
            <span class="situation-grid__subject-id mono">${escapeHtml(identifier)}</span>
          </div>
        </div>
      `;
    },
    renderExtraCells: ({ subject, subjectId }) => `
      <div class="situation-grid__cell situation-grid__cell--assignees">${renderAssigneesCell(subjectId, rawSubjectsResult, options?.store || {})}</div>
      <div class="situation-grid__cell situation-grid__cell--kanban">${renderKanbanCell(subjectId, normalizedSituationId, options?.store || {})}</div>
      <div class="situation-grid__cell situation-grid__cell--progress">${renderProgressCell(subject, subjectsById, childrenBySubjectId)}</div>
      <div class="situation-grid__cell situation-grid__cell--labels">${renderLabelsCell(subjectId, rawSubjectsResult)}</div>
      <div class="situation-grid__cell situation-grid__cell--objectives">${renderObjectivesCell(subjectId, rawSubjectsResult)}</div>
      <div class="situation-grid__cell situation-grid__cell--priority">${renderPriorityCell(subject)}</div>
      <div class="situation-grid__cell situation-grid__cell--dates">${renderDatesCell(subject)}</div>
    `
  });

  return `
    <section class="project-situation-alt-view project-situation-alt-view--grid" aria-label="Vue grille">
      <section
        class="project-situation-grid situation-grid"
        data-situation-grid="${escapeHtml(normalizedSituationId)}"
        data-situation-grid-project-id="${escapeHtml(normalizedProjectId)}"
        data-situation-grid-scope="${escapeHtml(columnWidthsScopeKey)}"
        style="${escapeHtml(gridContainerStyle)}"
      >
        <div class="project-situation-grid__scroll situation-grid__scroll">
          ${renderGridHeaderRow()}
          <div class="project-situation-grid__body situation-grid__body" role="rowgroup">
            ${rowsHtml}
          </div>
        </div>
      </section>
    </section>
  `;
}

export function __situationGridTestUtils() {
  return {
    resolveSituationTreeData,
    getSubjectProgress,
    getKanbanStatusMeta,
    normalizeSituationGridColumnWidths,
    buildSituationGridColumnWidthsScopeKey
  };
}
