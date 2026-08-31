import test from "node:test";
import assert from "node:assert/strict";

import { CSV_BOM, csvCell, toCsv } from "./csv.js";

test("le fichier s'ouvre par la BOM : sans elle, un tableur lit « rÃ©serve »", () => {
  assert.ok(toCsv([{ key: "a", label: "A" }], []).startsWith(CSV_BOM));
});

test("les colonnes se séparent au point-virgule : la virgule est un séparateur décimal", () => {
  const csv = toCsv([{ key: "a", label: "A" }, { key: "b", label: "B" }], [{ a: "0,85", b: "x" }]);
  assert.ok(csv.includes("0,85;x"));
});

test("une cellule qui porte le séparateur est mise entre guillemets", () => {
  assert.equal(csvCell("x;y"), '"x;y"');
});

test("un guillemet se double dans une cellule citée", () => {
  assert.equal(csvCell('a"b'), '"a""b"');
});

test("un saut de ligne ne coupe pas la ligne du fichier", () => {
  assert.equal(csvCell("a\nb"), '"a\nb"');
});

test("ce qui ressemble à une formule est neutralisé", () => {
  assert.equal(csvCell("=1+1"), "'=1+1");
  assert.equal(csvCell("+33 6"), "'+33 6");
  assert.equal(csvCell("@ici"), "'@ici");
});

test("un nombre négatif reste un nombre : le neutraliser en ferait du texte", () => {
  assert.equal(csvCell(-3), "-3");
  assert.equal(csvCell("-3,5"), "-3,5");
});

test("un tiret qui ouvre une phrase est neutralisé, lui", () => {
  assert.equal(csvCell("-cmd"), "'-cmd");
});

test("null et undefined s'écrivent vides, pas « null »", () => {
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
});

test("une clé absente de la ligne laisse une cellule vide, pas un décalage", () => {
  const csv = toCsv([{ key: "a", label: "A" }, { key: "b", label: "B" }], [{ a: "x" }]);
  assert.equal(csv.trimEnd().split("\r\n")[1], "x;");
});

test("les colonnes peuvent se déclarer par leur seul nom", () => {
  assert.ok(toCsv(["a", "b"], [{ a: 1, b: 2 }]).includes("a;b"));
});
