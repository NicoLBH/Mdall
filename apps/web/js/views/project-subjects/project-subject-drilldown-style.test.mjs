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

test("le drilldown suit une largeur responsive type issues avec fallback mobile full width", () => {
  assert.match(
    styleCss,
    /--subject-drilldown-responsive-width:\s*66\.6667vw;\s*--subject-drilldown-responsive-min:\s*640px;/m
  );
  assert.match(
    styleCss,
    /\.drilldown__inner\s*\{[^}]*width:\s*min\(\s*var\(--subject-details-content-max\),\s*max\(var\(--subject-drilldown-responsive-min\),\s*var\(--subject-drilldown-responsive-width\)\)\s*\);/m
  );
  assert.match(
    styleCss,
    /@media\s*\(max-width:\s*767px\)\s*\{[^}]*\.drilldown__inner\s*\{[^}]*width:\s*100vw;[^}]*max-width:\s*100vw;[^}]*border-left:\s*none;/m
  );
});
