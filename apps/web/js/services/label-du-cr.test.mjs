import test from "node:test";
import assert from "node:assert/strict";

import { LABEL_DU_CR, labelDuCrDansLeProjet, memeLabel, phraseDuLabel } from "./label-du-cr.js";

/**
 * **Un nom vit à un seul endroit.** Recopié dans l'écran, dans le filtre et
 * dans la situation, il existerait en trois versions — « CR chantier »,
 * « CR Chantier », « CR de chantier » — et le filtre ne trouverait plus rien
 * (règle 10).
 */
test("le nom du label est écrit une seule fois", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const ecran = readFileSync(
    fileURLToPath(new URL("../views/studio/dev/lecture-des-cr.js", import.meta.url)), "utf8"
  );

  // Les commentaires ont le droit de le citer : ils expliquent, ils n'affichent
  // rien. Ce qui ne doit pas le réécrire, c'est le code.
  const code = ecran
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");

  assert.doesNotMatch(code, /CR chantier/, "l'écran réécrit le nom du label au lieu de l'importer");
  assert.match(code, /LABEL_DU_CR/);
});

test("deux écritures du même label se reconnaissent", () => {
  assert.equal(memeLabel("CR chantier", "cr chantier"), true);
  assert.equal(memeLabel("CR  chantier", "CR chantier"), true);
  assert.equal(memeLabel("CR chantier", "CR de chantier"), false);
  assert.equal(memeLabel("", "CR chantier"), false);
});

/**
 * **Ne pas savoir n'est pas « il n'y est pas ».** La seconde phrase annoncerait
 * une création qui n'aura peut-être pas lieu (règle 5).
 */
test("ne pas avoir lu les labels ne se dit pas comme une absence", () => {
  const inconnu = labelDuCrDansLeProjet(null);
  const absent = labelDuCrDansLeProjet([]);
  const present = labelDuCrDansLeProjet([{ name: "CR CHANTIER", id: "l-1" }]);

  assert.deepEqual(
    [inconnu.connu, absent.connu, present.connu],
    [false, true, true]
  );
  assert.equal(present.label.id, "l-1");

  assert.match(phraseDuLabel(inconnu), /n'ont pas pu être lus/);
  assert.match(phraseDuLabel(absent), /créerait/);
  assert.match(phraseDuLabel(present), /existe déjà/);

  // Les trois phrases nomment le label, et aucune ne dit la même chose.
  const dites = [inconnu, absent, present].map(phraseDuLabel);
  assert.equal(new Set(dites).size, 3);
  for (const dite of dites) assert.match(dite, new RegExp(LABEL_DU_CR));
});

/** Poser un label est une écriture : elle passe par une proposition (règle 1). */
test("connaître le label n'en crée aucun", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const source = readFileSync(fileURLToPath(new URL("./label-du-cr.js", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /fetch\(|import\(|createLabel|addLabelToSubject/);
});
