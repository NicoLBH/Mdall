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
      messages: [],
      draft: ""
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
    expandedProblems: new Set(),

    selectedSituationId: null,
    selectedProblemId: null,
    selectedAvisId: null,

    verdictFilter: "ALL",
    search: "",
    displayDepth: "situations",
    page: 1,
    pageSize: 80,
    detailsModalOpen: false
  }
};
