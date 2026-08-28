/**
 * Le catalogue des reconnaisseurs.
 *
 * C'est le seul fichier à modifier pour qu'une nouvelle nature de document
 * entre dans Mdall — un compte rendu de chantier, une notice de sécurité, un
 * plan de béton armé. Ni la gestion documentaire, ni le registre de
 * reconnaissance n'ont à en savoir quoi que ce soit.
 *
 * Les reconnaisseurs qui s'appuient sur le moteur de l'atelier reçoivent leurs
 * dépendances d'ici : celui-ci vit dans `apps/web/vendor/spikes`, copié au
 * build depuis `spikes/`, et n'est donc chargé qu'à la demande.
 */

import { recognizeDocument } from "./document-recognition.js";
import { createCtReportRecognizer } from "./document-recognizer-ct.js";

const VENDOR_BASE = "../../vendor/spikes";

let recognizersPromise = null;

async function loadRecognizers() {
  const [documentMeta, legend] = await Promise.all([
    import(`${VENDOR_BASE}/ct-continuity/document-meta.mjs`),
    import(`${VENDOR_BASE}/ct-continuity/legend.mjs`)
  ]);

  return [
    createCtReportRecognizer({
      readDocumentMeta: documentMeta.readDocumentMeta,
      discoverLegend: legend.discoverLegend
    })
  ];
}

export function getRecognizers() {
  if (!recognizersPromise) {
    recognizersPromise = loadRecognizers().catch((error) => {
      recognizersPromise = null;
      throw new Error(
        `Les reconnaisseurs de documents n'ont pas pu être chargés (${error.message}). ` +
          `Lancer « npm run build:web » pour copier le moteur dans apps/web/vendor.`
      );
    });
  }
  return recognizersPromise;
}

/**
 * Reconnaît un document déjà extrait.
 *
 * @param {{pages?: object[], text?: string, filename?: string, mimeType?: string}} document
 */
export async function recognize(document) {
  return recognizeDocument(document, { recognizers: await getRecognizers() });
}

/**
 * Reconnaît un fichier PDF, sans jamais faire échouer ce qui l'appelle.
 *
 * La reconnaissance enrichit un dépôt de document ; elle ne le conditionne
 * pas. Un PDF que pdf.js refuse d'ouvrir doit pouvoir être déposé quand même —
 * on ne saura simplement pas ce que c'est, et on ne prétendra pas le savoir.
 *
 * @returns {Promise<object|null>} le verdict, ou `null` si l'extraction a échoué
 */
export async function recognizeFile(file) {
  try {
    const { extractPdfPages } = await import("./pdf-extraction.js");
    const extracted = await extractPdfPages(await file.arrayBuffer());
    return await recognize({
      pages: extracted.pages,
      filename: file.name,
      mimeType: file.type || "application/pdf"
    });
  } catch {
    return null;
  }
}

/**
 * Traduit un verdict en colonnes de la table `documents`.
 *
 * Un verdict absent ne s'écrit pas : une reconnaissance non faite n'est pas
 * une reconnaissance négative, et laisser les colonnes à null le dit mieux que
 * n'importe quelle valeur de remplissage.
 */
export function toDocumentColumns(recognition) {
  if (!recognition) return {};

  return {
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
  };
}
