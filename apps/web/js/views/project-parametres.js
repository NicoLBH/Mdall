import { setProjectViewHeader, clearProjectActiveScrollSource, debugProjectScrollPolicy } from "./project-shell-chrome.js";
import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem,
  renderSideNavSeparator
} from "./ui/side-nav-layout.js";
import { svgIcon } from "../ui/icons.js";
import {
  ensureProjectParametresSetup,
  setProjectParametresRerender,
  getParametresUiState,
  setActiveParametresSectionId
} from "./project-parametres/project-parametres-core.js";
import { getGeneralProjectParametresTab } from "./project-parametres/project-parametres-general.js";
import { getLocalisationProjectParametresTab } from "./project-parametres/project-parametres-localisation.js";
import { getPhasesProjectParametresTab } from "./project-parametres/project-parametres-phases.js";
import { getLotsProjectParametresTab } from "./project-parametres/project-parametres-lots.js";
import { getCollaborateursProjectParametresTab } from "./project-parametres/project-parametres-collaborateurs.js";
import { getAgentsProjectParametresTab } from "./project-parametres/project-parametres-agents.js";
import { getAutomatisationsProjectParametresTab } from "./project-parametres/project-parametres-automatisations.js";

const activeProjectParametresTabs = [
  getGeneralProjectParametresTab(),
  getLocalisationProjectParametresTab(),
  getPhasesProjectParametresTab(),
  getLotsProjectParametresTab(),
  getCollaborateursProjectParametresTab(),
  getAgentsProjectParametresTab(),
  getAutomatisationsProjectParametresTab()
];

const parametresNavGroups = [
  {
    items: [activeProjectParametresTabs[0]]
  },
  {
    sectionLabel: "Données de base projet",
    items: activeProjectParametresTabs.slice(1, 6)
  },
  {
    sectionLabel: "Paramètres opérationnels",
    items: [activeProjectParametresTabs[6]]
  }
];

function renderParametresNav(activeTabId) {
  return parametresNavGroups.map((group, groupIndex) => {
    const html = renderSideNavGroup({
      sectionLabel: group.sectionLabel || "",
      className: "settings-nav__group settings-nav__group--project",
      items: group.items.map((tab) => renderSideNavItem({
        label: tab.label,
        targetId: tab.id,
        iconHtml: tab.iconHtml || svgIcon(tab.iconName),
        isActive: tab.id === activeTabId,
        isPrimary: Boolean(tab.isPrimary)
      }))
    });

    if (groupIndex === parametresNavGroups.length - 1) return html;
    return `${html}${renderSideNavSeparator()}`;
  }).join("");
}

function getProjectParametresTabById(tabId) {
  return activeProjectParametresTabs.find((tab) => tab.id === tabId) || activeProjectParametresTabs[0];
}

function isProjectParametresTabStandalone(tab) {
  return Boolean(tab?.isStandalone?.());
}

function mountProjectParametresTab(root, tabId) {
  if (!root) return;

  const activeTab = getProjectParametresTabById(tabId);
  setActiveParametresSectionId(activeTab.id);

  root.querySelectorAll("[data-side-nav-target]").forEach((item) => {
    const isActive = item.dataset.sideNavTarget === activeTab.id;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("data-side-nav-active", isActive ? "true" : "false");
    item.setAttribute("aria-current", isActive ? "page" : "false");
  });

  const contentRoot = root.querySelector("#projectParametresContent");
  if (!contentRoot) return;

  contentRoot.innerHTML = activeTab.renderContent();
  activeTab.bind?.(contentRoot.querySelector("[data-side-nav-panel]") || contentRoot);

  window.scrollTo({ top: 0, behavior: "auto" });
}

export function renderProjectParametres(root) {
  ensureProjectParametresSetup(root);
  setProjectParametresRerender(renderProjectParametres);
  clearProjectActiveScrollSource();

  const uiState = getParametresUiState();
  const defaultTab = getProjectParametresTabById(uiState.activeSectionId || "parametres-general");

  setProjectViewHeader({
    contextLabel: "Paramètres",
    variant: "parametres",
    title: "",
    subtitle: "",
    metaHtml: "",
    toolbarHtml: ""
  });

  const isStandalone = isProjectParametresTabStandalone(defaultTab);

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings project-simple-page--parametres ${isStandalone ? "project-simple-page--parametres-standalone" : ""}">
      <div class="settings-shell settings-shell--parametres settings-shell--project-page ${isStandalone ? "settings-shell--parametres-standalone" : ""}">
        ${renderSideNavLayout({
          className: `settings-layout settings-layout--parametres ${isStandalone ? "settings-layout--parametres-standalone" : ""}`,
          navClassName: "settings-nav settings-nav--parametres",
          contentClassName: `settings-content settings-content--parametres ${isStandalone ? "settings-content--parametres-standalone" : ""}`,
          navHtml: renderParametresNav(defaultTab.id),
          contentHtml: '<div id="projectParametresContent"></div>'
        })}
      </div>
    </section>
  `;

  if (root.__projectParametresNavHandler) {
    root.removeEventListener("click", root.__projectParametresNavHandler);
  }

  root.__projectParametresNavHandler = (event) => {
    const navItem = event.target.closest?.("[data-side-nav-target]");
    if (!navItem || !root.contains(navItem)) return;
    mountProjectParametresTab(root, navItem.dataset.sideNavTarget || defaultTab.id);
  };

  root.addEventListener("click", root.__projectParametresNavHandler);
  mountProjectParametresTab(root, defaultTab.id);
  debugProjectScrollPolicy("render-project-parametres", {
    activeSection: defaultTab.id
  });
}
