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
const indexPath = path.resolve(__dirname, "../../../index.html");
const indexSource = fs.readFileSync(indexPath, "utf8");

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
  assert.match(eventsSource, /const getNativeSubissueDragPreviewNodes = \(\) => \{/);
  assert.match(eventsSource, /const mountSubissueDragPreview = \(\{ row, rowRect, rowStyles, issuesCols, childSubjectId \}\) => \{/);
  assert.match(eventsSource, /const createSubissueDragCanvasPreview = \(\{ rowRect, rowStyles, title \}\) => \{/);
  assert.match(eventsSource, /const moveSubissueDragPreview = \(clientX, clientY\) => \{/);
  assert.match(eventsSource, /const isInsideSortableSubissuesContainer = \(target, container\) => \{/);
  assert.match(eventsSource, /const startGlobalSubissueDragTracking = \(\) => \{/);
  assert.match(eventsSource, /const previewRoot = document\.getElementById\("nativeDragPreviewRoot"\);/);
  assert.match(eventsSource, /const previewCard = document\.getElementById\("nativeDragPreviewCard"\);/);
  assert.match(eventsSource, /const previewRowClone = row\.cloneNode\(true\);/);
  assert.match(eventsSource, /previewCard\.innerHTML = "";/);
  assert.match(eventsSource, /const issuesCols = String\(rowStyles\.getPropertyValue\("--issues-cols"\) \|\| ""\)\.trim\(\);/);
  assert.match(eventsSource, /if \(issuesCols\) previewCard\.style\.setProperty\("--issues-cols", issuesCols\);/);
  assert.match(eventsSource, /previewCard\.style\.height = "48px";/);
  assert.match(eventsSource, /previewCard\.style\.overflow = "hidden";/);
  assert.match(eventsSource, /previewRowClone\.querySelectorAll\("button"\)\.forEach\(\(button\) => \{/);
  assert.match(eventsSource, /Array\.from\(previewRowClone\.children\)\.forEach\(\(child\) => \{/);
  assert.match(eventsSource, /previewCard\.appendChild\(child\.cloneNode\(true\)\);/);
  assert.match(eventsSource, /const resolveCssCustomProp = \(styles, name, fallback = ""\) => \{/);
  assert.match(eventsSource, /const previewBackgroundColor = resolveCssCustomProp\(rowStyles, "--bbg", resolveCssCustomProp\(rowStyles, "--bg", "#0d1117"\)\);/);
  assert.match(eventsSource, /const previewBorderColor = resolveCssCustomProp\(rowStyles, "--border", "rgba\(139,148,158,.35\)"\);/);
  assert.match(eventsSource, /const previewBorderRadius = resolveCssCustomProp\(rowStyles, "--radius", "6px"\);/);
  assert.match(eventsSource, /previewCard\.style\.gridTemplateColumns = issuesCols \|\| rowStyles\.gridTemplateColumns;/);
  assert.match(eventsSource, /previewCard\.style\.backgroundColor = previewBackgroundColor;/);
  assert.match(eventsSource, /previewCard\.style\.borderStyle = "solid";/);
  assert.match(eventsSource, /previewCard\.style\.borderWidth = "1px";/);
  assert.match(eventsSource, /previewCard\.style\.borderColor = previewBorderColor;/);
  assert.match(eventsSource, /previewCard\.style\.borderRadius = previewBorderRadius;/);
  assert.match(eventsSource, /previewCard\.style\.boxShadow = "0 14px 36px rgba\(1,4,9,.55\), 0 0 0 1px rgba\(1,4,9,.35\)";/);
  assert.match(eventsSource, /borderStyle: previewCard\.style\.borderStyle,/);
  assert.match(eventsSource, /borderWidth: previewCard\.style\.borderWidth,/);
  assert.match(eventsSource, /borderColor: previewCard\.style\.borderColor,/);
  assert.match(eventsSource, /boxShadow: previewCard\.style\.boxShadow,/);
  assert.match(eventsSource, /const previewPaintRect = previewCard\.getBoundingClientRect\(\);/);
  assert.match(eventsSource, /previewPaintRect: \{/);
  assert.match(eventsSource, /const canvasDragPreview = createSubissueDragCanvasPreview\(\{/);
  assert.match(eventsSource, /const dragImageNode = canvasDragPreview \|\| dragPreviewNode \|\| row;/);
  assert.match(eventsSource, /dragImageKind: canvasDragPreview \? "canvas" : \(dragPreviewNode \? "dom" : "row"\)/);
  assert.match(eventsSource, /dragPreviewOffsetX = offsetX;/);
  assert.match(eventsSource, /dragPreviewOffsetY = offsetY;/);
  assert.match(eventsSource, /if \(!canvasDragPreview && dragPreviewNode\) \{/);
  assert.match(eventsSource, /if \(previewRoot\) previewRoot\.classList\.add\("is-active"\);/);
  assert.match(eventsSource, /if \(previewRoot && dragPreviewNode\) \{/);
  assert.match(eventsSource, /moveSubissueDragPreview\(event\.clientX, event\.clientY\);/);
  assert.match(eventsSource, /if \(event\.dataTransfer\) event\.dataTransfer\.dropEffect = "none";/);
  assert.match(eventsSource, /if \(event\.dataTransfer\) event\.dataTransfer\.dropEffect = "move";/);
  assert.match(eventsSource, /event\.preventDefault\(\);/);
  assert.match(eventsSource, /startGlobalSubissueDragTracking\(\);/);
  assert.match(eventsSource, /event\.dataTransfer\.setDragImage\(dragImageNode, offsetX, offsetY\);/);
  assert.match(eventsSource, /usesVisibleDomPreviewHost: !canvasDragPreview && !!dragPreviewNode/);
  assert.match(eventsSource, /previewCard\.removeAttribute\("style"\);/);
  assert.match(eventsSource, /row\.classList\.add\("is-subissue-dragging", "is-subissue-drag-gap"\);/);
});

test("le handle n'est visible qu'au survol/focus et le gap de drag affiche les traits bleus", () => {
  assert.match(styleSource, /\.subissue-drag-handle\{[\s\S]*opacity:0;[\s\S]*visibility:hidden;/);
  assert.match(styleSource, /\.subissues-sortable-row:hover \.subissue-drag-handle,[\s\S]*opacity:1;[\s\S]*visibility:visible;/);
  assert.match(styleSource, /\.subissues-sortable-row\.is-subissue-drag-gap > \*\{[\s\S]*visibility:hidden;/);
  assert.match(styleSource, /\.subissues-sortable-row\.is-subissue-drag-gap::before,[\s\S]*\.subissues-sortable-row\.is-subissue-drag-gap::after/);
  assert.match(styleSource, /\.subissues-sortable-row\.is-subissue-drag-gap::before\{top:0;\}/);
  assert.match(styleSource, /\.subissues-sortable-row\.is-subissue-drag-gap::after\{bottom:0;\}/);
  assert.match(styleSource, /#nativeDragPreviewRoot\{[\s\S]*position:fixed;[\s\S]*pointer-events:none;/);
  assert.match(styleSource, /#nativeDragPreviewRoot\{[\s\S]*visibility:hidden;[\s\S]*opacity:0;/);
  assert.match(styleSource, /#nativeDragPreviewRoot\.is-active\{[\s\S]*visibility:visible;[\s\S]*opacity:1;/);
  assert.match(styleSource, /#nativeDragPreviewCard\{[\s\S]*text-overflow:ellipsis;[\s\S]*opacity:1;/);
});

test("le root de drag preview natif est déclaré dans index.html", () => {
  assert.match(indexSource, /<div id="nativeDragPreviewRoot" aria-hidden="true">/);
  assert.match(indexSource, /<div id="nativeDragPreviewCard"><\/div>/);
});

test("le dragover réordonne en direct avec animation FLIP pour faire la place d'une ligne", () => {
  assert.match(eventsSource, /const animateSubissueRowReflow = \(container, mutateDom\) => \{/);
  assert.match(eventsSource, /moveSubissueDragPreview\(event\.clientX, event\.clientY\);/);
  assert.match(eventsSource, /document\.addEventListener\("dragover", onDocumentDragOver, true\);/);
  assert.match(eventsSource, /document\.removeEventListener\("dragover", onDocumentDragOver, true\);/);
  assert.match(eventsSource, /container\.insertBefore\(draggingRow, row\.nextElementSibling\);/);
  assert.match(eventsSource, /container\.insertBefore\(draggingRow, row\);/);
  assert.match(eventsSource, /item\.style\.transform = `translateY\(\$\{delta\}px\)`;/);
});

test("le drag replie toute l'arborescence puis restitue l'état d'ouverture initial", () => {
  assert.match(eventsSource, /const collapseSubissueTreeForDrag = \(container\) => \{/);
  assert.match(eventsSource, /const expandedSnapshot = Array\.from\(subissuesExpandedSet\);/);
  assert.match(eventsSource, /subissuesExpandedSet\.clear\(\);/);
  assert.match(eventsSource, /\.filter\(\(item\) => item\.dataset\.subissueSortableRow !== "true"\)/);
  assert.match(eventsSource, /const restoreExpandedSubissueTreeAfterDrag = \(expandedSnapshot = \[\]\) => \{/);
  assert.match(eventsSource, /restoreExpandedSubissueTreeAfterDrag\(draggedSubissueContext\?\.expandedSnapshot \|\| \[\]\);/);
  assert.match(eventsSource, /draggedSubissueContext = \{\s*childSubjectId,\s*expandedSnapshot,\s*dropCommitted: false\s*\};/);
});

test("le dragend persiste l'ordre même sans drop explicite", () => {
  assert.match(eventsSource, /const shouldCommitOrderOnDragEnd = dndContext && !dndContext\.dropCommitted;/);
  assert.match(eventsSource, /await reorderSubjectChildren\(parentSubjectId, orderedChildIds, \{ root, skipRerender: false \}\);/);
});

test("l'instrumentation DnD est activable via query/localStorage", () => {
  assert.match(eventsSource, /function isSubissuesDndDebugEnabled\(\)/);
  assert.match(eventsSource, /debugSubissuesDnd=1/);
  assert.match(eventsSource, /mdall:debug-subissues-dnd/);
  assert.match(eventsSource, /sessionStorage/);
  assert.match(eventsSource, /__MDALL_DEBUG_SUBISSUES_DND__/);
  assert.match(eventsSource, /console\.log\("\[subissues-dnd\]"/);
  assert.match(eventsSource, /debugSubissuesDnd\("dragstart-preview"/);
  assert.match(eventsSource, /debugSubissuesDnd\("debug-enabled"/);
});
