import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viewPath = path.resolve(__dirname, "../project-subjects.js");
const viewSource = fs.readFileSync(viewPath, "utf8");

const subjectParentServiceImportPattern = /from\s+"\.\.\/services\/subject-parent-relation-service\.js";/g;

test("project-subjects importe le service parent/enfant une seule fois", () => {
  const imports = viewSource.match(subjectParentServiceImportPattern) ?? [];
  assert.equal(imports.length, 1);
});

test("project-subjects utilise les alias de service attendus", () => {
  assert.match(viewSource, /setSubjectParentRelationInSupabase\s+as\s+setSubjectParentRelationInSupabaseService/);
  assert.match(viewSource, /reorderSubjectChildrenInSupabase\s+as\s+reorderSubjectChildrenInSupabaseService/);
});
