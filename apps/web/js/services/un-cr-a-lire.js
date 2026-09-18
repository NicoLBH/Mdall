/**
 * Un compte rendu qu'un autre écran demande à faire lire.
 *
 * ## Pourquoi un passe-plat, et pas un appel direct
 *
 * Le geste part de **Fichiers** — on regarde un `.md`, on veut en relever les
 * points — et il aboutit dans l'**Atelier**, sur un panneau qui n'est pas monté
 * tant qu'on n'y est pas allé. Appeler l'Atelier depuis Fichiers écrirait donc
 * dans un écran qui n'existe pas encore.
 *
 * Fichiers pose ici ce qu'il y a à lire, et navigue. L'Atelier, au montage du
 * panneau, vient voir s'il y a quelque chose, et le prend.
 *
 * ## Il se reprend une seule fois
 *
 * `reprendreLeCrALire` vide la case. Sans cela, revenir sur le panneau
 * relancerait la lecture du même document — c'est-à-dire un appel au modèle,
 * payé, que personne n'a demandé.
 *
 * ## Le texte, pas le fichier
 *
 * Un `File` du navigateur se lit une fois : le garder ici obligerait à le
 * relire au stockage, et l'on aurait deux chemins pour le même contenu
 * (règle 4). On pose le texte, déjà lu, et le nom qu'il portait.
 *
 * ## Il est pur
 *
 * Une variable de module, deux fonctions. Aucun DOM, aucun réseau.
 */

const texte = (valeur) => String(valeur ?? "").trim();

let enAttente = null;

/**
 * Poser un compte rendu à lire.
 *
 * Sans nom ou sans contenu, rien n'est posé : l'Atelier afficherait un fichier
 * vide en prétendant qu'on le lui a donné (règle 5).
 *
 * @returns {boolean} vrai si quelque chose attend désormais.
 */
export function deposerLeCrALire({ nom = "", contenu = "" } = {}) {
  if (!texte(nom) || !texte(contenu)) {
    enAttente = null;
    return false;
  }

  enAttente = { nom: texte(nom), contenu: String(contenu) };
  return true;
}

/** Ce qui attend, et la case est vidée. `null` quand il n'y a rien. */
export function reprendreLeCrALire() {
  const attendu = enAttente;
  enAttente = null;
  return attendu;
}

/** Y a-t-il quelque chose, sans le prendre ? */
export function unCrAttend() {
  return enAttente !== null;
}

/** Tout oublier — pour les tests, et pour un écran qui se referme. */
export function oublierLeCrALire() {
  enAttente = null;
}
