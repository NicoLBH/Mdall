import test from "node:test";
import assert from "node:assert/strict";

import {
  EXPECTATION,
  OUTCOME,
  REASON,
  abstentionQuality,
  compareItems,
  createEmptyCounts,
  expectationOf,
  precision,
  provenanceAccuracy,
  ratio,
  recall,
  standardMetrics
} from "./metrics.mjs";

function counts(overrides) {
  return { ...createEmptyCounts(), ...overrides };
}

test("precision et recall calculent bien TP / (TP+FP) et TP / (TP+FN)", () => {
  const value = counts({ truePositives: 6, falsePositives: 2, falseNegatives: 3 });

  assert.equal(precision(value).value, 6 / 8);
  assert.deepEqual(
    { numerator: precision(value).numerator, denominator: precision(value).denominator },
    { numerator: 6, denominator: 8 }
  );
  assert.equal(recall(value).value, 6 / 9);
});

test("zéro prédiction : precision n/a et recall à 0, jamais un score flatteur", () => {
  const { counts: result } = compareItems({
    expected: [
      { key: "a", kind: "k", expectation: EXPECTATION.PRESENT, value: { x: 1 } },
      { key: "b", kind: "k", expectation: EXPECTATION.PRESENT, value: { x: 2 } }
    ],
    predicted: []
  });

  assert.equal(result.falseNegatives, 2);
  assert.equal(precision(result).value, null, "aucune affirmation ne doit pas produire 1.0");
  assert.equal(precision(result).denominator, 0);
  assert.equal(recall(result).value, 0);
});

test("zéro ground truth positive : recall n/a et les prédictions restent des faux positifs", () => {
  const { counts: result } = compareItems({
    expected: [{ key: "a", kind: "k", expectation: EXPECTATION.ABSENT }],
    predicted: [{ key: "a", kind: "k", state: "PREDICTED", value: { x: 1 } }]
  });

  assert.equal(result.falsePositives, 1);
  assert.equal(result.truePositives, 0);
  assert.equal(recall(result).value, null, "sans positif attendu, le recall n'est pas calculable");
  assert.equal(precision(result).value, 0);
});

test("ratio expose son dénominateur et renvoie null quand il est nul", () => {
  assert.deepEqual(ratio(0, 0), { value: null, numerator: 0, denominator: 0 });
  assert.deepEqual(ratio(1, 4), { value: 0.25, numerator: 1, denominator: 4 });
});

test("valeur différente sur une clé attendue : compté FP et FN, pas seulement FP", () => {
  const { counts: result, outcomes } = compareItems({
    expected: [{ key: "a", kind: "k", value: { statut: "défavorable" } }],
    predicted: [{ key: "a", kind: "k", state: "PREDICTED", value: { statut: "favorable" } }]
  });

  assert.equal(result.falsePositives, 1);
  assert.equal(result.falseNegatives, 1);
  assert.equal(outcomes[0].reason, REASON.WRONG_VALUE);
});

test("prédiction sans ground truth : faux positif isolé", () => {
  const { counts: result, outcomes } = compareItems({
    expected: [],
    predicted: [{ key: "z", kind: "k", state: "PREDICTED", value: { x: 1 } }]
  });

  assert.equal(result.falsePositives, 1);
  assert.equal(outcomes[0].reason, REASON.SPURIOUS);
});

test("abstention sur un cas réellement ambigu : correcte, comptée à part", () => {
  const { counts: result, outcomes } = compareItems({
    expected: [{ key: "a", kind: "k", expectation: EXPECTATION.ABSTENTION }],
    predicted: [{ key: "a", kind: "k", state: "AMBIGUOUS", value: null }]
  });

  assert.equal(result.correctAbstentions, 1);
  assert.equal(result.incorrectAbstentions, 0);
  assert.equal(result.falsePositives, 0);
  assert.equal(outcomes[0].outcome, OUTCOME.TRUE_NEGATIVE);
  assert.equal(abstentionQuality(result).value, 1);
});

test("abstention sur un cas clair : faux négatif ET abstention incorrecte", () => {
  const { counts: result, outcomes } = compareItems({
    expected: [{ key: "a", kind: "k", value: { statut: "favorable" } }],
    predicted: [{ key: "a", kind: "k", state: "ABSTAINED" }]
  });

  assert.equal(result.falseNegatives, 1);
  assert.equal(result.incorrectAbstentions, 1);
  assert.equal(outcomes[0].reason, REASON.ABSTAINED_ON_EXPECTED);
  assert.equal(abstentionQuality(result).value, 0);
});

test("trancher un cas ambigu est un faux positif de décision forcée", () => {
  const { counts: result, outcomes } = compareItems({
    expected: [{ key: "a", kind: "k", expectation: EXPECTATION.ABSTENTION }],
    predicted: [{ key: "a", kind: "k", state: "PREDICTED", value: { statut: "favorable" }, confidence: 0.9 }]
  });

  assert.equal(result.falsePositives, 1);
  assert.equal(outcomes[0].reason, REASON.FORCED_DECISION);
});

test("absence attendue et silence du pipeline : vrai négatif", () => {
  const { counts: result, outcomes } = compareItems({
    expected: [{ key: "a", kind: "k", expectation: EXPECTATION.ABSENT }],
    predicted: []
  });

  assert.equal(result.trueNegatives, 1);
  assert.equal(result.falsePositives, 0);
  assert.equal(outcomes[0].reason, REASON.CORRECT_ABSENCE);
});

test("prédictions dupliquées sur une même clé : la seconde est un faux positif signalé", () => {
  const { counts: result, outcomes } = compareItems({
    expected: [{ key: "a", kind: "k", value: { x: 1 } }],
    predicted: [
      { key: "a", kind: "k", state: "PREDICTED", value: { x: 1 } },
      { key: "a", kind: "k", state: "PREDICTED", value: { x: 2 } }
    ]
  });

  assert.equal(result.truePositives, 1);
  assert.equal(result.falsePositives, 1);
  assert.ok(outcomes.some((outcome) => outcome.reason === REASON.DUPLICATE_PREDICTION));
});

test("clés dupliquées dans la ground truth : erreur explicite", () => {
  assert.throws(
    () =>
      compareItems({
        expected: [
          { key: "a", kind: "k", value: { x: 1 } },
          { key: "a", kind: "k", value: { x: 2 } }
        ],
        predicted: []
      }),
    /clés dupliquées dans la ground truth/
  );
});

test("expectationOf accepte les alias POSITIVE/NEGATIVE et refuse l'inconnu", () => {
  assert.equal(expectationOf({ label: "POSITIVE" }), EXPECTATION.PRESENT);
  assert.equal(expectationOf({ label: "NEGATIVE" }), EXPECTATION.ABSENT);
  assert.equal(expectationOf({}), EXPECTATION.PRESENT);
  assert.throws(() => expectationOf({ expectation: "PEUT-ETRE" }), /expectation inconnue/);
});

test("provenanceAccuracy ignore le non vérifiable et liste les échecs", () => {
  const outcomes = [
    { key: "a", predicted: { provenance: { excerpt: "vrai" } }, reason: REASON.MATCHED },
    { key: "b", predicted: { provenance: { excerpt: "faux" } }, reason: REASON.MATCHED },
    { key: "c", predicted: { provenance: null }, reason: REASON.MATCHED },
    { key: "d", predicted: null, reason: REASON.MISSED }
  ];

  const result = provenanceAccuracy(outcomes, (outcome) => {
    if (!outcome.predicted?.provenance) return null;
    return outcome.predicted.provenance.excerpt === "vrai";
  });

  assert.deepEqual({ numerator: result.numerator, denominator: result.denominator }, { numerator: 1, denominator: 2 });
  assert.deepEqual(result.failures, ["b"]);
});

test("standardMetrics expose les cinq métriques communes", () => {
  const ids = standardMetrics(createEmptyCounts()).map((metric) => metric.id);
  assert.deepEqual(ids, ["precision", "recall", "f1", "false_positive_rate", "abstention_quality"]);
});
