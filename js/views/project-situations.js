import { store } from "../store.js";
import { runAnalysis, resetAnalysisUi } from "../services/analysis-runner.js";

/*  version V1.0.5 */
(function injectMiddleHoverStyle(){
  if (document.getElementById("middle-hover-style")) return;
  const style = document.createElement("style");
  style.id = "middle-hover-style";
  style.innerHTML = `
    .issues-table__body .row:hover,
    .issues-table__body .issue-row:hover,
    .issues-table__body .line:hover {
      background: rgb(21, 27, 35) !important;
    }
  `;
  document.head.appendChild(style);
})();


/* ===== Clickable entity links (IDs) ===== */
(function injectEntityLinkStyle(){
  if (document.getElementById("entity-link-style")) return;
  const style = document.createElement("style");
  style.id = "entity-link-style";
  style.innerHTML = `
    a.entity-link{
      text-decoration: none;
      cursor: pointer;
      color:rgb(145, 152, 161);
    }
    a.entity-link:hover{
      text-decoration: underline;
    }
  `;
  document.head.appendChild(style);
})();


/* ===== @rapso hint + pending animation ===== */
(function injectRapsoUiStyle(){
  if (document.getElementById("rapso-ui-style")) return;
  const style = document.createElement("style");
  style.id = "rapso-ui-style";
  style.innerHTML = `
    .rapso-mention-hint{
      display:flex;
      align-items:center;
      gap:8px;
      color: var(--muted);
      font-size: 12px;
      min-width: 0;
      flex: 1 1 auto;
    }
    .rapso-mention-hint .mono{ color: var(--fg); }
    .rapso-mention-ico{
      width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;
      color: var(--muted);
      flex: 0 0 auto;
    }
    .rapso-wait{
      display:flex;
      align-items:center;
      gap:10px;
      padding: 10px 12px;
      border: 1px solid rgba(56,139,253,.35);
      background: rgba(56,139,253,.08);
      border-radius: 10px;
      overflow:hidden;
    }
    .rapso-spinner{
      width:16px;height:16px;
      border-radius:50%;
      border:2px solid rgba(139,148,158,.35);
      border-top-color: rgba(56,139,253,.9);
      animation: rapso-spin 0.9s linear infinite;
      flex:0 0 auto;
    }
    @keyframes rapso-spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
    .rapso-shimmer{
      position:relative;
      font-weight:600;
      color: var(--fg);
      white-space:nowrap;
    }
    .rapso-shimmer:after{
      content:"";
      position:absolute;
      top:0;left:-120%;
      width:120%;
      height:100%;
      background: linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(255,255,255,.18) 50%, rgba(0,0,0,0) 100%);
      animation: rapso-sweep 1.4s ease-in-out infinite;
      pointer-events:none;
    }
    @keyframes rapso-sweep { from { left:-120%; } to { left:120%; } }
    .rapso-wait-sub{
      color: var(--muted);
      font-size: 12px;
      margin-top: 6px;
    }
  `;
  document.head.appendChild(style);
})();


// RAPSOBOT PoC UI — lighter middle list + persistent expand + right details with parent context
// Expected from webhook:
// { status, run_id, situations[], problems[], avis[] }

const qs = new URLSearchParams(location.search);

const STORAGE_KEY = "rapsobot_ui_human_v2";

const STORAGE_KEY_ASSIST = "rapsobot_ui_assistant_v1";

const state = {
  data: null,

  // persistent expansions
  expandedSituations: new Set(), // situation_id
  expandedProblems: new Set(),   // problem_id

  // selection for right panel
  selectedSituationId: null,
  selectedProblemId: null,
  selectedAvisId: null,

  verdictFilter: "ALL",
  search: "",
  displayDepth: "situations", // situations | sujets | avis

  page: 1,
  pageSize: 80, // paginating avis within a problem if needed

  sidebarCollapsed: false,

  // preserve middle list scroll when re-rendering
  middleScrollTop: 0,
  middleScrollLeft: 0,

  // right panel: sub-issues table (below description)
  rightSubissuesOpen: true,
  rightExpandedProblems: new Set(),

  // details actions
  tempAvisVerdict: null,
  tempAvisVerdictFor: null,
  // drilldown slide-in panel (independent from main details/modale)
  drilldown: {
    isOpen: false,
    selectedSituationId: null,
    selectedProblemId: null,
    selectedAvisId: null,
    rightSubissuesOpen: true,
    rightExpandedProblems: new Set(),
    tempAvisVerdict: null,
    tempAvisVerdictFor: null,
  },


  // private assistant overlay (non-public chat with Rapso)
  assistant: {
    isOpen: false,
    helpMode: false,
    // persistent chat stored in localStorage (separate key)
    draft: "",
  },


};

// DOM helpers
function el(id){
  const aliases = {
    runBtnTop: ["runBtnTop", "runAnalysisBtnTop"],
    runMetaTop: ["runMetaTop", "runAnalysisMetaTop"],
  };
  const ids = aliases[id] || [id];
  for (const candidate of ids) {
    const node = document.getElementById(candidate);
    if (node) return node;
  }
  return null;
}
function els(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function ensureGlobalTopbarAliases() {
  const runBtn = document.getElementById("runAnalysisBtnTop");
  if (runBtn && !document.getElementById("runBtnTop")) runBtn.id = "runBtnTop";

  const runMeta = document.getElementById("runAnalysisMetaTop");
  if (runMeta && !document.getElementById("runMetaTop")) runMeta.id = "runMetaTop";
}

function clearLocalSituationsState() {
  state.data = null;
  state.expandedSituations = new Set();
  state.expandedProblems = new Set();
  state.selectedSituationId = null;
  state.selectedProblemId = null;
  state.selectedAvisId = null;
  state.verdictFilter = "ALL";
  state.search = "";
  state.page = 1;
  state._lastRawResult = null;
}

function syncStateFromStore() {
  const ui = store.ui || {};
  const sys = ui.systemStatus || {};
  setRunMeta(ui.runId || "");
  setSystemStatus(sys.state || "idle", sys.label || "Idle", sys.meta || "—");

  const view = store.situationsView || {};
  const raw = view.rawResult || null;

  if (!raw) {
    clearLocalSituationsState();
    return;
  }

  if (state._lastRawResult !== raw) {
    state.data = raw;
    state._lastRawResult = raw;
    state.expandedSituations = new Set(view.expandedSituations || []);
    state.expandedProblems = new Set(view.expandedSujets || view.expandedProblems || []);
    state.selectedSituationId = view.selectedSituationId || raw?.situations?.[0]?.situation_id || null;
    state.selectedProblemId = view.selectedSujetId || view.selectedProblemId || null;
    state.selectedAvisId = view.selectedAvisId || null;
    state.verdictFilter = view.verdictFilter || state.verdictFilter || "ALL";
    state.search = view.search || state.search || "";
    state.page = view.page || state.page || 1;
  }
}

function renderSituationsShell(root) {
  const projectId = store.currentProjectId || "demo";
  root.innerHTML = `
    <div id="topBanner" class="gh-banner gh-banner--info hidden"></div>

    <div class="gh-page gh-page--3col" style="padding-top:0;">
      <aside id="sidebar" class="gh-sidebar">
        <div class="gh-sidebar__head">
          <div class="sidebar-head-left">
            <button id="sidebarToggle" class="icon-btn icon-btn--sm" type="button" aria-label="Rétracter le menu">☰</button>
            <strong>Paramètres</strong>
          </div>
        </div>

        <div class="gh-sidebar__section">
          <div class="emptyState" style="padding:0;border:none;background:none;">
            <p><strong>Référence de vérité</strong></p>
            <p>Les paramètres projet restent dans l’onglet <a href="#project/${projectId}/identity">Fiche d’identité</a>.</p>
            <p>Le PDF reste dans l’onglet <a href="#project/${projectId}/documents">Documents</a>.</p>
          </div>
        </div>
      </aside>

      <button id="sidebarToggleFloating" class="sidebar-fab icon-btn" type="button" aria-label="Afficher le menu">☰</button>

      <section class="gh-panel gh-panel--results">
        <div class="gh-panel__head gh-panel__head--tight">
          <div class="issues-head">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <strong>Résultats</strong>

              <label class="gh-filter" for="verdictFilter">
                <span>Verdict</span>
                <select id="verdictFilter" class="gh-input gh-input--sm">
                  <option value="ALL">ALL</option>
                  <option value="OK">OK</option>
                  <option value="D">D</option>
                  <option value="S">S</option>
                  <option value="HM">HM</option>
                  <option value="PM">PM</option>
                  <option value="SO">SO</option>
                </select>
              </label>

              <label class="gh-filter" for="searchBox">
                <span>Search</span>
                <input id="searchBox" class="gh-input gh-input--sm" type="text" placeholder="topic / EC8 / mot-clé…">
              </label>
            </div>

            <div id="counts" class="issues-totals mono">—</div>
            <div id="issuesTotals" class="mono" style="display:none">—</div>
          </div>
        </div>

        <div id="issuesTable"></div>

        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 0 0 0;">
          <div id="pageInfo" class="mono"></div>
          <div style="display:flex;gap:8px;">
            <button id="prevPage" class="gh-btn gh-btn--sm" type="button">Précédent</button>
            <button id="nextPage" class="gh-btn gh-btn--sm" type="button">Suivant</button>
          </div>
        </div>
      </section>

      <aside class="gh-panel gh-panel--details">
        <div class="gh-panel__head gh-panel__head--tight">
          <div class="details-head">
            <div class="details-head-left">
              <div class="details-kicker mono">DÉTAILS</div>
              <div class="gh-panel__title" id="detailsTitle"></div>
            </div>
            <div class="details-head-right">
              <div class="details-meta mono" id="detailsMeta">—</div>
              <button id="detailsExpand" class="icon-btn icon-btn--sm" type="button" aria-label="Ouvrir en plein écran">↗</button>
            </div>
          </div>
        </div>

        <div id="detailsBody" class="details-body"></div>
      </aside>
    </div>
  `;
}



function entityLinkHtml(type, id, text, extraAttrs="") {
  const t = String(text ?? "");
  const safeText = escapeHtml(t);
  const safeId = escapeHtml(id);
  const safeType = escapeHtml(type);
  return `<a href="#" class="entity-link" data-nav-type="${safeType}" data-nav-id="${safeId}" ${extraAttrs}>${safeText}</a>`;
}

function openOverlayFor(type, id) {
  const t = String(type || "").toLowerCase();
  const x = String(id || "");
  if (!x) return;
  if (t === "avis") return openDrilldownFromAvis(x);
  if (t === "problem" || t === "sujet") return openDrilldownFromProblem(x);
  if (t === "situation") return drilldownSelectSituation(x);
}

function refreshAll() {
  // Keep selections; just re-render everything that can diverge visually.
  renderMiddle();
  renderDetails();
  if (state.drilldown?.isOpen) renderDetails({ target: "drill" });
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function badgePriority(p) {
  const v = String(p || "").toUpperCase();
  if (v === "P1") return "badge badge--p1";
  if (v === "P2") return "badge badge--p2";
  return "badge badge--p3";
}
function badgeVerdict(v) {
  const s = String(v || "").toUpperCase();
  return `verdict-badge verdict-${s}`;
}


/* ===== Open/Closed status icons (GitHub-like) ===== */
const SVG_ISSUE_OPEN = `<svg color="var(--fgColor-open)" aria-hidden="true" focusable="false" aria-label="" class="octicon octicon-issue-opened" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom;"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>`;
const SVG_ISSUE_CLOSED = `<svg color="var(--fgColor-done)" aria-hidden="true" focusable="false" aria-label="" class="octicon octicon-issue-closed" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" display="inline-block" overflow="visible" style="vertical-align:text-bottom"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path></svg>`;
const SVG_ISSUE_REOPENED = `<svg aria-hidden="true" focusable="false" class="octicon octicon-issue-reopened" viewBox="0 0 16 16" width="16" height="16" fill="rgb(63, 185, 80)" display="inline-block" overflow="visible" style="vertical-align: text-bottom;"><path d="M5.029 2.217a6.5 6.5 0 0 1 9.437 5.11.75.75 0 1 0 1.492-.154 8 8 0 0 0-14.315-4.03L.427 1.927A.25.25 0 0 0 0 2.104V5.75A.25.25 0 0 0 .25 6h3.646a.25.25 0 0 0 .177-.427L2.715 4.215a6.491 6.491 0 0 1 2.314-1.998ZM1.262 8.169a.75.75 0 0 0-1.22.658 8.001 8.001 0 0 0 14.315 4.03l1.216 1.216a.25.25 0 0 0 .427-.177V10.25a.25.25 0 0 0-.25-.25h-3.646a.25.25 0 0 0-.177.427l1.358 1.358a6.501 6.501 0 0 1-11.751-3.11.75.75 0 0 0-.272-.506Z"></path><path d="M9.06 9.06a1.5 1.5 0 1 1-2.12-2.12 1.5 1.5 0 0 1 2.12 2.12Z"></path></svg>`;
const SVG_AVATAR_HUMAN = `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style="display:block"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5.06 0-9 2.39-9 5.25V22h18v-2.75C21 16.39 17.06 14 12 14Z"></path></svg>`;


function issueStatusIconHtml(status) {
  const s = String(status || "closed").toLowerCase();
  const svg = (s === "open") ? SVG_ISSUE_OPEN : SVG_ISSUE_CLOSED;
  // Wrapper for spacing/alignment (no extra CSS required)
  return `<span class="issue-status-icon" style="display:inline-flex; align-items:center; margin-right:8px;">${svg}</span>`;
}



/* ===== Sub-issues: Problems (sujets) closed ratio icon ===== */
function problemsCountsIconHtml(closedCount, totalCount) {
  const total = Math.max(0, Number(totalCount) || 0);
  const closed = Math.max(0, Math.min(total, Number(closedCount) || 0));

  if (total > 0 && closed === total) {
    return `<span class="subissues-problems-icon" aria-label="Tous les sujets sont closed">${SVG_ISSUE_CLOSED}</span>`;
  }

  // Base circle + pie slice (camembert) showing closed/total
  const ratio = total ? (closed / total) : 0;
  const r = 8;
  const cx = 10, cy = 10;
  const a = ratio * Math.PI * 2;

  // If ratio is 0, show only the grey circle
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

function setSystemStatus(kind, label, meta) {
  el("sysLabel").textContent = label || "";
  el("sysMeta").textContent = meta || "—";
  const dot = el("sysDot");
  const colors = { idle: "var(--muted)", running: "var(--accent)", done: "var(--success)", error: "var(--danger)" };
  dot.style.background = colors[kind] || colors.idle;
}

function showBanner(kind, msg) {
  const box = el("topBanner");
  if (!box) return;
  if (!msg) {
    box.classList.add("hidden");
    document.body.classList.remove("banner-visible");
    box.textContent = "";
    box.classList.remove("gh-banner--error", "gh-banner--info");
    return;
  }
  box.classList.remove("hidden");
  document.body.classList.add("banner-visible");
  box.classList.toggle("gh-banner--error", kind === "error");
  box.classList.toggle("gh-banner--info", kind !== "error");
  box.textContent = msg;
}


function setRunMeta(run_id) {
  el("runMetaTop").textContent = run_id ? `run_id=${run_id}` : "";
}
function setIssuesTotals(d) {
  const node = el("issuesTotals");
  if (!d) return (node.textContent = "—");
  const s = Array.isArray(d.situations) ? d.situations.length : 0;
  const p = Array.isArray(d.problems) ? d.problems.length : 0;
  const a = Array.isArray(d.avis) ? d.avis.length : 0;
  node.textContent = `${s} situations · ${p} sujets · ${a} avis`;
}


function showError(msg) {
  showBanner("error", msg || "Erreur inconnue");
  console.error("[RAPSOBOT] " + (msg || "Erreur inconnue"));
}


function setDetailsMeta(text) {
  el("detailsMeta").textContent = text || "—";
  if (el("detailsMetaModal")) el("detailsMetaModal").textContent = text || "—";
}

function setDetailsTitle(text) {
  const t = text || "Sélectionner un élément";
  const m = el("detailsTitle");
  if (m) m.textContent = t;
  const mm = el("detailsTitleModal");
  if (mm) mm.textContent = t;
}


/* ===== Details head: HTML title + GitHub-like badges ===== */
function setDetailsTitleHtml(html) {
  const m = el("detailsTitle");
  if (m) m.innerHTML = html || "";
  const mm = el("detailsTitleModal");
  if (mm) mm.innerHTML = html || "";
}

function statusBadgeHtml(status) {
  const s = String(status || "OPEN").toUpperCase();
  const isClosed = (s === "CLOSED" || s === "DONE" || s === "OK");
  const label = isClosed ? "Closed" : "Open";
  const cls = isClosed ? "gh-state gh-state--closed" : "gh-state gh-state--open";
  const svg = isClosed ?  SVG_ISSUE_CLOSED : SVG_ISSUE_OPEN;
  return `<span class="${cls}">${svg}<span>${label}</span></span>`;
}

function detailsBadgesHtmlForSelection(obj, kind) {
  if (!obj) return "";
  if (kind === "situation") {
    const st = getEffectiveSituationStatus(obj.situation_id);
    const pr = obj.priority ? `<span class="badge ${badgePriority(obj.priority)}">${escapeHtml(obj.priority)}</span>` : "";
    return `${statusBadgeHtml(st)}${pr}`;
  }
  if (kind === "problem") {
    const st = getEffectiveProblemStatus(obj.problem_id);
    const pr = obj.priority ? `<span class="badge ${badgePriority(obj.priority)}">${escapeHtml(obj.priority)}</span>` : "";
    return `${statusBadgeHtml(st)}${pr}`;
  }
  if (kind === "avis") {
    const v = getEffectiveAvisVerdict(obj.avis_id) || obj.verdict || "";
    return v ? `<span class="${badgeVerdict(v)}">${escapeHtml(v)}</span>` : "";
  }
  return "";
}
/* ===============================
   DATA HELPERS
================================ */

function bySituation(id){
  return state.data?.situations?.find(s => s.situation_id === id) || null;
}

function byProblem(id){
  return state.data?.problems?.find(p => p.problem_id === id) || null;
}

function byAvis(id){
  return state.data?.avis?.find(a => a.avis_id === id) || null;
}

function problemsForSituation(situation_id){
  return (state.data?.problems || []).filter(p => p.situation_id === situation_id);
}

function avisForProblem(problem_id){
  return (state.data?.avis || []).filter(a => a.problem_id === problem_id);
}

function avisForSituation(situation_id){
  const probs = problemsForSituation(situation_id).map(p => p.problem_id);
  return (state.data?.avis || []).filter(a => probs.includes(a.problem_id));
}


/* ===============================
   EFFECTIVE STATUS / VERDICT
================================ */

function getEffectiveAvisVerdict(id){
  const a = byAvis(id);
  return a?.verdict || null;
}

function getEffectiveProblemStatus(problem_id){
  const avis = avisForProblem(problem_id);
  if (!avis.length) return "open";

  const allClosed = avis.every(a => (a.verdict || "").toUpperCase() === "OK");
  return allClosed ? "closed" : "open";
}

function getEffectiveSituationStatus(situation_id){
  const probs = problemsForSituation(situation_id);
  if (!probs.length) return "open";

  const allClosed = probs.every(p => getEffectiveProblemStatus(p.problem_id) === "closed");
  return allClosed ? "closed" : "open";
}


/* ===============================
   FILTERING
================================ */

function applyFilters(list){
  const verdict = state.verdictFilter;
  const search = state.search.toLowerCase();

  return list.filter(a => {
    if (verdict !== "ALL") {
      const v = (a.verdict || "").toUpperCase();
      if (v !== verdict) return false;
    }

    if (search) {
      const txt =
        (a.topic || "") +
        " " +
        (a.description || "") +
        " " +
        (a.code || "");
      if (!txt.toLowerCase().includes(search)) return false;
    }

    return true;
  });
}


/* ===============================
   MIDDLE TABLE RENDER
================================ */

function renderMiddle(){

  const box = el("issuesTable");
  if (!box) return;

  if (!state.data){
    box.innerHTML = `
      <div class="emptyState">
        <p>Aucune analyse exécutée.</p>
      </div>
    `;
    return;
  }

  const situations = state.data.situations || [];
  const problems = state.data.problems || [];
  const avis = state.data.avis || [];

  const rows = [];

  situations.forEach(s => {

    const sOpen = state.expandedSituations.has(s.situation_id);
    const sStatus = getEffectiveSituationStatus(s.situation_id);

    rows.push(`
      <div class="row situation-row" data-id="${s.situation_id}">
        <div class="col-main">
          ${issueStatusIconHtml(sStatus)}
          ${escapeHtml(s.title || "Situation")}
        </div>
      </div>
    `);

    if (!sOpen) return;

    const probs = problems.filter(p => p.situation_id === s.situation_id);

    probs.forEach(p => {

      const pOpen = state.expandedProblems.has(p.problem_id);
      const pStatus = getEffectiveProblemStatus(p.problem_id);

      rows.push(`
        <div class="row problem-row" data-id="${p.problem_id}">
          <div class="col-main indent">
            ${issueStatusIconHtml(pStatus)}
            ${escapeHtml(p.title || "Sujet")}
          </div>
        </div>
      `);

      if (!pOpen) return;

      const aList = avisForProblem(p.problem_id);
      const filtered = applyFilters(aList);

      filtered.forEach(a => {

        rows.push(`
          <div class="row avis-row" data-id="${a.avis_id}">
            <div class="col-main indent2">
              <span class="${badgeVerdict(a.verdict)}">${escapeHtml(a.verdict || "")}</span>
              ${escapeHtml(a.topic || "Avis")}
            </div>
          </div>
        `);

      });

    });

  });

  box.innerHTML = `
    <div class="issues-table">
      <div class="issues-table__body">
        ${rows.join("")}
      </div>
    </div>
  `;

  bindMiddleEvents();
}


/* ===============================
   MIDDLE EVENTS
================================ */

function bindMiddleEvents(){

  els(".situation-row").forEach(r => {
    r.onclick = () => {
      const id = r.dataset.id;

      if (state.expandedSituations.has(id))
        state.expandedSituations.delete(id);
      else
        state.expandedSituations.add(id);

      state.selectedSituationId = id;
      renderMiddle();
      renderDetails();
    };
  });

  els(".problem-row").forEach(r => {
    r.onclick = () => {
      const id = r.dataset.id;

      if (state.expandedProblems.has(id))
        state.expandedProblems.delete(id);
      else
        state.expandedProblems.add(id);

      state.selectedProblemId = id;
      renderMiddle();
      renderDetails();
    };
  });

  els(".avis-row").forEach(r => {
    r.onclick = () => {
      const id = r.dataset.id;
      state.selectedAvisId = id;
      renderDetails();
    };
  });

}
/* ===============================
   DETAILS PANEL
================================ */

function renderDetails(opts = {}) {

  const target = opts.target || "main";

  const body = target === "main"
    ? el("detailsBody")
    : el("detailsBodyDrill");

  if (!body) return;

  if (!state.selectedSituationId && !state.selectedProblemId && !state.selectedAvisId){
    body.innerHTML = `
      <div class="emptyState">
        <p>Sélectionner un élément dans la liste.</p>
      </div>
    `;
    return;
  }

  if (state.selectedAvisId){

    const a = byAvis(state.selectedAvisId);
    const p = byProblem(a.problem_id);
    const s = bySituation(p.situation_id);

    setDetailsTitleHtml(`
      ${escapeHtml(a.topic || "Avis")}
      ${detailsBadgesHtmlForSelection(a, "avis")}
    `);

    setDetailsMeta(`Situation ${s.situation_id} · Sujet ${p.problem_id}`);

    body.innerHTML = `
      <div class="details-block">
        <div class="details-description">
          ${escapeHtml(a.description || "—")}
        </div>
      </div>
    `;

    return;
  }

  if (state.selectedProblemId){

    const p = byProblem(state.selectedProblemId);
    const s = bySituation(p.situation_id);

    setDetailsTitleHtml(`
      ${escapeHtml(p.title || "Sujet")}
      ${detailsBadgesHtmlForSelection(p, "problem")}
    `);

    setDetailsMeta(`Situation ${s.situation_id}`);

    const avis = avisForProblem(p.problem_id);

    const rows = avis.map(a => `
      <div class="row avis-row" data-id="${a.avis_id}">
        <div class="col-main">
          <span class="${badgeVerdict(a.verdict)}">${escapeHtml(a.verdict || "")}</span>
          ${escapeHtml(a.topic || "")}
        </div>
      </div>
    `).join("");

    body.innerHTML = `
      <div class="details-block">
        <div class="details-description">
          ${escapeHtml(p.description || "—")}
        </div>

        <div class="subissues">
          ${rows}
        </div>
      </div>
    `;

    return;
  }

  if (state.selectedSituationId){

    const s = bySituation(state.selectedSituationId);

    setDetailsTitleHtml(`
      ${escapeHtml(s.title || "Situation")}
      ${detailsBadgesHtmlForSelection(s, "situation")}
    `);

    setDetailsMeta("");

    const probs = problemsForSituation(s.situation_id);

    const rows = probs.map(p => `
      <div class="row problem-row" data-id="${p.problem_id}">
        <div class="col-main">
          ${issueStatusIconHtml(getEffectiveProblemStatus(p.problem_id))}
          ${escapeHtml(p.title || "")}
        </div>
      </div>
    `).join("");

    body.innerHTML = `
      <div class="details-block">
        <div class="details-description">
          ${escapeHtml(s.description || "—")}
        </div>

        <div class="subissues">
          ${rows}
        </div>
      </div>
    `;

  }

}


/* ===============================
   FILTERS
================================ */

function bindFilters(){

  const f = el("verdictFilter");
  const s = el("searchBox");

  if (f){
    f.value = state.verdictFilter;
    f.onchange = () => {
      state.verdictFilter = f.value;
      renderMiddle();
    };
  }

  if (s){
    s.value = state.search;
    s.oninput = () => {
      state.search = s.value;
      renderMiddle();
    };
  }

}


/* ===============================
   PAGINATION
================================ */

function bindPagination(){

  const prev = el("prevPage");
  const next = el("nextPage");

  if (prev){
    prev.onclick = () => {
      state.page = Math.max(1, state.page - 1);
      renderMiddle();
    };
  }

  if (next){
    next.onclick = () => {
      state.page += 1;
      renderMiddle();
    };
  }

}


/* ===============================
   ASSISTANT OVERLAY
================================ */

function toggleAssistant(){

  state.assistant.isOpen = !state.assistant.isOpen;

  const box = el("assistantOverlay");
  if (!box) return;

  box.classList.toggle("hidden", !state.assistant.isOpen);

}


function renderAssistant(){

  const box = el("assistantOverlay");
  if (!box) return;

  box.innerHTML = `
    <div class="assistant-window">

      <div class="assistant-head">
        <strong>Assistant privé</strong>
        <button id="assistantClose" class="icon-btn">✕</button>
      </div>

      <div class="assistant-body">
        <p class="mono">Assistant Rapso privé.</p>
      </div>

      <div class="assistant-input">
        <input id="assistantDraft" placeholder="@rapso ..." />
        <button id="assistantSend">Send</button>
      </div>

    </div>
  `;

  el("assistantClose").onclick = toggleAssistant;

}


/* ===============================
   GLOBAL BINDINGS
================================ */

function bindGlobal(){

  ensureGlobalTopbarAliases();

  const runBtn = el("runBtnTop");
  const resetBtn = el("resetBtnTop");

  if (runBtn) runBtn.onclick = runAnalysis;
  if (resetBtn) resetBtn.onclick = resetAnalysisUi;

}

/* ===============================
   STORE SYNC (UI -> store)
================================ */

function syncBackToStore() {
  if (!store.situationsView) return;

  store.situationsView.expandedSituations = new Set(state.expandedSituations);
  store.situationsView.expandedSujets = new Set(state.expandedProblems);
  store.situationsView.selectedSituationId = state.selectedSituationId;
  store.situationsView.selectedSujetId = state.selectedProblemId;
  store.situationsView.selectedAvisId = state.selectedAvisId;
  store.situationsView.verdictFilter = state.verdictFilter;
  store.situationsView.search = state.search;
  store.situationsView.page = state.page;
}


/* ===============================
   COUNTS / PAGE INFO
================================ */

function renderCounts() {
  const counts = el("counts");
  const pageInfo = el("pageInfo");

  if (!counts || !pageInfo) return;

  if (!state.data) {
    counts.textContent = "—";
    pageInfo.textContent = "";
    return;
  }

  const situations = state.data.situations || [];
  const problems = state.data.problems || [];
  const avis = state.data.avis || [];

  const filteredAvis = applyFilters(avis);

  counts.textContent = `${situations.length} situations · ${problems.length} sujets · ${filteredAvis.length}/${avis.length} avis`;

  const totalPages = 1;
  pageInfo.textContent = `Page ${state.page} / ${totalPages}`;
}


/* ===============================
   DETAILS EVENTS
================================ */

function bindDetailsEvents() {
  const body = el("detailsBody");
  if (!body) return;

  body.querySelectorAll(".problem-row").forEach(r => {
    r.onclick = () => {
      const id = r.dataset.id;
      state.selectedProblemId = id;
      state.selectedAvisId = null;
      renderDetails();
      syncBackToStore();
    };
  });

  body.querySelectorAll(".avis-row").forEach(r => {
    r.onclick = () => {
      const id = r.dataset.id;
      state.selectedAvisId = id;
      renderDetails();
      syncBackToStore();
    };
  });
}


/* ===============================
   SCROLL MEMORY
================================ */

function captureMiddleScroll() {
  const scroller = el("issuesTable");
  if (!scroller) return;
  state.middleScrollTop = scroller.scrollTop || 0;
  state.middleScrollLeft = scroller.scrollLeft || 0;
}

function restoreMiddleScroll() {
  const scroller = el("issuesTable");
  if (!scroller) return;
  scroller.scrollTop = state.middleScrollTop || 0;
  scroller.scrollLeft = state.middleScrollLeft || 0;
}


/* ===============================
   SAFE RENDER CYCLE
================================ */

function rerenderAll() {
  captureMiddleScroll();
  renderMiddle();
  renderDetails();
  renderCounts();
  bindDetailsEvents();
  restoreMiddleScroll();
  syncBackToStore();
}


/* ===============================
   STORE WATCH
================================ */

let lastObservedRawResult = null;
let storeWatchStarted = false;

function startStoreWatch() {
  if (storeWatchStarted) return;
  storeWatchStarted = true;

  setInterval(() => {
    const raw = store?.situationsView?.rawResult || null;
    const runId = store?.ui?.runId || "";
    const sys = store?.ui?.systemStatus || {};

    setRunMeta(runId);
    setSystemStatus(sys.state || "idle", sys.label || "Idle", sys.meta || "—");

    if (raw !== lastObservedRawResult) {
      lastObservedRawResult = raw;
      syncStateFromStore();
      rerenderAll();
    }
  }, 400);
}


/* ===============================
   MODAL / DRILLDOWN PLACEHOLDERS
   (kept so existing calls do not break)
================================ */

function openDrilldownFromAvis(id) {
  state.selectedAvisId = id;
  const a = byAvis(id);
  if (a) {
    state.selectedProblemId = a.problem_id || null;
    const p = byProblem(a.problem_id);
    state.selectedSituationId = p?.situation_id || state.selectedSituationId;
  }
  rerenderAll();
}

function openDrilldownFromProblem(id) {
  state.selectedProblemId = id;
  state.selectedAvisId = null;
  const p = byProblem(id);
  if (p) state.selectedSituationId = p.situation_id || state.selectedSituationId;
  rerenderAll();
}

function drilldownSelectSituation(id) {
  state.selectedSituationId = id;
  state.selectedProblemId = null;
  state.selectedAvisId = null;
  rerenderAll();
}


/* ===============================
   ASSISTANT OVERLAY MOUNT
================================ */

function ensureAssistantOverlayMounted() {
  if (el("assistantOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "assistantOverlay";
  overlay.className = "hidden";
  document.body.appendChild(overlay);

  renderAssistant();
}


/* ===============================
   SIDEBAR TOGGLE
================================ */

function bindSidebarToggle() {
  const sidebar = el("sidebar");
  const btn = el("sidebarToggle");
  const fab = el("sidebarToggleFloating");

  if (!sidebar) return;

  const apply = () => {
    sidebar.classList.toggle("collapsed", !!state.sidebarCollapsed);
    if (fab) fab.classList.toggle("hidden", !state.sidebarCollapsed);
  };

  if (btn) {
    btn.onclick = () => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      apply();
    };
  }

  if (fab) {
    fab.onclick = () => {
      state.sidebarCollapsed = false;
      apply();
    };
  }

  apply();
}


/* ===============================
   TOPBAR ROBOT / ASSISTANT HOOK
================================ */

function bindAssistantLauncher() {
  const robotBtn =
    document.getElementById("robotHeadBtn") ||
    document.getElementById("assistantFab") ||
    document.getElementById("rapsoAssistantBtn");

  if (robotBtn) {
    robotBtn.onclick = () => {
      toggleAssistant();
      renderAssistant();
    };
  }
}


/* ===============================
   INITIALIZATION
================================ */

export function renderProjectSituations(root) {
  ensureGlobalTopbarAliases();
  renderSituationsShell(root);
  ensureAssistantOverlayMounted();

  syncStateFromStore();
  rerenderAll();

  bindFilters();
  bindPagination();
  bindGlobal();
  bindSidebarToggle();
  bindAssistantLauncher();

  restoreMiddleScroll();
  syncBackToStore();
  startStoreWatch();
}
