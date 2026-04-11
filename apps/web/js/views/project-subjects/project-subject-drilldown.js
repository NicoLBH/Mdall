export function createProjectSubjectDrilldownController(config) {
  const {
    store,
    setOverlayChromeOpenState,
    closeGlobalNav,
    renderOverlayChrome,
    renderOverlayChromeHead,
    bindOverlayChromeDismiss,
    getDrilldownSelection,
    openDrilldownFromSituationSelection,
    openDrilldownFromSubjectSelection,
    openDrilldownFromSujetSelection,
    renderDetailsHtml,
    renderDetailsTitleWrapHtml,
    wireDetailsInteractive,
    bindDetailsScroll,
    ensureViewUiState
  } = config;

  function ensureDrilldownDom() {
    if (document.getElementById("drilldownPanel")) return;

    const panel = document.createElement("div");
    panel.id = "drilldownPanel";
    panel.className = "drilldown overlay-host overlay-host--side hidden";
    panel.setAttribute("aria-hidden", "true");

    panel.innerHTML = renderOverlayChrome({
      shellClassName: "drilldown__inner gh-panel gh-panel--details",
      variant: "drilldown",
      ariaLabel: "Détails",
      headHtml: renderOverlayChromeHead({
        titleId: "drilldownTitle",
        closeId: "drilldownClose",
        closeLabel: "Fermer",
        headClassName: "drilldown__head"
      }),
      bodyId: "drilldownBody",
      bodyClassName: "drilldown__body details-body"
    });

    document.body.appendChild(panel);

    bindOverlayChromeDismiss(panel, {
      onClose: closeDrilldown
    });
  }

  function updateDrilldownPanel() {
    ensureViewUiState();
    ensureDrilldownDom();

    const panel = document.getElementById("drilldownPanel");
    const title = document.getElementById("drilldownTitle");
    const body = document.getElementById("drilldownBody");
    if (!panel || !title || !body) return;

    const expandedSubjectIds = store.projectSubjectsView?.drilldown?.expandedSubjectIds
      || store.situationsView?.drilldown?.expandedSubjectIds
      || store.situationsView?.drilldown?.expandedSujets
      || new Set();

    const selection = getDrilldownSelection();
    const details = renderDetailsHtml(selection, {
      subissuesOptions: {
        sujetRowClass: "js-drilldown-select-sujet",
        sujetToggleClass: "js-drilldown-toggle-sujet",
        expandedSujets: expandedSubjectIds,
        expandedSubjectIds
      }
    });

    title.innerHTML = selection ? renderDetailsTitleWrapHtml(selection) : "—";
    body.innerHTML = details.bodyHtml;

    wireDetailsInteractive(body);
    bindDetailsScroll(document);
    body.__syncCondensedTitle?.();
  }

  function applyDrilldownVariant(variant = "") {
    const panel = document.getElementById("drilldownPanel");
    if (!panel) return;
    panel.classList.toggle("drilldown--situation-kanban", String(variant || "").trim() === "situation-kanban");
  }

  function openDrilldown(options = {}) {
    const viewState = ensureViewUiState();
    ensureDrilldownDom();
    closeGlobalNav();
    viewState.drilldown.isOpen = true;
    if (store.situationsView?.drilldown && typeof store.situationsView.drilldown === "object") {
      store.situationsView.drilldown.isOpen = true;
    }
    const panel = document.getElementById("drilldownPanel");
    applyDrilldownVariant(options?.variant);
    setOverlayChromeOpenState(panel, true);
    document.body.classList.add("drilldown-open");
    updateDrilldownPanel();
  }

  function closeDrilldown() {
    const viewState = ensureViewUiState();
    viewState.drilldown.isOpen = false;
    if (store.situationsView?.drilldown && typeof store.situationsView.drilldown === "object") {
      store.situationsView.drilldown.isOpen = false;
    }
    const panel = document.getElementById("drilldownPanel");
    panel?.classList.remove("drilldown--situation-kanban");
    setOverlayChromeOpenState(panel, false);
    document.body.classList.remove("drilldown-open");
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
    openDrilldownFromSituation,
    openDrilldownFromSubject,
    openDrilldownFromSujet
  };
}
