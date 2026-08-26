/**
 * Spike 1 — pipeline CT Continuity.
 *
 * Il assemble deux phases et n'en fait pas plus :
 *   Phase A : extraction des occurrences d'avis (extraction.mjs)
 *   Phase B : reconstruction de la continuité entre rapports (continuity.mjs)
 *
 * Ce qu'il ne fait pas, et ne doit jamais faire :
 *  - aucun contrôle réglementaire, aucun avis produit par le moteur ;
 *  - aucun statut de sujet Mdall, aucune écriture dans un projet réel ;
 *  - aucun rapprochement sémantique entre deux références différentes.
 */

import { buildContinuity, buildExperimentalSuggestions, CONTINUITY_STATE } from "./continuity.mjs";
import {
  DEFAULT_OPINION_LEXICON,
  DEFAULT_REFERENCE_PATTERNS,
  EXTRACTION_STATE,
  extractOccurrences
} from "./extraction.mjs";

export const PIPELINE_VERSION = "0.1.0";

export function extractionKey(documentId, reference) {
  return `extraction:${documentId}:${reference}`;
}

export function continuityKey(documentId, reference) {
  return `continuity:${documentId}:${reference}`;
}

/**
 * Une occurrence extraite devient une prédiction d'interprétation.
 * `value` ne contient que ce qui est confronté à la ground truth ; le reste
 * (graphie de la description, état d'extraction, motif utilisé) reste en
 * métadonnée, consultable mais non comparé.
 */
function toExtractionPrediction(occurrence) {
  const ambiguous = occurrence.extraction_state === EXTRACTION_STATE.AMBIGUOUS_REFERENCE;

  return {
    key: extractionKey(occurrence.source_document_id, occurrence.external_reference_normalized),
    kind: "extraction",
    state: ambiguous ? "AMBIGUOUS" : "PREDICTED",
    confidence: occurrence.confidence,
    value: ambiguous
      ? null
      : {
          external_reference_raw: occurrence.external_reference_raw,
          external_reference_normalized: occurrence.external_reference_normalized,
          opinion_raw: occurrence.opinion_raw,
          source_page: occurrence.source_page
        },
    provenance: {
      source_id: occurrence.source_document_id,
      page: occurrence.source_page,
      excerpt: occurrence.source_excerpt
    },
    extraction_state: occurrence.extraction_state,
    // Confiance de reconnaissance de l'avis, distincte de la confiance de lecture
    // de l'occurrence : null signifie « aucun avis reconnu », pas « avis douteux ».
    opinion_confidence: occurrence.opinion_confidence,
    opinion_normalized: occurrence.opinion_normalized,
    description_raw: occurrence.description_raw,
    pattern_id: occurrence.pattern_id
  };
}

/** Une occurrence ambiguë ne produit qu'une seule prédiction, qui s'abstient. */
function toAmbiguousExtractionPrediction(documentId, reference, occurrences) {
  return {
    key: extractionKey(documentId, reference),
    kind: "extraction",
    state: "AMBIGUOUS",
    confidence: null,
    value: null,
    candidates: occurrences.map((occurrence) => ({
      external_reference_raw: occurrence.external_reference_raw,
      opinion_raw: occurrence.opinion_raw,
      source_page: occurrence.source_page,
      source_excerpt: occurrence.source_excerpt
    })),
    provenance: {
      source_id: documentId,
      page: occurrences[0].source_page,
      excerpt: occurrences[0].source_excerpt
    },
    extraction_state: EXTRACTION_STATE.AMBIGUOUS_REFERENCE,
    rationale: `${occurrences.length} occurrences de la référence ${reference} dans ${documentId}`
  };
}

function toContinuityPrediction(item) {
  const ambiguous = item.state === CONTINUITY_STATE.AMBIGUOUS;
  // Preuve citable : l'occurrence courante, sinon la dernière lecture connue —
  // y compris ambiguë, faute de quoi un NOT_FOUND n'aurait rien à montrer.
  const evidence = item.occurrence ?? item.previous_occurrence ?? item.last_seen_occurrence ?? null;

  return {
    key: continuityKey(item.document_id, item.reference),
    kind: "continuity",
    state: ambiguous ? "AMBIGUOUS" : "PREDICTED",
    confidence: item.confidence,
    value: ambiguous
      ? null
      : {
          state: item.state,
          opinion_change: item.opinion_change,
          previous_document_id: item.previous_document_id
        },
    // Pour un NOT_FOUND, la preuve disponible est la dernière occurrence lue,
    // dans le document où elle figurait. L'absence, elle, est déclarée à part.
    provenance: evidence
      ? { source_id: evidence.source_document_id, page: evidence.source_page, excerpt: evidence.source_excerpt }
      : null,
    derived_from_absence: item.derived_from_absence,
    absent_from_document_id: item.state === CONTINUITY_STATE.NOT_FOUND ? item.document_id : null,
    match_method: item.match_method,
    description_changed: item.description_changed,
    candidates: item.candidates?.map((occurrence) => ({
      external_reference_raw: occurrence.external_reference_raw,
      opinion_raw: occurrence.opinion_raw,
      source_excerpt: occurrence.source_excerpt
    }))
  };
}

/** Regroupe les occurrences d'un document par référence normalisée. */
function groupByReference(occurrences) {
  const groups = new Map();
  for (const occurrence of occurrences) {
    const key = occurrence.external_reference_normalized;
    groups.set(key, [...(groups.get(key) ?? []), occurrence]);
  }
  return groups;
}

export const ctContinuityPipeline = {
  id: "ct-continuity",
  version: PIPELINE_VERSION,
  description:
    "Extraction déterministe des avis d'un rapport de contrôle technique et reconstruction de leur continuité entre rapports successifs.",

  async run({ sources, params = {} }) {
    const extractionParams = {
      patterns: params.extraction?.patterns ?? DEFAULT_REFERENCE_PATTERNS,
      lexicon: params.extraction?.lexicon ?? DEFAULT_OPINION_LEXICON
    };

    const documents = [];
    const predictions = [];
    const skippedSources = [];

    for (const source of sources) {
      if (!source.content_available) {
        skippedSources.push(source.source_id);
        documents.push({ source, occurrences: [] });
        continue;
      }

      const { occurrences } = extractOccurrences(source, extractionParams);
      documents.push({ source, occurrences });

      for (const [reference, group] of groupByReference(occurrences)) {
        predictions.push(
          group.length > 1
            ? toAmbiguousExtractionPrediction(source.source_id, reference, group)
            : toExtractionPrediction(group[0])
        );
      }
    }

    const continuityItems = buildContinuity(documents);
    for (const item of continuityItems) {
      predictions.push(toContinuityPrediction(item));
    }

    const notes = [
      skippedSources.length > 0
        ? `Sources sans contenu exploitable, ignorées sans conclusion : ${skippedSources.join(", ")}.`
        : null,
      "Aucun statut de sujet Mdall n'est produit : les suggestions expérimentales sont tenues hors des prédictions."
    ]
      .filter(Boolean)
      .join(" ");

    return {
      predictions,
      notes,
      experimental_suggestions: buildExperimentalSuggestions(continuityItems)
    };
  }
};

export default ctContinuityPipeline;
