
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
    openDrilldownFromSujetSelection,
    openDrilldownFromAvisSelection,
    renderDetailsHtml,
    renderDetailsTitleWrapHtml,
    wireDetailsInteractive,
    bindDetailsScroll,
    markEntitySeen,
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

    const selection = getDrilldownSelection();
    const details = renderDetailsHtml(selection, {
      subissuesOptions: {
        sujetRowClass: "js-drilldown-select-sujet",
        sujetToggleClass: "js-drilldown-toggle-sujet",
        avisRowClass: "js-drilldown-select-avis",
        expandedSujets: store.situationsView.drilldown.expandedSujets
      }
    });

    title.innerHTML = selection ? renderDetailsTitleWrapHtml(selection) : "—";
    body.innerHTML = details.bodyHtml;

    wireDetailsInteractive(body);
    bindDetailsScroll(document);
    body.__syncCondensedTitle?.();
  }

  function openDrilldown() {
    ensureViewUiState();
    ensureDrilldownDom();
    closeGlobalNav();
    store.situationsView.drilldown.isOpen = true;
    const panel = document.getElementById("drilldownPanel");
    setOverlayChromeOpenState(panel, true);
    document.body.classList.add("drilldown-open");
    updateDrilldownPanel();
  }

  function closeDrilldown() {
    ensureViewUiState();
    store.situationsView.drilldown.isOpen = false;
    const panel = document.getElementById("drilldownPanel");
    setOverlayChromeOpenState(panel, false);
    document.body.classList.remove("drilldown-open");
  }

  function openDrilldownFromSituation(situationId) {
    ensureViewUiState();
    const selection = openDrilldownFromSituationSelection(situationId);
    if (!selection) return;
    openDrilldown();
  }

  function openDrilldownFromSujet(sujetId) {
    ensureViewUiState();
    const selection = openDrilldownFromSujetSelection(sujetId);
    if (!selection) return;
    openDrilldown();
  }

  function openDrilldownFromAvis(avisId) {
    ensureViewUiState();
    const selection = openDrilldownFromAvisSelection(avisId);
    if (!selection) return;
    openDrilldown();
  }

  return {
    ensureDrilldownDom,
    getDrilldownSelection,
    updateDrilldownPanel,
    openDrilldown,
    closeDrilldown,
    openDrilldownFromSituation,
    openDrilldownFromSujet,
    openDrilldownFromAvis
  };
}
