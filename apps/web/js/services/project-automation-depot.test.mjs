import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * L'automatisation périmée est partie, et elle doit le rester.
 *
 * ## Pourquoi un test là-dessus
 *
 * « Déclencher l'analyse IA des sujets après le dépôt d'un document » produisait
 * des sujets **à partir d'un PDF, sans proposition**. Elle contournait la
 * règle 1 — rien n'entre directement — et c'est la seule raison pour laquelle
 * elle s'en va : ce n'est pas un nettoyage, c'est une doctrine.
 *
 * Un chemin qui contourne une règle se réintroduit facilement, parce qu'il est
 * commode. Ce test lit les fichiers plutôt que d'appeler du code : ce qu'on veut
 * empêcher n'est pas un comportement, c'est **l'existence** du raccourci.
 */

const lire = (chemin) => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");

test("le réglage qui déclenchait l'analyse au dépôt n'existe plus", () => {
  const catalogue = lire("./project-automation.js");

  assert.doesNotMatch(catalogue, /autoAnalysisAfterUpload\s*:/, "le catalogue le porte encore");
  assert.doesNotMatch(catalogue, /export function shouldAutoRunAnalysisAfterUpload/);
});

test("le dépôt d'un document ne déclenche plus rien tout seul", () => {
  const depot = lire("../views/project-documents.js");

  assert.doesNotMatch(depot, /triggerAnalysisAfterDeposit\(/, "l'appel est encore là");
  assert.doesNotMatch(depot, /\brunAnalysis\s*\(/, "le dépôt appelle encore l'ancienne pipeline");
});

/**
 * La distinction qui compte, et qu'il serait facile de rater : ce qui disparaît
 * est le **déclenchement automatique au dépôt**, pas l'écran d'analyse.
 * `runAnalysis` reste joignable à la main, et le confondre avec l'autre aurait
 * retiré le seul chemin qui marchait encore.
 */
test("l'analyse reste joignable à la main", () => {
  const moteur = lire("./analysis-runner.js");
  assert.match(moteur, /export (?:async )?function runAnalysis/);
});

test("le bouton d'analyse n'a plus d'état « automatique »", () => {
  const barre = lire("../views/project-situations-runbar.js");

  // Un bouton grisé par un réglage qui n'existe plus serait la pire trace qu'on
  // puisse en laisser : on chercherait longtemps comment le réactiver.
  assert.doesNotMatch(barre, /shouldAutoRunAnalysisAfterUpload/);
  assert.doesNotMatch(barre, /mode automatique/i);
});

test("les Paramètres ne décrivent plus une case qui n'existe plus", () => {
  const ecran = lire("../views/project-parametres/project-parametres-automatisations.js");
  assert.doesNotMatch(ecran, /autoAnalysisAfterUpload/);
});

/* ── Ce qui la remplace ──────────────────────────────────────────────────── */

/**
 * Retirer sans remplacer aurait laissé le dépôt exactement là où il était :
 * sans effet. L'aiguillage est la contrepartie, et il doit exister pour que le
 * retrait soit autre chose qu'une amputation.
 */
test("l'aiguillage existe, et il connaît les deux familles", () => {
  const analyse = lire("./proposition-analysis.js");

  assert.match(analyse, /const CT_REPORT_KIND = "ct_report"/);
  assert.match(analyse, /const CR_CHANTIER_KIND = "cr_chantier"/);
});

test("le compte rendu de chantier est au catalogue des reconnaisseurs", () => {
  const catalogue = lire("./document-recognizers.js");
  assert.match(catalogue, /createCrChantierRecognizer\(\)/);
});
