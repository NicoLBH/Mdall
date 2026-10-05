/**
 * Ce qui attend une proposition — **une seule, pour tout ce qui a été lu
 * depuis la dernière.**
 *
 * ## La question posée
 *
 * > « L'idée est d'y mettre tout le contenu depuis les derniers documents
 * >   précédemment transformés en propositions. Donc, si entre temps, j'en ai
 * >   analysé 12, une seule proposition pour 12. »
 *
 * Aujourd'hui une proposition se fait **depuis un document ouvert** : on lit un
 * compte rendu, on clique « Faire une proposition », elle porte ce compte rendu.
 * Douze documents lus demandent donc douze propositions à signer une par une,
 * et personne ne le fait — c'est exactement ainsi qu'on se retrouve avec
 * dix-huit documents lus et aucune mémoire.
 *
 * ## « Depuis la dernière » ne demande aucune colonne neuve
 *
 * Chaque lecture conservée porte déjà `proposition_id` : la proposition qui l'a
 * emportée, ou rien. **Ce qui attend est donc exactement ce qui n'en a pas**, et
 * c'est une définition qui ne peut pas dériver — elle se lit sur la même ligne
 * que la lecture.
 *
 * L'alternative aurait été une date de dernier versement, par projet ou par
 * famille. Elle aurait fait rentrer dans un lot un document lu *avant* la
 * dernière proposition mais versé après, et laissé dehors un document déjà
 * emporté dont la date aurait bougé. Un lien vaut mieux qu'une borne.
 *
 * ## Ce que ce module prépare, et ce qu'il ne fait pas
 *
 * Il répond à « qu'est-ce qu'une proposition porterait, et peut-on la faire ? ».
 * Il **n'écrit rien** et ne compose aucune proposition : l'écriture est dans
 * `atelier-proposition.js` et les lignes dans `proposition-du-cr.js`, qui
 * savent déjà le faire pour un document. Les leur faire faire pour douze est le
 * tour suivant, et il a besoin de ce que ce module rend.
 *
 * C'est dit ici parce qu'un module qui annoncerait préparer une proposition
 * sans en préparer une serait une intention présentée comme une chose qui
 * marche (règle 12). L'écran, lui, dit en toutes lettres ce qui n'est pas
 * branché.
 *
 * ## Il est pur
 *
 * Des documents du tableau entrent — ceux que `les-documents-analyses.js`
 * rend —, un lot sort. Aucune requête : l'écran a déjà tout sous la main.
 */

import { TOUTES, ceQueDitLaFamille } from "./les-familles-de-document.js";
import { OU_EN_EST } from "./les-documents-analyses.js";
import { lePluriel } from "./lexploitation-de-mdall.js";
import { leJourDeLaSource } from "./la-chronologie-des-sources.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Pourquoi il n'y a rien à proposer.
 *
 * **Chaque motif est une phrase différente, et c'est le point.** « Le bouton est
 * gris » ne dit pas s'il faut lire un document, en attendre un, ou aller signer
 * la proposition qui existe déjà — trois gestes opposés (règle 5).
 */
export const POURQUOI_PAS_DE_LOT = {
  /** Rien n'a été lu : il n'y a pas de matière. */
  RIEN_DE_LU: "rien_de_lu",
  /** Tout ce qui a été lu est déjà parti dans une proposition. */
  DEJA_TOUT_VERSE: "deja_tout_verse",
  /** Ce qui attend n'est pas rattaché à un document de Fichiers. */
  SANS_DOCUMENT: "sans_document"
};

export const CE_QUE_LE_REFUS_DIT = {
  [POURQUOI_PAS_DE_LOT.RIEN_DE_LU]:
    "Aucun document n'a encore été lu : une proposition n'aurait rien à porter.",
  [POURQUOI_PAS_DE_LOT.DEJA_TOUT_VERSE]:
    "Tout ce qui a été lu est déjà parti dans une proposition. Les propositions "
    + "ouvertes attendent une signature, dans l'onglet Propositions.",
  [POURQUOI_PAS_DE_LOT.SANS_DOCUMENT]:
    "Ce qui attend n'est rattaché à aucun document de Fichiers : une proposition "
    + "ne pourrait pas citer la page d'où chaque ligne sort."
};

/**
 * Une lecture attend-elle une proposition ?
 *
 * Trois conditions, et les trois sont nécessaires :
 *
 *  1. **elle est analysée** — un document en attente ou en échec n'a rien à
 *     verser, et l'inclure ferait un lot dont une partie ne porterait rien ;
 *  2. **elle n'a pas de proposition** — c'est la définition de « depuis la
 *     dernière » ;
 *  3. **elle cite un document de Fichiers** — sans lui, une ligne de la
 *     proposition ne pourrait pas se vérifier, et une affirmation qui ne se
 *     vérifie pas n'a rien à faire dans la mémoire.
 */
export function attendUneProposition(document = null) {
  if (!document || typeof document !== "object") return false;
  if (texte(document.ou) !== OU_EN_EST.ANALYSE) return false;
  if (texte(document.propositionId)) return false;
  return Boolean(texte(document.documentId));
}

/**
 * Ce qui a été lu, n'a pas de proposition, mais ne cite aucun document.
 *
 * **Compté à part, et jamais confondu avec ce qui attend.** Ce sont des lectures
 * réelles qui ne peuvent pas entrer, et le taire ferait dire « 12 documents
 * attendent » là où il y en a quatorze dont deux sont bloquées (règle 5).
 */
export function lesLecturesSansDocument(documents = []) {
  return liste(documents).filter((un) => texte(un?.ou) === OU_EN_EST.ANALYSE
    && !texte(un?.propositionId)
    && !texte(un?.documentId));
}

/**
 * Le lot : tout ce qui attend une proposition, dans l'ordre du chantier.
 *
 * **Par la date du document, du plus ancien au plus récent.** C'est l'ordre dans
 * lequel les faits se sont produits, et donc celui dans lequel une proposition
 * doit les présenter : un compte rendu de novembre qui corrige celui d'octobre
 * doit passer après. Trier par date de lecture rangerait le lot dans l'ordre où
 * l'on a trouvé le temps de lire, ce qui n'apprend rien sur le chantier.
 *
 * Une lecture sans date de document reste **derrière**, dans son ordre
 * d'arrivée : on ne lui invente pas une place dans la chronologie.
 *
 * @param {object[]} documents les lignes du tableau d'*Analyse de documents*
 * @param {string} [famille] la famille à retenir, ou `TOUTES`
 */
export function leLotQuiAttend(documents = [], famille = TOUTES) {
  const quelle = texte(famille) || TOUTES;

  const siens = liste(documents)
    .filter(attendUneProposition)
    .filter((un) => quelle === TOUTES || texte(un.famille) === quelle);

  return siens
    .map((un, rang) => ({ un, rang, jour: leJourDeLaSource(un.quand) }))
    .sort((gauche, droite) => {
      if (!gauche.jour && !droite.jour) return gauche.rang - droite.rang;
      if (!gauche.jour) return 1;
      if (!droite.jour) return -1;
      const compare = gauche.jour.localeCompare(droite.jour);
      // À date égale, l'ordre d'arrivée : deux comptes rendus du même jour
      // n'ont pas de raison de changer de place d'un affichage à l'autre.
      return compare !== 0 ? compare : gauche.rang - droite.rang;
    })
    .map((une) => une.un);
}

/**
 * Ce qu'une seule proposition porterait, et ce qui l'en empêche.
 *
 * @returns {{combien, lot, parFamille, sansDate, sansDocument, du, au, peut, pourquoiPas, dit}}
 */
export function ceQuUneSeulePropositionPorterait(documents = [], famille = TOUTES) {
  const tous = liste(documents);
  const lot = leLotQuiAttend(tous, famille);
  const sansDocument = lesLecturesSansDocument(tous);

  const analysees = tous.filter((un) => texte(un?.ou) === OU_EN_EST.ANALYSE);

  /**
   * **Les trois refus, dans l'ordre où ils cessent d'être vrais.**
   *
   * Rien de lu passe avant « déjà tout versé », qui passe avant « sans
   * document » : un chantier où rien n'est lu n'a pas non plus de proposition,
   * et annoncer le second motif enverrait chercher une proposition qui n'existe
   * pas.
   */
  let pourquoiPas = "";
  if (lot.length === 0) {
    if (analysees.length === 0) pourquoiPas = POURQUOI_PAS_DE_LOT.RIEN_DE_LU;
    else if (sansDocument.length > 0) pourquoiPas = POURQUOI_PAS_DE_LOT.SANS_DOCUMENT;
    else pourquoiPas = POURQUOI_PAS_DE_LOT.DEJA_TOUT_VERSE;
  }

  const jours = lot.map((un) => leJourDeLaSource(un.quand)).filter(Boolean).sort();

  return {
    combien: lot.length,
    lot,
    /** Combien par famille : une proposition qui mêle trois familles le dit. */
    parFamille: lot.reduce((compte, un) => {
      const quelle = texte(un.famille);
      return quelle ? { ...compte, [quelle]: (compte[quelle] ?? 0) + 1 } : compte;
    }, {}),
    /**
     * Combien du lot ne portent pas de date de document. Ils entrent quand
     * même — une lecture sans date reste une lecture —, mais la période annoncée
     * ne les couvre pas, et l'écran doit pouvoir le dire.
     */
    sansDate: lot.filter((un) => !leJourDeLaSource(un.quand)).length,
    sansDocument: sansDocument.length,
    du: jours[0] ?? "",
    au: jours[jours.length - 1] ?? "",
    peut: lot.length > 0,
    pourquoiPas,
    dit: phraseDuLot({ combien: lot.length, sansDocument: sansDocument.length, pourquoiPas })
  };
}

/**
 * Ce que l'écran dit du lot, en une ligne.
 *
 * **Le refus est dit en entier, et non résumé.** « Rien à proposer » obligerait
 * à deviner laquelle des trois raisons s'applique.
 */
export function phraseDuLot({ combien = 0, sansDocument = 0, pourquoiPas = "" } = {}) {
  if (pourquoiPas) return CE_QUE_LE_REFUS_DIT[pourquoiPas] ?? "";

  const debut = `${lePluriel(combien, "document attend", "documents attendent")} une proposition`;
  if (!sansDocument) return debut;

  // `lePluriel` accorde les noms, pas les verbes : les deux formes s'écrivent
  // côte à côte, c'est la seule façon de ne pas en oublier une.
  const verbe = sansDocument > 1
    ? "autres ne citent aucun document de Fichiers"
    : "autre ne cite aucun document de Fichiers";
  return `${debut} · ${sansDocument} ${verbe}`;
}

/**
 * Le titre qu'une proposition de lot porterait.
 *
 * **Il dit combien et de quand**, parce que c'est ce qu'on lit dans la liste des
 * propositions six semaines plus tard : « Lecture de 12 documents » sans
 * période ne se distingue pas de la précédente.
 *
 * Il ne nomme pas les documents : douze titres de quatre-vingts caractères ne
 * tiennent dans aucune liste, et c'est la proposition elle-même qui les porte
 * ligne par ligne.
 */
export function leTitreDuLot(lot = []) {
  const siens = liste(lot);
  if (siens.length === 0) return "";

  const jours = siens.map((un) => leJourDeLaSource(un?.quand)).filter(Boolean).sort();
  const quoi = lePluriel(siens.length, "document lu", "documents lus");

  if (jours.length === 0) return `Lecture de ${quoi}`;
  if (jours[0] === jours[jours.length - 1]) return `Lecture de ${quoi} du ${jours[0]}`;
  return `Lecture de ${quoi} du ${jours[0]} au ${jours[jours.length - 1]}`;
}

/**
 * Ce que le bouton dit, et s'il s'ouvre.
 *
 * **Le compte est dans le libellé.** « Transformer en proposition » ne dit pas
 * combien de documents partiraient, et c'est précisément ce qu'on veut savoir
 * avant de cliquer sur un geste qui en emporte douze.
 */
export function ceQueLeBoutonDuLotDit(porterait = null) {
  const combien = Number(porterait?.combien) || 0;

  if (!porterait?.peut) {
    return {
      ouvert: false,
      libelle: "Transformer en proposition",
      titre: CE_QUE_LE_REFUS_DIT[texte(porterait?.pourquoiPas)] ?? ""
    };
  }

  return {
    ouvert: true,
    libelle: `Transformer ${combien === 1 ? "ce document" : `ces ${combien} documents`}`,
    titre: "Une seule proposition pour tout ce qui a été lu depuis la dernière. "
      + "Elle reste ouverte : rien n'entre dans la mémoire avant la signature."
  };
}

/**
 * Les familles du lot, nommées comme l'écran les nomme.
 *
 * **Les libellés viennent du registre des familles** : une famille ajoutée
 * là-bas arrive ici avec son nom, et non avec sa clé technique (règle 10).
 */
export function lesFamillesDuLot(porterait = null) {
  const compte = porterait?.parFamille ?? {};
  return Object.entries(compte)
    .map(([famille, combien]) => ({
      famille,
      combien,
      nom: texte(ceQueDitLaFamille(famille)?.nom) || famille
    }))
    .sort((gauche, droite) => droite.combien - gauche.combien);
}
