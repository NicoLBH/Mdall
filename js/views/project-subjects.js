import { store } from "../store.js";
import { ASK_LLM_URL_PROD } from "../constants.js";
import {
  bindProjectSituationsRunbar,
  syncProjectSituationsRunbar
} from "./project-situations-runbar.js";
import { closeGlobalNav } from "./global-nav.js";
import {
  setProjectViewHeader,
  registerProjectPrimaryScrollSource,
  refreshProjectShellChrome
} from "./project-shell-chrome.js";
import { svgIcon } from "../ui/icons.js";
import { renderGhActionButton } from "./ui/gh-split-button.js";
import {
  renderDataTableShell,
  renderDataTableHead,
  renderDataTableEmptyState
} from "./ui/data-table-shell.js";
import {
  renderIssuesTable,
  renderSubIssuesTable,
  renderSubIssuesPanel
} from "./ui/issues-table.js";
import {
  renderProjectTableToolbar,
  renderProjectTableToolbarGroup,
  renderProjectTableToolbarSearch,
  renderProjectTableToolbarMeta
} from "./ui/project-table-toolbar.js";
import {
  renderMessageCard,
  renderMessageThread,
  renderMessageThreadComment,
  renderMessageThreadActivity,
  renderMessageThreadEvent
} from "./ui/message-thread.js";
import { renderCommentComposer } from "./ui/comment-composer.js";
import { renderTableHeadFilterToggle } from "./ui/table-head-filter-toggle.js";
import {
  renderOverlayChrome,
  renderOverlayChromeHead,
  setOverlayChromeOpenState,
  bindOverlayChromeDismiss,
  bindOverlayChromeCompact
} from "./ui/overlay-chrome.js";
import {
  normalizeVerdict,
  normalizeReviewState,
  renderStatusBadge,
  renderVerdictPill,
  renderStateDot,
  renderReviewStateIcon,
  renderCountBadge
} from "./ui/status-badges.js";
import { escapeHtml } from "../utils/escape-html.js";
import { renderSharedDetailsTitleWrap, renderSharedDetailsTitleHtml } from "./ui/detail-header.js";
import { renderSelectMenuSection } from "./ui/select-menu.js";
import {
  formatSharedDateInputValue,
  parseSharedDateInputValue,
  renderSharedDatePicker,
  shiftSharedCalendarMonth,
  toSharedDateInputValue
} from "./ui/shared-date-picker.js";
import { getSelectionDocumentRefs } from "../services/project-document-selectors.js";

let subjectsCurrentRoot = null;
let subjectsTabResetBound = false;
let objectiveEditCalendarDismissBound = false;

/* =========================================================
   Legacy DOM / archive parity helpers
========================================================= */

function verdictTone(verdict) {
  const map = {
    F: "verdict-f",
    S: "verdict-s",
    D: "verdict-d",
    HM: "verdict-hm",
    PM: "verdict-pm",
    SO: "verdict-so"
  };
  return map[String(verdict || "").toUpperCase()] || "default";
}

function renderVerdictActionButtons(activeVerdict) {
  const verdicts = ["F", "S", "D", "HM", "PM", "SO"];

  return `
    <div class="verdict-switch" role="group" aria-label="Verdict">
      ${verdicts.map((v) => `
        <div class="verdict-switch__item ${v === activeVerdict ? "is-active" : ""}">
          ${renderGhActionButton({
            id: `verdict-${v}`,
            label: v,
            tone: verdictTone(v),
            size: "sm",
            mainAction: `set-verdict:${v}`,
            withChevron: false,
            className: "verdict-switch__action"
          })}
        </div>
      `).join("")}
    </div>
  `;
}

function mdToHtml(text) {
  const safe = escapeHtml(text || "");
  return safe
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
}

function fmtTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function nowIso() {
  return new Date().toISOString();
}

const SVG_ISSUE_OPEN = svgIcon("issue-opened");
const SVG_ISSUE_CLOSED = svgIcon("check-circle");
const SVG_ISSUE_REOPENED = SVG_ISSUE_OPEN;
const SVG_AVATAR_HUMAN = svgIcon("avatar-human", {
  width: 22,
  height: 22,
  className: "ui-icon ui-icon--block",
  style: "display:block"
});
const SVG_TL_CLOSED = svgIcon("check-circle", {
  className: "octicon octicon-check-circle Octicon__StyledOcticon-sc-jtj3m8-0 cdmDIS TimelineRow-module__Octicon__SMhVa"
});
const SVG_TL_REOPENED = svgIcon("issue-reopened", {
  className: "octicon octicon-issue-reopened Octicon__StyledOcticon-sc-jtj3m8-0 cdmDIS TimelineRow-module__Octicon__SMhVa"
});
const SVG_COMMENT = svgIcon("comment");

function issueIcon(status = "open", options = {}) {
  const {
    reviewState = "pending",
    entityType = "",
    isSeen = false
  } = options;

  const normalizedReview = normalizeReviewState(reviewState);
  if (normalizedReview === "rejected" || normalizedReview === "dismissed") {
    const iconName = String(entityType || "").toLowerCase() === "avis" ? "slash" : "skip";
    const svg = svgIcon(iconName, { style: "color: rgb(145, 152, 161)" });
    return `<span class="issue-status-icon" aria-hidden="true">${svg}</span>`;
  }

  const isOpen = String(status || "open").toLowerCase() !== "closed";
  const svg = isOpen
    ? svgIcon("issue-opened", { style: "color: var(--fgColor-open)" })
    : svgIcon("check-circle", { style: "color: var(--fgColor-done)" });

  return `<span class="issue-status-icon" aria-hidden="true">${svg}</span>`;
}


function priorityBadge(priority = "P3") {
  const p = String(priority || "P3").toUpperCase();
  const tone = p === "P1" ? "p1" : p === "P2" ? "p2" : "p3";
  return renderStatusBadge({
    label: p,
    tone
  });
}


function renderVerboseAvisVerdictPill(verdict) {
  const labels = {
    F: "Favorable",
    S: "Suspendu",
    D: "Défavorable",
    HM: "Hors Mission",
    PM: "Pour Mémoire",
    SO: "Sans Objet"
  };
  const normalized = normalizeVerdict(verdict);
  const classMap = {
    F: "verdict-F",
    S: "verdict-S",
    D: "verdict-D",
    HM: "verdict-HM",
    PM: "verdict-PM",
    SO: "verdict-SO"
  };
  const badgeClass = classMap[normalized] ? `verdict-badge ${classMap[normalized]}` : "verdict-badge";
  return `<span class="${badgeClass}">${escapeHtml(labels[normalized] || String(verdict || "—"))}</span>`;
}
function statePill(status = "open", options = {}) {
  const {
    reviewState = "pending",
    entityType = ""
  } = options;

  const normalizedReview = normalizeReviewState(reviewState);
  if (normalizedReview === "rejected" || normalizedReview === "dismissed") {
    const iconName = String(entityType || "").toLowerCase() === "avis" ? "slash" : "skip";
    const rejectedIcon = svgIcon(iconName, { style: "color: #fff" });
    return `<span class="gh-state gh-state--rejected"><span class="gh-state-dot" aria-hidden="true">${rejectedIcon}</span>Rejected</span>`;
  }

  const isOpen = String(status || "open").toLowerCase() !== "closed";
  return `<span class="gh-state ${isOpen ? "gh-state--open" : "gh-state--closed"}"><span class="gh-state-dot" aria-hidden="true">${isOpen ? SVG_ISSUE_OPEN : SVG_ISSUE_CLOSED}</span>${isOpen ? "Open" : "Closed"}</span>`;
}

function chevron(isOpen, isVisible = true) {
  if (!isVisible) return `<span class="chev chev--spacer"></span>`;
  return `<span class="chev">${isOpen ? "▾" : "▸"}</span>`;
}

function entityLinkHtml(type, id, text) {
  const safeType = escapeHtml(type || "");
  const safeId = escapeHtml(id || "");
  const safeText = text || safeId;
  return `<a href="#" class="entity-link" data-nav-type="${safeType}" data-nav-id="${safeId}">${safeText}</a>`;
}

function buildEntityDisplayRefMap() {
  const data = Array.isArray(store.situationsView?.data) ? store.situationsView.data : [];
  const map = new Map();
  let index = 1;

  const register = (type, id) => {
    const safeType = String(type || "").toLowerCase();
    const safeId = String(id || "").trim();
    if (!safeType || !safeId) return;
    const key = `${safeType}:${safeId}`;
    if (map.has(key)) return;
    map.set(key, `#${index}`);
    index += 1;
  };

  for (const situation of data) {
    register("situation", situation?.id);
    const sujets = Array.isArray(situation?.sujets) ? situation.sujets : [];
    for (const sujet of sujets) {
      register("sujet", sujet?.id);
      const avisList = Array.isArray(sujet?.avis) ? sujet.avis : [];
      for (const avis of avisList) {
        register("avis", avis?.id);
      }
    }
  }

  return map;
}

function getEntityDisplayRef(type, id) {
  const map = buildEntityDisplayRefMap();
  const safeType = String(type || "").toLowerCase();
  const safeId = String(id || "").trim();
  if (!safeId) return "";
  return map.get(`${safeType}:${safeId}`) || `#${safeId}`;
}

function entityDisplayLinkHtml(type, id) {
  return entityLinkHtml(type, id, escapeHtml(getEntityDisplayRef(type, id)));
}

function renderVerdictHeadFilter() {
  const current = String(store.situationsView.verdictFilter || "ALL").toUpperCase();

  const options = [
    "ALL",
    "F",
    "D",
    "S",
    "HM",
    "PM",
    "SO",
  ];

  const currentLabel = current === "ALL" ? "Verdict" : current;

  return `
    <div class="issues-head-menu">
      <button
        class="issues-head-menu__btn"
        id="verdictHeadBtn"
        type="button"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <span>${escapeHtml(currentLabel)}</span>
        ${svgIcon("chevron-down", { className: "gh-chevron" })}
      </button>

      <div class="gh-menu issues-head-menu__dropdown" id="verdictHeadDropdown">
        ${options.map((v) => `
          <button
            class="gh-menu__item ${v === current ? "is-active" : ""}"
            type="button"
            data-verdict="${escapeHtml(v)}"
          >
            ${escapeHtml(v)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function inferAgent(obj) {
  return obj?.produced_by || obj?.agent || obj?.by || obj?.source || "system";
}

function normActorName(actor, agent) {
  const a = String(actor || "").trim();
  if (a) return a;
  const g = String(agent || "").trim();
  if (!g) return "System";
  return g === "human" ? "Human" : g;
}

function verdictKey(v) {
  return String(v || "").toUpperCase();
}

function verdictToneClass(v) {
  const s = verdictKey(v);
  if (s === "D") return "d";
  if (s === "S") return "s";
  if (s === "F" || s === "OK") return "f";
  if (s === "HM") return "hm";
  if (s === "PM") return "pm";
  if (s === "SO") return "so";
  return "muted";
}

function miniAuthorIconHtml(agent) {
  const a = String(agent || "").toLowerCase();
  if (a === "human") {
    return `<span class="tl-author tl-author--human" aria-hidden="true">${SVG_AVATAR_HUMAN}</span>`;
  }
  return `<span class="tl-author tl-author--agent mono" aria-hidden="true">R</span>`;
}

function verdictIconHtml(v) {
  const k = verdictKey(v);
  const cls = `tl-ico tl-ico--verdict tl-ico--${verdictToneClass(k)}`;
  const txt = escapeHtml(k || "—");
  return `<span class="${cls}" aria-label="Verdict ${txt}">${txt}</span>`;
}

function matchSearch(parts, query) {
  if (!query) return true;
  const haystack = parts
    .filter((part) => part !== undefined && part !== null)
    .map((part) => String(part).toLowerCase())
    .join(" ");
  return haystack.includes(query);
}

/* =========================================================
   Local archive-like human store / overlays
========================================================= */

const HUMAN_STORE_KEY = "rapsobot-human-store-v2";
const SUJET_KANBAN_STATUSES = [
  { key: "non_active", label: "Non activé", hint: "Sujet détecté mais pas encore engagé." },
  { key: "to_activate", label: "A activer", hint: "Sujet prêt à être lancé." },
  { key: "in_progress", label: "En cours", hint: "Sujet actuellement traité." },
  { key: "in_arbitration", label: "En arbitrage", hint: "Décision ou arbitrage attendu." },
  { key: "resolved", label: "Résolu", hint: "Sujet traité ou clos." }
];
const SUJET_KANBAN_STATUS_KEYS = new Set(SUJET_KANBAN_STATUSES.map((status) => status.key));
const SUJET_KANBAN_BADGE_STYLE = {
  non_active: { background: "rgba(46, 160, 67, 0.15)", border: "rgb(35, 134, 54)", text: "rgb(63, 185, 80)" },
  to_activate: { background: "rgba(56, 139, 253, 0.1)", border: "rgb(31, 111, 235)", text: "rgb(88, 166, 255)" },
  in_progress: { background: "rgba(187, 128, 9, 0.15)", border: "rgb(158, 106, 3)", text: "rgb(210, 153, 34)" },
  in_arbitration: { background: "rgba(171, 125, 248, 0.15)", border: "rgb(137, 87, 229)", text: "rgb(188, 140, 255)" },
  resolved: { background: "rgba(219, 109, 40, 0.1)", border: "rgb(189, 86, 29)", text: "rgb(255, 161, 107)" }
};
const DEFAULT_OBJECTIVE_TITLES = [
  "Programme validé",
  "Esquisse retenue",
  "Estimation projet validée",
  "Permis déposé",
  "Permis obtenu",
  "Permis purgé",
  "Marchés de travaux signés",
  "Travaux démarrés",
  "Gros oeuvre terminé",
  "Bâtiment clos couvert",
  "Travaux terminés",
  "Réception prononcée"
];

function ensureViewUiState() {
  const v = store.situationsView;
  if (!v.rightExpandedSujets) v.rightExpandedSujets = new Set();
  if (typeof v.rightSubissuesOpen !== "boolean") v.rightSubissuesOpen = true;
  if (typeof v.commentPreviewMode !== "boolean") v.commentPreviewMode = false;
  if (typeof v.helpMode !== "boolean") v.helpMode = false;
  if (typeof v.showTableOnly !== "boolean") v.showTableOnly = true;
  if (!v.tempAvisVerdict) v.tempAvisVerdict = "F";
  if (!v.tempAvisVerdictFor) v.tempAvisVerdictFor = null;
  if (!v.descriptionEdit || typeof v.descriptionEdit !== "object") {
    v.descriptionEdit = {
      entityType: null,
      entityId: null,
      draft: ""
    };
  }
  if (!v.drilldown) {
    v.drilldown = {
      isOpen: false,
      selectedSituationId: null,
      selectedSujetId: null,
      selectedAvisId: null,
      expandedSujets: new Set()
    };
  }
  if (!(v.drilldown.expandedSujets instanceof Set)) {
    v.drilldown.expandedSujets = new Set(Array.isArray(v.drilldown.expandedSujets) ? v.drilldown.expandedSujets : []);
  }
  if (typeof v.subjectsStatusFilter !== "string") v.subjectsStatusFilter = "open";
  if (typeof v.situationsStatusFilter !== "string") v.situationsStatusFilter = "open";
  if (typeof v.subjectsSubview !== "string") v.subjectsSubview = "subjects";
  if (typeof v.objectivesStatusFilter !== "string") v.objectivesStatusFilter = "open";
  if (typeof v.selectedObjectiveId !== "string") v.selectedObjectiveId = "";
  if (!v.objectiveEdit || typeof v.objectiveEdit !== "object") {
    v.objectiveEdit = {
      isOpen: false,
      objectiveId: "",
      title: "",
      dueDate: "",
      description: "",
      calendarOpen: false,
      viewYear: 0,
      viewMonth: 0
    };
  }
  if (!v.subjectMetaDropdown || typeof v.subjectMetaDropdown !== "object") {
    v.subjectMetaDropdown = {
      field: null,
      query: "",
      activeKey: ""
    };
  }
  if (!v.subjectKanbanDropdown || typeof v.subjectKanbanDropdown !== "object") {
    v.subjectKanbanDropdown = {
      subjectId: "",
      situationId: "",
      query: "",
      activeKey: ""
    };
  }
}

function currentRunKey() {
  return firstNonEmpty(
    store.currentProjectId,
    store.currentProject?.id,
    store.ui?.runId,
    store.situationsView?.rawResult?.run_id,
    store.situationsView?.rawResult?.runId,
    "default-project"
  );
}

function loadHumanStore() {
  try {
    const raw = localStorage.getItem(HUMAN_STORE_KEY);
    if (!raw) return { runs: {} };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : { runs: {} };
  } catch {
    return { runs: {} };
  }
}

function saveHumanStore(data) {
  try {
    localStorage.setItem(HUMAN_STORE_KEY, JSON.stringify(data));
  } catch {
    // no-op
  }
}

function getRunBucket() {
  const all = loadHumanStore();
  const key = currentRunKey();

  if (!all.runs[key]) {
    all.runs[key] = {
      comments: [],
      activities: [],
      descriptions: {
        avis: {},
        sujet: {},
        situation: {}
      },
      decisions: {
        avis: {},
        sujet: {},
        situation: {}
      },
      review: {
        avis: {},
        sujet: {},
        situation: {}
      },
      objectives: [],
      workflow: {
        sujet_kanban_status: {}
      },
      subjectMeta: {
        sujet: {}
      }
    };
    saveHumanStore(all);
  }

  const bucket = all.runs[key];
  if (!bucket.descriptions) {
    bucket.descriptions = {
      avis: {},
      sujet: {},
      situation: {}
    };
    saveHumanStore(all);
  }
  if (!bucket.review) {
    bucket.review = {
      avis: {},
      sujet: {},
      situation: {}
    };
    saveHumanStore(all);
  }
  if (!Array.isArray(bucket.objectives)) {
    bucket.objectives = [];
    saveHumanStore(all);
  }
  if (!bucket.workflow || typeof bucket.workflow !== "object") {
    bucket.workflow = { sujet_kanban_status: {} };
    saveHumanStore(all);
  }
  if (!bucket.workflow.sujet_kanban_status) {
    bucket.workflow.sujet_kanban_status = {};
    saveHumanStore(all);
  }
  if (!bucket.subjectMeta || typeof bucket.subjectMeta !== "object") {
    bucket.subjectMeta = { sujet: {} };
    saveHumanStore(all);
  }
  if (!bucket.subjectMeta.sujet || typeof bucket.subjectMeta.sujet !== "object") {
    bucket.subjectMeta.sujet = {};
    saveHumanStore(all);
  }

  return { all, key, bucket };
}

function createDefaultObjectives() {
  return DEFAULT_OBJECTIVE_TITLES.map((title, index) => ({
    id: `objective-${index + 1}`,
    title,
    dueDate: null,
    description: "",
    closed: false,
    closedSubjectsCount: 0,
    subjectsCount: 2
  }));
}

function getObjectives() {
  const { bucket } = getRunBucket();
  if (!Array.isArray(bucket.objectives) || !bucket.objectives.length) {
    const defaults = createDefaultObjectives();
    persistRunBucket((draft) => {
      draft.objectives = defaults;
    });
    return defaults;
  }
  return bucket.objectives.map((objective, index) => ({
    id: String(objective?.id || `objective-${index + 1}`),
    title: String(objective?.title || `Objectif ${index + 1}`),
    dueDate: objective?.dueDate || null,
    description: String(objective?.description || ""),
    closed: !!objective?.closed,
    closedSubjectsCount: Number.isFinite(Number(objective?.closedSubjectsCount)) ? Number(objective.closedSubjectsCount) : 0,
    subjectsCount: Number.isFinite(Number(objective?.subjectsCount)) ? Number(objective.subjectsCount) : 2,
    subjectIds: Array.isArray(objective?.subjectIds) ? objective.subjectIds.map((value) => String(value || "")).filter(Boolean) : []
  }));
}

function persistRunBucket(mutator) {
  const { all, key, bucket } = getRunBucket();
  mutator(bucket);
  all.runs[key] = bucket;
  saveHumanStore(all);
}

function normalizeSujetKanbanStatus(value) {
  const key = String(value || "").trim().toLowerCase();
  return SUJET_KANBAN_STATUS_KEYS.has(key) ? key : null;
}

function getDefaultSujetKanbanStatus(sujetId) {
  const effectiveStatus = String(getEffectiveSujetStatus(sujetId) || "open").toLowerCase();
  return effectiveStatus === "closed" ? "resolved" : "non_active";
}

function getSujetKanbanStatus(sujetId, situationId = "") {
  const { bucket } = getRunBucket();
  const normalizedSituationId = String(situationId || "");
  const statusMap = bucket?.workflow?.sujet_kanban_status;
  const scopedStored = normalizeSujetKanbanStatus(normalizedSituationId ? statusMap?.[normalizedSituationId]?.[sujetId] : null);
  if (scopedStored) return scopedStored;
  const legacyStored = normalizeSujetKanbanStatus(statusMap?.[sujetId]);
  return legacyStored || getDefaultSujetKanbanStatus(sujetId);
}

function getSujetKanbanStatusMeta(sujetId, situationId = "") {
  const key = getSujetKanbanStatus(sujetId, situationId);
  return SUJET_KANBAN_STATUSES.find((status) => status.key === key) || SUJET_KANBAN_STATUSES[0];
}

function renderSujetKanbanStatusBadge(sujetId, situationId = "") {
  const meta = getSujetKanbanStatusMeta(sujetId, situationId);
  const tone = SUJET_KANBAN_BADGE_STYLE[meta.key] || SUJET_KANBAN_BADGE_STYLE.non_active;
  return `<span class="subject-kanban-badge" style="--subject-kanban-badge-bg:${tone.background};--subject-kanban-badge-border:${tone.border};--subject-kanban-badge-text:${tone.text};">${escapeHtml(meta.label)}</span>`;
}

function setSujetKanbanStatus(sujetId, nextStatus, options = {}) {
  const normalized = normalizeSujetKanbanStatus(nextStatus);
  const situationId = String(options.situationId || "");
  if (!sujetId || !normalized || !situationId) return false;

  const previous = getSujetKanbanStatus(sujetId, situationId);
  if (previous === normalized) return false;

  persistRunBucket((bucket) => {
    bucket.workflow = bucket.workflow || { sujet_kanban_status: {} };
    bucket.workflow.sujet_kanban_status = bucket.workflow.sujet_kanban_status || {};
    const statusMap = bucket.workflow.sujet_kanban_status;
    if (typeof statusMap[situationId] !== "object" || Array.isArray(statusMap[situationId])) statusMap[situationId] = {};
    statusMap[situationId][sujetId] = normalized;
    bucket.activities.push({
      ts: options.ts || nowIso(),
      entity_type: "situation",
      entity_id: situationId,
      type: "ACTIVITY",
      kind: "sujet_kanban_status_changed",
      actor: options.actor || "Human",
      agent: options.agent || "human",
      message: "",
      meta: {
        sujet_id: sujetId,
        situation_id: situationId,
        from: previous,
        to: normalized
      }
    });
  });

  return true;
}

function normalizeSubjectObjectiveIds(objectiveIds) {
  const normalized = [...new Set((Array.isArray(objectiveIds) ? objectiveIds : []).map((value) => String(value || "")).filter(Boolean))];
  return normalized.length ? [normalized[0]] : [];
}

function normalizeSubjectSituationIds(situationIds) {
  return [...new Set((Array.isArray(situationIds) ? situationIds : []).map((value) => String(value || "")).filter(Boolean))];
}

function getSubjectSidebarMeta(subjectId) {
  const { bucket } = getRunBucket();
  const subjectMeta = bucket?.subjectMeta?.sujet?.[subjectId] || {};
  const objectiveIds = Array.isArray(subjectMeta.objectiveIds)
    ? normalizeSubjectObjectiveIds(subjectMeta.objectiveIds)
    : normalizeSubjectObjectiveIds(
        getObjectives()
          .filter((objective) => Array.isArray(objective.subjectIds) && objective.subjectIds.includes(String(subjectId || "")))
          .map((objective) => String(objective.id || ""))
          .filter(Boolean)
      );
  const derivedSituationIds = (store.situationsView.data || [])
    .filter((situation) => (situation.sujets || []).some((sujet) => String(sujet?.id || "") === String(subjectId || "")))
    .map((situation) => String(situation.id || ""))
    .filter(Boolean);
  const situationIds = Array.isArray(subjectMeta.situationIds)
    ? normalizeSubjectSituationIds(subjectMeta.situationIds)
    : normalizeSubjectSituationIds(derivedSituationIds);
  return {
    assignees: Array.isArray(subjectMeta.assignees) ? subjectMeta.assignees.map((value) => String(value || "")).filter(Boolean) : [],
    labels: Array.isArray(subjectMeta.labels) ? subjectMeta.labels.map((value) => String(value || "")).filter(Boolean) : [],
    objectiveIds,
    situationIds,
    relations: Array.isArray(subjectMeta.relations) ? subjectMeta.relations.map((value) => String(value || "")).filter(Boolean) : []
  };
}

function getSubjectObjectives(subjectId) {
  const meta = getSubjectSidebarMeta(subjectId);
  return meta.objectiveIds.map((objectiveId) => getObjectiveById(objectiveId)).filter(Boolean);
}

function setSubjectObjectiveIds(subjectId, objectiveIds) {
  const subjectKey = String(subjectId || "");
  const nextIds = normalizeSubjectObjectiveIds(objectiveIds);
  persistRunBucket((bucket) => {
    bucket.subjectMeta = bucket.subjectMeta && typeof bucket.subjectMeta === "object" ? bucket.subjectMeta : {};
    bucket.subjectMeta.sujet = bucket.subjectMeta.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
    const current = bucket.subjectMeta.sujet[subjectKey] && typeof bucket.subjectMeta.sujet[subjectKey] === "object" ? bucket.subjectMeta.sujet[subjectKey] : {};
    bucket.subjectMeta.sujet[subjectKey] = {
      ...current,
      objectiveIds: nextIds
    };

    const objectives = Array.isArray(bucket.objectives) ? bucket.objectives : [];
    objectives.forEach((objective) => {
      const existingIds = Array.isArray(objective?.subjectIds) ? objective.subjectIds.map((value) => String(value || "")).filter(Boolean) : [];
      const filteredIds = existingIds.filter((value) => value !== subjectKey);
      if (nextIds.includes(String(objective?.id || ""))) filteredIds.push(subjectKey);
      objective.subjectIds = [...new Set(filteredIds)];
    });
  });
}

function setSubjectSituationIds(subjectId, situationIds) {
  const subjectKey = String(subjectId || "");
  const nextIds = normalizeSubjectSituationIds(situationIds);
  persistRunBucket((bucket) => {
    bucket.subjectMeta = bucket.subjectMeta && typeof bucket.subjectMeta === "object" ? bucket.subjectMeta : {};
    bucket.subjectMeta.sujet = bucket.subjectMeta.sujet && typeof bucket.subjectMeta.sujet === "object" ? bucket.subjectMeta.sujet : {};
    const current = bucket.subjectMeta.sujet[subjectKey] && typeof bucket.subjectMeta.sujet[subjectKey] === "object" ? bucket.subjectMeta.sujet[subjectKey] : {};
    bucket.subjectMeta.sujet[subjectKey] = {
      ...current,
      situationIds: nextIds
    };
  });
}

function toggleSubjectSituation(subjectId, situationId) {
  const subjectKey = String(subjectId || "");
  const situationKey = String(situationId || "");
  if (!subjectKey || !situationKey) return;
  const meta = getSubjectSidebarMeta(subjectKey);
  const nextIds = meta.situationIds.includes(situationKey)
    ? meta.situationIds.filter((id) => id !== situationKey)
    : [...meta.situationIds, situationKey];
  setSubjectSituationIds(subjectKey, nextIds);
}

function setSubjectObjective(subjectId, objectiveId) {
  const normalizedObjectiveId = String(objectiveId || "").trim();
  setSubjectObjectiveIds(subjectId, normalizedObjectiveId ? [normalizedObjectiveId] : []);
}

const DEFAULT_REVIEW_META = Object.freeze({
  is_seen: false,
  review_state: "pending",
  is_published: false,
  last_published_at: null,
  has_changes_since_publish: false
});

function getEntityByType(entityType, entityId) {
  if (entityType === "avis") return getNestedAvis(entityId);
  if (entityType === "sujet") return getNestedSujet(entityId);
  if (entityType === "situation") return getNestedSituation(entityId);
  return null;
}

function normalizeReviewMeta(meta = {}) {
  return {
    is_seen: !!meta.is_seen,
    review_state: normalizeReviewState(meta.review_state || "pending"),
    is_published: !!meta.is_published,
    last_published_at: meta.last_published_at ? String(meta.last_published_at) : null,
    has_changes_since_publish: !!meta.has_changes_since_publish,
    first_seen_at: meta.first_seen_at ? String(meta.first_seen_at) : null,
    validated_at: meta.validated_at ? String(meta.validated_at) : null,
    rejected_at: meta.rejected_at ? String(meta.rejected_at) : null,
    dismissed_at: meta.dismissed_at ? String(meta.dismissed_at) : null,
    source_verdict: meta.source_verdict ? String(meta.source_verdict) : null,
    effective_verdict: meta.effective_verdict ? String(meta.effective_verdict) : null,
    has_human_edit: !!meta.has_human_edit
  };
}

function getBaseReviewMeta(entity) {
  if (!entity) return { ...DEFAULT_REVIEW_META };

  return normalizeReviewMeta({
    is_seen: entity.is_seen,
    review_state: entity.review_state,
    is_published: entity.is_published,
    last_published_at: entity.last_published_at,
    has_changes_since_publish: entity.has_changes_since_publish
  });
}

function getReviewEntry(entityType, entityId) {
  const { bucket } = getRunBucket();
  return bucket?.review?.[entityType]?.[entityId] || null;
}

function getEntityReviewMeta(entityType, entityId) {
  const entity = getEntityByType(entityType, entityId);
  const base = getBaseReviewMeta(entity);
  const stored = getReviewEntry(entityType, entityId);

  if (!stored) return base;
  return normalizeReviewMeta({ ...base, ...stored });
}

function syncEntityReviewMeta(entityType, entityId) {
  const entity = getEntityByType(entityType, entityId);
  if (!entity) return;

  const meta = getEntityReviewMeta(entityType, entityId);
  entity.is_seen = meta.is_seen;
  entity.review_state = meta.review_state;
  entity.is_published = meta.is_published;
  entity.last_published_at = meta.last_published_at;
  entity.has_changes_since_publish = meta.has_changes_since_publish;

  if (entity.raw && typeof entity.raw === "object") {
    entity.raw.is_seen = meta.is_seen;
    entity.raw.review_state = meta.review_state;
    entity.raw.is_published = meta.is_published;
    entity.raw.last_published_at = meta.last_published_at;
    entity.raw.has_changes_since_publish = meta.has_changes_since_publish;
  }
}

function setEntityReviewMeta(entityType, entityId, patch = {}, options = {}) {
  const ts = options.ts || nowIso();

  persistRunBucket((bucket) => {
    bucket.review = bucket.review || { avis: {}, sujet: {}, situation: {} };
    bucket.review[entityType] = bucket.review[entityType] || {};

    const prev = normalizeReviewMeta({
      ...getEntityReviewMeta(entityType, entityId),
      ...(bucket.review[entityType][entityId] || {})
    });

    bucket.review[entityType][entityId] = {
      ...prev,
      ...(bucket.review[entityType][entityId] || {}),
      ...patch,
      updated_at: ts
    };
  });

  syncEntityReviewMeta(entityType, entityId);
}

function getReviewRestoreSnapshot(entityType, entityId) {
  const entry = getReviewEntry(entityType, entityId);
  if (!entry?.restore_snapshot) return null;
  return normalizeReviewMeta(entry.restore_snapshot);
}

function stashReviewRestoreSnapshot(entityType, entityId, options = {}) {
  if (getReviewRestoreSnapshot(entityType, entityId)) return;
  const snapshot = getEntityReviewMeta(entityType, entityId);
  setEntityReviewMeta(entityType, entityId, {
    restore_snapshot: { ...snapshot }
  }, options);
}

function restoreEntityReviewMeta(entityType, entityId, options = {}) {
  const snapshot = getReviewRestoreSnapshot(entityType, entityId);
  if (!snapshot) return false;

  const ts = options.ts || nowIso();
  persistRunBucket((bucket) => {
    bucket.review = bucket.review || { avis: {}, sujet: {}, situation: {} };
    bucket.review[entityType] = bucket.review[entityType] || {};
    const prev = bucket.review[entityType][entityId] || {};
    bucket.review[entityType][entityId] = {
      ...prev,
      ...snapshot,
      updated_at: ts
    };
    delete bucket.review[entityType][entityId].restore_snapshot;
  });

  syncEntityReviewMeta(entityType, entityId);
  return true;
}

function markEntitySeen(entityType, entityId, options = {}) {
  if (!entityType || !entityId) return;

  const meta = getEntityReviewMeta(entityType, entityId);
  if (meta.is_seen && meta.first_seen_at) return;

  const entity = getEntityByType(entityType, entityId);
  const sourceVerdict = entityType === "avis"
    ? firstNonEmpty(entity?.raw?.verdict, entity?.verdict, meta.source_verdict, null)
    : null;

  setEntityReviewMeta(entityType, entityId, {
    is_seen: true,
    first_seen_at: meta.first_seen_at || nowIso(),
    source_verdict: sourceVerdict
  }, options);
}

function markEntityValidated(entityType, entityId, options = {}) {
  if (!entityType || !entityId) return;

  const meta = getEntityReviewMeta(entityType, entityId);
  const entity = getEntityByType(entityType, entityId);
  const sourceVerdict = entityType === "avis"
    ? firstNonEmpty(entity?.raw?.verdict, entity?.verdict, meta.source_verdict, null)
    : null;
  const effectiveVerdict = entityType === "avis"
    ? firstNonEmpty(store.situationsView.tempAvisVerdict, entity?.verdict, meta.effective_verdict, sourceVerdict, null)
    : null;

  setEntityReviewMeta(entityType, entityId, {
    is_seen: true,
    review_state: "validated",
    first_seen_at: meta.first_seen_at || nowIso(),
    validated_at: nowIso(),
    source_verdict: sourceVerdict,
    effective_verdict: effectiveVerdict,
    has_changes_since_publish: meta.is_published ? true : meta.has_changes_since_publish
  }, options);
}

function canRejectEntity(entityType, entityId) {
  const meta = getEntityReviewMeta(entityType, entityId);
  if (meta.is_published && !meta.has_changes_since_publish) {
    window.alert("Cet élément a déjà été diffusé et ne peut plus être supprimé / rejeté dans son état diffusé.");
    return false;
  }
  return true;
}

function setEntityReviewState(entityType, entityId, nextState, options = {}) {
  const reviewState = normalizeReviewState(nextState);
  if ((reviewState === "rejected" || reviewState === "dismissed") && !canRejectEntity(entityType, entityId)) {
    return false;
  }

  const meta = getEntityReviewMeta(entityType, entityId);

  const entity = getEntityByType(entityType, entityId);
  const sourceVerdict = entityType === "avis"
    ? firstNonEmpty(entity?.raw?.verdict, entity?.verdict, meta.source_verdict, null)
    : null;

  setEntityReviewMeta(entityType, entityId, {
    is_seen: true,
    review_state: reviewState,
    first_seen_at: meta.first_seen_at || nowIso(),
    rejected_at: reviewState === "rejected" ? nowIso() : meta.rejected_at,
    dismissed_at: reviewState === "dismissed" ? nowIso() : meta.dismissed_at,
    source_verdict: sourceVerdict,
    has_changes_since_publish:
      meta.is_published && reviewState !== "published"
        ? true
        : meta.has_changes_since_publish
  }, options);

  return true;
}

function getSelectionEntityType(type) {
  return type === "sujet" ? "sujet" : type;
}

function getReviewTitleStateClass(entityType, entityId) {
  const meta = getEntityReviewMeta(entityType, entityId);
  return meta.is_seen ? "is-seen" : "is-unseen";
}

function renderEntityReviewLeadIcon(entityType, entityId) {
  const meta = getEntityReviewMeta(entityType, entityId);
  const normalizedType = String(entityType || "").toLowerCase();
  const normalizedState = normalizeReviewState(meta.review_state);

  if ((normalizedType === "sujet" || normalizedType === "situation")
    && (normalizedState === "rejected" || normalizedState === "dismissed")) {
    return "";
  }

  return renderReviewStateIcon(meta.review_state, {
    entityType,
    isPublished: meta.is_published,
    hasChangesSincePublish: meta.has_changes_since_publish,
    isSeen: meta.is_seen
  });
}


function getDescriptionDefaults(selectionOrType, entityId = null) {
  let selection = null;
  let entityType = selectionOrType;
  let id = entityId;

  if (selectionOrType && typeof selectionOrType === "object" && selectionOrType.type) {
    selection = selectionOrType;
    entityType = getSelectionEntityType(selection.type);
    id = selection.item?.id || entityId;
  }

  const entity = selection?.item || getEntityByType(entityType, id);
  const body =
    entityType === "avis"
      ? getAvisSummary(entity)
      : entityType === "sujet"
        ? getSujetSummary(entity)
        : getSituationSummary(entity);

  return {
    body: String(body || ""),
    author: firstNonEmpty(entity?.agent, entity?.raw?.agent, "system"),
    agent: String(firstNonEmpty(entity?.agent, entity?.raw?.agent, "system")).toLowerCase(),
    avatar_type: "agent",
    avatar_initial:
      entityType === "avis"
        ? "A"
        : entityType === "sujet"
          ? "P"
          : "S"
  };
}

function getEntityDescriptionState(selectionOrType, entityId = null) {
  const { bucket } = getRunBucket();
  let selection = null;
  let entityType = selectionOrType;
  let id = entityId;

  if (selectionOrType && typeof selectionOrType === "object" && selectionOrType.type) {
    selection = selectionOrType;
    entityType = getSelectionEntityType(selection.type);
    id = selection.item?.id || entityId;
  }

  const defaults = getDescriptionDefaults(selection || entityType, id);
  const stored = bucket?.descriptions?.[entityType]?.[id] || {};
  return {
    ...defaults,
    ...stored,
    body: firstNonEmpty(stored.body, defaults.body, ""),
    author: firstNonEmpty(stored.author, defaults.author, "system"),
    agent: String(firstNonEmpty(stored.agent, defaults.agent, "system")).toLowerCase(),
    avatar_type: firstNonEmpty(stored.avatar_type, defaults.avatar_type, "agent"),
    avatar_initial: firstNonEmpty(stored.avatar_initial, defaults.avatar_initial, "S")
  };
}

function setEntityDescriptionState(entityType, entityId, patch = {}, options = {}) {
  const ts = options.ts || nowIso();
  persistRunBucket((bucket) => {
    bucket.descriptions = bucket.descriptions || { avis: {}, sujet: {}, situation: {} };
    bucket.descriptions[entityType] = bucket.descriptions[entityType] || {};
    const prev = getEntityDescriptionState(entityType, entityId);
    const nextBody = firstNonEmpty(patch.body, prev.body, "");
    const nextAgent = String(firstNonEmpty(patch.agent, prev.agent, "system")).toLowerCase();
    const isHumanEdited = Boolean(
      bucket.descriptions[entityType][entityId]?.is_human_edited
      || (nextAgent === "human" && String(nextBody || "").trim() !== String(prev.body || "").trim())
    );
    bucket.descriptions[entityType][entityId] = {
      ...prev,
      ...(bucket.descriptions[entityType][entityId] || {}),
      ...patch,
      is_human_edited: isHumanEdited,
      updated_at: ts
    };
  });

  if (entityType === "avis") {
    const entity = getEntityByType(entityType, entityId);
    const meta = getEntityReviewMeta(entityType, entityId);
    setEntityReviewMeta(entityType, entityId, {
      has_human_edit: Boolean(getRunBucket().bucket?.descriptions?.[entityType]?.[entityId]?.is_human_edited),
      source_verdict: firstNonEmpty(entity?.raw?.verdict, entity?.verdict, meta.source_verdict, null)
    }, options);
  }
}

function claimDescriptionAsHuman(entityType, entityId, options = {}) {
  const current = getEntityDescriptionState(entityType, entityId);
  if (String(current.agent || "").toLowerCase() === "human" && current.avatar_type === "human") return false;

  setEntityDescriptionState(entityType, entityId, {
    body: current.body,
    author: "human",
    agent: "human",
    avatar_type: "human",
    avatar_initial: "H"
  }, options);

  return true;
}

function addComment(entityType, entityId, message, options = {}) {
  persistRunBucket((bucket) => {
    bucket.comments.push({
      ts: nowIso(),
      entity_type: entityType,
      entity_id: entityId,
      type: "COMMENT",
      actor: options.actor || "Human",
      agent: options.agent || "human",
      message: String(message || ""),
      pending: !!options.pending,
      request_id: options.request_id || null,
      meta: options.meta || {}
    });
  });
}

function addActivity(entityType, entityId, kind, message = "", meta = {}, options = {}) {
  persistRunBucket((bucket) => {
    bucket.activities.push({
      ts: nowIso(),
      entity_type: entityType,
      entity_id: entityId,
      type: "ACTIVITY",
      kind,
      actor: options.actor || "Human",
      agent: options.agent || "human",
      message: String(message || ""),
      meta: meta || {}
    });
  });
}

function _extractValidatedVerdict(decision) {
  const d = String(decision || "").toUpperCase();
  const m = d.match(/^VALIDATED_(F|D|S|HM|PM|SO)$/);
  return m ? m[1] : null;
}

function _decisionStatus(decision) {
  const d = String(decision || "").toUpperCase();
  if (d === "CLOSED") return "closed";
  if (d === "REOPENED" || d === "OPEN") return "open";
  return null;
}

function setDecision(entityType, entityId, decision, note = "", options = {}) {
  const actor = options.actor || "Human";
  const agent = options.agent || "human";
  const ts = options.ts || nowIso();
  const nextDecision = String(decision || "");
  const nextNote = String(note || "");

  persistRunBucket((bucket) => {
    bucket.decisions[entityType] = bucket.decisions[entityType] || {};
    const prev = bucket.decisions[entityType][entityId] || null;
    bucket.decisions[entityType][entityId] = {
      ts,
      actor,
      decision: nextDecision,
      note: nextNote
    };

    const prevStatus = _decisionStatus(prev?.decision);
    const nextStatus = _decisionStatus(nextDecision);
    if ((entityType === "sujet" || entityType === "situation") && nextStatus && nextStatus !== prevStatus) {
      const targetType = entityType === "sujet" ? "situation" : "situation";
      const parentSituation = entityType === "sujet" ? getSituationBySujetId(entityId) : null;
      const targetId = entityType === "sujet" ? (parentSituation?.id || entityId) : entityId;
      bucket.activities.push({
        ts,
        entity_type: targetType,
        entity_id: targetId,
        type: "ACTIVITY",
        kind: nextStatus === "closed" ? "issue_closed" : "issue_reopened",
        actor,
        agent,
        message: nextNote,
        meta: entityType === "sujet" ? { problem_id: entityId } : { situation_id: entityId }
      });
    }

    if (entityType === "avis") {
      const fromVerdict = _extractValidatedVerdict(prev?.decision);
      const toVerdict = _extractValidatedVerdict(nextDecision);
      if (toVerdict && toVerdict !== fromVerdict) {
        const parentSujet = getSujetByAvisId(entityId);
        bucket.activities.push({
          ts,
          entity_type: parentSujet?.id ? "sujet" : "avis",
          entity_id: parentSujet?.id || entityId,
          type: "ACTIVITY",
          kind: "avis_verdict_changed",
          actor,
          agent,
          message: nextNote,
          meta: { avis_id: entityId, from: fromVerdict, to: toVerdict }
        });
      }
    }
  });
}

function getDecision(entityType, entityId) {
  const { bucket } = getRunBucket();
  return bucket?.decisions?.[entityType]?.[entityId] || null;
}

export function getEffectiveAvisVerdict(avisId) {
  const avis = getNestedAvis(avisId);
  const decision = getDecision("avis", avisId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d.startsWith("VALIDATED_")) return d.replace("VALIDATED_", "");
  return normalizeVerdict(avis?.verdict) || "-";
}

function updateCommentByRequestId(requestId, nextMessage, options = {}) {
  if (!requestId) return;
  persistRunBucket((bucket) => {
    const comments = Array.isArray(bucket.comments) ? bucket.comments : [];
    const target = [...comments].reverse().find((entry) => String(entry?.request_id || "") === String(requestId));
    if (!target) return;
    target.message = String(nextMessage || "");
    target.pending = !!options.pending;
    if (options.agent) target.agent = options.agent;
    if (options.actor) target.actor = options.actor;
  });
}

function stripRapsoTag(text) {
  return String(text || "").replace(/@rapso\b/gi, "").replace(/\s{2,}/g, " ").trim();
}

function isHelpTrigger(text) {
  const t = String(text || "").trim();
  return /^\/help\b/i.test(t) || /^@help\b/i.test(t);
}

function stripHelpTag(text) {
  return String(text || "")
    .replace(/^\s*\/help\b\s*/i, "")
    .replace(/^\s*@help\b\s*/i, "")
    .trim();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 120000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function showError(message) {
  console.error(message);
}

function buildUiSnapshot({ scope = "unknown", type = null, id = null } = {}) {
  return {
    scope,
    now: nowIso(),
    display_depth: store.situationsView.displayDepth || "situations",
    filters: {
      verdict: store.situationsView.verdictFilter || "ALL",
      search: store.situationsView.search || ""
    },
    selection: {
      situation_id: store.situationsView.selectedSituationId || null,
      sujet_id: store.situationsView.selectedSujetId || null,
      avis_id: store.situationsView.selectedAvisId || null,
      type: type || null,
      id: id || null
    }
  };
}

function buildRapsoContextBundle(type, id, humanMessage) {
  const rawResult = store.situationsView?.rawResult || null;
  const nestedData = Array.isArray(store.situationsView?.data) ? store.situationsView.data : null;
  if (!rawResult && !nestedData) return null;

  const localType = String(type || "");
  const rapsoType = localType === "sujet" ? "problem" : localType;
  const scope = { type: rapsoType, id };

  const situationsRaw = Array.isArray(rawResult?.situations) ? rawResult.situations : [];
  const problemsRaw = Array.isArray(rawResult?.problems) ? rawResult.problems : [];
  const avisRaw = Array.isArray(rawResult?.avis) ? rawResult.avis : [];

  const summarizeOneLine = (value, maxLen = 220) => {
    const t = String(value || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    return t.length > maxLen ? `${t.slice(0, Math.max(0, maxLen - 1)).trim()}…` : t;
  };

  const idFromAny = (value) => {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") {
      return firstNonEmpty(
        value.avis_id,
        value.problem_id,
        value.situation_id,
        value.id,
        value.uid,
        value.pk,
        ""
      );
    }
    return "";
  };

  const situationById = new Map();
  for (const situation of situationsRaw) {
    const situationId = firstNonEmpty(situation?.situation_id, situation?.id);
    if (situationId) situationById.set(String(situationId), situation);
  }

  const problemById = new Map();
  for (const problem of problemsRaw) {
    const problemId = firstNonEmpty(problem?.problem_id, problem?.id);
    if (problemId) problemById.set(String(problemId), problem);
  }

  const avisById = new Map();
  for (const avisEntry of avisRaw) {
    const avisId = firstNonEmpty(avisEntry?.avis_id, avisEntry?.id);
    if (avisId) avisById.set(String(avisId), avisEntry);
  }

  const situationNested = localType === "situation"
    ? getNestedSituation(id)
    : (localType === "sujet" ? getSituationBySujetId(id) : getSituationByAvisId(id));
  const problemNested = localType === "sujet"
    ? getNestedSujet(id)
    : (localType === "avis" ? getSujetByAvisId(id) : null);
  const avisNested = localType === "avis" ? getNestedAvis(id) : null;

  const rawSituationId = firstNonEmpty(
    situationNested?.raw?.situation_id,
    situationNested?.raw?.id,
    situationNested?.id,
    ""
  );
  const rawProblemId = firstNonEmpty(
    problemNested?.raw?.problem_id,
    problemNested?.raw?.id,
    problemNested?.id,
    ""
  );
  const rawAvisId = firstNonEmpty(
    avisNested?.raw?.avis_id,
    avisNested?.raw?.id,
    avisNested?.id,
    ""
  );

  const currentSituation = rawSituationId
    ? (situationById.get(String(rawSituationId)) || situationNested?.raw || null)
    : (situationNested?.raw || null);
  const currentProblem = rawProblemId
    ? (problemById.get(String(rawProblemId)) || problemNested?.raw || null)
    : (problemNested?.raw || null);
  const currentAvis = rawAvisId
    ? (avisById.get(String(rawAvisId)) || avisNested?.raw || null)
    : (avisNested?.raw || null);

  const situationLite = (s) => s ? ({
    situation_id: firstNonEmpty(s.situation_id, s.id, rawSituationId, ""),
    status: String(
      getEffectiveSituationStatus(firstNonEmpty(s.situation_id, s.id, rawSituationId, "")) || firstNonEmpty(s.status, "open")
    ).toLowerCase(),
    title: firstNonEmpty(s.title, s.label, s.name, s.situation, s.topic, rawSituationId, "(sans titre)"),
    summary: summarizeOneLine(firstNonEmpty(s.summary, s.description, s.message, ""), 220),
    priority: firstNonEmpty(s.priority, s.prio, "")
  }) : null;

  const problemLite = (p) => p ? ({
    sujet_id: firstNonEmpty(p.problem_id, p.id, rawProblemId, ""),
    status: String(
      getEffectiveSujetStatus(firstNonEmpty(p.problem_id, p.id, rawProblemId, "")) || firstNonEmpty(p.status, "open")
    ).toLowerCase(),
    topic: firstNonEmpty(p.topic, p.title, p.label, p.name, p.problem, "Non classé"),
    summary: summarizeOneLine(firstNonEmpty(p.summary, p.why_grouped, p.description, ""), 220),
    priority: firstNonEmpty(p.priority, p.prio, "")
  }) : null;

  const avisFull = (a, fallbackId = "") => a ? ({
    avis_id: firstNonEmpty(a.avis_id, a.id, fallbackId, ""),
    topic: firstNonEmpty(a.topic, a.title, a.label, a.name, ""),
    verdict: getEffectiveAvisVerdict(firstNonEmpty(a.avis_id, a.id, fallbackId, "")),
    severity: firstNonEmpty(a.severity, ""),
    confidence: a.confidence ?? null,
    source: firstNonEmpty(a.source, ""),
    agent: firstNonEmpty(a.agent, currentProblem?.agent, problemNested?.agent, "system"),
    message: firstNonEmpty(a.message, a.summary, ""),
    evidence: a.evidence ?? null
  }) : null;

  const avisLite = (a, fallbackId = "") => a ? ({
    avis_id: firstNonEmpty(a.avis_id, a.id, fallbackId, ""),
    verdict: getEffectiveAvisVerdict(firstNonEmpty(a.avis_id, a.id, fallbackId, "")),
    severity: firstNonEmpty(a.severity, ""),
    summary: summarizeOneLine(firstNonEmpty(a.topic, a.title, a.message, a.summary, ""), 140)
  }) : null;

  const thread_recent = (() => {
    const { bucket } = getRunBucket();
    const comments = Array.isArray(bucket?.comments) ? bucket.comments : [];
    return comments
      .filter((entry) => String(entry?.type || "").toUpperCase() === "COMMENT")
      .filter((entry) => String(entry?.entity_type || "") === String(localType) && String(entry?.entity_id || "") === String(id))
      .slice(-10)
      .map((entry) => ({
        ts: entry.ts,
        actor: entry.actor,
        agent: entry.agent,
        message: entry.message
      }));
  })();

  const cadre = {
    description: [
      "RAPSOBOT est un PoC qui structure une analyse CT en hiérarchie Situation → Sujet → Avis, à partir d'une note de calcul PS.",
      "specialist_ps agit comme conseiller technique en mission PS (Eurocode 8 + NA FR + Arrêté 22/10/2010), en appui à la décision.",
      "Les verdicts D/S/OK qualifient le niveau de conformité / risque (D = non-conformité ou risque majeur ; S = point bloquant/incomplet à clarifier ; OK = conforme).",
      "Ne pas 'modifier' les avis : proposer des corrections, préciser hypothèses, et recommander les actions/compléments à produire."
    ].join("\n"),
    response_format: {
      required_sections: [
        "1. Analyse technique",
        "2. Risque identifié",
        "3. Impact projet",
        "4. Recommandations (actions + références EC8 si pertinent)"
      ],
      style: "Précis, factuel, orienté décision. Citer EC8/NA si utile. Pas de blabla."
    }
  };

  let context_structured = null;

  if (localType === "avis") {
    const parentSituation = situationLite(currentSituation);
    const parentProblem = problemLite(currentProblem);
    const curAvis = avisFull(currentAvis, rawAvisId);

    const siblingIds = Array.isArray(currentProblem?.avis_ids) ? currentProblem.avis_ids : [];
    const avis_freres = siblingIds
      .map((avisId) => {
        const cleanId = idFromAny(avisId);
        return { cleanId, raw: avisById.get(String(cleanId)) || null };
      })
      .filter((entry) => entry.raw)
      .filter((entry) => String(entry.cleanId) !== String(rawAvisId))
      .map((entry) => avisLite(entry.raw, entry.cleanId))
      .slice(0, 50);

    const hierarchy_text = [
      "PROJET",
      parentSituation ? `  Situation ${parentSituation.situation_id} (${parentSituation.status})` : "  Situation —",
      parentProblem ? `    Sujet ${parentProblem.sujet_id} (${parentProblem.status})` : "    Sujet —",
      curAvis ? `      Avis ${curAvis.avis_id} (${curAvis.verdict || "—"})` : "      Avis —"
    ].join("\n");

    context_structured = {
      hierarchy_text,
      situation: parentSituation,
      sujet: parentProblem,
      avis: curAvis,
      avis_freres
    };
  } else if (localType === "sujet") {
    const parentSituation = situationLite(currentSituation);
    const curProblem = currentProblem ? ({
      ...problemLite(currentProblem),
      stakes: Array.isArray(currentProblem.stakes) ? currentProblem.stakes.slice(0, 10) : [],
      recommendations: Array.isArray(currentProblem.recommendations) ? currentProblem.recommendations.slice(0, 10) : [],
      why_grouped: firstNonEmpty(currentProblem.why_grouped, "")
    }) : null;

    const childIds = Array.isArray(currentProblem?.avis_ids) ? currentProblem.avis_ids : [];
    const avisChildrenAll = childIds
      .map((avisId) => {
        const cleanId = idFromAny(avisId);
        return { cleanId, raw: avisById.get(String(cleanId)) || null };
      })
      .filter((entry) => entry.raw);

    const avis_fils = avisChildrenAll.length <= 5
      ? avisChildrenAll.map((entry) => avisFull(entry.raw, entry.cleanId))
      : avisChildrenAll.map((entry) => avisLite(entry.raw, entry.cleanId));

    const hierarchy_text = [
      "PROJET",
      parentSituation ? `  Situation ${parentSituation.situation_id} (${parentSituation.status})` : "  Situation —",
      curProblem ? `    Sujet ${curProblem.sujet_id} (${curProblem.status})` : "    Sujet —"
    ].join("\n");

    context_structured = {
      hierarchy_text,
      situation: parentSituation,
      sujet: curProblem,
      avis_fils
    };
  } else if (localType === "situation") {
    const curSituation = currentSituation ? ({
      ...situationLite(currentSituation),
      key_conflict_ids: Array.isArray(currentSituation.key_conflict_ids) ? currentSituation.key_conflict_ids.slice(0, 25) : []
    }) : null;

    const problemIds = Array.isArray(currentSituation?.problem_ids) ? currentSituation.problem_ids : [];
    const sujets_fils = problemIds
      .map((problemId) => {
        const cleanId = idFromAny(problemId);
        const rawProblem = problemById.get(String(cleanId)) || null;
        if (!rawProblem) return null;
        const avisIds = Array.isArray(rawProblem.avis_ids) ? rawProblem.avis_ids : [];
        let dCount = 0;
        let sCount = 0;
        let okCount = 0;
        for (const avisId of avisIds) {
          const v = String(getEffectiveAvisVerdict(idFromAny(avisId)) || "").toUpperCase();
          if (v === "D") dCount += 1;
          else if (v === "S") sCount += 1;
          else if (v === "OK" || v === "F") okCount += 1;
        }
        return {
          sujet_id: firstNonEmpty(rawProblem.problem_id, rawProblem.id, cleanId, ""),
          status: String(
            getEffectiveSujetStatus(firstNonEmpty(rawProblem.problem_id, rawProblem.id, cleanId, "")) || firstNonEmpty(rawProblem.status, "open")
          ).toLowerCase(),
          topic: firstNonEmpty(rawProblem.topic, rawProblem.title, rawProblem.label, rawProblem.name, "Non classé"),
          nb_avis: avisIds.length,
          ratio_D_S_OK: `${dCount}/${sCount}/${okCount}`,
          description: summarizeOneLine(firstNonEmpty(rawProblem.summary, rawProblem.why_grouped, rawProblem.description, ""), 180)
        };
      })
      .filter(Boolean)
      .slice(0, 80);

    const hierarchy_text = [
      "PROJET",
      curSituation ? `  Situation ${curSituation.situation_id} (${curSituation.status})` : "  Situation —"
    ].join("\n");

    context_structured = {
      hierarchy_text,
      situation: curSituation,
      sujets_fils
    };
  } else {
    context_structured = { hierarchy_text: "PROJET" };
  }

  return {
    run_id: firstNonEmpty(rawResult?.run_id, rawResult?.runId, store.ui?.runId, null),
    agent: "specialist_ps",
    scope,
    cadre,
    context_structured,
    thread_recent,
    user_message: stripRapsoTag(humanMessage)
  };
}

function _extractJsonFromFencedBlock(s) {
  const t = String(s || "").trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return m ? String(m[1] || "").trim() : null;
}

function _tryParseJson(s) {
  const t = String(s || "").trim();
  if (!t) return null;
  try { return JSON.parse(t); } catch { return null; }
}

function _unwrapOpenAIResponsesText(out) {
  try {
    if (!out || typeof out !== "object") return null;
    const arr = Array.isArray(out.output) ? out.output : null;
    if (!arr?.length) return null;
    const msg = arr.find((x) => x && x.type === "message") || arr[0];
    const content = Array.isArray(msg?.content) ? msg.content : null;
    if (!content?.length) return null;
    const ot = content.find((c) => c && (c.type === "output_text" || c.type === "text")) || content[0];
    const t = typeof ot?.text === "string" ? ot.text : null;
    return t && t.trim() ? t : null;
  } catch {
    return null;
  }
}

function _normalizeLlmRawToObject(rawText) {
  const direct = _tryParseJson(rawText);
  if (direct) return direct;
  const inner = _extractJsonFromFencedBlock(rawText);
  if (inner) {
    const obj = _tryParseJson(inner);
    if (obj) return obj;
  }
  const t = String(rawText || "").trim();
  const i = t.indexOf("{");
  const j = t.lastIndexOf("}");
  if (i >= 0 && j > i) {
    const obj = _tryParseJson(t.slice(i, j + 1));
    if (obj) return obj;
  }
  return null;
}

function _pickReplyMarkdown(out, rawText) {
  if (out && typeof out === "object") {
    const r = out.reply_markdown ?? out.reply ?? out.message ?? out.content ?? "";
    if (typeof r === "string" && r.trim()) return r.trim();
    const wrapped = _unwrapOpenAIResponsesText(out);
    if (wrapped) {
      const obj = _normalizeLlmRawToObject(wrapped);
      if (obj) return _pickReplyMarkdown(obj, null);
      return wrapped.trim();
    }
  }
  const obj = rawText ? _normalizeLlmRawToObject(rawText) : null;
  if (obj) return _pickReplyMarkdown(obj, null);
  return String(rawText || "").trim();
}

function _helpFurtiveCommentHtml({ role = "assistant", bodyMd = "", pending = false } = {}) {
  const who = role === "user" ? "Vous (Help)" : "Rapso (Help)";
  const tsHtml = `<div class="mono-small">${escapeHtml(fmtTs(nowIso()))}</div>`;
  const cleanMd = String(bodyMd || "").replace(/^_+|_+$/g, "");
  const bodyHtml = pending
    ? `<div><div class="rapso-wait"><span class="rapso-spinner" aria-hidden="true"></span><span class="rapso-shimmer">${escapeHtml(cleanMd || "RAPSOBOT réfléchit…")}</span></div></div>`
    : mdToHtml(cleanMd);

  return renderMessageThreadComment({
    author: who,
    tsHtml,
    bodyHtml,
    avatarType: role === "user" ? "human" : "agent",
    avatarHtml: role === "user" ? SVG_AVATAR_HUMAN : "",
    avatarInitial: role === "user" ? "H" : "R",
    boxClassName: "gh-comment-box--help",
    headerClassName: "gh-comment-header--help",
    bodyClassName: "gh-comment-body--help"
  });
}

function showEphemeralHelpThread(rootEl, { userMd, assistantPendingMd = "RAPSOBOT réfléchit…", ttlMs = 60000 } = {}) {
  if (!rootEl) return null;
  const anchor = rootEl.querySelector(".gh-thread") || rootEl;
  const wrap = document.createElement("div");
  wrap.className = "help-ephemeral";
  wrap.innerHTML = `${_helpFurtiveCommentHtml({ role: "user", bodyMd: userMd || "" })}<div class="help-ephemeral__reply">${_helpFurtiveCommentHtml({ role: "assistant", bodyMd: assistantPendingMd || "", pending: true })}</div>`;
  try {
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
    else rootEl.appendChild(wrap);
  } catch {
    try { rootEl.appendChild(wrap); } catch {}
  }
  const timer = setTimeout(() => { try { wrap.remove(); } catch {} }, ttlMs);
  return { wrap, timer };
}

async function askRapsoAndAppendReply({ type, id, humanMessage }) {
  const ctx = buildRapsoContextBundle(type, id, humanMessage);
  if (!ctx) return;
  const requestId = `rapso_${Date.now()}_${type}_${id}`;
  addComment(type, id, "RAPSOBOT est en train de réfléchir…", {
    actor: "RAPSOBOT",
    agent: "specialist_ps",
    pending: true,
    request_id: requestId,
    meta: { from_webhook: true }
  });
  rerenderPanels();
  const payload = { agent: "specialist_ps", request_id: requestId, context: ctx };
  try {
    const res = await fetchWithTimeout(ASK_LLM_URL_PROD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, 120000);
    const txt = await res.text();
    let out = null;
    try { out = JSON.parse(txt); } catch { out = null; }
    const reply = _pickReplyMarkdown(out, txt) || "_(no reply)_";
    updateCommentByRequestId(requestId, reply, { pending: false, actor: "RAPSOBOT", agent: "specialist_ps" });
    rerenderPanels();
  } catch (e) {
    const errMsg = e?.message || String(e);
    updateCommentByRequestId(requestId, `_(error: ${errMsg})_`, { pending: false, actor: "RAPSOBOT", agent: "specialist_ps" });
    rerenderPanels();
    showError(`@rapso: échec de l'appel LLM (${errMsg})`);
  }
}

async function askHelpEphemeral({ rootEl, type, id, humanMessage, scope = "details" } = {}) {
  const raw = String(humanMessage || "").trim();
  const q = stripHelpTag(raw) || "Explique-moi ce que je peux faire ici.";
  const ctx = buildRapsoContextBundle(type, id, q);
  if (!ctx) return;
  ctx.help_mode = true;
  ctx.ui_snapshot = buildUiSnapshot({ scope, type, id });
  ctx.user_message = [
    "MODE_HELP: explique au format:",
    "1) Où suis-je (type + id + statut/verdict si dispo)",
    "2) Actions possibles ici",
    "3) Exemples de commandes courtes",
    "",
    q
  ].join("");
  const ui = showEphemeralHelpThread(rootEl, { userMd: q });
  if (!ui) return;
  const requestId = `help_${Date.now()}_${type}_${id}`;
  const payload = { agent: "specialist_ps", request_id: requestId, context: ctx };
  try {
    const res = await fetchWithTimeout(ASK_LLM_URL_PROD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, 120000);
    const txt = await res.text();
    let out = null;
    try { out = JSON.parse(txt); } catch { out = null; }
    const reply = _pickReplyMarkdown(out, txt) || "_(no reply)_";
    const slot = ui.wrap.querySelector(".help-ephemeral__reply");
    if (slot) slot.innerHTML = _helpFurtiveCommentHtml({ role: "assistant", bodyMd: reply, pending: false });
  } catch (e) {
    const errMsg = e?.message || String(e);
    const slot = ui.wrap.querySelector(".help-ephemeral__reply");
    if (slot) slot.innerHTML = _helpFurtiveCommentHtml({ role: "assistant", bodyMd: `_(error: ${errMsg})_`, pending: false });
    showError(`Help: échec de l'appel LLM (${errMsg})`);
  }
}

export function getEffectiveSujetStatus(sujetId) {
  const sujet = getNestedSujet(sujetId);
  const decision = getDecision("sujet", sujetId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d === "CLOSED") return "closed";
  if (d === "REOPENED") return "open";
  return firstNonEmpty(sujet?.status, "open").toLowerCase();
}

export function getEffectiveSituationStatus(situationId) {
  const situation = getNestedSituation(situationId);
  const decision = getDecision("situation", situationId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d === "CLOSED") return "closed";
  if (d === "REOPENED") return "open";
  return firstNonEmpty(situation?.status, "open").toLowerCase();
}

/* =========================================================
   Data access
========================================================= */

function getFilteredSituations() {
  const verdictFilter = String(store.situationsView.verdictFilter || "ALL").toUpperCase();
  const query = String(store.situationsView.search || "").trim().toLowerCase();
  const situations = store.situationsView.data || [];
  return situations.filter((situation) => situationMatchesFilters(situation, query, verdictFilter));
}

function avisMatchesFilters(avis, query, verdictFilter) {
  if (!avis) return false;

  const matchesSearch = matchSearch(
    [
      avis.id,
      avis.title,
      avis.verdict,
      avis.priority,
      avis.status,
      avis.agent,
      avis.raw?.message,
      avis.raw?.summary,
      avis.raw?.topic,
      avis.raw?.title,
      avis.raw?.label
    ],
    query
  );

  if (!matchesSearch) return false;
  if (verdictFilter === "ALL") return true;
  return normalizeVerdict(getEffectiveAvisVerdict(avis.id)) === verdictFilter;
}

function situationMatchesFilters(situation, query, verdictFilter) {
  const situationTextMatch = matchSearch(
    [
      situation.id,
      situation.title,
      situation.priority,
      situation.status,
      situation.raw?.summary,
      situation.raw?.topic,
      situation.raw?.category,
      situation.raw?.title
    ],
    query
  );

  if (situationTextMatch && verdictFilter === "ALL") return true;

  for (const sujet of getSituationSubjects(situation)) {
    const sujetTextMatch = matchSearch(
      [
        sujet.id,
        sujet.title,
        sujet.priority,
        sujet.status,
        sujet.agent,
        sujet.raw?.summary,
        sujet.raw?.topic,
        sujet.raw?.category,
        sujet.raw?.title
      ],
      query
    );

    if (sujetTextMatch) {
      if (verdictFilter === "ALL") return true;
      if ((sujet.avis || []).some((avis) => normalizeVerdict(getEffectiveAvisVerdict(avis.id)) === verdictFilter)) return true;
    }

    for (const avis of sujet.avis || []) {
      if (avisMatchesFilters(avis, query, verdictFilter)) return true;
    }
  }

  return situationTextMatch;
}


function getCurrentSubjectsStatusFilter() {
  ensureViewUiState();
  const value = String(store.situationsView.subjectsStatusFilter || "open").toLowerCase();
  return value === "closed" ? "closed" : "open";
}

function sujetMatchesStatusFilter(sujet, statusFilter = getCurrentSubjectsStatusFilter()) {
  const effectiveStatus = String(getEffectiveSujetStatus(sujet?.id) || sujet?.status || "open").toLowerCase();
  return statusFilter === "closed" ? effectiveStatus !== "open" : effectiveStatus === "open";
}

function getSubjectsStatusCounts(query = "") {
  let open = 0;
  let closed = 0;
  for (const situation of store.situationsView.data || []) {
    for (const sujet of getSituationSubjects(situation)) {
      const matchesSearch = matchSearch([
        situation?.id,
        situation?.title,
        sujet?.id,
        sujet?.title,
        sujet?.priority,
        sujet?.status,
        sujet?.agent,
        sujet?.raw?.summary,
        sujet?.raw?.topic,
        sujet?.raw?.category,
        sujet?.raw?.title
      ], query);
      if (!matchesSearch) continue;
      if (sujetMatchesStatusFilter(sujet, "closed")) closed += 1;
      else open += 1;
    }
  }
  return { open, closed };
}

function renderSubjectsStatusHeadHtml() {
  const current = getCurrentSubjectsStatusFilter();
  const query = String(store.situationsView.search || "").trim().toLowerCase();
  const counts = getSubjectsStatusCounts(query);
  return renderTableHeadFilterToggle({
    activeValue: current,
    items: [
      { label: "Ouverts", value: "open", count: counts.open, dataAttr: "subjects-status-filter" },
      { label: "Fermés", value: "closed", count: counts.closed, dataAttr: "subjects-status-filter" }
    ]
  });
}

function getVisibleCounts(filteredSituations) {
  let sujets = 0;
  let avis = 0;
  for (const situation of filteredSituations) {
    sujets += getSituationSubjects(situation).length;
    for (const sujet of getSituationSubjects(situation)) avis += (sujet.avis || []).length;
  }
  return { situations: filteredSituations.length, sujets, avis };
}

function getNestedSituation(situationId) {
  return (store.situationsView.data || []).find((s) => s.id === situationId) || null;
}

function getCanonicalSujetById(problemId) {
  for (const situation of store.situationsView.data || []) {
    const match = getSituationSubjects(situation).find((sujet) => sujet.id === problemId);
    if (match) return match;
  }
  return null;
}

function getSituationSubjects(situation) {
  const situationId = String(situation?.id || "");
  const { bucket } = getRunBucket();
  const metaMap = bucket?.subjectMeta?.sujet && typeof bucket.subjectMeta.sujet === "object"
    ? bucket.subjectMeta.sujet
    : {};

  const base = (Array.isArray(situation?.sujets) ? situation.sujets : []).filter((sujet) => {
    const meta = metaMap[String(sujet?.id || "")];
    if (!Array.isArray(meta?.situationIds)) return true;
    return normalizeSubjectSituationIds(meta.situationIds).includes(situationId);
  });
  const existingIds = new Set(base.map((sujet) => String(sujet?.id || "")).filter(Boolean));
  if (!situationId) return base;

  for (const [subjectId, meta] of Object.entries(metaMap)) {
    const linkedIds = normalizeSubjectSituationIds(meta?.situationIds);
    if (!linkedIds.includes(situationId) || existingIds.has(subjectId)) continue;
    const canonical = getCanonicalSujetById(subjectId);
    if (!canonical) continue;
    base.push(canonical);
    existingIds.add(subjectId);
  }

  return base;
}

function getNestedSujet(problemId) {
  return getCanonicalSujetById(problemId);
}

function getNestedAvis(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of getSituationSubjects(situation)) {
      const match = (sujet.avis || []).find((avis) => avis.id === avisId);
      if (match) return match;
    }
  }
  return null;
}

function getSituationBySujetId(problemId) {
  for (const situation of store.situationsView.data || []) {
    if (getSituationSubjects(situation).some((sujet) => sujet.id === problemId)) return situation;
  }
  return null;
}

function getSituationByAvisId(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of getSituationSubjects(situation)) {
      if ((sujet.avis || []).some((avis) => avis.id === avisId)) return situation;
    }
  }
  return null;
}

function getSujetByAvisId(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of getSituationSubjects(situation)) {
      if ((sujet.avis || []).some((avis) => avis.id === avisId)) return sujet;
    }
  }
  return null;
}

function getActiveSelection() {
  if (store.situationsView.selectedAvisId) {
    const avis = getNestedAvis(store.situationsView.selectedAvisId);
    if (avis) return { type: "avis", item: avis };
  }
  if (store.situationsView.selectedSujetId) {
    const sujet = getNestedSujet(store.situationsView.selectedSujetId);
    if (sujet) return { type: "sujet", item: sujet };
  }
  if (store.situationsView.selectedSituationId) {
    const situation = getNestedSituation(store.situationsView.selectedSituationId);
    if (situation) return { type: "situation", item: situation };
  }
  const firstSituation = (store.situationsView.data || [])[0] || null;
  return firstSituation ? { type: "situation", item: firstSituation } : null;
}

/* =========================================================
   Effective counts / title helpers
========================================================= */

function verdictCountsObject() {
  return { F: 0, S: 0, D: 0, HM: 0, PM: 0, SO: 0 };
}

function problemVerdictStats(problem) {
  const counts = verdictCountsObject();
  for (const item of problem?.avis || []) {
    const v = String(getEffectiveAvisVerdict(item.id) || "").toUpperCase();
    if (counts[v] !== undefined) counts[v] += 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total };
}

function situationVerdictStats(situation) {
  const counts = verdictCountsObject();
  for (const sujet of situation?.sujets || []) {
    for (const avis of sujet.avis || []) {
      const v = String(getEffectiveAvisVerdict(avis.id) || "").toUpperCase();
      if (counts[v] !== undefined) counts[v] += 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, total };
}

function buildVerdictBarHtml(counts, options = {}) {
  const legend = options.legend !== false;
  const total = Object.values(counts || {}).reduce((a, b) => a + b, 0) || 1;
  const order = ["F", "S", "D", "HM", "PM", "SO"];

  const segs = order.map((v) => {
    const c = Number(counts?.[v] || 0);
    if (!c) return "";
    const pct = (c / total) * 100;
    return `<span class="verdict-bar__seg verdict-bar__seg--${v.toLowerCase()}" style="--verdict-seg-width:${pct.toFixed(2)}%"></span>`;
  }).join("");

  const bar = `<div class="verdict-bar">${segs || `<span class="verdict-bar__seg verdict-bar__seg--empty" style="--verdict-seg-width:100%"></span>`}</div>`;

  if (!legend) {
    return `<div class="subissues-counts subissues-counts--verdicts">${bar}</div>`;
  }

  const legendHtml = order.map((v) => {
    const c = Number(counts?.[v] || 0);
    if (!c) return "";
    const pct = total ? (c / total) * 100 : 0;
    return `
      <span class="verdict-legend__item">
        ${renderStateDot(v)}
        <span class="verdict-legend__count">${c} <b>${escapeHtml(v)}</b></span>
        <span class="verdict-legend__pct">(${pct.toFixed(0)}%)</span>
      </span>
    `;
  }).join("");

  return `
    <div class="subissues-counts subissues-counts--verdicts">
      ${bar}
      <div class="verdict-legend">${legendHtml}</div>
    </div>
  `;
}

function problemsCountsIconHtml(closedCount, totalCount) {
  const total = Math.max(0, Number(totalCount) || 0);
  const closed = Math.max(0, Math.min(total, Number(closedCount) || 0));

  if (total > 0 && closed === total) {
    return `<span class="subissues-problems-icon" aria-label="Tous les sujets sont closed">${SVG_ISSUE_CLOSED}</span>`;
  }

  const ratio = total ? (closed / total) : 0;
  const r = 8;
  const cx = 10;
  const cy = 10;
  const a = ratio * Math.PI * 2;

  let wedge = "";
  if (ratio > 0) {
    const x = cx + r * Math.sin(a);
    const y = cy - r * Math.cos(a);
    const large = a > Math.PI ? 1 : 0;
    wedge = `<path d="M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z" fill="rgba(137,87,229,.55)" opacity="0.75"></path>`;
  }

  return `
    <span class="subissues-problems-icon" aria-label="Sujets closed: ${closed}/${total}">
      <svg viewBox="0 0 20 20" width="16" height="16" class="subissues-problems-icon__svg">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(139,148,158,.55)" stroke-width="2"></circle>
        ${wedge}
      </svg>
    </span>
  `;
}

function problemsCountsHtml(situation) {
  const problems = situation?.sujets || [];
  const totalPb = problems.length;
  const closedPb = problems.filter((x) => String(getEffectiveSujetStatus(x.id) || "closed").toLowerCase() !== "open").length;
  return `<div class="subissues-counts subissues-counts--problems">${problemsCountsIconHtml(closedPb, totalPb)}<span>${closedPb} sur ${totalPb}</span></div>`;
}

/* =========================================================
   Table render
========================================================= */


function formatRelativeTimeLabel(ts, prefix = "updated") {
  if (!ts) return `${prefix} recently`;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return `${prefix} recently`;

  const diffMs = Date.now() - date.getTime();
  const future = diffMs < 0;
  const absSeconds = Math.max(1, Math.round(Math.abs(diffMs) / 1000));

  const units = [
    [31536000, "year"],
    [2592000, "month"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"]
  ];

  let value = 1;
  let unit = "second";
  for (const [seconds, label] of units) {
    if (absSeconds >= seconds) {
      value = Math.floor(absSeconds / seconds);
      unit = label;
      break;
    }
  }

  const plural = value > 1 ? "s" : "";
  if (future) return `${prefix} in ${value} ${unit}${plural}`;
  return `${prefix} ${value} ${unit}${plural} ago`;
}

function getEntityListTimestamp(entityType, entity) {
  const description = entity?.id ? getEntityDescriptionState(entityType, entity.id) : null;
  return firstNonEmpty(
    description?.updated_at,
    entity?.updated_at,
    entity?.created_at,
    entity?.raw?.updated_at,
    entity?.raw?.created_at,
    store.situationsView?.rawResult?.updated_at,
    store.situationsView?.rawResult?.created_at,
    nowIso()
  );
}

function rowSelectedClass(kind, id) {
  if (kind === "situation" && store.situationsView.selectedSituationId === id && !store.situationsView.selectedSujetId && !store.situationsView.selectedAvisId) return " selected subissue-row--selected";
  if (kind === "sujet" && store.situationsView.selectedSujetId === id && !store.situationsView.selectedAvisId) return " selected subissue-row--selected";
  if (kind === "avis" && store.situationsView.selectedAvisId === id) return " selected subissue-row--selected";
  return "";
}

function renderSituationRow(situation) {
  const expanded = store.situationsView.expandedSituations.has(situation.id);
  const hasSujets = getSituationSubjects(situation).length > 0;
  const effStatus = getEffectiveSituationStatus(situation.id);
  const meta = getEntityReviewMeta("situation", situation.id);
  const reviewIcon = renderEntityReviewLeadIcon("situation", situation.id);
  const titleSeenClass = getReviewTitleStateClass("situation", situation.id);

  return `
    <div class="issue-row issue-row--sit click js-row-situation${rowSelectedClass("situation", situation.id)}" data-situation-id="${escapeHtml(situation.id)}">
      <div class="cell cell-theme lvl0">
        <span class="js-toggle-situation" data-situation-id="${escapeHtml(situation.id)}">${chevron(expanded, hasSujets)}</span>
        ${issueIcon(effStatus, { reviewState: meta.review_state, entityType: "situation", isSeen: meta.is_seen })}
        ${reviewIcon ? `<span class="review-title-chip">${reviewIcon}</span>` : ""}
        <span class="theme-text theme-text--sit ${titleSeenClass}">${escapeHtml(firstNonEmpty(situation.title, situation.id, "(sans titre)"))}</span>
      </div>
      <div class="cell cell-prio">${priorityBadge(situation.priority)}</div>
      <div class="cell cell-agent"></div>
      <div class="cell cell-id mono">${escapeHtml(getEntityDisplayRef("situation", situation.id))}</div>
    </div>
  `;
}

function renderSujetRow(sujet) {
  const expanded = store.situationsView.expandedSujets.has(sujet.id);
  const hasAvis = (sujet.avis || []).length > 0;
  const effStatus = getEffectiveSujetStatus(sujet.id);
  const meta = getEntityReviewMeta("sujet", sujet.id);
  const reviewIcon = renderEntityReviewLeadIcon("sujet", sujet.id);
  const titleSeenClass = getReviewTitleStateClass("sujet", sujet.id);

  return `
    <div class="issue-row issue-row--pb click js-row-sujet${rowSelectedClass("sujet", sujet.id)}" data-sujet-id="${escapeHtml(sujet.id)}">
      <div class="cell cell-theme lvl1">
        <span class="chev chev--spacer"></span>
        ${issueIcon(effStatus, { reviewState: meta.review_state, entityType: "sujet", isSeen: meta.is_seen })}
        ${reviewIcon ? `<span class="review-title-chip">${reviewIcon}</span>` : ""}
        <span class="theme-text theme-text--pb ${titleSeenClass}">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</span>
      </div>
      <div class="cell cell-prio">${priorityBadge(sujet.priority)}</div>
      <div class="cell cell-agent"></div>
      <div class="cell cell-id mono">${escapeHtml(getEntityDisplayRef("sujet", sujet.id))}</div>
    </div>
  `;
}

function renderAvisRow(avis) {
  const effVerdict = getEffectiveAvisVerdict(avis.id);
  const reviewIcon = renderEntityReviewLeadIcon("avis", avis.id);
  const titleSeenClass = getReviewTitleStateClass("avis", avis.id);

  return `
    <div class="issue-row issue-row--avis click js-row-avis${rowSelectedClass("avis", avis.id)}" data-avis-id="${escapeHtml(avis.id)}">
      <div class="cell cell-theme lvl2">
        <span class="chev chev--spacer"></span>
        ${reviewIcon ? `<span class="review-title-chip">${reviewIcon}</span>` : ""}
        <span class="theme-text theme-text--avis ${titleSeenClass}">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
      </div>
      <div class="cell cell-verdict">${renderVerdictPill(effVerdict)}</div>
      <div class="cell cell-prio"></div>
      <div class="cell cell-agent mono-small">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</div>
      <div class="cell cell-id mono">${escapeHtml(getEntityDisplayRef("avis", avis.id))}</div>
    </div>
  `;
}

function renderFlatSujetRow(sujet, situationId) {
  const effStatus = getEffectiveSujetStatus(sujet.id);
  const meta = getEntityReviewMeta("sujet", sujet.id);
  const reviewIcon = renderEntityReviewLeadIcon("sujet", sujet.id);
  const titleSeenClass = getReviewTitleStateClass("sujet", sujet.id);
  const displayRef = getEntityDisplayRef("sujet", sujet.id);
  const author = firstNonEmpty(getEntityDescriptionState("sujet", sujet.id)?.author, sujet?.agent, sujet?.raw?.agent, "system");
  const openedLabel = formatRelativeTimeLabel(getEntityListTimestamp("sujet", sujet), "opened");

  return `
    <div class="issue-row issue-row--pb click js-row-sujet${rowSelectedClass("sujet", sujet.id)}" data-sujet-id="${escapeHtml(sujet.id)}">
      <div class="cell cell-theme lvl0">
        <span class="chev chev--spacer"></span>
        <span class="issue-row-title-grid">
          <span class="issue-row-title-grid__status">
            ${issueIcon(effStatus, { reviewState: meta.review_state, entityType: "sujet", isSeen: meta.is_seen })}
          </span>
          <span class="issue-row-title-grid__review">
            ${reviewIcon ? `<span class="review-title-chip">${reviewIcon}</span>` : `<span class="review-title-chip review-title-chip--placeholder" aria-hidden="true"></span>`}
          </span>
          <span class="issue-row-title-grid__title">
            <button type="button" class="row-title-trigger js-row-title-trigger theme-text theme-text--pb ${titleSeenClass}" data-row-entity-type="sujet" data-row-entity-id="${escapeHtml(sujet.id)}">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</button>
          </span>
          <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${escapeHtml(displayRef)} - ${escapeHtml(author)} • ${escapeHtml(openedLabel)}</span>
        </span>
      </div>
      <div class="cell cell-prio">${priorityBadge(sujet.priority)}</div>
      <div class="cell cell-agent"></div>
    </div>
  `;
}

function renderFlatAvisRow(avis, sujetId, situationId) {
  const effVerdict = getEffectiveAvisVerdict(avis.id);
  const lineage = [situationId, sujetId].filter(Boolean).join(" · ");
  const reviewIcon = renderEntityReviewLeadIcon("avis", avis.id);
  const titleSeenClass = getReviewTitleStateClass("avis", avis.id);

  return `
    <div class="issue-row issue-row--avis click js-row-avis${rowSelectedClass("avis", avis.id)}" data-avis-id="${escapeHtml(avis.id)}">
      <div class="cell cell-theme lvl0">
        <span class="chev chev--spacer"></span>
        ${issueIcon("open")}
        ${reviewIcon ? `<span class="review-title-chip">${reviewIcon}</span>` : ""}
        <span class="theme-text theme-text--avis ${titleSeenClass}">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
        ${lineage ? `<span class="mono subissues-inline-count">${escapeHtml(lineage)}</span>` : ""}
      </div>
      <div class="cell cell-verdict">${renderVerdictPill(effVerdict)}</div>
      <div class="cell cell-prio"></div>
      <div class="cell cell-agent mono-small">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</div>
      <div class="cell cell-id mono">${escapeHtml(getEntityDisplayRef("avis", avis.id))}</div>
    </div>
  `;
}
function getSituationsTableGridTemplate() {
  return "minmax(0, 1fr) 56px 86px";
}

function renderSituationsTableHeadHtml(options = {}) {
  const columns = Array.isArray(options.columns) && options.columns.length
    ? options.columns
    : [
        { className: "cell cell-theme", html: renderSubjectsStatusHeadHtml() },
        { className: "cell cell-prio", label: "Prio" },
        { className: "cell cell-agent", label: "Agent" }
      ];

  return renderDataTableHead({ columns });
}

function renderWelcomeHtml() {
  return renderIssuesTable({
    gridTemplate: getSituationsTableGridTemplate(),
    headHtml: renderSituationsTableHeadHtml(),
    emptyTitle: "Aucune analyse disponible",
    emptyDescription: "Lancer une analyse pour générer des avis-sujets-situations."
  });
}

function renderTableHtml(filteredSituations) {
  const activeStatusFilter = getCurrentSubjectsStatusFilter();

  if (!(store.situationsView.data || []).length) return renderWelcomeHtml();

  if (!filteredSituations.length) {
    return renderIssuesTable({
      gridTemplate: getSituationsTableGridTemplate(),
      headHtml: renderSituationsTableHeadHtml(),
      emptyTitle: "Aucun résultat",
      emptyDescription: "Aucun résultat pour les filtres actuels."
    });
  }

  const rows = [];

  for (const situation of filteredSituations) {
    const visibleSujets = getSituationSubjects(situation).filter((sujet) => sujetMatchesStatusFilter(sujet, activeStatusFilter));

    if (!visibleSujets.length) continue;

    for (const sujet of visibleSujets) {
      rows.push(renderFlatSujetRow(sujet, situation.id));
    }
  }

  return renderIssuesTable({
    gridTemplate: getSituationsTableGridTemplate(),
    headHtml: renderSituationsTableHeadHtml(),
    rowsHtml: rows.join(""),
    emptyTitle: "Aucun résultat",
    emptyDescription: "Aucun résultat pour les filtres actuels."
  });
}

/* =========================================================
   Details / summary / metadata
========================================================= */

function getAvisSummary(avis) {
  const raw = avis?.raw || {};
  return firstNonEmpty(raw.summary, raw.message, raw.comment, raw.reasoning, raw.analysis, avis?.title, "Aucune synthèse disponible.");
}

function getSujetSummary(sujet) {
  const raw = sujet?.raw || {};
  return firstNonEmpty(raw.summary, raw.message, raw.comment, raw.reasoning, raw.analysis, sujet?.title, "Aucune synthèse disponible.");
}

function getSituationSummary(situation) {
  const raw = situation?.raw || {};
  return firstNonEmpty(raw.summary, raw.message, raw.comment, raw.reasoning, raw.analysis, situation?.title, "Aucune synthèse disponible.");
}

function renderMetaItem(label, valueHtml) {
  return `
    <div class="meta-item">
      <div class="meta-k">${escapeHtml(label)}</div>
      <div class="meta-v">${valueHtml}</div>
    </div>
  `;
}

function isEditingDescription(selection) {
  ensureViewUiState();
  if (!selection?.item?.id) return false;
  const entityType = getSelectionEntityType(selection.type);
  return store.situationsView.descriptionEdit?.entityType === entityType
    && store.situationsView.descriptionEdit?.entityId === selection.item.id;
}


function renderDocumentRefsCard(selection) {
  const refs = getSelectionDocumentRefs(selection);
  if (!refs.length) return "";

  return `
    <div class="details-document-refs" aria-label="Références documentaires">
      <div class="details-document-refs__label">Références documentaires</div>
      <div class="details-document-refs__list">
        ${refs.map((doc) => `
          <span class="details-document-ref">
            <span class="details-document-ref__name">${escapeHtml(doc.name)}</span>
            <span class="details-document-ref__phase">${escapeHtml(doc.phaseCode)}${doc.phaseLabel ? ` · ${escapeHtml(doc.phaseLabel)}` : ""}</span>
          </span>
        `).join("")}
      </div>
    </div>
  `;
}

function renderDescriptionCard(selection) {
  const entityType = getSelectionEntityType(selection.type);
  const entityId = selection.item.id;
  const description = getEntityDescriptionState(selection);
  const editing = isEditingDescription(selection);
  const author = String(description.author || "system");
  const isHuman = String(description.agent || "").toLowerCase() === "human" || description.avatar_type === "human";
  const authorHtml = `<div class="gh-comment-author mono">${escapeHtml(author)}</div>`;
  const editButtonHtml = `
    <button class="icon-btn icon-btn--sm gh-comment-edit-btn" data-action="edit-description" type="button" aria-label="Modifier la description" title="Modifier la description">
      ${svgIcon("pencil")}
    </button>
  `;

  const headerHtml = `
    <div class="gh-comment-header gh-comment-header--editable">
      <div class="gh-comment-header-main">${authorHtml}</div>
      <div class="gh-comment-header-actions">${editButtonHtml}</div>
    </div>
  `;

  const bodyHtml = editing
    ? `
      <div class="gh-comment-body gh-comment-body--editable">
        <textarea class="comment-editor__textarea description-editor__textarea" data-description-editor rows="7">${escapeHtml(store.situationsView.descriptionEdit?.draft || description.body || "")}</textarea>
        <div class="description-editor__actions">
          <button class="gh-btn" data-action="cancel-description-edit" type="button">Annuler</button>
          <button class="gh-btn gh-btn--comment" data-action="save-description-edit" data-entity-type="${escapeHtml(entityType)}" data-entity-id="${escapeHtml(entityId)}" type="button">Sauvegarder</button>
        </div>
      </div>
    `
    : `<div class="gh-comment-body">${mdToHtml(description.body || "")}</div>`;

  return `
    <div class="gh-comment gh-comment--description">
      ${isHuman
        ? `<div class="gh-avatar gh-avatar--human" aria-hidden="true">${SVG_AVATAR_HUMAN}</div>`
        : `<div class="gh-avatar" aria-hidden="true"><span class="gh-avatar-initial">${escapeHtml(description.avatar_initial || "S")}</span></div>`}
      <div class="gh-comment-box">
        ${headerHtml}
        ${bodyHtml}
      </div>
    </div>
  `;
}

function getThreadForSelection() {
  const selection = getActiveSelection();
  if (!selection) return [];

  const { bucket } = getRunBucket();
  const comments = Array.isArray(bucket?.comments) ? bucket.comments : [];
  const activities = Array.isArray(bucket?.activities) ? bucket.activities : [];
  const events = [];

  const s = selection.type === "situation" ? selection.item : (selection.type === "sujet" ? getSituationBySujetId(selection.item.id) : getSituationByAvisId(selection.item.id));
  const p = selection.type === "sujet" ? selection.item : (selection.type === "avis" ? getSujetByAvisId(selection.item.id) : null);
  const a = selection.type === "avis" ? selection.item : null;
  const rootTs = firstNonEmpty(store.situationsView?.rawResult?.updated_at, store.situationsView?.rawResult?.created_at, nowIso());

  if (a) {
    if (store.situationsView.tempAvisVerdictFor !== a.id) {
      store.situationsView.tempAvisVerdictFor = a.id;
      store.situationsView.tempAvisVerdict = String(getEffectiveAvisVerdict(a.id) || "F").toUpperCase();
    }
  } else {
    store.situationsView.tempAvisVerdictFor = null;
    store.situationsView.tempAvisVerdict = store.situationsView.tempAvisVerdict || "F";
  }

  if (s) {
    events.push({
      ts: rootTs,
      actor: "System",
      agent: inferAgent(s),
      type: "SITUATION",
      entity_type: "situation",
      entity_id: s.id,
      message: `${firstNonEmpty(s.title, s.id, "(sans titre)")}
priority=${firstNonEmpty(s.priority, "")}
sujets=${(s.sujets || []).length}`
    });
  }
  if (p) {
    events.push({
      ts: rootTs,
      actor: "System",
      agent: inferAgent(p),
      type: "SUJET",
      entity_type: "sujet",
      entity_id: p.id,
      message: `${firstNonEmpty(p.title, p.id, "Non classé")}
priority=${firstNonEmpty(p.priority, "")}
avis=${(p.avis || []).length}`
    });
  }
  if (a) {
    events.push({
      ts: rootTs,
      actor: "System",
      agent: inferAgent(a),
      type: "AVIS",
      entity_type: "avis",
      entity_id: a.id,
      message: `${firstNonEmpty(a.title, a.id)}
severity=${firstNonEmpty(a.severity, "")}
verdict=${firstNonEmpty(a.verdict, "")}
agent=${inferAgent(a)}

${firstNonEmpty(a.raw?.message, a.raw?.summary, "")}`
    });
  }

  const allowedComments = new Set();
  const allowedActivities = new Set();
  const entityKey = (type, id) => `${String(type || "").toLowerCase()}:${String(id || "")}`;

  if (a) {
    allowedComments.add(entityKey("avis", a.id));
    allowedActivities.add(entityKey("avis", a.id));
    if (p) allowedActivities.add(entityKey("sujet", p.id));
  } else if (p) {
    allowedComments.add(entityKey("sujet", p.id));
    allowedActivities.add(entityKey("sujet", p.id));
    if (s) allowedActivities.add(entityKey("situation", s.id));
  } else if (s) {
    allowedComments.add(entityKey("situation", s.id));
    allowedActivities.add(entityKey("situation", s.id));
  }

  const isViewingAvis = !!a;
  const isViewingSujet = !!p && !a;

  const humanEvents = [...comments, ...activities].filter((e) => {
    const k = entityKey(e.entity_type, e.entity_id);
    const t = String(e?.type || "").toUpperCase();

    if (t === "COMMENT") return allowedComments.has(k);
    if (t !== "ACTIVITY") return allowedComments.has(k) || allowedActivities.has(k);
    if (!allowedActivities.has(k)) return false;

    const kind = String(e?.kind || "").toLowerCase();
    const meta = e?.meta || {};

    if (isViewingAvis) {
      if (kind === "avis_verdict_changed") return String(meta?.avis_id || "") === String(a.id);
      if (kind === "issue_closed" || kind === "issue_reopened") {
        if (meta?.problem_id) return String(meta.problem_id) === String(p?.id || "");
      }
      return true;
    }

    if (isViewingSujet) {
      if (String(e?.entity_type || "").toLowerCase() === "situation") {
        if (meta?.problem_id) return String(meta.problem_id) === String(p.id);
      }
      return true;
    }

    return true;
  });

  const orderRank = (e) => {
    const t = String(e?.type || "").toUpperCase();
    if (t === "SITUATION") return 0;
    if (t === "SUJET") return 1;
    if (t === "AVIS") return 2;
    return 3;
  };

  return [...events, ...humanEvents].sort((x, y) => {
    const xr = orderRank(x);
    const yr = orderRank(y);
    if (xr !== yr) return xr - yr;
    return String(x.ts || "").localeCompare(String(y.ts || ""));
  });
}

function renderThreadBlock() {
  const thread = getThreadForSelection();
  if (!thread.length) return "";

  const itemsHtml = thread.map((e, idx) => {
    const type = String(e?.type || "").toUpperCase();

    if (type === "COMMENT") {
      const agent = String(e?.agent || "").toLowerCase();
      const isHuman = agent === "human" || !agent;
      const isRapso = !isHuman && agent === "specialist_ps";
      const displayName = isRapso ? "Agent specialist_ps" : normActorName(e?.actor, agent);
      const avatarInitial = isRapso ? "AS" : ((agent[0] || "S").toUpperCase());
      const tsHtml = e?.ts ? `<div class="mono-small">${escapeHtml(fmtTs(e.ts))}</div>` : "";

      return renderMessageThreadComment({
        idx,
        author: displayName,
        tsHtml,
        bodyHtml: mdToHtml(e?.message || ""),
        avatarType: isHuman ? "human" : "agent",
        avatarHtml: isHuman ? SVG_AVATAR_HUMAN : "",
        avatarInitial
      });
    }

    if (type === "ACTIVITY") {
      const kind = String(e?.kind || "").toLowerCase();
      const agent = e?.agent || "system";
      const displayName = normActorName(e?.actor, agent);
      const ts = fmtTs(e?.ts || "");
      let iconHtml = `<span class="tl-ico tl-ico--muted" aria-hidden="true"></span>`;
      let verb = "updated";
      let targetHtml = "";

      if (kind === "issue_closed") {
        iconHtml = `<span class="tl-ico-wrap tl-ico-closed" aria-hidden="true">${SVG_TL_CLOSED}</span>`;
        const sujetId = e?.meta?.problem_id;
        const sujet = sujetId ? getNestedSujet(sujetId) : null;
        const sujetTitle = sujet?.title ? `${escapeHtml(sujet.title)} ` : "";
        verb = "closed";
        targetHtml = sujetId ? `sujet ${sujetTitle}${entityDisplayLinkHtml("sujet", sujetId)}` : "this";
      } else if (kind === "issue_reopened") {
        iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${SVG_TL_REOPENED}</span>`;
        const sujetId = e?.meta?.problem_id;
        const sujet = sujetId ? getNestedSujet(sujetId) : null;
        const sujetTitle = sujet?.title ? `${escapeHtml(sujet.title)} ` : "";
        verb = "reopened";
        targetHtml = sujetId ? `sujet ${sujetTitle}${entityDisplayLinkHtml("sujet", sujetId)}` : "this";
      } else if (kind === "review_validated" || kind === "review_rejected" || kind === "review_dismissed" || kind === "review_restored") {
        const entityType = String(e?.entity_type || "").toLowerCase();
        const entityId = String(e?.entity_id || "");
        const entity = getEntityByType(entityType, entityId);
        const entityTitle = entity?.title ? `${escapeHtml(entity.title)} ` : "";
        const counts = e?.meta?.counts || {};
        const descendants = Math.max(0, Number(counts?.sujet || 0) + Number(counts?.avis || 0) + Number(counts?.situation || 0) - 1);

        if (kind === "review_validated") {
          iconHtml = renderReviewStateIcon("validated", { entityType });
          verb = "validated";
        } else if (kind === "review_restored") {
          iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${SVG_TL_REOPENED}</span>`;
          verb = "restored";
        } else {
          iconHtml = renderReviewStateIcon(kind === "review_dismissed" ? "dismissed" : "rejected", { entityType, isSeen: true });
          verb = kind === "review_dismissed" ? "dismissed" : "rejected";
        }

        targetHtml = entityId
          ? `${entityType} ${entityTitle}${entityDisplayLinkHtml(entityType, entityId)}${descendants > 0 ? ` · ${descendants} descendant(s)` : ""}`
          : "this";
      } else if (kind === "avis_verdict_changed") {
        const toV = e?.meta?.to || "";
        const avisId = e?.meta?.avis_id;
        const avis = avisId ? getNestedAvis(avisId) : null;
        const avisTitle = avis?.title ? `${escapeHtml(avis.title)} ` : "";
        iconHtml = verdictIconHtml(toV);
        verb = "changed verdict";
        targetHtml = avisId
          ? `avis ${avisTitle}${entityDisplayLinkHtml("avis", avisId)} → ${escapeHtml(String(toV || ""))}`
          : escapeHtml(String(toV || ""));
      } else if (kind === "description_version_initial" || kind === "description_version_saved") {
        iconHtml = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${svgIcon("pencil")}</span>`;
        verb = kind === "description_version_initial" ? "archived description" : "saved description";
        const entityType = String(e?.entity_type || "").toLowerCase();
        const entityId = String(e?.entity_id || "");
        const entity = getEntityByType(entityType, entityId);
        const entityTitle = entity?.title ? `${escapeHtml(entity.title)} ` : "";
        targetHtml = entityId ? `${entityType} ${entityTitle}${entityDisplayLinkHtml(entityType, entityId)}` : "this";
      }

      const note = String(e?.message || "").trim();
      const noteHtml = note ? `<div class="tl-note">${mdToHtml(note)}</div>` : "";

      return renderMessageThreadActivity({
        idx,
        iconHtml,
        authorIconHtml: miniAuthorIconHtml(agent),
        textHtml: `
          <span class="tl-author-name">${escapeHtml(displayName)}</span>
          <span class="mono-small"> ${escapeHtml(verb)} ${targetHtml || ""} </span>
          <span class="mono-small">at ${escapeHtml(ts)}</span>
        `,
        noteHtml
      });
    }

    return renderMessageThreadEvent({
      idx,
      badgeHtml: `
        <div class="thread-badge__subissue">
          ${svgIcon("issue-tracks", {
            className: "octicon octicon-issue-tracks Octicon__StyledOcticon-sc-jtj3m8-0 TimelineRow-module__Octicon__SMhVa"
          })}
        </div>
      `,
      headHtml: `
        <div class="mono">
          <span>${escapeHtml(e.actor || "System")}</span>
          <span> attached this to </span>
          <span>${escapeHtml(e.entity_type || "")} n° ${entityDisplayLinkHtml(e.entity_type, e.entity_id)}</span>
          <span>·</span>
          <span> (agent=${escapeHtml(e.agent || "system")})</span>
          <div class="mono">in ${escapeHtml(fmtTs(e.ts || ""))}</div>
        </div>
      `,
      bodyHtml: escapeHtml(e.message || "")
    });
  }).join("");

  return `
    <div class="gh-timeline-title gh-timeline-title--hidden mono">Discussion</div>
    ${renderMessageThread({ itemsHtml })}
  `;
}


function renderRejectReviewAction(selection) {
  if (!selection?.type || !selection?.item?.id) return "";

  const entityType = getSelectionEntityType(selection.type);
  const entityId = selection.item.id;
  const meta = getEntityReviewMeta(entityType, entityId);
  const reviewIcon = renderReviewStateIcon("rejected", { entityType });
  const dismissIcon = renderReviewStateIcon("dismissed", { entityType });
  const canRestore = !!getReviewRestoreSnapshot(entityType, entityId)
    && (meta.review_state === "rejected" || meta.review_state === "dismissed");

  if (canRestore) {
    return renderGhActionButton({
      id: `review-restore-${entityType}-${entityId}`,
      label: "Récupérer",
      icon: svgIcon("issue-reopened"),
      tone: "default",
      size: "sm",
      className: "js-review-reject-action",
      mainAction: "review:restore"
    });
  }

  return renderGhActionButton({
    id: `review-reject-${entityType}-${entityId}`,
    label: "Rejeter",
    icon: reviewIcon,
    tone: "default",
    size: "sm",
    className: "js-review-reject-action",
    mainActionMode: "first-item",
    items: [
      {
        label: "Rejeté par humain",
        action: "review:set:rejected",
        icon: reviewIcon
      },
      {
        label: "Non pertinent",
        action: "review:set:dismissed",
        icon: dismissIcon
      }
    ]
  });
}

function renderValidateReviewAction(selection) {
  if (!selection?.type || !selection?.item?.id) return "";

  const entityType = getSelectionEntityType(selection.type);
  const entityId = selection.item.id;
  const meta = getEntityReviewMeta(entityType, entityId);
  const normalizedState = normalizeReviewState(meta.review_state);
  if (normalizedState === "rejected" || normalizedState === "dismissed") return "";

  const validateIcon = renderReviewStateIcon("validated", { entityType });

  if (selection.type === "avis") {
    return `<button class="gh-btn gh-btn--validate" data-action="avis-validate" type="button">Validate</button>`;
  }

  return renderGhActionButton({
    id: `review-validate-${entityType}-${selection.item.id}`,
    label: "Valider",
    icon: validateIcon,
    tone: "default",
    size: "sm",
    className: "js-review-validate-action",
    mainAction: "review:validate:self",
    items: [
      {
        label: "Valider seul",
        action: "review:validate:self",
        icon: validateIcon
      },
      {
        label: "Valider avec tous les descendants",
        action: "review:validate:descendants",
        icon: validateIcon
      }
    ]
  });
}

function renderCommentBox(selection) {
  ensureViewUiState();
  const item = selection?.item || null;
  if (!item) return "";

  const type = selection.type;
  const issueStatus =
    type === "avis"
      ? "open"
      : type === "sujet"
        ? getEffectiveSujetStatus(item.id)
        : getEffectiveSituationStatus(item.id);

  const isIssueOpen = String(issueStatus || "open").toLowerCase() === "open";
  const activeVerdict = String(store.situationsView.tempAvisVerdict || "F").toUpperCase();
  const previewMode = !!store.situationsView.commentPreviewMode;
  const helpMode = !!store.situationsView.helpMode;

  const verdictSwitch = renderVerdictActionButtons(activeVerdict);

  const hintHtml = `
    <div class="rapso-mention-hint comment-composer__hint">
      <span>Astuce : mentionne <span class="mono">@rapso</span> dans ton commentaire.</span>
    </div>
  `;

  const rejectActionHtml = renderRejectReviewAction(selection);

  const actionsHtml = `
    <button class="gh-btn gh-btn--help-mode ${helpMode ? "is-on" : ""}" data-action="toggle-help" type="button">Help</button>

    ${type === "avis"
      ? `${verdictSwitch}${renderValidateReviewAction(selection)}`
      : `${renderValidateReviewAction(selection)}${isIssueOpen
          ? `<button class="gh-btn gh-btn--issue-action" data-action="issue-close" type="button">${SVG_ISSUE_CLOSED}<span class="gh-btn__label">Close</span></button>`
          : `<button class="gh-btn gh-btn--issue-action" data-action="issue-reopen" type="button">${SVG_ISSUE_REOPENED}<span class="gh-btn__label">Reopen issue</span></button>`}`}

    ${rejectActionHtml}

    <button class="gh-btn gh-btn--comment" data-action="add-comment" type="button">Comment</button>
  `;

  return renderCommentComposer({
    title: "Add a comment",
    avatarHtml: SVG_AVATAR_HUMAN,
    previewMode,
    helpMode,
    textareaId: "humanCommentBox",
    previewId: "humanCommentPreview",
    placeholder: helpMode
      ? "Help (éphémère) — décrivez l’écran / l’action souhaitée."
      : "Réponse humaine (Markdown) — mentionne @rapso pour demander l’avis de l’agent. Ex: « @rapso peux-tu vérifier ce point ? »",
    hintHtml,
    actionsHtml
  });
}

function renderDetailedMetaForSelection(selection) {
  if (!selection) return "";

  const item = selection.item;
  const raw = item.raw || {};
  const decision = getDecision(selection.type, item.id);

  const common = [
    renderMetaItem("ID", `<span class="mono">${escapeHtml(item.id)}</span>`),
    renderMetaItem("Title", escapeHtml(firstNonEmpty(item.title, item.id))),
    renderMetaItem("Agent", `<span class="mono">${escapeHtml(firstNonEmpty(item.agent, raw.agent, "system"))}</span>`),
    renderMetaItem("Priority", priorityBadge(firstNonEmpty(item.priority, raw.priority, "P3"))),
    renderMetaItem("Run", `<span class="mono">${escapeHtml(currentRunKey())}</span>`),
    renderMetaItem("Historique humain", decision ? `<span class="mono">${escapeHtml(decision.decision)} · ${escapeHtml(fmtTs(decision.ts))}</span>` : "—")
  ];

  if (selection.type === "avis") {
    const sujet = getSujetByAvisId(item.id);
    const situation = getSituationByAvisId(item.id);
    const entries = [
      ...common,
      renderMetaItem("Situation parent", `<span class="mono">${escapeHtml(situation?.id || "—")}</span>`),
      renderMetaItem("Sujet parent", `<span class="mono">${escapeHtml(sujet?.id || "—")}</span>`),
      renderMetaItem("Verdict effectif", renderVerdictPill(getEffectiveAvisVerdict(item.id))),
      renderMetaItem("Verdict source", renderVerdictPill(firstNonEmpty(raw.verdict, item.verdict, "-"))),
      renderMetaItem("Severity", `<span class="mono">${escapeHtml(firstNonEmpty(raw.severity, "—"))}</span>`),
      renderMetaItem("Source", `<span class="mono">${escapeHtml(firstNonEmpty(raw.source, "—"))}</span>`)
    ];
    return entries.join("");
  }

  if (selection.type === "sujet") {
    const situations = getSubjectSituations(item.id);
    const situationLabel = situations.length
      ? situations.map((situation) => String(situation?.id || "")).filter(Boolean).join(", ")
      : "—";
    const entries = [
      ...common,
      renderMetaItem(situations.length > 1 ? "Situations parentes" : "Situation parent", `<span class="mono">${escapeHtml(situationLabel)}</span>`),
      renderMetaItem("Avis rattachés", `<span class="mono">${escapeHtml(String((item.avis || []).length))}</span>`)
    ];
    return entries.join("");
  }

  const stats = situationVerdictStats(item);
  const entries = [
    ...common,
    renderMetaItem("Status effectif", statePill(getEffectiveSituationStatus(item.id))),
    renderMetaItem("Status source", statePill(firstNonEmpty(raw.status, item.status, "open"))),
    renderMetaItem("Sujets", `<span class="mono">${escapeHtml(String(getSituationSubjects(item).length))}</span>`),
    renderMetaItem("Verdicts", buildVerdictBarHtml(stats.counts, { legend: true }))
  ];
  return entries.join("");
}


function getSubjectSituations(subjectId) {
  const normalizedId = String(subjectId || "");
  const meta = getSubjectSidebarMeta(normalizedId);
  return meta.situationIds.map((situationId) => getNestedSituation(situationId)).filter(Boolean);
}

function summarizeSubjectMetaValue(items, emptyLabel = "Aucun") {
  if (!Array.isArray(items) || !items.length) return emptyLabel;
  if (items.length === 1) return items[0];
  return `${items[0]} +${items.length - 1}`;
}

function renderSubjectMetaField({ field, label, valueHtml }) {
  const dropdown = store.situationsView.subjectMetaDropdown || {};
  const isOpen = dropdown.field === field;
  return `
    <section class="subject-meta-field ${isOpen ? "is-open" : ""}">
      <button
        type="button"
        class="subject-meta-field__trigger"
        data-subject-meta-trigger="${escapeHtml(field)}"
        data-subject-meta-anchor="${escapeHtml(field)}"
        aria-expanded="${isOpen ? "true" : "false"}"
      >
        <span class="subject-meta-field__label-row">
          <span class="subject-meta-field__label">${escapeHtml(label)}</span>
          <span class="subject-meta-field__gear" aria-hidden="true">${svgIcon("gear", { className: "octicon octicon-gear" })}</span>
        </span>
      </button>
      <div class="subject-meta-field__value">${valueHtml}</div>
    </section>
  `;
}

function renderSubjectMetaButtonValue(text, metaText = "") {
  return `
    <span class="subject-meta-field__value-text">${escapeHtml(text)}</span>
    ${metaText ? `<span class="subject-meta-field__value-meta">${escapeHtml(metaText)}</span>` : ""}
  `;
}

function renderObjectiveCounterIcon(objective) {
  const counts = getObjectiveSubjectCounts(objective);
  return problemsCountsIconHtml(counts.closed, counts.total);
}

function getSubjectSituationStatusLabel(situation, subjectId) {
  const linkedSubject = getSituationSubjects(situation).find((item) => String(item?.id || "") === String(subjectId || ""));
  const status = getEffectiveSujetStatus(linkedSubject?.id || subjectId) || linkedSubject?.status || "open";
  return String(status || "open").toLowerCase() === "closed" ? "Closed" : "Open";
}

function renderSubjectSituationKanbanButton(situation, subjectId) {
  const dropdown = store.situationsView.subjectKanbanDropdown || {};
  const situationId = String(situation?.id || "");
  const isOpen = String(dropdown.subjectId || "") === String(subjectId || "") && String(dropdown.situationId || "") === situationId;
  return `
    <button
      type="button"
      class="subject-situation-kanban-trigger ${isOpen ? "is-open" : ""}"
      data-subject-kanban-trigger="${escapeHtml(subjectId)}"
      data-subject-kanban-situation-id="${escapeHtml(situationId)}"
      data-subject-kanban-anchor="${escapeHtml(subjectId)}::${escapeHtml(situationId)}"
      aria-expanded="${isOpen ? "true" : "false"}"
    >
      ${renderSujetKanbanStatusBadge(subjectId, situationId)}
      <span class="subject-situation-kanban-trigger__chevron" aria-hidden="true">${svgIcon("chevron-down", { className: "octicon octicon-chevron-down" })}</span>
    </button>
  `;
}

function renderSubjectSituationCard(situation, subjectId) {
  const situationStatus = String(getEffectiveSituationStatus(situation?.id) || situation?.status || "open").toLowerCase();
  const isClosedSituation = situationStatus !== "open";
  return `
    <span class="subject-meta-situation-card">
      <span class="subject-meta-situation-card__head">
        <span class="subject-meta-situation-card__icon">${svgIcon(isClosedSituation ? "table-check" : "table", { className: "ui-icon octicon octicon-table" })}</span>
        <span class="subject-meta-situation-card__title">${escapeHtml(firstNonEmpty(situation.title, situation.id, "Situation"))}</span>
        ${isClosedSituation ? `<span class="subject-meta-situation-card__state">Fermée</span>` : ""}
      </span>
      <span class="subject-meta-situation-card__meta">
        <span>Status · ${escapeHtml(getSubjectSituationStatusLabel(situation, subjectId))}</span>
        ${renderSubjectSituationKanbanButton(situation, subjectId)}
      </span>
    </span>
  `;
}

function renderSubjectSituationsValue(subjectId) {
  const situations = getSubjectSituations(subjectId);
  if (!situations.length) return renderSubjectMetaButtonValue("Aucune situation");
  return `
    <span class="subject-meta-field__chips">
      ${situations.map((situation) => renderSubjectSituationCard(situation, subjectId)).join("")}
    </span>
  `;
}


function renderSubjectObjectivesValue(subjectId) {
  const objective = getSubjectObjectives(subjectId)[0] || null;
  if (!objective) return renderSubjectMetaButtonValue("Aucun objectif");
  return `
    <span class="subject-meta-objective-card">
      <span class="subject-meta-objective-card__count">${renderObjectiveCounterIcon(objective)}</span>
      <span class="subject-meta-objective-card__title">${escapeHtml(objective.title)}</span>
      <span class="subject-meta-objective-card__date">${escapeHtml(formatObjectiveDueDateLabel(objective))}</span>
    </span>
  `;
}

function buildSubjectMetaMenuItems(subject, field) {
  const dropdownState = store.situationsView.subjectMetaDropdown || {};
  const query = String(dropdownState.query || "").trim().toLowerCase();

  if (field === "objectives") {
    const selectedObjectiveId = String(getSubjectSidebarMeta(subject.id).objectiveIds[0] || "");
    const objectives = getObjectives();
    const matches = (objective) => matchSearch([objective.title, formatObjectiveDueDateLabel(objective), objective.id], query);
    const toItem = (objective) => {
      const isSelected = selectedObjectiveId === String(objective.id || "");
      return {
        key: String(objective.id || ""),
        isActive: String(dropdownState.activeKey || "") === String(objective.id || ""),
        isSelected,
        iconHtml: `
          <span class="select-menu__objective-iconset" aria-hidden="true">
            <span class="select-menu__objective-check ${isSelected ? "is-visible" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
            <span class="select-menu__objective-milestone">${svgIcon("milestone", { className: "octicon octicon-milestone" })}</span>
          </span>
        `,
        title: objective.title,
        metaHtml: escapeHtml(formatObjectiveDueDateLabel(objective)),
        dataAttrs: { "objective-select": String(objective.id || "") }
      };
    };
    return {
      openItems: objectives.filter((objective) => !objective.closed && matches(objective)).map(toItem),
      closedItems: objectives.filter((objective) => objective.closed && matches(objective)).map(toItem)
    };
  }

  if (field === "situations") {
    const selectedSituationIds = new Set(getSubjectSidebarMeta(subject.id).situationIds);
    const situations = (store.situationsView.data || []).filter((situation) => matchSearch([situation.title, situation.id], query));
    const toItem = (situation) => {
      const isSelected = selectedSituationIds.has(String(situation.id || ""));
      return {
        key: String(situation.id || ""),
        isActive: String(dropdownState.activeKey || "") === String(situation.id || ""),
        isSelected,
        iconHtml: `
          <span class="select-menu__situation-iconset" aria-hidden="true">
            <span class="select-menu__checkbox ${isSelected ? "is-checked" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
            <span class="select-menu__situation-icon">${svgIcon(String(getEffectiveSituationStatus(situation.id) || situation.status || "open").toLowerCase() === "open" ? "table" : "table-check", { className: "ui-icon octicon octicon-table" })}</span>
          </span>
        `,
        title: firstNonEmpty(situation.title, situation.id, "Situation"),
        metaHtml: escapeHtml(situation.id),
        dataAttrs: { "situation-toggle": String(situation.id || "") }
      };
    };
    return {
      openItems: situations.filter((situation) => String(getEffectiveSituationStatus(situation.id) || situation.status || "open").toLowerCase() === "open").map(toItem),
      closedItems: situations.filter((situation) => String(getEffectiveSituationStatus(situation.id) || situation.status || "open").toLowerCase() !== "open").map(toItem)
    };
  }

  const emptyHintMap = {
    assignees: "Aucun assigné pour le moment.",
    labels: "Aucun label pour le moment.",
    relations: "Aucune relation pour le moment."
  };
  return { items: [], emptyHint: emptyHintMap[field] || "Aucune donnée." };
}

function renderSubjectMetaDropdown(subject, field) {
  const dropdownState = store.situationsView.subjectMetaDropdown || {};
  const query = String(dropdownState.query || "");

  if (field === "objectives") {
    const { openItems, closedItems } = buildSubjectMetaMenuItems(subject, field);
    return `
      <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
        <div class="subject-meta-dropdown__title">Sélectionner des objectifs</div>
        <div class="subject-meta-dropdown__search">
          <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
          <input type="search" class="subject-meta-dropdown__search-input" data-subject-meta-search="${escapeHtml(field)}" value="${escapeHtml(query)}" placeholder="Filtrer les objectifs" autocomplete="off">
        </div>
        <div class="subject-meta-dropdown__body">
          ${renderSelectMenuSection({ title: "Ouverts", items: openItems, emptyTitle: "Aucun objectif ouvert", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun objectif ouvert disponible." })}
          ${renderSelectMenuSection({ title: "Fermés", items: closedItems, emptyTitle: "Aucun objectif fermé", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucun objectif fermé disponible." })}
        </div>
      </div>
    `;
  }

  if (field === "situations") {
    const { openItems, closedItems } = buildSubjectMetaMenuItems(subject, field);
    return `
      <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
        <div class="subject-meta-dropdown__title">Situations liées</div>
        <div class="subject-meta-dropdown__search">
          <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
          <input type="search" class="subject-meta-dropdown__search-input" data-subject-meta-search="${escapeHtml(field)}" value="${escapeHtml(query)}" placeholder="Filtrer les situations" autocomplete="off">
        </div>
        <div class="subject-meta-dropdown__body">
          ${renderSelectMenuSection({ title: "Ouvertes", items: openItems, emptyTitle: "Aucune situation ouverte", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucune situation ouverte disponible." })}
          ${renderSelectMenuSection({ title: "Fermées", items: closedItems, emptyTitle: "Aucune situation fermée", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucune situation fermée disponible." })}
        </div>
      </div>
    `;
  }

  const { items, emptyHint } = buildSubjectMetaMenuItems(subject, field);
  const titles = {
    assignees: "Assigner ce sujet",
    labels: "Gérer les labels",
    relations: "Gérer les relations"
  };
  return `
    <div class="subject-meta-dropdown gh-menu gh-menu--open" role="dialog">
      <div class="subject-meta-dropdown__title">${escapeHtml(titles[field] || "Paramètres")}</div>
      <div class="subject-meta-dropdown__body">
        ${renderSelectMenuSection({ items, emptyTitle: "Aucune donnée", emptyHint: emptyHint || "Cette liste sera branchée plus tard." })}
      </div>
    </div>
  `;
}

function getSubjectKanbanMenuEntries(subjectId, situationId, query = "") {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  return SUJET_KANBAN_STATUSES
    .filter((status) => matchSearch([status.label, status.hint, status.key], normalizedQuery))
    .map((status) => ({
      key: status.key,
      isActive: String(store.situationsView.subjectKanbanDropdown?.activeKey || "") === status.key,
      isSelected: getSujetKanbanStatus(subjectId, situationId) === status.key,
      iconHtml: `
        <span class="subject-kanban-menu__iconset" aria-hidden="true">
          <span class="subject-kanban-menu__check ${getSujetKanbanStatus(subjectId, situationId) === status.key ? "is-visible" : ""}">${svgIcon("check", { className: "octicon octicon-check" })}</span>
          <span class="subject-kanban-menu__dot subject-kanban-menu__dot--${escapeHtml(String(status.key || "").replace(/_/g, "-"))}"></span>
        </span>
      `,
      title: status.label,
      metaHtml: escapeHtml(status.hint),
      dataAttrs: {
        "subject-kanban-select": status.key,
        "subject-kanban-situation-id": situationId,
        "subject-kanban-subject-id": subjectId
      }
    }));
}

function renderSubjectKanbanDropdown(subjectId, situationId) {
  const dropdownState = store.situationsView.subjectKanbanDropdown || {};
  const query = String(dropdownState.query || "");
  const items = getSubjectKanbanMenuEntries(subjectId, situationId, query);
  return `
    <div class="subject-meta-dropdown subject-kanban-dropdown gh-menu gh-menu--open" role="dialog">
      <div class="subject-meta-dropdown__search">
        <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${svgIcon("search", { className: "octicon octicon-search" })}</span>
        <input type="search" class="subject-meta-dropdown__search-input" data-subject-kanban-search="${escapeHtml(subjectId)}" data-subject-kanban-search-situation-id="${escapeHtml(situationId)}" value="${escapeHtml(query)}" placeholder="Filtrer les étapes" autocomplete="off">
      </div>
      <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>
      <div class="subject-meta-dropdown__body">
        ${renderSelectMenuSection({ items, emptyTitle: "Aucune étape", emptyHint: query ? "Aucun résultat pour cette recherche." : "Aucune étape disponible." })}
      </div>
    </div>
  `;
}

function renderSubjectMetaControls(subject) {
  const meta = getSubjectSidebarMeta(subject.id);
  const selectedObjectives = meta.objectiveIds.map((objectiveId) => getObjectiveById(objectiveId)).filter(Boolean);
  return `
    <div class="subject-meta-controls">
      ${renderSubjectMetaField({
        field: "assignees",
        label: "Assigné à",
        valueHtml: renderSubjectMetaButtonValue(summarizeSubjectMetaValue(meta.assignees, "Personne"))
      })}
      ${renderSubjectMetaField({
        field: "labels",
        label: "Labels",
        valueHtml: renderSubjectMetaButtonValue(summarizeSubjectMetaValue(meta.labels, "Aucun label"))
      })}
      ${renderSubjectMetaField({
        field: "situations",
        label: "Situations",
        valueHtml: renderSubjectSituationsValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "objectives",
        label: "Objectifs",
        valueHtml: renderSubjectObjectivesValue(subject.id)
      })}
      ${renderSubjectMetaField({
        field: "relations",
        label: "Relations",
        valueHtml: renderSubjectMetaButtonValue(summarizeSubjectMetaValue(meta.relations, "Aucune relation"))
      })}
    </div>
  `;
}

function renderSubIssuesForSujet(sujet, options = {}) {
  ensureViewUiState();
  const avisRowClass = options.avisRowClass || "js-row-avis";
  const stats = problemVerdictStats(sujet);
  const rows = (sujet.avis || []).map((avis) => {
    const effVerdict = getEffectiveAvisVerdict(avis.id);
    return `
      <div class="issue-row issue-row--avis click ${avisRowClass}" data-avis-id="${escapeHtml(avis.id)}">
        <div class="cell cell-theme cell-theme--full lvl0">
          <span class="chev chev--spacer"></span>
          ${renderStateDot(effVerdict)}
          <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
        </div>
      </div>
    `;
  }).join("");

  const body = renderSubIssuesTable({
    rowsHtml: rows,
    emptyTitle: "Aucun avis"
  });

  return renderSubIssuesPanel({
    title: "Avis rattachés",
    leftMetaHtml: `<div class="subissues-counts subissues-counts--total"><span class="mono">${(sujet.avis || []).length}</span></div>`,
    rightMetaHtml: buildVerdictBarHtml(stats.counts, { legend: true }),
    bodyHtml: body,
    isOpen: !!store.situationsView.rightSubissuesOpen
  });
}

function renderSubIssuesForSituation(situation, options = {}) {
  ensureViewUiState();

  const expandedSet = options.expandedSujets || store.situationsView.rightExpandedSujets;
  const sujetRowClass = options.sujetRowClass || "js-sub-right-select-sujet";
  const sujetToggleClass = options.sujetToggleClass || "js-sub-right-toggle-sujet";
  const avisRowClass = options.avisRowClass || "js-row-avis";

  const rows = [];
  for (const sujet of getSituationSubjects(situation)) {
    const open = expandedSet.has(sujet.id);
    const hasAvis = (sujet.avis || []).length > 0;
    const effStatus = getEffectiveSujetStatus(sujet.id);

    rows.push(`
      <div class="issue-row issue-row--pb click ${sujetRowClass}" data-sujet-id="${escapeHtml(sujet.id)}">
        <div class="cell cell-theme cell-theme--full lvl0">
          <span class="${sujetToggleClass}" data-sujet-id="${escapeHtml(sujet.id)}">${chevron(open, hasAvis)}</span>
          ${issueIcon(effStatus)}
          <span class="theme-text theme-text--pb">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</span>
          <span class="subissues-inline-count mono">${(sujet.avis || []).length} avis</span>
        </div>
      </div>
    `);

    if (open) {
      for (const avis of sujet.avis || []) {
        const effVerdict = getEffectiveAvisVerdict(avis.id);
        rows.push(`
          <div class="issue-row issue-row--avis click ${avisRowClass}" data-avis-id="${escapeHtml(avis.id)}">
            <div class="cell cell-theme cell-theme--full lvl1">
              <span class="chev chev--spacer"></span>
              ${renderStateDot(effVerdict)}
              <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
            </div>
          </div>
        `);
      }
    }
  }

  const stats = situationVerdictStats(situation);
  const body = renderSubIssuesTable({
    rowsHtml: rows.join(""),
    emptyTitle: "Aucun sujet"
  });

  return renderSubIssuesPanel({
    title: "Sujets rattachés",
    leftMetaHtml: problemsCountsHtml(situation),
    rightMetaHtml: buildVerdictBarHtml(stats.counts, { legend: true }),
    bodyHtml: body,
    isOpen: !!store.situationsView.rightSubissuesOpen
  });
}

function renderDetailsTitleWrapHtml(selection) {
  return renderSharedDetailsTitleWrap(selection, {
    emptyText: "Sélectionner un élément",
    buildTitleTextHtml(currentSelection) {
      const item = currentSelection.item;
      const entityType = getSelectionEntityType(currentSelection.type);
      const reviewIcon = renderEntityReviewLeadIcon(entityType, item.id);
      const titleSeenClass = getReviewTitleStateClass(entityType, item.id);
      return `
        ${reviewIcon ? `<span class="details-title-status">${reviewIcon}</span>` : ""}
        <span class="details-title-text ${titleSeenClass}">${escapeHtml(firstNonEmpty(item.title, item.id, "Détail"))}</span>
      `;
    },
    buildIdHtml(currentSelection) {
      return entityDisplayLinkHtml(currentSelection.type, currentSelection.item.id);
    },
    buildExpandedBottomHtml(currentSelection) {
      const item = currentSelection.item;
      if (currentSelection.type === "avis") {
        return renderVerboseAvisVerdictPill(getEffectiveAvisVerdict(item.id));
      }
      if (currentSelection.type === "sujet") {
        const stats = problemVerdictStats(item);
        const badgeHtml = statePill(getEffectiveSujetStatus(item.id), { reviewState: getEntityReviewMeta("sujet", item.id).review_state, entityType: "sujet" });
        return `${badgeHtml}${buildVerdictBarHtml(stats.counts, { legend: true })}`;
      }
      const stats = situationVerdictStats(item);
      const badgeHtml = statePill(getEffectiveSituationStatus(item.id), { reviewState: getEntityReviewMeta("situation", item.id).review_state, entityType: "situation" });
      return `${badgeHtml}${problemsCountsHtml(item)}${buildVerdictBarHtml(stats.counts, { legend: true })}`;
    },
    buildCompactConfig(currentSelection, { titleTextHtml, idHtml }) {
      const item = currentSelection.item;
      if (currentSelection.type === "avis") {
        return {
          variant: "inline",
          wrapClass: "details-title--compact-avis",
          bodyClass: "details-title-compact--avis",
          leftHtml: renderVerboseAvisVerdictPill(getEffectiveAvisVerdict(item.id)),
          topHtml: titleTextHtml,
          idHtml
        };
      }
      if (currentSelection.type === "sujet") {
        const stats = problemVerdictStats(item);
        return {
          variant: "grid",
          wrapClass: "details-title--compact-grid",
          leftHtml: statePill(getEffectiveSujetStatus(item.id), { reviewState: getEntityReviewMeta("sujet", item.id).review_state, entityType: "sujet" }),
          topHtml: titleTextHtml,
          bottomHtml: buildVerdictBarHtml(stats.counts, { legend: false })
        };
      }
      const stats = situationVerdictStats(item);
      return {
        variant: "grid",
        wrapClass: "details-title--compact-grid",
        leftHtml: statePill(getEffectiveSituationStatus(item.id), { reviewState: getEntityReviewMeta("situation", item.id).review_state, entityType: "situation" }),
        topHtml: titleTextHtml,
        bottomHtml: `${problemsCountsHtml(item)}${buildVerdictBarHtml(stats.counts, { legend: false })}`
      };
    }
  });
}

function renderDetailsTitleHtml(selection, options = {}) {
  const showExpand = options.showExpand !== false;
  return renderSharedDetailsTitleHtml(selection, {
    showExpand,
    titleWrapHtml: renderDetailsTitleWrapHtml(selection),
    emptyPanelTitle: "Sélectionner un élément",
    buildKickerText(currentSelection) {
      return currentSelection && currentSelection.type === "situation" ? "DÉTAILS" : "";
    },
    buildMetaHtml(currentSelection) {
      return escapeHtml(currentSelection?.item?.id || "—");
    }
  });
}


function renderDetailsBody(selection, options = {}) {
  if (!selection) {
    return `<div class="emptyState">Sélectionne une situation / un sujet / un avis pour afficher les détails.</div>`;
  }

  const item = selection.item;
  let descCard = "";
  let subIssuesHtml = "";

  if (selection.type === "avis") {
    descCard = renderDescriptionCard(selection);
    const sujet = getSujetByAvisId(item.id);
    if (sujet) {
      subIssuesHtml = renderSubIssuesForSujet(sujet, options.subissuesOptions || {});
    }
  } else if (selection.type === "sujet") {
    descCard = renderDescriptionCard(selection);
    subIssuesHtml = renderSubIssuesForSujet(item, options.subissuesOptions || {});
  } else {
    descCard = renderDescriptionCard(selection);
    subIssuesHtml = renderSubIssuesForSituation(item, options.subissuesOptions || {});
  }

  const threadHtml = renderThreadBlock();
  const commentBoxHtml = renderCommentBox(selection);
  const metaHtml = renderDetailedMetaForSelection(selection);
  const subjectMetaControlsHtml = selection.type === "sujet" ? renderSubjectMetaControls(item) : "";

  return `
    <div class="details-grid">
      <div class="details-main">
        <div class="gh-timeline">
          ${descCard}
          ${renderDocumentRefsCard(selection)}
          ${subIssuesHtml}
          ${threadHtml}
          ${commentBoxHtml}
        </div>
      </div>
      <aside class="details-meta-col">
        ${subjectMetaControlsHtml}
        <div class="meta-title">Metadata</div>
        ${metaHtml}
      </aside>
    </div>
  `;
}

function renderDetailsHtml(selectionOverride = null, options = {}) {
  const selection = selectionOverride || getActiveSelection();
  return {
    titleHtml: renderDetailsTitleHtml(selection),
    bodyHtml: renderDetailsBody(selection, options),
    modalTitle: selection ? firstNonEmpty(selection.item.title, selection.item.id, "Détail") : "Sélectionner un élément",
    modalMeta: selection ? firstNonEmpty(selection.item.id, "") : "—"
  };
}

/* =========================================================
   Modal / rerender / selection
========================================================= */

function updateDetailsModal() {
  const modal = document.getElementById("detailsModal");
  const head = modal?.querySelector?.(".modal__head");
  const title = document.getElementById("detailsTitleModal");
  const meta = document.getElementById("detailsMetaModal");
  const body = document.getElementById("detailsBodyModal");
  if (!modal || !title || !meta || !body) return;

  const isOpen = !!store.situationsView.detailsModalOpen;
  setOverlayChromeOpenState(modal, isOpen);
  document.body.classList.toggle("modal-open", isOpen);

  const details = renderDetailsHtml(null, {
    subissuesOptions: {
      sujetRowClass: "js-modal-drilldown-sujet",
      sujetToggleClass: "js-modal-toggle-sujet",
      avisRowClass: "js-modal-drilldown-avis",
      expandedSujets: store.situationsView.rightExpandedSujets
    }
  });

  if (head) head.classList.add("details-head--expanded");

  const selection = getActiveSelection();
  title.innerHTML = renderDetailsTitleWrapHtml(selection);
  meta.textContent = details.modalMeta;
  body.innerHTML = details.bodyHtml;

  ensureDrilldownDom();

  wireDetailsInteractive(body);
  bindDetailsScroll(document);
  body.__syncCondensedTitle?.();

  if (isOpen) {
    requestAnimationFrame(() => {
      const currentBody = document.getElementById("detailsBodyModal");
      currentBody?.__syncCondensedTitle?.();
    });
  }
}

function openDetailsModal() {
  closeGlobalNav();
  const selection = getActiveSelection();
  if (selection?.type && selection?.item?.id) {
    markEntitySeen(getSelectionEntityType(selection.type), selection.item.id, { source: "modal" });
  }
  store.situationsView.detailsModalOpen = true;
  updateDetailsModal();
}

function closeDetailsModal() {
  store.situationsView.detailsModalOpen = false;
  document.body.classList.remove("modal-open");
  updateDetailsModal();
}

function syncSituationsPrimaryScrollSource() {
  const panelHost = document.getElementById("situationsPanelHost");

  if (store.situationsView.showTableOnly) {
    const mainScrollBody = panelHost?.querySelector(".data-table-shell__body") || null;
    registerProjectPrimaryScrollSource(mainScrollBody);

    if (!mainScrollBody) return;

    requestAnimationFrame(() => {
      const currentPanelHost = document.getElementById("situationsPanelHost");
      const currentMainScrollBody = currentPanelHost?.querySelector(".data-table-shell__body") || null;
      if (!currentMainScrollBody || currentMainScrollBody !== mainScrollBody) return;
      registerProjectPrimaryScrollSource(currentMainScrollBody);
    });
    return;
  }

  const detailsHost = document.getElementById("situationsDetailsHost");
  registerProjectPrimaryScrollSource(detailsHost || null);
}

function rerenderPanels() {
  ensureViewUiState();

  const filteredSituations = getFilteredSituations();
  const counts = getVisibleCounts(filteredSituations);
  const panelHost = document.getElementById("situationsPanelHost");
  const searchInput = document.getElementById("situationsSearch");

  if (searchInput) searchInput.value = store.situationsView.search || "";

  rerenderSubjectsToolbar();

  if (panelHost) {
    if (String(store.situationsView.subjectsSubview || "subjects") === "labels") {
      panelHost.innerHTML = `<div id="labelsTableHost" class="project-table-host">${renderLabelsTableHtml()}</div>`;
      syncSituationsPrimaryScrollSource();
    } else if (String(store.situationsView.subjectsSubview || "subjects") === "objectives") {
      panelHost.innerHTML = `<div id="objectivesTableHost" class="project-table-host">${renderObjectivesTableHtml()}</div>`;
      syncSituationsPrimaryScrollSource();
    } else if (store.situationsView.showTableOnly) {
      panelHost.innerHTML = `<div id="situationsTableHost" class="project-table-host">${renderTableHtml(filteredSituations)}</div>`;
      syncSituationsPrimaryScrollSource();
    } else {
      const details = renderDetailsHtml(null, {
        subissuesOptions: {
          sujetRowClass: "js-modal-drilldown-sujet",
          sujetToggleClass: "js-modal-toggle-sujet",
          avisRowClass: "js-modal-drilldown-avis",
          expandedSujets: store.situationsView.rightExpandedSujets
        }
      });
      panelHost.innerHTML = `
        <section class="gh-panel gh-panel--details gh-panel--details-standalone" aria-label="Details">
          <div class="gh-panel__head gh-panel__head--tight" id="situationsDetailsTitle">${details.titleHtml}</div>
          <div class="details-body" id="situationsDetailsHost">${details.bodyHtml}</div>
        </section>
      `;
      const detailsHost = document.getElementById("situationsDetailsHost");
      wireDetailsInteractive(detailsHost);
      bindDetailsScroll(document);
      detailsHost?.__syncCondensedTitle?.();
      syncSituationsPrimaryScrollSource();
    }
  }

  updateDetailsModal();
  if (store.situationsView.drilldown?.isOpen) updateDrilldownPanel();
  refreshProjectShellChrome("situations");
}

function selectSituation(situationId) {
  const situation = getNestedSituation(situationId);
  if (!situation) return;

  store.situationsView.selectedSituationId = situationId;
  store.situationsView.selectedSujetId = null;
  store.situationsView.selectedAvisId = null;

  store.situationsView.showTableOnly = true;
  openDetailsModal();
}

function selectSujet(sujetId) {
  const sujet = getNestedSujet(sujetId);
  if (!sujet) return;

  const situation = getSituationBySujetId(sujetId);

  store.situationsView.selectedSituationId = situation?.id || null;
  store.situationsView.selectedSujetId = sujetId;
  store.situationsView.selectedAvisId = null;

  if (situation?.id) store.situationsView.expandedSituations.add(situation.id);

  store.situationsView.showTableOnly = true;
  openDetailsModal();
}

function selectAvis(avisId) {
  const avis = getNestedAvis(avisId);
  if (!avis) return;
  const sujet = getSujetByAvisId(avisId);
  const situation = getSituationByAvisId(avisId);

  store.situationsView.selectedSituationId = situation?.id || null;
  store.situationsView.selectedSujetId = sujet?.id || null;
  store.situationsView.selectedAvisId = avisId;

  if (situation?.id) store.situationsView.expandedSituations.add(situation.id);
  if (sujet?.id) store.situationsView.expandedSujets.add(sujet.id);

  store.situationsView.tempAvisVerdictFor = avisId;
  store.situationsView.tempAvisVerdict = getEffectiveAvisVerdict(avisId) || "F";

  store.situationsView.showTableOnly = false;
  markEntitySeen("avis", avisId, { source: "details" });
  rerenderPanels();
}
/* =========================================================
   Details actions (archive-like)
========================================================= */

function getScopedSelection(root) {
  if (root?.closest?.("#drilldownPanel")) {
    const sel = getDrilldownSelection();
    if (sel) return sel;
  }
  return getActiveSelection();
}

function currentDecisionTarget(root) {
  const sel = getScopedSelection(root);
  if (!sel) return null;
  return { type: sel.type, id: sel.item.id, item: sel.item };
}

function clearDescriptionEditState() {
  ensureViewUiState();
  store.situationsView.descriptionEdit = {
    entityType: null,
    entityId: null,
    draft: ""
  };
}

function syncDescriptionEditorDraft(root) {
  const ta = root.querySelector("[data-description-editor]");
  if (!ta) return;
  store.situationsView.descriptionEdit.draft = ta.value;
}

async function applyDescriptionSave(root) {
  const target = currentDecisionTarget(root);
  if (!target) return;

  const entityType = getSelectionEntityType(target.type);
  const entityId = target.id;
  const ta = root.querySelector("[data-description-editor]");
  if (!ta) return;

  const nextBody = String(ta.value || "").trim();
  if (!nextBody) return;

  const current = getEntityDescriptionState(entityType, entityId);
  const previousBody = String(current.body || "").trim();
  const initialAuthor = firstNonEmpty(current.author, target.item?.agent, "system");
  const initialAgent = String(firstNonEmpty(current.agent, target.item?.agent, "system")).toLowerCase();

  if (nextBody === previousBody && initialAgent === "human") {
    clearDescriptionEditState();
    rerenderScope(root);
    return;
  }

  addActivity(entityType, entityId, "description_version_initial", previousBody, {
    previous_author: initialAuthor
  }, { actor: initialAuthor, agent: initialAgent || "system" });

  setEntityDescriptionState(entityType, entityId, {
    body: nextBody,
    author: "human",
    agent: "human",
    avatar_type: "human",
    avatar_initial: "H"
  }, { actor: "Human", agent: "human" });

  markEntityValidated(entityType, entityId, { actor: "Human", agent: "human" });

  addActivity(entityType, entityId, "description_version_saved", nextBody, {
    previous_author: initialAuthor
  }, { actor: "Human", agent: "human" });

  clearDescriptionEditState();
  rerenderScope(root);
}

function rerenderScope(root) {
  rerenderPanels();
  if (root?.closest?.("#detailsModal") && store.situationsView.detailsModalOpen) {
    updateDetailsModal();
  }
  if (root?.closest?.("#drilldownPanel") && store.situationsView.drilldown?.isOpen) {
    updateDrilldownPanel();
  }
}

async function applyCommentAction(root) {
  const target = currentDecisionTarget(root);
  if (!target) return;

  const ta = root.querySelector("#humanCommentBox");
  if (!ta) return;

  const message = String(ta.value || "").trim();
  if (!message) return;

  const helpActive = !!store.situationsView.helpMode || isHelpTrigger(message);
  if (helpActive) {
    ta.value = "";
    store.situationsView.commentPreviewMode = false;
    await askHelpEphemeral({
      rootEl: root,
      type: target.type,
      id: target.id,
      humanMessage: message,
      scope: root.closest("#detailsModal") ? "modal" : (root.closest("#drilldownPanel") ? "overlay" : "details")
    });
    return;
  }

  addComment(target.type, target.id, message, { actor: "Human", agent: "human" });
  ta.value = "";
  store.situationsView.commentPreviewMode = false;
  rerenderScope(root);

  if (/@rapso\b/i.test(message)) {
    await askRapsoAndAppendReply({ type: target.type, id: target.id, humanMessage: message });
  }
}

function buildCascadeCounts() {
  return { situation: 0, sujet: 0, avis: 0 };
}

function getCascadeTargets(entityType, entityId, mode = "self") {
  const targets = [];
  const pushTarget = (type, id) => {
    if (!type || !id) return;
    targets.push({ type, id });
  };

  if (entityType === "avis") {
    pushTarget("avis", entityId);
    return targets;
  }

  if (entityType === "sujet") {
    const sujet = getNestedSujet(entityId);
    if (!sujet) return targets;
    if (mode === "descendants") {
      for (const avis of sujet.avis || []) pushTarget("avis", avis.id);
    }
    pushTarget("sujet", entityId);
    return targets;
  }

  if (entityType === "situation") {
    const situation = getNestedSituation(entityId);
    if (!situation) return targets;
    if (mode === "descendants") {
      for (const sujet of getSituationSubjects(situation)) {
        for (const avis of sujet.avis || []) pushTarget("avis", avis.id);
        pushTarget("sujet", sujet.id);
      }
    }
    pushTarget("situation", entityId);
  }

  return targets;
}

function applyValidationCascade(entityType, entityId, mode = "self") {
  const targets = getCascadeTargets(entityType, entityId, mode);
  const counts = buildCascadeCounts();

  for (const target of targets) {
    markEntityValidated(target.type, target.id, { actor: "Human", agent: "human" });
    claimDescriptionAsHuman(target.type, target.id, { actor: "Human", agent: "human" });
    counts[target.type] += 1;
  }

  return { applied: targets.length, skipped: 0, counts };
}

function applyRestoreCascade(entityType, entityId, mode = "self") {
  const targets = getCascadeTargets(entityType, entityId, mode);
  const counts = buildCascadeCounts();
  let applied = 0;
  let skipped = 0;

  for (const target of targets) {
    const ok = restoreEntityReviewMeta(target.type, target.id, { actor: "Human", agent: "human" });
    if (ok) {
      applied += 1;
      counts[target.type] += 1;
    } else {
      skipped += 1;
    }
  }

  return { applied, skipped, counts };
}

function applyValidateAvis(root) {
  const target = currentDecisionTarget(root);
  if (!target || target.type !== "avis") return;

  const avisId = target.id;
  const verdict = String(store.situationsView.tempAvisVerdict || "F").toUpperCase();
  setDecision("avis", avisId, `VALIDATED_${verdict}`, "", { actor: "Human", agent: "human" });
  markEntityValidated("avis", avisId, { actor: "Human", agent: "human" });
  claimDescriptionAsHuman("avis", avisId, { actor: "Human", agent: "human" });
  addActivity("avis", avisId, "review_validated", "", {
    mode: "self",
    counts: { situation: 0, sujet: 0, avis: 1 }
  }, { actor: "Human", agent: "human" });
  rerenderScope(root);
}

function applyReviewStateRecursively(entityType, entityId, nextState, mode = "descendants") {
  const targets = getCascadeTargets(entityType, entityId, mode);
  const normalized = normalizeReviewState(nextState);
  const counts = buildCascadeCounts();
  let applied = 0;
  let skipped = 0;

  for (const target of targets) {
    if (normalized === "rejected" || normalized === "dismissed") {
      stashReviewRestoreSnapshot(target.type, target.id, { actor: "Human", agent: "human" });
    }

    const ok = setEntityReviewState(target.type, target.id, normalized, { actor: "Human", agent: "human" });
    if (ok) {
      applied += 1;
      counts[target.type] += 1;
    } else {
      skipped += 1;
    }
  }

  return { applied, skipped, counts };
}

function applyReviewStateChange(root, nextState) {
  const target = currentDecisionTarget(root);
  if (!target) return;

  const entityType = getSelectionEntityType(target.type);
  const entityId = target.id;
  const normalized = normalizeReviewState(nextState);
  const mode = entityType === "avis" ? "self" : "descendants";

  if ((normalized === "rejected" || normalized === "dismissed") && entityType === "sujet") {
    const ok = window.confirm(
      "Rejeter ce sujet entraînera le rejet automatique de tous ses avis. Voulez-vous continuer ? Vous pourrez récupérer ensuite l'état précédent."
    );
    if (!ok) return;
  }

  if ((normalized === "rejected" || normalized === "dismissed") && entityType === "situation") {
    const ok = window.confirm(
      "Rejeter cette situation entraînera le rejet automatique de tous ses sujets et de tous ses avis. Voulez-vous continuer ? Vous pourrez récupérer ensuite l'état précédent."
    );
    if (!ok) return;
  }

  const result = applyReviewStateRecursively(entityType, entityId, normalized, mode);

  addActivity(entityType, entityId, `review_${normalized}`, "", {
    review_state: normalized,
    applied: result.applied,
    skipped: result.skipped,
    mode,
    counts: result.counts
  }, { actor: "Human", agent: "human" });

  if (result.skipped > 0) {
    window.alert(`${result.skipped} élément(s) déjà diffusé(s) ont été conservé(s).`);
  }

  rerenderScope(root);
}

function applyRestoreReviewState(root) {
  const target = currentDecisionTarget(root);
  if (!target) return;

  const entityType = getSelectionEntityType(target.type);
  const entityId = target.id;
  const mode = entityType === "avis" ? "self" : "descendants";
  const result = applyRestoreCascade(entityType, entityId, mode);

  addActivity(entityType, entityId, "review_restored", "", {
    applied: result.applied,
    skipped: result.skipped,
    mode,
    counts: result.counts
  }, { actor: "Human", agent: "human" });

  rerenderScope(root);
}

function applyValidateEntity(root, mode = "self") {
  const target = currentDecisionTarget(root);
  if (!target) return;

  if (target.type === "avis") {
    applyValidateAvis(root);
    return;
  }

  const entityType = getSelectionEntityType(target.type);
  const entityId = target.id;
  const result = applyValidationCascade(entityType, entityId, mode);

  addActivity(entityType, entityId, "review_validated", "", {
    applied: result.applied,
    skipped: result.skipped,
    mode,
    counts: result.counts
  }, { actor: "Human", agent: "human" });

  rerenderScope(root);
}

function applyIssueCloseOrReopen(nextStatus, root) {
  const target = currentDecisionTarget(root);
  if (!target || target.type === "avis") return;

  if (target.type === "sujet") {
    setDecision("sujet", target.id, nextStatus === "closed" ? "CLOSED" : "REOPENED", "", { actor: "Human", agent: "human" });
  } else {
    setDecision("situation", target.id, nextStatus === "closed" ? "CLOSED" : "REOPENED", "", { actor: "Human", agent: "human" });
  }

  rerenderScope(root);
}

function syncCommentPreview(root) {
  const ta = root.querySelector("#humanCommentBox");
  const preview = root.querySelector("#humanCommentPreview");
  if (!preview) return;
  preview.innerHTML = mdToHtml(ta?.value || "");
}


function closeSubjectMetaDropdown() {
  if (store.situationsView.subjectMetaDropdown) {
    store.situationsView.subjectMetaDropdown.field = null;
    store.situationsView.subjectMetaDropdown.query = "";
    store.situationsView.subjectMetaDropdown.activeKey = "";
  }
}

function closeSubjectKanbanDropdown() {
  if (store.situationsView.subjectKanbanDropdown) {
    store.situationsView.subjectKanbanDropdown.subjectId = "";
    store.situationsView.subjectKanbanDropdown.situationId = "";
    store.situationsView.subjectKanbanDropdown.query = "";
    store.situationsView.subjectKanbanDropdown.activeKey = "";
  }
}

function getSubjectMetaMenuEntries(subject, field) {
  const config = buildSubjectMetaMenuItems(subject, field);
  if (field === "objectives" || field === "situations") return [...(config.openItems || []), ...(config.closedItems || [])];
  return config.items || [];
}

function setSubjectMetaActiveEntry(subject, field, direction = 1) {
  const entries = getSubjectMetaMenuEntries(subject, field);
  if (!entries.length) {
    store.situationsView.subjectMetaDropdown.activeKey = "";
    return;
  }
  const currentKey = String(store.situationsView.subjectMetaDropdown.activeKey || "");
  const currentIndex = entries.findIndex((entry) => String(entry?.key || "") === currentKey);
  const nextIndex = currentIndex >= 0
    ? (currentIndex + direction + entries.length) % entries.length
    : 0;
  store.situationsView.subjectMetaDropdown.activeKey = String(entries[nextIndex]?.key || "");
}

function ensureSubjectMetaDropdownHost() {
  let host = document.getElementById("subjectMetaDropdownHost");
  if (host) return host;
  host = document.createElement("div");
  host.id = "subjectMetaDropdownHost";
  host.className = "subject-meta-dropdown-host";
  document.body.appendChild(host);
  return host;
}

function getSubjectMetaScopeRoot() {
  if (store.situationsView.drilldown?.isOpen) return document.getElementById("drilldownBody");
  if (store.situationsView.detailsModalOpen) return document.getElementById("detailsBodyModal");
  return document.getElementById("situationsDetailsHost");
}

function renderSubjectMetaDropdownHost(root) {
  const host = ensureSubjectMetaDropdownHost();
  const field = String(store.situationsView.subjectMetaDropdown?.field || "");
  const kanbanDropdown = store.situationsView.subjectKanbanDropdown || {};
  const selection = getScopedSelection(root);
  if (selection?.type !== "sujet") {
    host.innerHTML = "";
    host.setAttribute("aria-hidden", "true");
    return host;
  }
  if (field) {
    host.innerHTML = renderSubjectMetaDropdown(selection.item, field);
    host.setAttribute("aria-hidden", "false");
    return host;
  }
  if (String(kanbanDropdown.subjectId || "") === String(selection.item.id || "") && String(kanbanDropdown.situationId || "")) {
    host.innerHTML = renderSubjectKanbanDropdown(selection.item.id, String(kanbanDropdown.situationId || ""));
    host.setAttribute("aria-hidden", "false");
    return host;
  }
  host.innerHTML = "";
  host.setAttribute("aria-hidden", "true");
  return host;
}

function rerenderSubjectMetaScopes() {
  rerenderPanels();
  if (store.situationsView.detailsModalOpen) updateDetailsModal();
  if (store.situationsView.drilldown?.isOpen) updateDrilldownPanel();
}

function focusSubjectMetaSearch(root, field) {
  requestAnimationFrame(() => {
    const input = ensureSubjectMetaDropdownHost().querySelector(`[data-subject-meta-search="${field}"]`);
    input?.focus();
    input?.select?.();
  });
}

function focusSubjectKanbanSearch(subjectId, situationId) {
  requestAnimationFrame(() => {
    const input = ensureSubjectMetaDropdownHost().querySelector(`[data-subject-kanban-search="${CSS.escape(String(subjectId || ""))}"][data-subject-kanban-search-situation-id="${CSS.escape(String(situationId || ""))}"]`);
    input?.focus();
    input?.select?.();
  });
}

function syncSubjectMetaDropdownPosition(root) {
  const field = String(store.situationsView.subjectMetaDropdown?.field || "");
  const kanbanDropdown = store.situationsView.subjectKanbanDropdown || {};
  const host = ensureSubjectMetaDropdownHost();
  let anchorSelector = "";
  if (field) {
    anchorSelector = `[data-subject-meta-anchor="${field}"]`;
  } else if (String(kanbanDropdown.subjectId || "") && String(kanbanDropdown.situationId || "")) {
    anchorSelector = `[data-subject-kanban-anchor="${CSS.escape(String(kanbanDropdown.subjectId || ""))}::${CSS.escape(String(kanbanDropdown.situationId || ""))}"]`;
  } else {
    host.innerHTML = "";
    host.setAttribute("aria-hidden", "true");
    return;
  }
  requestAnimationFrame(() => {
    const scopeRoot = root || getSubjectMetaScopeRoot();
    const anchor = scopeRoot?.querySelector?.(anchorSelector);
    const dropdown = host.querySelector(".subject-meta-dropdown");
    if (!anchor || !dropdown) {
      host.innerHTML = "";
      host.setAttribute("aria-hidden", "true");
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const dropdownWidth = 320;
    const gutter = 12;
    const left = Math.max(gutter, Math.min(rect.right - dropdownWidth, viewportWidth - dropdownWidth - gutter));
    const maxHeight = Math.max(240, Math.min(420, viewportHeight - rect.bottom - gutter - 8));
    dropdown.style.left = `${left}px`;
    dropdown.style.top = `${Math.max(gutter, rect.bottom - 4)}px`;
    dropdown.style.width = `${dropdownWidth}px`;
    dropdown.style.maxHeight = `${maxHeight}px`;
    host.setAttribute("aria-hidden", "false");
  });
}

let subjectMetaDropdownDocumentBound = false;

function bindSubjectMetaDropdownDocumentEvents() {
  if (subjectMetaDropdownDocumentBound) return;
  subjectMetaDropdownDocumentBound = true;

  document.addEventListener("click", (event) => {
    const hasMetaOpen = !!store.situationsView.subjectMetaDropdown?.field;
    const hasKanbanOpen = !!store.situationsView.subjectKanbanDropdown?.subjectId && !!store.situationsView.subjectKanbanDropdown?.situationId;
    if (!hasMetaOpen && !hasKanbanOpen) return;
    if (event.target.closest("#subjectMetaDropdownHost .subject-meta-dropdown")) return;
    if (event.target.closest("[data-subject-meta-trigger]")) return;
    if (event.target.closest("[data-subject-kanban-trigger]")) return;
    closeSubjectMetaDropdown();
    closeSubjectKanbanDropdown();
    rerenderSubjectMetaScopes();
  });

  window.addEventListener("resize", () => {
    if (!store.situationsView.subjectMetaDropdown?.field && !(store.situationsView.subjectKanbanDropdown?.subjectId && store.situationsView.subjectKanbanDropdown?.situationId)) return;
    syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
  });

  document.addEventListener("scroll", () => {
    if (!store.situationsView.subjectMetaDropdown?.field && !(store.situationsView.subjectKanbanDropdown?.subjectId && store.situationsView.subjectKanbanDropdown?.situationId)) return;
    syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
  }, true);
}

function resetSubjectsTabView() {
  closeSubjectMetaDropdown();
  closeSubjectKanbanDropdown();
  resetObjectiveEditState();
  store.situationsView.subjectsSubview = String(store.situationsView.subjectsSubview || "subjects");
  if (store.situationsView.subjectsSubview !== "objectives") {
    store.situationsView.selectedObjectiveId = "";
  }
  if (store.situationsView.detailsModalOpen) closeDetailsModal();
  if (store.situationsView.drilldown?.isOpen) closeDrilldown();
  if (subjectsCurrentRoot && subjectsCurrentRoot.isConnected) {
    rerenderPanels();
    syncSituationsPrimaryScrollSource();
  }
}

function bindSubjectsTabReset() {
  if (subjectsTabResetBound) return;
  subjectsTabResetBound = true;

  document.addEventListener("click", (event) => {
    const tabLink = event.target.closest?.('.project-tabs a[data-project-tab-id="subjects"]');
    if (!tabLink) return;

    const href = String(tabLink.getAttribute("href") || "").trim();
    const normalizedCurrentHash = String(location.hash || "").trim();
    const resolvesToCurrentHash = (() => {
      if (!href) return false;
      if (href === normalizedCurrentHash) return true;
      try {
        const url = new URL(href, window.location.href);
        return `${url.hash || ""}` === normalizedCurrentHash;
      } catch {
        return false;
      }
    })();
    const isActiveSubjectsTab = tabLink.classList.contains("active") || tabLink.getAttribute("aria-current") === "page";
    if (!resolvesToCurrentHash && !isActiveSubjectsTab) return;

    const hasOverlayState = !!store.situationsView.detailsModalOpen
      || !!store.situationsView.drilldown?.isOpen
      || !!store.situationsView.subjectMetaDropdown?.field
      || !!store.situationsView.subjectKanbanDropdown?.subjectId;
    const hasSubviewState = String(store.situationsView.subjectsSubview || "subjects") !== "subjects"
      || !!store.situationsView.selectedObjectiveId
      || !!store.situationsView.objectiveEdit?.isOpen;
    if (!hasOverlayState && !hasSubviewState) return;
    if (!subjectsCurrentRoot || !subjectsCurrentRoot.isConnected) return;

    event.preventDefault();
    event.stopPropagation();
    resetSubjectsTabView();
  });
}

function wireDetailsInteractive(root) {
  if (!root) return;

  bindSubjectMetaDropdownDocumentEvents();
  const dropdownHost = renderSubjectMetaDropdownHost(root);
  const scopedSelection = getScopedSelection(root);

  root.querySelectorAll("[data-subject-meta-trigger]").forEach((btn) => {
    btn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const field = String(btn.dataset.subjectMetaTrigger || "");
      const dropdown = store.situationsView.subjectMetaDropdown || {};
      const isAlreadyOpen = dropdown.field === field;
      if (isAlreadyOpen) {
        closeSubjectMetaDropdown();
      } else {
        dropdown.field = field;
        dropdown.query = "";
        const entries = scopedSelection?.type === "sujet" ? getSubjectMetaMenuEntries(scopedSelection.item, field) : [];
        const selectedObjectiveKey = field === "objectives" && scopedSelection?.type === "sujet"
          ? String(getSubjectSidebarMeta(scopedSelection.item.id).objectiveIds[0] || "")
          : "";
        dropdown.activeKey = selectedObjectiveKey && entries.some((entry) => String(entry?.key || "") === selectedObjectiveKey)
          ? selectedObjectiveKey
          : String(entries[0]?.key || "");
      }
      rerenderScope(root);
      if (!isAlreadyOpen) {
        focusSubjectMetaSearch(root, field);
        syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
      }
    };
  });

  root.querySelectorAll("[data-subject-kanban-trigger]").forEach((btn) => {
    btn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const subjectId = String(btn.dataset.subjectKanbanTrigger || "");
      const situationId = String(btn.dataset.subjectKanbanSituationId || "");
      const dropdown = store.situationsView.subjectKanbanDropdown || {};
      const isAlreadyOpen = String(dropdown.subjectId || "") === subjectId && String(dropdown.situationId || "") === situationId;
      if (isAlreadyOpen) {
        closeSubjectKanbanDropdown();
      } else {
        closeSubjectMetaDropdown();
        dropdown.subjectId = subjectId;
        dropdown.situationId = situationId;
        dropdown.query = "";
        const entries = getSubjectKanbanMenuEntries(subjectId, situationId, "");
        dropdown.activeKey = String((entries.find((entry) => entry.isSelected) || entries[0] || {}).key || "");
      }
      rerenderScope(root);
      if (!isAlreadyOpen) {
        focusSubjectKanbanSearch(subjectId, situationId);
        syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
      }
    };
  });

  dropdownHost.querySelectorAll("[data-subject-kanban-search]").forEach((input) => {
    input.addEventListener("input", () => {
      const subjectId = String(input.dataset.subjectKanbanSearch || "");
      const situationId = String(input.dataset.subjectKanbanSearchSituationId || "");
      store.situationsView.subjectKanbanDropdown.query = String(input.value || "");
      const entries = getSubjectKanbanMenuEntries(subjectId, situationId, input.value || "");
      store.situationsView.subjectKanbanDropdown.activeKey = String((entries.find((entry) => entry.isSelected) || entries[0] || {}).key || "");
      rerenderScope(root);
      focusSubjectKanbanSearch(subjectId, situationId);
      syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
    });

    input.addEventListener("keydown", (event) => {
      const subjectId = String(input.dataset.subjectKanbanSearch || "");
      const situationId = String(input.dataset.subjectKanbanSearchSituationId || "");
      const entries = getSubjectKanbanMenuEntries(subjectId, situationId, store.situationsView.subjectKanbanDropdown.query || "");
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!entries.length) return;
        const currentKey = String(store.situationsView.subjectKanbanDropdown.activeKey || "");
        const currentIndex = entries.findIndex((entry) => String(entry?.key || "") === currentKey);
        const nextIndex = currentIndex >= 0 ? (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length : 0;
        store.situationsView.subjectKanbanDropdown.activeKey = String(entries[nextIndex]?.key || "");
        rerenderScope(root);
        focusSubjectKanbanSearch(subjectId, situationId);
        syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeSubjectKanbanDropdown();
        rerenderScope(root);
        return;
      }
      if (event.key === "Enter") {
        const activeKey = String(store.situationsView.subjectKanbanDropdown.activeKey || "");
        if (!activeKey) return;
        event.preventDefault();
        setSujetKanbanStatus(subjectId, activeKey, { situationId });
        closeSubjectKanbanDropdown();
        rerenderScope(root);
      }
    });
  });

  dropdownHost.querySelectorAll("[data-subject-meta-search]").forEach((input) => {
    input.addEventListener("input", () => {
      const field = String(input.dataset.subjectMetaSearch || "");
      store.situationsView.subjectMetaDropdown.query = String(input.value || "");
      const subject = getScopedSelection(root)?.type === "sujet" ? getScopedSelection(root).item : null;
      const entries = subject ? getSubjectMetaMenuEntries(subject, field) : [];
      store.situationsView.subjectMetaDropdown.activeKey = String(entries[0]?.key || "");
      rerenderScope(root);
      focusSubjectMetaSearch(root, field);
      syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
    });

    input.addEventListener("keydown", (event) => {
      const field = String(input.dataset.subjectMetaSearch || "");
      const subjectSelection = getScopedSelection(root);
      if (subjectSelection?.type !== "sujet") return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setSubjectMetaActiveEntry(subjectSelection.item, field, event.key === "ArrowDown" ? 1 : -1);
        rerenderScope(root);
        focusSubjectMetaSearch(root, field);
        syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeSubjectMetaDropdown();
        rerenderScope(root);
        return;
      }
      if (event.key === "Enter") {
        const activeKey = String(store.situationsView.subjectMetaDropdown.activeKey || "");
        if (!activeKey) return;
        if (field === "objectives") {
          event.preventDefault();
          setSubjectObjective(subjectSelection.item.id, activeKey);
          closeSubjectMetaDropdown();
          rerenderScope(root);
          return;
        }
        if (field === "situations") {
          event.preventDefault();
          toggleSubjectSituation(subjectSelection.item.id, activeKey);
          rerenderScope(root);
          focusSubjectMetaSearch(root, field);
          syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
        }
      }
    });
  });

  dropdownHost.querySelectorAll("[data-objective-select]").forEach((btn) => {
    btn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const subjectSelection = getScopedSelection(root);
      if (subjectSelection?.type !== "sujet") return;
      const objectiveId = String(btn.dataset.objectiveSelect || "");
      setSubjectObjective(subjectSelection.item.id, objectiveId);
      closeSubjectMetaDropdown();
      rerenderScope(root);
    };
  });

  dropdownHost.querySelectorAll("[data-situation-toggle]").forEach((btn) => {
    btn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const subjectSelection = getScopedSelection(root);
      if (subjectSelection?.type !== "sujet") return;
      toggleSubjectSituation(subjectSelection.item.id, String(btn.dataset.situationToggle || ""));
      rerenderScope(root);
      focusSubjectMetaSearch(root, "situations");
      syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());
    };
  });

  dropdownHost.querySelectorAll("[data-subject-kanban-select]").forEach((btn) => {
    btn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const subjectId = String(btn.dataset.subjectKanbanSubjectId || "");
      const situationId = String(btn.dataset.subjectKanbanSituationId || "");
      const nextStatus = String(btn.dataset.subjectKanbanSelect || "");
      setSujetKanbanStatus(subjectId, nextStatus, { situationId });
      closeSubjectKanbanDropdown();
      rerenderScope(root);
    };
  });

  syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());


  const descriptionTextarea = root.querySelector("[data-description-editor]");
  if (descriptionTextarea) {
    descriptionTextarea.addEventListener("input", () => {
      syncDescriptionEditorDraft(root);
    });
  }

  root.querySelectorAll("[data-action='edit-description']").forEach((btn) => {
    btn.onclick = () => {
      const target = currentDecisionTarget(root);
      if (!target) return;
      const entityType = getSelectionEntityType(target.type);
      const current = getEntityDescriptionState(entityType, target.id);
      store.situationsView.descriptionEdit = {
        entityType,
        entityId: target.id,
        draft: current.body || ""
      };
      rerenderScope(root);
    };
  });

  root.querySelectorAll("[data-action='cancel-description-edit']").forEach((btn) => {
    btn.onclick = () => {
      clearDescriptionEditState();
      rerenderScope(root);
    };
  });

  root.querySelectorAll("[data-action='save-description-edit']").forEach((btn) => {
    btn.onclick = async () => {
      await applyDescriptionSave(root);
    };
  });

  const commentTextarea = root.querySelector("#humanCommentBox");
  if (commentTextarea) {
    commentTextarea.addEventListener("input", () => {
      if (store.situationsView.commentPreviewMode) syncCommentPreview(root);
    });
    commentTextarea.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        applyCommentAction(root);
      }
    });

    root.querySelectorAll(".js-review-reject-action").forEach((actionRoot) => {
      if (actionRoot.dataset.reviewBound === "true") return;
      actionRoot.dataset.reviewBound = "true";
  
      actionRoot.addEventListener("ghaction:action", (event) => {
        const action = String(event.detail?.action || "");
        if (action === "review:restore") {
          applyRestoreReviewState(root);
          return;
        }
        if (!action.startsWith("review:set:")) return;
  
        const nextState = action.slice("review:set:".length);
        if (!nextState) return;
  
        applyReviewStateChange(root, nextState);
      });
    });

    root.querySelectorAll(".js-review-validate-action").forEach((actionRoot) => {
      if (actionRoot.dataset.reviewValidateBound === "true") return;
      actionRoot.dataset.reviewValidateBound = "true";

      actionRoot.addEventListener("ghaction:action", (event) => {
        const action = String(event.detail?.action || "");
        if (!action.startsWith("review:validate:")) return;
        const mode = action.endsWith(":descendants") ? "descendants" : "self";
        applyValidateEntity(root, mode);
      });
    });
  }

  root.querySelectorAll("[data-action='toggle-subissues']").forEach((btn) => {
    btn.onclick = () => {
      store.situationsView.rightSubissuesOpen = !store.situationsView.rightSubissuesOpen;
      rerenderPanels();
    };
  });

  root.querySelectorAll(".js-sub-right-toggle-sujet, .js-modal-toggle-sujet, .js-drilldown-toggle-sujet").forEach((btn) => {
    btn.onclick = (ev) => {
      ev.stopPropagation();
      const sujetId = String(btn.dataset.sujetId || "");
      if (!sujetId) return;
      const expandedSet = isDrilldownScope ? store.situationsView.drilldown.expandedSujets : store.situationsView.rightExpandedSujets;
      if (expandedSet.has(sujetId)) expandedSet.delete(sujetId);
      else expandedSet.add(sujetId);
      if (isDrilldownScope) updateDrilldownPanel();
      else rerenderPanels();
    };
  });

  root.querySelectorAll(".js-sub-right-select-sujet").forEach((btn) => {
    btn.onclick = () => {
      const sujetId = String(btn.dataset.sujetId || "");
      if (sujetId) selectSujet(sujetId);
    };
  });

  root.querySelectorAll(".js-modal-drilldown-sujet, .js-drilldown-select-sujet").forEach((btn) => {
    btn.onclick = () => {
      const sujetId = String(btn.dataset.sujetId || "");
      if (sujetId) openDrilldownFromSujet(sujetId);
    };
  });

  root.querySelectorAll(".js-modal-drilldown-avis, .js-drilldown-select-avis").forEach((btn) => {
    btn.onclick = () => {
      const avisId = String(btn.dataset.avisId || "");
      if (avisId) openDrilldownFromAvis(avisId);
    };
  });

  root.querySelectorAll("[data-action='tab-write']").forEach((btn) => {
    btn.onclick = () => {
      store.situationsView.commentPreviewMode = false;
      rerenderPanels();
    };
  });

  root.querySelectorAll("[data-action='tab-preview']").forEach((btn) => {
    btn.onclick = () => {
      store.situationsView.commentPreviewMode = true;
      rerenderPanels();
    };
  });

  root.querySelectorAll("[data-action='toggle-help']").forEach((btn) => {
    btn.onclick = () => {
      store.situationsView.helpMode = !store.situationsView.helpMode;
      rerenderPanels();
    };
  });

  root.querySelectorAll("[data-action='add-comment']").forEach((btn) => {
    btn.onclick = async () => {
      await applyCommentAction(root);
    };
  });

  root.querySelectorAll(".verdict-switch [data-main-action]").forEach((btn) => {
    btn.onclick = (ev) => {
      ev.preventDefault();
      const action = String(btn.dataset.mainAction || "");
      if (!action.startsWith("set-verdict:")) return;
      const v = action.slice("set-verdict:".length).toUpperCase();
      if (!v) return;
      store.situationsView.tempAvisVerdict = v;
      rerenderPanels();
    };
  });

  root.querySelectorAll("[data-action='avis-validate']").forEach((btn) => {
    btn.onclick = () => applyValidateAvis(root);
  });

  root.querySelectorAll("[data-action='issue-close']").forEach((btn) => {
    btn.onclick = () => applyIssueCloseOrReopen("closed", root);
  });

  root.querySelectorAll("[data-action='issue-reopen']").forEach((btn) => {
    btn.onclick = () => applyIssueCloseOrReopen("open", root);
  });
}

/* =========================================================
   Panel / modal events
========================================================= */

let modalEventsBound = false;

function bindModalEvents() {
  if (modalEventsBound) return;
  modalEventsBound = true;

  const modal = document.getElementById("detailsModal");

  bindOverlayChromeDismiss(modal, {
    onClose: closeDetailsModal
  });

  document.getElementById("detailsClose")?.addEventListener("click", closeDetailsModal);

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (store.situationsView.detailsModalOpen) closeDetailsModal();
    if (store.situationsView.drilldown?.isOpen) closeDrilldown();
  });
}

function initRightSplitter(root) {
  const page = root.classList.contains("gh-page--2col") ? root : root.querySelector(".gh-page--2col");
  const details = root.querySelector(".gh-panel--details");
  if (!page || !details) return;

  const existingSplitter = page.querySelector(":scope > .gh-splitter");
  if (existingSplitter) existingSplitter.remove();

  const splitter = document.createElement("div");
  splitter.className = "gh-splitter";
  splitter.setAttribute("role", "separator");
  splitter.setAttribute("aria-orientation", "vertical");
  splitter.setAttribute("aria-label", "Redimensionner la section Détails");
  page.insertBefore(splitter, details);

  const MIN_W = 320;
  const MAX_W = 820;

  function currentRightWidth() {
    const rectW = Math.round(details.getBoundingClientRect().width || 0);
    const cssVar = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--rightW"), 10);
    if (rectW >= 120) return rectW;
    if (Number.isFinite(cssVar) && cssVar > 0) return cssVar;
    return 420;
  }

  function setRightWidth(px) {
    const clamped = Math.max(MIN_W, Math.min(MAX_W, Math.round(px)));
    document.documentElement.style.setProperty("--rightW", `${clamped}px`);
  }

  let startX = 0;
  let startW = 0;
  let dragging = false;

  function onMove(event) {
    if (!dragging) return;
    const x = (event.touches && event.touches[0]) ? event.touches[0].clientX : event.clientX;
    const dx = x - startX;
    setRightWidth(startW - dx);
    if (event.cancelable) event.preventDefault();
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove("is-resizing");
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend", onUp);
  }

  function onDown(event) {
    if (window.getComputedStyle(splitter).display === "none") return;
    dragging = true;
    document.body.classList.add("is-resizing");
    startX = (event.touches && event.touches[0]) ? event.touches[0].clientX : event.clientX;
    startW = currentRightWidth();
    if (event.cancelable) event.preventDefault();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  }

  splitter.addEventListener("mousedown", onDown);
  splitter.addEventListener("touchstart", onDown, { passive: false });
  setRightWidth(currentRightWidth());
}

function ensureDrilldownDom() {
  if (document.getElementById("drilldownPanel")) return;

  const panel = document.createElement("div");
  panel.id = "drilldownPanel";
  panel.className = "drilldown overlay-host overlay-host--side hidden";
  panel.setAttribute("aria-hidden", "true");

  panel.innerHTML = renderOverlayChrome({
    shellClassName: "drilldown__inner gh-panel gh-panel--details",
    variant: "drilldown",
    ariaLabel: "Détails",
    headHtml: renderOverlayChromeHead({
      eyebrow: "DÉTAILS",
      titleId: "drilldownTitle",
      closeId: "drilldownClose",
      closeLabel: "Fermer",
      headClassName: "drilldown__head"
    }),
    bodyId: "drilldownBody",
    bodyClassName: "drilldown__body details-body"
  });

  document.body.appendChild(panel);

  bindOverlayChromeDismiss(panel, {
    onClose: closeDrilldown
  });
}

function getDrilldownSelection() {
  ensureViewUiState();
  const dd = store.situationsView.drilldown;
  if (!dd) return null;
  if (dd.selectedAvisId) {
    const avis = getNestedAvis(dd.selectedAvisId);
    if (avis) return { type: "avis", item: avis };
  }
  if (dd.selectedSujetId) {
    const sujet = getNestedSujet(dd.selectedSujetId);
    if (sujet) return { type: "sujet", item: sujet };
  }
  if (dd.selectedSituationId) {
    const situation = getNestedSituation(dd.selectedSituationId);
    if (situation) return { type: "situation", item: situation };
  }
  return null;
}

function updateDrilldownPanel() {
  ensureViewUiState();
  ensureDrilldownDom();

  const panel = document.getElementById("drilldownPanel");
  const title = document.getElementById("drilldownTitle");
  const body = document.getElementById("drilldownBody");
  if (!panel || !title || !body) return;

  const selection = getDrilldownSelection();
  const details = renderDetailsHtml(selection, {
    subissuesOptions: {
      sujetRowClass: "js-drilldown-select-sujet",
      sujetToggleClass: "js-drilldown-toggle-sujet",
      avisRowClass: "js-drilldown-select-avis",
      expandedSujets: store.situationsView.drilldown.expandedSujets
    }
  });

  title.innerHTML = selection ? renderDetailsTitleWrapHtml(selection) : "—";
  body.innerHTML = details.bodyHtml;

  wireDetailsInteractive(body);
  bindDetailsScroll(document);
  body.__syncCondensedTitle?.();
}

function openDrilldown() {
  ensureViewUiState();
  ensureDrilldownDom();
  closeGlobalNav();
  store.situationsView.drilldown.isOpen = true;
  const panel = document.getElementById("drilldownPanel");
  setOverlayChromeOpenState(panel, true);
  document.body.classList.add("drilldown-open");
  updateDrilldownPanel();
}

function closeDrilldown() {
  ensureViewUiState();
  store.situationsView.drilldown.isOpen = false;
  const panel = document.getElementById("drilldownPanel");
  setOverlayChromeOpenState(panel, false);
  document.body.classList.remove("drilldown-open");
}

function openDrilldownFromSituation(situationId) {
  ensureViewUiState();
  const situation = getNestedSituation(situationId);
  if (!situation) return;
  store.situationsView.drilldown.selectedSituationId = situation.id;
  store.situationsView.drilldown.selectedSujetId = null;
  store.situationsView.drilldown.selectedAvisId = null;
  markEntitySeen("situation", situation.id, { source: "drilldown" });
  openDrilldown();
}

function openDrilldownFromSujet(sujetId) {
  ensureViewUiState();
  const sujet = getNestedSujet(sujetId);
  const situation = getSituationBySujetId(sujetId);
  if (!sujet) return;
  store.situationsView.drilldown.selectedSituationId = situation?.id || null;
  store.situationsView.drilldown.selectedSujetId = sujet.id;
  store.situationsView.drilldown.selectedAvisId = null;
  store.situationsView.drilldown.expandedSujets.add(sujet.id);
  markEntitySeen("sujet", sujet.id, { source: "drilldown" });
  openDrilldown();
}

function openDrilldownFromAvis(avisId) {
  ensureViewUiState();
  const avis = getNestedAvis(avisId);
  const sujet = getSujetByAvisId(avisId);
  const situation = getSituationByAvisId(avisId);
  if (!avis) return;
  store.situationsView.drilldown.selectedSituationId = situation?.id || null;
  store.situationsView.drilldown.selectedSujetId = sujet?.id || null;
  store.situationsView.drilldown.selectedAvisId = avis.id;
  if (sujet?.id) store.situationsView.drilldown.expandedSujets.add(sujet.id);
  markEntitySeen("avis", avis.id, { source: "drilldown" });
  openDrilldown();
}

function bindCondensedTitleScroll(scrollEl, classHost, key) {
  bindOverlayChromeCompact(scrollEl, classHost, key);
}

function bindDetailsScroll(root) {
  bindCondensedTitleScroll(
    root.querySelector("#situationsDetailsHost"),
    root.querySelector(".gh-panel--details"),
    "details"
  );

  bindCondensedTitleScroll(
    document.getElementById("detailsBodyModal"),
    document.querySelector("#detailsModal .modal__inner"),
    "modal"
  );

  bindCondensedTitleScroll(
    document.getElementById("drilldownBody"),
    document.querySelector("#drilldownPanel .drilldown__inner"),
    "drilldown"
  );
}

function bindSituationsEvents(root, headerRoot) {
  if (root?.dataset?.subjectsEventsBound === "1") return;
  if (root?.dataset) root.dataset.subjectsEventsBound = "1";
  const toolbarRoot = document.getElementById("situationsToolbarHost");

  toolbarRoot?.addEventListener("input", (event) => {
    const searchInput = event.target.closest?.("#situationsSearch");
    if (!searchInput) return;
    store.situationsView.search = String(searchInput.value || "");
    rerenderPanels();
  });

  toolbarRoot?.addEventListener("ghaction:action", (event) => {
    const action = String(event.detail?.action || "");
    if (!action) return;
    if (action === "add-sujet" || action === "add-objective" || action === "add-label") {
      event.preventDefault();
      return;
    }
    if (action === "open-labels") {
      event.preventDefault();
      resetObjectiveEditState();
      store.situationsView.subjectsSubview = "labels";
      store.situationsView.selectedObjectiveId = "";
      store.situationsView.showTableOnly = true;
      rerenderPanels();
      return;
    }
    if (action === "open-objectives") {
      event.preventDefault();
      resetObjectiveEditState();
      store.situationsView.subjectsSubview = "objectives";
      store.situationsView.selectedObjectiveId = "";
      store.situationsView.showTableOnly = true;
      rerenderPanels();
      return;
    }
    if (action === "edit-objective") {
      event.preventDefault();
      if (!store.situationsView.selectedObjectiveId) return;
      openObjectiveEdit(store.situationsView.selectedObjectiveId);
      rerenderPanels();
      return;
    }
    if (action === "close-objective") {
      event.preventDefault();
      closeObjective(store.situationsView.selectedObjectiveId);
      rerenderPanels();
    }
  });

  toolbarRoot?.addEventListener("click", (event) => {
    const objectiveBackButton = event.target.closest("[data-objectives-back]");
    if (!objectiveBackButton) return;
    event.preventDefault();
    resetObjectiveEditState();
    store.situationsView.subjectsSubview = "objectives";
    store.situationsView.selectedObjectiveId = "";
    store.situationsView.showTableOnly = true;
    rerenderPanels();
  });

  syncSubjectMetaDropdownPosition(getSubjectMetaScopeRoot());

  root.addEventListener("click", (event) => {
    const objectivesFilterButton = event.target.closest("[data-objectives-filter]");
    if (objectivesFilterButton) {
      event.preventDefault();
      resetObjectiveEditState();
      store.situationsView.objectivesStatusFilter = String(objectivesFilterButton.dataset.objectivesFilter || "open").toLowerCase() === "closed" ? "closed" : "open";
      store.situationsView.selectedObjectiveId = "";
      rerenderPanels();
      return;
    }

    const objectiveBackButton = event.target.closest("[data-objectives-back]");
    if (objectiveBackButton) {
      event.preventDefault();
      resetObjectiveEditState();
      store.situationsView.selectedObjectiveId = "";
      rerenderPanels();
      return;
    }

    const objectiveDateToggle = event.target.closest("[data-shared-date-input-trigger='objectiveEditDueDate']");
    if (objectiveDateToggle) {
      event.preventDefault();
      ensureViewUiState();
      store.situationsView.objectiveEdit.calendarOpen = !store.situationsView.objectiveEdit.calendarOpen;
      rerenderPanels();
      return;
    }

    const objectiveDatePrev = event.target.closest("[data-shared-date-nav='objectiveEditDueDate-prev']");
    if (objectiveDatePrev) {
      event.preventDefault();
      const edit = store.situationsView.objectiveEdit;
      const shifted = shiftSharedCalendarMonth(edit.viewYear, edit.viewMonth, -1);
      edit.viewYear = shifted.year;
      edit.viewMonth = shifted.month;
      rerenderPanels();
      return;
    }

    const objectiveDateNext = event.target.closest("[data-shared-date-nav='objectiveEditDueDate-next']");
    if (objectiveDateNext) {
      event.preventDefault();
      const edit = store.situationsView.objectiveEdit;
      const shifted = shiftSharedCalendarMonth(edit.viewYear, edit.viewMonth, 1);
      edit.viewYear = shifted.year;
      edit.viewMonth = shifted.month;
      rerenderPanels();
      return;
    }

    const objectiveDateDay = event.target.closest("[data-shared-date-day][data-shared-date-owner='objectiveEditDueDate']");
    if (objectiveDateDay) {
      event.preventDefault();
      const nextValue = String(objectiveDateDay.dataset.sharedDateDay || "");
      store.situationsView.objectiveEdit.dueDate = nextValue;
      store.situationsView.objectiveEdit.calendarOpen = false;
      const selectedDate = parseSharedDateInputValue(nextValue);
      if (selectedDate) {
        store.situationsView.objectiveEdit.viewYear = selectedDate.getFullYear();
        store.situationsView.objectiveEdit.viewMonth = selectedDate.getMonth();
      }
      rerenderPanels();
      return;
    }

    const objectiveDateClear = event.target.closest("[data-shared-date-clear='objectiveEditDueDate']");
    if (objectiveDateClear) {
      event.preventDefault();
      store.situationsView.objectiveEdit.dueDate = "";
      store.situationsView.objectiveEdit.calendarOpen = false;
      rerenderPanels();
      return;
    }

    const objectiveDateToday = event.target.closest("[data-shared-date-today='objectiveEditDueDate']");
    if (objectiveDateToday) {
      event.preventDefault();
      const today = new Date();
      store.situationsView.objectiveEdit.dueDate = toSharedDateInputValue(today);
      store.situationsView.objectiveEdit.viewYear = today.getFullYear();
      store.situationsView.objectiveEdit.viewMonth = today.getMonth();
      store.situationsView.objectiveEdit.calendarOpen = false;
      rerenderPanels();
      return;
    }

    const objectiveEditAction = event.target.closest("[data-objective-edit-action]");
    if (objectiveEditAction) {
      event.preventDefault();
      const action = String(objectiveEditAction.dataset.objectiveEditAction || "");
      if (action === "cancel") {
        resetObjectiveEditState();
      } else if (action === "save") {
        saveObjectiveEdit();
      } else if (action === "close") {
        const editingObjective = getEditingObjective();
        if (editingObjective?.closed) reopenObjective(store.situationsView.selectedObjectiveId);
        else closeObjective(store.situationsView.selectedObjectiveId);
      }
      rerenderPanels();
      return;
    }

    const objectiveTitleTrigger = event.target.closest(".objectives-row__title, .objectives-row[data-objective-id]");
    if (objectiveTitleTrigger && String(store.situationsView.subjectsSubview || "subjects") === "objectives") {
      event.preventDefault();
      const objectiveId = String(objectiveTitleTrigger.dataset.objectiveId || objectiveTitleTrigger.closest("[data-objective-id]")?.dataset.objectiveId || "");
      if (objectiveId) {
        resetObjectiveEditState();
        store.situationsView.selectedObjectiveId = objectiveId;
        store.situationsView.showTableOnly = true;
        rerenderPanels();
        return;
      }
    }
    const subjectsStatusFilterButton = event.target.closest("[data-subjects-status-filter]");
    if (subjectsStatusFilterButton) {
      event.preventDefault();
      store.situationsView.subjectsStatusFilter = String(subjectsStatusFilterButton.dataset.subjectsStatusFilter || "open").toLowerCase() === "closed" ? "closed" : "open";
      rerenderPanels();
      return;
    }

    const verdictBtn = event.target.closest("#verdictHeadBtn");
    if (verdictBtn) {
      event.preventDefault();
      event.stopPropagation();

      const currentBtn = root.querySelector("#verdictHeadBtn");
      const currentDropdown = root.querySelector("#verdictHeadDropdown");
      if (!currentBtn || !currentDropdown) return;

      const isOpen = currentDropdown.classList.contains("gh-menu--open");
      currentDropdown.classList.toggle("gh-menu--open", !isOpen);
      currentBtn.setAttribute("aria-expanded", String(!isOpen));
      return;
    }

    const verdictItem = event.target.closest("#verdictHeadDropdown [data-verdict]");
    if (verdictItem) {
      event.preventDefault();
      event.stopPropagation();

      const verdict = String(verdictItem.dataset.verdict || "ALL").toUpperCase();
      store.situationsView.verdictFilter = verdict;

      const currentBtn = root.querySelector("#verdictHeadBtn");
      const currentDropdown = root.querySelector("#verdictHeadDropdown");
      if (currentDropdown) currentDropdown.classList.remove("gh-menu--open");
      if (currentBtn) currentBtn.setAttribute("aria-expanded", "false");

      rerenderPanels();
      return;
    }

    const verdictDropdown = root.querySelector("#verdictHeadDropdown");
    const currentBtn = root.querySelector("#verdictHeadBtn");

    if (
      verdictDropdown &&
      currentBtn &&
      !event.target.closest("#verdictHeadBtn") &&
      !event.target.closest("#verdictHeadDropdown")
    ) {
      verdictDropdown.classList.remove("gh-menu--open");
      currentBtn.setAttribute("aria-expanded", "false");
    }

    const expandBtn = event.target.closest("#detailsExpand");
    if (expandBtn) {
      event.preventDefault();
      openDetailsModal();
      return;
    }

    const toggleSituation = event.target.closest(".js-toggle-situation");
    if (toggleSituation) {
      event.preventDefault();
      event.stopPropagation();
      const situationId = String(toggleSituation.dataset.situationId || "");
      if (store.situationsView.expandedSituations.has(situationId)) {
        store.situationsView.expandedSituations.delete(situationId);
      } else {
        store.situationsView.expandedSituations.add(situationId);
      }
      rerenderPanels();
      return;
    }

    const toggleSujet = event.target.closest(".js-toggle-sujet");
    if (toggleSujet) {
      event.preventDefault();
      event.stopPropagation();
      const sujetId = String(toggleSujet.dataset.sujetId || "");
      if (store.situationsView.expandedSujets.has(sujetId)) {
        store.situationsView.expandedSujets.delete(sujetId);
      } else {
        store.situationsView.expandedSujets.add(sujetId);
      }
      rerenderPanels();
      return;
    }

    const titleTrigger = event.target.closest(".js-row-title-trigger");
    if (titleTrigger) {
      event.preventDefault();
      const entityType = String(titleTrigger.dataset.rowEntityType || "");
      const entityId = String(titleTrigger.dataset.rowEntityId || "");
      if (entityType === "sujet") {
        selectSujet(entityId);
        return;
      }
      if (entityType === "situation") {
        selectSituation(entityId);
        return;
      }
      if (entityType === "avis") {
        selectAvis(entityId);
      }
    }
  });

  root.addEventListener("input", (event) => {
    const field = event.target.closest?.("[data-objective-edit-field]");
    if (!field) return;
    const key = String(field.dataset.objectiveEditField || "");
    if (!key) return;
    store.situationsView.objectiveEdit[key] = String(field.value || "");
  });

  if (!objectiveEditCalendarDismissBound) {
    objectiveEditCalendarDismissBound = true;
    document.addEventListener("click", (event) => {
      if (!store.situationsView.objectiveEdit?.isOpen || !store.situationsView.objectiveEdit?.calendarOpen) return;
      if (event.target.closest(".shared-date-picker")) return;
      store.situationsView.objectiveEdit.calendarOpen = false;
      rerenderPanels();
    });
  }
}

function renderSubjectsToolbarButton({ id, label, icon, action, tone = "default" }) {
  return renderGhActionButton({
    id,
    label,
    icon,
    tone,
    size: "md",
    mainAction: action,
    withChevron: false
  });
}

function renderSituationsAddAction() {
  return renderSubjectsToolbarButton({
    id: "situationsAddAction",
    label: "Nouveau sujet",
    tone: "primary",
    action: "add-sujet"
  });
}

function renderObjectivesCreateAction() {
  return renderSubjectsToolbarButton({
    id: "objectivesCreateAction",
    label: "Nouvel objectif",
    tone: "primary",
    action: "add-objective"
  });
}

function renderSubjectsLabelsAction() {
  return renderSubjectsToolbarButton({
    id: "subjectsLabelsAction",
    label: "Labels",
    icon: svgIcon("tag", { className: "octicon octicon-tag" }),
    action: "open-labels"
  });
}

function renderSubjectsObjectivesAction() {
  return renderSubjectsToolbarButton({
    id: "subjectsObjectivesAction",
    label: "Objectifs",
    icon: svgIcon("milestone", { className: "octicon octicon-milestone" }),
    action: "open-objectives"
  });
}

function renderSituationsViewHeaderHtml() {
  if (String(store.situationsView.subjectsSubview || "subjects") === "labels") {
    return renderProjectTableToolbar({
      className: "project-table-toolbar--situations project-table-toolbar--labels",
      leftHtml: renderProjectTableToolbarGroup({
        html: '<div class="project-table-toolbar__title">Labels</div>'
      }),
      rightHtml: renderProjectTableToolbarGroup({
        html: renderSubjectsToolbarButton({ id: "labelsCreateAction", label: "Nouveau label", action: "add-label", tone: "primary" })
      })
    });
  }

  if (String(store.situationsView.subjectsSubview || "subjects") === "objectives") {
    const selectedObjective = getObjectiveById(store.situationsView.selectedObjectiveId || "");
    const isEditingObjective = !!store.situationsView.objectiveEdit?.isOpen
      && String(store.situationsView.objectiveEdit?.objectiveId || "") === String(selectedObjective?.id || "");
    const leftHtml = selectedObjective
      ? renderProjectTableToolbarGroup({
          html: `<div class="objective-breadcrumb"><button type="button" class="objective-breadcrumb__link" data-objectives-back="list">Objectifs</button><span class="objective-breadcrumb__sep">/</span><span class="objective-breadcrumb__current">${escapeHtml(selectedObjective.title)}</span></div>`
        })
      : renderProjectTableToolbarGroup({
          html: '<div class="project-table-toolbar__title">Objectifs</div>'
        });
    const rightHtml = selectedObjective
      ? (isEditingObjective
          ? ""
          : [
              renderProjectTableToolbarGroup({ html: renderSubjectsToolbarButton({ id: "objectiveEditAction", label: "Modifier", action: "edit-objective" }) }),
              renderProjectTableToolbarGroup({ html: renderSubjectsToolbarButton({ id: "objectiveCloseAction", label: "Fermer l'Objectif", action: "close-objective" }) }),
              renderProjectTableToolbarGroup({ html: renderSituationsAddAction() })
            ].join(""))
      : renderProjectTableToolbarGroup({
          html: renderObjectivesCreateAction()
        });
    return renderProjectTableToolbar({
      className: "project-table-toolbar--situations project-table-toolbar--objectives",
      leftHtml,
      rightHtml
    });
  }

  const rightHtml = [
    renderProjectTableToolbarGroup({
      html: renderProjectTableToolbarSearch({
        id: "situationsSearch",
        value: String(store.situationsView.search || ""),
        placeholder: "topic / EC8 / mot-clé…"
      })
    }),
    renderProjectTableToolbarGroup({
      html: renderSubjectsLabelsAction()
    }),
    renderProjectTableToolbarGroup({
      html: renderSubjectsObjectivesAction()
    }),
    renderProjectTableToolbarGroup({
      html: renderSituationsAddAction()
    })
  ].join("");

  return renderProjectTableToolbar({
    className: "project-table-toolbar--situations",
    leftHtml: "",
    rightHtml
  });
}

function rerenderSubjectsToolbar() {
  const toolbarHost = document.getElementById("situationsToolbarHost");
  if (!toolbarHost) return;
  toolbarHost.innerHTML = `
    <div class="project-situations__table-toolbar project-page-shell project-page-shell--toolbar">
      ${renderSituationsViewHeaderHtml()}
    </div>
  `;
}

function formatObjectiveMeta(objective) {
  const dueDate = objective?.dueDate
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(objective.dueDate))
    : "Pas de date définie";
  const counts = getObjectiveSubjectCounts(objective);
  return `${dueDate} - ${counts.closed}/${counts.total} sujets fermés`;
}


const SUBJECT_DEFAULT_LABEL_DEFINITIONS = [
  { key: "bloquant", label: "bloquant", description: "Empêche l'avancement ou la décision.", color: "#f85149", textColor: "#ffffff", borderColor: "rgba(248,81,73,.45)" },
  { key: "critique", label: "critique", description: "Point majeur à traiter en priorité.", color: "#db6d28", textColor: "#ffffff", borderColor: "rgba(219,109,40,.45)" },
  { key: "sensible", label: "sensible", description: "Sujet délicat nécessitant de la vigilance.", color: "#8957e5", textColor: "#ffffff", borderColor: "rgba(137,87,229,.45)" },
  { key: "non conforme", label: "non conforme", description: "Écart constaté par rapport aux exigences.", color: "#cf222e", textColor: "#ffffff", borderColor: "rgba(207,34,46,.45)" },
  { key: "incident", label: "incident", description: "Événement ou anomalie signalé(e).", color: "#bc4c00", textColor: "#ffffff", borderColor: "rgba(188,76,0,.45)" },
  { key: "réserve", label: "réserve", description: "Point à lever ou à suivre avant clôture.", color: "#9a6700", textColor: "#ffffff", borderColor: "rgba(154,103,0,.45)" },
  { key: "question", label: "question", description: "Clarification attendue sur ce point.", color: "#a371f7", textColor: "#ffffff", borderColor: "rgba(163,113,247,.45)" },
  { key: "à arbitrer", label: "à arbitrer", description: "Décision de pilotage ou d'arbitrage requise.", color: "#8b5cf6", textColor: "#ffffff", borderColor: "rgba(139,92,246,.45)" },
  { key: "validation requise", label: "validation requise", description: "Validation formelle attendue.", color: "#1f6feb", textColor: "#ffffff", borderColor: "rgba(31,111,235,.45)" },
  { key: "à préciser", label: "à préciser", description: "Informations complémentaires nécessaires.", color: "#316dca", textColor: "#ffffff", borderColor: "rgba(49,109,202,.45)" },
  { key: "information", label: "information", description: "Point purement informatif.", color: "#0969da", textColor: "#ffffff", borderColor: "rgba(9,105,218,.45)" },
  { key: "refusé", label: "refusé", description: "Demande ou proposition rejetée.", color: "#d1242f", textColor: "#ffffff", borderColor: "rgba(209,36,47,.45)" },
  { key: "variante", label: "variante", description: "Solution alternative proposée.", color: "#1b7f83", textColor: "#ffffff", borderColor: "rgba(27,127,131,.45)" },
  { key: "modification", label: "modification", description: "Évolution demandée sur l'existant.", color: "#0a7ea4", textColor: "#ffffff", borderColor: "rgba(10,126,164,.45)" },
  { key: "optimisation", label: "optimisation", description: "Amélioration possible identifiée.", color: "#2da44e", textColor: "#ffffff", borderColor: "rgba(45,164,78,.45)" },
  { key: "correction", label: "correction", description: "Action corrective à mettre en œuvre.", color: "#3fb950", textColor: "#ffffff", borderColor: "rgba(63,185,80,.45)" },
  { key: "action moa", label: "action MOA", description: "Action attendue de la maîtrise d'ouvrage.", color: "#0ea5e9", textColor: "#ffffff", borderColor: "rgba(14,165,233,.45)" },
  { key: "action moe", label: "action MOE", description: "Action attendue de la maîtrise d'œuvre.", color: "#2563eb", textColor: "#ffffff", borderColor: "rgba(37,99,235,.45)" },
  { key: "action entreprise", label: "action Entreprise", description: "Action attendue de l'entreprise travaux.", color: "#14b8a6", textColor: "#ffffff", borderColor: "rgba(20,184,166,.45)" },
  { key: "action bet", label: "action BET", description: "Action attendue du bureau d'études.", color: "#0891b2", textColor: "#ffffff", borderColor: "rgba(8,145,178,.45)" },
  { key: "coordination", label: "coordination", description: "Coordination nécessaire entre acteurs.", color: "#7c3aed", textColor: "#ffffff", borderColor: "rgba(124,58,237,.45)" },
  { key: "doublon", label: "doublon", description: "Sujet déjà couvert ailleurs.", color: "#6e7681", textColor: "#ffffff", borderColor: "rgba(110,118,129,.45)" },
  { key: "hors périmètre", label: "hors périmètre", description: "En dehors du périmètre de traitement.", color: "#57606a", textColor: "#ffffff", borderColor: "rgba(87,96,106,.45)" },
  { key: "sans suite", label: "sans suite", description: "Point clos sans action complémentaire.", color: "#6b7280", textColor: "#ffffff", borderColor: "rgba(107,114,128,.45)" }
];

function normalizeSubjectLabelKey(value) {
  return String(value || "").trim().toLowerCase();
}

function getSubjectLabelDefinitions() {
  return SUBJECT_DEFAULT_LABEL_DEFINITIONS;
}

function getSubjectsLabelUsageCounts() {
  const counts = new Map();
  const sujets = (store.situationsView.data || []).flatMap((situation) => Array.isArray(situation?.sujets) ? situation.sujets : []);
  sujets.forEach((sujet) => {
    const seen = new Set();
    getSubjectSidebarMeta(sujet?.id).labels.forEach((label) => {
      const key = normalizeSubjectLabelKey(label);
      if (!key || seen.has(key)) return;
      seen.add(key);
      counts.set(key, Number(counts.get(key) || 0) + 1);
    });
  });
  return counts;
}

function renderSubjectLabelBadge(labelDef) {
  return `<span class="subject-label-badge" style="--subject-label-bg:${escapeHtml(labelDef.color)};--subject-label-fg:${escapeHtml(labelDef.textColor || '#ffffff')};--subject-label-border:${escapeHtml(labelDef.borderColor || labelDef.color)};">${escapeHtml(labelDef.label)}</span>`;
}

function renderLabelsTableHtml() {
  const labels = getSubjectLabelDefinitions();
  const counts = getSubjectsLabelUsageCounts();
  const headHtml = `<div class="labels-table__head-count">${labels.length} labels</div>`;
  const rowsHtml = labels.map((labelDef) => {
    const usageCount = Number(counts.get(normalizeSubjectLabelKey(labelDef.key)) || 0);
    return `
      <div class="labels-row">
        <div class="labels-row__name">${renderSubjectLabelBadge(labelDef)}</div>
        <div class="labels-row__description">${escapeHtml(labelDef.description)}</div>
        <div class="labels-row__count">${usageCount > 0 ? `<span class="labels-row__count-value">${usageCount}</span>` : ""}</div>
      </div>
    `;
  }).join("");

  return renderIssuesTable({
    className: "labels-table",
    headHtml,
    rowsHtml,
    headClassName: "labels-table__head",
    bodyClassName: "labels-table__body",
    gridTemplate: "minmax(180px, 320px) minmax(0, 1fr) 80px",
    emptyTitle: "Aucun label",
    emptyDescription: "Les labels apparaîtront ici."
  });
}

function getObjectiveById(objectiveId) {
  return getObjectives().find((objective) => String(objective?.id || "") === String(objectiveId || "")) || null;
}

function resetObjectiveEditState() {
  ensureViewUiState();
  store.situationsView.objectiveEdit = {
    isOpen: false,
    objectiveId: "",
    title: "",
    dueDate: "",
    description: "",
    calendarOpen: false,
    viewYear: 0,
    viewMonth: 0
  };
}

function openObjectiveEdit(objectiveId) {
  ensureViewUiState();
  const objective = getObjectiveById(objectiveId);
  if (!objective) return;
  const selectedDate = parseSharedDateInputValue(objective.dueDate);
  const fallback = new Date();
  store.situationsView.objectiveEdit = {
    isOpen: true,
    objectiveId: objective.id,
    title: String(objective.title || ""),
    dueDate: toSharedDateInputValue(selectedDate),
    description: String(objective.description || ""),
    calendarOpen: false,
    viewYear: selectedDate?.getFullYear?.() || fallback.getFullYear(),
    viewMonth: selectedDate?.getMonth?.() ?? fallback.getMonth()
  };
}

function getEditingObjective() {
  ensureViewUiState();
  const edit = store.situationsView.objectiveEdit;
  if (!edit?.isOpen || !edit.objectiveId) return null;
  return getObjectiveById(edit.objectiveId);
}

function saveObjectiveEdit() {
  ensureViewUiState();
  const edit = store.situationsView.objectiveEdit;
  if (!edit?.isOpen || !edit.objectiveId) return;
  const nextTitle = String(edit.title || "").trim();
  if (!nextTitle) return;
  const nextDueDate = String(edit.dueDate || "").trim() || null;
  const nextDescription = String(edit.description || "").trim();
  persistRunBucket((draft) => {
    const objectives = Array.isArray(draft.objectives) ? draft.objectives : [];
    const target = objectives.find((objective) => String(objective?.id || "") === String(edit.objectiveId || ""));
    if (!target) return;
    target.title = nextTitle;
    target.dueDate = nextDueDate;
    target.description = nextDescription;
  });
  resetObjectiveEditState();
}

function setObjectiveClosedState(objectiveId, closed) {
  const targetId = String(objectiveId || store.situationsView.selectedObjectiveId || "");
  if (!targetId) return;
  persistRunBucket((draft) => {
    const objectives = Array.isArray(draft.objectives) ? draft.objectives : [];
    const target = objectives.find((objective) => String(objective?.id || "") === targetId);
    if (!target) return;
    target.closed = !!closed;
  });
  resetObjectiveEditState();
  store.situationsView.selectedObjectiveId = "";
  store.situationsView.objectivesStatusFilter = closed ? "open" : "closed";
}

function closeObjective(objectiveId) {
  setObjectiveClosedState(objectiveId, true);
}

function reopenObjective(objectiveId) {
  setObjectiveClosedState(objectiveId, false);
}

function getObjectiveSubjects(objective) {
  if (!objective) return [];
  const ids = Array.isArray(objective.subjectIds) ? objective.subjectIds : [];
  return ids.map((subjectId) => getNestedSujet(subjectId)).filter(Boolean);
}

function getObjectiveSubjectCounts(objective) {
  const linkedSubjects = getObjectiveSubjects(objective);
  if (linkedSubjects.length) {
    let open = 0;
    let closed = 0;
    for (const sujet of linkedSubjects) {
      if (sujetMatchesStatusFilter(sujet, "closed")) closed += 1;
      else open += 1;
    }
    return { open, closed, total: linkedSubjects.length, linkedSubjects };
  }

  const total = Number.isFinite(Number(objective?.subjectsCount)) ? Number(objective.subjectsCount) : 0;
  const closed = Math.max(0, Math.min(total, Number.isFinite(Number(objective?.closedSubjectsCount)) ? Number(objective.closedSubjectsCount) : 0));
  const open = Math.max(0, total - closed);
  return { open, closed, total, linkedSubjects: [] };
}

function formatObjectiveDueDateLabel(objective) {
  if (!objective?.dueDate) return "Pas de date définie";
  const parsed = new Date(objective.dueDate);
  if (Number.isNaN(parsed.getTime())) return String(objective.dueDate);
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(parsed);
}

function renderObjectiveStatusBadge(objective) {
  return statePill(objective?.closed ? "closed" : "open");
}

function renderObjectiveProgressBar(objective, options = {}) {
  const counts = getObjectiveSubjectCounts(objective);
  const percent = counts.total > 0 ? Math.round((counts.closed / counts.total) * 100) : 0;
  const compact = !!options.compact;
  const rootClassName = compact ? "objective-progress objective-progress--compact" : "objective-progress";
  const trackFirst = compact
    ? `
      <div class="objective-progress__track" aria-hidden="true">
        <span class="objective-progress__fill" style="width:${percent}%"></span>
      </div>
      <div class="objective-progress__meta">
        <div class="objective-progress__label"><strong>${percent}%</strong> terminé</div>
        <div class="objective-progress__counts">${counts.open} ouverts <span aria-hidden="true">•</span> ${counts.closed} fermés</div>
      </div>
    `
    : `
      <div class="objective-progress__label"><strong>${percent}%</strong> terminé</div>
      <div class="objective-progress__track" aria-hidden="true">
        <span class="objective-progress__fill" style="width:${percent}%"></span>
      </div>
    `;
  return `
    <div class="${rootClassName}" aria-label="${percent}% terminé">
      ${trackFirst}
    </div>
  `;
}

function renderObjectiveSubjectsTableHtml(objective) {
  const counts = getObjectiveSubjectCounts(objective);
  const activeStatusFilter = getCurrentSubjectsStatusFilter();
  const visibleSubjects = counts.linkedSubjects.filter((sujet) => sujetMatchesStatusFilter(sujet, activeStatusFilter));

  const bodyHtml = visibleSubjects.length
    ? visibleSubjects.map((sujet) => {
        const parentSituation = getSituationBySujetId(sujet.id);
        return renderFlatSujetRow(sujet, parentSituation?.id || "");
      }).join("")
    : renderDataTableEmptyState({
        title: activeStatusFilter === "closed" ? "Aucun sujet fermé" : "Aucun sujet ouvert",
        description: "Les sujets rattachés à cet objectif apparaîtront ici."
      });

  return renderIssuesTable({
    className: "issues-table objectives-subjects-table",
    gridTemplate: getSituationsTableGridTemplate(),
    headHtml: renderSituationsTableHeadHtml({
      columns: [
        { className: "cell cell-theme", html: renderTableHeadFilterToggle({
          activeValue: activeStatusFilter,
          items: [
            { label: "Ouverts", value: "open", count: counts.open, dataAttr: "subjects-status-filter" },
            { label: "Fermés", value: "closed", count: counts.closed, dataAttr: "subjects-status-filter" }
          ]
        }) },
        { className: "cell cell-prio", label: "Prio" },
        { className: "cell cell-agent", label: "Agent" },
        { className: "cell cell-id mono", label: "#" }
      ]
    }),
    rowsHtml: visibleSubjects.length ? bodyHtml : "",
    emptyTitle: activeStatusFilter === "closed" ? "Aucun sujet fermé" : "Aucun sujet ouvert",
    emptyDescription: "Les sujets rattachés à cet objectif apparaîtront ici."
  });
}

function renderObjectiveEditFormHtml(objective) {
  const edit = store.situationsView.objectiveEdit;
  const selectedDate = parseSharedDateInputValue(edit?.dueDate || objective?.dueDate || "");
  const fallback = new Date();
  const viewYear = Number.isFinite(Number(edit?.viewYear)) ? Number(edit.viewYear) : (selectedDate?.getFullYear?.() || fallback.getFullYear());
  const viewMonth = Number.isFinite(Number(edit?.viewMonth)) ? Number(edit.viewMonth) : (selectedDate?.getMonth?.() ?? fallback.getMonth());
  const isClosed = !!objective?.closed;
  const closeActionLabel = isClosed ? "Rouvrir l'objectif" : "Fermer l'objectif";
  const saveButtonClassName = isClosed ? "gh-btn gh-btn--comment" : "gh-btn gh-btn--primary gh-btn--comment";

  return `
    <section class="objective-edit-form">
      <header class="objective-edit-form__header">
        <h2 class="objective-edit-form__title">Modifier l'objectif</h2>
      </header>
      <div class="objective-edit-form__separator" aria-hidden="true"></div>

      <div class="objective-edit-form__field">
        <label class="objective-edit-form__label" for="objectiveEditTitle">Titre <span aria-hidden="true">*</span></label>
        <input
          id="objectiveEditTitle"
          class="objective-edit-form__input"
          type="text"
          value="${escapeHtml(edit?.title || objective?.title || "")}"
          placeholder="${escapeHtml(objective?.title || "")}" 
          data-objective-edit-field="title"
        >
      </div>

      <div class="objective-edit-form__field objective-edit-form__field--date">
        <label class="objective-edit-form__label" for="objectiveEditDueDate">Date d'échéance (optionnel)</label>
        ${renderSharedDatePicker({
          idBase: "objectiveEditDueDate",
          value: edit?.dueDate || "",
          selectedDate,
          viewYear,
          viewMonth,
          isOpen: !!edit?.calendarOpen,
          placeholder: "Sélectionner une date",
          inputLabel: formatSharedDateInputValue(selectedDate),
          calendarLabel: "Sélectionner une date d'échéance"
        })}
      </div>

      <div class="objective-edit-form__field">
        <label class="objective-edit-form__label" for="objectiveEditDescription">Description (optionnel)</label>
        <textarea
          id="objectiveEditDescription"
          class="objective-edit-form__textarea"
          rows="5"
          placeholder="Décrire l'objectif"
          data-objective-edit-field="description"
        >${escapeHtml(edit?.description || objective?.description || "")}</textarea>
      </div>

      <div class="objective-edit-form__separator" aria-hidden="true"></div>

      <footer class="objective-edit-form__actions">
        <button type="button" class="gh-btn" data-objective-edit-action="close">${closeActionLabel}</button>
        <div class="objective-edit-form__actions-right">
          <button type="button" class="gh-btn" data-objective-edit-action="cancel">Annuler</button>
          <button type="button" class="${saveButtonClassName}" data-objective-edit-action="save">Enregistrer</button>
        </div>
      </footer>
    </section>
  `;
}

function renderObjectiveDetailHtml(objective) {
  if (!objective) {
    return renderDataTableEmptyState({
      title: "Objectif introuvable",
      description: "Cet objectif n'existe plus ou n'est pas disponible."
    });
  }

  return `
    <section class="objective-detail">
      <header class="objective-detail__header">
        <div class="objective-detail__title">${escapeHtml(objective.title)}</div>
      </header>
      <div class="objective-detail__meta-row">
        <div class="objective-detail__meta-left">
          ${renderObjectiveStatusBadge(objective)}
          <span class="objective-detail__meta-text">${escapeHtml(formatObjectiveDueDateLabel(objective))}</span>
        </div>
        <div class="objective-detail__meta-right">
          ${renderObjectiveProgressBar(objective)}
        </div>
      </div>
      <div class="objective-detail__subjects">
        ${renderObjectiveSubjectsTableHtml(objective)}
      </div>
    </section>
  `;
}

function renderObjectivesTableHtml() {
  const selectedObjective = getObjectiveById(store.situationsView.selectedObjectiveId || "");
  if (selectedObjective) {
    if (store.situationsView.objectiveEdit?.isOpen && String(store.situationsView.objectiveEdit?.objectiveId || "") === String(selectedObjective.id || "")) {
      return renderObjectiveEditFormHtml(selectedObjective);
    }
    return renderObjectiveDetailHtml(selectedObjective);
  }

  const objectives = getObjectives();
  const openObjectives = objectives.filter((objective) => !objective.closed);
  const closedObjectives = objectives.filter((objective) => objective.closed);
  const activeFilter = String(store.situationsView.objectivesStatusFilter || "open").toLowerCase() === "closed" ? "closed" : "open";
  const visibleObjectives = activeFilter === "closed" ? closedObjectives : openObjectives;

  const headHtml = renderTableHeadFilterToggle({
    activeValue: activeFilter,
    items: [
      { label: "Ouverts", value: "open", count: openObjectives.length, dataAttr: "objectives-filter" },
      { label: "Fermés", value: "closed", count: closedObjectives.length, dataAttr: "objectives-filter" }
    ]
  });

  const bodyHtml = visibleObjectives.length
    ? visibleObjectives.map((objective) => {
        const counts = getObjectiveSubjectCounts(objective);
        const dueDateLabel = objective?.dueDate
          ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(objective.dueDate))
          : "Pas de date définie";
        return `
        <div class="objectives-row" data-objective-id="${escapeHtml(objective.id)}" tabindex="0" role="button">
          <span class="objectives-row__icon" aria-hidden="true">${svgIcon("milestone", { className: "octicon octicon-milestone" })}</span>
          <button type="button" class="objectives-row__title" data-objective-id="${escapeHtml(objective.id)}">${escapeHtml(objective.title)}</button>
          <span class="objectives-row__meta">Échéance au ${escapeHtml(dueDateLabel)} <span aria-hidden="true">-</span> ${problemsCountsIconHtml(counts.closed, counts.total)}</span>
          <div class="objectives-row__progress">${renderObjectiveProgressBar(objective, { compact: true })}</div>
        </div>
      `;
      }).join("")
    : renderDataTableEmptyState({
        title: activeFilter === "closed" ? "Aucun objectif fermé" : "Aucun objectif ouvert",
        description: activeFilter === "closed" ? "Les objectifs fermés apparaîtront ici." : "Les objectifs ouverts apparaîtront ici."
      });

  return renderIssuesTable({
    className: "objectives-table",
    headHtml,
    rowsHtml: visibleObjectives.length ? bodyHtml : "",
    headClassName: "objectives-table__head",
    bodyClassName: "objectives-table__body",
    gridTemplate: "minmax(0, 1fr)",
    emptyTitle: activeFilter === "closed" ? "Aucun objectif fermé" : "Aucun objectif ouvert",
    emptyDescription: activeFilter === "closed" ? "Les objectifs fermés apparaîtront ici." : "Les objectifs ouverts apparaîtront ici."
  });
}

/* =========================================================
   Public render
========================================================= */

export function renderProjectSubjects(root) {
  ensureViewUiState();
  ensureDrilldownDom();
  subjectsCurrentRoot = root;
  bindSubjectsTabReset();
  store.situationsView.showTableOnly = true;
  store.situationsView.displayDepth = "sujets";

  root.className = "project-shell__content";

  setProjectViewHeader({
    contextLabel: "Sujets",
    variant: "situations",
    toolbarHtml: ""
  });

  const headerRoot = document.getElementById("projectViewHeaderHost");
  const toolbarHost = document.getElementById("situationsToolbarHost");
  store.situationsView.subjectsSubview = String(store.situationsView.subjectsSubview || "subjects");
  if (store.situationsView.subjectsSubview !== "objectives") {
    store.situationsView.selectedObjectiveId = "";
  }
  const data = store.situationsView.data || [];
  const firstSituationId = data[0]?.id || null;

  if (!store.situationsView.selectedSituationId && firstSituationId) {
    store.situationsView.selectedSituationId = firstSituationId;
  }
  if (!store.situationsView.expandedSituations.size && firstSituationId) {
    store.situationsView.expandedSituations.add(firstSituationId);
  }

  if (toolbarHost) {
    rerenderSubjectsToolbar();
  }

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--settings">
      <div class="project-simple-scroll" id="projectSituationsScroll">
        <div class="settings-content project-page-shell project-page-shell--content">
          <section class="gh-panel gh-panel--results" aria-label="Results">
            <div id="situationsPanelHost"></div>
          </section>
        </div>
      </div>
    </section>
  `;

  rerenderPanels();
  syncSituationsPrimaryScrollSource();
  bindSituationsEvents(root, headerRoot);
  bindProjectSituationsRunbar(toolbarHost || root || document);
  bindModalEvents();
  updateDetailsModal();

  syncProjectSituationsRunbar({
    run_id: store.ui?.runId || "",
    status: store.ui?.systemStatus?.state || "idle",
    label: store.ui?.systemStatus?.label || "",
    meta: store.ui?.systemStatus?.meta || "",
    isBusy: store.ui?.systemStatus?.state === "running"
  });
}
