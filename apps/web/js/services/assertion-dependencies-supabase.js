/**
 * Les allers-retours du graphe des dépendances.
 *
 * Trois gestes, et rien d'autre : lire les liens d'un projet, en déclarer un,
 * et marquer les affirmations qu'un remplacement rend suspectes. La règle de
 * ce qui entraîne quoi vit dans `assertion-dependencies.js`, qui est pur et
 * testé ; ici on ne fait que porter le résultat à la base.
 *
 * Comme partout dans la mémoire : `null` quand la lecture a échoué, `[]` quand
 * il n'y a rien. Confondre les deux ferait afficher « aucune dépendance » à un
 * projet qui en a — c'est-à-dire exactement le mensonge que cette étape existe
 * pour éviter.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const COLUMNS = "id,project_id,assertion_id,depends_on_assertion_id,declared_by,created_at";

async function request(path, { method = "GET", body = null, headers = {}, params = {} } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url.toString(), {
    method,
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    }),
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!response.ok) throw new Error(`${path} (${response.status})`);
  return response.status === 204 ? null : response.json().catch(() => null);
}

/**
 * Tous les liens d'un projet.
 *
 * @returns {Promise<object[]|null>} `null` si la lecture a échoué — la table
 *   peut ne pas exister encore, et un projet sans liens n'est pas un projet
 *   dont on n'a pas pu lire les liens.
 */
export async function listAssertionDependencies(projectId) {
  if (!projectId) return null;

  try {
    return (
      (await request("assertion_dependencies", {
        params: { select: COLUMNS, project_id: `eq.${projectId}`, order: "created_at.asc" }
      })) ?? []
    );
  } catch {
    return null;
  }
}

/**
 * Déclare qu'une affirmation repose sur une autre.
 *
 * Le doublon est ignoré plutôt que rejeté : déclarer deux fois le même lien est
 * un geste sans conséquence, et le refuser bruyamment ferait passer une
 * répétition pour une erreur.
 *
 * @returns {Promise<object|null>} le lien écrit, ou `null`
 */
export async function declareDependency(link) {
  if (!link?.assertion_id || !link?.depends_on_assertion_id) return null;

  try {
    const rows = await request("assertion_dependencies", {
      method: "POST",
      params: { select: COLUMNS, on_conflict: "assertion_id,depends_on_assertion_id" },
      headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
      body: [link]
    });
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Marque des affirmations à revérifier.
 *
 * On n'écrit que la date de suspicion : ni `reviewed_at`, ni quoi que ce soit
 * d'autre. Effacer la vérification précédente perdrait le fait qu'elle a eu
 * lieu, et c'est un fait — la comparaison des deux dates suffit à relever le
 * drapeau.
 *
 * @param {{assertionId: string, since: string}[]} marques
 * @returns {Promise<number>} combien ont été marquées
 */
export async function markNeedsReview(marques = []) {
  const lignes = (Array.isArray(marques) ? marques : []).filter((entry) => entry?.assertionId && entry?.since);
  if (lignes.length === 0) return 0;

  // Un drapeau ne porte qu'une date, et toutes celles d'une même fusion sont la
  // même. On écrit donc une requête par date, pas une par affirmation : la
  // boucle faisait payer un aller-retour réseau par drapeau, et une fusion qui
  // en lève soixante attendait soixante fois la base pour écrire soixante fois
  // la même valeur.
  const parDate = new Map();
  for (const marque of lignes) {
    const date = String(marque.since);
    if (!parDate.has(date)) parDate.set(date, []);
    parDate.get(date).push(marque.assertionId);
  }

  let marquees = 0;
  for (const [since, ids] of parDate) {
    try {
      await request("project_assertions", {
        method: "PATCH",
        params: { id: `in.(${ids.join(",")})` },
        headers: { Prefer: "return=minimal" },
        body: { needs_review_since: since }
      });
      marquees += ids.length;
    } catch {
      // Un lot raté n'empêche pas les autres : mieux vaut six drapeaux sur sept
      // qu'aucun.
    }
  }
  return marquees;
}

/**
 * Marque une affirmation comme revérifiée.
 *
 * La date de suspicion **reste**. Revérifier lève un drapeau, ça ne réécrit pas
 * l'histoire : on doit pouvoir lire « suspectée le 12, revérifiée le 14 ».
 *
 * @returns {Promise<boolean>} vrai si la base l'a pris
 */
export async function markReviewed({ assertionId, reviewedBy = null, at = "" } = {}) {
  if (!assertionId) return false;

  try {
    await request("project_assertions", {
      method: "PATCH",
      params: { id: `eq.${assertionId}` },
      headers: { Prefer: "return=minimal" },
      body: { reviewed_at: at || new Date().toISOString(), reviewed_by: reviewedBy || null }
    });
    return true;
  } catch {
    return false;
  }
}
