import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const eventsPath = path.resolve(__dirname, "./project-subjects-events.js");
const eventsSource = fs.readFileSync(eventsPath, "utf8");

test("le compact du header détail principal est piloté par le scroll du body détail", () => {
  assert.match(eventsSource, /const normalDetailsBody = root\.querySelector\("#situationsDetailsHost"\);/);
  assert.match(eventsSource, /normalDetailsBody \|\| \(normalDetailsHead \? document : null\)/);
});
