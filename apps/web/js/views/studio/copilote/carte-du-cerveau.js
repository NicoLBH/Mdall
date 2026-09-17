/**
 * Le cerveau du projet, dans le fil de la conversation.
 *
 * ## Le dessin est là, vivant, et c'est ce qui donne envie de l'ouvrir
 *
 * La carte ne portait que des chiffres et un bouton. Trois nombres ne donnent
 * envie de rien : on lit « 214 liens », on hausse les épaules, on passe. Le
 * dessin, lui, **bat** — et un projet qui pense dans une bulle de conversation
 * se regarde, puis s'ouvre en grand.
 *
 * C'est le **même** dessin, pas une version réduite : la boucle d'animation, le
 * battement, le glissé, la molette et les secteurs sont ceux de la fenêtre. Un
 * second dessin « simplifié » aurait été un second dessin à corriger, et deux
 * dessins d'un même projet finissent par ne plus se ressembler (règle 4). Ce
 * que le cadre retire est ce qui n'a pas de place ici : le rail des réglages et
 * la croix — un message ne se ferme pas.
 *
 * Les chiffres restent, au-dessus : le dessin dit la forme, ils disent la
 * mesure. Et le bouton reste, parce qu'à quatre cent vingt pixels de haut on
 * voit qu'il y a quelque chose, pas ce que c'est.
 *
 * ## La carte ne monte rien elle-même
 *
 * Elle rend du HTML, et un creux marqué où le dessin ira. C'est l'écran qui l'y
 * pose, après le rendu : un module qui dessine ne s'importe pas dans un test,
 * et celui-ci doit pouvoir s'exécuter.
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
        **Le creux où le dessin se pose.** Il porte la place qu'il occupe dans
        le fil : c'est par elle que l'écran retrouve le matériau à dessiner,
        sans le recopier dans un attribut — une mémoire de projet entière.
      */""}
      <div class="copilote-cerveau__scene" data-copilote-cerveau-scene="${escapeHtml(String(rang))}"></div>
      ${/*
        **Le bouton ouvre le dessin, il ne le recalcule pas.** Le matériau est
        celui que l'agent vient de lire : rouvrir sur une mémoire relue
        montrerait un autre dessin que celui dont la réponse parle.
      */""}
      <button type="button" class="copilote-cerveau__ouvrir"
        data-copilote-cerveau="${escapeHtml(String(rang))}">
        ${svgIcon("screen-full")} Ouvrir le cerveau en grand
        <small>les réglages, les secteurs, l'onde au clic</small>
      </button>
    </div>
  `;
}
