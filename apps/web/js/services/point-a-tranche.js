/**
 * Ce qu'un point a tranché, et dans quel débat une affirmation a été décidée.
 *
 * Étape 3 de `docs/lobjet-de-la-connaissance.md`.
 *
 * ## L'arête aval, et surtout pas l'autre
 *
 * Celle-ci dit **« cette affirmation vient de ce point-là »**. L'autre —
 * « ce point met en question cette affirmation-ci » — vit dans
 * `point-porte-sur.js`, et les deux ne doivent jamais se rejoindre : un seul
 * champ pour les deux ferait **couvrir une valeur par le débat qui la
 * conteste**.
 *
 * La cloison est donc physique, pas conventionnelle. Ce fichier ne lit jamais
 * les lignes de `subject_assertion_links` ; celui d'en face ne lit jamais la
 * référence d'une charge. Un test les croise et vérifie qu'aucun des deux ne
 * voit ce qui appartient à l'autre.
 *
 * ## Rien à créer : la marque était déjà écrite
 *
 * `proposerLaDecisionDuSujet` écrivait `sujet:<id>` dans la charge depuis le
 * premier jour, et **personne ne la lisait**. Une chaîne écrite et jamais lue
 * n'est pas une arête : c'est un commentaire dans une colonne. Il n'y avait
 * donc rien à ajouter en base — il fallait un lecteur, et que l'écrivain et le
 * lecteur soient **le même fichier**. Une forme inventée à l'écriture et
 * redevinée à la lecture est exactement ce qui finit par diverger (règle 4).
 *
 * ## Pourquoi une marque, et pas une colonne
 *
 * `payload.reference` sert déjà à retrouver l'origine d'une valeur, quelle
 * qu'elle soit. La marque `sujet:` est ce qui distingue la nôtre : une
 * référence qui ne la porte pas n'est pas un point, et on n'y touche pas.
 *
 * Le mot de la marque est celui de la **mémoire**, pas du code. Il est déjà
 * écrit dans les propositions des projets, et le renommer rendrait illisible ce
 * qui a été enregistré : un constat ne devient pas faux (règle 6).
 *
 * ## Ce que cela répond
 *
 * « Pourquoi les fondations sont-elles à cette profondeur ? » La chaîne
 * remontait jusqu'à une règle, et s'arrêtait là. Elle continue maintenant
 * jusqu'au débat qui a tranché — avec sa date et ses noms.
 */

import { MOT_A_LECRAN } from "./point-porte-sur.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qui marque une référence comme désignant un point.
 *
 * Le mot est celui de la mémoire — et cette ligne est la seule de ce fichier
 * qui l'écrive. Voir plus haut : ce n'est pas un nom, c'est une donnée déjà
 * enregistrée.
 */
export const MARQUE_DU_POINT = "sujet:";

/** La référence qu'une affirmation porte quand un point l'a décidée. */
export function referenceDuPoint(pointId = "") {
  const id = texte(pointId);
  return id ? `${MARQUE_DU_POINT}${id}` : "";
}

/**
 * Le point d'une référence, ou `""` quand ce n'en est pas une.
 *
 * Le pendant exact de `referenceDuPoint`, et c'est tout l'intérêt de les avoir
 * côte à côte : les deux sens de la même forme se relisent d'un coup d'œil.
 */
export function pointDeLaReference(reference = "") {
  const dite = texte(reference);
  if (!dite.startsWith(MARQUE_DU_POINT)) return "";
  return texte(dite.slice(MARQUE_DU_POINT.length));
}

/**
 * Le point qui a tranché cette affirmation, ou `""`.
 *
 * **Ne lit que la charge.** Qu'un point porte sur cette valeur ne dit rien de
 * qui l'a décidée — c'est même le contraire : il la conteste.
 */
export function pointQuiATranche(assertion = null) {
  return pointDeLaReference(assertion?.payload?.reference);
}

/**
 * Ce qu'un point a posé dans la mémoire.
 *
 * L'autre sens de la même arête. Une affirmation remplacée reste rendue : le
 * débat l'a bien produite, et l'effacer de son bilan réécrirait l'histoire.
 * C'est à l'appelant de dire s'il veut ce qui vaut encore ou tout ce qui a été.
 */
export function affirmationsDecideesDans(pointId = "", assertions = []) {
  const vise = texte(pointId);
  if (!vise) return [];

  return (Array.isArray(assertions) ? assertions : [])
    .filter((assertion) => pointQuiATranche(assertion) === vise);
}

/**
 * Où la chaîne du raisonnement continue, quand elle bute sur une décision.
 *
 * Qui et quand viennent de la **provenance** de l'affirmation, jamais du point :
 * c'est la signature de la décision, celle qui a été enregistrée avec la valeur.
 * L'intitulé, lui, vient du point — il n'est nulle part ailleurs.
 *
 * Un point qu'on ne connaît pas ne fait pas échouer la lecture : on sait déjà
 * qu'un débat a tranché, et le dire sans son titre vaut mieux que se taire
 * (règle 5).
 *
 * @returns {{pointId, point, intitule, par, quand, phrase}|null} `null` quand
 *   aucun point n'a tranché cette affirmation.
 */
export function leDebatQuiATranche({ assertion = null, points = [] } = {}) {
  const pointId = pointQuiATranche(assertion);
  if (!pointId) return null;

  const point = (Array.isArray(points) ? points : [])
    .find((candidat) => texte(candidat?.id) === pointId) ?? null;

  const provenance = assertion?.payload?.provenance;
  const intitule = texte(point?.title) || texte(point?.titre);
  const par = texte(provenance?.par);
  const quand = texte(provenance?.le);

  return { pointId, point, intitule, par, quand, phrase: phraseDuDebat({ intitule, par, quand }) };
}

/**
 * Le bout de la chaîne, en une phrase.
 *
 * Le mot est celui de l'écran, et il vient de l'étape 0 : le code dit « point »,
 * l'écran écrit l'autre. Il n'est pas réécrit ici.
 */
export function phraseDuDebat({ intitule = "", par = "", quand = "" } = {}) {
  const dit = texte(intitule);
  const ou = dit ? `le ${MOT_A_LECRAN.un} « ${dit} »` : `un ${MOT_A_LECRAN.un}`;
  const signature = [texte(par), texte(quand)].filter(Boolean).join(", le ");

  return signature ? `tranché dans ${ou} — ${signature}` : `tranché dans ${ou}`;
}
