/**
 * Spike 1 — garde-fous propres au contrôle technique.
 *
 * Ils traduisent en code les règles de sécurité du §28.5 :
 *   absence ≠ clôture · ambiguïté ≠ correspondance forcée ·
 *   avis source ≠ statut du sujet · le moteur n'est pas l'auteur de l'avis.
 */

import { containsPhrase } from "../lib/normalize.mjs";
import { isAbstentionByDefault } from "../lib/metrics.mjs";

const MDALL_SUBJECT_STATUSES = new Set([
  "open",
  "closed",
  "closed_duplicate",
  "closed_invalid",
  "closed_replaced"
]);

const STATUS_FIELDS = ["status", "subject_status", "mdall_status", "subject_state"];

function asserted(context) {
  return (context.predicted ?? []).filter((prediction) => !isAbstentionByDefault(prediction));
}

/**
 * Le statut exprimé par le bureau de contrôle et le statut d'un sujet Mdall
 * n'appartiennent pas au même système (§11). Aucune prédiction ne porte de
 * statut de sujet.
 */
export const noMdallSubjectStatus = {
  id: "no_mdall_subject_status",
  label: "Aucune prédiction ne porte un statut de sujet Mdall",
  detect(context) {
    const issues = [];

    for (const prediction of context.predicted ?? []) {
      const value = prediction.value ?? {};
      for (const field of STATUS_FIELDS) {
        const candidate = value[field] ?? prediction[field];
        if (candidate === undefined || candidate === null) continue;
        if (!MDALL_SUBJECT_STATUSES.has(String(candidate).toLowerCase())) continue;

        issues.push({
          key: prediction.key ?? "(sans clé)",
          message: `statut de sujet Mdall "${candidate}" porté par le champ ${field}`
        });
      }
    }

    return issues;
  }
};

/**
 * L'avis restitué doit figurer littéralement dans l'extrait cité.
 * Le bureau de contrôle reste l'auteur de son avis : le moteur n'en reformule
 * ni n'en invente aucun.
 */
export const opinionMustComeFromSource = {
  id: "opinion_must_come_from_source",
  label: "L'avis restitué est justifié par sa source — extrait cité ou cellule lue",
  detect(context) {
    const issues = [];

    for (const prediction of asserted(context)) {
      if (prediction.kind !== "extraction" && prediction.kind !== "observation") continue;
      const opinion = prediction.value?.opinion_raw;
      if (!opinion) continue;

      const excerpt = prediction.provenance?.excerpt ?? "";
      if (containsPhrase(excerpt, opinion)) continue;

      // Une lecture par la géométrie sait mieux que ça d'où vient l'avis : elle
      // le tient d'une cellule, à une page et à un point donnés. Le texte aplati
      // du PDF, lui, recolle parfois cette cellule loin de la ligne qu'elle
      // qualifie, et aucun extrait ne peut alors la citer sans mentir sur la
      // source. La cellule vaut donc provenance à part entière — à condition
      // qu'elle porte bien l'avis affirmé, ce qui reste à vérifier ici.
      const cell = prediction.provenance?.opinion_cell;
      if (cell && cell.text === opinion && cell.page !== null && Number.isFinite(cell.x)) continue;

      issues.push({
        key: prediction.key ?? "(sans clé)",
        message: `avis "${opinion}" absent de l'extrait cité`
      });
    }

    return issues;
  }
};

/**
 * Une continuité affirmée doit désigner le document précédent, sauf pour un
 * NEW. Sans cela, la transition affichée n'est pas vérifiable.
 */
export const transitionMustCiteBothSides = {
  id: "transition_must_cite_both_sides",
  label: "Toute transition affirmée désigne son document précédent",
  detect(context) {
    const issues = [];

    for (const prediction of asserted(context)) {
      if (prediction.kind !== "continuity") continue;
      const state = prediction.value?.state;
      if (state === "NEW" || state === undefined) continue;

      if (!prediction.value?.previous_document_id) {
        issues.push({
          key: prediction.key ?? "(sans clé)",
          message: `transition ${state} sans document précédent identifié`
        });
      }
    }

    return issues;
  }
};

export const ctGuards = [noMdallSubjectStatus, opinionMustComeFromSource, transitionMustCiteBothSides];
