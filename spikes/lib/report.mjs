/**
 * Rendu Markdown d'un run de spike.
 *
 * Contrainte de lecture : les violations de garde-fous et les erreurs
 * individuelles passent AVANT les scores agrégés. Un pourcentage flatteur ne
 * doit jamais masquer une erreur unitaire sur un petit corpus.
 */

import { OUTCOME, REASON } from "./metrics.mjs";
import { stableStringify } from "./stable-json.mjs";

const ERROR_OUTCOMES = new Set([OUTCOME.FALSE_POSITIVE, OUTCOME.FALSE_NEGATIVE]);

const ABSTENTION_REASONS = new Set([
  REASON.ABSTAINED_ON_EXPECTED,
  REASON.ABSTAINED_AS_EXPECTED,
  REASON.ABSTAINED_ON_ABSENCE,
  REASON.ABSTAINED_WITHOUT_GROUND_TRUTH
]);

/**
 * Trois natures de métrique, trois rendus.
 *  - `count` : un effectif. L'afficher en pourcentage n'a aucun sens.
 *  - `score` : une valeur dans [0, 1] sans fraction lisible (F1, par exemple).
 *  - `ratio` : une fraction, affichée avec son numérateur et son dénominateur.
 */
export function formatRatio(metric) {
  if (!metric || metric.value === null || metric.value === undefined) {
    return metric?.kind === "count" ? "0" : "n/a (dénominateur = 0)";
  }

  if (metric.kind === "count") {
    return String(metric.value);
  }

  const percent = (metric.value * 100).toFixed(1);
  if (metric.kind === "score" || metric.denominator === undefined) {
    return `${metric.value.toFixed(3)} — ${percent} %`;
  }

  return `${metric.value.toFixed(3)} — ${percent} % (${metric.numerator}/${metric.denominator})`;
}

export function escapeCell(value, maxLength = 120) {
  if (value === null || value === undefined) return "—";
  const text = typeof value === "string" ? value : stableStringify(value, 0);
  const flat = text.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
  if (flat === "") return "—";
  return flat.length > maxLength ? `${flat.slice(0, maxLength)}…` : flat;
}

function renderTable(headers, rows) {
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ];
  return lines.join("\n");
}

function summarizeValue(item) {
  if (!item) return null;
  return item.value ?? item.expected ?? null;
}

/** @returns {string} rapport Markdown complet du run. */
export function renderRunReport(record) {
  const lines = [];
  const violations = record.guard_violations ?? [];
  const outcomes = record.outcomes ?? [];
  const errors = outcomes.filter((outcome) => ERROR_OUTCOMES.has(outcome.outcome));
  const abstentions = outcomes.filter((outcome) => ABSTENTION_REASONS.has(outcome.reason));

  lines.push(`# Spike run — ${record.spike} / ${record.case_id}`);
  lines.push("");
  if (record.title) lines.push(`_${record.title}_`, "");

  lines.push("## Run");
  lines.push("");
  lines.push(
    renderTable(
      ["Champ", "Valeur"],
      [
        ["run_id", `\`${record.run_id}\``],
        ["pipeline", `${record.pipeline.id} v${record.pipeline.version}`],
        ["démarré à", record.started_at],
        ["durée", `${record.duration_ms} ms`],
        ["paramètres", `\`${escapeCell(record.params, 200)}\``],
        ["sources", String((record.sources ?? []).length)],
        ["ground truth", record.ground_truth ? `${record.ground_truth.item_count} items` : "absente"],
        ["prédictions", String((record.predictions ?? []).length)],
        ["appels LLM", String((record.llm_calls ?? []).length)]
      ]
    )
  );
  lines.push("");

  lines.push("## Garde-fous");
  lines.push("");
  if (violations.length === 0) {
    lines.push("Aucune violation détectée.");
  } else {
    lines.push(`**${violations.length} violation(s) — bloquant.**`);
    lines.push("");
    lines.push(
      renderTable(
        ["Garde-fou", "Clé", "Détail"],
        violations.map((violation) => [
          escapeCell(violation.guard_id),
          escapeCell(violation.key),
          escapeCell(violation.message)
        ])
      )
    );
  }
  lines.push("");

  lines.push("## Erreurs individuelles");
  lines.push("");
  if (errors.length === 0) {
    lines.push("Aucune erreur individuelle.");
  } else {
    lines.push(
      renderTable(
        ["Clé", "Issue", "Raison", "Attendu", "Prédit", "Confiance"],
        errors.map((error) => [
          escapeCell(error.key),
          escapeCell(error.outcome),
          escapeCell(error.reason),
          escapeCell(summarizeValue(error.expected)),
          escapeCell(summarizeValue(error.predicted)),
          error.confidence === null || error.confidence === undefined ? "—" : String(error.confidence)
        ])
      )
    );
  }
  lines.push("");

  lines.push("## Abstentions");
  lines.push("");
  if (abstentions.length === 0) {
    lines.push("Aucune abstention.");
  } else {
    lines.push(
      renderTable(
        ["Clé", "Raison", "Attendu", "Confiance"],
        abstentions.map((abstention) => [
          escapeCell(abstention.key),
          escapeCell(abstention.reason),
          escapeCell(summarizeValue(abstention.expected)),
          abstention.confidence === null || abstention.confidence === undefined
            ? "—"
            : String(abstention.confidence)
        ])
      )
    );
  }
  lines.push("");

  lines.push("## Comptages");
  lines.push("");
  const counts = record.counts ?? {};
  lines.push(
    renderTable(
      ["Compteur", "Valeur"],
      Object.keys(counts)
        .sort()
        .map((key) => [key, String(counts[key])])
    )
  );
  lines.push("");

  lines.push("## Métriques");
  lines.push("");
  lines.push(
    renderTable(
      ["Métrique", "Valeur", "Note"],
      (record.metrics ?? []).map((metric) => [
        escapeCell(metric.label ?? metric.id),
        formatRatio(metric),
        escapeCell(metric.note ?? "")
      ])
    )
  );
  lines.push("");
  lines.push("> `n/a (dénominateur = 0)` signifie que la métrique n'est pas calculable sur ce cas.");
  lines.push("> Elle n'est jamais remplacée par 0 ou 1.");
  lines.push("");

  if ((record.llm_calls ?? []).length > 0) {
    lines.push("## Appels LLM");
    lines.push("");
    lines.push(
      renderTable(
        ["#", "Modèle", "Prompt", "Version", "Empreinte prompt"],
        record.llm_calls.map((call) => [
          String(call.index),
          escapeCell(call.model),
          escapeCell(call.prompt_id),
          escapeCell(call.prompt_version),
          escapeCell(call.prompt_sha256 ? call.prompt_sha256.slice(0, 12) : null)
        ])
      )
    );
    lines.push("");
  }

  if (record.notes) {
    lines.push("## Notes");
    lines.push("");
    lines.push(record.notes);
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
