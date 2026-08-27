/**
 * Spike 1 — lecture d'un tableau d'avis par sa géométrie.
 *
 * Un rapport de contrôle technique est un tableau à quatre colonnes :
 * dispositions du projet, avis, observations, numéro. Le PDF décrit ce tableau
 * par des coordonnées ; l'extraction de texte, elle, les jette et rend des
 * lignes cadrées à gauche.
 *
 * Reconstituer les colonnes à partir de ces lignes était la cause commune de
 * presque tous les défauts rencontrés : un numéro attribué à l'avis précédent,
 * un commentaire qui avale l'intitulé suivant, des intitulés vides. Ici, on ne
 * reconstitue rien — on lit les abscisses.
 *
 * Trois informations que seul ce chemin donne :
 *
 *  - **les colonnes**, aux abscisses déclarées par l'en-tête du tableau ;
 *  - **l'arborescence**, portée par l'indentation. « PREVENTION DES BRULURES,
 *    INCENDIES ET EXPLOSIONS D'ORIGINE ELECTRIQUE » à x=37, « Prescriptions
 *    spécifiques pour les installations électriques… » à x=45, et l'intitulé
 *    réel de l'avis plus à droite encore ;
 *  - **le complément d'observation**, écrit en italique sous l'intitulé.
 *
 * Ce module ne connaît pas le PDF : il reçoit des fragments déjà positionnés,
 * comme il reçoit ailleurs du texte. Il reste une fonction pure de ses données,
 * testable sans aucun fichier.
 */

import { containsPhrase, normalizeReferenceKey, normalizeWhitespace } from "../lib/normalize.mjs";
import {
  CONFIDENCE,
  EXTRACTION_STATE,
  IDENTITY_SOURCE,
  markAmbiguous,
  splitTitle
} from "./block-extraction.mjs";

/** En-têtes de colonnes d'un tableau d'avis, tels qu'ils sont écrits. */
const HEADERS = [
  { id: "disposition", pattern: /dispositions?\s+du\s+projet/i },
  { id: "opinion", pattern: /^avis\s*\*?$/i },
  { id: "comment", pattern: /observations?\s+et\s+commentaires?/i },
  { id: "reference", pattern: /^n[°o]\s*$/i }
];

/** Deux fragments sont sur la même ligne s'ils sont à moins de ça l'un de l'autre. */
const SAME_LINE = 3;

/**
 * Une ligne d'intitulé numérotée : « 6.1.1.1.1 Bilan dans le cas ».
 *
 * Le rapport APD numérote son référentiel — 6.1, puis 6.1.1, puis 6.1.1.1 —
 * là où le RICT ne numérote pas. Cette numérotation dit la profondeur sans
 * ambiguïté, et c'est heureux : dans l'APD, une ligne d'intitulé trop longue
 * revient à la marge de la cellule, **plus à gauche** que sa propre première
 * ligne. L'indentation y ment donc, et elle seule ne suffit plus.
 *
 * Le RICT, lui, porte son propre référentiel dans la même colonne, mais sous
 * la forme « 15.20.5 | Zone » : la barre verticale le distingue d'un intitulé
 * numéroté, et l'exclure évite de prendre un rapport pour l'autre.
 */
const OUTLINE = /^(\d+(?:\.\d+)+)\s+[^|\s]/;

/** Un article de règlement, tel qu'il figure dans sa colonne : GN5, PE11§2. */
const ARTICLE = /^[A-Z]{1,4}\s?\d{1,3}(\s*§\s*\d{1,2})?$/;

/** Profondeur annoncée par la numérotation d'un intitulé, ou `null`. */
export function outlineDepth(text) {
  const matched = OUTLINE.exec(normalizeWhitespace(text ?? ""));
  return matched ? matched[1].split(".").length : null;
}

/** Vrai si la colonne des dispositions numérote son référentiel. */
export function isOutlineNumbered(lines) {
  let numbered = 0;
  for (const line of lines) {
    if (outlineDepth(line.text) !== null) numbered += 1;
    if (numbered >= 3) return true;
  }
  return false;
}

/**
 * Recolle les lignes de continuation d'un intitulé numéroté.
 *
 * Dans une colonne numérotée, une ligne qui ne commence pas par un numéro ne
 * commence rien : elle poursuit la précédente. « 4.2.2.2 Nombre et maillage
 * des » suivi de « sondages » est un seul intitulé, quand bien même la seconde
 * ligne est cadrée plus à gauche que la première.
 */
export function mergeWrappedLines(lines) {
  const merged = [];
  for (const line of lines) {
    const last = merged[merged.length - 1];
    if (last && outlineDepth(line.text) === null && last.italic === line.italic) {
      last.text = `${last.text} ${line.text}`;
      last.lastY = line.y;
      continue;
    }
    merged.push({ ...line, lastY: line.y });
  }
  return merged;
}

/**
 * Mots qui n'appartiennent qu'à l'en-tête du tableau.
 *
 * « Articles du règlement » ne tient pas sur la ligne d'en-tête : le mot
 * « règlement » déborde en dessous, cadré tout à gauche. Il passait alors pour
 * le premier chapitre du référentiel, et l'arborescence de chaque avis d'un
 * rapport APD commençait par « règlement ».
 */
const HEADER_WORD = /^(articles?|du|r[eè]glement|dispositions?|projet|avis\s*\*?|observations?|et|commentaires?|n[°o])$/i;

/** Ordonnée sous laquelle l'en-tête, débordements compris, est passé. */
function headerBottom(items, headerY) {
  let bottom = headerY;
  for (const item of items) {
    if (item.y >= headerY || item.y < headerY - 40) continue;
    if (HEADER_WORD.test(normalizeWhitespace(item.text))) bottom = Math.min(bottom, item.y);
  }
  return bottom;
}

/**
 * Ordonnées des en-têtes de tableau portés par la page, de haut en bas.
 *
 * Une même page en porte parfois deux : le dernier chapitre d'une mission s'y
 * achève et la suivante y commence, avec ses propres colonnes — l'APD passe
 * ainsi d'un tableau à cinq colonnes à un tableau à quatre. Les lire comme un
 * seul mêlait deux géométries, et la colonne des avis se plaçait entre les
 * deux, là où il n'y a rien.
 */
export function tableHeaderYs(items) {
  const ys = [];
  for (const candidate of items) {
    if (ys.some((y) => Math.abs(y - candidate.y) <= SAME_LINE)) continue;
    const sameLine = items.filter((item) => Math.abs(item.y - candidate.y) <= SAME_LINE);
    const matched = HEADERS.filter((header) =>
      sameLine.some((item) => header.pattern.test(normalizeWhitespace(item.text)))
    );
    if (matched.length === HEADERS.length) ys.push(candidate.y);
  }
  return ys.sort((a, b) => b - a);
}

/** Vrai si la page porte l'en-tête d'un tableau d'avis. */
export function hasTableHeader(items) {
  return tableHeaderYs(items)[0] ?? null;
}

/** Tolérance d'appartenance à une colonne, de part et d'autre de son abscisse. */
const MARGIN = 12;

/** Valeur la plus fréquente d'une liste — l'abscisse d'une colonne, ici. */
function modal(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && value < best)) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Déduit les bornes des colonnes du contenu, pas des en-têtes.
 *
 * Les en-têtes sont centrés dans leur colonne : « Observations et
 * commentaires » commence à x=343 alors que son texte commence à x=300. Prendre
 * le milieu entre deux en-têtes rangeait donc les observations dans la colonne
 * des avis, et le tableau ressortait vide.
 *
 * Deux repères sûrs, donnés par le contenu lui-même : la colonne des avis ne
 * contient que des codes de la légende, celle des numéros que des nombres, tout
 * à droite. Le reste se déduit.
 *
 * Le rapport APD ajoute une cinquième colonne, « Articles du règlement »,
 * tout à gauche : GN5, PE4§2, N2. L'ignorer versait ces sigles dans la colonne
 * des dispositions, où — étant les fragments les plus à gauche — ils passaient
 * pour des chapitres : l'arborescence d'un avis commençait par « règlement ».
 * On la reconnaît à ce qu'elle est à gauche du premier intitulé numéroté.
 *
 * @returns {{articleX: number, opinionX: number, referenceX: number}|null}
 */
export function deriveColumns(items, codes) {
  const known = new Set(codes ?? []);

  const opinionX = modal(
    items.filter((item) => known.has(normalizeWhitespace(item.text))).map((item) => item.x)
  );
  if (opinionX === null) return null;

  const numbers = items.filter(
    (item) => /^\d{1,4}$/.test(normalizeWhitespace(item.text)) && item.x > opinionX
  );
  // Sans colonne de numéros — un tableau où aucun avis n'est numéroté — la
  // dernière colonne se confond avec les observations : on la place hors de
  // portée plutôt que d'en inventer une.
  const referenceX = numbers.length > 0 ? modal(numbers.map((item) => item.x)) : Infinity;

  return { articleX: deriveArticleX(items, opinionX), opinionX, referenceX };
}

/**
 * Borne droite de la colonne des articles du règlement, ou `-Infinity` quand
 * le tableau n'en a pas.
 *
 * La séparation ne se lit ni dans l'en-tête — « Articles du règlement » y tient
 * sur trois lignes centrées — ni dans l'indentation des intitulés, qui varie
 * d'une page à l'autre selon la profondeur des chapitres qu'elle porte. Ce qui
 * ne varie pas, c'est le vide entre les deux colonnes : les articles s'arrêtent
 * net, et rien ne reprend avant la marge des dispositions.
 *
 * On exige donc trois sigles au moins et un vide franc. À défaut, il n'y a pas
 * de colonne à inventer : le RICT écrit ses intitulés sans elle.
 */
function deriveArticleX(items, opinionX) {
  const left = items.filter((item) => item.x < opinionX - MARGIN);
  const articles = left.filter((item) => ARTICLE.test(normalizeWhitespace(item.text)));
  if (articles.length < 3) return -Infinity;

  const xs = [...new Set(left.map((item) => Math.round(item.x)))].sort((a, b) => a - b);
  let boundary = -Infinity;
  let widest = 0;
  for (let index = 1; index < xs.length; index += 1) {
    const gap = xs[index] - xs[index - 1];
    if (gap > widest) {
      widest = gap;
      boundary = (xs[index - 1] + xs[index]) / 2;
    }
  }

  // Le vide doit laisser tous les articles d'un côté : sans quoi ce n'est pas
  // la séparation des colonnes qu'on a trouvée, mais un décrochement interne à
  // l'arborescence des intitulés.
  if (widest < MARGIN) return -Infinity;
  return articles.every((item) => item.x < boundary) ? boundary : -Infinity;
}

function columnOf({ articleX, opinionX, referenceX }, item) {
  if (item.x < (articleX ?? -Infinity)) return "article";
  if (item.x < opinionX - MARGIN) return "disposition";
  if (item.x < opinionX + MARGIN) return "opinion";
  if (item.x < referenceX - MARGIN) return "comment";
  return "reference";
}

/** Regroupe des fragments en lignes de texte, de haut en bas. */
function toLines(items) {
  const sorted = [...items].sort((a, b) => (Math.abs(a.y - b.y) <= SAME_LINE ? a.x - b.x : b.y - a.y));
  const lines = [];

  const rightOf = (item) => item.x + (Number.isFinite(item.width) ? item.width : NaN);

  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - item.y) <= SAME_LINE) {
      last.text = `${last.text} ${item.text}`;
      last.italic = last.italic && item.italic === true;
      last.right = Math.max(last.right, rightOf(item));
      continue;
    }
    lines.push({
      y: item.y,
      x: item.x,
      right: rightOf(item),
      text: item.text,
      italic: item.italic === true
    });
  }

  return lines.map((line) => ({ ...line, text: normalizeWhitespace(line.text) }));
}

/**
 * Ordonnée sous laquelle le tableau a cédé la place au pied de page.
 *
 * Sous la dernière ligne du tableau, le document reprend sa vie propre — la
 * légende des codes, la raison sociale, le numéro de page. Ces lignes sont
 * cadrées tout à gauche : laissées là, elles devenaient le premier chapitre de
 * l'arborescence, et « 7 / 12 » se retrouvait cité comme observation.
 *
 * Le tableau s'arrête là où l'interligne se rompt franchement — le pied de page
 * est séparé du corps par un vide sans commune mesure avec un saut de ligne.
 */
function footerY(items) {
  const ys = [...new Set(items.map((item) => Math.round(item.y)))].sort((a, b) => b - a);
  if (ys.length < 3) return -Infinity;

  const gaps = [];
  for (let index = 1; index < ys.length; index += 1) gaps.push(ys[index - 1] - ys[index]);
  const spacing = modal(gaps);
  if (!spacing) return -Infinity;

  // La coupe se mesure sur toute la page, jamais colonne par colonne : une
  // observation de six lignes creuse dans la colonne des intitulés un vide
  // aussi large qu'un pied de page, et le tableau se serait arrêté au milieu.
  const limit = spacing * 4;
  for (let index = 1; index < ys.length; index += 1) {
    if (ys[index - 1] - ys[index] > limit) return ys[index - 1];
  }
  return -Infinity;
}

/**
 * Regroupe les lignes d'un même paragraphe.
 *
 * « DISPOSITIONS RELATIVES A LA / SECURITE DES PERSONNES DANS LA /
 * CONSTRUCTION » est un seul intertitre écrit sur trois lignes, pas trois
 * intertitres. Sans ce regroupement, seul le dernier fragment survivait, et
 * l'arborescence affichait « CONSTRUCTION ».
 *
 * Le signal est l'interligne : à l'intérieur d'un paragraphe il est régulier ;
 * entre deux paragraphes le document ajoute de l'air. On calibre donc sur
 * l'interligne le plus fréquent de la colonne plutôt que sur une valeur en dur,
 * qui ne survivrait pas au premier document composé autrement.
 */
export function toParagraphs(lines) {
  if (lines.length <= 1) return lines.map((line) => ({ ...line }));

  // L'interligne se mesure entre lignes de même indentation : ce sont les
  // seules qui puissent appartenir au même paragraphe. Le mesurer sur toute la
  // colonne y mêlait les sauts entre niveaux, et l'écart de référence devenait
  // si large que tout se collait en un bloc.
  const gaps = [];
  for (let index = 1; index < lines.length; index += 1) {
    if (Math.abs(lines[index - 1].x - lines[index].x) >= 1) continue;
    const gap = Math.round(lines[index - 1].y - lines[index].y);
    if (gap > 0) gaps.push(gap);
  }
  const spacing = modal(gaps) ?? 0;
  const limit = spacing > 0 ? spacing * 1.2 : Infinity;

  const paragraphs = [];
  for (const line of lines) {
    const last = paragraphs[paragraphs.length - 1];
    const continues =
      last && Math.abs(last.x - line.x) < 1 && last.lastY - line.y <= limit && last.italic === line.italic;

    if (continues) {
      last.text = `${last.text} ${line.text}`;
      last.lastY = line.y;
      continue;
    }
    paragraphs.push({ ...line, lastY: line.y });
  }

  return paragraphs;
}

/**
 * Lit les lignes d'un tableau d'avis sur une page.
 *
 * @param {{items: object[]}} page fragments positionnés
 * @param {string[]} codes codes d'avis déclarés par la légende du document
 * @returns {{rows: object[], columns: object[]}|null}
 */
export function readTableRows(page, codes, { stack = [] } = {}) {
  const items = Array.isArray(page?.items) ? page.items : null;
  if (!items || items.length === 0) return null;

  const headers = tableHeaderYs(items);
  if (headers.length === 0) return null;

  const rows = [];
  let columns = null;
  let carried = stack;

  for (const [index, headerY] of headers.entries()) {
    const ceiling = headerBottom(items, headerY);
    const floor = index + 1 < headers.length ? headers[index + 1] : -Infinity;
    const span = items.filter((item) => item.y < ceiling - SAME_LINE && item.y > floor);

    // La légende — « * F: Favorable , D: Défavorable , … » — clôt le tableau.
    // Ses fragments sont dispersés sur toute la largeur de la page ; laissés
    // dans la bande, ils y creusaient un vide plus large que celui qui sépare
    // les articles des intitulés, et c'est là que la colonne se coupait.
    const legend = span
      .filter((item) => /^\*\s/.test(normalizeWhitespace(item.text)))
      .map((item) => item.y);
    const closing = legend.length > 0 ? Math.max(...legend) : -Infinity;
    const region = span.filter((item) => item.y > closing + SAME_LINE);

    const table = readTableRegion(region.filter((item) => item.y > footerY(region) - SAME_LINE), codes, carried);
    if (!table) continue;
    columns = columns ?? table.columns;
    carried = table.stack;
    rows.push(...table.rows);
  }

  return { rows, columns, stack: carried };
}

/** Lit un tableau, une fois sa page réduite à la bande qu'il occupe. */
function readTableRegion(below, codes, stack) {
  const known = new Set(codes ?? []);
  const layout = deriveColumns(below, codes);
  if (!layout) return { rows: [], columns: null, stack };

  const byColumn = { article: [], disposition: [], opinion: [], comment: [], reference: [] };
  for (const item of below) byColumn[columnOf(layout, item)].push(item);

  // Chaque ligne du tableau est ancrée par son code d'avis : c'est la seule
  // cellule qui y figure exactement une fois.
  const anchors = toLines(byColumn.opinion)
    .filter((line) => known.has(line.text))
    .sort((a, b) => b.y - a.y);

  if (anchors.length === 0) return { rows: [], columns: layout, stack };

  const dispositionLines = toLines(byColumn.disposition);
  const commentLines = toLines(byColumn.comment);
  const referenceLines = toLines(byColumn.reference);
  const articleLines = toLines(byColumn.article);
  const numbered = isOutlineNumbered(dispositionLines);
  const columnRight = Math.max(
    ...dispositionLines.map((line) => line.right).filter((right) => Number.isFinite(right)),
    -Infinity
  );

  const rows = anchors.map((anchor, index) => {
    const top = anchor.y + SAME_LINE;
    const bottom = index + 1 < anchors.length ? anchors[index + 1].y + SAME_LINE : -Infinity;
    const inBand = (line) => line.y <= top && line.y > bottom;

    const band = dispositionLines.filter(inBand);
    const { title, complement, outlineUpdates } = splitDispositionBand(band, { numbered, columnRight });
    const titleText = title[0] ?? band[0]?.text ?? "";

    return {
      opinion_raw: anchor.text,
      opinion_x: anchor.x,
      y: anchor.y,
      title_lines: title,
      title_x: band[0]?.x ?? null,
      // La profondeur de l'intitulé, prise à sa numérotation quand le document
      // en porte une, à son indentation sinon.
      title_depth: numbered ? outlineDepth(titleText) : null,
      complement_lines: complement,
      outline_updates: outlineUpdates,
      comment_lines: commentLines.filter(inBand).map((line) => line.text),
      // L'article du règlement a sa propre colonne dans un rapport APD ; seule
      // la ligne d'ancrage le porte, les continuations sont vides.
      article_raw: articleLines.filter(inBand).map((line) => line.text).join(" ") || null,
      reference_raw:
        referenceLines.filter(inBand).map((line) => line.text).find((text) => /^\d{1,4}$/.test(text)) ?? null
    };
  });

  const outlined = withAncestors(rows, dispositionLines, anchors[0].y + SAME_LINE, numbered, stack);
  return { rows: outlined.rows, columns: layout, stack: outlined.stack };
}

/** Largeur moyenne d'un caractère de la ligne, telle que le PDF l'a composée. */
function charWidth(line) {
  if (!line || !Number.isFinite(line.right)) return NaN;
  return Math.max((line.right - line.x) / Math.max(line.text.length, 1), 1);
}

/**
 * Vrai si la ligne a débordé sur la suivante.
 *
 * Un rapport RICT ne numérote pas son référentiel, et ses intertitres sont
 * cadrés comme les intitulés qu'ils portent : « ASCENSEURS », puis « MOYENS DE
 * SECOURS », puis « MOYENS D'EXTINCTION », tous à la même abscisse. Rien dans
 * la géométrie ne les distingue d'un intitulé écrit sur trois lignes — rien,
 * sauf ceci : un texte ne passe à la ligne que lorsqu'il n'a plus de place.
 *
 * La question se pose donc à l'envers, et elle a une réponse exacte : le
 * premier mot de la ligne suivante **aurait-il tenu** au bout de celle-ci ?
 * S'il tenait, la ligne ne débordait pas, et ce qui suit commence autre chose.
 * « ASCENSEURS » s'arrête au tiers de la colonne : « MOYENS » y tenait vingt
 * fois. « Signal sonore et lumineux du » s'arrête plus loin, mais
 * « déverrouillage » n'y tenait pas — c'est bien un intitulé sur deux lignes.
 *
 * Sans largeur mesurée — un tableau construit à la main pour un test — la
 * question ne se pose pas et la réponse est oui.
 */
function wraps(line, next, columnRight) {
  const width = charWidth(next);
  if (!Number.isFinite(columnRight) || !Number.isFinite(line?.right) || !Number.isFinite(width)) {
    return true;
  }
  const firstWord = normalizeWhitespace(next.text).split(" ")[0] ?? "";
  return line.right + width * (firstWord.length + 1) > columnRight;
}

/**
 * Sépare, dans la cellule « dispositions », ce qui appartient à la ligne
 * courante de ce qui annonce la suivante.
 *
 * L'intitulé de la ligne commence à la hauteur du code d'avis, à une certaine
 * indentation. Ses lignes de continuation gardent cette indentation. Dès qu'un
 * fragment revient plus à gauche, on a changé de niveau : c'est un intertitre,
 * et il vaut pour les lignes suivantes, pas pour celle-ci.
 *
 * L'italique, lui, est un complément d'observation : il précise l'intitulé sans
 * en faire partie.
 *
 * Quand le document numérote son référentiel, l'indentation ne décide plus de
 * rien : les continuations sont d'abord recollées à leur intitulé, et tout ce
 * qui suit — nécessairement numéroté, donc nécessairement un nouveau titre —
 * annonce la ligne suivante.
 */
export function splitDispositionBand(band, { numbered = false, columnRight = NaN } = {}) {
  if (band.length === 0) return { title: [], complement: [], outlineUpdates: [] };

  const lines = numbered ? mergeWrappedLines(band) : band;
  const titleX = lines[0].x;
  const title = [];
  const complement = [];
  const outlineUpdates = [];
  let ended = false;

  for (const [index, line] of lines.entries()) {
    const starts = numbered
      ? index > 0 && !line.italic
      : index > 0 &&
        !line.italic &&
        (Math.abs(line.x - titleX) > 1 || !wraps(lines[index - 1], line, columnRight));
    if (ended || starts) {
      ended = true;
      outlineUpdates.push({ x: line.x, y: line.y, text: line.text, italic: line.italic });
      continue;
    }
    if (line.italic) complement.push(line.text);
    else title.push(line.text);
  }

  return { title, complement, outlineUpdates };
}

/**
 * Rattache chaque ligne à son arborescence.
 *
 * La pile d'intertitres se lit de gauche à droite : un niveau plus à gauche
 * remplace tous ceux qui sont à sa droite, comme un plan de document.
 */
function withAncestors(rows, dispositionLines, firstTop, numbered = false, inherited = []) {
  // Un chapitre ouvert en bas d'une page porte encore les avis du haut de la
  // suivante : la pile se poursuit d'une page à l'autre, sans quoi la première
  // ligne de chaque page ressortait sans arborescence.
  const stack = [...inherited];

  // Le rang dit la place d'un intertitre dans le plan : sa profondeur de
  // numérotation quand le document en porte une, son indentation sinon. Une
  // ligne numérotée pèse toujours plus qu'un fragment qui ne l'est pas — ce
  // dernier ne peut porter personne, et se retrouve écarté de la pile.
  const rankOf = (entry) =>
    numbered ? outlineDepth(entry.text) ?? Number.MAX_SAFE_INTEGER : entry.x;

  const push = (entry) => {
    const rank = rankOf(entry);
    if (rank === Number.MAX_SAFE_INTEGER) return;
    while (stack.length > 0 && stack[stack.length - 1].rank >= rank) stack.pop();
    stack.push({ rank, text: entry.text });
  };

  const prepare = (lines) => (numbered ? mergeWrappedLines(lines) : toParagraphs(lines));

  // Tout ce qui précède la première ligne du tableau est de l'intertitre.
  for (const line of prepare(dispositionLines.filter((line) => line.y > firstTop))) push(line);

  const outlined = rows.map((row) => {
    // Un intertitre est forcément au-dessus de l'intitulé qu'il porte. Sans ce
    // filtre, une ligne de continuation restée dans la pile passait pour un
    // chapitre et l'arborescence devenait absurde.
    const limit = numbered ? row.title_depth ?? Number.MAX_SAFE_INTEGER : (row.title_x ?? Infinity) - 1;
    const ancestors = stack.filter((entry) => entry.rank < limit).map((entry) => entry.text);
    for (const update of prepare(row.outline_updates)) push(update);
    return { ...row, ancestors };
  });

  return { rows: outlined, stack };
}


/**
 * Choisit un extrait qui existe vraiment dans le document.
 *
 * L'extrait cité doit satisfaire deux exigences à la fois : se retrouver tel
 * quel dans la source, et porter l'appréciation qu'il justifie. Or la colonne
 * des avis est une cellule à part, et l'ordre dans lequel l'aplatissement la
 * recolle au reste varie d'un rapport à l'autre :
 *
 *     S Les circuits terminaux de la chaufferie…     (RICT : le code d'abord)
 *     Nombre et maillage des sondages F              (APD : le code ensuite)
 *     F Caractéristiques des conduits aérauliques    (avis sans observation)
 *
 * Plutôt que de parier sur l'un d'eux, on propose les candidats plausibles
 * et on retient le premier que le document contient réellement. Aucun ne
 * convient — cellule vide, page recomposée autrement — et on rend la ligne
 * seule : le garde-fou signalera alors une provenance invérifiable, ce qui est
 * exactement ce qu'il doit faire.
 */
export function pickExcerpt(content, row) {
  const code = row.opinion_raw;
  const first = row.comment_lines[0] ?? null;
  const firstTitle = row.title_lines[0] ?? null;
  const lastTitle = row.title_lines[row.title_lines.length - 1] ?? null;

  const candidates = [
    first ? `${code} ${first}` : null,
    lastTitle ? `${lastTitle} ${code}` : null,
    firstTitle ? `${code} ${firstTitle}` : null,
    firstTitle ? `${firstTitle} ${code}` : null,
    lastTitle ? `${code} ${lastTitle}` : null,
    first,
    lastTitle
  ].filter(Boolean);

  const text = String(content ?? "");
  for (const candidate of candidates) {
    if (text !== "" && containsPhrase(text, candidate)) return candidate;
  }

  return candidates[0] ?? code;
}

/**
 * Traduit les lignes d'un tableau en occurrences d'avis.
 *
 * Même forme que la lecture par lignes — le reste du moteur ne fait pas la
 * différence — enrichie de ce que seule la géométrie donne : l'arborescence du
 * référentiel et le complément d'observation en italique.
 *
 * Le numéro n'a plus besoin d'être deviné : il occupe sa propre colonne, sur
 * la même ligne que son avis. Sur un RICT réel, les vingt-six avis numérotés
 * ressortent tous en D ou S — la règle métier se vérifie d'elle-même, au lieu
 * d'avoir à être appliquée en garde-fou.
 *
 * @param {object} source document paginé, pages porteuses de `items`
 * @param {{codes: {code: string, id: string, label: string}[]}} legend
 */
export function extractAvisFromLayout(source, { legend } = {}) {
  const entries = legend?.codes ?? [];
  if (entries.length === 0) return null;

  const byCode = new Map(entries.map((entry) => [entry.code, entry]));
  const codes = entries.map((entry) => entry.code);
  const pages = Array.isArray(source?.pages) ? source.pages : [];

  const occurrences = [];
  let tables = 0;

  let stack = [];
  for (const page of pages) {
    const table = readTableRows(page, codes, { stack });
    if (!table) continue;
    tables += 1;
    stack = table.stack ?? stack;

    for (const row of table.rows) {
      const entry = byCode.get(row.opinion_raw);
      if (!entry) continue;

      // L'article réglementaire et la numérotation se détachent de l'intitulé
      // comme dans la lecture par lignes : « PE11§2 6.1.2.6.2.1 Dispositif de
      // manoeuvre… » n'est pas un intitulé, c'est trois informations.
      const { title_raw, section_number_raw, regulation_article_raw } = splitTitle(row.title_lines);
      // Quand le tableau consacre une colonne aux articles du règlement, elle
      // fait foi ; sinon l'article se détache de l'intitulé, comme ailleurs.
      const article = row.article_raw ?? regulation_article_raw;
      const description = normalizeWhitespace(row.comment_lines.join(" "));

      occurrences.push({
        external_reference_raw: row.reference_raw,
        external_reference_normalized: row.reference_raw ? normalizeReferenceKey(row.reference_raw) : null,
        identity_source: row.reference_raw ? IDENTITY_SOURCE.NUMBER_COLUMN : IDENTITY_SOURCE.NONE,
        opinion_raw: row.opinion_raw,
        opinion_normalized: entry.id,
        opinion_label: entry.label,
        title_raw: title_raw,
        // L'arborescence du référentiel, du plus général au plus précis.
        ancestors: row.ancestors,
        // Le complément d'observation, écrit en italique sous l'intitulé.
        complement_raw: normalizeWhitespace(row.complement_lines.join(" ")) || null,
        section_label_raw: row.ancestors.at(-1) ?? null,
        section_number_raw,
        regulation_article_raw: article,
        source_document_id: source.source_id,
        source_page: page.page ?? null,
        // L'extrait doit se retrouver tel quel dans le texte aplati, et porter
        // l'appréciation qu'il justifie. Or celle-ci vit dans sa propre
        // colonne : citer la seule cellule d'observation faisait échouer neuf
        // cent quatre-vingt-huit garde-fous — à juste titre, l'avis n'y
        // figurait pas.
        //
        // À l'aplatissement, le code se colle à la première ligne du
        // commentaire — « S Les circuits terminaux de la chaufferie » —, si
        // bien que le citer devant restitue exactement la source.
        source_excerpt: pickExcerpt(source.content, row),
        // Où l'appréciation a été lue, au point près. L'aplatissement du PDF
        // recolle parfois la cellule d'avis loin de sa ligne — le code se
        // retrouve alors introuvable à côté de l'intitulé qu'il porte, et
        // aucun extrait ne peut honnêtement le citer. La géométrie, elle, sait
        // exactement d'où il vient, et le dit.
        opinion_cell: {
          page: page.page ?? null,
          x: row.opinion_x,
          y: row.y,
          text: row.opinion_raw
        },
        confidence: page.page === null ? CONFIDENCE.OCCURRENCE_WITHOUT_PAGE : CONFIDENCE.OCCURRENCE_WITH_PAGE,
        opinion_confidence: CONFIDENCE.OPINION_FROM_LEGEND,
        extraction_state: row.reference_raw
          ? EXTRACTION_STATE.EXTRACTED
          : EXTRACTION_STATE.NO_EXTERNAL_REFERENCE,
        description_raw: description
      });
    }
  }

  // Aucun tableau reconnu : ce document n'est pas lisible par la géométrie, et
  // la lecture par lignes reprend la main.
  if (tables === 0) return null;

  // Un même numéro figure deux fois dans un rapport : récapitulé en tête, puis
  // détaillé dans son chapitre. Deux occurrences qui portent le même avis ne
  // sont pas ambiguës — c'est la même observation, vue deux fois. Sans ce
  // passage, chaque avis récapitulé ressortait « ambigu ».
  return { occurrences: markAmbiguous(occurrences), tables };
}
