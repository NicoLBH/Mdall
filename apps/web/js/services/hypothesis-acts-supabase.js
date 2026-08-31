/**
 * Les allers-retours des actes portés sur une hypothèse.
 *
 * Lire les actes d'un projet, en écrire un — et, quand c'est une contestation,
 * lever aussitôt les drapeaux de ce qui reposait sur l'hypothèse. La règle de
 * ce qui entraîne quoi vit dans `hypothesis-acts.js`, qui est pur et testé.
 *
 * Comme partout dans la mémoire : `null` quand la lecture a échoué, `[]` quand
 * il n'y a rien. Confondre les deux montrerait une hypothèse contestée comme
 * une hypothèse tranquille.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const COLUMNS =
  "id,project_id,assertion_id,verdict,proposed_value,note," +
  "source_assertion_id,source_document_id,source_page,declared_by,created_at";

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
 * Tous les actes d'un projet, du plus ancien au plus récent.
 *
 * @returns {Promise<object[]|null>} `null` si la lecture a échoué — la table
 *   peut ne pas exister encore, et une hypothèse sans acte lu n'est pas une
 *   hypothèse sans acte.
 */
export async function listHypothesisActs(projectId) {
  if (!projectId) return null;

  try {
    return (
      (await request("assertion_acts", {
        params: { select: COLUMNS, project_id: `eq.${projectId}`, order: "created_at.asc" }
      })) ?? []
    );
  } catch {
    return null;
  }
}

/**
 * Écrit un acte, et tire ce qu'il entraîne.
 *
 * L'ordre compte, comme partout : on écrit l'acte d'abord. S'il n'entre pas,
 * rien n'a été marqué — le pire cas laisse la mémoire telle qu'elle était,
 * jamais avec des drapeaux dont on ne saurait plus d'où ils viennent.
 *
 * @returns {Promise<{act: object, flagged: number}|null>}
 */
export async function recordAct(acte) {
  if (!acte?.assertion_id || !acte?.verdict) return null;

  let ecrit = null;
  try {
    const rows = await request("assertion_acts", {
      method: "POST",
      params: { select: COLUMNS },
      headers: { Prefer: "return=representation" },
      body: [acte]
    });
    ecrit = rows?.[0] ?? null;
  } catch {
    return null;
  }
  if (!ecrit) return null;

  return { act: ecrit, flagged: await flagAfterContestation(ecrit) };
}

/**
 * Lève les drapeaux qu'une contestation rend nécessaires.
 *
 * Isolé, et il échoue seul : ne pas savoir marquer ce qui devient suspect ne
 * doit pas faire croire que la contestation n'a pas été enregistrée. Elle l'a
 * été, et c'est le fait qui compte le plus.
 */
async function flagAfterContestation(acte) {
  try {
    const { planContestationFlags } = await import("./hypothesis-acts.js");
    const { listAssertionDependencies, markNeedsReview } = await import("./assertion-dependencies-supabase.js");

    const liens = await listAssertionDependencies(acte.project_id);
    // `null` : on n'a pas pu lire le graphe. Ne rien marquer est le seul choix
    // honnête — marquer sur un graphe vide reviendrait à dire « rien ne dépend
    // de cette hypothèse ».
    if (!liens) return 0;

    return await markNeedsReview(planContestationFlags(acte, liens));
  } catch {
    return 0;
  }
}
