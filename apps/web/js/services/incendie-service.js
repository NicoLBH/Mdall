/**
 * La porte vers le référentiel « Incendie — Habitation ».
 *
 * Le raisonnement n'est pas ici : il tourne côté serveur, dans la fonction
 * `incendie-habitation`. Ce fichier ne connaît aucun article, aucune famille,
 * aucun degré coupe-feu — il sait poser la question sous notre identité et
 * rapporter la réponse.
 *
 * C'est délibéré, et c'est le cœur du dispositif. Le référentiel est public ;
 * son dépouillement — le découpage de chaque phrase en conditions élémentaires,
 * leur ordre, les conditions implicites qu'une longue phrase transporte — ne
 * l'est pas. Un moteur embarqué dans la page serait lisible par quiconque
 * ouvre les outils de développement.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const URL_FONCTION = `${getSupabaseUrl()}/functions/v1/incendie-habitation`;

async function appeler(corps, { signal } = {}) {
  const reponse = await fetch(URL_FONCTION, {
    method: "POST",
    headers: { ...(await buildSupabaseAuthHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(corps),
    signal
  });

  const texte = await reponse.text().catch(() => "");
  let charge = null;
  try { charge = texte ? JSON.parse(texte) : null; } catch { charge = null; }

  if (!reponse.ok) throw new Error(charge?.error || `Le référentiel n'a pas répondu (HTTP ${reponse.status}).`);
  if (!charge) throw new Error("Le serveur n'a rien renvoyé à afficher.");
  return charge;
}

/**
 * Une réponse a-t-elle la forme qu'on attend ?
 *
 * Un écran qui fait confiance à ce qui lui revient tombe sur la première
 * réponse inattendue — une redirection, un proxy qui répond `[]`, une version
 * de fonction plus ancienne — et l'Atelier entier cesse de se dessiner. Mieux
 * vaut le dire que planter.
 */
function estUneConsultation(charge) {
  return Boolean(charge) && Array.isArray(charge.modules) && Array.isArray(charge.questions)
    && Boolean(charge.graphe) && Boolean(charge.avancement);
}

/**
 * Le raisonnement complet pour un cas : ce qui est conclu, ce qu'il reste à
 * demander, et la carte du graphe.
 */
export async function consulterIncendie(reponses = {}, options = {}) {
  const charge = await appeler({ reponses }, options);
  if (!estUneConsultation(charge)) {
    throw new Error("Le référentiel a répondu, mais pas ce qui était attendu.");
  }
  return charge;
}

/**
 * La réponse à une question précise — « quel est le degré coupe-feu des
 * planchers à respecter ? » — avec l'article, la phrase qui décide et le chemin
 * suivi. C'est la porte du copilote.
 */
export async function demanderIncendie(produit, reponses = {}, options = {}) {
  const charge = await appeler({ produit, reponses }, options);
  const rendu = charge.reponse ?? charge;
  if (!rendu || typeof rendu.ok !== "boolean") {
    throw new Error("Le référentiel a répondu, mais pas ce qui était attendu.");
  }
  return rendu;
}
