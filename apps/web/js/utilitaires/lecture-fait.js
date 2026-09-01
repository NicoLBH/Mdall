/**
 * Ce que tout utilitaire lit d'un fait de contexte, de la même façon.
 *
 * Outil partagé, pas utilitaire — d'où le nom en tirets.
 *
 * Une règle unique le gouverne : **un fait qui ne dit pas sur quoi il a été
 * calculé est déclaré inconnu, pas sûr.** C'est le cas de tous ceux écrits avant
 * qu'on conserve les entrées ; les prendre pour certains rendrait une confiance
 * inventée, ce qu'on est précisément en train de corriger.
 */

import { RESERVE } from "./reserves.js";

/** Les entrées conservées par le producteur du fait, ou `null` si aucune. */
export function entreesDe(fait = {}) {
  const entrees = fait?.fact_value?.inputs;
  return entrees && typeof entrees === "object" ? entrees : null;
}

/**
 * Les réserves que le producteur a nommées, comme un ensemble modifiable.
 *
 * Sans entrées ni réserves, l'ignorance est nommée plutôt que tue.
 */
export function reservesConservees(fait = {}) {
  const brutes = fait?.fact_value?.reserves;
  const nommees = Array.isArray(brutes) ? brutes.map((code) => String(code ?? "").trim()).filter(Boolean) : [];

  if (!entreesDe(fait) && nommees.length === 0) return new Set([RESERVE.ENTREES_INCONNUES]);
  return new Set(nommees);
}
