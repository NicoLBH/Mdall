import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const controllerPath = path.resolve(__dirname, "./project-subject-drilldown.js");
const controllerSource = fs.readFileSync(controllerPath, "utf8");

test("updateDrilldownPanel ne rebinde pas le scroll compact normal sur document", () => {
  assert.match(controllerSource, /bindDetailsScroll\(panel\);/);
  assert.doesNotMatch(controllerSource, /bindDetailsScroll\(document\);/);
});
