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
    projectName: "Projet demo",
    city: "Annecy",
    postalCode: "74000",
    communeCp: "Annecy 74000",
    importance: "II",
    importanceCategory: "Catégorie d'importance II",
    riskCategory: "Risque normal",
    soilClass: "A",
    liquefaction: "no",
    liquefactionText: "Sol non liquéfiable",
    zoneSismique: "4",
    referential: "EC8",
    phase: "APS",
    climateZoneWinter: "",
    climateZoneSummer: "",
    climateBaseTemperatures: "",
    projectTabs: {
      coordination: true,
      workflows: true,
      jalons: true,
      referentiel: true,
      risques-securite: true
    },
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
