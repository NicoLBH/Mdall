/**
 * Ranger un chantier, et le remettre en cours.
 *
 * Une colonne, une date. `null` remet en cours. Rien d'autre n'est touché : ni
 * les fichiers, ni la mémoire, ni l'histoire — ranger n'est pas supprimer.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

/**
 * Écrit la date de rangement, ou l'efface.
 *
 * @param {string} projetId l'identifiant en base
 * @param {boolean} ranger vrai pour ranger, faux pour remettre en cours
 * @returns {Promise<string|null>} la date écrite, `null` si remis en cours —
 *   et une exception si la base a refusé : l'écran doit pouvoir dire que le
 *   geste n'a pas eu lieu plutôt que de l'afficher comme fait (règle 12).
 */
export async function rangerLeChantier(projetId, ranger = true) {
  const id = String(projetId ?? "").trim();
  if (!id) throw new Error("aucun chantier à ranger");

  // La date est prise ici et rendue à l'appelant : l'écran l'affiche sans
  // relire la base, et sans l'inventer de son côté (règle 4).
  const quand = ranger ? new Date().toISOString() : null;

  const url = new URL(`${SUPABASE_URL}/rest/v1/projects`);
  url.searchParams.set("id", `eq.${id}`);

  const reponse = await fetch(url.toString(), {
    method: "PATCH",
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    }),
    cache: "no-store",
    body: JSON.stringify({ archived_at: quand })
  });

  if (!reponse.ok) throw new Error(`projects (${reponse.status})`);
  return quand;
}
