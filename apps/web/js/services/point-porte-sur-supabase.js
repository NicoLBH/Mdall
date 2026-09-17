/**
 * Les allers-retours de l'arête « porte sur ».
 *
 * Lire les liens d'un projet, les poser, confirmer celui qu'une reconnaissance
 * a proposé, et le retirer. Ce qui décide **quoi** écrire vit dans
 * `point-porte-sur.js`, qui est pur et testé ; ici il n'y a que le transport.
 *
 * ## `null` et `[]` ne sont pas la même chose
 *
 * Comme partout dans la mémoire : `null` quand la lecture a échoué, `[]` quand
 * il n'y a rien. Les confondre ferait présenter comme tranquille une valeur
 * qu'un débat conteste, parce qu'on n'a pas su lire la table (règle 5).
 *
 * ## Confirmer n'est pas poser
 *
 * `declared_by` nul dit « reconnu, pas encore confirmé ». Confirmer est donc une
 * **écriture de ce seul champ** : le lien existait déjà, quelqu'un en répond
 * maintenant. Le réécrire en entier effacerait sa date de reconnaissance.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const COLONNES = "id,project_id,subject_id,assertion_id,declared_by,created_at";

/** Ce qu'un point ouvert a besoin de dire de lui : son nom, et s'il est fermé. */
const COLONNES_DU_POINT = "id,project_id,title,status,priority,created_at";

async function requete(chemin, { method = "GET", body = null, headers = {}, params = {} } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${chemin}`);
  for (const [clef, valeur] of Object.entries(params)) url.searchParams.set(clef, valeur);

  const reponse = await fetch(url.toString(), {
    method,
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    }),
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!reponse.ok) throw new Error(`${chemin} (${reponse.status})`);
  return reponse.status === 204 ? null : reponse.json().catch(() => null);
}

/**
 * Tous les liens d'un projet.
 *
 * @returns {Promise<object[]|null>} `null` si la lecture a échoué — la table
 *   peut ne pas exister encore, et une valeur sans lien lu n'est pas une valeur
 *   que rien ne conteste.
 */
export async function listerLesLiens(projectId) {
  if (!projectId) return null;

  try {
    return (await requete("subject_assertion_links", {
      params: { select: COLONNES, project_id: `eq.${projectId}`, order: "created_at.asc" }
    })) ?? [];
  } catch {
    return null;
  }
}

/**
 * Les points d'un projet, réduits à ce que l'arête a besoin de savoir.
 *
 * L'écran des sujets a son propre chargeur, lourd et lié à son état ; celui-ci
 * sert la Mémoire, qui n'a besoin que de savoir si un point est ouvert et
 * comment il s'appelle. Lui faire monter toute la charge d'un écran de suivi
 * ferait payer au rendu d'une valeur ce qui ne la regarde pas.
 */
export async function listerLesPoints(projectId) {
  if (!projectId) return null;

  try {
    return (await requete("subjects", {
      params: { select: COLONNES_DU_POINT, project_id: `eq.${projectId}`, order: "created_at.asc" }
    })) ?? [];
  } catch {
    return null;
  }
}

/**
 * Poser des liens. Ceux qui existent déjà ne sont pas retouchés.
 *
 * `ignore-duplicates` plutôt qu'une mise à jour : un lien déjà posé par un
 * humain ne doit pas se voir écraser par une reconnaissance qui repasse, ce qui
 * lui retirerait son auteur.
 *
 * @returns {Promise<object[]|null>} les lignes écrites, `null` si l'envoi a échoué
 */
export async function poserLesLiens(lignes = []) {
  const aEcrire = Array.isArray(lignes) ? lignes.filter(Boolean) : [];
  if (!aEcrire.length) return [];

  try {
    return (await requete("subject_assertion_links", {
      method: "POST",
      headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
      params: { on_conflict: "subject_id,assertion_id" },
      body: aEcrire
    })) ?? [];
  } catch {
    return null;
  }
}

/**
 * Confirmer un lien proposé : quelqu'un en répond.
 *
 * Seul `declared_by` bouge. La date de reconnaissance reste celle du jour où le
 * lien a été proposé — c'est elle qui dit depuis quand la valeur était vue comme
 * en question, et la réécrire ferait croire que le débat vient de commencer.
 */
export async function confirmerLeLien(lienId, declarePar = "") {
  const id = String(lienId ?? "").trim();
  const qui = String(declarePar ?? "").trim();
  if (!id || !qui) return null;

  try {
    const [ligne] = (await requete("subject_assertion_links", {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      params: { id: `eq.${id}` },
      body: { declared_by: qui }
    })) ?? [];
    return ligne ?? null;
  } catch {
    return null;
  }
}

/**
 * Retirer un lien.
 *
 * C'est le pendant du geste qui confirme : une reconnaissance qui s'est trompée
 * doit pouvoir être écartée, sans quoi la seule réponse possible à une
 * proposition serait de l'accepter.
 *
 * @returns {Promise<boolean>} vrai si la suppression a abouti
 */
export async function retirerLeLien(lienId) {
  const id = String(lienId ?? "").trim();
  if (!id) return false;

  try {
    await requete("subject_assertion_links", { method: "DELETE", params: { id: `eq.${id}` } });
    return true;
  } catch {
    return false;
  }
}
