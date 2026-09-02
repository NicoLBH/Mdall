/**
 * La porte vers le calcul de fondation.
 *
 * Le calcul n'est pas ici : il tourne côté serveur, dans la fonction
 * `fondations-stabilite-externe`. Ce fichier ne sait ni pondérer ni combiner ;
 * il sait poser la question sous notre identité et rapporter la réponse.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import {
  CAS_DE_CHARGE, COMPOSANTES, NAPPES, champsNumeriques, entreesInvalides
} from "./fondations-declaration.js";

export * from "./fondations-declaration.js";

const URL_FONCTION = `${getSupabaseUrl()}/functions/v1/fondations-stabilite-externe`;

function nombre(valeur) {
  if (valeur === "" || valeur === null || valeur === undefined) return null;
  const n = Number.parseFloat(String(valeur).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Le calcul, tel qu'il est fait : ailleurs, et sous notre identité. */
export async function calculerFondation(entrees, { signal } = {}) {
  const invalides = entreesInvalides(entrees);
  if (invalides.length) {
    const erreur = new Error(invalides[0].raison);
    erreur.invalides = invalides;
    throw erreur;
  }

  const corps = { ...entrees };
  for (const champ of champsNumeriques()) corps[champ.cle] = nombre(entrees[champ.cle]);
  corps.charges = Object.fromEntries(CAS_DE_CHARGE.map((cas) => [cas.cle,
    Object.fromEntries(COMPOSANTES.map((c) => [c.cle, nombre(entrees.charges?.[cas.cle]?.[c.cle]) ?? 0]))]));
  corps.ferraillage = Object.fromEntries(NAPPES.map((nappe) => [nappe.cle, {
    nombre: nombre(entrees.ferraillage?.[nappe.cle]?.nombre) ?? 0,
    barre: String(entrees.ferraillage?.[nappe.cle]?.barre ?? "")
  }]));

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
