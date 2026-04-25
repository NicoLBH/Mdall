import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.resolve(__dirname, "./select-dropdown-controller.js"), "utf8");

test("renderSelectDropdownHost peut résoudre le sujet explicite pour le dropdown kanban", () => {
  assert.match(source, /const explicitKanbanSubjectId = String\(kanbanDropdown\.subjectId \|\| ""\)\.trim\(\)/);
  assert.match(source, /: explicitKanbanSubject\s*\? \{ type: "sujet", item: explicitKanbanSubject \}/s);
});
