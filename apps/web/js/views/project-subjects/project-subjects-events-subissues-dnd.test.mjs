import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsPath = path.resolve(__dirname, "./project-subjects-events.js");
const eventsSource = fs.readFileSync(eventsPath, "utf8");
const stylePath = path.resolve(__dirname, "../../../style.css");
const styleSource = fs.readFileSync(stylePath, "utf8");

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

test("le dragstart de sous-sujet est contrôlé par l'état dragFromHandle", () => {
  assert.match(eventsSource, /const dragFromHandle = row\.dataset\.subissueDragFromHandle === "true";/);
  assert.match(eventsSource, /if \(!dragFromHandle\) \{/);
});

test("le dragstart est armé par pointerdown sur le handle et utilise un drag preview dédié", () => {
  assert.match(eventsSource, /row\.dataset\.subissueDragFromHandle = event\.target\?\.closest\?\.\("\[data-subissue-drag-handle\]"\) \? "true" : "false";/);
  assert.match(eventsSource, /if \(!dragFromHandle\) \{/);
  assert.match(eventsSource, /dragPreviewNode = row\.cloneNode\(true\);/);
  assert.match(eventsSource, /dragPreviewNode\.classList\.remove\("is-subissue-dragging", "is-subissue-drag-gap", "is-subissue-drop-before", "is-subissue-drop-after"\);/);
  assert.match(eventsSource, /dragPreviewNode\.classList\.add\("subissue-drag-preview"\);/);
  assert.match(eventsSource, /event\.dataTransfer\.setDragImage\(dragPreviewNode, offsetX, offsetY\);/);
  assert.match(eventsSource, /row\.classList\.add\("is-subissue-dragging", "is-subissue-drag-gap"\);/);
});

test("le handle n'est visible qu'au survol/focus et le gap de drag affiche les traits bleus", () => {
  assert.match(styleSource, /\.subissue-drag-handle\{[\s\S]*opacity:0;[\s\S]*visibility:hidden;/);
  assert.match(styleSource, /\.subissues-sortable-row:hover \.subissue-drag-handle,[\s\S]*opacity:1;[\s\S]*visibility:visible;/);
  assert.match(styleSource, /\.subissues-sortable-row\.is-subissue-drag-gap > \*\{[\s\S]*visibility:hidden;/);
  assert.match(styleSource, /\.subissues-sortable-row\.is-subissue-drag-gap::before,[\s\S]*\.subissues-sortable-row\.is-subissue-drag-gap::after/);
  assert.match(styleSource, /\.subissues-sortable-row\.is-subissue-drag-gap::before\{top:0;\}/);
  assert.match(styleSource, /\.subissues-sortable-row\.is-subissue-drag-gap::after\{bottom:0;\}/);
  assert.match(styleSource, /\.subissue-drag-preview\{[\s\S]*background:var\(--bg\);[\s\S]*border-radius:var\(--radius\);[\s\S]*opacity:1;/);
  assert.match(styleSource, /\.subissue-drag-preview > \*\{[\s\S]*visibility:visible !important;/);
});

test("le dragover réordonne en direct avec animation FLIP pour faire la place d'une ligne", () => {
  assert.match(eventsSource, /const animateSubissueRowReflow = \(container, mutateDom\) => \{/);
  assert.match(eventsSource, /container\.insertBefore\(draggingRow, row\.nextElementSibling\);/);
  assert.match(eventsSource, /container\.insertBefore\(draggingRow, row\);/);
  assert.match(eventsSource, /item\.style\.transform = `translateY\(\$\{delta\}px\)`;/);
});
