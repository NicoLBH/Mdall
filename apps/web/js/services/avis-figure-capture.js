/**
 * La découpe d'une figure, dans le navigateur.
 *
 * `avis-figures.js` dit **où** découper ; ce module découpe. Il rend la page
 * avec le pdf.js déjà vendu — celui qui sert à lire le texte et à montrer la
 * page citée — puis extrait la bande et la pèse.
 *
 * Deux choses ne sont pas négociables ici :
 *
 *  - **le contrôle par les pixels a lieu après la découpe, pas avant.** Une
 *    bande calculée peut être vide ; l'écrire quand même remplirait la mémoire
 *    du projet de rectangles blancs, et il suffit d'un pour qu'on cesse de
 *    croire l'écran ;
 *  - **le fichier ne quitte pas le poste avant d'être une figure.** On rend, on
 *    découpe, on mesure, et on n'envoie que ce qui a passé la mesure.
 *
 * Le rendu est coûteux : une page rendue à deux fois sa taille occupe quelques
 * mégaoctets le temps de la découpe. On rend donc une page à la fois, et le
 * nombre de pages est borné par l'appelant.
 */

import { sha256HexBytes } from "../utils/sha256.js";
import {
  FIGURE,
  expandBlockToParagraph,
  figureZoneBelow,
  inkRatio,
  isFigure,
  locateTextBlock,
  toCanvasRect,
  trimBlankMargins
} from "./avis-figures.js";

const VENDOR_BASE = "../../vendor/unpdf";

/** Assez pour lire une cote sur une photo, sans peser une page entière en mémoire. */
const SCALE = 2;

let pdfjsPromise = null;

function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(`${VENDOR_BASE}/pdfjs.mjs`).catch((error) => {
      pdfjsPromise = null;
      throw new Error(`pdf.js introuvable dans le dossier vendu : ${error?.message ?? error}`);
    });
  }
  return pdfjsPromise;
}

function canvasOf(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function toBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

/**
 * Les figures d'un document, pour les avis qu'il porte.
 *
 * @param {{file: File, pages: object[], avis: {reference: string, page: number,
 *   sentence: string}[], limit?: number}} source
 * @returns {Promise<{reference: string, page: number, bbox: object, blob: Blob,
 *   sha256: string, width: number, height: number, inkRatio: number}[]>}
 */
export async function captureFigures({ file, pages = [], avis = [], limit = 8 } = {}) {
  const cibles = (Array.isArray(avis) ? avis : [])
    .filter((entry) => entry?.reference && Number.isInteger(Number(entry.page)) && String(entry.sentence ?? "").trim())
    .slice(0, Math.max(0, Number(limit) || 0));

  if (!file || cibles.length === 0) return [];

  const itemsParPage = new Map(
    (Array.isArray(pages) ? pages : [])
      .filter((page) => Array.isArray(page?.items))
      .map((page) => [Number(page.page), page.items])
  );

  const engine = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = engine.getDocument({ data, disableWorker: true, useSystemFonts: true });
  const pdf = await loadingTask.promise;

  const figures = [];
  try {
    for (const cible of cibles) {
      const items = itemsParPage.get(Number(cible.page));
      if (!items) continue;

      // Le paragraphe entier, pas la seule ligne trouvée : sans cela la bande
      // commencerait au-dessus de la seconde ligne de l'avis, et la figure
      // emporterait une phrase.
      const bloc = expandBlockToParagraph(items, locateTextBlock(items, cible.sentence));
      if (!bloc) continue;

      const page = await pdf.getPage(Number(cible.page));
      const viewport = page.getViewport({ scale: SCALE });
      const largeurPage = viewport.width / SCALE;

      // La bande prend toute la largeur de la page : une figure déborde presque
      // toujours la colonne de texte, et s'y caler la couperait. C'est le
      // rognage du blanc, mesuré sur les pixels, qui ramène ensuite l'image à
      // sa taille — supposer une marge la couperait tout autant.
      const zone = figureZoneBelow(items, bloc, { textLeft: 0, textWidth: largeurPage });
      if (!zone) continue;

      const pageCanvas = canvasOf(viewport.width, viewport.height);
      const pageContext = pageCanvas.getContext("2d", { willReadFrequently: true });
      // Le PDF ne peint pas son fond : sans blanc dessous, toute la page
      // compterait comme de l'encre.
      pageContext.fillStyle = "#ffffff";
      pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      await page.render({ canvasContext: pageContext, viewport }).promise;

      const rect = toCanvasRect(zone, { pageHeight: viewport.height / SCALE, scale: SCALE });
      const largeur = Math.min(rect.width, pageCanvas.width - rect.x);
      const hauteur = Math.min(rect.height, pageCanvas.height - rect.y);
      if (largeur < 8 || hauteur < 8) continue;

      const pixels = pageContext.getImageData(rect.x, rect.y, largeur, hauteur);
      const ratio = inkRatio(pixels);
      if (!isFigure(ratio)) continue;

      // La figure flotte dans la bande : on rogne le blanc autour, sinon la
      // vignette montre surtout du papier.
      const utile = trimBlankMargins(pixels) ?? { x: 0, y: 0, width: largeur, height: hauteur };
      if (utile.width < 8 || utile.height < 8) continue;

      const cropCanvas = canvasOf(utile.width, utile.height);
      cropCanvas
        .getContext("2d")
        .drawImage(pageCanvas, rect.x + utile.x, rect.y + utile.y, utile.width, utile.height, 0, 0, utile.width, utile.height);
      const blob = await toBlob(cropCanvas);
      if (!blob) continue;

      figures.push({
        reference: cible.reference,
        page: Number(cible.page),
        bbox: zone,
        blob,
        sha256: await sha256HexBytes(new Uint8Array(await blob.arrayBuffer())),
        width: utile.width,
        height: utile.height,
        inkRatio: Math.round(ratio * 1000) / 1000
      });
    }
  } finally {
    try {
      await (loadingTask.destroy?.() ?? Promise.resolve());
    } catch {
      // sans conséquence
    }
  }

  return figures;
}

export { FIGURE };
