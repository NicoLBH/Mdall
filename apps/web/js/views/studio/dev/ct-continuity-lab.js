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

import { store } from "../../../store.js";
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
import { bindGhActionButtons, renderGhActionButton } from "../../ui/gh-split-button.js";
import { renderLightTabs } from "../../ui/light-tabs.js";
import { paginateItems, renderPaginationControls } from "../../ui/pagination.js";
import { svgIcon } from "../../../ui/icons.js";
import { getNiceChartTicks, renderSvgLineChart } from "../../../utils/svg-line-chart.js";
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
  { id: "indicators", label: "Indicateurs" },
  { id: "evidence", label: "Preuves" },
  { id: "technical", label: "Qualité de lecture" }
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

/**
 * Premier texte réellement présent.
 *
 * L'extraction rend `""` — pas `null` — quand elle n'a rien lu. `??` ne se
 * déclenche donc pas, et 290 intitulés sur 1 024 s'affichaient vides sur un
 * corpus réel, sans que rien ne dise pourquoi.
 */
export function firstText(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text !== "") return text;
  }
  return "";
}

function documentLabel(sourceId) {
  if (!sourceId) return "—";
  return DOCUMENT_LABELS.get(sourceId) ?? sourceId;
}

/**
 * `2025-09-12` se lit mal sur un dossier français. Les dates restent en ISO
 * dans les données et les exports — triables, non ambiguës — et ne passent au
 * format du métier qu'au moment de s'afficher.
 */
function formatDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "—";
}

/**
 * Le code d'avis porte une couleur, et cette couleur dit une action : vert on
 * peut avancer, orange en attente, rouge il faut reprendre, gris rien à faire,
 * bleu pour information. L'application n'en définissait aucune ; celles-ci
 * s'appuient sur ses jetons de statut.
 */
const OPINION_TONES = {
  F: "ok",
  C: "ok",
  SO: "neutral",
  HM: "neutral",
  PM: "info",
  S: "pending",
  D: "danger",
  NC: "danger"
};

const OPINION_LABEL_TONES = {
  FAVORABLE: "ok",
  CONFORME: "ok",
  "SANS OBJET": "neutral",
  "HORS MISSION": "neutral",
  "POUR MEMOIRE": "info",
  SUSPENDU: "pending",
  DEFAVORABLE: "danger",
  "NON CONFORME": "danger"
};

/**
 * Deux pictogrammes que le sprite de l'application ne porte pas, parce qu'ils
 * n'existent que dans ce métier : un avis suspendu attend une réponse, un avis
 * défavorable ou non conforme exige une reprise. Les tracés sont ceux du
 * sprite — l'anneau de `issue-opened`, le triangle de `alert` — complétés du
 * signe qui les distingue.
 */
function pendingIcon() {
  return `
    <svg class="ui-icon octicon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
      <text x="8" y="11.6" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor">?</text>
    </svg>
  `;
}

function blockingIcon() {
  return `
    <svg class="ui-icon octicon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>
    </svg>
  `;
}

/**
 * L'icône d'une ligne d'avis : elle dit ce qu'il faut en faire, avant même
 * qu'on ait lu l'intitulé.
 */
function avisIcon(code, label = null) {
  const tone = opinionTone(code, label);
  if (tone === "danger") {
    return `<span class="issue-status-icon" style="color: var(--fgColor-danger)">${blockingIcon()}</span>`;
  }
  if (tone === "pending") {
    return `<span class="issue-status-icon" style="color: var(--ctlab-warn)">${pendingIcon()}</span>`;
  }
  if (tone === "ok") {
    return `<span class="issue-status-icon" style="color: var(--fgColor-open)">${svgIcon("check-circle", { className: "octicon" })}</span>`;
  }
  return `<span class="issue-status-icon" style="color: var(--muted)">${svgIcon("issue-opened", { className: "octicon" })}</span>`;
}

/**
 * Une ligne d'avis, dans la grammaire du tableau des sujets.
 *
 * Même structure, mêmes classes : `issue-row` pose les colonnes et l'unique
 * filet horizontal — pas de trait vertical —, `issue-row-title-grid` empile
 * l'intitulé cliquable, les métadonnées et le commentaire. Trois lignes au lieu
 * de deux : le commentaire du contrôleur mérite sa place.
 *
 * @param {object} avis      code, libellé, intitulé, commentaire, méta
 * @param {string|null} tag  état de l'avis, rendu comme un label de sujet
 */
function renderAvisRow({ reference, traceKey, code, label, title, meta, seenIn, comment, tag, tagStatus, evidence }) {
  const target = traceKey ?? reference;

  return `
    <div class="issue-row ctlab__row">
      <div class="cell ctlab__row-main">
        <span class="issue-row-title-grid ctlab__row-grid">
          <span class="issue-row-title-grid__status">${avisIcon(code, label)}</span>
          <span class="issue-row-title-grid__title issue-row-subject-title-line">
            ${
              target
                ? `<button type="button" class="row-title-trigger theme-text" data-ctlab-trace="${escapeHtml(target)}">${escapeHtml(title)}</button>`
                : `<span class="theme-text">${escapeHtml(title)}</span>`
            }
            ${
              tag
                ? `<span class="issue-row-subject-labels"><span class="subject-label-badge ctlab__tag ctlab__tag--${escapeHtml(tagStatus ?? "")}">${escapeHtml(titleCase(tag))}</span></span>`
                : ""
            }
          </span>
          <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${escapeHtml(meta)}</span>
          ${
            seenIn
              ? `<span class="ctlab__row-line issue-row-meta-text ctlab__ellipsis" title="${escapeHtml(seenIn)}">${escapeHtml(seenIn)}</span>`
              : ""
          }
          ${comment ? `<span class="ctlab__row-line issue-row-meta-text ctlab__clamp">${escapeHtml(truncate(comment, 320))}</span>` : ""}
          ${
            evidence
              ? `<span class="ctlab__row-line ctlab__row-evidence">
                   <span class="ctlab__dot ctlab__dot--ok" aria-hidden="true"></span>
                   <span class="issue-row-meta-text">${escapeHtml(truncate(evidence, 260))}</span>
                 </span>`
              : ""
          }
        </span>
      </div>
    </div>
  `;
}

/** « OUVERT » crie ; « Ouvert » se lit. */
export function titleCase(value) {
  return String(value ?? "")
    .toLocaleLowerCase("fr")
    .split(" ")
    .map((word) => (word.length === 0 ? word : word[0].toLocaleUpperCase("fr") + word.slice(1)))
    .join(" ");
}

function opinionTone(code, label = null) {
  const byCode = OPINION_TONES[String(code ?? "").toUpperCase()];
  if (byCode) return byCode;

  // Un rapport lu ligne à ligne écrit le libellé en toutes lettres, sans code.
  const key = String(label ?? code ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return OPINION_LABEL_TONES[key] ?? "unknown";
}

/**
 * Le moteur n'a pas su lire le code : ce n'est pas un code, c'est une
 * abstention. L'afficher comme « ? » laissait croire à un avis exotique.
 */
const ABSTENTION_CODE = "?";

function opinionLabel(entry) {
  if (entry.code === ABSTENTION_CODE) return "sans code lisible — abstention";
  return entry.label ? `${entry.code} (${entry.label})` : entry.code;
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
.ctlab__kpis { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
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
/* Pastilles de code d'avis : la couleur dit l'action attendue, pas le code. */
.ctlab__dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: -1px;
  background: var(--ctlab-muted);
}
.ctlab__dot--ok { background: var(--ctlab-ok); }
.ctlab__dot--pending { background: var(--ctlab-warn); }
.ctlab__dot--danger { background: var(--ctlab-danger); }
.ctlab__dot--info { background: var(--ctlab-info); }
.ctlab__dot--neutral { background: var(--ctlab-muted); }
.ctlab__dot--unknown { background: transparent; border: 1px dashed var(--ctlab-muted); }

/* Répartition en une barre, comme les langages d'un dépôt. */
.ctlab__breakdown { margin: 0 0 16px; }
.ctlab__breakdown-bar {
  display: flex;
  height: 8px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--ctlab-line);
}
.ctlab__breakdown-segment { display: block; height: 100%; }
.ctlab__breakdown-segment--ok { background: var(--ctlab-ok); }
.ctlab__breakdown-segment--pending { background: var(--ctlab-warn); }
.ctlab__breakdown-segment--danger { background: var(--ctlab-danger); }
.ctlab__breakdown-segment--info { background: var(--ctlab-info); }
.ctlab__breakdown-segment--neutral { background: var(--ctlab-muted); }
.ctlab__breakdown-segment--unknown { background: repeating-linear-gradient(45deg, var(--ctlab-muted) 0 3px, transparent 3px 6px); }
.ctlab__breakdown-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.ctlab__breakdown-legend li { display: flex; align-items: baseline; gap: 4px; }

/* Filtres sur une ligne, sans déborder de leur conteneur. */
.ctlab__filters {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  margin: 0 0 12px;
}
.ctlab__select {
  max-width: 220px;
  border: 1px solid var(--ctlab-line);
  background: var(--bg-input, rgb(21, 27, 35));
  color: var(--ctlab-text);
  border-radius: var(--radius, 6px);
  padding: 4px 8px;
  font: inherit;
}
.ctlab__select--wide { max-width: 360px; }

/* Lignes de tableau à la manière des sujets : intitulé cliquable, reste en petit. */
.ctlab__title-cell { max-width: 0; }
.ctlab__title-cell .row-title-trigger { font-size: 13px; }
.ctlab__title-static { color: var(--ctlab-text); font-weight: 600; }
.ctlab__row-comment {
  color: var(--ctlab-muted);
  font-size: 12px;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Retour arrière et frise de vie d'un avis. */
.ctlab__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 0;
  padding: 0;
  margin-bottom: 12px;
  font: inherit;
  color: var(--ctlab-muted);
  cursor: pointer;
}
.ctlab__back:hover { color: var(--ctlab-info); }
.ctlab__trace-head { display: flex; align-items: center; gap: 10px; }
.ctlab__trace-head h3 { margin: 0; }
.ctlab__pipeline { list-style: none; margin: 16px 0 0; padding: 0; }
.ctlab__pipeline-step {
  display: flex;
  gap: 12px;
  padding: 0 0 18px;
  position: relative;
}
/* Le trait qui relie les étapes, sauf après la dernière. */
.ctlab__pipeline-step::before {
  content: "";
  position: absolute;
  left: 11px;
  top: 24px;
  bottom: 0;
  width: 2px;
  background: var(--ctlab-line);
}
.ctlab__pipeline-step:last-child { padding-bottom: 0; }
.ctlab__pipeline-step:last-child::before { display: none; }
.ctlab__pipeline-mark {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ctlab-line);
  background: var(--headbgtight, #151b23);
  color: var(--ctlab-muted);
  z-index: 1;
}
.ctlab__pipeline-step--ok .ctlab__pipeline-mark { color: var(--ctlab-ok); border-color: var(--ctlab-ok); }
.ctlab__pipeline-step--pending .ctlab__pipeline-mark { color: var(--ctlab-warn); border-color: var(--ctlab-warn); }
.ctlab__pipeline-step--info .ctlab__pipeline-mark { color: var(--ctlab-info); border-color: var(--ctlab-info); }
.ctlab__pipeline-body { min-width: 0; flex: 1 1 auto; }
.ctlab__pipeline-title { font-weight: 600; }
.ctlab__pipeline-detail { margin-top: 6px; }
.ctlab__pipeline-title { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; font-weight: 400; min-width: 0; }
.ctlab__pipeline-date { white-space: nowrap; }
.ctlab__pipeline-headline { font-weight: 700; color: var(--ctlab-text); overflow-wrap: anywhere; }
.ctlab__pipeline-headline--muted { font-weight: 400; color: var(--ctlab-muted); }
.ctlab__pipeline-line { margin-top: 3px; min-width: 0; }
/* Un commentaire de plusieurs centaines de caractères ne doit pas pousser la
   frise hors de son cadre. */
.ctlab__pipeline-text { overflow-wrap: anywhere; white-space: normal; }
.ctlab__pipeline-rephrased { color: var(--ctlab-info); }
.ctlab__tag--muted { --subject-label-border: var(--ctlab-line); --subject-label-fg: var(--ctlab-muted); --subject-label-bg: transparent; }
.ctlab__tag--info { --subject-label-border: var(--ctlab-info); --subject-label-fg: var(--ctlab-info); --subject-label-bg: rgba(88, 166, 255, .12); }
.ctlab__tag--ok { --subject-label-border: var(--ctlab-ok); --subject-label-fg: var(--ctlab-ok); --subject-label-bg: rgba(63, 185, 80, .12); }
.ctlab__chart { max-width: 100%; }
.ctlab__charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
@media (max-width: 1000px) { .ctlab__charts { grid-template-columns: minmax(0, 1fr); } }

/* Lignes d'avis : la grammaire du tableau des sujets, sans trait vertical. */
.ctlab__rows { border: 1px solid var(--ctlab-line); border-radius: var(--radius, 6px); overflow: hidden; }
/* Une seule colonne : la preuve descend sur sa propre ligne plutôt que de
   voler la moitié de la largeur au texte. */
.ctlab__row { grid-template-columns: minmax(0, 1fr); align-items: start; }
.ctlab__row-main { min-width: 0; }
.ctlab__row-grid { grid-template-rows: auto; }
.ctlab__row-line { grid-column: 3; min-width: 0; margin-top: 3px; }
.ctlab__ellipsis { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ctlab__clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  overflow-wrap: anywhere;
}
.ctlab__row-evidence { display: block; overflow-wrap: anywhere; }
.ctlab__row .issue-row-title-grid__meta { height: auto; }
.ctlab__tag--OPEN { --subject-label-border: var(--ctlab-warn); --subject-label-fg: var(--ctlab-warn); --subject-label-bg: rgba(210, 153, 34, .12); }
.ctlab__tag--NO_NEWS { --subject-label-border: var(--ctlab-danger); --subject-label-fg: var(--ctlab-danger); --subject-label-bg: rgba(248, 81, 73, .12); }
.ctlab__tag--RESOLVED { --subject-label-border: var(--ctlab-ok); --subject-label-fg: var(--ctlab-ok); --subject-label-bg: rgba(63, 185, 80, .12); }


/* Remonter le temps : une fonction stratégique, pas un lien perdu. */
.ctlab__time-travel { display: inline-flex; align-items: center; gap: 6px; }
.ctlab__time-travel-active {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  border: 1px solid var(--ctlab-warn);
  background: rgba(210, 153, 34, .10);
  border-radius: var(--radius, 6px);
  padding: 6px 10px;
}
.ctlab__milestones { position: relative; }
.ctlab__milestone-menu > summary { list-style: none; cursor: pointer; display: inline-flex; align-items: center; }
.ctlab__milestone-menu > summary::-webkit-details-marker { display: none; }
.ctlab__milestone-list {
  position: absolute;
  z-index: 30;
  margin-top: 4px;
  min-width: 300px;
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid var(--ctlab-line);
  border-radius: var(--radius, 6px);
  background: var(--panel, #0d1117);
  box-shadow: 0 8px 24px rgba(1, 4, 9, .6);
  padding: 4px;
}
.ctlab__milestone {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 2px 10px;
  width: 100%;
  text-align: left;
  border: 0;
  background: none;
  color: var(--ctlab-text);
  font: inherit;
  padding: 6px 8px;
  border-radius: var(--radius, 6px);
  cursor: pointer;
}
.ctlab__milestone:hover { background: rgba(110, 118, 129, .12); }
.ctlab__milestone-date { grid-row: 1 / span 2; color: var(--ctlab-muted); }
.ctlab__milestone-label { font-weight: 600; }
.ctlab__milestone-note { padding: 6px 8px; border-bottom: 1px solid var(--ctlab-line); margin-bottom: 4px; }

/* Constats gradués : le rouge est réservé à ce qui l'exige. */
.ctlab__notice {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 6px 10px;
  margin-bottom: 4px;
  border-radius: var(--radius, 6px);
  border-left: 3px solid var(--ctlab-line);
  color: var(--ctlab-text);
}
.ctlab__notice-icon { flex: 0 0 16px; color: var(--ctlab-muted); }
.ctlab__notice--danger { border-left-color: var(--ctlab-danger); background: rgba(248, 81, 73, .12); }
.ctlab__notice--danger .ctlab__notice-icon { color: var(--ctlab-danger); }
.ctlab__notice--warn { border-left-color: var(--ctlab-warn); background: rgba(210, 153, 34, .12); }
.ctlab__notice--warn .ctlab__notice-icon { color: var(--ctlab-warn); }
.ctlab__notice--info { border-left-color: transparent; background: none; padding-left: 0; }

/* Repli : ce qui est volumineux ne doit pas enterrer ce qui est actionnable. */
.ctlab__fold > summary {
  cursor: pointer;
  color: var(--ctlab-muted);
  padding: 4px 0;
}
.ctlab__fold > summary:hover { color: var(--ctlab-info); }
.ctlab__fold-body { margin-top: 10px; }

/* Un indicateur au vert se voit. */
.ctlab__kpi b { display: flex; align-items: center; gap: 6px; }
.ctlab__kpi--ok b { color: var(--ctlab-ok); }
.ctlab__kpi--warn b { color: var(--ctlab-warn); }
.ctlab__kpi--danger b { color: var(--ctlab-danger); }
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
  border: 1px dashed var(--ctlab-line);
  border-radius: var(--radius, 6px);
  padding: 24px 16px;
  text-align: center;
  margin-bottom: 16px;
}
.ctlab__drop.is-over { border-color: var(--ctlab-info); background: rgba(88, 166, 255, .06); }
.ctlab__drop--loaded { border-style: solid; }
.ctlab__drop-icon { display: block; color: var(--ctlab-muted); margin-bottom: 8px; }
.ctlab__drop--loaded .ctlab__drop-icon { color: var(--ctlab-ok); }
.ctlab__drop-title { display: block; font-size: 16px; color: var(--ctlab-text); }
.ctlab__drop-lead { color: var(--ctlab-muted); margin: 6px auto 0; max-width: 60ch; }
.ctlab__drop-actions { margin-top: 12px; }
.ctlab__drop-note { margin: 12px auto 0; max-width: 70ch; font-size: 12px; }
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

  const loaded = state.reports.filter((report) => !report.error).length;
  const failed = state.reports.length - loaded;

  // Deux états, et l'écran doit dire lequel : sans documents, on invite à en
  // déposer ; avec des documents, on dit combien et ce qu'il reste à faire.
  // Auparavant le texte sous la zone restait « Déposer des documents, puis
  // lancer l'analyse » alors que le bouton annonçait « Analyser 17 documents ».
  const empty = loaded === 0;

  return `
    <div class="ctlab__drop ${empty ? "" : "ctlab__drop--loaded"}" data-ctlab-drop>
      <span class="ctlab__drop-icon" aria-hidden="true">
        ${svgIcon(empty ? "file-pdf" : "file-directory", { className: "octicon", width: 24, height: 24 })}
      </span>
      <b class="ctlab__drop-title">
        ${
          empty
            ? "Aucun document chargé"
            : `${loaded} document${loaded > 1 ? "s" : ""} chargé${loaded > 1 ? "s" : ""}`
        }
      </b>
      <div class="ctlab__drop-lead">
        ${
          empty
            ? "Déposez ici les livrables du bureau de contrôle — autant de fichiers que nécessaire, dans n'importe quel ordre."
            : `Vous pouvez en ajouter d'autres, ou lancer l'analyse.${failed > 0 ? ` ${failed} fichier(s) illisible(s).` : ""}`
        }
      </div>
      <div class="ctlab__drop-actions">
        <button type="button" class="gh-btn gh-btn--sm" data-ctlab-pick>
          ${empty ? "Choisir des fichiers…" : "Ajouter des fichiers…"}
        </button>
      </div>
      <div class="ctlab__hint ctlab__drop-note">
        Les PDF sont lus <b>dans ce navigateur</b> : rien n'est envoyé, rien n'est enregistré,
        aucun sujet Mdall n'est créé ni modifié. Fermer l'onglet efface tout.
      </div>
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
          <td>${meta?.issued_at ? escapeHtml(formatDate(meta.issued_at)) : `<span class="ctlab__empty">date inconnue</span>`}</td>
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
                    <td>${escapeHtml(formatDate(entry.issued_at))}</td>
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
/**
 * Ce que les documents disent d'un avis, indexé par son numéro.
 *
 * La dernière occurrence gagne : c'est la formulation la plus récente que
 * l'organisme ait donnée de cet avis, et c'est celle qu'on lit dans un dossier.
 */
function buildAvisContext(result) {
  const order = new Map(result.sources.map((source, index) => [source.source_id, index]));
  const context = new Map();

  for (const avis of collectAvis(result.predictions)) {
    const reference = avis.value?.external_reference_raw;
    if (!reference) continue;

    const position = order.get(avis.provenance?.source_id) ?? -1;
    const previous = context.get(reference);
    if (previous && previous.position > position) continue;

    context.set(reference, {
      position,
      code: avis.value?.opinion_raw ?? avis.opinion_raw ?? null,
      label: avis.opinion_label ?? null,
      // Un rapport en colonnes porte un intitulé ; un rapport lu ligne à ligne
      // n'a que son commentaire. On prend ce qui existe plutôt que rien.
      title: firstText(avis.title_raw, avis.description_raw) || null,
      comment: firstText(avis.description_raw) || null
    });
  }

  return context;
}

function renderStatusView(state) {
  const { avisStatus, statusCounts, chronology } = state.result;

  if (avisStatus.length === 0) {
    return `<p class="ctlab__empty">Aucun avis numéroté dans les documents retenus.</p>`;
  }

  // Un numéro seul ne dit rien. Chaque ligne porte le code d'avis, son
  // intitulé, et le commentaire du contrôleur en seconde ligne — la même
  // lecture que le tableau des sujets.
  const context = buildAvisContext(state.result);

  const rows = avisStatus
    .map((summary) => {
      const months = summary.age_days === null ? null : Math.round(summary.age_days / 30);
      const info = context.get(summary.reference) ?? {};
      const code = info.code ?? summary.opinion_raw ?? ABSTENTION_CODE;
      const opinion = info.label && info.label !== code ? `${code} (${info.label})` : code;

      return renderAvisRow({
        reference: summary.reference,
        code,
        label: info.label,
        title: firstText(info.title, "(ligne sans libellé lu)"),
        tag: STATUS_LABELS[summary.status],
        tagStatus: summary.status,
        meta: [
          `N° ${summary.reference}`,
          opinion,
          `soulevé le ${formatDate(summary.raised_at)}`,
          months === null ? null : `${months} mois`,
          RESOLUTION_LABELS[summary.resolution_reason] ?? null
        ]
          .filter(Boolean)
          .join(" · "),
        // Les noms de fichiers du bureau de contrôle dépassent souvent cent
        // caractères : les mêler aux métadonnées écrasait tout le reste.
        seenIn: `vu dans ${documentLabel(summary.last_seen_document_id)}`,
        comment: info.comment,
        evidence: summary.evidence?.sentence ?? ""
      });
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
    <div class="ctlab__rows">${rows}</div>
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
    return `
      <button type="button" class="gh-btn gh-btn--sm ctlab__time-travel" data-ctlab-time-travel="on">
        ${svgIcon("history", { className: "octicon" })}
        <span>Remonter le temps</span>
      </button>
    `;
  }

  const selectedDate = parseSharedDateInputValue(state.asOf);
  const view = state.asOfView ?? currentCalendarView(selectedDate);

  return `
    <div class="ctlab__time-travel-active">
      ${svgIcon("history", { className: "octicon" })}
      <span class="ctlab__hint">État arrêté au</span>
      ${renderMilestones(state)}
      ${renderSharedDatePicker({
        idBase: "ctlabAsOf",
        value: state.asOf,
        selectedDate,
        viewYear: view.year,
        viewMonth: view.month,
        isOpen: state.asOfPickerOpen === true,
        placeholder: "Choisir une date",
        inputLabel: state.asOf ? formatDate(state.asOf) : "Choisir une date",
        calendarLabel: "Date à laquelle arrêter l'état des avis",
        showYearNav: true
      })}
      <button type="button" class="ctlab__link" data-ctlab-time-travel="off">Revenir à aujourd'hui</button>
    </div>
  `;
}

/**
 * Les jalons du dossier, en un clic.
 *
 * On demande rarement « que savait-on le 17 mars ? ». On demande « que
 * savait-on au rapport d'étape précédent ? », ou « à la réception ? ». Deux
 * sources, toutes deux datées et vérifiables :
 *
 *  - les **récapitulatifs** du bureau de contrôle, lus dans les documents ;
 *  - les **phases du projet** renseignées dans Paramètres, lorsqu'elles portent
 *    une date.
 *
 * Le calendrier reste là pour tout le reste — une date de contentieux, par
 * exemple, n'est pas un jalon du chantier.
 */
function collectMilestones(state) {
  const fromDocuments = (state.result?.chronology?.documents ?? [])
    .filter((document) => document.recapitulative === true && document.issued_at)
    .map((document) => ({
      at: document.issued_at,
      label: document.document_type_label ?? "Récapitulatif",
      hint: documentLabel(document.source_id),
      origin: "document"
    }));

  const fromPhases = readProjectPhases().map((phase) => ({
    at: phase.phaseDate,
    label: phase.label,
    hint: `Phase ${phase.code}`,
    origin: "phase"
  }));

  return [...fromDocuments, ...fromPhases].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

/**
 * Phases activées du projet, avec leur date.
 *
 * Lues depuis le store de l'application, sans y écrire : cet écran ne modifie
 * aucun paramètre de projet. Une phase sans date n'est pas un jalon.
 */
function readProjectPhases() {
  const catalog = Array.isArray(store?.projectForm?.phasesCatalog) ? store.projectForm.phasesCatalog : [];

  return catalog
    .filter((item) => item?.enabled !== false)
    .map((item) => ({
      code: String(item?.code ?? "").trim(),
      label: String(item?.label ?? "").trim(),
      phaseDate: String(item?.phaseDate ?? item?.phase_date ?? "").trim()
    }))
    .filter((item) => item.code && item.label && /^\d{4}-\d{2}-\d{2}$/.test(item.phaseDate));
}

function renderMilestones(state) {
  const milestones = collectMilestones(state);
  if (milestones.length === 0) return "";

  const phases = milestones.filter((milestone) => milestone.origin === "phase").length;

  return `
    <div class="ctlab__milestones">
      <details class="ctlab__milestone-menu" ${state.milestonesOpen ? "open" : ""}>
        <summary class="gh-btn gh-btn--sm">Choisir un jalon temporel</summary>
        <div class="ctlab__milestone-list">
          <div class="ctlab__milestone-note issue-row-meta-text">
            ${milestones.length - phases} récapitulatif(s) du bureau de contrôle
            ${phases > 0 ? `· ${phases} phase(s) du projet` : "· aucune phase datée dans les paramètres du projet"}
          </div>
          ${milestones
            .map(
              (milestone) => `
                <button type="button" class="ctlab__milestone" data-ctlab-as-of="${escapeHtml(milestone.at)}">
                  <span class="ctlab__milestone-date">${escapeHtml(formatDate(milestone.at))}</span>
                  <span class="ctlab__milestone-label">${escapeHtml(milestone.label)}</span>
                  <span class="issue-row-meta-text">${escapeHtml(milestone.hint)}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </details>
    </div>
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
      <b>État arrêté au ${escapeHtml(formatDate(state.result.chronology.as_of))}.</b>
      ${excluded > 0 ? `${excluded} document(s) postérieur(s) sont écartés de toute l'analyse.` : "Aucun document n'est postérieur à cette date."}
      <button type="button" class="ctlab__link" data-ctlab-time-travel="off">Revenir à aujourd'hui</button>
    </div>
  `;
}

const ALERT_TONES = {
  critique: { tone: "danger", icon: "stop-alert", title: "à vérifier avant d'exploiter le résultat" },
  attention: { tone: "warn", icon: "alert", title: "point d'attention" },
  info: { tone: "info", icon: "check-circle", title: "constat de couverture" }
};

/**
 * Graduer, et ne pas crier.
 *
 * Les cent huit constats « aucun avis reconnu page 1 » d'un lot réel
 * s'affichaient tous en rouge, faute d'une classe pour le niveau `info` : on
 * en concluait que toute l'analyse était fausse. Or ce sont des pages de
 * garde, et c'est une information de couverture, pas une alerte.
 *
 * Trois niveaux, trois traitements : le critique garde son fond rouge, le
 * point d'attention son fond ambré, et l'information devient une ligne sobre,
 * repliée derrière son total.
 */
function renderAlerts(alerts) {
  if (alerts.length === 0) {
    return `<p class="ctlab__empty">Aucune alerte d'extraction.</p>`;
  }

  const line = (alert) => {
    const { tone, icon } = ALERT_TONES[alert.level] ?? ALERT_TONES.info;
    return `
      <div class="ctlab__notice ctlab__notice--${tone}">
        <span class="ctlab__notice-icon" aria-hidden="true">${svgIcon(icon, { className: "octicon" })}</span>
        <div><b>${escapeHtml(documentLabel(alert.sourceId))}</b> — ${escapeHtml(alert.message)}</div>
      </div>
    `;
  };

  const bySeverity = (level) => alerts.filter((alert) => alert.level === level);
  const critical = bySeverity("critique");
  const attention = bySeverity("attention");
  const info = alerts.filter((alert) => alert.level !== "critique" && alert.level !== "attention");

  return `
    ${critical.map(line).join("")}
    ${attention.map(line).join("")}
    ${
      info.length === 0
        ? ""
        : `<details class="ctlab__fold">
             <summary>
               <span class="ctlab__dot ctlab__dot--neutral" aria-hidden="true"></span>
               ${info.length} constat(s) de couverture — pages sans avis, normal pour une page de garde
             </summary>
             <div class="ctlab__fold-body">${info.map(line).join("")}</div>
           </details>`
    }
  `;
}

/**
 * Un taux se lit mieux avec un signe : vert et coché à 100 %, ambré en dessous
 * de 95 %. Sans repère, « 2 674/2 682 » ne dit à personne si c'est bon.
 */
function renderRatioKpi(label, correct, total) {
  const perfect = total > 0 && correct === total;
  const weak = total > 0 && correct / total < 0.95;
  const tone = perfect ? "ok" : weak ? "warn" : "";

  return `
    <div class="ctlab__kpi ${tone ? `ctlab__kpi--${tone}` : ""}">
      <b>
        ${perfect ? svgIcon("check-circle-fill", { className: "octicon" }) : ""}
        ${formatRatio(correct, total)}
      </b>
      <span>${label}</span>
    </div>
  `;
}

function renderIndicators(indicators) {
  const states = Object.entries(indicators.continuityStates)
    .map(([state, count]) => `${escapeHtml(STATE_LABELS[state] ?? state)} : ${count}`)
    .join(" · ");

  return `
    <div class="ctlab__kpis">
      ${renderRatioKpi("provenance vérifiée<br>(source + page + extrait)", indicators.provenance.correct, indicators.provenance.total)}
      ${renderRatioKpi("avis reconnus par le lexique", indicators.recognizedOpinions.correct, indicators.recognizedOpinions.total)}
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
      <div class="ctlab__kpi ${indicators.guardViolations.length === 0 ? "ctlab__kpi--ok" : "ctlab__kpi--danger"}">
        <b>
          ${indicators.guardViolations.length === 0 ? svgIcon("check-circle-fill", { className: "octicon" }) : ""}
          ${indicators.guardViolations.length}
        </b>
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

  // Deux mille six cent quatre-vingt-neuf lignes d'un coup figent la page :
  // on n'en construit qu'une page à la fois, avec la pagination de
  // l'application — celle du tableau des sujets.
  const pagination = paginateItems(filtered, { pageSize: PAGE_SIZE, currentPage: state.avisPage });
  const visible = pagination.items;

  // Une ligne se lit comme une ligne de sujet : l'intitulé porte le clic — il
  // passe en bleu au survol —, le reste tient sur une seconde ligne discrète.
  // Seul un avis numéroté a une vie à raconter ; les autres ne sont pas
  // cliquables, et le dire par l'absence de lien vaut mieux qu'un clic mort.
  const rows = visible
    .map((avis) => {
      const code = avis.value?.opinion_raw ?? avis.opinion_raw ?? ABSTENTION_CODE;
      const reference = avis.value?.external_reference_raw ?? null;
      const opinion = avis.opinion_label && avis.opinion_label !== code ? `${code} (${avis.opinion_label})` : code;

      return renderAvisRow({
        reference,
        // Tout avis se consulte, numéroté ou non. Sans numéro, il n'a pas de
        // continuité à raconter, mais il a une provenance à montrer — et un
        // intitulé qui ne réagit pas au clic est une promesse non tenue.
        traceKey: reference ?? `key:${avis.key}`,
        code,
        label: avis.opinion_label,
        title: firstText(avis.title_raw, avis.description_raw, "(ligne sans libellé lu)"),
        tag: null,
        meta: [reference ? `N° ${reference}` : "sans n°", opinion, avis.provenance?.page ? `page ${avis.provenance.page}` : null]
          .filter(Boolean)
          .join(" · "),
        seenIn: documentLabel(avis.provenance?.source_id),
        comment:
          firstText(avis.title_raw) && firstText(avis.description_raw) !== firstText(avis.title_raw)
            ? avis.description_raw
            : null
      });
    })
    .join("");

  return `
    <h3>Tous les avis identifiés</h3>
    <p class="ctlab__hint">
      ${all.length} avis lus, dont <b>${state.result.indicators.numberedCount}</b> portant un numéro —
      seuls ceux-là peuvent être suivis d'un rapport à l'autre. Les autres sont listés ici, sans identité
      que le métier ait déjà fixée : leur inventer une reviendrait à deviner.
    </p>
    ${renderOpinionBreakdown(codes, all.length)}
    <div class="ctlab__filters">
      <label class="ctlab__inline">
        Avis
        <select class="ctlab__select" data-ctlab-filter-code>
          <option value="">tous</option>
          ${codes
            .map(
              (entry) =>
                `<option value="${escapeHtml(entry.code)}" ${filter.code === entry.code ? "selected" : ""}>${escapeHtml(opinionLabel(entry))}</option>`
            )
            .join("")}
        </select>
      </label>
      <label class="ctlab__inline">
        Rapport
        <select class="ctlab__select ctlab__select--wide" data-ctlab-filter-document>
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
      <span class="ctlab__spacer"></span>
      <span class="ctlab__hint">${filtered.length} retenu(s)</span>
    </div>
    <div class="ctlab__rows">${rows}</div>
    ${renderPager(pagination, filtered.length)}
  `;
}

/**
 * Répartition des avis, dans l'esprit de la barre de langages d'un dépôt :
 * une seule barre à cent pour cent, puis la légende avec ses pastilles.
 * On voit d'un coup d'œil si un dossier est majoritairement favorable ou
 * majoritairement en attente — ce qu'une liste de nombres ne montre pas.
 */
function renderOpinionBreakdown(codes, total) {
  if (total === 0 || codes.length === 0) return "";

  const segments = codes
    .map((entry) => ({ ...entry, share: (entry.count / total) * 100 }))
    .filter((entry) => entry.share > 0);

  return `
    <div class="ctlab__breakdown">
      <div class="ctlab__breakdown-bar" role="img" aria-label="Répartition des avis par code">
        ${segments
          .map(
            (entry) =>
              `<span class="ctlab__breakdown-segment ctlab__breakdown-segment--${opinionTone(entry.code, entry.label)}"
                     style="width:${entry.share.toFixed(2)}%"
                     title="${escapeHtml(opinionLabel(entry))} : ${entry.count} (${entry.share.toFixed(1)} %)"></span>`
          )
          .join("")}
      </div>
      <ul class="ctlab__breakdown-legend">
        ${segments
          .map(
            (entry) => `
              <li>
                <span class="ctlab__dot ctlab__dot--${opinionTone(entry.code, entry.label)}" aria-hidden="true"></span>
                <b>${escapeHtml(opinionLabel(entry))}</b>
                <span class="ctlab__hint">${entry.count} · ${entry.share.toFixed(1)} %</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
}

function renderPager(pagination, total) {
  if (total === 0) return `<p class="ctlab__empty">Aucun avis ne correspond à ce filtre.</p>`;
  return renderPaginationControls(pagination, { entity: "ctlab-avis" });
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

  // Le détail d'un avis remplace la vue, il ne s'y ajoute pas : c'est la place
  // qui rend la frise lisible, et le retour arrière qui rend la navigation
  // évidente.
  if (state.selectedReference) return renderAvisTrace(state);

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
    case "indicators":
      return renderAnalytics(state);
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
        ${renderOrphanReferences(state)}
      `;
    case "technical":
      return renderDetails(state);
    case "state":
    default:
      return `<div class="ctlab__section">${renderStatusView(state)}</div>`;
  }
}


/**
 * Les indicateurs de pilotage.
 *
 * Ce que chacun vient y chercher :
 *  - le maître d'ouvrage, l'encours à chaque jalon — le dossier se résorbe-t-il ?
 *  - l'OPC, le flux trimestriel — émet-on plus qu'on ne lève ?
 *  - la maîtrise d'œuvre, l'ancienneté de ce qui reste ouvert — que traiter d'abord ?
 *  - tout le monde, le délai de levée — la réactivité du projet, opposable en réunion.
 *
 * Aucun de ces chiffres n'est estimé : ils comptent des dates lues dans les
 * documents. Ce qui n'est pas calculable est écrit noir sur blanc en bas.
 */
function renderAnalytics(state) {
  const analytics = state.result.analytics;
  if (!analytics || analytics.quarters.length === 0) {
    return `<div class="ctlab__section"><p class="ctlab__empty">Aucune date d'émission lisible : rien à mettre en courbe.</p></div>`;
  }

  const delay = analytics.delay;

  return `
    <div class="ctlab__section">
      <h3>Le dossier en six chiffres</h3>
      <div class="ctlab__kpis">
        <div class="ctlab__kpi"><b>${analytics.stillOpenCount}</b><span>avis encore à traiter</span></div>
        <div class="ctlab__kpi ${delay.median === null ? "" : delay.median > 180 ? "ctlab__kpi--warn" : "ctlab__kpi--ok"}">
          <b>${delay.median === null ? "n/a" : `${Math.round(delay.median / 30)} mois`}</b>
          <span>délai médian de levée<br>sur ${delay.count} avis levés</span>
        </div>
        <div class="ctlab__kpi"><b>${analytics.backlog.at(-1)?.open ?? 0}</b><span>encours au dernier jalon</span></div>
        <div class="ctlab__kpi"><b>${analytics.quarters.length}</b><span>trimestres de suivi</span></div>
        <div class="ctlab__kpi"><b>${analytics.production.reduce((total, entry) => total + entry.count, 0)}</b><span>livrables du bureau de contrôle</span></div>
        <div class="ctlab__kpi ${analytics.ageBands.at(-1).count > 0 ? "ctlab__kpi--danger" : "ctlab__kpi--ok"}">
          <b>${analytics.ageBands.at(-1).count}</b><span>ouverts depuis plus d'un an</span>
        </div>
      </div>
    </div>

    <div class="ctlab__charts">
      <article class="pilotage-chart-card">
        <div class="pilotage-chart-card__head">
          <div>
            <h4>Encours aux jalons</h4>
            <p>Avis non levés à la date de chaque récapitulatif. Une courbe qui monte est un dossier qui accumule.</p>
          </div>
        </div>
        <div class="pilotage-chart-card__body">${renderBacklogChart(analytics.backlog)}</div>
      </article>
      <article class="pilotage-chart-card">
        <div class="pilotage-chart-card__head">
          <div>
            <h4>Flux trimestriel</h4>
            <p>Avis émis et avis levés. Un trimestre qui émet plus qu'il ne lève creuse la dette.</p>
          </div>
        </div>
        <div class="pilotage-chart-card__body">${renderFlowChart(analytics.flow)}</div>
      </article>
    </div>

    <div class="ctlab__section">
      <h3>Ancienneté de ce qui reste ouvert</h3>
      ${renderAgeBands(analytics.ageBands, analytics.stillOpenCount)}
    </div>

    <div class="ctlab__section">
      <h3>Production du bureau de contrôle</h3>
      <p class="ctlab__hint">Le rythme du contrôle lui-même : combien de livrables, de quelle nature.</p>
      <div class="ctlab__scroll">
        <table class="ctlab__grid">
          <thead><tr><th>Nature du livrable</th><th style="width:100px">Nombre</th></tr></thead>
          <tbody>
            ${analytics.documentsByType
              .map((entry) => `<tr><td>${escapeHtml(entry.label)}</td><td>${entry.count}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      </div>
    </div>

    <div class="ctlab__section">
      <h3>Ce que ces documents ne permettent pas de calculer</h3>
      ${analytics.notAvailable
        .map(
          (line) => `
            <div class="ctlab__notice ctlab__notice--info">
              <span class="ctlab__notice-icon" aria-hidden="true">${svgIcon("alert", { className: "octicon" })}</span>
              <div>${escapeHtml(line)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

/**
 * Règle de mise à l'échelle de l'axe des abscisses.
 *
 * Dix-neuf trimestres sur quatre cents pixels donnent des étiquettes
 * superposées, donc illisibles — le graphique ment alors par excès de zèle.
 * On garde une graduation sur `k`, en choisissant `k` pour que chaque
 * étiquette dispose de la largeur qu'il lui faut, et on conserve toujours la
 * première et la dernière : ce sont les bornes de la période.
 *
 * @param {number} count nombre de points
 * @param {number} innerWidth largeur utile du tracé, en pixels
 * @param {number} labelWidth largeur minimale d'une étiquette
 */
export function pickAxisTicks(count, innerWidth, labelWidth = 64) {
  if (count <= 0) return [];
  if (count === 1) return [0];

  const maxTicks = Math.max(2, Math.floor(innerWidth / labelWidth));
  const stride = Math.max(1, Math.ceil((count - 1) / (maxTicks - 1)));

  const ticks = [];
  for (let index = 0; index < count; index += stride) ticks.push(index);
  if (ticks[ticks.length - 1] !== count - 1) ticks.push(count - 1);
  return ticks;
}

/** Format commun aux graphiques de cet écran : compact, deux par ligne. */
const CHART_SIZE = { width: 460, height: 220, margin: { top: 16, right: 16, bottom: 44, left: 48 } };

function renderBacklogChart(backlog) {
  if (backlog.length < 2) {
    return `<p class="ctlab__empty">Il faut au moins deux récapitulatifs pour tracer une évolution.</p>`;
  }

  const values = backlog.map((entry) => entry.open);
  const ticks = getNiceChartTicks(Math.max(...values, 1), 4);

  return `
    <div class="ctlab__chart">
      ${renderSvgLineChart({
        ...CHART_SIZE,
        title: "Encours aux jalons",
        xLabel: "jalon",
        yLabel: "avis non levés",
        xDomain: [0, Math.max(backlog.length - 1, 1)],
        yDomain: [0, Math.max(ticks.at(-1) ?? 1, 1)],
        xTicks: pickAxisTicks(backlog.length, CHART_SIZE.width - CHART_SIZE.margin.left - CHART_SIZE.margin.right, 72),
        yTicks: ticks,
        xTickFormatter: (tick) => formatDate(backlog[tick]?.at),
        yGrid: { show: true, lineStyle: "dashed" },
        xGrid: { show: false },
        series: [
          {
            label: "avis non levés",
            points: values.map((value, index) => ({ x: index, y: value })),
            fill: true,
            pointsVisible: true
          }
        ]
      })}
    </div>
  `;
}

function renderFlowChart(flow) {
  if (flow.length === 0) return `<p class="ctlab__empty">Aucun trimestre à afficher.</p>`;

  const maxValue = Math.max(1, ...flow.flatMap((entry) => [entry.raised, entry.resolved]));
  const ticks = getNiceChartTicks(maxValue, 4);

  return `
    <div class="ctlab__chart">
      ${renderSvgLineChart({
        ...CHART_SIZE,
        title: "Flux trimestriel",
        xLabel: "trimestre",
        yLabel: "avis",
        xDomain: [0, Math.max(flow.length - 1, 1)],
        yDomain: [0, Math.max(ticks.at(-1) ?? 1, 1)],
        xTicks: pickAxisTicks(flow.length, CHART_SIZE.width - CHART_SIZE.margin.left - CHART_SIZE.margin.right, 58),
        yTicks: ticks,
        xTickFormatter: (tick) => flow[tick]?.quarter ?? "",
        yGrid: { show: true, lineStyle: "dashed" },
        xGrid: { show: false },
        series: [
          { label: "émis", points: flow.map((entry, index) => ({ x: index, y: entry.raised })), pointsVisible: true },
          { label: "levés", points: flow.map((entry, index) => ({ x: index, y: entry.resolved })), pointsVisible: true }
        ]
      })}
    </div>
  `;
}

function renderAgeBands(bands, total) {
  if (total === 0) {
    return `<p class="ctlab__empty">Aucun avis en attente : rien à prioriser.</p>`;
  }

  const tones = { "0-3": "ok", "3-6": "info", "6-12": "pending", "12+": "danger" };

  return `
    <div class="ctlab__breakdown">
      <div class="ctlab__breakdown-bar" role="img" aria-label="Ancienneté des avis ouverts">
        ${bands
          .filter((band) => band.count > 0)
          .map(
            (band) =>
              `<span class="ctlab__breakdown-segment ctlab__breakdown-segment--${tones[band.id]}"
                     style="width:${((band.count / total) * 100).toFixed(2)}%"
                     title="${escapeHtml(band.label)} : ${band.count}"></span>`
          )
          .join("")}
      </div>
      <ul class="ctlab__breakdown-legend">
        ${bands
          .map(
            (band) => `
              <li>
                <span class="ctlab__dot ctlab__dot--${tones[band.id]}" aria-hidden="true"></span>
                <b>${escapeHtml(band.label)}</b>
                <span class="ctlab__hint">${band.count}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
}

/**
 * La vie d'un avis, en plein écran.
 *
 * La matrice complète — une ligne par avis, une colonne par document —
 * comptait 24 308 cases sur le corpus réel. Personne ne lit ça. On clique
 * l'intitulé d'un avis et le tableau cède la place à sa frise, avec un retour
 * arrière discret, comme le détail d'une exécution : on suit une chaîne
 * d'étapes datées, chacune disant ce que le document a apporté.
 *
 * Le vocabulaire visuel reste celui d'un document, jamais celui d'un sujet
 * Mdall : pas d'avatar, pas de fil de discussion, pas de bouton d'état. Un avis
 * n'est pas encore un sujet, et l'écran ne doit pas laisser croire l'inverse.
 */
function renderAvisTrace(state) {
  const reference = state.selectedReference;
  const row = state.result.timeline.find((entry) => entry.reference === reference);
  const summary = state.result.avisStatus.find((entry) => entry.reference === reference) ?? null;
  const context = buildAvisContext(state.result).get(reference) ?? {};

  const back = `
    <button type="button" class="ctlab__back" data-ctlab-back>
      ${svgIcon("arrow-left", { className: "octicon" })}
      <span>Tous les avis identifiés</span>
    </button>
  `;

  // Un avis sans numéro n'a pas de continuité, mais il a une provenance :
  // on montre ce qu'on en sait, plutôt que d'ouvrir sur une impasse.
  if (!row) return renderSingleOccurrence(state, back);

  // La date d'émission vit dans la chronologie, pas dans la source paginée :
  // aller la chercher ailleurs affichait « — » à chaque étape.
  const metaById = new Map(
    (state.result.chronology?.documents ?? []).map((document) => [document.source_id, document])
  );

  const steps = row.cells
    .map((cell) => ({ cell, document: metaById.get(cell.documentId) ?? null }))
    .filter(({ cell }) => cell.continuity || cell.extraction);

  // Une réouverture, c'est un avis qui reparaît après avoir disparu. Le cas
  // existe : un récapitulatif l'oublie, le suivant le remet. Le taire ferait
  // de deux évènements distincts une seule ligne de vie continue.
  const reopenedAt = new Set();
  let absent = false;
  steps.forEach(({ cell }, index) => {
    const stepState = cell.continuity?.value?.state ?? null;
    const present = stepState === "NEW" || stepState === "MATCHED" || stepState === "MATCHED_BY_TITLE";
    if (present && absent) reopenedAt.add(index);
    if (!present) absent = true;
    else absent = false;
  });

  return `
    <div class="ctlab__section">
      ${back}
      <div class="ctlab__trace-head">
        <h3>Avis n° ${escapeHtml(reference)}</h3>
        ${summary ? `<span class="ctlab__badge ctlab__badge--${escapeHtml(summary.status)}">${escapeHtml(STATUS_LABELS[summary.status])}</span>` : ""}
      </div>
      ${
        summary
          ? `<p class="ctlab__hint">
               Soulevé dans ${escapeHtml(documentLabel(summary.raised_in))} le ${escapeHtml(formatDate(summary.raised_at))}
               ${summary.resolved_at ? `, levé le ${escapeHtml(formatDate(summary.resolved_at))} — ${escapeHtml(RESOLUTION_LABELS[summary.resolution_reason] ?? "")}` : ""}.
               ${steps.length} document(s) le mentionnent ou l'attendaient.
             </p>`
          : ""
      }
      <ol class="ctlab__pipeline">
        ${steps
          .map(({ cell, document }, index) =>
            renderTraceStep(cell, document, {
              reopened: reopenedAt.has(index),
              fallbackTitle: context.title ?? null,
              previous: lastSeenWording(steps, index)
            })
          )
          .join("")}
      </ol>
      <div data-ctlab-detail></div>
    </div>
  `;
}

/**
 * Le détail d'un avis non numéroté : une seule occurrence, sans suite.
 *
 * Le métier ne lui a pas donné d'identité — lui en inventer une permettrait de
 * le suivre, au prix d'un rapprochement que rien ne fonde. L'écran le dit, et
 * montre ce qui est vérifiable : le document, la page, l'extrait.
 */
function renderSingleOccurrence(state, back) {
  const key = String(state.selectedReference ?? "").replace(/^key:/, "");
  const avis = collectAvis(state.result.predictions).find((entry) => entry.key === key);

  if (!avis) {
    return `<div class="ctlab__section">${back}<p class="ctlab__empty">Cet avis n'est plus dans le lot analysé.</p></div>`;
  }

  const code = avis.value?.opinion_raw ?? avis.opinion_raw ?? ABSTENTION_CODE;
  const document = (state.result.chronology?.documents ?? []).find(
    (entry) => entry.source_id === avis.provenance?.source_id
  );

  return `
    <div class="ctlab__section">
      ${back}
      <div class="ctlab__trace-head">
        <h3>${escapeHtml(firstText(avis.title_raw, avis.description_raw, "(ligne sans libellé lu)"))}</h3>
      </div>
      <p class="ctlab__hint">
        Cet avis ne porte pas de numéro dans le rapport : le bureau de contrôle ne numérote que ce qui
        appelle une action. Il ne peut donc pas être suivi d'un document à l'autre.
      </p>
      <ol class="ctlab__pipeline">
        <li class="ctlab__pipeline-step ctlab__pipeline-step--neutral">
          <span class="ctlab__pipeline-mark" aria-hidden="true">${svgIcon("file", { className: "octicon" })}</span>
          <div class="ctlab__pipeline-body">
            <div class="ctlab__pipeline-title">
              <span class="issue-row-meta-text ctlab__pipeline-date">${escapeHtml(formatDate(document?.issued_at))}</span>
              <span class="ctlab__pipeline-headline">${escapeHtml(firstText(avis.title_raw, "(ligne sans libellé lu)"))}</span>
              <span class="ctlab__dot ctlab__dot--${opinionTone(code, avis.opinion_label)}" aria-hidden="true"></span>
              <b>${escapeHtml(code)}</b>
            </div>
            ${avis.description_raw ? `<div class="issue-row-meta-text ctlab__pipeline-line ctlab__pipeline-text">${escapeHtml(avis.description_raw)}</div>` : ""}
            <div class="issue-row-meta-text ctlab__pipeline-line ctlab__ellipsis">
              ${escapeHtml(documentLabel(avis.provenance?.source_id))}${avis.provenance?.page ? ` · page ${avis.provenance.page}` : ""}
            </div>
          </div>
        </li>
      </ol>
    </div>
  `;
}

/**
 * La dernière formulation connue avant cette étape.
 *
 * Les rapports où l'avis est absent ne disent rien de son libellé : on remonte
 * jusqu'à la dernière apparition réelle, sinon chaque disparition ferait
 * croire à une reformulation.
 */
export function lastSeenWording(steps, index) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const extraction = steps[cursor]?.cell?.extraction;
    if (!extraction) continue;
    const title = firstText(extraction.title_raw);
    if (title === "") continue;
    return { title, comment: firstText(extraction.description_raw) };
  }
  return null;
}

/**
 * Une étape de la frise.
 *
 * Trois lignes, toujours dans le même ordre : ce qui s'est passé, ce que
 * l'organisme en a dit, d'où ça vient. La date ouvre la ligne parce que c'est
 * l'axe de lecture d'un historique.
 *
 * L'icône reprend le vocabulaire des sujets — ouvert, fermé, rouvert — parce
 * que c'est exactement ce qui se joue : un avis qui reparaît après avoir
 * disparu est une réouverture, et il faut que ça se voie.
 */
function renderTraceStep(cell, document, { reopened = false, fallbackTitle = null, previous = null } = {}) {
  const continuity = cell.continuity;
  const state = continuity?.state === "AMBIGUOUS" ? "AMBIGUOUS" : continuity?.value?.state ?? "AMBIGUOUS";
  const lifted = Boolean(continuity?.lifting_statement);
  const previousDocument = continuity?.value?.previous_document_id;

  const opinion = cell.extraction?.value?.opinion_raw ?? continuity?.matched_opinion_raw ?? null;
  const opinionLabelText = cell.extraction?.opinion_label ?? continuity?.matched_opinion_label ?? null;
  const comment = firstText(cell.extraction?.description_raw) || null;
  const title = firstText(cell.extraction?.title_raw) || null;

  // Le cycle de vie, dit avec les icônes des sujets.
  let lifecycle;
  if (lifted) lifecycle = { icon: "check-circle", tone: "ok", color: "var(--fgColor-open)" };
  else if (state === "NOT_FOUND") lifecycle = { icon: "skip", tone: "neutral", color: "var(--muted)" };
  else if (reopened) lifecycle = { icon: "issue-reopened", tone: "info", color: "var(--fgColor-done)" };
  else lifecycle = { icon: "issue-opened", tone: "pending", color: "var(--fgColor-open)" };

  // Le libellé dit la conclusion, pas l'état brut : « déclaré levé » assorti de
  // « NON RETROUVÉ » se lisait comme une contradiction, alors que les deux
  // étaient vrais — l'avis a disparu du tableau parce qu'il a été levé.
  const badge = lifted
    ? "LEVÉ"
    : reopened && state !== "NOT_FOUND"
      ? "RÉOUVERT"
      : STATE_LABELS[state] ?? state;

  // La couleur porte le sens : vert ce qui est acquis, bleu ce qui est neuf,
  // gris ce qui n'est qu'un silence.
  const badgeTone = lifted
    ? "ok"
    : state === "MATCHED" || state === "MATCHED_BY_TITLE"
      ? "ok"
      : state === "NEW" || reopened
        ? "info"
        : "muted";

  const headline =
    state === "NOT_FOUND"
      ? lifted
        ? "Déclaré levé"
        : "Absent de ce rapport"
      : firstText(title, fallbackTitle, "Figure dans ce rapport");

  const secondLine =
    state === "NOT_FOUND"
      ? lifted
        ? `« ${continuity.lifting_statement.sentence} »`
        : previousDocument
          ? `vu pour la dernière fois dans ${documentLabel(previousDocument)}`
          : "aucune apparition antérieure connue"
      : comment ?? "";

  // Un même avis n'est pas libellé de la même façon d'un rapport à l'autre :
  // chaque édition le rattache à sa propre ligne du référentiel. Sur un corpus
  // réel, l'avis 238 est « Les organes des coupures… » dans un RICT et « Pour
  // tout circuit terminal… » dans le rapport d'étape suivant — même numéro,
  // même commentaire, mot pour mot. Ce n'est pas une confusion de l'outil,
  // c'est le document qui reformule ; l'écran doit le dire, sinon le lecteur
  // croit avoir changé d'avis en cours de route.
  const rephrased = Boolean(previous?.title && title && previous.title !== title);
  const sameComment = Boolean(previous?.comment && comment && previous.comment === comment);

  return `
    <li class="ctlab__pipeline-step ctlab__pipeline-step--${lifecycle.tone}">
      <span class="ctlab__pipeline-mark" style="color:${lifecycle.color}" aria-hidden="true">
        ${svgIcon(lifecycle.icon, { className: "octicon" })}
      </span>
      <div class="ctlab__pipeline-body">
        <div class="ctlab__pipeline-title">
          <span class="issue-row-meta-text ctlab__pipeline-date">${escapeHtml(formatDate(document?.issued_at))}</span>
          <span class="ctlab__pipeline-headline ${state === "NOT_FOUND" ? "ctlab__pipeline-headline--muted" : ""}">${escapeHtml(headline)}</span>
          ${
            opinion
              ? `<span class="ctlab__dot ctlab__dot--${opinionTone(opinion, opinionLabelText)}" aria-hidden="true"></span><b>${escapeHtml(opinion)}</b>`
              : ""
          }
          <span class="subject-label-badge ctlab__tag ctlab__tag--${escapeHtml(badgeTone)}">${escapeHtml(badge.toLocaleUpperCase("fr"))}</span>
        </div>
        ${
          rephrased
            ? `<div class="ctlab__pipeline-line ctlab__pipeline-rephrased">
                 Intitulé reformulé par ce rapport — même numéro, même observation.
               </div>`
            : ""
        }
        ${
          secondLine
            ? sameComment
              ? `<div class="issue-row-meta-text ctlab__pipeline-line">Observation inchangée.</div>`
              : `<div class="issue-row-meta-text ctlab__pipeline-line ctlab__pipeline-text">${escapeHtml(secondLine)}</div>`
            : ""
        }
        <div class="issue-row-meta-text ctlab__pipeline-line ctlab__ellipsis">${escapeHtml(documentLabel(cell.documentId))}</div>
      </div>
    </li>
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

/**
 * Numéros lus, mais refusés.
 *
 * L'organisme ne numérote dans le PDF que ce qui appelle une action —
 * suspendu, défavorable, non conforme. Un numéro qui termine la ligne d'un
 * avis favorable ou sans objet vient donc d'une ligne de tableau fusionnée
 * avec la suivante à l'aplatissement du document : le donner à cet avis
 * fabriquerait une identité fausse, et deux dispositions distinctes finiraient
 * rapprochées d'un rapport à l'autre.
 *
 * On le refuse, et on le montre : c'est une mesure de la qualité de lecture du
 * lot, pas un détail à taire.
 */
function renderOrphanReferences(state) {
  const orphans = state.result.orphanReferences ?? [];
  if (orphans.length === 0) return "";

  return `
    <div class="ctlab__section">
      <h3>Numéros refusés</h3>
      <p class="ctlab__hint">
        ${orphans.length} numéro(s) terminaient la ligne d'un avis qui n'en porte pas dans le rapport.
        Les avis concernés restent listés, sans numéro : ils ne peuvent pas être suivis d'un document à l'autre.
      </p>
      <details class="ctlab__fold">
        <summary>Voir le détail</summary>
        <div class="ctlab__fold-body">
          <div class="ctlab__scroll">
            <table class="ctlab__grid">
              <thead><tr><th>N° refusé</th><th>Avis</th><th>Document</th><th>Page</th><th>Intitulé du bloc</th></tr></thead>
              <tbody>
                ${orphans
                  .slice(0, 200)
                  .map(
                    (orphan) => `
                      <tr>
                        <td>${escapeHtml(orphan.reference)}</td>
                        <td>${escapeHtml(orphan.opinion_raw ?? "—")}</td>
                        <td>${escapeHtml(documentLabel(orphan.source_document_id))}</td>
                        <td>${orphan.page ?? "—"}</td>
                        <td>${escapeHtml(firstText(orphan.attached_to_title, "(ligne sans libellé lu)"))}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </details>
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
/**
 * L'onglet technique, du verdict vers la matière brute.
 *
 * L'ordre précédent enterrait les motifs d'extraction et les exports sous le
 * texte intégral de cent dix-neuf rapports : les seules commandes de la page
 * étaient hors d'atteinte. On commence donc par ce qui se juge — les
 * indicateurs —, puis ce qui s'agit — les motifs —, et le texte extrait ferme
 * la marche, replié.
 */
function renderDetails(state) {
  return `
    <div class="ctlab__section">
      <h3>Peut-on se fier à cette lecture ?</h3>
      <p class="ctlab__hint">
        Chaque chiffre se vérifie contre les PDF chargés, sans qu'on ait à croire l'outil sur parole.
      </p>
      ${renderIndicators(state.result.indicators)}
    </div>
    <div class="ctlab__section">
      <h3>Ce qui n'a pas pu être lu</h3>
      <p class="ctlab__hint">
        Un PDF scanné, une page sans avis, un format inattendu : ce qui a résisté à la lecture est listé ici,
        document par document.
      </p>
      ${renderAlerts(state.result.indicators.alerts)}
    </div>
    <div class="ctlab__section">
      <h3>Comment les avis sont repérés dans le texte</h3>
      <p class="ctlab__hint">
        Pour retrouver un avis, l'outil cherche dans le texte des formulations connues — « Avis n° 65 »,
        « OBS-65 » — et un vocabulaire d'avis. Sur un rapport en tableau, il lit la légende du document
        lui-même et n'a pas besoin de ces réglages. Ils servent aux rapports rédigés en phrases, ou à un
        format qu'il n'aurait pas su lire : on ajuste ici, on relance, et on regarde ce que ça change.
      </p>
      ${renderPatternEditor(state)}
    </div>
    <div class="ctlab__section">
      <h3>Pistes signalées par la lecture</h3>
      ${renderSuggestions(state.result.suggestions)}
    </div>
    <div class="ctlab__section">
      <h3>Le texte brut des documents</h3>
      <p class="ctlab__hint">
        La matière brute, telle que le navigateur l'a lue. Volumineuse par nature : repliée par défaut.
      </p>
      <details class="ctlab__fold">
        <summary>Afficher le texte extrait des ${state.reports.length} document(s)</summary>
        <div class="ctlab__fold-body">${renderExtractedText(state)}</div>
      </details>
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
              id: "ctlabExport",
              label: "Exporter",
              tone: "default",
              size: "md",
              disabled: !state.result || busy,
              mainAction: "ctlab-export-all",
              items: [
                { action: "ctlab-export-all", label: "Tout (JSON)" },
                { action: "ctlab-export-avis-csv", label: "Tableau des avis (CSV)" },
                { action: "ctlab-export-status-csv", label: "État des avis (CSV)" },
                { action: "ctlab-export-case", label: "Cas rejouable (JSON)" },
                { action: "ctlab-export-report", label: "Rapport (Markdown)" }
              ]
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
    evidence:
      (result.liftingStatements?.length ?? 0) +
      (result.globalClearances?.length ?? 0) +
      (result.orphanReferences?.length ?? 0)
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

  const exportAs = (kind) => {
    if (!state.result) return;
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
      const action = nav.getAttribute("data-shared-date-nav");
      const direction = action.endsWith("next") ? 1 : -1;
      // Un pas d'un an, sinon remonter trois ans demande trente-six clics.
      const step = action.includes("year") ? 12 : 1;
      const view = state.asOfView ?? currentCalendarView(parseSharedDateInputValue(state.asOf));
      state.asOfView = shiftSharedCalendarMonth(view.year, view.month, direction * step);
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

  bindGhActionButtons();

  // Les phases du projet ne sont hydratées que lorsqu'on ouvre Paramètres ›
  // Phases. Arrivé directement dans l'Atelier, le catalogue n'a aucune date, et
  // le menu des jalons paraissait vide alors qu'il fonctionnait. Lecture seule :
  // cet écran n'écrit jamais de paramètre de projet.
  // Import différé : ce module tire le SDK Supabase depuis une URL distante,
  // que Node ne sait pas charger. Le charger à la demande garde cette vue
  // testable hors navigateur.
  import("../../../services/profile-supabase-sync.js")
    .then(({ syncProjectPhasesFromSupabase }) => syncProjectPhasesFromSupabase())
    .then(() => {
      if (state.result) refresh();
    })
    .catch(() => {
      // Hors ligne ou sans projet courant : les jalons se limitent aux
      // récapitulatifs lus dans les documents, et l'écran le dit.
    });

  root.addEventListener("ghaction:action", (event) => {
    const action = String(event.detail?.action ?? "");
    if (!action.startsWith("ctlab-export-")) return;
    exportAs(action.replace("ctlab-export-", ""));
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
      // Un onglet reprend la main sur le détail affiché : rester prisonnier
      // d'une frise jusqu'à avoir trouvé le retour arrière n'est pas une
      // navigation, c'est une impasse.
      state.selectedReference = null;
      state.selectedCell = null;
      refresh();
      return;
    }

    if (handleDatePickerClick(event)) return;

    const target = event.target.closest(
      "[data-ctlab-pick], [data-ctlab-remove], [data-ctlab-cell], [data-ctlab-trace], [data-ctlab-back], " +
        "[data-ctlab-as-of], " +
        "[data-pagination-entity='ctlab-avis'], " +
        "[data-ctlab-export-text], [data-ctlab-apply-patterns], [data-ctlab-reset-patterns], " +
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

    if (target.dataset.ctlabAsOf !== undefined) {
      captureEditors();
      state.asOf = target.dataset.ctlabAsOf;
      state.asOfPickerOpen = false;
      state.asOfView = currentCalendarView(parseSharedDateInputValue(state.asOf));
      await runAnalysis();
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
      captureEditors();
      state.selectedReference = target.dataset.ctlabTrace;
      state.selectedCell = null;
      refresh();
      return;
    }

    if (target.dataset.ctlabBack !== undefined) {
      state.selectedReference = null;
      state.selectedCell = null;
      refresh();
      return;
    }

    if (target.dataset.paginationEntity === "ctlab-avis") {
      if (target.getAttribute("aria-disabled") === "true") return;
      captureEditors();
      state.avisPage = Number(target.dataset.paginationPage);
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

  });

  refresh();
}
