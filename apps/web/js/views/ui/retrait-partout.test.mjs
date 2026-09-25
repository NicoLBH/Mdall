/**
 * Les filets et les paires, **partout où l'on lit du Mdall**.
 *
 * C'est l'épreuve de la mutualisation elle-même : elle ne vérifie pas qu'un
 * écran les porte, elle vérifie qu'ils les portent **tous**, et de la même
 * façon. Le jour où l'on ajoute un écran qui montre du code, c'est ici qu'on
 * s'apercevra qu'il a été oublié.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderLignesDeCode, renderJetons } from "./code-mdall.js";
import { renderExempleDuWiki } from "./wiki-mdall.js";
import { renderFiletsDuRetrait } from "./saisie-de-code.js";
import { colorerDuMdall } from "../studio/dev/ecrire-en-mdall.js";
import { jetonsEcrits } from "../../services/mdall-en-ecriture.js";
import { profondeursDuTexte, niveauxDesPaires } from "../../services/mdall-retrait.js";

const CODE = [
  "fonction Prix TTC(zones, Prix HT) {",
  "   calcule TVA = Prix HT * 20%;",
  "   alors (",
  "      enregistre (",
  "         Prix TTC: \"1440 €\",",
  "      )",
  "   );",
  "}"
].join("\n");

const EN_LIGNES = CODE.split("\n").map((ligne) => ({ jetons: jetonsEcrits(ligne) }));
/** Les crans que chaque rendu annonce, dans l'ordre. */
const cransAnnonces = (html) =>
  [...String(html).matchAll(/--mdall-crans:(\d+)/g)].map((trouve) => Number(trouve[1]));

/* ── Les mêmes crans, dans les quatre rendus ─────────────────────────────── */

test("les quatre rendus annoncent exactement les mêmes crans", () => {
  // Écrits en dur d'un côté, déduits de l'autre : deux façons de compter
  // finiraient par ne plus dire la même chose, et c'est celle qu'on ne regarde
  // pas qui aurait raison (règle 4).
  const attendus = [0, 1, 1, 2, 3, 2, 1, 0];

  assert.deepEqual(profondeursDuTexte(CODE), attendus);
  assert.deepEqual(cransAnnonces(renderLignesDeCode(EN_LIGNES)), attendus, "les Changements");
  assert.deepEqual(cransAnnonces(renderExempleDuWiki(CODE)), attendus, "le wiki");
  assert.deepEqual(cransAnnonces(renderFiletsDuRetrait(CODE)), attendus, "la zone d'écriture");
});

test("chaque rendu porte la classe du filet partagé", () => {
  // Une classe par écran ferait cinq dégradés à recalibrer l'un contre l'autre.
  for (const [quoi, html] of [
    ["les Changements", renderLignesDeCode(EN_LIGNES)],
    ["le wiki", renderExempleDuWiki(CODE)],
    ["la zone d'écriture", renderFiletsDuRetrait(CODE)]
  ]) {
    assert.match(html, /class="[^"]*code-retrait/, `${quoi} ne porte pas le filet partagé`);
  }
});

test("la zone d'écriture pose un filet par ligne, et pas un de plus", () => {
  // Ils se superposent au texte ligne à ligne : un de trop, et tout ce qui
  // suit tombe une ligne plus bas.
  assert.equal(renderFiletsDuRetrait(CODE).match(/saisie-code__filet/g).length, CODE.split("\n").length);
  assert.equal(renderFiletsDuRetrait("").match(/saisie-code__filet/g).length, 1);
});

/* ── Les mêmes paires, dans les quatre rendus ────────────────────────────── */

test("les quatre rendus apparient les bornes de la même façon", () => {
  const paires = niveauxDesPaires(EN_LIGNES);

  // La ligne 3 ouvre `enregistre (` au troisième niveau, la ligne 5 la ferme.
  const ouvre = [...paires.get(3).values()][0];
  const ferme = [...paires.get(5).values()][0];
  assert.equal(ouvre, ferme, "l'ouverture et sa fermeture n'ont pas la même teinte");

  for (const [quoi, html] of [
    ["les Changements", renderLignesDeCode(EN_LIGNES)],
    ["le wiki", renderExempleDuWiki(CODE)],
    ["la zone d'écriture", colorerDuMdall(CODE)]
  ]) {
    const teintes = [...String(html).matchAll(/mdall-paire--(\d)/g)].map((un) => Number(un[1]));
    assert.ok(teintes.length >= 8, `${quoi} n'apparie pas ses bornes`);
    assert.ok(teintes.includes(ouvre), `${quoi} n'a pas la teinte du troisième niveau`);
  }
});

test("le rendu mutualisé sait taire les paires quand personne ne les a calculées", () => {
  // Un écran qui n'en veut pas n'en porte pas, et sa coloration ne change pas.
  assert.doesNotMatch(renderJetons(jetonsEcrits("si (A = 1)")), /mdall-paire/);
  assert.match(renderJetons(jetonsEcrits("si (A = 1)"), { paires: new Map([[2, 1]]) }),
    /mdall-paire mdall-paire--1/);
});

/**
 * **Cette épreuve relit le source, et c'est l'exception qui le justifie.**
 *
 * Le défaut ne se voit pas dans un rendu : il est dans les touches qu'on
 * intercepte, et dans l'ordre où deux écouteurs se les disputent. La zone de
 * code a déjà passé pour cassée une fois ; on ne va pas recommencer.
 */
test("la tabulation pose un cran, et s'efface devant une liste ouverte", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./saisie-de-code.js", import.meta.url)), "utf8");

  const depart = source.indexOf("const auRetrait =");
  assert.ok(depart > 0, "la zone d'écriture n'a plus de tabulation du tout");

  const auRetrait = source.slice(depart, source.indexOf("zone.addEventListener(\"input\"", depart));

  assert.match(auRetrait, /evenement\.key !== "Tab"/, "elle ne regarde plus la touche");
  assert.match(auRetrait, /evenement\.defaultPrevented/,
    "elle prend Tab même quand une liste de propositions l'a déjà arrêté");
  assert.match(auRetrait, /poserUnRetrait/, "elle ne pose plus de cran");
  assert.match(auRetrait, /shiftKey \? -1 : 1/, "Maj+Tab ne retire plus rien");
  assert.match(source, /zone\.addEventListener\("keydown", auRetrait\)/, "elle n'est pas branchée");
});

/* ── Et la couche colorée reste fidèle au caractère près ─────────────────── */

test("les paires n'ajoutent pas un caractère à la couche colorée", () => {
  // C'est la loi de la zone d'écriture : ce qui est peint est exactement ce qui
  // est écrit. Une teinte se pose sur un jeton, elle n'en crée pas.
  const nu = colorerDuMdall(CODE)
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

  assert.equal(nu, `${CODE}\n`);
});
