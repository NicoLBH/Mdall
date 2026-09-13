/**
 * Extraction PDF locale.
 *
 * Ce module ne sait rien du contrôle technique : il rend le texte d'un PDF, et
 * sa géométrie quand elle est lisible. Il s'appelait « ct-lab-pdf » tant qu'il
 * n'avait qu'un client ; il en a maintenant deux — l'atelier des avis, et la
 * reconnaissance des documents — et il en aura d'autres à mesure que Mdall
 * apprendra à lire les comptes rendus de chantier ou les notices.
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


import { sha256Hex } from "../utils/sha256.js";
import { contentFingerprint } from "./document-identity.js";
import { accorderLesCouleurs, enHexadecimal } from "./couleurs-du-pdf.js";

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
  // Même précaution : le tampon est relu par l'extraction positionnée.
  const data = new Uint8Array(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).slice();

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

/**
 * Lecture positionnée : le texte, mais avec sa géométrie.
 *
 * Le texte aplati perd ce que le PDF sait de sa propre mise en page. Or un
 * rapport de contrôle technique est un tableau, et son sens tient dans cette
 * géométrie :
 *
 *  - les **colonnes** — dispositions, avis, observations, N° — se lisent aux
 *    abscisses. Les reconstituer à partir de lignes de texte était la cause
 *    commune des numéros mal attribués et des intitulés vides ;
 *  - l'**indentation** porte l'arborescence du référentiel : « PREVENTION DES
 *    BRULURES… » puis « Prescriptions spécifiques… » puis l'intitulé réel de
 *    l'avis, chacun décalé de quelques points ;
 *  - l'**italique** distingue le complément d'observation du reste.
 *
 * Rien de tout cela n'est deviné : ce sont des coordonnées et des noms de
 * police, lus dans le fichier.
 *
 * Les vrais noms de police ne se résolvent qu'après `getOperatorList()`, plus
 * coûteux que la simple lecture du texte. On ne le paie que sur quelques pages
 * — les identifiants de police sont globaux au document, une poignée de pages
 * suffit à les connaître toutes.
 */
/**
 * Résolution des polices, à la demande.
 *
 * `getTextContent()` ne rend qu'un identifiant interne — `g_d0_f2` — d'où l'on
 * ne peut rien conclure. Le vrai nom, « DejaVu-Sans-Oblique », n'apparaît
 * qu'après `getOperatorList()`, nettement plus coûteux.
 *
 * On ne le paie donc que lorsqu'une police inconnue se présente. Les
 * identifiants étant globaux au document et les polices peu nombreuses, la
 * table se remplit sur les premières pages et le coût disparaît ensuite.
 */
function createFontResolver() {
  const names = new Map();

  return function resolve(page, fontNames) {
    for (const name of fontNames) {
      if (!name || names.has(name)) continue;
      try {
        const info = page.commonObjs.get(name);
        if (info?.name) names.set(name, String(info.name));
      } catch {
        // police non résolue sur cette page : une autre la portera peut-être
      }
    }
    return names;
  };
}

/**
 * Le texte d'un opérateur d'affichage, reconstruit glyphe par glyphe.
 *
 * Les nombres intercalés sont des crénages — un déplacement, pas un caractère.
 * Les ignorer est sans conséquence : la correspondance des couleurs se fait
 * espaces ôtés.
 */
function texteDesGlyphes(glyphes) {
  let dit = "";
  for (const glyphe of Array.isArray(glyphes) ? glyphes : []) {
    if (glyphe && typeof glyphe === "object") dit += String(glyphe.unicode ?? "");
  }
  return dit;
}

/**
 * Ce que la liste d'opérations montre, avec la couleur de chaque morceau.
 *
 * La couleur de remplissage est un **état** : elle se pose et vaut jusqu'à la
 * suivante, `q`/`Q` la sauvegardant et la restaurant. On la suit donc, plutôt
 * que de la lire au moment du texte — où elle n'est pas écrite.
 *
 * Cette lecture ne sert qu'à colorer : le texte et sa position viennent de
 * `getTextContent()`, qui est la porte prévue pour cela. Les deux lectures se
 * recollent dans `couleurs-du-pdf.js`, qui refuse plutôt que de deviner.
 */
function peintsDeLaListe(ops, OPS) {
  const peints = [];
  const pile = [];
  let couleur = "#000000";

  const fnArray = ops?.fnArray ?? [];
  const argsArray = ops?.argsArray ?? [];

  for (let rang = 0; rang < fnArray.length; rang += 1) {
    const fn = fnArray[rang];
    const args = argsArray[rang];

    if (fn === OPS.save) {
      pile.push(couleur);
    } else if (fn === OPS.restore) {
      couleur = pile.length ? pile.pop() : couleur;
    } else if (
      fn === OPS.setFillRGBColor || fn === OPS.setFillGray || fn === OPS.setFillCMYKColor
      || fn === OPS.setFillColor || fn === OPS.setFillColorN
    ) {
      // pdf.js normalise le plus souvent en « #rrggbb » ; les autres formes
      // passent par la même porte plutôt que par un second calcul (règle 4).
      const lue = enHexadecimal(args?.[0]) || enHexadecimal(args);
      if (lue) couleur = lue;
    } else if (
      fn === OPS.showText || fn === OPS.showSpacedText
      || fn === OPS.nextLineShowText || fn === OPS.nextLineSetSpacingShowText
    ) {
      const dit = texteDesGlyphes(fn === OPS.nextLineSetSpacingShowText ? args?.[2] : args?.[0]);
      if (dit) peints.push({ text: dit, couleur });
    }
  }

  return peints;
}

const ITALIC = /italic|oblique/i;
const BOLD = /bold|black|heavy/i;

/**
 * @returns {Promise<{page: number, items: {text: string, x: number, y: number,
 *   width: number, height: number, italic: boolean|null, bold: boolean|null}[]}[]>}
 */
export async function extractPositionedPages(bytes, { pdfjs = null } = {}) {
  const engine = pdfjs ?? (await import(`${VENDOR_BASE}/pdfjs.mjs`));
  // Copie systématique : le tampon reçu peut servir ailleurs, et pdf.js le
  // détacherait.
  const data = new Uint8Array(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).slice();

  const loadingTask = engine.getDocument({ data, disableWorker: true, useSystemFonts: true });
  const pdfDocument = await loadingTask.promise;
  const pageCount = Number(pdfDocument.numPages || 0);
  const resolveFonts = createFontResolver();

  const pages = [];
  for (let number = 1; number <= pageCount; number += 1) {
    const page = await pdfDocument.getPage(number);
    const content = await page.getTextContent();

    // Une seule liste d'opérations par page, pour deux usages : les vrais noms
    // de police, et la couleur de remplissage. La demander deux fois coûterait
    // deux fois.
    let ops = null;
    try {
      ops = await page.getOperatorList();
    } catch {
      // page illisible de ce côté : relief et couleur resteront inconnus, ils
      // ne seront pas inventés
      ops = null;
    }

    const used = [...new Set((content.items ?? []).map((item) => item?.fontName).filter(Boolean))];
    const fonts = ops ? resolveFonts(page, used) : new Map();

    const lisibles = (content.items ?? []).filter((item) => String(item?.str ?? "").trim() !== "");
    // `null` quand les deux lectures ne portent pas le même texte : une couleur
    // mal recollée inverserait le sens d'une ligne sans rien pour le dire.
    const couleurs = ops
      ? accorderLesCouleurs(peintsDeLaListe(ops, engine.OPS), lisibles.map((item) => ({ text: item.str })))
      : null;

    const items = [];
    lisibles.forEach((item, rang) => {
      const realFont = fonts.get(item.fontName);
      items.push({
        text: String(item.str),
        // `transform` porte la position finale du fragment sur la page.
        x: Math.round(item.transform[4] * 10) / 10,
        y: Math.round(item.transform[5] * 10) / 10,
        width: Math.round((item.width ?? 0) * 10) / 10,
        height: Math.round((item.height ?? 0) * 10) / 10,
        // `null` et non `false` : une police non résolue est une inconnue, pas
        // une police droite.
        italic: realFont ? ITALIC.test(realFont) : null,
        bold: realFont ? BOLD.test(realFont) : null,
        // "" quand la correspondance n'a pas pu être établie — pas « noir ».
        couleur: couleurs ? (couleurs[rang] ?? "") : ""
      });
    });

    pages.push({ page: number, items });
  }

  try {
    await (loadingTask.destroy?.() ?? Promise.resolve());
  } catch {
    // sans conséquence
  }

  return pages;
}

/** Empreinte du texte extrait : sert à repérer un document chargé deux fois. */
/** Lit un File du navigateur et en extrait les pages. */
export async function extractPagesFromFile(file, options = {}) {
  const buffer = await file.arrayBuffer();
  const extracted = await extractPdfPages(buffer, options);

  // La géométrie s'ajoute au texte, elle ne le remplace pas : légendes, phrases
  // de levée et extraits de provenance continuent de se lire sur le texte
  // aplati, qui a fait ses preuves. Un PDF dont la géométrie résiste reste donc
  // lisible comme avant.
  let positioned = null;
  try {
    // Une copie, impérativement : pdf.js prend possession du tampon qu'on lui
    // donne et le détache. Le relire ensuite lève une erreur de clonage.
    positioned = await extractPositionedPages(new Uint8Array(buffer).slice());
  } catch {
    positioned = null;
  }

  const itemsByPage = new Map((positioned ?? []).map((page) => [page.page, page.items]));

  return {
    ...extracted,
    pages: extracted.pages.map((page) => ({ ...page, items: itemsByPage.get(page.page) ?? null })),
    filename: file.name,
    sizeBytes: file.size,
    lastModified: file.lastModified ?? null,
    contentHash: await sha256Hex(extracted.pages.map((page) => page.text).join("\n")),
    // L'empreinte d'identité, elle, ignore les blancs : deux exports du même
    // rapport n'ont pas les mêmes retours à la ligne, et ce n'est pas une
    // raison d'en faire deux documents.
    fingerprint: await contentFingerprint(extracted.pages.map((page) => page.text).join("\n"))
  };
}
