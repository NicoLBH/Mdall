/**
 * Le nom d'un document, rendu de façon à **prendre toute la largeur** avant de
 * se couper.
 *
 * ## Pourquoi un composant, et non deux `<span>` dans chaque écran
 *
 * Deux écrans listent les mêmes documents du même chantier : le tableau des
 * analyses, et le choix depuis Fichiers. Recopié, le découpage se corrigerait
 * un jour d'un seul côté — et l'on verrait le même fichier sous deux noms
 * différents selon l'écran d'où on le regarde (règle 4).
 *
 * ## Deux morceaux, et c'est tout l'objet
 *
 * Le découpage vient de `un-nom-trop-long.js`, qui est pur. Ici il devient deux
 * éléments, et c'est la feuille de style qui décide **à l'exécution** si le
 * premier doit se rogner : il prend la place disponible, la fin ne bouge jamais.
 *
 * Un nom qui tient s'affiche donc entier, sans points de suspension et sans un
 * pixel perdu — ce qu'aucun compte de caractères ne peut faire.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { ceQuUnNomMontre } from "../../services/un-nom-trop-long.js";

/** La classe du conteneur. L'appelant la pose sur **son** élément. */
export const NOM_COUPABLE = "nom-coupable";

/**
 * Les deux morceaux d'un nom, à poser dans un élément portant `NOM_COUPABLE`.
 *
 * On rend l'intérieur et non l'élément : un écran l'enveloppe dans un
 * `<button>` — le nom se clique et ouvre le document —, l'autre dans un
 * `<span>` — le document ne s'ouvre pas. Rendre l'élément ici obligerait à lui
 * passer sa balise, ses attributs et ses marques, c'est-à-dire à réécrire
 * l'appelant à l'intérieur du composant.
 */
export function renderLesMorceauxDuNom(nom) {
  const ce = ceQuUnNomMontre(nom);

  /**
   * **Le début est omis quand il est vide**, et non rendu en balise creuse : un
   * nom court — `CR_16.pdf` — passe entier dans la fin, et un `<span>` vide à
   * côté de lui n'est pas une absence de nom, c'est du balisage qu'on relit en
   * se demandant ce qu'il fait là.
   */
  return `${ce.debut
    ? `<span class="${NOM_COUPABLE}__debut">${escapeHtml(ce.debut)}</span>` : ""
  }<span class="${NOM_COUPABLE}__fin">${escapeHtml(ce.fin)}</span>`;
}

/** Le nom entier, pour l'infobulle — toujours, parce qu'on ne sait pas s'il tient. */
export function leNomEntier(nom) {
  return ceQuUnNomMontre(nom).titre;
}
