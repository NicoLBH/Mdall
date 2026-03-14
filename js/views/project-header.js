import { PROJECT_TABS } from "../constants.js";
import { store } from "../store.js";

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

function renderTabCount(tab, counters) {
  if (!tab.countKey) return "";
  const value = Number(counters?.[tab.countKey] || 0);
  return `<span class="project-tabs__counter" aria-label="${value} élément(s)">${value}</span>`;
}

function isTabVisible(tabId) {
  const visibility = store.projectForm?.projectTabs || {};

  if (tabId === "coordination") return visibility.coordination !== false;
  if (tabId === "workflows") return visibility.workflows !== false;
  if (tabId === "jalons") return visibility.jalons !== false;
  if (tabId === "referentiel") return visibility.referentiel !== false;
  if (tabId === "risquesSecurite") return visibility.risquesSecurite !== false;

  return true;
}

export function renderProjectHeader(projectId, activeTab) {
  const counters = getProjectTabCounters();
  const visibleTabs = PROJECT_TABS.filter((tab) => isTabVisible(tab.id));

  return `
    <section class="project-context-header">
      <nav class="project-tabs" aria-label="Project navigation">
        ${visibleTabs.map((t) => `
          <a
            href="#project/${projectId}/${t.id}"
            class="${t.id === activeTab ? "active" : ""}"
            data-project-tab-id="${t.id}"
          >
            <span class="project-tabs__item">
              <span class="project-tabs__icon" aria-hidden="true">${t.icon || ""}</span>
              <span class="project-tabs__label">${t.label}</span>
              ${renderTabCount(t, counters)}
            </span>
          </a>
        `).join("")}
      </nav>
    </section>
  `;
}
