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

test("project-shell__body n'applique pas overflow hidden par défaut", () => {
  assert.match(styleSource, /\.project-shell__body\s*\{[\s\S]*?overflow\s*:\s*visible\s*;/);
});

test("project-shell__content n'applique pas overflow hidden par défaut", () => {
  assert.match(styleSource, /\.project-shell__content\s*\{[\s\S]*?overflow\s*:\s*visible\s*;/);
});

test("project-simple-page n'impose pas height:100% globalement", () => {
  assert.match(styleSource, /\.project-simple-page\s*\{[\s\S]*?height\s*:\s*auto\s*;/);
});

test("la vue Situations conserve le overflow hidden ciblé pour le kanban", () => {
  assert.match(styleSource, /\.project-shell__content--situation-kanban\s*\{[\s\S]*?overflow\s*:\s*hidden\s*;/);
});

test("la vue Situations conserve le overflow hidden ciblé pour project-simple-scroll--situation-view", () => {
  assert.match(styleSource, /\.project-simple-scroll(?:\.project-simple-scroll--situation-view|--situation-view)\s*\{[\s\S]*?overflow\s*:\s*hidden\s*;/);
});
