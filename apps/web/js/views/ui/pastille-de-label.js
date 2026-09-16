/**
 * La pastille d'un label, et la façon de lire sa définition.
 *
 * ## Pourquoi c'est un module, et non une fermeture dans l'écran des Sujets
 *
 * Les deux vivaient dans le contrôleur des labels d'un projet, qui lit le
 * magasin de cet écran-là. Le carnet montre les mêmes labels — sur les sujets
 * qu'une situation retient, tous chantiers confondus —, et il n'a pas ce
 * magasin. Recopier la pastille aurait fait deux dessins qui se ressemblent
 * assez pour qu'on les croie identiques et diffèrent assez pour qu'on le voie :
 * une couleur de repli ici, une bordure là (règle 10).
 *
 * Rien ici ne lit ni le magasin ni la base : une définition entre, du texte
 * sort. C'est pour cela que ça s'exécute en test.
 */

import { escapeHtml } from "../../utils/escape-html.js";

/**
 * Une définition de label, ramenée à une forme sur laquelle on peut compter.
 *
 * **Les noms d'une même chose sont nombreux** — `name`, `label`, `label_key`,
 * `hex_color`, `textColor` — parce qu'ils viennent de la base, d'un formulaire
 * et d'un ancien écran. Les lire au coup par coup laisse chaque appelant en
 * oublier un, et la pastille sort grise sans que rien ne le dise.
 */
export function definitionDeLabel(labelDef = {}) {
  const id = String(labelDef.id || "").trim();
  const key = String(labelDef.label_key || labelDef.labelKey || labelDef.key || labelDef.name || id).trim();
  const label = String(labelDef.name || labelDef.label || key || "Label").trim() || "Label";
  const hexColor = String(labelDef.hex_color || labelDef.hexColor || labelDef.text_color || labelDef.textColor || "#8b949e").trim() || "#8b949e";
  const textColor = String(labelDef.text_color || labelDef.textColor || hexColor).trim() || hexColor;
  const backgroundColor = String(labelDef.background_color || labelDef.backgroundColor || labelDef.color || `${hexColor}22`).trim() || `${hexColor}22`;
  const borderColor = String(labelDef.border_color || labelDef.borderColor || `${hexColor}66`).trim() || `${hexColor}66`;
  const description = String(labelDef.description || "").trim();

  return {
    ...labelDef,
    id,
    key,
    label_key: key,
    labelKey: key,
    label,
    name: label,
    description,
    color: backgroundColor,
    background_color: backgroundColor,
    backgroundColor,
    text_color: textColor,
    textColor,
    border_color: borderColor,
    borderColor,
    hex_color: hexColor,
    hexColor,
    sort_order: Number.isFinite(Number(labelDef.sort_order)) ? Number(labelDef.sort_order) : 0,
    sortOrder: Number.isFinite(Number(labelDef.sort_order)) ? Number(labelDef.sort_order) : 0
  };
}

/** La pastille elle-même : son nom, sa couleur de fond, la sienne pour le texte. */
export function renderPastilleDeLabel(labelDef) {
  const normalise = definitionDeLabel(labelDef);

  return `<span class="subject-label-badge" style="--subject-label-bg:${
    escapeHtml(normalise.color)};--subject-label-fg:${
    escapeHtml(normalise.textColor || "#ffffff")};--subject-label-border:${
    escapeHtml(normalise.borderColor || normalise.color)};">${escapeHtml(normalise.label)}</span>`;
}
