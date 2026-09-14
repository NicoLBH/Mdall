/**
 * Un « ? » qui explique, et n'occupe rien tant qu'on ne le demande pas.
 *
 * ## Le problème qu'il résout
 *
 * Les écrans d'analyse expliquaient ce qu'ils montraient — ce qu'est un mot
 * retrouvé, ce que vaut une citation, qui a rapproché quoi. Ces phrases sont
 * justes et utiles **la première fois**. À la dixième lecture, elles occupent
 * le tiers de l'écran pour redire ce qu'on sait déjà, et l'on prend l'habitude
 * de sauter des paragraphes — y compris ceux qui portent un avertissement.
 *
 * L'explication reste donc disponible, et cesse d'être imposée.
 *
 * ## Pourquoi `<details>` et pas un menu à nous
 *
 * Parce que le navigateur sait déjà le faire : ouvrir, fermer, au clavier, et
 * l'annoncer aux lecteurs d'écran. Un menu maison demanderait un état, un
 * gestionnaire de clic extérieur, une gestion du focus — trois occasions de se
 * tromper pour un résultat identique.
 *
 * Le `title` reste posé sur le bouton : le survol donne la première phrase sans
 * même cliquer, et c'est souvent tout ce qu'on voulait.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le bouton et son explication.
 *
 * @param {object} options
 * @param {string} options.titre ce que le panneau annonce, en une ligne
 * @param {string} options.corps l'explication, en HTML déjà échappé par
 *   l'appelant quand elle porte du gras — c'est du texte rédigé, pas une valeur
 * @param {string} [options.resume] la phrase du survol. À défaut, le titre.
 * @param {string} [options.className] pour le placer
 */
export function renderBoutonAide({ titre = "", corps = "", resume = "", className = "" } = {}) {
  if (!texte(corps)) return "";

  return `
    <details class="aide ${escapeHtml(className)}">
      <summary class="aide__bouton" title="${escapeHtml(texte(resume) || texte(titre))}"
        aria-label="${escapeHtml(titre ? `Expliquer : ${titre}` : "Explication")}">
        ${svgIcon("question", { className: "octicon" })}
      </summary>
      <div class="aide__panneau" role="note">
        ${titre ? `<b class="aide__titre">${escapeHtml(titre)}</b>` : ""}
        <div class="aide__corps">${corps}</div>
      </div>
    </details>
  `;
}
