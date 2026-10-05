import { escapeHtml } from "../../utils/escape-html.js";
import { renderSpinnerHtml } from "./spinner.js";

function buildTableVars(gridTemplate = "") {
  if (!gridTemplate) return "";
  const safe = escapeHtml(gridTemplate);
  return `style="--data-table-cols:${safe};--issues-cols:${safe};"`;
}

export function renderDataTableHead({ columns = [] } = {}) {
  return columns.map((column) => {
    if (typeof column === "string") {
      return `<div class="data-table-shell__col">${escapeHtml(column)}</div>`;
    }

    const className = column.className ? ` ${escapeHtml(column.className)}` : "";
    const content = column.html ?? escapeHtml(column.label ?? "");

    return `<div class="data-table-shell__col${className}">${content}</div>`;
  }).join("");
}

export function renderDataTableEmptyState({
  title = "Aucun résultat",
  description = "",
  className = ""
} = {}) {
  return `
    <div class="data-table-shell__empty emptyState ${className}">
      ${title ? `<div class="data-table-shell__empty-title">${escapeHtml(title)}</div>` : ""}
      ${description ? `<div class="data-table-shell__empty-description">${escapeHtml(description)}</div>` : ""}
    </div>
  `;
}

export function renderDataTableLoadingState({
  title = "Chargement…",
  description = "",
  className = ""
} = {}) {
  return `
    <div class="data-table-shell__loading emptyState ${className}">
      <div class="data-table-shell__loading-spinner">${renderSpinnerHtml({ label: title || "Chargement", size: "lg" })}</div>
      ${title ? `<div class="data-table-shell__loading-title">${escapeHtml(title)}</div>` : ""}
      ${description ? `<div class="data-table-shell__loading-description">${escapeHtml(description)}</div>` : ""}
    </div>
  `;
}

export function renderDataTableShell({
  headHtml = "",
  bodyHtml = "",
  className = "",
  headClassName = "",
  bodyClassName = "",
  gridTemplate = "",
  state = "ready", // ready | empty | loading
  emptyHtml = "",
  loadingHtml = ""
} = {}) {
  let resolvedBody = bodyHtml;

  if (state === "loading") {
    resolvedBody = loadingHtml || renderDataTableLoadingState();
  } else if (state === "empty") {
    resolvedBody = emptyHtml || renderDataTableEmptyState();
  }

  const classes = [
    "data-table-shell",
    className,
    state === "loading" ? "data-table-shell--loading" : "",
    state === "empty" ? "data-table-shell--empty" : ""
  ].filter(Boolean).join(" ");

  return `
    <div class="${classes}" ${buildTableVars(gridTemplate)}>
      ${headHtml ? `
        <div class="data-table-shell__head ${headClassName}">
          ${headHtml}
        </div>
      ` : ""}
      <div class="data-table-shell__body ${bodyClassName}">
        ${resolvedBody}
      </div>
    </div>
  `;
}

/**
 * Ce que l'en-tête d'un tableau compte.
 *
 * ## Pourquoi un compte, et pas des intitulés
 *
 * « Action » au-dessus des actions et « Quand » au-dessus des dates
 * n'apprennent rien à personne, et prennent toute la ligne. Ce qu'on vient y
 * lire est **combien** — le seul chiffre qu'un tableau ne porte nulle part
 * ailleurs.
 *
 * Il se cale à gauche, au-dessus de la colonne des titres qu'il compte : posé
 * à droite, il surplombe la colonne des dates, et un nombre aligné sur une
 * colonne se lit comme le total de cette colonne-là.
 *
 * ## Pourquoi il est ici
 *
 * Le journal des Actions l'avait écrit chez lui. Tout écran qui veut la même
 * ligne d'en-tête devait donc emprunter ses classes ou s'en refaire une, et la
 * seconde aurait dérivé (règle 4).
 *
 * @param {object} quoi
 * @param {string} [quoi.iconeHtml] l'icône, déjà rendue
 * @param {string} [quoi.dit] ce qu'on compte, écrit en toutes lettres
 * @param {string} [quoi.titre] l'infobulle
 */
export function renderDataTableCount({ iconeHtml = "", dit = "", titre = "" } = {}) {
  return `
    <span class="data-table-shell__compte"${titre ? ` title="${escapeHtml(titre)}"` : ""}>
      ${iconeHtml}
      <span>${escapeHtml(dit)}</span>
    </span>
  `;
}

/** La classe de la cellule d'en-tête qui porte ce compte. Écrite une fois. */
export const COLONNE_DU_COMPTE = "data-table-shell__head-col--compte";

/**
 * Ce qui, dans une en-tête, se pousse à droite.
 *
 * L'en-tête d'un tableau porte deux choses de nature différente : ce qui
 * **décrit** ce qu'on voit — le compte, les filtres —, et ce qui **agit**
 * dessus — un menu d'ordre. Collées l'une à l'autre, on les lit comme une seule
 * barre et l'on cherche le compte au milieu des boutons.
 *
 * Le nom vit ici, avec celui de la colonne du compte : écrit dans la feuille de
 * style et recopié dans chaque écran, il se renommerait un jour d'un seul côté
 * et le menu reviendrait se coller au compte, sans que rien ne tombe (règle 10).
 */
export const POUSSE_A_DROITE = "data-table-shell__head-pousse";
