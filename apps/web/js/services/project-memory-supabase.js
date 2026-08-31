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

// Le vocabulaire, puis le drapeau de revérification : deux vagues de colonnes
// ajoutées après coup, et chacune peut manquer sur une base en retard. On
// dégrade par paliers plutôt que de tout perdre.
const TAXONOMY_COLUMNS = "nature,domain";
const REVIEW_COLUMNS = "needs_review_since,reviewed_at,reviewed_by";

const COLUMNS = `${BASE_COLUMNS},${TAXONOMY_COLUMNS},${REVIEW_COLUMNS}`;

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

  // Du plus complet au plus sûr. Chaque palier perd une chose et garde le
  // reste : sans le drapeau, puis sans le vocabulaire, puis rien — et « rien »
  // veut dire « je n'ai pas pu lire », pas « la mémoire est vide ».
  for (const colonnes of [COLUMNS, `${BASE_COLUMNS},${TAXONOMY_COLUMNS}`, BASE_COLUMNS]) {
    try {
      return (await lire(colonnes)) ?? [];
    } catch {
      // On essaie le palier suivant.
    }
  }
  return null;
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

  // Ce qu'une hypothèse remplacée entraîne. Seules les hypothèses entraînent :
  // un constat qui évolue ne rend rien d'autre suspect, et marquer à chaque
  // mouvement rendrait le signal inutilisable.
  const suspectes = await markDependentsOf({
    projectId: proposition.project_id,
    superseded: plan.map((entry) => (existantes ?? []).find((row) => row.id === entry.id)).filter(Boolean),
    at: quand
  });

  return { written: ecrites.length, superseded: liens.length, flagged: suspectes };
}

/**
 * Verse une hypothèse déclarée par quelqu'un.
 *
 * Le même chemin qu'une fusion, en plus court : on écrit, on remplace la
 * précédente valeur du même sujet, on lève les drapeaux de ce qui reposait
 * dessus. **C'est ici que l'étape E devient vérifiable** — sans un moyen de
 * poser une hypothèse puis d'en changer, rien de ce mécanisme ne peut être
 * essayé sur un vrai projet.
 *
 * L'ordre est celui de la fusion, et pour la même raison : on écrit d'abord, on
 * périme ensuite. Si l'écriture échoue, rien n'a été invalidé.
 *
 * @returns {Promise<{written: object, superseded: number, flagged: number}|null>}
 */
export async function rememberHypothesis(row) {
  if (!row?.project_id || !row?.subject_key) return null;

  const existantes = await listProjectAssertions(row.project_id);
  const ecrites = await writeAssertions([row]);
  if (!ecrites || ecrites.length === 0) return null;

  const nouvelle = ecrites[0];
  const quand = row.decided_at || new Date().toISOString();

  // La valeur précédente du même sujet cesse de valoir. `planSupersessions`
  // ignore ce qui vient de la même proposition ; une hypothèse déclarée n'en a
  // pas, on compare donc sur la clé et sur l'identifiant.
  const anciennes = (existantes ?? []).filter(
    (entry) =>
      entry.kind === row.kind &&
      entry.subject_key === row.subject_key &&
      !entry.superseded_by &&
      entry.id !== nouvelle.id
  );

  const liens = anciennes.map((entry) => ({ oldId: entry.id, newId: nouvelle.id, at: quand }));
  if (liens.length > 0) await markSuperseded(liens);

  const flagged = await markDependentsOf({ projectId: row.project_id, superseded: anciennes, at: quand });

  // Poser une hypothèse est un acte : c'est son émission. L'écrire ici donne à
  // son histoire un premier point, et évite qu'une hypothèse validée plus tard
  // paraisse sortie de nulle part.
  try {
    const { ACT } = await import("./hypothesis-acts.js");
    const { recordAct } = await import("./hypothesis-acts-supabase.js");
    await recordAct({
      project_id: row.project_id,
      assertion_id: nouvelle.id,
      verdict: ACT.EMITTED,
      declared_by: row.decided_by ?? null,
      created_at: quand
    });
  } catch {
    // L'hypothèse est versée : lui manquer son premier acte ne la retire pas.
  }

  return { written: nouvelle, superseded: liens.length, flagged };
}

/**
 * Lève les drapeaux qu'un remplacement d'hypothèse rend nécessaires.
 *
 * Isolé de `rememberProposition` parce qu'il échoue séparément : ne pas savoir
 * marquer ce qui devient suspect ne doit pas défaire une fusion qui, elle, a
 * eu lieu. Le pire cas est une mémoire à jour dont les drapeaux manquent — pas
 * une mémoire à moitié écrite.
 */
async function markDependentsOf({ projectId, superseded = [], at = "" } = {}) {
  if (superseded.length === 0) return 0;

  try {
    const { planReviewFlags } = await import("./assertion-dependencies.js");
    const { listAssertionDependencies, markNeedsReview } = await import("./assertion-dependencies-supabase.js");

    const liens = await listAssertionDependencies(projectId);
    // `null` : on n'a pas pu lire le graphe. Ne rien marquer est le seul choix
    // honnête — marquer sur un graphe vide dirait « rien ne dépend de cette
    // hypothèse », ce qui est une affirmation qu'on n'est pas en mesure de faire.
    if (!liens) return 0;

    return await markNeedsReview(planReviewFlags(superseded, liens, at));
  } catch {
    return 0;
  }
}
