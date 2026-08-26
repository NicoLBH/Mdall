/**
 * Spike 1 — Phase A : extraction des occurrences d'avis dans un rapport.
 *
 * Principes tenus ici :
 *  - `opinion_raw` est le texte tel qu'il a été écrit par le bureau de contrôle.
 *    Une normalisation peut s'y ajouter, jamais s'y substituer.
 *  - Un avis non reconnu reste non reconnu (`opinion_normalized: null`). Le
 *    spike ne devine pas un statut : le bureau de contrôle reste l'auteur.
 *  - Deux occurrences d'une même référence dans un même rapport ne sont pas
 *    départagées : elles deviennent une abstention.
 *  - Aucune nomenclature d'organisme n'est présumée : motifs et lexique sont
 *    des paramètres du cas.
 */

import { normalizeReferenceKey, normalizeWhitespace, stripDiacritics } from "../lib/normalize.mjs";

export const EXTRACTION_STATE = {
  EXTRACTED: "EXTRACTED",
  UNKNOWN_OPINION: "UNKNOWN_OPINION",
  AMBIGUOUS_REFERENCE: "AMBIGUOUS_REFERENCE"
};

/**
 * Lexique d'avis par défaut. Chaque entrée conserve les formulations telles
 * qu'on les rencontre ; l'`id` sert au rapprochement, jamais à l'affichage.
 * Volontairement court : ajouter une formulation est un acte d'annotation,
 * pas une inférence du moteur.
 */
export const DEFAULT_OPINION_LEXICON = [
  { id: "favorable", labels: ["avis favorable", "favorable"] },
  { id: "defavorable", labels: ["avis défavorable", "défavorable"] },
  { id: "a_preciser", labels: ["à préciser", "avis à préciser"] },
  { id: "suspendu", labels: ["avis suspendu", "suspendu"] },
  { id: "sans_objet", labels: ["sans objet"] },
  { id: "en_attente", labels: ["dans l'attente", "en attente"] },
  { id: "non_leve", labels: ["non levée", "non levé"] },
  { id: "leve", labels: ["levée", "levé"] },
  { id: "maintenu", labels: ["maintenue", "maintenu"] }
];

/**
 * Motifs de ligne par défaut. Deux mises en page seulement, et c'est
 * volontaire : le corpus réel dira lesquelles ajouter.
 */
export const DEFAULT_REFERENCE_PATTERNS = [
  {
    id: "label-reference-separator",
    source:
      "^(?<label>avis|observation|obs\\.?|remarque|point|item)\\s*(?:n°|nº|n\\s?o|#)?\\s*(?<reference>[0-9A-Za-z]+(?:[.\\-/][0-9A-Za-z]+)*)\\s*[:\\-–—]\\s*(?<rest>.+)$",
    flags: "iu"
  },
  {
    id: "pipe-table",
    source:
      "^\\|?\\s*(?<reference>[0-9A-Za-z]+(?:[.\\-/][0-9A-Za-z]+)*)\\s*\\|\\s*(?<opinion>[^|]+?)\\s*\\|\\s*(?<rest>[^|]+?)\\s*\\|?\\s*$",
    flags: "u"
  }
];

/**
 * Deux confiances, deux questions différentes (§8.3) :
 *  - `confidence` : à quel point l'occurrence a-t-elle été lue correctement ?
 *  - `opinion_confidence` : à quel point l'avis a-t-il été reconnu ?
 *
 * Un avis non reconnu ne dégrade pas la première : `opinion_raw: null` est une
 * réponse honnête et complète, pas une lecture douteuse. Les mélanger ferait
 * passer une extraction franche pour un rapprochement hasardeux.
 */
export const CONFIDENCE = {
  OCCURRENCE_WITH_PAGE: 0.95,
  OCCURRENCE_WITHOUT_PAGE: 0.85,
  OPINION_RECOGNIZED: 0.9,
  OPINION_UNRECOGNIZED: null
};

/**
 * Associe à chaque caractère de la chaîne normalisée son index dans la chaîne
 * brute, afin de pouvoir découper `opinion_raw` sans perdre la graphie d'origine.
 */
function buildNormalizationMap(raw) {
  let normalized = "";
  const rawIndexAt = [];

  for (let index = 0; index < raw.length; index += 1) {
    const chunk = stripDiacritics(raw[index]).toLowerCase();
    for (const char of chunk) {
      normalized += char;
      rawIndexAt.push(index);
    }
  }
  rawIndexAt.push(raw.length);

  return { normalized, rawIndexAt };
}

/**
 * Cherche une formulation d'avis en tête de `rest`.
 * @returns {{opinionRaw: string, opinionId: string, descriptionRaw: string}|null}
 */
export function matchOpinion(rest, lexicon = DEFAULT_OPINION_LEXICON) {
  const { normalized, rawIndexAt } = buildNormalizationMap(rest);

  const candidates = lexicon
    .flatMap((entry) => entry.labels.map((label) => ({ id: entry.id, label })))
    .map((candidate) => ({ ...candidate, normalizedLabel: buildNormalizationMap(candidate.label).normalized }))
    .sort((a, b) => b.normalizedLabel.length - a.normalizedLabel.length);

  for (const candidate of candidates) {
    if (!normalized.startsWith(candidate.normalizedLabel)) continue;

    const cutAt = rawIndexAt[candidate.normalizedLabel.length];
    return {
      opinionRaw: rest.slice(0, cutAt).trim(),
      opinionId: candidate.id,
      descriptionRaw: rest.slice(cutAt).replace(/^[\s:;,.\-–—]+/u, "").trim()
    };
  }

  return null;
}

function compilePatterns(patterns) {
  return patterns.map((pattern) => ({
    id: pattern.id,
    regex: pattern.regex instanceof RegExp ? pattern.regex : new RegExp(pattern.source, pattern.flags ?? "u")
  }));
}

/** Découpe une source en lignes, avec leur numéro de page quand il est connu. */
export function toLines(source) {
  if (Array.isArray(source.pages) && source.pages.length > 0) {
    return source.pages.flatMap((page) =>
      page.text.split(/\r?\n/).map((text) => ({ text, page: page.page }))
    );
  }
  if (!source.content_available) return [];
  return source.content.split(/\r?\n/).map((text) => ({ text, page: null }));
}

/**
 * Extrait les occurrences d'avis d'une source.
 * @returns {{occurrences: object[]}}
 */
export function extractOccurrences(source, { patterns = DEFAULT_REFERENCE_PATTERNS, lexicon = DEFAULT_OPINION_LEXICON } = {}) {
  const compiled = compilePatterns(patterns);
  const occurrences = [];

  for (const line of toLines(source)) {
    const raw = normalizeWhitespace(line.text);
    if (raw === "") continue;

    for (const pattern of compiled) {
      const match = pattern.regex.exec(raw);
      if (!match?.groups) continue;

      const referenceRaw = normalizeWhitespace(match.groups.reference);
      const rest = normalizeWhitespace(match.groups.rest ?? "");
      const explicitOpinion = match.groups.opinion ? normalizeWhitespace(match.groups.opinion) : null;

      const opinionMatch = explicitOpinion
        ? { ...(matchOpinion(explicitOpinion, lexicon) ?? {}), opinionRaw: explicitOpinion, descriptionRaw: rest }
        : matchOpinion(rest, lexicon);

      const opinionRaw = opinionMatch?.opinionRaw ?? null;
      const opinionId = opinionMatch?.opinionId ?? null;
      const descriptionRaw = opinionMatch ? opinionMatch.descriptionRaw : rest;

      const confidence =
        line.page === null ? CONFIDENCE.OCCURRENCE_WITHOUT_PAGE : CONFIDENCE.OCCURRENCE_WITH_PAGE;

      occurrences.push({
        external_reference_raw: referenceRaw,
        external_reference_normalized: normalizeReferenceKey(referenceRaw),
        opinion_raw: opinionRaw,
        opinion_normalized: opinionId,
        description_raw: descriptionRaw,
        source_document_id: source.source_id,
        source_page: line.page,
        source_excerpt: raw,
        confidence,
        opinion_confidence: opinionId === null ? CONFIDENCE.OPINION_UNRECOGNIZED : CONFIDENCE.OPINION_RECOGNIZED,
        extraction_state: opinionId === null ? EXTRACTION_STATE.UNKNOWN_OPINION : EXTRACTION_STATE.EXTRACTED,
        pattern_id: pattern.id
      });
      break;
    }
  }

  return { occurrences: markAmbiguousReferences(occurrences) };
}

/**
 * Deux occurrences d'une même référence normalisée dans un même document ne
 * peuvent pas être départagées : elles sont marquées ambiguës, pas arbitrées.
 */
export function markAmbiguousReferences(occurrences) {
  const countByReference = new Map();
  for (const occurrence of occurrences) {
    const key = occurrence.external_reference_normalized;
    countByReference.set(key, (countByReference.get(key) ?? 0) + 1);
  }

  return occurrences.map((occurrence) =>
    countByReference.get(occurrence.external_reference_normalized) > 1
      ? {
          ...occurrence,
          extraction_state: EXTRACTION_STATE.AMBIGUOUS_REFERENCE,
          confidence: null,
          opinion_confidence: null
        }
      : occurrence
  );
}
