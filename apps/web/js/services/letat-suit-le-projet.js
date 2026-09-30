/**
 * Un écran ne montre jamais l'état d'un autre projet.
 *
 * ## Ce qui est arrivé
 *
 * Un bandeau — « ce fichier ne s'ouvre pas ici » — est resté affiché **en
 * changeant de projet**. Il nommait un mail d'un chantier, au-dessus des
 * fichiers d'un autre. Rien n'avait fui en base : c'est l'état de l'écran, gardé
 * en mémoire d'un module, qui a survécu au changement.
 *
 * C'est grave pour une raison qui n'est pas l'affichage : **le produit promet
 * que la correspondance d'un chantier ne se montre pas ailleurs**. Un nom de
 * fichier au-dessus du mauvais projet est exactement ce qui fait douter de la
 * promesse — et il suffit d'une fois.
 *
 * ## Pourquoi une liste de choses à effacer ne suffit pas
 *
 * Le réflexe est d'ajouter, au changement de projet, « et on remet à zéro le
 * bandeau ». Puis la sélection. Puis le dépouillement. Cette liste est
 * exactement ce qu'on oublie de tenir : le champ suivant s'ajoutera sans elle,
 * et le défaut reviendra sous une autre forme.
 *
 * **On ne remet donc rien à zéro : on reprend l'état neuf en entier.** Tout ce
 * qu'un écran ajoutera à son état sera, par construction, effacé avec le reste.
 * Il n'y a pas de liste à tenir.
 *
 * ## Il est pur, et il n'appartient à aucun écran
 *
 * Un état entre, un état sort. N'importe quel écran qui garde quelque chose
 * entre deux rendus peut s'en servir, et devrait.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * L'état, s'il est bien celui de ce projet — un état neuf sinon.
 *
 * **Un projet vide ne remet pas à zéro.** Pendant le chargement d'un écran,
 * l'identifiant courant est parfois vide un instant : effacer là ferait perdre
 * ce qu'on vient de faire, et ce n'est pas un changement de projet — c'est une
 * absence de réponse (règle 5).
 *
 * @param {object} etat ce que l'écran garde entre deux rendus
 * @param {string} projetId le projet à l'écran maintenant
 * @param {() => object} neuf de quoi refaire un état vierge
 * @returns {object} l'état donné, ou un état neuf marqué à ce projet
 */
export function lEtatSuitLeProjet(etat, projetId, neuf) {
  const courant = texte(projetId);
  if (!courant) return etat;
  if (texte(etat?.projetId) === courant) return etat;

  return { ...neuf(), projetId: courant };
}

/** Cet état a-t-il déjà servi à un autre projet ? */
export function lEtatVientDAilleurs(etat, projetId) {
  const courant = texte(projetId);
  if (!courant) return false;
  return texte(etat?.projetId) !== "" && texte(etat?.projetId) !== courant;
}
