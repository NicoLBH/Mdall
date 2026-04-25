import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viewSource = fs.readFileSync(path.resolve(__dirname, "./project-situations-view.js"), "utf8");

test("la liste principale des situations rend le bouton Nouvelle situation dans la même structure toolbar que Sujets", () => {
  assert.match(viewSource, /project-situations__table-toolbar project-page-shell project-page-shell--toolbar/);
  assert.match(viewSource, /project-table-toolbar project-table-toolbar--situations/);
  assert.match(viewSource, /project-table-toolbar__left/);
  assert.match(viewSource, /project-table-toolbar__right/);
  assert.match(viewSource, /project-table-toolbar__group/);
  assert.match(viewSource, /gh-action gh-action--single/);
  assert.match(viewSource, /class="gh-btn gh-action__main gh-btn--primary gh-btn--md" id="openCreateSituationButton"/);
});
