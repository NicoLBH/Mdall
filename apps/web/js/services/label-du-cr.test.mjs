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

/* ── Les labels de qualification ─────────────────────────────────────────── */

/**
 * Chaque label dit ce qu'il veut dire.
 *
 * **La comparaison avec la liste du serveur ne se fait pas ici** : aucun fichier
 * servi au navigateur ne remonte vers `supabase/functions/`, tests compris, et
 * `scripts/verifie-cloison.test.mjs` y veille. Elle vit du côté serveur, qui a
 * le droit de regarder en bas.
 */
test("chaque label de qualification a sa définition", async () => {
  const { LABELS_DE_QUALIFICATION, LABELS_DU_CR, QUOI_DU_LABEL } = await import("./label-du-cr.js");

  for (const nom of LABELS_DE_QUALIFICATION) {
    assert.ok(QUOI_DU_LABEL[nom], `« ${nom} » n'a pas de définition`);
  }

  assert.deepEqual(LABELS_DU_CR, [LABEL_DU_CR, ...LABELS_DE_QUALIFICATION]);
});

/** « CR chantier » est la marque d'origine : tout point venu d'un CR la porte. */
test("le label d'origine se pose sur tous les points, les autres non", async () => {
  const { labelsAProposer } = await import("./label-du-cr.js");

  const { poses } = labelsAProposer(
    [{ labels: ["Urgent"] }, { labels: [] }, { labels: ["urgent", "Rappel"] }],
    []
  );

  const compte = Object.fromEntries(poses.map((label) => [label.nom, label.points]));
  assert.equal(compte[LABEL_DU_CR], 3);
  assert.equal(compte.Urgent, 2);
  assert.equal(compte.Rappel, 1);
  // Un label qu'aucun point ne porte ne s'affiche pas : un « 0 » ferait du bruit.
  assert.equal(compte["Information générale"], undefined);
});

/** La seconde porte : ce qui n'est pas dans la liste ne compte pas. */
test("un label hors liste ne se compte pas, même arrivé jusqu'ici", async () => {
  const { labelsAProposer } = await import("./label-du-cr.js");

  const { poses } = labelsAProposer([{ labels: ["Prioritaire", "À traiter vite"] }], []);
  assert.deepEqual(poses.map((label) => label.nom), [LABEL_DU_CR]);
});

/**
 * **Vide quand on ne sait pas**, et non « tous à créer » : annoncer la création
 * d'un label qui existe déjà ferait promettre ce qui n'aura pas lieu (règle 5).
 */
test("sans les labels du projet, on n'annonce aucune création", async () => {
  const { labelsAProposer } = await import("./label-du-cr.js");

  const inconnu = labelsAProposer([{ labels: ["Urgent"] }], null);
  assert.equal(inconnu.connu, false);
  assert.deepEqual(inconnu.aCreer, []);
  assert.equal(inconnu.poses.length, 2, "les labels se comptent quand même");

  const connu = labelsAProposer([{ labels: ["Urgent"] }], [{ name: "urgent" }]);
  assert.equal(connu.connu, true);
  assert.deepEqual(connu.aCreer, [LABEL_DU_CR]);
});
