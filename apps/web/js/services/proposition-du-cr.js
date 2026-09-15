/**
 * Ce qu'un compte rendu de chantier **propose**, une fois lu.
 *
 * ## Pourquoi ce module existe
 *
 * L'écran de lecture savait tout : quels points ouvrent un sujet, lesquels en
 * relancent un, lesquels en rouvrent un fermé, quels lots manquent, quels
 * labels seraient à créer. **Rien n'en sortait.** Le bouton « Transformer »
 * répondait par une phrase disant que ce n'était pas branché, et le procédé
 * s'arrêtait là — on relisait un document sans jamais pouvoir en tirer quoi que
 * ce soit.
 *
 * Ce fichier fait la jonction : il traduit ce que la lecture a compris en
 * **affirmations d'une proposition**, la forme que le reste de l'application
 * sait déjà signer, refuser ligne à ligne, et appliquer à la fusion.
 *
 * ## Rien n'entre directement, et c'est tout l'objet
 *
 * Un sujet ouvert engage quelqu'un à le traiter. Le déposer au versement
 * reviendrait à décider à la place de l'équipe — c'est exactement ce que
 * l'ancienne chaîne faisait, et ce pour quoi elle a été retirée
 * (`docs/fondamentaux.md`, règle 1). Ici, on **propose** ; quelqu'un signe.
 *
 * ## Tout ce que la lecture a compris, et rien de plus
 *
 * Le document qui entre au corpus ; les lots du chantier ; les labels ; les
 * objectifs datés ; les points qui ouvrent un sujet ; et **les points qui en
 * relancent un**. (Les entreprises nommées y sont aussi, mais posées par
 * l'analyse du dépôt, qui seule connaît les collaborateurs déjà au projet.)
 *
 * Cette dernière nature a manqué, et son absence vidait le reste de son sens :
 * un compte rendu **reporte** — la douzième réunion reprend les points de la
 * onzième. Ne porter que les points neufs faisait entrer trois lignes sur
 * quarante, et le travail de secrétariat ne se faisait pas.
 *
 * Une relance n'ouvre rien : elle écrit dans le fil du sujet ce que le compte
 * rendu en redit, daté et cité, et remet à jour ce qu'il porte — son label, son
 * échéance, à qui il revient. Les confondre avec une ouverture ferait un second
 * sujet au même titre, et toute l'histoire d'avant resterait dans le premier.
 *
 * ## L'ordre d'application ne se décide pas ici
 *
 * Les lots d'abord, puis les entreprises, puis les labels et les objectifs,
 * puis les sujets : un sujet ne s'assigne qu'à quelqu'un qui existe, et
 * quelqu'un n'existe qu'avec un lot. Mais cet ordre-là est celui de la fusion,
 * et il est écrit dans `appliquer-le-cr.js`. Le déduire de l'ordre de cette
 * liste ferait dépendre une contrainte de base d'un choix de présentation
 * (règle 4).
 *
 * ## Ce que ce module ne fait pas
 *
 * Il n'écrit rien, ne lit ni la base ni le store : des points entrent, des
 * affirmations sortent.
 */

import { dateDeLEcheance } from "./echeances-du-cr.js";
import { FERMETURE, fermeturesDuCompteRendu } from "./fermeture-du-cr.js";
import { SORT } from "./lecture-du-cr.js";
import { titreAplati } from "./sujets-du-cr.js";
import { documentItems, ITEM_TYPE, sujetItems } from "./proposition-review.js";
import { ITEM } from "./proposition-state.js";
import { numeroDuLot } from "./lots-du-cr.js";
import { labelDeLaRubrique } from "./label-du-cr.js";
import { rubriquesDuCompteRendu } from "./rubriques-du-cr.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qui empêche de faire une proposition de ce compte rendu. */
export const REFUS = {
  /** La confrontation n'a pas eu lieu : on ne sait pas ce que le projet suit. */
  SANS_CONFRONTATION: "sans_confrontation",
  /** Elle a eu lieu, et il n'y a **rien à en tirer** — ni sujet, ni relance. */
  RIEN_A_OUVRIR: "rien_a_ouvrir",
  /** Le document n'a pas pu être rangé : sans lui, rien ne se vérifie. */
  SANS_DOCUMENT: "sans_document"
};

export const PHRASES_DU_REFUS = {
  [REFUS.SANS_CONFRONTATION]:
    "Les sujets du projet n'ont pas pu être lus : on ne sait pas lesquels de ces points sont "
    + "déjà suivis, et en proposer vingt qui le sont serait pire que de n'en proposer aucun.",
  [REFUS.RIEN_A_OUVRIR]:
    "Ce compte rendu ne relève aucun point : il n'y a ni sujet à ouvrir, ni sujet à relancer.",
  [REFUS.SANS_DOCUMENT]:
    "Le compte rendu n'a pas pu être rangé dans Fichiers. Une proposition qui porterait des "
    + "points sans le document d'où ils sortent ne se vérifierait pas."
};

export function phraseDuRefus(motif) {
  return PHRASES_DU_REFUS[texte(motif)] ?? "";
}

/**
 * Ce qui empêche de proposer, ou `""`.
 *
 * **`null` n'est pas « aucun sujet ».** Une confrontation qui n'a pas pu avoir
 * lieu rend `null` ; la prendre pour une liste vide ferait de chaque point un
 * point neuf, et un compte rendu déjà traité proposerait vingt sujets de plus
 * (règle 5).
 */
export function refusDeLaProposition({ confrontes = null, documentId = "" } = {}) {
  if (confrontes === null || confrontes === undefined) return REFUS.SANS_CONFRONTATION;
  if (!texte(documentId)) return REFUS.SANS_DOCUMENT;

  // **« Rien à ouvrir » n'est pas « rien à faire ».** Ce refus barrait la
  // route au cas le plus courant : la douzième réunion, qui n'ouvre aucun sujet
  // et en reporte quarante. Il n'y avait alors rien à proposer — donc aucune
  // relance écrite, aucune échéance remise à jour, et un chantier dont le suivi
  // s'arrêtait dès qu'il cessait d'être neuf. C'est exactement l'inverse de ce
  // qu'on cherche : un point redit depuis huit réunions est ce qu'il y a de
  // plus important à voir.
  if (pointsAOuvrir(confrontes).length + pointsARelancer(confrontes).length === 0) {
    return REFUS.RIEN_A_OUVRIR;
  }
  return "";
}

/**
 * La clé d'un point, celle qui le suit d'une réunion à l'autre.
 *
 * **Son numéro d'abord.** « 12.02.1 » désigne le même point d'un compte rendu
 * au suivant — c'est ce que la numérotation du métier veut dire, et la seule
 * chose qui survive à une reformulation. À défaut, le titre réduit : c'est
 * imparfait, et c'est mieux que le rang dans la page, qui change dès qu'un
 * point est soldé au-dessus.
 */
export function cleDuPoint(point = {}) {
  return texte(point?.reference) || titreAplati(point?.titre) || "";
}

/**
 * La date que l'échéance d'un point désigne, résolue **une seule fois**.
 *
 * ## Pourquoi elle voyage avec le point
 *
 * Un compte rendu écrit « sous quinzaine », « avant le 15/10 », « semaine 42 ».
 * Résoudre cela demande la date de la réunion, et c'est `echeances-du-cr.js`
 * qui sait le faire. La fusion, elle, doit savoir sur quel jalon accrocher le
 * sujet — et elle n'a plus la date de la réunion sous la main : la proposition
 * a pu être relue trois jours plus tard, depuis un autre écran.
 *
 * Refaire le calcul là-bas demanderait de reporter la date de la réunion
 * jusqu'à la fusion, et ferait exister deux résolutions de la même échéance,
 * qui finiraient par diverger (règle 4). On la résout donc ici, au moment où
 * l'on sait, et on la porte.
 *
 * Une échéance qu'on n'a pas su lire rend `null` — et non la date du jour.
 */
function dateDuPoint(point = {}, leJour = "") {
  const echeance = texte(point?.echeance);
  if (!echeance) return null;
  return dateDeLEcheance(echeance, { leJour: texte(leJour) })?.date ?? null;
}

/**
 * Les points qui ouvrent un sujet, dans la forme qu'une proposition porte.
 *
 * **Seulement ceux-là.** Un point qui relance ou rouvre un sujet existant ne
 * doit pas en ouvrir un second au même titre : toute l'histoire d'avant
 * resterait dans le premier, invisible à qui lit le nouveau.
 *
 * Un point sans clé est écarté : sans elle, il se reproposerait à chaque
 * réunion, et l'on redemanderait douze fois d'accepter la même chose.
 */
export function pointsAOuvrir(confrontes = [], { leJour = "" } = {}) {
  const vus = new Set();

  return (Array.isArray(confrontes) ? confrontes : [])
    .filter((point) => point?.sort === SORT.NOUVEAU)
    .map((point) => ({
      key: cleDuPoint(point),
      titre: texte(point?.titre),
      description: texte(point?.description),
      lot: texte(point?.lot) || null,
      reference: texte(point?.reference) || null,
      qui: texte(point?.qui) || null,
      echeance: texte(point?.echeance) || null,
      etat: texte(point?.etat) || null,
      // **Les labels voyagent avec le point, et pas seulement leur compte.**
      // Le compte rendu écrit « urgent » sur trois points et rien sur les
      // trente-sept autres. Savoir qu'« Urgent » est posé trois fois ne dit pas
      // *où* : sans cette liste, la fusion ne saurait que poser le label sur
      // tout ou sur rien, et « urgent » partout ne veut plus rien dire.
      labels: Array.isArray(point?.labels) ? point.labels.map(texte).filter(Boolean) : [],
      echeanceDate: dateDuPoint(point, leJour),
      // **La provenance voyage avec le point.** Un sujet ouvert par une lecture
      // automatique doit pouvoir se contester : sans sa page et sa citation, il
      // ne se remonte plus au document qui l'a produit.
      provenance: {
        page: Number.isFinite(Number(point?.page)) ? Number(point.page) : null,
        excerpt: texte(point?.citation) || null
      }
    }))
    .filter((point) => {
      if (!point.key || !point.titre) return false;
      // Un compte rendu peut porter deux fois le même numéro ; la proposition,
      // non — sa contrainte d'unicité l'écraserait en silence.
      if (vus.has(point.key)) return false;
      vus.add(point.key);
      return true;
    });
}

/**
 * Les affirmations que la proposition portera — **toutes**.
 *
 * ## Ce qui manquait, et ce que ça coûtait
 *
 * Cette fonction ne rendait que deux natures : le document, et les sujets à
 * ouvrir. Tout le reste de ce que la lecture avait compris — les lots nommés,
 * les entreprises présentes, les labels, les jalons datés, et surtout les
 * quarante points que le compte rendu **reporte** — restait à l'écran de
 * lecture et n'allait nulle part.
 *
 * Une proposition de trois lignes sortait d'un compte rendu de quarante points,
 * et les trente-sept autres n'avaient pas de trace : ni relance dans leur fil,
 * ni label reposé, ni échéance remise à jour. Le travail de secrétariat — celui
 * qui fait qu'on sait, deux mois plus tard, qu'un point est redit depuis huit
 * réunions — ne se faisait pas.
 *
 * ## L'ordre de la liste est celui de la relecture
 *
 * Le document d'abord : c'est lui qui permet de vérifier tout le reste, et
 * l'accepter est la première question qu'on se pose. Puis ce qui donne au
 * projet son vocabulaire — les lots, les sociétés, les labels, les jalons —,
 * puis ce qui s'y range : les sujets ouverts, et les sujets relancés.
 *
 * **L'ordre d'application, lui, ne se lit pas ici** : il est arrêté par
 * `appliquer-le-cr.js`, parce qu'il obéit à des dépendances (un sujet ne
 * s'assigne qu'à quelqu'un qui existe, et quelqu'un n'existe qu'avec un lot)
 * que l'ordre d'une liste ne saurait pas garantir. Les faire coïncider par
 * convention serait un accord tacite entre deux fichiers, qui tiendrait jusqu'à
 * ce que quelqu'un réordonne l'écran (règle 4).
 *
 * ## Les entreprises ne passent pas par ici
 *
 * Elles sont bien dans la proposition — mais posées par l'analyse, qui relit le
 * compte rendu déposé et confronte ce qu'il nomme aux collaborateurs du projet
 * (`proposition-analysis.js`). Les composer une seconde fois ici ferait deux
 * sources pour la même liste, qui finiraient par ne plus dire la même chose
 * (règle 4) — et la première a ce que celle-ci n'a pas : les collaborateurs
 * déjà au projet, sans lesquels on reproposerait chaque réunion les mêmes
 * douze sociétés.
 *
 * ## Ce qu'on ne sait pas ne se propose pas
 *
 * Lots, labels et objectifs sont rendus par des analyses qui distinguent « le
 * projet n'en a aucun » de « on n'a pas pu les lire ». Le second cas ne propose
 * rien : proposer d'ajouter des lots qui sont peut-être déjà là ferait doubler
 * la liste du projet, et personne ne la nettoiera (règle 5).
 *
 * @param {object} options
 * @param {object[]|null} [options.confrontes] la lecture confrontée aux sujets
 * @param {object|null} [options.document] le compte rendu rangé dans Fichiers
 * @param {object|null} [options.lots] ce que `lotsAProposer` a rendu
 * @param {object|null} [options.disparition] ce que `sujetsDisparus` a rendu
 * @param {string} [options.luPar] le vocabulaire de lecture — le modèle qui a
 *   lu ce compte rendu, et la version du procédé. Sans lui, le contrôle « le
 *   référentiel de lecture est connu » se déclare **non vérifiable**, ce qui
 *   est faux : on le sait, on ne le portait simplement pas.
 * @param {object|null} [options.labels] ce que `labelsAProposer` a rendu
 * @param {object|null} [options.objectifs] ce que `objectifsAProposer` a rendu
 * @param {object[]} [options.rubriques] les rubriques du compte rendu, telles
 *   que la lecture les a rendues
 */
export function itemsDuCompteRendu({
  confrontes = [],
  document: doc = null,
  lots = null,
  labels = null,
  objectifs = null,
  disparition = null,
  rubriques = [],
  luPar = ""
} = {}) {
  return [
    ...(doc?.id ? documentItems([doc], { luPar: texte(luPar) }) : []),
    // **Les rubriques en tête.** C'est l'ordre dans lequel on décide : les
    // points qu'elles contiennent en dépendent, et refuser une rubrique après
    // avoir accepté ses points laisserait ceux-ci sans le père qu'on leur avait
    // annoncé.
    ...rubriqueItems(rubriques),
    ...lotItems(lots),
    ...labelItems(labels),
    ...objectifItems(objectifs),
    ...sujetItems(pointsAOuvrir(confrontes, { leJour: objectifs?.leJour })),
    ...relanceItems(pointsARelancer(confrontes, { leJour: objectifs?.leJour })),
    // Les fermetures en dernier : un sujet se ferme après avoir reçu ce que ce
    // compte rendu en dit, sans quoi la dernière chose écrite dans son fil
    // serait antérieure à sa fermeture.
    ...fermetureItems({ confrontes, disparition })
  ];
}

/**
 * Les points qui relancent un sujet déjà ouvert.
 *
 * ## Pourquoi ils comptent autant que les autres
 *
 * Un compte rendu **reporte** : un point reste écrit tant qu'il n'est pas
 * soldé. Ne porter que les points neufs faisait entrer trois lignes sur
 * quarante, et laissait quarante sujets sans trace de la réunion qui venait de
 * les redire. Le secrétariat ne se faisait pas.
 *
 * ## Ce qu'une relance fait, et ce qu'elle ne fait pas
 *
 * Elle **écrit dans le fil** du sujet ce que le compte rendu en redit, avec sa
 * page et sa citation, et remet à jour ce qu'il porte. Elle n'ouvre rien et ne
 * ferme rien : le sujet était là, il y reste.
 *
 * Les trois sorts qui désignent un sujet existant y passent — relancé, changé,
 * rouvert —, et le payload garde lequel : rouvrir n'est pas relancer, et la
 * fusion doit pouvoir faire la différence.
 */
export function pointsARelancer(confrontes = [], { leJour = "" } = {}) {
  const vus = new Set();

  return (Array.isArray(confrontes) ? confrontes : [])
    .filter((point) => [SORT.RELANCE, SORT.CHANGE, SORT.REOUVRE].includes(point?.sort))
    .map((point) => ({
      sujetId: texte(point?.sujet?.id),
      sort: texte(point?.sort),
      titre: texte(point?.titre),
      description: texte(point?.description),
      lot: texte(point?.lot) || null,
      reference: texte(point?.reference) || null,
      qui: texte(point?.qui) || null,
      echeance: texte(point?.echeance) || null,
      etat: texte(point?.etat) || null,
      labels: Array.isArray(point?.labels) ? point.labels.map(texte).filter(Boolean) : [],
      echeanceDate: dateDuPoint(point, leJour),
      page: Number.isFinite(Number(point?.page)) ? Number(point.page) : null,
      evidence: texte(point?.citation) || null
    }))
    .filter((point) => {
      // Sans identifiant de sujet, on ne saurait pas dans quel fil écrire.
      if (!point.sujetId) return false;
      // Deux points du même compte rendu sur un même sujet : une seule relance.
      // Deux messages diraient deux fois la même réunion.
      if (vus.has(point.sujetId)) return false;
      vus.add(point.sujetId);
      return true;
    });
}

/** Une affirmation de proposition, dans la forme que la revue attend. */
function affirmation(type, cle, payload) {
  return { itemType: type, itemKey: String(cle), payload, status: ITEM.PROPOSED, reason: null };
}

/**
 * Les sujets que ce compte rendu relance.
 *
 * La clé est **l'identifiant du sujet** : il ne bouge pas, et deux comptes
 * rendus qui relancent le même sujet ne se marchent pas dessus — chacun dans sa
 * proposition.
 */
export function relanceItems(points = []) {
  return (Array.isArray(points) ? points : [])
    .map((point) => affirmation(ITEM_TYPE.RELANCE, point.sujetId, point));
}

/**
 * Les labels que ce compte rendu pose.
 *
 * **Ceux qui existent déjà passent aussi.** La ligne ne dit pas « créer un
 * label » mais « poser celui-ci sur ces points » : un label déjà au projet est
 * toujours à poser sur les sujets que la proposition ouvre. Ne porter que les
 * manquants laisserait les points du deuxième compte rendu sans label, parce
 * que le premier l'avait créé.
 *
 * La clé est le nom du label, mis à plat : c'est ce que la base compare, et
 * celui qui a créé « cr chantier » à la main ne doit pas s'en voir proposer un
 * second.
 */
export function labelItems(labels = []) {
  return (Array.isArray(labels?.poses) ? labels.poses : [])
    .filter((label) => texte(label?.nom))
    .map((label) => affirmation(ITEM_TYPE.LABEL, titreAplati(label.nom), {
      nom: texte(label.nom),
      points: Number(label?.points) || 0,
      // Ce que la lecture savait au moment où elle a regardé. Il se revérifie à
      // la fusion : le projet a pu changer entre les deux.
      existe: label?.existe === true
    }));
}

/**
 * Les rubriques sous lesquelles ce compte rendu range ses points.
 *
 * **Toutes, y compris celles qui ne portent rien.** Un lot dont le document ne
 * dit rien à cette réunion — son contenu se réduit à « / » — existe quand même,
 * et c'est ce qui lui permet d'être ouvert puis fermé, et de rouvrir à la
 * réunion où il reçoit un point. Ne proposer que les rubriques peuplées ferait
 * apparaître les lots au compte-gouttes, chacun à la réunion où il a parlé.
 *
 * **La clé est l'identité de la rubrique**, pas son intitulé : le numéro du lot
 * quand il y en a un, l'intitulé aplati sinon. C'est elle qui fait qu'un lot
 * retrouvé au compte rendu suivant est le même, quand bien même le nom de son
 * entreprise aurait changé d'orthographe.
 *
 * Ce module ne crée rien : la ligne se coche, et le père s'ouvre à la fusion.
 */
export function rubriqueItems(rubriques = []) {
  return rubriquesDuCompteRendu(rubriques).map((rubrique) => affirmation(
    ITEM_TYPE.RUBRIQUE,
    rubrique.identite,
    {
      // L'intitulé tel que le document l'écrit : c'est le titre que portera le
      // sujet père, et celui sous lequel on ira le chercher.
      intitule: rubrique.nom,
      genre: rubrique.genre,
      numero: rubrique.numero || null,
      societe: rubrique.societe || null,
      // Le label que le père portera. Décidé dans `label-du-cr.js`, lu ici :
      // un label posé à la fusion mais cherché autrement par la vue rendrait
      // une vue vide sans rien dire (règle 10).
      label: labelDeLaRubrique(rubrique.genre),
      // La provenance voyage avec la proposition : une rubrique se vérifie en
      // ouvrant la page, et un père qu'on ne peut pas remonter au document ne
      // se conteste plus.
      sourceId: rubrique.provenance?.source_id ?? null,
      page: rubrique.provenance?.page ?? null,
      evidence: rubrique.provenance?.excerpt ?? null
    }
  ));
}

/**
 * Les lots du chantier que ce compte rendu nomme et que le projet n'a pas.
 *
 * **Seulement les manquants.** Un lot déjà ouvert n'est pas à ouvrir, et le
 * proposer ferait une ligne qui ne changerait rien — ce qui fait douter de
 * toutes les autres.
 *
 * La clé est le numéro du lot quand il y en a un : « 03 » désigne le même lot
 * qu'on l'écrive « Lot 03 — Cloisons » ou « 03 - CLOISONS ».
 */
export function lotItems(lots = []) {
  if (!lots?.connu) return [];

  return (Array.isArray(lots?.manquants) ? lots.manquants : [])
    .filter((lot) => texte(lot?.intitule))
    .map((lot) => affirmation(
      ITEM_TYPE.LOT,
      texte(lot?.numero) || numeroDuLot(lot.intitule) || titreAplati(lot.intitule),
      {
        intitule: texte(lot.intitule),
        numero: texte(lot?.numero) || null,
        nom: texte(lot?.nom) || null,
        points: Number(lot?.points) || 0
      }
    ));
}

/**
 * Les objectifs datés que ce compte rendu appelle et que le projet n'a pas.
 *
 * **La date décide, pas le nom.** Un objectif nommé autrement mais daté du même
 * jour est le même jalon : en créer un second le doublerait. C'est donc la date
 * qui sert de clé.
 */
export function objectifItems(objectifs = []) {
  if (!objectifs?.connu) return [];

  return (Array.isArray(objectifs?.objectifs) ? objectifs.objectifs : [])
    .filter((objectif) => texte(objectif?.date) && objectif?.existe !== true)
    .map((objectif) => affirmation(ITEM_TYPE.OBJECTIF, texte(objectif.date), {
      date: texte(objectif.date),
      nom: texte(objectif?.nom),
      // `objectifsAProposer` rend les points eux-mêmes, pas leur nombre : c'est
      // le nombre qu'on porte, la ligne n'ayant que lui à montrer.
      points: Array.isArray(objectif?.points) ? objectif.points.length : Number(objectif?.points) || 0
    }));
}

/**
 * Les sujets que ce compte rendu ferme.
 *
 * ## Ce que l'écran promettait et que la proposition ne faisait pas
 *
 * L'analyse annonçait « la proposition fermerait ces sujets », et la
 * proposition ne les portait pas. Un compte rendu de chantier solde des points
 * à chaque réunion ; les laisser ouverts fait grossir la liste sans fin, et
 * l'on finit par ne plus la lire du tout.
 *
 * ## Deux façons de fermer, et elles ne se cochent pas ensemble
 *
 * **Dite** : le document l'écrit — « fait le 12/09 », « soldé ». Il y a une
 * phrase à citer, et la fermeture se justifie.
 *
 * **Déduite** : le sujet n'apparaît plus dans ce compte rendu. Ce n'est pas
 * « le document le dit », c'est « le document n'en parle plus » — et la
 * différence est tout. Fermer trente-cinq sujets sur une absence est le geste
 * le plus lourd de ce procédé, et le seul qu'aucune phrase ne justifie. Chacun
 * est donc une ligne à part, qu'on coche ou qu'on refuse, et le payload garde
 * **laquelle des deux** : la fusion écrit la justification dans le fil du
 * sujet, et elle n'a pas le droit de dire « le compte rendu le dit » quand il
 * n'en a rien dit (règle 5).
 *
 * Un sujet fermé par déduction se rouvrira de lui-même s'il revient au prochain
 * compte rendu — sur le même sujet, avec toute son histoire. C'est cette
 * réversibilité qui rend la déduction acceptable.
 *
 * @param {object} options
 * @param {object[]} [options.confrontes] la lecture confrontée, pour les
 *   fermetures que le document écrit
 * @param {object} [options.disparition] ce que `sujetsDisparus` a rendu — on
 *   n'en prend rien quand `connu` est faux : ne pas savoir d'où viennent les
 *   sujets n'autorise pas à les déclarer disparus
 */
export function fermetureItems({ confrontes = [], disparition = null } = {}) {
  const { fermes } = fermeturesDuCompteRendu(Array.isArray(confrontes) ? confrontes : []);
  const vus = new Set();

  const dites = fermes
    .map((point) => ({ point, sujetId: texte(point?.sujet?.id) }))
    // Sans sujet du projet, il n'y a rien à fermer : le point ouvrira un sujet,
    // et un sujet qu'on ouvre fermé n'a jamais existé.
    .filter(({ sujetId }) => sujetId && !vus.has(sujetId) && vus.add(sujetId))
    .map(({ point, sujetId }) => affirmation(ITEM_TYPE.FERMETURE, sujetId, {
      sujetId,
      titre: texte(point?.titre),
      motif: FERMETURE.DITE,
      // La phrase du document, mot pour mot. C'est elle qui justifie la
      // fermeture, et c'est elle qu'on écrira dans le fil du sujet.
      signe: texte(point?.signe),
      reference: texte(point?.reference) || null,
      page: Number.isFinite(Number(point?.page)) ? Number(point.page) : null,
      evidence: texte(point?.citation) || null
    }));

  const deduites = (disparition?.connu ? disparition.disparus ?? [] : [])
    .map((sujet) => texte(sujet?.id))
    .filter((sujetId) => sujetId && !vus.has(sujetId) && vus.add(sujetId))
    .map((sujetId) => {
      const sujet = (disparition.disparus ?? []).find((entree) => texte(entree?.id) === sujetId);
      return affirmation(ITEM_TYPE.FERMETURE, sujetId, {
        sujetId,
        titre: texte(sujet?.title ?? sujet?.titre),
        motif: FERMETURE.DEDUITE,
        signe: "",
        reference: null,
        page: null,
        evidence: null
      });
    });

  return [...dites, ...deduites];
}

/**
 * Le titre de la proposition.
 *
 * **Le numéro de réunion et sa date**, parce que c'est ainsi qu'on désigne un
 * compte rendu sur un chantier — pas par le nom de son fichier, qui change d'un
 * expéditeur à l'autre. À défaut, le nom du fichier : il vaut mieux qu'un titre
 * générique sous lequel douze propositions se ressembleraient.
 */
export function titreDeLaProposition({ nom = "", identite = null } = {}) {
  const numero = texte(identite?.numero);
  const quand = texte(identite?.tenueLe);

  if (numero) return `CR n° ${numero}${quand ? ` du ${quand}` : ""}`;

  const fichier = texte(nom).replace(/\.pdf$/i, "");
  return fichier ? `Compte rendu — ${fichier}` : "Compte rendu de chantier";
}

/**
 * Ce que la proposition dit d'elle-même en tête.
 *
 * **Au conditionnel, et en comptant ce qu'elle porte vraiment.** Rien n'est
 * écrit tant que personne n'a signé, et un présent ferait croire que c'est
 * fait. Ce qu'elle ne porte pas se dit aussi : un point déjà suivi qu'on ne
 * retrouve pas dans la liste ferait chercher une perte.
 */
export function introDuCompteRendu({ confrontes = [], nom = "" } = {}) {
  const aOuvrir = pointsAOuvrir(confrontes).length;
  const aRelancer = pointsARelancer(confrontes).length;
  const tous = Array.isArray(confrontes) ? confrontes.length : 0;

  const lignes = [
    `Lecture de ${texte(nom) || "un compte rendu de chantier"}.`,
    `Cette proposition ouvrirait ${aOuvrir} sujet${aOuvrir > 1 ? "s" : ""}`
      + (tous === 1 ? " sur le seul point relevé." : ` sur les ${tous} points relevés.`)
  ];

  // **Ce qui est reporté se dit, et se dit pour ce que c'est.** La phrase
  // d'avant — « ils sont déjà suivis » — était juste et ne servait à rien :
  // elle expliquait pourquoi la proposition était courte, sans dire ce qu'elle
  // ferait de ces points-là. Elle ne faisait rien : ils n'y entraient pas.
  if (aRelancer === 1) {
    lignes.push(
      "Un autre point est déjà suivi par un sujet du projet : ce compte rendu le reporte, "
      + "et la proposition l'écrirait dans son fil — sans le rouvrir."
    );
  } else if (aRelancer > 1) {
    lignes.push(
      `${aRelancer} autres points sont déjà suivis par des sujets du projet : ce compte rendu `
      + "les reporte, et la proposition l'écrirait dans chacun de leurs fils — sans les rouvrir."
    );
  }

  // Un point déjà suivi dont on ne sait pas dans quel fil écrire — son sujet
  // n'a pas d'identifiant — n'est ni ouvert ni relancé. Le taire ferait
  // chercher une perte (règle 5).
  const laisses = Math.max(0, tous - aOuvrir - aRelancer);
  if (laisses > 0) {
    lignes.push(
      `${laisses} point${laisses > 1 ? "s ne sont" : " n'est"} ni ouvert${laisses > 1 ? "s" : ""}`
      + ` ni relancé${laisses > 1 ? "s" : ""} : ${laisses > 1 ? "ils n'ont" : "il n'a"} pas de quoi `
      + "être identifié d'une réunion à l'autre."
    );
  }

  return lignes.join(" ");
}
