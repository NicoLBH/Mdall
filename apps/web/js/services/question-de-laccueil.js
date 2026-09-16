/**
 * La question commencée à l'accueil, transmise au Copilote.
 *
 * ## Pourquoi elle ne passe pas par l'adresse
 *
 * Une question écrite dans la barre du navigateur entre dans l'historique, dans
 * les suggestions de saisie, et dans ce qu'on copie sans y penser pour partager
 * un lien. Les discussions avec le Copilote sont privées : on ne les met pas
 * dans une adresse.
 *
 * ## Pourquoi pas non plus dans le brouillon du Copilote
 *
 * C'était le premier réflexe, et il est faux : le Copilote **remet son état à
 * zéro quand on change de projet**, ce qui est exactement ce qui se passe entre
 * l'accueil, qui n'est d'aucun projet, et le Copilote d'un chantier choisi dans
 * la liste. Le brouillon aurait donc disparu précisément dans le cas où le
 * choix du projet a servi à quelque chose — et nulle part on n'aurait vu
 * pourquoi.
 *
 * ## Une fois, et une seule
 *
 * `reprendre()` rend la question **et l'oublie**. Sans cela, revenir sur le
 * Copilote une heure plus tard ferait réapparaître une question qu'on croyait
 * abandonnée, par-dessus ce qu'on est en train d'écrire.
 */

let enAttente = "";

/** Déposer ce qui vient d'être tapé à l'accueil. */
export function deposerLaQuestion(question = "") {
  enAttente = String(question ?? "");
}

/**
 * Reprendre la question, et l'oublier.
 *
 * @returns {string} `""` quand il n'y en a pas — et c'est alors au Copilote de
 *   garder le brouillon qu'il avait déjà.
 */
export function reprendreLaQuestion() {
  const question = enAttente;
  enAttente = "";
  return question;
}
