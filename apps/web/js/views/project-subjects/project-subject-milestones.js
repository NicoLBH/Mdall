import { renderProblemsCountsIconHtml } from "../ui/subissues-counts.js";
export function formatObjectiveDueDateLabel(objective) {
  if (!objective?.dueDate) return "Pas de date définie";
  const parsed = new Date(objective.dueDate);
  if (Number.isNaN(parsed.getTime())) return String(objective.dueDate);
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(parsed);
}

export function createProjectSubjectMilestonesController(config) {
  const {
    store,
    ensureViewUiState,
    escapeHtml,
    svgIcon,
    renderProjectTableToolbar,
    renderProjectTableToolbarGroup,
    renderTableHeadFilterToggle,
    renderIssuesTable,
    renderDataTableEmptyState,
    renderSharedDatePicker,
    formatSharedDateInputValue,
    parseSharedDateInputValue,
    shiftSharedCalendarMonth,
    toSharedDateInputValue,
    renderSubjectsToolbarButton,
    renderSituationsAddAction,
    getObjectiveById,
    getObjectives,
    createObjectiveInSupabase,
    updateObjectiveInSupabase,
    closeObjectiveInSupabase,
    reopenObjectiveInSupabase,
    reloadSubjectsFromSupabase,
    getSubjectsCurrentRoot,
    persistRunBucket,
    statePill,
    getCurrentSubjectsStatusFilter,
    getCurrentSubjectsPriorityFilter,
    sujetMatchesStatusFilter,
    sujetMatchesPriorityFilter,
    getSituationBySujetId,
    getNestedSujet,
    renderFlatSujetRow,
    getSituationsTableGridTemplate,
    renderSituationsTableHeadHtml,
    getSubjectsTableDeps,
    renderSubjectsPriorityHeadHtml,
    problemsCountsIconHtml,
    rerenderPanels
  } = config;

  let objectiveEditCalendarDismissBound = false;

  function resetObjectiveEditState() {
    ensureViewUiState();
    store.situationsView.objectiveEdit = {
      isOpen: false,
      objectiveId: "",
      title: "",
      dueDate: "",
      description: "",
      calendarOpen: false,
      viewYear: 0,
      viewMonth: 0,
      mode: "edit",
      isSaving: false,
      errorMessage: ""
    };
  }

  function openObjectiveEdit(objectiveId) {
    ensureViewUiState();
    const objective = getObjectiveById(objectiveId);
    if (!objective) return;
    const selectedDate = parseSharedDateInputValue(objective.dueDate);
    const fallback = new Date();
    store.situationsView.objectiveEdit = {
      isOpen: true,
      objectiveId: objective.id,
      title: String(objective.title || ""),
      dueDate: toSharedDateInputValue(selectedDate),
      description: String(objective.description || ""),
      calendarOpen: false,
      viewYear: selectedDate?.getFullYear?.() || fallback.getFullYear(),
      viewMonth: selectedDate?.getMonth?.() ?? fallback.getMonth(),
      mode: "edit",
      isSaving: false,
      errorMessage: ""
    };
  }


  function openObjectiveCreate() {
    ensureViewUiState();
    const fallback = new Date();
    store.situationsView.objectiveEdit = {
      isOpen: true,
      objectiveId: "",
      title: "",
      dueDate: "",
      description: "",
      calendarOpen: false,
      viewYear: fallback.getFullYear(),
      viewMonth: fallback.getMonth(),
      mode: "create",
      isSaving: false,
      errorMessage: ""
    };
    store.situationsView.selectedObjectiveId = "";
  }

  function setObjectiveEditError(message = "") {
    ensureViewUiState();
    if (!store.situationsView.objectiveEdit || typeof store.situationsView.objectiveEdit !== "object") return;
    store.situationsView.objectiveEdit.errorMessage = String(message || "").trim();
  }

  function setObjectiveEditSaving(isSaving) {
    ensureViewUiState();
    if (!store.situationsView.objectiveEdit || typeof store.situationsView.objectiveEdit !== "object") return;
    store.situationsView.objectiveEdit.isSaving = !!isSaving;
  }

  async function refreshObjectivesUi(options = {}) {
    await reloadSubjectsFromSupabase(getSubjectsCurrentRoot(), { rerender: false, updateModal: true, ...options });
    rerenderPanels();
  }

  function getEditingObjective() {
    ensureViewUiState();
    const edit = store.situationsView.objectiveEdit;
    if (!edit?.isOpen || !edit.objectiveId) return null;
    return getObjectiveById(edit.objectiveId);
  }

  async function saveObjectiveEdit() {
    ensureViewUiState();
    const edit = store.situationsView.objectiveEdit;
    if (!edit?.isOpen) return;
    const nextTitle = String(edit.title || "").trim();
    if (!nextTitle) {
      setObjectiveEditError("Le titre de l'objectif est obligatoire.");
      rerenderPanels();
      return;
    }

    setObjectiveEditSaving(true);
    setObjectiveEditError("");
    rerenderPanels();

    try {
      if (String(edit.mode || "edit") === "create") {
        const created = await createObjectiveInSupabase("", {
          title: nextTitle,
          dueDate: String(edit.dueDate || "").trim() || null,
          description: String(edit.description || "").trim(),
          status: "open"
        });
        resetObjectiveEditState();
        store.situationsView.selectedObjectiveId = String(created?.id || "");
      } else if (edit.objectiveId) {
        await updateObjectiveInSupabase(edit.objectiveId, {
          title: nextTitle,
          dueDate: String(edit.dueDate || "").trim() || null,
          description: String(edit.description || "").trim()
        });
        resetObjectiveEditState();
        store.situationsView.selectedObjectiveId = String(edit.objectiveId || "");
      }
      await refreshObjectivesUi();
    } catch (error) {
      setObjectiveEditSaving(false);
      setObjectiveEditError(error instanceof Error ? error.message : "Impossible d'enregistrer l'objectif.");
      rerenderPanels();
    }
  }

  async function setObjectiveClosedState(objectiveId, closed) {
    const targetId = String(objectiveId || store.situationsView.selectedObjectiveId || "");
    if (!targetId) return;

    setObjectiveEditSaving(true);
    setObjectiveEditError("");
    rerenderPanels();

    try {
      if (closed) await closeObjectiveInSupabase(targetId);
      else await reopenObjectiveInSupabase(targetId);
      resetObjectiveEditState();
      store.situationsView.selectedObjectiveId = targetId;
      store.situationsView.objectivesStatusFilter = closed ? "closed" : "open";
      await refreshObjectivesUi();
    } catch (error) {
      setObjectiveEditSaving(false);
      setObjectiveEditError(error instanceof Error ? error.message : "Impossible de mettre à jour le statut de l'objectif.");
      rerenderPanels();
    }
  }

  async function closeObjective(objectiveId) {
    await setObjectiveClosedState(objectiveId, true);
  }

  async function reopenObjective(objectiveId) {
    await setObjectiveClosedState(objectiveId, false);
  }

  function getObjectiveSubjects(objective) {
    if (!objective) return [];
    const ids = Array.isArray(objective.subjectIds) ? objective.subjectIds : [];
    return ids.map((subjectId) => getNestedSujet(subjectId)).filter(Boolean);
  }

  function getObjectiveSubjectCounts(objective) {
    const linkedSubjects = getObjectiveSubjects(objective);
    if (linkedSubjects.length) {
      let open = 0;
      let closed = 0;
      for (const sujet of linkedSubjects) {
        if (sujetMatchesStatusFilter(sujet, "closed")) closed += 1;
        else open += 1;
      }
      return { open, closed, total: linkedSubjects.length, linkedSubjects };
    }

    const total = Number.isFinite(Number(objective?.subjectsCount)) ? Number(objective.subjectsCount) : 0;
    const closed = Math.max(0, Math.min(total, Number.isFinite(Number(objective?.closedSubjectsCount)) ? Number(objective.closedSubjectsCount) : 0));
    const open = Math.max(0, total - closed);
    return { open, closed, total, linkedSubjects: [] };
  }

  function renderObjectiveStatusBadge(objective) {
    return statePill(objective?.closed ? "closed" : "open");
  }

  function renderObjectiveDetailStatusText(objective) {
    const isClosed = !!objective?.closed;
    return `<span class="objective-detail__status objective-detail__status--${isClosed ? "closed" : "open"}">${isClosed ? "Fermé" : "Ouvert"}</span>`;
  }

  function formatObjectiveUpdatedAtLabel(objective) {
    const parsed = new Date(objective?.updated_at || objective?.created_at || 0);
    if (Number.isNaN(parsed.getTime())) return "Dernière mise à jour inconnue";
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTargetDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
    const diffDays = Math.round((startOfToday - startOfTargetDay) / 86400000);
    if (diffDays <= 0) return "Dernière mise à jour aujourd’hui";
    if (diffDays == 1) return "Dernière mise à jour hier";
    if (diffDays < 7) return `Dernière mise à jour il y a ${diffDays} jours`;
    return `Dernière mise à jour le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(parsed)}`;
  }

  function normalizeObjectiveSortKey(value) {
    const allowed = new Set([
      "recently_updated",
      "furthest_due_date",
      "closest_due_date",
      "least_complete",
      "most_complete",
      "alphabetical",
      "reverse_alphabetical",
      "most_issues",
      "fewest_issues"
    ]);
    const normalized = String(value || "").trim().toLowerCase();
    return allowed.has(normalized) ? normalized : "recently_updated";
  }

  function getObjectiveSortOptions() {
    return [
      { value: "recently_updated", label: "Récemment mis à jour" },
      { value: "furthest_due_date", label: "Date d'échéance la plus lointaine" },
      { value: "closest_due_date", label: "Date d'échéance la plus proche" },
      { value: "least_complete", label: "Moins avancés" },
      { value: "most_complete", label: "Plus avancés" },
      { value: "alphabetical", label: "Alphabétique" },
      { value: "reverse_alphabetical", label: "Alphabétique inversé" },
      { value: "most_issues", label: "Plus de sujets" },
      { value: "fewest_issues", label: "Moins de sujets" }
    ];
  }

  function getObjectiveDueDateValue(objective) {
    if (!objective?.dueDate) return Number.NaN;
    const parsed = new Date(`${String(objective.dueDate).slice(0, 10)}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? Number.NaN : parsed.getTime();
  }

  function getObjectiveUpdatedAtValue(objective) {
    const parsed = new Date(objective?.updated_at || objective?.created_at || 0);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  function getObjectiveCompletionPercent(objective) {
    const counts = getObjectiveSubjectCounts(objective);
    if (!counts.total) return 0;
    return Math.round((counts.closed / counts.total) * 100);
  }

  function getObjectiveOverdueMeta(objective) {
    if (!objective?.dueDate || objective?.closed) return null;
    const dueValue = getObjectiveDueDateValue(objective);
    if (!Number.isFinite(dueValue)) return null;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const diffDays = Math.floor((todayStart - dueValue) / 86400000);
    if (diffDays <= 0) return null;
    return {
      days: diffDays,
      label: `Dépassé depuis ${diffDays} ${diffDays > 1 ? "jours" : "jour"}`
    };
  }

  function compareObjectiveStrings(left, right) {
    return String(left || "").localeCompare(String(right || ""), "fr", { sensitivity: "base", numeric: true });
  }

  function compareOptionalNumbers(left, right, direction = "asc") {
    const leftValid = Number.isFinite(left);
    const rightValid = Number.isFinite(right);
    if (!leftValid && !rightValid) return 0;
    if (!leftValid) return 1;
    if (!rightValid) return -1;
    return direction === "desc" ? right - left : left - right;
  }

  function sortObjectives(objectives = []) {
    const sortKey = normalizeObjectiveSortKey(store.situationsView.objectivesSort || "recently_updated");
    return [...objectives].sort((left, right) => {
      const leftCounts = getObjectiveSubjectCounts(left);
      const rightCounts = getObjectiveSubjectCounts(right);
      const leftCompletion = getObjectiveCompletionPercent(left);
      const rightCompletion = getObjectiveCompletionPercent(right);
      const leftDue = getObjectiveDueDateValue(left);
      const rightDue = getObjectiveDueDateValue(right);
      const leftUpdated = getObjectiveUpdatedAtValue(left);
      const rightUpdated = getObjectiveUpdatedAtValue(right);

      let result = 0;
      switch (sortKey) {
        case "furthest_due_date":
          result = compareOptionalNumbers(leftDue, rightDue, "desc");
          break;
        case "closest_due_date":
          result = compareOptionalNumbers(leftDue, rightDue, "asc");
          break;
        case "least_complete":
          result = leftCompletion - rightCompletion;
          if (result === 0) result = leftCounts.total - rightCounts.total;
          break;
        case "most_complete":
          result = rightCompletion - leftCompletion;
          if (result === 0) result = rightCounts.total - leftCounts.total;
          break;
        case "alphabetical":
          result = compareObjectiveStrings(left?.title, right?.title);
          break;
        case "reverse_alphabetical":
          result = compareObjectiveStrings(right?.title, left?.title);
          break;
        case "most_issues":
          result = rightCounts.total - leftCounts.total;
          break;
        case "fewest_issues":
          result = leftCounts.total - rightCounts.total;
          break;
        case "recently_updated":
        default:
          result = rightUpdated - leftUpdated;
          break;
      }
      if (result !== 0) return result;
      result = compareObjectiveStrings(left?.title, right?.title);
      if (result !== 0) return result;
      return compareObjectiveStrings(left?.id, right?.id);
    });
  }

  function renderObjectivesSortControlHtml() {
    const activeSort = normalizeObjectiveSortKey(store.situationsView.objectivesSort || "recently_updated");
    const isOpen = !!store.situationsView.objectivesSortMenuOpen;
    return `
      <div class="issues-head-menu objectives-sort-menu ${isOpen ? "is-open" : ""}">
        <button
          type="button"
          class="gh-btn objectives-sort-menu__trigger"
          data-objectives-sort-toggle="true"
          aria-haspopup="true"
          aria-expanded="${isOpen ? "true" : "false"}"
        >
          <span class="objectives-sort-menu__trigger-icon" aria-hidden="true">${svgIcon("sort-desc", { className: "octicon octicon-sort-desc" })}</span>
          <span>Trier</span>
          ${svgIcon("chevron-down", { className: "gh-chevron" })}
        </button>
        <div class="gh-menu issues-head-menu__dropdown objectives-sort-menu__dropdown ${isOpen ? "gh-menu--open" : ""}" role="menu">
          <div class="gh-menu__title">Trier par</div>
          ${getObjectiveSortOptions().map((option) => {
            const isActive = option.value === activeSort;
            return `
              <button
                type="button"
                class="gh-menu__item objectives-sort-menu__item ${isActive ? "is-active" : ""}"
                data-objectives-sort="${escapeHtml(option.value)}"
              >
                <span class="objectives-sort-menu__check" aria-hidden="true">${isActive ? svgIcon("check", { className: "octicon octicon-check" }) : ""}</span>
                <span>${escapeHtml(option.label)}</span>
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderObjectiveProgressBar(objective, options = {}) {
    const counts = getObjectiveSubjectCounts(objective);
    const percent = counts.total > 0 ? Math.round((counts.closed / counts.total) * 100) : 0;
    const compact = !!options.compact;
    const rootClassName = compact ? "objective-progress objective-progress--compact" : "objective-progress";
    const trackFirst = compact
      ? `
        <div class="objective-progress__track" aria-hidden="true">
          <span class="objective-progress__fill" style="width:${percent}%"></span>
        </div>
        <div class="objective-progress__meta">
          <div class="objective-progress__label"><strong>${percent}%</strong> terminé</div>
          <div class="objective-progress__counts">${counts.open} ouverts <span aria-hidden="true">•</span> ${counts.closed} fermés</div>
        </div>
      `
      : `
        <div class="objective-progress__label"><strong>${percent}%</strong> terminé</div>
        <div class="objective-progress__track" aria-hidden="true">
          <span class="objective-progress__fill" style="width:${percent}%"></span>
        </div>
      `;
    return `
      <div class="${rootClassName}" aria-label="${percent}% terminé">
        ${trackFirst}
      </div>
    `;
  }

  function renderObjectiveSubjectsTableHtml(objective) {
    const counts = getObjectiveSubjectCounts(objective);
    const activeStatusFilter = getCurrentSubjectsStatusFilter();
    const visibleSubjects = counts.linkedSubjects.filter((sujet) => sujetMatchesStatusFilter(sujet, activeStatusFilter) && sujetMatchesPriorityFilter(sujet, getCurrentSubjectsPriorityFilter()));

    const bodyHtml = visibleSubjects.length
      ? visibleSubjects.map((sujet) => {
          const parentSituation = getSituationBySujetId(sujet.id);
          return renderFlatSujetRow(sujet, parentSituation?.id || "", { isSelectable: false, deps: getSubjectsTableDeps() });
        }).join("")
      : renderDataTableEmptyState({
          title: activeStatusFilter === "closed" ? "Aucun sujet fermé" : "Aucun sujet ouvert",
          description: "Les sujets rattachés à cet objectif apparaîtront ici."
        });

    return renderIssuesTable({
      className: "issues-table objectives-subjects-table",
      gridTemplate: getSituationsTableGridTemplate(),
      headHtml: renderSituationsTableHeadHtml({
        deps: getSubjectsTableDeps(),
        columns: [
          { className: "cell cell-theme", html: renderTableHeadFilterToggle({
            activeValue: activeStatusFilter,
            items: [
              { label: "Ouverts", value: "open", count: counts.open, dataAttr: "subjects-status-filter" },
              { label: "Fermés", value: "closed", count: counts.closed, dataAttr: "subjects-status-filter" }
            ]
          }) },
          { className: "cell cell-priority-filter", html: renderSubjectsPriorityHeadHtml() }
        ]
      }),
      rowsHtml: visibleSubjects.length ? bodyHtml : "",
      emptyTitle: activeStatusFilter === "closed" ? "Aucun sujet fermé" : "Aucun sujet ouvert",
      emptyDescription: "Les sujets rattachés à cet objectif apparaîtront ici."
    });
  }

  function renderObjectiveEditFormHtml(objective) {
    const edit = store.situationsView.objectiveEdit;
    const selectedDate = parseSharedDateInputValue(edit?.dueDate || objective?.dueDate || "");
    const fallback = new Date();
    const viewYear = Number.isFinite(Number(edit?.viewYear)) ? Number(edit.viewYear) : (selectedDate?.getFullYear?.() || fallback.getFullYear());
    const viewMonth = Number.isFinite(Number(edit?.viewMonth)) ? Number(edit.viewMonth) : (selectedDate?.getMonth?.() ?? fallback.getMonth());
    const isClosed = !!objective?.closed;
    const isCreateMode = String(edit?.mode || "edit") === "create";
    const isSaving = !!edit?.isSaving;
    const errorMessage = String(edit?.errorMessage || "");
    const closeActionLabel = isClosed ? "Rouvrir l'objectif" : "Fermer l'objectif";
    const saveButtonClassName = isClosed ? "gh-btn gh-btn--comment" : "gh-btn gh-btn--primary gh-btn--comment";

    return `
      <section class="objective-edit-form">
        <header class="objective-edit-form__header">
          <h2 class="objective-edit-form__title">${isCreateMode ? "Nouvel objectif" : "Modifier l'objectif"}</h2>
        </header>
        <div class="objective-edit-form__separator" aria-hidden="true"></div>

        <div class="objective-edit-form__field">
          <label class="objective-edit-form__label" for="objectiveEditTitle">Titre <span aria-hidden="true">*</span></label>
          <input
            id="objectiveEditTitle"
            class="objective-edit-form__input"
            type="text"
            value="${escapeHtml(edit?.title || objective?.title || "")}"
            placeholder="${escapeHtml(objective?.title || "")}" 
            data-objective-edit-field="title"
            ${isSaving ? "disabled" : ""}
          >
        </div>

        <div class="objective-edit-form__field objective-edit-form__field--date">
          <label class="objective-edit-form__label" for="objectiveEditDueDate">Date d'échéance (optionnel)</label>
          ${renderSharedDatePicker({
            idBase: "objectiveEditDueDate",
            value: edit?.dueDate || "",
            selectedDate,
            viewYear,
            viewMonth,
            isOpen: !!edit?.calendarOpen,
            placeholder: "Sélectionner une date",
            inputLabel: formatSharedDateInputValue(selectedDate),
            calendarLabel: "Sélectionner une date d'échéance"
          })}
        </div>

        <div class="objective-edit-form__field">
          <label class="objective-edit-form__label" for="objectiveEditDescription">Description (optionnel)</label>
          <textarea
            id="objectiveEditDescription"
            class="objective-edit-form__textarea"
            rows="5"
            placeholder="Décrire l'objectif"
            data-objective-edit-field="description"
            ${isSaving ? "disabled" : ""}
          >${escapeHtml(edit?.description || objective?.description || "")}</textarea>
        </div>

        <div class="objective-edit-form__separator" aria-hidden="true"></div>

        ${errorMessage ? `<div class="form-error-banner">${escapeHtml(errorMessage)}</div>` : ""}

        <footer class="objective-edit-form__actions">
          ${isCreateMode ? "" : `<button type="button" class="gh-btn" data-objective-edit-action="close" ${isSaving ? "disabled" : ""}>${closeActionLabel}</button>`}
          <div class="objective-edit-form__actions-right">
            <button type="button" class="gh-btn" data-objective-edit-action="cancel" ${isSaving ? "disabled" : ""}>Annuler</button>
            <button type="button" class="${saveButtonClassName}" data-objective-edit-action="save" ${isSaving ? "disabled" : ""}>${isSaving ? "Enregistrement..." : "Enregistrer"}</button>
          </div>
        </footer>
      </section>
    `;
  }

  function renderObjectiveDetailHtml(objective) {
    if (!objective) {
      return renderDataTableEmptyState({
        title: "Objectif introuvable",
        description: "Cet objectif n'existe plus ou n'est pas disponible."
      });
    }

    const overdue = getObjectiveOverdueMeta(objective);
    const dueDateLabel = formatObjectiveDueDateLabel(objective);

    return `
      <section class="objective-detail">
        <button type="button" class="objective-detail__back-link" data-objectives-back="list">
          <span class="objective-detail__back-icon" aria-hidden="true">${svgIcon("arrow-left", { className: "octicon octicon-arrow-left" })}</span>
          <span>Retour aux Objectifs</span>
        </button>
        <header class="objective-detail__title-row">
          <div class="objective-detail__title">${escapeHtml(objective.title)}</div>
          <div class="objective-detail__actions">
            ${renderSubjectsToolbarButton({ id: "objectiveEditAction", label: "Modifier", action: "edit-objective" })}
            ${renderSubjectsToolbarButton({ id: "objectiveCloseAction", label: objective?.closed ? "Rouvrir l'objectif" : "Fermer l'objectif", action: "close-objective" })}
            ${renderSituationsAddAction()}
          </div>
        </header>
        <div class="objective-detail__meta-line">
          ${renderObjectiveDetailStatusText(objective)}
          ${overdue ? `<span class="objective-detail__overdue"><span class="objective-detail__overdue-icon" aria-hidden="true">${svgIcon("alert-fill", { className: "octicon octicon-alert-fill" })}</span><span>${escapeHtml(overdue.label)}</span></span>` : ""}
          <span class="objective-detail__meta-item">Échéance au ${escapeHtml(dueDateLabel)}</span>
          <span class="objective-detail__meta-item">${escapeHtml(formatObjectiveUpdatedAtLabel(objective))}</span>
        </div>
        <div class="objective-detail__progress-row">
          ${renderObjectiveProgressBar(objective)}
        </div>
        <div class="objective-detail__divider" aria-hidden="true"></div>
        <div class="objective-detail__subjects">
          ${renderObjectiveSubjectsTableHtml(objective)}
        </div>
      </section>
    `;
  }

  function renderObjectivesTableHtml() {
    const selectedObjective = getObjectiveById(store.situationsView.selectedObjectiveId || "");
    if (!selectedObjective && store.situationsView.objectiveEdit?.isOpen && String(store.situationsView.objectiveEdit?.mode || "") === "create") {
      return renderObjectiveEditFormHtml(null);
    }
    if (selectedObjective) {
      if (store.situationsView.objectiveEdit?.isOpen && String(store.situationsView.objectiveEdit?.objectiveId || "") === String(selectedObjective.id || "")) {
        return renderObjectiveEditFormHtml(selectedObjective);
      }
      return renderObjectiveDetailHtml(selectedObjective);
    }

    const objectives = getObjectives();
    const openObjectives = objectives.filter((objective) => !objective.closed);
    const closedObjectives = objectives.filter((objective) => objective.closed);
    const activeFilter = String(store.situationsView.objectivesStatusFilter || "open").toLowerCase() === "closed" ? "closed" : "open";
    const visibleObjectives = sortObjectives(activeFilter === "closed" ? closedObjectives : openObjectives);

    const headHtml = `
      <div class="objectives-table__head-inner">
        <div class="objectives-table__head-left">
          ${renderTableHeadFilterToggle({
            activeValue: activeFilter,
            items: [
              { label: "Ouverts", value: "open", count: openObjectives.length, dataAttr: "objectives-filter" },
              { label: "Fermés", value: "closed", count: closedObjectives.length, dataAttr: "objectives-filter" }
            ]
          })}
        </div>
        <div class="objectives-table__head-right">
          ${renderObjectivesSortControlHtml()}
        </div>
      </div>
    `;

    const bodyHtml = visibleObjectives.length
      ? visibleObjectives.map((objective) => {
          const counts = getObjectiveSubjectCounts(objective);
          const dueDateValue = getObjectiveDueDateValue(objective);
          const dueDateLabel = Number.isFinite(dueDateValue)
            ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(dueDateValue))
            : "Pas de date définie";
          const overdue = getObjectiveOverdueMeta(objective);
          return `
          <div class="objectives-row" data-objective-id="${escapeHtml(objective.id)}" tabindex="0" role="button">
            <span class="objectives-row__icon" aria-hidden="true">${svgIcon("milestone", { className: "octicon octicon-milestone" })}</span>
            <button type="button" class="objectives-row__title" data-objective-id="${escapeHtml(objective.id)}">${escapeHtml(objective.title)}</button>
            <span class="objectives-row__meta">${overdue ? `<span class="objectives-row__overdue"><span class="objectives-row__overdue-icon" aria-hidden="true">${svgIcon("alert-fill", { className: "octicon octicon-alert-fill" })}</span><span>${escapeHtml(overdue.label)}</span></span><span aria-hidden="true">•</span>` : ""}Échéance au ${escapeHtml(dueDateLabel)} <span aria-hidden="true">-</span> ${renderProblemsCountsIconHtml(counts.closed, counts.total, { svgIssueClosed: svgIcon("check-circle") })}</span>
            <div class="objectives-row__progress">${renderObjectiveProgressBar(objective, { compact: true })}</div>
          </div>
        `;
        }).join("")
      : renderDataTableEmptyState({
          title: activeFilter === "closed" ? "Aucun objectif fermé" : "Aucun objectif ouvert",
          description: activeFilter === "closed" ? "Les objectifs fermés apparaîtront ici." : "Les objectifs ouverts apparaîtront ici."
        });

    return renderIssuesTable({
      className: "objectives-table",
      headHtml,
      rowsHtml: visibleObjectives.length ? bodyHtml : "",
      headClassName: "objectives-table__head",
      bodyClassName: "objectives-table__body",
      gridTemplate: "minmax(0, 1fr)",
      emptyTitle: activeFilter === "closed" ? "Aucun objectif fermé" : "Aucun objectif ouvert",
      emptyDescription: activeFilter === "closed" ? "Les objectifs fermés apparaîtront ici." : "Les objectifs ouverts apparaîtront ici."
    });
  }

  function renderObjectivesCreateAction() {
    return renderSubjectsToolbarButton({
      id: "objectivesCreateAction",
      label: "Nouvel objectif",
      tone: "primary",
      action: "add-objective"
    });
  }

  function renderObjectivesViewHeaderHtml() {
    const selectedObjective = getObjectiveById(store.situationsView.selectedObjectiveId || "");
    if (selectedObjective) return "";
    const leftHtml = renderProjectTableToolbarGroup({
      html: '<div class="project-table-toolbar__title">Objectifs</div>'
    });
    const rightHtml = renderProjectTableToolbarGroup({
      html: renderObjectivesCreateAction()
    });
    return renderProjectTableToolbar({
      className: "project-table-toolbar--situations project-table-toolbar--objectives",
      leftHtml,
      rightHtml
    });
  }

  function handleToolbarAction(action, event) {
    if (action === "add-objective") {
      event?.preventDefault?.();
      openObjectiveCreate();
      store.situationsView.subjectsSubview = "objectives";
      store.situationsView.showTableOnly = true;
      store.situationsView.objectivesSortMenuOpen = false;
      rerenderPanels();
      return true;
    }
    if (action === "open-objectives") {
      event?.preventDefault?.();
      resetObjectiveEditState();
      store.situationsView.subjectsSubview = "objectives";
      store.situationsView.selectedObjectiveId = "";
      store.situationsView.showTableOnly = true;
      store.situationsView.objectivesSortMenuOpen = false;
      rerenderPanels();
      return true;
    }
    if (action === "edit-objective") {
      event?.preventDefault?.();
      if (!store.situationsView.selectedObjectiveId) return true;
      openObjectiveEdit(store.situationsView.selectedObjectiveId);
      rerenderPanels();
      return true;
    }
    if (action === "close-objective") {
      event?.preventDefault?.();
      const selectedObjective = getObjectiveById(store.situationsView.selectedObjectiveId || "");
      if (selectedObjective?.closed) void reopenObjective(store.situationsView.selectedObjectiveId);
      else void closeObjective(store.situationsView.selectedObjectiveId);
      return true;
    }
    return false;
  }

  function handleToolbarClick(event) {
    const objectiveSortToggle = event.target.closest("[data-objectives-sort-toggle]");
    if (objectiveSortToggle) {
      event.preventDefault();
      store.situationsView.objectivesSortMenuOpen = !store.situationsView.objectivesSortMenuOpen;
      rerenderPanels();
      return true;
    }

    const objectiveSortButton = event.target.closest("[data-objectives-sort]");
    if (objectiveSortButton) {
      event.preventDefault();
      store.situationsView.objectivesSort = normalizeObjectiveSortKey(objectiveSortButton.dataset.objectivesSort || "recently_updated");
      store.situationsView.objectivesSortMenuOpen = false;
      rerenderPanels();
      return true;
    }

    const objectiveBackButton = event.target.closest("[data-objectives-back]");
    if (!objectiveBackButton) return false;
    event.preventDefault();
    resetObjectiveEditState();
    store.situationsView.subjectsSubview = "objectives";
    store.situationsView.selectedObjectiveId = "";
    store.situationsView.showTableOnly = true;
    store.situationsView.objectivesSortMenuOpen = false;
    rerenderPanels();
    return true;
  }

  function handleRootClick(event) {
    const objectiveSortToggle = event.target.closest("[data-objectives-sort-toggle]");
    if (objectiveSortToggle) {
      event.preventDefault();
      store.situationsView.objectivesSortMenuOpen = !store.situationsView.objectivesSortMenuOpen;
      rerenderPanels();
      return true;
    }

    const objectiveSortButton = event.target.closest("[data-objectives-sort]");
    if (objectiveSortButton) {
      event.preventDefault();
      store.situationsView.objectivesSort = normalizeObjectiveSortKey(objectiveSortButton.dataset.objectivesSort || "recently_updated");
      store.situationsView.objectivesSortMenuOpen = false;
      rerenderPanels();
      return true;
    }

    const objectivesFilterButton = event.target.closest("[data-objectives-filter]");
    if (objectivesFilterButton) {
      event.preventDefault();
      resetObjectiveEditState();
      store.situationsView.objectivesStatusFilter = String(objectivesFilterButton.dataset.objectivesFilter || "open").toLowerCase() === "closed" ? "closed" : "open";
      store.situationsView.selectedObjectiveId = "";
      store.situationsView.objectivesSortMenuOpen = false;
      rerenderPanels();
      return true;
    }

    const objectiveBackButton = event.target.closest("[data-objectives-back]");
    if (objectiveBackButton) {
      event.preventDefault();
      resetObjectiveEditState();
      store.situationsView.selectedObjectiveId = "";
      store.situationsView.objectivesSortMenuOpen = false;
      rerenderPanels();
      return true;
    }

    const objectiveDateToggle = event.target.closest("[data-shared-date-input-trigger='objectiveEditDueDate']");
    if (objectiveDateToggle) {
      event.preventDefault();
      ensureViewUiState();
      store.situationsView.objectiveEdit.calendarOpen = !store.situationsView.objectiveEdit.calendarOpen;
      rerenderPanels();
      return true;
    }

    const objectiveDatePrev = event.target.closest("[data-shared-date-nav='objectiveEditDueDate-prev']");
    if (objectiveDatePrev) {
      event.preventDefault();
      const edit = store.situationsView.objectiveEdit;
      const shifted = shiftSharedCalendarMonth(edit.viewYear, edit.viewMonth, -1);
      edit.viewYear = shifted.year;
      edit.viewMonth = shifted.month;
      rerenderPanels();
      return true;
    }

    const objectiveDateNext = event.target.closest("[data-shared-date-nav='objectiveEditDueDate-next']");
    if (objectiveDateNext) {
      event.preventDefault();
      const edit = store.situationsView.objectiveEdit;
      const shifted = shiftSharedCalendarMonth(edit.viewYear, edit.viewMonth, 1);
      edit.viewYear = shifted.year;
      edit.viewMonth = shifted.month;
      rerenderPanels();
      return true;
    }

    const objectiveDateDay = event.target.closest("[data-shared-date-day][data-shared-date-owner='objectiveEditDueDate']");
    if (objectiveDateDay) {
      event.preventDefault();
      const nextValue = String(objectiveDateDay.dataset.sharedDateDay || "");
      store.situationsView.objectiveEdit.dueDate = nextValue;
      store.situationsView.objectiveEdit.calendarOpen = false;
      const selectedDate = parseSharedDateInputValue(nextValue);
      if (selectedDate) {
        store.situationsView.objectiveEdit.viewYear = selectedDate.getFullYear();
        store.situationsView.objectiveEdit.viewMonth = selectedDate.getMonth();
      }
      rerenderPanels();
      return true;
    }

    const objectiveDateClear = event.target.closest("[data-shared-date-clear='objectiveEditDueDate']");
    if (objectiveDateClear) {
      event.preventDefault();
      store.situationsView.objectiveEdit.dueDate = "";
      store.situationsView.objectiveEdit.calendarOpen = false;
      rerenderPanels();
      return true;
    }

    const objectiveDateToday = event.target.closest("[data-shared-date-today='objectiveEditDueDate']");
    if (objectiveDateToday) {
      event.preventDefault();
      const today = new Date();
      store.situationsView.objectiveEdit.dueDate = toSharedDateInputValue(today);
      store.situationsView.objectiveEdit.viewYear = today.getFullYear();
      store.situationsView.objectiveEdit.viewMonth = today.getMonth();
      store.situationsView.objectiveEdit.calendarOpen = false;
      rerenderPanels();
      return true;
    }

    const objectiveEditAction = event.target.closest("[data-objective-edit-action]");
    if (objectiveEditAction) {
      event.preventDefault();
      const action = String(objectiveEditAction.dataset.objectiveEditAction || "");
      if (action === "cancel") {
        resetObjectiveEditState();
        rerenderPanels();
      } else if (action === "save") {
        void saveObjectiveEdit();
      } else if (action === "close") {
        const editingObjective = getEditingObjective();
        if (editingObjective?.closed) void reopenObjective(store.situationsView.selectedObjectiveId);
        else void closeObjective(store.situationsView.selectedObjectiveId);
      }
      return true;
    }

    const objectiveTitleTrigger = event.target.closest(".objectives-row__title, .objectives-row[data-objective-id]");
    if (objectiveTitleTrigger && String(store.situationsView.subjectsSubview || "subjects") === "objectives") {
      event.preventDefault();
      const objectiveId = String(objectiveTitleTrigger.dataset.objectiveId || objectiveTitleTrigger.closest("[data-objective-id]")?.dataset.objectiveId || "");
      if (objectiveId) {
        resetObjectiveEditState();
        store.situationsView.selectedObjectiveId = objectiveId;
        store.situationsView.showTableOnly = true;
        store.situationsView.objectivesSortMenuOpen = false;
        rerenderPanels();
        return true;
      }
    }

    return false;
  }

  function handleRootInput(event) {
    const field = event.target.closest?.("[data-objective-edit-field]");
    if (!field) return false;
    const key = String(field.dataset.objectiveEditField || "");
    if (!key) return false;
    store.situationsView.objectiveEdit[key] = String(field.value || "");
    return true;
  }

  function bindGlobalEvents() {
    if (objectiveEditCalendarDismissBound) return;
    objectiveEditCalendarDismissBound = true;
    document.addEventListener("click", (event) => {
      let shouldRerender = false;
      if (store.situationsView.objectiveEdit?.isOpen && store.situationsView.objectiveEdit?.calendarOpen && !event.target.closest(".shared-date-picker")) {
        store.situationsView.objectiveEdit.calendarOpen = false;
        shouldRerender = true;
      }
      if (store.situationsView.objectivesSortMenuOpen && !event.target.closest(".objectives-sort-menu")) {
        store.situationsView.objectivesSortMenuOpen = false;
        shouldRerender = true;
      }
      if (shouldRerender) rerenderPanels();
    });
  }

  return {
    resetObjectiveEditState,
    renderObjectivesViewHeaderHtml,
    renderObjectivesTableHtml,
    handleToolbarAction,
    handleToolbarClick,
    handleRootClick,
    handleRootInput,
    bindGlobalEvents
  };
}
