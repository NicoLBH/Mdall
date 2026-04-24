import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const insightsPath = path.resolve(__dirname, "./project-insights.js");
const insightsSource = fs.readFileSync(insightsPath, "utf8");

test("renderProjectInsights revient à la source de scroll document/window", () => {
  assert.match(insightsSource, /export function renderProjectInsights\(root\)\s*\{[\s\S]*?clearProjectActiveScrollSource\(\);/);
});
