import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsPath = path.resolve(__dirname, "./project-subjects-events.js");
const eventsSource = fs.readFileSync(eventsPath, "utf8");

test("wireDetailsInteractive récupère reorderSubjectChildren pour le DnD des sous-sujets", () => {
  assert.match(
    eventsSource,
    /function wireDetailsInteractive\(root\)[\s\S]*?const reorderSubjectChildren = getReorderSubjectChildren\?\.\(\);/
  );
});

test("le handler drop protège l'appel reorderSubjectChildren", () => {
  assert.match(eventsSource, /typeof reorderSubjectChildren !== "function"/);
  assert.match(eventsSource, /await reorderSubjectChildren\(parentSubjectId, orderedChildIds, \{ root, skipRerender: false \}\);/);
});
