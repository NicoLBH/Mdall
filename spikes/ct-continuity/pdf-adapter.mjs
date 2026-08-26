/**
 * Spike 1 — Phase B : adaptateur PDF (Node).
 *
 * Utilise `unpdf`, la bibliothèque déjà employée par la fonction Edge
 * `supabase/functions/extract-pdf-text`. Deux différences avec elle, et elles
 * comptent :
 *
 *  1. `mergePages: false`. La fonction de production fusionne les pages, donc le
 *     texte qu'elle produit ne porte plus aucun numéro de page et `source_page`
 *     y est invérifiable. Ici la pagination est conservée, et la provenance
 *     redevient contrôlable.
 *  2. Aucun accès à Supabase : ni `analysis_run`, ni storage, ni écriture en
 *     base. On lit un fichier, on rend du texte.
 *
 * Le laboratoire de l'Atelier fait exactement la même chose dans le navigateur,
 * avec la même bibliothèque copiée au build.
 */

import { readFile } from "node:fs/promises";

/**
 * Extrait le texte d'un PDF, page par page.
 *
 * @param {{path?: string, bytes?: Uint8Array}} input
 * @returns {Promise<{pages: {page: number, text: string}[], pageCount: number}>}
 */
export async function extractPages({ path, bytes } = {}) {
  if (!path && !bytes) {
    throw new Error("pdf-adapter: fournir `path` ou `bytes`");
  }

  let unpdf;
  try {
    unpdf = await import("unpdf");
  } catch (error) {
    throw new Error(
      `pdf-adapter: unpdf est introuvable (${error.message}). Lancer « npm install » à la racine du dépôt.`
    );
  }

  const data = bytes ?? new Uint8Array(await readFile(path));
  const document = await unpdf.getDocumentProxy(data);
  const { totalPages, text } = await unpdf.extractText(document, { mergePages: false });

  const pages = (Array.isArray(text) ? text : [text]).map((pageText, index) => ({
    page: index + 1,
    text: String(pageText ?? "")
  }));

  return { pages, pageCount: Number.isInteger(totalPages) ? totalPages : pages.length };
}

/**
 * Construit une source de cas à partir d'un PDF, prête pour le harness.
 * Le contenu est laissé paginé : c'est ce qui rend la provenance vérifiable.
 */
export async function buildSourceFromPdf({ path, sourceId, sourceType = "control_office_report", issuer = null, issuedAt = null, order = 0 }) {
  const { pages, pageCount } = await extractPages({ path });

  return {
    source_id: sourceId,
    source_type: sourceType,
    issuer,
    issued_at: issuedAt,
    order,
    pages,
    metadata: { path, page_count: pageCount }
  };
}

export const pdfAdapter = { available: true, extractPages, buildSourceFromPdf };

export default pdfAdapter;
