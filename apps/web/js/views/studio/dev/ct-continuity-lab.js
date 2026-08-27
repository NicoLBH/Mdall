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
import { buildCaseExport, buildFullExport, collectAvis, runCtLab } from "../../../services/ct-lab-engine.js";
import {
  DEFAULT_LEXICON_TEXT,
  DEFAULT_PATTERN_TEXT,
  buildExtractionParams,
  parsePatterns,
  previewMatches
} from "../../../services/ct-lab-patterns.js";

const SLOT_COUNT = 20;

const STATE_LABELS = {
  NEW: "nouveau",
  MATCHED: "suivi",
  MATCHED_BY_TITLE: "suivi par intitulé",
  NOT_FOUND: "non retrouvé",
  AMBIGUOUS: "ambigu"
};

const CHANGE_LABELS = {
  UNCHANGED: "avis inchangé",
  CHANGED: "avis modifié",
  UNKNOWN: "évolution inconnue"
};

/**
 * Le laboratoire vit dans un thème sombre. Toute couleur de fond est donc
 * posée avec sa couleur de texte : un bandeau clair sur du texte clair est
 * illisible, et c'est exactement ce qui s'était produit.
 */
const STYLE = `
.ctlab {
  --ctlab-line: var(--border, #30363d);
  --ctlab-text: var(--text, #e6edf3);
  --ctlab-muted: var(--muted, #8b949e);
  --ctlab-danger: var(--danger, #f85149);
  --ctlab-warn: #d29922;
  --ctlab-info: var(--accent, #58a6ff);
  --ctlab-ok: var(--success, #3fb950);
  color: var(--ctlab-text);
  font-size: 13px;
}
.ctlab h2, .ctlab h3, .ctlab h4 { color: var(--ctlab-text); }
.ctlab__banner {
  border: 1px solid var(--ctlab-warn);
  background: rgba(210, 153, 34, .12);
  color: var(--ctlab-text);
  padding: 10px 12px;
  margin-bottom: 16px;
  border-radius: var(--radius, 6px);
}
.ctlab__section {
  border: 1px solid var(--ctlab-line);
  border-radius: var(--radius, 6px);
  padding: 12px;
  margin-bottom: 16px;
}
.ctlab__section > h3 { margin: 0 0 8px; font-size: 14px; }
.ctlab__hint { color: var(--ctlab-muted); margin: 0 0 10px; }
.ctlab__slots { display: grid; gap: 6px; }
.ctlab__slot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ctlab__btn {
  border: 1px solid var(--ctlab-line);
  background: var(--btn-bg, rgb(33, 40, 48));
  color: var(--ctlab-text);
  padding: 4px 10px;
  border-radius: var(--radius, 6px);
  cursor: pointer;
  font: inherit;
}
.ctlab__btn:disabled { opacity: .5; cursor: not-allowed; }
.ctlab__btn--go { background: var(--btn-bg-success, rgb(35, 134, 54)); border-color: transparent; font-weight: 700; }
.ctlab__slot-state { color: var(--ctlab-muted); }
.ctlab__slot-state--loaded { color: var(--ctlab-ok); }
.ctlab__slot-state--error { color: var(--ctlab-danger); }
.ctlab__actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.ctlab__alert {
  border-left: 4px solid var(--ctlab-danger);
  background: rgba(248, 81, 73, .12);
  color: var(--ctlab-text);
  padding: 8px 10px;
  margin-bottom: 6px;
  border-radius: 0 var(--radius, 6px) var(--radius, 6px) 0;
}
.ctlab__alert b { color: var(--ctlab-text); }
.ctlab__alert--attention { border-left-color: var(--ctlab-warn); background: rgba(210, 153, 34, .12); }
.ctlab__alert--info { border-left-color: var(--ctlab-info); background: rgba(88, 166, 255, .12); }
.ctlab__kpis { display: flex; gap: 12px; flex-wrap: wrap; }
.ctlab__kpi { border: 1px solid var(--ctlab-line); border-radius: var(--radius, 6px); padding: 8px 12px; min-width: 150px; }
.ctlab__kpi b { display: block; font-size: 18px; color: var(--ctlab-text); }
.ctlab__kpi span { color: var(--ctlab-muted); }
.ctlab__scroll { overflow-x: auto; }
.ctlab__grid { border-collapse: collapse; width: 100%; }
.ctlab__grid th, .ctlab__grid td { border: 1px solid var(--ctlab-line); padding: 6px 8px; text-align: left; vertical-align: top; }
.ctlab__grid th { background: var(--headbgtight, #151b23); color: var(--ctlab-text); }
.ctlab__cell { background: none; border: 0; padding: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; width: 100%; }
.ctlab__badge { display: inline-block; border: 1px solid var(--ctlab-line); border-radius: 999px; padding: 0 6px; font-size: 11px; text-transform: uppercase; }
.ctlab__badge--NEW { border-color: var(--ctlab-info); color: var(--ctlab-info); }
.ctlab__badge--MATCHED { border-color: var(--ctlab-ok); color: var(--ctlab-ok); }
.ctlab__badge--MATCHED_BY_TITLE { border-color: var(--ctlab-ok); border-style: dashed; color: var(--ctlab-ok); }
.ctlab__badge--NOT_FOUND { border-color: var(--ctlab-warn); color: var(--ctlab-warn); }
.ctlab__badge--AMBIGUOUS { border-style: dashed; color: var(--ctlab-muted); }
.ctlab__detail { border: 1px dashed var(--ctlab-line); border-radius: var(--radius, 6px); padding: 10px; margin-top: 10px; }
.ctlab__detail dt { font-weight: 700; margin-top: 6px; }
.ctlab__detail dd { margin: 0; color: var(--ctlab-text); }
.ctlab__excerpt {
  background: var(--bg-input, rgb(21, 27, 35));
  color: var(--ctlab-text);
  border: 1px solid var(--ctlab-line);
  border-radius: var(--radius, 6px);
  padding: 6px;
  white-space: pre-wrap;
  font-family: var(--mono, monospace);
  font-size: 12px;
}
.ctlab__empty { color: var(--ctlab-muted); }
.ctlab__field { display: block; margin-bottom: 10px; }
.ctlab__field > span { display: block; margin-bottom: 4px; color: var(--ctlab-muted); }
.ctlab__textarea {
  width: 100%;
  min-height: 130px;
  background: var(--bg-input, rgb(21, 27, 35));
  color: var(--ctlab-text);
  border: 1px solid var(--ctlab-line);
  border-radius: var(--radius, 6px);
  padding: 8px;
  font-family: var(--mono, monospace);
  font-size: 12px;
  resize: vertical;
}
.ctlab__pages { display: grid; gap: 4px; }
.ctlab__page { border: 1px solid var(--ctlab-line); border-radius: var(--radius, 6px); padding: 6px 8px; }
.ctlab__page > summary { cursor: pointer; color: var(--ctlab-muted); }
.ctlab__page pre {
  margin: 8px 0 0;
  max-height: 320px;
  overflow: auto;
  white-space: pre-wrap;
  background: var(--bg-input, rgb(21, 27, 35));
  border: 1px solid var(--ctlab-line);
  border-radius: var(--radius, 6px);
  padding: 8px;
  font-family: var(--mono, monospace);
  font-size: 12px;
}
.ctlab__inline { display: inline-flex; align-items: center; gap: 6px; color: var(--ctlab-muted); }
.ctlab__inline select {
  background: var(--bg-input, rgb(21, 27, 35));
  color: var(--ctlab-text);
  border: 1px solid var(--ctlab-line);
  border-radius: var(--radius, 6px);
  padding: 3px 6px;
  font: inherit;
}
.ctlab__match { color: var(--ctlab-ok); }
.ctlab__nomatch { color: var(--ctlab-warn); }
`;

function truncate(text, maxLength) {
  const value = String(text ?? "");
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}…`;
}

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
        <b>${indicators.matchedByTitleCount}</b>
        <span>suivis retrouvés par intitulé<br>(avis ayant perdu leur numéro)</span>
      </div>
      <div class="ctlab__kpi">
        <b>${indicators.liftingCount}</b>
        <span>levées déclarées dans les documents</span>
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
    const lifting = continuity?.lifting_statement;
    body = lifting
      ? `<div>déclaré levé</div><div class="ctlab__change">« ${escapeHtml(truncate(lifting.sentence, 90))} »</div>`
      : `<div class="ctlab__empty">absent de ce rapport</div>` +
        (previous ? `<div class="ctlab__change">vu pour la dernière fois dans ${escapeHtml(previous)}</div>` : "");
  } else if (state === "AMBIGUOUS") {
    body = `<div class="ctlab__empty">référence ambiguë — aucun avis retenu</div>`;
  } else if (state === "MATCHED_BY_TITLE" && continuity?.matched_opinion_raw) {
    body =
      `<div>${escapeHtml(continuity.matched_opinion_raw)} ${escapeHtml(continuity.matched_opinion_label ?? "")}</div>` +
      `<div class="ctlab__change">retrouvé par son intitulé, sans numéro</div>`;
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
          <th title="${escapeHtml(row.reference)}">${escapeHtml(row.referenceRaw ?? row.reference)}</th>
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

/**
 * Phrases par lesquelles un document déclare qu'un avis est levé.
 *
 * C'est la seule preuve admissible d'une levée : l'absence d'un avis dans un
 * rapport ultérieur, elle, ne prouve rien. Elles sont affichées telles quelles,
 * avec leur page, et ne ferment aucun sujet.
 */
function renderLiftings(state) {
  const statements = state.result.liftingStatements;
  if (statements.length === 0) {
    return `<p class="ctlab__empty">Aucune déclaration de levée trouvée.</p>`;
  }

  return `
    <p class="ctlab__hint">
      ${statements.length} déclaration(s). Une absence ne prouve rien ; une phrase, si.
      Aucun statut n'est modifié : c'est une preuve versée au dossier.
    </p>
    <div class="ctlab__scroll">
      <table class="ctlab__grid">
        <thead><tr><th>N°</th><th>Rapport</th><th>Page</th><th>Phrase</th></tr></thead>
        <tbody>
          ${statements
            .map(
              (statement) => `
                <tr>
                  <td><b>${escapeHtml(statement.reference_raw)}</b></td>
                  <td>${escapeHtml(statement.source_document_id)}</td>
                  <td>${statement.source_page ?? "—"}</td>
                  <td>${escapeHtml(statement.sentence)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
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

/**
 * Texte réellement extrait, page par page.
 *
 * C'est la section la plus importante quand rien ne sort : elle montre ce que
 * le moteur a sous les yeux. Un tableau à colonnes, par exemple, ressort de
 * l'extraction PDF sous forme de cellules isolées, une par ligne — et aucun
 * motif orienté « ligne complète » ne peut alors reconnaître quoi que ce soit.
 */
function renderExtractedText(state) {
  const reports = state.reports.filter((report) => report && !report.error && !report.loading);

  if (reports.length === 0) {
    return `<p class="ctlab__empty">Aucun rapport chargé.</p>`;
  }

  const { patterns } = parsePatterns(state.patternText);

  return `
    <p class="ctlab__hint">
      Le texte ci-dessous est exactement ce que le moteur reçoit. S'il est vide, le PDF est une image.
      S'il est présent mais qu'aucune ligne n'est reconnue, ce sont les motifs qu'il faut corriger.
    </p>
    ${reports
      .map((report) => {
        const text = report.pages.map((page) => page.text).join("\n");
        const preview = previewMatches(text, patterns, { limit: 8 });
        const verdict =
          preview.matchedCount > 0
            ? `<span class="ctlab__match">${preview.matchedCount} ligne(s) reconnue(s)</span>`
            : `<span class="ctlab__nomatch">aucune ligne reconnue</span>`;

        return `
          <div class="ctlab__section">
            <h4>${escapeHtml(report.filename)}</h4>
            <p class="ctlab__hint">
              ${report.pages.length} page(s) · ${preview.nonEmptyLineCount} ligne(s) non vides · ${verdict}
            </p>
            ${
              preview.samples.length > 0
                ? `<div class="ctlab__excerpt">${preview.samples
                    .map((sample) => escapeHtml(`ligne ${sample.lineNumber} → référence « ${sample.reference} » : ${sample.line}`))
                    .join("\n")}</div>`
                : ""
            }
            <div class="ctlab__pages">
              ${report.pages
                .map(
                  (page) => `
                    <details class="ctlab__page">
                      <summary>page ${page.page} — ${page.text.trim().length} caractères</summary>
                      <pre>${escapeHtml(page.text || "(page sans texte)")}</pre>
                    </details>
                  `
                )
                .join("")}
            </div>
            <div class="ctlab__actions">
              <button type="button" class="ctlab__btn" data-ctlab-export-text="${escapeHtml(report.sourceId)}">
                Exporter ce texte (TXT)
              </button>
            </div>
          </div>
        `;
      })
      .join("")}
  `;
}

/**
 * Motifs et lexique éditables.
 *
 * Les valeurs par défaut ont été écrites contre une fixture inventée : elles ne
 * valent rien tant qu'elles n'ont pas rencontré de vrais rapports. Les corriger
 * ici évite un cycle de déploiement par essai.
 */
function renderPatternEditor(state) {
  return `
    <p class="ctlab__hint">
      Aucune nomenclature d'organisme n'est présumée. Regarder le texte extrait ci-dessus, puis ajuster.
    </p>
    ${
      state.patternErrors.length > 0
        ? `<div class="ctlab__alert">${state.patternErrors.map((error) => `<div>${escapeHtml(error)}</div>`).join("")}</div>`
        : ""
    }
    <label class="ctlab__field">
      <span>Motifs — une expression régulière par ligne, avec les groupes (?&lt;reference&gt;…) et (?&lt;rest&gt;…) ou (?&lt;opinion&gt;…)</span>
      <textarea class="ctlab__textarea" data-ctlab-patterns spellcheck="false">${escapeHtml(state.patternText)}</textarea>
    </label>
    <label class="ctlab__field">
      <span>Lexique d'avis — une entrée par ligne : identifiant = libellé | autre libellé</span>
      <textarea class="ctlab__textarea" data-ctlab-lexicon spellcheck="false">${escapeHtml(state.lexiconText)}</textarea>
    </label>
    <div class="ctlab__actions">
      <button type="button" class="ctlab__btn" data-ctlab-apply-patterns>Appliquer et réanalyser</button>
      <button type="button" class="ctlab__btn" data-ctlab-reset-patterns>Revenir aux motifs par défaut</button>
    </div>
  `;
}

/**
 * Tous les avis lus, numérotés ou non.
 *
 * Sans cette table, la matrice de continuité est illisible : elle ne montre que
 * les avis porteurs d'un numéro, c'est-à-dire ceux qui appellent une suite.
 * Ici on voit tout — y compris les F, SO, PM, HM qui constituent l'essentiel
 * d'un rapport et n'apparaissent nulle part ailleurs.
 */
function renderAvisTable(state) {
  const all = collectAvis(state.result.predictions);
  const filter = state.avisFilter;

  const filtered = all.filter((avis) => {
    const code = avis.value?.opinion_raw ?? avis.opinion_raw ?? "";
    if (filter.code && code !== filter.code) return false;
    if (filter.numberedOnly && avis.kind !== "extraction") return false;
    if (filter.documentId && avis.provenance?.source_id !== filter.documentId) return false;
    return true;
  });

  const codes = state.result.indicators.byOpinion;

  const rows = filtered
    .map((avis) => {
      const code = avis.value?.opinion_raw ?? avis.opinion_raw ?? "?";
      const reference = avis.value?.external_reference_raw;

      return `
        <tr>
          <td>${escapeHtml(avis.provenance?.source_id ?? "—")}</td>
          <td>${avis.provenance?.page ?? "—"}</td>
          <td>${reference ? `<b>${escapeHtml(reference)}</b>` : `<span class="ctlab__empty">sans n°</span>`}</td>
          <td>${escapeHtml(avis.section_label_raw ?? avis.section_number_raw ?? "—")}</td>
          <td>${escapeHtml(avis.title_raw ?? "—")}</td>
          <td><span class="ctlab__badge">${escapeHtml(code)}</span> ${escapeHtml(avis.opinion_label ?? "")}</td>
          <td>${escapeHtml(truncate(avis.description_raw ?? "", 400))}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <p class="ctlab__hint">
      ${all.length} avis lus, dont <b>${state.result.indicators.numberedCount}</b> portant un numéro —
      seuls ceux-là peuvent être suivis d'un rapport à l'autre. Les autres sont listés ici, sans identité
      que le métier ait déjà fixée : leur inventer une reviendrait à deviner.
    </p>
    <p class="ctlab__hint">
      ${codes
        .map((entry) => `${escapeHtml(entry.code)} (${escapeHtml(entry.label ?? "?")}) : ${entry.count}`)
        .join(" · ")}
    </p>
    <div class="ctlab__actions">
      <label class="ctlab__inline">
        Avis
        <select data-ctlab-filter-code>
          <option value="">tous</option>
          ${codes
            .map(
              (entry) =>
                `<option value="${escapeHtml(entry.code)}" ${filter.code === entry.code ? "selected" : ""}>${escapeHtml(entry.code)} — ${escapeHtml(entry.label ?? "?")}</option>`
            )
            .join("")}
        </select>
      </label>
      <label class="ctlab__inline">
        Rapport
        <select data-ctlab-filter-document>
          <option value="">tous</option>
          ${state.result.sources
            .map(
              (source) =>
                `<option value="${escapeHtml(source.source_id)}" ${filter.documentId === source.source_id ? "selected" : ""}>${escapeHtml(source.metadata?.filename ?? source.source_id)}</option>`
            )
            .join("")}
        </select>
      </label>
      <label class="ctlab__inline">
        <input type="checkbox" data-ctlab-filter-numbered ${filter.numberedOnly ? "checked" : ""}>
        numérotés seulement
      </label>
      <span class="ctlab__hint">${filtered.length} affiché(s)</span>
    </div>
    <div class="ctlab__scroll">
      <table class="ctlab__grid">
        <thead>
          <tr><th>Rapport</th><th>Page</th><th>N°</th><th>Section</th><th>Intitulé</th><th>Avis</th><th>Commentaire</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
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
      <h3>Tous les avis identifiés</h3>
      ${renderAvisTable(state)}
    </div>
    <div class="ctlab__section">
      <h3>Suivi des avis numérotés</h3>
      <p class="ctlab__hint">Une ligne par référence, une colonne par rapport, dans l'ordre de chargement. Cliquer une case pour voir sa provenance.</p>
      ${renderTimeline(state.result)}
    </div>
    <div class="ctlab__section">
      <h3>Levées déclarées dans les documents</h3>
      ${renderLiftings(state)}
    </div>
    <div class="ctlab__section">
      <h3>Suggestions</h3>
      ${renderSuggestions(state.result.suggestions)}
    </div>
    <div class="ctlab__section">
      <h3>Exports</h3>
      <p class="ctlab__hint">
        <b>Exporter tout</b> réunit dans un seul fichier les sources paginées, les avis lus, la continuité,
        les indicateurs, les garde-fous et le rapport — de quoi analyser un résultat sans avoir les PDF sous
        la main. Il contient donc le texte intégral des rapports : à ne transmettre qu'à qui a le droit de les lire.
      </p>
      <p class="ctlab__hint">
        Le cas exporté, lui, ne contient que les sources. La ground truth s'écrit à la main, en relisant les rapports —
        jamais à partir de ce que le moteur a produit.
      </p>
      <div class="ctlab__actions">
        <button type="button" class="ctlab__btn ctlab__btn--go" data-ctlab-export="all">Exporter tout (JSON)</button>
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

      <div class="ctlab__section">
        <h3>Texte extrait</h3>
        ${renderExtractedText(state)}
      </div>

      <div class="ctlab__section">
        <h3>Motifs d'extraction</h3>
        ${renderPatternEditor(state)}
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
    selectedCell: null,
    avisFilter: { code: "", documentId: "", numberedOnly: false },
    patternText: DEFAULT_PATTERN_TEXT,
    lexiconText: DEFAULT_LEXICON_TEXT,
    patternErrors: []
  };

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/pdf,.pdf";
  input.style.display = "none";
  root.appendChild(input);

  let pendingSlot = null;

  /** Les zones de texte sont la seule saisie de la page : ne jamais la perdre. */
  const captureEditors = () => {
    const patterns = root.querySelector("[data-ctlab-patterns]");
    const lexicon = root.querySelector("[data-ctlab-lexicon]");
    if (patterns) state.patternText = patterns.value;
    if (lexicon) state.lexiconText = lexicon.value;
  };

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

  root.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset?.ctlabFilterCode !== undefined) state.avisFilter.code = target.value;
    else if (target.dataset?.ctlabFilterDocument !== undefined) state.avisFilter.documentId = target.value;
    else if (target.dataset?.ctlabFilterNumbered !== undefined) state.avisFilter.numberedOnly = target.checked;
    else return;

    captureEditors();
    refresh();
  });

  root.addEventListener("click", async (event) => {
    const target = event.target.closest(
      "[data-ctlab-pick], [data-ctlab-clear], [data-ctlab-run], [data-ctlab-reset], [data-ctlab-cell], " +
        "[data-ctlab-export], [data-ctlab-export-text], [data-ctlab-apply-patterns], [data-ctlab-reset-patterns]"
    );
    if (!target) return;

    if (target.dataset.ctlabExportText !== undefined) {
      const report = state.reports.find((entry) => entry?.sourceId === target.dataset.ctlabExportText);
      if (!report) return;
      const content = report.pages
        .map((page) => `----- page ${page.page} -----\n${page.text}`)
        .join("\n\n");
      download(`${report.sourceId}-texte-extrait.txt`, content, "text/plain");
      return;
    }

    if (target.dataset.ctlabResetPatterns !== undefined) {
      state.patternText = DEFAULT_PATTERN_TEXT;
      state.lexiconText = DEFAULT_LEXICON_TEXT;
      state.patternErrors = [];
      refresh();
      return;
    }

    if (target.dataset.ctlabApplyPatterns !== undefined) {
      captureEditors();
      state.patternErrors = buildExtractionParams(state.patternText, state.lexiconText).errors;
      refresh();
      if (state.reports.some((report) => report && !report.error && !report.loading)) {
        root.querySelector("[data-ctlab-run]")?.click();
      }
      return;
    }

    captureEditors();

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
      if (kind === "all") {
        download(
          "ct-lab-export-complet.json",
          JSON.stringify(buildFullExport(state.result, { generatedAt: new Date().toISOString() }), null, 2),
          "application/json"
        );
      } else if (kind === "case") {
        download("case.json", JSON.stringify(buildCaseExport(state.result.sources), null, 2), "application/json");
      } else if (kind === "run") {
        download("run.json", JSON.stringify(state.result.record, null, 2), "application/json");
      } else {
        download("report.md", state.result.reportMarkdown, "text/markdown");
      }
      return;
    }

    captureEditors();

    if (target.dataset.ctlabRun !== undefined) {
      const reports = state.reports.filter((report) => report && !report.error && !report.loading);
      if (reports.length === 0) return;

      state.running = true;
      state.error = null;
      state.selectedCell = null;
      refresh();

      const { params, errors } = buildExtractionParams(state.patternText, state.lexiconText);
      state.patternErrors = errors;

      try {
        state.result = await runCtLab(reports, { params });
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
