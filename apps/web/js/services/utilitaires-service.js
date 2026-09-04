/**
 * La porte vers les utilitaires de l'Atelier.
 *
 * ## Ce que ce fichier remplace
 *
 * Il y avait ici un catalogue de mille sept cents lignes : les utilitaires, les
 * phrases qui décident quand le modèle les appelle, l'enchaînement de l'un à
 * l'autre, la recherche déterministe des cotes, la correspondance des cas de
 * charge. Tout cela était servi au navigateur et lisible avec F12 — on protégeait
 * l'arithmétique et l'on publiait la méthode.
 *
 * Il n'en reste que ceci : poser la question sous notre identité, et rapporter
 * la réponse. Le navigateur ne sait plus quels utilitaires existent ; il sait
 * seulement afficher ce qu'on lui rend.
 *
 * ## Ce que la réponse contient, et pourquoi cela suffit
 *
 * Un formulaire qui demande une valeur manquante se construit depuis les champs
 * de la réponse — un intitulé, une unité, une aide, des choix. Ce sont les mots
 * qu'on lit à l'écran ; le catalogue qui les produit reste au serveur.
 *
 * La réponse porte aussi ce qui part au modèle (`pourLeModele`, allégé des
 * figures et du détail des massifs) : c'est le serveur qui l'allège, puisque
 * c'est lui qui sait ce qui compte.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const URL_FONCTION = `${getSupabaseUrl()}/functions/v1/executer-utilitaire`;

/**
 * Exécuter un utilitaire, ou savoir pourquoi il ne s'est pas exécuté.
 *
 * @returns {Promise<{resultat: object, etapes: Array, pourLeModele: object}>}
 */
export async function executerUtilitaire({
  id = "",
  entrees = {},
  assertions = [],
  question = "",
  confirmees = [],
  piecesJointes = [],
  acquises = {},
  signal = null
} = {}) {
  const reponse = await fetch(URL_FONCTION, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
    cache: "no-store",
    signal,
    body: JSON.stringify({ id, entrees, assertions, question, confirmees, piecesJointes, acquises })
  });

  const brut = await reponse.text().catch(() => "");
  let charge = null;
  try { charge = brut ? JSON.parse(brut) : null; } catch { charge = null; }

  if (!reponse.ok) {
    throw new Error(charge?.error || `L'utilitaire n'a pas répondu (HTTP ${reponse.status}).`);
  }
  if (!charge?.resultat) throw new Error("L'utilitaire a répondu, mais sans résultat.");

  return {
    resultat: charge.resultat,
    etapes: Array.isArray(charge.etapes) ? charge.etapes : [],
    pourLeModele: charge.pourLeModele ?? charge.resultat
  };
}

/**
 * Ce qu'une conversation garde d'un résultat, d'un tour à l'autre.
 *
 * La contrainte admissible du sol et la cote hors gel sont des **décisions** :
 * on les prend une fois, elles valent pour toute la discussion. Les redemander
 * à chaque question ferait retaper quatre fois la même chose.
 *
 * Le tri — ce qui se garde, ce qui ne se garde pas — appartient au catalogue,
 * donc au serveur : il le met dans le résultat sous `aRetenir`, et l'écran
 * n'a plus qu'à s'en souvenir.
 */
export function aRetenirDuResultat(resultat) {
  const garde = resultat?.aRetenir;
  return garde && typeof garde === "object" ? garde : {};
}
