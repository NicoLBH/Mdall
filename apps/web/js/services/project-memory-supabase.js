/**
 * Les allers-retours de la mémoire du projet.
 *
 * Deux règles, et ce sont celles du reste du projet.
 *
 * **Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien.** Une lecture
 * qui échoue rend `null`, jamais `[]` : l'écran doit pouvoir dire « la mémoire
 * n'a pas pu être lue » plutôt que « le projet ne sait rien ». La confusion des
 * deux a déjà coûté une soirée sur les références `#P`.
 *
 * **Rien n'est modifié.** On écrit des affirmations, et on marque des
 * affirmations remplacées. Aucune ligne n'est corrigée, aucune n'est effacée :
 * une mémoire qui se réécrit n'est pas une mémoire.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { assertionsFromProposition, planSupersessions } from "./project-memory.js";

const SUPABASE_URL = getSupabaseUrl();
// Les colonnes du fond, puis celles du vocabulaire — ajoutées après coup.
// Une base où la migration n'est pas encore passée rejetterait **toute** la
// requête pour deux colonnes optionnelles, et l'écran dirait « la mémoire n'a
// pas pu être lue » alors qu'elle est intacte. On sait maintenant que cette
// façon de perdre un écran entier existe : on ne la reproduit pas.
const BASE_COLUMNS =
  "id,project_id,kind,subject_key,statement,detail,status,payload," +
  "proposition_id,proposition_number,source_document_id,decided_by,decided_at," +
  "supersedes,superseded_by,superseded_at,created_at";

const TAXONOMY_COLUMNS = "nature,domain";

const COLUMNS = `${BASE_COLUMNS},${TAXONOMY_COLUMNS}`;

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
 * Toute la mémoire d'un projet, la plus récente d'abord.
 *
 * @returns {Promise<object[]|null>} `null` quand la lecture a échoué, `[]`
 *   quand le projet n'a rien versé. Les deux ne se disent pas de la même façon.
 */
export async function listProjectAssertions(projectId) {
  if (!projectId) return null;

  const lire = (colonnes) =>
    request("project_assertions", {
      params: { select: colonnes, project_id: `eq.${projectId}`, order: "decided_at.desc,subject_key.asc" }
    });

  try {
    return (await lire(COLUMNS)) ?? [];
  } catch {
    try {
      // Sans le vocabulaire plutôt que sans la mémoire. La nature se déduit de
      // la provenance à la lecture, le domaine restera « non classé » : l'écran
      // reste juste, il en dit seulement moins.
      return (await lire(BASE_COLUMNS)) ?? [];
    } catch {
      return null;
    }
  }
}

/**
 * Verse des affirmations au projet.
 *
 * Les doublons sont ignorés plutôt que rejetés : une proposition ne verse
 * qu'une fois chaque affirmation, et c'est ce qui rend le rattrapage des
 * propositions déjà fusionnées rejouable sans dégât.
 *
 * @returns {Promise<object[]|null>} les lignes réellement écrites, ou `null`
 */
export async function writeAssertions(rows = []) {
  const lignes = Array.isArray(rows) ? rows.filter((row) => row?.project_id && row?.subject_key) : [];
  if (lignes.length === 0) return [];

  const ecrire = (body, colonnes) =>
    request("project_assertions", {
      method: "POST",
      params: { select: colonnes, on_conflict: "proposition_id,kind,subject_key" },
      headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
      body
    });

  try {
    return (await ecrire(lignes, COLUMNS)) ?? [];
  } catch {
    try {
      // Verser l'affirmation sans son vocabulaire vaut mieux que ne pas la
      // verser : ce qu'elle dit est ce qui compte, et la nature se redéduira.
      const sansVocabulaire = lignes.map(({ nature: _n, domain: _d, ...reste }) => reste);
      return (await ecrire(sansVocabulaire, BASE_COLUMNS)) ?? [];
    } catch {
      return null;
    }
  }
}

/**
 * Marque des affirmations remplacées.
 *
 * Le lien part dans les deux sens : l'ancienne porte celle qui la remplace,
 * la nouvelle porte celle qu'elle remplace. On lit une mémoire aussi bien en
 * avant qu'en arrière — « depuis quand ne croit-on plus cela ? » est une
 * question qu'on pose autant que « qu'est-ce qui vaut aujourd'hui ? ».
 *
 * @param {{oldId: string, newId: string, at: string}[]} liens
 */
export async function markSuperseded(liens = []) {
  const valides = (Array.isArray(liens) ? liens : []).filter((lien) => lien?.oldId && lien?.newId);
  if (valides.length === 0) return true;

  try {
    for (const lien of valides) {
      await request("project_assertions", {
        method: "PATCH",
        params: { id: `eq.${lien.oldId}` },
        headers: { Prefer: "return=minimal" },
        body: { superseded_by: lien.newId, superseded_at: lien.at || new Date().toISOString() }
      });

      await request("project_assertions", {
        method: "PATCH",
        params: { id: `eq.${lien.newId}` },
        headers: { Prefer: "return=minimal" },
        body: { supersedes: lien.oldId }
      });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Verse au projet ce qu'une proposition a fait entrer.
 *
 * C'est le geste de la fusion, vu depuis la mémoire : les affirmations
 * deviennent des faits du projet, datés et signés, et celles qu'elles
 * remplacent cessent de valoir sans disparaître.
 *
 * L'ordre compte. On écrit d'abord, on remplace ensuite : si l'écriture échoue,
 * rien n'a été invalidé — le pire cas laisse la mémoire telle qu'elle était,
 * jamais amputée de ce qui valait encore.
 *
 * @returns {Promise<{written: number, superseded: number}|null>} `null` si rien
 *   n'a pu être versé — l'appelant le dit, il ne le tait pas.
 */
export async function rememberProposition({ proposition, items = [] } = {}) {
  const lignes = assertionsFromProposition({ proposition, items });
  if (lignes.length === 0) return { written: 0, superseded: 0 };

  const existantes = await listProjectAssertions(proposition.project_id);
  const ecrites = await writeAssertions(lignes);
  if (!ecrites) return null;

  // Les remplacements ne se calculent que sur ce qu'on a réellement écrit : une
  // affirmation qui n'est pas entrée ne peut pas en périmer une autre.
  const parCle = new Map(ecrites.map((row) => [`${row.kind}|${row.subject_key}`, row]));
  const plan = planSupersessions(existantes ?? [], lignes).filter((entry) =>
    parCle.has(`${entry.kind}|${entry.subjectKey}`)
  );

  const quand = proposition.merged_at || new Date().toISOString();
  const liens = plan.map((entry) => ({
    oldId: entry.id,
    newId: parCle.get(`${entry.kind}|${entry.subjectKey}`).id,
    at: quand
  }));

  await markSuperseded(liens);
  return { written: ecrites.length, superseded: liens.length };
}
