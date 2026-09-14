/**
 * Les exécutions lourdes du projet, conservées.
 *
 * Ce module ne décide de rien : ce qu'une fusion consigne, et ce que cela vaut,
 * vit dans `journal-de-la-fusion.js`, qui est pur et testé. Ici, il n'y a que
 * des allers-retours avec la base.
 *
 * Un principe s'y lit quand même : **on n'écrit qu'une fois, à la fin, et on ne
 * met jamais à jour.** Une exécution qui a eu lieu ne devient pas fausse
 * (`docs/fondamentaux.md`, règle 6) ; une seconde fusion serait une seconde
 * ligne.
 *
 * ## Ce qu'un échec d'écriture coûte
 *
 * Rien de ce que la fusion a fait. Les documents sont entrés, la mémoire est
 * écrite, les sujets sont ouverts : c'est fait, et le journal n'est que ce
 * qu'on en raconte. Refuser la fusion parce que son journal n'a pas pu
 * s'écrire ferait payer l'essentiel par l'accessoire. On rend `null`, et
 * l'écran le dit.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

const COLONNES =
  "id,project_id,geste,proposition_id,titre,resume,statut,started_at,finished_at,duration_ms,steps,created_at";

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
 * Enregistre une exécution.
 *
 * @returns {Promise<object|null>} `null` quand la base n'a pas répondu : la
 *   fusion, elle, est faite, et l'écran doit pouvoir le dire sans prétendre que
 *   son journal l'est aussi.
 */
export async function enregistrerUneCourse({
  projectId = "",
  geste = "",
  propositionId = null,
  titre = "",
  resume = "",
  statut = "ok",
  startedAt = null,
  finishedAt = null,
  durationMs = null,
  steps = null
} = {}) {
  if (!texte(projectId) || !texte(geste)) return null;

  try {
    const lignes = await requete("project_runs", {
      method: "POST",
      body: [{
        project_id: texte(projectId),
        geste: texte(geste),
        proposition_id: texte(propositionId) || null,
        titre: texte(titre),
        resume: texte(resume),
        statut: texte(statut) || "ok",
        started_at: startedAt ?? new Date().toISOString(),
        finished_at: finishedAt ?? new Date().toISOString(),
        duration_ms: Number.isFinite(Number(durationMs)) ? Math.round(Number(durationMs)) : null,
        // Les étapes partent telles quelles : les raboter ici reviendrait à
        // conserver un détail en base pour ne jamais l'afficher.
        steps: Array.isArray(steps) && steps.length > 0 ? steps : null
      }]
    });

    return Array.isArray(lignes) ? lignes[0] ?? null : null;
  } catch {
    return null;
  }
}

/**
 * Ce que ce projet a fait, du plus récent au plus ancien.
 *
 * **Rendre `[]` sur une erreur serait mentir.** Un projet sans exécution et un
 * projet dont on n'a pas pu lire les exécutions n'appellent pas le même écran :
 * le premier n'a rien à raconter, le second a quelque chose qu'on ne sait pas
 * (règle 5).
 *
 * @returns {Promise<object[]|null>}
 */
export async function listerLesCourses(projectId, { limite = 200 } = {}) {
  if (!texte(projectId)) return [];

  try {
    const lignes = await requete("project_runs", {
      params: {
        select: COLONNES,
        project_id: `eq.${texte(projectId)}`,
        order: "started_at.desc",
        limit: String(Math.max(1, Number(limite) || 200))
      }
    });
    return Array.isArray(lignes) ? lignes : null;
  } catch {
    return null;
  }
}
