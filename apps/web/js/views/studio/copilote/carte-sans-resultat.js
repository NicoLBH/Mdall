/**
 * Ce qu'un agent affiche quand il n'a pas conclu.
 *
 * ## Une question n'est pas une panne
 *
 * « Il faut dire ce qu'on change » est ce qu'un agent **demande** ; « cette
 * adresse n'a pas été trouvée » est ce qui a **échoué**. Les deux sortaient dans
 * le même cadre rouge, celui de l'alarme.
 *
 * Le coût se voit le jour où l'agent n'aurait pas dû être appelé du tout : on
 * demande « ouvre-moi le copilote de tel projet », le modèle se trompe d'agent,
 * et l'on se retrouve avec un encadré rouge au milieu d'une réponse qui, elle,
 * s'est bien passée. On cherche la panne, il n'y en a pas, et la peur reste
 * après qu'on a compris.
 *
 * Le rouge est donc réservé à ce qui a vraiment échoué. Une demande de précision
 * porte le ton du doute : elle se remarque, elle n'inquiète pas.
 *
 * ## Pourquoi un fichier à part
 *
 * L'écran du Copilote parle à la base, et un module qui parle à la base ne
 * s'importe pas dans un test : l'import lève avant la première ligne. Cette
 * carte, elle, n'a besoin que d'un statut et d'une phrase — et c'est exactement
 * ce qu'il faut pouvoir vérifier.
 */

import { escapeHtml } from "../../../utils/escape-html.js";

/**
 * Le statut d'un agent qui pose une question plutôt que de tomber en panne.
 *
 * Un nom, à un seul endroit : il est écrit par `services/copilote-variante.js`
 * et relu ici, et deux chaînes recopiées finiraient par ne plus se répondre
 * (`docs/fondamentaux.md`, règle 10).
 */
export const STATUT_MANQUE = "manque";

/** Vrai quand l'agent demande une précision, faux quand il a échoué. */
export function estUneQuestion(execution) {
  return execution?.statut === STATUT_MANQUE;
}

/**
 * La carte d'un agent qui n'a rien conclu.
 *
 * @param {object} execution ce que l'agent a rendu
 * @param {string} [chaine] le dépliant de ce qui a été calculé, déjà rendu —
 *   il vient de l'écran, qui seul sait le dessiner.
 */
export function renderCarteSansResultat(execution = null, chaine = "") {
  if (!execution) return "";

  const ton = estUneQuestion(execution) ? "copilote-outil--manque" : "copilote-outil--refus";

  return `
    <div class="copilote-outil ${ton}">
      <p class="copilote-outil__titre">${escapeHtml(execution?.titre || "Agent")}</p>
      <p class="copilote-outil__note">${escapeHtml(execution?.message || "L'agent n'a pas conclu.")}</p>
      ${chaine}
    </div>
  `;
}
