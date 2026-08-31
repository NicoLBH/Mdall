/**
 * Les figures d'un rapport : ce que le texte ne dit pas.
 *
 * Un rapport de bureau de contrôle montre autant qu'il écrit. « Fissuration en
 * pied de voile » ne dit ni l'ampleur, ni l'emplacement, ni qu'aucun repère de
 * mesure n'a été posé à côté — la photo, elle, le dit. Jusqu'ici cette moitié
 * de l'information restait dans le PDF, et personne ne la voyait en relisant
 * un avis six mois plus tard.
 *
 * **Comment on trouve une figure sans savoir où elle est.** Nous ne lisons pas
 * les objets image du PDF : ils sont posés par des transformations empilées
 * qu'il faudrait rejouer, et un schéma vectoriel n'est pas un objet image du
 * tout. On procède autrement, et plus simplement : le texte d'un avis a une
 * position ; ce qui suit, jusqu'au bloc de texte suivant, est une **bande**.
 * Si cette bande est assez grande, et si elle porte de l'encre, c'est une
 * figure.
 *
 * **La vérification par les pixels est ce qui rend la méthode honnête.** Une
 * bande calculée peut être vide — deux paragraphes espacés en produisent une.
 * On ne conclut donc jamais sur la géométrie seule : on regarde la page rendue,
 * et une bande blanche n'est pas une figure. Sans ce contrôle, l'écran
 * afficherait des rectangles blancs sous des avis, et il faudrait deux minutes
 * à quelqu'un pour cesser de faire confiance à l'écran entier.
 *
 * Ce module est pur : il calcule des rectangles et compte des pixels. Le rendu
 * de la page, la découpe et l'envoi vivent ailleurs.
 *
 * Les coordonnées sont celles du PDF — origine en bas à gauche, `y` vers le
 * haut. La conversion vers l'écran appartient à qui dessine.
 */

/** Ce qu'il faut pour qu'une bande mérite d'être regardée. */
export const FIGURE = {
  /** En points PDF. Une bande plus courte est un interligne, pas une image. */
  MIN_HEIGHT: 60,
  /** Une colonne étroite reste possible ; un filet de trois points, non. */
  MIN_WIDTH: 80,
  /** L'air qu'on laisse autour, pour ne pas couper une légende au ras. */
  MARGIN: 4,
  /**
   * La part de pixels non blancs à partir de laquelle on parle d'encre.
   *
   * Une page scannée n'est jamais parfaitement blanche : le seuil ne peut pas
   * être zéro. Une photo, elle, en couvre plusieurs pour cent.
   */
  MIN_INK_RATIO: 0.015,
  /** Au-delà, ce n'est plus une figure : c'est une page de garde ou un fond. */
  MAX_INK_RATIO: 0.98
};

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function boxOf(items = []) {
  if (items.length === 0) return null;

  return items.reduce(
    (box, item) => ({
      left: Math.min(box.left, item.x),
      right: Math.max(box.right, item.x + (item.width || 0)),
      bottom: Math.min(box.bottom, item.y),
      top: Math.max(box.top, item.y + (item.height || 0))
    }),
    {
      left: items[0].x,
      right: items[0].x + (items[0].width || 0),
      bottom: items[0].y,
      top: items[0].y + (items[0].height || 0)
    }
  );
}

/**
 * Où se trouve, sur la page, le texte d'un avis.
 *
 * On cherche les fragments qui portent une part de l'extrait cité. Un PDF
 * découpe ses lignes comme il veut : chercher la phrase entière ne trouverait
 * presque jamais rien, chercher un mot trop court trouverait partout. On prend
 * donc les mots longs de l'extrait, et on retient les fragments qui en portent
 * au moins un.
 *
 * **Rien trouvé rend `null`.** Placer la bande « au jugé » produirait une
 * figure qui n'illustre pas ce qu'elle prétend illustrer.
 */
export function locateTextBlock(items = [], needle = "") {
  const mots = normalize(needle)
    .split(" ")
    .filter((mot) => mot.length >= 5);
  if (mots.length === 0) return null;

  const touches = (Array.isArray(items) ? items : []).filter((item) => {
    const texte = normalize(item?.text);
    return texte && mots.some((mot) => texte.includes(mot));
  });

  return boxOf(touches);
}

/**
 * Le paragraphe entier, à partir de la ligne trouvée.
 *
 * Un avis tient rarement sur une ligne : « Fissuration en pied de voile
 * constatée / lors de la visite du 12 août ». La recherche par mots longs n'en
 * attrape qu'une, et la bande commencerait alors **au-dessus** de la seconde —
 * la figure emporterait une phrase et l'afficherait comme si elle en faisait
 * partie.
 *
 * On descend donc de ligne en ligne tant qu'elles se suivent : même colonne, et
 * pas plus d'un interligne d'écart. C'est la définition d'un paragraphe, et
 * elle se mesure au lieu de se supposer.
 */
export function expandBlockToParagraph(items = [], block = null, { lineGap = 6, leftTolerance = 24 } = {}) {
  if (!block) return null;

  const lignes = (Array.isArray(items) ? items : []).filter((item) => item && Number.isFinite(item.y));
  let courant = { ...block };
  let absorbe = true;

  while (absorbe) {
    absorbe = false;
    for (const item of lignes) {
      const haut = item.y + (item.height || 0);
      const dessous = haut <= courant.bottom + 0.5;
      const proche = courant.bottom - haut <= lineGap;
      const alignee = Math.abs(item.x - courant.left) <= leftTolerance;
      if (!dessous || !proche || !alignee) continue;
      if (item.y >= courant.bottom) continue;

      courant = {
        left: Math.min(courant.left, item.x),
        right: Math.max(courant.right, item.x + (item.width || 0)),
        bottom: item.y,
        top: courant.top
      };
      absorbe = true;
    }
  }

  return courant;
}

/**
 * La bande qui suit un bloc de texte, jusqu'au suivant.
 *
 * Elle s'arrête au premier fragment de texte rencontré en descendant : une
 * bande qui l'engloberait afficherait des phrases comme si elles faisaient
 * partie de l'image.
 *
 * @returns {{x: number, y: number, width: number, height: number}|null} en
 *   coordonnées PDF, `y` étant le bas du rectangle
 */
export function figureZoneBelow(items = [], block = null, page = {}, options = {}) {
  if (!block) return null;

  const marge = Number(options.margin ?? FIGURE.MARGIN);
  const minHeight = Number(options.minHeight ?? FIGURE.MIN_HEIGHT);
  const minWidth = Number(options.minWidth ?? FIGURE.MIN_WIDTH);
  const bas = Number(page.marginBottom ?? 0);

  const hauts = (Array.isArray(items) ? items : [])
    .filter((item) => item && item.y + (item.height || 0) <= block.bottom - marge)
    .map((item) => item.y + (item.height || 0));

  const plafond = block.bottom - marge;
  const plancher = hauts.length > 0 ? Math.max(...hauts) + marge : bas;

  const hauteur = plafond - plancher;
  const largeur = Math.max(block.right - block.left, Number(page.textWidth ?? 0));
  if (hauteur < minHeight || largeur < minWidth) return null;

  return {
    x: Math.max(0, Math.min(block.left, Number(page.textLeft ?? block.left))),
    y: plancher,
    width: largeur,
    height: hauteur
  };
}

/**
 * La colonne de texte d'une page, mesurée sur ses fragments.
 *
 * Une figure est presque toujours plus large que la phrase qui la cite : caler
 * la découpe sur cette phrase couperait l'image. On prend donc la largeur de ce
 * que la page écrit — mesurée, pas supposée.
 */
export function pageTextBounds(items = []) {
  const box = boxOf((Array.isArray(items) ? items : []).filter((item) => item && Number.isFinite(item.x)));
  if (!box) return null;
  return { left: box.left, right: box.right, width: box.right - box.left };
}

/**
 * Les marges blanches d'une image découpée, à retirer.
 *
 * La bande va d'un bloc de texte au suivant : la figure y flotte, entourée de
 * blanc. Garder ce blanc donnerait des vignettes où l'on ne distingue rien.
 * On rogne donc ce qui ne porte pas d'encre — en mesurant, ligne par ligne et
 * colonne par colonne, jamais en supposant une marge type.
 *
 * @returns {{x: number, y: number, width: number, height: number}|null} `null`
 *   quand l'image est entièrement blanche : il n'y a rien à rogner ni à garder.
 */
export function trimBlankMargins(image = {}, { tolerance = 12, padding = 6 } = {}) {
  const data = image?.data;
  const largeur = Number(image?.width) || 0;
  const hauteur = Number(image?.height) || 0;
  if (!data || largeur <= 0 || hauteur <= 0) return null;

  const encre = (x, y) => {
    const rang = (y * largeur + x) * 4;
    if (data[rang + 3] === 0) return false;
    return 255 - data[rang] > tolerance || 255 - data[rang + 1] > tolerance || 255 - data[rang + 2] > tolerance;
  };

  let haut = -1;
  let bas = -1;
  let gauche = largeur;
  let droite = -1;

  for (let y = 0; y < hauteur; y += 1) {
    let vue = false;
    for (let x = 0; x < largeur; x += 1) {
      if (!encre(x, y)) continue;
      vue = true;
      if (x < gauche) gauche = x;
      if (x > droite) droite = x;
    }
    if (!vue) continue;
    if (haut < 0) haut = y;
    bas = y;
  }

  if (haut < 0 || droite < 0) return null;

  const x = Math.max(0, gauche - padding);
  const y = Math.max(0, haut - padding);

  return {
    x,
    y,
    width: Math.min(largeur - x, droite - gauche + 1 + padding * 2),
    height: Math.min(hauteur - y, bas - haut + 1 + padding * 2)
  };
}

/**
 * La part de pixels qui portent de l'encre.
 *
 * Un pixel est « encré » dès qu'il s'écarte du blanc : une photo claire ou un
 * schéma au trait fin comptent autant qu'un aplat noir. On lit un pixel sur
 * quatre en largeur comme en hauteur — assez pour distinguer une bande vide
 * d'une figure, seize fois moins de travail.
 *
 * @param {{data: Uint8ClampedArray|number[], width: number, height: number}} image
 */
export function inkRatio(image = {}, { tolerance = 12, step = 4 } = {}) {
  const data = image?.data;
  const largeur = Number(image?.width) || 0;
  const hauteur = Number(image?.height) || 0;
  if (!data || largeur <= 0 || hauteur <= 0) return 0;

  let lus = 0;
  let encres = 0;

  for (let y = 0; y < hauteur; y += step) {
    for (let x = 0; x < largeur; x += step) {
      const rang = (y * largeur + x) * 4;
      const alpha = data[rang + 3];
      lus += 1;
      // Un pixel transparent n'est pas de l'encre : c'est du papier qu'on n'a
      // pas peint.
      if (alpha === 0) continue;
      if (255 - data[rang] > tolerance || 255 - data[rang + 1] > tolerance || 255 - data[rang + 2] > tolerance) {
        encres += 1;
      }
    }
  }

  return lus === 0 ? 0 : encres / lus;
}

/**
 * Cette bande porte-t-elle une figure ?
 *
 * C'est ici que la géométrie cesse de suffire. Une bande blanche est un blanc :
 * l'afficher comme une figure ferait douter de tout le reste de l'écran.
 */
export function isFigure(ratio, options = {}) {
  const min = Number(options.minInkRatio ?? FIGURE.MIN_INK_RATIO);
  const max = Number(options.maxInkRatio ?? FIGURE.MAX_INK_RATIO);
  const valeur = Number(ratio);
  if (!Number.isFinite(valeur)) return false;
  return valeur >= min && valeur <= max;
}

/**
 * Le rectangle, exprimé pour qui dessine.
 *
 * Le PDF compte ses `y` depuis le bas, un canevas depuis le haut. La conversion
 * est écrite une fois ici plutôt que recopiée à chaque découpe : c'est le genre
 * d'inversion qu'on rate une fois sur deux.
 */
export function toCanvasRect(zone = null, { pageHeight = 0, scale = 1 } = {}) {
  if (!zone) return null;

  return {
    x: Math.max(0, Math.round(zone.x * scale)),
    y: Math.max(0, Math.round((pageHeight - zone.y - zone.height) * scale)),
    width: Math.max(1, Math.round(zone.width * scale)),
    height: Math.max(1, Math.round(zone.height * scale))
  };
}
