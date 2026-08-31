/**
 * La découpe d'une figure, dans le navigateur.
 *
 * `avis-figures.js` dit **où** une image est posée et **à quelle ligne** du
 * tableau elle appartient ; ce module va la chercher. Il suit la matrice
 * courante du PDF pour situer chaque image, rend la page avec le pdf.js déjà
 * vendu, puis découpe le rectangle.
 *
 * **Pourquoi suivre les matrices plutôt que découper sous le texte.** La
 * première version cherchait une bande sous la phrase d'un avis. Sur une fiche
 * d'avis travaux réelle, elle n'a rien trouvé : ces fiches n'ont ni phrase ni
 * numéro, seulement une rubrique, une lettre et une photo. Les images, elles,
 * sont posées à un endroit exact, et le PDF le dit.
 *
 * **Ce que la géométrie ne dit pas, les pixels le disent.** Une image posée
 * peut être un cadre blanc ou un séparateur : on mesure l'encre après la
 * découpe, et une image blanche n'est pas retenue.
 *
 * Le rendu est coûteux : une page rendue à deux fois sa taille occupe quelques
 * mégaoctets le temps de la découpe. On ne rend donc que les pages qui portent
 * au moins une image assez grande pour être une figure.
 */

import { sha256HexBytes } from "../utils/sha256.js";
import {
  FIGURE,
  describeRowOf,
  inkRatio,
  isFigure,
  isFigureRect,
  multiplyMatrices,
  readTableColumns,
  rectFromImageMatrix,
  toCanvasRect,
  trimBlankMargins
} from "./avis-figures.js";

const VENDOR_BASE = "../../vendor/unpdf";

/** Assez pour lire une cote sur une photo, sans peser une page entière. */
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
 * Les images posées sur une page, avec leur rectangle.
 *
 * On rejoue la pile des matrices — `save`, `restore`, `transform` — et on
 * relève celle qui a cours au moment où une image est peinte. C'est exactement
 * ce que fait le rendu, en beaucoup plus court.
 */
async function imageRects(page, pdfjs) {
  const ops = await page.getOperatorList();
  const pile = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const rects = [];

  for (let rang = 0; rang < ops.fnArray.length; rang += 1) {
    const fn = ops.fnArray[rang];

    if (fn === pdfjs.OPS.save) {
      pile.push(ctm.slice());
    } else if (fn === pdfjs.OPS.restore) {
      ctm = pile.pop() ?? [1, 0, 0, 1, 0, 0];
    } else if (fn === pdfjs.OPS.transform) {
      ctm = multiplyMatrices(ops.argsArray[rang], ctm);
    } else if (
      fn === pdfjs.OPS.paintImageXObject ||
      fn === pdfjs.OPS.paintJpegXObject ||
      fn === pdfjs.OPS.paintInlineImageXObject
    ) {
      rects.push(rectFromImageMatrix(ctm));
    }
  }

  return rects;
}

/**
 * Les figures d'un document, avec la ligne de tableau qui les porte.
 *
 * @param {{file: File, pages: object[], limit?: number}} source `pages` est ce
 *   que l'extraction a lu — le texte positionné, page par page.
 * @returns {Promise<object[]>} des figures `{page, bbox, blob, sha256, width,
 *   height, inkRatio, rubric, letter, number, observation}`
 */
export async function captureFigures({ file, pages = [], limit = 12 } = {}) {
  if (!file) return [];

  const itemsParPage = new Map(
    (Array.isArray(pages) ? pages : [])
      .filter((page) => Array.isArray(page?.items))
      .map((page) => [Number(page.page), page.items])
  );

  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data, disableWorker: true, useSystemFonts: true });
  const pdf = await loadingTask.promise;

  const figures = [];
  try {
    for (let numero = 1; numero <= Number(pdf.numPages || 0); numero += 1) {
      if (figures.length >= limit) break;

      const items = itemsParPage.get(numero) ?? [];
      const colonnes = readTableColumns(items);

      const page = await pdf.getPage(numero);
      const rects = (await imageRects(page, pdfjs)).filter((rect) => isFigureRect(rect));
      if (rects.length === 0) continue;

      // La page d'avant, pour le cas où une ligne s'y est coupée : la mise en
      // page peut y avoir laissé l'évaluation d'une ligne dont l'intitulé et la
      // photo sont ici. Elle se lit toujours, même quand cette page-là ne
      // portait aucune figure.
      const precedente =
        numero > 1
          ? { items: itemsParPage.get(numero - 1) ?? [], columns: readTableColumns(itemsParPage.get(numero - 1) ?? []) }
          : null;

      const viewport = page.getViewport({ scale: SCALE });
      const pageCanvas = canvasOf(viewport.width, viewport.height);
      const pageContext = pageCanvas.getContext("2d", { willReadFrequently: true });
      // Le PDF ne peint pas son fond : sans blanc dessous, toute la page
      // compterait comme de l'encre.
      pageContext.fillStyle = "#ffffff";
      pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      await page.render({ canvasContext: pageContext, viewport }).promise;

      for (const rect of rects) {
        if (figures.length >= limit) break;

        const cible = toCanvasRect(rect, { pageHeight: viewport.height / SCALE, scale: SCALE });
        const largeur = Math.min(cible.width, pageCanvas.width - cible.x);
        const hauteur = Math.min(cible.height, pageCanvas.height - cible.y);
        if (largeur < 8 || hauteur < 8) continue;

        const pixels = pageContext.getImageData(cible.x, cible.y, largeur, hauteur);
        const ratio = inkRatio(pixels);
        if (!isFigure(ratio)) continue;

        // Un cadre blanc autour de la photo se rogne : la vignette montrerait
        // sinon surtout du papier.
        const utile = trimBlankMargins(pixels) ?? { x: 0, y: 0, width: largeur, height: hauteur };
        if (utile.width < 8 || utile.height < 8) continue;

        const cropCanvas = canvasOf(utile.width, utile.height);
        cropCanvas
          .getContext("2d")
          .drawImage(
            pageCanvas,
            cible.x + utile.x,
            cible.y + utile.y,
            utile.width,
            utile.height,
            0,
            0,
            utile.width,
            utile.height
          );

        const blob = await toBlob(cropCanvas);
        if (!blob) continue;

        figures.push({
          page: numero,
          bbox: rect,
          blob,
          sha256: await sha256HexBytes(new Uint8Array(await blob.arrayBuffer())),
          width: utile.width,
          height: utile.height,
          inkRatio: Math.round(ratio * 1000) / 1000,
          ...describeRowOf(items, rect, colonnes, { previous: precedente })
        });
      }
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
