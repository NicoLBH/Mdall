/**
 * Ce qu'une lecture vaut **par rapport à la précédente**.
 *
 * ## Un nombre seul ne dit rien
 *
 * « 3 orphelins » n'est ni bon ni mauvais. Un compte rendu en produit toujours
 * quelques-uns : son ouverture et son préambule ne sont sous aucune rubrique,
 * et c'est normal. Ce qui compte est **la variation** : trois là où le compte
 * rendu précédent en donnait un dit que la lecture a dérivé, et c'est la seule
 * façon de s'en apercevoir.
 *
 * C'est vrai de tous ces chiffres. Un taux de citations retrouvées qui baisse
 * de quatre points après un changement de consigne est la seule chose qui
 * permette de dire que le changement était mauvais.
 *
 * ## Première lecture n'est pas « aucun écart »
 *
 * Quand il n'y a rien à comparer, on ne rend pas zéro : on rend `null`, et
 * l'écran dit « première lecture ». Un zéro se lirait comme « rien n'a bougé »,
 * ce qui est une affirmation qu'on n'a pas vérifiée (règle 5).
 *
 * ## Ce qui monte n'est pas toujours bon
 *
 * Deux familles, et les confondre peindrait en vert une dérive. Les rubriques
 * reconnues et les points rattachés **gagnent** à monter ; les orphelins, les
 * points sans citation et les points sans lot **gagnent** à baisser. Le sens de
 * chacun est écrit ici une fois, et l'écran le lit (règle 10).
 *
 * Rien ici n'appelle quoi que ce soit : deux mesures entrent, des écarts
 * sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une variation veut dire, chiffre par chiffre. */
export const SENS = {
  /** Plus il monte, mieux c'est. */
  MONTER: "monter",
  /** Plus il baisse, mieux c'est. */
  BAISSER: "baisser"
};

/**
 * Les chiffres qu'on suit d'une lecture à l'autre, et ce que leur variation
 * veut dire. **Nommés ici, et pas au fil des écrans.**
 */
export const CHIFFRES_SUIVIS = [
  ["points", "Points relevés", SENS.MONTER],
  ["retrouves", "Citations retrouvées", SENS.MONTER],
  ["sansCitation", "Sans citation", SENS.BAISSER],
  ["sansLot", "Sans lot", SENS.BAISSER],
  ["rubriques", "Rubriques reconnues", SENS.MONTER],
  ["rattaches", "Points rangés", SENS.MONTER],
  ["orphelins", "Sans rubrique", SENS.BAISSER],
  // **La durée se suit comme le reste**, et c'est elle qui dit ce qu'un autre
  // modèle a vraiment changé. Plus vite est mieux — jusqu'au jour où l'on verra
  // qu'aller plus vite a coûté des citations, et c'est justement pour le voir
  // que les deux se lisent côte à côte.
  ["dureeMs", "Temps de lecture", SENS.BAISSER]
];

const SENS_PAR_CLE = new Map(CHIFFRES_SUIVIS.map(([cle, , sens]) => [cle, sens]));

/** Un nombre, ou `null`. `Number(null)` valant zéro, l'absence se dit. */
function nombre(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const lu = Number(valeur);
  return Number.isFinite(lu) ? lu : null;
}

/**
 * L'écart d'un chiffre entre deux lectures.
 *
 * @returns {{ecart: number, sens: string, mieux: boolean}|null} `null` quand il
 *   n'y a rien à comparer, ou quand rien n'a bougé — un écart nul n'est pas une
 *   information, et l'afficher « +0 » ferait du bruit sur chaque chiffre stable.
 */
export function ecartDuChiffre(cle = "", maintenant = null, avant = null) {
  const ici = nombre(maintenant?.[cle]);
  const la = nombre(avant?.[cle]);
  if (ici === null || la === null) return null;

  const ecart = ici - la;
  if (ecart === 0) return null;

  const sens = SENS_PAR_CLE.get(texte(cle)) ?? SENS.MONTER;
  return {
    ecart,
    sens,
    mieux: sens === SENS.MONTER ? ecart > 0 : ecart < 0
  };
}

/** Comment un écart s'écrit : « +2 », « −1 ». Le signe est toujours là. */
export function motDeLEcart(ecart = null) {
  if (!ecart) return "";
  // Un vrai signe moins, pas un trait d'union : sur une ligne de chiffres, il
  // se distingue du tiret qui sépare.
  return ecart.ecart > 0 ? `+${ecart.ecart}` : `−${Math.abs(ecart.ecart)}`;
}

/**
 * Tous les écarts d'une lecture à la précédente.
 *
 * @returns {Map<string, object>} vide quand il n'y a rien à comparer.
 */
export function ecartsDeLaLecture(maintenant = null, avant = null) {
  const ecarts = new Map();
  if (!maintenant || !avant) return ecarts;

  for (const [cle] of CHIFFRES_SUIVIS) {
    const ecart = ecartDuChiffre(cle, maintenant, avant);
    if (ecart) ecarts.set(cle, ecart);
  }

  return ecarts;
}

/**
 * La lecture à laquelle on se compare.
 *
 * **La précédente de ce projet, quelle qu'elle soit** — pas celle du même
 * document. Comparer le compte rendu n° 19 au n° 18 est justement le but : la
 * variation d'une réunion à l'autre dit que la lecture a dérivé. Et relire deux
 * fois le même document pour ajuster une consigne se compare aussi, puisque
 * c'est alors la lecture précédente.
 *
 * Elle se **nomme** à l'écran : sans cela, on ne saurait pas à quoi on compare,
 * et un écart sans terme de comparaison ne se juge pas.
 *
 * @param {object[]|null} lectures les lectures conservées, la plus récente
 *   d'abord — `null` quand on n'a pas pu les lire
 * @param {string} [sauf] l'identifiant de la lecture en cours, à ne pas se
 *   comparer à elle-même
 */
export function laLecturePrecedente(lectures = null, sauf = "") {
  if (!Array.isArray(lectures)) return null;

  const ignore = texte(sauf);
  return lectures.find((lecture) => !ignore || texte(lecture?.id) !== ignore) ?? null;
}

/**
 * Ce qu'on dit de la comparaison, en une phrase.
 *
 * **« Première lecture » n'est pas « rien n'a bougé ».** Les confondre ferait
 * croire qu'une lecture est stable alors qu'on n'a rien à quoi la comparer
 * (règle 5).
 */
export function phraseDuSuivi(avant = null, ecarts = null) {
  if (avant === null || avant === undefined) {
    return "Première lecture de ce projet : il n'y a rien à quoi la comparer.";
  }

  const nom = texte(avant?.document) || "la lecture précédente";
  const combien = ecarts instanceof Map ? ecarts.size : 0;

  return combien === 0
    ? `Rien n'a bougé depuis ${nom}.`
    : `${combien} chiffre${combien > 1 ? "s ont" : " a"} bougé depuis ${nom}.`;
}

/**
 * Ce qu'on conserve d'une lecture, dans la forme que la base attend.
 *
 * **Les mesures telles quelles.** Les raboter ici reviendrait à garder un détail
 * en base pour ne jamais l'afficher — et le jour où l'on voudrait suivre un
 * chiffre de plus, les lectures d'avant ne le porteraient pas.
 */
export function lectureAConserver(lecture = null, { projectId = "" } = {}) {
  if (!lecture?.mesure) return null;

  return {
    project_id: texte(projectId),
    document: texte(lecture?.nom),
    numero_de_reunion: texte(lecture?.identite?.numero),
    tenue_le: texte(lecture?.identite?.tenueLe),
    mesures: lecture.mesure,
    lu_par: texte(lecture?.luPar)
  };
}
