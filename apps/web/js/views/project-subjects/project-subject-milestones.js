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
      viewMonth: 0
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
      viewMonth: selectedDate?.getMonth?.() ?? fallback.getMonth()
    };
  }

  function getEditingObjective() {
    ensureViewUiState();
    const edit = store.situationsView.objectiveEdit;
    if (!edit?.isOpen || !edit.objectiveId) return null;
    return getObjectiveById(edit.objectiveId);
  }

  function saveObjectiveEdit() {
    ensureViewUiState();
    const edit = store.situationsView.objectiveEdit;
    if (!edit?.isOpen || !edit.objectiveId) return;
    const nextTitle = String(edit.title || "").trim();
    if (!nextTitle) return;
    const nextDueDate = String(edit.dueDate || "").trim() || null;
    const nextDescription = String(edit.description || "").trim();
    persistRunBucket((draft) => {
      const objectives = Array.isArray(draft.objectives) ? draft.objectives : [];
      const target = objectives.find((objective) => String(objective?.id || "") === String(edit.objectiveId || ""));
      if (!target) return;
      target.title = nextTitle;
      target.dueDate = nextDueDate;
      target.description = nextDescription;
    });
    resetObjectiveEditState();
  }

  function setObjectiveClosedState(objectiveId, closed) {
    const targetId = String(objectiveId || store.situationsView.selectedObjectiveId || "");
    if (!targetId) return;
    persistRunBucket((draft) => {
      const objectives = Array.isArray(draft.objectives) ? draft.objectives : [];
      const target = objectives.find((objective) => String(objective?.id || "") === targetId);
      if (!target) return;
      target.closed = !!closed;
    });
    resetObjectiveEditState();
    store.situationsView.selectedObjectiveId = "";
    store.situationsView.objectivesStatusFilter = closed ? "open" : "closed";
  }

  function closeObjective(objectiveId) {
    setObjectiveClosedState(objectiveId, true);
  }

  function reopenObjective(objectiveId) {
    setObjectiveClosedState(objectiveId, false);
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

  function formatObjectiveDueDateLabel(objective) {
    if (!objective?.dueDate) return "Pas de date définie";
    const parsed = new Date(objective.dueDate);
    if (Number.isNaN(parsed.getTime())) return String(objective.dueDate);
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(parsed);
  }

  function renderObjectiveStatusBadge(objective) {
    return statePill(objective?.closed ? "closed" : "open");
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
    const closeActionLabel = isClosed ? "Rouvrir l'objectif" : "Fermer l'objectif";
    const saveButtonClassName = isClosed ? "gh-btn gh-btn--comment" : "gh-btn gh-btn--primary gh-btn--comment";

    return `
      <section class="objective-edit-form">
        <header class="objective-edit-form__header">
          <h2 class="objective-edit-form__title">Modifier l'objectif</h2>
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
          >${escapeHtml(edit?.description || objective?.description || "")}</textarea>
        </div>

        <div class="objective-edit-form__separator" aria-hidden="true"></div>

        <footer class="objective-edit-form__actions">
          <button type="button" class="gh-btn" data-objective-edit-action="close">${closeActionLabel}</button>
          <div class="objective-edit-form__actions-right">
            <button type="button" class="gh-btn" data-objective-edit-action="cancel">Annuler</button>
            <button type="button" class="${saveButtonClassName}" data-objective-edit-action="save">Enregistrer</button>
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

    return `
      <section class="objective-detail">
        <header class="objective-detail__header">
          <div class="objective-detail__title">${escapeHtml(objective.title)}</div>
        </header>
        <div class="objective-detail__meta-row">
          <div class="objective-detail__meta-left">
            ${renderObjectiveStatusBadge(objective)}
            <span class="objective-detail__meta-text">${escapeHtml(formatObjectiveDueDateLabel(objective))}</span>
          </div>
          <div class="objective-detail__meta-right">
            ${renderObjectiveProgressBar(objective)}
          </div>
        </div>
        <div class="objective-detail__subjects">
          ${renderObjectiveSubjectsTableHtml(objective)}
        </div>
      </section>
    `;
  }

  function renderObjectivesTableHtml() {
    const selectedObjective = getObjectiveById(store.situationsView.selectedObjectiveId || "");
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
    const visibleObjectives = activeFilter === "closed" ? closedObjectives : openObjectives;

    const headHtml = renderTableHeadFilterToggle({
      activeValue: activeFilter,
      items: [
        { label: "Ouverts", value: "open", count: openObjectives.length, dataAttr: "objectives-filter" },
        { label: "Fermés", value: "closed", count: closedObjectives.length, dataAttr: "objectives-filter" }
      ]
    });

    const bodyHtml = visibleObjectives.length
      ? visibleObjectives.map((objective) => {
          const counts = getObjectiveSubjectCounts(objective);
          const dueDateLabel = objective?.dueDate
            ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(objective.dueDate))
            : "Pas de date définie";
          return `
          <div class="objectives-row" data-objective-id="${escapeHtml(objective.id)}" tabindex="0" role="button">
            <span class="objectives-row__icon" aria-hidden="true">${svgIcon("milestone", { className: "octicon octicon-milestone" })}</span>
            <button type="button" class="objectives-row__title" data-objective-id="${escapeHtml(objective.id)}">${escapeHtml(objective.title)}</button>
            <span class="objectives-row__meta">Échéance au ${escapeHtml(dueDateLabel)} <span aria-hidden="true">-</span> ${problemsCountsIconHtml(counts.closed, counts.total)}</span>
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
    const isEditingObjective = !!store.situationsView.objectiveEdit?.isOpen
      && String(store.situationsView.objectiveEdit?.objectiveId || "") === String(selectedObjective?.id || "");
    const leftHtml = selectedObjective
      ? renderProjectTableToolbarGroup({
          html: `<div class="objective-breadcrumb"><button type="button" class="objective-breadcrumb__link" data-objectives-back="list">Objectifs</button><span class="objective-breadcrumb__sep">/</span><span class="objective-breadcrumb__current">${escapeHtml(selectedObjective.title)}</span></div>`
        })
      : renderProjectTableToolbarGroup({
          html: '<div class="project-table-toolbar__title">Objectifs</div>'
        });
    const rightHtml = selectedObjective
      ? (isEditingObjective
          ? ""
          : [
              renderProjectTableToolbarGroup({ html: renderSubjectsToolbarButton({ id: "objectiveEditAction", label: "Modifier", action: "edit-objective" }) }),
              renderProjectTableToolbarGroup({ html: renderSubjectsToolbarButton({ id: "objectiveCloseAction", label: "Fermer l\'Objectif", action: "close-objective" }) }),
              renderProjectTableToolbarGroup({ html: renderSituationsAddAction() })
            ].join(""))
      : renderProjectTableToolbarGroup({
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
      return true;
    }
    if (action === "open-objectives") {
      event?.preventDefault?.();
      resetObjectiveEditState();
      store.situationsView.subjectsSubview = "objectives";
      store.situationsView.selectedObjectiveId = "";
      store.situationsView.showTableOnly = true;
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
      closeObjective(store.situationsView.selectedObjectiveId);
      rerenderPanels();
      return true;
    }
    return false;
  }

  function handleToolbarClick(event) {
    const objectiveBackButton = event.target.closest("[data-objectives-back]");
    if (!objectiveBackButton) return false;
    event.preventDefault();
    resetObjectiveEditState();
    store.situationsView.subjectsSubview = "objectives";
    store.situationsView.selectedObjectiveId = "";
    store.situationsView.showTableOnly = true;
    rerenderPanels();
    return true;
  }

  function handleRootClick(event) {
    const objectivesFilterButton = event.target.closest("[data-objectives-filter]");
    if (objectivesFilterButton) {
      event.preventDefault();
      resetObjectiveEditState();
      store.situationsView.objectivesStatusFilter = String(objectivesFilterButton.dataset.objectivesFilter || "open").toLowerCase() === "closed" ? "closed" : "open";
      store.situationsView.selectedObjectiveId = "";
      rerenderPanels();
      return true;
    }

    const objectiveBackButton = event.target.closest("[data-objectives-back]");
    if (objectiveBackButton) {
      event.preventDefault();
      resetObjectiveEditState();
      store.situationsView.selectedObjectiveId = "";
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
      } else if (action === "save") {
        saveObjectiveEdit();
      } else if (action === "close") {
        const editingObjective = getEditingObjective();
        if (editingObjective?.closed) reopenObjective(store.situationsView.selectedObjectiveId);
        else closeObjective(store.situationsView.selectedObjectiveId);
      }
      rerenderPanels();
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
      if (!store.situationsView.objectiveEdit?.isOpen || !store.situationsView.objectiveEdit?.calendarOpen) return;
      if (event.target.closest(".shared-date-picker")) return;
      store.situationsView.objectiveEdit.calendarOpen = false;
      rerenderPanels();
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
