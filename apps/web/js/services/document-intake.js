/**
 * Ce qui se passe quand un document entre dans Mdall.
 *
 * Trois questions, dans cet ordre, et une seule lecture du fichier pour y
 * répondre : qu'est-ce que c'est, quelle est son empreinte, et ce contenu
 * est-il déjà là ?
 *
 * Aucune de ces questions n'est propre au contrôle technique. Un compte rendu
 * de chantier, une notice de sécurité, un plan de béton armé passeront par ici
 * sans qu'une ligne change — c'est le catalogue des reconnaisseurs qui
 * s'allongera, pas ce module.
 */

import { contentFingerprint, findRelated, IDENTITY } from "./document-identity.js";
import { recognize } from "./document-recognizers.js";

/**
 * Lit un fichier et rend ce qu'on en sait, sans jamais faire échouer ce qui
 * l'appelle.
 *
 * L'examen enrichit un dépôt ; il ne le conditionne pas. Un PDF que pdf.js
 * refuse d'ouvrir doit pouvoir être déposé quand même — on ne saura simplement
 * pas ce que c'est, et on ne prétendra pas le savoir.
 *
 * @returns {Promise<{recognition: object|null, fingerprint: string|null}>}
 */
export async function inspectFile(file) {
  try {
    const { extractPdfPages } = await import("./pdf-extraction.js");
    const extracted = await extractPdfPages(await file.arrayBuffer());
    const pages = extracted.pages;

    return {
      recognition: await recognize({
        pages,
        filename: file.name,
        mimeType: file.type || "application/pdf"
      }),
      fingerprint: await contentFingerprint(pages.map((page) => page.text).join("\n"))
    };
  } catch {
    return { recognition: null, fingerprint: null };
  }
}

/**
 * Cherche, parmi les documents déjà enregistrés, celui auquel celui-ci se
 * rapporte.
 *
 * @param {{fingerprint: string|null, recognition: object|null}} inspection
 * @param {object[]} known lignes de `documents` du même projet
 */
export function relateToKnown(inspection, known = []) {
  return findRelated(
    {
      fingerprint: inspection?.fingerprint ?? null,
      reference: inspection?.recognition?.declaredReference ?? null
    },
    known.map((row) => ({
      id: row.id,
      filename: row.original_filename ?? row.filename ?? null,
      fingerprint: row.content_fingerprint ?? null,
      reference: row.declared_reference ?? null
    }))
  );
}

/**
 * Traduit ce qu'on a appris d'un document en colonnes de la table `documents`.
 *
 * Un examen qui n'a rien donné ne s'écrit pas : laisser les colonnes à null dit
 * « on n'a pas su » mieux que n'importe quelle valeur de remplissage, et
 * n'importe laquelle serait prise pour un verdict.
 */
export function toDocumentColumns(inspection, related = null) {
  const recognition = inspection?.recognition ?? null;
  const columns = {};

  if (recognition) {
    Object.assign(columns, {
      detection_status: recognition.status,
      detection_reason: recognition.reason || null,
      detection_evidence: recognition.evidence ?? null,
      detection_confidence: recognition.confidence,
      detected_kind: recognition.kind,
      detected_kind_label: recognition.kindLabel,
      detected_author: recognition.author,
      detected_at: new Date().toISOString(),
      detector: recognition.recognizer,
      detector_version: recognition.recognizerVersion === null ? null : String(recognition.recognizerVersion),
      declared_reference: recognition.declaredReference,
      issued_at: recognition.issuedAt
    });
  }

  if (inspection?.fingerprint) columns.content_fingerprint = inspection.fingerprint;

  if (related?.verdict === IDENTITY.DUPLICATE) columns.duplicate_of_document_id = related.document.id;
  if (related?.verdict === IDENTITY.REISSUE) columns.reissue_of_document_id = related.document.id;

  return columns;
}
