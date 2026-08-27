/**
 * Spike 1 — lecture en blocs des rapports de contrôle technique.
 *
 * Un rapport CT est un tableau à quatre colonnes :
 *
 *   Dispositions du projet | Avis* | Observations et commentaires | N°
 *
 * L'extraction PDF aplatit ce tableau. Une ligne de texte n'est donc pas une
 * observation : une observation est un **bloc** qui commence à un code d'avis,
 * précédé de son intitulé et suivi de son commentaire, puis éventuellement d'un
 * numéro seul sur sa ligne — la colonne N°.
 *
 * Ce numéro est la seule identité stable d'un rapport à l'autre : il ne figure
 * que sur les avis qui appellent une suite (S et D). Les avis sans numéro sont
 * extraits et affichés, mais ne peuvent pas être suivis — et le spike le dit
 * plutôt que de leur inventer une identité.
 *
 * Le vocabulaire d'avis n'est pas présumé : il est lu dans la légende du
 * document (voir `legend.mjs`).
 */

import { normalizeReferenceKey, normalizeWhitespace, stripDiacritics } from "../lib/normalize.mjs";
import { discoverLegend, legendToLexicon } from "./legend.mjs";

export const EXTRACTION_STATE = {
  EXTRACTED: "EXTRACTED",
  NO_EXTERNAL_REFERENCE: "NO_EXTERNAL_REFERENCE",
  AMBIGUOUS_REFERENCE: "AMBIGUOUS_REFERENCE"
};

export const IDENTITY_SOURCE = {
  NUMBER_COLUMN: "NUMBER_COLUMN",
  NONE: "NONE"
};

export const CONFIDENCE = {
  OCCURRENCE_WITH_PAGE: 0.95,
  OCCURRENCE_WITHOUT_PAGE: 0.85,
  OPINION_FROM_LEGEND: 0.95
};

/** Bornes de sécurité : mieux vaut un commentaire tronqué qu'un bloc qui avale le document. */
const MAX_COMMENT_LINES = 40;
const MAX_TITLE_LINES = 8;

/** Lignes qui ne portent aucune information de suivi. */
const NOISE = [
  /^\d+\s*\/\s*\d+$/,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  /^[-–—•*]+$/,
  /^page\s+\d+/i
];

/**
 * Texte répété de page en page : en-têtes, pieds de page, rappels de légende.
 * Le détecter par répétition évite d'inscrire dans le code les habitudes d'un
 * organisme particulier.
 */
export function detectBoilerplate(pages, { minPages = 3, minRatio = 0.3, protectedLines = [] } = {}) {
  // Un code d'avis seul sur sa ligne se répète forcément de page en page :
  // le confondre avec un pied de page ferait disparaître des avis entiers.
  const protectedSet = new Set(protectedLines);
  const seen = new Map();

  for (const page of pages) {
    const unique = new Set(page.text.split(/\r?\n/).map((line) => normalizeWhitespace(line)).filter(Boolean));
    for (const line of unique) {
      if (protectedSet.has(line)) continue;
      seen.set(line, (seen.get(line) ?? 0) + 1);
    }
  }

  const threshold = Math.max(minPages, Math.ceil(pages.length * minRatio));
  return new Set([...seen.entries()].filter(([, count]) => count >= threshold).map(([line]) => line));
}

/**
 * En-tête de tableau. C'est l'ancre structurelle la plus fiable du document :
 * hors d'un tableau, il n'y a pas d'avis — le sommaire et l'introduction en
 * produiraient sinon de faux (« ÉLÉMENTS D » se termine par un D qui n'est pas
 * un avis mais le début de « D´ÉQUIPEMENT » coupé en fin de ligne).
 */
const TABLE_HEADER = /dispositions du projet.*avis|avis\s*\*/i;

/** `PE6§1`, `PE33 à`, `GN5` : une référence d'article du règlement, pas un avis. */
const ARTICLE_REFERENCE = /^[A-Z]{1,4}\d*(?:§\d+)?(?:\s+à)?$/u;

function looksLikeHeading(line) {
  // Un intertitre peut être préfixé de sa référence réglementaire :
  // « PE6§1 6.1.2.5.2.2 Caractéristiques des portes ».
  if (/^(?:[A-Z]{1,4}\d*(?:§\d+)?\s+)*\d+(\.\d+)*\s+\S/u.test(line)) return true;
  const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letters.length > 3 && letters === letters.toUpperCase();
}

/**
 * Les avis qui appellent une action portent un numéro dans le PDF ; les autres
 * non.
 *
 * L'organisme numérote ce qu'il faut suivre — suspendu, défavorable, non
 * conforme. Un avis favorable, sans objet, pour mémoire ou hors mission a bien
 * un numéro dans le logiciel métier, mais celui-ci n'est pas reporté dans le
 * rapport.
 *
 * Cette règle sert de garde-fou à l'attribution des numéros. Sur un lot réel
 * de dix-sept rapports, 41 des 43 avis numérotés portaient S, D ou NC ; les
 * deux exceptions étaient toutes deux des lignes de tableau fusionnées, où le
 * numéro d'une disposition avait atterri sur la précédente.
 *
 * Le libellé du document prime sur la lettre : c'est la légende qui fait foi,
 * pas une liste de codes que nous aurions décidée.
 */
const ACTION_LABELS = /suspendu|defavorable|non\s*conforme/i;
const ACTION_CODES = new Set(["S", "D", "NC"]);

function requiresAction({ opinion_raw, opinion_label }) {
  const label = stripDiacritics(String(opinion_label ?? ""));
  if (label !== "") return ACTION_LABELS.test(label);
  return ACTION_CODES.has(String(opinion_raw ?? "").toUpperCase());
}

function buildCodeMatchers(codes) {
  const alternation = codes
    .map((entry) => entry.code)
    .sort((a, b) => b.length - a.length)
    .map((code) => code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  return {
    codeOnly: new RegExp(`^(?<code>${alternation})$`, "u"),
    codeLeading: new RegExp(`^(?<code>${alternation})\\s+(?<comment>.+)$`, "u"),
    titleCodeComment: new RegExp(`^(?<title>.+?)\\s+(?<code>${alternation})\\s+(?<comment>.+)$`, "u"),
    titleCode: new RegExp(`^(?<title>.+?)\\s+(?<code>${alternation})$`, "u")
  };
}

/** Coupe une suite de lignes au premier intertitre rencontré. */
function cutAtFirstHeading(lines) {
  const index = lines.findIndex((line) => looksLikeHeading(line));
  return index === -1 ? { before: lines, after: [] } : { before: lines.slice(0, index), after: lines.slice(index) };
}

/**
 * Ne garde que la fin d'une pile de titres, à partir du dernier intertitre :
 * les intertitres précédents sont des ancêtres, pas le sujet de l'avis.
 */
function keepFromLastHeading(lines) {
  let start = 0;
  for (const [index, line] of lines.entries()) {
    if (looksLikeHeading(line)) start = index;
  }
  return lines.slice(start);
}

/**
 * Un intertitre de section est en capitales. Une ligne numérotée, elle, est
 * l'intitulé de l'observation elle-même (« 6.1.2.5.2.2 Caractéristiques des
 * portes ») : les confondre reviendrait à amputer le titre.
 */
function isSectionLabel(line) {
  const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letters.length > 3 && letters === letters.toUpperCase();
}

function splitTitle(titleLines) {
  // La section et l'intitulé sont deux informations distinctes : les coller
  // donnerait « PARAMÈTRES CLIMATIQUES Vent » là où le rapport dit « Vent ».
  let sectionLabel = null;
  let lines = titleLines;

  let lastSection = -1;
  titleLines.forEach((line, index) => {
    if (isSectionLabel(line)) lastSection = index;
  });

  if (lastSection >= 0 && lastSection < titleLines.length - 1) {
    sectionLabel = titleLines[lastSection];
    lines = titleLines.slice(lastSection + 1);
  }

  const title = normalizeWhitespace(lines.join(" "));

  const article = title.match(/^(?<article>(?:[A-Z]{1,4}\d*(?:§\d+)?\s+)+)(?<rest>.*)$/u);
  const withoutArticle = article ? normalizeWhitespace(article.groups.rest) : title;

  const section = withoutArticle.match(/^(?<section>\d+(?:\.\d+)*)\s+(?<rest>.+)$/u);

  return {
    title_raw: section ? normalizeWhitespace(section.groups.rest) : withoutArticle,
    section_label_raw: sectionLabel,
    section_number_raw: section ? section.groups.section : null,
    regulation_article_raw: article ? normalizeWhitespace(article.groups.article) : null
  };
}

/**
 * Extrait les observations d'une source paginée.
 *
 * @param {{source_id: string, pages?: {page: number, text: string}[], content?: string, content_available: boolean}} source
 * @returns {{occurrences: object[], legend: object[], skipped: number}}
 */
export function extractAvisBlocks(source, { legend = null } = {}) {
  if (!source.content_available) return { occurrences: [], legend: [], skipped: 0 };

  const pages = Array.isArray(source.pages) && source.pages.length > 0
    ? source.pages
    : [{ page: null, text: source.content }];

  const own = discoverLegend(pages.map((page) => page.text).join("\n"));
  // La légende du document prime toujours ; celle fournie par le lot ne sert
  // qu'à défaut, et le résultat dit laquelle a servi.
  const discovered = own.codes.length > 0 ? own : { codes: legend?.codes ?? [], lines: own.lines };
  const legendSource = own.codes.length > 0 ? "own_document" : legend?.codes?.length ? "other_documents" : "none";

  if (discovered.codes.length === 0) {
    return {
      occurrences: [],
      legend: [],
      legendSource,
      skipped: 0,
      reason: "aucune légende d'avis, ni dans ce document ni dans les autres du lot"
    };
  }

  const byCode = new Map(discovered.codes.map((entry) => [entry.code, entry]));
  const matchers = buildCodeMatchers(discovered.codes);
  const boilerplate = detectBoilerplate(pages, {
    protectedLines: discovered.codes.map((entry) => entry.code)
  });
  const legendLines = new Set(discovered.lines ?? []);

  const occurrences = [];
  /** Numéros refusés faute d'appartenir au bloc courant : à signaler, pas à taire. */
  const orphanReferences = [];
  let pendingTitle = [];
  let current = null;
  let tail = [];
  let skipped = 0;
  let previousLine = "";
  /** Dernière ligne non vide rencontrée, quelle qu'elle soit : seule garantie
   * de contiguïté pour bâtir un extrait vérifiable dans la source. */
  let previousRawLine = "";

  const closeCurrent = (extraCommentLines = []) => {
    if (!current) return;
    const comment = [...current.commentLines, ...extraCommentLines].slice(0, MAX_COMMENT_LINES);
    occurrences.push({ ...current, description_raw: normalizeWhitespace(comment.join(" ")) });
    current = null;
  };

  const startBlock = ({ code, page, excerpt, titleLines, firstComment }) => {
    // Ce qui traîne depuis le bloc précédent se coupe au premier intertitre :
    // avant, c'est la fin de son commentaire ; après, c'est le titre du suivant.
    const { before, after } = cutAtFirstHeading(tail);
    closeCurrent(before);
    tail = [];
    const resolvedTitleLines = [...after, ...titleLines];

    const entry = byCode.get(code);
    const { title_raw, section_label_raw, section_number_raw, regulation_article_raw } = splitTitle(
      keepFromLastHeading(resolvedTitleLines).slice(-MAX_TITLE_LINES)
    );

    current = {
      external_reference_raw: null,
      external_reference_normalized: null,
      identity_source: IDENTITY_SOURCE.NONE,
      opinion_raw: code,
      opinion_normalized: entry.id,
      opinion_label: entry.label,
      title_raw,
      section_label_raw,
      section_number_raw,
      regulation_article_raw,
      source_document_id: source.source_id,
      source_page: page,
      source_excerpt: excerpt,
      confidence: page === null ? CONFIDENCE.OCCURRENCE_WITHOUT_PAGE : CONFIDENCE.OCCURRENCE_WITH_PAGE,
      opinion_confidence: CONFIDENCE.OPINION_FROM_LEGEND,
      extraction_state: EXTRACTION_STATE.NO_EXTERNAL_REFERENCE,
      commentLines: firstComment ? [firstComment] : []
    };
    pendingTitle = [];
  };

  const documentText = pages.map((page) => page.text).join("\n");
  // Si le document ne déclare aucun en-tête de tableau, on le lit en entier
  // plutôt que de ne rien produire — mais on le signale.
  const hasTableHeaders = documentText.split(/\r?\n/).some((line) => TABLE_HEADER.test(line));
  let insideTable = !hasTableHeaders;

  for (const page of pages) {
    for (const rawLine of page.text.split(/\r?\n/)) {
      const line = normalizeWhitespace(rawLine);
      if (line === "") continue;

      const contiguousExcerpt = previousRawLine === "" ? line : `${previousRawLine} ${line}`;
      previousRawLine = line;

      if (hasTableHeaders && TABLE_HEADER.test(line)) {
        insideTable = true;
        skipped += 1;
        continue;
      }
      if (legendLines.has(line)) {
        // La légende clôt le tableau : ce qui suit relève du texte courant.
        if (hasTableHeaders) insideTable = false;
        closeCurrent(tail);
        tail = [];
        pendingTitle = [];
        skipped += 1;
        continue;
      }
      if (!insideTable) {
        skipped += 1;
        continue;
      }
      if (boilerplate.has(line) || NOISE.some((pattern) => pattern.test(line))) {
        skipped += 1;
        continue;
      }

      const codeOnly = matchers.codeOnly.exec(line);
      if (codeOnly) {
        startBlock({
          code: codeOnly.groups.code,
          page: page.page,
          // L'extrait doit se retrouver tel quel dans la source : joindre des
          // lignes non voisines produirait une citation introuvable.
          excerpt: contiguousExcerpt,
          titleLines: [...pendingTitle],
          firstComment: null
        });
        continue;
      }

      const codeLeading = matchers.codeLeading.exec(line);
      if (codeLeading) {
        startBlock({
          code: codeLeading.groups.code,
          page: page.page,
          excerpt: line,
          titleLines: [...pendingTitle],
          firstComment: codeLeading.groups.comment
        });
        continue;
      }

      const titleCodeComment = matchers.titleCodeComment.exec(line);
      const titleCode = titleCodeComment ? null : matchers.titleCode.exec(line);
      if (titleCodeComment || titleCode) {
        const match = titleCodeComment ?? titleCode;
        startBlock({
          code: match.groups.code,
          page: page.page,
          excerpt: line,
          titleLines: [...pendingTitle, match.groups.title],
          firstComment: match.groups.comment ?? null
        });
        continue;
      }

      // Une référence d'article coupée en fin de ligne laisse un nombre seul
      // (« PE14§1 » puis « 2 » pour PE14§12) : ce n'est pas un numéro d'avis.
      if (/^\d{1,4}$/.test(line) && ARTICLE_REFERENCE.test(previousLine)) {
        previousLine = line;
        skipped += 1;
        continue;
      }

      if (/^\d{1,4}$/.test(line) && current) {
        const reference = line;
        current.commentLines.push(...tail);
        tail = [];

        if (requiresAction(current)) {
          current.external_reference_raw = reference;
          current.external_reference_normalized = normalizeReferenceKey(reference);
          current.identity_source = IDENTITY_SOURCE.NUMBER_COLUMN;
          current.extraction_state = EXTRACTION_STATE.EXTRACTED;
        } else {
          // Ce numéro termine la ligne de tableau d'une autre disposition, dont
          // le code n'a pas encore été lu : les deux lignes ont fusionné à
          // l'aplatissement du PDF. Lui donner ce numéro fabriquerait une
          // identité fausse, et deux avis distincts finiraient rapprochés.
          orphanReferences.push({
            reference,
            attached_to_title: current.title_raw,
            opinion_raw: current.opinion_raw,
            page: current.source_page
          });
        }

        closeCurrent();
        continue;
      }

      if (current) {
        tail.push(line);
        previousLine = line;
        continue;
      }

      // Un nouvel intitulé de section remplace le précédent : la section
      // précédente n'a produit aucun avis, ce n'était donc pas un titre.
      if (pendingTitle.length > 0 && looksLikeHeading(line)) pendingTitle = [line];
      else pendingTitle.push(line);
      previousLine = line;
    }
  }

  closeCurrent(tail);

  return {
    occurrences: markAmbiguous(occurrences),
    legend: discovered.codes,
    legendSource,
    lexicon: legendToLexicon(discovered.codes),
    orphanReferences,
    skipped
  };
}

/**
 * Un même numéro peut apparaître deux fois dans un rapport : les avis S et D
 * sont récapitulés en tête puis détaillés dans leur chapitre. Deux occurrences
 * qui portent le même avis ne sont donc pas ambiguës — c'est la même
 * observation, vue deux fois. Seules des occurrences qui se contredisent le
 * sont, et là le spike s'abstient.
 */
function markAmbiguous(occurrences) {
  const groups = new Map();
  for (const occurrence of occurrences) {
    const key = occurrence.external_reference_normalized;
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), occurrence]);
  }

  const contradictory = new Set();
  const duplicated = new Map();
  for (const [key, group] of groups) {
    if (group.length === 1) continue;
    const opinions = new Set(group.map((occurrence) => occurrence.opinion_normalized));
    if (opinions.size > 1) contradictory.add(key);
    else duplicated.set(key, group.length);
  }

  const kept = [];
  const seen = new Set();
  for (const occurrence of occurrences) {
    const key = occurrence.external_reference_normalized;

    if (key && contradictory.has(key)) {
      kept.push({ ...occurrence, extraction_state: EXTRACTION_STATE.AMBIGUOUS_REFERENCE, confidence: null });
      continue;
    }
    if (key && duplicated.has(key)) {
      // On conserve la première occurrence, la plus détaillée n'étant pas
      // identifiable de façon fiable, et on note combien de fois elle figure.
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push({ ...occurrence, occurrence_count_in_document: duplicated.get(key) });
      continue;
    }
    kept.push(occurrence);
  }

  return kept;
}
