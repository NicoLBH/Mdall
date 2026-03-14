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

  if (tabId === "propositions") return visibility.propositions !== false;
  if (tabId === "discussions") return visibility.discussions !== false;
  if (tabId === "pilotage") return visibility.pilotage !== false;
  if (tabId === "referentiel") return visibility.referentiel !== false;
  if (tabId === "risquesSecurite") return visibility.risquesSecurite !== false;

  return true;
}

function getTabHref(projectId, tabId) {
  return `#project/${projectId}/${tabId}`;
}

export function renderProjectHeader(projectId, activeTab) {
  const counters = getProjectTabCounters();

  return `
    <section class="project-context-header">
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
