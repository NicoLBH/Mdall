/**
 * Le dessin d'un graphique, et il n'y en a qu'un.
 *
 * ## Pourquoi un seul
 *
 * Deux objets du langage se dessinent : l'**abaque** d'une courbe, et le
 * **tableau** qu'une boucle déroule. Deux rendus écrits séparément auraient
 * chacun leur cadre, leur marge, leur épaisseur de trait et leur famille de
 * classes — et il aurait fallu les recalibrer l'un contre l'autre à chaque
 * retouche, pour finir par deux dessins qui ne se ressemblent plus.
 *
 * Celui-ci prend des séries déjà ramenées entre 0 et 1 par
 * `trace-dun-graphique.js`, et les pose sur sa grille. Il ne sait rien du
 * langage : ni ce qu'est une courbe, ni ce qu'est une boucle.
 *
 * ## Il n'a pas d'axes chiffrés, et c'est voulu
 *
 * Les nombres sont **sous** le dessin, dans le tableau, où ils se lisent
 * exactement. Les répéter en graduations ferait deux lectures du même fait,
 * dont l'une approximative — et c'est celle-là qu'on croirait.
 */

import { escapeHtml } from "../../utils/escape-html.js";

/** Le cadre, en unités de la vue : large, plat, et sans graduations. */
export const CADRE = { largeur: 320, hauteur: 110, marge: 10 };

/**
 * Les couleurs des séries, dans l'ordre où elles se présentent.
 *
 * **Trois, et ensuite on recommence.** Un tableau à sept colonnes dessiné en
 * sept teintes ne se lit plus : on cherche la légende au lieu de regarder la
 * forme. Trois se distinguent d'un coup d'œil, et au-delà c'est le tableau
 * qu'il faut lire.
 */
export const TEINTES = ["une", "deux", "trois"];

/** Où un point normalisé tombe dans le cadre. */
function ou(point) {
  const { largeur, hauteur, marge } = CADRE;
  return [
    marge + point.x * (largeur - 2 * marge),
    // L'ordonnée se retourne : un canevas compte du haut, une courbe monte.
    hauteur - marge - point.y * (hauteur - 2 * marge)
  ];
}

/** Une ligne brisée, et ses points. */
function enLignes(series) {
  return series.map((une, rang) => {
    const teinte = TEINTES[rang % TEINTES.length];
    const chemin = une.points
      .map((point, ou_) => `${ou_ ? "L" : "M"}${ou(point).map(Math.round).join(" ")}`)
      .join(" ");

    return `
      <path d="${chemin}" fill="none"
        class="graphique__ligne graphique__ligne--${teinte}" />
      ${une.points.map((point) => {
        const [x, y] = ou(point);
        return `<circle cx="${Math.round(x)}" cy="${Math.round(y)}" r="2.5"
          class="graphique__point graphique__point--${teinte}"><title>${escapeHtml(
          `${une.nom ? `${une.nom} · ` : ""}${point.dit} → ${point.vaut}`
        )}</title></circle>`;
      }).join("")}
    `;
  }).join("");
}

/**
 * Des barres, groupées par abscisse.
 *
 * **Elles partent du bas du cadre, et non du plus petit point.** Une barre dit
 * une quantité : la tronquer à la base fait lire un rapport de trois pour un là
 * où il est de un pour un virgule un. C'est la faute classique du graphique, et
 * la seule que la forme elle-même impose d'éviter.
 */
function enBarres(series) {
  const { largeur, hauteur, marge } = CADRE;
  const combien = series[0]?.points.length ?? 0;
  if (!combien) return "";

  const pas = (largeur - 2 * marge) / combien;
  const large = Math.max(1, (pas * 0.7) / series.length);

  return series.map((une, rang) => {
    const teinte = TEINTES[rang % TEINTES.length];
    return une.points.map((point, colonne) => {
      const gauche = marge + colonne * pas + (pas * 0.15) + rang * large;
      const haut = hauteur - marge - point.y * (hauteur - 2 * marge);
      return `<rect x="${Math.round(gauche)}" y="${Math.round(haut)}"
        width="${Math.max(1, Math.round(large))}" height="${Math.max(1, Math.round(hauteur - marge - haut))}"
        class="graphique__barre graphique__barre--${teinte}"><title>${escapeHtml(
        `${une.nom ? `${une.nom} · ` : ""}${point.dit} → ${point.vaut}`
      )}</title></rect>`;
    }).join("");
  }).join("");
}

/**
 * Le dessin d'un tracé, en lignes ou en barres.
 *
 * @param {object} trace ce que `traceDesSeries` rend
 * @param {object} quoi
 * @param {boolean} [quoi.barres] des barres plutôt que des lignes
 * @param {string} [quoi.titre] ce que le dessin représente, pour qui l'écoute
 * @param {string[]} [quoi.bornes] les deux bouts de l'abscisse, en clair
 * @param {boolean} [quoi.legende] nommer les séries sous le dessin
 */
export function renderGraphique(trace = null, {
  barres = false, titre = "", bornes = [], legende = false
} = {}) {
  const series = trace?.series ?? [];
  if (!series.length) return "";

  const { largeur, hauteur } = CADRE;
  const marque = trace.marque;

  return `
    <figure class="graphique">
      <svg viewBox="0 0 ${largeur} ${hauteur}" class="graphique__trace"
        role="img" aria-label="${escapeHtml(titre)}">
        ${barres ? enBarres(series) : enLignes(series)}
        ${marque ? `<circle cx="${Math.round(ou(marque)[0])}" cy="${Math.round(ou(marque)[1])}"
          r="4" class="graphique__lu" />` : ""}
      </svg>
      ${bornes.length === 2
        ? `<figcaption class="graphique__bornes">
             <span>${escapeHtml(bornes[0])}</span>
             <span>${escapeHtml(bornes[1])}</span>
           </figcaption>`
        : ""}
      ${legende && series.length > 1
        ? `<ul class="graphique__legende">
             ${series.map((une, rang) => `<li class="graphique__nom graphique__nom--${
               TEINTES[rang % TEINTES.length]}">${escapeHtml(une.nom)}</li>`).join("")}
           </ul>`
        : ""}
    </figure>
  `;
}
