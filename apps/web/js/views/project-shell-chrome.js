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
  shellState.isCompact = nextCompact;

  document.body.classList.add("route--project");
  document.body.classList.toggle("project-shell-compact", shellState.isCompact);

  shellState.globalHeaderEl?.classList.toggle("gh-header--compact", shellState.isCompact);
  shellState.projectTabsEl?.classList.toggle("project-tabs--hidden", shellState.isCompact);
  getViewHeaderEl()?.classList.toggle("project-view-header--compact", shellState.isCompact);

  syncCompactTabLabel();
  if (didChange) {
    window.dispatchEvent(new CustomEvent(PROJECT_SHELL_COMPACT_CHANGE_EVENT, {
      detail: { isCompact: shellState.isCompact }
    }));
  }
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

export function setProjectActiveScrollSource(el, { resolve = null } = {}) {
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

  syncCompactState();
}

export function useProjectScrollSource(el) {
  if (!el) return;
  if (shellState.activeScrollSourceEl === el && !shellState.activeScrollSourceResolver) return;
  shellState.cleanupActiveScrollSource?.();
  shellState.cleanupActiveScrollSource = null;
  shellState.activeScrollSourceEl = el;
  shellState.activeScrollSourceResolver = null;
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
