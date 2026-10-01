/**
 * Les lectures de fils de mails, conservées pour être rouvertes.
 *
 * Ce module ne décide de rien : ce qu'une lecture garde, et comment elle se
 * rouvre, vit dans `la-lecture-dun-fil.js`, qui est pur et éprouvé. Ici, des
 * allers-retours avec la base, et rien d'autre.
 *
 * ## Elles sont privées, et ce n'est pas ce fichier qui le tient
 *
 * La règle de lecture de `fil_lectures` ne rend que les lectures de qui
 * demande. Ce module ne filtre rien — s'il filtrait, la discrétion ne serait
 * qu'une politesse d'affichage, et un écran qui oublierait de le faire
 * publierait la correspondance de quelqu'un.
 *
 * ## Ce qu'un échec d'écriture coûte
 *
 * Rien de la lecture. Elle a eu lieu, elle est à l'écran, elle se transforme
 * en proposition : ce qu'on en garde n'est que le confort de la rouvrir. On
 * rend `null`, et l'on continue.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { LE_SELECT_DUN_FIL, LE_SELECT_DUNE_LIGNE_DE_FIL } from "./la-lecture-dun-fil.js";

const SUPABASE_URL = getSupabaseUrl();

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
 * Conserve une lecture de fil.
 *
 * **On écrit une fois, et on ne met jamais à jour.** Relever le même fil est
 * une seconde lecture, avec sa propre ligne (règle 6).
 */
export async function conserverUneLectureDeFil(ligne = null) {
  if (!ligne?.project_id) return null;

  try {
    const lignes = await requete("fil_lectures", { method: "POST", body: [ligne] });
    return Array.isArray(lignes) ? lignes[0] ?? null : null;
  } catch {
    return null;
  }
}

/**
 * Les lectures de fils de ce projet, la plus récente d'abord.
 *
 * **`null` sur une erreur, jamais `[]`.** « Aucun fil n'a été lu » et « on n'a
 * pas su demander » n'appellent pas la même phrase (règle 5).
 */
export async function listerLesLecturesDeFils(projectId, { limite = 300 } = {}) {
  if (!texte(projectId)) return [];

  try {
    const lignes = await requete("fil_lectures", {
      params: {
        select: LE_SELECT_DUNE_LIGNE_DE_FIL,
        project_id: `eq.${texte(projectId)}`,
        order: "created_at.desc",
        limit: String(Math.max(1, Number(limite) || 300))
      }
    });
    return Array.isArray(lignes) ? lignes : null;
  } catch {
    return null;
  }
}

/**
 * Une lecture de fil, **entière** — son analyse comprise.
 *
 * `null` quand on n'a pas pu lire, **et aussi** quand la ligne n'existe plus.
 * L'écran dit « cette lecture ne s'ouvre pas » dans les deux cas : deviner
 * lequel des deux serait une affirmation de plus que ce qu'on sait (règle 5).
 */
export async function lireUneLectureDeFil(id = "") {
  if (!texte(id)) return null;

  try {
    const lignes = await requete("fil_lectures", {
      params: { select: LE_SELECT_DUN_FIL, id: `eq.${texte(id)}`, limit: "1" }
    });
    return Array.isArray(lignes) ? lignes[0] ?? null : null;
  } catch {
    return null;
  }
}
