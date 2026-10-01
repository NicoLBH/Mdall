/**
 * La porte qui laisse sortir le corpus en clair — **dix secondes, et elle se
 * referme**.
 *
 * ## Ce qu'elle ouvre, et pourquoi
 *
 * La console d'administration regarde des comptes, jamais leur contenu. C'est
 * la règle, et elle ne bouge pas : l'export des idées ne laisse partir que des
 * termes partagés par au moins deux chantiers.
 *
 * Elle a pourtant une conséquence qui bloque le travail : **on ne peut pas
 * améliorer le découpage sans voir ce qu'il n'a pas su lire**, et ce qu'il n'a
 * pas su lire est précisément ce qui ne sort jamais. Neuf mille quatre cents
 * affirmations sans mot de liaison sont la matière du travail, et on corrigeait
 * à l'aveugle.
 *
 * Cette porte-ci laisse sortir le texte des affirmations. C'est du contenu de
 * chantier, et il n'y a pas de demi-mesure : c'est ce texte qu'il faut lire.
 *
 * ## Ce qu'elle est, et ce qu'elle n'est pas
 *
 * **Ce n'est pas une porte de sécurité.** La porte est dans la base :
 * `le_corpus_en_clair()` est réservée aux administrateurs, et rien ici ne peut
 * l'ouvrir à quelqu'un d'autre. Un interrupteur dans un navigateur n'arrête
 * personne qui sait ouvrir une console.
 *
 * Ce qu'elle arrête est **l'habitude**. Un bouton toujours là finit par être
 * cliqué sans y penser, puis par être cliqué devant quelqu'un, puis par être
 * partagé. Un interrupteur qu'il faut cocher, qui dit ce qu'il laisse sortir,
 * et qui se referme tout seul au bout de dix secondes, oblige à vouloir — à
 * chaque fois.
 *
 * **Dix secondes, et non une minute.** Le temps de cliquer, pas le temps
 * d'oublier qu'on l'a ouverte.
 *
 * ## Elle est pure
 *
 * Deux instants entrent, un état sort. Le compte à rebours est à l'écran ;
 * la règle est ici, et elle s'éprouve sans navigateur.
 */

/** Combien de temps la porte reste ouverte, en millisecondes. */
export const LA_DUREE_DE_LA_PORTE = 10_000;

/**
 * La porte est-elle ouverte ?
 *
 * **`null` et `0` ne sont pas des instants d'ouverture.** `Number(null)` vaut
 * 0, qui est un instant fini : sans cette question posée avant la conversion,
 * une porte jamais ouverte se serait trouvée ouverte en 1970 — et donc fermée,
 * par chance. La chance n'est pas un garde-fou.
 */
export function laPorteEstOuverte(ouverteLe = null, maintenant = Date.now()) {
  const quand = linstant(ouverteLe);
  if (quand === null) return false;

  const ici = Number(maintenant);
  if (!Number.isFinite(ici)) return false;

  // **Fermée avant son ouverture.** Une horloge qui recule — un changement
  // d'heure, une machine remise à l'heure — ne doit pas ouvrir la porte.
  return ici >= quand && ici - quand < LA_DUREE_DE_LA_PORTE;
}

/** Ce qu'il reste, en secondes entières, ou `0` quand elle est fermée. */
export function ceQuiResteDeLaPorte(ouverteLe = null, maintenant = Date.now()) {
  if (!laPorteEstOuverte(ouverteLe, maintenant)) return 0;
  return Math.ceil((LA_DUREE_DE_LA_PORTE - (Number(maintenant) - linstant(ouverteLe))) / 1000);
}

/**
 * Ce que l'écran dit de la porte, selon qu'elle est ouverte ou non.
 *
 * **Elle dit ce qu'elle laisse sortir, pas qu'elle est « avancée ».** Un
 * interrupteur nommé « mode développement » sans un mot sur ce qu'il ouvre est
 * un interrupteur qu'on coche pour voir.
 */
export function phraseDeLaPorte(ouverteLe = null, maintenant = Date.now()) {
  const reste = ceQuiResteDeLaPorte(ouverteLe, maintenant);

  return reste
    ? `Ouverte encore ${reste} seconde${reste > 1 ? "s" : ""}. Ce fichier porte le `
      + "texte des affirmations : c'est du contenu de chantier, il ne se partage pas."
    : "Fermée. Le fichier qui en sortirait porterait le texte des affirmations — "
      + "du contenu de chantier. À cocher pour la mise au point du découpage, "
      + "et pour rien d'autre.";
}

/** Le nom de l'interrupteur, écrit à un seul endroit. */
export const LE_NOM_DE_LA_PORTE = "Mode développement";

function linstant(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const quand = Number(valeur);
  return Number.isFinite(quand) ? quand : null;
}
