import { PROJECT_TABS } from "../constants.js";

let cleanupProjectShellChrome = null;

function getTabLabel(tab) {
  return PROJECT_TABS.find((item) => item.id === tab)?.label || tab || "";
}

function setCompactState({ isCompact, tab }) {
  const body = document.body;
  const globalHeader = document.querySelector("#globalHeaderHost .gh-header");
  const projectTabs = document.querySelector(".project-tabs");

  body.classList.add("route--project");
  body.classList.toggle("project-shell-compact", isCompact);

  globalHeader?.classList.toggle("gh-header--compact", isCompact);
  projectTabs?.classList.toggle("project-tabs--hidden", isCompact);

  document.querySelectorAll(".js-project-view-head").forEach((node) => {
    node.classList.toggle("project-view-head--compact-active", isCompact);
    node.dataset.projectTab = tab || "";
  });

  const tabLabel = getTabLabel(tab);
  document.querySelectorAll(".js-project-view-tab-label").forEach((node) => {
    node.textContent = tabLabel;
  });
}

function getPrimaryScrollSource() {
  return document.querySelector('[data-project-scroll-source="primary"]');
}

function getCurrentScrollTop() {
  const primary = getPrimaryScrollSource();
  if (primary) return primary.scrollTop || 0;

  const app = document.getElementById("app");
  return app?.scrollTop || 0;
}

export function refreshProjectShellChrome(tab) {
  setCompactState({
    isCompact: getCurrentScrollTop() > 12,
    tab
  });
}

export function mountProjectShellChrome({ tab }) {
  cleanupProjectShellChrome?.();
  cleanupProjectShellChrome = null;

  const app = document.getElementById("app");
  const projectContent = document.getElementById("project-content");
  if (!app) return;

  const sync = () => {
    setCompactState({
      isCompact: getCurrentScrollTop() > 12,
      tab
    });
  };

  const onAppScroll = () => {
    if (!getPrimaryScrollSource()) sync();
  };

  const onCapturedScroll = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const source = target.closest?.('[data-project-scroll-source="primary"]');
    if (!source) return;

    sync();
  };

  const onResize = () => {
    sync();
  };

  app.addEventListener("scroll", onAppScroll, { passive: true });
  projectContent?.addEventListener("scroll", onCapturedScroll, { passive: true, capture: true });
  window.addEventListener("resize", onResize);

  sync();

  cleanupProjectShellChrome = () => {
    app.removeEventListener("scroll", onAppScroll);
    projectContent?.removeEventListener("scroll", onCapturedScroll, { capture: true });
    window.removeEventListener("resize", onResize);
  };
}

export function unmountProjectShellChrome() {
  cleanupProjectShellChrome?.();
  cleanupProjectShellChrome = null;

  const body = document.body;
  const globalHeader = document.querySelector("#globalHeaderHost .gh-header");
  const projectTabs = document.querySelector(".project-tabs");

  body.classList.remove("route--project", "project-shell-compact");
  globalHeader?.classList.remove("gh-header--compact");
  projectTabs?.classList.remove("project-tabs--hidden");
}
