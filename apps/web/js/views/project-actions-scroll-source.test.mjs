import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const actionsPath = path.resolve(__dirname, "./project-actions.js");
const actionsSource = fs.readFileSync(actionsPath, "utf8");

test("renderProjectActions revient à la source de scroll document/window", () => {
  assert.match(actionsSource, /export function renderProjectActions\(root\)\s*\{[\s\S]*?clearProjectActiveScrollSource\(\);/);
});
