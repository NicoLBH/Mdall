/**
 * Sortir un fichier du dossier des mails : **ce que cela change, et le dire**.
 *
 * ## Le seul geste qui rend une pièce visible
 *
 * La confidentialité est portée par le dossier et tenue par la base : un
 * document rangé dans « Mails » ne se lit que par celui qui l'a déposé. Le
 * déplacer ailleurs le rend **visible par toute l'équipe du chantier**
 * (`le-dossier-des-mails.js`).
 *
 * C'est voulu — c'est ainsi qu'on partage un plan reçu par mail, sans
 * interrupteur à inventer ni à oublier de vérifier. Mais **un geste dont on ne
 * mesure pas la portée est un geste qu'on fait par distraction** : déplacer un
 * fichier ressemble à du rangement, et ici c'est une publication.
 *
 * ## Dans l'autre sens, rien à demander
 *
 * Rentrer un document dans « Mails » le **retire** à l'équipe. On ne demande pas
 * confirmation pour fermer une porte : le pire qui arrive est qu'on la rouvre.
 *
 * ## Il est pur
 *
 * Deux dossiers entrent, une question sort — ou rien.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Un dossier garde-t-il son contenu pour son seul déposant ? */
export function leContenuEstPrive(dossier) {
  return dossier?.prive === true;
}

/**
 * Ce qu'il faut demander avant de déplacer, ou `null`.
 *
 * @param {object} depuis le dossier d'où l'on part, ou rien pour la racine
 * @param {object} vers le dossier où l'on va, ou rien pour la racine
 * @returns {{titre: string, mot: string, confirmer: string, annuler: string}|null}
 */
export function laQuestionDuDeplacement(depuis = null, vers = null) {
  // **La racine n'est pas privée.** `null` veut dire « à la racine de
  // Documents », qui est l'endroit du partage — pas « je ne sais pas ».
  if (!leContenuEstPrive(depuis)) return null;
  if (leContenuEstPrive(vers)) return null;

  const ou = texte(vers?.name) || "Documents";
  return {
    titre: "Ce fichier deviendra visible par l'équipe",
    mot: `Il est aujourd'hui dans « ${texte(depuis?.name) || "Mails"} », que vous seul lisez. `
      + `En le déplaçant vers « ${ou} », vous le rendez lisible par tous les `
      + "collaborateurs du chantier. Ce n'est pas réversible pour ce qu'ils auront lu.",
    confirmer: "Oui, le partager",
    annuler: "Annuler"
  };
}
