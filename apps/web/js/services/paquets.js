/**
 * Découper un travail trop grand pour un seul envoi.
 *
 * ## Pourquoi ce fichier existe
 *
 * Une fonction de calcul plafonne ce qu'elle accepte par requête — soixante
 * semelles pour les fondations, et d'autres nombres ailleurs. Le plafond est
 * légitime : sans lui, une requête occupe le serveur pendant que les autres
 * attendent.
 *
 * Ce qui ne l'est pas, c'est de laisser ce plafond **plafonner le travail**. Un
 * pré-dimensionnement de sept appuis essaie neuf cotes par appui : soixante-trois
 * essais, refusés au motif que « plus de 60 semelles seraient nécessaires ». On
 * ne demandait pas soixante-trois massifs, on essayait soixante-trois fois — et
 * la personne devant l'écran lisait qu'elle avait un projet trop gros.
 *
 * La règle tient en une phrase : **le plafond dit la taille d'un envoi, pas la
 * taille d'un travail.** Ce qui dépasse se découpe et se recolle.
 *
 * ## Ce que ce fichier garantit
 *
 *  - **L'ordre.** Le rang d'un élément dans la réponse est celui de l'élément
 *    dans la question. Sans cela, les cotes d'un appui iraient à son voisin sans
 *    que rien ne le signale — un résultat faux qui a l'air juste.
 *  - **Le parallélisme.** Les paquets partent ensemble. Les envoyer l'un après
 *    l'autre ferait attendre deux fois plus longtemps pour la même dépense.
 *  - **Rien d'autre.** Il ne sait pas ce qu'il transporte, et c'est ce qui lui
 *    permet de servir à tout utilitaire qui a un plafond par requête.
 */

/** Une liste découpée en paquets d'au plus `taille` éléments. */
export function enPaquets(liste = [], taille = 1) {
  const pas = Math.max(1, Math.floor(taille) || 1);
  const paquets = [];
  for (let rang = 0; rang < liste.length; rang += pas) paquets.push(liste.slice(rang, rang + pas));
  return paquets;
}

/**
 * Le même travail, en autant d'envois qu'il faut, recollé dans l'ordre.
 *
 * @param {Array} liste ce qu'il y a à traiter
 * @param {number} taille ce qu'un envoi accepte
 * @param {(paquet: Array, rang: number) => Promise<Array>} envoyer un envoi
 * @returns {Promise<Array>} les résultats, dans l'ordre de la liste
 */
export async function parPaquets(liste = [], taille = 1, envoyer) {
  if (!liste.length) return [];
  const paquets = enPaquets(liste, taille);
  const rendus = await Promise.all(paquets.map((paquet, rang) => envoyer(paquet, rang)));
  return rendus.flat();
}
