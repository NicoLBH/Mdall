/**
 * Ce qu'un avis de bureau de contrôle vaut — **et quand il ne vaut rien.**
 *
 * ## La règle que ce module tient
 *
 * > « Si on perd le couple objet vérifié / remarque de contrôle, la donnée n'a
 * >   aucun intérêt, c'est pour ça qu'on a plus de 1000 contenus en mémoire qui
 * >   ne servent à rien. Je crois qu'il vaut mieux ne rien remplir dans la
 * >   mémoire que de la saturer avec du bruit. »
 *
 * C'est une règle de fond, et elle s'écrit ici une fois.
 *
 * Un avis versé sans son objet et sans sa remarque donne une ligne comme
 * celle-ci, qu'on a vue en vrai :
 *
 *     Avis de contrôle technique n° 245 = "sans teneur lisible" {
 *       document: …-Rapport_RFCT-CT-13860-0425-0216.pdf — page 8
 *       statut: retenu
 *     }
 *
 * Elle dit qu'un avis numéroté 245 existe quelque part page 8. On ne peut rien
 * en faire : ni le retrouver, ni le vérifier, ni savoir ce qu'il couvre. Mille
 * lignes de ce genre ne font pas une mémoire — elles font un bruit dans lequel
 * les vraies se perdent. **Mieux vaut ne rien verser.**
 *
 * ## Le défaut qui les fabriquait
 *
 * Le même avis, dans l'onglet Analyse du même écran, se lit :
 *
 *     245 — Conformité des installations aux normes les concernant
 *     page 8
 *     Les notices techniques et attestations de conformité à la norme
 *     NF EN 60-598 des luminaires sont à nous transmettre.
 *
 * **Rien n'avait été perdu à la lecture.** `unAvisReleve` range un avis sous
 * `{reference, intitule, marque, constat}` — les mots du document —, et
 * `avis-versement.js` allait chercher `title_raw`, `opinion_label`,
 * `value.opinion_raw` — les mots du moteur de continuité. Deux formes pour une
 * chose, et le versement lisait celle que la lecture ne produit pas : il rendait
 * donc un intitulé vide et « sans teneur lisible », sur un avis parfaitement lu
 * (règle 10).
 *
 * `unAvisReleve` porte déjà cette leçon dans son propre commentaire — « les deux
 * formes se lisent ici, et c'est le prix d'une leçon ». Le versement, lui, ne
 * l'avait jamais reçue.
 *
 * ## Et la marque sans légende
 *
 * > « Il faut savoir qu'il ne reporte que les avis S, D et NC, donc, si une
 * >   remarque est écrite cela veut dire qu'il y a un problème. »
 *
 * Un rapport final ne porte pas la table de légende qu'une fiche d'avis de
 * travaux porte : il n'y relève que ce qui ne va pas. La marque restait donc
 * orpheline, et la teneur vide.
 *
 * Mais `S`, `D` et `NC` ne sont pas des lettres propres à un rapport : ce sont
 * les marques du métier, et elles disent la même chose partout. Les connaître
 * **quand la légende se tait** rend sa teneur à l'avis sans rien inventer —
 * et la légende, quand elle existe, reste l'autorité.
 *
 * ## Il est pur
 *
 * Un avis entre, un couple et un verdict sortent.
 */

import { leSensDeLaMarque } from "./la-lecture-dun-rapport.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les marques du métier, et ce qu'elles disent **quand la légende se tait**.
 *
 * ## Pourquoi on s'autorise à les connaître
 *
 * Elles ne sont pas une convention de ce rapport-ci : ce sont celles de tous les
 * bureaux de contrôle. `S` suspend, `D` défavorise, `NC` constate une non
 * conformité — et aucune n'est une bonne nouvelle.
 *
 * ## Pourquoi la légende passe quand même avant
 *
 * Parce qu'un rapport qui déclare sa table **est** l'autorité sur ses propres
 * marques : s'il écrit que `D` veut dire « document reçu », c'est cela qu'il
 * veut dire, et notre vocabulaire aurait tort. On ne descend ici qu'après avoir
 * cherché là-bas, et seulement quand on n'a rien trouvé (règle 5).
 */
export const LES_MARQUES_DU_METIER = {
  S: "suspendu",
  D: "défavorable",
  NC: "non conforme",
  SO: "sans objet",
  F: "favorable"
};

/**
 * Celles qui disent qu'il y a un problème.
 *
 * Nommées séparément parce que c'est ce qui compte à l'écran : un rapport final
 * n'en porte **que** de celles-là, et l'écran doit pouvoir le dire en une
 * phrase plutôt qu'avis par avis.
 */
export const LES_MARQUES_DEFAVORABLES = ["S", "D", "NC"];

/** Une marque, telle qu'on la compare : en capitales, sans espace. */
export function laMarqueNormalisee(marque) {
  return texte(marque).toLocaleUpperCase("fr-FR").replace(/\s+/g, "");
}

/**
 * La teneur d'un avis : ce que le bureau a tranché.
 *
 * L'ordre est celui de l'autorité : **ce que l'avis déclare**, puis **ce que la
 * légende de ce rapport-là dit de sa marque**, puis **ce que la marque veut dire
 * dans le métier**. `""` quand les trois se taisent — et c'est une réponse, pas
 * un défaut : un avis sans verdict est un avis que le rapport n'a pas tranché.
 */
export function laTeneurDunAvis(avis = null, legende = null) {
  const declaree = texte(avis?.opinion_label)
    || texte(avis?.value?.opinion_raw)
    || texte(avis?.opinion_raw)
    || texte(avis?.teneur_libelle);
  if (declaree) return declaree;

  const marque = texte(avis?.marque) || texte(avis?.teneur);
  if (!marque) return "";

  return texte(leSensDeLaMarque(marque, legende))
    || texte(LES_MARQUES_DU_METIER[laMarqueNormalisee(marque)]);
}

/**
 * Le couple sans lequel un avis ne vaut rien : **ce qui a été vérifié**, et **ce
 * que le bureau en a écrit**.
 *
 * Les deux formes se lisent, et c'est le même prix que `unAvisReleve` a déjà
 * payé une fois : une fonction de bord et un navigateur ne se déploient pas à la
 * même seconde, et les analyses gelées d'hier portent la forme d'hier.
 */
export function leCoupleDunAvis(avis = null) {
  return {
    /** Ce qui a été examiné, tel que le document l'écrit. */
    objet: texte(avis?.intitule)
      || texte(avis?.title_raw)
      || texte(avis?.titre),
    /** Ce que le bureau a écrit en plus du verdict — la remarque de contrôle. */
    remarque: texte(avis?.constat)
      || texte(avis?.description_raw)
      || texte(avis?.commentaire)
  };
}

/** Ce qui manque à un avis pour valoir d'être versé. */
export const SANS_LE_COUPLE =
  "cet avis ne porte ni ce qui a été vérifié ni ce que le bureau en a écrit : "
  + "versé, il ne dirait qu'un numéro et une page";

/**
 * Cet avis vaut-il d'être versé en mémoire ?
 *
 * ## Le couple, et rien d'autre
 *
 * Un numéro ne suffit pas, une page ne suffit pas, une teneur seule ne suffit
 * pas : « n° 245 = défavorable » ne dit toujours pas **sur quoi**. Il faut
 * **l'objet ou la remarque** — l'un des deux dit ce dont il s'agit, et c'est le
 * minimum pour qu'on puisse revenir au document et vérifier.
 *
 * ## Pourquoi « ou », et non « et »
 *
 * Parce que les deux portent la chose, chacun à sa façon. Un avis qui dit
 * « Conformité des installations aux normes » sans remarque reste utilisable :
 * on sait ce qui a été examiné. Un avis qui dit « Les notices techniques sont à
 * nous transmettre » sans intitulé l'est aussi : la remarque **est** l'objet.
 * Exiger les deux jetterait des avis qui valent quelque chose, et le but n'est
 * pas de jeter — c'est de ne pas verser ce qui ne dit rien.
 *
 * @returns {{vaut: boolean, pourquoi: string}}
 */
export function unAvisVautDetreVerse(avis = null) {
  const { objet, remarque } = leCoupleDunAvis(avis);
  return objet || remarque
    ? { vaut: true, pourquoi: "" }
    : { vaut: false, pourquoi: SANS_LE_COUPLE };
}

/**
 * Ce que l'écran dit des avis laissés dehors.
 *
 * **Ils se comptent et se disent**, toujours. Les jeter en silence serait le
 * défaut inverse de celui qu'on corrige : on croirait que le rapport n'en porte
 * que douze alors qu'il en porte vingt, et l'on ne chercherait jamais les huit
 * autres (règle 5).
 */
export function ceQueLesAvisSansCoupleDisent(combien = 0) {
  const laisses = Number(combien) || 0;
  if (laisses <= 0) return "";

  return `${laisses} avis ${laisses > 1 ? "ne sont pas proposés" : "n'est pas proposé"} `
    + "à la mémoire : le relevé n'en a retenu ni l'objet ni la remarque, et un "
    + "numéro de page n'est pas une donnée. "
    + `${laisses > 1 ? "Ils restent" : "Il reste"} dans l'analyse, où on les lit.`;
}
