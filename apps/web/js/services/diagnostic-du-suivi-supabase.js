/**
 * Ce qu'il faut lire pour constater où le suivi s'arrête.
 *
 * Les allers-retours avec la base, et rien d'autre : le raisonnement est dans
 * `diagnostic-du-suivi.js`, qui est pur et se vérifie sans réseau.
 *
 * **On ne retient aucun échec en silence.** Une table qui ne répond pas et une
 * table vide ne disent pas la même chose : la première laisse une question, la
 * seconde une réponse. Les confondre ferait conclure « rien n'a été écrit »
 * d'un hoquet de réseau — exactement l'erreur que ce diagnostic existe pour
 * lever (règle 5).
 *
 * Provisoire : il s'en va avec le bouton qui l'appelle.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

const COLONNES_DOCUMENT =
  "id,filename,original_filename,detected_kind,detected_kind_label," +
  "declared_reference,issued_at,created_at";

async function lire(table, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [cle, valeur] of Object.entries(params)) url.searchParams.set(cle, valeur);

  const reponse = await fetch(url.toString(), {
    method: "GET",
    headers: await buildSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  if (!reponse.ok) return null;
  const json = await reponse.json().catch(() => null);
  return Array.isArray(json) ? json : null;
}

/** Les documents du projet, avec ce que la reconnaissance en a dit. */
export async function documentsDuProjet(backendProjectId) {
  const projet = String(backendProjectId ?? "").trim();
  if (!projet) return [];

  try {
    return (await lire("documents", {
      select: COLONNES_DOCUMENT,
      project_id: `eq.${projet}`,
      deleted_at: "is.null",
      order: "created_at.asc"
    })) ?? [];
  } catch {
    return [];
  }
}
