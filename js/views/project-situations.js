import { store } from "../store.js";

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
    }

    #situationsTableHost .issues-table{
      display:flex;
      flex-direction:column;
      min-height:0;
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

    #situationsDetailsHost{
      overflow-y:auto;
      overflow-x:hidden;
      min-height:0;
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

function issueIcon(status = "open") {
  const isOpen = String(status || "open").toLowerCase() !== "closed";
  return isOpen
    ? `<svg color="var(--fgColor-open)" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>`
    : `<svg color="var(--fgColor-done)" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path></svg>`;
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
  if (v === "F" || v === "OK") return "dot dot--green";
  if (v === "S" || v === "WARNING") return "dot dot--yellow";
  if (v === "D" || v === "KO") return "dot dot--red";
  if (v === "HM") return "dot dot--purple";
  if (v === "PM") return "dot dot--blue";
  if (v === "SO") return "dot dot--gray";
  return "dot";
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
  const icon = isOpen
    ? `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>`
    : `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path></svg>`;
  return `<span class="gh-state ${isOpen ? "gh-state--open" : "gh-state--closed"}"><span class="gh-state-dot" aria-hidden="true">${icon}</span>${isOpen ? "Open" : "Closed"}</span>`;
}

function timelineVerdictIcon(verdict) {
  const raw = normalizeVerdict(verdict);
  const short = raw === 'WARNING' ? 's' : raw === 'KO' ? 'd' : raw === 'OK' ? 'f' : String(raw || '').toLowerCase();
  const label = ['F','S','D','HM','PM','SO'].includes(raw) ? raw : (raw === 'WARNING' ? 'S' : raw === 'KO' ? 'D' : raw === 'OK' ? 'F' : '•');
  const cls = ['f','s','d','hm','pm','so'].includes(short) ? short : 'muted';
  return `<span class="tl-ico tl-ico--verdict tl-ico--${cls}" aria-hidden="true">${escapeHtml(label)}</span>`;
}

function humanAvatarSvg() {
  return `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6.25C3 11.903 5.239 10 8 10s5 1.903 5 4.25a.75.75 0 0 1-1.5 0c0-1.403-1.511-2.75-3.5-2.75s-3.5 1.347-3.5 2.75a.75.75 0 0 1-1.5 0Z"></path></svg>`;
}

function chevron(isOpen, isVisible = true) {
  if (!isVisible) return `<span class="chev chev--spacer"></span>`;
  return `<span class="chev">${isOpen ? "▾" : "▸"}</span>`;
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
      message: String(message || "")
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

function setDecision(entityType, entityId, decision, note = "") {
  persistRunBucket((bucket) => {
    bucket.decisions[entityType] = bucket.decisions[entityType] || {};
    bucket.decisions[entityType][entityId] = {
      ts: nowIso(),
      actor: "Human",
      decision: String(decision || ""),
      note: String(note || "")
    };
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

function getEffectiveSujetStatus(sujetId) {
  const sujet = getNestedSujet(sujetId);
  const decision = getDecision("sujet", sujetId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d === "CLOSED") return "closed";
  if (d === "REOPENED") return "open";
  return String(sujet?.status || "open").toLowerCase();
}

function getEffectiveSituationStatus(situationId) {
  const situation = getNestedSituation(situationId);
  const decision = getDecision("situation", situationId);
  const d = String(decision?.decision || "").toUpperCase();
  if (d === "CLOSED") return "closed";
  if (d === "REOPENED") return "open";
  return String(situation?.status || "open").toLowerCase();
}

/* =========================================================
   Nested data helpers
========================================================= */

function getNestedSituation(situationId) {
  return (store.situationsView.data || []).find((s) => String(s.id) === String(situationId)) || null;
}

function getNestedSujet(sujetId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of situation.sujets || []) {
      if (String(sujet.id) === String(sujetId)) return sujet;
    }
  }
  return null;
}

function getNestedAvis(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of situation.sujets || []) {
      for (const avis of sujet.avis || []) {
        if (String(avis.id) === String(avisId)) return avis;
      }
    }
  }
  return null;
}

function getSituationBySujetId(sujetId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of situation.sujets || []) {
      if (String(sujet.id) === String(sujetId)) return situation;
    }
  }
  return null;
}

function getSujetByAvisId(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of situation.sujets || []) {
      for (const avis of sujet.avis || []) {
        if (String(avis.id) === String(avisId)) return sujet;
      }
    }
  }
  return null;
}

function getSituationByAvisId(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of situation.sujets || []) {
      for (const avis of sujet.avis || []) {
        if (String(avis.id) === String(avisId)) return situation;
      }
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
  return null;
}

function avisMatchesFilter(avis, verdictFilter) {
  if (!avis) return false;
  const v = verdictLabel(getEffectiveAvisVerdict(avis.id));
  if (!verdictFilter || verdictFilter === "ALL") return true;
  return v === verdictFilter;
}

function getFilteredSituations() {
  const query = String(store.situationsView.search || "").trim().toLowerCase();
  const verdictFilter = String(store.situationsView.verdictFilter || "ALL").toUpperCase();

  return (store.situationsView.data || []).map((situation) => {
    const sujets = (situation.sujets || []).map((sujet) => {
      const avis = (sujet.avis || []).filter((avis) => {
        const searchMatch = matchSearch([
          situation.id,
          situation.title,
          sujet.id,
          sujet.title,
          avis.id,
          avis.title,
          avis.agent,
          avis.verdict,
          avis.raw?.message,
          avis.raw?.summary
        ], query);
        return searchMatch && avisMatchesFilter(avis, verdictFilter);
      });

      const sujetMatchesSearch = matchSearch([sujet.id, sujet.title], query);
      const situationMatchesSearch = matchSearch([situation.id, situation.title], query);

      if (avis.length || sujetMatchesSearch || situationMatchesSearch) {
        return { ...sujet, avis };
      }
      return null;
    }).filter(Boolean);

    const situationMatchesSearch = matchSearch([situation.id, situation.title], query);
    if (sujets.length || situationMatchesSearch) {
      return { ...situation, sujets };
    }
    return null;
  }).filter(Boolean);
}

function getVisibleCounts(filteredSituations) {
  let sujets = 0;
  let avis = 0;
  for (const situation of filteredSituations) {
    sujets += (situation.sujets || []).length;
    for (const sujet of situation.sujets || []) {
      avis += (sujet.avis || []).length;
    }
  }
  return { situations: filteredSituations.length, sujets, avis };
}

function problemVerdictStats(sujet) {
  const counts = { F: 0, S: 0, D: 0, HM: 0, PM: 0, SO: 0 };
  for (const avis of sujet?.avis || []) {
    const v = verdictLabel(getEffectiveAvisVerdict(avis.id));
    if (counts[v] !== undefined) counts[v] += 1;
  }
  return { counts };
}

function situationVerdictStats(situation) {
  const counts = { F: 0, S: 0, D: 0, HM: 0, PM: 0, SO: 0 };
  for (const sujet of situation?.sujets || []) {
    for (const avis of sujet?.avis || []) {
      const v = verdictLabel(getEffectiveAvisVerdict(avis.id));
      if (counts[v] !== undefined) counts[v] += 1;
    }
  }
  return { counts };
}

function buildVerdictBarHtml(counts, options = { legend: true }) {
  const order = ["D", "S", "F", "HM", "PM", "SO"];
  const total = order.reduce((sum, v) => sum + (Number(counts?.[v]) || 0), 0);
  if (!total) return "";

  const items = order
    .map((v) => ({ v, c: Number(counts?.[v]) || 0 }))
    .filter((x) => x.c > 0);

  const bar = `<div class="verdict-bar">${items.map(({ v, c }) => {
    const pct = (c * 100) / total;
    return `<span class="verdict-bar__seg verdict-bar__seg--${v.toLowerCase()}" style="width:${pct.toFixed(2)}%"></span>`;
  }).join("")}</div>`;

  if (options.legend === false) return bar;

  const legendHtml = items.map(({ v, c }) => {
    const pct = (c * 100) / total;
    return `
      <span class="verdict-legend__item">
        <span class="v-dot v-dot--${v.toLowerCase()}"></span>
        <span class="verdict-legend__count">${c} <b>${v}</b></span>
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

function problemsCountsHtml(situation) {
  const problems = situation?.sujets || [];
  const totalPb = problems.length;
  const closedPb = problems.filter((x) => String(getEffectiveSujetStatus(x.id) || "closed").toLowerCase() !== "open").length;
  return `<div class="subissues-counts subissues-counts--problems"><span>${closedPb} sur ${totalPb}</span></div>`;
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
    <div id="issuesTable" class="gh-issues emptyState">
      <h1><b>WELCOME</b><h2> to RAPSOBOT Proof Of Concept</h2>🎉</h1>
      <h3>Comment ça marche</h3>
      <span>Saisissez dans le menu de gauche la "vérité" de votre projet.</span><br>
      <span>Chargez votre document pdf.</span><br>
      <span>Et cliquez sur le bouton "Run analysis".</span><br><br>
      --- Please Enjoy Now 🎈 ---
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
  for (const situation of filteredSituations) {
    rows.push(renderSituationRow(situation));
    const showSujets = displayDepth === "sujets" || displayDepth === "avis" || store.situationsView.expandedSituations.has(situation.id);
    if (!showSujets) continue;
    for (const sujet of situation.sujets || []) {
      rows.push(renderSujetRow(sujet));
      const showAvis = displayDepth === "avis" || store.situationsView.expandedSujets.has(sujet.id);
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
      <div class="issues-table__body">${rows.join("")}</div>
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
  const events = [];
  const comments = Array.isArray(bucket?.comments) ? bucket.comments : [];
  const activities = Array.isArray(bucket?.activities) ? bucket.activities : [];

  if (selection.type === "situation") {
    const s = selection.item;
    events.push({
      ts: firstNonEmpty(store.situationsView?.rawResult?.updated_at, nowIso()),
      type: "SYSTEM",
      entity_type: "situation",
      entity_id: s.id,
      actor: "System",
      agent: firstNonEmpty(s.agent, "system"),
      message: `${firstNonEmpty(s.title, s.id)}\npriority=${firstNonEmpty(s.priority, "P3")}\nsujets=${(s.sujets || []).length}`
    });

    for (const a of activities) {
      if (a.entity_type === "situation" && a.entity_id === s.id) events.push(a);
    }
    for (const c of comments) {
      if (c.entity_type === "situation" && c.entity_id === s.id) events.push(c);
    }
  }

  if (selection.type === "sujet") {
    const p = selection.item;
    const s = getSituationBySujetId(p.id);

    if (s) {
      events.push({
        ts: firstNonEmpty(store.situationsView?.rawResult?.updated_at, nowIso()),
        type: "SYSTEM",
        entity_type: "situation",
        entity_id: s.id,
        actor: "System",
        agent: firstNonEmpty(s.agent, "system"),
        message: `${firstNonEmpty(s.title, s.id)}\npriority=${firstNonEmpty(s.priority, "P3")}\nsujets=${(s.sujets || []).length}`
      });
    }

    events.push({
      ts: firstNonEmpty(store.situationsView?.rawResult?.updated_at, nowIso()),
      type: "SYSTEM",
      entity_type: "sujet",
      entity_id: p.id,
      actor: "System",
      agent: firstNonEmpty(p.agent, "system"),
      message: `${firstNonEmpty(p.title, p.id)}\npriority=${firstNonEmpty(p.priority, "P3")}\navis=${(p.avis || []).length}`
    });

    for (const a of activities) {
      if ((a.entity_type === "sujet" && a.entity_id === p.id) || (s && a.entity_type === "situation" && a.entity_id === s.id && String(a.meta?.problem_id || "") === String(p.id))) {
        events.push(a);
      }
    }
    for (const c of comments) {
      if (c.entity_type === "sujet" && c.entity_id === p.id) events.push(c);
    }
  }

  if (selection.type === "avis") {
    const a = selection.item;
    const p = getSujetByAvisId(a.id);
    const s = getSituationByAvisId(a.id);

    if (s) {
      events.push({
        ts: firstNonEmpty(store.situationsView?.rawResult?.updated_at, nowIso()),
        type: "SYSTEM",
        entity_type: "situation",
        entity_id: s.id,
        actor: "System",
        agent: firstNonEmpty(s.agent, "system"),
        message: `${firstNonEmpty(s.title, s.id)}`
      });
    }

    if (p) {
      events.push({
        ts: firstNonEmpty(store.situationsView?.rawResult?.updated_at, nowIso()),
        type: "SYSTEM",
        entity_type: "sujet",
        entity_id: p.id,
        actor: "System",
        agent: firstNonEmpty(p.agent, "system"),
        message: `${firstNonEmpty(p.title, p.id)}`
      });
    }

    events.push({
      ts: firstNonEmpty(store.situationsView?.rawResult?.updated_at, nowIso()),
      type: "SYSTEM",
      entity_type: "avis",
      entity_id: a.id,
      actor: "System",
      agent: firstNonEmpty(a.agent, "system"),
      message: `${firstNonEmpty(a.title, a.id)}\nverdict=${firstNonEmpty(a.verdict, "-")}\nagent=${firstNonEmpty(a.agent, "system")}\n\n${firstNonEmpty(a.raw?.message, a.raw?.summary, "")}`
    });

    for (const act of activities) {
      if (p && act.entity_type === "sujet" && act.entity_id === p.id) {
        if (act.kind === "avis_verdict_changed") {
          if (String(act.meta?.avis_id || "") === String(a.id)) events.push(act);
        } else if (act.kind === "issue_closed" || act.kind === "issue_reopened") {
          if (String(act.meta?.problem_id || "") === String(p.id)) events.push(act);
        }
      }
    }
    for (const c of comments) {
      if (c.entity_type === "avis" && c.entity_id === a.id) events.push(c);
    }
  }

  return events.sort((x, y) => String(x.ts || "").localeCompare(String(y.ts || "")));
}

function renderThreadBlock() {
  const thread = getThreadForSelection();
  if (!thread.length) return "";

  const html = thread.map((e, idx) => {
    const type = String(e.type || "").toUpperCase();

    if (type === "COMMENT") {
      const agent = String(e.agent || "human").toLowerCase();
      const isHuman = agent === "human";
      const displayName = isHuman ? "Human" : firstNonEmpty(e.actor, e.agent, "Agent");
      const avatarHtml = isHuman
        ? `<div class="gh-avatar gh-avatar--human" aria-hidden="true">${humanAvatarSvg()}</div>`
        : `<div class="gh-avatar" aria-hidden="true"><span class="gh-avatar-initial">${escapeHtml(String(displayName).slice(0, 2).toUpperCase())}</span></div>`;
      return `
        <div class="human-action" data-thread-kind="comment" data-thread-idx="${idx}">
          ${avatarHtml}
          <div class="comment-general-block">
            <div class="gh-timeline-title mono">${escapeHtml(displayName)} · ${escapeHtml(fmtTs(e.ts))}</div>
            <div class="gh-comment-box"><div class="gh-comment-body">${mdToHtml(e.message || "")}</div></div>
          </div>
        </div>
      `;
    }

    if (type === "ACTIVITY") {
      const kind = String(e.kind || "").toLowerCase();
      let ico = `<span class="tl-ico tl-ico--muted" aria-hidden="true">•</span>`;
      let body = `${escapeHtml(firstNonEmpty(e.actor, "Human"))} a mis à jour l’élément`;
      if (kind === "avis_verdict_changed") {
        ico = timelineVerdictIcon(e.meta?.to || "");
        body = `${escapeHtml(firstNonEmpty(e.actor, "Human"))} changed verdict for avis ${escapeHtml(String(e.meta?.avis_id || ""))} → ${escapeHtml(String(e.meta?.to || ""))}`;
      } else if (kind === "issue_closed") {
        ico = `<span class="tl-ico-wrap tl-ico-closed" aria-hidden="true">${issueIcon("closed")}</span>`;
        body = `${escapeHtml(firstNonEmpty(e.actor, "Human"))} closed ${escapeHtml(String(e.meta?.problem_id || e.entity_id || "issue"))}`;
      } else if (kind === "issue_reopened") {
        ico = `<span class="tl-ico-wrap tl-ico-reopened" aria-hidden="true">${issueIcon("open")}</span>`;
        body = `${escapeHtml(firstNonEmpty(e.actor, "Human"))} reopened ${escapeHtml(String(e.meta?.problem_id || e.entity_id || "issue"))}`;
      }
      return `
        <div class="thread-item thread-item--activity" data-thread-kind="activity" data-thread-idx="${idx}">
          <div class="thread-badge thread-badge__subissues">${ico}</div>
          <div class="thread-wrapper">
            <div class="gh-timeline-title mono">${body} · ${escapeHtml(fmtTs(e.ts))}</div>
            ${e.message ? `<div class="thread-item__body">${mdToHtml(e.message)}</div>` : ``}
          </div>
        </div>
      `;
    }

    let badgeHtml = `<span class="thread-badge__subissues" aria-hidden="true"></span>`;
    const verdictMatch = String(e.message || "").match(/verdict\s*=\s*([A-Za-z]+)/i);
    if (String(e.entity_type || "") === "avis" && verdictMatch) badgeHtml = timelineVerdictIcon(verdictMatch[1]);
    return `
      <div class="thread-item" data-thread-kind="event" data-thread-idx="${idx}">
        <div class="thread-badge thread-badge__subissues">${badgeHtml}</div>
        <div class="thread-wrapper">
          <div class="gh-timeline-title mono">${escapeHtml(e.actor || "System")} attached this to ${escapeHtml(e.entity_type || "")} #${escapeHtml(e.entity_id || "")} · ${escapeHtml(fmtTs(e.ts || ""))}</div>
          <div class="thread-item__body">${mdToHtml(e.message || "")}</div>
        </div>
      </div>
    `;
  }).join("");

  return `<div class="gh-timeline-title mono">Discussion</div><div class="thread gh-thread">${html}</div>`;
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
        <div class="subissues-head-right">${rightMetaHtml || ""}</div>
      </div>
      <div class="subissues-body ${isOpen ? "" : "hidden"}">${bodyHtml || ""}</div>
    </div>
  `;
}

function renderCommentBox(selection) {
  ensureViewUiState();
  const item = selection?.item || null;
  if (!item) return "";

  const type = selection.type;
  const issueStatus = type === "avis" ? "open" : type === "sujet" ? getEffectiveSujetStatus(item.id) : getEffectiveSituationStatus(item.id);
  const isIssueOpen = String(issueStatus || "open").toLowerCase() === "open";
  const activeVerdict = String(store.situationsView.tempAvisVerdict || "F").toUpperCase();
  const previewMode = !!store.situationsView.commentPreviewMode;
  const helpMode = !!store.situationsView.helpMode;
  const verdicts = ["F", "S", "D", "HM", "PM", "SO"];
  const verdictSwitch = `<div class="verdict-switch" role="group" aria-label="Verdict">${verdicts.map((v) => `<button class="verdict-switch__btn ${v === activeVerdict ? "is-active" : ""}" data-action="set-verdict" data-verdict="${v}" type="button">${v}</button>`).join("")}</div>`;
  const actionsRight = type === "avis"
    ? `${verdictSwitch}<button class="gh-btn" data-action="avis-validate" type="button">Validate</button><button class="gh-btn gh-btn--comment" data-action="add-comment" type="button">Comment</button>`
    : `${isIssueOpen ? `<button class="gh-btn gh-btn--issue-action" data-action="issue-close" type="button"><span class="gh-btn__label">Close</span></button>` : `<button class="gh-btn gh-btn--issue-action" data-action="issue-reopen" type="button"><span class="gh-btn__label">Reopen issue</span></button>`}<button class="gh-btn gh-btn--comment" data-action="add-comment" type="button">Comment</button>`;

  return `
    <div class="human-action">
      <div class="gh-avatar gh-avatar--human" aria-hidden="true">${humanAvatarSvg()}</div>
      <div class="comment-general-block">
        <div class="gh-timeline-title mono">Add a comment</div>
        <div class="comment-box gh-comment-boxwrap ${helpMode ? "gh-comment-box--help" : ""}">
          <div class="comment-tabs ${helpMode ? "gh-comment-header--help" : ""}" role="tablist" aria-label="Comment tabs">
            <button class="comment-tab ${!previewMode ? "is-active" : ""}" role="tab" aria-selected="${!previewMode ? "true" : "false"}" data-action="tab-write" type="button">Write</button>
            <button class="comment-tab ${previewMode ? "is-active" : ""}" role="tab" aria-selected="${previewMode ? "true" : "false"}" data-action="tab-preview" type="button">Preview</button>
          </div>
          <div class="comment-editor ${previewMode ? "hidden" : ""}">
            <textarea id="humanCommentBox" class="textarea" placeholder="Réponse humaine (Markdown) — mentionne @rapso pour demander l’avis de l’agent." data-placeholder-default="Réponse humaine (Markdown) — mentionne @rapso pour demander l’avis de l’agent."></textarea>
          </div>
          <div class="comment-editor ${previewMode ? "" : "hidden"}">
            <div id="humanCommentPreview" class="comment-preview"></div>
          </div>
        </div>
        <div class="actions-row actions-row--details" style="margin-top:10px;">
          <div class="rapso-mention-hint"><span>Astuce : mentionne <span class="mono">@rapso</span> dans ton commentaire pour solliciter une réponse de RAPSOBOT.</span></div>
          <div class="actions-row__right" style="display:flex; align-items:center; gap:8px; justify-content:flex-end; flex:0 0 auto;">
            <button class="gh-btn gh-btn--help-mode ${helpMode ? "is-on" : ""}" data-action="toggle-help" type="button">Help</button>
            ${actionsRight}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDetailedMetaForSelection(selection) {
  const item = selection?.item;
  if (!item) return "";

  const common = [
    renderMetaItem("ID", `<span class="mono">${escapeHtml(item.id || "—")}</span>`),
    renderMetaItem("Titre", escapeHtml(firstNonEmpty(item.title, "—"))),
    renderMetaItem("Priorité", priorityBadge(item.priority || "P3")),
    renderMetaItem("Agent", `<span class="mono">${escapeHtml(firstNonEmpty(item.agent, "system"))}</span>`)
  ];

  if (selection.type === "avis") {
    common.push(renderMetaItem("Verdict", verdictPill(getEffectiveAvisVerdict(item.id))));
    common.push(renderMetaItem("Sujet", `<span class="mono">${escapeHtml(firstNonEmpty(getSujetByAvisId(item.id)?.id, "—"))}</span>`));
    common.push(renderMetaItem("Situation", `<span class="mono">${escapeHtml(firstNonEmpty(getSituationByAvisId(item.id)?.id, "—"))}</span>`));
  } else if (selection.type === "sujet") {
    common.push(renderMetaItem("Status", statePill(getEffectiveSujetStatus(item.id))));
    common.push(renderMetaItem("Situation", `<span class="mono">${escapeHtml(firstNonEmpty(getSituationBySujetId(item.id)?.id, "—"))}</span>`));
    common.push(renderMetaItem("Avis", `<span>${(item.avis || []).length}</span>`));
  } else {
    common.push(renderMetaItem("Status", statePill(getEffectiveSituationStatus(item.id))));
    common.push(renderMetaItem("Sujets", `<span>${(item.sujets || []).length}</span>`));
  }

  if (item.raw && typeof item.raw === "object") {
    for (const [key, value] of Object.entries(item.raw)) {
      if (["summary", "message", "comment", "reasoning", "analysis"].includes(key)) continue;
      common.push(renderMetaItem(key, `<span class="mono">${escapeHtml(typeof value === "string" ? value : JSON.stringify(value))}</span>`));
    }
  }

  return common.join("");
}

function renderSubIssuesForSujet(sujet) {
  const avis = sujet?.avis || [];
  const bodyHtml = `
    <div class="issues-table subissues-table">
      <div class="issues-table__body">
        ${avis.map((avis) => `
          <div class="issue-row issue-row--avis click ${store.situationsView.selectedAvisId === avis.id ? "subissue-row--selected" : ""}" data-avis-id="${escapeHtml(avis.id)}">
            <div class="cell cell-theme cell-theme--full lvl0">
              <span class="chev chev--spacer"></span>
              <span class="v-dot v-dot--${verdictLabel(getEffectiveAvisVerdict(avis.id)).toLowerCase()}"></span>
              <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
            </div>
          </div>
        `).join("") || `<div class="emptyState">Aucun avis.</div>`}
      </div>
    </div>
  `;

  return renderSubIssuesPanel({
    title: "Avis rattachés",
    leftMetaHtml: `<div class="subissues-counts subissues-counts--total"><span class="mono">${avis.length}</span></div>`,
    rightMetaHtml: buildVerdictBarHtml(problemVerdictStats(sujet).counts),
    bodyHtml
  });
}

function renderSubIssuesForSituation(situation) {
  const sujets = situation?.sujets || [];
  const rows = [];

  for (const sujet of sujets) {
    const open = store.situationsView.rightExpandedSujets.has(sujet.id);
    const hasAvis = (sujet.avis || []).length > 0;
    rows.push(`
      <div class="issue-row issue-row--pb click ${store.situationsView.selectedSujetId === sujet.id && !store.situationsView.selectedAvisId ? "subissue-row--selected" : ""}">
        <div class="cell cell-theme cell-theme--full lvl0">
          <span class="js-sub-right-toggle-sujet" data-sujet-id="${escapeHtml(sujet.id)}">${chevron(open, hasAvis)}</span>
          ${issueIcon(getEffectiveSujetStatus(sujet.id))}
          <span class="theme-text theme-text--pb js-sub-right-select-sujet" data-sujet-id="${escapeHtml(sujet.id)}">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</span>
          <span class="subissues-inline-count mono">${(sujet.avis || []).length} avis</span>
        </div>
      </div>
    `);

    if (open) {
      for (const avis of sujet.avis || []) {
        const v = verdictLabel(getEffectiveAvisVerdict(avis.id)).toLowerCase();
        rows.push(`
          <div class="issue-row issue-row--avis click js-row-avis ${store.situationsView.selectedAvisId === avis.id ? "subissue-row--selected" : ""}" data-avis-id="${escapeHtml(avis.id)}">
            <div class="cell cell-theme cell-theme--full lvl1">
              <span class="chev chev--spacer"></span>
              <span class="v-dot v-dot--${v}"></span>
              <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
            </div>
          </div>
        `);
      }
    }
  }

  const bodyHtml = `
    <div class="issues-table subissues-table">
      <div class="issues-table__body">
        ${rows.join("") || `<div class="emptyState">Aucun sujet.</div>`}
      </div>
    </div>
  `;

  return renderSubIssuesPanel({
    title: "Sujets rattachés",
    leftMetaHtml: problemsCountsHtml(situation),
    rightMetaHtml: buildVerdictBarHtml(situationVerdictStats(situation).counts),
    bodyHtml
  });
}

function renderDetailsTitleHtml(selection) {
  if (!selection) {
    return `
      <div class="details-head">
        <div class="details-head-left">
          <div class="details-kicker mono">DÉTAILS</div>
          <div class="gh-panel__title">Sélectionner un élément</div>
        </div>
        <div class="details-head-right">
          <div class="details-meta mono" id="detailsMeta">—</div>
          <button id="detailsExpand" class="icon-btn icon-btn--sm" aria-label="Agrandir" title="Agrandir">⤢</button>
        </div>
      </div>
    `;
  }

  const item = selection.item;
  const isAvis = selection.type === "avis";
  const titleTextHtml = escapeHtml(firstNonEmpty(item.title, item.id, "Détail"));
  const idHtml = escapeHtml(item.id || "");
  const stateHtml = selection.type === "avis" ? statePill("open") : statePill(selection.type === "sujet" ? getEffectiveSujetStatus(item.id) : getEffectiveSituationStatus(item.id));
  const badgeHtml = isAvis ? verdictPill(getEffectiveAvisVerdict(item.id)) : "";
  const extraHtml = selection.type === "avis"
    ? `<span class="mono">${escapeHtml(firstNonEmpty(item.agent, "system"))}</span>`
    : selection.type === "sujet"
      ? buildVerdictBarHtml(problemVerdictStats(item).counts, { legend: false })
      : `${problemsCountsHtml(item)}${buildVerdictBarHtml(situationVerdictStats(item).counts, { legend: false })}`;

  return `
    <div class="details-head">
      <div class="details-head-left">
        <div class="details-kicker mono">DÉTAILS</div>
        <div class="gh-panel__title">
          <div class="details-title-wrap details-title--expanded">
            <div class="details-title-row details-title-row--main">
              <div class="details-title-maincol">
                <div class="details-title-topline">
                  ${stateHtml}
                  <span class="details-title-text">${isAvis ? `<span class="mono">#${idHtml}</span> ${titleTextHtml}` : titleTextHtml}</span>
                </div>
                <div class="details-title-bottomline">
                  ${!isAvis ? `<span class="details-title-id mono">${idHtml}</span>` : ``}
                  ${badgeHtml}
                  ${extraHtml}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="details-head-right">
        <div class="details-meta mono" id="detailsMeta">${idHtml || "—"}</div>
        <button id="detailsExpand" class="icon-btn icon-btn--sm" aria-label="Agrandir" title="Agrandir">⤢</button>
      </div>
    </div>
  `;
}

function renderDetailsBody(selection) {
  if (!selection) {
    return `<div class="emptyState">Sélectionne une situation / un sujet / un avis pour afficher les détails.</div>`;
  }

  const item = selection.item;
  let descCard = "";
  let subIssuesHtml = "";

  if (selection.type === "avis") {
    descCard = renderCommentCard(firstNonEmpty(item.agent, "system"), getAvisSummary(item), "A");
  } else if (selection.type === "sujet") {
    descCard = renderCommentCard(firstNonEmpty(item.agent, "system"), getSujetSummary(item), "P");
    subIssuesHtml = renderSubIssuesForSujet(item);
  } else {
    descCard = renderCommentCard(firstNonEmpty(item.agent, "system"), getSituationSummary(item), "S");
    subIssuesHtml = renderSubIssuesForSituation(item);
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

function renderDetailsHtml() {
  const selection = getActiveSelection();
  return {
    titleHtml: renderDetailsTitleHtml(selection),
    bodyHtml: renderDetailsBody(selection),
    modalTitle: selection ? firstNonEmpty(selection.item.title, selection.item.id, "Détail") : "Sélectionner un élément",
    modalMeta: selection ? firstNonEmpty(selection.item.id, "") : "—"
  };
}

/* =========================================================
   Modal / rerender / selection
========================================================= */

function updateDetailsModal() {
  const modal = document.getElementById("detailsModal");
  const title = document.getElementById("detailsTitleModal");
  const meta = document.getElementById("detailsMetaModal");
  const body = document.getElementById("detailsBodyModal");
  if (!modal || !title || !meta || !body) return;

  const details = renderDetailsHtml();
  title.innerHTML = details.titleHtml;
  meta.textContent = details.modalMeta;
  body.innerHTML = details.bodyHtml;

  if (store.situationsView.detailsModalOpen) modal.classList.remove("hidden");
  else modal.classList.add("hidden");

  wireDetailsInteractive(body);
}

function openDetailsModal() {
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

  const details = renderDetailsHtml();
  if (detailsTitleHost) detailsTitleHost.innerHTML = details.titleHtml;
  if (detailsHost) detailsHost.innerHTML = details.bodyHtml;

  wireDetailsInteractive(detailsHost);
  updateDetailsModal();
  updateDrilldownPanel();
  renderAssistantOverlay();
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

function currentDecisionTarget() {
  const sel = getActiveSelection();
  if (!sel) return null;
  return { type: sel.type, id: sel.item.id, item: sel.item };
}

function applyCommentAction(root) {
  const target = currentDecisionTarget();
  if (!target) return;

  const ta = root.querySelector("#humanCommentBox");
  if (!ta) return;

  const message = String(ta.value || "").trim();
  if (!message) return;

  if (store.situationsView.helpMode) {
    addComment(target.type, target.id, `[HELP]\n${message}`, { actor: "Human", agent: "human" });
  } else {
    addComment(target.type, target.id, message, { actor: "Human", agent: "human" });

    if (/@rapso\b/i.test(message)) {
      addComment(
        target.type,
        target.id,
        `Réponse automatique de RAPSOBOT : prise en compte de la demande « ${message.replace(/@rapso/gi, "").trim() || "analyse demandée"} ».`,
        { actor: "RAPSOBOT", agent: "specialist_ps" }
      );
    }
  }

  ta.value = "";
  store.situationsView.commentPreviewMode = false;
  rerenderPanels();
}

function applyValidateAvis() {
  const target = currentDecisionTarget();
  if (!target || target.type !== "avis") return;

  const avisId = target.id;
  const verdict = String(store.situationsView.tempAvisVerdict || "F").toUpperCase();
  setDecision("avis", avisId, `VALIDATED_${verdict}`, "");

  const sujet = getSujetByAvisId(avisId);
  if (sujet) {
    addActivity("sujet", sujet.id, "avis_verdict_changed", "", { avis_id: avisId, to: verdict }, { actor: "Human", agent: "human" });
  }

  rerenderPanels();
}

function applyIssueCloseOrReopen(nextStatus) {
  const target = currentDecisionTarget();
  if (!target || target.type === "avis") return;

  if (target.type === "sujet") {
    setDecision("sujet", target.id, nextStatus === "closed" ? "CLOSED" : "REOPENED", "");
    const situation = getSituationBySujetId(target.id);
    if (situation) {
      addActivity(
        "situation",
        situation.id,
        nextStatus === "closed" ? "issue_closed" : "issue_reopened",
        "",
        { problem_id: target.id },
        { actor: "Human", agent: "human" }
      );
    }
  } else {
    setDecision("situation", target.id, nextStatus === "closed" ? "CLOSED" : "REOPENED", "");
    addActivity(
      "situation",
      target.id,
      nextStatus === "closed" ? "issue_closed" : "issue_reopened",
      "",
      {},
      { actor: "Human", agent: "human" }
    );
  }

  rerenderPanels();
}

function syncCommentPreview(root) {
  const ta = root.querySelector("#humanCommentBox");
  const preview = root.querySelector("#humanCommentPreview");
  if (!preview) return;
  preview.innerHTML = mdToHtml(ta?.value || "");
}

function wireDetailsInteractive(root) {
  if (!root) return;

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

  root.querySelectorAll(".js-sub-right-toggle-sujet").forEach((btn) => {
    btn.onclick = (ev) => {
      ev.stopPropagation();
      const sujetId = String(btn.dataset.sujetId || "");
      if (!sujetId) return;
      if (store.situationsView.rightExpandedSujets.has(sujetId)) store.situationsView.rightExpandedSujets.delete(sujetId);
      else store.situationsView.rightExpandedSujets.add(sujetId);
      rerenderPanels();
    };
  });

  root.querySelectorAll(".js-sub-right-select-sujet").forEach((btn) => {
    btn.onclick = () => {
      const sujetId = String(btn.dataset.sujetId || "");
      if (sujetId) selectSujet(sujetId);
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
    btn.onclick = () => applyCommentAction(root);
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
    btn.onclick = () => applyValidateAvis();
  });

  root.querySelectorAll("[data-action='issue-close']").forEach((btn) => {
    btn.onclick = () => applyIssueCloseOrReopen("closed");
  });

  root.querySelectorAll("[data-action='issue-reopen']").forEach((btn) => {
    btn.onclick = () => applyIssueCloseOrReopen("open");
  });
}

function ensureAssistantOverlayDom() {
  if (document.getElementById("assist-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "assist-overlay";
  overlay.className = "assist-overlay";
  overlay.innerHTML = `
    <div class="assist-panel">
      <div class="assist-panel__head">
        <div class="assist-head__left">
          <img class="assist-head__logo" src="logo.png" alt="RAPSOBOT" />
          <div class="assist-head__title">
            <div class="assist-head__name">RAPSOBOT</div>
            <div class="assist-head__sub">Assistant privé projet</div>
          </div>
        </div>
        <button class="assist-close" id="assist-close" type="button" aria-label="Fermer">✕</button>
      </div>
      <div class="assist-panel__body">
        <div class="assist-thread" id="assist-thread"><div class="assist-empty"><div class="assist-empty__title">Aucun échange pour l’instant</div><div class="assist-empty__sub">Assistant privé prêt.</div></div></div>
        <div class="assist-compose">
          <textarea id="assist-input" class="assist-input" placeholder="Décris l’action ou la question…"></textarea>
          <div class="assist-compose__actions">
            <button id="assist-help-toggle" class="gh-btn gh-btn--help-mode" type="button">Help</button>
            <button id="assist-send" class="assist-send" type="button">➤</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) closeAssistantOverlay(); });
  overlay.querySelector("#assist-close")?.addEventListener("click", closeAssistantOverlay);
}

function openAssistantOverlay() {
  ensureAssistantOverlayDom();
  document.getElementById("assist-overlay")?.classList.add("is-open");
}

function closeAssistantOverlay() {
  document.getElementById("assist-overlay")?.classList.remove("is-open");
}

function renderAssistantOverlay() {
  ensureAssistantOverlayDom();
}

function ensureDrilldownDom() {
  if (document.getElementById("drilldownPanel")) return;
  const panel = document.createElement("div");
  panel.id = "drilldownPanel";
  panel.className = "drilldown hidden";
  panel.innerHTML = `
    <div class="drilldown__inner gh-panel gh-panel--details">
      <div class="drilldown__head gh-panel__head gh-panel__head--tight details-head--expanded">
        <div class="details-head" style="width:100%;">
          <div class="details-head-left" style="min-width:0;"><div class="gh-panel__title" id="drilldownTitle">—</div></div>
          <div class="details-head-right"><button class="icon-btn icon-btn--sm" id="drilldownClose" aria-label="Fermer">✕</button></div>
        </div>
      </div>
      <div class="drilldown__body details-body" id="drilldownBody"></div>
    </div>
  `;
  document.body.appendChild(panel);
  panel.addEventListener("click", (event) => { if (event.target === panel) closeDrilldown(); });
  panel.querySelector("#drilldownClose")?.addEventListener("click", closeDrilldown);
}

function openDrilldown() {
  ensureDrilldownDom();
  const panel = document.getElementById("drilldownPanel");
  if (!panel) return;
  panel.classList.remove("hidden");
  document.body.classList.add("drilldown-open");
  updateDrilldownPanel();
}

function closeDrilldown() {
  const panel = document.getElementById("drilldownPanel");
  if (panel) panel.classList.add("hidden");
  document.body.classList.remove("drilldown-open");
}

function updateDrilldownPanel() {
  const panel = document.getElementById("drilldownPanel");
  if (!panel || panel.classList.contains("hidden")) return;
  const details = renderDetailsHtml();
  const title = panel.querySelector("#drilldownTitle");
  const body = panel.querySelector("#drilldownBody");
  if (title) title.innerHTML = details.titleHtml;
  if (body) {
    body.innerHTML = details.bodyHtml;
    wireDetailsInteractive(body);
  }
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
    if (event.key === "Escape" && store.situationsView.detailsModalOpen) closeDetailsModal();
    if (event.key === "Escape") closeDrilldown();
    if (event.key === "Escape") closeAssistantOverlay();
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

function bindDetailsScroll(root) {
  const detailsBody = root.querySelector("#situationsDetailsHost");
  const detailsPanel = root.querySelector(".gh-panel--details");
  if (!detailsBody || !detailsPanel || detailsBody.dataset.scrollBound === "1") return;
  detailsBody.dataset.scrollBound = "1";

  const syncCompactState = () => {
    detailsPanel.classList.toggle("details-scrolled", detailsBody.scrollTop > 12);
  };

  detailsBody.addEventListener("scroll", syncCompactState, { passive: true });
  syncCompactState();
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

  if (!document.body.dataset.rapsoBrandBound) {
    document.body.dataset.rapsoBrandBound = "1";
    document.addEventListener("click", (event) => {
      const hit = event.target?.closest?.(".gh-brand__logo");
      if (!hit) return;
      event.preventDefault();
      openAssistantOverlay();
    });
  }
}

/* =========================================================
   Public render
========================================================= */

export function renderProjectSituations(root) {
  ensureSituationsLegacyDomStyle();
  ensureViewUiState();
  ensureAssistantOverlayDom();
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
            <h2 class="gh-panel__title">Results</h2>
            <div class="gh-filters gh-filters--inline">
              <label class="gh-filter gh-filter--inline"><span>Verdict</span><select id="verdictFilter" class="gh-input gh-input--sm"><option value="ALL">All</option><option value="F">F</option><option value="D">D</option><option value="S">S</option><option value="HM">HM</option><option value="PM">PM</option><option value="SO">SO</option><option value="OK">OK</option><option value="KO">KO</option><option value="WARNING">WARNING</option></select></label>
              <label class="gh-filter gh-filter--inline"><span>Search</span><input id="situationsSearch" class="gh-input gh-input--sm" type="text" placeholder="topic / EC8 / mot-clé…" /></label>
              <label class="gh-filter gh-filter--inline"><span>Affichage</span><select id="displayDepth" class="gh-input gh-input--sm"><option value="situations">Situations</option><option value="sujets">Sujets</option><option value="avis">Avis</option></select></label>
            </div>
          </div>
          <div class="results-bar__right"><div class="issues-totals mono" id="situationsHeaderCounts">—</div></div>
        </div>
      </div>
      <div id="situationsTableHost"></div>
    </section>

    <section class="gh-panel gh-panel--details" aria-label="Details">
      <div class="gh-panel__head gh-panel__head--tight" id="situationsDetailsTitle"></div>
      <div class="details-body" id="situationsDetailsHost"><div class="emptyState">Sélectionne une situation / un sujet / un avis pour afficher les détails.</div></div>
    </section>

    <div id="detailsModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Détails">
      <div class="modal__inner">
        <div class="modal__head details-head--expanded">
          <div class="modal__head-left"><div class="details-kicker mono">DÉTAILS</div><div class="modal__title" id="detailsTitleModal">Sélectionner un élément</div></div>
          <div class="modal__head-right"><div class="details-meta mono" id="detailsMetaModal">—</div><button id="detailsClose" class="icon-btn icon-btn--sm" aria-label="Fermer" title="Fermer">✕</button></div>
        </div>
        <div class="modal__body" id="detailsBodyModal"></div>
      </div>
    </div>
  `;

  rerenderPanels();
  bindSituationsEvents(root);
  bindModalEvents();
  bindDetailsScroll(root);
  initRightSplitter(root);
  updateDetailsModal();
}
