/**
 * Copie le sous-ensemble navigateur du moteur de spike dans
 * apps/web/vendor/spikes.
 *
 * Le moteur reste versionné à un seul endroit : `spikes/`. Rien n'est dupliqué
 * dans le dépôt — le laboratoire de l'Atelier exécute exactement le code que
 * `npm run test:spikes` couvre.
 *
 * Seuls les modules sans dépendance à Node sont copiés. Le script échoue si un
 * `node:` se glisse dans la liste : c'est le signal qu'un module a cessé d'être
 * utilisable en navigateur, et il vaut mieux casser le build que livrer une page
 * qui plante à l'ouverture.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(rootDir, "spikes");
const targetDir = path.join(rootDir, "apps", "web", "vendor", "spikes");

/** Sous-ensemble strictement pur : pas de fs, pas de crypto, pas de path. */
const BROWSER_SAFE_MODULES = [
  "lib/stable-json.mjs",
  "lib/normalize.mjs",
  "lib/metrics.mjs",
  "lib/guards.mjs",
  "lib/report.mjs",
  "lib/run-record.mjs",
  "ct-continuity/extraction.mjs",
  "ct-continuity/continuity.mjs",
  "ct-continuity/pipeline.mjs",
  "ct-continuity/metrics.mjs",
  "ct-continuity/guards.mjs"
];

const NODE_IMPORT = /from\s+["']node:[^"']+["']|import\s*\(\s*["']node:[^"']+["']\s*\)/;

const copied = [];

for (const relativePath of BROWSER_SAFE_MODULES) {
  const content = await readFile(path.join(sourceDir, relativePath), "utf8");

  if (NODE_IMPORT.test(content)) {
    throw new Error(
      `prepare-spike-engine: ${relativePath} importe un module Node et ne peut pas être servi au navigateur. ` +
        `Extraire la partie pure, ou retirer ce fichier de BROWSER_SAFE_MODULES.`
    );
  }

  const destination = path.join(targetDir, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content, "utf8");
  copied.push(relativePath);
}

console.log(`moteur de spike copié (${copied.length} modules) dans ${path.relative(rootDir, targetDir)}`);
