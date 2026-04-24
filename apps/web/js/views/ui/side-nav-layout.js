import { escapeHtml } from "../../utils/escape-html.js";

export function renderSideNavItem({
  label = "",
  iconHtml = "",
  href = "",
  targetId = "",
  isActive = false,
  isPrimary = false,
  isDisabled = false,
  tag = "",
  className = "",
  as = "button",
  dataAttributes = {}
} = {}) {
  const resolvedTag = as === "a" ? "a" : "button";
  const attrs = [];

  if (resolvedTag === "a") {
    attrs.push(`href="${escapeHtml(href || "#")}"`);
  } else {
    attrs.push(`type="button"`);
  }

  if (targetId && !isDisabled) {
    attrs.push(`data-side-nav-target="${escapeHtml(targetId)}"`);
  }

  Object.entries(dataAttributes || {}).forEach(([key, value]) => {
    if (!String(key || "").trim().toLowerCase().startsWith("data-")) return;
    attrs.push(`${escapeHtml(key)}="${escapeHtml(value)}"`);
  });

  attrs.push(`data-side-nav-active="${isActive ? "true" : "false"}"`);
  attrs.push(`aria-current="${isActive ? "page" : "false"}"`);

  if (isDisabled) {
    attrs.push(`aria-disabled="true"`);
    attrs.push(`tabindex="-1"`);
  }

  const classes = [
    "side-nav-layout__item",
    isActive ? "is-active" : "",
    isPrimary ? "side-nav-layout__item--primary" : "",
    isDisabled ? "is-disabled" : "",
    className
  ].filter(Boolean).join(" ");

  return `
    <${resolvedTag} class="${classes}" ${attrs.join(" ")}>
      ${iconHtml ? `<span class="side-nav-layout__icon">${iconHtml}</span>` : ""}
      <span class="side-nav-layout__label">${escapeHtml(label)}</span>
      ${tag ? `<span class="side-nav-layout__tag mono">${escapeHtml(tag)}</span>` : ""}
    </${resolvedTag}>
  `;
}

export function renderSideNavGroup({
  title = "",
  sectionLabel = "",
  items = [],
  className = ""
} = {}) {
  return `
    <div class="side-nav-layout__group ${className}">
      ${title ? `<div class="side-nav-layout__title">${escapeHtml(title)}</div>` : ""}
      ${sectionLabel ? `<div class="side-nav-layout__section-label">${escapeHtml(sectionLabel)}</div>` : ""}
      ${items.join("")}
    </div>
  `;
}

export function renderSideNavSeparator() {
  return `<div class="side-nav-layout__separator"></div>`;
}

export function renderSideNavLayout({
  className = "",
  navClassName = "",
  contentClassName = "",
  navHtml = "",
  contentHtml = ""
} = {}) {
  return `
    <div class="side-nav-layout ${className}">
      <aside class="side-nav-layout__nav ${navClassName}">
        ${navHtml}
      </aside>

      <div class="side-nav-layout__content ${contentClassName}">
        ${contentHtml}
      </div>
    </div>
  `;
}

export function bindSideNavPanels(root = document, {
  navSelector = "[data-side-nav-target]",
  panelSelector = "[data-side-nav-panel]",
  defaultTarget = "",
  scrollContainer = null
} = {}) {
  const links = Array.from(root.querySelectorAll(navSelector));
  const panels = Array.from(root.querySelectorAll(panelSelector));

  if (!links.length || !panels.length) return;

  const showPanel = (targetId) => {
    links.forEach((link) => {
      const isActive = link.dataset.sideNavTarget === targetId;
      link.classList.toggle("is-active", isActive);
      link.setAttribute("data-side-nav-active", isActive ? "true" : "false");
      link.setAttribute("aria-current", isActive ? "page" : "false");
    });

    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.sideNavPanel === targetId);
    });

    if (scrollContainer?.scrollTo) {
      scrollContainer.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const targetId = link.dataset.sideNavTarget || "";
      if (!targetId) return;
      showPanel(targetId);
    });
  });

  showPanel(defaultTarget || links[0]?.dataset.sideNavTarget || panels[0]?.dataset.sideNavPanel || "");
}
