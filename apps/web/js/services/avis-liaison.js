/**
 * Sur quoi porte un avis de bureau de contrôle.
 *
 * ## Ce que ce fichier décide, et ce qu'il refuse de décider
 *
 * Un rapport de contrôle technique rend des avis : « 2.1.3 — Zone de neige —
 * Favorable ». Le moteur d'extraction sait les lire depuis longtemps
 * (`services/ct-lab-engine.js`). Ce qu'il ne sait pas dire, c'est **de quelle
 * valeur du projet cet avis parle** — et sans ce lien, l'avis reste une ligne
 * dans un tableau, qui ne tombe jamais quand la valeur change.
 *
 * Ce module propose le lien. Il ne le pose pas : il le **propose**, et
 * quelqu'un signe.
 *
 * ## Pourquoi il refuse plus souvent qu'il n'accepte
 *
 * Un avis mal accroché est **pire** qu'un avis non accroché. Non accroché, il
 * manque — on le voit, on le cherche. Mal accroché, il couvre une valeur que
 * personne n'a examinée, et il la couvre en silence : la variante dira « ceci
 * est couvert par un avis favorable » sur une valeur que le bureau de contrôle
 * n'a jamais regardée. C'est la seule façon de rendre tout ce mécanisme
 * dangereux.
 *
 * D'où la règle : **on ne propose que ce dont on est sûr**. Un titre d'avis qui
 * nomme exactement un sujet de la mémoire, ou rien. Pas de distance de
 * Levenshtein, pas de « à peu près », pas de premier de la liste. Ce qui n'est
 * pas reconnu se dit non reconnu (règle 5), et quelqu'un fera le lien à la main
 * s'il le veut.
 *
 * ## Ce qu'il ne regarde pas : l'avis lui-même
 *
 * Favorable, suspendu, avec observation : ce module s'en moque. Il dit **sur
 * quoi** l'avis porte, jamais ce qu'il vaut. Mêler les deux ferait qu'un avis
 * défavorable ne s'accrocherait pas — alors que c'est celui-là qu'on veut voir
 * tomber quand la valeur change.
 */

import { cleDuSujet } from "./memoire-identifiants.js";
import { aplati } from "./recherche-de-valeur.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Pourquoi un avis s'accroche, ou ne s'accroche pas.
 *
 * Nommés et non rédigés : c'est l'écran qui écrit la phrase, et un motif se dit
 * autrement dans une proposition que dans un tableau.
 */
export const LIAISON = {
  /** Le titre de l'avis nomme exactement un sujet de la mémoire. */
  PAR_LE_SUJET: "par-le-sujet",
  /** Rien dans la mémoire ne porte ce nom. */
  SANS_SUJET: "sans-sujet",
  /** Plusieurs valeurs portent ce nom, et rien ne les départage. */
  PLUSIEURS: "plusieurs",
  /** L'avis n'a pas d'intitulé : il n'y a rien à reconnaître. */
  SANS_INTITULE: "sans-intitule"
};

const PHRASES = {
  [LIAISON.PAR_LE_SUJET]: "son intitulé nomme cette valeur",
  [LIAISON.SANS_SUJET]: "aucune valeur de la mémoire ne porte ce nom",
  [LIAISON.PLUSIEURS]: "plusieurs valeurs portent ce nom : il faut dire laquelle",
  [LIAISON.SANS_INTITULE]: "cet avis n'a pas d'intitulé : il n'y a rien à reconnaître"
};

/** La phrase d'un motif. Un motif sans phrase se lit comme un code d'erreur. */
export function phraseDeLaLiaison(motif) {
  return PHRASES[texte(motif)] ?? "";
}

/**
 * Ce qu'un avis donne à reconnaître.
 *
 * Son intitulé d'abord — c'est lui qui nomme ce que le contrôleur a regardé.
 * Sa description ensuite, quand il n'y a pas d'intitulé : certains rapports
 * n'en portent pas, et la phrase du commentaire est alors tout ce qu'on a.
 *
 * **Pas la référence** (« 2.1.3 ») : elle numérote une place dans le rapport,
 * elle ne nomme rien du projet. Deux rapports du même organisme ne la donnent
 * même pas au même chapitre.
 */
export function intituleDeLAvis(avis = null) {
  return texte(avis?.title_raw)
    || texte(avis?.titre)
    || texte(avis?.description_raw)
    || texte(avis?.commentaire);
}

/**
 * Les sujets de la mémoire, par leur nom aplati.
 *
 * Une clé par sujet, et la liste des affirmations **en vigueur** qui le
 * portent. Plusieurs, c'est le cas des valeurs par zone : « Zone de neige,
 * bâtiment A » et « Zone de neige, bâtiment B » sont deux affirmations d'un
 * même sujet, et rien dans l'intitulé d'un avis ne dit laquelle.
 */
function sujetsDeLaMemoire(assertions = []) {
  const parSujet = new Map();

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (texte(assertion?.superseded_by)) continue;

    const sujet = texte(assertion?.payload?.subject);
    if (!sujet) continue;

    const cle = cleDuSujet(sujet);
    if (!parSujet.has(cle)) parSujet.set(cle, []);
    parSujet.get(cle).push(assertion);
  }

  return parSujet;
}

/**
 * Sur quelle affirmation cet avis porte, ou pourquoi on ne le dit pas.
 *
 * ## La reconnaissance est **exacte**, et c'est voulu
 *
 * L'intitulé de l'avis doit contenir le nom d'un sujet de la mémoire, en entier
 * et sur des mots entiers. « Zone de neige et de vent » reconnaît « Zone de
 * neige » ; « Zonage » ne reconnaît rien. C'est volontairement strict : un
 * rapprochement approché accrocherait un jour « Classe de sol » sur « Classe du
 * bâtiment », et personne ne s'en apercevrait avant qu'un avis ne couvre la
 * mauvaise valeur.
 *
 * Quand deux sujets sont reconnus dans le même intitulé, c'est le **plus long**
 * qui l'emporte : « Zone de neige » bat « Zone », parce qu'il dit plus.
 *
 * @param {object} avis l'avis lu dans le rapport
 * @param {object[]} assertions la mémoire du projet
 * @returns {{assertion: object|null, motif: string, candidats: string[]}}
 */
export function liaisonDeLAvis({ avis = null, assertions = [] } = {}) {
  const intitule = aplati(intituleDeLAvis(avis));
  if (!intitule) return { assertion: null, motif: LIAISON.SANS_INTITULE, candidats: [] };

  const parSujet = sujetsDeLaMemoire(assertions);

  // Les sujets que l'intitulé nomme, du plus précis au moins précis.
  const reconnus = [...parSujet.keys()]
    .filter((cle) => nommeEntierement(intitule, cle))
    .sort((gauche, droite) => droite.length - gauche.length);

  if (!reconnus.length) return { assertion: null, motif: LIAISON.SANS_SUJET, candidats: [] };

  const portees = parSujet.get(reconnus[0]) ?? [];

  // Un sujet porté par plusieurs affirmations — une par zone — ne se départage
  // pas depuis un intitulé de rapport. On le dit plutôt que d'en choisir une.
  if (portees.length > 1) {
    return {
      assertion: null,
      motif: LIAISON.PLUSIEURS,
      candidats: portees.map((portee) => texte(portee?.id)).filter(Boolean)
    };
  }

  return { assertion: portees[0] ?? null, motif: LIAISON.PAR_LE_SUJET, candidats: [] };
}

/**
 * Vrai quand l'intitulé contient ce nom, **sur des mots entiers**.
 *
 * `includes` seul reconnaîtrait « sol » dans « solive » et « vent » dans
 * « éventuel ». La frontière se vérifie donc des deux côtés : ce qui précède et
 * ce qui suit doit être autre chose qu'une lettre ou un chiffre.
 */
export function nommeEntierement(intitule, nom) {
  if (!nom) return false;

  let depuis = 0;
  for (;;) {
    const trouve = intitule.indexOf(nom, depuis);
    if (trouve === -1) return false;

    const avant = trouve === 0 ? "" : intitule[trouve - 1];
    const apres = intitule[trouve + nom.length] ?? "";
    if (!/[a-z0-9]/.test(avant) && !/[a-z0-9]/.test(apres)) return true;

    depuis = trouve + 1;
  }
}

/**
 * Les liaisons proposées pour un lot d'avis, chacune avec son sort.
 *
 * Rend **tous** les avis, y compris ceux qu'on n'a pas su accrocher : c'est la
 * liste que quelqu'un relit avant de signer, et un avis escamoté parce qu'on ne
 * savait pas quoi en faire serait exactement ce qu'on ne veut pas.
 */
export function liaisonsProposees({ avis = [], assertions = [] } = {}) {
  return (Array.isArray(avis) ? avis : []).map((entree) => ({
    avis: entree,
    intitule: intituleDeLAvis(entree),
    ...liaisonDeLAvis({ avis: entree, assertions })
  }));
}
