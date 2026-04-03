import { store } from "../store.js";
import { loadExistingSubjectsForCurrentProject } from "../services/analysis-runner.js";
import {
  setProjectViewHeader,
  registerProjectPrimaryScrollSource,
  refreshProjectShellChrome
} from "./project-shell-chrome.js";
import { escapeHtml } from "../utils/escape-html.js";
import { svgIcon } from "../ui/icons.js";

let subjectsCurrentRoot = null;
let subjectsLoadPromise = null;
let subjectsLastLoadedProjectKey = "";
let subjectsLastLoadError = "";

function getProjectKey() {
  return String(store.currentProjectId || store.currentProject?.id || "default");
}

function normalizePriority(priority = "") {
  const value = String(priority || "").trim().toLowerCase();
  if (value === "hight") return "high";
  if (["low", "medium", "high", "critical"].includes(value)) return value;
  if (value === "p1") return "critical";
  if (value === "p2") return "high";
  if (value === "p3") return "medium";
  return value || "medium";
}

function normalizeStatus(status = "") {
  return String(status || "open").trim().toLowerCase() === "closed" ? "closed" : "open";
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}

function getRootSituations() {
  return Array.isArray(store.situationsView?.data) ? store.situationsView.data : [];
}

function getTopLevelSubjects() {
  return getRootSituations().flatMap((situation) => Array.isArray(situation?.sujets) ? situation.sujets : []);
}

function getChildSubjects(subject) {
  return Array.isArray(subject?.avis) ? subject.avis : [];
}

function buildSubjectIndex() {
  const byId = new Map();
  const parentById = new Map();

  const visit = (subject, parentId = "") => {
    const id = String(subject?.id || "").trim();
    if (!id) return;
    byId.set(id, subject);
    if (parentId) {
      parentById.set(id, parentId);
    }
    for (const child of getChildSubjects(subject)) {
      visit(child, id);
    }
  };

  for (const subject of getTopLevelSubjects()) {
    visit(subject, "");
  }

  return { byId, parentById };
}

function countDescendants(subject) {
  let count = 0;
  for (const child of getChildSubjects(subject)) {
    count += 1 + countDescendants(child);
  }
  return count;
}

function getSelectedSubject() {
  const { byId } = buildSubjectIndex();
  const selectedId = String(
    store.situationsView?.selectedSujetId
    || store.situationsView?.subjectsSelectedNodeId
    || ""
  ).trim();

  if (selectedId && byId.has(selectedId)) {
    return byId.get(selectedId);
  }

  const first = getTopLevelSubjects()[0] || null;
  if (first?.id) {
    store.situationsView.selectedSujetId = first.id;
    store.situationsView.subjectsSelectedNodeId = first.id;
  }
  return first;
}

function selectSubject(subjectId) {
  const cleanId = String(subjectId || "").trim();
  store.situationsView.selectedSujetId = cleanId || null;
  store.situationsView.subjectsSelectedNodeId = cleanId || "";
  rerenderSubjects();
}

function priorityBadge(priority = "medium") {
  const normalized = normalizePriority(priority);
  return `<span class="gh-label gh-label--${escapeHtml(normalized)}">${escapeHtml(normalized)}</span>`;
}

function statusBadge(status = "open") {
  const normalized = normalizeStatus(status);
  const icon = normalized === "open"
    ? svgIcon("issue-opened", { className: "octicon octicon-issue-opened" })
    : svgIcon("check-circle", { className: "octicon octicon-check-circle" });

  return `
    <span class="gh-state ${normalized === "open" ? "gh-state--open" : "gh-state--closed"}">
      <span class="gh-state-dot" aria-hidden="true">${icon}</span>
      ${normalized === "open" ? "Open" : "Closed"}
    </span>
  `;
}

function subjectMetaLine(subject, { withParent = false } = {}) {
  const { parentById, byId } = buildSubjectIndex();
  const parentId = parentById.get(String(subject?.id || "")) || "";
  const parent = parentId ? byId.get(parentId) : null;
  const directChildren = getChildSubjects(subject).length;
  const totalDescendants = countDescendants(subject);
  const chunks = [
    `Sous-sujets directs : ${directChildren}`,
    `Sous-sujets totaux : ${totalDescendants}`
  ];

  if (withParent && parent) {
    chunks.unshift(`Parent : ${firstNonEmpty(parent.title, parent.id, "Sujet")}`);
  }

  return chunks.map((value) => `<span>${escapeHtml(value)}</span>`).join('<span aria-hidden="true">·</span>');
}

function renderTopLevelTableHtml() {
  const subjects = getTopLevelSubjects();
  const selected = getSelectedSubject();

  if (!subjects.length) {
    if (subjectsLastLoadError) {
      return `
        <div class="emptyState">
          <div class="emptyState__title">Impossible de charger les sujets</div>
          <div class="emptyState__desc">${escapeHtml(subjectsLastLoadError)}</div>
        </div>
      `;
    }

    return `
      <div class="emptyState">
        <div class="emptyState__title">Aucun sujet pour ce projet</div>
        <div class="emptyState__desc">Les sujets existants dans Supabase s’afficheront ici. Lance une analyse pour en créer de nouveaux.</div>
      </div>
    `;
  }

  const rows = subjects.map((subject) => {
    const id = String(subject?.id || "");
    const isSelected = String(selected?.id || "") === id;
    const title = firstNonEmpty(subject?.title, id, "Sujet sans titre");
    const description = firstNonEmpty(subject?.description, subject?.raw?.description, "");
    const directChildren = getChildSubjects(subject).length;

    return `
      <button
        type="button"
        class="issues-row subject-list-row${isSelected ? " issues-row--selected" : ""}"
        data-subject-id="${escapeHtml(id)}"
      >
        <span class="subject-list-row__main">
          <span class="subject-list-row__title">${escapeHtml(title)}</span>
          <span class="subject-list-row__meta">
            ${statusBadge(subject?.status)}
            ${priorityBadge(subject?.priority)}
            <span>${escapeHtml(`${directChildren} sous-sujet${directChildren > 1 ? "s" : ""}`)}</span>
          </span>
          ${description ? `<span class="subject-list-row__desc">${escapeHtml(description)}</span>` : ""}
        </span>
      </button>
    `;
  }).join("");

  return `
    <div class="issues-table issues-table--subjects-only">
      <div class="issues-table__head">
        <div class="issues-table__row">
          <div class="issues-table__cell">Sujets</div>
        </div>
      </div>
      <div class="issues-table__body">${rows}</div>
    </div>
  `;
}

function renderSubjectChildrenRows(subject) {
  const children = getChildSubjects(subject);
  if (!children.length) {
    return `
      <div class="emptyState">
        <div class="emptyState__title">Aucun sous-sujet</div>
        <div class="emptyState__desc">Les sous-sujets apparaîtront ici, comme les sub-issues de GitHub.</div>
      </div>
    `;
  }

  return `
    <div class="issues-table issues-table--subissues">
      <div class="issues-table__head">
        <div class="issues-table__row issues-table__row--subissues">
          <div class="issues-table__cell">Titre</div>
          <div class="issues-table__cell">Priorité</div>
          <div class="issues-table__cell">Statut</div>
          <div class="issues-table__cell">Sous-sujets</div>
        </div>
      </div>
      <div class="issues-table__body">
        ${children.map((child) => {
          const childId = String(child?.id || "");
          const childTitle = firstNonEmpty(child?.title, childId, "Sous-sujet sans titre");
          const grandChildrenCount = getChildSubjects(child).length;
          return `
            <button type="button" class="issues-row subject-child-row" data-subject-id="${escapeHtml(childId)}">
              <span class="issues-table__row issues-table__row--subissues">
                <span class="issues-table__cell issues-table__cell--title">${escapeHtml(childTitle)}</span>
                <span class="issues-table__cell">${priorityBadge(child?.priority)}</span>
                <span class="issues-table__cell">${statusBadge(child?.status)}</span>
                <span class="issues-table__cell">${escapeHtml(String(grandChildrenCount))}</span>
              </span>
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderSubjectBreadcrumb(subject) {
  const { byId, parentById } = buildSubjectIndex();
  const chain = [];
  let current = subject;

  while (current) {
    chain.unshift(current);
    const parentId = parentById.get(String(current?.id || "")) || "";
    current = parentId ? byId.get(parentId) : null;
  }

  return chain.map((item, index) => {
    const id = String(item?.id || "");
    const title = firstNonEmpty(item?.title, id, "Sujet");
    const isLast = index === chain.length - 1;
    if (isLast) {
      return `<span class="subject-breadcrumb__current">${escapeHtml(title)}</span>`;
    }
    return `<button type="button" class="subject-breadcrumb__link" data-subject-id="${escapeHtml(id)}">${escapeHtml(title)}</button>`;
  }).join('<span class="subject-breadcrumb__sep" aria-hidden="true">/</span>');
}

function renderSubjectDetailHtml() {
  const subject = getSelectedSubject();
  if (!subject) {
    return `
      <div class="emptyState">
        <div class="emptyState__title">Sélectionne un sujet</div>
        <div class="emptyState__desc">Le détail du sujet et son tableau de sous-sujets apparaîtront ici.</div>
      </div>
    `;
  }

  const title = firstNonEmpty(subject?.title, subject?.id, "Sujet sans titre");
  const description = firstNonEmpty(subject?.description, subject?.raw?.description, "");

  return `
    <div class="subject-detail">
      <div class="subject-breadcrumb">${renderSubjectBreadcrumb(subject)}</div>

      <div class="subject-detail__header">
        <div class="subject-detail__title-row">
          ${statusBadge(subject?.status)}
          <h2 class="subject-detail__title">${escapeHtml(title)}</h2>
        </div>
        <div class="subject-detail__meta">${subjectMetaLine(subject, { withParent: true })}</div>
        <div class="subject-detail__badges">
          ${priorityBadge(subject?.priority)}
        </div>
      </div>

      <section class="gh-comment-box subject-detail__description-box">
        <div class="gh-comment-body">
          ${description ? escapeHtml(description).replace(/\n/g, "<br>") : "Aucune description."}
        </div>
      </section>

      <section class="gh-panel subject-detail__children-panel" aria-label="Sous-sujets">
        <div class="gh-panel__head">
          <div class="gh-panel__title">Sous-sujets</div>
        </div>
        <div class="gh-panel__body">
          ${renderSubjectChildrenRows(subject)}
        </div>
      </section>
    </div>
  `;
}

function renderSubjectsPage(root, { loading = false } = {}) {
  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Sujets",
    title: "Sujets du projet",
    subtitle: "Vue sujet / sous-sujet, sans avis ni situations.",
    variant: "situations",
    metaHtml: loading
      ? `<span class="mono">Chargement des sujets…</span>`
      : `<span class="mono">${escapeHtml(`${getTopLevelSubjects().length} sujet${getTopLevelSubjects().length > 1 ? "s" : ""} racine`)}</span>`
  });

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="projectSubjectsScroll">
        <div class="settings-content project-page-shell project-page-shell--content">
          <section class="gh-panel gh-panel--results" aria-label="Sujets">
            <div class="subject-browser" style="display:grid;grid-template-columns:minmax(320px,420px) minmax(0,1fr);gap:16px;align-items:start;">
              <div class="subject-browser__left">${loading ? '<div class="emptyState"><div class="emptyState__title">Chargement…</div></div>' : renderTopLevelTableHtml()}</div>
              <div class="subject-browser__right">${loading ? "" : renderSubjectDetailHtml()}</div>
            </div>
          </section>
        </div>
      </div>
    </section>
  `;

  const scrollEl = root.querySelector("#projectSubjectsScroll");
  if (scrollEl) {
    registerProjectPrimaryScrollSource(scrollEl);
  }
  refreshProjectShellChrome();
  bindSubjectEvents(root);
}

function bindSubjectEvents(root) {
  root.querySelectorAll("[data-subject-id]").forEach((node) => {
    node.addEventListener("click", (event) => {
      event.preventDefault();
      const subjectId = String(node.dataset.subjectId || "").trim();
      if (subjectId) {
        selectSubject(subjectId);
      }
    });
  });
}

function rerenderSubjects() {
  if (!subjectsCurrentRoot) return;
  renderSubjectsPage(subjectsCurrentRoot, { loading: false });
}

function ensureSubjectsLoaded() {
  const projectKey = getProjectKey();
  const mustReload = projectKey !== subjectsLastLoadedProjectKey;
  const hasData = getTopLevelSubjects().length > 0;

  if (!mustReload && (hasData || subjectsLoadPromise)) {
    return;
  }

  subjectsLastLoadedProjectKey = projectKey;
  subjectsLastLoadError = "";
  renderSubjectsPage(subjectsCurrentRoot, { loading: true });

  subjectsLoadPromise = loadExistingSubjectsForCurrentProject({ force: true })
    .catch((error) => {
      subjectsLastLoadError = String(error?.message || error || "Erreur inconnue");
      store.situationsView.data = [];
    })
    .finally(() => {
      subjectsLoadPromise = null;
      if (subjectsCurrentRoot) {
        const first = getSelectedSubject();
        if (!first) {
          store.situationsView.selectedSujetId = null;
          store.situationsView.subjectsSelectedNodeId = "";
        }
        rerenderSubjects();
      }
    });
}

export function renderProjectSubjects(root) {
  subjectsCurrentRoot = root;
  ensureSubjectsLoaded();
  if (subjectsLoadPromise) {
    return;
  }
  renderSubjectsPage(root, { loading: false });
}
