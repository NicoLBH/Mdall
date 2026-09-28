/**
 * Le tableau d'une boucle, et la lecture qu'on en fait.
 *
 * ## Pourquoi ça vit seul
 *
 * **Deux écrans montrent le tableau d'une fonction** : le bac d'essai, où on
 * l'écrit, et l'écran des fichiers, où on la relit une fois versée. Ce sont
 * deux moments très différents — l'un répond à « qu'est-ce que ça donne si »,
 * l'autre à « qu'est-ce que ça donne sur ce que le projet tient » —, et
 * exactement le même dessin.
 *
 * Écrits deux fois, ils auraient divergé au premier réglage : une colonne
 * écartée dite d'un côté et tue de l'autre, un cadre empilé ici et un second
 * axe là. Ils vivent donc ici, une fois, et les deux écrans s'en servent
 * (règle 10).
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne décide pas de la lecture.** On la lui donne — `lectureRetenue` la
 * décide ailleurs, à partir de ce qu'on a choisi et de ce que la fonction
 * suggère. Il ne tient aucun état : c'est ce qui permet à deux écrans qui n'ont
 * rien en commun de l'appeler.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { traceDesGroupes } from "../../services/trace-dun-graphique.js";
import {
  LECTURE, phraseDesCadres, phraseDesEcartees, seriesDuTableau
} from "../../services/graphique-dune-table.js";
import { FORME, renderGraphiquesEmpiles } from "./graphique.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** La forme du dessin, pour chaque lecture qui en est un. */
const FORME_DE_LA_LECTURE = {
  [LECTURE.COURBE]: FORME.LIGNES,
  [LECTURE.BARRES]: FORME.BARRES,
  [LECTURE.NUAGE]: FORME.NUAGE
};

/**
 * Le dessin d'un tableau, dans la lecture choisie.
 *
 * **Une grandeur par cadre, et les cadres s'empilent** sur la même abscisse.
 * Un second axe à droite aurait tenu dans un seul cadre, et c'est la façon la
 * plus commune de faire lire une corrélation qui n'existe pas : deux échelles
 * choisies séparément placent le croisement où l'on veut.
 *
 * **Les colonnes écartées se disent.** Les taire ferait un dessin qui a l'air
 * complet : on compterait trois courbes là où le tableau en a quatre, sans
 * qu'un mot dise laquelle manque (règle 5).
 */
export function renderGraphiqueDuTableau(tableau = null, retenue = null) {
  const lecture = texte(retenue?.lecture);
  const forme = FORME_DE_LA_LECTURE[lecture];
  if (!forme) return "";

  const { abscisse, groupes, ecartees } = seriesDuTableau(tableau, { abscisse: texte(retenue?.abscisse) });
  if (!groupes.length) return "";

  // Les deux bouts de l'abscisse, tels qu'ils étaient écrits. Ils se prennent
  // sur les points **posés**, et non sur la suite annoncée : une ligne manquée
  // au bout donnerait une borne qu'aucun point n'atteint.
  const poses = groupes.flatMap((un) => un.series.flatMap((une) => une.points));
  const dits = poses.map((un) => un.dit);

  const dessin = renderGraphiquesEmpiles(
    traceDesGroupes(groupes, { depuisZero: lecture === LECTURE.BARRES }),
    {
      forme,
      titre: `Le tableau de ${abscisse}, en ${lecture}`,
      bornes: [dits[0], dits[dits.length - 1]],
      legende: true
    }
  );

  const notes = [phraseDesCadres(groupes), phraseDesEcartees(ecartees)].filter(Boolean);
  return `${dessin}${notes.map((une) =>
    `<p class="bac-resultat__note">${escapeHtml(une)}</p>`).join("")}`;
}

/**
 * Le tableau qu'une boucle a déroulé.
 *
 * ## Pourquoi un vrai tableau, et pas un résumé
 *
 * Tout le gain de `pour chaque` est qu'on **relit les lignes une à une** contre
 * la note de calcul d'origine. N'en montrer que l'agrégat rendrait un total
 * qu'il faudrait croire — c'est-à-dire exactement le tableur qu'on remplace, et
 * la raison pour laquelle une boucle produit un tableau plutôt qu'une variable
 * qui s'accumule.
 *
 * ## Une ligne qui n'a pas su se calculer reste
 *
 * Avec sa case vide, et ce qu'elle dit au survol. La retirer ferait un tableau
 * plus court que la suite annoncée, et l'on ne verrait pas **laquelle** des
 * quarante-cinq portées a échoué — c'est précisément la ligne qu'on cherche.
 */
export function renderTableauDeLaBoucle(tableau = null) {
  if (!tableau?.nom) return "";

  if (tableau.refus) {
    return `<p class="bac-resultat__note">${escapeHtml(
      `Le tableau de « ${tableau.nom} » ne s'est pas déroulé : ${tableau.pourquoi}.`
    )}</p>`;
  }

  if (!tableau.lignes.length) return "";

  return `
    <table class="bac-tableau">
      <caption class="bac-tableau__titre">${escapeHtml(
        `${tableau.lignes.length} ${tableau.lignes.length > 1 ? "lignes" : "ligne"}, une par ${tableau.nom}`
      )}</caption>
      <thead>
        <tr>
          <th scope="col">${escapeHtml(tableau.nom)}</th>
          ${tableau.colonnes.map((nom) => `<th scope="col">${escapeHtml(nom)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${tableau.lignes.map((ligne) => `
          <tr>
            <th scope="row">${escapeHtml(ligne.valeur)}</th>
            ${tableau.colonnes.map((nom) => {
              const case_ = ligne.cases.find((une) => une.nom === nom);
              return `<td${case_?.connu ? "" : ' class="bac-tableau__vide"'}${
                case_?.connu || !case_?.pourquoi ? "" : ` title="${escapeHtml(case_.pourquoi)}"`}>${
                case_?.connu ? escapeHtml(case_.valeur) : "—"}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/**
 * Le tableau, dans la lecture retenue : le dessin **ou** les lignes.
 *
 * **Les deux ensemble feraient deux lectures du même fait**, et l'on lirait
 * celle du haut. Le bouton dit qu'on choisit ; montrer les deux dirait qu'on ne
 * choisit pas.
 */
export function renderLectureDuTableau(tableau = null, retenue = null) {
  return texte(retenue?.lecture) === LECTURE.TABLEAU || !retenue
    ? renderTableauDeLaBoucle(tableau)
    : renderGraphiqueDuTableau(tableau, retenue);
}
