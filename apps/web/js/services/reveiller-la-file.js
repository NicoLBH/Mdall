/**
 * **Qui réveille le serveur, et quand.**
 *
 * ## Le défaut que ce module ferme, et il est parti en production
 *
 * La file des travaux longs vit dans `versements`. Une fonction de bord la vide,
 * et elle n'est appelée que de deux endroits :
 *
 *   1. le navigateur, **au lancement** ;
 *   2. la fonction elle-même, **quand son budget est épuisé**.
 *
 * Aucun des deux ne couvre le troisième cas, qui est celui qui arrive : la
 * fonction est **coupée net**. Elle laisse sa ligne `en_cours`, et plus personne
 * ne la reprend. Une reprise existe bien — passé dix minutes, une ligne prise
 * est tenue pour abandonnée —, mais elle ne sert à rien si rien ne rappelle la
 * fonction. Une lecture lancée a tourné dix-huit minutes sans avancer d'un pas.
 *
 * ## Qui peut la rappeler
 *
 * **Le navigateur, et lui seul.** Ces fonctions travaillent sous l'identité de
 * celui qui demande, jamais avec la clé de service : c'est ce qui fait que les
 * politiques s'appliquent pour de vrai. Le prix de ce choix est qu'un réveil a
 * besoin d'un jeton, donc de quelqu'un de connecté.
 *
 * L'onglet Actions relit la file toutes les quelques secondes — c'est l'écran où
 * l'on vient justement voir « où en est mon travail ». C'est de là que part le
 * réveil, et l'écran n'attend rien : il demande et continue.
 *
 * ## Ce qu'on ne réveille pas
 *
 * Une ligne **prise récemment**. Elle est en train d'être traitée ; un second
 * réveil ne prendrait rien — la fonction marque la ligne avant de travailler —
 * mais il serait payé. On ne réveille donc que ce qui attend et ce qui a été
 * abandonné.
 *
 * Et **pas deux fois de suite**. L'onglet Actions relit la file toutes les
 * quelques secondes : une ligne qui reste `en_attente` parce que la fonction
 * n'est pas déployée ferait un appel par relecture, indéfiniment. On garde donc
 * la trace du dernier réveil par fonction, et l'on attend avant de redemander.
 *
 * ## Il est pur, et il descend
 *
 * Des lignes de file entrent, des noms de fonction sortent. Le délai
 * d'abandon est **ici**, et la fonction de bord le lit ici : l'écrire des deux
 * côtés aurait fait un écran qui réveille avant que la reprise n'accepte, ou
 * après qu'elle a cessé d'être utile (règle 4).
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Au bout de combien de temps une ligne prise est tenue pour abandonnée.
 *
 * Dix minutes : largement au-dessus du budget d'une fonction de bord — elle
 * s'arrête d'elle-même bien avant —, et bien en dessous de la patience de
 * quelqu'un qui attend ses dix-neuf comptes rendus.
 */
export const ABANDONNEE_APRES_MS = 10 * 60 * 1000;

/**
 * À quelle fréquence, au plus, on redemande la même fonction.
 *
 * Trente secondes : assez court pour qu'une file reprenne vite après une coupure,
 * assez long pour qu'une relecture d'écran toutes les quelques secondes ne
 * fabrique pas un appel par relecture.
 */
export const PAS_PLUS_SOUVENT_QUE_MS = 30 * 1000;

/** Le geste d'un dépôt de messagerie, tel que la base le nomme par défaut. */
export const GESTE_DES_MAILS = "mails";

/** Le geste d'une lecture de comptes rendus. */
export const GESTE_DES_CR = "comptes_rendus";

/**
 * Quelle fonction de bord vide quelle file.
 *
 * Les noms sont ceux du déploiement, et ils s'écrivent ici une fois : un réveil
 * envoyé à un nom que personne ne sert ne rend pas d'erreur visible — il ne
 * fait rien, et la file reste bloquée sans que l'écran sache pourquoi.
 */
export const LA_FONCTION_DU_GESTE = {
  [GESTE_DES_MAILS]: "verser-les-mails",
  [GESTE_DES_CR]: "lire-les-comptes-rendus"
};

/** Le geste d'une ligne. `mails` quand elle ne le dit pas, comme la base. */
export function leGesteDeLaLigne(ligne = null) {
  const dit = texte(ligne?.geste);
  return dit === GESTE_DES_CR ? GESTE_DES_CR : GESTE_DES_MAILS;
}

/**
 * Cette ligne a-t-elle été prise puis abandonnée en route ?
 *
 * Une ligne `en_cours` **sans date de prise** est abandonnée : on ne sait pas
 * depuis quand elle tourne, et ne pas savoir n'autorise pas à la croire vive
 * (règle 5) — la laisser là serait la laisser pour toujours.
 */
export function laLigneEstAbandonnee(ligne = null, {
  maintenant = Date.now(), abandonneeApresMs = ABANDONNEE_APRES_MS
} = {}) {
  if (texte(ligne?.statut) !== "en_cours") return false;

  const prise = Date.parse(texte(ligne?.pris_le));
  if (!Number.isFinite(prise)) return true;

  return maintenant - prise > abandonneeApresMs;
}

/**
 * Les fonctions de bord à réveiller, d'après ce que la file porte.
 *
 * @param {object[]} lignes les lignes `en_attente` ou `en_cours` d'un projet
 * @param {object} [ou]
 * @param {Map<string, number>} [ou.dejaReveille] quand chaque fonction a été
 *   demandée pour la dernière fois. **L'appelant la tient**, parce que c'est lui
 *   qui dure : ce module reste pur.
 * @returns {string[]} des noms de fonction, **sans doublon** : deux lignes du
 *   même geste n'appellent qu'un réveil, puisque la fonction prend la plus
 *   ancienne et se rappelle ensuite.
 */
export function lesReveilsADemander(lignes = [], {
  maintenant = Date.now(),
  abandonneeApresMs = ABANDONNEE_APRES_MS,
  dejaReveille = null,
  pasPlusSouventQueMs = PAS_PLUS_SOUVENT_QUE_MS
} = {}) {
  const gestes = new Set();

  for (const ligne of Array.isArray(lignes) ? lignes : []) {
    const statut = texte(ligne?.statut);
    const aReveiller = statut === "en_attente"
      || laLigneEstAbandonnee(ligne, { maintenant, abandonneeApresMs });
    if (!aReveiller) continue;

    const fonction = LA_FONCTION_DU_GESTE[leGesteDeLaLigne(ligne)];
    if (!fonction) continue;

    const dernier = Number(dejaReveille?.get(fonction));
    if (Number.isFinite(dernier) && maintenant - dernier < pasPlusSouventQueMs) continue;

    gestes.add(fonction);
  }

  return [...gestes];
}

/**
 * Ce qu'on dit d'une ligne qu'on vient de reprendre.
 *
 * **« Reprise » et « en cours » ne se disent pas pareil.** Voir « en cours »
 * pendant vingt minutes sur un travail que personne ne fait est ce qui a fait
 * douter de toute la chaîne ; dire qu'on l'a reprise explique l'attente au lieu
 * de la nier.
 */
export function leMotDeLaReprise(ligne = null, ou = {}) {
  if (!laLigneEstAbandonnee(ligne, ou)) return "";
  return "Ce travail n'a pas donné de nouvelles : il est repris au serveur.";
}
