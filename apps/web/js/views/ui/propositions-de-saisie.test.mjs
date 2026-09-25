/**
 * La liste des propositions : ce qu'elle montre, et ce qu'elle laisse passer.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderPropositions } from "./propositions-de-saisie.js";
import { QUOI } from "../../services/mdall-completion.js";

const TROIS = [
  { texte: "fonction", quoi: QUOI.MOT, dit: "" },
  { texte: "Zone de vent", quoi: QUOI.NOM, dit: "Zone de vent de la commune." },
  { texte: "TVA", quoi: QUOI.LOCALE, dit: "calculé dans cette fonction" }
];

test("une proposition porte son texte et ce qu'elle est", () => {
  const html = renderPropositions(TROIS, 0);

  assert.equal((html.match(/data-saisie-proposition=/g) ?? []).length, 3);
  assert.match(html, /saisie-proposition__texte">fonction</);
  assert.match(html, /Zone de vent de la commune\./);
  assert.match(html, /calculé dans cette fonction/);
});

test("un mot du langage dit ce qu'il est, faute de description", () => {
  assert.match(renderPropositions([{ texte: "si", quoi: QUOI.MOT, dit: "" }], 0), /mot du langage/);
  assert.match(renderPropositions([{ texte: '"3"', quoi: QUOI.VALEUR, dit: "" }], 0), /valeur possible/);
});

test("celle qu'Entrée poserait se voit, et elle seule", () => {
  // On choisit aux flèches : un surlignage qui ne suivrait que la souris ne
  // dirait rien au clavier.
  const html = renderPropositions(TROIS, 1);

  assert.equal((html.match(/est-choisie/g) ?? []).length, 1);
  assert.equal((html.match(/aria-selected="true"/g) ?? []).length, 1);
  assert.ok(html.indexOf("est-choisie") > html.indexOf("fonction"),
    "la marque n'est pas sur la deuxième");
});

test("rien à proposer : rien à rendre, plutôt qu'un cadre vide", () => {
  assert.equal(renderPropositions([], 0), "");
  assert.equal(renderPropositions(null, 0), "");
  assert.equal(renderPropositions(), "");
});

test("ce qu'une proposition porte est échappé, jamais injecté", () => {
  // Les noms viennent d'un brouillon qu'on tape, et demain d'un modèle.
  const html = renderPropositions([
    { texte: '"><script>alert(1)</script>', quoi: QUOI.NOM, dit: '" onmouseover="x' }
  ], 0);

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /onmouseover="x/);
  assert.match(html, /&lt;script&gt;/);
});

/**
 * **Cette épreuve relit le source, et c'est l'exception qui le justifie.**
 *
 * Le défaut ne se voit pas dans un rendu : il est dans les touches qu'on
 * intercepte. La zone de code a déjà passé pour cassée une fois — les flèches
 * semblaient mortes, les retours à la ligne ne prenaient pas — et c'est
 * exactement ce qu'un `preventDefault` mal placé referait, en vrai cette fois.
 */
test("aucune touche n'est interceptée quand la liste est fermée", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./propositions-de-saisie.js", import.meta.url)), "utf8");

  const auClavier = source.slice(source.indexOf("const auClavier ="), source.indexOf("const auClic ="));
  const sortie = auClavier.indexOf("if (!ouvertes.length)");
  const premierPreventDefault = auClavier.indexOf("evenement.preventDefault()");

  assert.ok(sortie >= 0, "la garde « la liste est fermée » a disparu");
  assert.ok(sortie < premierPreventDefault,
    "une touche est interceptée avant d'avoir vérifié que la liste est ouverte");

  // Et les quatre touches sont nommées, pas devinées.
  for (const touche of ["Escape", "ArrowDown", "ArrowUp", "Enter"]) {
    assert.ok(auClavier.includes(`"${touche}"`), `touche absente : ${touche}`);
  }

  // **Tab n'est pas des leurs.** Il pose un cran de retrait ; la liste se
  // referme et le laisse passer. Le lui prendre créait un piège : la liste se
  // rouvre après chaque retrait, et un second Tab posait une proposition au
  // lieu du second cran.
  assert.match(auClavier, /if \(evenement\.key === "Tab"\) \{ fermer\(\); return; \}/);
});
