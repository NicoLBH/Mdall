/**
 * Spike 1 — métriques propres à CT Continuity.
 *
 * Elles complètent les métriques communes du harness sans les remplacer.
 * Deux d'entre elles sont des compteurs d'erreurs interdites : `false_merge_count`
 * et `false_closure_count` doivent valoir 0, et leur valeur brute est affichée
 * dans le rapport même quand les taux globaux sont bons.
 */

import { OUTCOME, REASON, ratio } from "../lib/metrics.mjs";
import { normalizeTextKey } from "../lib/normalize.mjs";
import { CONTINUITY_STATE } from "./continuity.mjs";

function kindOf(outcome) {
  return outcome.expected?.kind ?? outcome.predicted?.kind ?? null;
}

/** Recompose TP/FP/FN pour un `kind` donné à partir des issues individuelles. */
export function countsForKind(outcomes, kind) {
  const counts = { truePositives: 0, falsePositives: 0, falseNegatives: 0 };

  for (const outcome of outcomes) {
    if (kindOf(outcome) !== kind) continue;

    if (outcome.reason === REASON.WRONG_VALUE) {
      counts.falsePositives += 1;
      counts.falseNegatives += 1;
      continue;
    }
    if (outcome.outcome === OUTCOME.TRUE_POSITIVE) counts.truePositives += 1;
    else if (outcome.outcome === OUTCOME.FALSE_POSITIVE) counts.falsePositives += 1;
    else if (outcome.outcome === OUTCOME.FALSE_NEGATIVE) counts.falseNegatives += 1;
  }

  return counts;
}

function comparedExtractionOutcomes(outcomes) {
  return outcomes.filter(
    (outcome) => kindOf(outcome) === "extraction" && outcome.expected?.value && outcome.predicted?.value
  );
}

function fieldFidelity(outcomes, field) {
  const compared = comparedExtractionOutcomes(outcomes);
  const correct = compared.filter(
    (outcome) => outcome.expected.value[field] === outcome.predicted.value[field]
  ).length;
  return ratio(correct, compared.length);
}

/**
 * Un faux merge : le moteur affirme MATCHED là où la ground truth dit autre chose.
 * C'est l'erreur critique du spike — rapprocher deux avis qui n'en sont pas un seul.
 */
export function falseMerges(outcomes) {
  return outcomes.filter(
    (outcome) =>
      kindOf(outcome) === "continuity" &&
      outcome.predicted?.value?.state === CONTINUITY_STATE.MATCHED &&
      outcome.expected?.value?.state !== undefined &&
      outcome.expected.value.state !== CONTINUITY_STATE.MATCHED
  );
}

/**
 * Une fausse clôture : une conclusion positive tirée d'une absence.
 * Doit valoir 0 par construction — la métrique existe pour le prouver à chaque run.
 */
export function falseClosures(predictions) {
  const forbidden = new Set(["CLOSED", "LEVE", "LEVEE", "RESOLVED", "FERME"]);

  return predictions.filter((prediction) => {
    const state = prediction.value?.state ?? null;
    if (state !== null && forbidden.has(String(state).toUpperCase())) return true;
    if (prediction.derived_from_absence !== true) return false;
    return state !== null && state !== CONTINUITY_STATE.NOT_FOUND;
  });
}

/**
 * Vérifie qu'une provenance annoncée correspond réellement à la source citée.
 * Retourne true/false, ou null quand il n'y a rien à vérifier.
 */
export function createProvenanceChecker(sources) {
  const bySourceId = new Map(sources.map((source) => [source.source_id, source]));

  return (outcome) => {
    const prediction = outcome.predicted;
    if (!prediction) return null;

    const provenance = prediction.provenance ?? null;
    if (!provenance) return false;

    const source = bySourceId.get(provenance.source_id);
    if (!source) return false;
    if (!source.content_available) return null;
    if (!provenance.excerpt) return false;

    const excerpt = normalizeTextKey(provenance.excerpt);
    if (!normalizeTextKey(source.content).includes(excerpt)) return false;

    const pages = Array.isArray(source.pages) ? source.pages : null;
    if (!pages) return true;

    // La page est connaissable : ne pas la renseigner est une provenance incomplète.
    if (provenance.page === null || provenance.page === undefined) return false;

    const page = pages.find((entry) => entry.page === provenance.page);
    return Boolean(page && normalizeTextKey(page.text).includes(excerpt));
  };
}

/**
 * Construit les métriques du spike, à passer en `extraMetrics` au harness.
 * @param {{sources: object[]}} context du cas courant
 */
export function buildCtMetrics({ sources }) {
  const isProvenanceCorrect = createProvenanceChecker(sources);

  const perKind = (kind, statistic) => ({ outcomes }) => {
    const counts = countsForKind(outcomes, kind);
    return statistic === "precision"
      ? ratio(counts.truePositives, counts.truePositives + counts.falsePositives)
      : ratio(counts.truePositives, counts.truePositives + counts.falseNegatives);
  };

  return [
    {
      id: "extraction_precision",
      label: "Extraction precision",
      compute: perKind("extraction", "precision")
    },
    {
      id: "extraction_recall",
      label: "Extraction recall",
      compute: perKind("extraction", "recall")
    },
    {
      id: "reference_exact_match_rate",
      label: "Reference exact match rate",
      compute: ({ outcomes }) => ({
        ...fieldFidelity(outcomes, "external_reference_raw"),
        note: "référence brute identique à celle labellisée"
      })
    },
    {
      id: "opinion_source_fidelity",
      label: "Opinion / source fidelity",
      compute: ({ outcomes }) => ({
        ...fieldFidelity(outcomes, "opinion_raw"),
        note: "avis restitué exactement tel qu'écrit dans la source"
      })
    },
    {
      id: "continuity_precision",
      label: "Continuity precision",
      compute: perKind("continuity", "precision")
    },
    {
      id: "continuity_recall",
      label: "Continuity recall",
      compute: perKind("continuity", "recall")
    },
    {
      id: "false_merge_count",
      label: "False merge count",
      kind: "count",
      compute: ({ outcomes }) => {
        const merges = falseMerges(outcomes);
        return {
          value: merges.length,
          note: merges.length === 0 ? "aucun" : `critique : ${merges.map((outcome) => outcome.key).join(", ")}`
        };
      }
    },
    {
      id: "false_closure_count",
      label: "False closure count",
      kind: "count",
      compute: ({ predicted }) => {
        const closures = falseClosures(predicted);
        return {
          value: closures.length,
          note:
            closures.length === 0
              ? "aucune clôture déduite d'une absence"
              : `critique : ${closures.map((prediction) => prediction.key).join(", ")}`
        };
      }
    },
    {
      id: "provenance_accuracy",
      label: "Provenance accuracy",
      compute: ({ outcomes }) => {
        let correct = 0;
        let checked = 0;
        const failures = [];

        for (const outcome of outcomes) {
          const verdict = isProvenanceCorrect(outcome);
          if (verdict === null) continue;
          checked += 1;
          if (verdict) correct += 1;
          else failures.push(outcome.key);
        }

        return {
          ...ratio(correct, checked),
          note: failures.length === 0 ? "source, page et extrait vérifiés" : `échecs : ${failures.join(", ")}`
        };
      }
    },
    {
      id: "abstention_count",
      label: "Abstention count",
      kind: "count",
      compute: ({ counts }) => ({
        value: counts.abstentions,
        note: `${counts.correctAbstentions} justifiée(s), ${counts.incorrectAbstentions} injustifiée(s), ${counts.unlabelledAbstentions} non labellisée(s)`
      })
    },
    {
      id: "abstention_correctness",
      label: "Abstention correctness",
      compute: ({ counts }) => ({
        ...ratio(counts.correctAbstentions, counts.correctAbstentions + counts.incorrectAbstentions),
        note: "sur les seules abstentions que la ground truth permet de juger"
      })
    }
  ];
}
