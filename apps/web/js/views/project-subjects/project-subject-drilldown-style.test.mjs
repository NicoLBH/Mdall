import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stylePath = path.resolve(__dirname, "../../../style.css");
const styleCss = fs.readFileSync(stylePath, "utf8");

test("drilldown compact header keeps container width", () => {
  assert.match(
    styleCss,
    /\.drilldown__head\.details-head--compact\s*\{\s*width:\s*100%;\s*margin-left:\s*0;\s*margin-right:\s*0;\s*\}/m
  );
});
