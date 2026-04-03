import { PROJECT_TABS, isToggleableProjectTab, isProjectTabAllowedForUser } from "../constants.js";
import { store } from "../store.js";
import { renderCountBadge } from "./ui/status-badges.js";
import { PROJECT_SUPABASE_SYNC_EVENT, getCurrentProjectSubjectCounters, syncProjectSubjectCountersFromSupabase } from "../services/project-supabase-sync.js";


const PROJECT_TAB_RESELECTED_EVENT = "project:tab-reselected";
let projectHeaderNavigationBound = false;
let projectHeaderCountersBound = false;

function dispatchProjectTabReselected({ projectId, tabId }) {
  window.dispatchEvent(new CustomEvent(PROJECT_TAB_RESELECTED_EVENT, {
    detail: {
      projectId: projectId || null,
      tabId: String(tabId || "")
    }
  }));
}

function updateSubjectsTabCounterDom() {
  const header = document.querySelector(".project-context-header");
  if (!header) return;

  const projectId = String(header.dataset.projectId || "");
  if (projectId && projectId !== String(store.currentProjectId || "")) return;

  const subjectsTab = header.querySelector('.project-tabs a[data-project-tab-id="sujets"] .project-tabs__counter');
  if (!subjectsTab) return;

  const counters = getProjectTabCounters();
  const value = Number(counters?.openSujets || 0);
  subjectsTab.textContent = String(value);
  subjectsTab.setAttribute("aria-label", `${value} élément(s)`);
}

export function bindProjectHeaderNavigation() {
  if (!projectHeaderNavigationBound) {
    projectHeaderNavigationBound = true;

    document.addEventListener("click", (event) => {
    const rawTarget = event.target;
    let el = null;

    if (rawTarget && rawTarget.nodeType === 1) {
      el = rawTarget;
    } else if (rawTarget && rawTarget.parentElement) {
      el = rawTarget.parentElement;
    }

    if (!el) return;

    const tabLink = el.closest('.project-tabs a[data-project-tab-id]');
    if (!tabLink) return;

    const tabId = String(tabLink.dataset.projectTabId || "");
    if (!tabId) return;

    const isActiveTab = tabLink.classList.contains("active")
      || tabLink.getAttribute("aria-current") === "page";

    if (!isActiveTab) return;

    event.preventDefault();

    const projectId = store.currentProjectId || null;

    dispatchProjectTabReselected({ projectId, tabId });
    }, true);
  }

  if (!projectHeaderCountersBound) {
    projectHeaderCountersBound = true;

    window.addEventListener(PROJECT_SUPABASE_SYNC_EVENT, (event) => {
      const frontendProjectId = String(event?.detail?.frontendProjectId || "");
      if (frontendProjectId && frontendProjectId !== String(store.currentProjectId || "")) return;
      updateSubjectsTabCounterDom();
    });

    document.addEventListener("analysisStateChanged", () => {
      syncProjectSubjectCountersFromSupabase({ force: true }).catch(() => undefined);
      updateSubjectsTabCounterDom();
    });
  }
}

export { PROJECT_TAB_RESELECTED_EVENT };

function getEffectiveSujetStatus(sujet) {
  const decisions = Array.isArray(store.situationsView?.rawResult?.decisions)
    ? store.situationsView.rawResult.decisions
    : [];

  const sujetId = String(sujet?.id || "");

  const decision = decisions.find((d) => {
    const entityType = String(d?.entity_type || d?.type || "").toLowerCase();
    const entityId = String(d?.entity_id || d?.problem_id || d?.id || "");
    return entityType === "sujet" && entityId === sujetId;
  });

  const d = String(decision?.decision || "").toUpperCase();
  if (d === "CLOSED") return "closed";
  if (d === "REOPENED") return "open";

  return String(sujet?.status || "open").toLowerCase();
}

function getProjectTabCounters() {
  const situations = Array.isArray(store.situationsView?.data)
    ? store.situationsView.data
    : [];

  if (situations.length && store.situationsView?.projectScopeId === String(store.currentProjectId || "")) {
    let openSujets = 0;

    for (const situation of situations) {
      for (const sujet of situation?.sujets || []) {
        if (getEffectiveSujetStatus(sujet) === "open") {
          openSujets += 1;
        }
      }
    }

    return { openSujets };
  }

  return getCurrentProjectSubjectCounters();
}

function renderTabCount(tab, counters) {
  if (!tab.countKey) return "";
  const value = Number(counters?.[tab.countKey] || 0);
  return renderCountBadge(value, {
    className: "project-tabs__counter",
    ariaLabel: `${value} élément(s)`
  });
}

function isTabVisible(tabId) {
  const visibility = store.projectForm?.projectTabs || {};

  if (!isProjectTabAllowedForUser(tabId, store.user)) {
    return false;
  }

  if (isToggleableProjectTab(tabId)) {
    return visibility[tabId] !== false;
  }

  return true;
}

function getTabHref(projectId, tabId) {
  return `#project/${projectId}/${tabId}`;
}

export function renderProjectHeader(projectId, activeTab) {
  syncProjectSubjectCountersFromSupabase().catch(() => undefined);
  const counters = getProjectTabCounters();

  return `
    <section class="project-context-header" data-project-id="${projectId}">
      <nav class="project-tabs" aria-label="Project navigation">
        ${PROJECT_TABS.map((t) => {
          const visible = isTabVisible(t.id);
          return `
            <a
              href="${getTabHref(projectId, t.id)}"
              class="${t.id === activeTab ? "active" : ""}"
              data-project-tab-id="${t.id}"
              style="${visible ? "" : "display:none;"}"
              aria-hidden="${visible ? "false" : "true"}"
            >
              <span class="project-tabs__item">
                <span class="project-tabs__icon" aria-hidden="true">${t.icon || ""}</span>
                <span class="project-tabs__label">${t.label}</span>
                ${renderTabCount(t, counters)}
              </span>
            </a>
          `;
        }).join("")}
      </nav>
    </section>
  `;
}
