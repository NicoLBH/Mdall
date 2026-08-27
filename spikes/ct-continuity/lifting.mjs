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
 * Le rapport final clôt la mission par une phrase, et une seule, qui vaut pour
 * tout le dossier :
 *
 *   « À notre connaissance, l'ensemble des avis que nous avons émis dans le
 *     cadre de notre mission au cours de l'opération ont été suivis d'effet. »
 *
 * C'est la clôture la plus forte du corpus : datée, signée, opposable. Sans
 * elle, un chantier dont les avis ont tous été traités ressort « sans
 * nouvelles » de bout en bout, ce qui est le contraire de la vérité.
 *
 * Le titre de la section qui la précède dit l'inverse — « AVIS QUI […] N'ONT
 * PAS ETE SUIVIS D'EFFETS » — et se trouve à deux mots de la formulation
 * recherchée. D'où la garde explicite sur la négation : c'est exactement le
 * genre de voisinage où un motif trop large affirme le contraire du document.
 */
const GLOBAL_CLEARANCE = new RegExp(
  "(?<subject>l['’]ensemble\\s+des\\s+avis|tous\\s+les\\s+avis)" +
    "[^.]{0,220}?" +
    "\\bont\\s+(?:tous\\s+)?[ée]t[ée]\\s+suivis?\\s+d['’]effets?",
  "iu"
);

const NEGATION = /n['’]ont\s+pas/i;

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
export function findGlobalClearances(source) {
  if (!source?.content_available) return [];

  const pages = Array.isArray(source.pages) && source.pages.length > 0
    ? source.pages
    : [{ page: null, text: source.content }];

  const clearances = [];

  for (const page of pages) {
    // La phrase court sur plusieurs lignes une fois le PDF aplati : on
    // raisonne sur la page recomposée, pas ligne à ligne.
    const flattened = normalizeWhitespace(page.text.replace(/\r?\n/g, " "));
    const match = GLOBAL_CLEARANCE.exec(flattened);
    if (!match) continue;

    // La négation se teste sur le fragment reconnu, jamais sur la page : le
    // titre de section voisin en contient une, et il n'a rien à voir avec la
    // phrase de clôture qui le suit.
    if (NEGATION.test(match[0])) continue;

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
