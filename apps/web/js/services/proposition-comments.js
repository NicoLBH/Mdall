/**
 * Ce que les gens se disent autour d'une proposition.
 *
 * Une proposition portait des faits — des documents, des décisions — et une
 * description écrite une fois pour toutes. Il y manquait le plus humain : la
 * discussion. « Pourquoi tu écartes celui-là ? », « le bureau de contrôle a
 * renvoyé le rapport corrigé », « on assume, on fusionne ». Ce sont ces phrases
 * qu'on relit dans six mois.
 *
 * Ce module ne fait que des allers-retours avec la base. Deux règles s'y lisent
 * quand même, parce qu'elles gouvernent chaque requête :
 *
 *  - **rien n'est effacé** : retirer un message le marque, il ne le supprime
 *    pas. Un message retiré peut être la seule trace d'une objection ;
 *  - **une modification se dit** : `edited_at` part avec chaque réécriture, et
 *    l'écran l'affiche. Réécrire sans le dire permettrait de faire mentir une
 *    conversation qui sert de mémoire.
 *
 * On peut commenter une proposition close : la décision est figée, la
 * conversation ne l'est pas.
 */

import { buildSupabaseAuthHeaders, getCurrentUser, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

const COLUMNS = "id,proposition_id,project_id,author_id,body,edited_at,deleted_at,created_at";

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

  if (!response.ok) {
    throw new Error(`${path} (${response.status}) : ${await response.text().catch(() => "")}`);
  }
  return response.status === 204 ? null : response.json().catch(() => null);
}

/**
 * Les messages d'une proposition, du plus ancien au plus récent.
 *
 * Les messages retirés sont rendus eux aussi : c'est l'écran qui dit « message
 * retiré » à leur place. Les faire disparaître de la liste laisserait un trou
 * dans une conversation où quelqu'un a répondu à ce qui n'y serait plus.
 */
export async function listPropositionComments(propositionId) {
  if (!propositionId) return [];

  try {
    return (
      (await request("proposition_comments", {
        params: {
          select: COLUMNS,
          proposition_id: `eq.${propositionId}`,
          order: "created_at.asc"
        }
      })) ?? []
    );
  } catch {
    return [];
  }
}

/**
 * Ajoute un message.
 *
 * @returns {Promise<object|null>} la ligne écrite, ou `null` si la base n'a pas
 *   répondu — l'écran le dit plutôt que d'afficher un message qui n'existe pas.
 */
export async function addPropositionComment({ propositionId, projectId, body } = {}) {
  const texte = String(body ?? "").trim();
  if (!propositionId || !projectId || !texte) return null;

  try {
    const authorId = (await getCurrentUser())?.id ?? null;
    const rows = await request("proposition_comments", {
      method: "POST",
      params: { select: COLUMNS },
      headers: { Prefer: "return=representation" },
      body: { proposition_id: propositionId, project_id: projectId, author_id: authorId, body: texte }
    });
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Réécrit un message, et le dit.
 *
 * La date de modification part avec le texte : c'est la moitié de l'opération,
 * pas un ornement.
 */
export async function editPropositionComment({ commentId, body } = {}) {
  const texte = String(body ?? "").trim();
  if (!commentId || !texte) return null;

  try {
    const rows = await request("proposition_comments", {
      method: "PATCH",
      params: { id: `eq.${commentId}`, select: COLUMNS },
      headers: { Prefer: "return=representation" },
      body: { body: texte, edited_at: new Date().toISOString() }
    });
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Retire un message sans l'effacer.
 *
 * Le texte reste en base. L'écran ne le montre plus, mais un message retiré
 * peut être la seule trace d'une objection : le supprimer pour de bon
 * effacerait aussi ce à quoi les autres ont répondu.
 */
export async function removePropositionComment(commentId) {
  if (!commentId) return false;

  try {
    await request("proposition_comments", {
      method: "PATCH",
      params: { id: `eq.${commentId}` },
      headers: { Prefer: "return=minimal" },
      body: { deleted_at: new Date().toISOString() }
    });
    return true;
  } catch {
    return false;
  }
}
