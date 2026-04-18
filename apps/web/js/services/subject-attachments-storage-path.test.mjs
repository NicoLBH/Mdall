import test from "node:test";
import assert from "node:assert/strict";

import { normalizeSubjectAttachmentStoragePath } from "./subject-attachments-storage-path.js";

test("garde un chemin déjà canonique inchangé", () => {
  const value = "project-1/subject-2/temporary/session/file.pdf";
  assert.equal(normalizeSubjectAttachmentStoragePath(value, "subject-message-attachments"), value);
});

test("supprime un slash initial", () => {
  assert.equal(
    normalizeSubjectAttachmentStoragePath("/project-1/subject-2/temporary/file.pdf", "subject-message-attachments"),
    "project-1/subject-2/temporary/file.pdf"
  );
});

test("retire un préfixe bucket injecté dans le storage_path", () => {
  assert.equal(
    normalizeSubjectAttachmentStoragePath(
      "subject-message-attachments/project-1/subject-2/temporary/file.pdf",
      "subject-message-attachments"
    ),
    "project-1/subject-2/temporary/file.pdf"
  );
});

test("réduit les doubles slashs accidentels", () => {
  assert.equal(
    normalizeSubjectAttachmentStoragePath("project-1//subject-2///temporary/file.pdf", "subject-message-attachments"),
    "project-1/subject-2/temporary/file.pdf"
  );
});

test("supprime espaces et caractères invisibles en bord", () => {
  assert.equal(
    normalizeSubjectAttachmentStoragePath("\uFEFF  /project-1/subject-2/file.pdf\u200B ", "subject-message-attachments"),
    "project-1/subject-2/file.pdf"
  );
});
