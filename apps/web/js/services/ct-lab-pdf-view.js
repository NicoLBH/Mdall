/**
 * Affichage d'une page de PDF, à l'endroit exact d'un extrait cité.
 *
 * Tout cet outil repose sur une règle : on ne conclut pas sans preuve citée.
 * Mais une citation qu'on ne peut pas ouvrir reste une citation sur parole.
 * Ce module ferme la boucle — le document, la page, la phrase surlignée — pour
 * qu'un avis « levé » se vérifie d'un clic plutôt que se croie.
 *
 * Trois choix, tous délibérés :
 *
 *  - **pdf.js vient du dossier vendu**, celui d'unpdf, déjà utilisé pour lire
 *    le texte. Aucun CDN, aucune requête : le fichier ne quitte pas le poste,
 *    et l'affichage marche hors ligne comme le reste de l'écran.
 *  - **Les octets sont relus depuis le `File`** au moment de l'affichage.
 *    Garder en mémoire cent vingt PDF coûterait des centaines de mégaoctets ;
 *    le navigateur, lui, tient la poignée pour rien.
 *  - **Le surlignage échoue explicitement.** L'extrait vient d'une extraction
 *    différente de celle de pdf.js : les mots peuvent être découpés autrement.
 *    Quand la phrase n'est pas localisée, l'écran le dit — il n'invente pas un
 *    surlignage approximatif sur une preuve.
 *
 * Les classes reprennent celles du lecteur de l'onglet Documents
 * (`documents-pdf-viewer__*`) : même rendu, même feuille de style.
 */

const VENDOR_BASE = "../../vendor/unpdf";

/**
 * Clé de comparaison : sans accent, sans casse, espaces réduits.
 *
 * Volontairement recopiée ici plutôt qu'importée du moteur vendu : le
 * surlignage est une affaire d'affichage, il ne doit pas dépendre du build du
 * spike pour fonctionner.
 */
function normalizeTextKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

let pdfjsPromise = null;

function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(`${VENDOR_BASE}/pdfjs.mjs`).catch((error) => {
      pdfjsPromise = null;
      throw new Error(
        `Le moteur PDF local n'a pas pu être chargé (${error.message}). ` +
          `Lancer « npm run build:web » pour copier les dépendances dans apps/web/vendor.`
      );
    });
  }
  return pdfjsPromise;
}

/**
 * Repère les éléments de texte couverts par un extrait.
 *
 * L'extrait cité et le texte rendu par pdf.js proviennent de deux lectures
 * différentes du même fichier : espaces, césures et ordre des fragments
 * peuvent différer. On cherche donc la phrase entière, puis des préfixes de
 * plus en plus courts — jamais moins de quelques mots, sous peine de surligner
 * n'importe quoi.
 *
 * @returns {{from: number, to: number, matched: string}|null}
 */
export function locateExcerpt(items, excerpt) {
  const needleFull = normalizeTextKey(excerpt);
  if (needleFull.length < 8) return null;

  // Index : pour chaque caractère du texte concaténé, l'élément dont il vient.
  const owners = [];
  let haystack = "";
  items.forEach((item, index) => {
    const text = normalizeTextKey(item?.str ?? "");
    if (text === "") return;
    if (haystack !== "") {
      haystack += " ";
      owners.push(index);
    }
    haystack += text;
    for (let position = 0; position < text.length; position += 1) owners.push(index);
  });

  for (const length of [needleFull.length, 90, 60, 40, 24]) {
    if (length > needleFull.length) continue;
    const needle = needleFull.slice(0, length).trim();
    if (needle.length < 8) break;

    const at = haystack.indexOf(needle);
    if (at === -1) continue;

    return {
      from: owners[at],
      to: owners[Math.min(at + needle.length - 1, owners.length - 1)],
      matched: needle
    };
  }

  return null;
}

/**
 * Rend une page dans un conteneur, extrait surligné.
 *
 * @param {HTMLElement} container
 * @param {object} options
 * @param {ArrayBuffer|Uint8Array} options.bytes
 * @param {number} options.page numéro de page, à partir de 1
 * @param {string} options.excerpt phrase à surligner
 * @param {number} options.width largeur cible en pixels
 * @returns {Promise<{pageCount: number, highlighted: boolean}>}
 */
/**
 * Un document entier, page après page.
 *
 * `renderPdfPage` montre **une** page — celle où se trouve une citation, ce
 * pour quoi elle a été écrite. Lire un rapport n'est pas la même chose :
 * on le parcourt, on revient en arrière, on compare deux pages. Feuilleter
 * bouton par bouton n'est pas lire.
 *
 * Deux précautions, et elles vont ensemble :
 *
 *  - **la place de chaque page est connue d'avance.** On demande à pdf.js les
 *    dimensions des pages sans les dessiner, et on pose des cadres à la bonne
 *    taille. Le document a donc sa hauteur réelle dès le premier instant : la
 *    barre de défilement ne bouge pas sous la main pendant que le rendu
 *    avance.
 *  - **on ne dessine que ce qui approche de l'écran.** Quarante pages peintes
 *    d'un coup, c'est quarante canevas en mémoire pour deux qu'on regarde. Un
 *    observateur les fait apparaître à mesure, et le document reste ouvert
 *    tant que le lecteur l'est — le refermer obligerait à relire le fichier à
 *    chaque page.
 *
 * @returns {Promise<{pageCount: number, dispose: () => void}>} `dispose` rend
 *   le document et l'observateur : à appeler en fermant le lecteur.
 */
export async function renderPdfDocument(container, { bytes, width = 900, margin = "1200px" } = {}) {
  const pdfjs = await loadPdfJs();
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  const loadingTask = pdfjs.getDocument({ data, disableWorker: true, useSystemFonts: true });
  const document_ = await loadingTask.promise;
  const pageCount = Number(document_.numPages || 0);

  container.replaceChildren();

  const dessinees = new Set();

  const dessiner = async (pageNode) => {
    const numero = Number(pageNode.dataset.pdfPage);
    if (!numero || dessinees.has(numero)) return;
    dessinees.add(numero);

    try {
      const page = await document_.getPage(numero);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.max(0.2, width / Math.max(base.width, 1));
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.className = "documents-pdf-viewer__canvas";
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;

      // Au-delà de deux, le gain ne se voit pas et la mémoire double.
      const outputScale = Math.min(2, window.devicePixelRatio > 1 ? window.devicePixelRatio : 1);
      canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
      canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      await page.render({
        canvasContext: context,
        viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
      }).promise;

      // La page a pu être retirée pendant le rendu — le lecteur s'est refermé.
      if (!pageNode.isConnected) return;
      pageNode.replaceChildren(canvas);
    } catch {
      // Une page illisible n'emporte pas le document : son cadre reste, vide,
      // et les autres se lisent.
      dessinees.delete(numero);
    }
  };

  const observer =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              observer.unobserve(entry.target);
              dessiner(entry.target);
            }
          },
          { root: container.closest(".review-pdf__body") ?? null, rootMargin: margin }
        )
      : null;

  for (let numero = 1; numero <= pageCount; numero += 1) {
    const page = await document_.getPage(numero);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.max(0.2, width / Math.max(base.width, 1));
    const viewport = page.getViewport({ scale });

    const pageNode = document.createElement("div");
    pageNode.className = "documents-pdf-viewer__page";
    pageNode.dataset.pdfPage = String(numero);
    // Le cadre porte la taille réelle avant d'être peint : sans elle, la barre
    // de défilement s'allongerait sous la main à mesure du rendu.
    pageNode.style.width = `${Math.ceil(viewport.width)}px`;
    pageNode.style.height = `${Math.ceil(viewport.height)}px`;

    container.appendChild(pageNode);
    if (observer) observer.observe(pageNode);
    else dessiner(pageNode);
  }

  return {
    pageCount,
    dispose() {
      observer?.disconnect();
      try {
        loadingTask.destroy?.() ?? document_.destroy?.();
      } catch {
        // sans conséquence : le lecteur se ferme de toute façon
      }
    }
  };
}

export async function renderPdfPage(container, { bytes, page = 1, excerpt = "", width = 900 } = {}) {
  const pdfjs = await loadPdfJs();
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  // `disableWorker` : le worker vient d'un fichier séparé que le dossier vendu
  // ne fournit pas. Une page à la fois, le rendu synchrone suffit largement.
  const loadingTask = pdfjs.getDocument({ data, disableWorker: true, useSystemFonts: true });
  const document_ = await loadingTask.promise;
  const pageCount = Number(document_.numPages || 0);
  const pageNumber = Math.min(Math.max(1, Math.round(page)), Math.max(pageCount, 1));

  const pdfPage = await document_.getPage(pageNumber);
  const base = pdfPage.getViewport({ scale: 1 });
  const scale = Math.max(0.2, width / Math.max(base.width, 1));
  const viewport = pdfPage.getViewport({ scale });

  const pageNode = document.createElement("div");
  pageNode.className = "documents-pdf-viewer__page";
  pageNode.style.width = `${Math.ceil(viewport.width)}px`;

  const canvas = document.createElement("canvas");
  canvas.className = "documents-pdf-viewer__canvas";
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Impossible d'initialiser le rendu PDF dans ce navigateur.");

  const outputScale = window.devicePixelRatio > 1 ? window.devicePixelRatio : 1;
  canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
  canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  await pdfPage.render({
    canvasContext: context,
    viewport,
    transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
  }).promise;

  const textLayer = document.createElement("div");
  textLayer.className = "documents-pdf-viewer__text-layer";
  textLayer.style.width = `${Math.floor(viewport.width)}px`;
  textLayer.style.height = `${Math.floor(viewport.height)}px`;

  const textContent = await pdfPage.getTextContent();
  const items = Array.isArray(textContent?.items) ? textContent.items : [];
  const located = excerpt ? locateExcerpt(items, excerpt) : null;

  const nodes = [];
  items.forEach((item, index) => {
    if (!item?.str) {
      nodes.push(null);
      return;
    }
    const node = document.createElement("span");
    node.className = "documents-pdf-viewer__text-item";
    node.textContent = item.str;

    const tx = pdfjs.Util.transform(viewport.transform, item.transform);
    const angle = Math.atan2(tx[1], tx[0]);
    const fontHeight = Math.hypot(tx[2], tx[3]);
    node.style.left = `${tx[4]}px`;
    node.style.top = `${tx[5] - fontHeight}px`;
    node.style.fontSize = `${fontHeight}px`;
    node.style.transform = `rotate(${angle}rad)`;
    node.style.transformOrigin = "0% 0%";

    if (located && index >= located.from && index <= located.to) {
      node.classList.add("ctlab-pdf__cited");
      nodes.push(node);
    } else {
      nodes.push(null);
    }
    textLayer.appendChild(node);
  });

  pageNode.appendChild(canvas);
  pageNode.appendChild(textLayer);
  container.replaceChildren(pageNode);

  // Amener la citation sous les yeux, plutôt que de laisser chercher.
  const firstCited = nodes.find(Boolean);
  if (firstCited) firstCited.scrollIntoView({ block: "center" });

  // Libérer le document est un confort, pas une garantie : selon la version de
  // pdf.js la méthode vit sur la tâche de chargement ou sur le document. Un
  // échec ici ne doit surtout pas effacer la page qu'on vient de dessiner.
  try {
    await (loadingTask.destroy?.() ?? document_.destroy?.() ?? Promise.resolve());
  } catch {
    // sans conséquence : la page reste affichée
  }

  return { pageCount, highlighted: Boolean(located) };
}
