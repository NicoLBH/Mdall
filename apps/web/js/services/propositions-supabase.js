/**
 * Les propositions d'un projet, conservées entre deux ouvertures.
 *
 * Ce module ne décide de rien : les règles — quelles transitions sont permises,
 * ce qu'une fusion ferait, ce qu'un refus exige — vivent dans
 * `proposition-state.js`, qui est pur et testé. Ici, il n'y a que des
 * allers-retours avec la base.
 *
 * Une chose s'y lit quand même, parce qu'elle gouverne chaque requête : **le
 * corpus d'une analyse est une requête, pas une copie.** Une proposition ne
 * duplique aucun document ; elle en marque l'état. C'est ce qui remplace la
 * branche, et ce qui permettra de lire « le corpus accepté + ceux de cette
 * proposition » sans jamais rien recopier.
 */

import { buildSupabaseAuthHeaders, getCurrentUser, getSupabaseUrl } from "../../assets/js/auth.js";
import { PROPOSITION } from "./proposition-state.js";

const SUPABASE_URL = getSupabaseUrl();

const COLUMNS =
  "id,number,project_id,title,description,status,created_by,created_at,updated_at,merged_at,merged_by";

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
 * Les propositions d'un projet, la plus récente d'abord.
 *
 * Le nombre de documents accompagne chaque ligne : c'est la première chose qu'on
 * veut savoir d'une proposition, et aller la chercher ensuite ferait une requête
 * par ligne.
 */
export async function listPropositions(projectId, { status = null } = {}) {
  if (!projectId) return [];

  try {
    const [rows, documents] = await Promise.all([
      request("propositions", {
        params: {
          select: COLUMNS,
          project_id: `eq.${projectId}`,
          order: "created_at.desc",
          ...(status ? { status: `eq.${status}` } : {})
        }
      }),
      request("documents", {
        params: {
          select: "id,proposition_id",
          project_id: `eq.${projectId}`,
          proposition_id: "not.is.null",
          deleted_at: "is.null"
        }
      })
    ]);

    const counts = new Map();
    for (const document of documents ?? []) {
      counts.set(document.proposition_id, (counts.get(document.proposition_id) ?? 0) + 1);
    }

    return (rows ?? []).map((row) => ({ ...row, documentCount: counts.get(row.id) ?? 0 }));
  } catch {
    // Ne pas savoir ce qu'il y a n'autorise pas à prétendre qu'il n'y a rien :
    // l'écran distingue une liste vide d'une base injoignable, et le dit.
    return null;
  }
}

/** Une proposition et ses documents. */
export async function loadProposition(propositionId) {
  if (!propositionId) return null;

  try {
    const rows = await request("propositions", {
      params: { select: COLUMNS, id: `eq.${propositionId}`, limit: "1" }
    });
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Ouvre une proposition.
 *
 * Elle naît vide : les documents la rejoignent ensuite, ce qui permet d'en
 * ajouter d'autres plus tard, comme une pull request accumule des commits.
 */
export async function createProposition({ projectId, title, description = "" } = {}) {
  if (!projectId || !String(title ?? "").trim()) return null;

  try {
    const createdBy = (await getCurrentUser())?.id ?? null;
    const rows = await request("propositions", {
      method: "POST",
      params: { select: COLUMNS },
      headers: { Prefer: "return=representation" },
      body: {
        project_id: projectId,
        title: String(title).trim(),
        description: String(description ?? "").trim() || null,
        status: PROPOSITION.OPEN,
        created_by: createdBy
      }
    });
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Rattache des documents déjà déposés à une proposition, et les met en attente.
 *
 * Les documents sont écrits **avant** — le dépôt existe par lui-même, et n'a pas
 * à dépendre de ce qui vient après. Cette fonction ne fait que changer leur état
 * vis-à-vis du corpus : ils sont là, ils attendent un jugement.
 *
 * @returns {Promise<number|null>} le nombre de documents rattachés, ou `null` si
 *   la base n'a pas répondu — les documents restent alors déposés, et l'écran le
 *   dit plutôt que de laisser croire à une proposition qui n'existe pas.
 */
export async function attachDocuments(propositionId, documentIds = []) {
  if (!propositionId || documentIds.length === 0) return 0;

  try {
    await request("documents", {
      method: "PATCH",
      params: { id: `in.(${documentIds.join(",")})` },
      headers: { Prefer: "return=minimal" },
      body: { proposition_id: propositionId, corpus_state: "proposed" }
    });
    return documentIds.length;
  } catch {
    return null;
  }
}

/** Les documents rattachés à une proposition. */
export async function listPropositionDocuments(propositionId) {
  if (!propositionId) return [];

  try {
    return (
      (await request("documents", {
        params: {
          select:
            "id,filename,original_filename,mime_type,corpus_state,detected_kind,detected_kind_label," +
            "detected_author,detection_status,detection_reason,content_fingerprint,declared_reference," +
            "duplicate_of_document_id,reissue_of_document_id,issued_at,created_at",
          proposition_id: `eq.${propositionId}`,
          deleted_at: "is.null",
          order: "created_at.asc"
        }
      })) ?? []
    );
  } catch {
    return [];
  }
}

/**
 * Les décisions déjà prises sur une proposition.
 *
 * Elles seules se conservent. Ce que l'analyse produit se recalcule à chaque
 * ouverture ; ce qu'un humain a répondu, jamais.
 */
export async function listPropositionItems(propositionId) {
  if (!propositionId) return [];

  try {
    return (
      (await request("proposition_items", {
        params: {
          select: "id,item_type,item_key,payload,status,reason,decided_by,decided_at",
          proposition_id: `eq.${propositionId}`
        }
      })) ?? []
    );
  } catch {
    return [];
  }
}

/**
 * Enregistre les décisions d'un humain sur des affirmations.
 *
 * En lot, parce que trancher un bloc entier d'un clic est le geste normal :
 * dix-sept requêtes pour dix-sept avis feraient attendre pour rien, et
 * laisseraient l'écran à moitié à jour si l'une échouait en chemin.
 *
 * L'écriture se fait par l'identité naturelle de chaque affirmation — la
 * proposition, son type, sa clé —, de sorte que se raviser mette à jour la ligne
 * au lieu d'en ajouter une contradictoire.
 *
 * @returns {Promise<boolean>} faux si la base n'a pas répondu : l'écran le dit
 *   plutôt que de laisser croire à des réponses retenues qui seraient perdues au
 *   prochain rechargement.
 */
export async function decidePropositionItems({ propositionId, projectId, decisions = [] } = {}) {
  if (!propositionId || !projectId || decisions.length === 0) return true;

  try {
    const decidedBy = (await getCurrentUser())?.id ?? null;
    const decidedAt = new Date().toISOString();

    await request("proposition_items", {
      method: "POST",
      params: { on_conflict: "proposition_id,item_type,item_key" },
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: decisions.map(({ item, status, reason = null }) => ({
        proposition_id: propositionId,
        project_id: projectId,
        item_type: item.itemType,
        item_key: item.itemKey,
        payload: item.payload ?? null,
        status,
        reason,
        decided_by: decidedBy,
        decided_at: decidedAt
      }))
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Applique une proposition au corpus.
 *
 * Fusionner n'enregistre pas un état : cela enregistre des **réponses**. Les
 * documents acceptés entrent, les refusés sont marqués — jamais supprimés, et
 * visibles dans l'onglet Documents, car un fichier qui existe en base et
 * n'apparaît nulle part est le mensonge qu'on a déjà corrigé une fois.
 *
 * L'ordre compte : la proposition ne passe en « fusionnée » qu'en dernier. Si
 * quelque chose échoue avant, elle reste ouverte et l'on peut recommencer —
 * alors qu'une proposition marquée fusionnée dont les documents ne seraient pas
 * entrés laisserait un projet incohérent sans moyen d'y revenir.
 *
 * @returns {Promise<{merged: boolean, accepted: number, refused: number}|null>}
 */
export async function mergeProposition({ proposition, acceptedDocumentIds = [], refusedDocumentIds = [] } = {}) {
  if (!proposition?.id) return null;

  try {
    if (acceptedDocumentIds.length > 0) {
      await request("documents", {
        method: "PATCH",
        params: { id: `in.(${acceptedDocumentIds.join(",")})` },
        headers: { Prefer: "return=minimal" },
        body: { corpus_state: "accepted" }
      });
    }

    if (refusedDocumentIds.length > 0) {
      await request("documents", {
        method: "PATCH",
        params: { id: `in.(${refusedDocumentIds.join(",")})` },
        headers: { Prefer: "return=minimal" },
        body: { corpus_state: "refused" }
      });
    }

    const mergedBy = (await getCurrentUser())?.id ?? null;
    await request("propositions", {
      method: "PATCH",
      params: { id: `eq.${proposition.id}`, status: `eq.${PROPOSITION.OPEN}` },
      headers: { Prefer: "return=minimal" },
      body: { status: PROPOSITION.MERGED, merged_at: new Date().toISOString(), merged_by: mergedBy }
    });

    return { merged: true, accepted: acceptedDocumentIds.length, refused: refusedDocumentIds.length };
  } catch {
    return null;
  }
}
