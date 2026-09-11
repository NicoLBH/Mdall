import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

export function renderSpinnerHtml(options = {}) {
  const className = String(options.className || "").trim();
  const label = String(options.label || "Chargement").trim() || "Chargement";
  const sizeClass = String(options.size || "md").trim();
  const classes = ["ui-spinner", `ui-spinner--${escapeHtml(sizeClass)}`, className].filter(Boolean).join(" ");

  return `
    <span class="${classes}" role="status" aria-label="${escapeHtml(label)}">
      <span class="ui-spinner__ring" aria-hidden="true"></span>
    </span>
  `;
}

/**
 * Le sablier de l'attente : celui que le copilote fait tourner sous chaque
 * étape.
 *
 * ## Pourquoi il vit ici, et pas deux fois
 *
 * Trois écrans attendent quelque chose — le copilote pendant qu'il réfléchit,
 * la revue d'une proposition pendant que l'analyse tourne, le bouton de fusion
 * pendant qu'on ne peut pas encore fusionner. Trois attentes de même nature :
 * *le système travaille, patientez*. Leur donner trois figures ferait croire à
 * trois choses différentes.
 *
 * Ce n'est pas `renderSpinnerHtml` : celui-là est l'anneau des chargements de
 * tableaux, plus gros et centré dans un vide. Celui-ci se pose **en ligne**, à
 * côté d'un mot, et c'est ce qui le rend utilisable dans un bouton.
 *
 * Il porte la classe du copilote parce que c'est de là qu'il vient et que
 * l'animation y est déjà écrite. La renommer coûterait une feuille de style
 * pour ne rien changer à l'écran.
 */
export function renderAttenteSpinner({ label = "" } = {}) {
  const nomme = String(label || "").trim();
  return `<span class="copilote-spinner"${
    nomme ? ` role="status" aria-label="${escapeHtml(nomme)}"` : ' aria-hidden="true"'
  }>${svgIcon("attachment-upload-spinner")}</span>`;
}
