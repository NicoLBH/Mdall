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

import { normalizeReferenceKey, normalizeWhitespace } from "../lib/normalize.mjs";
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

/** Vrai si la page porte l'en-tête d'un tableau d'avis. */
export function hasTableHeader(items) {
  for (const candidate of items) {
    const sameLine = items.filter((item) => Math.abs(item.y - candidate.y) <= SAME_LINE);
    const matched = HEADERS.filter((header) =>
      sameLine.some((item) => header.pattern.test(normalizeWhitespace(item.text)))
    );
    if (matched.length === HEADERS.length) return candidate.y;
  }
  return null;
}

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
 * @returns {{opinionX: number, referenceX: number}|null}
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

  return { opinionX, referenceX };
}

const MARGIN = 12;

function columnOf({ opinionX, referenceX }, item) {
  if (item.x < opinionX - MARGIN) return "disposition";
  if (item.x < opinionX + MARGIN) return "opinion";
  if (item.x < referenceX - MARGIN) return "comment";
  return "reference";
}

/** Regroupe des fragments en lignes de texte, de haut en bas. */
function toLines(items) {
  const sorted = [...items].sort((a, b) => (Math.abs(a.y - b.y) <= SAME_LINE ? a.x - b.x : b.y - a.y));
  const lines = [];

  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - item.y) <= SAME_LINE) {
      last.text = `${last.text} ${item.text}`;
      last.italic = last.italic && item.italic === true;
      continue;
    }
    lines.push({ y: item.y, x: item.x, text: item.text, italic: item.italic === true });
  }

  return lines.map((line) => ({ ...line, text: normalizeWhitespace(line.text) }));
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
export function readTableRows(page, codes) {
  const items = Array.isArray(page?.items) ? page.items : null;
  if (!items || items.length === 0) return null;

  const headerY = hasTableHeader(items);
  if (headerY === null) return null;

  const known = new Set(codes ?? []);
  const below = items.filter((item) => item.y < headerY - SAME_LINE);

  const layout = deriveColumns(below, codes);
  if (!layout) return { rows: [], columns: null };

  const byColumn = { disposition: [], opinion: [], comment: [], reference: [] };
  for (const item of below) byColumn[columnOf(layout, item)].push(item);

  // Chaque ligne du tableau est ancrée par son code d'avis : c'est la seule
  // cellule qui y figure exactement une fois.
  const anchors = toLines(byColumn.opinion)
    .filter((line) => known.has(line.text))
    .sort((a, b) => b.y - a.y);

  if (anchors.length === 0) return { rows: [], columns: layout };

  const dispositionLines = toLines(byColumn.disposition);
  const commentLines = toLines(byColumn.comment);
  const referenceLines = toLines(byColumn.reference);

  const rows = anchors.map((anchor, index) => {
    const top = anchor.y + SAME_LINE;
    const bottom = index + 1 < anchors.length ? anchors[index + 1].y + SAME_LINE : -Infinity;
    const inBand = (line) => line.y <= top && line.y > bottom;

    const band = dispositionLines.filter(inBand);
    const { title, complement, outlineUpdates } = splitDispositionBand(band);

    return {
      opinion_raw: anchor.text,
      y: anchor.y,
      title_lines: title,
      title_x: band[0]?.x ?? null,
      complement_lines: complement,
      outline_updates: outlineUpdates,
      comment_lines: commentLines.filter(inBand).map((line) => line.text),
      reference_raw: referenceLines.filter(inBand).map((line) => line.text).find((text) => /^\d{1,4}$/.test(text)) ?? null
    };
  });

  return { rows: withAncestors(rows, dispositionLines, anchors[0].y + SAME_LINE), columns: layout };
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
 */
export function splitDispositionBand(band) {
  if (band.length === 0) return { title: [], complement: [], outlineUpdates: [] };

  const titleX = band[0].x;
  const title = [];
  const complement = [];
  const outlineUpdates = [];
  let ended = false;

  for (const line of band) {
    if (ended || line.x < titleX - 1) {
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
function withAncestors(rows, dispositionLines, firstTop) {
  const stack = [];

  const push = (entry) => {
    while (stack.length > 0 && stack[stack.length - 1].x >= entry.x) stack.pop();
    stack.push(entry);
  };

  // Tout ce qui précède la première ligne du tableau est de l'intertitre.
  for (const line of toParagraphs(dispositionLines.filter((line) => line.y > firstTop))) {
    push({ x: line.x, text: line.text });
  }

  return rows.map((row) => {
    // Un intertitre est forcément moins indenté que l'intitulé qu'il porte.
    // Sans ce filtre, une ligne de continuation restée dans la pile passait
    // pour un chapitre et l'arborescence devenait absurde.
    const titleX = row.title_x ?? Infinity;
    const ancestors = stack.filter((entry) => entry.x < titleX - 1).map((entry) => entry.text);
    for (const update of toParagraphs(row.outline_updates)) push({ x: update.x, text: update.text });
    return { ...row, ancestors };
  });
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

  for (const page of pages) {
    const table = readTableRows(page, codes);
    if (!table) continue;
    tables += 1;

    for (const row of table.rows) {
      const entry = byCode.get(row.opinion_raw);
      if (!entry) continue;

      // L'article réglementaire et la numérotation se détachent de l'intitulé
      // comme dans la lecture par lignes : « PE11§2 6.1.2.6.2.1 Dispositif de
      // manoeuvre… » n'est pas un intitulé, c'est trois informations.
      const { title_raw, section_number_raw, regulation_article_raw } = splitTitle(row.title_lines);
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
        regulation_article_raw,
        source_document_id: source.source_id,
        source_page: page.page ?? null,
        // L'extrait doit se retrouver tel quel dans la source : on cite la
        // cellule d'observation, qui est contiguë dans le texte aplati.
        source_excerpt: description || title_raw,
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
