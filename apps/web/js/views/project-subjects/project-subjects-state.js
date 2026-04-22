export function createProjectSubjectsState({ store }) {
  function getRawSubjectsViewState() {
    if (!store.projectSubjectsView || typeof store.projectSubjectsView !== "object") {
      store.projectSubjectsView = {};
    }
    const view = store.projectSubjectsView;
    if (!Array.isArray(view.subjectsData)) view.subjectsData = [];
    if (!(view.rawSubjectsResult && typeof view.rawSubjectsResult === "object") && view.rawSubjectsResult !== null) {
      view.rawSubjectsResult = null;
    }
    if (typeof view.projectScopeId !== "string" && view.projectScopeId !== null) {
      view.projectScopeId = null;
    }
    if (typeof view.loading !== "boolean") {
      view.loading = false;
    }
    if (typeof view.loaded !== "boolean") {
      view.loaded = false;
    }
    if (!Number.isFinite(Number(view.selectionRevision))) {
      view.selectionRevision = 0;
    }
    if (!Number.isFinite(Number(view.lastLoadRequestId))) {
      view.lastLoadRequestId = 0;
    }
    return view;
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
    if (!(v.rightSubissuesExpandedSubjectIds instanceof Set)) {
      v.rightSubissuesExpandedSubjectIds = new Set(Array.isArray(v.rightSubissuesExpandedSubjectIds) ? v.rightSubissuesExpandedSubjectIds : []);
    }
    if (typeof v.rightSubissueMenuOpenId !== "string") v.rightSubissueMenuOpenId = "";
    if (typeof v.commentPreviewMode !== "boolean") v.commentPreviewMode = false;
    if (typeof v.commentDraft !== "string") v.commentDraft = "";
    if (typeof v.helpMode !== "boolean") v.helpMode = false;
    if (!v.replyContext || typeof v.replyContext !== "object") {
      v.replyContext = {
        subjectId: "",
        parentMessageId: "",
        parentPreview: ""
      };
    }
    if (!v.inlineReplyUi || typeof v.inlineReplyUi !== "object") {
      v.inlineReplyUi = {
        expandedMessageId: "",
        draftsByMessageId: {},
        previewByMessageId: {},
        attachmentsByMessageId: {},
        uploadSessionByMessageId: {},
        editMessageId: "",
        editDraftsByMessageId: {},
        editPreviewByMessageId: {},
        editAttachmentsByMessageId: {},
        editUploadSessionByMessageId: {}
      };
    }
    if (typeof v.showTableOnly !== "boolean") v.showTableOnly = true;
    if (!Number.isFinite(Number(v.tableScrollRestoreY))) v.tableScrollRestoreY = 0;
    if (!v.pagination || typeof v.pagination !== "object") {
      v.pagination = {
        mode: "full",
        pageSize: null,
        currentPage: 1,
        totalItems: 0,
        loadedItems: 0,
        hasNextPage: false,
        nextCursor: null,
        sourceComplete: true
      };
    }
    if (typeof v.pagination.mode !== "string") v.pagination.mode = "full";
    if (!Number.isFinite(Number(v.pagination.currentPage)) || Number(v.pagination.currentPage) < 1) v.pagination.currentPage = 1;
    if (!Number.isFinite(Number(v.pagination.totalItems)) || Number(v.pagination.totalItems) < 0) v.pagination.totalItems = 0;
    if (!Number.isFinite(Number(v.pagination.loadedItems)) || Number(v.pagination.loadedItems) < 0) v.pagination.loadedItems = 0;
    if (!Number.isFinite(Number(v.pagination.pageSize)) || Number(v.pagination.pageSize) <= 0) v.pagination.pageSize = null;
    if (typeof v.pagination.hasNextPage !== "boolean") v.pagination.hasNextPage = false;
    if (typeof v.pagination.sourceComplete !== "boolean") v.pagination.sourceComplete = true;
    if (typeof v.pagination.nextCursor !== "string" && v.pagination.nextCursor !== null) v.pagination.nextCursor = null;
    if (!v.descriptionEdit || typeof v.descriptionEdit !== "object") {
      v.descriptionEdit = {
        entityType: null,
        entityId: null,
        draft: "",
        previewMode: false,
        uploadSessionId: "",
        attachments: [],
        isSaving: false,
        error: ""
      };
    }
    if (typeof v.descriptionEdit.previewMode !== "boolean") v.descriptionEdit.previewMode = false;
    if (typeof v.descriptionEdit.uploadSessionId !== "string") v.descriptionEdit.uploadSessionId = "";
    if (!Array.isArray(v.descriptionEdit.attachments)) v.descriptionEdit.attachments = [];
    if (typeof v.descriptionEdit.isSaving !== "boolean") v.descriptionEdit.isSaving = false;
    if (typeof v.descriptionEdit.error !== "string") v.descriptionEdit.error = "";
    if (!v.subjectTitleEdit || typeof v.subjectTitleEdit !== "object") {
      v.subjectTitleEdit = {
        entityType: null,
        entityId: null,
        draft: "",
        initialTitle: "",
        isSaving: false,
        error: ""
      };
    }
    if (typeof v.subjectTitleEdit.isSaving !== "boolean") v.subjectTitleEdit.isSaving = false;
    if (typeof v.subjectTitleEdit.error !== "string") v.subjectTitleEdit.error = "";
    if (!v.drilldown || typeof v.drilldown !== "object") {
      v.drilldown = {
        isOpen: false,
        selectedSituationId: null,
        selectedSujetId: null,
        selectedSubjectId: null,
        rightSubissuesOpen: true,
        rightSubissuesExpandedSubjectIds: new Set(),
        rightSubissueMenuOpenId: "",
        expandedSujets: new Set(),
        expandedSubjectIds: new Set()
      };
    }
    if (typeof v.drilldown.rightSubissuesOpen !== "boolean") v.drilldown.rightSubissuesOpen = true;
    if (!(v.drilldown.rightSubissuesExpandedSubjectIds instanceof Set)) {
      v.drilldown.rightSubissuesExpandedSubjectIds = new Set(
        Array.isArray(v.drilldown.rightSubissuesExpandedSubjectIds) ? v.drilldown.rightSubissuesExpandedSubjectIds : []
      );
    }
    if (typeof v.drilldown.rightSubissueMenuOpenId !== "string") v.drilldown.rightSubissueMenuOpenId = "";
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
    if (typeof v.objectivesSort !== "string") v.objectivesSort = "recently_updated";
    if (typeof v.objectivesSortMenuOpen !== "boolean") v.objectivesSortMenuOpen = false;
    if (typeof v.labelsSearch !== "string") v.labelsSearch = "";
    if (typeof v.labelsSortBy !== "string") v.labelsSortBy = "name";
    if (typeof v.labelsSortDirection !== "string") v.labelsSortDirection = "asc";
    if (typeof v.labelsSortMenuOpen !== "boolean") v.labelsSortMenuOpen = false;
    if (typeof v.labelsRowMenuOpen !== "string") v.labelsRowMenuOpen = "";
    if (!v.labelEditModal || typeof v.labelEditModal !== "object") {
      v.labelEditModal = {
        isOpen: false,
        mode: "edit",
        targetKey: "",
        name: "",
        description: "",
        color: "#8b949e",
        colorPickerOpen: false
      };
    }
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
        activeKey: "",
        showClosedSituations: false,
        relationsView: "menu",
        subissueActionSubjectId: "",
        subissueActionScopeHost: "main",
        subissueActionIntent: ""
      };
    }
    if (typeof v.subjectMetaDropdown.showClosedSituations !== "boolean") v.subjectMetaDropdown.showClosedSituations = false;
    if (typeof v.subjectMetaDropdown.relationsView !== "string") v.subjectMetaDropdown.relationsView = "menu";
    if (typeof v.subjectMetaDropdown.subissueActionSubjectId !== "string") v.subjectMetaDropdown.subissueActionSubjectId = "";
    if (typeof v.subjectMetaDropdown.subissueActionScopeHost !== "string") v.subjectMetaDropdown.subissueActionScopeHost = "main";
    if (typeof v.subjectMetaDropdown.subissueActionIntent !== "string") v.subjectMetaDropdown.subissueActionIntent = "";
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
        validationError: "",
        isSubmitting: false,
        uploadSessionId: "",
        attachments: [],
        origin: "table",
        sourceSubjectId: null
      };
    }
    if (typeof v.createSubjectForm.isSubmitting !== "boolean") v.createSubjectForm.isSubmitting = false;
    if (typeof v.createSubjectForm.uploadSessionId !== "string") v.createSubjectForm.uploadSessionId = "";
    if (!Array.isArray(v.createSubjectForm.attachments)) v.createSubjectForm.attachments = [];
    if (String(v.createSubjectForm.origin || "").trim().toLowerCase() !== "detail") v.createSubjectForm.origin = "table";
    const sourceSubjectId = String(v.createSubjectForm.sourceSubjectId || "").trim();
    v.createSubjectForm.sourceSubjectId = sourceSubjectId || null;
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
      draft: "",
      previewMode: false,
      uploadSessionId: "",
      attachments: [],
      isSaving: false,
      error: ""
    };
    v.subjectTitleEdit = {
      entityType: null,
      entityId: null,
      draft: "",
      initialTitle: "",
      isSaving: false,
      error: ""
    };
    v.subjectMetaDropdown = {
      field: null,
      query: "",
      activeKey: "",
      showClosedSituations: false,
      relationsView: "menu"
    };
    v.labelsSortMenuOpen = false;
    v.labelsRowMenuOpen = "";
    if (v.labelEditModal && typeof v.labelEditModal === "object") {
      v.labelEditModal.isOpen = false;
      v.labelEditModal.colorPickerOpen = false;
    }
    v.subjectKanbanDropdown = {
      subjectId: "",
      situationId: "",
      query: "",
      activeKey: ""
    };
    v.rightSubissueMenuOpenId = "";
    v.replyContext = {
      subjectId: "",
      parentMessageId: "",
      parentPreview: ""
    };
    v.inlineReplyUi = {
      expandedMessageId: "",
      draftsByMessageId: {},
      previewByMessageId: {},
      attachmentsByMessageId: {},
      uploadSessionByMessageId: {},
      editMessageId: "",
      editDraftsByMessageId: {},
      editPreviewByMessageId: {},
      editAttachmentsByMessageId: {},
      editUploadSessionByMessageId: {}
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
