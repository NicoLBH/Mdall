/**
 * La ligne de titre d'un écran : son nom à gauche, ses actions à droite.
 *
 * ## Pourquoi elle est ici et pas dans chaque écran
 *
 * Les Labels, les Objectifs et les Vues portaient chacun leur propre ligne de
 * titre, écrite à la main. Les trois se ressemblaient assez pour qu'on les
 * croie identiques, et différaient assez pour qu'on le voie : une taille de
 * police, un espacement sous le trait, un bouton calé autrement. Chaque écran
 * nouveau se recalibrait donc contre les précédents — et le suivant
 * recommencerait.
 *
 * Elle vit désormais à un seul endroit (`docs/fondamentaux.md`, règle 10). Un
 * écran qui la veut l'appelle ; un réglage qu'on change les change tous.
 *
 * ## Le `padding-bottom` fait partie du titre
 *
 * C'est l'espace qui sépare le titre de ce qu'il annonce, et il n'appartient
 * pas au tableau qui suit : un tableau posé ailleurs emporterait sa marge, et
 * deux écrans qui l'ajoutent chacun de leur côté finissent avec deux valeurs.
 * Il est donc dans `.project-table-toolbar--titre`, avec le reste.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { renderProjectTableToolbar, renderProjectTableToolbarGroup } from "./project-table-toolbar.js";

/**
 * @param {object} options
 * @param {string} options.titre le nom de l'écran
 * @param {string} [options.actionsHtml] ce qui se pose à droite — un bouton, souvent
 * @param {string} [options.className] de quoi distinguer un écran, jamais de quoi
 *   le recalibrer : la taille et les espacements viennent d'ici
 */
export function renderTitreDEcranHtml({ titre = "", actionsHtml = "", className = "" } = {}) {
  return renderProjectTableToolbar({
    className: `project-table-toolbar--titre ${className}`.trim(),
    leftHtml: renderProjectTableToolbarGroup({
      html: `<div class="project-table-toolbar__title">${escapeHtml(titre)}</div>`
    }),
    rightHtml: actionsHtml ? renderProjectTableToolbarGroup({ html: actionsHtml }) : ""
  });
}
