export function createProjectSubjectLabelsController(config) {
  const {
    store,
    escapeHtml,
    svgIcon,
    renderIssuesTable,
    normalizeSubjectLabelKey,
    getSubjectSidebarMeta
  } = config;

  const SUBJECT_DEFAULT_LABEL_DEFINITIONS = [
    { key: "bloquant", label: "bloquant", description: "Empêche l'avancement ou la décision.", color: "rgba(182, 2, 5, 0.18)", textColor: "rgb(254, 155, 156)", borderColor: "rgba(254, 155, 156, 0.3)", hexColor: "#b60205" },
    { key: "critique", label: "critique", description: "Point majeur à traiter en priorité.", color: "rgba(217, 63, 11, 0.18)", textColor: "rgb(247, 140, 104)", borderColor: "rgba(247, 140, 104, 0.3)", hexColor: "#d93f0b" },
    { key: "sensible", label: "sensible", description: "Sujet délicat nécessitant de la vigilance.", color: "rgba(83, 25, 231, 0.18)", textColor: "rgb(219, 207, 250)", borderColor: "rgba(219, 207, 250, 0.3)", hexColor: "#5319e7" },
    { key: "non conforme", label: "non conforme", description: "Écart constaté par rapport aux exigences.", color: "rgba(182, 2, 5, 0.18)", textColor: "rgb(254, 155, 156)", borderColor: "rgba(254, 155, 156, 0.3)", hexColor: "#b60205" },
    { key: "incident", label: "incident", description: "Événement ou anomalie signalé(e).", color: "rgba(217, 63, 11, 0.18)", textColor: "rgb(247, 140, 104)", borderColor: "rgba(247, 140, 104, 0.3)", hexColor: "#d93f0b" },
    { key: "réserve", label: "réserve", description: "Point à lever ou à suivre avant clôture.", color: "rgba(228, 230, 105, 0.18)", textColor: "rgb(228, 230, 107)", borderColor: "rgba(228, 230, 107, 0.3)", hexColor: "#fbca04" },
    { key: "question", label: "question", description: "Clarification attendue sur ce point.", color: "rgba(216, 118, 227, 0.18)", textColor: "rgb(219, 130, 229)", borderColor: "rgba(219, 130, 229, 0.3)", hexColor: "#d876e3" },
    { key: "à arbitrer", label: "à arbitrer", description: "Décision de pilotage ou d'arbitrage requise.", color: "rgba(0, 82, 204, 0.18)", textColor: "rgb(108, 167, 255)", borderColor: "rgba(108, 167, 255, 0.3)", hexColor: "#0052cc" },
    { key: "validation requise", label: "validation requise", description: "Validation formelle attendue.", color: "rgba(191, 218, 220, 0.18)", textColor: "rgb(192, 219, 221)", borderColor: "rgba(192, 219, 221, 0.3)", hexColor: "#bfdadc" },
    { key: "à préciser", label: "à préciser", description: "Informations complémentaires nécessaires.", color: "rgba(29, 118, 219, 0.18)", textColor: "rgb(107, 167, 236)", borderColor: "rgba(107, 167, 236, 0.3)", hexColor: "#1d76db" },
    { key: "information", label: "information", description: "Point purement informatif.", color: "rgba(0, 107, 117, 0.18)", textColor: "rgb(0, 232, 253)", borderColor: "rgba(0, 232, 253, 0.3)", hexColor: "#006b75" },
    { key: "refusé", label: "refusé", description: "Demande ou proposition rejetée.", color: "rgba(182, 2, 5, 0.18)", textColor: "rgb(254, 155, 156)", borderColor: "rgba(254, 155, 156, 0.3)", hexColor: "#b60205" },
    { key: "variante", label: "variante", description: "Solution alternative proposée.", color: "rgba(29, 118, 219, 0.18)", textColor: "rgb(107, 167, 236)", borderColor: "rgba(107, 167, 236, 0.3)", hexColor: "#1d76db" },
    { key: "modification", label: "modification", description: "Évolution demandée sur l'existant.", color: "rgba(0, 82, 204, 0.18)", textColor: "rgb(108, 167, 255)", borderColor: "rgba(108, 167, 255, 0.3)", hexColor: "#0052cc" },
    { key: "optimisation", label: "optimisation", description: "Amélioration possible identifiée.", color: "rgba(14, 138, 22, 0.18)", textColor: "rgb(23, 230, 37)", borderColor: "rgba(23, 230, 37, 0.3)", hexColor: "#0e8a16" },
    { key: "correction", label: "correction", description: "Action corrective à mettre en œuvre.", color: "rgba(194, 224, 198, 0.18)", textColor: "rgb(194, 224, 198)", borderColor: "rgba(194, 224, 198, 0.3)", hexColor: "#bfdadc" },
    { key: "action moa", label: "action MOA", description: "Action attendue de la maîtrise d'ouvrage.", color: "rgba(191, 212, 242, 0.18)", textColor: "rgb(192, 213, 242)", borderColor: "rgba(192, 213, 242, 0.3)", hexColor: "#c5def5" },
    { key: "action moe", label: "action MOE", description: "Action attendue de la maîtrise d'œuvre.", color: "rgba(191, 212, 242, 0.18)", textColor: "rgb(192, 213, 242)", borderColor: "rgba(192, 213, 242, 0.3)", hexColor: "#c5def5" },
    { key: "action entreprise", label: "action Entreprise", description: "Action attendue de l'entreprise travaux.", color: "rgba(191, 212, 242, 0.18)", textColor: "rgb(192, 213, 242)", borderColor: "rgba(192, 213, 242, 0.3)", hexColor: "#c5def5" },
    { key: "action bet", label: "action BET", description: "Action attendue du bureau d'études.", color: "rgba(191, 212, 242, 0.18)", textColor: "rgb(192, 213, 242)", borderColor: "rgba(192, 213, 242, 0.3)", hexColor: "#c5def5" },
    { key: "coordination", label: "coordination", description: "Coordination nécessaire entre acteurs.", color: "rgba(83, 25, 231, 0.18)", textColor: "rgb(219, 207, 250)", borderColor: "rgba(219, 207, 250, 0.3)", hexColor: "#5319e7" },
    { key: "doublon", label: "doublon", description: "Sujet déjà couvert ailleurs.", color: "rgba(0, 0, 0, 0)", textColor: "rgb(208, 212, 216)", borderColor: "rgba(208, 212, 216, 0.3)", hexColor: "#6e7781" },
    { key: "hors périmètre", label: "hors périmètre", description: "En dehors du périmètre de traitement.", color: "rgba(0, 0, 0, 0)", textColor: "rgb(208, 212, 216)", borderColor: "rgba(208, 212, 216, 0.3)", hexColor: "#6e7781" },
    { key: "sans suite", label: "sans suite", description: "Point clos sans action complémentaire.", color: "rgba(0, 0, 0, 0)", textColor: "rgb(208, 212, 216)", borderColor: "rgba(208, 212, 216, 0.3)", hexColor: "#6e7781" }
  ];

  const LABEL_SWATCHES = [
    "#b60205", "#d93f0b", "#fbca04", "#0e8a16", "#006b75", "#1d76db", "#0052cc", "#5319e7",
    "#e99695", "#f9d0c4", "#fef2c0", "#c2e0c6", "#bfdadc", "#c5def5", "#bfd4f2", "#d4c5f9"
  ];

  function getLabelsUiState() {
    const view = store.projectSubjectsView || (store.projectSubjectsView = {});
    if (typeof view.labelsSearch !== "string") view.labelsSearch = "";
    if (typeof view.labelsSortBy !== "string") view.labelsSortBy = "name";
    if (typeof view.labelsSortDirection !== "string") view.labelsSortDirection = "asc";
    if (typeof view.labelsSortMenuOpen !== "boolean") view.labelsSortMenuOpen = false;
    if (typeof view.labelsRowMenuOpen !== "string") view.labelsRowMenuOpen = "";
    if (!view.labelEditModal || typeof view.labelEditModal !== "object") {
      view.labelEditModal = {
        isOpen: false,
        mode: "edit",
        targetKey: "",
        name: "",
        description: "",
        color: "#8b949e",
        colorPickerOpen: false
      };
    }
    return view;
  }

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

  function getFilteredSortedLabels() {
    const state = getLabelsUiState();
    const counts = getSubjectsLabelUsageCounts();
    const query = String(state.labelsSearch || "").trim().toLowerCase();
    const sortBy = String(state.labelsSortBy || "name") === "issue_count" ? "issue_count" : "name";
    const direction = String(state.labelsSortDirection || "asc") === "desc" ? "desc" : "asc";
    const factor = direction === "desc" ? -1 : 1;

    return getSubjectLabelDefinitions()
      .filter((labelDef) => {
        if (!query) return true;
        return [labelDef.label, labelDef.description, labelDef.key].some((value) => String(value || "").toLowerCase().includes(query));
      })
      .slice()
      .sort((left, right) => {
        let result = 0;
        if (sortBy === "issue_count") {
          result = (Number(counts.get(normalizeSubjectLabelKey(left.key)) || 0) - Number(counts.get(normalizeSubjectLabelKey(right.key)) || 0)) * factor;
        } else {
          result = left.label.localeCompare(right.label, "fr", { sensitivity: "base" }) * factor;
        }
        if (result !== 0) return result;
        return left.label.localeCompare(right.label, "fr", { sensitivity: "base" });
      });
  }

  function renderLabelsSortControlHtml() {
    const state = getLabelsUiState();
    const sortBy = String(state.labelsSortBy || "name") === "issue_count" ? "issue_count" : "name";
    const direction = String(state.labelsSortDirection || "asc") === "desc" ? "desc" : "asc";
    const isOpen = !!state.labelsSortMenuOpen;
    return `
      <div class="issues-head-menu labels-sort-menu ${isOpen ? "is-open" : ""}">
        <button
          type="button"
          class="gh-btn labels-sort-menu__trigger"
          data-labels-sort-toggle="true"
          aria-haspopup="true"
          aria-expanded="${isOpen ? "true" : "false"}"
        >
          <span class="labels-sort-menu__trigger-icon" aria-hidden="true">${svgIcon("sort-desc", { className: "octicon octicon-sort-desc" })}</span>
          <span>Trier</span>
          ${svgIcon("chevron-down", { className: "gh-chevron" })}
        </button>
        <div class="gh-menu issues-head-menu__dropdown labels-sort-menu__dropdown ${isOpen ? "gh-menu--open" : ""}" role="menu">
          <div class="gh-menu__title">Trier par</div>
          <button type="button" class="gh-menu__item ${sortBy === "name" ? "is-active" : ""}" data-labels-sort-by="name">
            <span class="labels-sort-menu__check">${sortBy === "name" ? svgIcon("check") : ""}</span>
            <span>Nom</span>
          </button>
          <button type="button" class="gh-menu__item ${sortBy === "issue_count" ? "is-active" : ""}" data-labels-sort-by="issue_count">
            <span class="labels-sort-menu__check">${sortBy === "issue_count" ? svgIcon("check") : ""}</span>
            <span>Nombre total de sujets</span>
          </button>
          <div class="gh-menu__separator"></div>
          <div class="gh-menu__title">Ordre</div>
          <button type="button" class="gh-menu__item ${direction === "asc" ? "is-active" : ""}" data-labels-sort-direction="asc">
            <span class="labels-sort-menu__check">${direction === "asc" ? svgIcon("check") : ""}</span>
            <span>${svgIcon("sort-asc", { className: "octicon octicon-sort-asc" })}</span>
            <span>Ascendant</span>
          </button>
          <button type="button" class="gh-menu__item ${direction === "desc" ? "is-active" : ""}" data-labels-sort-direction="desc">
            <span class="labels-sort-menu__check">${direction === "desc" ? svgIcon("check") : ""}</span>
            <span>${svgIcon("sort-desc", { className: "octicon octicon-sort-desc" })}</span>
            <span>Descendant</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderLabelRowMenu(labelDef) {
    const state = getLabelsUiState();
    const key = String(labelDef.key || "");
    const isOpen = String(state.labelsRowMenuOpen || "") === key;
    return `
      <div class="labels-row-menu ${isOpen ? "is-open" : ""}">
        <button
          type="button"
          class="labels-row-menu__trigger"
          data-label-row-menu-toggle="${escapeHtml(key)}"
          aria-haspopup="true"
          aria-expanded="${isOpen ? "true" : "false"}"
          aria-label="Actions du label ${escapeHtml(labelDef.label)}"
        >
          ${svgIcon("kebab-horizontal", { className: "octicon octicon-kebab-horizontal" })}
        </button>
        <div class="gh-menu labels-row-menu__dropdown ${isOpen ? "gh-menu--open" : ""}" role="menu">
          <button type="button" class="gh-menu__item" data-label-edit="${escapeHtml(key)}">Modifier</button>
        </div>
      </div>
    `;
  }

  function renderLabelsModalHtml() {
    const state = getLabelsUiState();
    const modal = state.labelEditModal || {};
    if (!modal.isOpen) return "";
    const isCreate = String(modal.mode || "edit") === "create";
    const color = String(modal.color || "#8b949e");
    const previewLabel = String(modal.name || "Nouveau label").trim() || "Nouveau label";

    return `
      <div class="labels-modal" id="labelsEditModal">
        <div class="labels-modal__backdrop" data-close-label-modal="true"></div>
        <div class="labels-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="labelsEditModalTitle">
          <div class="labels-modal__head">
            <div id="labelsEditModalTitle" class="labels-modal__title">${isCreate ? "Nouveau label" : "Modifier le label"}</div>
            <button type="button" class="labels-modal__close" data-close-label-modal="true" aria-label="Fermer">${svgIcon("x")}</button>
          </div>
          <div class="labels-modal__body">
            ${isCreate ? "" : `<div class="labels-modal__preview">${renderSubjectLabelBadge({ ...modal, label: previewLabel, color: `${color}22`, borderColor: `${color}66`, textColor: color })}</div>`}
            <label class="labels-modal__field">
              <span class="labels-modal__label">Nom</span>
              <input type="text" class="labels-modal__input" data-label-modal-input="name" value="${escapeHtml(modal.name || "")}" autocomplete="off">
            </label>
            <label class="labels-modal__field">
              <span class="labels-modal__label">Description</span>
              <textarea class="labels-modal__textarea" data-label-modal-input="description" rows="4">${escapeHtml(modal.description || "")}</textarea>
            </label>
            <div class="labels-modal__field">
              <span class="labels-modal__label">Couleur</span>
              <div class="labels-modal__color-row">
                <button type="button" class="labels-modal__color-reset" aria-label="Réinitialiser la couleur">${svgIcon("sync", { className: "octicon octicon-sync" })}</button>
                <div class="labels-modal__color-input-wrap ${modal.colorPickerOpen ? "is-open" : ""}">
                  <div class="labels-modal__color-trigger">
                    <span class="labels-modal__color-swatch" style="--label-color:${escapeHtml(color)};" aria-hidden="true"></span>
                    <input type="text" class="labels-modal__color-input" data-label-modal-input="color" value="${escapeHtml(color)}" autocomplete="off">
                  </div>
                  <div class="labels-modal__color-popover ${modal.colorPickerOpen ? "is-open" : ""}">
                    <div class="labels-modal__color-popover-title">Choisir parmi les couleurs par défaut</div>
                    <div class="labels-modal__swatches">
                      ${LABEL_SWATCHES.map((swatch) => `
                        <button type="button" class="labels-modal__swatch ${swatch.toLowerCase() === color.toLowerCase() ? "is-active" : ""}" data-label-color-value="${escapeHtml(swatch)}" style="--label-color:${escapeHtml(swatch)};" aria-label="Choisir la couleur ${escapeHtml(swatch)}"></button>
                      `).join("")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="labels-modal__footer">
              <button type="button" class="gh-btn" data-close-label-modal="true">Annuler</button>
              <button type="button" class="gh-btn gh-btn--primary">Enregistrer</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderLabelsTableHtml() {
    const state = getLabelsUiState();
    const labels = getFilteredSortedLabels();
    const counts = getSubjectsLabelUsageCounts();
    const totalLabels = getSubjectLabelDefinitions().length;
    const rowsHtml = labels.map((labelDef) => {
      const usageCount = Number(counts.get(normalizeSubjectLabelKey(labelDef.key)) || 0);
      return `
        <div class="labels-row">
          <div class="labels-row__name">${renderSubjectLabelBadge(labelDef)}</div>
          <div class="labels-row__description">${escapeHtml(labelDef.description)}</div>
          <div class="labels-row__count">${svgIcon("issue-opened", { className: "octicon octicon-issue-opened" })}<span class="labels-row__count-value">${usageCount}</span></div>
          <div class="labels-row__actions">${renderLabelRowMenu(labelDef)}</div>
        </div>
      `;
    }).join("");

    const tableHtml = renderIssuesTable({
      className: "labels-table",
      headHtml: `
        <div class="labels-table__head-count">${totalLabels} labels</div>
        <div class="labels-table__head-actions">${renderLabelsSortControlHtml()}</div>
      `,
      rowsHtml,
      headClassName: "labels-table__head",
      bodyClassName: "labels-table__body",
      gridTemplate: "minmax(180px, 320px) minmax(0, 1fr) 96px 52px",
      emptyTitle: "Aucun label",
      emptyDescription: state.labelsSearch ? "Aucun label ne correspond à cette recherche." : "Les labels apparaîtront ici."
    });

    return `
      <div class="labels-view-shell">
        <div class="labels-view-searchbar">
          <div class="labels-view-searchbar__field">
            <input type="search" id="labelsSearchInput" class="labels-view-searchbar__input" value="${escapeHtml(state.labelsSearch || "")}" placeholder="Rechercher tous les labels" autocomplete="off">
            <span class="labels-view-searchbar__icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
          </div>
        </div>
        ${tableHtml}
        ${renderLabelsModalHtml()}
      </div>
    `;
  }

  return {
    getSubjectLabelDefinitions,
    getSubjectLabelDefinition,
    getSubjectsLabelUsageCounts,
    renderSubjectLabelBadge,
    renderLabelsTableHtml,
    getLabelsUiState
  };
}
