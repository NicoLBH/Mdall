/**
 * Où une affirmation se range, et sous quel nom.
 *
 * ## Le rangement suivait le domaine. Il doit suivre la nature.
 *
 * Toutes les affirmations d'un utilitaire atterrissaient dans
 * `données-de-base/<domaine>.mdall`. C'était faux, et de deux façons :
 *
 * - les conclusions d'une étude incendie — « degré coupe-feu des planchers :
 *   CF 1 h » — ne sont pas des données de base. Ce sont des **contraintes** :
 *   on ne les mesure pas, on les subit, et si l'on n'est pas d'accord il n'y a
 *   pas de recours ;
 * - l'utilitaire neige-vent produit les deux à la fois. « Zone de neige : E »
 *   est un relevé, non négociable et non calculé. « Profondeur hors gel :
 *   0,985 m » en découle : elle ne tient que tant que ses entrées tiennent.
 *
 * Le rangement suit donc la **nature**, qui est déjà la question que la
 * taxonomie pose, et le nom du fichier vient du **domaine**.
 *
 * ```
 * donnees-de-base/structure.mdall     ce qui est relevé, non négociable
 * contraintes/incendie.mdall          ce qui s'impose, calculé ou non
 * hypotheses/sol.mdall                ce qu'on suppose en attendant
 * constats/incendie.mdall             ce qui a été observé, à une date
 * corpus/documents.mdall              ce qui est entré au dossier
 * ```
 *
 * ## Pourquoi une contrainte déduite reste une contrainte
 *
 * « Profondeur hors gel » sort d'un calcul, mais elle s'impose exactement comme
 * si elle sortait d'un texte : on ne fonde pas plus haut parce que le calcul
 * nous déplaît. En faire une famille à part la sortirait du dossier où on la
 * cherche — celui des contraintes du site.
 *
 * Ce qui la distingue se lit **sur sa ligne**, derrière la double flèche `⇐`
 * qui nomme le calcul et ses entrées : c'est là que compte la différence, parce
 * que c'est là qu'on saura quoi refaire le jour où l'altitude change.
 *
 * ## Ce qui n'a pas de nature
 *
 * Un fichier `non-classe/` plutôt qu'un rangement deviné. Une affirmation dont
 * on ignore la nature ne devient pas une donnée de base parce que c'est le
 * dossier le plus courant : ne pas savoir n'autorise pas à prétendre
 * (fondamentaux, règle 5), et un dossier qui se remplit tout seul dit qu'un
 * utilitaire a oublié de se prononcer.
 */

import { NATURE, DOMAIN, normalizeNature, normalizeDomain, domainLabel, natureLabel } from "./assertion-taxonomy.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le dossier de chaque nature. Le pluriel, parce qu'un dossier en contient. */
export const DOSSIERS = {
  [NATURE.DONNEE_BASE]: "Données de base",
  [NATURE.CONTRAINTE]: "Contraintes",
  [NATURE.HYPOTHESE]: "Hypothèses",
  [NATURE.CONSTAT]: "Constats",
  [NATURE.INTENDANCE]: "Corpus"
};

/** Là où va ce dont on ignore la nature. Il ne doit pas se remplir. */
export const SANS_NATURE = "Non classé";

/** Là où va ce dont on ignore le domaine. */
export const SANS_DOMAINE = "Non classé";

/**
 * Le chemin d'une affirmation : son dossier, puis son fichier.
 *
 * @param {{nature?: string, domain?: string}} affirmation
 * @returns {string[]} `["Contraintes", "Incendie"]`
 */
export function cheminDeRangement({ nature = "", domain = "" } = {}) {
  const famille = normalizeNature(nature);
  const domaine = normalizeDomain(domain);

  return [
    famille ? DOSSIERS[famille] : SANS_NATURE,
    domaine ? domainLabel(domaine) : SANS_DOMAINE
  ];
}

/**
 * Les dossiers de la mémoire, dans l'ordre où on les lit.
 *
 * Ce que le projet a relevé d'abord, ce qui s'impose ensuite, ce qu'on suppose,
 * ce qu'on a vu, ce qui est entré au dossier. C'est l'ordre de la confiance :
 * une donnée de base ne se discute pas, une hypothèse attend d'être confirmée.
 */
export const ORDRE_DES_DOSSIERS = [
  DOSSIERS[NATURE.DONNEE_BASE],
  DOSSIERS[NATURE.CONTRAINTE],
  DOSSIERS[NATURE.HYPOTHESE],
  DOSSIERS[NATURE.CONSTAT],
  DOSSIERS[NATURE.INTENDANCE],
  SANS_NATURE
];

/** Le rang d'un dossier, pour trier. Les inconnus en dernier. */
export function rangDuDossier(dossier) {
  const rang = ORDRE_DES_DOSSIERS.indexOf(texte(dossier));
  return rang === -1 ? ORDRE_DES_DOSSIERS.length : rang;
}

/**
 * Ce qu'un dossier dit de lui-même, en une phrase.
 *
 * Un dossier nommé sans être expliqué se remplit de travers : « contraintes »
 * et « données de base » se ressemblent assez pour qu'on y range au hasard. La
 * phrase vient de la taxonomie, qui a déjà posé la question — elle n'est pas
 * réécrite ici, elle est citée.
 */
export function phraseDuDossier(dossier) {
  const entree = Object.entries(DOSSIERS).find(([, nom]) => nom === texte(dossier));
  if (!entree) return "Ce que personne n'a encore classé. Ce dossier ne devrait pas se remplir.";

  const [nature] = entree;
  return {
    [NATURE.DONNEE_BASE]: "Ce qui a été relevé sur le site ou le programme. Ne se discute pas, ne se calcule pas.",
    [NATURE.CONTRAINTE]: "Ce qui s'impose au projet. Si vous n'êtes pas d'accord, vous n'avez pas de recours.",
    [NATURE.HYPOTHESE]: "Ce qu'on suppose en attendant mieux. Se remplace, et ce qui en dépend devient suspect.",
    [NATURE.CONSTAT]: "Ce qui a été observé, à une date, par quelqu'un. Reste vrai à sa date.",
    [NATURE.INTENDANCE]: "Ce qui est entré au dossier : les livrables, les rattachements."
  }[nature] ?? natureLabel(nature);
}

/** Les domaines connus, pour peupler une arborescence vide sans rien inventer. */
export { DOMAIN, NATURE };
