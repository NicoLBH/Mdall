/**
 * Les épingles de qui regarde, conservées entre deux ouvertures.
 *
 * ## Ce qui vit ici, et ce qui n'y vit pas
 *
 * Des allers-retours avec la base, et rien d'autre. Combien on peut en poser,
 * ce que le bouton annonce, dans quel ordre le bandeau se lit : tout cela est
 * dans `epingles-des-sujets.js`, qui est pur et vérifiable sans base de
 * données.
 *
 * ## `owner_id` ne s'envoie jamais
 *
 * La base le pose à `auth.uid()`, et sa politique refuse toute autre valeur.
 * L'écrire ici laisserait croire que l'appelant peut le choisir — et le jour où
 * quelqu'un essaierait, il obtiendrait un refus incompréhensible au lieu d'une
 * ligne qui n'a jamais eu besoin d'être écrite.
 *
 * Voir la migration `202609230001_subject_pins.sql`, qui porte le raisonnement
 * sur la discrétion de ces lignes.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const COLUMNS = "id,project_id,subject_id,created_at";

const texte = (valeur) => String(valeur ?? "").trim();

async function request(path, { method = "GET", body = null, headers = {}, params = {} } = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  for (const [cle, valeur] of Object.entries(params)) url.searchParams.set(cle, valeur);

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

  if (!reponse.ok) throw new Error(`${path} (${reponse.status})`);
  return reponse.status === 204 ? null : reponse.json().catch(() => null);
}

/** Ce qu'une ligne de la base devient à l'écran. */
export function epinglePourLEcran(ligne = {}) {
  return {
    id: texte(ligne.id),
    subjectId: texte(ligne.subject_id),
    poseeLe: texte(ligne.created_at)
  };
}

/**
 * Les épingles de qui regarde, sur ce projet, dans l'ordre où elles ont été
 * posées.
 *
 * **`null` sur un échec, jamais `[]`.** Un projet sans épingle et un projet
 * dont on n'a pas pu lire les épingles n'appellent pas le même écran : le
 * premier n'a rien à montrer, le second a quelque chose qu'on ne sait pas.
 * Rendre une liste vide ferait disparaître le bandeau de quelqu'un sur un
 * hoquet de réseau (règle 5).
 *
 * @returns {Promise<object[]|null>}
 */
export async function listerLesEpingles(projectId) {
  const projet = texte(projectId);
  if (!projet) return [];

  try {
    const lignes = (await request("subject_pins", {
      params: { select: COLUMNS, project_id: `eq.${projet}`, order: "created_at.asc" }
    })) ?? [];

    return lignes.map(epinglePourLEcran).filter((epingle) => epingle.id && epingle.subjectId);
  } catch {
    return null;
  }
}

/**
 * Épingler un sujet.
 *
 * Le doublon est ignoré plutôt que rejeté : épingler deux fois le même sujet
 * est un geste sans conséquence, et le refuser bruyamment ferait passer une
 * répétition pour une erreur. La contrainte d'unicité de la table s'en charge.
 *
 * **Le nombre maximum n'est pas vérifié ici** : il l'est avant, par le service
 * pur, qui est aussi celui qui dessine le bouton. Le redire ici en ferait une
 * règle à deux endroits, et la seconde finirait par diverger de la première
 * (règle 4).
 *
 * @returns {Promise<object|null>} l'épingle posée, ou `null` si la base n'a pas
 *   répondu — l'écran garde alors l'état d'avant plutôt que d'afficher une
 *   épingle qui n'existe pas.
 */
export async function epinglerLeSujet({ projectId, subjectId } = {}) {
  const projet = texte(projectId);
  const sujet = texte(subjectId);
  if (!projet || !sujet) return null;

  try {
    const lignes = await request("subject_pins", {
      method: "POST",
      params: { select: COLUMNS, on_conflict: "owner_id,subject_id" },
      headers: { Prefer: "return=representation,resolution=merge-duplicates" },
      body: [{ project_id: projet, subject_id: sujet }]
    });

    const posee = lignes?.[0];
    return posee ? epinglePourLEcran(posee) : null;
  } catch {
    return null;
  }
}

/**
 * Retirer une épingle.
 *
 * On l'efface **par le sujet**, pas par l'identifiant de la ligne : c'est le
 * sujet que l'écran a sous la main, et la politique de la table limite déjà la
 * portée à celui qui demande. Passer par l'identifiant obligerait à le
 * retrouver d'abord, pour rien.
 *
 * @returns {Promise<boolean>} `false` quand la base n'a pas répondu : l'épingle
 *   est peut-être encore là, et l'écran ne doit pas prétendre le contraire.
 */
export async function retirerLEpingle({ subjectId } = {}) {
  const sujet = texte(subjectId);
  if (!sujet) return false;

  try {
    await request("subject_pins", {
      method: "DELETE",
      params: { subject_id: `eq.${sujet}` },
      headers: { Prefer: "return=minimal" }
    });
    return true;
  } catch {
    return false;
  }
}
