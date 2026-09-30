/**
 * Où un fichier de mémoire vit, et sous quel nom.
 *
 * ## Deux racines : ce qu'on dépose, ce qu'on écrit
 *
 * L'onglet Fichiers porte les deux matières du projet, et elles sont de même
 * nature : ce sont les **sources**, celles à partir desquelles le projet se
 * reconstruit. Les PDF ne suffisent pas — qui a dit, quand, qui assume sont
 * aussi des sources, et l'application les produit.
 *
 * ```
 * Mémoire/     ce que le projet sait, écrit en mdall
 * Documents/   les pièces déposées, rangées comme l'utilisateur veut
 * ```
 *
 * ## Ce qui est observé est transversal, ce qui est déduit est par domaine
 *
 * Une mesure appartient au bâtiment, pas à une discipline : « nombre d'étages »
 * sert l'incendie, la structure et l'acoustique, et la dupliquer par domaine
 * violerait la règle 4 des fondamentaux. Une règle et une contrainte, elles,
 * viennent d'un corpus, donc d'un domaine.
 *
 * ```
 * Mémoire/donnees-de-base.ddb    ce que le bâtiment est
 * Mémoire/hypotheses.hyp         ce qu'on suppose en attendant mieux
 * Mémoire/corpus.crp             ce qui est entré au dossier
 * Mémoire/incendie.ref           les règles appliquées
 * Mémoire/incendie.ctr           ce qui s'impose
 * Mémoire/incendie.cst           ce qui a été constaté, à une date
 * Mémoire/structure.ctr
 * ```
 *
 * Un constat reste par domaine : il observe un manquement **au regard d'une
 * exigence**, donc d'une discipline.
 *
 * ## La zone est dans le fichier, pas dans l'arborescence
 *
 * L'unité de production est le domaine : une étude incendie touche plusieurs
 * zones d'un coup. Avec la zone en répertoire, une seule étude se dispersait en
 * autant de fichiers, donc autant de groupes dans le diff, pour un seul acte.
 *
 * La zone est une **facette**, pas un lieu : elle ouvre une section dans le
 * fichier — `zone: Bâtiment A { … }` — et la Mémoire, qui interroge, offrira la
 * vue par zone sans qu'elle coûte un répertoire.
 *
 * ## L'extension dit ce que le fichier contient
 *
 * Deux `incendie.mdall` à deux endroits n'ont pas de sens, et c'est dangereux :
 * on ouvre l'un en croyant l'autre. Comme `app.html`, `app.css` et `app.js`
 * disent trois choses du même `app`, l'extension dit la nature — et chaque
 * nature a sa forme d'écriture.
 *
 * ## Ce qui n'a pas de nature
 *
 * Une extension `.mdall` plutôt qu'un rangement deviné. Ne pas savoir
 * n'autorise pas à prétendre (fondamentaux, règle 5), et un fichier qui se
 * remplit tout seul dit qu'un utilitaire a oublié de se prononcer.
 */

import { NATURE, normalizeNature, normalizeDomain, domainLabel } from "./assertion-taxonomy.js";
import { TOUTES_ZONES, SANS_NATURE } from "./memoire-en-texte.js";
import { DOSSIER_DES_MAILS } from "./le-dossier-des-mails.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * L'extension de chaque nature. Trois lettres, comme on en tape.
 *
 * Elle remplace le dossier de nature : ce que le fichier contient se lit sur
 * son nom, et l'arborescence garde deux niveaux au lieu de trois.
 */
export const EXTENSIONS = {
  [NATURE.DONNEE_BASE]: "ddb",
  [NATURE.CONTRAINTE]: "ctr",
  [NATURE.HYPOTHESE]: "hyp",
  [NATURE.CONSTAT]: "cst",
  [NATURE.INTENDANCE]: "crp",
  // Les décisions. Rangées **par domaine**, comme les règles, et pour la même
  // raison : une décision est le pendant humain d'une règle, elle produit une
  // valeur au lieu de la porter, et elle appartient à la discipline sur
  // laquelle elle tranche. Ce n'est pas une mesure du bâtiment.
  [NATURE.DECISION]: "dec",
  // Les raisonnements. Ils n'avaient pas d'extension du tout, et
  // `extensionDeRangement` rendait `undefined` pour eux : un fichier sans nom,
  // qui n'aurait échoué qu'au premier versement.
  //
  // **Transversaux**, contrairement aux décisions : un raisonnement traverse les
  // disciplines par construction — il part d'une donnée du site, passe par une
  // règle incendie, bute sur un arbitrage, et finit dans la structure. Le ranger
  // sous un domaine reviendrait à choisir lequel de ses maillons le nomme.
  [NATURE.RAISONNEMENT]: "rai"
};

/** Les règles appliquées. Elles n'ont pas de nature : ce sont des textes. */
export const EXTENSION_REGLE = "ref";

/**
 * Ce dont on ignore la nature. Cette extension ne devrait pas se rencontrer.
 *
 * Déclarée avec les fonctions qui nomment les fichiers — c'est leur défaut —,
 * et reprise ici parce que c'est ici qu'on la range.
 */
export { SANS_NATURE };

/** La racine de ce que le projet écrit. */
export const MEMOIRE = "Mémoire";

/** La racine de ce qu'il dépose. L'utilisateur y range comme il veut. */
export const DOCUMENTS = "Documents";

/**
 * La racine de la correspondance.
 *
 * **Le même mot que le dossier**, repris de `le-dossier-des-mails.js` : deux
 * noms pour un seul endroit finiraient par ne plus désigner le même (règle 10).
 */
export const MAILS = DOSSIER_DES_MAILS;

/**
 * Les natures qui n'appartiennent à aucune discipline.
 *
 * Une mesure appartient au bâtiment : « nombre d'étages » sert l'incendie, la
 * structure et l'acoustique. La ranger par domaine la dupliquerait.
 */
export const TRANSVERSALES = {
  [NATURE.DONNEE_BASE]: "Données de base",
  [NATURE.HYPOTHESE]: "Hypothèses",
  [NATURE.INTENDANCE]: "Corpus",
  // Un raisonnement traverse les disciplines : il part d'une donnée du site,
  // passe par une règle incendie, bute sur un arbitrage, et finit dans la
  // structure. Le ranger sous un domaine reviendrait à choisir lequel de ses
  // maillons le nomme — et une chaîne recopiée sous trois domaines diverge.
  [NATURE.RAISONNEMENT]: "Raisonnements"
};

/** Là où va ce dont on ignore le domaine. */
export const SANS_DOMAINE = "Non classé";

/**
 * Ce qu'une extension dit, en une phrase.
 *
 * Une extension nommée sans être expliquée se lit de travers : `.ctr` et `.ddb`
 * se ressemblent assez pour qu'on range au hasard.
 */
export function phraseDeLExtension(extension) {
  const dit = texte(extension);
  if (dit === EXTENSION_REGLE) {
    return "Les règles appliquées, telles qu'elles étaient le jour où on les a appliquées.";
  }

  const entree = Object.entries(EXTENSIONS).find(([, ext]) => ext === dit);
  if (!entree) return "Ce que personne n'a encore classé. Ce fichier ne devrait pas se remplir.";

  return {
    [NATURE.DONNEE_BASE]: "Ce qui a été relevé sur le site ou le programme. Ne se discute pas, ne se calcule pas.",
    [NATURE.CONTRAINTE]: "Ce qui s'impose au projet. Si vous n'êtes pas d'accord, vous n'avez pas de recours.",
    [NATURE.HYPOTHESE]: "Ce qu'on suppose en attendant mieux. Se remplace, et ce qui en dépend devient suspect.",
    [NATURE.CONSTAT]: "Ce qui a été observé, à une date. Un constat sans date ne vaut rien.",
    [NATURE.INTENDANCE]: "Ce qui est entré au dossier : documents, pièces jointes, avis.",
    [NATURE.DECISION]: "Ce que des humains ont tranché, et ce qu'ils ont écarté en le faisant.",
    [NATURE.RAISONNEMENT]: "Par où le projet est passé, et les endroits où quelqu'un a dû choisir."
  }[entree[0]];
}

/** L'ordre de lecture des extensions : les textes d'abord, puis ce qu'on en tire. */
export const ORDRE_DES_EXTENSIONS = [
  EXTENSION_REGLE,
  // Juste après les règles : ce sont ceux qui **produisent** des valeurs sans
  // les porter — le texte, l'humain, et la chaîne qui va de l'un à l'autre.
  EXTENSIONS[NATURE.DECISION],
  EXTENSIONS[NATURE.RAISONNEMENT],
  EXTENSIONS[NATURE.DONNEE_BASE],
  EXTENSIONS[NATURE.CONTRAINTE],
  EXTENSIONS[NATURE.HYPOTHESE],
  EXTENSIONS[NATURE.CONSTAT],
  EXTENSIONS[NATURE.INTENDANCE],
  SANS_NATURE
];

/**
 * Le langage d'une extension : trois formes, trois façons de lire.
 *
 * ## Pourquoi trois, et pas une par extension
 *
 * Ce qui distingue deux fichiers, ce n'est pas leur suffixe, c'est **ce que
 * leurs lignes font** :
 *
 * - **`regle`** — un `.ref` est de la logique : des conditions, des branches,
 *   un résultat. Il se lit comme une fonction, et se colore comme du
 *   JavaScript.
 * - **`declaration`** — un `.ddb` ou un `.hyp` **déclare** : ces sujets-là sont
 *   les variables du projet, écrites une fois et citées partout ailleurs. Ce
 *   sont des `const`, et c'est ce qui permet à une règle de les nommer sans les
 *   recopier.
 * - **`enonce`** — un `.ctr`, un `.cst`, un `.crp`, un `.dec`, un `.rai`
 *   énoncent des paires : un sujet, une valeur, sa provenance. C'est du JSON,
 *   et rien de plus. Une décision y ajoute ce qu'elle a écarté, un raisonnement
 *   la suite de ses étapes ; ni l'un ni l'autre ne s'exécute, contrairement à la
 *   règle dont ils sont le pendant.
 *
 * Une couleur par extension ferait croire à sept langages là où il y en a trois,
 * et surtout elle raterait le point : ce qui compte est de distinguer un nom
 * **posé** d'un nom **cité**.
 */
export const LANGAGES = { REGLE: "regle", DECLARATION: "declaration", ENONCE: "enonce" };

export function langageDeLExtension(extension) {
  const dit = texte(extension);
  if (dit === EXTENSION_REGLE) return LANGAGES.REGLE;
  if (dit === EXTENSIONS[NATURE.DONNEE_BASE] || dit === EXTENSIONS[NATURE.HYPOTHESE]) {
    return LANGAGES.DECLARATION;
  }
  return LANGAGES.ENONCE;
}

/** Le rang d'une extension, pour trier. Les inconnues en dernier. */
export function rangDeLExtension(extension) {
  const rang = ORDRE_DES_EXTENSIONS.indexOf(texte(extension));
  return rang === -1 ? ORDRE_DES_EXTENSIONS.length : rang;
}

/**
 * L'extension d'une affirmation : ce qu'elle est.
 *
 * Une règle appliquée n'a pas de nature — c'est un texte, pas un fait constaté
 * — et son extension le dit avant tout le reste.
 */
export function extensionDeRangement({ nature = "", referentiel = false } = {}) {
  if (referentiel === true) return EXTENSION_REGLE;
  const famille = normalizeNature(nature);
  return famille ? EXTENSIONS[famille] : SANS_NATURE;
}

/**
 * Le chemin d'une affirmation : sa zone, puis son domaine.
 *
 * L'extension n'y figure pas — elle se calcule à part, parce que deux fichiers
 * du même chemin et d'extensions différentes sont deux fichiers voisins, pas
 * deux dossiers.
 *
 * @param {{nature?: string, domain?: string, zones?: string[], referentiel?: boolean}} affirmation
 * @returns {string[]} `["Escalier B", "Incendie"]`
 */
export function cheminDeRangement({ nature = "", domain = "", referentiel = false } = {}) {
  const famille = normalizeNature(nature);

  // Ce qui est observé ne dépend d'aucune discipline : il porte le nom de sa
  // nature, une seule fois pour tout le projet.
  if (referentiel !== true && famille && TRANSVERSALES[famille]) {
    return [MEMOIRE, TRANSVERSALES[famille]];
  }

  const domaine = normalizeDomain(domain);
  return [MEMOIRE, domaine ? domainLabel(domaine) : SANS_DOMAINE];
}

/**
 * La zone d'une affirmation, telle qu'elle ouvre sa section.
 *
 * Une affirmation sans portée vaut partout, et « Toutes zones » se lit en
 * premier dans un fichier : ce qui vaut partout se lit avant ce qui ne vaut
 * qu'ici.
 *
 * Une affirmation qui vaut pour deux zones ouvre les deux sections. Ce n'est
 * pas une copie : c'est la même, vue de deux endroits, et elle porte le même
 * identifiant dans les deux.
 */
export function zonesDeRangement({ zones = [] } = {}) {
  const portees = [...new Set((Array.isArray(zones) ? zones : [zones]).map(texte).filter(Boolean))];
  return portees.length ? portees : [TOUTES_ZONES];
}

/** L'ordre des zones dans un fichier. « Toutes zones » d'abord. */
export function rangDeLaZone(zone) {
  return texte(zone) === TOUTES_ZONES ? 0 : 1;
}

/** L'ordre des deux racines : ce que le projet sait, puis ce qu'il a reçu. */
export function rangDeLaRacine(racine) {
  return texte(racine) === MEMOIRE ? 0 : 1;
}

/**
 * L'ordre des dossiers **dans** `Mémoire/`.
 *
 * Ce qui est observé se lit avant ce qui s'en déduit : on ne juge une exigence
 * qu'une fois connu ce sur quoi elle porte. Puis les domaines, par ordre
 * alphabétique, et ce qui n'a pas de domaine en dernier.
 */
const ORDRE_DES_DOSSIERS = [
  TRANSVERSALES[NATURE.DONNEE_BASE],
  TRANSVERSALES[NATURE.HYPOTHESE],
  TRANSVERSALES[NATURE.INTENDANCE]
];

/** Le rang d'un dossier de `Mémoire/`. Les domaines après les transversaux. */
export function rangDuDossier(nom) {
  const rang = ORDRE_DES_DOSSIERS.indexOf(texte(nom));
  if (rang !== -1) return rang;
  return texte(nom) === SANS_DOMAINE ? ORDRE_DES_DOSSIERS.length + 1 : ORDRE_DES_DOSSIERS.length;
}

/**
 * Ce qu'un dossier de `Mémoire/` dit de lui-même.
 *
 * « Données de base » et « Incendie » ne se ressemblent pas, mais on ne devine
 * pas pour autant que l'un vaut pour tout le projet et l'autre pour une
 * discipline. Un dossier nommé sans être expliqué se remplit de travers.
 */
export function phraseDuDossier(nom) {
  const dit = texte(nom);
  const transversal = {
    [TRANSVERSALES[NATURE.DONNEE_BASE]]:
      "Ce que le bâtiment est. Vaut pour tout le projet : l'incendie, la structure et l'acoustique s'en servent.",
    [TRANSVERSALES[NATURE.HYPOTHESE]]:
      "Ce qu'on suppose en attendant mieux. Vaut pour tout le projet, et ce qui en dépend devient suspect.",
    [TRANSVERSALES[NATURE.INTENDANCE]]:
      "Ce qui est entré au dossier : documents, pièces jointes, avis."
  }[dit];
  if (transversal) return transversal;

  return dit === SANS_DOMAINE
    ? "Ce dont personne n'a dit la discipline. Ce dossier ne devrait pas se remplir."
    : `Les règles ${dit.toLowerCase()} appliquées, ce qu'elles imposent et ce qui a été constaté.`;
}

/** Ce qu'une racine dit d'elle-même, en une phrase. */
export function phraseDeLaRacine(racine) {
  const nom = texte(racine);
  if (nom === MEMOIRE) {
    return "Ce que le projet sait, et comment il l'a su. Écrit par l'application, jamais déplaçable.";
  }
  // **Les mails ont leur racine, donc leur phrase.** Sans elle, ils héritaient
  // de celle des Documents — « rangez-les comme vous voulez » —, qui dit le
  // contraire de ce que ce dossier est.
  if (nom === MAILS) {
    return "Votre correspondance déposée, et ses pièces jointes. "
      + "Le dossier est visible par l'équipe ; chacun n'y voit que ce qu'il y a déposé.";
  }
  return "Les pièces déposées : plans, notes, comptes rendus. Rangez-les comme vous voulez.";
}
