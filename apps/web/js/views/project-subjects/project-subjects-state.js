export function createProjectSubjectsState({ store }) {
  function getRawSubjectsViewState() {
    if (!store.projectSubjectsView || typeof store.projectSubjectsView !== "object") {
      store.projectSubjectsView = store.situationsView && typeof store.situationsView === "object"
        ? store.situationsView
        : {};
    }
    if (store.situationsView !== store.projectSubjectsView) {
      store.situationsView = store.projectSubjectsView;
    }
    return store.projectSubjectsView;
  }

  function ensureViewUiState() {
    const v = getRawSubjectsViewState();
    if (!(v.rightExpandedSujets instanceof Set)) {
      v.rightExpandedSujets = new Set(Array.isArray(v.rightExpandedSujets) ? v.rightExpandedSujets : []);
    }
    if (!(v.expandedSubjectIds instanceof Set)) {
      const legacyExpanded = v.expandedSujets instanceof Set
        ? Array.from(v.expandedSujets)
        : Array.isArray(v.expandedSujets) ? v.expandedSujets : [];
      v.expandedSubjectIds = new Set(legacyExpanded);
    }
    v.expandedSujets = v.expandedSubjectIds;
    if (typeof v.rightSubissuesOpen !== "boolean") v.rightSubissuesOpen = true;
    if (typeof v.commentPreviewMode !== "boolean") v.commentPreviewMode = false;
    if (typeof v.helpMode !== "boolean") v.helpMode = false;
    if (typeof v.showTableOnly !== "boolean") v.showTableOnly = true;
    if (!v.descriptionEdit || typeof v.descriptionEdit !== "object") {
      v.descriptionEdit = {
        entityType: null,
        entityId: null,
        draft: ""
      };
    }
    if (!v.drilldown || typeof v.drilldown !== "object") {
      v.drilldown = {
        isOpen: false,
        selectedSituationId: null,
        selectedSujetId: null,
        selectedSubjectId: null,
        expandedSujets: new Set(),
        expandedSubjectIds: new Set()
      };
    }
    if (!(v.drilldown.expandedSubjectIds instanceof Set)) {
      const legacyExpanded = v.drilldown.expandedSujets instanceof Set
        ? Array.from(v.drilldown.expandedSujets)
        : Array.isArray(v.drilldown.expandedSujets) ? v.drilldown.expandedSujets : [];
      v.drilldown.expandedSubjectIds = new Set(legacyExpanded);
    }
    v.drilldown.expandedSujets = v.drilldown.expandedSubjectIds;
    if (!v.filters || typeof v.filters !== "object") {
      v.filters = {
        status: "open",
        priority: "",
        labelIds: [],
        milestoneIds: [],
        blockingState: ""
      };
    }
    if (typeof v.subjectsStatusFilter !== "string") v.subjectsStatusFilter = String(v.filters.status || "open");
    if (typeof v.subjectsPriorityFilter !== "string") v.subjectsPriorityFilter = String(v.filters.priority || "");
    v.filters.status = String(v.subjectsStatusFilter || v.filters.status || "open");
    v.filters.priority = String(v.subjectsPriorityFilter || v.filters.priority || "");
    if (typeof v.situationsStatusFilter !== "string") v.situationsStatusFilter = "open";
    if (typeof v.subjectsSubview !== "string") v.subjectsSubview = "subjects";
    if (typeof v.objectivesStatusFilter !== "string") v.objectivesStatusFilter = "open";
    if (typeof v.selectedObjectiveId !== "string") v.selectedObjectiveId = "";
    if (!v.objectiveEdit || typeof v.objectiveEdit !== "object") {
      v.objectiveEdit = {
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
    if (!v.subjectMetaDropdown || typeof v.subjectMetaDropdown !== "object") {
      v.subjectMetaDropdown = {
        field: null,
        query: "",
        activeKey: ""
      };
    }
    if (!v.subjectKanbanDropdown || typeof v.subjectKanbanDropdown !== "object") {
      v.subjectKanbanDropdown = {
        subjectId: "",
        situationId: "",
        query: "",
        activeKey: ""
      };
    }
    if (!v.createSubjectForm || typeof v.createSubjectForm !== "object") {
      v.createSubjectForm = {
        isOpen: false,
        title: "",
        description: "",
        previewMode: false,
        createMore: false,
        meta: {
          assignees: [],
          labels: [],
          objectiveIds: [],
          situationIds: [],
          relations: []
        },
        validationError: ""
      };
    }
    return v;
  }

  function getSubjectsViewState() {
    return ensureViewUiState();
  }

  function resetSubjectsViewTransientState() {
    const v = ensureViewUiState();
    v.descriptionEdit = {
      entityType: null,
      entityId: null,
      draft: ""
    };
    v.subjectMetaDropdown = {
      field: null,
      query: "",
      activeKey: ""
    };
    v.subjectKanbanDropdown = {
      subjectId: "",
      situationId: "",
      query: "",
      activeKey: ""
    };
    return v;
  }

  function getSubjectsTabResetState() {
    const v = ensureViewUiState();
    return {
      subjectsSubview: String(v.subjectsSubview || "subjects"),
      selectedObjectiveId: String(v.selectedObjectiveId || ""),
      showTableOnly: !!v.showTableOnly,
      detailsModalOpen: !!v.detailsModalOpen,
      drilldownOpen: !!v.drilldown?.isOpen,
      subjectMetaDropdownOpen: !!v.subjectMetaDropdown?.field,
      subjectKanbanDropdownOpen: !!v.subjectKanbanDropdown?.subjectId,
      objectiveEditOpen: !!v.objectiveEdit?.isOpen,
      createSubjectFormOpen: !!v.createSubjectForm?.isOpen
    };
  }

  return {
    ensureViewUiState,
    getSubjectsViewState,
    resetSubjectsViewTransientState,
    getSubjectsTabResetState
  };
}
