import { DEFAULT_PROJECT_TABS_VISIBILITY } from "./constants.js";

export const DEFAULT_PROJECT_PHASES = [
  { code: "PC", label: "Permis de Construire", enabled: true, phaseDate: "" },
  { code: "AT", label: "Autorisation de Travaux", enabled: true, phaseDate: "" },
  { code: "APS", label: "Avant Projet Sommaire", enabled: true, phaseDate: "" },
  { code: "APD", label: "Avant Projet Détaillé", enabled: true, phaseDate: "" },
  { code: "PRO", label: "Projet", enabled: true, phaseDate: "" },
  { code: "DCE", label: "Dossier de Consultation des Entreprises", enabled: true, phaseDate: "" },
  { code: "MARCHE", label: "Marchés", enabled: true, phaseDate: "" },
  { code: "EXE", label: "Exécution", enabled: true, phaseDate: "" },
  { code: "DOE", label: "Dossier des Ouvrages Exécutés", enabled: true, phaseDate: "" },
  { code: "GPA", label: "Année de Garantie de Parfait Achèvement", enabled: true, phaseDate: "" },
  { code: "EXPLOIT", label: "Exploitation", enabled: true, phaseDate: "" }
];

function createProjectSubjectsViewState() {
  return {
    subjectsData: [],
    rawSubjectsResult: null,
    projectScopeId: null,
    loading: false,
    loaded: false,

  expandedSituations: new Set(),
  expandedSujets: new Set(),
  expandedSubjectIds: new Set(),

  selectedSituationId: null,
  selectedSujetId: null,
  selectedSubjectId: null,
  selectionRevision: 0,
  lastLoadRequestId: 0,
  selectedRelationContext: null,

  filters: {
    status: "open",
    priority: "",
    labelIds: [],
    milestoneIds: [],
    blockingState: ""
  },

  search: "",
  displayDepth: "situations",
  page: 1,
  pageSize: 80,
  detailsModalOpen: false
  };
}

function createSituationsViewState() {
  return {
    data: [],
    rawResult: null,
    projectScopeId: null,

    expandedSituations: new Set(),
    expandedSujets: new Set(),
    expandedSubjectIds: new Set(),

    selectedSituationId: null,
    selectedSujetId: null,
    selectedSubjectId: null,
    selectedRelationContext: null,

    filters: {
      status: "open",
      priority: "",
      labelIds: [],
      milestoneIds: [],
      blockingState: ""
    },

    search: "",
    displayDepth: "situations",
    page: 1,
    pageSize: 80,
    detailsModalOpen: false,
    handwritingComposerDraftBySubjectId: {},
    handwritingComposerDraftByKey: {}
  };
}

const projectSubjectsView = createProjectSubjectsViewState();
const situationsView = createSituationsViewState();

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
    address: "",
    city: "Annecy",
    postalCode: "74000",
    communeCp: "Annecy 74000",
    latitude: null,
    longitude: null,
    altitude: null,
    importance: "II",
    importanceCategory: "Catégorie d'importance II",
    riskCategory: "Risque normal",
    soilClass: "A",
    liquefaction: "no",
    liquefactionText: "Sol non liquéfiable",
    zoneSismique: "4",
    referential: "EC8",
    phasesCatalog: DEFAULT_PROJECT_PHASES.map((item) => ({ ...item })),
    currentPhase: "APS",
    phase: "APS",
    climateZoneWinter: "",
    climateZoneSummer: "",
    climateBaseTemperatures: "",
    projectTabs: { ...DEFAULT_PROJECT_TABS_VISIBILITY },
    webhookUrl: "",
    pdfFile: null
  },

  projectAutomation: {
    catalog: {
      agents: {},
      automations: {}
    },

    settings: {
      enabledAgents: {},
      enabledAutomations: {}
    },

    runLog: []
  },


  projectDocuments: {
    items: [],
    activeDocumentId: null,
    lastAnalysisDocumentIds: []
  },

  projectLots: {
    items: [],
    loading: false,
    loaded: false,
    error: "",
    projectKey: ""
  },

  projectSubjectsView,
  situationsView
};
