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
  "ct-continuity/document-meta.mjs",
  "ct-continuity/completeness.mjs",
  "ct-continuity/status.mjs",
  "ct-continuity/legend.mjs",
  "ct-continuity/lifting.mjs",
  "ct-continuity/block-extraction.mjs",
  "ct-continuity/extraction.mjs",
  "ct-continuity/continuity.mjs",
  "ct-continuity/pipeline.mjs",
  "ct-continuity/metrics.mjs",
  "ct-continuity/guards.mjs"
];

const NODE_IMPORT = /from\s+["']node:[^"']+["']|import\s*\(\s*["']node:[^"']+["']\s*\)/;
const RELATIVE_IMPORT = /from\s+["'](\.[^"']+)["']/g;

const copied = [];
const contents = new Map();

for (const relativePath of BROWSER_SAFE_MODULES) {
  const content = await readFile(path.join(sourceDir, relativePath), "utf8");

  if (NODE_IMPORT.test(content)) {
    throw new Error(
      `prepare-spike-engine: ${relativePath} importe un module Node et ne peut pas être servi au navigateur. ` +
        `Extraire la partie pure, ou retirer ce fichier de BROWSER_SAFE_MODULES.`
    );
  }

  contents.set(relativePath, content);
}

// Un module copié dont une dépendance manque produit un 404 au chargement de la
// page, sans rien dans la console de build. Mieux vaut casser le build ici.
const declared = new Set(BROWSER_SAFE_MODULES);
for (const [relativePath, content] of contents) {
  for (const match of content.matchAll(RELATIVE_IMPORT)) {
    const dependency = path
      .relative(sourceDir, path.resolve(path.dirname(path.join(sourceDir, relativePath)), match[1]))
      .split(path.sep)
      .join("/");

    if (!declared.has(dependency)) {
      throw new Error(
        `prepare-spike-engine: ${relativePath} importe ${dependency}, qui n'est pas copié. ` +
          `Ajouter ce module à BROWSER_SAFE_MODULES.`
      );
    }
  }
}

for (const [relativePath, content] of contents) {
  const destination = path.join(targetDir, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content, "utf8");
  copied.push(relativePath);
}

console.log(`moteur de spike copié (${copied.length} modules) dans ${path.relative(rootDir, targetDir)}`);
