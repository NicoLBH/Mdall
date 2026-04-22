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

export function createProjectSubjectDetailController(config) {
  const {
    store,
    setOverlayChromeOpenState,
    getActiveSelection,
    getSelectionEntityType,
    renderDetailsHtml,
    renderDetailsDiscussionHtml,
    renderDetailsTitleWrapHtml,
    renderDetailsChromeHeadHtml,
    wireDetailsInteractive,
    bindDetailsScroll,
    ensureDrilldownDom,
    closeGlobalNav,
    markEntitySeen
  } = config;

  function isDetailsModalOpen() {
    return !!(store.projectSubjectsView?.detailsModalOpen || store.situationsView?.detailsModalOpen);
  }

  function updateDetailsModal() {
    const modal = document.getElementById("detailsModal");
    const head = modal?.querySelector?.(".modal__head");
    const title = document.getElementById("detailsTitleModal");
    const meta = document.getElementById("detailsMetaModal");
    const body = document.getElementById("detailsBodyModal");
    if (!modal || !title || !meta || !body) return;

    const isOpen = isDetailsModalOpen();
    setOverlayChromeOpenState(modal, isOpen);
    document.body.classList.toggle("modal-open", isOpen);

    const expandedSubjectIds = store.projectSubjectsView?.rightExpandedSujets
      || store.projectSubjectsView?.expandedSubjectIds
      || store.situationsView?.rightExpandedSujets
      || new Set();
    const expandedSubissueSubjectIds = store.projectSubjectsView?.rightSubissuesExpandedSubjectIds
      || store.situationsView?.rightSubissuesExpandedSubjectIds
      || new Set();
    const openSubissueMenuId = String(
      store.projectSubjectsView?.rightSubissueMenuOpenId
      || store.situationsView?.rightSubissueMenuOpenId
      || ""
    );

    const bodyScrollState = getScrollableElementScrollState(body);
    const details = renderDetailsHtml(null, {
      discussionScopeHost: "main",
      subissuesOptions: {
        sujetRowClass: "js-modal-drilldown-sujet",
        sujetToggleClass: "js-modal-toggle-sujet",
        expandedSujets: expandedSubjectIds,
        expandedSubjectIds: expandedSubissueSubjectIds,
        openMenuId: openSubissueMenuId,
        isOpen: (store.projectSubjectsView?.rightSubissuesOpen ?? store.situationsView?.rightSubissuesOpen ?? true) !== false
      }
    });

    if (head) head.classList.add("details-head--expanded");

    const selection = getActiveSelection();
    title.innerHTML = renderDetailsTitleWrapHtml(selection);
    meta.textContent = details.modalMeta;
    body.innerHTML = details.bodyHtml;

    ensureDrilldownDom();

    wireDetailsInteractive(body);
    bindDetailsScroll(document);
    restoreScrollableElementScrollState(body, bodyScrollState);
    body.__syncCondensedTitle?.();

    if (isOpen) {
      requestAnimationFrame(() => {
        const currentBody = document.getElementById("detailsBodyModal");
        restoreScrollableElementScrollState(currentBody, bodyScrollState);
        currentBody?.__syncCondensedTitle?.();
      });
    }
  }


  function renderNormalDetailsChromeHeadHtml(selectionOverride = null, options = {}) {
    const selection = selectionOverride || getActiveSelection();
    return renderDetailsChromeHeadHtml(selection, options);
  }

  function openDetailsModal() {
    closeGlobalNav();
    const selection = getActiveSelection();
    if (selection?.type && selection?.item?.id) {
      markEntitySeen(getSelectionEntityType(selection.type), selection.item.id, { source: "modal" });
    }
    if (!store.projectSubjectsView || typeof store.projectSubjectsView !== "object") {
      store.projectSubjectsView = {};
    }
    store.projectSubjectsView.detailsModalOpen = true;
    if (store.situationsView && typeof store.situationsView === "object") {
      store.situationsView.detailsModalOpen = true;
    }
    updateDetailsModal();
  }

  function closeDetailsModal() {
    if (!store.projectSubjectsView || typeof store.projectSubjectsView !== "object") {
      store.projectSubjectsView = {};
    }
    store.projectSubjectsView.detailsModalOpen = false;
    if (store.situationsView && typeof store.situationsView === "object") {
      store.situationsView.detailsModalOpen = false;
    }
    document.body.classList.remove("modal-open");
    updateDetailsModal();
  }

  function openSubjectDetails() {
    return getActiveSelection();
  }

  function syncDetailsModalIfOpen() {
    if (!isDetailsModalOpen()) return;
    updateDetailsModal();
  }

  return {
    renderDetailsTitleWrapHtml,
    renderNormalDetailsChromeHeadHtml,
    renderDetailsHtml,
    renderDetailsDiscussionHtml,
    isDetailsModalOpen,
    updateDetailsModal,
    syncDetailsModalIfOpen,
    openDetailsModal,
    openSubjectDetails,
    closeDetailsModal
  };
}
