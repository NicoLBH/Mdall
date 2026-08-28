import test from "node:test";
import assert from "node:assert/strict";

import { encodeStoragePath, sanitizeFileName } from "./storage-path.js";

test("un nom de fichier déjà sûr traverse sans être touché", () => {
  // Le point qui compte pour l'existant : les chemins déjà déposés ne doivent
  // pas changer de forme, sinon on ne retrouve plus les documents d'hier.
  assert.equal(sanitizeFileName("RICT_v4-2025.pdf"), "RICT_v4-2025.pdf");
});

test("accents, espaces et ponctuation deviennent des tirets", () => {
  assert.equal(sanitizeFileName("Rapport d'étape n°2.pdf"), "Rapport-d-etape-n-2.pdf");
  assert.equal(sanitizeFileName("a  b"), "a-b", "les tirets ne s'accumulent pas");
  assert.equal(sanitizeFileName("—rapport—"), "rapport", "ni en tête ni en fin");
});

test("un nom qui ne laisse rien reçoit un nom", () => {
  assert.equal(sanitizeFileName("###"), "document.pdf");
  assert.equal(sanitizeFileName(""), "document.pdf");
  assert.equal(sanitizeFileName(null), "document.pdf");
});

test("les séparateurs de chemin restent des séparateurs", () => {
  // Encoder le chemin entier ferait de `/` un `%2F`, qui désigne un tout autre
  // objet dans le stockage : le fichier serait déclaré introuvable.
  assert.equal(encodeStoragePath("u/p/scope/fichier.pdf"), "u/p/scope/fichier.pdf");
});

test("un segment hostile est encodé, pas le chemin", () => {
  assert.equal(encodeStoragePath("u/p/mon dossier/a#b.pdf"), "u/p/mon%20dossier/a%23b.pdf");
  assert.equal(encodeStoragePath(""), "");
});
