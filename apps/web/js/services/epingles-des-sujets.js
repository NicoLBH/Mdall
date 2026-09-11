/**
 * Les sujets qu'on garde sous les yeux.
 *
 * ## Le problème
 *
 * Un chantier porte soixante-treize sujets ouverts. Trois d'entre eux occupent
 * la semaine — ce sont ceux-là qu'on revient voir, et il faut les retrouver à
 * chaque fois dans une liste triée par autre chose.
 *
 * Aucun filtre ne les rassemble : ce n'est ni un statut, ni un lot, ni une
 * échéance. C'est **l'attention de quelqu'un**, et rien dans les données ne la
 * porte. Il faut donc l'écrire.
 *
 * ## Trois, et pourquoi pas plus
 *
 * Le bandeau des épinglés existe pour mettre en avant. Au-delà de trois, il
 * devient une seconde liste : on recommence à chercher dedans, et il ne met
 * plus rien en avant — il déplace le problème d'un cran.
 *
 * Trois est donc un **réglage de lisibilité**, pas une vérité sur les épingles.
 * Il est nommé et il vit ici seul : la base ne le connaît pas, parce qu'une
 * contrainte l'y figerait là où il ne se relit pas (règle 10).
 *
 * ## Une épingle est privée, et c'est la base qui le garantit
 *
 * Le projet est un lieu partagé : les sujets, les avis, les décisions se lisent
 * à plusieurs. Une épingle, non — elle dit ce qui préoccupe une personne cette
 * semaine, et cela ne regarde personne d'autre.
 *
 * Ce fichier n'a donc **rien** à filtrer : la politique de `subject_pins` ne
 * rend que les épingles de qui demande. Un écran qui filtrerait lui-même
 * laisserait celles des autres à portée de la première requête venue, et la
 * discrétion ne serait qu'une politesse d'affichage.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Combien de sujets se gardent sous les yeux.
 *
 * Un réglage d'écran, pas une vérité — voir plus haut.
 */
export const EPINGLES_AU_PLUS = 3;

/** Ce qui empêche d'épingler, nommé : l'écran doit pouvoir le dire. */
export const REFUS = {
  AUCUN: "",
  /** Trois sujets sont déjà épinglés. */
  TROP: "trop",
  /** Ce sujet l'est déjà. */
  DEJA: "deja"
};

export const PHRASES_DU_REFUS = {
  [REFUS.TROP]: `${EPINGLES_AU_PLUS} sujets sont déjà épinglés — retirez-en un pour faire de la place.`,
  [REFUS.DEJA]: "Ce sujet est déjà épinglé."
};

export function phraseDuRefus(motif) {
  return PHRASES_DU_REFUS[texte(motif)] ?? "";
}

/** Les identifiants épinglés, pour chercher vite et sans se tromper de forme. */
export function idsEpingles(epingles = []) {
  return new Set(
    (Array.isArray(epingles) ? epingles : [])
      .map((epingle) => texte(epingle?.subjectId ?? epingle?.subject_id ?? epingle))
      .filter(Boolean)
  );
}

/** Ce sujet est-il épinglé ? */
export function estEpingle(subjectId, epingles = []) {
  const cle = texte(subjectId);
  return !!cle && idsEpingles(epingles).has(cle);
}

/**
 * Peut-on encore épingler celui-ci ?
 *
 * @returns {string} une valeur de `REFUS` — `AUCUN` quand c'est possible
 */
export function refusDEpingler(subjectId, epingles = []) {
  if (estEpingle(subjectId, epingles)) return REFUS.DEJA;
  const combien = Array.isArray(epingles) ? epingles.length : 0;
  return combien >= EPINGLES_AU_PLUS ? REFUS.TROP : REFUS.AUCUN;
}

export function peutEpingler(subjectId, epingles = []) {
  return refusDEpingler(subjectId, epingles) === REFUS.AUCUN;
}

/**
 * Les sujets épinglés, dans l'ordre où ils ont été posés.
 *
 * **Une épingle qui ne désigne plus rien ne s'affiche pas**, et ce n'est pas un
 * oubli : le sujet a pu être fermé, filtré, ou ne pas être chargé sur cette
 * page. Un bandeau qui porterait une ligne vide ferait chercher un sujet qui
 * n'est pas là.
 *
 * L'ordre vient des épingles, pas des sujets : c'est celui dans lequel on les a
 * posées, et le tri du tableau n'a rien à y voir — un bandeau qui se réordonne
 * quand on trie la liste en dessous cesse d'être un repère.
 *
 * @param {object[]} sujets tous les sujets connus de l'écran
 * @param {object[]} epingles `{subjectId}` dans l'ordre du temps
 * @returns {object[]}
 */
export function sujetsEpingles(sujets = [], epingles = []) {
  const parId = new Map(
    (Array.isArray(sujets) ? sujets : [])
      .map((sujet) => [texte(sujet?.id), sujet])
      .filter(([cle]) => cle)
  );

  return (Array.isArray(epingles) ? epingles : [])
    .map((epingle) => parId.get(texte(epingle?.subjectId ?? epingle?.subject_id ?? epingle)))
    .filter(Boolean);
}

/**
 * Ce que le bouton dit, selon qu'on peut épingler ou non.
 *
 * Il annonce **ce que le clic va faire**, pas l'état courant : un bouton qui
 * dit « épinglé » alors qu'il va désépingler se lit à l'envers une fois sur
 * deux. Quand rien n'est possible, il dit pourquoi — se griser sans un mot
 * ferait chercher la cause ailleurs (règle 5).
 */
export function motDeLEpingle(subjectId, epingles = []) {
  const motif = refusDEpingler(subjectId, epingles);

  if (motif === REFUS.DEJA) return { geste: "retirer", titre: "Retirer des épinglés", possible: true };
  if (motif === REFUS.TROP) return { geste: "epingler", titre: phraseDuRefus(REFUS.TROP), possible: false };
  return { geste: "epingler", titre: "Épingler ce sujet", possible: true };
}
