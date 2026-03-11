import { store } from "../store.js";

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

function badgeCounter(current, total) {
  return `<span class="subissues-counts--problems">${current} sur ${total}</span>`;
}

function buildRawIndex() {
  const raw = store.situationsView.rawResult || {};
  const situations = Array.isArray(raw.situations) ? raw.situations : [];
  const problems = Array.isArray(raw.problems) ? raw.problems : [];
  const avis = Array.isArray(raw.avis) ? raw.avis : [];

  const situationById = new Map(situations.map((s) => [String(s.situation_id || s.id), s]));
  const problemById = new Map(problems.map((p) => [String(p.problem_id || p.id), p]));
  const avisById = new Map(avis.map((a) => [String(a.avis_id || a.id), a]));

  const problemToSituation = new Map();
  const avisToProblem = new Map();
  const avisToSituation = new Map();

  for (const situation of situations) {
    const sid = String(situation.situation_id || situation.id || "");
    for (const problemId of situation.problem_ids || []) {
      const pid = String(problemId);
      problemToSituation.set(pid, sid);
      const problem = problemById.get(pid);
      if (!problem) continue;
      for (const avisId of problem.avis_ids || []) {
        const aid = String(avisId);
        avisToProblem.set(aid, pid);
        avisToSituation.set(aid, sid);
      }
    }
  }

  return {
    raw,
    situations,
    problems,
    avis,
    situationById,
    problemById,
    avisById,
    problemToSituation,
    avisToProblem,
    avisToSituation
  };
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
    if (avis) {
      return { type: "avis", item: avis };
    }
  }

  if (store.situationsView.selectedSujetId) {
    const sujet = getNestedSujet(store.situationsView.selectedSujetId);
    if (sujet) {
      return { type: "sujet", item: sujet };
    }
  }

  if (store.situationsView.selectedSituationId) {
    const situation = getNestedSituation(store.situationsView.selectedSituationId);
    if (situation) {
      return { type: "situation", item: situation };
    }
  }

  const firstSituation = (store.situationsView.data || [])[0] || null;
  return firstSituation ? { type: "situation", item: firstSituation } : null;
}

function normalizeVerdict(verdict) {
  const v = String(verdict || "").trim().toUpperCase();
  if (!v) return "";
  if (v === "WARN") return "WARNING";
  if (v === "DEFAVORABLE") return "KO";
  if (v === "FAVORABLE") return "OK";
  return v;
}

function verdictTone(verdict) {
  const v = normalizeVerdict(verdict);
  if (["KO", "WARNING", "D", "DEFAVORABLE"].includes(v)) return "negative";
  if (["OK", "S", "FAVORABLE"].includes(v)) return "positive";
  return "neutral";
}

function verdictLabel(verdict) {
  const v = normalizeVerdict(verdict);
  return v || "—";
}

function verdictPill(verdict) {
  const tone = verdictTone(verdict);
  const cls =
    tone === "negative"
      ? "badge badge--danger"
      : tone === "positive"
        ? "badge badge--success"
        : "badge";
  return `<span class="${cls}">${escapeHtml(verdictLabel(verdict))}</span>`;
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
  const dPct = Math.round((d / total) * 100);
  const sPct = Math.round((s / total) * 100);

  return { d, s, dPct, sPct, total: avis.length };
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

  if (situationTextMatch) return true;

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

  return false;
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
  return {
    situations: filteredSituations.length,
    sujets,
    avis
  };
}

function chevron(isOpen) {
  return `<span class="mono" style="display:inline-flex;width:14px;justify-content:center;">${isOpen ? "▾" : "▸"}</span>`;
}

function rowSelectedClass(kind, id) {
  if (kind === "situation" && store.situationsView.selectedSituationId === id) return " is-selected";
  if (kind === "sujet" && store.situationsView.selectedSujetId === id) return " is-selected";
  if (kind === "avis" && store.situationsView.selectedAvisId === id) return " is-selected";
  return "";
}

function renderSituationRow(situation) {
  const expanded = store.situationsView.expandedSituations.has(situation.id);
  const stats = situationVerdictStats(situation);
  const avisCount = (situation.sujets || []).reduce((acc, sujet) => acc + (sujet.avis || []).length, 0);

  return `
    <tr
      class="issue-row js-row-situation${rowSelectedClass("situation", situation.id)}"
      data-situation-id="${escapeHtml(situation.id)}"
    >
      <td style="padding-left:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <button
            type="button"
            class="icon-btn icon-btn--ghost js-toggle-situation"
            data-situation-id="${escapeHtml(situation.id)}"
            aria-label="${expanded ? "Réduire" : "Déployer"}"
          >
            ${chevron(expanded)}
          </button>
          ${issueIcon(situation.status)}
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
            <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(situation.title)}</strong>
          </div>
        </div>
      </td>
      <td>${statePill(situation.status)}</td>
      <td>${priorityBadge(situation.priority)}</td>
      <td><span class="mono">${escapeHtml(firstNonEmpty(situation.agent, "system"))}</span></td>
      <td><span class="mono">${escapeHtml(situation.id)}</span></td>
    </tr>
    ${
      expanded
        ? `
      <tr class="subrow">
        <td colspan="5" style="padding:0;">
          <div class="subissues-wrap">
            <div class="subissues-header">
              <div style="display:flex;align-items:center;gap:10px;">
                <strong>Sujets rattachés</strong>
                ${badgeCounter(0, (situation.sujets || []).length)}
              </div>
              ${verdictBar(stats)}
            </div>
            <table class="issues-table subissues-table">
              <tbody>
                ${(situation.sujets || []).map((sujet) => renderSujetRow(sujet, situation.id)).join("")}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    `
        : ""
    }
    ${
      !expanded
        ? `
      <tr class="issue-row-summary">
        <td colspan="5" style="padding:0 12px 12px 52px;">
          <div style="display:flex;align-items:center;gap:16px;justify-content:space-between;flex-wrap:wrap;">
            <span class="mono">${(situation.sujets || []).length} sujets · ${avisCount} avis</span>
            ${verdictBar(stats)}
          </div>
        </td>
      </tr>
    `
        : ""
    }
  `;
}

function renderSujetRow(sujet, situationId) {
  const expanded = store.situationsView.expandedSujets.has(sujet.id);
  const stats = problemVerdictStats(sujet);

  return `
    <tr
      class="issue-row js-row-sujet${rowSelectedClass("sujet", sujet.id)}"
      data-sujet-id="${escapeHtml(sujet.id)}"
      data-parent-situation-id="${escapeHtml(situationId)}"
    >
      <td style="padding-left:18px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <button
            type="button"
            class="icon-btn icon-btn--ghost js-toggle-sujet"
            data-sujet-id="${escapeHtml(sujet.id)}"
            aria-label="${expanded ? "Réduire" : "Déployer"}"
          >
            ${chevron(expanded)}
          </button>
          ${issueIcon(sujet.status)}
          <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(sujet.title)}</strong>
        </div>
      </td>
      <td>${verdictPill((sujet.avis || [])[0]?.verdict || "")}</td>
      <td>${priorityBadge(sujet.priority)}</td>
      <td><span class="mono">${escapeHtml(firstNonEmpty(sujet.agent, "system"))}</span></td>
      <td>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <span class="mono">${escapeHtml(sujet.id)}</span>
          <span class="mono" style="color:var(--muted);">${(sujet.avis || []).length} avis</span>
        </div>
      </td>
    </tr>
    ${
      expanded
        ? `
      <tr class="subrow">
        <td colspan="5" style="padding:0;">
          <div class="subissues-wrap" style="padding-left:36px;">
            <div class="subissues-header">
              <div style="display:flex;align-items:center;gap:10px;">
                <strong>Avis rattachés</strong>
                ${badgeCounter(0, (sujet.avis || []).length)}
              </div>
              ${verdictBar(stats)}
            </div>
            <table class="issues-table subissues-table">
              <tbody>
                ${(sujet.avis || []).map((avis) => renderAvisRow(avis, sujet.id, situationId)).join("")}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    `
        : ""
    }
  `;
}

function renderAvisRow(avis, sujetId, situationId) {
  return `
    <tr
      class="issue-row js-row-avis${rowSelectedClass("avis", avis.id)}"
      data-avis-id="${escapeHtml(avis.id)}"
      data-parent-sujet-id="${escapeHtml(sujetId)}"
      data-parent-situation-id="${escapeHtml(situationId)}"
    >
      <td style="padding-left:60px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="chev--spacer"></span>
          ${issueIcon(avis.status)}
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(avis.title)}</span>
        </div>
      </td>
      <td>${verdictPill(avis.verdict)}</td>
      <td>${priorityBadge(avis.priority)}</td>
      <td><span class="mono">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</span></td>
      <td><span class="mono">${escapeHtml(avis.id)}</span></td>
    </tr>
  `;
}

function renderFlatSujetRow(sujet, situationId) {
  const stats = problemVerdictStats(sujet);
  return `
    <tr
      class="issue-row js-row-sujet${rowSelectedClass("sujet", sujet.id)}"
      data-sujet-id="${escapeHtml(sujet.id)}"
      data-parent-situation-id="${escapeHtml(situationId)}"
    >
      <td style="padding-left:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          ${issueIcon(sujet.status)}
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
            <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(sujet.title)}</strong>
            <span class="mono" style="color:var(--muted);">${escapeHtml(situationId)}</span>
          </div>
        </div>
      </td>
      <td>${verdictBar(stats)}</td>
      <td>${priorityBadge(sujet.priority)}</td>
      <td><span class="mono">${escapeHtml(firstNonEmpty(sujet.agent, "system"))}</span></td>
      <td><span class="mono">${escapeHtml(sujet.id)}</span></td>
    </tr>
  `;
}

function renderFlatAvisRow(avis, sujetId, situationId) {
  return `
    <tr
      class="issue-row js-row-avis${rowSelectedClass("avis", avis.id)}"
      data-avis-id="${escapeHtml(avis.id)}"
      data-parent-sujet-id="${escapeHtml(sujetId)}"
      data-parent-situation-id="${escapeHtml(situationId)}"
    >
      <td style="padding-left:12px;">
        <div style="display:flex;align-items:center;gap:10px;">
          ${issueIcon(avis.status)}
          <div style="display:flex;flex-direction:column;gap:2px;min-width:0;">
            <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(avis.title)}</strong>
            <span class="mono" style="color:var(--muted);">${escapeHtml(situationId)} · ${escapeHtml(sujetId)}</span>
          </div>
        </div>
      </td>
      <td>${verdictPill(avis.verdict)}</td>
      <td>${priorityBadge(avis.priority)}</td>
      <td><span class="mono">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</span></td>
      <td><span class="mono">${escapeHtml(avis.id)}</span></td>
    </tr>
  `;
}

function renderTableHtml(filteredSituations) {
  const displayDepth = String(store.situationsView.displayDepth || "situations").toLowerCase();

  if (!filteredSituations.length) {
    return `
      <div style="padding:24px;color:var(--muted);">
        Aucun résultat pour les filtres actuels.
      </div>
    `;
  }

  if (displayDepth === "sujets") {
    const rows = [];
    for (const situation of filteredSituations) {
      for (const sujet of situation.sujets || []) {
        rows.push(renderFlatSujetRow(sujet, situation.id));
      }
    }

    return `
      <table class="issues-table">
        <thead>
          <tr>
            <th>Thème</th>
            <th>Verdict</th>
            <th>Prio</th>
            <th>Agent</th>
            <th>avis_id</th>
          </tr>
        </thead>
        <tbody class="issues-table__body">${rows.join("")}</tbody>
      </table>
    `;
  }

  if (displayDepth === "avis") {
    const rows = [];
    for (const situation of filteredSituations) {
      for (const sujet of situation.sujets || []) {
        for (const avis of sujet.avis || []) {
          rows.push(renderFlatAvisRow(avis, sujet.id, situation.id));
        }
      }
    }

    return `
      <table class="issues-table">
        <thead>
          <tr>
            <th>Thème</th>
            <th>Verdict</th>
            <th>Prio</th>
            <th>Agent</th>
            <th>avis_id</th>
          </tr>
        </thead>
        <tbody class="issues-table__body">${rows.join("")}</tbody>
      </table>
    `;
  }

  return `
    <table class="issues-table">
      <thead>
        <tr>
          <th>Thème</th>
          <th>Verdict</th>
          <th>Prio</th>
          <th>Agent</th>
          <th>avis_id</th>
        </tr>
      </thead>
      <tbody class="issues-table__body">
        ${filteredSituations.map((situation) => renderSituationRow(situation)).join("")}
      </tbody>
    </table>
  `;
}

function getAvisSummary(avis) {
  const raw = avis?.raw || {};
  return firstNonEmpty(
    raw.summary,
    raw.message,
    raw.comment,
    raw.reasoning,
    raw.analysis,
    avis?.title,
    "Aucune synthèse disponible."
  );
}

function getSujetSummary(sujet) {
  const raw = sujet?.raw || {};
  return firstNonEmpty(
    raw.summary,
    raw.message,
    raw.comment,
    raw.reasoning,
    raw.analysis,
    sujet?.title,
    "Aucune synthèse disponible."
  );
}

function getSituationSummary(situation) {
  const raw = situation?.raw || {};
  return firstNonEmpty(
    raw.summary,
    raw.message,
    raw.comment,
    raw.reasoning,
    raw.analysis,
    situation?.title,
    "Aucune synthèse disponible."
  );
}

function renderSituationDetails(selection) {
  const situation = selection.item;
  const stats = situationVerdictStats(situation);
  const agent = firstNonEmpty(situation.agent, "system");

  return `
    <div class="sidebar-card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;">
        <div>
          <h3 style="margin-bottom:8px;">${escapeHtml(situation.title)} <span class="mono" style="color:var(--muted);">#${escapeHtml(situation.id)}</span></h3>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            ${statePill(situation.status)}
            ${badgeCounter(0, (situation.sujets || []).length)}
            ${verdictBar(stats)}
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:32px;margin-top:18px;">
        <div>
          <div class="timeline-comment">
            <div class="timeline-avatar">S</div>
            <div class="timeline-card" style="width:100%;">
              <div class="timeline-card__head">${escapeHtml(agent)}</div>
              <div class="timeline-card__body">
                <div class="mono" style="margin-bottom:10px;color:var(--muted);">Synthèse</div>
                <div>${escapeHtml(getSituationSummary(situation)).replace(/\n/g, "<br>")}</div>
                <hr style="margin:18px 0;border:none;border-top:1px solid var(--border2);">
                <div class="mono" style="color:var(--muted);">Conflits clés</div>
                <div style="margin-top:8px;" class="mono">
                  ${(situation.sujets || []).slice(0, 8).map((s) => escapeHtml(s.id)).join(", ") || "—"}
                </div>
              </div>
            </div>
          </div>

          <div class="gh-panel" style="margin-top:16px;">
            <div class="gh-panel__head gh-panel__head--tight" style="display:flex;justify-content:space-between;gap:16px;align-items:center;">
              <div style="display:flex;align-items:center;gap:10px;">
                <strong>Sujets rattachés</strong>
                ${badgeCounter(0, (situation.sujets || []).length)}
              </div>
              ${verdictBar(stats)}
            </div>
            <table class="issues-table subissues-table">
              <tbody>
                ${(situation.sujets || []).map((sujet) => `
                  <tr class="issue-row js-row-sujet" data-sujet-id="${escapeHtml(sujet.id)}" data-parent-situation-id="${escapeHtml(situation.id)}">
                    <td style="padding-left:16px;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        ${issueIcon(sujet.status)}
                        <strong>${escapeHtml(sujet.title)}</strong>
                      </div>
                    </td>
                    <td style="text-align:right;color:var(--muted);">${(sujet.avis || []).length} avis</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div style="display:flex;gap:14px;margin-top:20px;align-items:flex-start;">
            <div class="timeline-avatar" style="margin-top:2px;">💬</div>
            <div style="min-width:0;flex:1;">
              <div class="mono" style="color:var(--muted);margin-bottom:8px;">
                System attached this to situation n° ${escapeHtml(situation.id)} · (agent=${escapeHtml(agent)})
              </div>
              <div style="margin-bottom:14px;">${escapeHtml(situation.title)} priority=${escapeHtml(situation.priority)} sujets=${(situation.sujets || []).length}</div>
              <h3 style="margin:0 0 12px 0;">Add a comment</h3>
              <div class="gh-panel">
                <div class="gh-panel__head gh-panel__head--tight" style="display:flex;gap:18px;">
                  <strong>Write</strong>
                  <span style="color:var(--muted);">Preview</span>
                </div>
                <div style="padding:16px;">
                  <textarea class="gh-input" rows="5" style="width:100%;resize:vertical;" placeholder="Réponse humaine (Markdown) — mentionne @rapso pour demander l’avis de l’agent. Ex: « @rapso peux-tu vérifier ce point ? »"></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside class="meta-list">
          <div class="meta-row">
            <div>Priority</div>
            <div>${priorityBadge(situation.priority)}</div>
          </div>
          <div class="meta-row">
            <div>Title</div>
            <div>${escapeHtml(situation.title)}</div>
          </div>
          <div class="meta-row">
            <div>Agent</div>
            <div>${escapeHtml(agent)}</div>
          </div>
          <div class="meta-row">
            <div>situation_id</div>
            <div class="mono">${escapeHtml(situation.id)}</div>
          </div>
          <div class="meta-row">
            <div>Sujets</div>
            <div>${(situation.sujets || []).length}</div>
          </div>
        </aside>
      </div>
    </div>
  `;
}

function renderSujetDetails(selection) {
  const sujet = selection.item;
  const situation = getSituationBySujetId(sujet.id);
  const stats = problemVerdictStats(sujet);

  return `
    <div class="sidebar-card">
      <h3 style="margin-bottom:8px;">${escapeHtml(sujet.title)} <span class="mono" style="color:var(--muted);">#${escapeHtml(sujet.id)}</span></h3>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
        ${statePill(sujet.status)}
        ${priorityBadge(sujet.priority)}
        <span class="mono">${escapeHtml(firstNonEmpty(sujet.agent, "system"))}</span>
        ${verdictBar(stats)}
      </div>

      <div class="timeline-comment" style="margin-bottom:18px;">
        <div class="timeline-avatar">S</div>
        <div class="timeline-card" style="width:100%;">
          <div class="timeline-card__head">${escapeHtml(firstNonEmpty(sujet.agent, "system"))}</div>
          <div class="timeline-card__body">
            <div class="mono" style="margin-bottom:10px;color:var(--muted);">Synthèse</div>
            <div>${escapeHtml(getSujetSummary(sujet)).replace(/\n/g, "<br>")}</div>
          </div>
        </div>
      </div>

      <div class="gh-panel">
        <div class="gh-panel__head gh-panel__head--tight" style="display:flex;justify-content:space-between;gap:16px;align-items:center;">
          <div style="display:flex;align-items:center;gap:10px;">
            <strong>Avis rattachés</strong>
            ${badgeCounter(0, (sujet.avis || []).length)}
          </div>
          ${verdictBar(stats)}
        </div>
        <table class="issues-table subissues-table">
          <tbody>
            ${(sujet.avis || []).map((avis) => `
              <tr class="issue-row js-row-avis" data-avis-id="${escapeHtml(avis.id)}" data-parent-sujet-id="${escapeHtml(sujet.id)}" data-parent-situation-id="${escapeHtml(situation?.id || "")}">
                <td style="padding-left:16px;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    ${issueIcon(avis.status)}
                    <strong>${escapeHtml(avis.title)}</strong>
                  </div>
                </td>
                <td>${verdictPill(avis.verdict)}</td>
                <td style="text-align:right;" class="mono">${escapeHtml(avis.id)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <div class="meta-list" style="margin-top:18px;">
        <div class="meta-row">
          <div>Situation parent</div>
          <div class="mono">${escapeHtml(situation?.id || "—")}</div>
        </div>
        <div class="meta-row">
          <div>Agent</div>
          <div>${escapeHtml(firstNonEmpty(sujet.agent, "system"))}</div>
        </div>
        <div class="meta-row">
          <div>Avis</div>
          <div>${(sujet.avis || []).length}</div>
        </div>
      </div>
    </div>
  `;
}

function renderAvisDetails(selection) {
  const avis = selection.item;
  const sujet = getSujetByAvisId(avis.id);
  const situation = getSituationByAvisId(avis.id);

  return `
    <div class="sidebar-card">
      <h3 style="margin-bottom:8px;">${escapeHtml(avis.title)} <span class="mono" style="color:var(--muted);">#${escapeHtml(avis.id)}</span></h3>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
        ${statePill(avis.status)}
        ${priorityBadge(avis.priority)}
        ${verdictPill(avis.verdict)}
        <span class="mono">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</span>
      </div>

      <div class="timeline-comment">
        <div class="timeline-avatar">A</div>
        <div class="timeline-card" style="width:100%;">
          <div class="timeline-card__head">${escapeHtml(firstNonEmpty(avis.agent, "system"))}</div>
          <div class="timeline-card__body">
            <div class="mono" style="margin-bottom:10px;color:var(--muted);">Avis</div>
            <div>${escapeHtml(getAvisSummary(avis)).replace(/\n/g, "<br>")}</div>
          </div>
        </div>
      </div>

      <div class="meta-list" style="margin-top:18px;">
        <div class="meta-row">
          <div>Situation parent</div>
          <div class="mono">${escapeHtml(situation?.id || "—")}</div>
        </div>
        <div class="meta-row">
          <div>Sujet parent</div>
          <div class="mono">${escapeHtml(sujet?.id || "—")}</div>
        </div>
        <div class="meta-row">
          <div>Agent</div>
          <div>${escapeHtml(firstNonEmpty(avis.agent, "system"))}</div>
        </div>
        <div class="meta-row">
          <div>Verdict</div>
          <div>${verdictPill(avis.verdict)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderDetailsHtml() {
  const selection = getActiveSelection();
  if (!selection) {
    return `<div style="padding:20px;color:var(--muted);">Aucun élément sélectionné.</div>`;
  }

  if (selection.type === "avis") return renderAvisDetails(selection);
  if (selection.type === "sujet") return renderSujetDetails(selection);
  return renderSituationDetails(selection);
}

function ensureDetailsModal() {
  let modal = document.getElementById("details-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "details-modal";
  modal.className = "details-modal";
  modal.innerHTML = `
    <div class="details-modal__backdrop"></div>
    <div class="details-modal__dialog" role="dialog" aria-modal="true" aria-label="Détail situation">
      <button type="button" class="details-modal__close" aria-label="Fermer">✕</button>
      <div class="details-modal__content" id="details-modal-content"></div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".details-modal__backdrop")?.addEventListener("click", closeDetailsModal);
  modal.querySelector(".details-modal__close")?.addEventListener("click", closeDetailsModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && store.situationsView.detailsModalOpen) {
      closeDetailsModal();
    }
  });

  return modal;
}

function updateDetailsModal() {
  const modal = ensureDetailsModal();
  const content = modal.querySelector("#details-modal-content");
  if (!content) return;

  if (store.situationsView.detailsModalOpen) {
    content.innerHTML = renderDetailsHtml();
    modal.classList.add("is-open");
  } else {
    modal.classList.remove("is-open");
  }
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
  const countsHost = document.getElementById("situationsHeaderCounts");
  const verdictFilter = document.getElementById("verdictFilter");
  const displayDepth = document.getElementById("displayDepth");

  if (verdictFilter) verdictFilter.value = store.situationsView.verdictFilter || "ALL";
  if (displayDepth) displayDepth.value = store.situationsView.displayDepth || "situations";

  if (countsHost) {
    countsHost.textContent = `${counts.situations} situations · ${counts.sujets} sujets · ${counts.avis} avis`;
  }

  if (tableHost) {
    tableHost.innerHTML = renderTableHtml(filteredSituations);
  }

  if (detailsHost) {
    detailsHost.innerHTML = renderDetailsHtml();
  }

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
  if (situation?.id) {
    store.situationsView.expandedSituations.add(situation.id);
  }
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

  root.querySelector("#detailsExpandLocal")?.addEventListener("click", () => {
    openDetailsModal();
  });

  root.addEventListener("click", (event) => {
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
  const data = store.situationsView.data || [];
  const firstSituationId = data[0]?.id || null;

  if (!store.situationsView.selectedSituationId && firstSituationId) {
    store.situationsView.selectedSituationId = firstSituationId;
  }

  if (!store.situationsView.expandedSituations.size && firstSituationId) {
    store.situationsView.expandedSituations.add(firstSituationId);
  }

  root.innerHTML = `
    <div class="gh-page gh-page--3col" style="padding-top:0;">
      <section class="gh-panel gh-panel--results" style="grid-column:1 / span 3;">
        <div class="gh-panel__head">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;width:100%;">
            <div style="display:flex;align-items:center;gap:10px;">
              <strong>Results</strong>
              <label class="mono" for="verdictFilter">Verdict</label>
              <select id="verdictFilter" class="gh-input gh-input--sm">
                <option value="ALL">All</option>
                <option value="OK">OK</option>
                <option value="KO">KO</option>
                <option value="WARNING">WARNING</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <label class="mono" for="situationsSearch">Search</label>
              <input id="situationsSearch" class="gh-input" type="text" placeholder="topic / EC8 / mot-clé..." value="${escapeHtml(store.situationsView.search || "")}">
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <label class="mono" for="displayDepth">Affichage</label>
              <select id="displayDepth" class="gh-input gh-input--sm">
                <option value="situations">Situations</option>
                <option value="sujets">Sujets</option>
                <option value="avis">Avis</option>
              </select>
            </div>
            <div id="situationsHeaderCounts" class="mono" style="margin-left:auto;"></div>
          </div>
        </div>
        <div class="gh-page" style="grid-template-columns:minmax(0,1fr) minmax(360px,420px);gap:16px;padding:0;">
          <div class="gh-panel" style="overflow:hidden;">
            <div id="situationsTableHost"></div>
          </div>
          <aside class="gh-panel gh-panel--details">
            <div class="gh-panel__head gh-panel__head--tight">
              <div class="details-head" style="width:100%;">
                <div class="details-head-left">
                  <div class="gh-panel__title">Détail</div>
                </div>
                <div class="details-head-right">
                  <button id="detailsExpandLocal" class="icon-btn icon-btn--sm" aria-label="Ouvrir en plein écran">↗</button>
                </div>
              </div>
            </div>
            <div id="situationsDetailsHost" class="details-body"></div>
          </aside>
        </div>
      </section>
    </div>
  `;

  rerenderPanels();
  bindSituationsEvents(root);
  updateDetailsModal();
}
