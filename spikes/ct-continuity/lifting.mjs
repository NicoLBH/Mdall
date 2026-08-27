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

/**
 * Formulations reconnues. Volontairement étroites : une phrase qui parle de
 * levée sans désigner de numéro ne prouve rien d'exploitable.
 */
/**
 * `\b` est défini sur [A-Za-z0-9_] : après « levé », la frontière de mot
 * n'existe pas, puisque « é » n'est pas un caractère de mot au sens de
 * JavaScript. Il faut donc une fin de mot qui connaisse les lettres accentuées.
 */
const END_OF_WORD = "(?!\\p{L})";

const PATTERNS = [
  new RegExp(`\\bl['’]avis\\s*(?:n[°o]\\s*)?(?<references>\\d{1,4})\\s+est\\s+lev[ée]e?${END_OF_WORD}`, "giu"),
  new RegExp(`\\bles\\s+avis\\s*(?:n[°os]*\\s*)?(?<references>\\d{1,4}(?:\\s*(?:,|et)\\s*\\d{1,4})+)\\s+sont\\s+lev[ée]e?s?${END_OF_WORD}`, "giu"),
  new RegExp(`\\bavis\\s*n[°o]\\s*(?<references>\\d{1,4})\\s+lev[ée]e?${END_OF_WORD}`, "giu")
];

/**
 * @returns {{reference_raw: string, reference_normalized: string, sentence: string,
 *            source_document_id: string, source_page: number|null}[]}
 */
export function findLiftingStatements(source) {
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

      for (const pattern of PATTERNS) {
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
