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

import { extractAvisBlocks, EXTRACTION_STATE as BLOCK_STATE, IDENTITY_SOURCE } from "./block-extraction.mjs";
import { buildContinuity, buildExperimentalSuggestions, CONTINUITY_STATE } from "./continuity.mjs";
import {
  DEFAULT_OPINION_LEXICON,
  DEFAULT_REFERENCE_PATTERNS,
  EXTRACTION_STATE,
  extractOccurrences
} from "./extraction.mjs";
import { assessCompleteness } from "./completeness.mjs";
import { orderChronologically } from "./document-meta.mjs";
import { discoverLegend, mergeLegends } from "./legend.mjs";
import { findGlobalClearances, findLiftingStatements, indexStatements } from "./lifting.mjs";

export const STRATEGY = {
  /** Choisit `blocks` si le document déclare sa propre légende d'avis. */
  AUTO: "auto",
  /** Lecture en blocs : tableau à colonnes aplati par l'extraction PDF. */
  BLOCKS: "blocks",
  /** Lecture ligne à ligne, pilotée par des motifs. */
  LINES: "lines"
};

export const PIPELINE_VERSION = "0.1.0";

export function extractionKey(documentId, reference) {
  return `extraction:${documentId}:${reference}`;
}

/** Un avis sans numéro n'a pas d'identité suivable : il porte sa propre clé. */
export function observationKey(documentId, index) {
  return `observation:${documentId}:${index}`;
}

/**
 * Choisit la stratégie de lecture. Un document qui déclare sa légende d'avis
 * est un tableau : le lire ligne à ligne ne donnerait rien.
 */
export function resolveStrategy(sources, requested = STRATEGY.AUTO) {
  if (requested !== STRATEGY.AUTO) return requested;

  const hasLegend = sources.some(
    (source) => source.content_available && discoverLegend(source.content).codes.length > 0
  );
  return hasLegend ? STRATEGY.BLOCKS : STRATEGY.LINES;
}

/** Une occurrence lue en blocs devient une prédiction. */
function toBlockPrediction(occurrence, index) {
  const numbered = occurrence.identity_source === IDENTITY_SOURCE.NUMBER_COLUMN;
  const ambiguous = occurrence.extraction_state === BLOCK_STATE.AMBIGUOUS_REFERENCE;

  return {
    key: numbered
      ? extractionKey(occurrence.source_document_id, occurrence.external_reference_normalized)
      : observationKey(occurrence.source_document_id, index),
    kind: numbered ? "extraction" : "observation",
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
    title_raw: occurrence.title_raw,
    description_raw: occurrence.description_raw,
    section_label_raw: occurrence.section_label_raw,
    section_number_raw: occurrence.section_number_raw,
    regulation_article_raw: occurrence.regulation_article_raw,
    opinion_label: occurrence.opinion_label,
    opinion_normalized: occurrence.opinion_normalized,
    opinion_confidence: occurrence.opinion_confidence,
    identity_source: occurrence.identity_source,
    occurrence_count_in_document: occurrence.occurrence_count_in_document ?? 1,
    extraction_state: occurrence.extraction_state
  };
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
    // Preuve de levée, quand le document la porte. Elle n'altère pas `value` :
    // le statut de la source et celui d'un sujet Mdall restent distincts.
    lifting_statement: item.lifting_statement ?? null,
    matched_title: item.matched_title ?? null,
    // L'avis retrouvé par intitulé n'appartient à aucune prédiction numérotée :
    // sans cela, la case du tableau n'aurait rien à afficher.
    matched_opinion_raw: item.occurrence?.opinion_raw ?? null,
    matched_opinion_label: item.occurrence?.opinion_label ?? null,
    title_lookup: item.title_lookup ?? null,
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

  /**
   * @param {object} input
   * @param {Function|null} input.onProgress appelé entre les étapes, et attendu :
   *   un lot de cent vingt rapports bloque la page plusieurs secondes si
   *   personne ne rend la main au navigateur. C'est aussi ce qui permet de
   *   montrer le travail en cours plutôt qu'un écran figé.
   */
  async run({ sources: rawSources, params = {}, onProgress = null }) {
    const report = onProgress
      ? (stage, done = null, total = null, label = null) => onProgress({ stage, done, total, label })
      : () => Promise.resolve();

    await report("chronology");
    // L'ordre chronologique se lit dans les documents. Le déduire du nom de
    // fichier suffirait à tout fausser : « 10_… » précède « 2_… » dans un tri
    // alphabétique, et la continuité en dépend entièrement.
    const chronology =
      params.chronology?.fromDocuments === false
        ? { ordered: rawSources, undatedSourceIds: [] }
        : orderChronologically(rawSources);

    // « Que savait-on à telle date ? » — on ne garde que ce qui était émis.
    const asOf = params.chronology?.asOf ?? null;
    const sources = asOf
      ? chronology.ordered.filter((source) => source.issued_at === null || source.issued_at <= asOf)
      : chronology.ordered;

    const completeness = assessCompleteness(sources);
    await report("completeness", sources.length, sources.length);

    const extractionParams = {
      patterns: params.extraction?.patterns ?? DEFAULT_REFERENCE_PATTERNS,
      lexicon: params.extraction?.lexicon ?? DEFAULT_OPINION_LEXICON
    };

    const strategy = resolveStrategy(sources, params.extraction?.strategy ?? STRATEGY.AUTO);
    const documents = [];
    const predictions = [];
    const skippedSources = [];
    const legends = {};
    const borrowedLegend = [];
    /** Numéros lus mais refusés : deux lignes de tableau fusionnées. */
    const orphanReferences = [];

    // Vocabulaire du lot : une pièce qui ne rappelle pas la légende de son
    // organisme peut s'appuyer sur celle de ses voisines.
    const batchLegend =
      strategy === STRATEGY.BLOCKS
        ? {
            codes: mergeLegends(
              sources
                .filter((source) => source.content_available)
                .map((source) => discoverLegend(source.content))
            )
          }
        : { codes: [] };

    let readCount = 0;
    for (const source of sources) {
      readCount += 1;
      await report("extraction", readCount, sources.length, source.metadata?.filename ?? source.source_id);

      if (!source.content_available) {
        skippedSources.push(source.source_id);
        documents.push({ source, occurrences: [] });
        continue;
      }

      if (strategy === STRATEGY.BLOCKS) {
        const { occurrences, legend, legendSource, orphanReferences: orphans } = extractAvisBlocks(source, {
          legend: batchLegend
        });
        for (const orphan of orphans ?? []) {
          orphanReferences.push({ ...orphan, source_document_id: source.source_id });
        }
        legends[source.source_id] = { codes: legend, source: legendSource };
        if (legendSource === "other_documents") borrowedLegend.push(source.source_id);

        // Toutes les occurrences sont transmises : les numérotées portent la
        // continuité, les autres permettent de retrouver par intitulé un avis
        // qui a perdu son numéro en repassant favorable.
        documents.push({ source, occurrences });
        occurrences.forEach((occurrence, index) => predictions.push(toBlockPrediction(occurrence, index)));
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

    // Déclarations explicites de levée : la preuve que le cadrage exige avant
    // de considérer qu'un avis a été suivi d'effet.
    await report("lifting");
    const liftingStatements = sources.flatMap((source) => findLiftingStatements(source));
    // Un rapport final peut clore l'ensemble du dossier d'une seule phrase.
    const globalClearances = sources.flatMap((source) => findGlobalClearances(source));
    const liftingIndex = indexStatements(liftingStatements);

    for (const statement of liftingStatements) {
      predictions.push({
        key: `lifting:${statement.source_document_id}:${statement.reference_normalized}`,
        kind: "lifting_statement",
        state: "PREDICTED",
        confidence: 0.95,
        value: {
          external_reference_raw: statement.reference_raw,
          external_reference_normalized: statement.reference_normalized,
          declared: "LEVE"
        },
        provenance: {
          source_id: statement.source_document_id,
          page: statement.source_page,
          excerpt: statement.sentence
        }
      });
    }

    await report("continuity");
    const { items: continuityItems, identityDisagreements } = buildContinuity(documents, {
      matchByTitle: params.continuity?.matchByTitle ?? true
    });

    for (const item of continuityItems) {
      // La preuve est versée au dossier ; elle ne change aucun état.
      const evidence = liftingIndex.get(`${item.document_id}:${item.reference}`) ?? null;
      predictions.push(toContinuityPrediction({ ...item, lifting_statement: evidence?.[0] ?? null }));
    }

    await report("notes");

    const notes = [
      `Stratégie de lecture : ${strategy}.`,
      asOf ? `État arrêté au ${asOf} : ${chronology.ordered.length - sources.length} document(s) postérieur(s) écarté(s).` : null,
      completeness.missing.length > 0
        ? `${completeness.missing.length} livrable(s) déclaré(s) par vos documents mais absent(s) du lot.`
        : null,
      chronology.undatedSourceIds.length > 0
        ? `Date d'émission illisible pour : ${chronology.undatedSourceIds.join(", ")} — placés en fin de série.`
        : null,
      borrowedLegend.length > 0
        ? `Légende d'avis empruntée aux autres documents du lot pour : ${borrowedLegend.join(", ")}.`
        : null,
      orphanReferences.length > 0
        ? `${orphanReferences.length} numéro(s) refusé(s) : ils terminaient une ligne de tableau fusionnée avec la précédente, dont l'avis n'appelle pas d'action.`
        : null,
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
      strategy,
      chronology: {
        ordered_source_ids: sources.map((source) => source.source_id),
        undated_source_ids: chronology.undatedSourceIds,
        as_of: asOf,
        excluded_by_date: chronology.ordered.length - sources.length,
        documents: sources.map((source) => ({
          source_id: source.source_id,
          order: source.order ?? null,
          issued_at: source.issued_at ?? null,
          ...(source.meta ?? {})
        }))
      },
      completeness,
      legends,
      identity_disagreements: identityDisagreements,
      lifting_statements: liftingStatements,
      global_clearances: globalClearances,
      orphan_references: orphanReferences,
      experimental_suggestions: [
        ...buildExperimentalSuggestions(continuityItems),
        ...liftingStatements.map((statement) => ({
          reference: statement.reference_normalized,
          document_id: statement.source_document_id,
          suggestion: "LIFTING_DECLARED_IN_SOURCE",
          rationale:
            `${statement.source_document_id} p.${statement.source_page ?? "?"} déclare : « ${statement.sentence} »`,
          applies_mdall_status: false
        }))
      ]
    };
  }
};

export default ctContinuityPipeline;
