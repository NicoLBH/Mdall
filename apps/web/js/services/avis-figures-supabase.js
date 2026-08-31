/**
 * Les allers-retours des figures.
 *
 * Une figure vit à deux endroits : ses pixels dans le stockage, sa provenance
 * en base. L'ordre d'écriture n'est pas indifférent — on envoie les pixels
 * d'abord, la ligne ensuite. Une ligne sans image afficherait un cadre vide ;
 * une image sans ligne n'est qu'un fichier oublié, que la prochaine découpe
 * remplacera.
 *
 * Rien n'est jamais réécrit : une même découpe, reconnue à son empreinte, n'est
 * enregistrée qu'une fois — la seconde lecture d'un rapport ne duplique rien.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();
const BUCKET = "documents";
const COLUMNS =
  "id,project_id,document_id,page,bbox,avis_reference,rubric,avis_letter,observation," +
  "storage_bucket,storage_path,sha256,width,height,ink_ratio," +
  "caption,caption_model,caption_generated_at,created_at";

function encodeStoragePath(path) {
  return String(path ?? "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

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
 * Les figures déjà retenues pour ces documents.
 *
 * @returns {Promise<object[]|null>} `null` si la lecture a échoué — l'appelant
 *   s'abstient alors de redécouper : mieux vaut ne rien ajouter que d'ajouter
 *   deux fois.
 */
export async function listFiguresForDocuments(documentIds = []) {
  const ids = [...new Set((Array.isArray(documentIds) ? documentIds : []).map(String).filter(Boolean))];
  if (ids.length === 0) return [];

  try {
    return (
      (await request("avis_figures", {
        params: { select: COLUMNS, document_id: `in.(${ids.join(",")})`, order: "page.asc" }
      })) ?? []
    );
  } catch {
    return null;
  }
}

/** Les pixels d'une figure, envoyés au stockage. */
async function uploadFigure({ projectId, documentId, sha256, blob }) {
  const path = `figures/${projectId}/${documentId}/${sha256}.png`;

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({ "x-upsert": "true", "Content-Type": "image/png" }),
    body: blob
  });

  if (!response.ok) throw new Error(`storage upload failed (${response.status})`);
  return path;
}

/**
 * Enregistre une figure : ses pixels, puis sa provenance.
 *
 * @returns {Promise<object|null>} la ligne écrite, ou `null` — une figure
 *   perdue n'empêche pas les autres, et la lecture suivante la retrouvera.
 */
export async function saveFigure({ projectId, documentId, figure } = {}) {
  if (!projectId || !documentId || !figure?.blob || !figure?.sha256) return null;

  try {
    const path = await uploadFigure({ projectId, documentId, sha256: figure.sha256, blob: figure.blob });

    const rows = await request("avis_figures", {
      method: "POST",
      params: { select: COLUMNS, on_conflict: "document_id,sha256" },
      headers: { Prefer: "return=representation,resolution=ignore-duplicates" },
      body: [
        {
          project_id: projectId,
          document_id: documentId,
          page: figure.page,
          bbox: figure.bbox ?? null,
          // Une ligne favorable n'a pas de numéro : `null` le dit, une chaîne
          // vide le cacherait, et un numéro pris ailleurs serait un faux.
          avis_reference: String(figure.number ?? "").trim() || null,
          rubric: String(figure.rubric ?? "").trim() || null,
          avis_letter: String(figure.letter ?? "").trim() || null,
          observation: String(figure.observation ?? "").trim() || null,
          storage_bucket: BUCKET,
          storage_path: path,
          sha256: figure.sha256,
          width: figure.width ?? null,
          height: figure.height ?? null,
          ink_ratio: figure.inkRatio ?? null
        }
      ]
    });

    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Les pixels d'une figure, rapatriés pour être affichés.
 *
 * Le stockage demande une autorisation : on ne peut pas pointer une balise
 * `img` vers lui. Le lien objet rendu ici est à révoquer par l'appelant quand
 * l'écran change.
 */
export async function loadFigureUrl(figure) {
  const path = figure?.storage_path;
  if (!path) return "";

  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(figure.storage_bucket || BUCKET)}/${encodeStoragePath(path)}`,
      { method: "GET", headers: await buildSupabaseAuthHeaders({}), cache: "no-store" }
    );
    if (!response.ok) return "";
    return URL.createObjectURL(await response.blob());
  } catch {
    return "";
  }
}

/**
 * Demande à décrire une figure.
 *
 * À la main, une figure à la fois : un rapport peut en porter trente, et les
 * décrire toutes d'office coûterait trente appels pour une lecture que personne
 * n'a demandée. Une figure déjà décrite rend sa légende sans rien redemander.
 *
 * @returns {Promise<{caption: string, model: string}|{error: string}>}
 */
export async function describeFigure({ figureId, sentence = "" } = {}) {
  if (!figureId) return { error: "empty" };

  let response = null;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/describe-avis-figure`, {
      method: "POST",
      headers: await buildSupabaseAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ figure_id: figureId, sentence })
    });
  } catch {
    return { error: "unreachable" };
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (response.status === 503 || String(payload?.code ?? "") === "LLM_NOT_CONFIGURED") {
      return { error: "unconfigured" };
    }
    return { error: response.status === 404 ? "unreachable" : "refused" };
  }

  const payload = await response.json().catch(() => null);
  const caption = String(payload?.caption ?? "").trim();
  return caption ? { caption, model: String(payload?.model ?? "") } : { error: "empty" };
}
