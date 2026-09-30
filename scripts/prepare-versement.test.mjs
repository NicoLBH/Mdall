/**
 * **Les deux copies de la lecture d'un mail ne peuvent pas diverger.**
 *
 * La lecture des `.msg`, des `.eml` et des `.zip` vit dans
 * `apps/web/js/services`, où `npm test` l'exerce. Elle est **copiée** vers
 * `supabase/functions/_shared/versement` pour que la fonction de bord sache
 * lire un dépôt.
 *
 * Une copie est une dette : celle qu'on ne relit pas finit par avoir raison le
 * jour où l'on cherche pourquoi le serveur range un mail que l'Atelier lit
 * autrement (règle 4). Cette épreuve refait la copie en mémoire et la compare —
 * au caractère près, à la réécriture des imports près.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { leModuleAplati, lesImports, limportAplati } from "./prepare-versement.mjs";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(RACINE, "apps", "web", "js");
const COPIE = path.join(RACINE, "supabase", "functions", "_shared", "versement");

/** Ce que le script descend, relu depuis le script lui-même. */
async function lesModules() {
  const script = await readFile(path.join(RACINE, "scripts", "prepare-versement.mjs"), "utf8");
  const bloc = script.slice(script.indexOf("const LES_MODULES = ["), script.indexOf("];"));
  return [...bloc.matchAll(/"([^"]+)"/g)].map((un) => un[1]);
}

test("un import remontant devient un import de voisin", () => {
  assert.equal(limportAplati("../utils/poids-dit.js"), "./poids-dit.js");
  assert.equal(limportAplati("./un-msg-deplie.js"), "./un-msg-deplie.js");
  // Un module distant n'est pas réécrit : `npm:` et les URL restent entiers.
  assert.equal(limportAplati("npm:@supabase/supabase-js@2"), "npm:@supabase/supabase-js@2");
});

test("l'aplatissement ne touche qu'aux chemins", () => {
  const source = 'import { a } from "../utils/poids-dit.js";\nexport const dit = "../utils/x";\n';
  const aplati = leModuleAplati(source);
  assert.match(aplati, /from "\.\/poids-dit\.js"/);
  // La chaîne qui ressemble à un chemin, mais n'en est pas un, ne bouge pas.
  assert.match(aplati, /export const dit = "\.\.\/utils\/x";/);
});

test("chaque module descendu est identique à sa source", { skip: !existsSync(COPIE) && "la copie n'a pas été faite (npm run prepare:versement)" }, async () => {
  const modules = await lesModules();
  assert.ok(modules.length >= 10, "la liste des modules n'a pas été relue");

  for (const module of modules) {
    const source = await readFile(path.join(SOURCE, module), "utf8");
    const descendu = await readFile(path.join(COPIE, path.basename(module)), "utf8");
    assert.equal(
      descendu, leModuleAplati(source),
      `« ${module} » a divergé de sa copie : refaites-la (npm run prepare:versement)`
    );
  }
});

test("aucun module descendu ne touche au navigateur", async () => {
  const modules = await lesModules();

  for (const module of modules) {
    const source = await readFile(path.join(SOURCE, module), "utf8");
    // Deno n'a ni fenêtre, ni document, ni session : un import vers l'un d'eux
    // ne casse pas la copie, il casse la fonction au premier dépôt.
    for (const interdit of ["../store.js", "assets/js/auth.js", "/views/", "/ui/"]) {
      assert.equal(
        source.includes(interdit), false,
        `« ${module} » importe « ${interdit} » : il ne peut pas tourner au serveur`
      );
    }
  }
});

test("la liste est fermée : rien de ce qui descend n'importe ce qui reste", async () => {
  const modules = await lesModules();
  const noms = new Set(modules.map((un) => path.basename(un)));

  for (const module of modules) {
    const source = await readFile(path.join(SOURCE, module), "utf8");
    for (const cible of lesImports(source).filter((un) => un.startsWith("."))) {
      assert.equal(
        noms.has(path.basename(cible)), true,
        `« ${module} » importe « ${cible} », qui ne descend pas : la copie partirait avec un trou`
      );
    }
  }
});
