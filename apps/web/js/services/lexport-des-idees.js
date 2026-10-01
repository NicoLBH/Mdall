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
    /**
     * **Ce qui n'a pas pu être lu**, nommé.
     *
     * Une lecture qui échoue arrivait ici comme une liste vide, et le fichier
     * disait alors « aucun mot de liaison » avec le même aplomb qu'un corpus
     * qui n'en porte aucun. Relu trois semaines plus tard, loin de l'écran,
     * rien ne permettait de faire la différence (règle 5).
     *
     * Vide quand tout est revenu : c'est le cas normal, et il ne se commente
     * pas.
     */
    manques: lesManques({ idees, mesure, forme, liaisons, raisonnements }),
    mesure: laMesure(mesure),
    forme: laForme(forme),
    liaisons: (Array.isArray(liaisons) ? liaisons : []).map(uneLiaison).filter(Boolean),
    idees: (Array.isArray(idees) ? idees : []).map(uneLigneDIdee).filter(Boolean),
    raisonnements: (Array.isArray(raisonnements) ? raisonnements : [])
      .map(unRaisonnement).filter(Boolean)
  };
}

/**
 * Ce qu'on a demandé et qu'on n'a pas obtenu.
 *
 * `null` dit « on n'a pas su » ; une liste vide dit « il n'y en a pas ». Les
 * deux arrivent ici de la même façon et mènent à des décisions opposées.
 */
function lesManques({ idees, mesure, forme, liaisons, raisonnements }) {
  return [
    mesure === null ? "la mesure" : "",
    forme === null ? "la forme des affirmations" : "",
    liaisons === null ? "le détail des liaisons" : "",
    idees === null ? "les idées" : "",
    raisonnements === null ? "les raisonnements" : ""
  ].filter(Boolean);
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

  // **Un zéro qu'on n'explique pas se lit comme une panne.** « 0 idée » est
  // vrai et déroutant : il n'y a pas d'idée **partagée par deux chantiers**,
  // ce qui n'est pas la même chose que « le découpage n'a rien trouvé ».
  const pourquoiZero = combien === 0
    ? " Aucune idée n'est encore partagée par deux chantiers : la console n'en "
      + "montre pas d'autres, et n'en emporte pas d'autres."
    : "";

  // Et ce qui n'a pas pu être lu se nomme, plutôt que de se compter comme zéro.
  const manque = porte.manques.length
    ? ` Non lu : ${porte.manques.join(", ")}.`
    : "";

  return `${combien} idée${combien > 1 ? "s" : ""}, ${mots} mot${mots > 1 ? "s" : ""} `
    + `de liaison détaillé${mots > 1 ? "s" : ""}, et ce que la console ne montre pas. `
    + `Des comptes et des termes, aucun contenu de projet.${pourquoiZero}${manque}`;
}

/* ── Le corpus en clair, pour la mise au point du découpage ──────────────── */

/**
 * Le nom du fichier du corpus. **Il dit ce qu'il porte**, dans son nom.
 *
 * Un fichier nommé `mdall-export.json` se retrouve dans un dossier partagé six
 * mois plus tard sans que personne ne sache ce qu'il contient. Celui-ci le dit
 * avant qu'on l'ouvre.
 */
export function leNomDuCorpus(quand = new Date()) {
  const jour = quand instanceof Date && !Number.isNaN(quand.getTime()) ? quand : new Date();
  return `mdall-corpus-en-clair-NE-PAS-PARTAGER-${jour.toISOString().slice(0, 10)}.json`;
}

/**
 * Une ligne du corpus : ce qui a été écrit, et ce que la coupe en a tiré.
 *
 * `avant`, `lien`, `apres`, `mot` sont nuls quand la coupe n'a rien tiré — et
 * ce sont ces lignes-là qu'on vient lire. Les écarter ferait un export de ce
 * qui marche déjà, c'est-à-dire d'aucune utilité.
 */
function uneLigneDuCorpus(ligne) {
  const dit = texte(ligne?.dit);
  if (!dit) return null;

  return {
    chantier: nombre(ligne?.chantier),
    dit,
    // `null` et non `""` : « la coupe n'a rien tiré » n'est pas « elle a tiré
    // un terme vide ». Relu dans un tableur, le second se compterait.
    avant: texte(ligne?.avant) || null,
    lien: texte(ligne?.lien) || null,
    apres: texte(ligne?.apres) || null,
    mot: texte(ligne?.mot) || null
  };
}

/**
 * Le corpus, **en clair**.
 *
 * ## Ce que cette porte-ci laisse sortir, et pourquoi elle existe
 *
 * Du **contenu de chantier** : le texte des affirmations. C'est l'inverse de
 * tout ce que la console s'interdit, et c'est assumé — on ne peut pas améliorer
 * le découpage sans voir ce qu'il n'a pas su lire, et ce qu'il n'a pas su lire
 * est précisément ce qui ne sort jamais.
 *
 * ## Elle reste fermée par défaut, elle aussi
 *
 * Même règle que l'autre porte : les champs connus, recopiés un par un. Une
 * colonne ajoutée demain — un identifiant de projet, un nom de document — ne
 * sortira pas parce qu'elle n'est pas dans la liste. C'est ce qui fait la
 * différence entre « on laisse sortir le texte » et « on laisse sortir la
 * table ».
 *
 * ## Le fichier dit ce qu'il est
 *
 * Il sera relu ailleurs, sans l'écran qui l'explique, et peut-être par
 * quelqu'un d'autre. L'avertissement voyage donc dedans.
 *
 * ## Et il dit ce qui lui manque
 *
 * `attendues` est le nombre d'affirmations que la base porte, rendu par la
 * fonction elle-même. Quand le fichier en porte moins, l'écart s'écrit dedans.
 *
 * Ce n'est pas une précaution de style : le premier fichier emporté portait
 * mille affirmations sur neuf mille et annonçait « 1 000 affirmations, dont
 * 998 dont le découpage ne tire rien ». Une phrase juste sur un corpus faux,
 * et de quoi conclure qu'un seul chantier écrit. Un fichier qui ne dit pas ce
 * qu'il lui manque fait conclure de travers (règle 12).
 */
export function lexportDuCorpus({ lignes = [], attendues = null, quand = new Date() } = {}) {
  const jour = quand instanceof Date && !Number.isNaN(quand.getTime()) ? quand : new Date();
  const portees = (Array.isArray(lignes) ? lignes : []).map(uneLigneDuCorpus).filter(Boolean);
  const attendu = combienAttendu(attendues);
  const manque = attendu !== null && attendu > portees.length ? attendu - portees.length : 0;

  return {
    quoi: "Mdall — console — le corpus en clair",
    le: jour.toISOString(),
    attention: "CE FICHIER PORTE DU CONTENU DE CHANTIER : le texte des "
      + "affirmations, tel qu'il a été écrit. Il sert à comprendre pourquoi le "
      + "découpage ne lit pas une phrase. Il ne se partage pas, et il ne se "
      + "garde pas.",
    // Ce qu'on ne peut pas en tirer, dit aussi : sans cela on cherchera.
    note: "Aucun chantier n'est nommé : le numéro dit seulement que deux "
      + "affirmations viennent du même, jamais lequel.",
    affirmations: portees.length,
    // Ce que la base en porte, et ce qui n'est pas dans ce fichier. `null`
    // quand la fonction ne l'a pas dit : « on ne sait pas » n'est pas « rien
    // ne manque » (règle 5).
    attendues: attendu,
    manque,
    // Le chiffre qu'on vient chercher, calculé ici plutôt que de tête.
    sansIdee: portees.filter((une) => !une.avant || !une.apres).length,
    corpus: portees
  };
}

/**
 * Le nombre d'affirmations annoncé par la base, ou `null`.
 *
 * `Number(null)` et `Number("")` valent zéro, et zéro est fini : converti sans
 * garde, « la fonction ne l'a pas dit » deviendrait « la base n'en porte
 * aucune », et l'écart se lirait à l'envers.
 */
function combienAttendu(combien) {
  if (combien === null || combien === undefined || combien === "") return null;
  const lu = Number(combien);
  return Number.isFinite(lu) && lu >= 0 ? Math.trunc(lu) : null;
}

/** Le même, en texte. */
export function lexportDuCorpusEnJson(quoi) {
  return JSON.stringify(lexportDuCorpus(quoi), null, 2);
}

/** Ce que l'écran dit du bouton du corpus, avant qu'on clique. */
export function phraseDuCorpus(quoi) {
  const porte = lexportDuCorpus(quoi);
  if (!porte.affirmations) {
    return "Aucune affirmation n'a été lue. Ce n'est pas « le corpus est vide » : "
      + "on ne l'a pas demandé, ou on n'a pas su (règle 5).";
  }

  return `${porte.affirmations} affirmation${porte.affirmations > 1 ? "s" : ""}, `
    + `dont ${porte.sansIdee} dont le découpage ne tire rien. C'est celles-là `
    + "qu'on vient lire."
    // **L'écart se dit sur l'écran aussi**, et pas seulement dans le fichier :
    // c'est l'écran qu'on regarde avant de conclure.
    + (porte.manque
      ? ` ${porte.manque} manquent sur les ${porte.attendues} que la base porte :`
        + " le fichier est incomplet, et ce qu'on en conclurait le serait aussi."
      : "");
}
