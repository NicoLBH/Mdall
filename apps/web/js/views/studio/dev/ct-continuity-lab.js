/**
 * Laboratoire CT Continuity — Atelier › Développements.
 *
 * Page d'expérimentation manuelle du Spike 1 : on charge des rapports de
 * contrôle technique à la main, dans l'ordre chronologique, et on lit ce que le
 * moteur en tire.
 *
 * Ce que cette page ne fait pas, et ne doit jamais faire :
 *  - rien n'est envoyé sur le réseau : les PDF sont lus dans le navigateur ;
 *  - rien n'est enregistré : ni document, ni analysis_run, ni sujet ;
 *  - aucun sujet Mdall n'est créé, fermé ou rouvert ;
 *  - aucune precision ni aucun recall n'est affiché : sans ground truth
 *    annotée, ces chiffres n'existent pas. Seuls des indicateurs
 *    auto-vérifiables sont montrés.
 *
 * Le style est volontairement rudimentaire : c'est un banc d'essai, pas un
 * écran produit.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { extractPagesFromFile } from "../../../services/ct-lab-pdf.js";
import { buildCaseExport, runCtLab } from "../../../services/ct-lab-engine.js";

const SLOT_COUNT = 10;

const STATE_LABELS = {
  NEW: "nouveau",
  MATCHED: "suivi",
  NOT_FOUND: "non retrouvé",
  AMBIGUOUS: "ambigu"
};

const CHANGE_LABELS = {
  UNCHANGED: "avis inchangé",
  CHANGED: "avis modifié",
  UNKNOWN: "évolution inconnue"
};

const STYLE = `
.ctlab { --ctlab-line: #d0d7de; --ctlab-muted: #57606a; font-size: 13px; }
.ctlab__banner { border: 2px solid #bf8700; background: #fff8c5; padding: 10px 12px; margin-bottom: 16px; }
.ctlab__section { border: 1px solid var(--ctlab-line); padding: 12px; margin-bottom: 16px; }
.ctlab__section > h3 { margin: 0 0 8px; font-size: 14px; }
.ctlab__hint { color: var(--ctlab-muted); margin: 0 0 10px; }
.ctlab__slots { display: grid; gap: 6px; }
.ctlab__slot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ctlab__btn { border: 2px solid #24292f; background: #eaeef2; padding: 4px 10px; cursor: pointer; font: inherit; }
.ctlab__btn:disabled { opacity: .5; cursor: not-allowed; }
.ctlab__btn--go { background: #1f883d; border-color: #1a7f37; color: #fff; font-weight: 700; }
.ctlab__slot-state { color: var(--ctlab-muted); }
.ctlab__slot-state--loaded { color: #1a7f37; }
.ctlab__slot-state--error { color: #cf222e; }
.ctlab__actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.ctlab__alert { border-left: 4px solid #cf222e; background: #ffebe9; padding: 8px 10px; margin-bottom: 6px; }
.ctlab__alert--attention { border-left-color: #bf8700; background: #fff8c5; }
.ctlab__alert--info { border-left-color: #0969da; background: #ddf4ff; }
.ctlab__kpis { display: flex; gap: 16px; flex-wrap: wrap; }
.ctlab__kpi { border: 1px solid var(--ctlab-line); padding: 8px 12px; min-width: 150px; }
.ctlab__kpi b { display: block; font-size: 18px; }
.ctlab__kpi span { color: var(--ctlab-muted); }
.ctlab__scroll { overflow-x: auto; }
.ctlab__grid { border-collapse: collapse; width: 100%; }
.ctlab__grid th, .ctlab__grid td { border: 1px solid var(--ctlab-line); padding: 6px 8px; text-align: left; vertical-align: top; }
.ctlab__grid th { background: #f6f8fa; }
.ctlab__cell { background: none; border: 0; padding: 0; font: inherit; text-align: left; cursor: pointer; width: 100%; }
.ctlab__badge { display: inline-block; border: 1px solid var(--ctlab-line); padding: 0 4px; font-size: 11px; text-transform: uppercase; }
.ctlab__badge--NEW { background: #ddf4ff; }
.ctlab__badge--MATCHED { background: #dafbe1; }
.ctlab__badge--NOT_FOUND { background: #fff1e5; }
.ctlab__badge--AMBIGUOUS { background: #f6f8fa; border-style: dashed; }
.ctlab__change { color: var(--ctlab-muted); }
.ctlab__detail { border: 1px dashed var(--ctlab-line); padding: 10px; margin-top: 10px; }
.ctlab__detail dt { font-weight: 700; margin-top: 6px; }
.ctlab__detail dd { margin: 0; }
.ctlab__excerpt { background: #f6f8fa; padding: 6px; white-space: pre-wrap; }
.ctlab__empty { color: var(--ctlab-muted); }
`;

function formatRatio(correct, total) {
  if (!total) return "n/a";
  return `${correct}/${total} — ${((correct / total) * 100).toFixed(0)} %`;
}

function formatConfidence(value) {
  if (value === null || value === undefined) return "inconnue";
  return String(value);
}

function renderSlots(state) {
  return state.reports
    .map((report, index) => {
      const position = index + 1;
      let status = `<span class="ctlab__slot-state">vide</span>`;

      if (report?.error) {
        status = `<span class="ctlab__slot-state ctlab__slot-state--error">échec : ${escapeHtml(report.error)}</span>`;
      } else if (report?.loading) {
        status = `<span class="ctlab__slot-state">lecture en cours…</span>`;
      } else if (report) {
        status =
          `<span class="ctlab__slot-state ctlab__slot-state--loaded">` +
          `${escapeHtml(report.filename)} — ${report.pageCount} page(s), ${report.charCount} caractères` +
          `</span>`;
      }

      return `
        <div class="ctlab__slot">
          <button type="button" class="ctlab__btn" data-ctlab-pick="${index}">Ajouter rapport ${position}</button>
          ${status}
          ${report && !report.loading ? `<button type="button" class="ctlab__btn" data-ctlab-clear="${index}">Retirer</button>` : ""}
        </div>
      `;
    })
    .join("");
}

function renderAlerts(alerts) {
  if (alerts.length === 0) {
    return `<p class="ctlab__empty">Aucune alerte d'extraction.</p>`;
  }

  return alerts
    .map(
      (alert) => `
        <div class="ctlab__alert ${alert.level === "attention" ? "ctlab__alert--attention" : ""}">
          <b>${escapeHtml(alert.sourceId)}</b> — ${escapeHtml(alert.message)}
        </div>
      `
    )
    .join("");
}

function renderIndicators(indicators) {
  const states = Object.entries(indicators.continuityStates)
    .map(([state, count]) => `${escapeHtml(STATE_LABELS[state] ?? state)} : ${count}`)
    .join(" · ");

  return `
    <div class="ctlab__kpis">
      <div class="ctlab__kpi">
        <b>${formatRatio(indicators.provenance.correct, indicators.provenance.total)}</b>
        <span>provenance vérifiée<br>(source + page + extrait)</span>
      </div>
      <div class="ctlab__kpi">
        <b>${formatRatio(indicators.recognizedOpinions.correct, indicators.recognizedOpinions.total)}</b>
        <span>avis reconnus par le lexique</span>
      </div>
      <div class="ctlab__kpi">
        <b>${indicators.abstentionCount}</b>
        <span>abstentions assumées</span>
      </div>
      <div class="ctlab__kpi">
        <b>${indicators.guardViolations.length}</b>
        <span>violations de garde-fou</span>
      </div>
    </div>
    <p class="ctlab__hint">${states ? escapeHtml(states) : "aucune continuité reconstruite"}</p>
    ${
      indicators.guardViolations.length > 0
        ? `<div class="ctlab__alert">${indicators.guardViolations
            .map((violation) => `<div>${escapeHtml(violation.guard_id)} · ${escapeHtml(violation.key)} — ${escapeHtml(violation.message)}</div>`)
            .join("")}</div>`
        : ""
    }
    <p class="ctlab__hint">
      Precision et recall ne figurent pas ici : ils exigent une ground truth annotée à la main.
      Les indicateurs ci-dessus se vérifient seuls, contre les PDF chargés.
    </p>
  `;
}

/**
 * Une case du tableau.
 *
 * Trois situations à ne surtout pas confondre, et qui se ressemblent si on n'y
 * prend pas garde :
 *  - l'avis est absent de ce rapport (NOT_FOUND) ;
 *  - l'avis est présent mais sa formulation n'est pas reconnue par le lexique ;
 *  - la référence est ambiguë dans ce rapport.
 */
function renderCell(cell) {
  const continuity = cell.continuity;
  const extraction = cell.extraction;

  if (!continuity && !extraction) return `<span class="ctlab__empty">—</span>`;

  const state = continuity?.state === "AMBIGUOUS" ? "AMBIGUOUS" : continuity?.value?.state ?? "AMBIGUOUS";
  const change = continuity?.value?.opinion_change;
  const previous = continuity?.value?.previous_document_id;

  let body;
  if (state === "NOT_FOUND") {
    body =
      `<div class="ctlab__empty">absent de ce rapport</div>` +
      (previous ? `<div class="ctlab__change">vu pour la dernière fois dans ${escapeHtml(previous)}</div>` : "");
  } else if (state === "AMBIGUOUS") {
    body = `<div class="ctlab__empty">référence ambiguë — aucun avis retenu</div>`;
  } else if (extraction?.value?.opinion_raw) {
    body = `<div>${escapeHtml(extraction.value.opinion_raw)}</div>`;
  } else {
    body = `<div class="ctlab__empty">avis présent, formulation non reconnue</div>`;
  }

  return `
    <button type="button" class="ctlab__cell" data-ctlab-cell="${escapeHtml(cell.documentId)}::${escapeHtml(cell.reference)}">
      <span class="ctlab__badge ctlab__badge--${escapeHtml(state)}">${escapeHtml(STATE_LABELS[state] ?? state)}</span>
      ${body}
      ${change && state !== "NOT_FOUND" ? `<div class="ctlab__change">${escapeHtml(CHANGE_LABELS[change] ?? change)}</div>` : ""}
    </button>
  `;
}

function renderTimeline(result) {
  if (result.timeline.length === 0) {
    return `<p class="ctlab__empty">Aucun avis reconnu dans les rapports chargés.</p>`;
  }

  const header = result.sources
    .map((source) => `<th>${escapeHtml(source.metadata?.filename ?? source.source_id)}</th>`)
    .join("");

  const rows = result.timeline
    .map(
      (row) => `
        <tr>
          <th>${escapeHtml(row.reference)}</th>
          ${row.cells.map((cell) => `<td>${renderCell(cell)}</td>`).join("")}
        </tr>
      `
    )
    .join("");

  return `
    <div class="ctlab__scroll">
      <table class="ctlab__grid">
        <thead><tr><th>Référence</th>${header}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div data-ctlab-detail></div>
  `;
}

function renderDetail(cell) {
  if (!cell) return "";

  const extraction = cell.extraction;
  const continuity = cell.continuity;
  const provenance = extraction?.provenance ?? continuity?.provenance ?? null;

  const candidates = extraction?.candidates ?? continuity?.candidates ?? [];

  return `
    <div class="ctlab__detail">
      <h4>${escapeHtml(cell.reference)} — ${escapeHtml(cell.documentId)}</h4>
      <dl>
        <dt>Avis, tel qu'écrit dans la source</dt>
        <dd>${
          extraction?.value?.opinion_raw
            ? escapeHtml(extraction.value.opinion_raw)
            : extraction
              ? "formulation non reconnue par le lexique — aucun avis n'est inventé"
              : "aucune occurrence dans ce rapport"
        }</dd>

        <dt>Texte associé</dt>
        <dd>${extraction?.description_raw ? escapeHtml(extraction.description_raw) : "—"}</dd>

        <dt>Provenance</dt>
        <dd>${
          provenance
            ? `${escapeHtml(provenance.source_id)} · page ${provenance.page ?? "?"}
               <div class="ctlab__excerpt">${escapeHtml(provenance.excerpt ?? "")}</div>`
            : "aucune"
        }</dd>

        <dt>Confiances</dt>
        <dd>
          lecture de l'occurrence : ${formatConfidence(extraction?.confidence)} ·
          reconnaissance de l'avis : ${formatConfidence(extraction?.opinion_confidence)} ·
          continuité : ${formatConfidence(continuity?.confidence)}
        </dd>

        <dt>Rapprochement</dt>
        <dd>
          ${escapeHtml(continuity?.match_method ?? "—")}
          ${continuity?.value?.previous_document_id ? ` depuis ${escapeHtml(continuity.value.previous_document_id)}` : ""}
          ${continuity?.derived_from_absence ? " · constat d'absence, aucune conclusion" : ""}
        </dd>

        ${
          candidates.length > 0
            ? `<dt>Candidats concurrents (abstention)</dt>
               <dd>${candidates
                 .map((candidate) => `<div class="ctlab__excerpt">${escapeHtml(candidate.source_excerpt ?? candidate.excerpt ?? "")}</div>`)
                 .join("")}</dd>`
            : ""
        }
      </dl>
    </div>
  `;
}

function renderSuggestions(suggestions) {
  if (suggestions.length === 0) return `<p class="ctlab__empty">Aucune suggestion.</p>`;

  return `
    <p class="ctlab__hint">
      Suggestions expérimentales. Elles ne sont jamais appliquées et ne modifient aucun sujet Mdall :
      l'avis d'un bureau de contrôle et le statut d'un sujet ne sont pas la même information.
    </p>
    <ul>
      ${suggestions
        .map((suggestion) => `<li><b>${escapeHtml(suggestion.reference)}</b> — ${escapeHtml(suggestion.rationale)}</li>`)
        .join("")}
    </ul>
  `;
}

function renderResults(state) {
  if (state.error) {
    return `<div class="ctlab__section"><div class="ctlab__alert">${escapeHtml(state.error)}</div></div>`;
  }
  if (state.running) {
    return `<div class="ctlab__section"><p>Analyse en cours…</p></div>`;
  }
  if (!state.result) {
    return `<div class="ctlab__section"><p class="ctlab__empty">Charger au moins un rapport, puis lancer l'analyse.</p></div>`;
  }

  return `
    <div class="ctlab__section">
      <h3>Alertes d'extraction</h3>
      ${renderAlerts(state.result.indicators.alerts)}
    </div>
    <div class="ctlab__section">
      <h3>Indicateurs de fiabilité</h3>
      ${renderIndicators(state.result.indicators)}
    </div>
    <div class="ctlab__section">
      <h3>Suivi des avis</h3>
      <p class="ctlab__hint">Une ligne par référence, une colonne par rapport, dans l'ordre de chargement. Cliquer une case pour voir sa provenance.</p>
      ${renderTimeline(state.result)}
    </div>
    <div class="ctlab__section">
      <h3>Suggestions</h3>
      ${renderSuggestions(state.result.suggestions)}
    </div>
    <div class="ctlab__section">
      <h3>Exports</h3>
      <p class="ctlab__hint">
        Le cas exporté ne contient que les sources. La ground truth s'écrit à la main, en relisant les rapports —
        jamais à partir de ce que le moteur a produit.
      </p>
      <div class="ctlab__actions">
        <button type="button" class="ctlab__btn" data-ctlab-export="case">Exporter le cas (JSON)</button>
        <button type="button" class="ctlab__btn" data-ctlab-export="run">Exporter le run (JSON)</button>
        <button type="button" class="ctlab__btn" data-ctlab-export="report">Exporter le rapport (Markdown)</button>
      </div>
    </div>
  `;
}

function render(root, state) {
  const loadedCount = state.reports.filter((report) => report && !report.error && !report.loading).length;

  root.innerHTML = `
    <style>${STYLE}</style>
    <div class="ctlab">
      <h2>CT Continuity Lab</h2>
      <div class="ctlab__banner">
        Banc d'essai du Spike 1. Les PDF sont lus <b>dans ce navigateur</b> : rien n'est envoyé, rien n'est
        enregistré, aucun sujet Mdall n'est créé ni modifié. Fermer l'onglet efface tout.
      </div>

      <div class="ctlab__section">
        <h3>Rapports</h3>
        <p class="ctlab__hint">Charger dans l'ordre chronologique : rapport 1 = le plus ancien.</p>
        <div class="ctlab__slots">${renderSlots(state)}</div>
        <div class="ctlab__actions">
          <button type="button" class="ctlab__btn ctlab__btn--go" data-ctlab-run ${loadedCount === 0 || state.running ? "disabled" : ""}>
            Analyser ${loadedCount} rapport(s)
          </button>
          <button type="button" class="ctlab__btn" data-ctlab-reset>Tout réinitialiser</button>
        </div>
      </div>

      <div data-ctlab-results>${renderResults(state)}</div>
    </div>
  `;
}

export function renderCtContinuityLab(root) {
  if (!root) return;

  const state = {
    reports: Array.from({ length: SLOT_COUNT }, () => null),
    result: null,
    running: false,
    error: null,
    selectedCell: null
  };

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/pdf,.pdf";
  input.style.display = "none";
  root.appendChild(input);

  let pendingSlot = null;

  const refresh = () => {
    render(root, state);
    root.appendChild(input);
    if (state.selectedCell) {
      const holder = root.querySelector("[data-ctlab-detail]");
      if (holder) holder.innerHTML = renderDetail(state.selectedCell);
    }
  };

  const download = (filename, content, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    const slot = pendingSlot;
    input.value = "";
    pendingSlot = null;
    if (!file || slot === null) return;

    state.reports[slot] = { loading: true, filename: file.name };
    refresh();

    try {
      const extracted = await extractPagesFromFile(file);
      state.reports[slot] = { ...extracted, sourceId: `rapport-${slot + 1}` };
    } catch (error) {
      state.reports[slot] = { filename: file.name, error: error.message };
    }
    refresh();
  });

  root.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-ctlab-pick], [data-ctlab-clear], [data-ctlab-run], [data-ctlab-reset], [data-ctlab-cell], [data-ctlab-export]");
    if (!target) return;

    if (target.dataset.ctlabPick !== undefined) {
      pendingSlot = Number(target.dataset.ctlabPick);
      input.click();
      return;
    }

    if (target.dataset.ctlabClear !== undefined) {
      state.reports[Number(target.dataset.ctlabClear)] = null;
      state.result = null;
      state.selectedCell = null;
      refresh();
      return;
    }

    if (target.dataset.ctlabReset !== undefined) {
      state.reports = Array.from({ length: SLOT_COUNT }, () => null);
      state.result = null;
      state.selectedCell = null;
      state.error = null;
      refresh();
      return;
    }

    if (target.dataset.ctlabCell !== undefined) {
      const [documentId, reference] = String(target.dataset.ctlabCell).split("::");
      const row = state.result?.timeline.find((entry) => entry.reference === reference);
      state.selectedCell = row?.cells.find((cell) => cell.documentId === documentId) ?? null;
      const holder = root.querySelector("[data-ctlab-detail]");
      if (holder) holder.innerHTML = renderDetail(state.selectedCell);
      return;
    }

    if (target.dataset.ctlabExport !== undefined && state.result) {
      const kind = target.dataset.ctlabExport;
      if (kind === "case") {
        download("case.json", JSON.stringify(buildCaseExport(state.result.sources), null, 2), "application/json");
      } else if (kind === "run") {
        download("run.json", JSON.stringify(state.result.record, null, 2), "application/json");
      } else {
        download("report.md", state.result.reportMarkdown, "text/markdown");
      }
      return;
    }

    if (target.dataset.ctlabRun !== undefined) {
      const reports = state.reports.filter((report) => report && !report.error && !report.loading);
      if (reports.length === 0) return;

      state.running = true;
      state.error = null;
      state.selectedCell = null;
      refresh();

      try {
        state.result = await runCtLab(reports);
      } catch (error) {
        state.result = null;
        state.error = error.message;
      }
      state.running = false;
      refresh();
    }
  });

  refresh();
}
