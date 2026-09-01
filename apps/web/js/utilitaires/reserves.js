/**
 * Les réserves : ce qui peut clocher dans les **entrées** d'une déduction.
 *
 * Aucune ne met en doute la règle. Le règlement est ce qu'il est ; le doute
 * porte sur ce qu'on lui a donné à manger — la bonne commune, le bon canton,
 * une altitude qui veut dire quelque chose, une réponse d'API qu'on a su lire.
 *
 * Ce vocabulaire est partagé par tous les utilitaires, et il est ici plutôt que
 * dans l'un d'eux : une réserve nommée deux fois serait deux réserves.
 */

export const RESERVE = {
  /**
   * Le découpage cantonal a changé depuis 2014, et c'est celui de 2014 qui fait
   * règle. Le calcul a pu retomber sur le mauvais canton.
   */
  CANTON_2014: "canton-2014",
  /** Plusieurs valeurs H0 coexistent dans le département : une a été choisie. */
  H0_FOURCHETTE: "h0-fourchette",
  /**
   * Au-delà de 900 m, l'Annexe Nationale demande une étude spécifique. La valeur
   * rendue n'est pas fausse — elle ne suffit pas, et c'est un autre défaut.
   */
  ALTITUDE_HORS_TABLE: "altitude-hors-table",
  /** Le calcul avait besoin d'une altitude et n'en a pas eu. */
  ALTITUDE_ABSENTE: "altitude-absente",
  /**
   * Le fait ne dit pas sur quoi il a été calculé. Il a été écrit avant qu'on
   * conserve les entrées : on ne peut ni le confirmer ni le suspecter.
   */
  ENTREES_INCONNUES: "entrees-inconnues",
  /**
   * La réponse tient à la commune, pas à la parcelle. Vrai du zonage sismique,
   * qui est réglementairement communal — donc sans conséquence — et faux de
   * presque tout le reste, qu'on ne déduit pas pour cette raison.
   */
  PORTEE_COMMUNALE: "portee-communale",
  /**
   * L'aléa a été lu au point du projet. C'est plus fin qu'une commune, mais une
   * parcelle peut chevaucher deux niveaux d'exposition.
   */
  PORTEE_PONCTUELLE: "portee-ponctuelle"
};

const PHRASES = {
  [RESERVE.CANTON_2014]: "le canton a changé depuis 2014, et c'est celui de 2014 qui fait règle",
  [RESERVE.H0_FOURCHETTE]: "plusieurs valeurs H0 existent dans ce département, une a été retenue",
  [RESERVE.ALTITUDE_HORS_TABLE]: "au-delà de 900 m, l'Annexe Nationale demande une étude spécifique",
  [RESERVE.ALTITUDE_ABSENTE]: "l'altitude du site n'est pas connue",
  [RESERVE.ENTREES_INCONNUES]: "ce calcul ne dit pas sur quoi il a été fait",
  [RESERVE.PORTEE_COMMUNALE]: "la valeur vaut pour la commune entière",
  [RESERVE.PORTEE_PONCTUELLE]: "l'aléa a été lu au point du projet ; une parcelle peut chevaucher deux niveaux"
};

/** Les codes reconnus. Un code inventé ailleurs n'atteint pas l'écran. */
export const RESERVES = Object.values(RESERVE);

/**
 * Les réserves qui **informent** au lieu de douter.
 *
 * Dire d'un zonage sismique qu'il vaut pour la commune entière n'est pas un
 * aveu de faiblesse : c'est sa portée réglementaire, et c'est la bonne. La
 * ranger avec le canton douteux ferait baisser la confiance d'une valeur dont
 * personne ne doute — et une confiance qui baisse sans raison s'apprend à être
 * ignorée, exactement comme un écran qui signale tout.
 *
 * Elles s'affichent comme les autres. Elles ne comptent pas dans la confiance.
 */
export const RESERVES_INFORMATIVES = new Set([RESERVE.PORTEE_COMMUNALE, RESERVE.PORTEE_PONCTUELLE]);

/** Une réserve qui met en doute une entrée, par opposition à celles qui situent. */
export function reserveMetEnDoute(code) {
  const cle = String(code ?? "").trim();
  return RESERVES.includes(cle) && !RESERVES_INFORMATIVES.has(cle);
}

/** La phrase d'une réserve, ou `""` si le code est inconnu. */
export function phraseDeReserve(code) {
  return PHRASES[String(code ?? "").trim()] ?? "";
}
