/**
 * Ce que l'écran peut proposer pendant qu'on écrit du Mdall.
 *
 * ## Ce que c'est, et ce que ce n'est pas
 *
 * Ce n'est pas un environnement de développement. C'est ce qu'il faut pour
 * **écrire de petits utilitaires sans connaître la grammaire par cœur** :
 * `fonc…` propose `fonction`, une parenthèse de condition propose les noms du
 * projet, un `=` derrière un nom à domaine fermé propose ses valeurs possibles.
 * Rien de plus. Chaque proposition de plus est une chose à apprendre et à
 * documenter, et un écran qui propose tout ne propose rien.
 *
 * ## Il est pur, et c'est ce qui le rend éprouvable
 *
 * Une ligne, une colonne, ce que le projet déclare, ce que le brouillon pose —
 * et une liste sort. Aucun DOM, aucun clavier, aucun réseau. Ce qui décide
 * **quoi** proposer se casse et se répare ici ; ce qui décide **comment** le
 * montrer vit dans la vue, et n'a rien à décider.
 *
 * ## Le vocabulaire vient du langage, jamais d'une copie
 *
 * `MOTS`, `VERBES`, `PROVENANCES`, `STATUTS` sont ceux de `memoire-en-texte.js`.
 * Une liste recopiée ici cesserait de proposer le premier mot qu'on ajoute au
 * langage, et personne ne verrait pourquoi (règles 4 et 10).
 *
 * ## Ce qu'il ne fait jamais
 *
 * **Il ne propose pas ce qui n'existe pas.** Un nom qui n'est déclaré nulle
 * part et qu'aucun brouillon ne pose ne se propose pas : une complétion
 * inventée se tape plus vite qu'elle ne se vérifie, et l'on écrirait des
 * renvois vers rien.
 *
 * **Il ne complète pas au milieu d'une chaîne ni d'un commentaire.** Ce qu'on
 * écrit là est du texte : le langage n'a rien à y dire.
 */

import { MOTS, VERBES, PROVENANCES, STATUTS, PORTEE_DUNE_FONCTION } from "./memoire-en-texte.js";
import { cleDuSujet } from "./memoire-identifiants.js";
import { ORIGINE, catalogueDesNoms, nomsLisiblesDIci } from "./catalogue-des-noms.js";
import { lireUnePourChaque } from "./boucle-du-mdall.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une proposition est, pour qui la montre. */
export const QUOI = {
  /** Un mot du langage : `fonction`, `si`, `calcule`. */
  MOT: "mot",
  /** Un nom déclaré dans le projet. */
  NOM: "nom",
  /** Une valeur que la fonction pose en la calculant. */
  LOCALE: "locale",
  /** Une des valeurs possibles d'un nom à domaine fermé. */
  VALEUR: "valeur",
  /** Un fichier du brouillon ou du projet. */
  FICHIER: "fichier",
  /** Un statut du langage. */
  STATUT: "statut",
  /**
   * Un nom que la **mémoire du projet** conclut.
   *
   * Distinct d'un nom du projet ordinaire, et pour une raison qu'on veut lire
   * sous le curseur : celui-ci n'est pas une valeur qu'on a versée, c'est une
   * **fonction signée** qui se rejouera sur les réponses qu'on donne.
   */
  VERSE: "verse",
  /** Une fonction du langage : `racine`, `arrondi`, `min`. */
  FONCTION: "fonction"
};

/**
 * Ce qu'une origine du catalogue devient sous le curseur.
 *
 * Le catalogue distingue six provenances, parce qu'on les parcourt ; la liste
 * sous le curseur n'en montre que la sorte, parce qu'on la lit du coin de
 * l'œil. Ce qui est **posé par le brouillon** se lit comme un nom du projet :
 * la nuance intéresse celui qui parcourt, pas celui qui tape.
 *
 * **Une origine absente d'ici ne prend pas la sorte d'une autre.** Un défaut
 * plausible — « nom du projet » — serait indiscernable d'un vrai nom du projet,
 * et l'on croirait pouvoir lire ce qui ne se lit pas d'ici. Elle sort donc sans
 * sorte, et l'écran ne dit rien plutôt que de dire faux (règle 5).
 */
const QUOI_DE_LORIGINE = {
  [ORIGINE.PROJET]: QUOI.VERSE,
  [ORIGINE.LOCALE]: QUOI.LOCALE,
  [ORIGINE.DECLARE]: QUOI.NOM,
  [ORIGINE.CONCLU]: QUOI.NOM,
  [ORIGINE.POSE]: QUOI.NOM,
  [ORIGINE.FONCTION]: QUOI.FONCTION
};

/** Ce que le contexte attend à cet endroit de la ligne. */
export const ATTEND = {
  /** Le début d'une ligne : un mot du langage l'ouvre. */
  MOT: "mot",
  /** Un nom : celui d'une condition, d'un calcul, d'un `importe`. */
  NOM: "nom",
  /** Une valeur : derrière un comparateur, dans une condition. */
  VALEUR: "valeur",
  /** Un fichier : derrière `depuis:` ou `dans:`. */
  FICHIER: "fichier",
  /** Un statut : derrière `statut:`. */
  STATUT: "statut",
  /** Rien : une chaîne, un commentaire, une provenance. */
  RIEN: "rien"
};

/** Les mots qui ouvrent une ligne, pris au langage et non recopiés. */
const MOTS_DU_LANGAGE = [...new Set([
  ...MOTS,
  ...Object.values(VERBES),
  PORTEE_DUNE_FONCTION,
  ...PROVENANCES.map((type) => `${type}:`),
  "statut:", "le:", "zone:", "parce que:", "écarté:"
])].filter(Boolean).sort();

/** Les comparateurs derrière lesquels une **valeur** est attendue. */
const COMPARATEUR = /(?:<=|>=|!=|[=<>≠≤≥]|\bparmi\b|\bou\b)\s*$/i;
/** Les mots qui ouvrent une condition, et derrière lesquels un **nom** vient. */
const OUVRE_UNE_CONDITION = /(?:^|\s)(?:si|et|ou|non|sauf si)\s*\($/i;
/** Une tête de boucle, et ce qu'elle porte : le nom, puis ses bornes. */
const OUVRE_UNE_BOUCLE = /^\s*pour\s+chaque\s+(.+)$/i;

/**
 * Le morceau de ligne qu'on est en train d'écrire.
 *
 * ## Pourquoi il traverse les espaces
 *
 * Un nom du projet en porte — « Zone de vent », « Hauteur du plancher bas ». Le
 * couper au premier espace ne proposerait jamais rien au-delà du premier mot,
 * ce qui est précisément le moment où l'on a besoin d'aide. Il commence donc
 * après le dernier **séparateur** — une parenthèse, une virgule, un
 * point-virgule, un comparateur, un deux-points — et non après le dernier
 * espace.
 *
 * @returns {{debut: number, mot: string}} où il commence, et ce qu'il porte
 */
export function motEnCours(ligne = "", colonne = 0) {
  const avant = String(ligne ?? "").slice(0, Math.max(0, colonne));

  // Le dernier séparateur : tout ce qui suit est le mot en cours.
  let debut = 0;
  for (let rang = avant.length - 1; rang >= 0; rang -= 1) {
    if ("(),;:=<>≠≤≥{}[]+-*/^\"".includes(avant[rang])) { debut = rang + 1; break; }
  }

  const brut = avant.slice(debut);
  const blancs = brut.length - brut.trimStart().length;
  return { debut: debut + blancs, mot: brut.trimStart() };
}

/**
 * Ce que la ligne attend, là où le curseur est.
 *
 * Décidable en lisant ce qui **précède** le curseur, et rien d'autre : ce qui
 * suit peut être à moitié écrit, et le lire ferait changer la proposition selon
 * ce qu'on n'a pas encore fini de taper.
 */
export function ceQuAttendLaLigne(ligne = "", colonne = 0) {
  const avant = String(ligne ?? "").slice(0, Math.max(0, colonne));

  // Un commentaire, une chaîne ouverte : le langage n'a rien à dire là.
  if (avant.trimStart().startsWith("//")) return ATTEND.RIEN;
  if ((avant.match(/"/g) ?? []).length % 2 === 1) return ATTEND.RIEN;

  if (/\b(?:depuis|dans|vers)\s*:\s*[^\s,;)]*$/i.test(avant)) return ATTEND.FICHIER;
  if (/\bstatut\s*:\s*[^\s,;)]*$/i.test(avant)) return ATTEND.STATUT;

  // Une provenance ouvre du texte libre : `texte: NF EN 1991-1-4`.
  if (PROVENANCES.some((type) => new RegExp(`\\b${type}\\s*:`, "i").test(avant))) return ATTEND.RIEN;

  const nu = avant.trimStart();
  const { debut } = motEnCours(ligne, colonne);

  // Le début de la ligne : un mot du langage l'ouvre.
  if (!nu || debut <= String(ligne).length - String(ligne).trimStart().length) return ATTEND.MOT;

  if (COMPARATEUR.test(avant)) return ATTEND.VALEUR;
  if (OUVRE_UNE_CONDITION.test(avant)) return ATTEND.NOM;

  return ATTEND.NOM;
}

/** Une chaîne repliée : casse, accents, espaces — celle des sujets du projet. */
const repli = (valeur) => cleDuSujet(valeur);

/**
 * Le rang d'une proposition : ce qui commence par le mot passe devant.
 *
 * Un « contient » seul remonterait « Hauteur du plancher bas » avant « bas » ;
 * on cherche d'abord ce qu'on a commencé à écrire.
 */
function rangDe(candidat, cherche) {
  if (!cherche) return 1;
  const ou = repli(candidat).indexOf(repli(cherche));
  if (ou < 0) return -1;
  return ou === 0 ? 0 : 2;
}

/**
 * Ce qui passe devant, à égalité de recherche.
 *
 * **Ce qu'on ne retient pas, c'est ce que ce projet-ci contient.** `abs`,
 * `racine` et `arrondi` sont sept et ne changent jamais ; ce que le brouillon
 * conclut trente lignes plus haut change à chaque minute, et c'est exactement
 * ce qu'on vient chercher dans une liste.
 *
 * Triés par ordre alphabétique seul, les sept mots du langage prenaient six des
 * huit places de la liste — et la fonction qu'on venait d'écrire n'y figurait
 * pas. On ouvrait la liste, on n'y voyait rien d'utile, et l'on apprenait à ne
 * plus l'ouvrir : le catalogue existait, et personne ne l'avait jamais vu
 * proposer un nom du projet.
 */
const PRIORITE = {
  [QUOI.LOCALE]: 0,
  [QUOI.NOM]: 0,
  [QUOI.VALEUR]: 0,
  [QUOI.VERSE]: 0,
  [QUOI.FICHIER]: 0,
  [QUOI.STATUT]: 0,
  [QUOI.MOT]: 1,
  [QUOI.FONCTION]: 1
};

const priorite = (quoi) => PRIORITE[quoi] ?? 0;

/**
 * Ce qu'on propose, là où le curseur est.
 *
 * @param {object} contexte
 * @param {string} contexte.ligne la ligne en cours
 * @param {number} contexte.colonne où est le curseur dans cette ligne
 * @param {{nom: string, origine: string, valeurs?: string[], dit?: string}[]} [contexte.catalogue]
 *   tout ce qu'on peut nommer là où l'on écrit, tel que `catalogueDesNoms` le rend
 * @param {string[]} [contexte.fichiers] les fichiers qu'on peut citer
 * @param {number} [contexte.combien] combien au plus
 */
export function propositionsDeSaisie({
  ligne = "", colonne = 0, catalogue = [], fichiers = [], combien = 8
} = {}) {
  const attendu = ceQuAttendLaLigne(ligne, colonne);
  if (attendu === ATTEND.RIEN) return [];

  const { mot } = motEnCours(ligne, colonne);

  /**
   * **Une ligne vide ne propose pas les quarante mots du langage.**
   *
   * `montrer` est appelé à chaque frappe, donc à chaque retour à la ligne : une
   * liste qui se déplie toute seule sous le curseur dès qu'on passe à la ligne
   * se referme à l'aveugle, et l'on apprend à l'ignorer. Il faut une lettre.
   *
   * Les autres contextes, eux, proposent sans rien attendre : `si (Zone de
   * vent = ` doit montrer le domaine **avant** qu'on devine sa première
   * lettre — c'est tout l'intérêt.
   */
  if (!mot && attendu === ATTEND.MOT) return [];

  const candidats = [];

  if (attendu === ATTEND.MOT) {
    candidats.push(...MOTS_DU_LANGAGE.map((un) => ({ texte: un, quoi: QUOI.MOT, dit: "" })));
  }

  /**
   * **Le catalogue est la liste, et il n'y en a qu'une.** Ce qu'on parcourt et
   * ce qui se propose sous le curseur répondent à la même question ; deux
   * listes finiraient par ne plus dire la même chose, et l'écran proposerait un
   * nom que le parcours ne montre pas (règle 10).
   *
   * La seule différence est dite par `nomsLisiblesDIci` : un nom de l'établi se
   * parcourt et ne se propose pas, parce qu'il ne se lit pas d'ici.
   */
  const lisibles = nomsLisiblesDIci(catalogue);

  if (attendu === ATTEND.NOM) {
    candidats.push(...lisibles.map((une) => ({
      texte: texte(une?.nom),
      quoi: QUOI_DE_LORIGINE[une?.origine],
      dit: texte(une?.dit)
    })));
  }

  if (attendu === ATTEND.VALEUR) {
    // **Le domaine du nom qu'on compare**, et lui seul. Proposer toutes les
    // valeurs du projet derrière un `=` ferait une liste où l'on ne trouve
    // rien, et où l'on choisirait la mauvaise.
    const sujet = sujetCompare(ligne, colonne);
    const declaration = lisibles.find((une) => repli(une?.nom) === repli(sujet));
    candidats.push(...(declaration?.valeurs ?? []).map((une) => ({
      texte: `"${texte(une)}"`, quoi: QUOI.VALEUR, dit: texte(sujet)
    })));
  }

  if (attendu === ATTEND.FICHIER) {
    candidats.push(...fichiers.map((un) => ({ texte: texte(un), quoi: QUOI.FICHIER, dit: "" })));
  }

  if (attendu === ATTEND.STATUT) {
    candidats.push(...STATUTS.map((un) => ({ texte: un, quoi: QUOI.STATUT, dit: "" })));
  }

  const vus = new Set();
  return candidats
    .filter((une) => {
      if (!une.texte || vus.has(repli(une.texte))) return false;
      vus.add(repli(une.texte));
      return true;
    })
    .map((une) => ({ ...une, rang: rangDe(une.texte, mot) }))
    .filter((une) => une.rang >= 0)
    .sort((une, autre) => une.rang - autre.rang
      || priorite(une.quoi) - priorite(autre.quoi)
      || une.texte.localeCompare(autre.texte, "fr"))
    .slice(0, Math.max(1, combien))
    .map(({ rang, ...reste }) => reste);
}

/**
 * Le nom qu'une condition compare, à gauche du comparateur.
 *
 * `si (Zone de vent = ` → « Zone de vent ». C'est ce qui permet de ne proposer
 * que **son** domaine, et non toutes les valeurs du projet.
 */
export function sujetCompare(ligne = "", colonne = 0) {
  const avant = String(ligne ?? "").slice(0, Math.max(0, colonne));
  const trouve = avant.match(/([^\s(),;][^(),;]*?)\s*(?:<=|>=|!=|[=<>≠≤≥]|\bparmi\b)\s*[^=<>]*$/);
  return trouve ? texte(trouve[1]) : "";
}

/**
 * La ligne, une fois la proposition posée, et où le curseur se retrouve.
 *
 * Le mot en cours est **remplacé**, jamais complété par la fin : on a pu taper
 * « vent » pour trouver « Zone de vent », et coller la proposition derrière
 * aurait donné « ventZone de vent ».
 */
export function appliquerLaProposition(ligne = "", colonne = 0, proposition = "") {
  const entiere = String(ligne ?? "");
  const ou = Math.max(0, Math.min(colonne, entiere.length));
  const { debut } = motEnCours(entiere, ou);
  const pose = texte(proposition);
  if (!pose) return { ligne: entiere, colonne: ou };

  return {
    ligne: entiere.slice(0, debut) + pose + entiere.slice(ou),
    colonne: debut + pose.length
  };
}

/**
 * Où le curseur est, dans le texte entier : quelle ligne, quelle colonne.
 *
 * La vue n'a qu'une position dans un `<textarea>` ; tout le reste de ce module
 * raisonne par ligne, parce que le langage se lit par ligne.
 */
export function ouEstLeCurseur(contenu = "", position = 0) {
  const avant = String(contenu ?? "").slice(0, Math.max(0, position));
  const lignes = avant.split("\n");
  return { rang: lignes.length - 1, colonne: lignes[lignes.length - 1].length };
}

/**
 * Les valeurs qu'une fonction pose **au-dessus du curseur**.
 *
 * On remonte jusqu'à la tête de fonction la plus proche, puis on redescend
 * jusqu'au curseur. Les `calcule` d'une autre fonction ne se proposent pas :
 * une locale ne vit que dans la sienne, et la proposer ailleurs ferait écrire
 * un renvoi vers rien.
 */
/**
 * La fonction dans laquelle le curseur se trouve, s'il y en a une.
 *
 * **Une fonction ne peut pas se lire elle-même.** Mdall n'a pas d'appel : une
 * fonction conclut sous son nom, et le nommer dans son propre corps est une
 * circularité — la règle reste indécidable, ou, pire, elle lit la valeur que
 * le projet tenait d'une version précédente d'elle-même, et l'on obtient un
 * résultat parfaitement plausible qui ne vient de nulle part.
 *
 * Se la proposer à soi-même menait donc droit dans ce piège, d'un clic.
 */
export function fonctionAutourDuCurseur(contenu = "", position = 0) {
  const lignes = String(contenu ?? "").split("\n");
  const { rang } = ouEstLeCurseur(contenu, position);

  for (let ou = Math.min(rang, lignes.length - 1); ou >= 0; ou -= 1) {
    // Un abaque se referme sur la même circularité, et s'ouvre par un autre mot.
    const tete = /^\s*(?:fonction|courbe)\s+([^(]+)\(/i.exec(lignes[ou] ?? "");
    if (tete) return texte(tete[1]);
    // Une accolade fermante en colonne zéro clôt la fonction précédente : au-delà,
    // on n'est plus dedans, et ce qu'elle conclut redevient nommable.
    if (/^\}/.test(lignes[ou] ?? "") && ou < rang) return "";
  }
  return "";
}

export function localesAuDessus(contenu = "", position = 0) {
  const lignes = String(contenu ?? "").split("\n");
  const { rang } = ouEstLeCurseur(contenu, position);

  let tete = -1;
  for (let ou = Math.min(rang, lignes.length - 1); ou >= 0; ou -= 1) {
    if (/^\s*fonction\s/i.test(lignes[ou] ?? "")) { tete = ou; break; }
  }
  if (tete < 0) return [];

  // **Strictement au-dessus.** Sur la ligne d'un `calcule`, le nom qu'on est
  // en train de poser n'est pas encore posé : se le proposer à soi-même ferait
  // écrire `calcule TVA = TVA`, qui ne veut rien dire.
  const poses = [];
  const retenir = (nom) => {
    const dit = texte(nom);
    if (dit && !poses.includes(dit)) poses.push(dit);
  };

  for (let ou = tete; ou < Math.min(rang, lignes.length); ou += 1) {
    const ligne = lignes[ou] ?? "";
    retenir(ligne.match(/^\s*calcule\s+(.+?)\s*=/i)?.[1]);
    /**
     * **La variable d'une boucle est une locale comme une autre.**
     *
     * `pour chaque Portée de 2 m à 90 m` lui donne une valeur par ligne, et
     * c'est le nom qu'on écrit le plus souvent dans le corps de la boucle. Ne
     * pas le proposer là où il est le plus utile serait la pire des absences.
     */
    const ouvreUneBoucle = ligne.match(OUVRE_UNE_BOUCLE);
    if (ouvreUneBoucle) retenir(lireUnePourChaque(ouvreUneBoucle[1])?.nom);
  }
  return poses;
}

/**
 * Le contexte d'un brouillon, là où le curseur est.
 *
 * ## C'est le seul endroit où le catalogue s'assemble
 *
 * Il est ici, et non dans la vue, parce qu'il **se décide** : ce que le
 * brouillon déclare, conclut et pose, les locales en portée, ce que l'établi
 * garde, et les fichiers qu'on peut citer. La vue n'a qu'à montrer ce qui sort.
 *
 * **La liste qu'on parcourt et celle qui se propose sortent d'ici toutes les
 * deux.** Le panneau du catalogue et la liste sous le curseur appellent cette
 * fonction, et non deux assemblages voisins : c'est ce qui garantit qu'ils
 * montrent la même chose (règle 10).
 *
 * @param {{nom: string, contenu: string}[]} fichiers les fichiers du brouillon
 * @param {object} [ou] où l'on écrit, et ce qu'on a gardé
 * @param {string} [ou.contenu] le texte du fichier ouvert
 * @param {number} [ou.position] où le curseur y est
 * @param {object[]|null} [ou.etabli] les utilitaires gardés, s'ils sont lus
 */
/**
 * Le catalogue, privé de **ce que la fonction qu'on écrit conclut**.
 *
 * **Et de cela seulement.** Une fonction pose très souvent une locale qui porte
 * son propre nom — `calcule Prix TTC = …` puis `alors (Prix TTC)` —, et c'est
 * ainsi qu'elle conclut : la lui retirer l'empêcherait d'écrire sa dernière
 * ligne. Ce qu'on retire est le nom **qu'elle conclut**, c'est-à-dire elle-même
 * vue de l'extérieur : le nommer dans son propre corps est une circularité.
 */
function sansSoiMeme(catalogue = [], soi = "") {
  const sien = texte(soi);
  if (!sien) return catalogue;
  return catalogue.filter((une) =>
    une?.origine !== ORIGINE.CONCLU || repli(une?.nom) !== repli(sien));
}

export function contexteDuBrouillon(fichiers = [], {
  contenu = "", position = 0, etabli = null, projet = null
} = {}) {
  const tous = Array.isArray(fichiers) ? fichiers : [];

  return {
    /**
     * **Ce qu'on peut nommer ici, moins la fonction qu'on écrit.**
     *
     * Elle est retirée des deux lectures à la fois — la liste sous le curseur
     * et le panneau qu'on parcourt —, parce qu'elles répondent à la même
     * question et qu'un nom proposé d'un côté et absent de l'autre est la pire
     * des divergences (règle 10).
     */
    catalogue: sansSoiMeme(
      catalogueDesNoms({ fichiers: tous, etabli, projet, locales: localesAuDessus(contenu, position) }),
      fonctionAutourDuCurseur(contenu, position)
    ),
    fichiers: tous.map((un) => texte(un?.nom)).filter(Boolean)
  };
}
