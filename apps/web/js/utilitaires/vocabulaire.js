/**
 * Le vocabulaire commun des utilitaires.
 *
 * Séparé du catalogue à dessein : le catalogue importe les utilitaires, et les
 * utilitaires ont besoin de ce vocabulaire. S'il vivait dans le catalogue, la
 * boucle d'imports laisserait `PRODUIT` non initialisé au moment où le premier
 * utilitaire s'évalue — une panne qui ne se voit qu'au chargement, et qui ne dit
 * pas son nom.
 */

/** Ce qu'un utilitaire produit. Deux familles, et elles ne se mélangent pas. */
export const PRODUIT = {
  /** Une règle du site, déduite de données de base. */
  CONTRAINTE: "contrainte",
  /** Un constat, extrait d'un document. */
  CONSTAT: "constat"
};
