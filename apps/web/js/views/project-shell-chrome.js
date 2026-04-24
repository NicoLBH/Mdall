import { PROJECT_TABS } from "../constants.js";
import { escapeHtml } from "../utils/escape-html.js";

const shellState = {
  projectId: null,
  tab: null,
  isCompact: false,
  compactEnabled: true,
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
  cleanupWindow: null,
  cleanupRegisteredScrollSources: null,
  cleanupActiveScrollSource: null,
  activeScrollSourceEl: null,
  activeScrollSourceResolver: null
};
export const PROJECT_SHELL_COMPACT_CHANGE_EVENT = "project-shell-compact-change";

function isProjectShellKanbanScrollDebugEnabled() {
  try {
    return window.localStorage?.getItem("debug:situation-kanban-scroll") === "1";
  } catch (_) {
    return false;
  }
}

function debugProjectShellKanbanScroll(label, payload) {
  if (!isProjectShellKanbanScrollDebugEnabled()) return;
  console.info(label, payload);
}

function isProjectScrollPolicyDebugEnabled() {
  try {
    return window.localStorage?.getItem("debug:project-scroll-policy") === "1";
  } catch (_) {
    return false;
  }
}

function readComputedLayout(selector) {
  const el = document.querySelector(selector);
  if (!el) {
    return {
      selector,
      found: false
    };
  }
  const style = window.getComputedStyle(el);
  return {
    selector,
    found: true,
    className: el.className || "",
    height: style.height,
    minHeight: style.minHeight,
    overflow: style.overflow
  };
}

export function debugProjectScrollPolicy(label, extra = {}) {
  if (!isProjectScrollPolicyDebugEnabled()) return;

  const activeScrollSourceEl = getActiveScrollSourceEl();
  const scrollingElement = document.scrollingElement || document.documentElement || document.body || null;
  const projectContent = document.getElementById("project-content");

  console.info("[project-scroll-policy]", {
    label,
    tab: shellState.tab || null,
    scrollSource: activeScrollSourceEl ? "local-element" : "document/window",
    scrollSourceClass: activeScrollSourceEl?.className || null,
    documentScrollHeight: Number(scrollingElement?.scrollHeight || 0),
    documentClientHeight: Number(scrollingElement?.clientHeight || 0),
    windowScrollY: Number(window.scrollY || 0),
    projectContentClass: projectContent?.className || null,
    projectShell: readComputedLayout(".project-shell"),
    projectShellBody: readComputedLayout(".project-shell__body"),
    projectShellContent: readComputedLayout(".project-shell__content"),
    projectSimplePage: readComputedLayout(".project-simple-page"),
    projectSimpleScroll: readComputedLayout(".project-simple-scroll"),
    ...extra
  });
}

function getStickyChromeHostEl() {
  return document.getElementById("projectStickyChromeHost");
}

function refreshProjectShellChromeRefs() {
  shellState.globalHeaderEl = document.querySelector("#globalHeaderHost .gh-header");
  shellState.projectTabsEl = document.querySelector(".project-tabs");
  shellState.viewHeaderHostEl = document.getElementById("projectViewHeaderHost");
  shellState.compactTabHostEl = document.getElementById("projectCompactTab");
  shellState.compactTabLabelEl = document.getElementById("projectCompactTabLabel");
  shellState.compactTabLabelPrimaryEl = document.getElementById("projectCompactTabLabelPrimary");
  shellState.compactTabLabelSuffixEl = document.getElementById("projectCompactTabLabelSuffix");
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

function getDocumentScrollTop() {
  return Number(
    window.scrollY
    || document.documentElement?.scrollTop
    || document.body?.scrollTop
    || 0
  );
}

function getActiveScrollSourceEl() {
  if (typeof shellState.activeScrollSourceResolver === "function") {
    const resolvedEl = shellState.activeScrollSourceResolver();
    if (resolvedEl) return resolvedEl;
  }

  return shellState.activeScrollSourceEl || null;
}

function getScrollTopFromElement(el) {
  if (!el) return 0;
  return Number(el.scrollTop || 0);
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
  refreshProjectShellChromeRefs();
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
  refreshProjectShellChromeRefs();
  const nextCompact = !!(shellState.compactEnabled && isCompact);
  const didChange = shellState.isCompact !== nextCompact;
  if (!didChange) {
    debugProjectShellKanbanScroll("[project-shell:apply-compact-state]", {
      requested: isCompact,
      applied: nextCompact,
      compactEnabled: shellState.compactEnabled,
      didChange,
      skipped: true
    });
    return;
  }

  shellState.isCompact = nextCompact;

  document.body.classList.add("route--project");
  document.body.classList.toggle("project-shell-compact", shellState.isCompact);

  shellState.globalHeaderEl?.classList.toggle("gh-header--compact", shellState.isCompact);
  shellState.projectTabsEl?.classList.toggle("project-tabs--hidden", shellState.isCompact);
  getViewHeaderEl()?.classList.toggle("project-view-header--compact", shellState.isCompact);

  debugProjectShellKanbanScroll("[project-shell:apply-compact-state]", {
    requested: isCompact,
    applied: !!(shellState.compactEnabled && isCompact),
    compactEnabled: shellState.compactEnabled,
    didChange,
    bodyHasCompact: document.body.classList.contains("project-shell-compact"),
    headerClass: shellState.globalHeaderEl?.className,
    tabsClass: shellState.projectTabsEl?.className,
    tabsDisplay: shellState.projectTabsEl ? getComputedStyle(shellState.projectTabsEl).display : null
  });

  syncCompactTabLabel();
  window.dispatchEvent(new CustomEvent(PROJECT_SHELL_COMPACT_CHANGE_EVENT, {
    detail: { isCompact: shellState.isCompact }
  }));
}

function syncCompactState() {
  const activeScrollSourceEl = getActiveScrollSourceEl();
  const scrollTop = activeScrollSourceEl
    ? getScrollTopFromElement(activeScrollSourceEl)
    : getDocumentScrollTop();

  applyCompactState(scrollTop > 12);
}


function renderProjectViewHeader({
  contextLabel,
  title = "",
  subtitle = "",
  metaHtml = "",
  toolbarHtml = "",
  variant = "default",
  hideBar = false
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
      ${hideBar ? "" : `
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
      `}

      ${hasToolbar ? `<div class="project-view-header__toolbar">${toolbarHtml}</div>` : ""}
    </section>
  `;
}

export function mountProjectShellChrome({ projectId, tab }) {
  unmountProjectShellChrome();

  shellState.projectId = projectId || null;
  shellState.tab = tab || "dashboard";
  refreshProjectShellChromeRefs();

  if (shellState.viewHeaderHostEl) {
    shellState.viewHeaderHostEl.innerHTML = "";
  }

  const onWindowChange = () => {
    syncCompactState();
  };

  window.addEventListener("resize", onWindowChange);
  window.addEventListener("scroll", onWindowChange, { passive: true });
  shellState.cleanupWindow = () => {
    window.removeEventListener("resize", onWindowChange);
    window.removeEventListener("scroll", onWindowChange);
  };

  setProjectViewHeader({
    contextLabel: getTabLabel(shellState.tab),
    variant: shellState.tab || "default"
  });

  syncCompactTabLabel();
  syncCompactState();
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
    variant: config.variant || shellState.tab || "default",
    hideBar: config.hideBar === true
  });

  getViewHeaderEl()?.classList.toggle("project-view-header--compact", shellState.isCompact);
  syncCompactTabLabel();
}

export function registerProjectScrollSources(...elements) {
  shellState.cleanupRegisteredScrollSources?.();
  shellState.cleanupRegisteredScrollSources = null;

  const candidates = elements
    .flat(Infinity)
    .filter((element) => element?.addEventListener);

  if (!candidates.length) {
    syncCompactState();
    return;
  }

  const onSourceChange = (event) => {
    const sourceEl = event?.currentTarget;
    if (sourceEl) {
      useProjectScrollSource(sourceEl);
    }
    syncCompactState();
  };

  candidates.forEach((element) => {
    element.addEventListener("scroll", onSourceChange, { passive: true });
  });

  shellState.cleanupRegisteredScrollSources = () => {
    candidates.forEach((element) => {
      element.removeEventListener("scroll", onSourceChange);
    });
  };

  syncCompactState();
}

export function registerProjectPrimaryScrollSource(el) {
  registerProjectScrollSources(el);
}

export function setProjectActiveScrollSource(el, { resolve = null, syncImmediately = true } = {}) {
  shellState.cleanupActiveScrollSource?.();
  shellState.cleanupActiveScrollSource = null;
  shellState.activeScrollSourceEl = el || null;
  shellState.activeScrollSourceResolver = typeof resolve === "function" ? resolve : null;

  const bindTarget = shellState.activeScrollSourceEl;
  if (bindTarget?.addEventListener) {
    const onScroll = () => {
      syncCompactState();
    };

    bindTarget.addEventListener("scroll", onScroll, { passive: true });
    shellState.cleanupActiveScrollSource = () => {
      bindTarget.removeEventListener("scroll", onScroll);
    };
  }

  if (syncImmediately !== false) {
    syncCompactState();
  }
  debugProjectScrollPolicy("set-active-scroll-source", {
    syncImmediately: syncImmediately !== false
  });
}

export function useProjectScrollSource(el) {
  if (!el) return;
  if (shellState.activeScrollSourceEl === el && !shellState.activeScrollSourceResolver) return;
  shellState.cleanupActiveScrollSource?.();
  shellState.cleanupActiveScrollSource = null;
  shellState.activeScrollSourceEl = el;
  shellState.activeScrollSourceResolver = null;
  debugProjectScrollPolicy("use-scroll-source");
}

export function clearProjectActiveScrollSource(el = null) {
  const activeEl = getActiveScrollSourceEl();
  if (el && activeEl && el !== activeEl) {
    return;
  }

  shellState.cleanupActiveScrollSource?.();
  shellState.cleanupActiveScrollSource = null;
  shellState.activeScrollSourceEl = null;
  shellState.activeScrollSourceResolver = null;
  syncCompactState();
  debugProjectScrollPolicy("clear-active-scroll-source");
}

export function setProjectCompactEnabled(enabled = true) {
  shellState.compactEnabled = enabled !== false;
  if (!shellState.compactEnabled) {
    applyCompactState(false);
    return;
  }
  syncCompactState();
}

export function refreshProjectShellChrome() {
  refreshProjectShellChromeRefs();
  syncCompactState();
}

export function refreshProjectShellCompactState() {
  syncCompactState();
}

export function syncProjectShellCompactFromScrollSource(el) {
  if (!el) return;

  refreshProjectShellChromeRefs();

  shellState.compactEnabled = true;
  shellState.activeScrollSourceEl = el;
  shellState.activeScrollSourceResolver = null;

  const scrollTop = Number(el.scrollTop || 0);
  applyCompactState(scrollTop > 12);
}

export function unmountProjectShellChrome() {
  clearProjectStickyChrome();

  shellState.cleanupWindow?.();
  shellState.cleanupWindow = null;
  shellState.cleanupRegisteredScrollSources?.();
  shellState.cleanupRegisteredScrollSources = null;
  shellState.cleanupActiveScrollSource?.();
  shellState.cleanupActiveScrollSource = null;

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

  document.body.classList.remove("route--project", "project-shell-compact", "project-subject-details-top-compact", "project-subject-normal-detail-flow");

  shellState.globalHeaderEl?.classList.remove("gh-header--compact");
  shellState.projectTabsEl?.classList.remove("project-tabs--hidden");

  shellState.projectId = null;
  shellState.tab = null;
  shellState.isCompact = false;
  shellState.compactEnabled = true;
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
  shellState.activeScrollSourceEl = null;
  shellState.activeScrollSourceResolver = null;
}
