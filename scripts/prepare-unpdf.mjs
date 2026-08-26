/**
 * Copie unpdf dans apps/web/vendor/unpdf, sur le modèle de prepare-katex.
 *
 * C'est la bibliothèque déjà utilisée par la fonction Edge `extract-pdf-text`
 * (`import { extractText, getDocumentProxy } from 'npm:unpdf'`). Le laboratoire
 * CT Continuity s'en sert côté navigateur, ce qui a trois conséquences voulues :
 *  - les rapports chargés ne quittent jamais le poste de l'utilisateur ;
 *  - aucune ligne de production n'est créée pour lire un PDF ;
 *  - les pages ne sont pas fusionnées, donc la provenance reste vérifiable.
 *
 * `index.mjs` résout PDF.js par un import dynamique de spécificateur nu
 * (`import("unpdf/pdfjs")`), impossible à résoudre dans un navigateur sans
 * import map : le laboratoire lui passe explicitement le module vendu via
 * `definePDFJSModule`.
 */

import { mkdir, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const unpdfDistDir = path.join(rootDir, "node_modules", "unpdf", "dist");
const targetDir = path.join(rootDir, "apps", "web", "vendor", "unpdf");

await mkdir(targetDir, { recursive: true });
await cp(path.join(unpdfDistDir, "index.mjs"), path.join(targetDir, "index.mjs"));
await cp(path.join(unpdfDistDir, "pdfjs.mjs"), path.join(targetDir, "pdfjs.mjs"));

console.log(`unpdf copié dans ${path.relative(rootDir, targetDir)}`);
