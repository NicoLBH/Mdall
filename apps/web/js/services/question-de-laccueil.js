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
 * ## Elle est **posée**, pas commencée
 *
 * On ne quitte l'accueil qu'en appuyant sur Entrée ou sur le bouton d'envoi :
 * la question qui arrive ici a donc été **envoyée**, et le Copilote la pose au
 * lieu de la déposer dans le champ. La reposer à la main était un second
 * Entrée pour rien — et, pendant la seconde où l'on ne comprenait pas, la
 * discussion paraissait perdue.
 *
 * ## Une fois, et une seule
 *
 * `reprendre()` rend la question **et l'oublie**. Sans cela, revenir sur le
 * Copilote une heure plus tard reposerait une question qu'on croyait
 * abandonnée — et celle-là partirait vraiment.
 */

let enAttente = "";

/** Confier la question posée à l'accueil. */
export function deposerLaQuestion(question = "") {
  enAttente = String(question ?? "");
}

/**
 * Reprendre la question, et l'oublier.
 *
 * @returns {string} `""` quand il n'y en a pas — et c'est alors au Copilote de
 *   garder le brouillon qu'il avait déjà, sans rien envoyer.
 */
export function reprendreLaQuestion() {
  const question = enAttente;
  enAttente = "";
  return question;
}
