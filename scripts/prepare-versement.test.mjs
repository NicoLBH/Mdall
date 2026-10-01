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

import {
  LES_DEPARTS, laFermeture, leModuleAplati, lesImports, lesNomsQuiSeHeurtent, limportAplati
} from "./prepare-versement.mjs";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(RACINE, "apps", "web", "js");
const COPIE = path.join(RACINE, "supabase", "functions", "_shared", "versement");

/**
 * Ce que le script descend — **calculé, et non relu dans son texte**.
 *
 * Cette fonction lisait la liste écrite à la main dans la source du script, à
 * coups de `indexOf`. Elle a cessé de rien trouver le jour où la liste est
 * devenue une fermeture calculée : un relevé de texte éprouve la forme du
 * fichier, pas ce qu'il fait. On appelle donc la fermeture elle-même.
 */
async function lesModules() {
  const { modules, manques } = await laFermeture(LES_DEPARTS, (module) =>
    readFile(path.join(SOURCE, module), "utf8"));
  assert.deepEqual(manques, [], "des modules de la fermeture sont introuvables");
  return modules;
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

test("la fermeture est close : rien de ce qui descend n'importe ce qui reste", async () => {
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

/**
 * **Deux modules de même nom s'écraseraient.**
 *
 * Tout s'aplatit dans un seul dossier au serveur : `utils/sha256.js` et un
 * hypothétique `services/sha256.js` y deviendraient le même fichier, et le
 * second effacerait le premier. La fonction appellerait alors la mauvaise, sans
 * que rien ne lève — et l'on chercherait longtemps.
 *
 * La liste écrite à la main ne pouvait pas le voir : elle n'avait que quinze
 * noms, tous distincts. La fermeture en trouve quatre-vingt-treize.
 */
test("deux modules ne se disputent jamais le même nom de fichier", async () => {
  const { heurts } = await laFermeture(LES_DEPARTS, (module) =>
    readFile(path.join(SOURCE, module), "utf8"));
  assert.deepEqual(heurts, []);

  /**
   * **Et la fermeture le dit quand cela arrive.**
   *
   * Sans ce témoin, une fermeture sans heurt et un relevé qui ne relève rien se
   * ressemblent exactement — c'est précisément pour cela qu'un cassage avait
   * survécu (règle 12). On lui donne donc deux modules de même nom, et l'on
   * vérifie qu'elle les nomme.
   */
  const sources = {
    "a/zero.js": 'import { a } from "./un.js";\nimport { b } from "../b/un.js";',
    "a/un.js": "export const a = 1;",
    "b/un.js": "export const b = 2;"
  };
  const faite = await laFermeture(["a/zero.js"], async (module) => sources[module]);

  assert.deepEqual(faite.manques, []);
  assert.deepEqual(faite.heurts, ["a/un.js et b/un.js"],
    "la fermeture ne voit pas deux modules qui s'écraseraient au serveur");
});

/**
 * **Un module introuvable arrête**, et il se nomme. Une copie partie avec un
 * trou ne casse rien ici : elle casse la fonction de bord, en production, au
 * premier appel.
 */
test("la fermeture nomme ce qu'elle ne trouve pas", async () => {
  const sources = { "a/zero.js": 'import { x } from "./jamais-ecrit.js";' };
  const faite = await laFermeture(["a/zero.js"], async (module) => {
    if (!(module in sources)) throw new Error("absent");
    return sources[module];
  });

  assert.deepEqual(faite.manques, ["a/jamais-ecrit.js"]);
});

/**
 * **La fermeture couvre les deux travaux.** Verser des mails et lire des comptes
 * rendus partagent la moitié de leurs modules ; un départ oublié ne se verrait
 * qu'en production, au premier appel, sous la forme d'un module introuvable.
 */
test("les deux travaux du serveur descendent", async () => {
  const noms = new Set((await lesModules()).map((un) => path.basename(un)));

  for (const attendu of [
    // Verser des mails.
    "un-msg-deplie.js", "le-versement-en-ordre.js", "sha256.js",
    // Lire des comptes rendus.
    "la-file-des-comptes-rendus.js", "lecture-du-cr.js", "proposition-du-cr.js",
    "atelier-proposition.js", "reconstitution-markdown.js", "liens-du-cr.js"
  ]) {
    assert.equal(noms.has(attendu), true, `« ${attendu} » ne descend pas`);
  }
});
