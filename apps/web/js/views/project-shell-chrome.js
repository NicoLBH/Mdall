import { PROJECT_TABS } from "../constants.js";
import { escapeHtml } from "../utils/escape-html.js";

const shellState = {
  projectId: null,
  tab: null,
  isCompact: false,
  globalHeaderEl: null,
  projectTabsEl: null,
  viewHeaderHostEl: null,
  compactTabHostEl: null,
  compactTabLabelEl: null,
  compactTabLabelPrimaryEl: null,
  compactTabLabelSuffixEl: null,
  compactTabCustomLabel: "",
  compactTabCustomSuffix: "",
  compactTabPrimaryAction: null,
  primaryScrollSourceEl: null,
  scrollSourceEls: [],
  cleanupScrollSource: null,
  cleanupWindow: null
};

function getStickyChromeHostEl() {
  return document.getElementById("projectStickyChromeHost");
}

export function setProjectStickyChrome(html = "") {
  const host = getStickyChromeHostEl();
  if (!host) return;

  host.innerHTML = html || "";
  host.classList.toggle("is-visible", !!String(html || "").trim());
}

export function clearProjectStickyChrome() {
  const host = getStickyChromeHostEl();
  if (!host) return;

  host.innerHTML = "";
  host.classList.remove("is-visible");
}

function getTabLabel(tab) {
  return PROJECT_TABS.find((item) => item.id === tab)?.label || tab || "";
}

function getViewHeaderEl() {
  return shellState.viewHeaderHostEl?.querySelector(".project-view-header") || null;
}

function syncCompactPrimaryAction() {
  const primaryEl = shellState.compactTabLabelPrimaryEl;
  if (!primaryEl) return;

  primaryEl.onclick = null;
  primaryEl.onkeydown = null;
  primaryEl.classList.remove("is-clickable");
  primaryEl.removeAttribute("role");
  primaryEl.removeAttribute("tabindex");

  if (typeof shellState.compactTabPrimaryAction !== "function") return;

  primaryEl.classList.add("is-clickable");
  primaryEl.setAttribute("role", "button");
  primaryEl.setAttribute("tabindex", "0");
  primaryEl.onclick = (event) => {
    event.preventDefault();
    shellState.compactTabPrimaryAction?.();
  };
  primaryEl.onkeydown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    shellState.compactTabPrimaryAction?.();
  };
}

function syncCompactTabLabel() {
  const primaryLabel = String(shellState.compactTabCustomLabel || getTabLabel(shellState.tab) || "").trim();
  const suffixLabel = String(shellState.compactTabCustomSuffix || "").trim();
  const hasStructuredLabel = !!(shellState.compactTabLabelPrimaryEl || shellState.compactTabLabelSuffixEl);

  if (hasStructuredLabel) {
    if (shellState.compactTabLabelPrimaryEl) {
      shellState.compactTabLabelPrimaryEl.textContent = primaryLabel;
    }
    if (shellState.compactTabLabelSuffixEl) {
      shellState.compactTabLabelSuffixEl.textContent = suffixLabel ? ` / ${suffixLabel}` : "";
      shellState.compactTabLabelSuffixEl.classList.toggle("is-empty", !suffixLabel);
    }
    if (shellState.compactTabLabelEl && !shellState.compactTabLabelEl.hasAttribute("data-compact-label-structured")) {
      shellState.compactTabLabelEl.setAttribute("data-compact-label-structured", "true");
    }
  } else if (shellState.compactTabLabelEl) {
    shellState.compactTabLabelEl.textContent = suffixLabel ? `${primaryLabel} / ${suffixLabel}` : primaryLabel;
  }

  shellState.compactTabHostEl?.classList.toggle("is-empty", !(primaryLabel || suffixLabel));
  syncCompactPrimaryAction();
}

function applyCompactState(isCompact) {
  shellState.isCompact = !!isCompact;

  document.body.classList.add("route--project");
  document.body.classList.toggle("project-shell-compact", shellState.isCompact);

  shellState.globalHeaderEl?.classList.toggle("gh-header--compact", shellState.isCompact);
  shellState.projectTabsEl?.classList.toggle("project-tabs--hidden", shellState.isCompact);
  getViewHeaderEl()?.classList.toggle("project-view-header--compact", shellState.isCompact);

  syncCompactTabLabel();
}

function syncCompactState() {
  const sources = shellState.scrollSourceEls?.length
    ? shellState.scrollSourceEls
    : (shellState.primaryScrollSourceEl ? [shellState.primaryScrollSourceEl] : []);
  const scrollTop = sources.reduce((maxScrollTop, source) => {
    const nextScrollTop = Number(source?.scrollTop || 0);
    return nextScrollTop > maxScrollTop ? nextScrollTop : maxScrollTop;
  }, 0);
  applyCompactState(scrollTop > 12);
}

function cleanupPrimaryScrollSource() {
  shellState.cleanupScrollSource?.();
  shellState.cleanupScrollSource = null;
  shellState.primaryScrollSourceEl = null;
  shellState.scrollSourceEls = [];
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
  shellState.compactTabHostEl = document.getElementById("projectCompactTab");
  shellState.compactTabLabelEl = document.getElementById("projectCompactTabLabel");
  shellState.compactTabLabelPrimaryEl = document.getElementById("projectCompactTabLabelPrimary");
  shellState.compactTabLabelSuffixEl = document.getElementById("projectCompactTabLabelSuffix");

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

  syncCompactTabLabel();
  applyCompactState(false);
}

export function setProjectViewHeader(config = {}) {
  if (!shellState.viewHeaderHostEl) return;

  shellState.compactTabCustomLabel = String(config.compactLabel || config.contextLabel || "").trim();
  shellState.compactTabCustomSuffix = String(config.compactLabelSuffix || "").trim();
  shellState.compactTabPrimaryAction = typeof config.onCompactLabelClick === "function" ? config.onCompactLabelClick : null;

  shellState.viewHeaderHostEl.innerHTML = renderProjectViewHeader({
    contextLabel: config.contextLabel || getTabLabel(shellState.tab),
    title: config.title || "",
    subtitle: config.subtitle || "",
    metaHtml: config.metaHtml || "",
    toolbarHtml: config.toolbarHtml || "",
    variant: config.variant || shellState.tab || "default"
  });

  getViewHeaderEl()?.classList.toggle("project-view-header--compact", shellState.isCompact);
  syncCompactTabLabel();
}

export function registerProjectScrollSources(...elements) {
  cleanupPrimaryScrollSource();

  const resolvedElements = elements
    .flat()
    .filter((element, index, array) => element && array.indexOf(element) === index);

  if (!resolvedElements.length) {
    applyCompactState(false);
    return;
  }

  shellState.primaryScrollSourceEl = resolvedElements[0] || null;
  shellState.scrollSourceEls = resolvedElements;

  const listeners = resolvedElements.map((element) => {
    const onScroll = () => {
      syncCompactState();
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", onScroll);
    };
  });

  shellState.cleanupScrollSource = () => {
    listeners.forEach((cleanup) => {
      try {
        cleanup();
      } catch {
        // ignore cleanup failures
      }
    });
  };

  syncCompactState();
}

export function registerProjectPrimaryScrollSource(el) {
  registerProjectScrollSources(el);
}

export function refreshProjectShellChrome() {
  syncCompactState();
}

export function unmountProjectShellChrome() {
  cleanupPrimaryScrollSource();
  clearProjectStickyChrome();

  shellState.cleanupWindow?.();
  shellState.cleanupWindow = null;

  shellState.viewHeaderHostEl?.replaceChildren?.();

  if (shellState.compactTabLabelEl) {
    shellState.compactTabLabelEl.textContent = "";
    shellState.compactTabLabelEl.removeAttribute("data-compact-label-structured");
  }
  if (shellState.compactTabLabelPrimaryEl) {
    shellState.compactTabLabelPrimaryEl.textContent = "";
  }
  if (shellState.compactTabLabelSuffixEl) {
    shellState.compactTabLabelSuffixEl.textContent = "";
    shellState.compactTabLabelSuffixEl.classList.add("is-empty");
  }
  shellState.compactTabHostEl?.classList.remove("is-empty");

  document.body.classList.remove("route--project", "project-shell-compact");

  shellState.globalHeaderEl?.classList.remove("gh-header--compact");
  shellState.projectTabsEl?.classList.remove("project-tabs--hidden");

  shellState.projectId = null;
  shellState.tab = null;
  shellState.isCompact = false;
  shellState.globalHeaderEl = null;
  shellState.projectTabsEl = null;
  shellState.viewHeaderHostEl = null;
  shellState.compactTabHostEl = null;
  shellState.compactTabLabelEl = null;
  shellState.compactTabLabelPrimaryEl = null;
  shellState.compactTabLabelSuffixEl = null;
  shellState.compactTabCustomLabel = "";
  shellState.compactTabCustomSuffix = "";
  shellState.compactTabPrimaryAction = null;
}
