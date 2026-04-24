export function normalizeNormalDetailsCompactSnapshot(snapshot) {
  const compact = !!snapshot?.compact;
  const hasExpanded = typeof snapshot?.expanded === "boolean";
  return {
    compact,
    expanded: hasExpanded ? snapshot.expanded : !compact
  };
}

export function computeDrilldownTopOffset(snapshot, normalDetailsHeadBottom = 0) {
  const normalizedSnapshot = normalizeNormalDetailsCompactSnapshot(snapshot);
  if (!normalizedSnapshot.compact) return 0;
  const safeHeadBottom = Number(normalDetailsHeadBottom || 0);
  if (!Number.isFinite(safeHeadBottom)) return 0;
  return Math.max(0, Math.round(safeHeadBottom));
}

function getScrollableElementScrollState(element) {
  if (!element) return null;
  return {
    scrollTop: Number(element.scrollTop || 0)
  };
}

function restoreScrollableElementScrollState(element, state) {
  if (!element || !state) return;
  const maxScrollTop = Math.max(0, Number(element.scrollHeight || 0) - Number(element.clientHeight || 0));
  element.scrollTop = Math.max(0, Math.min(Number(state.scrollTop || 0), maxScrollTop));
}

function bumpInteractiveEpoch(root) {
  if (!root) return root;
  const currentEpoch = Number(root.dataset.detailsInteractiveEpoch || 0);
  root.dataset.detailsInteractiveEpoch = String(currentEpoch + 1);
  return root;
}

export function createProjectSubjectDrilldownController(config) {
  const {
    store,
    setOverlayChromeOpenState,
    closeGlobalNav,
    renderOverlayChrome,
    renderOverlayChromeHead,
    bindOverlayChromeDismiss,
    getDrilldownSelection,
    promoteActionHtml = "",
    openDrilldownFromSituationSelection,
    openDrilldownFromSubjectSelection,
    openDrilldownFromSujetSelection,
    selectSituationSelection,
    selectSubjectSelection,
    selectSujetSelection,
    renderDetailsHtml,
    renderDetailsTitleWrapHtml,
    wireDetailsInteractive,
    bindDetailsScroll,
    ensureViewUiState,
    ensureTimelineLoadedForSelection
  } = config;

  let lockedWindowScrollY = 0;

  function readNormalDetailsHeadBottom() {
    const normalDetailsHead = document.getElementById("situationsDetailsTitle");
    if (!normalDetailsHead) return 0;
    const rect = normalDetailsHead.getBoundingClientRect?.();
    return Number(rect?.bottom || 0);
  }

  function applyDrilldownViewportOffset(snapshot) {
    const panel = document.getElementById("drilldownPanel");
    if (!panel) return;
    const topOffset = computeDrilldownTopOffset(snapshot, readNormalDetailsHeadBottom());
    panel.style.setProperty("--subject-drilldown-top-offset", `${topOffset}px`);
    panel.classList.toggle("drilldown--offset-from-normal-compact", topOffset > 0);
  }

  function getNormalDetailsCompactSnapshot() {
    const normalDetailsChrome = document.getElementById("situationsDetailsChrome");
    const normalDetailsHead = document.getElementById("situationsDetailsTitle");
    if (!normalDetailsChrome || !normalDetailsHead) return null;
    return {
      compact: normalDetailsChrome.classList.contains("overlay-chrome--compact")
        || normalDetailsHead.classList.contains("details-head--compact")
        || document.body.classList.contains("project-subject-details-top-compact"),
      expanded: normalDetailsHead.classList.contains("details-head--expanded")
    };
  }

  function applyNormalDetailsCompactSnapshot(snapshot) {
    if (!snapshot) return;
    const normalDetailsChrome = document.getElementById("situationsDetailsChrome");
    const normalDetailsHead = document.getElementById("situationsDetailsTitle");
    if (!normalDetailsChrome || !normalDetailsHead) return;
    const normalizedSnapshot = normalizeNormalDetailsCompactSnapshot(snapshot);
    normalDetailsChrome.classList.toggle("overlay-chrome--compact", normalizedSnapshot.compact);
    normalDetailsHead.classList.toggle("details-head--compact", normalizedSnapshot.compact);
    normalDetailsHead.classList.toggle("details-head--expanded", normalizedSnapshot.expanded);
    document.body.classList.toggle("project-subject-details-top-compact", normalizedSnapshot.compact);
  }

  function ensureDrilldownDom() {
    if (document.getElementById("drilldownPanel")) return;

    const panel = document.createElement("div");
    panel.id = "drilldownPanel";
    panel.className = "drilldown overlay-host overlay-host--side hidden";
    panel.setAttribute("aria-hidden", "true");

    panel.innerHTML = renderOverlayChrome({
      shellClassName: "drilldown__inner gh-panel gh-panel--details subject-details-shell",
      variant: "drilldown",
      ariaLabel: "Détails",
      headHtml: renderOverlayChromeHead({
        titleId: "drilldownTitle",
        closeId: "drilldownClose",
        closeLabel: "Fermer",
        headClassName: "drilldown__head",
        actionsHtml: promoteActionHtml
      }),
      bodyId: "drilldownBody",
      bodyClassName: "drilldown__body details-body subject-details-body"
    });

    document.body.appendChild(panel);

    bindDrilldownScrollProxy(panel, panel.querySelector(".drilldown__inner"));
    bindOverlayChromeDismiss(panel, {
      onClose: closeDrilldown
    });

    const promoteButton = panel.querySelector(".js-drilldown-promote-selection");
    if (promoteButton && panel.dataset.drilldownPromoteBound !== "1") {
      panel.dataset.drilldownPromoteBound = "1";
      promoteButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        promoteDrilldownSelectionToPrimary();
      });
    }

    window.addEventListener("resize", () => {
      if (!store.situationsView?.drilldown?.isOpen) return;
      const viewState = ensureViewUiState();
      applyDrilldownViewportOffset(viewState.drilldown?.normalDetailsCompactSnapshot);
    });
  }

  function updateDrilldownPanel() {
    const viewState = ensureViewUiState();
    ensureDrilldownDom();

    const panel = document.getElementById("drilldownPanel");
    const title = document.getElementById("drilldownTitle");
    const body = document.getElementById("drilldownBody");
    const shell = panel.querySelector(".drilldown__inner");
    if (!panel || !title || !body || !shell) return;

    const shellScrollState = getScrollableElementScrollState(shell);
    const drilldownState = store.projectSubjectsView?.drilldown
      || store.situationsView?.drilldown
      || {};
    const expandedSubjectIds = drilldownState.expandedSubjectIds
      || store.situationsView?.drilldown?.expandedSujets
      || new Set();
    const expandedSubissueSubjectIds = drilldownState.rightSubissuesExpandedSubjectIds || new Set();
    const subissuesOpen = drilldownState.rightSubissuesOpen !== false;
    const openSubissueMenuId = String(drilldownState.rightSubissueMenuOpenId || "");

    const selection = getDrilldownSelection();
    const details = renderDetailsHtml(selection, {
      discussionScopeHost: "drilldown",
      subissuesOptions: {
        sujetRowClass: "js-drilldown-select-sujet",
        sujetToggleClass: "js-drilldown-toggle-sujet",
        expandedSujets: expandedSubjectIds,
        expandedSubjectIds: expandedSubissueSubjectIds,
        openMenuId: openSubissueMenuId,
        isOpen: subissuesOpen
      }
    });

    title.innerHTML = selection ? renderDetailsTitleWrapHtml(selection) : "—";
    body.innerHTML = details.bodyHtml;

    title.querySelectorAll(".js-details-parent-subject-link[data-parent-subject-id]").forEach((link) => {
      link.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const parentSubjectId = String(link.dataset.parentSubjectId || "");
        if (!parentSubjectId) return;
        openDrilldownFromSubject(parentSubjectId);
      };
    });

    wireDetailsInteractive(bumpInteractiveEpoch(body));
    ensureTimelineLoadedForSelection?.(selection, { scopeHost: "drilldown" });
    bindDetailsScroll(panel);
    applyNormalDetailsCompactSnapshot(viewState.drilldown?.normalDetailsCompactSnapshot);
    applyDrilldownViewportOffset(viewState.drilldown?.normalDetailsCompactSnapshot);
    restoreScrollableElementScrollState(shell, shellScrollState);
    shell.__syncCondensedTitle?.();
    requestAnimationFrame(() => {
      const currentShell = document.querySelector("#drilldownPanel .drilldown__inner");
      restoreScrollableElementScrollState(currentShell, shellScrollState);
      applyNormalDetailsCompactSnapshot(viewState.drilldown?.normalDetailsCompactSnapshot);
      applyDrilldownViewportOffset(viewState.drilldown?.normalDetailsCompactSnapshot);
      currentShell?.__syncCondensedTitle?.();
    });
  }

  function applyDrilldownVariant(variant = "") {
    const panel = document.getElementById("drilldownPanel");
    if (!panel) return;
    const isSituationKanban = String(variant || "").trim() === "situation-kanban";
    panel.classList.toggle("drilldown--situation-kanban", isSituationKanban);
    if (isSituationKanban) {
      panel.querySelector(".overlay-chrome__head.drilldown__head")?.remove();
      return;
    }
    if (panel.querySelector("#drilldownTitle")) return;
    const headMarkup = renderOverlayChromeHead({
      titleId: "drilldownTitle",
      closeId: "drilldownClose",
      closeLabel: "Fermer",
      headClassName: "drilldown__head",
      actionsHtml: promoteActionHtml
    });
    const body = panel.querySelector("#drilldownBody");
    if (body) {
      body.insertAdjacentHTML("beforebegin", headMarkup);
    }
  }
  function syncWindowScrollLock(open) {
    if (open) {
      lockedWindowScrollY = Number(window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0);
      document.body.style.top = `${-lockedWindowScrollY}px`;
      document.body.classList.add("drilldown-open");
      return;
    }

    document.body.classList.remove("drilldown-open");
    document.body.style.top = "";
    window.scrollTo({ top: lockedWindowScrollY, behavior: "auto" });
  }

  function bindDrilldownScrollProxy(panel, shell) {
    if (!panel || !shell || panel.dataset.drilldownScrollProxyBound === "1") return;

    const forwardWheelToShell = (event) => {
      if (!store.situationsView?.drilldown?.isOpen) return;
      if (!shell) return;
      const deltaY = Number(event.deltaY || 0);
      const deltaX = Number(event.deltaX || 0);
      if (!deltaY && !deltaX) return;
      shell.scrollTop += deltaY;
      shell.scrollLeft += deltaX;
      event.preventDefault();
    };

    panel.addEventListener("wheel", forwardWheelToShell, { passive: false });
    panel.dataset.drilldownScrollProxyBound = "1";
  }


  function openDrilldown(options = {}) {
    const viewState = ensureViewUiState();
    ensureDrilldownDom();
    closeGlobalNav();
    viewState.drilldown.normalDetailsCompactSnapshot = getNormalDetailsCompactSnapshot();
    applyDrilldownViewportOffset(viewState.drilldown.normalDetailsCompactSnapshot);
    viewState.drilldown.isOpen = true;
    if (store.situationsView?.drilldown && typeof store.situationsView.drilldown === "object") {
      store.situationsView.drilldown.isOpen = true;
    }
    const panel = document.getElementById("drilldownPanel");
    applyDrilldownVariant(options?.variant);
    setOverlayChromeOpenState(panel, true);
    syncWindowScrollLock(true);
    if (String(options?.variant || "").trim() !== "situation-kanban") {
      updateDrilldownPanel();
    }
  }

  function closeDrilldown() {
    const viewState = ensureViewUiState();
    viewState.drilldown.isOpen = false;
    if (store.situationsView?.drilldown && typeof store.situationsView.drilldown === "object") {
      store.situationsView.drilldown.isOpen = false;
    }
    const panel = document.getElementById("drilldownPanel");
    panel?.classList.remove("drilldown--situation-kanban");
    if (panel) {
      panel.style.setProperty("--subject-drilldown-top-offset", "0px");
      panel.classList.remove("drilldown--offset-from-normal-compact");
    }
    setOverlayChromeOpenState(panel, false);
    syncWindowScrollLock(false);
    document.__syncCondensedTitle?.();
    viewState.drilldown.normalDetailsCompactSnapshot = null;
  }

  function promoteDrilldownSelectionToPrimary() {
    const selection = getDrilldownSelection();
    closeDrilldown();
    if (!selection?.item?.id) return;
    if (selection.type === "situation") {
      selectSituationSelection?.(selection.item.id);
      return;
    }
    const openSelection = selectSubjectSelection || selectSujetSelection;
    openSelection?.(selection.item.id);
  }

  function openDrilldownFromSituation(situationId, options = {}) {
    ensureViewUiState();
    const selection = openDrilldownFromSituationSelection(situationId);
    if (!selection) return;
    openDrilldown(options);
  }

  function openDrilldownFromSubject(subjectId, options = {}) {
    ensureViewUiState();
    const openSelection = openDrilldownFromSubjectSelection || openDrilldownFromSujetSelection;
    const selection = openSelection?.(subjectId);
    if (!selection) return;
    openDrilldown(options);
  }

  function openDrilldownFromSujet(sujetId, options = {}) {
    return openDrilldownFromSubject(sujetId, options);
  }

  return {
    ensureDrilldownDom,
    getDrilldownSelection,
    updateDrilldownPanel,
    openDrilldown,
    closeDrilldown,
    promoteDrilldownSelectionToPrimary,
    openDrilldownFromSituation,
    openDrilldownFromSubject,
    openDrilldownFromSujet
  };
}
