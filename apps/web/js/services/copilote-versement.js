/**
 * Ce qu'une conversation peut proposer à la mémoire du projet.
 *
 * ## Le défaut que ça répare
 *
 * Un agent s'arrête faute d'une valeur, l'écran la demande, quelqu'un la donne,
 * le calcul a lieu. Et puis **rien** : la réponse part, la valeur reste dans la
 * conversation, et la question se repose à la discussion suivante. On retape la
 * contrainte de sol, le régime de sécurité incendie, la classe de sol, autant de
 * fois qu'on ouvre une discussion — et la troisième saisie diverge de la
 * première.
 *
 * ## Proposer, jamais verser
 *
 * Ce fichier **prépare**. Il n'écrit rien dans la mémoire, et aucun chemin d'ici
 * n'y mène : il assemble une proposition **ouverte**, que quelqu'un relira et
 * signera — ou pas (`docs/fondamentaux.md`, règle 1). Une réponse de formulaire
 * écrite en douce serait une valeur de projet sans auteur, c'est-à-dire
 * exactement ce que la mémoire existe pour empêcher.
 *
 * C'est aussi pourquoi la provenance est une **décision** : quelqu'un a tranché,
 * dans une conversation, à une date. Pas un calcul, pas une règle — une personne.
 *
 * ## Le nom doit mener à la clé
 *
 * La proposition range un sujet sous `normalizeSubjectKey(sujet)` ; l'agent, lui,
 * relit sous la clé qu'il déclare. Quand les deux ne coïncident pas, la valeur
 * entre en mémoire **et la question se repose quand même** — le projet s'enrichit
 * d'un sujet que personne ne relit.
 *
 * On ne propose donc que ce dont le nom mène à la clé, et l'on **nomme** le
 * reste : une valeur qu'on écarte en silence se lit comme une valeur qui n'avait
 * rien à donner (règle 5).
 */

import { normalizeSubjectKey } from "./project-memory.js";
import { NATURE } from "./assertion-taxonomy.js";
import { PROVENANCE, STATUT } from "./memoire-en-texte.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qu'une exécution donne à proposer, et ce qu'elle ne peut pas.
 *
 * @param {object} execution ce que l'agent a rendu, son champ `aVerser` compris
 * @param {object} [options]
 * @param {string} [options.par] qui a répondu
 * @param {string} [options.le] quand, en ISO
 * @returns {{affirmations: object[], sansRetour: string[]}}
 */
export function aProposerDeLaConversation(execution, { par = "", le = "" } = {}) {
  const versables = Array.isArray(execution?.aVerser) ? execution.aVerser : [];
  const quand = texte(le) || new Date().toISOString();

  const affirmations = [];
  const sansRetour = [];

  for (const versable of versables) {
    const sujet = texte(versable?.sujet);
    const valeur = texte(versable?.valeur);
    const cle = texte(versable?.cle);
    if (!sujet || !valeur || !cle) continue;

    // Le nom doit mener à la clé que l'agent relit, sinon la question se repose
    // sur une mémoire pourtant enrichie.
    if (normalizeSubjectKey(sujet) !== cle) {
      sansRetour.push(sujet);
      continue;
    }

    affirmations.push({
      sujet,
      // L'unité colle à la valeur : « 24,5 » et « 24,5 m » ne se relisent pas
      // pareil, et c'est la seconde que la mémoire doit porter.
      valeur: versable.unite ? `${valeur} ${texte(versable.unite)}` : valeur,
      // Une variable du projet, pas une exigence : c'est un nom que d'autres
      // citeront.
      nature: NATURE.DONNEE_BASE,
      quoi: texte(versable?.quoi),
      provenance: {
        type: PROVENANCE.DECISION,
        quoi: `répondu dans une discussion avec le Copilote${
          texte(execution?.titre) ? `, pour « ${texte(execution.titre)} »` : ""}`,
        ...(texte(par) ? { par: texte(par) } : {}),
        le: quand
      },
      statut: STATUT.RETENU,
      // **Sans portée : l'ouvrage entier.** Personne n'a désigné de zone en
      // répondant à la question, et en choisir une à sa place poserait la valeur
      // là où elle n'a pas été dite. Si le projet en porte une qui diffère, la
      // lecture par portée le verra et reposera la question.
      zones: []
    });
  }

  return { affirmations, sansRetour };
}

/** Ce que la proposition emportera, en une phrase. */
export function phraseDeLaProposition(affirmations = []) {
  const combien = Array.isArray(affirmations) ? affirmations.length : 0;
  if (!combien) return "";

  return combien === 1
    ? `Proposer « ${affirmations[0].sujet} » au projet`
    : `Proposer ${combien} valeurs au projet`;
}

/**
 * Ce qu'on dit d'une valeur qu'on ne sait pas ranger.
 *
 * Elle a servi au calcul, elle est juste, et le projet ne la gardera pas. Le
 * taire ferait croire qu'il n'y avait rien à retenir.
 */
export function phraseDesSansRetour(sansRetour = []) {
  const dits = Array.isArray(sansRetour) ? sansRetour.filter(Boolean) : [];
  if (!dits.length) return "";

  return `${dits.join(", ")} ${dits.length > 1 ? "ne se rangent" : "ne se range"} `
    + "sous aucun nom que les agents relisent : "
    + `${dits.length > 1 ? "elles restent" : "elle reste"} dans la conversation.`;
}
