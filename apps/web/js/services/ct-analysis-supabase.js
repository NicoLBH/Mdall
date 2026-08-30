/**
 * Le dossier d'avis d'un projet, conservé entre deux ouvertures.
 *
 * Ce module ne décide de rien : les règles — comment se calcule l'empreinte
 * d'un lot, ce qui se met à jour, ce qui se marque absent — vivent dans
 * `ct-analysis-store.js`, qui est pur et testé. Ici, il n'y a que des
 * allers-retours avec la base.
 *
 * Un principe s'y lit quand même, parce qu'il est dans chaque requête : on
 * n'efface rien. Pas de `delete`, nulle part. Un avis qui disparaît du lot est
 * marqué absent ; c'est tout ce qu'on s'autorise.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { resolveCurrentBackendProjectId } from "./project-supabase-sync.js";
import { reconcileAvis, toAvisRows, toRunRow } from "./ct-analysis-store.js";

const SUPABASE_URL = getSupabaseUrl();

const AVIS_COLUMNS =
  "id,external_reference,title,opinion_raw,opinion_label,status,resolution_reason," +
  "raised_at,raised_in_document_id,last_seen_document_id,resolved_at,evidence," +
  "pack_id,pack_version,absent_from_corpus,updated_at";

const RUN_COLUMNS =
  "id,corpus_fingerprint,corpus_documents,document_count,avis_count,tracked_avis_count," +
  "guard_violation_count,packs_used,engine_version,computed_at,proposition_id,trigger_source";

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

/** Le projet courant, sans jamais en créer un : lire n'est pas écrire. */
export async function getCurrentProjectId() {
  try {
    return (await resolveCurrentBackendProjectId()) || null;
  } catch {
    return null;
  }
}

/**
 * Ce qui avait été calculé la dernière fois : la dernière exécution, et les
 * avis qu'elle a laissés.
 *
 * Rendre `null` quand rien n'est joignable est délibéré : l'atelier doit
 * pouvoir travailler hors ligne sur des fichiers déposés à la main, comme il
 * l'a toujours fait. La persistance ajoute une mémoire, elle ne conditionne
 * pas l'outil.
 */
export async function loadCtAnalysis(projectId) {
  if (!projectId) return null;

  try {
    const [runs, avis] = await Promise.all([
      request("ct_analysis_runs", {
        params: { select: RUN_COLUMNS, project_id: `eq.${projectId}`, order: "computed_at.desc", limit: "1" }
      }),
      request("ct_avis", { params: { select: AVIS_COLUMNS, project_id: `eq.${projectId}` } })
    ]);

    return { run: runs?.[0] ?? null, avis: avis ?? [] };
  } catch {
    return null;
  }
}

/**
 * Enregistre ce qui vient d'être calculé.
 *
 * Les avis sont écrits par leur identité naturelle — projet et numéro —, ce
 * qui met à jour ceux qu'on connaissait et ajoute les autres. Ceux qui ne
 * ressortent plus du lot sont marqués absents. Aucun n'est supprimé.
 *
 * @returns {Promise<{saved: number, marked: number}|null>} `null` si la base
 *   n'a pas répondu : l'analyse reste affichée, elle n'est simplement pas
 *   conservée, et l'écran le dit.
 */
export async function saveCtAnalysis({
  projectId,
  result,
  documentIds = {},
  corpusFingerprint,
  corpusDocuments = null,
  documentCount,
  propositionId = null,
  triggerSource = null
} = {}) {
  if (!projectId || !result) return null;

  try {
    const known = (await request("ct_avis", {
      params: { select: "id,external_reference,absent_from_corpus", project_id: `eq.${projectId}` }
    })) ?? [];

    const computed = toAvisRows(result, { projectId, documentIds });
    const { upserts, missing } = reconcileAvis(known, computed);

    if (upserts.length > 0) {
      await request("ct_avis", {
        method: "POST",
        params: { on_conflict: "project_id,external_reference" },
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: upserts
      });
    }

    // Marquer, jamais effacer. Un document a pu être écarté par erreur, un
    // numéro mal lu la veille : dans les deux cas, supprimer l'avis
    // supprimerait aussi la trace de ce qui avait permis de l'affirmer.
    for (const row of missing) {
      await request("ct_avis", {
        method: "PATCH",
        params: { id: `eq.${row.id}` },
        headers: { Prefer: "return=minimal" },
        body: { absent_from_corpus: true }
      });
    }

    await request("ct_analysis_runs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: toRunRow(result, {
        projectId,
        corpusFingerprint,
        corpusDocuments,
        documentCount,
        propositionId,
        triggerSource
      })
    });

    return { saved: upserts.length, marked: missing.length };
  } catch {
    return null;
  }
}
