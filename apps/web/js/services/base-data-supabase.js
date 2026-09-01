/**
 * Verser une donnée de base, sans en refaire l'histoire à chaque passage.
 *
 * L'adresse d'un projet est saisie une fois puis réenregistrée vingt fois — au
 * moindre aller-retour dans l'écran de localisation. Verser à chaque fois
 * donnerait un historique de vingt lignes identiques, où la seule chose qui
 * compte — le jour où l'adresse a **changé** — deviendrait introuvable.
 *
 * D'où la règle : **on ne verse que ce qui diffère de ce qui vaut déjà.** Une
 * valeur inchangée n'est pas un événement.
 *
 * Ce qui diffère, en revanche, se verse et périme la précédente : c'est là que
 * naît l'historique que la Mémoire montre — quelle valeur, quand, par qui — et
 * c'est là que tout ce qui a été calculé sur l'ancienne valeur devient suspect.
 */

import { declaredBaseDatum, declaredZone } from "./project-memory.js";
import { listProjectAssertions, rememberBaseDatum } from "./project-memory-supabase.js";
import { MEMORY } from "./project-memory.js";

function texte(value) {
  return String(value ?? "").trim();
}

/**
 * La donnée de base en vigueur pour cette clé, ou `null`.
 *
 * `null` recouvre deux cas que l'appelant doit distinguer : rien n'a été versé,
 * ou la mémoire n'a pas pu être lue. Le second interdit de verser — on
 * écrirait un doublon en croyant écrire une première fois.
 */
function enVigueur(assertions, row) {
  return (assertions ?? []).find(
    (entry) =>
      entry.kind === row.kind &&
      entry.subject_key === row.subject_key &&
      !entry.superseded_by &&
      entry.status !== MEMORY.REJECTED
  ) ?? null;
}

/**
 * Verse une donnée de base si elle a changé.
 *
 * @returns {Promise<{versee: boolean, raison?: string}>} `versee: false` avec sa
 *   raison plutôt qu'un silence : l'appelant doit pouvoir dire pourquoi rien ne
 *   s'est passé.
 */
export async function versDonneeDeBase({
  projectId,
  subject,
  value,
  domain = null,
  zone = "",
  declaredBy = null
} = {}) {
  if (!texte(projectId) || !texte(subject) || !texte(value)) {
    return { versee: false, raison: "valeur ou sujet manquant" };
  }

  const plan = declaredBaseDatum({ projectId, subject, value, domain, zone, declaredBy });
  if (!plan.ok) return { versee: false, raison: plan.reason };

  const existantes = await listProjectAssertions(projectId);
  // Ne pas savoir n'autorise pas à écrire : on repassera.
  if (existantes === null) return { versee: false, raison: "mémoire illisible" };

  const ancienne = enVigueur(existantes, plan.row);
  if (ancienne && ancienne.statement === plan.row.statement) {
    return { versee: false, raison: "inchangée" };
  }

  const resultat = await rememberBaseDatum(plan.row);
  return resultat ? { versee: true, resultat } : { versee: false, raison: "écriture refusée" };
}

/**
 * Verse — ou met à jour — la définition d'une zone.
 *
 * Même règle : une définition inchangée ne se réécrit pas. Renommer une zone
 * revient en revanche à en définir une autre, puisque la clé vient du nom ;
 * l'appelant qui renomme doit écarter l'ancienne, sans quoi les deux vaudraient.
 */
export async function versDefinitionDeZone({ projectId, label, definition = "", declaredBy = null } = {}) {
  const plan = declaredZone({ projectId, label, definition, declaredBy });
  if (!plan.ok) return { versee: false, raison: plan.reason };

  const existantes = await listProjectAssertions(projectId);
  if (existantes === null) return { versee: false, raison: "mémoire illisible" };

  const ancienne = enVigueur(existantes, plan.row);
  if (ancienne && ancienne.statement === plan.row.statement) {
    return { versee: false, raison: "inchangée" };
  }

  const resultat = await rememberBaseDatum(plan.row);
  return resultat ? { versee: true, resultat } : { versee: false, raison: "écriture refusée" };
}

/**
 * Écarte une zone : elle cesse de valoir sans disparaître.
 *
 * **Un refus est une information.** Supprimer la ligne effacerait le fait qu'une
 * zone a existé, et rendrait incompréhensibles les affirmations qui la portent
 * encore. On l'écarte : elle sort des listes, elle reste dans l'histoire.
 */
export async function ecarteDefinitionDeZone({ projectId, label, declaredBy = null } = {}) {
  const plan = declaredZone({ projectId, label, declaredBy });
  if (!plan.ok) return { versee: false, raison: plan.reason };

  const existantes = await listProjectAssertions(projectId);
  if (existantes === null) return { versee: false, raison: "mémoire illisible" };

  const ancienne = enVigueur(existantes, plan.row);
  if (!ancienne) return { versee: false, raison: "zone déjà absente" };

  const resultat = await rememberBaseDatum({
    ...plan.row,
    statement: ancienne.statement,
    status: MEMORY.REJECTED,
    payload: { ...(ancienne.payload ?? {}), zoneDefinition: true, retiree: true }
  });
  return resultat ? { versee: true, resultat } : { versee: false, raison: "écriture refusée" };
}
