/**
 * Extraction PDF locale pour le laboratoire CT Continuity.
 *
 * Utilise unpdf — la même bibliothèque que la fonction Edge `extract-pdf-text`
 * — mais dans le navigateur, et avec `mergePages: false`.
 *
 * Trois conséquences, toutes voulues :
 *  - le rapport chargé ne quitte jamais le poste : aucun envoi réseau, aucun
 *    fichier déposé dans le storage, aucune ligne créée en base ;
 *  - les pages ne sont pas fusionnées, donc chaque extrait garde son numéro de
 *    page et la provenance devient vérifiable ;
 *  - le laboratoire n'a besoin d'aucun déploiement pour fonctionner.
 *
 * Les fichiers vendus arrivent par `npm run build:web`. Sans build, le module
 * échoue avec un message explicite plutôt qu'une erreur d'import opaque.
 */

const VENDOR_BASE = "../../vendor/unpdf";

let unpdfPromise = null;

async function loadUnpdf() {
  const [core, pdfjs] = await Promise.all([
    import(`${VENDOR_BASE}/index.mjs`),
    import(`${VENDOR_BASE}/pdfjs.mjs`)
  ]);

  // unpdf résout PDF.js par un import de spécificateur nu, que le navigateur
  // ne sait pas résoudre : on lui passe le module vendu explicitement.
  await core.definePDFJSModule(() => pdfjs);
  return core;
}

export function getUnpdf() {
  if (!unpdfPromise) {
    unpdfPromise = loadUnpdf().catch((error) => {
      unpdfPromise = null;
      throw new Error(
        `Le moteur PDF local n'a pas pu être chargé (${error.message}). ` +
          `Lancer « npm run build:web » pour copier les dépendances dans apps/web/vendor.`
      );
    });
  }
  return unpdfPromise;
}

/**
 * Extrait le texte d'un PDF, page par page.
 *
 * @param {ArrayBuffer|Uint8Array} bytes
 * @returns {Promise<{pages: {page: number, text: string}[], pageCount: number, charCount: number}>}
 */
export async function extractPdfPages(bytes, { unpdf = null } = {}) {
  const engine = unpdf ?? (await getUnpdf());
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  const document = await engine.getDocumentProxy(data);
  const { totalPages, text } = await engine.extractText(document, { mergePages: false });

  const pages = (Array.isArray(text) ? text : [text]).map((pageText, index) => ({
    page: index + 1,
    text: String(pageText ?? "")
  }));

  return {
    pages,
    pageCount: Number.isInteger(totalPages) ? totalPages : pages.length,
    charCount: pages.reduce((total, page) => total + page.text.length, 0)
  };
}

/** Empreinte du texte extrait : sert à repérer un document chargé deux fois. */
async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Lit un File du navigateur et en extrait les pages. */
export async function extractPagesFromFile(file, options = {}) {
  const buffer = await file.arrayBuffer();
  const extracted = await extractPdfPages(buffer, options);

  return {
    ...extracted,
    filename: file.name,
    sizeBytes: file.size,
    lastModified: file.lastModified ?? null,
    contentHash: await sha256Hex(extracted.pages.map((page) => page.text).join("\n"))
  };
}
