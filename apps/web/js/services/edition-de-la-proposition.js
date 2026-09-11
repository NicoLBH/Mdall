/**
 * Modifier le titre et la description d'une proposition.
 *
 * ## Pourquoi cela existait déjà partout ailleurs
 *
 * Un sujet se corrige : son titre s'édite d'un bouton « Modifier », sa
 * description d'un crayon dans l'en-tête du premier message. Une proposition
 * n'avait ni l'un ni l'autre, alors qu'elle en a le même besoin — on se relit,
 * on s'aperçoit qu'on a écrit « lot 4 » pour le lot 5, et la page suivante
 * dépend de ce mot.
 *
 * Les deux écrans font donc le même geste, avec les mêmes boutons aux mêmes
 * endroits. Deux gestes différents pour une même chose s'apprennent deux fois,
 * et divergent au premier ajustement.
 *
 * ## Ce qui se modifie, et jusqu'à quand
 *
 * **Tant que la proposition est ouverte, et pas après.** Une fois fusionnée ou
 * fermée, son titre est celui sous lequel les décisions ont été prises : le
 * réécrire ferait mentir la trace de la fusion sur ce que les gens avaient
 * devant les yeux quand ils ont tranché. Un constat ne devient jamais faux
 * (règle 6) — et ce qui a été décidé non plus.
 *
 * C'est la seule différence avec un sujet, et elle se voit : les boutons ne
 * sont simplement pas là.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Il n'écrit rien. Il dit ce qui est modifiable, ce qu'un brouillon vaut, et ce
 * qu'il faudrait envoyer — l'aller-retour avec la base vit ailleurs. C'est ce
 * qui le rend vérifiable sans base de données.
 */

import { PROPOSITION } from "./proposition-state.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qui est en cours de modification, et rien d'autre. */
export const QUOI = {
  RIEN: "",
  TITRE: "titre",
  DESCRIPTION: "description"
};

/**
 * Une proposition ouverte se corrige ; une proposition tranchée, non.
 *
 * @param {object} proposition
 * @returns {boolean}
 */
export function modifiable(proposition = null) {
  return !!proposition && texte(proposition.status) === PROPOSITION.OPEN;
}

/**
 * L'état au repos : rien en cours.
 *
 * `apercu` est l'onglet « Écrire / Aperçu » de la description, et il est **à
 * elle**. Le partager avec celui du composeur de messages ferait basculer les
 * deux d'un seul clic, et l'on relirait son message en croyant relire sa
 * description (règle 4).
 */
export function aucuneEdition() {
  return { quoi: QUOI.RIEN, brouillon: "", enregistre: false, erreur: "", apercu: false };
}

/**
 * Ouvrir la modification du titre ou de la description.
 *
 * Le brouillon part de ce qui est écrit : on corrige un texte, on ne le
 * retape pas.
 *
 * @returns {{quoi: string, brouillon: string, enregistre: boolean, erreur: string}}
 *   l'état au repos si la proposition n'est plus modifiable — le refus se voit
 *   alors par l'absence d'éditeur, pas par un message.
 */
export function ouvrirLEdition(proposition, quoi) {
  if (!modifiable(proposition)) return aucuneEdition();

  if (quoi === QUOI.TITRE) {
    return { quoi: QUOI.TITRE, brouillon: String(proposition.title ?? ""), enregistre: false, erreur: "", apercu: false };
  }
  if (quoi === QUOI.DESCRIPTION) {
    return { quoi: QUOI.DESCRIPTION, brouillon: String(proposition.description ?? ""), enregistre: false, erreur: "", apercu: false };
  }

  return aucuneEdition();
}

/**
 * Ce que l'enregistrement enverrait, ou `null` s'il n'y a rien à envoyer.
 *
 * **Un titre ne peut pas devenir vide** : c'est le nom de la proposition dans
 * toutes les listes, et une ligne sans nom ne se retrouve pas. Une description,
 * en revanche, peut être retirée — elle n'était pas obligatoire à l'ouverture,
 * et l'exiger maintenant serait la réclamer après coup (règle 12).
 *
 * Un texte inchangé ne s'envoie pas : une écriture qui ne change rien ferait
 * quand même bouger `updated_at`, et la proposition remonterait en tête des
 * listes sans que rien n'ait bougé.
 *
 * @returns {{title: string}|{description: string|null}|null}
 */
export function ceQuiChange(etat = {}, proposition = null) {
  if (!modifiable(proposition)) return null;

  if (etat.quoi === QUOI.TITRE) {
    const voulu = texte(etat.brouillon);
    if (!voulu) return null;
    if (voulu === texte(proposition.title)) return null;
    return { title: voulu };
  }

  if (etat.quoi === QUOI.DESCRIPTION) {
    const voulu = texte(etat.brouillon);
    if (voulu === texte(proposition.description)) return null;
    // `null` et non `""` : la base distingue « pas de description » d'une
    // description vide, et deux façons d'être vide finissent par diverger.
    return { description: voulu || null };
  }

  return null;
}

/** Le bouton « Enregistrer » est-il actif ? */
export function peutEnregistrer(etat = {}, proposition = null) {
  return !etat.enregistre && ceQuiChange(etat, proposition) !== null;
}

/**
 * Ce que l'écran dit quand l'enregistrement a échoué.
 *
 * Le brouillon **reste** : perdre le texte de quelqu'un parce que le réseau a
 * hésité est la faute qu'on ne rattrape pas.
 */
export function echecDeLEnregistrement(etat = {}) {
  return {
    ...etat,
    enregistre: false,
    erreur: "L'enregistrement a échoué. Le texte est conservé — réessayez."
  };
}
