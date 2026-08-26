/**
 * Chargement des fixtures et des ground truths.
 *
 * Deux fichiers par cas :
 *  - `case.json`         : le manifest (couche SOURCE + paramètres du run) ;
 *  - `ground-truth.json` : ce qu'un humain a labellisé pour ce cas.
 *
 * Le manifest ne contient jamais d'interprétation : uniquement ce qui a été reçu.
 */

import { dirname, isAbsolute, resolve } from "node:path";

import { readJsonFile, readTextFile, sha256 } from "./json-io.mjs";
import { expectationOf } from "./metrics.mjs";

export const CASE_SCHEMA = "mdall.spike.case/1";
export const GROUND_TRUTH_SCHEMA = "mdall.spike.ground-truth/1";

function requireString(value, field, context) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${context}: champ "${field}" manquant ou vide`);
  }
  return value;
}

function resolveRef(baseDir, ref) {
  return isAbsolute(ref) ? ref : resolve(baseDir, ref);
}

/**
 * Charge un manifest de cas et résout le contenu des sources.
 * `content` (inline) ou `content_ref` (fichier relatif au manifest) sont acceptés ;
 * une source sans contenu reste chargeable, avec `content: null` et
 * `content_available: false` — l'absence de données n'est pas une erreur silencieuse.
 */
export async function loadCase(manifestPath) {
  const absolutePath = resolve(manifestPath);
  const baseDir = dirname(absolutePath);
  const manifest = await readJsonFile(absolutePath);
  const context = `case ${absolutePath}`;

  if (manifest.schema !== CASE_SCHEMA) {
    throw new Error(`${context}: schema attendu "${CASE_SCHEMA}", reçu "${manifest.schema}"`);
  }
  requireString(manifest.case_id, "case_id", context);
  requireString(manifest.spike, "spike", context);

  if (!Array.isArray(manifest.sources) || manifest.sources.length === 0) {
    throw new Error(`${context}: "sources" doit être un tableau non vide`);
  }

  const seenSourceIds = new Set();
  const sources = [];
  for (const [index, rawSource] of manifest.sources.entries()) {
    const sourceContext = `${context} (source #${index})`;
    requireString(rawSource.source_id, "source_id", sourceContext);
    requireString(rawSource.source_type, "source_type", sourceContext);
    if (seenSourceIds.has(rawSource.source_id)) {
      throw new Error(`${sourceContext}: source_id dupliqué "${rawSource.source_id}"`);
    }
    seenSourceIds.add(rawSource.source_id);

    let content = typeof rawSource.content === "string" ? rawSource.content : null;
    let contentPath = null;
    if (content === null && typeof rawSource.content_ref === "string") {
      contentPath = resolveRef(baseDir, rawSource.content_ref);
      content = await readTextFile(contentPath);
    }

    sources.push({
      ...rawSource,
      order: Number.isFinite(rawSource.order) ? rawSource.order : index,
      content,
      content_available: content !== null,
      content_path: contentPath,
      content_sha256: content === null ? null : sha256(content)
    });
  }

  sources.sort((a, b) => a.order - b.order);

  let groundTruth = null;
  if (typeof manifest.ground_truth_ref === "string") {
    groundTruth = await loadGroundTruth(resolveRef(baseDir, manifest.ground_truth_ref));
    if (groundTruth.caseId !== manifest.case_id) {
      throw new Error(
        `${context}: la ground truth cible le cas "${groundTruth.caseId}" et non "${manifest.case_id}"`
      );
    }
  }

  return {
    manifestPath: absolutePath,
    baseDir,
    caseId: manifest.case_id,
    spike: manifest.spike,
    title: manifest.title ?? manifest.case_id,
    description: manifest.description ?? "",
    params: manifest.params ?? {},
    metadata: manifest.metadata ?? {},
    sources,
    groundTruth
  };
}

/** Charge une ground truth et valide la forme de chaque item labellisé. */
export async function loadGroundTruth(groundTruthPath) {
  const absolutePath = resolve(groundTruthPath);
  const payload = await readJsonFile(absolutePath);
  const context = `ground truth ${absolutePath}`;

  if (payload.schema !== GROUND_TRUTH_SCHEMA) {
    throw new Error(`${context}: schema attendu "${GROUND_TRUTH_SCHEMA}", reçu "${payload.schema}"`);
  }
  requireString(payload.case_id, "case_id", context);
  if (!Array.isArray(payload.items)) {
    throw new Error(`${context}: "items" doit être un tableau`);
  }

  const seenKeys = new Set();
  const items = payload.items.map((item, index) => {
    const itemContext = `${context} (item #${index})`;
    const key = String(item.key ?? item.id ?? "");
    if (key === "") throw new Error(`${itemContext}: "key" ou "id" est obligatoire`);
    if (seenKeys.has(key)) throw new Error(`${itemContext}: clé dupliquée "${key}"`);
    seenKeys.add(key);
    requireString(item.kind, "kind", itemContext);
    // Lève si l'expectation est inconnue.
    expectationOf(item);
    return { ...item, key };
  });

  return {
    path: absolutePath,
    caseId: payload.case_id,
    annotator: payload.annotator ?? null,
    annotatedAt: payload.annotated_at ?? null,
    notes: payload.notes ?? "",
    items
  };
}

/** Restreint une ground truth à un `kind` donné (extraction, continuity, …). */
export function itemsOfKind(groundTruth, kind) {
  return (groundTruth?.items ?? []).filter((item) => item.kind === kind);
}
