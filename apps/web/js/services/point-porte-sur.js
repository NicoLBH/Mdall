/**
 * Ce sur quoi un point porte, et ce qui porte sur une valeur.
 *
 * Étapes 0, 1 et 2 de `docs/lobjet-de-la-connaissance.md`.
 *
 * ## Le mot, tranché
 *
 * `sujet` désignait déjà deux choses : dans le langage de la mémoire, le **nom
 * d'une donnée** — « Hauteur du plancher bas du logement le plus haut » ; dans
 * le suivi, un fil de discussion. Le jour où il a fallu écrire l'arête, « le
 * sujet porte sur le sujet » ne s'écrivait pas.
 *
 * **La mémoire garde « sujet »** — c'est le mot du langage, il est dans les
 * `.ref` et les `.ctr`, il est presque contractuel. Et **le code appelle
 * « point » l'objet du suivi**, le mot natif du métier : un point de compte
 * rendu, un point ouvert, un point soldé.
 *
 * **À l'écran, rien ne change : on écrit « sujet ».** Le vocabulaire des écrans
 * a son histoire et ses habitudes, et le renommer coûterait cher pour ne régler
 * qu'une gêne de lecture du code. Les phrases de ce fichier le disent donc
 * « sujet », et un test tient la ligne — le jour où l'écran dirait « point »,
 * il tomberait.
 *
 * ## Deux arêtes, et surtout ne pas les confondre
 *
 * Celle-ci dit **« ce point met en question cette affirmation-ci »**. L'autre —
 * « cette affirmation vient de ce point-là » — n'est pas ici : un seul champ
 * pour les deux ferait couvrir une valeur par le débat qui la conteste.
 *
 * ## Elle pointe une version, jamais un nom
 *
 * Comme l'avis de bureau de contrôle et comme les dépendances. Un point n'a pas
 * mis en question « la classe de sol » en général : il a mis en question la
 * valeur C telle qu'elle était affirmée le 12 août. La péremption est alors
 * gratuite — la chaîne des remplacements *est* le mécanisme.
 *
 * ## La reconnaissance est celle des avis, et c'est le même fichier
 *
 * Sur mots entiers, un sujet ou rien. Un point mal accroché contesterait en
 * silence une valeur que personne n'a mise en doute, et c'est précisément la
 * prudence que `avis-liaison.js` a déjà écrite.
 */

import { LIAISON, liaisonDunIntitule, phraseDeLaLiaison } from "./avis-liaison.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le mot de l'écran.
 *
 * Écrit une fois : les phrases d'ici le lisent, et le jour où l'écran changera
 * d'avis, il changera à un seul endroit (règle 10).
 */
export const MOT_A_LECRAN = { un: "sujet", plusieurs: "sujets" };

/** Ce qu'un point donne à reconnaître : son titre, à défaut sa description. */
export function intituleDuPoint(point = null) {
  return texte(point?.title) || texte(point?.titre) || texte(point?.description);
}

/**
 * La valeur sur laquelle ce point porterait, si on la reconnaît.
 *
 * **Proposé, jamais posé.** Le lien rendu ici n'a pas d'auteur : c'est une
 * reconnaissance, et quelqu'un doit la confirmer. Une arête posée toute seule
 * ferait contester une valeur sans que personne ne l'ait demandé.
 *
 * @param {object} point le point ouvert
 * @param {object[]} assertions la mémoire du projet
 * @returns {{assertions: object[], motif: string, phrase: string}}
 */
export function portagePropose(point = null, assertions = []) {
  const { assertions: reconnues, motif } = liaisonDunIntitule(intituleDuPoint(point), assertions);
  return { assertions: reconnues, motif, phrase: phraseDeLaLiaison(motif) };
}

/**
 * Les lignes à écrire pour poser l'arête.
 *
 * Ce module ne parle pas à la base — il **prépare**, comme tout le reste : la
 * porte de la base est ailleurs, et une seconde porte serait celle qu'on
 * oublierait de relire.
 *
 * @param {object} options
 * @param {object} options.point le point
 * @param {object[]} options.assertions les versions sur lesquelles il porte
 * @param {string} [options.projectId]
 * @param {string} [options.declarePar] qui l'a posée — vide quand c'est proposé
 */
export function liensAPoser({ point = null, assertions = [], projectId = "", declarePar = "" } = {}) {
  // `pointId` et non `sujet` : c'est toute la raison d'être de l'étape 0. Une
  // variable nommée `sujet` qui porte l'identifiant d'un point est exactement
  // l'ambiguïté qu'on vient de trancher — et elle se relit de travers six mois
  // plus tard, dans un fichier qui parle aussi des sujets de la mémoire.
  const pointId = texte(point?.id);
  const projet = texte(projectId) || texte(point?.project_id);
  if (!pointId || !projet) return [];

  const vues = new Set();

  return (Array.isArray(assertions) ? assertions : [])
    .map((assertion) => texte(assertion?.id))
    .filter((id) => {
      // Un point ne porte pas deux fois sur la même version : la base le refuse,
      // et un envoi refusé en bloc perdrait les autres lignes avec.
      if (!id || vues.has(id)) return false;
      vues.add(id);
      return true;
    })
    .map((assertionId) => ({
      project_id: projet,
      // La colonne, elle, garde son nom : elle référence `subjects.id`.
      subject_id: pointId,
      assertion_id: assertionId,
      // Nul dit « proposé, pas encore confirmé ». L'écran doit pouvoir le
      // distinguer d'un geste humain.
      declared_by: texte(declarePar) || null
    }));
}

/**
 * Les points **ouverts** qui portent sur cette version-là.
 *
 * ## Pourquoi les ouverts seulement
 *
 * Un point fermé a fait son travail : la valeur qu'il contestait a été tranchée,
 * ou le débat s'est éteint. Le compter ferait présenter comme « en débat » une
 * valeur que plus personne ne discute — et un écran qui signale tout ne signale
 * plus rien.
 *
 * @param {string} assertionId la version d'affirmation
 * @param {object} options
 * @param {object[]} options.liens les lignes de `subject_assertion_links`
 * @param {object[]} options.points les points du projet, avec leur `status`
 */
export function pointsQuiPortentSur(assertionId, { liens = [], points = [] } = {}) {
  const vise = texte(assertionId);
  if (!vise) return [];

  const parId = new Map(
    (Array.isArray(points) ? points : []).map((point) => [texte(point?.id), point])
  );

  const retenus = [];
  const vus = new Set();

  for (const lien of Array.isArray(liens) ? liens : []) {
    if (texte(lien?.assertion_id) !== vise) continue;

    const id = texte(lien?.subject_id);
    if (!id || vus.has(id)) continue;

    const point = parId.get(id);
    // Un point qu'on ne connaît pas ne se compte pas : on ne sait pas s'il est
    // ouvert, et le supposer ouvert ferait dire « en débat » à tort (règle 5).
    if (!point || !estOuvert(point)) continue;

    vus.add(id);
    retenus.push(point);
  }

  return retenus;
}

/** Un point ouvert : tout ce qui n'est pas fermé, sous quelque forme que ce soit. */
function estOuvert(point) {
  return !texte(point?.status).startsWith("closed");
}

/**
 * Ce qu'on dit d'une valeur sur laquelle un débat porte encore.
 *
 * C'est le premier effet visible de l'arête, et il vaut à lui seul l'étape :
 * **une valeur en débat cesse de se présenter comme acquise**. Le mot est celui
 * de l'écran — « sujet » —, quel que soit celui du code.
 */
export function phraseDesPointsOuverts(points = []) {
  const combien = Array.isArray(points) ? points.length : 0;
  if (!combien) return "";

  return combien === 1
    ? `un ${MOT_A_LECRAN.un} ouvert porte sur cette valeur`
    : `${combien} ${MOT_A_LECRAN.plusieurs} ouverts portent sur cette valeur`;
}

/** Les motifs de reconnaissance, repris tels quels : une seule table pour les deux. */
export { LIAISON };
