/**
 * Tout module du navigateur doit au moins **se lire**.
 *
 * ## Le défaut que ça répare, et il est parti en production
 *
 * `enregistrerSurLetabli` a reçu un paramètre `dit` alors qu'elle déclarait déjà
 * `const dit` dans son corps. C'est une **erreur de syntaxe** : le module ne se
 * charge pas du tout, et plus aucun utilitaire ne pouvait être enregistré sur
 * l'établi. Rien ne l'a vu.
 *
 * Pourquoi rien ne l'a vu : soixante-six modules de `apps/web/js` importent
 * `assets/js/auth.js`, qui vient du CDN de Supabase. Aucune épreuve ne peut donc
 * les **charger** — elles les relisent au mieux comme du texte. Une faute de
 * frappe y traverse les six mille épreuves, la batterie de mutations et la
 * revue, et se découvre au clavier de l'utilisateur.
 *
 * ## Pourquoi un seul processus, et pas `node --check` par fichier
 *
 * Six cents fichiers font six cents lancements de Node : quatorze secondes
 * ajoutées à une suite qui en dure quinze. `vm.SourceTextModule` **analyse sans
 * exécuter** et sans résoudre les imports — c'est exactement ce qu'on veut : on
 * ne demande pas au module de marcher, on lui demande d'être du JavaScript.
 *
 * Un seul enfant, parce que le drapeau `--experimental-vm-modules` ne peut pas
 * s'ajouter à la commande des épreuves.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Ce que l'enfant fait : analyser chaque fichier, et dire lesquels ne se lisent pas. */
const ANALYSE = `
const vm = require("node:vm");
const { readFileSync } = require("node:fs");
const { execFileSync } = require("node:child_process");

const racine = process.argv[1];
const fichiers = execFileSync("find", [
  racine + "/apps/web/js", racine + "/supabase/functions", racine + "/scripts",
  "-name", "*.js", "-o", "-name", "*.mjs"
], { encoding: "utf8" }).split("\\n").filter(Boolean);

const fautes = [];
for (const chemin of fichiers) {
  try {
    new vm.SourceTextModule(readFileSync(chemin, "utf8"), { identifier: chemin });
  } catch (erreur) {
    // Seule la syntaxe nous regarde : un module qui s'analyse mais ne
    // s'exécuterait pas ici n'est pas une faute, c'est un module du navigateur.
    if (erreur instanceof SyntaxError) {
      fautes.push(chemin.slice(racine.length + 1) + " — " + erreur.message);
    }
  }
}
process.stdout.write(JSON.stringify({ combien: fichiers.length, fautes }));
`;

test("chaque module du navigateur est du JavaScript qui se lit", () => {
  const racine = fileURLToPath(new URL("../../..", import.meta.url)).replace(/\/$/, "");

  const enfant = spawnSync(process.execPath,
    ["--experimental-vm-modules", "--no-warnings", "-e", ANALYSE, racine],
    { encoding: "utf8", timeout: 60_000 });

  assert.equal(enfant.status, 0, `l'analyse n'a pas pu tourner : ${enfant.stderr}`);

  const rendu = JSON.parse(enfant.stdout);

  // **Le compte est une garde, pas une décoration.** Un `find` qui ne trouverait
  // rien rendrait une liste de fautes vide, et l'épreuve passerait en n'ayant
  // rien analysé du tout (règle 12).
  assert.ok(rendu.combien > 400, `trop peu de fichiers analysés : ${rendu.combien}`);
  assert.deepEqual(rendu.fautes, [], `des modules ne se lisent pas :\n${rendu.fautes.join("\n")}`);
});
