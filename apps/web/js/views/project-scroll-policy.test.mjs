import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylePath = path.resolve(__dirname, "../../style.css");
const styleSource = fs.readFileSync(stylePath, "utf8");

test("le CSS projet ne force pas globalement project-simple-scroll en overflow visible", () => {
  assert.doesNotMatch(styleSource, /body\.route--project\s+\.project-simple-scroll\s*\{[^}]*overflow\s*:\s*visible\s*;/s);
});
