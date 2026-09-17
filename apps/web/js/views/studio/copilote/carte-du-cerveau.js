/**
 * Le cerveau du projet, dans le fil de la conversation.
 *
 * ## Pourquoi une carte, et pas le dessin
 *
 * Le cerveau est une toile animée qui prend l'écran : on y navigue, on clique un
 * nœud, on suit une onde. Le poser dans une bulle de conversation en ferait une
 * vignette illisible — et une seconde boucle d'animation par message, qui
 * tournerait encore dans un fil qu'on a fait défiler trois écrans plus haut.
 *
 * La carte dit donc **ce que le dessin contient**, en chiffres, et l'ouvre en
 * grand d'un bouton. C'est la même sélection : rien n'est recalculé, le
 * matériau est celui que l'agent vient de lire.
 *
 * ## Les chiffres qu'elle porte, et pourquoi ceux-là
 *
 * Trois, et pas un de plus : **ce que le projet sait** (les affirmations), **ce
 * qu'il sait refaire** (les règles), et **ce qui se rejoue** (la part des liens
 * qui passent par une règle). Le dernier est celui qu'on regarde : il dit si
 * changer une valeur en amont recalculera ce qui en découle, ou s'il faudra
 * tout reprendre à la main.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * L'écran du Copilote parle à la base, et un module qui parle à la base ne
 * s'importe pas dans un test : l'import lève avant la première ligne. Ce dessin,
 * lui, n'a besoin que de nombres.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";

const accorde = (n, un, plusieurs) => (Math.abs(n) > 1 ? plusieurs : un);

/**
 * Ce que dit la part des liens qui se rejouent.
 *
 * Trois états, et ils ne se disent pas pareil : tout se rejoue, rien ne se
 * rejoue, ou une partie. Un pourcentage seul ne dit pas s'il est bon.
 */
export function motDeLaRejouabilite(lecture = {}) {
  const { total = 0, sansRegle = 0, partParUneRegle = null } = lecture?.liens ?? {};

  if (!total) return { mot: "—", quoi: "aucun lien dessiné" };
  if (sansRegle === 0) return { mot: "100 %", quoi: "tout le dessin se rejoue" };
  if (partParUneRegle === 0) return { mot: "0 %", quoi: "rien ne se rejoue encore" };

  return {
    mot: `${partParUneRegle} %`,
    quoi: `${sansRegle} ${accorde(sansRegle, "lien orange", "liens orange")} ne ${
      accorde(sansRegle, "passe", "passent")} par aucune règle`
  };
}

/**
 * La carte du cerveau, telle qu'elle se pose dans le fil.
 *
 * @param {object} lecture ce que rend `services/lecture-du-cerveau.js`
 * @param {number} rang la place de cette exécution dans le message — c'est par
 *   lui que le bouton retrouve le matériau à rouvrir, sans le recopier dans le
 *   HTML (une mémoire de projet entière dans un attribut).
 */
export function renderCarteDuCerveau(lecture = null, rang = 0) {
  if (!lecture) return "";

  const rejouable = motDeLaRejouabilite(lecture);
  const chiffre = (valeur, nom, precision) => `
    <li class="copilote-cerveau__chiffre">
      <b>${escapeHtml(String(valeur))}</b>
      <span>${escapeHtml(nom)}</span>
      ${precision ? `<small>${escapeHtml(precision)}</small>` : ""}
    </li>`;

  const valeurs = lecture.valeurs?.total ?? 0;
  const regles = lecture.regles ?? 0;

  return `
    <div class="copilote-cerveau">
      <p class="copilote-outil__titre">
        ${svgIcon("memoire-vive")}
        ${escapeHtml("Le cerveau du projet")}
        ${lecture.selection
          ? `<span class="copilote-outil__version mono">${escapeHtml(lecture.selection)}</span>`
          : ""}
      </p>
      <ul class="copilote-cerveau__chiffres">
        ${chiffre(valeurs, accorde(valeurs, "affirmation", "affirmations"),
          `${lecture.valeurs?.socle ?? 0} de socle`)}
        ${chiffre(regles, accorde(regles, "règle", "règles"),
          `${lecture.profondeur ?? 0} ${accorde(lecture.profondeur ?? 0, "pas", "pas")} de chaîne`)}
        ${chiffre(rejouable.mot, "se rejoue", rejouable.quoi)}
      </ul>
      ${/*
        **Le bouton ouvre le dessin, il ne le recalcule pas.** Le matériau est
        celui que l'agent vient de lire : rouvrir sur une mémoire relue
        montrerait un autre dessin que celui dont la réponse parle.
      */""}
      <button type="button" class="bouton-discret copilote-cerveau__ouvrir"
        data-copilote-cerveau="${escapeHtml(String(rang))}">
        ${svgIcon("screen-full")} Ouvrir le cerveau
      </button>
    </div>
  `;
}
