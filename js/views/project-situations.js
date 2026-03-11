import { store } from "../store.js";

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
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "";
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

  if (["F", "D", "S", "HM", "PM", "SO"].includes(safe)) {
    return `verdict-badge verdict-${safe}`;
  }
  if (safe === "OK") return "verdict-badge verdict-F";
  if (safe === "KO") return "verdict-badge verdict-D";
  if (safe === "WARNING") return "verdict-badge verdict-S";
  return "verdict-badge";
}

function verdictPill(verdict) {
  return `<span class="${verdictBadgeClass(verdict)}">${escapeHtml(verdictLabel(verdict))}</span>`;
}

function priorityBadge(priority = "P3") {
  const p = String(priority || "P3").toUpperCase();
  const cls =
    p === "P1"
      ? "badge badge--p1"
      : p === "P2"
        ? "badge badge--p2"
        : "badge badge--p3";
  return `<span class="${cls}">${escapeHtml(p)}</span>`;
}

function statePill(status = "open") {
  const isOpen = String(status || "open").toLowerCase() !== "closed";
  return `<span class="gh-state ${isOpen ? "gh-state--open" : "gh-state--closed"}">${isOpen ? "Open" : "Closed"}</span>`;
}

function matchSearch(parts, query) {
  if (!query) return true;
  const haystack = parts
    .filter((part) => part !== undefined && part !== null)
    .map((part) => String(part).toLowerCase())
    .join(" ");
  return haystack.includes(query);
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
  return normalizeVerdict(avis.verdict) === verdictFilter;
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
      if ((sujet.avis || []).some((avis) => normalizeVerdict(avis.verdict) === verdictFilter)) return true;
    }

    for (const avis of sujet.avis || []) {
      if (avisMatchesFilters(avis, query, verdictFilter)) return true;
    }
  }

  return situationTextMatch;
}

function getFilteredSituations() {
  const verdictFilter = String(store.situationsView.verdictFilter || "ALL").toUpperCase();
  const query = String(store.situationsView.search || "").trim().toLowerCase();
  const situations = store.situationsView.data || [];
  return situations.filter((situation) => situationMatchesFilters(situation, query, verdictFilter));
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
    if ((situation.sujets || []).some((sujet) => sujet.id === problemId)) {
      return situation;
    }
  }
  return null;
}

function getSituationByAvisId(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of situation.sujets || []) {
      if ((sujet.avis || []).some((avis) => avis.id === avisId)) {
        return situation;
      }
    }
  }
  return null;
}

function getSujetByAvisId(avisId) {
  for (const situation of store.situationsView.data || []) {
    for (const sujet of situation.sujets || []) {
      if ((sujet.avis || []).some((avis) => avis.id === avisId)) {
        return sujet;
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
  const firstSituation = (store.situationsView.data || [])[0] || null;
  return firstSituation ? { type: "situation", item: firstSituation } : null;
}

function problemVerdictStats(problem) {
  const avis = problem?.avis || [];
  let d = 0;
  let s = 0;
  for (const item of avis) {
    const verdict = normalizeVerdict(item.verdict);
    if (["KO", "WARNING", "D", "DEFAVORABLE"].includes(verdict)) d += 1;
    else s += 1;
  }
  const total = Math.max(avis.length, 1);
  return {
    d,
    s,
    total: avis.length,
    dPct: Math.round((d / total) * 100),
    sPct: Math.round((s / total) * 100)
  };
}

function situationVerdictStats(situation) {
  let d = 0;
  let s = 0;
  let total = 0;
  for (const sujet of situation?.sujets || []) {
    const stats = problemVerdictStats(sujet);
    d += stats.d;
    s += stats.s;
    total += stats.total;
  }
  const safeTotal = Math.max(total, 1);
  return {
    d,
    s,
    total,
    dPct: Math.round((d / safeTotal) * 100),
    sPct: Math.round((s / safeTotal) * 100)
  };
}

function verdictBar(stats) {
  return `
    <div class="subissues-counts subissues-counts--verdicts">
      <div class="verdict-legend">
        <span><span class="dot dot--red"></span>${stats.d} D (${stats.dPct}%)</span>
        <span><span class="dot dot--yellow"></span>${stats.s} S (${stats.sPct}%)</span>
      </div>
      <div class="verdict-bar">
        <span class="verdict-bar__red" style="width:${stats.dPct}%"></span>
        <span class="verdict-bar__yellow" style="width:${stats.sPct}%"></span>
      </div>
    </div>
  `;
}

function chevron(isOpen, isVisible = true) {
  if (!isVisible) return `<span class="chev chev--spacer"></span>`;
  return `<span class="chev">${isOpen ? "▾" : "▸"}</span>`;
}

function rowSelectedClass(kind, id) {
  if (kind === "situation" && store.situationsView.selectedSituationId === id && !store.situationsView.selectedSujetId && !store.situationsView.selectedAvisId) return " selected subissue-row--selected";
  if (kind === "sujet" && store.situationsView.selectedSujetId === id && !store.situationsView.selectedAvisId) return " selected subissue-row--selected";
  if (kind === "avis" && store.situationsView.selectedAvisId === id) return " selected subissue-row--selected";
  return "";
}

function renderSituationRow(situation) {
  const expanded = store.situationsView.expandedSituations.has(situation.id);
  const hasSujets = (situation.sujets || []).length > 0;
  return `
    <div class="issue-row issue-row--sit click js-row-situation${rowSelectedClass("situation", situation.id)}" data-situation-id="${escapeHtml(situation.id)}">
      <div class="cell cell-theme lvl0">
        <span class="js-toggle-situation" data-situation-id="${escapeHtml(situation.id)}">${chevron(expanded, hasSujets)}</span>
        ${issueIcon(situation.status)}
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
  return `
    <div class="issue-row issue-row--pb click js-row-sujet${rowSelectedClass("sujet", sujet.id)}" data-sujet-id="${escapeHtml(sujet.id)}">
      <div class="cell cell-theme lvl1">
        <span class="js-toggle-sujet" data-sujet-id="${escapeHtml(sujet.id)}">${chevron(expanded, hasAvis)}</span>
        ${issueIcon(sujet.status)}
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
  return `
    <div class="issue-row issue-row--avis click js-row-avis${rowSelectedClass("avis", avis.id)}" data-avis-id="${escapeHtml(avis.id)}">
      <div class="cell cell-theme lvl2">
        <span class="chev chev--spacer"></span>
        <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
      </div>
      <div class="cell cell-verdict">${verdictPill(avis.verdict)}</div>
      <div class="cell cell-prio"></div>
      <div class="cell cell-agent mono-small">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</div>
      <div class="cell cell-id mono">${escapeHtml(avis.id)}</div>
    </div>
  `;
}

function renderFlatSujetRow(sujet, situationId) {
  const parentLabel = situationId ? `<span class="mono subissues-inline-count">${escapeHtml(situationId)}</span>` : "";
  return `
    <div class="issue-row issue-row--pb click js-row-sujet${rowSelectedClass("sujet", sujet.id)}" data-sujet-id="${escapeHtml(sujet.id)}">
      <div class="cell cell-theme lvl0">
        <span class="chev chev--spacer"></span>
        ${issueIcon(sujet.status)}
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
  const lineage = [situationId, sujetId].filter(Boolean).join(" · ");
  return `
    <div class="issue-row issue-row--avis click js-row-avis${rowSelectedClass("avis", avis.id)}" data-avis-id="${escapeHtml(avis.id)}">
      <div class="cell cell-theme lvl0">
        <span class="chev chev--spacer"></span>
        ${issueIcon(avis.status)}
        <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
        ${lineage ? `<span class="mono subissues-inline-count">${escapeHtml(lineage)}</span>` : ""}
      </div>
      <div class="cell cell-verdict">${verdictPill(avis.verdict)}</div>
      <div class="cell cell-prio"></div>
      <div class="cell cell-agent mono-small">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</div>
      <div class="cell cell-id mono">${escapeHtml(avis.id)}</div>
    </div>
  `;
}

function renderWelcomeHtml() {
  return `
    <div id="issuesTable" class="gh-issues emptyState">
      <h1><b>WELCOME</b><h2> to RAPSOBOT Prouf Of Concept</h2>🎉</h1>
      <h3>Comment ça marche</h3>
      <span>Saississez dans le menu de gauche la "vérité" de votre projet : les données d'entrée validées par humain comme étant vraies... sinon comment distinguer le vrai du faux dans un document !</span><br>
      <span>Chargez votre document pdf</span><br>
      <span>Et cliquez sur le bouton "Run anlysis"</span><br>
      <span>... et soyez patient : les analyses peuvent prendre entre 1 à 6 minutes selon la taille du pdf</span><br><br>
      <h3>Limites du PoC</h3>
      <span>Le seul Référentiel pris en charge est l'<b>Eurocode 8</b> avec son Annexe Nationale <b>Française</b> et l'Arrêté du 22 octobre 2010.</span><br>
      <span>Seules les <b>Notes de Calcul</b> au format pdf sont prises en charge (pas de plans, pas de modèle 3D...</span><br>
      <span>Et cliquez sur le bouton "Run anlysis"</span><br><br>
      --- Please Envoy Now 🎈 ---
    </div>
  `;
}

function renderTableHtml(filteredSituations) {
  const displayDepth = String(store.situationsView.displayDepth || "situations").toLowerCase();

  if (!(store.situationsView.data || []).length) {
    return renderWelcomeHtml();
  }

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

  if (displayDepth === "sujets") {
    for (const situation of filteredSituations) {
      for (const sujet of situation.sujets || []) {
        rows.push(renderFlatSujetRow(sujet, situation.id));
      }
    }
  } else if (displayDepth === "avis") {
    for (const situation of filteredSituations) {
      for (const sujet of situation.sujets || []) {
        for (const avis of sujet.avis || []) {
          rows.push(renderFlatAvisRow(avis, sujet.id, situation.id));
        }
      }
    }
  } else {
    for (const situation of filteredSituations) {
      rows.push(renderSituationRow(situation));
      if (store.situationsView.expandedSituations.has(situation.id)) {
        for (const sujet of situation.sujets || []) {
          rows.push(renderSujetRow(sujet));
          if (store.situationsView.expandedSujets.has(sujet.id)) {
            for (const avis of sujet.avis || []) {
              rows.push(renderAvisRow(avis));
            }
          }
        }
      }
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
      <div class="gh-avatar" aria-hidden="true">
        <span class="gh-avatar-initial">${escapeHtml(initial)}</span>
      </div>
      <div class="gh-comment-box">
        <div class="gh-comment-header">
          <div class="gh-comment-author mono">${escapeHtml(agentName)}</div>
        </div>
        <div class="gh-comment-body">${escapeHtml(bodyText).replace(/\n/g, "<br>")}</div>
      </div>
    </div>
  `;
}

function renderThreadBlock(selection) {
  const item = selection?.item || {};
  const actor = escapeHtml(firstNonEmpty(item.agent, "system"));
  const message =
    selection?.type === "avis"
      ? getAvisSummary(item)
      : selection?.type === "sujet"
        ? getSujetSummary(item)
        : getSituationSummary(item);

  return `
    <div class="gh-timeline-title mono" style="display:none">Discussion</div>
    <div class="thread gh-thread">
      <div class="thread-item" data-thread-kind="event" data-thread-idx="0">
        <div class="thread-badge__subissue"></div>
        <div class="thread-wrapper">
          <div class="thread-item__head">
            <div class="mono">
              <span>${actor}</span>
              <span> attached this to </span>
              <span>${escapeHtml(selection?.type || "item")} n° ${escapeHtml(item.id || "—")}</span>
            </div>
          </div>
          <div class="thread-item__body">${escapeHtml(message)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderHumanActionBlock() {
  return `
    <div class="human-action">
      <div class="comment-general-block">
        <div class="gh-timeline-title mono">Add a comment</div>
        <div class="comment-box gh-comment-boxwrap">
          <div class="comment-editor">
            <textarea class="textarea" placeholder="Réponse humaine (Markdown) — mentionne @rapso pour demander l’avis de l’agent." disabled></textarea>
          </div>
        </div>
        <div class="actions-row actions-row--details" style="margin-top:10px;">
          <button class="gh-btn gh-btn--help-mode" type="button" disabled>Help</button>
          <button class="gh-btn gh-btn--comment is-disabled" type="button" disabled>Comment</button>
        </div>
      </div>
    </div>
  `;
}

function renderSubIssuesPanel({ title, count, rightMetaHtml, bodyHtml }) {
  return `
    <div class="details-subissues">
      <div class="subissues-head">
        <div class="subissues-head-left">
          <span class="chev">▾</span>
          <span class="subissues-title">${escapeHtml(title)}</span>
          <span class="subissues-count mono">${escapeHtml(count)}</span>
        </div>
        <div class="subissues-head-right">
          ${rightMetaHtml || ""}
        </div>
      </div>
      <div class="subissues-body">
        ${bodyHtml || ""}
      </div>
    </div>
  `;
}

function renderDetailsTitleHtml(selection) {
  if (!selection) {
    return `
      <div class="details-head">
        <div class="details-head-left">
          <div class="details-kicker mono">DÉTAILS</div>
          <div class="gh-panel__title">
            <div class="details-title-wrap details-title--expanded">
              <div class="details-title-row details-title-row--main">
                <div class="details-title-maincol">
                  <div class="details-title-topline">
                    <span class="details-title-text">Sélectionner un élément</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="details-head-right">
          <div class="details-meta mono" id="detailsMeta">—</div>
          <button id="detailsExpand" class="icon-btn icon-btn--sm" aria-label="Agrandir" title="Agrandir">⤢</button>
        </div>
      </div>
    `;
  }

  const item = selection.item;
  const titleTextHtml = escapeHtml(firstNonEmpty(item.title, item.id, "Détail"));
  const idHtml = escapeHtml(item.id || "");

  let badgeHtml = "";
  let probsHtml = "";
  let verdictHtml = "";
  let barOnlyHtml = "";

  if (selection.type === "situation") {
    const stats = situationVerdictStats(item);
    badgeHtml = statePill(item.status);
    probsHtml = `<div class="subissues-counts subissues-counts--problems"><span>${(item.sujets || []).length} sujets</span></div>`;
    verdictHtml = verdictBar(stats);
    barOnlyHtml = verdictBar(stats);
  } else if (selection.type === "sujet") {
    const stats = problemVerdictStats(item);
    badgeHtml = statePill(item.status);
    probsHtml = `<div class="subissues-counts subissues-counts--problems"><span>${(item.avis || []).length} avis</span></div>`;
    verdictHtml = verdictBar(stats);
    barOnlyHtml = verdictBar(stats);
  } else {
    badgeHtml = verdictPill(item.verdict);
    probsHtml = `<div class="subissues-counts subissues-counts--problems"><span>${escapeHtml(firstNonEmpty(item.agent, "system"))}</span></div>`;
  }

  return `
    <div class="details-head">
      <div class="details-head-left">
        <div class="details-kicker mono">DÉTAILS</div>
        <div class="gh-panel__title">
          <div class="details-title-wrap details-title--expanded">
            <div class="details-title-row details-title-row--main">
              <div class="details-title-maincol">
                <div class="details-title-topline">
                  <span class="details-title-text">${titleTextHtml}</span>
                  <span class="details-title-id mono">${idHtml}</span>
                </div>
                <div class="details-title-bottomline">
                  ${badgeHtml}
                  ${probsHtml}
                  ${verdictHtml}
                </div>
              </div>
            </div>
          </div>

          <div class="details-title-wrap details-title--compact">
            <div class="details-title-compact">
              <div class="details-title-compact-col1">
                ${badgeHtml}
              </div>
              <div class="details-title-compact-col2">
                <div class="details-title-compact-top">
                  <span class="details-title-text">${titleTextHtml}</span>
                  <span class="details-title-id mono">${idHtml}</span>
                </div>
                <div class="details-title-compact-bottom">
                  ${probsHtml}
                  ${barOnlyHtml}
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

function renderSituationDetails(selection) {
  const situation = selection.item;
  const stats = situationVerdictStats(situation);
  const sujets = situation.sujets || [];

  const subIssuesHtml = renderSubIssuesPanel({
    title: "Sujets rattachés",
    count: `${sujets.length}`,
    rightMetaHtml: verdictBar(stats),
    bodyHtml: sujets.map((sujet) => `
      <div class="issue-row issue-row--pb click js-row-sujet" data-sujet-id="${escapeHtml(sujet.id)}">
        <div class="cell cell-theme cell-theme--full lvl0">
          <span class="chev chev--spacer"></span>
          ${issueIcon(sujet.status)}
          <span class="theme-text theme-text--pb">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</span>
          <span class="subissues-inline-count mono">${(sujet.avis || []).length} avis</span>
        </div>
      </div>
    `).join("")
  });

  return `
    <div class="details-grid">
      <div class="details-main">
        ${renderCommentCard(firstNonEmpty(situation.agent, "system"), getSituationSummary(situation), "S")}
        ${subIssuesHtml}
        ${renderThreadBlock(selection)}
        ${renderHumanActionBlock()}
      </div>

      <aside class="details-meta-col">
        <div class="meta-title">Metadata</div>
        ${renderMetaItem("ID", `<span class="mono">${escapeHtml(situation.id)}</span>`)}
        ${renderMetaItem("Status", statePill(situation.status))}
        ${renderMetaItem("Priority", priorityBadge(situation.priority))}
        ${renderMetaItem("Sujets", String(sujets.length))}
        ${renderMetaItem("Verdicts", `<span class="mono">D=${stats.d} · S=${stats.s}</span>`)}
      </aside>
    </div>
  `;
}

function renderSujetDetails(selection) {
  const sujet = selection.item;
  const stats = problemVerdictStats(sujet);
  const avisList = sujet.avis || [];
  const parentSituation = getSituationBySujetId(sujet.id);

  const subIssuesHtml = renderSubIssuesPanel({
    title: "Avis rattachés",
    count: `${avisList.length}`,
    rightMetaHtml: verdictBar(stats),
    bodyHtml: avisList.map((avis) => `
      <div class="issue-row issue-row--avis click js-row-avis" data-avis-id="${escapeHtml(avis.id)}">
        <div class="cell cell-theme cell-theme--full lvl0">
          <span class="chev chev--spacer"></span>
          ${issueIcon(avis.status)}
          <span class="theme-text theme-text--avis">${escapeHtml(firstNonEmpty(avis.title, avis.id, ""))}</span>
          <span class="subissues-inline-count mono">${escapeHtml(avis.id)}</span>
        </div>
      </div>
    `).join("")
  });

  return `
    <div class="details-grid">
      <div class="details-main">
        ${renderCommentCard(firstNonEmpty(sujet.agent, "system"), getSujetSummary(sujet), "P")}
        ${subIssuesHtml}
        ${renderThreadBlock(selection)}
        ${renderHumanActionBlock()}
      </div>

      <aside class="details-meta-col">
        <div class="meta-title">Metadata</div>
        ${renderMetaItem("ID", `<span class="mono">${escapeHtml(sujet.id)}</span>`)}
        ${renderMetaItem("Situation parent", `<span class="mono">${escapeHtml(parentSituation?.id || "—")}</span>`)}
        ${renderMetaItem("Status", statePill(sujet.status))}
        ${renderMetaItem("Priority", priorityBadge(sujet.priority))}
        ${renderMetaItem("Avis", String(avisList.length))}
      </aside>
    </div>
  `;
}

function renderAvisDetails(selection) {
  const avis = selection.item;
  const sujet = getSujetByAvisId(avis.id);
  const situation = getSituationByAvisId(avis.id);

  return `
    <div class="details-grid">
      <div class="details-main">
        ${renderCommentCard(firstNonEmpty(avis.agent, "system"), getAvisSummary(avis), "A")}
        ${renderThreadBlock(selection)}
        ${renderHumanActionBlock()}
      </div>

      <aside class="details-meta-col">
        <div class="meta-title">Metadata</div>
        ${renderMetaItem("ID", `<span class="mono">${escapeHtml(avis.id)}</span>`)}
        ${renderMetaItem("Situation parent", `<span class="mono">${escapeHtml(situation?.id || "—")}</span>`)}
        ${renderMetaItem("Sujet parent", `<span class="mono">${escapeHtml(sujet?.id || "—")}</span>`)}
        ${renderMetaItem("Verdict", verdictPill(avis.verdict))}
        ${renderMetaItem("Agent", escapeHtml(firstNonEmpty(avis.agent, "system")))}
      </aside>
    </div>
  `;
}

function renderDetailsHtml() {
  const selection = getActiveSelection();
  if (!selection) {
    return {
      titleHtml: renderDetailsTitleHtml(null),
      bodyHtml: `<div class="emptyState">Sélectionne une situation / un sujet / un avis pour afficher les détails.</div>`,
      modalTitle: "Sélectionner un élément",
      modalMeta: "—"
    };
  }

  let bodyHtml = "";
  if (selection.type === "avis") bodyHtml = renderAvisDetails(selection);
  else if (selection.type === "sujet") bodyHtml = renderSujetDetails(selection);
  else bodyHtml = renderSituationDetails(selection);

  return {
    titleHtml: renderDetailsTitleHtml(selection),
    bodyHtml,
    modalTitle: firstNonEmpty(selection.item.title, selection.item.id, "Détail"),
    modalMeta: firstNonEmpty(selection.item.id, "")
  };
}

function updateDetailsModal() {
  const modal = document.getElementById("detailsModal");
  const title = document.getElementById("detailsTitleModal");
  const meta = document.getElementById("detailsMetaModal");
  const body = document.getElementById("detailsBodyModal");
  if (!modal || !title || !meta || !body) return;

  const details = renderDetailsHtml();
  title.textContent = details.modalTitle;
  meta.textContent = details.modalMeta;
  body.innerHTML = details.bodyHtml;

  if (store.situationsView.detailsModalOpen) modal.classList.remove("hidden");
  else modal.classList.add("hidden");
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

  updateDetailsModal();
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
  rerenderPanels();
}

let modalEventsBound = false;
function bindModalEvents() {
  if (modalEventsBound) return;
  modalEventsBound = true;

  document.getElementById("detailsClose")?.addEventListener("click", closeDetailsModal);
  document.getElementById("detailsModal")?.addEventListener("click", (event) => {
    if (event.target?.id === "detailsModal") closeDetailsModal();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && store.situationsView.detailsModalOpen) {
      closeDetailsModal();
    }
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
}

export function renderProjectSituations(root) {
  ensureSituationsLegacyDomStyle();

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

              <label class="gh-filter gh-filter--inline">
                <span>Search</span>
                <input id="situationsSearch" class="gh-input gh-input--sm" type="text" placeholder="topic / EC8 / mot-clé…" />
              </label>

              <label class="gh-filter gh-filter--inline">
                <span>Affichage</span>
                <select id="displayDepth" class="gh-input gh-input--sm">
                  <option value="situations">Situations</option>
                  <option value="sujets">Sujets</option>
                  <option value="avis">Avis</option>
                </select>
              </label>
            </div>
          </div>

          <div class="results-bar__right">
            <div class="issues-totals mono" id="situationsHeaderCounts">—</div>
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
  bindModalEvents();
  bindDetailsScroll(root);
  initRightSplitter(root);
  updateDetailsModal();
}
