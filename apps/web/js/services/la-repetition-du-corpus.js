/**
 * La répétition du corpus — combien de phrases, pour combien de lignes.
 *
 * ## Pourquoi cette lecture existe
 *
 * La console annonçait « 68 affirmations sur 9 488 énoncent un lien ». En
 * lisant le corpus pour de vrai, mille affirmations se sont révélées être
 * **quatre-vingt-quatorze textes distincts** — le même revenant jusqu'à
 * trente-quatre fois.
 *
 * Le dénominateur comptait donc des copies. Une proportion dont le
 * dénominateur compte des copies n'est pas une proportion (règle 12), et
 * c'était le dénominateur de tout ce que l'écran affirmait. Corriger le
 * découpage sans le savoir aurait été courir après un chiffre qui ne mesurait
 * pas ce qu'il disait mesurer.
 *
 * ## Trois causes, et elles n'appellent pas le même travail
 *
 * - **L'histoire** : une affirmation remplacée reste en base, et c'est voulu
 *   (règle 6). Mais la compter comme le présent compte un sujet autant de fois
 *   qu'il a été tranché. Rien à corriger dans la base ; c'est la lecture qui
 *   doit choisir.
 * - **Le ré-versement** : la contrainte d'unicité porte sur
 *   `(proposition_id, kind, subject_key)`. Elle empêche une proposition de
 *   verser deux fois le même sujet, pas dix propositions de verser le même.
 * - **L'intitulé partagé** : « Avis — Amenée d'air » est une étiquette, et deux
 *   sujets peuvent porter la même. Là, c'est le corpus qui n'est pas de la
 *   prose, et aucun découpage n'y changera rien.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne lit **aucun texte**. Il compte des répétitions ; les lire est l'affaire
 * du corpus en clair, derrière sa porte.
 */

/**
 * Un entier, ou `null`.
 *
 * `Number(null)` et `Number("")` valent zéro, et zéro est fini. Converti sans
 * garde, « la base ne l'a pas dit » deviendrait « il n'y en a aucun » — et
 * « aucune copie » est exactement la conclusion fausse qu'on vient d'éviter
 * (règle 5).
 */
function compte(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const lu = Number(valeur);
  return Number.isFinite(lu) && lu >= 0 ? Math.trunc(lu) : null;
}

/**
 * La répétition, lue. `null` quand la base n'a rien rendu — et jamais un objet
 * de zéros, qui se lirait « le corpus ne se répète pas ».
 */
export function laRepetitionLue(brute) {
  // Un tableau est un objet, et `[]` serait passé pour une mesure dont tous les
  // comptes sont nuls — c'est-à-dire pour « le corpus ne se répète pas ».
  if (!brute || typeof brute !== "object" || Array.isArray(brute)) return null;

  const affirmations = compte(brute.affirmations);
  const distinctes = compte(brute.distinctes);

  return {
    affirmations,
    distinctes,
    copiesMax: compte(brute.copies_max),
    remplacees: compte(brute.remplacees),
    courantes: compte(brute.courantes),
    distinctesCourantes: compte(brute.distinctes_courantes),
    sujets: compte(brute.sujets),
    sujetsReverses: compte(brute.sujets_reverses),
    textesSurPlusieursSujets: compte(brute.textes_sur_plusieurs_sujets),
    // Combien de fois une phrase est écrite, en moyenne. `null` plutôt qu'une
    // division par zéro, et arrondi au dixième : « 10.6 fois » se lit, pas
    // « 10.638297872340425 ».
    copiesMoyennes: affirmations !== null && distinctes
      ? Math.round((affirmations / distinctes) * 10) / 10
      : null
  };
}

/** Ce que la répétition vaut, en une phrase. */
export function phraseDeLaRepetition(brute) {
  const lue = laRepetitionLue(brute);
  if (!lue || lue.affirmations === null || lue.distinctes === null) {
    return "La répétition du corpus n'a pas pu être lue. Ce n'est pas « le corpus "
      + "ne se répète pas » : on ne sait pas de combien (règle 5).";
  }

  if (!lue.affirmations) {
    return "Aucune affirmation n'est versée : il n'y a rien à répéter.";
  }

  if (lue.distinctes === lue.affirmations) {
    return `${lue.affirmations} affirmations, et autant de phrases distinctes : `
      + "le corpus ne se répète pas.";
  }

  return `${lue.affirmations} affirmations pour ${lue.distinctes} phrase${
    lue.distinctes > 1 ? "s" : ""} distincte${lue.distinctes > 1 ? "s" : ""} — `
    + `chacune écrite ${lue.copiesMoyennes} fois en moyenne, et jusqu'à ${
      lue.copiesMax}. Tout ce que cet écran rapporte à un nombre d'affirmations `
    + "compte donc des copies.";
}

/**
 * **D'où viennent les copies**, cause par cause.
 *
 * Trois lignes, et non un total : additionner l'histoire, le ré-versement et
 * l'intitulé partagé rendrait un nombre plus grand que le corpus, puisqu'une
 * même ligne relève souvent de deux causes. Ce qu'on veut savoir est laquelle
 * peser, pas combien elles font ensemble.
 */
export function lesCausesDeLaRepetition(brute) {
  const lue = laRepetitionLue(brute);
  if (!lue) return [];

  return [
    {
      cle: "histoire",
      quoi: "L'histoire",
      combien: lue.remplacees,
      // Ce qui resterait si la lecture ne gardait que le présent : c'est le
      // chiffre qui dit si cette cause-ci vaut le travail.
      sur: lue.courantes !== null && lue.distinctesCourantes !== null
        ? `${lue.courantes} affirmations non remplacées, pour ${
          lue.distinctesCourantes} phrases distinctes`
        : null,
      mot: "Une affirmation remplacée reste en base, et c'est voulu (règle 6). "
        + "La compter comme le présent compte un sujet autant de fois qu'il a "
        + "été tranché."
    },
    {
      cle: "reversement",
      quoi: "Le ré-versement",
      combien: lue.sujetsReverses,
      sur: lue.sujets !== null ? `sur ${lue.sujets} sujets versés` : null,
      mot: "L'unicité porte sur (proposition, nature, sujet) : elle empêche une "
        + "proposition de verser deux fois le même sujet, pas dix propositions "
        + "de verser le même."
    },
    {
      cle: "intitule",
      quoi: "L'intitulé partagé",
      combien: lue.textesSurPlusieursSujets,
      sur: lue.distinctes !== null ? `sur ${lue.distinctes} phrases distinctes` : null,
      mot: "Un même texte porté par plusieurs sujets n'est pas une phrase, c'est "
        + "une étiquette. Là, aucun découpage n'y changera rien : le corpus "
        + "n'est pas de la prose."
    }
  ];
}

/** Ce qu'une cause dit d'elle-même, quand on n'a pas su la compter. */
export const DIT_SANS_CAUSE = "pas su le compter";
