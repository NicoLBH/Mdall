#!/usr/bin/env node
/**
 * Spike 1 — CLI.
 *
 *   node spikes/ct-continuity/run.mjs --case <chemin/vers/case.json>
 *   node spikes/ct-continuity/run.mjs --case <…> --dry-run   # n'écrit rien
 *   node spikes/ct-continuity/run.mjs --case <…> --quiet     # chemins seulement
 *
 * Ne lit que la fixture désignée, n'écrit que dans spikes/outputs et
 * spikes/reports, ne contacte aucun service et ne touche à aucun projet réel.
 */

import { resolve } from "node:path";

import { commonGuards, createAbsenceIsNotAConclusion, createAmbiguityNotPresentedAsCertain } from "../lib/guards.mjs";
import { runSpikeCase } from "../lib/harness.mjs";
import { ctGuards } from "./guards.mjs";
import { buildCtMetrics } from "./metrics.mjs";
import { ctContinuityPipeline } from "./pipeline.mjs";

function parseArgs(argv) {
  const args = { case: null, dryRun: false, quiet: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--case" || arg === "-c") {
      args.case = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--quiet") {
      args.quiet = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }

  return args;
}

const USAGE = `Usage : node spikes/ct-continuity/run.mjs --case <chemin/vers/case.json> [--dry-run] [--quiet]`;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  process.stdout.write(`${USAGE}\n`);
  process.exit(0);
}

if (!args.case) {
  process.stderr.write(`${USAGE}\n\nErreur : --case est obligatoire.\n`);
  process.exit(2);
}

/**
 * Les garde-fous communs, plus ceux du contrôle technique.
 * NOT_FOUND est déclaré non conclusif : constater qu'un avis n'est pas retrouvé
 * est permis, en tirer une levée ne l'est pas.
 */
export const CT_GUARDS = [
  ...commonGuards.filter((guard) => guard.id !== "absence_is_not_a_conclusion"),
  createAbsenceIsNotAConclusion({ nonConclusiveStates: ["NOT_FOUND"] }),
  createAmbiguityNotPresentedAsCertain({ assertionThreshold: 0.6 }),
  ...ctGuards
];

const { record, report, runPath, reportPath } = await runSpikeCase({
  manifestPath: resolve(args.case),
  pipeline: ctContinuityPipeline,
  guards: CT_GUARDS,
  extraMetrics: (testCase) => buildCtMetrics({ sources: testCase.sources }),
  write: !args.dryRun
});

if (!args.quiet) {
  process.stdout.write(`${report}\n`);
}

if (!args.dryRun) {
  process.stdout.write(`Run écrit    : ${runPath}\nRapport écrit : ${reportPath}\n`);
}

if (record.guard_violations.length > 0) {
  process.stderr.write(`\n${record.guard_violations.length} violation(s) de garde-fou — voir le rapport.\n`);
  process.exitCode = 1;
}
