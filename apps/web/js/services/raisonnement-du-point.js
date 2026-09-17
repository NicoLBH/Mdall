/**
 * Le petit graphe du raisonnement humain, et ce qu'il faut en écrire.
 *
 * Étape 4 de `docs/lobjet-de-la-connaissance.md`.
 *
 * ## La case était déclarée, et vide
 *
 * `NATURE.RAISONNEMENT` existe depuis longtemps dans la taxonomie, avec sa
 * définition : *« rien ne le tranche : il ne dit pas ce qui est vrai, il dit
 * par où l'on y est arrivé — et par quelles décisions on est passé. »* Personne
 * ne l'écrivait. Une nature déclarée et vide vaut mieux qu'une absence
 * silencieuse (règle 5), mais elle ne vaut ça qu'un temps.
 *
 * Ce fichier la remplit, et il la remplit avec ce qu'un point sait :
 *
 * ```
 * POINT        « Quelle profondeur de fondation retenir ? »
 * PORTE SUR    altitude = 742,30 · nature du sol = moraine · bâtiment chauffé
 * EXAMINE      étude géotechnique · plan de niveau · échange architecte / BC
 * DÉCISION     hors gel = 0,80 m
 * PRODUIT      affirmation : hors gel = 0,80 m
 * ```
 *
 * À ce moment-là un point n'est plus une boîte de commentaires : il produit
 * quelque chose que le moteur sait consommer.
 *
 * ## Les cinq étapes sont **lues**, aucune n'est déduite
 *
 * | l'étape | d'où elle vient |
 * | --- | --- |
 * | POINT | le titre du point, ou la question posée en le fermant |
 * | PORTE SUR | l'arête amont — `surQuoiCePointPorte`, étape 2 |
 * | EXAMINE | ce que le point cite : documents, échanges |
 * | DÉCISION | la ligne de décision que ce point a produite |
 * | PRODUIT | l'arête aval — `affirmationsDecideesDans`, étape 3 |
 *
 * Rien ici ne devine. Le graphe des dépendances donne les chaînes
 * déterministes ; il ne saura jamais qu'entre deux d'entre elles quelqu'un a
 * choisi. C'est précisément ce que ce raisonnement porte, et il ne le porte que
 * parce qu'un humain l'a écrit.
 *
 * ## Une étape vide se dit, elle ne se cache pas
 *
 * Un point dont personne n'a noté ce qu'il avait examiné n'est pas un point qui
 * n'a rien examiné. Les cinq étapes sont donc toujours rendues, et celles qui
 * manquent portent leur manque en toutes lettres (règle 5).
 *
 * ## Il n'affirme rien, et c'est ce qui fixe sa valeur
 *
 * Un raisonnement ne dit pas ce qui est vrai : rien ne le tranche, et c'est sa
 * définition. Sa valeur ne peut donc pas être le résultat — ce résultat vit sur
 * la ligne qu'il a produite, et le recopier ici en ferait deux vérités qui
 * finiraient par diverger (règle 4). **Sa valeur est la question**, comme celle
 * d'une décision qui ne retient rien.
 *
 * ## Il ne s'écrit pas
 *
 * Comme tout le reste : il sort par une proposition qu'un humain signe
 * (règle 1). Ce fichier prépare une ligne, il n'ouvre aucune porte.
 */

import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT } from "./memoire-en-texte.js";
import { MOT_A_LECRAN } from "./point-porte-sur.js";
import { phraseDuDebat, referenceDuPoint } from "./point-a-tranche.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les cinq étapes du graphe. Le code dit « point » ; l'écran écrira l'autre mot. */
export const ETAPE = {
  POINT: "point",
  PORTE_SUR: "porte-sur",
  EXAMINE: "examine",
  DECISION: "decision",
  PRODUIT: "produit"
};

/** Dans l'ordre où on les lit — c'est celui du graphe, et il n'y en a qu'un. */
export const ETAPES = [ETAPE.POINT, ETAPE.PORTE_SUR, ETAPE.EXAMINE, ETAPE.DECISION, ETAPE.PRODUIT];

/** La majuscule d'un mot, sans toucher au reste. */
const capitale = (mot) => (mot ? `${mot[0].toUpperCase()}${mot.slice(1)}` : "");

/**
 * Ce que chaque étape s'appelle à l'écran.
 *
 * La première porte le mot de l'écran, pris là où il est écrit une fois — le
 * code appelle cet objet un point, l'écran écrit « sujet », et ce fichier n'a
 * pas à le savoir deux fois (règle 10).
 */
const ETAPES_DITES = {
  [ETAPE.POINT]: capitale(MOT_A_LECRAN.un),
  [ETAPE.PORTE_SUR]: "Porte sur",
  [ETAPE.EXAMINE]: "Examine",
  [ETAPE.DECISION]: "Décision",
  [ETAPE.PRODUIT]: "Produit"
};

/** Ce qu'on dit d'une étape que personne n'a remplie. Nommer le manque, jamais le combler. */
const MANQUES_DITS = {
  [ETAPE.POINT]: "la question n'a pas été écrite",
  [ETAPE.PORTE_SUR]: "on ne sait pas sur quelles valeurs il portait",
  [ETAPE.EXAMINE]: "on ne sait pas ce qui a été examiné",
  [ETAPE.DECISION]: "rien n'a été tranché",
  [ETAPE.PRODUIT]: "ce débat n'a rien posé dans la mémoire"
};

/**
 * Un nom et sa valeur, quelle que soit la forme d'où ils viennent.
 *
 * Deux formes arrivent ici et il faut les deux : une **affirmation en mémoire**
 * — `payload.subject` — et une **ligne prête à proposer** — `sujet` —, parce
 * qu'un raisonnement se construit aussi bien en relisant un projet qu'au
 * moment où l'on ferme le point, quand rien n'est encore versé. Deux fonctions
 * pour ces deux formes se seraient répondu de travers à la première correction.
 */
function nomEtValeur(entree) {
  if (!entree || typeof entree !== "object") return null;

  const charge = entree.payload ?? null;
  const sujet = texte(charge?.subject) || texte(entree.sujet) || texte(entree.subject_key);
  if (!sujet) return null;

  return { sujet, valeur: texte(charge?.value) || texte(entree.valeur) || texte(entree.statement) };
}

/** La nature d'une entrée, dans l'une ou l'autre forme. */
function natureDe(entree) {
  return texte(entree?.payload?.nature) || texte(entree?.nature);
}

const nomsEtValeurs = (entrees) =>
  (Array.isArray(entrees) ? entrees : []).map(nomEtValeur).filter(Boolean);

/** Ce qui a été regardé, et où le retrouver. `ou` manque souvent, et ce n'est pas grave. */
function examineRetenu(entree) {
  const quoi = texte(entree?.quoi) || texte(entree?.title) || texte(entree);
  if (!quoi) return null;
  return { quoi, ou: texte(entree?.ou) };
}

/**
 * La charge d'un raisonnement, ou `null` si ce n'en est pas un.
 *
 * Le pendant exact de `decisionRetenue` : ce qu'on n'a pas déclaré ne voyage
 * pas. **Sans question, rien** — un raisonnement sans question est une liste de
 * choses regardées, et la traiter comme un raisonnement ferait entrer des
 * lignes qui n'ont rien à y faire.
 */
export function raisonnementRetenu(raisonnement) {
  if (!raisonnement || typeof raisonnement !== "object") return null;

  const question = texte(raisonnement.question);
  if (!question) return null;

  return {
    point: texte(raisonnement.point),
    question,
    porteSur: nomsEtValeurs(raisonnement.porteSur),
    examine: (Array.isArray(raisonnement.examine) ? raisonnement.examine : [])
      .map(examineRetenu)
      .filter(Boolean),
    decision: nomEtValeur(raisonnement.decision),
    produit: nomsEtValeurs(raisonnement.produit)
  };
}

/** « altitude = 742,30 », ou « altitude » quand personne n'a noté la valeur. */
const ditNomEtValeur = (ligne) => (ligne.valeur ? `${ligne.sujet} = ${ligne.valeur}` : ligne.sujet);

/** « étude géotechnique (page 12) », ou juste ce qu'on a. */
const ditExamine = (ligne) => (ligne.ou ? `${ligne.quoi} (${ligne.ou})` : ligne.quoi);

/**
 * Les cinq étapes, prêtes à afficher.
 *
 * Toujours cinq, dans le même ordre : une étape vide porte son manque plutôt
 * que de disparaître. Un graphe qui perd ses lignes creuses se lit comme un
 * raisonnement complet, et c'est exactement ce qu'il n'est pas.
 *
 * @returns {{etape: string, dit: string, entrees: string[], manque: boolean, parceQue: string}[]}
 */
export function etapesDuRaisonnement(raisonnement = null) {
  const dit = raisonnementRetenu(raisonnement);
  if (!dit) return [];

  const contenus = {
    [ETAPE.POINT]: [dit.question],
    [ETAPE.PORTE_SUR]: dit.porteSur.map(ditNomEtValeur),
    [ETAPE.EXAMINE]: dit.examine.map(ditExamine),
    [ETAPE.DECISION]: dit.decision ? [ditNomEtValeur(dit.decision)] : [],
    [ETAPE.PRODUIT]: dit.produit.map(ditNomEtValeur)
  };

  return ETAPES.map((etape) => {
    const entrees = contenus[etape];
    return {
      etape,
      dit: ETAPES_DITES[etape],
      entrees,
      manque: entrees.length === 0,
      parceQue: entrees.length ? "" : MANQUES_DITS[etape]
    };
  });
}

/** Les étapes que personne n'a remplies. Elles se comptent, et elles se disent. */
export function lacunesDuRaisonnement(raisonnement = null) {
  return etapesDuRaisonnement(raisonnement)
    .filter((ligne) => ligne.manque)
    .map((ligne) => ligne.etape);
}

/** Les lacunes, en une phrase. Vide quand le graphe est entier. */
export function phraseDesLacunesDuRaisonnement(manques = []) {
  const dits = (Array.isArray(manques) ? manques : [])
    .map((etape) => MANQUES_DITS[etape])
    .filter(Boolean);
  if (!dits.length) return "";

  return `Ce raisonnement ne dit pas tout : ${dits.join(", ")}.`;
}

/**
 * Le raisonnement d'un point, reconstruit de ce qu'on sait de lui.
 *
 * Les deux arêtes s'y rejoignent — et c'est le seul endroit où elles se
 * rencontrent, chacune dans son rôle : l'amont dit sur quoi le débat portait,
 * l'aval ce qu'il a posé. Les confondre ferait dire d'une valeur qu'elle est
 * issue du débat qui la conteste.
 *
 * @param {object} options
 * @param {object} options.point le point
 * @param {string} [options.question] à défaut, le titre du point
 * @param {object[]} [options.porteSur] les versions de l'arête amont
 * @param {object[]} [options.examine] ce qui a été regardé
 * @param {object[]} [options.produites] ce que le point a posé — affirmations
 *   en mémoire, ou lignes qu'on s'apprête à proposer
 * @returns {object|null} `null` quand il n'y a pas même une question
 */
export function raisonnementDuPoint({
  point = null,
  question = "",
  porteSur = [],
  examine = [],
  produites = []
} = {}) {
  const dite = texte(question) || texte(point?.title) || texte(point?.titre);
  if (!dite) return null;

  const lignes = Array.isArray(produites) ? produites : [];

  // La ligne de décision se distingue de ce qu'elle a fixé : elle porte la
  // question et les écartés, l'autre porte la valeur. Les mettre côte à côte
  // dans « PRODUIT » ferait lire deux fois la même chose.
  const decision = lignes.find((ligne) => natureDe(ligne) === NATURE.DECISION) ?? null;

  return {
    point: texte(point?.id),
    question: dite,
    porteSur: nomsEtValeurs(porteSur),
    examine: (Array.isArray(examine) ? examine : []).map(examineRetenu).filter(Boolean),
    decision: nomEtValeur(decision),
    produit: nomsEtValeurs(lignes.filter((ligne) => ligne !== decision))
  };
}

/**
 * Le raisonnement d'un point, prêt pour une proposition.
 *
 * Une ligne, jamais deux : il n'affirme rien, il n'a donc pas de conclusion à
 * porter à côté de lui. Sa provenance est celle de la décision qu'il traverse —
 * le même « qui » et le même « quand » que la valeur qu'elle a fixée, afin que
 * les trois lignes se relient par leur signature autant que par leur nom.
 *
 * @returns {object[]} une ligne, ou aucune
 */
export function raisonnementVersable({
  point = null,
  question = "",
  porteSur = [],
  examine = [],
  produites = [],
  par = "",
  quand = "",
  domaine = "",
  zones = [],
  atelier = ""
} = {}) {
  const dit = raisonnementRetenu(
    raisonnementDuPoint({ point, question, porteSur, examine, produites })
  );
  if (!dit) return [];

  const signature = phraseDuDebat({
    intitule: texte(point?.title) || texte(point?.titre),
    par,
    quand
  });

  return [{
    sujet: dit.question,
    // Il n'affirme rien : sa valeur ne peut être que sa question. Voir l'en-tête.
    valeur: dit.question,
    nature: NATURE.RAISONNEMENT,
    domaine: texte(domaine),
    raisonnement: dit,
    quoi: dit.question,
    provenance: { type: PROVENANCE.DECISION, quoi: signature, par: texte(par), le: texte(quand) },
    statut: STATUT.RETENU,
    zones: Array.isArray(zones) ? zones : [],
    atelier: texte(atelier),
    // La même arête aval que les autres lignes du point : c'est par elle qu'on
    // le retrouvera depuis la mémoire, et elle n'est pas écrite ici à la main.
    reference: referenceDuPoint(point?.id)
  }];
}
