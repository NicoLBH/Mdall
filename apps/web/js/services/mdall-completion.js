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
import { declarationsDuBrouillon } from "./formulaire-du-brouillon.js";

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
  STATUT: "statut"
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
 * Ce qu'on propose, là où le curseur est.
 *
 * @param {object} contexte
 * @param {string} contexte.ligne la ligne en cours
 * @param {number} contexte.colonne où est le curseur dans cette ligne
 * @param {{nom: string, valeurs?: string[], description?: string}[]} [contexte.declares]
 *   les noms que le projet déclare, avec leur domaine s'il est fermé
 * @param {string[]} [contexte.locales] les noms que la fonction pose
 * @param {string[]} [contexte.fichiers] les fichiers qu'on peut citer
 * @param {number} [contexte.combien] combien au plus
 */
export function propositionsDeSaisie({
  ligne = "", colonne = 0, declares = [], locales = [], fichiers = [], combien = 8
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

  if (attendu === ATTEND.NOM) {
    candidats.push(...locales.map((un) => ({
      texte: texte(un), quoi: QUOI.LOCALE, dit: "calculé dans cette fonction"
    })));
    candidats.push(...declares.map((une) => ({
      texte: texte(une?.nom), quoi: QUOI.NOM, dit: texte(une?.description)
    })));
  }

  if (attendu === ATTEND.VALEUR) {
    // **Le domaine du nom qu'on compare**, et lui seul. Proposer toutes les
    // valeurs du projet derrière un `=` ferait une liste où l'on ne trouve
    // rien, et où l'on choisirait la mauvaise.
    const sujet = sujetCompare(ligne, colonne);
    const declaration = declares.find((une) => repli(une?.nom) === repli(sujet));
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
    .sort((une, autre) => une.rang - autre.rang || une.texte.localeCompare(autre.texte, "fr"))
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
  for (let ou = tete; ou < Math.min(rang, lignes.length); ou += 1) {
    const trouve = (lignes[ou] ?? "").match(/^\s*calcule\s+(.+?)\s*=/i);
    if (trouve && !poses.includes(texte(trouve[1]))) poses.push(texte(trouve[1]));
  }
  return poses;
}

/**
 * Le contexte d'un brouillon, là où le curseur est.
 *
 * Il est ici, et non dans la vue, parce qu'il **se décide** : quels noms sont
 * déclarés, quelles locales sont en portée, quels fichiers on peut citer. La
 * vue n'a qu'à montrer ce qui sort.
 */
export function contexteDuBrouillon(fichiers = [], { contenu = "", position = 0 } = {}) {
  const tous = Array.isArray(fichiers) ? fichiers : [];

  return {
    declares: [...declarationsDuBrouillon(tous).values()].map((une) => ({
      nom: texte(une?.nom),
      valeurs: (une?.valeurs ?? []).map(texte).filter(Boolean),
      description: texte(une?.description)
    })).filter((une) => une.nom),
    locales: localesAuDessus(contenu, position),
    fichiers: tous.map((un) => texte(un?.nom)).filter(Boolean)
  };
}
