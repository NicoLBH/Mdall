/**
 * Un fichier montré comme du code : une ligne, un numéro.
 *
 * ## Pourquoi il est à part
 *
 * Deux écrans dessinent déjà des lignes numérotées — les fichiers de la Mémoire
 * et l'espace de raisonnement — et chacun a les siennes, parce que chacun y
 * ajoute quelque chose : le pliage, le blâme, la trace d'exécution. En écrire un
 * troisième pour la transcription d'un document aurait fait **trois calages à
 * recaler ensemble**, dont deux finiraient en retard sur le premier.
 *
 * Celui-ci ne montre rien de plus que des lignes, et il **reprend les classes de
 * la Mémoire** — `memoire-ligne`, `memoire-ligne__num` — plutôt que d'en
 * inventer. Aucune largeur nouvelle : le numéro fait la même gouttière, la ligne
 * la même hauteur, et retoucher l'un retouche l'autre.
 *
 * ## Il ne rend pas le Markdown
 *
 * C'est le point. Une transcription est **ce que le modèle a compris du PDF**,
 * et on l'ouvre pour la comparer à la page. Rendue en HTML, elle se lit comme un
 * document du projet et l'on ne voit plus ce qui a été ajouté, déplacé ou
 * inventé — exactement ce qu'on vient vérifier.
 *
 * ## Il est pur
 *
 * On lui donne des lignes, il rend du balisage.
 */

import { escapeHtml } from "../../utils/escape-html.js";

/**
 * Les lignes, numérotées.
 *
 * @param {{rang: number, lu: string}[]} lignes
 * @param {object} [options]
 * @param {string} [options.vide] ce qu'on dit quand il n'y a rien à montrer
 * @returns {string}
 */
export function renderFichierDeCode(lignes = [], { vide = "" } = {}) {
  const lues = Array.isArray(lignes) ? lignes : [];

  if (!lues.length) {
    return vide
      ? `<div class="fichier-code fichier-code--vide">${escapeHtml(vide)}</div>`
      : "";
  }

  // Une ligne vide garde sa place et sa hauteur : sans l'espace insécable, elle
  // se replierait à zéro pixel et les numéros ne tomberaient plus en face du
  // texte du PDF qu'on compare.
  const corps = lues.map(({ rang, lu }) => `
    <div class="memoire-ligne">
      <span class="memoire-ligne__num">${Number(rang) || 0}</span>
      <span class="fichier-code__texte">${String(lu ?? "") ? escapeHtml(String(lu)) : "&nbsp;"}</span>
    </div>
  `).join("");

  return `<div class="fichier-code">${corps}</div>`;
}
