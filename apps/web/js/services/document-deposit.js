/**
 * Le dépôt d'un document dans un projet : le seul chemin.
 *
 * Ces fonctions vivaient dans `analysis-runner.js`, où seule l'analyse d'un PDF
 * isolé savait s'en servir. L'atelier des avis, lui, lisait ses fichiers dans le
 * navigateur et n'en déposait aucun — d'où un onglet Documents qui ne montrait
 * pas ce qui avait pourtant été analysé, et des avis sans lien vers le livrable
 * qui les portait.
 *
 * Elles sont donc sorties telles quelles, pour que les deux chemins n'en fassent
 * qu'un. C'est le point de doctrine : **un livrable de bureau de contrôle est un
 * document ordinaire**. Ce qui le distingue, c'est ce qu'on en tire — pas la
 * façon dont il entre. Les comptes rendus de chantier, notices de sécurité et
 * plans qui viendront entreront par ici sans qu'une ligne change.
 *
 * Ce module ne reconnaît rien et ne dédoublonne rien : `document-intake.js`
 * examine, `document-filing.js` range, celui-ci écrit.
 */

import { buildSupabaseAuthHeaders, getCurrentUser, getSupabaseUrl } from "../../assets/js/auth.js";
import { encodeStoragePath, sanitizeFileName } from "../utils/storage-path.js";

const SUPABASE_URL = getSupabaseUrl();
export const STORAGE_BUCKET = "documents";

/** Les colonnes qui suffisent à reconnaître un document déjà déposé. */
const IDENTITY_COLUMNS = "id,filename,original_filename,content_fingerprint,declared_reference";

/** Ce qu'il faut d'un document pour le relire : son identité, et où il est. */
const READABLE_COLUMNS =
  `${IDENTITY_COLUMNS},mime_type,storage_bucket,storage_path,folder_id,` +
  "detected_kind,detected_kind_label,duplicate_of_document_id,issued_at,created_at";

/** Qui dépose. Le document en garde la trace, comme tout autre document. */
export async function currentUserId() {
  return (await getCurrentUser())?.id ?? null;
}

/**
 * Dépose le fichier dans le stockage.
 *
 * Le `scope` sépare deux dépôts d'un même fichier — un identifiant d'exécution
 * pour l'analyse, un identifiant de lot pour l'atelier. Sans lui, redéposer le
 * même nom écraserait l'ancien, et `x-upsert: false` échouerait.
 */
export async function uploadDocumentToStorage(file, { projectId, scope } = {}) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    throw new Error("Utilisateur authentifié introuvable pour l'upload du document.");
  }

  const path = `${currentUser.id}/${projectId}/${scope}/${sanitizeFileName(file?.name || "document.pdf")}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({
      "x-upsert": "false",
      "Content-Type": file?.type || "application/pdf"
    }),
    body: file
  });

  if (!res.ok) {
    throw new Error(`storage upload failed (${res.status}): ${await res.text().catch(() => "")}`);
  }

  return { storage_bucket: STORAGE_BUCKET, storage_path: path };
}

/** Écrit la ligne `documents` et rend ce qui vient d'être créé. */
export async function insertDocumentRow(row, select = "id,project_id,storage_bucket,storage_path") {
  const url = new URL(`${SUPABASE_URL}/rest/v1/documents`);
  if (select) url.searchParams.set("select", select);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation"
    }),
    body: JSON.stringify(row)
  });

  if (!res.ok) {
    throw new Error(`documents insert failed (${res.status}): ${await res.text().catch(() => "")}`);
  }

  const rows = await res.json();
  return Array.isArray(rows) ? (rows[0] ?? null) : rows;
}

async function selectDocuments(projectId, columns, extra = {}) {
  if (!projectId) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/documents`);
  url.searchParams.set("select", columns);
  url.searchParams.set("project_id", `eq.${projectId}`);
  url.searchParams.set("deleted_at", "is.null");
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: await buildSupabaseAuthHeaders({ Accept: "application/json" }),
    cache: "no-store"
  });

  // Ne pas savoir ce qui existe déjà n'empêche pas de déposer : le document
  // entre sans lien, plutôt que de ne pas entrer du tout.
  if (!res.ok) return [];
  return (await res.json()) ?? [];
}

/**
 * Les documents déjà connus du projet, réduits à ce qui fait leur identité.
 *
 * Le nom de fichier n'y figure que pour pouvoir nommer l'autre document dans la
 * phrase qui expliquera l'écart : « même contenu que… ». Ce qui compare, c'est
 * l'empreinte et la référence déclarée.
 */
export async function fetchDocumentIdentities(projectId) {
  return selectDocuments(projectId, IDENTITY_COLUMNS);
}

/**
 * Les documents d'une famille donnée, tels qu'on pourra les relire.
 *
 * Les doublons sont exclus : relire deux fois le même contenu ne dirait rien de
 * plus et fausserait la complétude du lot. Le document dont ils sont le doublon
 * est là, lui.
 */
export async function listProjectDocuments(projectId, { kind = null } = {}) {
  return selectDocuments(projectId, READABLE_COLUMNS, {
    duplicate_of_document_id: "is.null",
    ...(kind ? { detected_kind: `eq.${kind}` } : {}),
    order: "created_at.asc"
  });
}

/**
 * Rapatrie un document depuis le stockage, sous la forme d'un `File`.
 *
 * C'est ce qui permet de reprendre une analyse sans redemander les PDF : ils
 * sont déjà là, il suffit d'aller les chercher.
 */
export async function downloadDocumentFile(row) {
  const bucket = row?.storage_bucket || STORAGE_BUCKET;
  const path = row?.storage_path;
  if (!path) throw new Error("Document sans chemin de stockage.");

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(path)}`,
    {
      method: "GET",
      headers: await buildSupabaseAuthHeaders({}),
      cache: "no-store"
    }
  );

  if (!res.ok) {
    throw new Error(`storage download failed (${res.status})`);
  }

  const blob = await res.blob();
  const name = row.original_filename || row.filename || "document.pdf";
  return new File([blob], name, { type: row.mime_type || blob.type || "application/pdf" });
}
