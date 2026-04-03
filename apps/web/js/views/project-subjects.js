import { store } from "../store.js";
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
import {
  bindProjectSituationsRunbar,
  syncProjectSituationsRunbar,
  renderProjectSituationsRunbar
} from "./project-situations-runbar.js";
import { closeGlobalNav } from "./global-nav.js";
import {
  setProjectViewHeader,
  registerProjectPrimaryScrollSource,
  refreshProjectShellChrome
} from "./project-shell-chrome.js";
import {
  loadExistingSubjectsForCurrentProject,
  getCurrentAnalysisRunMeta
} from "../services/analysis-runner.js";
import { renderIssuesTable, renderSubIssuesTable, renderSubIssuesPanel } from "./ui/issues-table.js";
import {
  renderProjectTableToolbar,
  renderProjectTableToolbarGroup,
  renderProjectTableToolbarSearch,
  renderProjectTableToolbarMeta
} from "./ui/project-table-toolbar.js";
import { renderDataTableHead } from "./ui/data-table-shell.js";
import { renderStatusBadge } from "./ui/status-badges.js";
import { renderMessageThread, renderMessageThreadComment } from "./ui/message-thread.js";
import { escapeHtml } from "../utils/escape-html.js";

let subjectsCurrentRoot = null;
let subjectsTabResetBound = false;
let subjectsDataRequestId = 0;

function ensureSubjectsUiState() {
  const view = store.situationsView;
  if (!view.subjectsSearch) view.subjectsSearch = "";
  if (!view.subjectsSelectedNodeId) view.subjectsSelectedNodeId = "";
  if (typeof view.subjectsLoading !== "boolean") view.subjectsLoading = false;
}

function priorityBadge(priority = "medium") {
  const value = String(priority || "medium").trim().toLowerCase();
  const normalized = value === "hight" ? "high" : value || "medium";
  return renderStatusBadge({
    label: normalized,
    tone: normalized
  });
}

function statusBadge(status = "open") {
  const normalized = String(status || "open").trim().toLowerCase() === "closed"
    ? "closed"
    : "open";

  return renderStatusBadge({
    label: normalized === "closed" ? "closed" : "open",
    tone: normalized === "closed" ? "done" : "success"
  });
}

function fmtTs(ts) {
  if (!ts) return "—";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return String(ts);
  return date.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getSubjectsRoot() {
  return Array.isArray(store.situationsView?.data) ? (store.situationsView.data[0] || null) : null;
}

function getTopLevelSubjects() {
  return Array.isArray(getSubjectsRoot()?.sujets) ? getSubjectsRoot().sujets : [];
}

function buildSubjectIndex() {
  const index = new Map();

  const visit = (subject, parentId = "") => {
    if (!subject?.id) return;
    index.set(String(subject.id), {
      ...subject,
      parentSubjectId: parentId || subject.parentSubjectId || subject.raw?.parent_subject_id || ""
    });

    for (const child of subject.avis || []) {
      visit(child, String(subject.id));
    }
  };

  for (const subject of getTopLevelSubjects()) {
    visit(subject, "");
  }

  return index;
}

function getSubjectById(subjectId) {
  if (!subjectId) return null;
  return buildSubjectIndex().get(String(subjectId)) || null;
}

function getSelectedSubject() {
  const selectedId = String(store.situationsView.subjectsSelectedNodeId || "");
  if (selectedId) {
    const selected = getSubjectById(selectedId);
    if (selected) return selected;
  }

  return getTopLevelSubjects()[0] || null;
}

function selectSubject(subjectId) {
  const selected = getSubjectById(subjectId);
  if (!selected) return;
  store.situationsView.subjectsSelectedNodeId = String(selected.id);
  store.situationsView.selectedSujetId = String(selected.id);
  store.situationsView.selectedAvisId = null;
  rerenderSubjectsView();
}

function countDescendants(subject) {
  let count = 0;
  for (const child of subject?.avis || []) {
    count += 1;
    count += countDescendants(child);
  }
  return count;
}

function flattenTopLevelSubjectsWithFilter() {
  const query = String(store.situationsView.subjectsSearch || "").trim().toLowerCase();
  const subjects = getTopLevelSubjects();

  const matches = (subject) => {
    const haystack = [
      subject?.id,
      subject?.title,
      subject?.description,
      subject?.priority,
      subject?.status,
      subject?.agent,
      subject?.raw?.subject_type
    ].map((value) => String(value || "").toLowerCase()).join(" ");

    if (!query) return true;
    if (haystack.includes(query)) return true;

    return (subject?.avis || []).some((child) => matches(child));
  };

  return subjects.filter((subject) => matches(subject));
}

function renderMainTable() {
  const visibleSubjects = flattenTopLevelSubjectsWithFilter();
  const headHtml = renderDataTableHead({
    columns: [
      { label: "Titre", className: "cell-title" },
      { label: "Priorité", className: "cell-priority" },
      { label: "Statut", className: "cell-status" },
      { label: "Sous-sujets", className: "cell-children" },
      { label: "ID", className: "cell-id" }
    ]
  });

  const rowsHtml = visibleSubjects.map((subject) => {
    const isSelected = String(getSelectedSubject()?.id || "") === String(subject.id);
    const childCount = Array.isArray(subject?.avis) ? subject.avis.length : 0;

    return `
      <div class="issue-row click ${isSelected ? "selected subissue-row--selected" : ""}" data-subject-id="${escapeHtml(subject.id)}">
        <div class="cell cell-title">
          <button type="button" class="row-title-trigger js-subject-select" data-subject-id="${escapeHtml(subject.id)}">
            ${escapeHtml(subject.title || subject.id)}
          </button>
        </div>
        <div class="cell cell-priority">${priorityBadge(subject.priority)}</div>
        <div class="cell cell-status">${statusBadge(subject.status)}</div>
        <div class="cell cell-children mono">${childCount}</div>
        <div class="cell cell-id mono">${escapeHtml(subject.id)}</div>
      </div>
    `;
  }).join("");

  return renderIssuesTable({
    headHtml,
    rowsHtml,
    gridTemplate: "minmax(0,1fr) 120px 120px 120px 180px",
    emptyTitle: "Aucun sujet",
    emptyDescription: store.situationsView.subjectsLoading
      ? "Chargement des sujets…"
      : "Aucun sujet n’a encore été créé pour ce projet."
  });
}

function renderSubSubjectsPanel(subject) {
  const children = Array.isArray(subject?.avis) ? subject.avis : [];
  const rowsHtml = children.map((child) => `
    <div class="issue-row click js-subject-select" data-subject-id="${escapeHtml(child.id)}">
      <div class="cell cell-title">
        <span class="theme-text theme-text--sujet">${escapeHtml(child.title || child.id)}</span>
      </div>
      <div class="cell cell-priority">${priorityBadge(child.priority)}</div>
      <div class="cell cell-status">${statusBadge(child.status)}</div>
      <div class="cell cell-id mono">${escapeHtml(child.id)}</div>
    </div>
  `).join("");

  const bodyHtml = renderSubIssuesTable({
    rowsHtml,
    emptyTitle: "Aucun sous-sujet",
    emptyDescription: "Ce sujet n’a pas encore de sous-sujet."
  });

  return renderSubIssuesPanel({
    title: "Sous-sujets",
    leftMetaHtml: `<div class="subissues-counts subissues-counts--total"><span class="mono">${children.length}</span></div>`,
    bodyHtml,
    isOpen: true
  });
}

function renderDetails() {
  const subject = getSelectedSubject();

  if (!subject) {
    return `<div class="emptyState">Sélectionne un sujet pour afficher les détails.</div>`;
  }

  const bodyHtml = escapeHtml(subject.description || "Aucune description disponible.").replace(/\n/g, "<br>");
  const parentId = String(subject.parentSubjectId || "");
  const parent = parentId ? getSubjectById(parentId) : null;

  const summaryItems = [
    `<div class="details-meta-item"><span class="mono">Priorité</span><div>${priorityBadge(subject.priority)}</div></div>`,
    `<div class="details-meta-item"><span class="mono">Statut</span><div>${statusBadge(subject.status)}</div></div>`,
    `<div class="details-meta-item"><span class="mono">Auteur</span><div>${escapeHtml(subject.agent || "system")}</div></div>`,
    `<div class="details-meta-item"><span class="mono">Parent</span><div>${parent ? escapeHtml(parent.title || parent.id) : "—"}</div></div>`,
    `<div class="details-meta-item"><span class="mono">Sous-sujets</span><div class="mono">${(subject.avis || []).length}</div></div>`,
    `<div class="details-meta-item"><span class="mono">Descendants</span><div class="mono">${countDescendants(subject)}</div></div>`,
    `<div class="details-meta-item"><span class="mono">Créé</span><div>${escapeHtml(fmtTs(subject.raw?.created_at))}</div></div>`,
    `<div class="details-meta-item"><span class="mono">Mis à jour</span><div>${escapeHtml(fmtTs(subject.raw?.updated_at))}</div></div>`
  ].join("");

  return `
    <div class="project-subjects-detail">
      ${renderMessageThread({
        itemsHtml: renderMessageThreadComment({
          idx: 0,
          author: "Sujet",
          tsHtml: `<span class="mono">${escapeHtml(subject.id)}</span>`,
          bodyHtml
        })
      })}
      <div class="project-subjects-detail__meta">
        ${summaryItems}
      </div>
      ${renderSubSubjectsPanel(subject)}
    </div>
  `;
}

function renderToolbar() {
  const visibleCount = flattenTopLevelSubjectsWithFilter().length;
  const totalCount = getTopLevelSubjects().length;
  const runMeta = getCurrentAnalysisRunMeta();

  return [
    renderProjectSituationsRunbar(),
    renderProjectTableToolbar({
      leftHtml: [
      renderProjectTableToolbarGroup({
        html: renderProjectTableToolbarSearch({
          id: "subjectsSearchInput",
          value: store.situationsView.subjectsSearch || "",
          placeholder: "Rechercher un sujet…"
        })
      }),
      renderProjectTableToolbarGroup({
        html: renderProjectTableToolbarMeta({
          text: `${visibleCount} / ${totalCount} sujet${totalCount > 1 ? "s" : ""}`
        })
      })
    ].join(""),
      rightHtml: renderProjectTableToolbarGroup({
        html: renderProjectTableToolbarMeta({
          text: runMeta.runId ? `Dernier run : ${runMeta.runId}` : "Aucun run en mémoire"
        })
      })
    })
  ].join("");
}

function rerenderSubjectsView() {
  const panelHost = document.getElementById("subjectsPanelHost");
  const toolbarHost = document.getElementById("situationsToolbarHost");
  if (!panelHost) return;

  if (toolbarHost) {
    toolbarHost.innerHTML = renderToolbar();
    bindProjectSituationsRunbar(toolbarHost);
  }

  panelHost.innerHTML = `
    <div class="project-subjects-grid">
      <section class="gh-panel gh-panel--results">
        <div class="gh-panel__body">${renderMainTable()}</div>
      </section>
      <section class="gh-panel gh-panel--details">
        <div class="gh-panel__body">${renderDetails()}</div>
      </section>
    </div>
  `;

  bindSubjectsEvents();
}

function bindSubjectsEvents() {
  const root = subjectsCurrentRoot || document;

  root.querySelectorAll(".js-subject-select").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const subjectId = String(button.dataset.subjectId || "");
      if (subjectId) selectSubject(subjectId);
    });
  });

  const searchInput = document.getElementById("subjectsSearchInput");
  if (searchInput && !searchInput.dataset.subjectsBound) {
    searchInput.dataset.subjectsBound = "true";
    searchInput.addEventListener("input", () => {
      store.situationsView.subjectsSearch = searchInput.value || "";
      rerenderSubjectsView();
    });
  }
}

function syncSubjectsPrimaryScrollSource() {
  const scrollEl = document.getElementById("projectSubjectsScroll");
  registerProjectPrimaryScrollSource(scrollEl || null);
  refreshProjectShellChrome();
}

async function ensureSubjectsLoaded() {
  const requestId = ++subjectsDataRequestId;
  store.situationsView.subjectsLoading = true;
  rerenderSubjectsView();

  try {
    await loadExistingSubjectsForCurrentProject({ force: false });
  } finally {
    if (requestId !== subjectsDataRequestId) return;
    store.situationsView.subjectsLoading = false;

    const selected = getSelectedSubject();
    if (selected?.id) {
      store.situationsView.subjectsSelectedNodeId = String(selected.id);
      store.situationsView.selectedSujetId = String(selected.id);
    }

    rerenderSubjectsView();
  }
}

function bindSubjectsTabReset() {
  if (subjectsTabResetBound) return;
  subjectsTabResetBound = true;

  window.addEventListener(PROJECT_TAB_RESELECTED_EVENT, (event) => {
    const projectId = String(event.detail?.projectId || "");
    const tabId = String(event.detail?.tabId || "");
    if (tabId !== "subjects") return;
    if (projectId && store.currentProjectId && projectId !== store.currentProjectId) return;

    closeGlobalNav();
    ensureSubjectsLoaded();
  });

  document.addEventListener("analysisStateChanged", () => {
    if (!subjectsCurrentRoot) return;
    rerenderSubjectsView();
  });
}

export function renderProjectSubjects(root) {
  ensureSubjectsUiState();
  subjectsCurrentRoot = root;
  bindSubjectsTabReset();

  store.situationsView.showTableOnly = true;
  store.situationsView.displayDepth = "sujets";
  store.situationsView.selectedAvisId = null;

  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Sujets",
    variant: "situations",
    toolbarHtml: ""
  });

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="projectSubjectsScroll">
        <div class="settings-content project-page-shell project-page-shell--content">
          <div id="subjectsPanelHost"></div>
        </div>
      </div>
    </section>
  `;

  rerenderSubjectsView();
  syncSubjectsPrimaryScrollSource();
  bindProjectSituationsRunbar(document.getElementById("situationsToolbarHost") || root || document);

  syncProjectSituationsRunbar({
    run_id: store.ui?.runId || "",
    status: store.ui?.systemStatus?.state || "idle",
    label: store.ui?.systemStatus?.label || "",
    meta: store.ui?.systemStatus?.meta || "",
    isBusy: store.ui?.systemStatus?.state === "running"
  });

  ensureSubjectsLoaded();
}
