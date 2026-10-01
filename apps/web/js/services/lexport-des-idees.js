/**
 * Ce que la console laisse emporter des idées — et rien d'autre.
 *
 * ## Pourquoi il existe
 *
 * L'écran annonce « 1 % des affirmations énoncent un lien (61 sur 9 285) » et
 * s'arrête là.
 *
 * > « Le résultat me semble très faible. Pour le moment, nous sommes
 * > complètement aveugles. »
 *
 * Un pour cent peut vouloir dire deux choses opposées : le corpus n'énonce
 * rien, ou le découpage ne sait pas le lire. On ne peut pas trancher à l'écran,
 * parce qu'il faut regarder soixante lignes côte à côte. Il faut donc pouvoir
 * **emporter** ce que la console a mesuré.
 *
 * ## Et c'est précisément là qu'il faut une porte
 *
 * Emporter, c'est sortir de la console. La console d'administration regarde des
 * comptes, jamais leur contenu : elle ne doit pas laisser partir une phrase de
 * chantier, un nom de bâtiment, une adresse (`docs/la-console-de-ladministrateur.md`).
 *
 * Ce module est cette porte, et elle est **fermée par défaut** : il recopie les
 * champs qu'il connaît, un par un, et laisse tomber tout le reste. Une colonne
 * ajoutée demain à une fonction de base — une citation, un extrait — ne sortira
 * pas parce que personne n'y aura pensé : elle ne sortira pas parce qu'elle
 * n'est pas dans la liste.
 *
 * Filtrer ce qu'on connaît comme dangereux aurait été l'inverse, et aurait
 * laissé passer le premier champ qu'on n'avait pas prévu.
 *
 * ## Ce qui sort, et pourquoi chaque chose y est
 *
 * · **la mesure** — sur quoi on a cherché, et ce que la console cache ;
 * · **la forme** — si le corpus est fait de phrases ou d'intitulés. C'est la
 *   première explication d'un pour cent, et elle n'accuse pas le découpage ;
 * · **les liaisons** — mot par mot : lequel promet et ne rend rien ;
 * · **les idées** et **les raisonnements** — ce que l'écran montre déjà.
 *
 * Des nombres, des mots de liaison écrits dans ce fichier-ci, et des termes
 * techniques déjà partagés par au moins deux chantiers. Rien qui désigne un
 * chantier, une personne ou un lieu.
 *
 * ## Il est pur
 *
 * Des lectures entrent, un objet sort. Il n'écrit rien et ne parle à personne.
 */

import { cestUneIdee } from "./une-idee.js";
import { phraseDunRaisonnement } from "./un-raisonnement.js";

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => Number(valeur) || 0;

/** Le nom du fichier qu'on emporte. Daté, sinon on en a trois et aucun ordre. */
export function leNomDuFichier(quand = new Date()) {
  const jour = quand instanceof Date && !Number.isNaN(quand.getTime()) ? quand : new Date();
  return `mdall-les-idees-${jour.toISOString().slice(0, 10)}.json`;
}

/** La mesure, champ par champ. Cinq nombres, et pas un de plus. */
function laMesure(mesure) {
  if (!mesure) return null;
  return {
    affirmations: nombre(mesure.affirmations),
    liantes: nombre(mesure.liantes),
    lisibles: nombre(mesure.lisibles),
    montrees: nombre(mesure.montrees),
    cachees: nombre(mesure.cachees)
  };
}

/** La forme du corpus : des phrases, ou des intitulés ? */
function laForme(forme) {
  if (!forme) return null;
  return {
    affirmations: nombre(forme.affirmations),
    motsMoyens: nombre(forme.mots_moyens ?? forme.motsMoyens),
    auMoinsDixMots: nombre(forme.au_moins_dix_mots ?? forme.auMoinsDixMots),
    sansLiaison: nombre(forme.sans_liaison ?? forme.sansLiaison)
  };
}

/**
 * Le détail d'un mot de liaison.
 *
 * `mot` et `lien` sortent : ce sont des mots de la langue, écrits dans la
 * migration, et non des mots de chantier.
 */
function uneLiaison(ligne) {
  const mot = texte(ligne?.mot);
  if (!mot) return null;

  return {
    mot,
    lien: texte(ligne?.lien),
    contenues: nombre(ligne?.contenues),
    premieres: nombre(ligne?.premieres),
    entieres: nombre(ligne?.entieres),
    sansTerme: nombre(ligne?.sans_terme ?? ligne?.sansTerme),
    tautologies: nombre(ligne?.tautologies),
    chantiers: nombre(ligne?.chantiers)
  };
}

/** Une idée : deux termes, un lien, deux comptes. */
function uneLigneDIdee(idee) {
  if (!cestUneIdee(idee)) return null;
  return {
    avant: texte(idee.avant),
    lien: texte(idee.lien),
    apres: texte(idee.apres),
    affirmations: nombre(idee.affirmations),
    chantiers: nombre(idee.chantiers)
  };
}

/**
 * Un raisonnement : sa phrase, sa longueur, et ce qui l'atteste.
 *
 * La phrase est composée des mêmes termes et des mêmes verbes que les idées
 * qu'elle enchaîne — elle n'ajoute aucun mot venu d'un chantier.
 */
function unRaisonnement(chaine) {
  const dit = phraseDunRaisonnement(chaine);
  if (!dit) return null;
  return {
    dit,
    pas: nombre(chaine?.pas),
    chantiers: nombre(chaine?.chantiers),
    affirmations: nombre(chaine?.affirmations),
    boucle: chaine?.boucle === true,
    tronquee: chaine?.tronquee === true
  };
}

/**
 * Ce qu'on emporte.
 *
 * @param {object} options
 * @param {object[]} [options.idees] ce que `lesIdeesRangees` a rendu
 * @param {object|null} [options.mesure] ce que `la_mesure_des_idees()` a rendu
 * @param {object|null} [options.forme] ce que `la_forme_des_affirmations()` a rendu
 * @param {object[]} [options.liaisons] ce que `le_detail_des_liaisons()` a rendu
 * @param {object[]} [options.raisonnements] ce que `lesRaisonnements` a rendu
 * @param {Date} [options.quand] l'instant de la lecture
 */
export function lexportDesIdees({
  idees = [], mesure = null, forme = null, liaisons = [], raisonnements = [],
  quand = new Date()
} = {}) {
  const jour = quand instanceof Date && !Number.isNaN(quand.getTime()) ? quand : new Date();

  return {
    // De quoi savoir ce qu'on relit trois semaines plus tard.
    quoi: "Mdall — console — les idées énoncées",
    le: jour.toISOString(),
    // **Ce que ce fichier n'est pas**, écrit dedans : on le relira ailleurs,
    // sans l'écran qui l'explique.
    note: "Des comptes et des termes partagés par au moins deux chantiers. "
      + "Aucun contenu de projet : ni phrase, ni nom, ni adresse.",
    mesure: laMesure(mesure),
    forme: laForme(forme),
    liaisons: (Array.isArray(liaisons) ? liaisons : []).map(uneLiaison).filter(Boolean),
    idees: (Array.isArray(idees) ? idees : []).map(uneLigneDIdee).filter(Boolean),
    raisonnements: (Array.isArray(raisonnements) ? raisonnements : [])
      .map(unRaisonnement).filter(Boolean)
  };
}

/** Le même, en texte — ce qu'on colle dans un fichier ou dans un message. */
export function lexportEnJson(quoi) {
  return JSON.stringify(lexportDesIdees(quoi), null, 2);
}

/**
 * Ce que l'écran dit du bouton, pour qu'on sache ce qu'on emporte avant de
 * cliquer. Les nombres, pas une promesse.
 */
export function phraseDeLexport(quoi) {
  const porte = lexportDesIdees(quoi);
  const combien = porte.idees.length;
  const mots = porte.liaisons.length;

  return `${combien} idée${combien > 1 ? "s" : ""}, ${mots} mot${mots > 1 ? "s" : ""} `
    + `de liaison détaillé${mots > 1 ? "s" : ""}, et ce que la console ne montre pas. `
    + "Des comptes et des termes, aucun contenu de projet.";
}
