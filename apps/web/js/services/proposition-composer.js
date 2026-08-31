/**
 * Ce que les boutons du composeur disent, à chaque instant.
 *
 * Cette règle tenait dans le gabarit HTML, et c'est précisément ce qui l'avait
 * cassée : le bouton « Commenter » naissait désactivé — il n'y avait rien à
 * envoyer —, la frappe ne redessinait rien (redessiner à chaque touche ferait
 * perdre le curseur), et **il ne se réactivait jamais**. On pouvait écrire un
 * message et ne pas pouvoir l'envoyer, sans qu'aucune erreur ne le dise.
 *
 * La règle vit donc ici, seule et pure, et les deux endroits qui en ont besoin
 * — celui qui dessine, et celui qui met à jour pendant la frappe — la lisent au
 * même endroit. Deux copies d'une même règle finissent toujours par diverger,
 * et la divergence s'appelait ici « les commentaires ne partent pas ».
 */

/**
 * L'état des actions du composeur, selon ce qui est écrit.
 *
 * @param {{draft?: string, posting?: boolean, abandoning?: boolean,
 *          canClose?: boolean}} etat
 * @returns {{canPost: boolean, closeLabel: string}}
 */
export function composerActions({ draft = "", posting = false, abandoning = false } = {}) {
  const aEcrire = String(draft ?? "").trim().length > 0;

  return {
    canPost: aEcrire && !posting,
    // Fermer avec un texte en cours le publie en partant : un abandon sans un
    // mot est le genre de silence qu'on regrette six mois plus tard.
    closeLabel: abandoning
      ? "Confirmer l'abandon"
      : aEcrire
        ? "Fermer avec ce commentaire"
        : "Fermer la proposition"
  };
}
