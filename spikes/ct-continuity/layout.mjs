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
import { DEFAULT_PACK } from "./packs/index.mjs";
import {
  CONFIDENCE,
  EXTRACTION_STATE,
  IDENTITY_SOURCE,
  markAmbiguous,
  splitTitle
} from "./block-extraction.mjs";

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

/** Abscisse de l'en-tête « Avis* », dernier repère quand aucun code n'est écrit. */
function opinionHeaderX(items, headerY, pack) {
  const opinion = pack.tableHeaders.find((header) => header.id === "opinion");
  const header = items.find(
    (item) => Math.abs(item.y - headerY) <= SAME_LINE && opinion.pattern.test(normalizeWhitespace(item.text))
  );
  return header ? header.x : null;
}

/**
 * Ordonnée sous laquelle l'en-tête, débordements compris, est passé.
 *
 * « Articles du règlement » ne tient pas sur la ligne d'en-tête : le mot
 * « règlement » déborde en dessous, cadré tout à gauche. Il passait alors pour
 * le premier chapitre du référentiel, et l'arborescence de chaque avis d'un
 * rapport APD commençait par « règlement ».
 */
function headerBottom(items, headerY, pack) {
  let bottom = headerY;
  for (const item of items) {
    if (item.y >= headerY || item.y < headerY - 40) continue;
    if (pack.headerWords.test(normalizeWhitespace(item.text))) bottom = Math.min(bottom, item.y);
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
export function tableHeaderYs(items, pack = DEFAULT_PACK) {
  const ys = [];
  for (const candidate of items) {
    if (ys.some((y) => Math.abs(y - candidate.y) <= SAME_LINE)) continue;
    const sameLine = items.filter((item) => Math.abs(item.y - candidate.y) <= SAME_LINE);
    const matched = pack.tableHeaders.filter((header) =>
      sameLine.some((item) => header.pattern.test(normalizeWhitespace(item.text)))
    );
    if (matched.length === pack.tableHeaders.length) ys.push(candidate.y);
  }
  return ys.sort((a, b) => b - a);
}

/** Vrai si la page porte l'en-tête d'un tableau d'avis. */
export function hasTableHeader(items, pack = DEFAULT_PACK) {
  return tableHeaderYs(items, pack)[0] ?? null;
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
export function deriveColumns(items, codes, headerX = null) {
  const known = new Set(codes ?? []);

  // Une fiche dont toutes les lignes attendent encore leur appréciation n'écrit
  // aucun code : le contenu ne dit alors rien des colonnes, et l'en-tête reste
  // le seul repère. Il est centré, donc approximatif — mais la colonne qu'il
  // borne est vide, et l'approximation ne coûte rien.
  const opinionX =
    modal(items.filter((item) => known.has(normalizeWhitespace(item.text))).map((item) => item.x)) ??
    headerX;
  if (opinionX === null || opinionX === undefined) return null;

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

/** Un numéro de page : « 7 / 12 ». Il change à chaque page, mais reste un pied. */
const PAGE_NUMBER = /^\d{1,3}\s*\/\s*\d{1,3}$/;

/**
 * Ce qui, dans un document, ne dit rien de ses tableaux.
 *
 * Sous la dernière ligne du tableau, le document reprend sa vie propre : la
 * raison sociale, le siège, la référence du chrono, le numéro de page. Ces
 * lignes sont cadrées tout à gauche ; laissées dans la bande, elles devenaient
 * le premier chapitre de l'arborescence, et « 7 / 12 » se citait comme une
 * observation.
 *
 * On a d'abord cherché à les couper sur un vide : le pied de page est loin
 * sous le tableau. Mais une fiche écrit son appréciation au milieu d'une
 * cellule haute, et son numéro d'avis plus bas encore — des vides tout aussi
 * larges, à l'intérieur du tableau. Aucun seuil ne les sépare.
 *
 * Ce qui les sépare, c'est que le pied de page **se répète**. Une ligne écrite
 * mot pour mot, à la même abscisse, sur presque toutes les pages d'un document
 * n'est pas le contenu d'un tableau : c'est son cadre.
 */
const MIN_FRAME_LENGTH = 6;

/** En deçà, une colonne est trop clairsemée pour que son contenu en dise le bord. */
const WIDE_ENOUGH = 8;

function repeatedLines(pages) {
  const seen = new Map();
  let counted = 0;

  for (const page of pages) {
    const items = Array.isArray(page?.items) ? page.items : null;
    if (!items || items.length === 0) continue;
    counted += 1;
    // Une cellule d'avis ne contient qu'une lettre, un numéro guère plus, et
    // les mêmes reviennent à la même abscisse sur toutes les pages : les
    // compter comme un cadre effaçait la colonne des appréciations. Le cadre,
    // lui, est fait de mots — jusqu'à la date d'émission rappelée en tête de
    // chaque page, qui s'invitait sinon en haut de l'arborescence.
    const onThisPage = new Set(
      toLines(items)
        .filter((line) => line.text.length >= MIN_FRAME_LENGTH)
        .map((line) => `${Math.round(line.x)}|${line.text}`)
    );
    for (const key of onThisPage) seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  // Deux pages au moins, et la ligne doit figurer sur la quasi-totalité :
  // un intitulé qui reviendrait sur la moitié des pages reste un intitulé.
  const floor = Math.max(2, Math.ceil(counted * 0.8));
  const repeated = new Set();
  for (const [key, count] of seen) if (count >= floor) repeated.add(key);
  return repeated;
}

/**
 * Lit les lignes d'un tableau d'avis sur une page.
 *
 * @param {{items: object[]}} page fragments positionnés
 * @param {string[]} codes codes d'avis déclarés par la légende du document
 * @returns {{rows: object[], columns: object[]}|null}
 */
export function readTableRows(page, codes, { stack = [], repeated = new Set(), pack = DEFAULT_PACK } = {}) {
  const items = Array.isArray(page?.items) ? page.items : null;
  if (!items || items.length === 0) return null;

  const headers = tableHeaderYs(items, pack);
  if (headers.length === 0) return null;

  const rows = [];
  let columns = null;
  let carried = stack;

  for (const [index, headerY] of headers.entries()) {
    const ceiling = headerBottom(items, headerY, pack);
    const floor = index + 1 < headers.length ? headers[index + 1] : -Infinity;
    const span = items
      .filter((item) => item.y < ceiling - SAME_LINE && item.y > floor)
      .filter((item) => !PAGE_NUMBER.test(normalizeWhitespace(item.text)));

    // La légende — « * F: Favorable , D: Défavorable , … » — clôt le tableau.
    // Ses fragments sont dispersés sur toute la largeur de la page ; laissés
    // dans la bande, ils y creusaient un vide plus large que celui qui sépare
    // les articles des intitulés, et c'est là que la colonne se coupait.
    // L'astérisque forme parfois un fragment à lui seul — « * », puis « D »,
    // puis « : Défavorable , F: Favorable ». Ne reconnaître que « * F… »
    // laissait le « D » dans la bande, où il passait pour une appréciation :
    // la colonne des avis se plaçait alors sur la marge de gauche, et la
    // fiche entière ressortait vide.
    const legend = span
      .filter((item) => /^\*(\s|$)/.test(normalizeWhitespace(item.text)))
      .map((item) => item.y);
    const closing = legend.length > 0 ? Math.max(...legend) : -Infinity;
    const below = span.filter((item) => item.y > closing + SAME_LINE);
    // Les ordonnées des lignes que le document répète de page en page : leur
    // contenu appartient au cadre, pas au tableau.
    const framed = new Set(
      toLines(below)
        .filter((line) => repeated.has(`${Math.round(line.x)}|${line.text}`))
        .map((line) => Math.round(line.y))
    );
    const region = below.filter((item) => !framed.has(Math.round(item.y)));

    const table = readTableRegion(region, codes, carried, opinionHeaderX(items, headerY, pack));
    if (!table) continue;
    columns = columns ?? table.columns;
    carried = table.stack;
    rows.push(...table.rows);
  }

  return { rows, columns, stack: carried };
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
 * Découpe la colonne des dispositions en intitulés, un par ligne du tableau.
 *
 * C'est le même regroupement qu'auparavant — une ligne sans numéro, ou qui ne
 * pouvait pas déborder, poursuit la précédente — mais mené sur toute la
 * colonne au lieu d'une bande à la fois. Il fallait pour cela cesser de tenir
 * la colonne des avis pour le repère des lignes.
 */
export function toRowCandidates(lines, { numbered, columnRight, scored = [], spacing = null }) {
  const merged = [];
  // Un paragraphe a son interligne ; entre deux paragraphes le document ajoute
  // de l'air. « REGLEMENTATION PARASISMIQUE » et « DISPOSITIONS RELATIVES A LA
  // SECURITE DES PERSONNES » sont deux chapitres, et le mot « DISPOSITIONS »
  // était trop long pour tenir au bout du premier : la seule règle du
  // débordement les recollait en un seul.
  const limit = spacing ? spacing * 1.2 : Infinity;

  // Un intitulé écrit à la hauteur de sa propre appréciation ouvre sa ligne :
  // c'est ce que dit le tableau, et aucune règle typographique ne saurait le
  // contredire. « Nombre et maillage des sondages » s'arrête si près du bord
  // que « Profondeur » n'y tenait pas — les deux intitulés se recollaient,
  // alors que chacun porte son F.
  const opens = (line) => scored.some((y) => Math.abs(y - line.y) <= SAME_LINE);

  for (const line of lines) {
    const last = merged[merged.length - 1];
    const continues =
      last &&
      last.italic === line.italic &&
      !opens(line) &&
      (numbered
        ? outlineDepth(line.text) === null
        : Math.abs(line.x - last.x) <= 1 &&
          last.lastY - line.y <= limit &&
          wraps(last, line, columnRight));

    if (continues) {
      last.text = `${last.text} ${line.text}`;
      // Le débordement se juge sur la dernière ligne écrite, pas sur la
      // première du paragraphe.
      last.right = line.right;
      last.lastY = line.y;
      continue;
    }
    merged.push({ ...line, lastY: line.y });
  }

  return merged;
}

/**
 * Lit un tableau, une fois sa page réduite à la bande qu'il occupe.
 *
 * Une ligne de tableau commence où commence sa première colonne. C'est
 * évident, et ce n'était pourtant pas ce que faisait ce module : il ancrait
 * chaque ligne sur son **code d'avis**, parce que dans un RICT le code, son
 * intitulé et son observation commencent tous à la même hauteur.
 *
 * Une fiche d'avis travaux ne compose pas ainsi. Son intitulé est centré
 * verticalement dans sa cellule, tandis que l'observation part du haut :
 *
 *     378                     Rappel de l'observation précédente :
 *     366                     La distance de 40 cm n'est pas respectée
 *     360  Ext > 40 cm angle rentrant
 *     354                 F   pour la porte WC Scol. 1
 *
 * Ancrée sur le F, la ligne perdait les deux premières lignes de son
 * observation. Pire : la disposition suivante — « Couche de fondation du
 * dallage », dont le bureau de contrôle a laissé la case d'avis vide tout en
 * lui donnant le numéro 234 — n'existait pas du tout, faute de code sur lequel
 * s'ancrer. L'avis 234 était bien lu par le rapport d'étape un an plus tard,
 * mais sa création restait invisible.
 *
 * On ancre donc sur les intitulés. Chacun ouvre une bande qui va jusqu'au
 * suivant, la première remontant jusqu'à l'en-tête du tableau. Un intitulé
 * dont la bande ne porte ni code ni numéro n'est pas une ligne : c'est un
 * intertitre, et il rejoint l'arborescence.
 */
function readTableRegion(below, codes, stack, headerX = null) {
  const known = new Set(codes ?? []);
  const layout = deriveColumns(below, codes, headerX);
  if (!layout) return { rows: [], columns: null, stack };

  const byColumn = { article: [], disposition: [], opinion: [], comment: [], reference: [] };
  for (const item of below) byColumn[columnOf(layout, item)].push(item);

  const dispositionLines = toLines(byColumn.disposition);
  const commentLines = toLines(byColumn.comment);
  const referenceLines = toLines(byColumn.reference);
  const articleLines = toLines(byColumn.article);
  const opinionLines = toLines(byColumn.opinion).filter((line) => known.has(line.text));

  if (dispositionLines.length === 0 && opinionLines.length === 0) {
    return { rows: [], columns: layout, stack };
  }

  const numbered = isOutlineNumbered(dispositionLines);
  // Jusqu'où un intitulé peut s'étendre avant de passer à la ligne.
  //
  // Le contenu le dit mieux que l'en-tête, qui est centré — à condition qu'il
  // y en ait assez pour qu'une ligne au moins soit allée jusqu'au bord. Une
  // fiche n'a que deux intitulés courts : son plus long y passait pour le bord
  // de la colonne, et les deux se recollaient en un seul. Sous ce seuil, on
  // s'en remet à la colonne des avis, qui borne la précédente.
  const contentRight = Math.max(
    ...dispositionLines.map((line) => line.right).filter((right) => Number.isFinite(right)),
    -Infinity
  );
  const columnRight =
    dispositionLines.length >= WIDE_ENOUGH && Number.isFinite(contentRight)
      ? contentRight
      : layout.opinionX - MARGIN;

  const paragraphs = toRowCandidates(dispositionLines, {
    numbered,
    columnRight,
    spacing: medianGap(dispositionLines),
    scored: [
      ...opinionLines.map((line) => line.y),
      ...referenceLines.filter((line) => isReference(line.text)).map((line) => line.y)
    ]
  });
  // L'italique est un complément d'observation : il précise l'intitulé qui le
  // précède, il n'en ouvre pas un nouveau.
  const candidates = paragraphs.filter((paragraph) => !paragraph.italic);
  const complements = paragraphs.filter((paragraph) => paragraph.italic);

  const outlined = withAncestors({
    candidates,
    complements,
    opinionLines,
    commentLines,
    referenceLines,
    articleLines,
    numbered,
    inherited: stack
  });

  return { rows: outlined.rows, columns: layout, stack: outlined.stack };
}

/** Interligne courant d'une colonne : la médiane de ses écarts verticaux. */
function medianGap(lines) {
  const gaps = [];
  for (let index = 1; index < lines.length; index += 1) {
    const gap = Math.round(lines[index - 1].y - lines[index].y);
    if (gap > 0) gaps.push(gap);
  }
  if (gaps.length === 0) return null;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/** Vrai si le texte est un numéro d'avis, et rien d'autre. */
function isReference(text) {
  return /^\d{1,4}$/.test(text);
}

/**
 * Trie les intitulés entre lignes de tableau et intertitres, et rattache
 * chacune des premières à son arborescence.
 *
 * Un intitulé dont la bande ne porte ni appréciation ni numéro n'annonce rien :
 * c'est un chapitre du référentiel. Il rejoint la pile, où il vaudra pour les
 * lignes qui suivent. La pile se lit de gauche à droite — ou de profondeur en
 * profondeur quand le document numérote — et un niveau supérieur remplace tous
 * ceux qu'il domine, comme un plan de document.
 */
function withAncestors({
  candidates,
  complements,
  opinionLines,
  commentLines,
  referenceLines,
  articleLines,
  numbered,
  inherited
}) {
  // Un chapitre ouvert en bas d'une page porte encore les avis du haut de la
  // suivante : la pile se poursuit d'une page à l'autre, sans quoi la première
  // ligne de chaque page ressortait sans arborescence.
  const stack = [...inherited];

  // Le rang dit la place d'un intertitre dans le plan : sa profondeur de
  // numérotation quand le document en porte une, son indentation sinon. Une
  // ligne qui n'est pas numérotée, dans un document qui l'est, ne peut porter
  // personne : elle est écartée de la pile.
  const rankOf = (entry) =>
    numbered ? outlineDepth(entry.text) ?? Number.MAX_SAFE_INTEGER : entry.x;

  const push = (entry) => {
    const rank = rankOf(entry);
    if (rank === Number.MAX_SAFE_INTEGER) return;
    while (stack.length > 0 && stack[stack.length - 1].rank >= rank) stack.pop();
    stack.push({ rank, text: entry.text });
  };

  const rows = [];

  for (const [index, candidate] of candidates.entries()) {
    // La première bande remonte jusqu'à l'en-tête : dans une fiche, les
    // premières lignes de l'observation sont écrites au-dessus de l'intitulé
    // qu'elles commentent.
    const top = index === 0 ? Infinity : candidate.y + SAME_LINE;
    const bottom = index + 1 < candidates.length ? candidates[index + 1].y + SAME_LINE : -Infinity;
    const inBand = (line) => line.y <= top && line.y > bottom;

    const opinions = opinionLines.filter(inBand);
    const references = referenceLines.filter(inBand).filter((line) => isReference(line.text));

    if (opinions.length === 0 && references.length === 0) {
      push(candidate);
      continue;
    }

    const limit = numbered
      ? outlineDepth(candidate.text) ?? Number.MAX_SAFE_INTEGER
      : candidate.x - 1;
    const ancestors = stack.filter((entry) => entry.rank < limit).map((entry) => entry.text);

    // Deux appréciations dans une même bande : deux lignes de tableau dont la
    // seconde n'a pas d'intitulé propre. On les sépare sur leurs codes, comme
    // avant — l'intitulé revient à la première, seule à en avoir un.
    const cuts = opinions.length > 1 ? opinions : [opinions[0] ?? null];

    for (const [rank, opinion] of cuts.entries()) {
      const cutTop = rank === 0 ? top : opinion.y + SAME_LINE;
      const cutBottom = rank + 1 < cuts.length ? cuts[rank + 1].y + SAME_LINE : bottom;
      const inCut = (line) => line.y <= cutTop && line.y > cutBottom;

      rows.push({
        opinion_raw: opinion?.text ?? null,
        opinion_x: opinion?.x ?? null,
        y: opinion?.y ?? candidate.y,
        title_lines: rank === 0 ? [candidate.text] : [],
        title_x: rank === 0 ? candidate.x : null,
        // La profondeur de l'intitulé, prise à sa numérotation quand le
        // document en porte une, à son indentation sinon.
        title_depth: numbered && rank === 0 ? outlineDepth(candidate.text) : null,
        ancestors,
        complement_lines: complements.filter(inCut).map((line) => line.text),
        comment_lines: commentLines.filter(inCut).map((line) => line.text),
        // L'article du règlement a sa propre colonne dans un rapport APD.
        article_raw: articleLines.filter(inCut).map((line) => line.text).join(" ") || null,
        reference_raw: referenceLines.filter(inCut).map((line) => line.text).find(isReference) ?? null
      });
    }
  }

  return { rows, stack };
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

  // Aucun candidat entier ne se retrouve : deux intitulés que l'aplatissement
  // a recollés, une observation coupée par un saut de page. Le début de
  // l'intitulé, lui, vient bien du document — on cite ce qu'on peut prouver,
  // quitte à en dire moins. L'appréciation, elle, garde sa cellule pour
  // provenance.
  for (const candidate of [firstTitle, first]) {
    if (!candidate || text === "") continue;
    const words = normalizeWhitespace(candidate).split(" ");
    for (let take = words.length - 1; take >= 3; take -= 1) {
      const prefix = words.slice(0, take).join(" ");
      if (containsPhrase(text, prefix)) return prefix;
    }
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
export function extractAvisFromLayout(source, { legend, pack = DEFAULT_PACK } = {}) {
  const entries = legend?.codes ?? [];
  if (entries.length === 0) return null;

  const byCode = new Map(entries.map((entry) => [entry.code, entry]));
  const codes = entries.map((entry) => entry.code);
  const pages = Array.isArray(source?.pages) ? source.pages : [];

  const occurrences = [];
  let tables = 0;

  const repeated = repeatedLines(pages);

  let stack = [];
  for (const page of pages) {
    const table = readTableRows(page, codes, { stack, repeated, pack });
    if (!table) continue;
    tables += 1;
    stack = table.stack ?? stack;

    for (const row of table.rows) {
      const entry = byCode.get(row.opinion_raw) ?? null;
      // Une ligne sans appréciation lisible mais numérotée reste une ligne :
      // le bureau de contrôle ne donne un numéro qu'à ce qu'il entend suivre.
      // La taire ferait disparaître la création de l'avis, qui ne réapparaît
      // qu'au récapitulatif suivant — un an plus tard, sans commencement.
      if (!entry && !row.reference_raw) continue;

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
        opinion_normalized: entry?.id ?? null,
        opinion_label: entry?.label ?? null,
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
        opinion_cell: row.opinion_raw
          ? { page: page.page ?? null, x: row.opinion_x, y: row.y, text: row.opinion_raw }
          : null,
        confidence: page.page === null ? CONFIDENCE.OCCURRENCE_WITHOUT_PAGE : CONFIDENCE.OCCURRENCE_WITH_PAGE,
        // Sans code lu, il n'y a pas d'avis reconnu : `null` dit l'abstention,
        // là où une confiance basse laisserait croire à une lecture douteuse.
        opinion_confidence: entry ? CONFIDENCE.OPINION_FROM_LEGEND : null,
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
