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
