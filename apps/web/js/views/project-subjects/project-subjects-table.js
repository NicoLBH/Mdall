export function getSituationsTableGridTemplate() {
  return "minmax(0, 1fr) max-content";
}

export function renderSituationsTableHeadHtml(options = {}) {
  const { renderDataTableHead, renderSubjectsStatusHeadHtml, renderSubjectsPriorityHeadHtml } = options.deps || options;
  const columns = Array.isArray(options.columns) && options.columns.length
    ? options.columns
    : [
        { className: "cell cell-theme", html: renderSubjectsStatusHeadHtml() },
        { className: "cell cell-priority-filter", html: renderSubjectsPriorityHeadHtml() }
      ];

  return renderDataTableHead({ columns });
}

function renderWelcomeHtml(deps) {
  const { renderIssuesTable } = deps;
  return renderIssuesTable({
    gridTemplate: getSituationsTableGridTemplate(),
    headHtml: renderSituationsTableHeadHtml({ deps }),
    emptyTitle: "Aucune analyse disponible",
    emptyDescription: "Lancer une analyse pour générer des avis-sujets-situations."
  });
}

export function renderFlatSujetRow(sujet, situationId, options = {}) {
  const deps = options.deps || {};
  const {
    escapeHtml,
    svgIcon,
    issueIcon,
    priorityBadge,
    getEffectiveSujetStatus,
    getEntityReviewMeta,
    getReviewTitleStateClass,
    getEntityDisplayRef,
    getEntityDescriptionState,
    formatRelativeTimeLabel,
    getEntityListTimestamp,
    getSubjectSidebarMeta,
    getSubjectLabelDefinition,
    renderSubjectLabelBadge,
    getObjectiveById,
    firstNonEmpty
  } = deps;

  const effStatus = getEffectiveSujetStatus(sujet.id);
  const meta = getEntityReviewMeta("sujet", sujet.id);
  const titleSeenClass = getReviewTitleStateClass("sujet", sujet.id);
  const displayRef = getEntityDisplayRef("sujet", sujet.id);
  const author = firstNonEmpty(getEntityDescriptionState("sujet", sujet.id)?.author, sujet?.agent, sujet?.raw?.agent, "system");
  const openedLabel = formatRelativeTimeLabel(getEntityListTimestamp("sujet", sujet), "opened");
  const subjectMeta = getSubjectSidebarMeta(sujet.id);
  const subjectLabelsHtml = subjectMeta.labels
    .map((label) => getSubjectLabelDefinition(label))
    .filter(Boolean)
    .map((labelDef) => renderSubjectLabelBadge(labelDef))
    .join("");
  const objective = getObjectiveById(subjectMeta.objectiveIds[0] || "");
  const objectiveLabel = objective
    ? ` - <span class="issue-row-subject-objective"><span class="issue-row-subject-objective__icon" aria-hidden="true">${svgIcon("milestone", { className: "octicon octicon-milestone" })}</span><span class="issue-row-subject-objective__text">${escapeHtml(firstNonEmpty(objective.title, objective.id, "Objectif"))}</span></span>`
    : "";

  return `
    <div class="issue-row issue-row--pb click js-row-sujet${options.isSelectable === false ? "" : (options.rowSelectedClass ? options.rowSelectedClass("sujet", sujet.id) : "")}" data-sujet-id="${escapeHtml(sujet.id)}">
      <div class="cell cell-theme lvl0">
        <span class="issue-row-title-grid">
          <span class="issue-row-title-grid__status">
            ${issueIcon(effStatus, { reviewState: meta.review_state, entityType: "sujet", isSeen: meta.is_seen })}
          </span>
            <span class="issue-row-title-grid__title issue-row-subject-title-line">
            <button type="button" class="row-title-trigger js-row-title-trigger theme-text theme-text--pb ${titleSeenClass}" data-row-entity-type="sujet" data-row-entity-id="${escapeHtml(sujet.id)}">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</button>
            ${subjectLabelsHtml ? `<span class="issue-row-subject-labels">${subjectLabelsHtml}</span>` : ""}
          </span>
          <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${escapeHtml(displayRef)} - ${escapeHtml(author)} • ${escapeHtml(openedLabel)}${objectiveLabel}</span>
        </span>
      </div>
      <div class="cell cell-priority-value">${priorityBadge(sujet.priority)}</div>
    </div>
  `;
}

export function renderProjectSubjectsTable({ filteredSituations, deps }) {
  const {
    store,
    renderIssuesTable,
    getFilteredFlatSubjects,
    getCurrentSubjectsStatusFilter,
    getCurrentSubjectsPriorityFilter,
    sujetMatchesStatusFilter,
    sujetMatchesPriorityFilter
  } = deps;

  const selectorFlatSubjects = Array.isArray(getFilteredFlatSubjects?.()) ? getFilteredFlatSubjects() : [];
  const rawSubjectsById = store.situationsView?.rawResult?.subjectsById && typeof store.situationsView.rawResult.subjectsById === "object"
    ? store.situationsView.rawResult.subjectsById
    : {};
  const rawFlatSubjects = Object.values(rawSubjectsById);
  const activeStatusFilter = typeof getCurrentSubjectsStatusFilter === "function" ? getCurrentSubjectsStatusFilter() : "open";
  const activePriorityFilter = typeof getCurrentSubjectsPriorityFilter === "function" ? getCurrentSubjectsPriorityFilter() : "";
  const fallbackFlatSubjects = rawFlatSubjects.filter((subject) => {
    if (typeof sujetMatchesStatusFilter === "function" && !sujetMatchesStatusFilter(subject, activeStatusFilter)) return false;
    if (typeof sujetMatchesPriorityFilter === "function" && !sujetMatchesPriorityFilter(subject, activePriorityFilter)) return false;
    return true;
  });
  const flatSubjects = selectorFlatSubjects.length ? selectorFlatSubjects : fallbackFlatSubjects;
  const hasAnySubjects = !!Object.keys(rawSubjectsById).length || !!flatSubjects.length;

  if (!hasAnySubjects) return renderWelcomeHtml(deps);

  const rows = flatSubjects.map((sujet) => renderFlatSujetRow(sujet, "", { isSelectable: false, deps }));

  if (!rows.length) {
    return renderIssuesTable({
      gridTemplate: getSituationsTableGridTemplate(),
      headHtml: renderSituationsTableHeadHtml({ deps }),
      emptyTitle: "Aucun résultat",
      emptyDescription: "Aucun résultat pour les filtres actuels."
    });
  }

  return renderIssuesTable({
    gridTemplate: getSituationsTableGridTemplate(),
    headHtml: renderSituationsTableHeadHtml({ deps }),
    rowsHtml: rows.join(""),
    emptyTitle: "Aucun résultat",
    emptyDescription: "Aucun résultat pour les filtres actuels."
  });
}
