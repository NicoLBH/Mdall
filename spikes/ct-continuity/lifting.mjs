/**
 * Spike 1 — déclarations explicites de levée.
 *
 * Le cadrage l'impose : l'absence d'un avis dans un rapport ultérieur ne vaut
 * pas levée (§28.5). Mais une phrase qui dit « L'avis 171 est levé » est, elle,
 * une preuve — écrite par l'organisme, dans le document, avec sa page.
 *
 * Ce module ne fait que la lire. Il ne change aucun état : le statut exprimé
 * par la source et le statut d'un sujet Mdall restent deux informations
 * différentes (§11). La levée est une preuve versée au dossier, pas une
 * décision appliquée.
 *
 * Aucune inférence : sans numéro explicite dans la phrase, rien n'est produit.
 */

import { normalizeReferenceKey, normalizeWhitespace } from "../lib/normalize.mjs";
import { DEFAULT_PACK } from "./packs/index.mjs";

/**
 * Un titre de section n'a pas de point final : remonter jusqu'au point
 * précédent ramène donc le titre avec la phrase. Ici, ce titre dit exactement
 * l'inverse de la phrase citée — la preuve affichée se lirait à l'envers.
 * On retire donc l'en-tête en capitales qui précède, mot à mot.
 */
function stripLeadingHeading(text) {
  const words = text.split(/\s+/);
  const firstLowercase = words.findIndex((word) => /\p{Ll}/u.test(word));
  // Pas de bascule majuscules → minuscules : il n'y a pas de titre à retirer.
  if (firstLowercase < 3) return text;

  // La phrase peut commencer par un mot d'une seule lettre — « À notre
  // connaissance… » — que la bascule laisserait du mauvais côté.
  const start =
    /^\p{Lu}\p{P}?$/u.test(words[firstLowercase - 1] ?? "") ? firstLowercase - 1 : firstLowercase;

  return words.slice(start).join(" ");
}

/** Étend un fragment reconnu aux bornes de sa phrase, pour pouvoir la citer. */
function expandToSentence(text, start, end) {
  const before = text.lastIndexOf(".", start);
  const after = text.indexOf(".", end);
  const sentence = text.slice(before + 1, after === -1 ? end : after + 1).trim();
  const trimmed = stripLeadingHeading(sentence);
  // Jamais au point de perdre le fragment reconnu.
  return trimmed.length >= end - start ? trimmed : sentence;
}

/**
 * Déclarations de clôture globale portées par un document.
 *
 * @returns {{sentence: string, source_document_id: string, source_page: number|null,
 *            scope: "ALL_AVIS"}[]}
 */
export function findGlobalClearances(source, { pack = DEFAULT_PACK } = {}) {
  if (!source?.content_available) return [];

  const pages = Array.isArray(source.pages) && source.pages.length > 0
    ? source.pages
    : [{ page: null, text: source.content }];

  const clearances = [];

  for (const page of pages) {
    // La phrase court sur plusieurs lignes une fois le PDF aplati : on
    // raisonne sur la page recomposée, pas ligne à ligne.
    const flattened = normalizeWhitespace(page.text.replace(/\r?\n/g, " "));
    const match = pack.globalClearance.exec(flattened);
    if (!match) continue;

    // La négation se teste sur le fragment reconnu, jamais sur la page : le
    // titre de section voisin en contient une, et il n'a rien à voir avec la
    // phrase de clôture qui le suit.
    if (pack.clearanceNegation.test(match[0])) continue;

    clearances.push({
      // On rend la phrase entière, ponctuation comprise : c'est elle qu'on
      // cite en preuve, pas le fragment reconnu par le motif.
      sentence: expandToSentence(flattened, match.index, match.index + match[0].length),
      source_document_id: source.source_id,
      source_page: page.page ?? null,
      scope: "ALL_AVIS"
    });
    break;
  }

  return clearances;
}

/**
 * @returns {{reference_raw: string, reference_normalized: string, sentence: string,
 *            source_document_id: string, source_page: number|null}[]}
 */
export function findLiftingStatements(source, { pack = DEFAULT_PACK } = {}) {
  if (!source?.content_available) return [];

  const pages = Array.isArray(source.pages) && source.pages.length > 0
    ? source.pages
    : [{ page: null, text: source.content }];

  const statements = [];
  const seen = new Set();

  for (const page of pages) {
    for (const rawLine of page.text.split(/\r?\n/)) {
      const line = normalizeWhitespace(rawLine);
      if (line === "") continue;

      for (const pattern of pack.liftingPatterns) {
        pattern.lastIndex = 0;
        for (const match of line.matchAll(pattern)) {
          for (const reference of match.groups.references.split(/\s*(?:,|et)\s*/)) {
            const raw = reference.trim();
            if (raw === "") continue;

            const key = `${source.source_id}:${page.page}:${raw}`;
            if (seen.has(key)) continue;
            seen.add(key);

            statements.push({
              reference_raw: raw,
              reference_normalized: normalizeReferenceKey(raw),
              sentence: line,
              source_document_id: source.source_id,
              source_page: page.page
            });
          }
        }
      }
    }
  }

  return statements;
}

/** Index par référence normalisée, pour rattacher une preuve à une continuité. */
export function indexStatements(statements) {
  const index = new Map();
  for (const statement of statements) {
    const key = `${statement.source_document_id}:${statement.reference_normalized}`;
    index.set(key, [...(index.get(key) ?? []), statement]);
  }
  return index;
}
