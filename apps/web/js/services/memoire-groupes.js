/**
 * Un sujet, ses faces, et ce qui le fait remonter.
 *
 * ## Le défaut
 *
 * Une question fermée verse **trois lignes** : la valeur qu'elle fixe, la
 * décision qui l'a tranchée, et le raisonnement qui y a mené. La mémoire les
 * tient séparées pour une bonne raison, et le rangement l'écrit lui-même :
 *
 * > « Une décision porte **le même sujet** que la valeur qu'elle fixe — c'est
 * > ce qui permet de les relier par le nom. Sans préfixe elles partageraient un
 * > `item_key`, et verser l'une supprimerait l'autre. »
 *
 * Trois clés, donc — `X`, `decision:X`, `raisonnement:X` — et **trois lignes à
 * l'écran**, au même titre, portant le même titre. Sur une recherche, on lisait
 * quatre fois « Quelle est la profondeur hors gel ? » avec les mêmes puces, et
 * l'on ne savait pas laquelle ouvrir. Personne n'a le temps d'ouvrir les
 * quatre.
 *
 * ## La règle
 *
 * > **Trois lignes qui portent le même sujet sont un seul sujet, et l'écran
 * > doit le dire.**
 *
 * La lecture n'a pas à répéter la découpe du rangement. La clé du regroupement
 * existait déjà toute faite : c'est la clé **sans son préfixe**, que l'atelier
 * pose au versement et que ce fichier retire à la lecture.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * **Il ne retire aucune ligne.** Un groupe porte toutes ses faces ; l'écran en
 * montre une et plie les autres. Une ligne qui disparaîtrait d'un regroupement
 * serait une ligne qu'on ne peut plus trouver, et c'est exactement ce qu'un
 * écran de mémoire ne doit jamais faire.
 *
 * **Il ne filtre pas.** Il regroupe ce qu'on lui donne — déjà filtré par
 * `memoire-selection.js`, une fois (règle 10). Un groupe ne ramène donc jamais
 * une face que la recherche avait écartée.
 */

import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les préfixes que le versement pose, et ce qu'ils disent de la face.
 *
 * L'ordre de cette table **est** l'ordre de lecture, et ce n'est pas celui de
 * la base : on lit d'abord ce que le projet tient, puis qui l'a tranché, puis
 * par où l'on est passé. La base, elle, les range par clé.
 */
export const FACE = {
  /** Ce que le projet tient. C'est la réponse, et elle vient en premier. */
  VALEUR: "valeur",
  /** Qui l'a tranchée, et ce qui a été écarté. */
  DECISION: "decision",
  /** Par où l'on est passé pour y arriver. */
  RAISONNEMENT: "raisonnement",
  /** La fonction qui la déduit, quand c'en est une. */
  FONCTION: "fonction"
};

/** Ce qu'on en dit, à l'écran. */
export const MOT_DE_LA_FACE = {
  [FACE.VALEUR]: "ce que le projet tient",
  [FACE.DECISION]: "qui l'a tranché",
  [FACE.RAISONNEMENT]: "par où l'on est passé",
  [FACE.FONCTION]: "la fonction qui le déduit"
};

/** L'ordre de lecture. Une face inconnue passe après celles qu'on connaît. */
const ORDRE = [FACE.VALEUR, FACE.DECISION, FACE.RAISONNEMENT, FACE.FONCTION];

const PREFIXES = [
  ["decision:", FACE.DECISION],
  ["raisonnement:", FACE.RAISONNEMENT],
  ["regle:", FACE.FONCTION]
];

/**
 * La face d'une affirmation, et le sujet qu'elle partage avec les autres.
 *
 * **Sur la clé, jamais sur le titre.** Deux sujets peuvent porter le même
 * libellé — c'est le propre d'un projet à plusieurs bâtiments —, et la clé
 * porte déjà sa zone : `hauteur@batiment-a` et `hauteur@batiment-b` sont deux
 * sujets, et le resteront.
 *
 * @returns {{cle: string, face: string}} `cle` vide quand il n'y a rien à
 *   regrouper — l'appelant garde alors la ligne seule, plutôt que de la ranger
 *   sous un sujet qui n'existe pas.
 */
export function faceDe(assertion = {}) {
  // Une clé vide tombe d'elle-même sur la dernière ligne : aucun préfixe ne
  // s'y retrouve, et `{ cle: "", face: VALEUR }` en sort. Une garde en tête
  // aurait rendu la même chose, et ne se serait jamais cassée (règle 4).
  const brute = texte(assertion?.subject_key);

  for (const [prefixe, face] of PREFIXES) {
    if (brute.toLowerCase().startsWith(prefixe)) {
      return { cle: brute.slice(prefixe.length), face };
    }
  }

  return { cle: brute, face: FACE.VALEUR };
}

/**
 * Les affirmations, regroupées par sujet.
 *
 * L'ordre des groupes est **celui des lignes reçues** : c'est la liste qu'on
 * regardait, et la remettre dans un autre ordre ferait perdre celle qu'on
 * lisait. Le tri par importance est une autre question, et elle a sa fonction.
 *
 * Dans un groupe, la **tête** est la face la plus haute dans l'ordre de lecture
 * *parmi celles que la recherche a retenues* : chercher `nature:raisonnement`
 * doit montrer le raisonnement, pas une valeur qu'on n'a pas demandée.
 *
 * @returns {{cle: string, tete: object, faces: {face: string, assertion: object}[]}[]}
 */
export function grouperParSujet(assertions = []) {
  const lignes = Array.isArray(assertions) ? assertions : [];
  const groupes = new Map();
  const seuls = [];

  for (const assertion of lignes) {
    const { cle, face } = faceDe(assertion);
    if (!cle) {
      seuls.push({ cle: "", tete: assertion, faces: [{ face, assertion }], rang: seuls.length });
      continue;
    }

    if (!groupes.has(cle)) groupes.set(cle, { cle, faces: [], rang: groupes.size + lignes.length });
    groupes.get(cle).faces.push({ face, assertion });
  }

  // L'ordre d'apparition : le rang du groupe est celui de sa première ligne.
  const tous = [...groupes.values()].map((groupe) => ({
    ...groupe,
    rang: lignes.indexOf(groupe.faces[0].assertion)
  }));

  return [...tous, ...seuls]
    .sort((gauche, droite) => gauche.rang - droite.rang)
    .map(({ rang, ...groupe }) => ({
      ...groupe,
      faces: [...groupe.faces].sort(
        (gauche, droite) => rangDeLaFace(gauche.face) - rangDeLaFace(droite.face)
      )
    }))
    .map((groupe) => ({ ...groupe, tete: groupe.tete ?? groupe.faces[0].assertion }));
}

/** Où une face se lit. Une face inconnue passe après celles qu'on connaît. */
function rangDeLaFace(face) {
  const rang = ORDRE.indexOf(face);
  return rang < 0 ? ORDRE.length : rang;
}

/* ════════════════════════════════════════════════════════════════════════════
 * Ce qui fait remonter un sujet
 *
 * « Par importance » ne veut rien dire tant qu'on ne peut pas répondre à
 * « pourquoi cette ligne est-elle en haut ? ». Trois critères, tous déjà dans
 * la mémoire, et **chacun se dit en français** sur la ligne qu'il remonte : un
 * score opaque se subit, il ne s'audite pas.
 * ════════════════════════════════════════════════════════════════════════════ */

/** Ce qui remonte un sujet, et ce que ça pèse. */
export const POURQUOI = {
  /** Un constat ouvert attend quelqu'un. Une valeur qui fait foi, non. */
  APPELLE_UN_GESTE: "appelle-un-geste",
  /** Le raisonnement ne dit pas tout : c'est là qu'est le travail. */
  NE_DIT_PAS_TOUT: "ne-dit-pas-tout",
  /** Beaucoup de fonctions le lisent : s'il bouge, tout bouge. */
  PORTE_BEAUCOUP: "porte-beaucoup"
};

/**
 * **Et pas « il a bougé récemment ».**
 *
 * On l'avait écrit, et l'écran l'a démenti : la mention paraissait sur *toutes*
 * les lignes. Pour une bonne raison — l'ordre reçu est déjà celui des dates, et
 * le sous-titre de la liste le dit lui-même : « dans l'ordre où elles ont été
 * tranchées ». Un critère qui double le tri existant ne départage rien et
 * n'ajoute que du bruit : **une raison qui s'affiche partout n'oriente plus.**
 *
 * La récence reste donc ce qu'elle était : l'ordre par défaut, que les trois
 * raisons ci-dessus viennent bousculer quand elles ont quelque chose à dire.
 */

/** Ce que chaque raison vaut. L'ordre des chiffres **est** l'ordre des raisons. */
const POIDS = {
  [POURQUOI.APPELLE_UN_GESTE]: 100,
  [POURQUOI.NE_DIT_PAS_TOUT]: 10,
  [POURQUOI.PORTE_BEAUCOUP]: 1
};

/** Ce qu'on en dit sur la ligne. Une raison muette ne se vérifie pas. */
export const MOT_DU_POURQUOI = {
  [POURQUOI.APPELLE_UN_GESTE]: "attend quelqu'un",
  [POURQUOI.NE_DIT_PAS_TOUT]: "ne dit pas tout",
  [POURQUOI.PORTE_BEAUCOUP]: "beaucoup s'appuient dessus"
};

/** Au-delà, un nom est une fondation : le corriger en déplace beaucoup. */
export const BEAUCOUP = 5;

/**
 * Pourquoi ce sujet remonte, et de combien.
 *
 * **Les raisons se cumulent, mais elles ne s'additionnent pas à égalité.** Un
 * constat qui attend quelqu'un passe devant tout le reste, quoi qu'il porte :
 * c'est du travail en attente, et le reste est de la lecture. Les poids sont donc des ordres de grandeur, pas des points — deux
 * raisons faibles ne valent jamais une forte, et c'est voulu.
 *
 * **Rien qu'on ne puisse dire.** Chaque raison retenue est nommée, et l'écran
 * l'affiche : on doit pouvoir répondre « pourquoi celle-là est-elle en haut ? »
 * sans ouvrir le code.
 *
 * @param {object} groupe un groupe, tel que `grouperParSujet` le rend
 * @param {object} quoi
 * @param {(assertion: object) => boolean} [quoi.attend] ce constat est-il ouvert ?
 * @param {(assertion: object) => boolean} [quoi.neDitPasTout] son raisonnement
 *   a-t-il des lacunes ?
 * @param {(assertion: object) => number} [quoi.combienSappuient] combien le lisent
 * @returns {{poids: number, pourquoi: string[]}}
 */
export function poidsDuSujet(groupe = null, {
  attend = null, neDitPasTout = null, combienSappuient = null
} = {}) {
  const faces = groupe?.faces ?? [];
  const pourquoi = [];

  if (typeof attend === "function" && faces.some(({ assertion }) => attend(assertion))) {
    pourquoi.push(POURQUOI.APPELLE_UN_GESTE);
  }

  /**
   * **Un raisonnement incomplet remonte**, et c'est propre à Mdall : l'écran
   * dit déjà « ce raisonnement ne dit pas tout — on ne sait pas ce qui a été
   * examiné », et cette phrase-là est le travail qui reste. La ranger au milieu
   * de trois cents lignes revient à ne pas l'avoir écrite (règle 5).
   *
   * **La question se pose ailleurs**, et on ne la refait pas ici : les lacunes
   * d'un raisonnement se comptent dans `raisonnement-du-point.js`, et une
   * seconde lecture de la même chose finirait par ne plus dire la même (règle
   * 10). Ce fichier demande, il ne devine pas.
   */
  if (typeof neDitPasTout === "function"
    && faces.some(({ assertion }) => neDitPasTout(assertion))) {
    pourquoi.push(POURQUOI.NE_DIT_PAS_TOUT);
  }

  if (typeof combienSappuient === "function") {
    const combien = Math.max(0, ...faces.map(({ assertion }) => Number(combienSappuient(assertion)) || 0));
    if (combien >= BEAUCOUP) pourquoi.push(POURQUOI.PORTE_BEAUCOUP);
  }

  return {
    poids: pourquoi.reduce((total, une) => total + (POIDS[une] ?? 0), 0),
    pourquoi
  };
}

/**
 * Les groupes, du plus pressant au plus tranquille.
 *
 * **À poids égal, l'ordre reçu est conservé.** Deux sujets que rien ne
 * distingue ne doivent pas changer de place entre deux frappes : on perdrait
 * celui qu'on était en train de lire.
 *
 * On n'écrit pas de départage pour cela : `sort` est **stable** depuis
 * ECMAScript 2019, et c'est la langue qui le garantit. En ajouter un second
 * ferait une garde qu'aucune rupture ne peut faire tomber — on ne saurait
 * jamais si elle sert (règle 4).
 */
export function parImportance(groupes = [], quoi = {}) {
  return (Array.isArray(groupes) ? groupes : [])
    .map((groupe) => ({ groupe, ...poidsDuSujet(groupe, quoi) }))
    .sort((gauche, droite) => droite.poids - gauche.poids)
    .map(({ groupe, poids, pourquoi }) => ({ ...groupe, poids, pourquoi }));
}

/** La clé d'un sujet, pour le comparer à ce que les fonctions nomment. */
export function nomDuSujet(cle = "") {
  return cleDuSujet(texte(cle).split("@")[0]);
}
