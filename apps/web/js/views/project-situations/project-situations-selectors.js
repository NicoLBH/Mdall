export function createProjectSituationsSelectors({ store, uiState }) {
  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function firstNonEmpty(...values) {
    for (const value of values) {
      if (value === undefined || value === null) continue;
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
    return "";
  }

  function normalizeSituationMode(value) {
    return String(value || "manual").trim().toLowerCase() === "automatic" ? "automatic" : "manual";
  }

  function normalizeSituationStatus(value) {
    return String(value || "open").trim().toLowerCase() === "closed" ? "closed" : "open";
  }

  function getAllSituations() {
    return safeArray(store.situationsView?.data)
      .map((situation) => ({
        ...situation,
        id: String(situation?.id || ""),
        title: firstNonEmpty(situation?.title, "Situation"),
        description: firstNonEmpty(situation?.description, ""),
        status: normalizeSituationStatus(situation?.status),
        mode: normalizeSituationMode(situation?.mode)
      }))
      .filter((situation) => situation.id)
      .sort((left, right) => {
        const leftTs = Date.parse(left?.created_at || "") || 0;
        const rightTs = Date.parse(right?.created_at || "") || 0;
        if (leftTs !== rightTs) return leftTs - rightTs;
        return left.title.localeCompare(right.title, "fr");
      });
  }

  function getCurrentSituationsStatusFilter() {
    return String(store.situationsView?.situationsStatusFilter || store.situationsView?.filters?.status || "open").toLowerCase() === "closed" ? "closed" : "open";
  }

  function getSituationsStatusCounts() {
    return getAllSituations().reduce((acc, situation) => {
      if (situation.status === "closed") acc.closed += 1;
      else acc.open += 1;
      return acc;
    }, { open: 0, closed: 0 });
  }

  function getSituations() {
    const current = getCurrentSituationsStatusFilter();
    return getAllSituations().filter((situation) => situation.status === current);
  }

  function getSelectedSituation() {
    const selectedId = String(store.situationsView?.selectedSituationId || "").trim();
    return getAllSituations().find((situation) => situation.id === selectedId) || null;
  }

  function renderSituationCount(situationId) {
    const count = uiState.countsBySituationId[String(situationId || "")];
    if (Number.isFinite(count)) return String(count);
    return uiState.loading ? "…" : "0";
  }

  function formatSituationUpdatedLabel(ts) {
    const date = ts ? new Date(ts) : null;
    if (!date || Number.isNaN(date.getTime())) return "mis à jour récemment";

    const diffMs = Date.now() - date.getTime();
    const absSeconds = Math.max(1, Math.round(Math.abs(diffMs) / 1000));
    const units = [
      [31536000, "an", "ans"],
      [2592000, "mois", "mois"],
      [86400, "jour", "jours"],
      [3600, "h", "h"],
      [60, "min", "min"],
      [1, "s", "s"]
    ];

    for (const [seconds, singular, plural] of units) {
      if (absSeconds >= seconds) {
        const value = Math.floor(absSeconds / seconds);
        const label = value > 1 ? plural : singular;
        return diffMs < 0
          ? `mise à jour dans ${value} ${label}`
          : `mise à jour il y a ${value} ${label}`;
      }
    }

    return "mis à jour récemment";
  }

  return {
    safeArray,
    firstNonEmpty,
    normalizeSituationMode,
    normalizeSituationStatus,
    getAllSituations,
    getCurrentSituationsStatusFilter,
    getSituationsStatusCounts,
    getSituations,
    getSelectedSituation,
    renderSituationCount,
    formatSituationUpdatedLabel
  };
}
