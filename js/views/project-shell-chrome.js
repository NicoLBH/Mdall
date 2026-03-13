import { PROJECT_TABS } from "../constants.js";

const shellState = {
  projectId: null,
  tab: null,
  isCompact: false,
  globalHeaderEl: null,
  projectTabsEl: null,
  viewHeaderHostEl: null,
  primaryScrollSourceEl: null,
  cleanupScrollSource: null,
  cleanupWindow: null
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function getTabLabel(tab) {
  return PROJECT_TABS.find((item) => item.id === tab)?.label || tab || "";
}

function getViewHeaderEl() {
  return shellState.viewHeaderHostEl?.querySelector(".project-view-header") || null;
}

function applyCompactState(isCompact) {
  shellState.isCompact = !!isCompact;

  document.body.classList.add("route--project");
  document.body.classList.toggle("project-shell-compact", shellState.isCompact);

  shellState.globalHeaderEl?.classList.toggle("gh-header--compact", shellState.isCompact);
  shellState.projectTabsEl?.classList.toggle("project-tabs--hidden", shellState.isCompact);
  getViewHeaderEl()?.classList.toggle("project-view-header--compact", shellState.isCompact);
}

function syncCompactState() {
  const scrollTop = shellState.primaryScrollSourceEl?.scrollTop || 0;
  applyCompactState(scrollTop > 12);
}

function cleanupPrimaryScrollSource() {
  shellState.cleanupScrollSource?.();
  shellState.cleanupScrollSource = null;
  shellState.primaryScrollSourceEl = null;
}

function renderProjectViewHeader({
  contextLabel,
  title = "",
  subtitle = "",
  metaHtml = "",
  toolbarHtml = "",
  variant = "default"
} = {}) {
  const safeVariant = String(variant || "default").replace(/[^a-zA-Z0-9_-]/g, "");
  const safeContextLabel = escapeHtml(contextLabel || getTabLabel(shellState.tab));
  const safeTitle = escapeHtml(title || "");
  const safeSubtitle = escapeHtml(subtitle || "");

  const hasTitles = !!(safeTitle || safeSubtitle);
  const hasToolbar = !!String(toolbarHtml || "").trim();
  const hasMeta = !!String(metaHtml || "").trim();

  return `
    <section class="project-view-header project-view-header--${safeVariant}">
      <div class="project-view-header__bar">
        <div class="project-view-header__context">
          <div class="project-view-header__eyebrow mono">${safeContextLabel}</div>
          ${hasTitles ? `
            <div class="project-view-header__titles">
              ${safeTitle ? `<div class="project-view-header__title">${safeTitle}</div>` : ""}
              ${safeSubtitle ? `<div class="project-view-header__subtitle">${safeSubtitle}</div>` : ""}
            </div>
          ` : ""}
        </div>

        ${hasMeta ? `<div class="project-view-header__meta">${metaHtml}</div>` : ""}
      </div>

      ${hasToolbar ? `<div class="project-view-header__toolbar">${toolbarHtml}</div>` : ""}
    </section>
  `;
}

export function mountProjectShellChrome({ projectId, tab }) {
  unmountProjectShellChrome();

  shellState.projectId = projectId || null;
  shellState.tab = tab || "dashboard";
  shellState.globalHeaderEl = document.querySelector("#globalHeaderHost .gh-header");
  shellState.projectTabsEl = document.querySelector(".project-tabs");
  shellState.viewHeaderHostEl = document.getElementById("projectViewHeaderHost");

  if (shellState.viewHeaderHostEl) {
    shellState.viewHeaderHostEl.innerHTML = "";
  }

  const onResize = () => {
    syncCompactState();
  };

  window.addEventListener("resize", onResize);
  shellState.cleanupWindow = () => {
    window.removeEventListener("resize", onResize);
  };

  setProjectViewHeader({
    contextLabel: getTabLabel(shellState.tab),
    variant: shellState.tab || "default"
  });

  applyCompactState(false);
}

export function setProjectViewHeader(config = {}) {
  if (!shellState.viewHeaderHostEl) return;

  shellState.viewHeaderHostEl.innerHTML = renderProjectViewHeader({
    contextLabel: config.contextLabel || getTabLabel(shellState.tab),
    title: config.title || "",
    subtitle: config.subtitle || "",
    metaHtml: config.metaHtml || "",
    toolbarHtml: config.toolbarHtml || "",
    variant: config.variant || shellState.tab || "default"
  });

  getViewHeaderEl()?.classList.toggle("project-view-header--compact", shellState.isCompact);
}

export function registerProjectPrimaryScrollSource(el) {
  cleanupPrimaryScrollSource();

  if (!el) {
    applyCompactState(false);
    return;
  }

  shellState.primaryScrollSourceEl = el;

  const onScroll = () => {
    syncCompactState();
  };

  el.addEventListener("scroll", onScroll, { passive: true });

  shellState.cleanupScrollSource = () => {
    el.removeEventListener("scroll", onScroll);
  };

  syncCompactState();
}

export function refreshProjectShellChrome() {
  syncCompactState();
}

export function unmountProjectShellChrome() {
  cleanupPrimaryScrollSource();

  shellState.cleanupWindow?.();
  shellState.cleanupWindow = null;

  shellState.viewHeaderHostEl?.replaceChildren?.();

  document.body.classList.remove("route--project", "project-shell-compact");

  shellState.globalHeaderEl?.classList.remove("gh-header--compact");
  shellState.projectTabsEl?.classList.remove("project-tabs--hidden");

  shellState.projectId = null;
  shellState.tab = null;
  shellState.isCompact = false;
  shellState.globalHeaderEl = null;
  shellState.projectTabsEl = null;
  shellState.viewHeaderHostEl = null;
}
