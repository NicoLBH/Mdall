import test from "node:test";
import assert from "node:assert/strict";

import { ENTRY, planBatch, summarizeDeposit } from "./document-batch.js";

/** Un fichier, réduit à ce que la répartition regarde. */
const file = (name, type = "") => ({ name, type });

test("un lot mêlé est réparti, et rien n'est refusé en silence", () => {
  const { accepted, rejected } = planBatch([
    file("RICT.pdf"),
    file("plan.dwg"),
    file("photo.jpg"),
    file("archive.zip"),
    file("notes.txt")
  ]);

  assert.deepEqual(accepted.map((entry) => entry.name), ["RICT.pdf", "plan.dwg", "photo.jpg", "archive.zip"]);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].file.name, "notes.txt");
  assert.equal(rejected[0].entry, ENTRY.UNSUPPORTED);
  // Le refus porte une phrase : un fichier écarté sans raison est un fichier perdu.
  assert.match(rejected[0].reason, /n'est pas accepté/);
});

test("une image sans extension connue passe par son type", () => {
  // Ce que l'écran promet dans son `accept`, l'entrée doit le tenir : `image/*`
  // y figure, donc une capture collée sans extension entre.
  const { accepted } = planBatch([file("capture", "image/png")]);

  assert.equal(accepted.length, 1);
});

test("l'extension est reconnue quelle que soit la casse", () => {
  const { accepted, rejected } = planBatch([file("RAPPORT.PDF"), file("Feuille.XlSx")]);

  assert.equal(accepted.length, 2);
  assert.deepEqual(rejected, []);
});

test("un lot vide ne produit rien, et surtout pas une erreur", () => {
  assert.deepEqual(planBatch([]), { accepted: [], rejected: [] });
  assert.deepEqual(planBatch(), { accepted: [], rejected: [] });
});

test("le compte rendu nomme chaque issue plutôt qu'une phrase invariable", () => {
  // L'écran annonçait « le dépôt a été enregistré » quoi qu'il advienne. Une
  // phrase qui ne varie pas ne renseigne sur rien.
  const bilan = summarizeDeposit([
    { entry: ENTRY.DEPOSITED, documentId: "u-1" },
    { entry: ENTRY.DEPOSITED, documentId: "u-2" },
    { entry: ENTRY.DUPLICATE, documentId: "u-9" },
    { entry: ENTRY.UNSUPPORTED },
    { entry: ENTRY.FAILED }
  ]);

  assert.equal(bilan.deposited, 2);
  assert.equal(bilan.duplicates, 1);
  assert.equal(bilan.unsupported, 1);
  assert.equal(bilan.failed, 1);
  assert.equal(bilan.message, "2 documents déposés, 1 déjà présent, 1 refusé, 1 en échec.");
  assert.equal(bilan.tone, "warning", "un échec doit se voir");
});

test("un doublon rend l'identifiant du document déjà présent", () => {
  // C'est ce qui permettra à l'analyse de porter sur le bon document plutôt que
  // d'ignorer un fichier que l'utilisateur croit avoir déposé.
  const bilan = summarizeDeposit([
    { entry: ENTRY.DEPOSITED, documentId: "u-1" },
    { entry: ENTRY.DUPLICATE, documentId: "u-9" }
  ]);

  assert.deepEqual(bilan.documentIds, ["u-1", "u-9"]);
});

test("un lot dont rien n'est entré n'est pas un succès", () => {
  const bilan = summarizeDeposit([{ entry: ENTRY.UNSUPPORTED }]);

  assert.equal(bilan.tone, "info");
  assert.equal(bilan.deposited, 0);
  assert.deepEqual(bilan.documentIds, []);
});

test("un lot entièrement déposé se dit au singulier quand il n'y en a qu'un", () => {
  const bilan = summarizeDeposit([{ entry: ENTRY.DEPOSITED, documentId: "u-1" }]);

  assert.equal(bilan.message, "1 document déposé.");
  assert.equal(bilan.tone, "success");
});

test("un dépôt sans rien à déposer le dit", () => {
  assert.equal(summarizeDeposit([]).message, "Aucun fichier à déposer.");
});
