/**
 * Le fil de la discussion : retrouver le message dont la réflexion reprend.
 *
 * ## Pourquoi ce n'est pas trivial
 *
 * Quand le copilote bute sur une valeur qu'il ne peut pas inventer, il pose la
 * question **dans son message** : un formulaire, ou des pastilles. On y répond,
 * le calcul a lieu, et la réponse doit revenir **au même endroit** — il n'y a
 * qu'un raisonnement, interrompu par une question.
 *
 * Ouvrir un second message racontait deux réponses là où il n'y en a qu'une :
 * la question dans l'une, le tableau dans l'autre, et la relecture n'avait plus
 * de sens. C'est le défaut qui revenait ; il revenait parce que la recherche
 * pouvait échouer, et qu'à défaut on ouvrait.
 *
 * ## Trois façons de le retrouver, et aucune qui ouvre
 *
 * Le rang que le formulaire porte est le plus sûr : c'est le message qui a posé
 * la question. Faute de rang — un geste qui n'en transporte pas, un fil rechargé
 * depuis la base qui a perdu ses calculs —, on cherche la demande restée
 * ouverte, puis le dernier message qui porte un calcul, puis **le dernier
 * message du copilote**.
 *
 * Ce dernier repli est le point de ce fichier. On n'arrive jamais ici sans que
 * le copilote ait parlé : c'est à lui qu'on répond. Reprendre son dernier
 * message est donc toujours plus juste que d'en ouvrir un second, quelle que
 * soit la raison pour laquelle le rang s'est perdu.
 */

/**
 * @param {Array} messages le fil, dans l'ordre
 * @param {number|null} rang le rang que le formulaire portait, s'il en portait un
 * @returns {object|null} le message à reprendre, ou `null` si le copilote n'a jamais parlé
 */
export function messageQuiADemande(messages = [], rang = null) {
  const fil = Array.isArray(messages) ? messages : [];

  // Un rang qui désigne un message de l'utilisateur n'est pas le bon : on ne
  // reprend pas la question de quelqu'un pour y écrire une réponse.
  if (Number.isInteger(rang) && fil[rang]?.role === "assistant") return fil[rang];

  const ouverte = fil.findLast((message) => (message?.executions ?? [])
    .some((execution) => execution?.statut === "manquant" || execution?.statut === "aConfirmer"));
  if (ouverte) return ouverte;

  return fil.findLast((message) => (message?.executions ?? []).length > 0)
    ?? fil.findLast((message) => message?.role === "assistant")
    ?? null;
}
