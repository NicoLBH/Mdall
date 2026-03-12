import { store } from "../store.js";
import { ASK_LLM_URL_PROD } from "../constants.js";
import {
  renderProjectSituationsRunbar,
  bindProjectSituationsRunbar,
  syncProjectSituationsRunbar
} from "./project-situations-runbar.js";
import { closeGlobalNav } from "./global-nav.js";

/* =========================================================
   Legacy DOM / archive parity helpers
========================================================= */

function ensureSituationsLegacyDomStyle() {
  if (document.getElementById("situations-legacy-dom-style")) return;

  const style = document.createElement("style");
  style.id = "situations-legacy-dom-style";
  style.textContent = `
    #situationsTableHost,
    #situationsTableHost .issues-table{
      height:100%;
      min-height:0;
      max-height:100%;
      overflow:hidden;
      box-sizing:border-box;
    }

    #situationsTableHost .issues-table{
      display:flex;
      flex-direction:column;
      min-height:0;
      max-height:100%;
    }

    #situationsTableHost .issues-table__head{
      flex:0 0 auto;
    }

    #situationsTableHost .issues-table__body{
      flex:1 1 auto;
      min-height:0;
      overflow-y:auto;
      overflow-x:hidden;
    }

    #situationsDetailsHost,
    #detailsBodyModal,
    #drilldownBody{
      overflow-y:auto;
      overflow-x:hidden;
      min-height:0;
    }

    .details-subissues .issue-row:hover,
    .details-subissues .issue-row:focus-within{
      background: rgb(21, 27, 35) !important;
    }

    .assist-overlay.hidden,
    .drilldown.hidden{
      display:none !important;
    }

    .issue-status-icon{
      width:16px;
      height:16px;
      min-width:16px;
      flex:0 0 16px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      line-height:0;
    }

    .issue-status-icon svg{
      width:16px;
      height:16px;
      min-width:16px;
      flex:0 0 16px;
      display:block;
    }
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
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

const SVG_ISSUE_OPEN = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>`;
const SVG_ISSUE_CLOSED = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path></svg>`;
const SVG_ISSUE_REOPENED = SVG_ISSUE_OPEN;
const SVG_AVATAR_HUMAN = `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style="display:block"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5.06 0-9 2.39-9 5.25V22h18v-2.75C21 16.39 17.06 14 12 14Z"></path></svg>`;
const SVG_TL_CLOSED = `<svg aria-hidden="true" focusable="false" class="octicon octicon-check-circle Octicon__StyledOcticon-sc-jtj3m8-0 cdmDIS TimelineRow-module__Octicon__SMhVa" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm1.5 0a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm10.28-1.72-4.5 4.5a.75.75 0 0 1-1.06 0l-2-2a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018l1.47 1.47 3.97-3.97a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z"></path></svg>`;
const SVG_TL_REOPENED = `<svg aria-hidden="true" focusable="false" class="octicon octicon-issue-reopened Octicon__StyledOcticon-sc-jtj3m8-0 cdmDIS TimelineRow-module__Octicon__SMhVa" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;"><path d="M5.029 2.217a6.5 6.5 0 0 1 9.437 5.11.75.75 0 1 0 1.492-.154 8 8 0 0 0-14.315-4.03L.427 1.927A.25.25 0 0 0 0 2.104V5.75A.25.25 0 0 0 .25 6h3.646a.25.25 0 0 0 .177-.427L2.715 4.215a6.491 6.491 0 0 1 2.314-1.998ZM1.262 8.169a.75.75 0 0 0-1.22.658 8.001 8.001 0 0 0 14.315 4.03l1.216 1.216a.25.25 0 0 0 .427-.177V10.25a.25.25 0 0 0-.25-.25h-3.646a.25.25 0 0 0-.177.427l1.358 1.358a6.501 6.501 0 0 1-11.751-3.11.75.75 0 0 0-.272-.506Z"></path><path d="M9.06 9.06a1.5 1.5 0 1 1-2.12-2.12 1.5 1.5 0 0 1 2.12 2.12Z"></path></svg>`;
const SVG_COMMENT = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M1.75 2A1.75 1.75 0 0 0 0 3.75v6.5C0 11.216.784 12 1.75 12H4.5l2.354 2.354a.75.75 0 0 0 1.28-.53V12h6.116A1.75 1.75 0 0 0 16 10.25v-6.5A1.75 1.75 0 0 0 14.25 2H1.75Z"></path></svg>`;


function issueIcon(status = "open") {
  const isOpen = String(status || "open").toLowerCase() !== "closed";
  const svg = isOpen
    ? `<svg color="var(--fgColor-open)" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>`
    : `<svg color="var(--fgColor-done)" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path></svg>`;
  return `<span class="issue-status-icon" aria-hidden="true">${svg}</span>`;
}

function normalizeVerdict(verdict) {
  const v = String(verdict || "").trim().toUpperCase();
  if (!v) return "";
  if (v === "WARN") return "WARNING";
  if (v === "DEFAVORABLE") return "KO";
  if (v === "FAVORABLE") return "OK";
  return v;
}

function verdictLabel(verdict) {
  return normalizeVerdict(verdict) || "—";
}

function verdictBadgeClass(verdict) {
  const v = verdictLabel(verdict);
  const safe = v.replace(/[^A-Z0-9_-]/g, "");
  if (["F", "D", "S", "HM", "PM", "SO"].includes(safe)) return `verdict-badge verdict-${safe}`;
  if (safe === "OK") return "verdict-badge verdict-F";
  if (safe === "KO") return "verdict-badge verdict-D";
  if (safe === "WARNING") return "verdict-badge verdict-S";
  return "verdict-badge";
}

function verdictDotClass(verdict) {
  const v = normalizeVerdict(verdict);
  if (v === "F" || v === "OK") return "v-dot v-dot--f";
  if (v === "S" || v === "WARNING") return "v-dot v-dot--s";
  if (v === "D" || v === "KO") return "v-dot v-dot--d";
  if (v === "HM") return "v-dot v-dot--hm";
  if (v === "PM") return "v-dot v-dot--pm";
  if (v === "SO") return "v-dot v-dot--so";
  return "v-dot";
}

function verdictPill(verdict) {
  return `<span class="${verdictBadgeClass(verdict)}">${escapeHtml(verdictLabel(verdict))}</span>`;
}

function priorityBadge(priority = "P3") {
  const p = String(priority || "P3").toUpperCase();
  const cls = p === "P1" ? "badge badge--p1" : p === "P2" ? "badge badge--p2" : "badge badge--p3";
  return `<span class="${cls}">${escapeHtml(p)}</span>`;
}

function statePill(status = "open") {
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

function ensureViewUiState() {
  const v = store.situationsView;
  if (!v.rightExpandedSujets) v.rightExpandedSujets = new Set();
  if (typeof v.rightSubissuesOpen !== "boolean") v.rightSubissuesOpen = true;
  if (typeof v.commentPreviewMode !== "boolean") v.commentPreviewMode = false;
  if (typeof v.helpMode !== "boolean") v.helpMode = false;
  if (!v.tempAvisVerdict) v.tempAvisVerdict = "F";
  if (!v.tempAvisVerdictFor) v.tempAvisVerdictFor = null;
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
}

function currentRunKey() {
  return firstNonEmpty(
    store.ui?.runId,
    store.situationsView?.rawResult?.run_id,
    store.situationsView?.rawResult?.runId,
    "default-run"
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
      decisions: {
        avis: {},
        sujet: {},
        situation: {}
      }
    };
    saveHumanStore(all);
  }
  return { all, key, bucket: all.runs[key] };
}

function persistRunBucket(mutator) {
  const { all, key, bucket } = getRunBucket();
  mutator(bucket);
  all.runs[key] = bucket;
  saveHumanStore(all);
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

function getEffectiveAvisVerdict(avisId) {
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
  const ts = fmtTs(nowIso());
  const cleanMd = String(bodyMd || "").replace(/^_+|_+$/g, "");
  const bodyHtml = pending
    ? `<div><div class="rapso-wait"><span class="rapso-spinner" aria-hidden="true"></span><span class="rapso-shimmer">${escapeHtml(cleanMd || "RAPSOBOT réfléchit…")}</span></div></div>`
    : mdToHtml(cleanMd);
  const avatar = role === "user"
    ? `<div class="gh-avatar gh-avatar--human" aria-hidden="true">${SVG_AVATAR_HUMAN}</div>`
    : `<div class="gh-avatar" aria-hidden="true"><span class="gh-avatar-initial mono">R</span></div>`;
  return `<div class="thread-item thread-item--comment thread-item--comment--flush"><div class="thread-wrapper"><div class="gh-comment gh-comment--help gh-comment--${role}">${avatar}<div class="gh-comment-box gh-comment-box--help"><div class="gh-comment-header gh-comment-header--help"><div class="gh-comment-author mono">${escapeHtml(who)}</div><div class="mono-small">${escapeHtml(ts)}</div></div><div class="gh-comment-body gh-comment-body--help">${bodyHtml}</div></div></div></div></div>`;
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

function getEffectiveSujetStatus(sujetId) {
  const sujet = getNestedSujet(sujetId);
  const decision = getDecision("sujet", sujetId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d === "CLOSED") return "closed";
  if (d === "REOPENED") return "open";
  return firstNonEmpty(sujet?.status, "open").toLowerCase();
}

function getEffectiveSituationStatus(situationId) {
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

  for (const sujet of situation.sujets || []) {
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

function getVisibleCounts(filteredSituations) {
  let sujets = 0;
  let avis = 0;
  for (const situation of filteredSituations) {
    sujets += (situation.sujets || []).length;
    for (const sujet of situation.sujets || []) avis += (sujet.avis || []).length;
  }
  return { situations: filteredSituations.length, sujets, avis };
}

function getNestedSituation(situationId) {
  return (store.situationsView.data || []).find((s) => s.id === situationId) || null;
}

function getNestedSujet(problemId) {
  for (const situation of store.situationsView.data || []) {
    const match = (situation.sujets || []).find((sujet) => sujet.id === problemId);
    if (match) return match;
  }
  return null;
}

function getNestedAvis(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of situation.sujets || []) {
      const match = (sujet.avis || []).find((avis) => avis.id === avisId);
      if (match) return match;
    }
  }
  return null;
}

function getSituationBySujetId(problemId) {
  for (const situation of store.situationsView.data || []) {
    if ((situation.sujets || []).some((sujet) => sujet.id === problemId)) return situation;
  }
  return null;
}

function getSituationByAvisId(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of situation.sujets || []) {
      if ((sujet.avis || []).some((avis) => avis.id === avisId)) return situation;
    }
  }
  return null;
}

function getSujetByAvisId(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of situation.sujets || []) {
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
    return `<span class="verdict-bar__seg verdict-bar__seg--${v.toLowerCase()}" style="width:${pct.toFixed(2)}%"></span>`;
  }).join("");

  const bar = `<div class="verdict-bar">${segs || `<span class="verdict-bar__seg verdict-bar__seg--empty" style="width:100%"></span>`}</div>`;

  if (!legend) {
    return `<div class="subissues-counts subissues-counts--verdicts">${bar}</div>`;
  }

  const legendHtml = order.map((v) => {
    const c = Number(counts?.[v] || 0);
    if (!c) return "";
    const pct = total ? (c / total) * 100 : 0;
    return `
      <span class="verdict-legend__item">
        <span class="${verdictDotClass(v)}" aria-hidden="true"></span>
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
      <svg viewBox="0 0 20 20" width="16" height="16" style="display:block">
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

function rowSelectedClass(kind, id) {
  if (kind === "situation" && store.situationsView.selectedSituationId === id && !store.situationsView.selectedSujetId && !store.situationsView.selectedAvisId) return " selected subissue-row--selected";
  if (kind === "sujet" && store.situationsView.selectedSujetId === id && !store.situationsView.selectedAvisId) return " selected subissue-row--selected";
  if (kind === "avis" && store.situationsView.selectedAvisId === id) return " selected subissue-row--selected";
  return "";
}

function renderSituationRow(situation) {
  const expanded = store.situationsView.expandedSituations.has(situation.id);
  const hasSujets = (situation.sujets || []).length > 0;
  const effStatus = getEffectiveSituationStatus(situation.id);

  return `
    <div class="issue-row issue-row--sit click js-row-situation${rowSelectedClass("situation", situation.id)}" data-situation-id="${escapeHtml(situation.id)}">
      <div class="cell cell-theme lvl0">
        <span class="js-toggle-situation" data-situation-id="${escapeHtml(situation.id)}">${chevron(expanded, hasSujets)}</span>
        ${issueIcon(effStatus)}
        <span class="theme-text theme-text--sit">${escapeHtml(firstNonEmpty(situation.title, situation.id, "(sans titre)"))}</span>
      </div>
      <div class="cell cell-verdict"></div>
      <div class="cell cell-prio">${priorityBadge(situation.priority)}</div>
      <div class="cell cell-agent"></div>
      <div class="cell cell-id mono">pb=${(situation.sujets || []).length}&nbsp;&nbsp;${escapeHtml(situation.id)}</div>
    </div>
  `;
}

function renderSujetRow(sujet) {
  const expanded = store.situationsView.expandedSujets.has(sujet.id);
  const hasAvis = (sujet.avis || []).length > 0;
  const effStatus = getEffectiveSujetStatus(sujet.id);

  return `
    <div class="issue-row issue-row--pb click js-row-sujet${rowSelectedClass("sujet", sujet.id)}" data-sujet-id="${escapeHtml(sujet.id)}">
      <div class="cell cell-theme lvl1">
        <span class="js-toggle-sujet" data-sujet-id="${escapeHtml(sujet.id)}">${chevron(expanded, hasAvis)}</span>
        ${issueIcon(effStatus)}
        <span class="theme-text theme-text--pb">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</span>
      </div>
      <div class="cell cell-verdict"></div>
      <div class="cell cell-prio">${priorityBadge(sujet.priority)}</div>
      <div class="cell cell-agent"></div>
      <div class="cell cell-id mono">avis=${(sujet.avis || []).length}&nbsp;&nbsp;${escapeHtml(sujet.id)}</div>
    </div>
  `;
}

function renderAvisRow(avis) {
  const effVerdict = getEffectiveAvisVerdict(avis.id);
  return `
    <div class="issue-row issue-row--avis click js-row-avis${rowSelectedClass("avis", avis.id)}" data-avis-id="${escapeHtml(avis.id)}">
      <div class="cell cell-theme lvl2">
        <span class="chev chev--spacer"></span>
        <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
      </div>
      <div class="cell cell-verdict">${verdictPill(effVerdict)}</div>
      <div class="cell cell-prio"></div>
      <div class="cell cell-agent mono-small">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</div>
      <div class="cell cell-id mono">${escapeHtml(avis.id)}</div>
    </div>
  `;
}

function renderFlatSujetRow(sujet, situationId) {
  const effStatus = getEffectiveSujetStatus(sujet.id);
  const parentLabel = situationId ? `<span class="mono subissues-inline-count">${escapeHtml(situationId)}</span>` : "";

  return `
    <div class="issue-row issue-row--pb click js-row-sujet${rowSelectedClass("sujet", sujet.id)}" data-sujet-id="${escapeHtml(sujet.id)}">
      <div class="cell cell-theme lvl0">
        <span class="chev chev--spacer"></span>
        ${issueIcon(effStatus)}
        <span class="theme-text theme-text--pb">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</span>
        ${parentLabel}
      </div>
      <div class="cell cell-verdict"></div>
      <div class="cell cell-prio">${priorityBadge(sujet.priority)}</div>
      <div class="cell cell-agent"></div>
      <div class="cell cell-id mono">avis=${(sujet.avis || []).length}&nbsp;&nbsp;${escapeHtml(sujet.id)}</div>
    </div>
  `;
}

function renderFlatAvisRow(avis, sujetId, situationId) {
  const effVerdict = getEffectiveAvisVerdict(avis.id);
  const lineage = [situationId, sujetId].filter(Boolean).join(" · ");

  return `
    <div class="issue-row issue-row--avis click js-row-avis${rowSelectedClass("avis", avis.id)}" data-avis-id="${escapeHtml(avis.id)}">
      <div class="cell cell-theme lvl0">
        <span class="chev chev--spacer"></span>
        ${issueIcon("open")}
        <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
        ${lineage ? `<span class="mono subissues-inline-count">${escapeHtml(lineage)}</span>` : ""}
      </div>
      <div class="cell cell-verdict">${verdictPill(effVerdict)}</div>
      <div class="cell cell-prio"></div>
      <div class="cell cell-agent mono-small">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</div>
      <div class="cell cell-id mono">${escapeHtml(avis.id)}</div>
    </div>
  `;
}

function renderWelcomeHtml() {
  return `
    <div class="issues-table">
      <div class="issues-table__head">
        <div class="cell cell-theme">Thème</div>
        <div class="cell cell-verdict">Verdict</div>
        <div class="cell cell-prio">Prio</div>
        <div class="cell cell-agent">Agent</div>
        <div class="cell cell-id">avis_id</div>
      </div>
      <div class="issues-table__body">
        <div class="emptyState" style="padding:24px;color:var(--muted);">
          Lancer une analyse pour générer des avis-sujets-situations.
        </div>
      </div>
    </div>
  `;
}

function renderTableHtml(filteredSituations) {
  const displayDepth = String(store.situationsView.displayDepth || "situations").toLowerCase();

  if (!(store.situationsView.data || []).length) return renderWelcomeHtml();

  if (!filteredSituations.length) {
    return `
      <div class="issues-table">
        <div class="issues-table__body">
          <div style="padding:24px;color:var(--muted);">Aucun résultat pour les filtres actuels.</div>
        </div>
      </div>
    `;
  }

  const rows = [];
  const forceExpandSituations = displayDepth === "sujets" || displayDepth === "avis";
  const forceExpandSujets = displayDepth === "avis";

  for (const situation of filteredSituations) {
    rows.push(renderSituationRow(situation));

    const showSujets = forceExpandSituations || store.situationsView.expandedSituations.has(situation.id);
    if (!showSujets) continue;

    for (const sujet of situation.sujets || []) {
      rows.push(renderSujetRow(sujet));

      const showAvis = forceExpandSujets || store.situationsView.expandedSujets.has(sujet.id);
      if (!showAvis) continue;

      for (const avis of sujet.avis || []) rows.push(renderAvisRow(avis));
    }
  }

  return `
    <div class="issues-table">
      <div class="issues-table__head">
        <div class="cell cell-theme">Thème</div>
        <div class="cell cell-verdict">Verdict</div>
        <div class="cell cell-prio">Prio</div>
        <div class="cell cell-agent">Agent</div>
        <div class="cell cell-id">avis_id</div>
      </div>
      <div class="issues-table__body">
        ${rows.join("")}
      </div>
    </div>
  `;
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

function renderCommentCard(agentName, bodyText, initial = "S") {
  return `
    <div class="gh-comment">
      <div class="gh-avatar" aria-hidden="true"><span class="gh-avatar-initial">${escapeHtml(initial)}</span></div>
      <div class="gh-comment-box">
        <div class="gh-comment-header">
          <div class="gh-comment-author mono">${escapeHtml(agentName)}</div>
        </div>
        <div class="gh-comment-body">${mdToHtml(bodyText)}</div>
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

  const html = thread.map((e, idx) => {
    const type = String(e?.type || "").toUpperCase();

    if (type === "COMMENT") {
      const agent = String(e?.agent || "").toLowerCase();
      const isHuman = agent === "human" || !agent;
      const isRapso = !isHuman && agent === "specialist_ps";
      const displayName = isRapso ? "Agent specialist_ps" : normActorName(e?.actor, agent);
      const avatarInitial = isRapso ? "AS" : ((agent[0] || "S").toUpperCase());
      const ts = e?.ts ? `<div class="mono-small">${escapeHtml(fmtTs(e.ts))}</div>` : "";
      const avatar = isHuman
        ? `<div class="gh-avatar gh-avatar--human" aria-hidden="true">${SVG_AVATAR_HUMAN}</div>`
        : `<div class="gh-avatar" aria-hidden="true"><span class="gh-avatar-initial">${escapeHtml(avatarInitial)}</span></div>`;

      return `
        <div class="thread-item thread-item--comment thread-item--comment--flush" data-thread-kind="comment" data-thread-idx="${idx}">
          <div class="thread-wrapper">
            <div class="gh-comment">
              ${avatar}
              <div class="gh-comment-box">
                <div class="gh-comment-header">
                  <div class="gh-comment-author mono">${escapeHtml(displayName)}</div>
                  ${ts}
                </div>
                <div class="gh-comment-body">${mdToHtml(e?.message || "")}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (type === "ACTIVITY") {
      const kind = String(e?.kind || "").toLowerCase();
      const agent = e?.agent || "system";
      const displayName = normActorName(e?.actor, agent);
      const ts = fmtTs(e?.ts || "");
      let icon = `<span class="tl-ico tl-ico--muted" aria-hidden="true"></span>`;
      let verb = "updated";
      let targetHtml = "";

      if (kind === "issue_closed") {
        icon = `<span class="tl-ico-wrap tl-ico-closed" aria-hidden="true">${SVG_TL_CLOSED}</span>`;
        const sujetId = e?.meta?.problem_id;
        const sujet = sujetId ? getNestedSujet(sujetId) : null;
        const sujetTitle = sujet?.title ? `${escapeHtml(sujet.title)} ` : "";
        verb = "closed";
        targetHtml = sujetId ? `sujet ${sujetTitle}${entityLinkHtml("sujet", sujetId, "#" + escapeHtml(sujetId))}` : "this";
      } else if (kind === "issue_reopened") {
        icon = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${SVG_TL_REOPENED}</span>`;
        const sujetId = e?.meta?.problem_id;
        const sujet = sujetId ? getNestedSujet(sujetId) : null;
        const sujetTitle = sujet?.title ? `${escapeHtml(sujet.title)} ` : "";
        verb = "reopened";
        targetHtml = sujetId ? `sujet ${sujetTitle}${entityLinkHtml("sujet", sujetId, "#" + escapeHtml(sujetId))}` : "this";
      } else if (kind === "avis_verdict_changed") {
        const toV = e?.meta?.to || "";
        const avisId = e?.meta?.avis_id;
        const avis = avisId ? getNestedAvis(avisId) : null;
        const avisTitle = avis?.title ? `${escapeHtml(avis.title)} ` : "";
        icon = verdictIconHtml(toV);
        verb = "changed verdict";
        targetHtml = avisId
          ? `avis ${avisTitle}${entityLinkHtml("avis", avisId, "#" + escapeHtml(avisId))} → ${escapeHtml(String(toV || ""))}`
          : escapeHtml(String(toV || ""));
      }

      const note = String(e?.message || "").trim();
      const noteHtml = note ? `<div class="tl-note">${mdToHtml(note)}</div>` : "";

      return `
        <div class="thread-item thread-item--activity thread-item--comment--flush" data-thread-kind="activity" data-thread-idx="${idx}">
          <div class="thread-wrapper">
            <div class="tl-activity">
              ${icon}
              ${miniAuthorIconHtml(agent)}
              <div class="tl-activity__text mono">
                <span class="tl-author-name">${escapeHtml(displayName)}</span>
                <span class="mono-small"> ${escapeHtml(verb)} ${targetHtml || ""} </span>
                <span class="mono-small">at ${escapeHtml(ts)}</span>
              </div>
            </div>
            ${noteHtml}
          </div>
        </div>
      `;
    }

    return `
      <div class="thread-item" data-thread-kind="event" data-thread-idx="${idx}">
        <div class="thread-badge__subissue">
          <svg aria-hidden="true" focusable="false" class="octicon octicon-issue-tracks Octicon__StyledOcticon-sc-jtj3m8-0 TimelineRow-module__Octicon__SMhVa" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align: text-bottom;"><path d="M1.5 8a6.5 6.5 0 0 1 13 0A.75.75 0 0 0 16 8a8 8 0 1 0-8 8 .75.75 0 0 0 0-1.5A6.5 6.5 0 0 1 1.5 8Z"></path><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm1.5 1.75a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Zm2.75 2.25a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z"></path></svg>
        </div>
        <div class="thread-wrapper">
          <div class="thread-item__head">
            <div class="mono">
              <span>${escapeHtml(e.actor || "System")}</span>
              <span> attached this to </span>
              <span>${escapeHtml(e.entity_type || "")} n° ${entityLinkHtml(e.entity_type, e.entity_id, e.entity_id || "")}</span>
              <span>·</span>
              <span> (agent=${escapeHtml(e.agent || "system")})</span>
              <div class="mono">in ${escapeHtml(fmtTs(e.ts || ""))}</div>
            </div>
          </div>
          <div class="thread-item__body">${escapeHtml(e.message || "")}</div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="gh-timeline-title mono" style="display:none">Discussion</div>
    <div class="thread gh-thread">${html}</div>
  `;
}

function renderSubIssuesPanel({ title, leftMetaHtml = "", rightMetaHtml = "", bodyHtml = "" }) {
  ensureViewUiState();
  const isOpen = !!store.situationsView.rightSubissuesOpen;
  return `
    <div class="details-subissues">
      <div class="subissues-head click" data-action="toggle-subissues">
        <div class="subissues-head-left">
          <span class="chev">${isOpen ? "▾" : "▸"}</span>
          <span class="subissues-title">${escapeHtml(title)}</span>
          ${leftMetaHtml || ""}
        </div>
        <div class="subissues-head-right">
          ${rightMetaHtml || ""}
        </div>
      </div>
      <div class="subissues-body ${isOpen ? "" : "hidden"}">
        ${bodyHtml || ""}
      </div>
    </div>
  `;
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

  const verdicts = ["F", "S", "D", "HM", "PM", "SO"];
  const verdictSwitch = `
    <div class="verdict-switch" role="group" aria-label="Verdict">
      ${verdicts.map((v) => `<button class="verdict-switch__btn ${v === activeVerdict ? "is-active" : ""}" data-action="set-verdict" data-verdict="${v}" type="button">${v}</button>`).join("")}
    </div>
  `;

  return `
    <div class="human-action">
      <div class="gh-avatar gh-avatar--human" aria-hidden="true">${SVG_AVATAR_HUMAN}</div>
      <div class="comment-general-block">
        <div class="gh-timeline-title mono">Add a comment</div>
        <div class="comment-box gh-comment-boxwrap ${helpMode ? "gh-comment-box--help" : ""}">
          <div class="comment-tabs ${helpMode ? "gh-comment-header--help" : ""}" role="tablist" aria-label="Comment tabs">
            <button class="comment-tab ${!previewMode ? "is-active" : ""}" data-action="tab-write" type="button">Write</button>
            <button class="comment-tab ${previewMode ? "is-active" : ""}" data-action="tab-preview" type="button">Preview</button>
          </div>

          <div class="comment-editor ${previewMode ? "hidden" : ""}">
            <textarea
              id="humanCommentBox"
              class="textarea"
              placeholder="${helpMode ? "Help (éphémère) — décrivez l’écran / l’action souhaitée." : "Réponse humaine (Markdown) — mentionne @rapso pour demander l’avis de l’agent. Ex: « @rapso peux-tu vérifier ce point ? »"}"
            ></textarea>
          </div>

          <div class="comment-editor ${previewMode ? "" : "hidden"}">
            <div class="comment-preview" id="humanCommentPreview"></div>
          </div>
        </div>

        <div class="actions-row actions-row--details" style="margin-top:10px;">
          <div class="rapso-mention-hint">
            <span>Astuce : mentionne <span class="mono">@rapso</span> dans ton commentaire.</span>
          </div>

          <div class="actions-row__right" style="display:flex; align-items:center; gap:8px; justify-content:flex-end; flex:0 0 auto;">
            <button class="gh-btn gh-btn--help-mode ${helpMode ? "is-on" : ""}" data-action="toggle-help" type="button">Help</button>

            ${type === "avis"
              ? `${verdictSwitch}<button class="gh-btn" data-action="avis-validate" type="button">Validate</button>`
              : (isIssueOpen
                  ? `<button class="gh-btn gh-btn--issue-action" data-action="issue-close" type="button">${SVG_ISSUE_CLOSED}<span class="gh-btn__label">Close</span></button>`
                  : `<button class="gh-btn gh-btn--issue-action" data-action="issue-reopen" type="button">${SVG_ISSUE_REOPENED}<span class="gh-btn__label">Reopen issue</span></button>`)}

            <button class="gh-btn gh-btn--comment" data-action="add-comment" type="button">Comment</button>
          </div>
        </div>
      </div>
    </div>
  `;
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
      renderMetaItem("Verdict effectif", verdictPill(getEffectiveAvisVerdict(item.id))),
      renderMetaItem("Verdict source", verdictPill(firstNonEmpty(raw.verdict, item.verdict, "-"))),
      renderMetaItem("Severity", `<span class="mono">${escapeHtml(firstNonEmpty(raw.severity, "—"))}</span>`),
      renderMetaItem("Source", `<span class="mono">${escapeHtml(firstNonEmpty(raw.source, "—"))}</span>`)
    ];
    return entries.join("");
  }

  if (selection.type === "sujet") {
    const situation = getSituationBySujetId(item.id);
    const stats = problemVerdictStats(item);
    const entries = [
      ...common,
      renderMetaItem("Situation parent", `<span class="mono">${escapeHtml(situation?.id || "—")}</span>`),
      renderMetaItem("Status effectif", statePill(getEffectiveSujetStatus(item.id))),
      renderMetaItem("Status source", statePill(firstNonEmpty(raw.status, item.status, "open"))),
      renderMetaItem("Avis", `<span class="mono">${escapeHtml(String((item.avis || []).length))}</span>`),
      renderMetaItem("Verdicts", buildVerdictBarHtml(stats.counts, { legend: true }))
    ];
    return entries.join("");
  }

  const stats = situationVerdictStats(item);
  const entries = [
    ...common,
    renderMetaItem("Status effectif", statePill(getEffectiveSituationStatus(item.id))),
    renderMetaItem("Status source", statePill(firstNonEmpty(raw.status, item.status, "open"))),
    renderMetaItem("Sujets", `<span class="mono">${escapeHtml(String((item.sujets || []).length))}</span>`),
    renderMetaItem("Verdicts", buildVerdictBarHtml(stats.counts, { legend: true }))
  ];
  return entries.join("");
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
          <span class="${verdictDotClass(effVerdict)}" aria-hidden="true"></span>
          <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
        </div>
      </div>
    `;
  }).join("");

  const body = `
    <div class="issues-table subissues-table">
      <div class="issues-table__body">
        ${rows || `<div class="emptyState">Aucun avis.</div>`}
      </div>
    </div>
  `;

  return renderSubIssuesPanel({
    title: "Avis rattachés",
    leftMetaHtml: `<div class="subissues-counts subissues-counts--total"><span class="mono">${(sujet.avis || []).length}</span></div>`,
    rightMetaHtml: buildVerdictBarHtml(stats.counts, { legend: true }),
    bodyHtml: body
  });
}

function renderSubIssuesForSituation(situation, options = {}) {
  ensureViewUiState();

  const expandedSet = options.expandedSujets || store.situationsView.rightExpandedSujets;
  const sujetRowClass = options.sujetRowClass || "js-sub-right-select-sujet";
  const sujetToggleClass = options.sujetToggleClass || "js-sub-right-toggle-sujet";
  const avisRowClass = options.avisRowClass || "js-row-avis";

  const rows = [];
  for (const sujet of situation.sujets || []) {
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
              <span class="${verdictDotClass(effVerdict)}" aria-hidden="true"></span>
              <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
            </div>
          </div>
        `);
      }
    }
  }

  const stats = situationVerdictStats(situation);
  const body = `
    <div class="issues-table subissues-table">
      <div class="issues-table__body">
        ${rows.join("") || `<div class="emptyState">Aucun sujet.</div>`}
      </div>
    </div>
  `;

  return renderSubIssuesPanel({
    title: "Sujets rattachés",
    leftMetaHtml: problemsCountsHtml(situation),
    rightMetaHtml: buildVerdictBarHtml(stats.counts, { legend: true }),
    bodyHtml: body
  });
}

function renderDetailsTitleWrapHtml(selection) {
  if (!selection) return `<span class="details-title-text">Sélectionner un élément</span>`;

  const item = selection.item;
  let badgeHtml = "";
  let probsHtml = "";
  let verdictHtml = "";
  let barOnlyHtml = "";
  let idHtml = entityLinkHtml(selection.type, item.id, `#${escapeHtml(item.id || "")}`);

  if (selection.type === "avis") {
    badgeHtml = verdictPill(getEffectiveAvisVerdict(item.id));
    const sujet = getSujetByAvisId(item.id);
    if (sujet) {
      probsHtml = `<div class="subissues-counts subissues-counts--problems"><span>${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</span></div>`;
    } else {
      probsHtml = `<div class="subissues-counts subissues-counts--problems"><span>${escapeHtml(firstNonEmpty(item.agent, "system"))}</span></div>`;
    }
  } else if (selection.type === "sujet") {
    const stats = problemVerdictStats(item);
    badgeHtml = statePill(getEffectiveSujetStatus(item.id));
    verdictHtml = buildVerdictBarHtml(stats.counts, { legend: true });
    barOnlyHtml = buildVerdictBarHtml(stats.counts, { legend: false });
  } else {
    const stats = situationVerdictStats(item);
    badgeHtml = statePill(getEffectiveSituationStatus(item.id));
    probsHtml = problemsCountsHtml(item);
    verdictHtml = buildVerdictBarHtml(stats.counts, { legend: true });
    barOnlyHtml = buildVerdictBarHtml(stats.counts, { legend: false });
  }

  const titleTextHtml = escapeHtml(firstNonEmpty(item.title, item.id, "Détail"));

  return `
    <div class="details-title-wrap details-title--expanded">
      <div class="details-title-row details-title-row--main">
        <div class="details-title-maincol">
          <div class="details-title-topline">
            <span class="details-title-text">${titleTextHtml}</span>
            <span class="details-title-id mono">${idHtml}</span>
          </div>
          <div class="details-title-bottomline">
            ${badgeHtml}${probsHtml}${verdictHtml}
          </div>
        </div>
      </div>
    </div>

    <div class="details-title-wrap details-title--compact">
      <div class="details-title-compact">
        <div class="details-title-compact-col1">${badgeHtml}</div>
        <div class="details-title-compact-col2">
          <div class="details-title-compact-top">
            <span class="details-title-text">${titleTextHtml}</span>
            <span class="details-title-id mono">${idHtml}</span>
          </div>
          <div class="details-title-compact-bottom">
            ${probsHtml}${barOnlyHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDetailsTitleHtml(selection, options = {}) {
  const showExpand = options.showExpand !== false;
  if (!selection) {
    return `
      <div class="details-head">
        <div class="details-head-left">
          <div class="details-kicker mono">DÉTAILS</div>
          <div class="gh-panel__title">Sélectionner un élément</div>
        </div>
        <div class="details-head-right">
          <div class="details-meta mono" id="detailsMeta">—</div>
          ${showExpand ? `<button id="detailsExpand" class="icon-btn icon-btn--sm" aria-label="Agrandir" title="Agrandir">⤢</button>` : ``}
        </div>
      </div>
    `;
  }

  return `
    <div class="details-head details-head--expanded">
      <div class="details-head-left">
        <div class="details-kicker mono">DÉTAILS</div>
        <div class="gh-panel__title">
          ${renderDetailsTitleWrapHtml(selection)}
        </div>
      </div>

      <div class="details-head-right">
        <div class="details-meta mono" id="detailsMeta">${escapeHtml(selection.item.id || "—")}</div>
        ${showExpand ? `<button id="detailsExpand" class="icon-btn icon-btn--sm" aria-label="Agrandir" title="Agrandir">⤢</button>` : ``}
      </div>
    </div>
  `;
}

function renderDetailsBody(selection, options = {}) {
  if (!selection) {
    return `<div class="emptyState">Sélectionne une situation / un sujet / un avis pour afficher les détails.</div>`;
  }

  const item = selection.item;
  let descCard = "";
  let subIssuesHtml = "";

  if (selection.type === "avis") {
    descCard = renderCommentCard(firstNonEmpty(item.agent, "system"), getAvisSummary(item), "A");
    const sujet = getSujetByAvisId(item.id);
    if (sujet) {
      subIssuesHtml = renderSubIssuesForSujet(sujet, options.subissuesOptions || {});
    }
  } else if (selection.type === "sujet") {
    descCard = renderCommentCard(firstNonEmpty(item.agent, "system"), getSujetSummary(item), "P");
    subIssuesHtml = renderSubIssuesForSujet(item, options.subissuesOptions || {});
  } else {
    descCard = renderCommentCard(firstNonEmpty(item.agent, "system"), getSituationSummary(item), "S");
    subIssuesHtml = renderSubIssuesForSituation(item, options.subissuesOptions || {});
  }

  const threadHtml = renderThreadBlock();
  const commentBoxHtml = renderCommentBox(selection);
  const metaHtml = renderDetailedMetaForSelection(selection);

  return `
    <div class="details-grid">
      <div class="details-main">
        <div class="gh-timeline">
          ${descCard}
          ${subIssuesHtml}
          ${threadHtml}
          ${commentBoxHtml}
        </div>
      </div>
      <aside class="details-meta-col">
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
  const head = modal?.querySelector?.('.modal__head');
  const title = document.getElementById("detailsTitleModal");
  const meta = document.getElementById("detailsMetaModal");
  const body = document.getElementById("detailsBodyModal");
  if (!modal || !title || !meta || !body) return;

  const details = renderDetailsHtml(null, {
    subissuesOptions: {
      sujetRowClass: "js-modal-drilldown-sujet",
      sujetToggleClass: "js-modal-toggle-sujet",
      avisRowClass: "js-modal-drilldown-avis",
      expandedSujets: store.situationsView.rightExpandedSujets
    }
  });
  if (head) head.classList.add('details-head--expanded');
  const selection = getActiveSelection();
  title.innerHTML = renderDetailsTitleWrapHtml(selection);
  meta.textContent = details.modalMeta;
  body.innerHTML = details.bodyHtml;

  ensureDrilldownDom();

  if (store.situationsView.detailsModalOpen) modal.classList.remove("hidden");
  else modal.classList.add("hidden");

  wireDetailsInteractive(body);
  bindDetailsScroll(document);
}

function openDetailsModal() {
  closeGlobalNav();
  store.situationsView.detailsModalOpen = true;
  updateDetailsModal();
}

function closeDetailsModal() {
  store.situationsView.detailsModalOpen = false;
  updateDetailsModal();
}

function rerenderPanels() {
  ensureViewUiState();

  const filteredSituations = getFilteredSituations();
  const counts = getVisibleCounts(filteredSituations);
  const tableHost = document.getElementById("situationsTableHost");
  const detailsHost = document.getElementById("situationsDetailsHost");
  const detailsTitleHost = document.getElementById("situationsDetailsTitle");
  const countsHost = document.getElementById("situationsHeaderCounts");
  const verdictFilter = document.getElementById("verdictFilter");
  const displayDepth = document.getElementById("displayDepth");
  const searchInput = document.getElementById("situationsSearch");

  if (verdictFilter) verdictFilter.value = store.situationsView.verdictFilter || "ALL";
  if (displayDepth) displayDepth.value = store.situationsView.displayDepth || "situations";
  if (searchInput) searchInput.value = store.situationsView.search || "";

  if (countsHost) countsHost.textContent = `${counts.situations} situations · ${counts.sujets} sujets · ${counts.avis} avis`;
  if (tableHost) tableHost.innerHTML = renderTableHtml(filteredSituations);

  const details = renderDetailsHtml(null, {
    subissuesOptions: {
      sujetRowClass: "js-modal-drilldown-sujet",
      sujetToggleClass: "js-modal-toggle-sujet",
      avisRowClass: "js-modal-drilldown-avis",
      expandedSujets: store.situationsView.rightExpandedSujets
    }
  });
  if (detailsTitleHost) detailsTitleHost.innerHTML = details.titleHtml;
  if (detailsHost) detailsHost.innerHTML = details.bodyHtml;

  wireDetailsInteractive(detailsHost);
  updateDetailsModal();
  if (store.situationsView.drilldown?.isOpen) updateDrilldownPanel();
}

function selectSituation(situationId) {
  const situation = getNestedSituation(situationId);
  if (!situation) return;
  store.situationsView.selectedSituationId = situationId;
  store.situationsView.selectedSujetId = null;
  store.situationsView.selectedAvisId = null;
  store.situationsView.expandedSituations.add(situationId);
  rerenderPanels();
}

function selectSujet(sujetId) {
  const sujet = getNestedSujet(sujetId);
  if (!sujet) return;
  const situation = getSituationBySujetId(sujetId);
  store.situationsView.selectedSituationId = situation?.id || null;
  store.situationsView.selectedSujetId = sujetId;
  store.situationsView.selectedAvisId = null;
  if (situation?.id) store.situationsView.expandedSituations.add(situation.id);
  store.situationsView.expandedSujets.add(sujetId);
  rerenderPanels();
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

function rerenderScope(root) {
  rerenderPanels();
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

function applyValidateAvis(root) {
  const target = currentDecisionTarget(root);
  if (!target || target.type !== "avis") return;

  const avisId = target.id;
  const verdict = String(store.situationsView.tempAvisVerdict || "F").toUpperCase();
  setDecision("avis", avisId, `VALIDATED_${verdict}`, "", { actor: "Human", agent: "human" });
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

function wireDetailsInteractive(root) {
  if (!root) return;

  const isModalScope = !!root.closest("#detailsModal");
  const isDrilldownScope = !!root.closest("#drilldownPanel");

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

  root.querySelectorAll("[data-action='set-verdict']").forEach((btn) => {
    btn.onclick = (ev) => {
      ev.preventDefault();
      const v = String(btn.dataset.verdict || "").toUpperCase();
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

  document.getElementById("detailsClose")?.addEventListener("click", closeDetailsModal);
  document.getElementById("detailsModal")?.addEventListener("click", (event) => {
    if (event.target?.id === "detailsModal") closeDetailsModal();
  });
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
  panel.className = "drilldown hidden";
  panel.innerHTML = `
    <div class="drilldown__inner gh-panel gh-panel--details">
      <div class="drilldown__head gh-panel__head gh-panel__head--tight">
        <div class="details-head details-head--expanded" style="width:100%;">
          <div class="details-head-left" style="min-width:0;">
            <div class="details-kicker mono">DÉTAILS</div>
            <div class="gh-panel__title" id="drilldownTitle">—</div>
          </div>
          <div class="details-head-right">
            <button class="icon-btn icon-btn--sm" id="drilldownClose" aria-label="Fermer">✕</button>
          </div>
        </div>
      </div>
      <div class="drilldown__body details-body" id="drilldownBody"></div>
    </div>
  `;
  document.body.appendChild(panel);
  panel.querySelector('#drilldownClose')?.addEventListener('click', closeDrilldown);
  panel.addEventListener('click', (ev) => { if (ev.target === panel) closeDrilldown(); });
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
}

function openDrilldown() {
  ensureViewUiState();
  ensureDrilldownDom();
  closeGlobalNav();
  store.situationsView.drilldown.isOpen = true;
  document.getElementById("drilldownPanel")?.classList.remove("hidden");
  document.body.classList.add("drilldown-open");
  updateDrilldownPanel();
}

function closeDrilldown() {
  ensureViewUiState();
  store.situationsView.drilldown.isOpen = false;
  document.getElementById("drilldownPanel")?.classList.add("hidden");
  document.body.classList.remove("drilldown-open");
}

function openDrilldownFromSituation(situationId) {
  ensureViewUiState();
  const situation = getNestedSituation(situationId);
  if (!situation) return;
  store.situationsView.drilldown.selectedSituationId = situation.id;
  store.situationsView.drilldown.selectedSujetId = null;
  store.situationsView.drilldown.selectedAvisId = null;
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
  openDrilldown();
}

function bindCondensedTitleScroll(scrollEl, classHost, key) {
  if (!scrollEl || !classHost) return;
  const boundKey = key || "default";
  const attr = `scrollBound${boundKey.charAt(0).toUpperCase()}${boundKey.slice(1)}`;
  if (scrollEl.dataset[attr] === "1") return;
  scrollEl.dataset[attr] = "1";

  const syncCompactState = () => {
    const scrolled = (scrollEl.scrollTop || 0) > 8;
    classHost.classList.toggle("details-scrolled", scrolled);
    classHost.querySelectorAll?.(".gh-panel__head--tight, .modal__head, .drilldown__head").forEach((head) => {
      head.classList.toggle("details-head--compact", scrolled);
      head.classList.toggle("details-head--expanded", !scrolled);
    });
  };

  scrollEl.addEventListener("scroll", syncCompactState, { passive: true });
  syncCompactState();
  setTimeout(syncCompactState, 0);
}

function bindDetailsScroll(root) {
  bindCondensedTitleScroll(
    root.querySelector("#situationsDetailsHost"),
    root.querySelector(".gh-panel--details"),
    "details"
  );

  bindCondensedTitleScroll(
    document.getElementById("detailsBodyModal"),
    document.getElementById("detailsModal"),
    "modal"
  );

  bindCondensedTitleScroll(
    document.getElementById("drilldownBody"),
    document.querySelector("#drilldownPanel .drilldown__inner"),
    "drilldown"
  );
}

function bindSituationsEvents(root) {
  root.querySelector("#verdictFilter")?.addEventListener("change", (event) => {
    store.situationsView.verdictFilter = String(event.target.value || "ALL").toUpperCase();
    rerenderPanels();
  });

  root.querySelector("#situationsSearch")?.addEventListener("input", (event) => {
    store.situationsView.search = String(event.target.value || "");
    rerenderPanels();
  });

  root.querySelector("#displayDepth")?.addEventListener("change", (event) => {
    store.situationsView.displayDepth = String(event.target.value || "situations").toLowerCase();
    rerenderPanels();
  });

  root.addEventListener("click", (event) => {
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
      if (store.situationsView.expandedSituations.has(situationId)) store.situationsView.expandedSituations.delete(situationId);
      else store.situationsView.expandedSituations.add(situationId);
      rerenderPanels();
      return;
    }

    const toggleSujet = event.target.closest(".js-toggle-sujet");
    if (toggleSujet) {
      event.preventDefault();
      event.stopPropagation();
      const sujetId = String(toggleSujet.dataset.sujetId || "");
      if (store.situationsView.expandedSujets.has(sujetId)) store.situationsView.expandedSujets.delete(sujetId);
      else store.situationsView.expandedSujets.add(sujetId);
      rerenderPanels();
      return;
    }

    const avisRow = event.target.closest(".js-row-avis");
    if (avisRow) {
      event.preventDefault();
      selectAvis(String(avisRow.dataset.avisId || ""));
      return;
    }

    const sujetRow = event.target.closest(".js-row-sujet");
    if (sujetRow) {
      event.preventDefault();
      selectSujet(String(sujetRow.dataset.sujetId || ""));
      return;
    }

    const situationRow = event.target.closest(".js-row-situation");
    if (situationRow) {
      event.preventDefault();
      selectSituation(String(situationRow.dataset.situationId || ""));
    }
  });
}

/* =========================================================
   Public render
========================================================= */

export function renderProjectSituations(root) {
  ensureSituationsLegacyDomStyle();
  ensureViewUiState();
  ensureDrilldownDom();

  const data = store.situationsView.data || [];
  const firstSituationId = data[0]?.id || null;

  if (!store.situationsView.selectedSituationId && firstSituationId) {
    store.situationsView.selectedSituationId = firstSituationId;
  }
  if (!store.situationsView.expandedSituations.size && firstSituationId) {
    store.situationsView.expandedSituations.add(firstSituationId);
  }

    root.innerHTML = `
    <section class="gh-panel gh-panel--results" aria-label="Results">
      <div class="gh-panel__head gh-panel__head--tight">
        <div class="results-bar">
          <div class="results-bar__left">
            <label class="gh-filter gh-filter--inline">
              <select id="displayDepth" class="gh-input gh-input--sm">
                <option value="situations">Situations</option>
                <option value="sujets">Sujets</option>
                <option value="avis">Avis</option>
              </select>
            </label>
            <div class="results-bar__right">
              <div class="issues-totals mono" id="situationsHeaderCounts">—</div>
            </div>
            <label class="gh-filter gh-filter--inline">
                <input id="situationsSearch" class="gh-input gh-input--sm gh-input--search" type="text" placeholder="topic / EC8 / mot-clé…" />
                <span class="icon-search">
                  <svg aria-hidden="true" focusable="false" class="octicon octicon-search" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path></svg>
                </span>
              </label>
            <div class="gh-filters gh-filters--inline">
              <label class="gh-filter gh-filter--inline">
                <span>Verdict</span>
                <select id="verdictFilter" class="gh-input gh-input--sm">
                  <option value="ALL">All</option>
                  <option value="F">F</option>
                  <option value="D">D</option>
                  <option value="S">S</option>
                  <option value="HM">HM</option>
                  <option value="PM">PM</option>
                  <option value="SO">SO</option>
                  <option value="OK">OK</option>
                  <option value="KO">KO</option>
                  <option value="WARNING">WARNING</option>
                </select>
              </label>
              ${renderProjectSituationsRunbar()}
            </div>
          </div> 
        </div>
      </div>

      <div id="situationsTableHost"></div>
    </section>

    <section class="gh-panel gh-panel--details" aria-label="Details">
      <div class="gh-panel__head gh-panel__head--tight" id="situationsDetailsTitle"></div>
      <div class="details-body" id="situationsDetailsHost">
        <div class="emptyState">Sélectionne une situation / un sujet / un avis pour afficher les détails.</div>
      </div>
    </section>
  `;

  rerenderPanels();
  bindSituationsEvents(root);
  bindProjectSituationsRunbar(root);
  bindModalEvents();
  bindDetailsScroll(root);
  initRightSplitter(root);
  updateDetailsModal();
  syncProjectSituationsRunbar({
    run_id: store.ui?.runId || "",
    status: store.ui?.systemStatus?.state || "idle",
    label: store.ui?.systemStatus?.label || "",
    meta: store.ui?.systemStatus?.meta || "",
    isBusy: store.ui?.systemStatus?.state === "running"
  });
}
