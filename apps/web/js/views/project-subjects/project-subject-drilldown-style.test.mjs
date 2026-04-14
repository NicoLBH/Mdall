import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stylePath = path.resolve(__dirname, "../../../style.css");
const styleCss = fs.readFileSync(stylePath, "utf8");

test("le head compact normal du sujet reste en full-bleed viewport", () => {
  assert.match(
    styleCss,
    /#situationsDetailsTitle\.details-head--compact\s*\{[^}]*width:\s*100vw;[^}]*margin-left:\s*calc\(50%\s*-\s*50vw\);[^}]*margin-right:\s*calc\(50%\s*-\s*50vw\);/m
  );
});

test("le drilldown est ancré avec un offset CSS dédié", () => {
  assert.match(
    styleCss,
    /#drilldownPanel\s*\{\s*top:\s*var\(--subject-drilldown-top-offset,\s*0px\);\s*\}/m
  );
});

test("le drilldown suit les seuils largeur 1265/770 et fallback mobile <= 770", () => {
  assert.match(
    styleCss,
    /--subject-drilldown-max:\s*1265px;\s*--subject-drilldown-min:\s*770px;\s*--subject-drilldown-fluid-offset:\s*161px;/m
  );
  assert.match(
    styleCss,
    /\.drilldown__inner\s*\{[^}]*width:\s*min\(\s*var\(--subject-drilldown-max\),\s*max\(var\(--subject-drilldown-min\),\s*calc\(100vw - var\(--subject-drilldown-fluid-offset\)\)\)\s*\);/m
  );
  assert.match(
    styleCss,
    /@media\s*\(max-width:\s*770px\)\s*\{[^}]*\.drilldown__inner\s*\{[^}]*width:\s*100vw;[^}]*max-width:\s*100vw;[^}]*border-left:\s*none;/m
  );
});

test("le détail sujet garde aside 296 puis 256 avant empilement sous 770", () => {
  assert.match(
    styleCss,
    /\.subject-details-shell \.details-grid\{display:grid;grid-template-columns:minmax\(0, 1fr\) 296px;/m
  );
  assert.match(
    styleCss,
    /@container\s*\(max-width:\s*1012px\)\s*\{\s*\.subject-details-shell \.details-grid\{grid-template-columns:minmax\(0, 1fr\) 256px;\}\s*\}/m
  );
  assert.match(
    styleCss,
    /@container\s*\(max-width:\s*769px\)\s*\{\s*\.subject-details-shell \.details-grid\{grid-template-columns:1fr;\}\s*\}/m
  );
});
