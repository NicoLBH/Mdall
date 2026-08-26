/**
 * Comptage des issues et métriques communes à tous les spikes.
 *
 * Trois principes tenus par ce module :
 *  1. une abstention n'est pas une erreur ordinaire : elle est comptée à part ;
 *  2. un dénominateur nul ne produit jamais un score flatteur : il produit `null` ;
 *  3. chaque item évalué laisse une trace individuelle (outcomes), afin que le
 *     rapport puisse montrer les erreurs une par une et pas seulement un score.
 */

import { stableStringify } from "./stable-json.mjs";
import { normalizeConfidence } from "./normalize.mjs";

/** Nature de ce que la ground truth attend pour une clé donnée. */
export const EXPECTATION = {
  /** Une valeur précise doit être produite. */
  PRESENT: "PRESENT",
  /** Rien ne doit être affirmé (le cas n'existe pas dans la source). */
  ABSENT: "ABSENT",
  /** Le cas est réellement ambigu : la bonne réponse est de s'abstenir. */
  ABSTENTION: "ABSTENTION"
};

export const OUTCOME = {
  TRUE_POSITIVE: "TRUE_POSITIVE",
  FALSE_POSITIVE: "FALSE_POSITIVE",
  FALSE_NEGATIVE: "FALSE_NEGATIVE",
  TRUE_NEGATIVE: "TRUE_NEGATIVE"
};

export const REASON = {
  MATCHED: "MATCHED",
  MISSED: "MISSED",
  WRONG_VALUE: "WRONG_VALUE",
  SPURIOUS: "SPURIOUS",
  DUPLICATE_PREDICTION: "DUPLICATE_PREDICTION",
  ABSTAINED_ON_EXPECTED: "ABSTAINED_ON_EXPECTED",
  ABSTAINED_AS_EXPECTED: "ABSTAINED_AS_EXPECTED",
  ABSTAINED_ON_ABSENCE: "ABSTAINED_ON_ABSENCE",
  ABSTAINED_WITHOUT_GROUND_TRUTH: "ABSTAINED_WITHOUT_GROUND_TRUTH",
  CORRECT_ABSENCE: "CORRECT_ABSENCE",
  FORCED_DECISION: "FORCED_DECISION",
  NO_OUTPUT_INSTEAD_OF_ABSTENTION: "NO_OUTPUT_INSTEAD_OF_ABSTENTION"
};

/** Un état de prédiction qui n'affirme rien. AMBIGUOUS en fait partie. */
const NON_ASSERTIVE_STATES = new Set(["ABSTAINED", "AMBIGUOUS", "UNRESOLVED", "NOT_DECIDED"]);

export function isAbstentionByDefault(prediction) {
  if (!prediction) return false;
  if (prediction.abstained === true) return true;
  return NON_ASSERTIVE_STATES.has(String(prediction.state || "").toUpperCase());
}

export function defaultKeyOf(item) {
  const key = item?.key ?? item?.id;
  if (key === undefined || key === null || key === "") {
    throw new Error(`metrics: item sans clé exploitable (${stableStringify(item)})`);
  }
  return String(key);
}

/** Comparaison structurelle par défaut sur le champ `value`. */
export function defaultIsMatch(expectedItem, predictedItem) {
  return stableStringify(expectedItem?.value ?? expectedItem?.expected ?? null)
    === stableStringify(predictedItem?.value ?? null);
}

export function expectationOf(item) {
  const raw = String(item?.expectation ?? item?.label ?? EXPECTATION.PRESENT).toUpperCase();
  if (raw === "POSITIVE") return EXPECTATION.PRESENT;
  if (raw === "NEGATIVE") return EXPECTATION.ABSENT;
  if (raw in EXPECTATION) return raw;
  throw new Error(`metrics: expectation inconnue "${raw}"`);
}

export function createEmptyCounts() {
  return {
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 0,
    trueNegatives: 0,
    abstentions: 0,
    correctAbstentions: 0,
    incorrectAbstentions: 0,
    unlabelledAbstentions: 0
  };
}

function indexByKey(items, keyOf, label) {
  const index = new Map();
  const duplicates = [];
  for (const item of items) {
    const key = keyOf(item);
    if (index.has(key)) {
      duplicates.push({ key, item });
      continue;
    }
    index.set(key, item);
  }
  if (label === "ground truth" && duplicates.length > 0) {
    throw new Error(
      `metrics: clés dupliquées dans la ground truth (${duplicates.map((entry) => entry.key).join(", ")})`
    );
  }
  return { index, duplicates };
}

/**
 * Confronte prédictions et ground truth, clé par clé.
 *
 * @returns {{counts: object, outcomes: object[]}}
 */
export function compareItems({
  expected = [],
  predicted = [],
  keyOf = defaultKeyOf,
  isMatch = defaultIsMatch,
  isAbstention = isAbstentionByDefault
} = {}) {
  const counts = createEmptyCounts();
  const outcomes = [];

  const expectedIndex = indexByKey(expected, keyOf, "ground truth").index;
  const { index: predictedIndex, duplicates } = indexByKey(predicted, keyOf, "prédictions");

  const push = (entry) => {
    outcomes.push({
      confidence: normalizeConfidence(entry.predicted?.confidence),
      expected: entry.expected ?? null,
      predicted: entry.predicted ?? null,
      ...entry
    });
  };

  for (const [key, expectedItem] of expectedIndex) {
    const predictedItem = predictedIndex.get(key) ?? null;
    const expectation = expectationOf(expectedItem);
    const abstained = predictedItem ? isAbstention(predictedItem) : false;

    if (abstained) counts.abstentions += 1;

    if (expectation === EXPECTATION.PRESENT) {
      if (!predictedItem) {
        counts.falseNegatives += 1;
        push({ key, outcome: OUTCOME.FALSE_NEGATIVE, reason: REASON.MISSED, expected: expectedItem, predicted: null });
        continue;
      }
      if (abstained) {
        counts.falseNegatives += 1;
        counts.incorrectAbstentions += 1;
        push({ key, outcome: OUTCOME.FALSE_NEGATIVE, reason: REASON.ABSTAINED_ON_EXPECTED, expected: expectedItem, predicted: predictedItem });
        continue;
      }
      if (isMatch(expectedItem, predictedItem)) {
        counts.truePositives += 1;
        push({ key, outcome: OUTCOME.TRUE_POSITIVE, reason: REASON.MATCHED, expected: expectedItem, predicted: predictedItem });
        continue;
      }
      counts.falsePositives += 1;
      counts.falseNegatives += 1;
      push({ key, outcome: OUTCOME.FALSE_POSITIVE, reason: REASON.WRONG_VALUE, expected: expectedItem, predicted: predictedItem });
      continue;
    }

    if (expectation === EXPECTATION.ABSENT) {
      if (!predictedItem) {
        counts.trueNegatives += 1;
        push({ key, outcome: OUTCOME.TRUE_NEGATIVE, reason: REASON.CORRECT_ABSENCE, expected: expectedItem, predicted: null });
        continue;
      }
      if (abstained) {
        counts.trueNegatives += 1;
        counts.correctAbstentions += 1;
        push({ key, outcome: OUTCOME.TRUE_NEGATIVE, reason: REASON.ABSTAINED_ON_ABSENCE, expected: expectedItem, predicted: predictedItem });
        continue;
      }
      counts.falsePositives += 1;
      push({ key, outcome: OUTCOME.FALSE_POSITIVE, reason: REASON.SPURIOUS, expected: expectedItem, predicted: predictedItem });
      continue;
    }

    // EXPECTATION.ABSTENTION : le cas est réellement ambigu.
    if (!predictedItem) {
      counts.trueNegatives += 1;
      push({
        key,
        outcome: OUTCOME.TRUE_NEGATIVE,
        reason: REASON.NO_OUTPUT_INSTEAD_OF_ABSTENTION,
        expected: expectedItem,
        predicted: null
      });
      continue;
    }
    if (abstained) {
      counts.trueNegatives += 1;
      counts.correctAbstentions += 1;
      push({ key, outcome: OUTCOME.TRUE_NEGATIVE, reason: REASON.ABSTAINED_AS_EXPECTED, expected: expectedItem, predicted: predictedItem });
      continue;
    }
    counts.falsePositives += 1;
    push({ key, outcome: OUTCOME.FALSE_POSITIVE, reason: REASON.FORCED_DECISION, expected: expectedItem, predicted: predictedItem });
  }

  for (const [key, predictedItem] of predictedIndex) {
    if (expectedIndex.has(key)) continue;
    if (isAbstention(predictedItem)) {
      counts.abstentions += 1;
      counts.unlabelledAbstentions += 1;
      push({
        key,
        outcome: OUTCOME.TRUE_NEGATIVE,
        reason: REASON.ABSTAINED_WITHOUT_GROUND_TRUTH,
        expected: null,
        predicted: predictedItem
      });
      continue;
    }
    counts.falsePositives += 1;
    push({ key, outcome: OUTCOME.FALSE_POSITIVE, reason: REASON.SPURIOUS, expected: null, predicted: predictedItem });
  }

  for (const duplicate of duplicates) {
    counts.falsePositives += 1;
    push({
      key: duplicate.key,
      outcome: OUTCOME.FALSE_POSITIVE,
      reason: REASON.DUPLICATE_PREDICTION,
      expected: expectedIndex.get(duplicate.key) ?? null,
      predicted: duplicate.item
    });
  }

  return { counts, outcomes };
}

/**
 * Ratio explicite : `value` vaut `null` quand le dénominateur est nul.
 * Le rapport affiche alors « n/a » plutôt qu'un score inventé.
 */
export function ratio(numerator, denominator) {
  return {
    value: denominator === 0 ? null : numerator / denominator,
    numerator,
    denominator
  };
}

export function precision(counts) {
  return ratio(counts.truePositives, counts.truePositives + counts.falsePositives);
}

export function recall(counts) {
  return ratio(counts.truePositives, counts.truePositives + counts.falseNegatives);
}

export function f1(counts) {
  const p = precision(counts);
  const r = recall(counts);
  if (p.value === null || r.value === null) return { value: null, numerator: 0, denominator: 0 };
  const denominator = p.value + r.value;
  if (denominator === 0) return { value: 0, numerator: 0, denominator: 1 };
  return { value: (2 * p.value * r.value) / denominator, numerator: 2 * p.value * r.value, denominator };
}

export function falsePositiveRate(counts) {
  const total = counts.truePositives + counts.falsePositives;
  return ratio(counts.falsePositives, total);
}

/** Parmi les abstentions labellisées, combien étaient raisonnables ? */
export function abstentionQuality(counts) {
  return ratio(counts.correctAbstentions, counts.correctAbstentions + counts.incorrectAbstentions);
}

/**
 * Exactitude de provenance sur les prédictions affirmées et retenues.
 * `isProvenanceCorrect(outcome)` doit renvoyer true/false/null (null = non vérifiable).
 */
export function provenanceAccuracy(outcomes, isProvenanceCorrect) {
  let correct = 0;
  let checked = 0;
  const failures = [];
  for (const outcome of outcomes) {
    if (!outcome.predicted) continue;
    if (outcome.reason === REASON.ABSTAINED_ON_EXPECTED) continue;
    const verdict = isProvenanceCorrect(outcome);
    if (verdict === null || verdict === undefined) continue;
    checked += 1;
    if (verdict) correct += 1;
    else failures.push(outcome.key);
  }
  return { ...ratio(correct, checked), failures };
}

/** Métriques standard produites pour tous les spikes. */
export function standardMetrics(counts) {
  return [
    { id: "precision", label: "Precision", kind: "ratio", ...precision(counts) },
    { id: "recall", label: "Recall", kind: "ratio", ...recall(counts) },
    // Le numérateur et le dénominateur de F1 sont des artefacts de calcul :
    // les afficher n'apprendrait rien, la valeur suffit.
    { id: "f1", label: "F1", kind: "score", ...f1(counts) },
    { id: "false_positive_rate", label: "False positive rate", kind: "ratio", ...falsePositiveRate(counts) },
    { id: "abstention_quality", label: "Abstention quality", kind: "ratio", ...abstentionQuality(counts) }
  ];
}
