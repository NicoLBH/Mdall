/**
 * À qui appartient une situation.
 *
 * ## Ce qu'une situation est, et où on l'avait rangée
 *
 * Elle dit ce qu'une personne se donne à faire, dans quel ordre, et ce qu'elle
 * laisse de côté. C'est une **façon de travailler**, pas un fait du projet. Elle
 * était pourtant une ligne du projet, lue par tous ses collaborateurs — et
 * c'est ce qui fait qu'on n'en crée pas : personne n'a envie d'exposer son
 * organisation de la semaine à douze personnes.
 *
 * ## Ce module ne protège rien
 *
 * La séparation est tenue par la base : la règle de lecture de `situations` ne
 * rend que celles de qui demande. Ce fichier ne fait que **dire ce qui est déjà
 * arrivé** — s'il se trompait, on lirait mal rangé, pas indûment.
 *
 * C'est le même partage qu'avec `run-partition.js`, et pour la même raison : un
 * écran qui croirait protéger quelque chose finirait par être le seul à le
 * croire.
 *
 * ## L'exception, et pourquoi elle est nommée
 *
 * Les situations écrites avant le cloisonnement n'ont pas de propriétaire : la
 * colonne n'existait pas. Les cacher rétroactivement ferait disparaître le
 * travail de gens qui l'ont sous les yeux aujourd'hui, sans que personne l'ait
 * demandé. Elles restent donc lisibles, **et l'écran le dit**.
 *
 * Mieux vaut une exception nommée qu'un trou silencieux : voir
 * `docs/les-situations-traversent-les-projets.md`, étape 1.
 *
 * Rien ici n'appelle quoi que ce soit : une situation entre, une phrase sort.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** À qui une situation appartient, quand on peut le dire. */
export const APPARTENANCE = {
  /** Elle est à moi. */
  MIENNE: "mienne",
  /**
   * Elle date d'avant le cloisonnement : elle n'a pas de propriétaire.
   *
   * Elle se lit — son projet la voyait hier et rien ne justifie de la lui
   * retirer —, mais elle ne se modifie pas : la base refuse d'écrire au nom de
   * personne. Qui veut la reprendre la reprend, et c'est une décision.
   */
  AVANT_LE_CLOISONNEMENT: "avant-le-cloisonnement"
};

export const PHRASES_DE_L_APPARTENANCE = {
  [APPARTENANCE.MIENNE]: "",
  [APPARTENANCE.AVANT_LE_CLOISONNEMENT]: "créée avant le cloisonnement"
};

/** Le propriétaire d'une situation, quelle que soit la forme qu'on lui donne. */
export function proprietaireDe(situation = null) {
  return texte(situation?.owner_id ?? situation?.ownerId);
}

/**
 * À qui elle appartient.
 *
 * **Rien d'autre que ces deux cas ne peut arriver**, et c'est le point : la
 * base ne rend pas les situations des autres. Si l'on en voyait une, ce serait
 * la règle de lecture qui aurait cédé, et aucune phrase d'écran n'y changerait
 * rien.
 */
export function appartenanceDe(situation = null) {
  return proprietaireDe(situation) ? APPARTENANCE.MIENNE : APPARTENANCE.AVANT_LE_CLOISONNEMENT;
}

/** Ce qu'on en dit à l'écran. Vide pour les siennes : le cas normal ne se commente pas. */
export function motDeLAppartenance(situation = null) {
  return PHRASES_DE_L_APPARTENANCE[appartenanceDe(situation)] ?? "";
}

/**
 * Peut-on la modifier ?
 *
 * **La question se pose avant le clic, pas après.** La base refuse d'écrire sur
 * une situation qui n'appartient à personne ; laisser le bouton actif ferait
 * cliquer sur un geste qui échoue en silence, et l'on chercherait la panne
 * ailleurs.
 */
export function peutEtreModifiee(situation = null) {
  return appartenanceDe(situation) === APPARTENANCE.MIENNE;
}

/**
 * Ce qu'il faut dire quand on ne peut pas la modifier.
 *
 * Nommer l'empêchement **et la suite** : un refus qui ne dit pas quoi faire
 * laisse devant un bouton gris.
 */
export function pourquoiPasModifiable(situation = null) {
  return peutEtreModifiee(situation)
    ? ""
    : "Cette situation a été créée avant que les situations ne deviennent personnelles : "
      + "elle n'appartient à personne. Reprenez-la pour pouvoir la modifier.";
}
