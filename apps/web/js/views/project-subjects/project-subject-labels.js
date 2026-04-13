export function createProjectSubjectLabelsController(config) {
  const {
    store,
    escapeHtml,
    svgIcon,
    renderIssuesTable,
    normalizeSubjectLabelKey,
    getSubjectSidebarMeta,
    createLabel,
    updateLabel,
    deleteLabel,
    reloadSubjectsFromSupabase,
    getSubjectsCurrentRoot
  } = config;

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
      view.labelEditModal = createClosedLabelEditModal();
    }
    return view;
  }

  function getRawLabelsResult() {
    return store.projectSubjectsView?.rawSubjectsResult && typeof store.projectSubjectsView.rawSubjectsResult === "object"
      ? store.projectSubjectsView.rawSubjectsResult
      : (store.projectSubjectsView?.rawResult && typeof store.projectSubjectsView.rawResult === "object"
        ? store.projectSubjectsView.rawResult
        : {});
  }

  function normalizeLabelDef(labelDef = {}) {
    const id = String(labelDef.id || "").trim();
    const key = String(labelDef.label_key || labelDef.labelKey || labelDef.key || labelDef.name || id).trim();
    const label = String(labelDef.name || labelDef.label || key || "Label").trim() || "Label";
    const hexColor = String(labelDef.hex_color || labelDef.hexColor || labelDef.text_color || labelDef.textColor || "#8b949e").trim() || "#8b949e";
    const textColor = String(labelDef.text_color || labelDef.textColor || hexColor).trim() || hexColor;
    const backgroundColor = String(labelDef.background_color || labelDef.backgroundColor || labelDef.color || `${hexColor}22`).trim() || `${hexColor}22`;
    const borderColor = String(labelDef.border_color || labelDef.borderColor || `${hexColor}66`).trim() || `${hexColor}66`;
    const description = String(labelDef.description || "").trim();
    return {
      ...labelDef,
      id,
      key,
      label_key: key,
      labelKey: key,
      label,
      name: label,
      description,
      color: backgroundColor,
      background_color: backgroundColor,
      backgroundColor,
      text_color: textColor,
      textColor,
      border_color: borderColor,
      borderColor,
      hex_color: hexColor,
      hexColor,
      sort_order: Number.isFinite(Number(labelDef.sort_order)) ? Number(labelDef.sort_order) : 0,
      sortOrder: Number.isFinite(Number(labelDef.sort_order)) ? Number(labelDef.sort_order) : 0
    };
  }

  function getSubjectLabelDefinitions() {
    const raw = getRawLabelsResult();
    const labels = Array.isArray(raw.labels) ? raw.labels : [];
    return labels.map((labelDef) => normalizeLabelDef(labelDef));
  }

  function getSubjectLabelDefinition(value) {
    const rawValue = String(value || "").trim();
    const normalizedKey = normalizeSubjectLabelKey(rawValue);
    return getSubjectLabelDefinitions().find((labelDef) => {
      return rawValue === String(labelDef.id || "")
        || normalizedKey === normalizeSubjectLabelKey(labelDef.id)
        || normalizedKey === normalizeSubjectLabelKey(labelDef.key)
        || normalizedKey === normalizeSubjectLabelKey(labelDef.label)
        || normalizedKey === normalizeSubjectLabelKey(labelDef.label_key);
    }) || null;
  }

  function getSubjectsLabelUsageCounts() {
    const raw = getRawLabelsResult();
    const subjectIdsByLabelId = raw.subjectIdsByLabelId && typeof raw.subjectIdsByLabelId === "object"
      ? raw.subjectIdsByLabelId
      : {};
    const counts = new Map();
    getSubjectLabelDefinitions().forEach((labelDef) => {
      const count = Array.isArray(subjectIdsByLabelId[labelDef.id]) ? subjectIdsByLabelId[labelDef.id].length : 0;
      counts.set(String(labelDef.id || labelDef.key), count);
      counts.set(normalizeSubjectLabelKey(labelDef.key), count);
    });
    return counts;
  }

  function renderSubjectLabelBadge(labelDef) {
    const normalized = normalizeLabelDef(labelDef);
    return `<span class="subject-label-badge" style="--subject-label-bg:${escapeHtml(normalized.color)};--subject-label-fg:${escapeHtml(normalized.textColor || '#ffffff')};--subject-label-border:${escapeHtml(normalized.borderColor || normalized.color)};">${escapeHtml(normalized.label)}</span>`;
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
          result = (Number(counts.get(String(left.id || left.key)) || 0) - Number(counts.get(String(right.id || right.key)) || 0)) * factor;
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
    const key = String(labelDef.id || labelDef.key || "");
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
          <button type="button" class="gh-menu__item" data-label-delete="${escapeHtml(key)}">Supprimer</button>
        </div>
      </div>
    `;
  }

  function createClosedLabelEditModal() {
    return {
      isOpen: false,
      mode: "edit",
      targetId: "",
      targetKey: "",
      name: "",
      description: "",
      color: "#8b949e",
      colorPickerOpen: false,
      isSaving: false,
      isDeleting: false
    };
  }

  function resetLabelEditModal() {
    const state = getLabelsUiState();
    state.labelEditModal = createClosedLabelEditModal();
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
            <div class="labels-modal__preview">${renderSubjectLabelBadge({ label: previewLabel, color: `${color}22`, borderColor: `${color}66`, textColor: color })}</div>
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
                <button type="button" class="labels-modal__color-reset" data-label-color-reset="true" aria-label="Réinitialiser la couleur">${svgIcon("sync", { className: "octicon octicon-sync" })}</button>
                <div class="labels-modal__color-input-wrap ${modal.colorPickerOpen ? "is-open" : ""}">
                  <div class="labels-modal__color-trigger">
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
              ${isCreate ? "" : `<button type="button" class="gh-btn" data-label-modal-delete="true" ${modal.isDeleting ? "disabled" : ""}>Supprimer</button>`}
              <button type="button" class="gh-btn gh-btn--primary" data-label-modal-save="true" ${(modal.isSaving || modal.isDeleting) ? "disabled" : ""}>${modal.isSaving ? "Enregistrement..." : "Enregistrer"}</button>
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
      const usageCount = Number(counts.get(String(labelDef.id || labelDef.key)) || 0);
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

  async function saveLabelFromModal() {
    const state = getLabelsUiState();
    const modal = state.labelEditModal || {};
    const name = String(modal.name || "").trim();
    if (!name) throw new Error("Le nom du label est requis.");

    modal.isSaving = true;
    state.labelEditModal = modal;

    const payload = {
      name,
      description: String(modal.description || "").trim(),
      color: String(modal.color || "#8b949e").trim() || "#8b949e"
    };

    try {
      if (String(modal.mode || "edit") === "create") await createLabel?.(store.currentProjectId, payload);
      else await updateLabel?.(modal.targetId, payload);
      resetLabelEditModal();
      state.labelsRowMenuOpen = "";
      await reloadSubjectsFromSupabase?.(getSubjectsCurrentRoot?.(), { rerender: true, updateModal: true });
      return true;
    } catch (error) {
      modal.isSaving = false;
      throw error;
    }
  }

  async function deleteLabelFromModal(labelId) {
    const state = getLabelsUiState();
    const modal = state.labelEditModal || {};
    const resolvedId = String(labelId || modal.targetId || "").trim();
    if (!resolvedId) throw new Error("labelId is required");

    modal.isDeleting = true;
    state.labelEditModal = modal;

    try {
      await deleteLabel?.(resolvedId);
      resetLabelEditModal();
      state.labelsRowMenuOpen = "";
      await reloadSubjectsFromSupabase?.(getSubjectsCurrentRoot?.(), { rerender: true, updateModal: true });
      return true;
    } catch (error) {
      modal.isDeleting = false;
      throw error;
    }
  }

  return {
    getSubjectLabelDefinitions,
    getSubjectLabelDefinition,
    getSubjectsLabelUsageCounts,
    renderSubjectLabelBadge,
    renderLabelsTableHtml,
    getLabelsUiState,
    saveLabelFromModal,
    deleteLabelFromModal
  };
}
