export const store = {
  user: null,
  projects: [],
  currentProject: null,
  currentProjectId: null,

  ui: {
    runId: "",
    systemStatus: {
      state: "idle",
      label: "Idle",
      meta: "—"
    },
    assistant: {
      isOpen: false,
      isSending: false,
      mode: "auto",
      messages: [],
      draft: "",
      lastContext: null,
      lastError: ""
    }
  },

  projectForm: {
    communeCp: "",
    importance: "II",
    soilClass: "A",
    liquefaction: "no",
    referential: "EC8",
    webhookUrl: "",
    pdfFile: null
  },

  situationsView: {
    data: [],
    rawResult: null,

    expandedSituations: new Set(),
    expandedSujets: new Set(),

    selectedSituationId: null,
    selectedSujetId: null,
    selectedAvisId: null,

    verdictFilter: "ALL",
    search: "",
    displayDepth: "situations",
    page: 1,
    pageSize: 80,
    detailsModalOpen: false
  }
};
