import test from "node:test";
import assert from "node:assert/strict";

import { findGlobalClearances, findLiftingStatements, indexStatements } from "./lifting.mjs";

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

test("le rapport final clôt le dossier d'une phrase, et cette phrase est lisible", () => {
  // Page 14 d'un rapport final réel : le titre de la section dit l'inverse de
  // la phrase qui le suit, et il n'a pas de point final.
  const [clearance] = findGlobalClearances({
    source_id: "rapport-final",
    content_available: true,
    pages: [
      {
        page: 14,
        text: [
          "4. AVIS, QUI A LA CONNAISSANCE DE SOCOTEC, N’ONT PAS ETE SUIVIS",
          "D’EFFETS",
          "À notre connaissance, l'ensemble des avis que nous avons émis dans le cadre de notre mission au",
          "cours de l'opération ont été suivis d'effet."
        ].join("\n")
      }
    ]
  });

  assert.equal(clearance.scope, "ALL_AVIS");
  assert.equal(clearance.source_page, 14);
  assert.ok(
    clearance.sentence.startsWith("À notre connaissance"),
    "la citation ne doit pas commencer par le titre qui la contredit"
  );
  assert.ok(!clearance.sentence.includes("N’ONT PAS"));
});

test("une phrase qui dit l'inverse n'est pas une clôture", () => {
  const found = findGlobalClearances({
    source_id: "rapport-final",
    content_available: true,
    pages: [{ page: 1, text: "L'ensemble des avis que nous avons émis n’ont pas été suivis d’effet." }]
  });

  assert.deepEqual(found, [], "la négation est à deux mots de la formulation recherchée");
});

test("le titre de section seul ne clôt rien", () => {
  const found = findGlobalClearances({
    source_id: "rapport-final",
    content_available: true,
    pages: [{ page: 14, text: "4. AVIS, QUI A LA CONNAISSANCE DE SOCOTEC, N’ONT PAS ETE SUIVIS D’EFFETS" }]
  });

  assert.deepEqual(found, []);
});

test("aucune clôture n'est lue dans un document sans texte", () => {
  assert.deepEqual(findGlobalClearances({ source_id: "scan", content_available: false }), []);
});
