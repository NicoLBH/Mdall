/**
 * Suivi des avis du Bureau de Contrôle — Atelier › Développements.
 *
 * On dépose les livrables d'un bureau de contrôle — cent vingt sur un gros
 * chantier, dans n'importe quel ordre — et la page restitue leur chronologie,
 * l'état de chaque avis, et ce qui manque au dossier.
 *
 * Ce que cette page ne fait pas, et ne doit jamais faire :
 *  - rien n'est envoyé sur le réseau : les PDF sont lus dans le navigateur ;
 *  - rien n'est enregistré : ni document, ni analysis_run, ni sujet ;
 *  - aucun sujet Mdall n'est créé, fermé ou rouvert ;
 *  - aucune precision ni aucun recall n'est affiché : sans ground truth
 *    annotée, ces chiffres n'existent pas. Seuls des indicateurs
 *    auto-vérifiables sont montrés.
 *
 * L'écran suit la hiérarchie de ce qu'on vient y chercher : la réponse
 * d'abord, les pièces ensuite, la mécanique en dernier. Les composants
 * viennent de l'application — en-tête d'utilitaire, onglets, boutons,
 * sélecteur de date — pour que l'outil ne soit pas une pièce rapportée.
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
import { renderGhActionButton } from "../../ui/gh-split-button.js";
import { renderLightTabs } from "../../ui/light-tabs.js";
import {
  formatSharedDateInputValue,
  parseSharedDateInputValue,
  renderSharedDatePicker,
  shiftSharedCalendarMonth
} from "../../ui/shared-date-picker.js";

/** Les onglets, dans l'ordre où on les consulte. */
export const TABS = [
  { id: "state", label: "Où en est-on" },
  { id: "documents", label: "Documents" },
  { id: "avis", label: "Avis" },
  { id: "evidence", label: "Preuves" },
  { id: "technical", label: "Technique" }
];

/** Une page de tableau : deux mille lignes d'un coup figent le navigateur. */
const PAGE_SIZE = 50;

/** Ce que le moteur est en train de faire, en français. */
const STAGE_LABELS = {
  chronology: "Reconstitution de la chronologie",
  completeness: "Contrôle de complétude du lot",
  extraction: "Lecture des avis",
  lifting: "Recherche des levées déclarées",
  continuity: "Rapprochement des avis d'un rapport à l'autre",
  notes: "Rédaction des constats",
  guards: "Vérification des garde-fous",
  report: "Assemblage du rapport"
};

/**
 * `doc-3` est l'identité interne d'un document ; personne ne relit un dossier
 * avec ça sous les yeux. Tout ce qui s'affiche cite le nom du fichier.
 * Le registre est reconstruit à chaque rendu, à partir des sources du run.
 */
let DOCUMENT_LABELS = new Map();

function documentLabel(sourceId) {
  if (!sourceId) return "—";
  return DOCUMENT_LABELS.get(sourceId) ?? sourceId;
}

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
.ctlab__section {
  border: 1px solid var(--ctlab-line);
  border-radius: var(--radius, 6px);
  padding: 12px;
  margin-bottom: 16px;
}
.ctlab__section > h3 { margin: 0 0 8px; font-size: 14px; }
.ctlab__hint { color: var(--ctlab-muted); margin: 0 0 10px; }
.ctlab__actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
.ctlab__toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
.ctlab__spacer { flex: 1 1 auto; }
.ctlab__link {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: var(--ctlab-info);
  cursor: pointer;
}
.ctlab__link:hover { text-decoration: underline; }
/* Le travail en cours, montré plutôt que subi : une ligne par étape franchie. */
.ctlab__stages { margin: 10px 0 0; padding: 0; list-style: none; }
.ctlab__stage { display: flex; gap: 8px; align-items: baseline; padding: 2px 0; color: var(--ctlab-muted); }
.ctlab__stage--done { color: var(--ctlab-ok); }
.ctlab__stage--current { color: var(--ctlab-text); }
.ctlab__stage-mark { width: 14px; flex: 0 0 14px; text-align: center; }
.ctlab__spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--ctlab-line);
  border-top-color: var(--ctlab-info);
  border-radius: 50%;
  animation: ctlab-spin .7s linear infinite;
  vertical-align: -1px;
}
@keyframes ctlab-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ctlab__spinner { animation: none; } }
.ctlab__stage-detail { color: var(--ctlab-muted); font-family: var(--mono, monospace); font-size: 12px; }
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
.ctlab__error { color: var(--ctlab-danger); }
.ctlab__row--selected > td { background: rgba(88, 166, 255, .10); }
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
.ctlab__drop {
  border: 2px dashed var(--ctlab-line);
  border-radius: var(--radius, 6px);
  padding: 20px;
  text-align: center;
  margin-bottom: 12px;
}
.ctlab__drop.is-over { border-color: var(--ctlab-info); background: rgba(88, 166, 255, .08); }
.ctlab__drop .ctlab__hint { margin: 6px 0 10px; }
.ctlab__progress {
  height: 6px;
  background: var(--bg-input, rgb(21, 27, 35));
  border-radius: 999px;
  overflow: hidden;
  margin: 10px auto;
  max-width: 420px;
}
.ctlab__progress span { display: block; height: 100%; background: var(--ctlab-info); transition: width .2s; }
.ctlab__badge--OPEN { border-color: var(--ctlab-warn); color: var(--ctlab-warn); }
.ctlab__badge--NO_NEWS { border-color: var(--ctlab-danger); color: var(--ctlab-danger); }
.ctlab__badge--RESOLVED { border-color: var(--ctlab-ok); color: var(--ctlab-ok); }
.ctlab__inline input[type="date"] {
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

/** Échappement CSV minimal : guillemets doublés, champ cité s'il le faut. */
function csvCell(value) {
  const text = String(value ?? "");
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers, rows) {
  // Point-virgule : c'est ce qu'attend Excel en configuration française.
  return [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
}

/** `doc-3` n'est lisible par personne : les exports citent le nom du fichier. */
function filenameIndex(result) {
  return new Map(
    result.sources.map((source) => [source.source_id, source.metadata?.filename ?? source.source_id])
  );
}

export function toAvisCsv(result) {
  const filenames = filenameIndex(result);
  const dates = new Map((result.chronology?.documents ?? []).map((document) => [document.source_id, document.issued_at]));

  return toCsv(
    ["Document", "Émis le", "Page", "N°", "Section", "Intitulé", "Avis", "Libellé", "Commentaire"],
    collectAvis(result.predictions).map((avis) => [
      filenames.get(avis.provenance?.source_id) ?? "",
      dates.get(avis.provenance?.source_id) ?? "",
      avis.provenance?.page ?? "",
      avis.value?.external_reference_raw ?? "",
      avis.section_label_raw ?? avis.section_number_raw ?? "",
      avis.title_raw ?? "",
      avis.value?.opinion_raw ?? "",
      avis.opinion_label ?? "",
      avis.description_raw ?? ""
    ])
  );
}

export function toStatusCsv(result) {
  const filenames = filenameIndex(result);
  const named = (sourceId) => (sourceId ? filenames.get(sourceId) ?? sourceId : "");

  return toCsv(
    [
      "N°",
      "État",
      "Motif",
      "Soulevé dans",
      "Soulevé le",
      "Ancienneté (jours)",
      "Levé dans",
      "Levé le",
      "Vu pour la dernière fois",
      "Preuve"
    ],
    result.avisStatus.map((summary) => [
      summary.reference,
      summary.status,
      summary.resolution_reason ?? "",
      named(summary.raised_in),
      summary.raised_at ?? "",
      summary.age_days ?? "",
      named(summary.resolved_in),
      summary.resolved_at ?? "",
      named(summary.last_seen_document_id),
      summary.evidence?.sentence ?? ""
    ])
  );
}

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

/**
 * Zone de dépôt.
 *
 * Les emplacements numérotés ont disparu : sur un chantier réel, le bureau de
 * contrôle produit cent vingt livrables, et l'ordre de chargement ne peut plus
 * servir d'ordre chronologique. Celui-ci est reconstruit depuis les documents.
 */
function renderProgressBar(done, total) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return `<div class="ctlab__progress"><span style="width:${percent}%"></span></div>`;
}

function renderDropZone(state) {
  // Pendant un chargement ou une analyse, la zone s'efface : c'est le
  // déroulé du travail qui occupe la place.
  if (state.loading || state.running) return "";

  return `
    <div class="ctlab__drop" data-ctlab-drop>
      <b>Déposer les PDF ici</b>
      <div class="ctlab__hint">
        Autant de fichiers que nécessaire, dans n'importe quel ordre.
        Un second lot peut être ajouté plus tard : l'analyse est recalculée.
      </div>
      <div class="ctlab__hint">
        Les PDF sont lus <b>dans ce navigateur</b> : rien n'est envoyé, rien n'est enregistré,
        aucun sujet Mdall n'est créé ni modifié. Fermer l'onglet efface tout.
      </div>
      <button type="button" class="gh-btn gh-btn--sm" data-ctlab-pick>Choisir des fichiers…</button>
    </div>
  `;
}

/** Liste compacte des documents chargés, dans l'ordre reconstruit s'il existe. */
function renderDocumentList(state) {
  if (state.reports.length === 0) {
    return `<p class="ctlab__empty">Aucun document chargé.</p>`;
  }

  const orderById = new Map(
    (state.result?.chronology?.documents ?? []).map((document) => [document.source_id, document])
  );

  const rows = [...state.reports]
    .sort((a, b) => (orderById.get(a.sourceId)?.order ?? 999) - (orderById.get(b.sourceId)?.order ?? 999))
    .map((report) => {
      const meta = orderById.get(report.sourceId);
      const failed = Boolean(report.error);

      return `
        <tr>
          <td>${meta?.order ?? "—"}</td>
          <td>${meta?.issued_at ?? `<span class="ctlab__empty">date inconnue</span>`}</td>
          <td>${escapeHtml(meta?.document_type_label ?? "—")}</td>
          <td>${escapeHtml(truncate(report.filename, 60))}</td>
          <td>${failed ? `<span class="ctlab__error">${escapeHtml(report.error)}</span>` : `${report.pageCount} p.`}</td>
          <td><button type="button" class="gh-btn gh-btn--sm" data-ctlab-remove="${escapeHtml(report.sourceId)}">Retirer</button></td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="ctlab__scroll">
      <table class="ctlab__grid">
        <thead><tr><th>#</th><th>Émis le</th><th>Type</th><th>Fichier</th><th>Pages</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/**
 * Chronologie reconstruite et complétude du lot.
 *
 * L'outil dépend de ce qu'on lui donne ; son devoir est de dire ce qui manque,
 * pas de combler les trous.
 */
function renderChronology(state) {
  const { chronology, completeness } = state.result;
  const alerts = [];

  if (completeness.missing.length > 0) {
    alerts.push(`
      <div class="ctlab__alert ctlab__alert--attention">
        <b>${completeness.missing.length} livrable(s) déclaré(s) par vos documents mais absent(s) du lot.</b>
        <table class="ctlab__grid" style="margin-top:8px">
          <thead><tr><th>Référence</th><th>Émis le</th><th>Désignation</th><th>Déclaré par</th></tr></thead>
          <tbody>
            ${completeness.missing
              .map(
                (entry) => `
                  <tr>
                    <td>${escapeHtml(entry.chrono_reference)}</td>
                    <td>${escapeHtml(entry.issued_at)}</td>
                    <td>${escapeHtml(entry.designation)}</td>
                    <td>${escapeHtml(documentLabel(entry.declared_in))}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `);
  }

  if (completeness.sequenceGaps.length > 0) {
    alerts.push(`
      <div class="ctlab__alert ctlab__alert--attention">
        Numérotation des fiches discontinue : ${completeness.sequenceGaps.join(", ")} manquante(s).
      </div>
    `);
  }

  if (completeness.unresolvedReferences.length > 0) {
    alerts.push(`
      <div class="ctlab__alert ctlab__alert--info">
        ${completeness.unresolvedReferences.length} renvoi(s) vers un document absent :
        ${completeness.unresolvedReferences
          .slice(0, 6)
          .map((reference) => `« ${escapeHtml(reference.label)} »`)
          .join(", ")}
      </div>
    `);
  }

  if (completeness.duplicates.length > 0) {
    alerts.push(`
      <div class="ctlab__alert ctlab__alert--info">
        ${completeness.duplicates.length} document(s) chargé(s) en double :
        ${completeness.duplicates
          .map((entry) => entry.source_ids.map((id) => escapeHtml(documentLabel(id))).join(" = "))
          .join(" · ")}.
      </div>
    `);
  }

  if (chronology.undated_source_ids.length > 0) {
    alerts.push(`
      <div class="ctlab__alert ctlab__alert--attention">
        Date d'émission illisible pour ${chronology.undated_source_ids.length} document(s) :
        ${chronology.undated_source_ids.map((id) => escapeHtml(documentLabel(id))).join(", ")}.
        Placés en fin de série, leur position dans l'historique n'est pas garantie.
      </div>
    `);
  }

  return `
    <p class="ctlab__hint">
      L'ordre est reconstruit depuis la date d'émission déclarée par chaque document,
      jamais depuis le nom du fichier.
      ${completeness.declared.length > 0
        ? `${completeness.declared.length} livrables sont énumérés par vos documents.`
        : "Aucun document du lot n'énumère les livrables de l'affaire : seuls les trous de numérotation sont détectables."}
    </p>
    ${alerts.length > 0 ? alerts.join("") : `<p class="ctlab__empty">Aucune discontinuité détectée.</p>`}
  `;
}

const STATUS_LABELS = {
  OPEN: "ouvert",
  RESOLVED: "levé",
  NO_NEWS: "sans nouvelles"
};

const RESOLUTION_LABELS = {
  DECLARED_LIFTED: "déclaré levé",
  BACK_TO_FAVOURABLE: "repassé favorable"
};

/**
 * « Où en est-on ? », à la date choisie.
 *
 * Trois colonnes, et la troisième est la raison d'être de l'écran : un avis
 * disparu sans explication n'est ni ouvert ni levé. C'est une question à poser.
 */
function renderStatusView(state) {
  const { avisStatus, statusCounts, chronology } = state.result;

  if (avisStatus.length === 0) {
    return `<p class="ctlab__empty">Aucun avis numéroté dans les documents retenus.</p>`;
  }

  const rows = avisStatus
    .map((summary) => {
      const months = summary.age_days === null ? null : Math.round(summary.age_days / 30);
      const selected = state.selectedReference === summary.reference;
      return `
        <tr class="${selected ? "ctlab__row--selected" : ""}">
          <td>
            <button type="button" class="ctlab__link" data-ctlab-trace="${escapeHtml(summary.reference)}">
              <b>${escapeHtml(summary.reference)}</b>
            </button>
          </td>
          <td><span class="ctlab__badge ctlab__badge--${escapeHtml(summary.status)}">${escapeHtml(STATUS_LABELS[summary.status])}</span></td>
          <td>${escapeHtml(RESOLUTION_LABELS[summary.resolution_reason] ?? "")}</td>
          <td>${escapeHtml(summary.raised_at ?? "?")}</td>
          <td>${months === null ? "—" : `${months} mois`}</td>
          <td>${escapeHtml(documentLabel(summary.last_seen_document_id))}</td>
          <td>${summary.evidence?.sentence ? escapeHtml(truncate(summary.evidence.sentence, 90)) : ""}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="ctlab__toolbar">
      <span class="ctlab__hint">${chronology.ordered_source_ids.length} document(s) retenu(s)${
        chronology.excluded_by_date > 0 ? `, ${chronology.excluded_by_date} écarté(s) car postérieur(s)` : ""
      }</span>
      <span class="ctlab__spacer"></span>
      ${renderTimeTravelControl(state)}
    </div>
    <div class="ctlab__kpis">
      <div class="ctlab__kpi"><b>${statusCounts.OPEN}</b><span>ouverts</span></div>
      <div class="ctlab__kpi"><b>${statusCounts.NO_NEWS}</b><span>sans nouvelles${
        statusCounts.NO_NEWS > 0 ? "<br>— à demander au contrôleur" : ""
      }</span></div>
      <div class="ctlab__kpi"><b>${statusCounts.RESOLVED}</b><span>levés, avec preuve</span></div>
    </div>
    <div class="ctlab__scroll">
      <table class="ctlab__grid">
        <thead>
          <tr><th>N°</th><th>État</th><th>Motif</th><th>Soulevé le</th><th>Ancienneté</th><th>Vu pour la dernière fois</th><th>Preuve</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/**
 * « Que savait-on à telle date ? »
 *
 * Ce mode a été subi avant d'être voulu : une date saisie au passage avait
 * arrêté toute une analyse au 13/05/2026 sans que rien ne le dise autrement
 * qu'en gris. Il s'active donc explicitement, et tant qu'il est actif un
 * bandeau le rappelle en haut de page.
 */
function renderTimeTravelControl(state) {
  if (!state.timeTravel) {
    return `<button type="button" class="ctlab__link" data-ctlab-time-travel="on">Remonter le temps…</button>`;
  }

  const selectedDate = parseSharedDateInputValue(state.asOf);
  const view = state.asOfView ?? currentCalendarView(selectedDate);

  return `
    <span class="ctlab__hint">État arrêté au</span>
    ${renderSharedDatePicker({
      idBase: "ctlabAsOf",
      value: state.asOf,
      selectedDate,
      viewYear: view.year,
      viewMonth: view.month,
      isOpen: state.asOfPickerOpen === true,
      placeholder: "Choisir une date",
      inputLabel: formatSharedDateInputValue(selectedDate) || "Choisir une date",
      calendarLabel: "Date à laquelle arrêter l'état des avis"
    })}
    <button type="button" class="ctlab__link" data-ctlab-time-travel="off">Revenir à aujourd'hui</button>
  `;
}

function currentCalendarView(date) {
  const base = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return { year: base.getFullYear(), month: base.getMonth() };
}

/** Tant qu'une date est active, la page entière doit le dire. */
function renderTimeTravelBanner(state) {
  if (!state.result || !state.result.chronology?.as_of) return "";

  const excluded = state.result.chronology.excluded_by_date;
  return `
    <div class="ctlab__alert ctlab__alert--attention">
      <b>État arrêté au ${escapeHtml(state.result.chronology.as_of)}.</b>
      ${excluded > 0 ? `${excluded} document(s) postérieur(s) sont écartés de toute l'analyse.` : "Aucun document n'est postérieur à cette date."}
      <button type="button" class="ctlab__link" data-ctlab-time-travel="off">Revenir à aujourd'hui</button>
    </div>
  `;
}

function renderAlerts(alerts) {
  if (alerts.length === 0) {
    return `<p class="ctlab__empty">Aucune alerte d'extraction.</p>`;
  }

  return alerts
    .map(
      (alert) => `
        <div class="ctlab__alert ${alert.level === "attention" ? "ctlab__alert--attention" : ""}">
          <b>${escapeHtml(documentLabel(alert.sourceId))}</b> — ${escapeHtml(alert.message)}
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
        (previous ? `<div class="ctlab__change">vu pour la dernière fois dans ${escapeHtml(documentLabel(previous))}</div>` : "");
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

function renderDetail(cell) {
  if (!cell) return "";

  const extraction = cell.extraction;
  const continuity = cell.continuity;
  const provenance = extraction?.provenance ?? continuity?.provenance ?? null;

  const candidates = extraction?.candidates ?? continuity?.candidates ?? [];

  return `
    <div class="ctlab__detail">
      <h4>${escapeHtml(cell.reference)} — ${escapeHtml(documentLabel(cell.documentId))}</h4>
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
            ? `${escapeHtml(documentLabel(provenance.source_id))} · page ${provenance.page ?? "?"}
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
          ${continuity?.value?.previous_document_id ? ` depuis ${escapeHtml(documentLabel(continuity.value.previous_document_id))}` : ""}
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
                  <td>${escapeHtml(documentLabel(statement.source_document_id))}</td>
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
              <button type="button" class="gh-btn gh-btn--sm" data-ctlab-export-text="${escapeHtml(report.sourceId)}">
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
      <button type="button" class="gh-btn gh-btn--sm gh-btn--primary" data-ctlab-apply-patterns>Appliquer et réanalyser</button>
      <button type="button" class="gh-btn gh-btn--sm" data-ctlab-reset-patterns>Revenir aux motifs par défaut</button>
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

  // Deux mille six cent quatre-vingt-huit lignes d'un coup figent la page :
  // on n'en construit qu'une page à la fois.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(state.avisPage, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  const rows = visible
    .map((avis) => {
      const code = avis.value?.opinion_raw ?? avis.opinion_raw ?? "?";
      const reference = avis.value?.external_reference_raw;

      return `
        <tr>
          <td>${escapeHtml(documentLabel(avis.provenance?.source_id))}</td>
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
    <h3>Tous les avis identifiés</h3>
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
      <span class="ctlab__hint">${filtered.length} retenu(s)</span>
    </div>
    <div class="ctlab__scroll">
      <table class="ctlab__grid">
        <thead>
          <tr><th>Rapport</th><th>Page</th><th>N°</th><th>Section</th><th>Intitulé</th><th>Avis</th><th>Commentaire</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${renderPager(page, pageCount, start + visible.length, filtered.length)}
  `;
}

function renderPager(page, pageCount, shown, total) {
  if (total === 0) return `<p class="ctlab__empty">Aucun avis ne correspond à ce filtre.</p>`;
  if (pageCount === 1) return "";

  return `
    <div class="ctlab__actions">
      <button type="button" class="gh-btn gh-btn--sm" data-ctlab-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Précédents</button>
      <span class="ctlab__hint">${shown} / ${total} — page ${page} sur ${pageCount}</span>
      <button type="button" class="gh-btn gh-btn--sm" data-ctlab-page="${page + 1}" ${page >= pageCount ? "disabled" : ""}>Suivants</button>
    </div>
  `;
}

/**
 * Un onglet à la fois.
 *
 * Sur un chantier réel, un seul écran contenait 206 avis suivis, 118 colonnes,
 * 2 688 lignes et 175 suggestions : cent mille nœuds, illisibles et trop lourds
 * pour le navigateur. Chaque section vit maintenant dans son onglet, et n'est
 * construite que si on l'ouvre.
 */
function renderResults(state) {
  if (state.error) {
    return `<div class="ctlab__section"><div class="ctlab__alert">${escapeHtml(state.error)}</div></div>`;
  }
  if (state.running || state.loading) return "";
  if (!state.result) {
    return `<div class="ctlab__section"><p class="ctlab__empty">Déposer des documents, puis lancer l'analyse.</p></div>`;
  }

  switch (state.activeTab) {
    case "documents":
      return `
        <div class="ctlab__section">
          <h3>Chronologie et complétude du lot</h3>
          ${renderChronology(state)}
        </div>
        <div class="ctlab__section">
          <h3>Documents chargés</h3>
          ${renderDocumentList(state)}
        </div>
      `;
    case "avis":
      return `<div class="ctlab__section">${renderAvisTable(state)}</div>`;
    case "evidence":
      return `
        ${renderClearances(state)}
        <div class="ctlab__section">
          <h3>Levées déclarées dans les documents</h3>
          ${renderLiftings(state)}
        </div>
        <div class="ctlab__section">
          <h3>Désaccords d'identité</h3>
          ${renderDisagreements(state)}
        </div>
      `;
    case "technical":
      return `${renderDetails(state)}${renderExports()}`;
    case "state":
    default:
      return `
        <div class="ctlab__section">
          ${renderStatusView(state)}
        </div>
        ${renderAvisTrace(state)}
      `;
  }
}

function renderExports() {
  return `
    <div class="ctlab__section">
      <h3>Exports</h3>
      <p class="ctlab__hint">
        <b>Exporter tout</b> réunit dans un seul fichier les sources paginées, la chronologie, les avis lus,
        la continuité, les indicateurs, les garde-fous et le rapport. Il contient le texte intégral des
        rapports : à ne transmettre qu'à qui a le droit de les lire.
      </p>
      <div class="ctlab__actions">
        <button type="button" class="gh-btn gh-btn--sm gh-btn--primary" data-ctlab-export="all">Exporter tout (JSON)</button>
        <button type="button" class="gh-btn gh-btn--sm" data-ctlab-export="avis-csv">Tableau des avis (CSV)</button>
        <button type="button" class="gh-btn gh-btn--sm" data-ctlab-export="status-csv">État des avis (CSV)</button>
        <button type="button" class="gh-btn gh-btn--sm" data-ctlab-export="case">Exporter le cas (JSON)</button>
        <button type="button" class="gh-btn gh-btn--sm" data-ctlab-export="report">Rapport (Markdown)</button>
      </div>
    </div>
  `;
}

/**
 * La vie d'un avis, un avis à la fois.
 *
 * La matrice complète — une ligne par avis, une colonne par document — comptait
 * 24 308 cases sur le corpus réel. Personne ne lit ça. On sélectionne un avis
 * dans le tableau d'état et on suit son parcours document par document.
 */
function renderAvisTrace(state) {
  const reference = state.selectedReference;
  if (!reference) return "";

  const row = state.result.timeline.find((entry) => entry.reference === reference);
  if (!row) return "";

  const summary = state.result.avisStatus.find((entry) => entry.reference === reference) ?? null;
  const steps = row.cells
    .map((cell, index) => ({ cell, document: state.result.sources[index] }))
    .filter(({ cell }) => cell.continuity || cell.extraction);

  return `
    <div class="ctlab__section">
      <h3>Avis n° ${escapeHtml(reference)} — son parcours</h3>
      ${summary ? `<p class="ctlab__hint">Soulevé dans ${escapeHtml(documentLabel(summary.raised_in))} le ${escapeHtml(summary.raised_at ?? "?")}.</p>` : ""}
      <div class="ctlab__scroll">
        <table class="ctlab__grid">
          <thead><tr><th>Émis le</th><th>Document</th><th>Ce que dit ce document</th></tr></thead>
          <tbody>
            ${steps
              .map(
                ({ cell, document }) => `
                  <tr>
                    <td>${escapeHtml(document?.issued_at ?? "—")}</td>
                    <td>${escapeHtml(documentLabel(cell.documentId))}</td>
                    <td>${renderCell(cell)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div data-ctlab-detail></div>
    </div>
  `;
}

/** Les clôtures globales : une phrase qui vaut pour tout le dossier. */
function renderClearances(state) {
  const clearances = state.result.globalClearances ?? [];
  if (clearances.length === 0) return "";

  return `
    <div class="ctlab__section">
      <h3>Clôture générale déclarée</h3>
      <p class="ctlab__hint">
        Un rapport final peut clore l'ensemble du dossier d'une seule phrase. C'est la preuve la plus
        forte du lot : tous les avis qui la précèdent sont réputés suivis d'effet, à la date de ce rapport.
      </p>
      ${clearances
        .map(
          (clearance) => `
            <div class="ctlab__alert ctlab__alert--info">
              <b>${escapeHtml(documentLabel(clearance.source_document_id))}</b>, page ${clearance.source_page ?? "?"} —
              « ${escapeHtml(clearance.sentence)} »
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

/** Deux identités qui se contredisent : à trancher par un humain. */
function renderDisagreements(state) {
  const disagreements = state.result.identityDisagreements ?? [];
  if (disagreements.length === 0) {
    return `<p class="ctlab__empty">Aucun désaccord entre le numéro et l'intitulé.</p>`;
  }

  return `
    <p class="ctlab__hint">
      Le même intitulé porte deux numéros différents d'un document à l'autre. Aucun rapprochement n'a été
      retenu : deviner lequel est le bon reviendrait à inventer une identité.
    </p>
    <div class="ctlab__scroll">
      <table class="ctlab__grid">
        <thead><tr><th>N°</th><th>Autre n°</th><th>Document</th><th>Intitulé</th></tr></thead>
        <tbody>
          ${disagreements
            .map(
              (entry) => `
                <tr>
                  <td>${escapeHtml(entry.reference)}</td>
                  <td>${escapeHtml(entry.other_reference)}</td>
                  <td>${escapeHtml(documentLabel(entry.document_id))}</td>
                  <td>${escapeHtml(truncate(entry.title ?? "", 120))}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Diagnostic : ce qui sert à comprendre pourquoi le moteur voit ce qu'il voit.
 * Rangé derrière un lien, parce que ce n'est pas la réponse — c'est l'enquête.
 */
function renderDetails(state) {
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
      <h3>Suggestions</h3>
      ${renderSuggestions(state.result.suggestions)}
    </div>
    <div class="ctlab__section">
      <h3>Texte extrait</h3>
      ${renderExtractedText(state)}
    </div>
    <div class="ctlab__section">
      <h3>Motifs d'extraction</h3>
      ${renderPatternEditor(state)}
    </div>
  `;
}

/**
 * Le travail en cours, écrit ligne à ligne.
 *
 * Cent dix-neuf PDF, ça prend du temps ; un écran immobile pendant ce temps-là
 * ne se distingue pas d'une page plantée. Chaque étape franchie reste
 * affichée : on voit ce qui a été fait, pas seulement qu'on attend.
 */
function renderProgress(state) {
  const { loading, running, stages } = state;
  if (!loading && !running) return "";

  const lines = stages.map((stage, index) => {
    const isLast = index === stages.length - 1;
    return `
      <li class="ctlab__stage ${isLast ? "ctlab__stage--current" : "ctlab__stage--done"}">
        <span class="ctlab__stage-mark" aria-hidden="true">${isLast ? `<span class="ctlab__spinner"></span>` : "✓"}</span>
        <span>${escapeHtml(stage.label)}</span>
        ${stage.detail ? `<span class="ctlab__stage-detail">${escapeHtml(stage.detail)}</span>` : ""}
      </li>
    `;
  });

  const title = loading
    ? `Lecture des documents — ${loading.done}/${loading.total}`
    : "Analyse en cours";

  return `
    <div class="ctlab__section" role="status" aria-live="polite">
      <h3>${escapeHtml(title)}</h3>
      ${loading ? renderProgressBar(loading.done, loading.total) : ""}
      <ul class="ctlab__stages">${lines.join("")}</ul>
    </div>
  `;
}

/** L'en-tête d'utilitaire de l'Atelier : titre à gauche, actions à droite. */
function renderHeader(state) {
  const loaded = state.reports.filter((report) => !report.error).length;
  const busy = Boolean(state.running || state.loading);

  return `
    <div class="settings-card__head studio-tool-card__head">
      <div>
        <span class="settings-card__head-title">
          <h4>Suivi des avis du Bureau de Contrôle</h4>
          <div class="studio-tool-card__actions">
            ${renderGhActionButton({
              id: "ctlabReset",
              label: "Tout réinitialiser",
              tone: "default",
              size: "md",
              disabled: state.reports.length === 0 || busy,
              mainAction: ""
            })}
            ${renderGhActionButton({
              id: "ctlabRun",
              label: `${state.result ? "Recalculer" : "Analyser"} ${loaded} document${loaded > 1 ? "s" : ""}`,
              tone: "primary",
              size: "md",
              disabled: loaded === 0 || busy,
              mainAction: ""
            })}
          </div>
        </span>
      </div>
    </div>
  `;
}

function render(root, state) {
  DOCUMENT_LABELS = new Map(
    state.reports.map((report) => [report.sourceId, report.filename ?? report.sourceId])
  );

  const tabs = TABS.map((tab) => ({ ...tab, label: tabLabel(tab, state) }));

  root.innerHTML = `
    <style>${STYLE}</style>
    <section class="settings-section is-active ctlab">
      <div class="settings-card settings-card--param studio-tool-card">
        ${renderHeader(state)}
        <div class="settings-card__body studio-tool-card__body">
          ${renderTimeTravelBanner(state)}
          ${renderDropZone(state)}
          ${renderProgress(state)}
          ${state.result ? renderLightTabs({ tabs, activeTabId: state.activeTab, ariaLabel: "Sections du suivi" }) : ""}
          <div data-ctlab-results>${renderResults(state)}</div>
        </div>
      </div>
    </section>
  `;
}

/** Un onglet porte son effectif : on sait ce qu'il y a derrière avant d'y aller. */
export function tabLabel(tab, state) {
  const result = state.result;
  if (!result) return tab.label;
  const counts = {
    documents: result.chronology?.ordered_source_ids?.length ?? 0,
    avis: collectAvis(result.predictions).length,
    evidence: (result.liftingStatements?.length ?? 0) + (result.globalClearances?.length ?? 0)
  };
  return counts[tab.id] === undefined ? tab.label : `${tab.label} (${counts[tab.id]})`;
}

export function renderCtContinuityLab(root) {
  if (!root) return;

  const state = {
    reports: [],
    result: null,
    running: false,
    loading: null,
    /** Étapes franchies, la dernière étant celle en cours. */
    stages: [],
    error: null,
    activeTab: "state",
    selectedCell: null,
    selectedReference: null,
    avisPage: 1,
    /** La remontée dans le temps s'active à la demande, jamais par accident. */
    timeTravel: false,
    asOf: "",
    asOfView: null,
    asOfPickerOpen: false,
    avisFilter: { code: "", documentId: "", numberedOnly: false },
    patternText: DEFAULT_PATTERN_TEXT,
    lexiconText: DEFAULT_LEXICON_TEXT,
    patternErrors: []
  };

  let nextDocumentNumber = 1;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/pdf,.pdf";
  input.multiple = true;
  input.style.display = "none";
  root.appendChild(input);

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

  /** Laisse le navigateur redessiner entre deux fichiers : cent vingt PDF ne
   * doivent pas figer la page pendant plusieurs minutes. */
  const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

  /** Une étape de plus dans le déroulé affiché. */
  const pushStage = (label, detail = null) => {
    state.stages = [...state.stages, { label, detail }];
  };

  const addFiles = async (fileList) => {
    const files = [...fileList].filter((file) => /\.pdf$/i.test(file.name) || file.type === "application/pdf");
    if (files.length === 0) return;

    // Le résultat précédent est retiré avant la boucle, pas après : le
    // reconstruire à chaque fichier chargé, c'est cent dix-neuf fois
    // vingt-quatre mille cellules, et la page se fige.
    state.result = null;
    state.selectedReference = null;
    state.selectedCell = null;
    state.stages = [];
    state.loading = { done: 0, total: files.length, current: null };
    pushStage(`Ouverture de ${files.length} fichier(s)`);
    refresh();

    let added = 0;
    let skipped = 0;

    for (const file of files) {
      state.loading.current = file.name;
      // La dernière étape porte le fichier en cours : le déroulé avance sans
      // s'allonger d'une ligne par PDF.
      state.stages[state.stages.length - 1].detail = file.name;
      refresh();
      await yieldToBrowser();

      // Un même fichier redéposé n'est pas rechargé : le lot s'enrichit, il ne
      // se duplique pas.
      const already = state.reports.some(
        (report) => report.filename === file.name && report.sizeBytes === file.size
      );

      if (already) {
        skipped += 1;
      } else {
        const sourceId = `doc-${nextDocumentNumber}`;
        nextDocumentNumber += 1;
        try {
          const extracted = await extractPagesFromFile(file);
          state.reports.push({ ...extracted, sourceId });
        } catch (error) {
          state.reports.push({ sourceId, filename: file.name, sizeBytes: file.size, pageCount: 0, pages: [], error: error.message });
        }
        added += 1;
      }

      state.loading.done += 1;
      refresh();
    }

    state.stages[state.stages.length - 1].detail =
      `${added} ajouté(s)${skipped > 0 ? `, ${skipped} déjà présent(s)` : ""}`;
    state.loading = null;
    refresh();
  };

  const resetAll = () => {
    state.reports = [];
    state.result = null;
    state.selectedCell = null;
    state.selectedReference = null;
    state.error = null;
    state.stages = [];
    state.timeTravel = false;
    state.asOf = "";
    state.asOfPickerOpen = false;
    state.avisPage = 1;
    state.activeTab = "state";
    refresh();
  };

  /**
   * Le sélecteur de date partagé publie ses propres attributs — déclencheur,
   * navigation de mois, jour choisi. On les traite ici plutôt que de recopier
   * un champ date maison.
   */
  const handleDatePickerClick = (event) => {
    const trigger = event.target.closest("[data-shared-date-input-trigger='ctlabAsOf']");
    if (trigger) {
      state.asOfPickerOpen = !state.asOfPickerOpen;
      state.asOfView = state.asOfView ?? currentCalendarView(parseSharedDateInputValue(state.asOf));
      refresh();
      return true;
    }

    const nav = event.target.closest("[data-shared-date-nav^='ctlabAsOf']");
    if (nav) {
      const delta = nav.getAttribute("data-shared-date-nav").endsWith("next") ? 1 : -1;
      const view = state.asOfView ?? currentCalendarView(parseSharedDateInputValue(state.asOf));
      state.asOfView = shiftSharedCalendarMonth(view.year, view.month, delta);
      refresh();
      return true;
    }

    const day = event.target.closest("[data-shared-date-owner='ctlabAsOf'][data-shared-date-day]");
    if (day) {
      state.asOf = day.getAttribute("data-shared-date-day");
      state.asOfPickerOpen = false;
      state.asOfView = currentCalendarView(parseSharedDateInputValue(state.asOf));
      captureEditors();
      runAnalysis();
      return true;
    }

    return false;
  };

  const runAnalysis = async () => {
    const reports = state.reports.filter((report) => !report.error);
    if (reports.length === 0) return;

    const { params, errors } = buildExtractionParams(state.patternText, state.lexiconText);
    state.patternErrors = errors;
    state.running = true;
    state.error = null;
    state.result = null;
    state.selectedCell = null;
    state.selectedReference = null;
    state.avisPage = 1;
    state.stages = [];
    refresh();

    // Le moteur annonce chaque étape ; on la montre, et on rend la main au
    // navigateur pour qu'il ait le temps de la dessiner.
    let lastStage = null;
    const onProgress = async ({ stage, done, total, label }) => {
      const heading = STAGE_LABELS[stage] ?? stage;
      if (stage !== lastStage) {
        lastStage = stage;
        pushStage(heading);
      }
      const current = state.stages[state.stages.length - 1];
      current.detail = total ? `${done}/${total}${label ? ` — ${label}` : ""}` : label ?? "";
      refresh();
      await yieldToBrowser();
    };

    try {
      state.result = await runCtLab(reports, {
        onProgress,
        params: {
          ...params,
          chronology: state.timeTravel && state.asOf ? { asOf: state.asOf } : {}
        }
      });
    } catch (error) {
      state.result = null;
      state.error = error.message;
    }
    state.running = false;
    state.stages = [];
    refresh();
  };

  input.addEventListener("change", async () => {
    // La liste doit être recopiée avant de vider le champ : `input.value = ""`
    // vide la FileList elle-même, et `files` pointe sur le même objet.
    const files = [...(input.files ?? [])];
    input.value = "";
    if (files.length > 0) await addFiles(files);
  });

  root.addEventListener("dragover", (event) => {
    if (!event.target.closest("[data-ctlab-drop]")) return;
    event.preventDefault();
    event.target.closest("[data-ctlab-drop]").classList.add("is-over");
  });

  root.addEventListener("dragleave", (event) => {
    event.target.closest("[data-ctlab-drop]")?.classList.remove("is-over");
  });

  root.addEventListener("drop", async (event) => {
    const zone = event.target.closest("[data-ctlab-drop]");
    if (!zone) return;
    event.preventDefault();
    zone.classList.remove("is-over");
    if (event.dataTransfer?.files) await addFiles(event.dataTransfer.files);
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
    // Les onglets et le sélecteur de date sont des composants de l'application :
    // ils arrivent avec leurs propres attributs, traités avant les nôtres.
    const tab = event.target.closest("[data-light-tab-target]");
    if (tab) {
      captureEditors();
      state.activeTab = tab.getAttribute("data-light-tab-target");
      state.avisPage = 1;
      state.asOfPickerOpen = false;
      refresh();
      return;
    }

    if (handleDatePickerClick(event)) return;

    const target = event.target.closest(
      "[data-ctlab-pick], [data-ctlab-remove], [data-ctlab-cell], [data-ctlab-trace], [data-ctlab-page], " +
        "[data-ctlab-export], [data-ctlab-export-text], [data-ctlab-apply-patterns], [data-ctlab-reset-patterns], " +
        "[data-ctlab-time-travel], [data-action-id='ctlabRun'], [data-action-id='ctlabReset']"
    );
    if (!target) return;

    if (target.dataset.actionId === "ctlabRun") {
      captureEditors();
      await runAnalysis();
      return;
    }

    if (target.dataset.actionId === "ctlabReset") {
      resetAll();
      return;
    }

    if (target.dataset.ctlabPick !== undefined) {
      input.click();
      return;
    }

    if (target.dataset.ctlabTimeTravel !== undefined) {
      captureEditors();
      const turningOn = target.dataset.ctlabTimeTravel === "on";
      state.timeTravel = turningOn;
      state.asOfPickerOpen = turningOn;
      if (!turningOn && state.asOf) {
        state.asOf = "";
        await runAnalysis();
        return;
      }
      state.asOf = turningOn ? state.asOf : "";
      refresh();
      return;
    }

    if (target.dataset.ctlabTrace !== undefined) {
      state.selectedReference =
        state.selectedReference === target.dataset.ctlabTrace ? null : target.dataset.ctlabTrace;
      state.selectedCell = null;
      refresh();
      return;
    }

    if (target.dataset.ctlabPage !== undefined) {
      captureEditors();
      state.avisPage = Number(target.dataset.ctlabPage);
      refresh();
      return;
    }

    if (target.dataset.ctlabRemove !== undefined) {
      state.reports = state.reports.filter((report) => report.sourceId !== target.dataset.ctlabRemove);
      state.result = null;
      state.selectedCell = null;
      state.selectedReference = null;
      refresh();
      return;
    }

    if (target.dataset.ctlabExportText !== undefined) {
      const report = state.reports.find((entry) => entry.sourceId === target.dataset.ctlabExportText);
      if (!report) return;
      download(
        `${report.sourceId}-texte-extrait.txt`,
        report.pages.map((page) => `----- page ${page.page} -----\n${page.text}`).join("\n\n"),
        "text/plain"
      );
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
      await runAnalysis();
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
      } else if (kind === "avis-csv") {
        download("avis.csv", toAvisCsv(state.result), "text/csv;charset=utf-8");
      } else if (kind === "status-csv") {
        download("etat-des-avis.csv", toStatusCsv(state.result), "text/csv;charset=utf-8");
      } else {
        download("report.md", state.result.reportMarkdown, "text/markdown");
      }
      return;
    }

  });

  refresh();
}
