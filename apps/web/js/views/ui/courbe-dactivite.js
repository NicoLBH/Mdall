/**
 * La courbe d'activité : une ligne verte, large comme une cellule.
 *
 * ## Ce qu'elle montre, et à quelle échelle
 *
 * Une forme, pas une mesure. Chaque projet est tracé **à l'échelle de son
 * propre maximum** : sinon un chantier calme à côté d'un chantier très actif
 * serait une ligne plate, et l'on ne verrait pas qu'il a repris le mois
 * dernier. C'est ce que fait la même courbe sur une liste de dépôts, et c'est
 * pourquoi le total se lit au survol — une forme sans chiffre laisse deviner un
 * ordre de grandeur qu'elle ne porte pas.
 *
 * ## Pourquoi elle est en SVG, et écrite ici
 *
 * Elle se répète à chaque ligne du tableau : une image par projet ferait autant
 * d'allers-retours, et un canevas par ligne autant de contextes de dessin. Un
 * `path` de cinquante-deux points pèse quelques centaines d'octets et se
 * redessine avec la ligne.
 *
 * Et elle est **pure** : on lui donne des nombres, elle rend du balisage. C'est
 * ce qui permet de vérifier qu'une courbe plate n'est pas dessinée là où l'on
 * n'a rien lu.
 */

import { escapeHtml } from "../../utils/escape-html.js";

/** Le cadre du dessin. Étiré par le CSS : les unités n'ont pas d'importance. */
const LARGEUR = 100;
const HAUTEUR = 28;

/**
 * Le trait laisse une marge en haut et en bas : un sommet collé au bord est
 * coupé de moitié par l'épaisseur du trait, et l'on croit la courbe écrêtée.
 */
const MARGE = 2;

/** Les points de la ligne, dans le repère du dessin. */
function pointsDe(valeurs = []) {
  const suite = (Array.isArray(valeurs) ? valeurs : []).map((valeur) => Number(valeur) || 0);
  if (!suite.length) return [];

  const sommet = Math.max(...suite);
  const pas = suite.length > 1 ? LARGEUR / (suite.length - 1) : 0;
  const utile = HAUTEUR - 2 * MARGE;

  return suite.map((valeur, rang) => {
    // **Un projet sans rien reste une ligne plate, en bas.** Diviser par zéro
    // la ferait disparaître, et une cellule vide se lit « on n'a pas regardé ».
    const part = sommet > 0 ? valeur / sommet : 0;
    const x = suite.length > 1 ? rang * pas : LARGEUR / 2;
    return [x, HAUTEUR - MARGE - part * utile];
  });
}

/** Un nombre écrit court : le SVG n'a que faire de quinze décimales. */
const court = (valeur) => Math.round(valeur * 100) / 100;

/**
 * La courbe d'un projet.
 *
 * @param {object} options
 * @param {number[]|null} options.valeurs une par semaine, la plus ancienne
 *   d'abord. **`null` quand on n'a pas lu** : on ne dessine alors rien plutôt
 *   qu'une ligne à zéro, qui dirait « rien de l'année » — ce qui est une
 *   information, et fausse (règle 5).
 * @param {string} [options.titre] ce que dit le survol
 */
export function renderCourbeDactivite({ valeurs = null, titre = "" } = {}) {
  if (!Array.isArray(valeurs)) return `<span class="courbe-activite courbe-activite--inconnue"></span>`;

  const points = pointsDe(valeurs);
  if (!points.length) return `<span class="courbe-activite courbe-activite--inconnue"></span>`;

  const trait = points.map(([x, y]) => `${court(x)},${court(y)}`).join(" ");

  return `
    <span class="courbe-activite"${titre ? ` title="${escapeHtml(titre)}"` : ""}>
      <svg class="courbe-activite__dessin" viewBox="0 0 ${LARGEUR} ${HAUTEUR}"
        preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <polyline points="${trait}" fill="none" stroke="currentColor"
          stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"
          vector-effect="non-scaling-stroke" />
      </svg>
    </span>
  `;
}

/**
 * Ce que le survol dit d'une courbe.
 *
 * Le total et la fenêtre, en toutes lettres : « 34 mouvements sur douze mois »
 * se vérifie, une forme ne se vérifie pas.
 */
export function titreDeLaCourbe(total = 0) {
  const compte = Number(total) || 0;
  return compte > 0
    ? `${compte} mouvement${compte > 1 ? "s" : ""} sur les douze derniers mois`
    : "Aucun mouvement sur les douze derniers mois";
}
