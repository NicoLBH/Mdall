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
  pageSize: 25,
  detailsModalOpen: false
  };
}

function createSituationsViewState() {
  return {
    data: [],
    rawResult: null,
    projectScopeId: null,

    // Le nom des chantiers qu'un carnet cite, demandé à la base et non deviné
    // ici : on cite des projets qu'on n'a jamais ouverts sur cette machine.
    // Vide n'est pas « aucun » — c'est « pas encore demandé ».
    nomsDesProjets: {},

    // Les sujets des chantiers que mes situations désignent, montés comme ceux
    // d'un projet le sont. `null` n'est pas « aucun sujet » : c'est « pas
    // encore lu », et ce qui en dépend se tait plutôt que de compter zéro.
    sujetsDuCarnet: null,

    // Qui travaille sur les chantiers que mon carnet regarde. Sans elles,
    // « Assigné à moi », « Créé par moi » et « Mentions » ne se déclarent pas.
    personnesDuCarnet: [],

    // Ce que le rail du carnet regarde — la requête d'une lecture, ou vide
    // pour la liste des situations elle-même.
    requeteDuCarnet: "",

    // La largeur du rail, et son repliement. Mêmes bornes que partout ailleurs :
    // c'est `project-rail.js` qui les tient.
    railLargeur: 248,
    railReplie: false,

    /**
     * Le panneau latéral du détail d'une situation : ouvert, ou non.
     *
     * **Il n'existait pas, et trois endroits l'écrivaient déjà.** Le panneau
     * pose `isOpen` ici en s'ouvrant, le retire en se fermant, et l'écran des
     * Sujets le lit — mais tous trois se gardaient d'un objet absent, si bien
     * que personne n'a jamais rien écrit ni rien lu. Le bouton qui l'ouvre ne
     * pouvait donc pas savoir qu'il était déjà ouvert, et ne le refermait pas.
     */

    drilldown: { isOpen: false },

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
    pageSize: 25,
    detailsModalOpen: false,
    handwritingComposerDraftBySubjectId: {},
    handwritingComposerDraftByKey: {}
  };
}

const projectSubjectsView = createProjectSubjectsViewState();
const situationsView = createSituationsViewState();
const projectActionsView = {
  pagination: {
    mode: "client",
    pageSize: 25,
    currentPage: 1
  }
};

export const store = {
  user: null,
  projects: [],
  currentProject: null,
  currentProjectId: null,
  /**
   * La proposition qu'un lien vient de désigner depuis un autre onglet.
   *
   * La route ne porte que l'onglet ; l'écran d'arrivée lit ceci, l'ouvre, et
   * l'efface. Sans cela, cliquer une citation afficherait la liste et laisserait
   * chercher à la main ce qu'on venait de désigner.
   */
  pendingPropositionId: "",
  // Ce qu'un lot d'Atelier n'a pas pu porter dans la proposition qu'il visait.
  // Les quatre écrans qui proposent s'en vont aussitôt vers la proposition : la
  // phrase se lirait donc sur un écran qu'on ne regarde plus, c'est-à-dire nulle
  // part. Elle voyage, et se dit à l'arrivée. `{ propositionId, tranches }`.
  pendingPropositionTranches: null,

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
    pdfFile: null,
    codeInsee: "",
    contextFacts: []
  },

  projectContextFacts: [],

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
  situationsView,
  projectActionsView
};
