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

/**
 * Remettre les compteurs de la barre à jour.
 *
 * **On redessine plutôt que d'écrire dans le nœud.** L'ancienne version posait
 * le nombre dans la pastille existante : elle ne savait donc ni en créer une
 * quand il y a de nouveau quelque chose, ni la retirer quand il n'y a plus
 * rien — et un compte tombé à zéro restait affiché « 0 ».
 */
function updateSubjectsTabCounterDom() {
  const header = document.querySelector(".project-context-header");
  if (!header) return;

  const projectId = String(header.dataset.projectId || "");
  if (projectId && projectId !== String(store.currentProjectId || "")) return;

  rafraichirLesOngletsDuProjet();
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

/**
 * Les comptes de la barre d'onglets.
 *
 * ## Deux comptes, et l'un des deux mentait
 *
 * La barre annonçait 48 sujets ouverts pendant que le tableau en montrait 45.
 * Les deux comptaient, chacun de son côté : la barre recomptait un cache de la
 * liste des sujets en y superposant les décisions de situation, le tableau
 * comptait ce qu'il affiche, et la base disait encore autre chose. Trois
 * lectures du même fait — et celle qu'on regardait le moins avait raison.
 *
 * **La barre lit la base, et elle seule.** C'est le compte qu'une fusion met à
 * jour, celui qu'un autre collaborateur ferait bouger, et celui qui survit à un
 * rechargement. Le tableau, lui, dit ce que sa requête retient : les deux
 * peuvent légitimement différer sous un filtre, mais ils ne peuvent plus se
 * contredire sur le même lot (`docs/fondamentaux.md`, règle 4).
 */
function getProjectTabCounters() {
  return {
    ...getCurrentProjectSubjectCounters(),
    openPropositions: store.projectPropositionsView?.openCount
  };
}

function renderTabCount(tab, counters) {
  if (!tab.countKey) return "";
  // Un compte qu'on ignore encore ne s'affiche pas. Montrer « 0 » avant d'avoir
  // regardé serait affirmer qu'il n'y a rien, ce qu'on ne sait pas.
  if (counters?.[tab.countKey] === undefined || counters?.[tab.countKey] === null) return "";
  const value = Number(counters[tab.countKey] || 0);
  // **Zéro ne se porte pas.** Une pastille « 0 » sur Propositions dit qu'il n'y
  // a rien à voir, en prenant la place de quelque chose à voir. L'absence de
  // pastille le dit mieux, et sans bruit.
  if (value <= 0) return "";
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

/**
 * Redessiner la barre d'onglets là où elle est, sans changer de page.
 *
 * ## Pourquoi il a fallu l'écrire
 *
 * Le compteur « Propositions » se rafraîchissait par un effet de bord : les
 * écrans qui ouvraient une proposition **allaient** ensuite sur l'onglet
 * Propositions, et c'est cet écran-là qui posait le compte. Depuis que ces
 * gestes **restent sur l'écran d'origine** — on perdait sinon le fil de ce
 * qu'on était en train de régler —, plus personne ne le pose : on ouvrait une
 * proposition et la barre continuait d'en annoncer trois.
 *
 * Le remplacement est franc : la navigation des onglets est branchée sur le
 * document, pas sur ces nœuds-ci, et rien ne se perd à les redessiner.
 */
export function rafraichirLesOngletsDuProjet() {
  const hote = document.querySelector(".project-context-header");
  if (!hote) return;

  const projectId = String(hote.getAttribute("data-project-id") || "");
  const actif = String(hote.querySelector('.project-tabs a.active')?.dataset.projectTabId || "");
  if (!projectId) return;

  hote.outerHTML = renderProjectHeader(projectId, actif);
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
