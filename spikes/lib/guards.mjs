/**
 * Garde-fous réutilisables.
 *
 * Un garde-fou ne mesure pas une performance : il détecte un comportement
 * interdit par le cadrage produit. Une violation doit apparaître en tête du
 * rapport, individuellement, même si les scores globaux sont bons.
 *
 * Un garde-fou expose : { id, label, detect(context) -> issue[] }
 * `context` = { expected, predicted, outcomes, counts, sources, params }
 */

import { containsNormalizedPhrase, normalizeTextKey } from "./normalize.mjs";
import { isAbstentionByDefault } from "./metrics.mjs";

function assertedPredictions(context) {
  return (context.predicted ?? []).filter((prediction) => !isAbstentionByDefault(prediction));
}

/**
 * Toute affirmation doit porter une provenance exploitable
 * (source + extrait). Sans provenance, l'information n'est pas auditable.
 */
export const provenanceRequired = {
  id: "provenance_required",
  label: "Toute affirmation porte une provenance (source + extrait)",
  detect(context) {
    const issues = [];
    for (const prediction of assertedPredictions(context)) {
      const provenance = prediction.provenance ?? null;
      const missing = [];
      if (!provenance) missing.push("provenance");
      else {
        if (!provenance.source_id) missing.push("source_id");
        if (!provenance.excerpt) missing.push("excerpt");
      }
      if (missing.length > 0) {
        issues.push({
          key: prediction.key ?? prediction.id ?? "(sans clé)",
          message: `affirmation sans provenance vérifiable (manquant : ${missing.join(", ")})`
        });
      }
    }
    return issues;
  }
};

/**
 * L'extrait cité doit réellement figurer dans la source citée.
 * C'est le garde-fou anti-citation inventée.
 */
export const excerptMustExistInSource = {
  id: "excerpt_must_exist_in_source",
  label: "L'extrait cité existe réellement dans la source citée",
  detect(context) {
    const issues = [];
    const bySourceId = new Map((context.sources ?? []).map((source) => [source.source_id, source]));
    // Chaque document n'est normalisé qu'une fois, quel que soit le nombre
    // d'extraits qui le citent.
    const normalizedContent = new Map();
    const contentOf = (source) => {
      if (!normalizedContent.has(source.source_id)) {
        normalizedContent.set(source.source_id, normalizeTextKey(source.content));
      }
      return normalizedContent.get(source.source_id);
    };

    for (const prediction of assertedPredictions(context)) {
      const provenance = prediction.provenance;
      if (!provenance?.source_id || !provenance?.excerpt) continue;

      const source = bySourceId.get(provenance.source_id);
      const key = prediction.key ?? prediction.id ?? "(sans clé)";
      if (!source) {
        issues.push({ key, message: `provenance vers une source inconnue "${provenance.source_id}"` });
        continue;
      }
      if (!source.content_available) continue;
      if (!containsNormalizedPhrase(contentOf(source), provenance.excerpt)) {
        issues.push({
          key,
          message: `extrait introuvable dans la source "${provenance.source_id}"`
        });
      }
    }
    return issues;
  }
};

/**
 * Une conclusion positive ne peut pas être déduite d'une simple absence.
 * Règle §28.5 : « absence dans le document suivant ≠ clôture ».
 *
 * Une prédiction qui s'appuie sur une absence doit le déclarer
 * (`derived_from_absence: true`) et ne peut affirmer qu'un état non conclusif :
 * constater qu'une information n'a pas été retrouvée est permis, en tirer une
 * levée ou une clôture ne l'est pas.
 */
export function createAbsenceIsNotAConclusion({ nonConclusiveStates = ["NOT_FOUND", "UNRESOLVED"] } = {}) {
  const allowed = new Set(nonConclusiveStates);
  return {
    id: "absence_is_not_a_conclusion",
    label: `Aucune conclusion positive déduite d'une absence (états non conclusifs : ${[...allowed].join(", ")})`,
    detect(context) {
      const issues = [];
      for (const prediction of assertedPredictions(context)) {
        if (prediction.derived_from_absence !== true) continue;
        const state = prediction.value?.state ?? null;
        if (state !== null && allowed.has(state)) continue;
        issues.push({
          key: prediction.key ?? prediction.id ?? "(sans clé)",
          message: `conclusion "${state ?? "non déclarée"}" affirmée à partir d'une absence de donnée`
        });
      }
      return issues;
    }
  };
}

export const absenceIsNotAConclusion = createAbsenceIsNotAConclusion();

/**
 * Un rapprochement ambigu ne doit jamais être présenté comme certain.
 * Une prédiction affirmée qui liste plusieurs candidats, ou dont la confiance
 * est inférieure au seuil d'affirmation, est une violation.
 */
export function createAmbiguityNotPresentedAsCertain({ assertionThreshold = 0.5 } = {}) {
  return {
    id: "ambiguity_not_presented_as_certain",
    label: `Aucun rapprochement ambigu affirmé (seuil ${assertionThreshold})`,
    detect(context) {
      const issues = [];
      for (const prediction of assertedPredictions(context)) {
        const key = prediction.key ?? prediction.id ?? "(sans clé)";
        const candidates = Array.isArray(prediction.candidates) ? prediction.candidates : [];
        if (candidates.length > 1) {
          issues.push({ key, message: `${candidates.length} candidats concurrents mais résultat affirmé` });
          continue;
        }
        const confidence = prediction.confidence;
        if (typeof confidence === "number" && confidence < assertionThreshold) {
          issues.push({ key, message: `affirmation avec une confiance de ${confidence} (< ${assertionThreshold})` });
        }
      }
      return issues;
    }
  };
}

export const commonGuards = [provenanceRequired, excerptMustExistInSource, absenceIsNotAConclusion];

/** Exécute une liste de garde-fous et renvoie les violations à plat. */
export function runGuards(guards, context) {
  const violations = [];
  for (const guard of guards ?? []) {
    for (const issue of guard.detect(context) ?? []) {
      violations.push({ guard_id: guard.id, guard_label: guard.label, ...issue });
    }
  }
  return violations;
}
