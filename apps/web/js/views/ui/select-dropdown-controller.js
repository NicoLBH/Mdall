const selectDropdownLifecycleRegistry = new Map();
let selectDropdownFocusFrame = 0;
let selectDropdownPositionFrame = 0;

function getViewStateFromGetter(getViewState) {
  return typeof getViewState === "function" ? getViewState() : getViewState;
}

function isSelectDropdownOpenFromState(state) {
  return !!state?.subjectMetaDropdown?.field
    || (!!state?.subjectKanbanDropdown?.subjectId && !!state?.subjectKanbanDropdown?.situationId);
}

function hideSelectDropdownHost(host) {
  if (!host) return;
  host.innerHTML = "";
  host.setAttribute("aria-hidden", "true");
}

function bindSelectDropdownHostInteractions(host) {
  if (!host || host.dataset.selectDropdownHostBound === "true") return host;
  host.dataset.selectDropdownHostBound = "true";
  host.setAttribute("aria-hidden", "true");
  host.addEventListener("mousedown", (event) => {
    if (!event.target.closest(".select-menu__item")) return;
    event.preventDefault();
  });
  return host;
}


// Public factory used by feature modules to inject their own rendering and business actions
// while reusing the same dropdown UI lifecycle (host, focus, scroll, positioning, close/open).
export function createSelectDropdownController(config = {}) {
  const {
    getViewState,
    getScopeRoot,
    renderHost,
    ensureHost = ensureSelectDropdownHost,
    bindingKey = "select-dropdown",
    onRequestClose,
    onRerender,
    onSyncPosition
  } = config;

  return {
    ensureHost: (options) => ensureHost(options),
    getScopeRoot: () => (typeof getScopeRoot === "function" ? getScopeRoot() : getSubjectSelectDropdownScopeRoot(getViewState)),
    closeMeta: () => closeMetaSelectDropdown(getViewState),
    closeKanban: () => closeKanbanSelectDropdown(getViewState),
    openMeta: (options) => openMetaSelectDropdown(getViewState, options),
    openKanban: (options) => openKanbanSelectDropdown(getViewState, options),
    setMetaQuery: (query) => setMetaSelectDropdownQuery(getViewState, query),
    setKanbanQuery: (query) => setKanbanSelectDropdownQuery(getViewState, query),
    renderHost: (root) => {
      if (typeof renderHost === "function") return renderHost(root);
      return ensureHost();
    },
    focusSearch: (args = {}) => focusSelectDropdownSearch({ ensureHost, ...args }),
    syncPosition: (root) => {
      if (typeof onSyncPosition === "function") return onSyncPosition(root || (typeof getScopeRoot === "function" ? getScopeRoot() : undefined));
      return syncSelectDropdownPosition({
        getViewState,
        root: root || (typeof getScopeRoot === "function" ? getScopeRoot() : undefined),
        getScopeRoot,
        ensureHost
      });
    },
    captureScrollState: () => captureSelectDropdownScrollState({ host: ensureHost() }),
    restoreScrollState: (state) => restoreSelectDropdownScrollState(state, { host: ensureHost() }),
    captureContextScrollState: (root) => captureSelectDropdownContextScrollState(root, { host: ensureHost() }),
    restoreContextScrollState: (state) => restoreSelectDropdownContextScrollState(state, { host: ensureHost() }),
    bindDocumentEvents: (overrides = {}) => bindSelectDropdownDocumentEvents({
      bindingKey: overrides.bindingKey || bindingKey,
      getViewState,
      onRequestClose: overrides.onRequestClose || onRequestClose || (() => {
        closeMetaSelectDropdown(getViewState);
        closeKanbanSelectDropdown(getViewState);
      }),
      onRerender: overrides.onRerender || onRerender,
      onSyncPosition: overrides.onSyncPosition || ((scopeRoot) => {
        if (typeof onSyncPosition === "function") return onSyncPosition(scopeRoot);
        return syncSelectDropdownPosition({
          getViewState,
          root: scopeRoot,
          getScopeRoot,
          ensureHost
        });
      }),
      getScopeRoot: overrides.getScopeRoot || getScopeRoot,
      ensureHost
    })
  };
}

export function ensureSelectDropdownHost({
  hostId = "subjectMetaDropdownHost",
  hostClassName = "subject-meta-dropdown-host"
} = {}) {
  let host = document.getElementById(hostId);
  if (!host) {
    host = document.createElement("div");
    host.id = hostId;
    host.className = hostClassName;
    document.body.appendChild(host);
  }
  return bindSelectDropdownHostInteractions(host);
}

export function closeMetaSelectDropdown(getViewState) {
  const viewState = getViewStateFromGetter(getViewState);
  const dropdown = viewState?.subjectMetaDropdown;
  if (!dropdown) return;
  dropdown.field = null;
  dropdown.query = "";
  dropdown.activeKey = "";
  dropdown.relationsView = "menu";
  dropdown.subissueActionsView = "menu";
  dropdown.subissueActionSubjectId = "";
  dropdown.subissueActionScopeHost = "main";
  dropdown.subissueActionIntent = "";
}

export function closeKanbanSelectDropdown(getViewState) {
  const viewState = getViewStateFromGetter(getViewState);
  const dropdown = viewState?.subjectKanbanDropdown;
  if (!dropdown) return;
  dropdown.subjectId = "";
  dropdown.situationId = "";
  dropdown.query = "";
  dropdown.activeKey = "";
}

export function openMetaSelectDropdown(getViewState, { field = "", activeKey = "", query = "", showClosedSituations = false } = {}) {
  const viewState = getViewStateFromGetter(getViewState);
  const dropdown = viewState?.subjectMetaDropdown;
  if (!dropdown) return;
  dropdown.field = String(field || "") || null;
  dropdown.query = String(query || "");
  dropdown.activeKey = String(activeKey || "");
  dropdown.showClosedSituations = !!showClosedSituations;
  dropdown.relationsView = field === "relations" ? "menu" : "";
}

export function openKanbanSelectDropdown(getViewState, { subjectId = "", situationId = "", activeKey = "", query = "" } = {}) {
  const viewState = getViewStateFromGetter(getViewState);
  const dropdown = viewState?.subjectKanbanDropdown;
  if (!dropdown) return;
  dropdown.subjectId = String(subjectId || "");
  dropdown.situationId = String(situationId || "");
  dropdown.query = String(query || "");
  dropdown.activeKey = String(activeKey || "");
}

export function setMetaSelectDropdownQuery(getViewState, query = "") {
  const viewState = getViewStateFromGetter(getViewState);
  if (!viewState?.subjectMetaDropdown) return;
  viewState.subjectMetaDropdown.query = String(query || "");
}

export function setKanbanSelectDropdownQuery(getViewState, query = "") {
  const viewState = getViewStateFromGetter(getViewState);
  if (!viewState?.subjectKanbanDropdown) return;
  viewState.subjectKanbanDropdown.query = String(query || "");
}

export function getSubjectSelectDropdownScopeRoot(getViewState) {
  const viewState = getViewStateFromGetter(getViewState) || {};
  const createSubjectFormRoot = document.querySelector("[data-create-subject-form]");
  if (viewState.createSubjectForm?.isOpen && createSubjectFormRoot) return createSubjectFormRoot;

  const drilldownBody = document.getElementById("drilldownBody");
  if (viewState.drilldown?.isOpen && drilldownBody) return drilldownBody;

  const detailsBody = document.getElementById("detailsBodyModal");
  if (viewState.detailsModalOpen && detailsBody) return detailsBody;

  return document;
}

export function renderSelectDropdownHost({
  getViewState,
  root,
  getScopedSelection,
  renderMetaDropdown,
  renderKanbanDropdown,
  ensureHost = ensureSelectDropdownHost
}) {
  const host = ensureHost();
  const viewState = getViewStateFromGetter(getViewState) || {};
  const field = String(viewState.subjectMetaDropdown?.field || "");
  const kanbanDropdown = viewState.subjectKanbanDropdown || {};
  const selection = getScopedSelection?.(root);
  if (selection?.type !== "sujet") {
    hideSelectDropdownHost(host);
    return host;
  }
  if (field) {
    host.innerHTML = renderMetaDropdown(selection.item, field);
    host.setAttribute("aria-hidden", "false");
    return host;
  }
  if (String(kanbanDropdown.subjectId || "") === String(selection.item.id || "") && String(kanbanDropdown.situationId || "")) {
    host.innerHTML = renderKanbanDropdown(selection.item.id, String(kanbanDropdown.situationId || ""));
    host.setAttribute("aria-hidden", "false");
    return host;
  }
  hideSelectDropdownHost(host);
  return host;
}

function focusInputWithoutScrolling(input) {
  if (!input) return;
  if (typeof input.focus === "function") {
    try {
      input.focus({ preventScroll: true });
    } catch (_) {
      input.focus();
    }
  }
  input.select?.();
}

export function focusSelectDropdownSearch({ field = "", subjectId = "", situationId = "", ensureHost = ensureSelectDropdownHost } = {}) {
  if (selectDropdownFocusFrame) cancelAnimationFrame(selectDropdownFocusFrame);
  selectDropdownFocusFrame = requestAnimationFrame(() => {
    selectDropdownFocusFrame = 0;
    const host = ensureHost();
    if (host.getAttribute("aria-hidden") === "true") return;
    let input = null;
    if (field) {
      input = host.querySelector(`[data-subject-meta-search="${field}"]`);
    } else if (subjectId || situationId) {
      input = host.querySelector(
        `[data-subject-kanban-search="${CSS.escape(String(subjectId || ""))}"][data-subject-kanban-search-situation-id="${CSS.escape(String(situationId || ""))}"]`
      );
    }
    focusInputWithoutScrolling(input);
  });
}

export function syncSelectDropdownPosition({
  getViewState,
  root,
  getScopeRoot = () => getSubjectSelectDropdownScopeRoot(getViewState),
  ensureHost = ensureSelectDropdownHost,
  candidateRoots = []
}) {
  const viewState = getViewStateFromGetter(getViewState) || {};
  const field = String(viewState.subjectMetaDropdown?.field || "");
  const kanbanDropdown = viewState.subjectKanbanDropdown || {};
  const host = ensureHost();
  let anchorSelector = "";
  if (field) {
    anchorSelector = `[data-subject-meta-anchor="${field}"]`;
  } else if (String(kanbanDropdown.subjectId || "") && String(kanbanDropdown.situationId || "")) {
    anchorSelector = `[data-subject-kanban-anchor="${CSS.escape(String(kanbanDropdown.subjectId || ""))}::${CSS.escape(String(kanbanDropdown.situationId || ""))}"]`;
  } else {
    hideSelectDropdownHost(host);
    return;
  }

  if (selectDropdownPositionFrame) cancelAnimationFrame(selectDropdownPositionFrame);
  selectDropdownPositionFrame = requestAnimationFrame(() => {
    const scopeRoot = root || getScopeRoot();
    const dropdown = host.querySelector(".subject-meta-dropdown");
    const roots = [
      scopeRoot,
      root,
      ...candidateRoots,
      document.getElementById("detailsBodyModal"),
      document.getElementById("drilldownBody"),
      document.querySelector("[data-create-subject-form]"),
      document.getElementById("situationsDetailsHost")
    ].filter(Boolean);
    const anchor = roots
      .map((candidateRoot) => candidateRoot?.querySelector?.(anchorSelector))
      .find(Boolean);
    if (!anchor || !dropdown) {
      selectDropdownPositionFrame = 0;
      hideSelectDropdownHost(host);
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const dropdownWidth = 320;
    const gutter = 12;
    const spacing = 8;
    const left = Math.max(gutter, Math.min(rect.right - dropdownWidth, viewportWidth - dropdownWidth - gutter));
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - gutter);
    const spaceAbove = Math.max(0, rect.top - gutter);
    const preferredHeight = Math.min(420, Math.max(240, Math.max(spaceBelow, spaceAbove)));
    const maxHeight = Math.max(180, preferredHeight);

    dropdown.style.width = `${dropdownWidth}px`;
    dropdown.style.maxHeight = `${maxHeight}px`;

    const measuredHeight = Math.min(dropdown.offsetHeight || maxHeight, maxHeight);
    const shouldOpenAbove = spaceBelow < Math.min(240, measuredHeight) && spaceAbove > spaceBelow;
    const top = shouldOpenAbove
      ? Math.max(gutter, rect.top - measuredHeight - spacing)
      : Math.max(gutter, rect.bottom - 4);

    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${top}px`;
    host.setAttribute("aria-hidden", "false");
    selectDropdownPositionFrame = 0;
  });
}

function isDocumentScrollTarget(element) {
  return element === document || element === document.documentElement || element === document.body || element === document.scrollingElement;
}

function getScrollableElementScrollState(element) {
  if (!element) return null;
  if (isDocumentScrollTarget(element)) {
    return {
      scrollTop: Number(window.scrollY || window.pageYOffset || document.documentElement?.scrollTop || document.body?.scrollTop || 0)
    };
  }
  return {
    scrollTop: Number(element.scrollTop || 0)
  };
}

function restoreScrollableElementScrollState(element, state) {
  if (!element || !state) return;
  if (isDocumentScrollTarget(element)) {
    window.scrollTo({ top: Math.max(0, Number(state.scrollTop || 0)), behavior: "auto" });
    return;
  }
  const maxScrollTop = Math.max(0, Number(element.scrollHeight || 0) - Number(element.clientHeight || 0));
  element.scrollTop = Math.max(0, Math.min(Number(state.scrollTop || 0), maxScrollTop));
}

export function captureSelectDropdownScrollState({ host = ensureSelectDropdownHost() } = {}) {
  if (!host) return null;
  const body = host.querySelector(".subject-meta-dropdown__body");
  const sectionBodies = [...host.querySelectorAll(".select-menu__section-body")].map((element) => getScrollableElementScrollState(element));
  return {
    bodyState: getScrollableElementScrollState(body),
    sectionBodies
  };
}

export function restoreSelectDropdownScrollState(state, { host = ensureSelectDropdownHost() } = {}) {
  if (!state || !host) return;
  const apply = () => {
    restoreScrollableElementScrollState(host.querySelector(".subject-meta-dropdown__body"), state.bodyState);
    host.querySelectorAll(".select-menu__section-body").forEach((element, index) => {
      restoreScrollableElementScrollState(element, state.sectionBodies?.[index] || null);
    });
  };
  apply();
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
}

export function captureSelectDropdownContextScrollState(root, { host = ensureSelectDropdownHost() } = {}) {
  return {
    root,
    rootState: getScrollableElementScrollState(root),
    detailsBodyState: getScrollableElementScrollState(document.getElementById("detailsBodyModal")),
    drilldownBodyState: getScrollableElementScrollState(document.getElementById("drilldownBody")),
    situationsDetailsState: getScrollableElementScrollState(document.getElementById("situationsDetailsHost")),
    dropdownState: captureSelectDropdownScrollState({ host })
  };
}

export function restoreSelectDropdownContextScrollState(state, { host = ensureSelectDropdownHost() } = {}) {
  if (!state) return;
  const apply = () => {
    restoreScrollableElementScrollState(state.root, state.rootState);
    restoreScrollableElementScrollState(document.getElementById("detailsBodyModal"), state.detailsBodyState);
    restoreScrollableElementScrollState(document.getElementById("drilldownBody"), state.drilldownBodyState);
    restoreScrollableElementScrollState(document.getElementById("situationsDetailsHost"), state.situationsDetailsState);
    restoreSelectDropdownScrollState(state.dropdownState, { host });
  };
  apply();
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
}

export function bindSelectDropdownDocumentEvents({
  bindingKey = "subject-meta-dropdown",
  getViewState,
  onRequestClose,
  onRerender,
  onSyncPosition,
  getScopeRoot,
  ensureHost = ensureSelectDropdownHost
}) {
  const existingBinding = selectDropdownLifecycleRegistry.get(bindingKey);
  if (existingBinding) return existingBinding.detach;

  const isOpen = () => isSelectDropdownOpenFromState(getViewStateFromGetter(getViewState) || {});
  const syncPosition = () => {
    if (!isOpen()) return;
    onSyncPosition?.(getScopeRoot?.());
  };

  const handleDocumentClick = (event) => {
    if (!isOpen()) return;
    if (event.target.closest("#subjectMetaDropdownHost .subject-meta-dropdown")) return;
    if (event.target.closest("[data-subject-meta-trigger]")) return;
    if (event.target.closest("[data-subject-kanban-trigger]")) return;
    onRequestClose?.();
    onRerender?.(getScopeRoot?.() || event.target);
  };

  const handleWindowResize = () => {
    if (!isOpen()) return;
    ensureHost();
    syncPosition();
  };

  const handleDocumentScroll = () => {
    if (!isOpen()) return;
    syncPosition();
  };

  document.addEventListener("click", handleDocumentClick);
  window.addEventListener("resize", handleWindowResize);
  document.addEventListener("scroll", handleDocumentScroll, true);

  const detach = () => {
    document.removeEventListener("click", handleDocumentClick);
    window.removeEventListener("resize", handleWindowResize);
    document.removeEventListener("scroll", handleDocumentScroll, true);
    selectDropdownLifecycleRegistry.delete(bindingKey);
  };

  selectDropdownLifecycleRegistry.set(bindingKey, {
    detach,
    syncPosition
  });

  return detach;
}
