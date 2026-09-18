/**
 * Deux raisonnements qui partent des mêmes valeurs parlent probablement de la
 * même chose.
 *
 * ## Ce qu'on cherche à dire
 *
 * « Vous parlez bien de cette variable ? Sa valeur en vigueur est… » est la
 * première question, et elle est réglée. La seconde est plus utile encore :
 * **« votre raisonnement se rapproche-t-il de celui-ci ? Voici ce qui avait été
 * retenu… »** — et, le jour où il est remplacé, « l'ancien raisonnement était…,
 * il a été remplacé par… ».
 *
 * ## On ne comprend pas le texte, on compare des noms
 *
 * Une question est du texte libre : deux personnes n'écriront jamais la même,
 * et un modèle qui les rapprocherait produirait une ressemblance qu'on ne peut
 * ni vérifier ni expliquer.
 *
 * Ce qui est stable, c'est ce qu'un raisonnement **met en jeu** : les noms de
 * ses entrées et les noms de ce qu'il pose. Ils viennent de la mémoire, ils
 * s'écrivent pareil à travers tout un projet, et — c'est là que cela devient
 * intéressant — **à travers plusieurs projets**.
 *
 * ## Les valeurs ne comptent pas, et c'est voulu
 *
 * « Altitude » compte ; « 742,30 » ne compte pas. Deux projets ne partagent
 * jamais leurs valeurs, ils partagent leurs **formes de raisonnement**. C'est
 * aussi, très exactement, la frontière de l'anonymat : la structure se
 * réutilise, les valeurs ne sortent jamais du projet.
 *
 * ## Exact, ou rien
 *
 * Deux degrés, tous deux vérifiables et explicables :
 *
 * - **le même** : mêmes entrées, mêmes conclusions
 * - **le même départ** : mêmes entrées, conclusions différentes
 *
 * Pas de « partage deux noms sur trois » : un seuil est un chiffre qu'on ne
 * sait pas justifier, et un rapprochement qu'on ne sait pas expliquer est un
 * rapprochement qu'on cesse de lire. Ce qui ne se rapproche pas se tait, et
 * quelqu'un fera le lien à la main s'il le veut.
 *
 * ## Il est pur
 *
 * Il reçoit des raisonnements et rend une lecture. Rien d'autre.
 */

import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** À quel point deux raisonnements se rapprochent. */
export const RESSEMBLANCE = {
  /** Mêmes entrées, mêmes conclusions. */
  LE_MEME: "le-meme",
  /** Mêmes entrées, conclusions différentes. */
  MEME_DEPART: "meme-depart"
};

/** Ce qu'on en dit, à l'écran. Écrit une fois (règle 10). */
export const RESSEMBLANCES_DITES = {
  [RESSEMBLANCE.LE_MEME]: "part des mêmes valeurs et aboutit aux mêmes",
  [RESSEMBLANCE.MEME_DEPART]: "part des mêmes valeurs, et n'aboutit pas aux mêmes"
};

/** Les noms d'une liste de `{sujet, valeur}`, repliés comme la mémoire les replie. */
function nomsDe(entrees = []) {
  const vus = new Set();
  for (const entree of Array.isArray(entrees) ? entrees : []) {
    const nom = cleDuSujet(texte(entree?.sujet));
    if (nom) vus.add(nom);
  }
  return vus;
}

/**
 * Ce qu'un raisonnement met en jeu : **des noms**, jamais des valeurs.
 *
 * C'est sa signature, et c'est ce qui voyage. Elle se lit d'un projet à l'autre
 * sans rien emporter du projet.
 *
 * @returns {{entrees: Set<string>, conclusions: Set<string>}}
 */
export function signatureDunRaisonnement(raisonnement = null) {
  return {
    entrees: nomsDe(raisonnement?.porteSur),
    conclusions: nomsDe(raisonnement?.produit)
  };
}

/** Deux ensembles qui portent exactement les mêmes noms. */
function memesNoms(gauche, droite) {
  if (gauche.size !== droite.size) return false;
  for (const nom of gauche) if (!droite.has(nom)) return false;
  return true;
}

/**
 * À quel point ces deux raisonnements se rapprochent — ou `""` s'ils ne se
 * rapprochent pas.
 *
 * **Un raisonnement sans entrée ne se rapproche de rien.** Deux raisonnements
 * dont on ignore les entrées auraient tous les deux la même signature vide, et
 * l'outil les déclarerait identiques : c'est exactement le rapprochement faux
 * qu'on refuse (règle 5).
 */
export function ceQuiLesRapproche(gauche = null, droite = null) {
  const ici = signatureDunRaisonnement(gauche);
  const la = signatureDunRaisonnement(droite);

  if (!ici.entrees.size || !la.entrees.size) return "";
  if (!memesNoms(ici.entrees, la.entrees)) return "";

  return memesNoms(ici.conclusions, la.conclusions)
    ? RESSEMBLANCE.LE_MEME
    : RESSEMBLANCE.MEME_DEPART;
}

/**
 * Les raisonnements de la mémoire qui se rapprochent de celui-ci.
 *
 * Le plus proche d'abord. Un raisonnement ne se rapproche pas de lui-même — ce
 * qui se vérifie sur l'identifiant de la ligne, et pas sur la signature : deux
 * lignes différentes peuvent porter la même, et c'est précisément ce qu'on
 * cherche.
 *
 * @param {object} assertion la ligne de raisonnement qu'on regarde
 * @param {object[]} assertions la mémoire du projet
 * @returns {{assertion: object, ressemblance: string}[]}
 */
export function raisonnementsQuiSeRessemblent(assertion = null, assertions = []) {
  const ici = assertion?.payload?.raisonnement ?? null;
  // Une ligne qui n'en porte pas ne se rapprocherait de rien de toute façon —
  // `ceQuiLesRapproche` refuse une signature vide. Ce retour épargne un parcours
  // de toute la mémoire pour chacune des centaines de lignes d'un écran.
  if (!ici) return [];

  const id = texte(assertion?.id);

  const trouves = [];
  for (const autre of Array.isArray(assertions) ? assertions : []) {
    if (texte(autre?.id) === id) continue;

    // Une version remplacée n'est plus ce que le projet retient. Elle se relit
    // ailleurs — dans l'histoire de la ligne —, pas comme un rapprochement à
    // faire aujourd'hui.
    if (texte(autre?.superseded_by)) continue;

    const ressemblance = ceQuiLesRapproche(ici, autre?.payload?.raisonnement ?? null);
    if (ressemblance) trouves.push({ assertion: autre, ressemblance });
  }

  return trouves.sort((gauche, droite) =>
    rang(gauche.ressemblance) - rang(droite.ressemblance));
}

/** Le plus proche en premier. */
const rang = (ressemblance) =>
  (ressemblance === RESSEMBLANCE.LE_MEME ? 0 : 1);

/**
 * Ce que le projet a déjà raisonné **à partir de ces valeurs-là**.
 *
 * ## Le moment où cela sert
 *
 * Pas en relisant la mémoire : **en fermant un sujet**. On sait alors sur quoi
 * le débat portait — les arêtes confirmées —, et on ne sait pas encore ce qu'on
 * va trancher. C'est l'instant exact où « voici comment on avait raisonné la
 * dernière fois » vaut quelque chose ; une fois la décision écrite, il est trop
 * tard pour en tenir compte.
 *
 * ## Le même départ, et rien de plus
 *
 * Les conclusions ne sont pas encore prises : on ne peut comparer que le départ,
 * et c'est honnête de ne dire que cela. Un raisonnement rendu ici **part des
 * mêmes valeurs** ; ce qu'il en a fait est justement ce qu'on vient regarder.
 *
 * Et la même exigence qu'ailleurs : des entrées vides ne se rapprochent de rien,
 * sans quoi tout sujet dont on ignore les arêtes se verrait proposer la mémoire
 * entière (règle 5).
 *
 * @param {{sujet: string}[]} entrees les valeurs que ce débat met en question
 * @param {object[]} assertions la mémoire du projet
 * @returns {object[]} les lignes de raisonnement, les plus récentes d'abord
 */
export function raisonnementsPartisDeCesValeurs(entrees = [], assertions = []) {
  const depart = { porteSur: entrees, produit: [] };
  if (!signatureDunRaisonnement(depart).entrees.size) return [];

  return (Array.isArray(assertions) ? assertions : [])
    .filter((ligne) => !texte(ligne?.superseded_by))
    .filter((ligne) => {
      const la = ligne?.payload?.raisonnement ?? null;
      // On ne compare que le départ : `ceQuiLesRapproche` dirait « le même » dès
      // que les deux n'aboutissent à rien, et ici l'un des deux n'aboutit pas
      // *encore*. Ce serait une ressemblance fabriquée par le calendrier.
      return la && memesNoms(
        signatureDunRaisonnement(depart).entrees,
        signatureDunRaisonnement(la).entrees
      );
    })
    // Le plus récent d'abord : c'est la dernière fois qu'on s'est posé la
    // question, et c'est celle qu'on veut relire.
    .sort((gauche, droite) => texte(droite?.decided_at).localeCompare(texte(gauche?.decided_at)));
}

/**
 * Ce qu'on dit d'un rapprochement, en une phrase.
 *
 * Elle dit **le fait** — « part des mêmes valeurs » — et jamais « c'est le même
 * raisonnement » : ce qui est vérifié, ce sont les noms mis en jeu, pas
 * l'intention de celui qui l'a écrit.
 */
export function phraseDeLaRessemblance(ressemblance = "", combien = 1) {
  const dit = RESSEMBLANCES_DITES[texte(ressemblance)];
  if (!dit) return "";

  return combien > 1
    ? `${combien} autres raisonnements partent des mêmes valeurs`
    : `Un autre raisonnement ${dit}`;
}
