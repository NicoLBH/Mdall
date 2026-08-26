#!/usr/bin/env node
/**
 * Vérification de bout en bout du harness sur la fixture de démonstration.
 *
 * Ne touche à aucune donnée réelle, n'appelle aucun service, n'écrit que dans
 * spikes/outputs et spikes/reports.
 *
 *   node spikes/selfcheck.mjs            # écrit outputs + rapport
 *   node spikes/selfcheck.mjs --dry-run  # affiche le rapport sans rien écrire
 */

import { resolve } from "node:path";

import { demoPipeline } from "./fixtures/example-harness-case/demo-pipeline.mjs";
import { commonGuards, createAmbiguityNotPresentedAsCertain } from "./lib/guards.mjs";
import { runSpikeCase } from "./lib/harness.mjs";
import { FIXTURES_DIR } from "./lib/paths.mjs";

const dryRun = process.argv.includes("--dry-run");
const manifestPath = resolve(FIXTURES_DIR, "example-harness-case/case.json");

const { record, report, runPath, reportPath } = await runSpikeCase({
  manifestPath,
  pipeline: demoPipeline,
  guards: [...commonGuards, createAmbiguityNotPresentedAsCertain({ assertionThreshold: 0.6 })],
  write: !dryRun
});

process.stdout.write(`${report}\n`);

if (!dryRun) {
  process.stdout.write(`Run écrit : ${runPath}\nRapport écrit : ${reportPath}\n`);
}

if (record.guard_violations.length > 0) {
  process.stdout.write(`\n${record.guard_violations.length} violation(s) de garde-fou.\n`);
  process.exitCode = 1;
}
