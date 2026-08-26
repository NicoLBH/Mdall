/** Emplacements standards du harness, résolus depuis ce fichier. */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SPIKES_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FIXTURES_DIR = resolve(SPIKES_ROOT, "fixtures");
export const PRIVATE_FIXTURES_DIR = resolve(FIXTURES_DIR, "private");
export const OUTPUTS_DIR = resolve(SPIKES_ROOT, "outputs");
export const REPORTS_DIR = resolve(SPIKES_ROOT, "reports");
