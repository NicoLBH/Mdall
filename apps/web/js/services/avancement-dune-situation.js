/**
 * Où en est une situation.
 *
 * ## Ce qui ne marchait pas
 *
 * `progress_percent` est calculé en base par `refresh_situation_progress`, qui
 * compte les sujets portant `subjects.situation_id`. Cette colonne est celle de
 * l'ancien modèle : elle ignore la table de liaison d'une situation manuelle, et
 * **une situation automatique n'a rien à y porter du tout** — c'est une requête,
 * pas une liste. L'avancement d'une situation automatique valait donc zéro,
 * quoi qu'on y fasse.
 *
 * Voir `docs/les-situations-traversent-les-projets.md`, étape 5.
 *
 * ## Il se calcule sur ce que la situation retient
 *
 * Les sujets qu'une situation retient sont déjà résolus par l'écran, manuelles
 * comme automatiques, et depuis l'étape 3 bis à travers les chantiers. Compter
 * dessus, c'est compter sur la même chose que ce qu'on affiche — et non sur une
 * seconde vérité qui finirait par ne plus dire pareil (règle 4).
 *
 * ## Le piège que le plan nomme
 *
 * **Un sujet que je ne peux plus voir sort du compte.** Si je quitte un
 * chantier, ses sujets sortent de mon périmètre : l'avancement baisse, au lieu
 * de compter des choses que je ne peux plus ouvrir. C'est ce que fait ce calcul
 * sans qu'on ait à le lui demander — il ne connaît que ce qu'on lui donne.
 *
 * ## Et ne pas savoir n'est pas zéro
 *
 * Une situation dont les sujets n'ont pas pu être lus n'est pas à 0 % : on ne
 * sait pas. Zéro se lit comme « rien n'a avancé », et l'on irait chercher
 * pourquoi le chantier dort (règle 5).
 */

const texte = (valeur) => String(valeur ?? "").trim().toLowerCase();

/**
 * Un sujet clos est-il du travail fait ?
 *
 * **Un doublon n'est pas du travail**, ni fait ni à faire : il ne compte ni au
 * numérateur ni au dénominateur. Le laisser dans le total ferait baisser
 * l'avancement à chaque doublon repéré — c'est-à-dire punirait le rangement.
 * C'est déjà la règle de la base, et elle se dit à un seul endroit.
 */
function compteDansLAvancement(sujet) {
  return texte(sujet?.status ?? sujet?.statut) !== "closed_duplicate";
}

/** Un sujet est clos si son statut le dit — sous l'une ou l'autre de ses formes. */
function estClos(sujet) {
  return texte(sujet?.status ?? sujet?.statut).startsWith("closed");
}

/**
 * Où en est cette situation, d'après les sujets qu'elle retient.
 *
 * @param {object[]|null} sujets ceux que la situation retient. `null` veut dire
 *   « on n'a pas su les lire » — et non « il n'y en a aucun ».
 * @returns {{total: number, clos: number, pourcentage: number}|null} `null`
 *   quand on ne sait pas.
 */
export function avancementDe(sujets = null) {
  if (!Array.isArray(sujets)) return null;

  const comptes = sujets.filter(compteDansLAvancement);
  const total = comptes.length;
  if (!total) return { total: 0, clos: 0, pourcentage: 0 };

  const clos = comptes.filter(estClos).length;

  return { total, clos, pourcentage: Math.round((clos / total) * 100) };
}

/**
 * Ce qu'on en écrit à l'écran.
 *
 * `""` quand on ne sait pas : mieux vaut ne rien dire qu'afficher « 0 % » sur
 * une situation dont personne n'a lu les sujets.
 */
export function phraseDeLAvancement(avancement = null) {
  if (!avancement) return "";
  if (!avancement.total) return "";

  return `${avancement.pourcentage} %`;
}

/** Le détail, au survol : le pourcentage seul ne dit pas sur combien il porte. */
export function detailDeLAvancement(avancement = null) {
  if (!avancement || !avancement.total) return "";
  return `${avancement.clos} sujet${avancement.clos > 1 ? "s" : ""} clos sur ${avancement.total}`;
}
