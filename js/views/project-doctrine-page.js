import { setProjectViewHeader, registerProjectPrimaryScrollSource } from "./project-shell-chrome.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem
} from "./ui/side-nav-layout.js";
import { escapeHtml } from "../utils/escape-html.js";

function renderBulletList(items = []) {
  if (!items.length) return "";
  return `
    <ul class="settings-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderActionButtons(actions = []) {
  if (!actions.length) return "";
  return `
    <div class="settings-actions-row">
      ${actions.map((action) => `
        <button class="gh-btn ${action.primary ? "gh-btn--validate" : ""}" type="button" disabled title="Maquette explicative uniquement">
          ${escapeHtml(action.label)}
        </button>
      `).join("")}
    </div>
  `;
}

function renderSection(section) {
  return `
    <section class="settings-section" id="${escapeHtml(section.id)}">
      <h3>${escapeHtml(section.title)}</h3>
      ${section.lead ? `<p class="settings-lead">${escapeHtml(section.lead)}</p>` : ""}

      ${section.callout ? `
        <div class="gh-alert settings-callout">
          ${escapeHtml(section.callout)}
        </div>
      ` : ""}

      ${section.blocks.map((block) => `
        <div class="settings-card">
          <div class="settings-card__head">
            <div>
              <h4>${escapeHtml(block.title)}</h4>
              ${block.description ? `<p>${escapeHtml(block.description)}</p>` : ""}
            </div>
            ${block.badge ? `<span class="settings-badge mono">${escapeHtml(block.badge)}</span>` : ""}
          </div>

          ${block.items?.length ? renderBulletList(block.items) : ""}
          ${block.actions?.length ? renderActionButtons(block.actions) : ""}
        </div>
      `).join("")}
    </section>
  `;
}

function renderDoctrineNav(config) {
  return renderSideNavGroup({
    title: config.navTitle || config.contextLabel,
    items: (config.navItems || []).map((item, index) =>
      renderSideNavItem({
        as: "a",
        href: `#${item.id}`,
        label: item.label,
        isActive: index === 0
      })
    )
  });
}

export function renderDoctrinePage(root, config) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: config.contextLabel,
    variant: config.variant,
    title: config.title || "",
    subtitle: config.subtitle || "",
    metaHtml: config.metaHtml || "",
    toolbarHtml: config.toolbarHtml || ""
  });

    root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="${config.scrollId}">
        ${renderSideNavLayout({
          className: "settings-layout side-nav-layout--settings",
          navClassName: "settings-nav side-nav-layout--settings-nav",
          contentClassName: "settings-content side-nav-layout--settings-content",
          navHtml: renderDoctrineNav(config),
          contentHtml: `
            <header class="settings-page-header">
              <h2>${escapeHtml(config.pageTitle || config.contextLabel)}</h2>
              ${config.pageIntro ? `<p>${escapeHtml(config.pageIntro)}</p>` : ""}
            </header>

            ${config.topHtml || ""}
            ${config.sections.map(renderSection).join("")}
          `
        })}
      </div>
    </section>
  `;

  registerProjectPrimaryScrollSource(document.getElementById(config.scrollId));
}
