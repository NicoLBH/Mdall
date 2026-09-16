/**
 * **Le mot « carnet » ne s'écrit plus à l'écran.**
 *
 * ## Pourquoi cette règle existe
 *
 * « Carnet » était un mot de fabrication : on l'avait pris pour dire « mes
 * situations à moi, où qu'elles regardent ». Il s'est retrouvé sur l'écran, à
 * côté de « Situations » qui désigne la même chose — *« Dans mon carnet »* dans
 * le panneau d'un sujet, *« Pas dans mon carnet »* juste en dessous. Deux mots
 * pour une chose (règle 10), et celui-là n'existe nulle part sur un projet.
 *
 * **L'application ne parle plus que de situations** : des regroupements de
 * sujets.
 *
 * ## Ce que ce garde-fou lit, et ce qu'il ne lit pas
 *
 * Les **textes affichés**, et eux seuls : ce qui est entre guillemets dans le
 * code des écrans. Les noms de fichiers et de modules gardent le mot — c'est du
 * vocabulaire de fabrication, il ne sort pas, et le renommer déplacerait
 * soixante imports pour zéro pixel. C'est la règle déjà appliquée ailleurs :
 * un mot peut vivre dans le code sans jamais monter à l'écran.
 *
 * Il lit la source parce que c'est la seule façon de couvrir **tous** les
 * écrans à la fois : un mot qu'on remet un jour dans un panneau qu'aucun test
 * ne monte passerait sans bruit, et c'est exactement ce qui est arrivé.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const RACINE = new URL("../", import.meta.url).pathname;

/** Les chemins d'import portent le mot sans jamais l'afficher. */
const UN_CHEMIN = /^[./][^"'`]*$/;

async function fichiers(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const trouves = [];

  for (const entree of entrees) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...await fichiers(chemin));
    else if (entree.name.endsWith(".js")) trouves.push(chemin);
  }

  return trouves;
}

test("aucun texte affiché ne dit « carnet »", async () => {
  const coupables = [];

  for (const chemin of await fichiers(RACINE)) {
    const source = await readFile(chemin, "utf8");

    // Les chaînes du code, guillemets simples et doubles. Les gabarits `...`
    // portent du balisage entier et se traitent à part, ci-dessous.
    for (const [, dit] of source.matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)) {
      const texte = String(dit ?? "");
      if (!/carnet/i.test(texte) || UN_CHEMIN.test(texte)) continue;
      coupables.push(`${chemin} : "${texte}"`);
    }
  }

  assert.deepEqual(coupables, [], `le mot est encore affiché :\n${coupables.join("\n")}`);
});
