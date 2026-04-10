export function createProjectSubjectsSelectors({
  store,
  ensureViewUiState,
  getRunBucket,
  getCustomSubjects,
  normalizeSubjectSituationIds,
  normalizeBackendPriority,
  getEffectiveAvisVerdict,
  getEffectiveSujetStatus,
  matchSearch,
  firstNonEmpty
}) {
  function getFilteredSituations() {
    const verdictFilter = String(store.situationsView.verdictFilter || "ALL").toUpperCase();
    const query = String(store.situationsView.search || "").trim().toLowerCase();
    const situations = store.situationsView.data || [];
    return situations.filter((situation) => situationMatchesFilters(situation, query, verdictFilter));
  }

  function getStandaloneCustomSubjects() {
    const situationIds = new Set((store.situationsView.data || []).map((situation) => String(situation?.id || "")).filter(Boolean));
    const { bucket } = getRunBucket();
    const metaMap = bucket?.subjectMeta?.sujet && typeof bucket.subjectMeta.sujet === "object"
      ? bucket.subjectMeta.sujet
      : {};

    return getCustomSubjects().filter((subject) => {
      const meta = metaMap[String(subject?.id || "")];
      const linkedIds = normalizeSubjectSituationIds(meta?.situationIds);
      if (!linkedIds.length) return true;
      return !linkedIds.some((situationId) => situationIds.has(String(situationId || "")));
    });
  }

  function subjectMatchesFilters(sujet, query, verdictFilter) {
    if (!sujet) return false;

    const priorityFilter = getCurrentSubjectsPriorityFilter();
    const sujetTextMatch = matchSearch(
      [
        sujet.id,
        sujet.title,
        sujet.priority,
        sujet.status,
        sujet.agent,
        sujet.raw?.summary,
        sujet.raw?.topic,
        sujet.raw?.category,
        sujet.raw?.title
      ],
      query
    );

    if (sujetTextMatch && sujetMatchesPriorityFilter(sujet, priorityFilter)) {
      if (verdictFilter === "ALL") return true;
      if ((sujet.avis || []).some((avis) => normalizeVerdict(getEffectiveAvisVerdict(avis.id)) === verdictFilter)) return true;
    }

    for (const avis of sujet.avis || []) {
      if (avisMatchesFilters(avis, query, verdictFilter)) return true;
    }

    return false;
  }

  function getFilteredStandaloneSubjects() {
    const verdictFilter = String(store.situationsView.verdictFilter || "ALL").toUpperCase();
    const query = String(store.situationsView.search || "").trim().toLowerCase();
    return getStandaloneCustomSubjects().filter((sujet) => subjectMatchesFilters(sujet, query, verdictFilter));
  }

  function avisMatchesFilters(avis, query, verdictFilter) {
    if (!avis) return false;

    const matchesSearch = matchSearch(
      [
        avis.id,
        avis.title,
        avis.verdict,
        avis.priority,
        avis.status,
        avis.agent,
        avis.raw?.message,
        avis.raw?.summary,
        avis.raw?.topic,
        avis.raw?.title,
        avis.raw?.label
      ],
      query
    );

    if (!matchesSearch) return false;
    if (verdictFilter === "ALL") return true;
    return normalizeVerdict(getEffectiveAvisVerdict(avis.id)) === verdictFilter;
  }

  function situationMatchesFilters(situation, query, verdictFilter) {
    const priorityFilter = getCurrentSubjectsPriorityFilter();
    const situationTextMatch = matchSearch(
      [
        situation.id,
        situation.title,
        situation.priority,
        situation.status,
        situation.raw?.summary,
        situation.raw?.topic,
        situation.raw?.category,
        situation.raw?.title
      ],
      query
    );

    if (situationTextMatch && verdictFilter === "ALL") return true;

    for (const sujet of getSituationSubjects(situation)) {
      const sujetTextMatch = matchSearch(
        [
          sujet.id,
          sujet.title,
          sujet.priority,
          sujet.status,
          sujet.agent,
          sujet.raw?.summary,
          sujet.raw?.topic,
          sujet.raw?.category,
          sujet.raw?.title
        ],
        query
      );

      if (sujetTextMatch && sujetMatchesPriorityFilter(sujet, priorityFilter)) {
        if (verdictFilter === "ALL") return true;
        if ((sujet.avis || []).some((avis) => normalizeVerdict(getEffectiveAvisVerdict(avis.id)) === verdictFilter)) return true;
      }

      for (const avis of sujet.avis || []) {
        if (avisMatchesFilters(avis, query, verdictFilter)) return true;
      }
    }

    return situationTextMatch;
  }

  function getCurrentSubjectsStatusFilter() {
    ensureViewUiState();
    const value = String(store.situationsView.subjectsStatusFilter || "open").toLowerCase();
    return value === "closed" ? "closed" : "open";
  }

  function getCurrentSubjectsPriorityFilter() {
    ensureViewUiState();
    return normalizeBackendPriority(store.situationsView.subjectsPriorityFilter || "");
  }

  function sujetMatchesPriorityFilter(sujet, priorityFilter = "") {
    const activePriority = normalizeBackendPriority(priorityFilter || "");
    if (!activePriority) return true;
    return normalizeBackendPriority(firstNonEmpty(sujet?.priority, sujet?.prio, "medium")) === activePriority;
  }

  function getAvailableSubjectPriorities() {
    const priorities = new Set();
    for (const situation of store.situationsView.data || []) {
      for (const sujet of getSituationSubjects(situation)) {
        const priority = normalizeBackendPriority(firstNonEmpty(sujet?.priority, sujet?.prio, "medium"));
        if (priority) priorities.add(priority);
      }
    }
    for (const sujet of getStandaloneCustomSubjects()) {
      const priority = normalizeBackendPriority(firstNonEmpty(sujet?.priority, sujet?.prio, "medium"));
      if (priority) priorities.add(priority);
    }
    const order = ["critical", "high", "medium", "low"];
    return Array.from(priorities).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  function sujetMatchesStatusFilter(sujet, statusFilter = getCurrentSubjectsStatusFilter()) {
    const effectiveStatus = String(getEffectiveSujetStatus(sujet?.id) || sujet?.status || "open").toLowerCase();
    return statusFilter === "closed" ? effectiveStatus !== "open" : effectiveStatus === "open";
  }

  function getSubjectsStatusCounts(query = "") {
    let open = 0;
    let closed = 0;
    const registerSubject = (sujet, extra = []) => {
      const matchesSearch = matchSearch([
        ...extra,
        sujet?.id,
        sujet?.title,
        sujet?.priority,
        sujet?.status,
        sujet?.agent,
        sujet?.raw?.summary,
        sujet?.raw?.topic,
        sujet?.raw?.category,
        sujet?.raw?.title
      ], query);
      if (!matchesSearch) return;
      if (sujetMatchesStatusFilter(sujet, "closed")) closed += 1;
      else open += 1;
    };

    for (const situation of store.situationsView.data || []) {
      for (const sujet of getSituationSubjects(situation)) {
        registerSubject(sujet, [situation?.id, situation?.title]);
      }
    }
    for (const sujet of getStandaloneCustomSubjects()) {
      registerSubject(sujet);
    }
    return { open, closed };
  }

  function getVisibleCounts(filteredSituations) {
    let sujets = 0;
    let avis = 0;
    for (const situation of filteredSituations) {
      sujets += getSituationSubjects(situation).length;
      for (const sujet of getSituationSubjects(situation)) avis += (sujet.avis || []).length;
    }
    for (const sujet of getFilteredStandaloneSubjects()) {
      sujets += 1;
      avis += (sujet.avis || []).length;
    }
    return { situations: filteredSituations.length, sujets, avis };
  }

  function getNestedSituation(situationId) {
    return (store.situationsView.data || []).find((s) => s.id === situationId) || null;
  }

  function getCanonicalSujetById(problemId) {
    const normalizedId = String(problemId || "");
    for (const situation of store.situationsView.data || []) {
      const match = (Array.isArray(situation?.sujets) ? situation.sujets : []).find((sujet) => String(sujet?.id || "") === normalizedId);
      if (match) return match;
    }
    const customMatch = getCustomSubjects().find((sujet) => String(sujet?.id || "") === normalizedId);
    return customMatch || null;
  }

  function getSituationSubjects(situation) {
    const situationId = String(situation?.id || "");
    const { bucket } = getRunBucket();
    const metaMap = bucket?.subjectMeta?.sujet && typeof bucket.subjectMeta.sujet === "object"
      ? bucket.subjectMeta.sujet
      : {};

    const base = (Array.isArray(situation?.sujets) ? situation.sujets : []).filter((sujet) => {
      const meta = metaMap[String(sujet?.id || "")];
      if (!Array.isArray(meta?.situationIds)) return true;
      return normalizeSubjectSituationIds(meta.situationIds).includes(situationId);
    });
    const existingIds = new Set(base.map((sujet) => String(sujet?.id || "")).filter(Boolean));
    if (!situationId) return base;

    for (const [subjectId, meta] of Object.entries(metaMap)) {
      const linkedIds = normalizeSubjectSituationIds(meta?.situationIds);
      if (!linkedIds.includes(situationId) || existingIds.has(subjectId)) continue;
      const canonical = getCanonicalSujetById(subjectId);
      if (!canonical) continue;
      base.push(canonical);
      existingIds.add(subjectId);
    }

    for (const customSubject of getCustomSubjects()) {
      const customId = String(customSubject?.id || "");
      if (!customId || existingIds.has(customId)) continue;
      const meta = metaMap[customId];
      const linkedIds = normalizeSubjectSituationIds(meta?.situationIds);
      if (!linkedIds.includes(situationId)) continue;
      base.push(customSubject);
      existingIds.add(customId);
    }

    return base;
  }

  function getNestedSujet(problemId) {
    return getCanonicalSujetById(problemId);
  }

  function getNestedAvis(avisId) {
    for (const situation of store.situationsView.data || []) {
      for (const sujet of getSituationSubjects(situation)) {
        const match = (sujet.avis || []).find((avis) => avis.id === avisId);
        if (match) return match;
      }
    }
    return null;
  }

  function getSituationBySujetId(problemId) {
    for (const situation of store.situationsView.data || []) {
      if (getSituationSubjects(situation).some((sujet) => sujet.id === problemId)) return situation;
    }
    return null;
  }

  function getSituationByAvisId(avisId) {
    for (const situation of store.situationsView.data || []) {
      for (const sujet of getSituationSubjects(situation)) {
        if ((sujet.avis || []).some((avis) => avis.id === avisId)) return situation;
      }
    }
    return null;
  }

  function getSujetByAvisId(avisId) {
    for (const situation of store.situationsView.data || []) {
      for (const sujet of getSituationSubjects(situation)) {
        if ((sujet.avis || []).some((avis) => avis.id === avisId)) return sujet;
      }
    }
    return null;
  }

  return {
    getFilteredSituations,
    getStandaloneCustomSubjects,
    getFilteredStandaloneSubjects,
    getCurrentSubjectsStatusFilter,
    getCurrentSubjectsPriorityFilter,
    sujetMatchesPriorityFilter,
    getAvailableSubjectPriorities,
    sujetMatchesStatusFilter,
    getSubjectsStatusCounts,
    getVisibleCounts,
    getNestedSituation,
    getCanonicalSujetById,
    getSituationSubjects,
    getNestedSujet,
    getNestedAvis,
    getSituationBySujetId,
    getSituationByAvisId,
    getSujetByAvisId
  };
}

function normalizeVerdict(value) {
  return String(value || "").trim().toUpperCase();
}
