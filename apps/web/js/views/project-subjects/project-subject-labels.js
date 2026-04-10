export function createProjectSubjectLabelsController(config) {
  const {
    store,
    escapeHtml,
    renderIssuesTable,
    normalizeSubjectLabelKey,
    getSubjectSidebarMeta
  } = config;

  const SUBJECT_DEFAULT_LABEL_DEFINITIONS = [
    { key: "bloquant", label: "bloquant", description: "Empêche l'avancement ou la décision.", color: "rgba(182, 2, 5, 0.18)", textColor: "rgb(254, 155, 156)", borderColor: "rgba(254, 155, 156, 0.3)" },
    { key: "critique", label: "critique", description: "Point majeur à traiter en priorité.", color: "rgba(217, 63, 11, 0.18)", textColor: "rgb(247, 140, 104)", borderColor: "rgba(247, 140, 104, 0.3)" },
    { key: "sensible", label: "sensible", description: "Sujet délicat nécessitant de la vigilance.", color: "rgba(83, 25, 231, 0.18)", textColor: "rgb(219, 207, 250)", borderColor: "rgba(219, 207, 250, 0.3)" },
    { key: "non conforme", label: "non conforme", description: "Écart constaté par rapport aux exigences.", color: "rgba(182, 2, 5, 0.18)", textColor: "rgb(254, 155, 156)", borderColor: "rgba(254, 155, 156, 0.3)" },
    { key: "incident", label: "incident", description: "Événement ou anomalie signalé(e).", color: "rgba(217, 63, 11, 0.18)", textColor: "rgb(247, 140, 104)", borderColor: "rgba(247, 140, 104, 0.3)" },
    { key: "réserve", label: "réserve", description: "Point à lever ou à suivre avant clôture.", color: "rgba(228, 230, 105, 0.18)", textColor: "rgb(228, 230, 107)", borderColor: "rgba(228, 230, 107, 0.3)" },
    { key: "question", label: "question", description: "Clarification attendue sur ce point.", color: "rgba(216, 118, 227, 0.18)", textColor: "rgb(219, 130, 229)", borderColor: "rgba(219, 130, 229, 0.3)" },
    { key: "à arbitrer", label: "à arbitrer", description: "Décision de pilotage ou d'arbitrage requise.", color: "rgba(0, 82, 204, 0.18)", textColor: "rgb(108, 167, 255)", borderColor: "rgba(108, 167, 255, 0.3)" },
    { key: "validation requise", label: "validation requise", description: "Validation formelle attendue.", color: "rgba(191, 218, 220, 0.18)", textColor: "rgb(192, 219, 221)", borderColor: "rgba(192, 219, 221, 0.3)" },
    { key: "à préciser", label: "à préciser", description: "Informations complémentaires nécessaires.", color: "rgba(29, 118, 219, 0.18)", textColor: "rgb(107, 167, 236)", borderColor: "rgba(107, 167, 236, 0.3)" },
    { key: "information", label: "information", description: "Point purement informatif.", color: "rgba(0, 107, 117, 0.18)", textColor: "rgb(0, 232, 253)", borderColor: "rgba(0, 232, 253, 0.3)" },
    { key: "refusé", label: "refusé", description: "Demande ou proposition rejetée.", color: "rgba(182, 2, 5, 0.18)", textColor: "rgb(254, 155, 156)", borderColor: "rgba(254, 155, 156, 0.3)" },
    { key: "variante", label: "variante", description: "Solution alternative proposée.", color: "rgba(29, 118, 219, 0.18)", textColor: "rgb(107, 167, 236)", borderColor: "rgba(107, 167, 236, 0.3)" },
    { key: "modification", label: "modification", description: "Évolution demandée sur l'existant.", color: "rgba(0, 82, 204, 0.18)", textColor: "rgb(108, 167, 255)", borderColor: "rgba(108, 167, 255, 0.3)" },
    { key: "optimisation", label: "optimisation", description: "Amélioration possible identifiée.", color: "rgba(14, 138, 22, 0.18)", textColor: "rgb(23, 230, 37)", borderColor: "rgba(23, 230, 37, 0.3)" },
    { key: "correction", label: "correction", description: "Action corrective à mettre en œuvre.", color: "rgba(194, 224, 198, 0.18)", textColor: "rgb(194, 224, 198)", borderColor: "rgba(194, 224, 198, 0.3)" },
    { key: "action moa", label: "action MOA", description: "Action attendue de la maîtrise d'ouvrage.", color: "rgba(191, 212, 242, 0.18)", textColor: "rgb(192, 213, 242)", borderColor: "rgba(192, 213, 242, 0.3)" },
    { key: "action moe", label: "action MOE", description: "Action attendue de la maîtrise d'œuvre.", color: "rgba(191, 212, 242, 0.18)", textColor: "rgb(192, 213, 242)", borderColor: "rgba(192, 213, 242, 0.3)" },
    { key: "action entreprise", label: "action Entreprise", description: "Action attendue de l'entreprise travaux.", color: "rgba(191, 212, 242, 0.18)", textColor: "rgb(192, 213, 242)", borderColor: "rgba(192, 213, 242, 0.3)" },
    { key: "action bet", label: "action BET", description: "Action attendue du bureau d'études.", color: "rgba(191, 212, 242, 0.18)", textColor: "rgb(192, 213, 242)", borderColor: "rgba(192, 213, 242, 0.3)" },
    { key: "coordination", label: "coordination", description: "Coordination nécessaire entre acteurs.", color: "rgba(83, 25, 231, 0.18)", textColor: "rgb(219, 207, 250)", borderColor: "rgba(219, 207, 250, 0.3)" },
    { key: "doublon", label: "doublon", description: "Sujet déjà couvert ailleurs.", color: "rgba(0, 0, 0, 0)", textColor: "rgb(208, 212, 216)", borderColor: "rgba(208, 212, 216, 0.3)" },
    { key: "hors périmètre", label: "hors périmètre", description: "En dehors du périmètre de traitement.", color: "rgba(0, 0, 0, 0)", textColor: "rgb(208, 212, 216)", borderColor: "rgba(208, 212, 216, 0.3)" },
    { key: "sans suite", label: "sans suite", description: "Point clos sans action complémentaire.", color: "rgba(0, 0, 0, 0)", textColor: "rgb(208, 212, 216)", borderColor: "rgba(208, 212, 216, 0.3)" }
  ];

  function getSubjectLabelDefinitions() {
    return SUBJECT_DEFAULT_LABEL_DEFINITIONS;
  }

  function getSubjectLabelDefinition(value) {
    const key = normalizeSubjectLabelKey(value);
    return getSubjectLabelDefinitions().find((labelDef) => normalizeSubjectLabelKey(labelDef.key) === key) || null;
  }

  function getSubjectsLabelUsageCounts() {
    const counts = new Map();
    const sujets = Array.isArray(store.projectSubjectsView?.subjectsData) ? store.projectSubjectsView.subjectsData : [];
    sujets.forEach((sujet) => {
      const seen = new Set();
      getSubjectSidebarMeta(sujet?.id).labels.forEach((label) => {
        const key = normalizeSubjectLabelKey(label);
        if (!key || seen.has(key)) return;
        seen.add(key);
        counts.set(key, Number(counts.get(key) || 0) + 1);
      });
    });
    return counts;
  }

  function renderSubjectLabelBadge(labelDef) {
    return `<span class="subject-label-badge" style="--subject-label-bg:${escapeHtml(labelDef.color)};--subject-label-fg:${escapeHtml(labelDef.textColor || '#ffffff')};--subject-label-border:${escapeHtml(labelDef.borderColor || labelDef.color)};">${escapeHtml(labelDef.label)}</span>`;
  }

  function renderLabelsTableHtml() {
    const labels = getSubjectLabelDefinitions();
    const counts = getSubjectsLabelUsageCounts();
    const headHtml = `<div class="labels-table__head-count">${labels.length} labels</div>`;
    const rowsHtml = labels.map((labelDef) => {
      const usageCount = Number(counts.get(normalizeSubjectLabelKey(labelDef.key)) || 0);
      return `
        <div class="labels-row">
          <div class="labels-row__name">${renderSubjectLabelBadge(labelDef)}</div>
          <div class="labels-row__description">${escapeHtml(labelDef.description)}</div>
          <div class="labels-row__count">${usageCount > 0 ? `<span class="labels-row__count-value">${usageCount}</span>` : ""}</div>
        </div>
      `;
    }).join("");

    return renderIssuesTable({
      className: "labels-table",
      headHtml,
      rowsHtml,
      headClassName: "labels-table__head",
      bodyClassName: "labels-table__body",
      gridTemplate: "minmax(180px, 320px) minmax(0, 1fr) 80px",
      emptyTitle: "Aucun label",
      emptyDescription: "Les labels apparaîtront ici."
    });
  }

  return {
    getSubjectLabelDefinitions,
    getSubjectLabelDefinition,
    getSubjectsLabelUsageCounts,
    renderSubjectLabelBadge,
    renderLabelsTableHtml
  };
}
