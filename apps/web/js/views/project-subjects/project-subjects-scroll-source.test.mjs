import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const subjectsViewPath = path.resolve(__dirname, "./project-subjects-view.js");
const subjectsViewSource = fs.readFileSync(subjectsViewPath, "utf8");
const subjectsEntryPath = path.resolve(__dirname, "../project-subjects.js");
const subjectsEntrySource = fs.readFileSync(subjectsEntryPath, "utf8");

test("la vue Sujets réinitialise la source de scroll active pour revenir au document", () => {
  assert.match(subjectsViewSource, /clearProjectActiveScrollSource\?\.\(\);/);
});

test("la vue Sujets garde le compactage projet activé dans rerenderPanels", () => {
  assert.match(subjectsViewSource, /setProjectCompactEnabled\(true\);/);
  assert.doesNotMatch(subjectsViewSource, /setProjectCompactEnabled\(!shouldDisableProjectCompact\);/);
});

test("la page Sujets ne rend plus le conteneur scrollable projectSituationsScroll", () => {
  assert.doesNotMatch(subjectsEntrySource, /id="projectSituationsScroll"/);
});
