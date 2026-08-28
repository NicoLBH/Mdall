/**
 * La mémoire d'identité d'un projet, conservée entre deux ouvertures.
 *
 * Ce module ne décide de rien : les règles — ce qui rattache un document, ce
 * qui le contredit, ce qu'il faut retenir d'une confirmation — vivent dans
 * `project-identity.js`, qui est pur et testé. Ici, il n'y a que des
 * allers-retours avec la base.
 *
 * Un principe s'y lit quand même, parce qu'il gouverne l'écriture : **rien
 * n'entre sans qu'un humain ait répondu**. Aucune fonction de ce fichier n'est
 * appelée par une lecture de document ; toutes le sont par un clic. C'est ce
 * qui permet ensuite de se fier à cette mémoire pour écarter un intrus.
 */

import { buildSupabaseAuthHeaders, getCurrentUser, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

const COLUMNS = "id,marker_type,marker_value,marker_label,document_count,confirmed_by,created_at";

/**
 * Les marqueurs déjà confirmés pour ce projet.
 *
 * Rendre une liste vide quand la base ne répond pas est délibéré : sans
 * mémoire, `assessAttachment` ne contredit personne et laisse tout passer. Une
 * panne de réseau ne doit pas faire écarter des livrables légitimes.
 */
export async function loadProjectMarkers(projectId) {
  if (!projectId) return [];

  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/project_identity_markers`);
    url.searchParams.set("select", COLUMNS);
    url.searchParams.set("project_id", `eq.${projectId}`);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: await buildSupabaseAuthHeaders({ Accept: "application/json" }),
      cache: "no-store"
    });

    if (!res.ok) return [];
    const rows = (await res.json()) ?? [];
    return rows.map((row) => ({
      type: row.marker_type,
      value: row.marker_value,
      label: row.marker_label ?? row.marker_value,
      documentCount: row.document_count ?? 1
    }));
  } catch {
    return [];
  }
}

/**
 * Verse à la mémoire du projet ce qu'un humain vient de confirmer.
 *
 * L'écriture se fait par l'identité naturelle du marqueur — projet, type,
 * valeur —, de sorte que confirmer deux fois la même affaire ne crée pas deux
 * lignes. Aucune suppression : un marqueur confirmé reste, même si le document
 * qui l'a apporté est retiré du projet. Ce qui a été affirmé une fois n'a pas à
 * être redemandé.
 *
 * @returns {Promise<number|null>} le nombre de marqueurs versés, ou `null` si
 *   la base n'a pas répondu — l'écran le dit alors, plutôt que de laisser
 *   croire que la réponse a été retenue.
 */
export async function rememberProjectMarkers(projectId, markers = []) {
  if (!projectId || markers.length === 0) return 0;

  try {
    const confirmedBy = (await getCurrentUser())?.id ?? null;
    const url = new URL(`${SUPABASE_URL}/rest/v1/project_identity_markers`);
    url.searchParams.set("on_conflict", "project_id,marker_type,marker_value");

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      }),
      body: JSON.stringify(
        markers.map((marker) => ({
          project_id: projectId,
          marker_type: marker.type,
          marker_value: marker.value,
          marker_label: marker.label ?? marker.value,
          document_count: marker.documentCount ?? 1,
          confirmed_by: confirmedBy
        }))
      )
    });

    return res.ok ? markers.length : null;
  } catch {
    return null;
  }
}
