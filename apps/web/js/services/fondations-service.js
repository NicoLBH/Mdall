/**
 * La porte vers le calcul de fondation.
 *
 * Le calcul n'est pas ici : il tourne côté serveur, dans la fonction
 * `fondations-stabilite-externe`. Ce fichier ne sait ni pondérer ni combiner ;
 * il sait poser la question sous notre identité et rapporter la réponse.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { parPaquets } from "./paquets.js";
import {
  CAS_DE_CHARGE, COMPOSANTES, NAPPES, champsNumeriques, entreesInvalides
} from "../../vendor/utilitaires/fondations-declaration.js";

export * from "../../vendor/utilitaires/fondations-declaration.js";

const URL_FONCTION = `${getSupabaseUrl()}/functions/v1/fondations-stabilite-externe`;

function nombre(valeur) {
  if (valeur === "" || valeur === null || valeur === undefined) return null;
  const n = Number.parseFloat(String(valeur).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Les entrées d'une semelle, normalisées pour le serveur. */
function corpsDe(entrees) {
  const corps = { ...entrees };
  for (const champ of champsNumeriques()) corps[champ.cle] = nombre(entrees[champ.cle]);
  corps.charges = Object.fromEntries(CAS_DE_CHARGE.map((cas) => [cas.cle,
    Object.fromEntries(COMPOSANTES.map((c) => [c.cle, nombre(entrees.charges?.[cas.cle]?.[c.cle]) ?? 0]))]));
  corps.ferraillage = Object.fromEntries(NAPPES.map((nappe) => [nappe.cle, {
    nombre: nombre(entrees.ferraillage?.[nappe.cle]?.nombre) ?? 0,
    barre: String(entrees.ferraillage?.[nappe.cle]?.barre ?? "")
  }]));
  return corps;
}

/**
 * Combien de semelles au plus dans un même envoi.
 *
 * Le serveur en refuse davantage, et il a raison : chacune parcourt 388
 * combinaisons, et une requête sans plafond occuperait la fonction pendant que
 * les autres attendent. Le plafond est donc **la taille d'un envoi, pas la
 * taille d'un travail** — les confondre faisait refuser un pré-dimensionnement
 * de sept appuis, parce que la recherche essaie neuf cotes par appui et que
 * soixante-trois dépassent soixante. On ne demandait pas soixante-trois
 * massifs : on essayait soixante-trois fois.
 *
 * La valeur est celle du serveur. Une valeur écrite à deux endroits finit par
 * diverger — celle-ci ne peut que rester en deçà, et le commentaire dit
 * laquelle commande.
 */
export const SEMELLES_PAR_ENVOI = 60;

/**
 * Toutes les semelles d'une étude, en autant d'envois qu'il faut.
 *
 * Un projet en compte une vingtaine : les calculer une par une ferait vingt
 * allers-retours pour afficher un tableau, et le tableau apparaîtrait par
 * morceaux. Une semelle qui refuse de se calculer ne fait pas échouer les
 * autres — le tableau doit pouvoir montrer dix-neuf résultats et une erreur.
 *
 * Au-delà de ce qu'un envoi accepte, la liste se découpe et les résultats se
 * recollent **dans l'ordre demandé** : le rang d'une semelle dans la réponse
 * est celui de la semelle dans la question, sans quoi les cotes d'un appui
 * iraient à son voisin sans que rien ne le signale.
 *
 * Les paquets partent en même temps. Les envoyer l'un après l'autre ferait
 * attendre une recherche de sept appuis deux fois plus longtemps pour la même
 * dépense.
 */
export async function calculerLesSemelles(semelles = [], { signal } = {}) {
  if (semelles.length === 0) return [];

  return parPaquets(semelles, SEMELLES_PAR_ENVOI, (paquet) => envoyerUnPaquet(paquet, { signal }));
}

async function envoyerUnPaquet(semelles, { signal } = {}) {
  const reponse = await fetch(URL_FONCTION, {
    method: "POST",
    headers: { ...(await buildSupabaseAuthHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify({ semelles: semelles.map((semelle) => corpsDe(semelle.entrees ?? {})) }),
    signal
  });

  const texte_ = await reponse.text().catch(() => "");
  let charge = null;
  try { charge = texte_ ? JSON.parse(texte_) : null; } catch { charge = null; }

  if (!reponse.ok) throw new Error(charge?.error || `Le calcul a échoué (HTTP ${reponse.status}).`);
  if (!Array.isArray(charge?.resultats)) throw new Error("Le serveur n'a rien renvoyé à afficher.");
  return charge.resultats;
}

/** Le calcul, tel qu'il est fait : ailleurs, et sous notre identité. */
export async function calculerFondation(entrees, { signal } = {}) {
  const invalides = entreesInvalides(entrees);
  if (invalides.length) {
    const erreur = new Error(invalides[0].raison);
    erreur.invalides = invalides;
    throw erreur;
  }

  const corps = corpsDe(entrees);

  const reponse = await fetch(URL_FONCTION, {
    method: "POST",
    headers: { ...(await buildSupabaseAuthHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(corps),
    signal
  });

  const texte = await reponse.text().catch(() => "");
  let charge = null;
  try { charge = texte ? JSON.parse(texte) : null; } catch { charge = null; }

  if (!reponse.ok) {
    throw new Error(charge?.error || `Le calcul a échoué (HTTP ${reponse.status}).`);
  }
  if (!charge?.resultat) throw new Error("Le serveur n'a rien renvoyé à afficher.");
  return charge.resultat;
}
