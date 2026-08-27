import test from "node:test";
import assert from "node:assert/strict";

import { findLiftingStatements, indexStatements } from "./lifting.mjs";

function source(text, { pages = null } = {}) {
  return pages
    ? { source_id: "doc", pages, content: pages.map((p) => p.text).join("\n"), content_available: true }
    : { source_id: "doc", content: text, content_available: true };
}

test("« L'avis 171 est levé » est reconnu, accent compris", () => {
  const [statement] = findLiftingStatements(source("L'avis 171 est levé."));

  assert.equal(statement.reference_raw, "171");
  assert.equal(statement.sentence, "L'avis 171 est levé.");
});

test("l'apostrophe typographique et le n° sont acceptés", () => {
  assert.equal(findLiftingStatements(source("L’avis n° 56 est levée"))[0].reference_raw, "56");
  assert.equal(findLiftingStatements(source("Avis n° 47 levé"))[0].reference_raw, "47");
});

test("une phrase peut lever plusieurs avis", () => {
  const refs = findLiftingStatements(source("Les avis 12, 13 et 14 sont levés.")).map((s) => s.reference_raw);

  assert.deepEqual(refs, ["12", "13", "14"]);
});

test("sans numéro explicite, rien n'est produit", () => {
  for (const text of [
    "Cet avis sera levé après réception du PV",
    "observation levée ce jour",
    "L'ensemble des réserves est levé",
    "les avis suspendus seront levés"
  ]) {
    assert.deepEqual(findLiftingStatements(source(text)), [], text);
  }
});

test("la page est conservée pour que la preuve soit citable", () => {
  const [statement] = findLiftingStatements(
    source(null, {
      pages: [
        { page: 1, text: "Rien ici." },
        { page: 4, text: "Suite au contrôle : L'avis 100 est levé." }
      ]
    })
  );

  assert.equal(statement.source_page, 4);
  assert.match(statement.sentence, /L'avis 100 est levé/);
});

test("une source sans contenu ne produit rien", () => {
  assert.deepEqual(findLiftingStatements({ source_id: "x", content_available: false }), []);
});

test("une même déclaration répétée sur une page n'est comptée qu'une fois", () => {
  const statements = findLiftingStatements(
    source(null, { pages: [{ page: 1, text: "L'avis 56 est levé.\nL'avis 56 est levé." }] })
  );

  assert.equal(statements.length, 1);
});

test("indexStatements permet de rattacher une preuve à un document et un numéro", () => {
  const index = indexStatements(findLiftingStatements(source("L'avis 56 est levé. L'avis 57 est levé.")));

  assert.equal(index.get("doc:56").length, 1);
  assert.equal(index.get("doc:57").length, 1);
  assert.equal(index.get("doc:99"), undefined);
});
