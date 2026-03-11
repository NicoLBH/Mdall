export const store = {
  user: null,
  projects: [],
  currentProject: null,
  /*
  ==========================================
  STATE — VIEW SITUATIONS
  ==========================================
  */
  situationsView: {
    data: null,
    expandedSituations: new Set(),
    expandedSujets: new Set(),
    selectedSituationId: null,
    selectedSujetId: null,
    selectedAvisId: null,
    verdictFilter: "ALL",
    search: "",
    displayDepth: "situations",
    page: 1,
    pageSize: 80
  }
};
