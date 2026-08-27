/**
 * Spike 1 — reconstruction de la continuité d'un avis entre rapports successifs.
 *
 * Priorité de rapprochement, dans cet ordre et pas un autre :
 *  1. référence externe brute identique          -> EXACT_RAW
 *  2. référence normalisable sans ambiguïté      -> NORMALIZED
 *  3. sinon                                       -> AMBIGUOUS (abstention)
 *
 * Aucun rapprochement sémantique entre deux références différentes : cette
 * première version mesure la valeur du cas le plus déterministe.
 *
 * Règle non négociable : NOT_FOUND ne signifie jamais CLOSED.
 */

import { normalizeTextKey } from "../lib/normalize.mjs";
import { EXTRACTION_STATE } from "./extraction.mjs";

export const CONTINUITY_STATE = {
  NEW: "NEW",
  /** Rapprochement par référence externe : l'identité que le métier a fixée. */
  MATCHED: "MATCHED",
  /**
   * Rapprochement par intitulé, quand la référence a disparu.
   *
   * Un avis qui repasse en favorable perd son numéro : l'organisme ne numérote
   * que ce qui appelle une action. L'intitulé, lui, est une entrée de son
   * référentiel, reprise à l'identique d'un rapport à l'autre — c'est une
   * seconde identité fournie par le métier, pas un rapprochement sémantique.
   *
   * Jamais confondu avec MATCHED : l'état dit toujours par quoi le
   * rapprochement a été obtenu.
   */
  MATCHED_BY_TITLE: "MATCHED_BY_TITLE",
  NOT_FOUND: "NOT_FOUND",
  AMBIGUOUS: "AMBIGUOUS"
};

export const OPINION_CHANGE = {
  UNCHANGED: "UNCHANGED",
  CHANGED: "CHANGED",
  UNKNOWN: "UNKNOWN"
};

export const MATCH_METHOD = {
  EXACT_RAW: "EXACT_RAW",
  NORMALIZED: "NORMALIZED",
  TITLE_EXACT: "TITLE_EXACT",
  NONE: "NONE"
};

export const CONTINUITY_CONFIDENCE = {
  MATCHED_KNOWN_OPINIONS: 0.95,
  MATCHED_UNKNOWN_OPINION: 0.7,
  NEW: 0.9,
  /**
   * Un intitulé identique est une identité moins forte qu'un numéro : rien ne
   * garantit que l'organisme ne réemploie pas le même libellé ailleurs.
   */
  MATCHED_BY_TITLE: 0.75,
  /** L'absence observée dépend du rappel de l'extraction : elle vaut moins qu'une présence lue. */
  NOT_FOUND: 0.7
};

/**
 * Compare deux avis sources.
 * Deux avis reconnus se comparent par identifiant ; sinon on ne compare que les
 * graphies, et à défaut on répond UNKNOWN plutôt que CHANGED.
 */
export function compareOpinions(previous, current) {
  if (previous.opinion_normalized && current.opinion_normalized) {
    return previous.opinion_normalized === current.opinion_normalized
      ? OPINION_CHANGE.UNCHANGED
      : OPINION_CHANGE.CHANGED;
  }

  const previousRaw = normalizeTextKey(previous.opinion_raw ?? "");
  const currentRaw = normalizeTextKey(current.opinion_raw ?? "");
  if (previousRaw !== "" && previousRaw === currentRaw) return OPINION_CHANGE.UNCHANGED;

  return OPINION_CHANGE.UNKNOWN;
}

function matchMethodBetween(previous, current) {
  if (previous.external_reference_raw === current.external_reference_raw) return MATCH_METHOD.EXACT_RAW;
  return MATCH_METHOD.NORMALIZED;
}

/** Index des occurrences d'un document par intitulé normalisé. */
function buildTitleIndex(occurrences) {
  const index = new Map();
  for (const occurrence of occurrences) {
    const key = normalizeTextKey(occurrence.title_raw ?? "");
    if (key === "") continue;
    index.set(key, [...(index.get(key) ?? []), occurrence]);
  }
  return index;
}

/**
 * Cherche, dans un document, une occurrence portant le même intitulé.
 *
 * Trois issues, et elles ne disent pas la même chose :
 *  - une seule occurrence sans numéro : rapprochement par intitulé ;
 *  - une occurrence portant un AUTRE numéro : les deux identités se
 *    contredisent, on ne tranche pas — et on l'enregistre, car c'est ce
 *    désaccord qui mesure la fiabilité du rapprochement par intitulé ;
 *  - plusieurs candidats : ambiguïté.
 */
function findByTitle(titleIndex, occurrence, reference) {
  const key = normalizeTextKey(occurrence?.title_raw ?? "");
  if (key === "") return { outcome: "NONE" };

  const candidates = titleIndex.get(key) ?? [];
  if (candidates.length === 0) return { outcome: "NONE" };
  if (candidates.length > 1) return { outcome: "AMBIGUOUS", candidates };

  const [candidate] = candidates;
  if (candidate.external_reference_normalized && candidate.external_reference_normalized !== reference) {
    return { outcome: "CONTRADICTS_NUMBER", candidate };
  }
  return { outcome: "MATCHED", candidate };
}

function isAmbiguous(occurrences) {
  return occurrences.length > 1 || occurrences.some((occurrence) => occurrence.extraction_state === EXTRACTION_STATE.AMBIGUOUS_REFERENCE);
}

/**
 * Reconstruit, pour chaque référence, son état document par document.
 *
 * @param {{source: object, occurrences: object[]}[]} documents dans l'ordre chronologique
 * @returns {object[]} items de continuité
 */
export function buildContinuity(documents, { matchByTitle = true } = {}) {
  const byDocument = documents.map(({ source, occurrences }) => {
    const index = new Map();
    for (const occurrence of occurrences) {
      const key = occurrence.external_reference_normalized;
      if (!key) continue;
      index.set(key, [...(index.get(key) ?? []), occurrence]);
    }
    // L'index par intitulé couvre TOUTES les occurrences, numérotées ou non :
    // c'est justement une occurrence sans numéro que l'on cherche.
    return { source, index, titleIndex: buildTitleIndex(occurrences) };
  });

  /** Désaccords entre les deux identités : ils mesurent la seconde. */
  const identityDisagreements = [];

  const references = new Set(byDocument.flatMap((document) => [...document.index.keys()]));
  const items = [];

  for (const reference of [...references].sort()) {
    /** Dernière occurrence non ambiguë rencontrée, pour comparer les avis. */
    let lastResolved = null;
    /**
     * Dernière occurrence rencontrée, ambiguë ou non : elle sert de preuve
     * pour un NOT_FOUND ultérieur. Une absence doit pouvoir montrer où
     * l'information avait été lue la dernière fois, même si cette lecture
     * était ambiguë.
     */
    let lastSeen = null;
    /** Dernier document où la référence a été vue, ambiguë ou non. */
    let lastSeenDocumentId = null;

    for (const { source, index, titleIndex } of byDocument) {
      const occurrences = index.get(reference) ?? [];

      if (occurrences.length === 0) {
        if (lastSeenDocumentId === null) continue;

        const byTitle = matchByTitle ? findByTitle(titleIndex, lastSeen, reference) : { outcome: "NONE" };

        if (byTitle.outcome === "CONTRADICTS_NUMBER") {
          identityDisagreements.push({
            reference,
            document_id: source.source_id,
            other_reference: byTitle.candidate.external_reference_raw,
            title: lastSeen?.title_raw ?? null
          });
        }

        if (byTitle.outcome === "MATCHED") {
          const occurrence = byTitle.candidate;
          const opinionChange = lastResolved ? compareOpinions(lastResolved, occurrence) : OPINION_CHANGE.UNKNOWN;

          items.push({
            reference,
            document_id: source.source_id,
            state: CONTINUITY_STATE.MATCHED_BY_TITLE,
            opinion_change: opinionChange,
            previous_document_id: lastSeenDocumentId,
            match_method: MATCH_METHOD.TITLE_EXACT,
            matched_title: occurrence.title_raw,
            confidence: CONTINUITY_CONFIDENCE.MATCHED_BY_TITLE,
            occurrence,
            previous_occurrence: lastResolved,
            last_seen_occurrence: lastSeen,
            description_changed: lastResolved
              ? normalizeTextKey(lastResolved.description_raw ?? "") !== normalizeTextKey(occurrence.description_raw ?? "")
              : null,
            derived_from_absence: false
          });

          lastResolved = occurrence;
          lastSeen = occurrence;
          lastSeenDocumentId = source.source_id;
          continue;
        }

        items.push({
          reference,
          document_id: source.source_id,
          state: CONTINUITY_STATE.NOT_FOUND,
          opinion_change: null,
          previous_document_id: lastSeenDocumentId,
          match_method: MATCH_METHOD.NONE,
          title_lookup: byTitle.outcome,
          confidence: CONTINUITY_CONFIDENCE.NOT_FOUND,
          occurrence: null,
          previous_occurrence: lastResolved,
          last_seen_occurrence: lastSeen,
          description_changed: null,
          derived_from_absence: true
        });
        continue;
      }

      if (isAmbiguous(occurrences)) {
        items.push({
          reference,
          document_id: source.source_id,
          state: CONTINUITY_STATE.AMBIGUOUS,
          opinion_change: null,
          previous_document_id: lastSeenDocumentId,
          match_method: MATCH_METHOD.NONE,
          confidence: null,
          occurrence: occurrences[0],
          candidates: occurrences,
          previous_occurrence: lastResolved,
          description_changed: null,
          derived_from_absence: false
        });
        lastSeen = occurrences[0];
        lastSeenDocumentId = source.source_id;
        continue;
      }

      const occurrence = occurrences[0];

      if (lastSeenDocumentId === null) {
        items.push({
          reference,
          document_id: source.source_id,
          state: CONTINUITY_STATE.NEW,
          opinion_change: null,
          previous_document_id: null,
          match_method: MATCH_METHOD.NONE,
          confidence: CONTINUITY_CONFIDENCE.NEW,
          occurrence,
          previous_occurrence: null,
          description_changed: null,
          derived_from_absence: false
        });
      } else {
        const opinionChange = lastResolved
          ? compareOpinions(lastResolved, occurrence)
          : OPINION_CHANGE.UNKNOWN;

        items.push({
          reference,
          document_id: source.source_id,
          state: CONTINUITY_STATE.MATCHED,
          opinion_change: opinionChange,
          previous_document_id: lastSeenDocumentId,
          match_method: lastResolved ? matchMethodBetween(lastResolved, occurrence) : MATCH_METHOD.NORMALIZED,
          confidence:
            opinionChange === OPINION_CHANGE.UNKNOWN
              ? CONTINUITY_CONFIDENCE.MATCHED_UNKNOWN_OPINION
              : CONTINUITY_CONFIDENCE.MATCHED_KNOWN_OPINIONS,
          occurrence,
          previous_occurrence: lastResolved,
          description_changed: lastResolved
            ? normalizeTextKey(lastResolved.description_raw ?? "") !== normalizeTextKey(occurrence.description_raw ?? "")
            : null,
          derived_from_absence: false
        });
      }

      lastResolved = occurrence;
      lastSeen = occurrence;
      lastSeenDocumentId = source.source_id;
    }
  }

  return { items, identityDisagreements };
}

/**
 * Suggestions expérimentales, tenues À L'ÉCART des prédictions.
 *
 * Le statut exprimé par le bureau de contrôle et le statut d'un sujet Mdall
 * sont deux informations différentes (§11). Le spike ne produit donc aucun
 * statut de sujet : au mieux une invitation à regarder, jamais appliquée.
 */
export function buildExperimentalSuggestions(items) {
  return items
    .filter((item) => item.state === CONTINUITY_STATE.MATCHED && item.opinion_change === OPINION_CHANGE.CHANGED)
    .map((item) => ({
      reference: item.reference,
      document_id: item.document_id,
      suggestion: "HUMAN_REVIEW_SUGGESTED",
      rationale:
        `l'avis source est passé de "${item.previous_occurrence?.opinion_raw ?? "?"}" ` +
        `à "${item.occurrence?.opinion_raw ?? "?"}" entre ${item.previous_document_id} et ${item.document_id}`,
      applies_mdall_status: false
    }));
}
