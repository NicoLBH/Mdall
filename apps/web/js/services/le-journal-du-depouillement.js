/**
 * Ce que le journal des Actions dit d'un dépouillement.
 *
 * ## Pourquoi le journal, et pas un panneau qui reste ouvert
 *
 * Vingt mails avec leurs pièces prennent des minutes. On ne demande pas à
 * quelqu'un de regarder un panneau pendant des minutes : on lui montre que
 * l'envoi part, on le laisse partir, et **le journal des Actions porte la
 * suite** — comme pour le dépôt d'un rapport de bureau de contrôle.
 *
 * Une seule façon d'informer pour la même sorte d'action. Deux façons —
 * un panneau ici, un journal là — obligent à savoir laquelle regarder, et l'on
 * regarde la mauvaise.
 *
 * ## Il est pur
 *
 * Des nombres entrent, des phrases sortent. Ce qui écrit dans le journal est
 * ailleurs : ce module dit seulement **quoi** écrire.
 */

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => Number(valeur) || 0;

/** La sorte d'exécution, pour que le journal sache la ranger. */
export const SORTE = "depouillement";

/** Comment l'action s'appelle dans le journal. */
export function leNomDeLaction(combien = 0) {
  const fichiers = nombre(combien);
  return `Dépouillement de ${fichiers} ${fichiers > 1 ? "fichiers" : "fichier"} de messagerie`;
}

/**
 * Ce que le journal dit pendant que cela tourne.
 *
 * **Il dit que ce n'est pas fini**, et c'est le seul point qui compte : une
 * ligne qui ressemble à une ligne terminée ferait croire que les mails sont
 * rangés alors qu'ils partent encore.
 */
export function leMotDuDebut(combien = 0) {
  const fichiers = nombre(combien);
  return `${fichiers} ${fichiers > 1 ? "fichiers déposés" : "fichier déposé"} : `
    + "lecture et rangement en cours. Vous pouvez continuer ailleurs, "
    + "cette ligne se mettra à jour.";
}

/**
 * Ce que le journal dit quand c'est fini.
 *
 * Reprend **la phrase du convoi**, qui est déjà celle qu'on lit dans l'écran de
 * dépôt : deux comptes rendus du même dépôt auraient fini par ne pas dire la
 * même chose (règle 4).
 */
export function leMotDeLaFin(journal = null, dite = "") {
  if (texte(journal?.arrete)) return `Dépouillement interrompu : ${texte(journal.arrete)}`;
  return texte(dite) || "Rien n'a été dépouillé.";
}

/**
 * Le sort de l'action : a-t-elle abouti ?
 *
 * **Un fichier illisible ne fait pas échouer le dépôt** — les autres sont
 * rangés, et le journal les nomme. Ce qui échoue, c'est un arrêt : plus rien
 * n'est parti après lui.
 */
export function leSortDeLaction(journal = null) {
  if (texte(journal?.arrete)) return "error";
  const accrocs = nombre(journal?.illisibles) + nombre(journal?.refuses);
  return accrocs ? "warning" : "success";
}

/** Ce que l'écran de dépôt dit pendant l'envoi, sous la barre. */
export function leMotDeLaBarre(journal = null) {
  const fichiers = nombre(journal?.fichiers);
  const lus = nombre(journal?.lus);
  if (!fichiers) return "";
  return `${lus} sur ${fichiers} ${fichiers > 1 ? "fichiers" : "fichier"} — `
    + "vous pourrez fermer, le journal des Actions suivra.";
}
