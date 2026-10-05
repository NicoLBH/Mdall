/**
 * Un ton — **la pastille qui dit où en est quelque chose, écrite une fois.**
 *
 * ## Pourquoi ce composant existe
 *
 * > « Il faut mutualiser ces classes, c'est pénible sinon de toujours tout
 * >   recalibrer entre les différents écrans. »
 *
 * Six écrans portent la même chose : un mot court, encadré, dont la couleur dit
 * si c'est bon, si c'est en attente, si c'est grave, ou si on ne sait pas.
 * L'appréciation d'un avis de bureau de contrôle, l'état d'une étape du
 * parcours, l'issue d'une exécution. Chacun l'écrivait chez lui, avec ses
 * propres classes et son propre `padding`, et c'est pour cela qu'il fallait
 * tout recalibrer à chaque écran neuf.
 *
 * ## Les six tons, et pourquoi `unknown` en est un
 *
 * `ok`, `pending`, `danger`, `info`, `neutral`, `unknown`. Les cinq premiers se
 * devinent ; le sixième est celui qu'on oublie, et c'est le plus important.
 *
 * « On ne sait pas » n'est ni bon, ni mauvais, ni neutre : c'est une réponse, et
 * elle demande qu'on aille voir. Le peindre comme `neutral` le ferait lire
 * « sans objet », c'est-à-dire « il n'y a rien à faire » — alors qu'il n'y a
 * rien *de lu*. C'est la règle 5, portée dans une feuille de style.
 *
 * ## Il ne décide de rien
 *
 * Un mot et un ton entrent, du HTML sort. **Quel** ton convient à **quel** état
 * est une question de métier, et elle se tranche dans les services —
 * `ceQueVautLappreciation` pour un avis, `CE_QUE_LETAT_DIT` pour une étape du
 * parcours. Un composant qui en déciderait serait un second endroit où le sens
 * se décide, et le premier à changer gagnerait (règle 4).
 */

import { escapeHtml } from "../../utils/escape-html.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les tons permis.
 *
 * **La liste nomme ce qui est permis, elle ne décrit pas ce qui existe.** Un ton
 * qui n'y figure pas retombe sur `unknown` plutôt que de sortir sans classe :
 * une pastille sans couleur se lit comme une pastille neutre, c'est-à-dire
 * comme une affirmation qu'on n'a pas faite.
 */
export const LES_TONS = ["ok", "pending", "danger", "info", "neutral", "unknown"];

/** Le ton demandé, ou `unknown`. Rien n'est approché. */
export function leTonValide(vaut = "") {
  const dit = texte(vaut).toLowerCase();
  return LES_TONS.includes(dit) ? dit : "unknown";
}

/**
 * La pastille.
 *
 * @param {object} options
 * @param {string} options.mot ce qu'elle dit, en toutes lettres
 * @param {string} options.vaut l'un de `LES_TONS`
 * @param {string} [options.titre] ce que le survol explique, quand le mot ne
 *   suffit pas. Jamais obligatoire : une pastille dont le sens tiendrait dans un
 *   `title` est une pastille dont le mot est mal choisi.
 * @returns {string} du HTML, ou `""` quand il n'y a pas de mot — une pastille
 *   vide occuperait la place d'une information qu'on n'a pas.
 */
export function renderUnTon({ mot = "", vaut = "", titre = "" } = {}) {
  const dit = texte(mot);
  if (!dit) return "";

  const ton = leTonValide(vaut);
  const survol = texte(titre);

  return `<span class="un-ton un-ton--${ton}"${
    survol ? ` title="${escapeHtml(survol)}"` : ""}>${escapeHtml(dit)}</span>`;
}
