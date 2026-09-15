/**
 * Les lectures de comptes rendus, conservées pour être comparées.
 *
 * Ce module ne décide de rien : ce qu'une lecture vaut, et ce que sa variation
 * dit, vit dans `suivi-des-lectures.js`, qui est pur et testé. Ici, il n'y a que
 * des allers-retours avec la base.
 *
 * ## Elles sont privées, et ce n'est pas ce fichier qui le tient
 *
 * La règle de lecture de `cr_lectures` ne rend que les lectures de qui demande.
 * Ce module ne filtre rien — s'il filtrait, la discrétion ne serait qu'une
 * politesse d'affichage, et un écran qui oublierait de le faire publierait le
 * brouillon de quelqu'un.
 *
 * ## Ce qu'un échec d'écriture coûte
 *
 * Rien de la lecture. Elle a eu lieu, elle est à l'écran, elle se transforme en
 * proposition : le suivi n'est que ce qu'on en garde pour la fois suivante.
 * Refuser la lecture parce que son suivi n'a pas pu s'écrire ferait payer
 * l'essentiel par l'accessoire. On rend `null`, et l'on continue.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

const COLONNES = "id,project_id,document,numero_de_reunion,tenue_le,mesures,lu_par,created_at";

const texte = (valeur) => String(valeur ?? "").trim();

async function requete(chemin, { method = "GET", body = null, params = {} } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${chemin}`);
  for (const [cle, valeur] of Object.entries(params)) url.searchParams.set(cle, valeur);

  const reponse = await fetch(url.toString(), {
    method,
    headers: await buildSupabaseAuthHeaders({
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json", Prefer: "return=representation" } : {})
    }),
    cache: "no-store",
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!reponse.ok) {
    throw new Error(`${chemin} (${reponse.status}) : ${await reponse.text().catch(() => "")}`);
  }
  return reponse.status === 204 ? null : reponse.json().catch(() => null);
}

/**
 * Conserve une lecture.
 *
 * **On écrit une fois, et on ne met jamais à jour.** Relire le même document est
 * une seconde lecture, avec sa propre ligne — et c'est précisément ce qu'on veut
 * comparer quand on ajuste une consigne (règle 6).
 *
 * @returns {Promise<object|null>} `null` quand la base n'a pas répondu.
 */
export async function conserverUneLecture(ligne = null) {
  if (!ligne?.project_id) return null;

  try {
    const lignes = await requete("cr_lectures", { method: "POST", body: [ligne] });
    return Array.isArray(lignes) ? lignes[0] ?? null : null;
  } catch {
    return null;
  }
}

/**
 * Les lectures de ce projet, la plus récente d'abord.
 *
 * **`null` sur une erreur, jamais `[]`.** Une première lecture et une lecture
 * dont on n'a pas pu lire les précédentes n'appellent pas la même phrase : la
 * première dit qu'il n'y a rien à comparer, la seconde qu'on ne sait pas
 * (règle 5).
 *
 * @returns {Promise<object[]|null>}
 */
export async function listerLesLectures(projectId, { limite = 20 } = {}) {
  if (!texte(projectId)) return [];

  try {
    const lignes = await requete("cr_lectures", {
      params: {
        select: COLONNES,
        project_id: `eq.${texte(projectId)}`,
        order: "created_at.desc",
        limit: String(Math.max(1, Number(limite) || 20))
      }
    });
    return Array.isArray(lignes) ? lignes : null;
  } catch {
    return null;
  }
}
