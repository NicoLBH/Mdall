/**
 * Le jeu de référence, lu du dossier qui le porte.
 *
 * ## Pourquoi il est séparé de `lannotation.js`
 *
 * Celui-ci met en forme une annotation — ce qu'elle doit déclarer, ce qu'on
 * refuse — et c'est la partie qui compte. Il vit donc dans les services, où la
 * fonction de bord qui fait passer le jeu le trouve aussi.
 *
 * **Deno n'a pas ce dossier.** Garder la lecture du disque là-bas aurait rendu
 * le module inimportable au serveur : il aurait levé à l'import, en production,
 * au premier lancement depuis la console.
 *
 * Ce qui reste ici n'a de sens qu'en ligne de commande, et y reste.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { uneAnnotation } from "../../apps/web/js/services/lannotation.js";

const ICI = dirname(fileURLToPath(import.meta.url));
export const OU_SONT_LES_ANNOTATIONS = join(ICI, "les-annotations");

/**
 * Le jeu de référence, lu du disque.
 *
 * @throws si une annotation est mal formée — voir `uneAnnotation`.
 */
export function leJeuDeReference(ou = OU_SONT_LES_ANNOTATIONS) {
  return readdirSync(ou)
    .filter((nom) => nom.endsWith(".json"))
    .sort()
    .map((nom) => uneAnnotation(JSON.parse(readFileSync(join(ou, nom), "utf8")), nom));
}
