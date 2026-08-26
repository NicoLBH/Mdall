import test from "node:test";
import assert from "node:assert/strict";

import {
  CONTINUITY_STATE,
  MATCH_METHOD,
  OPINION_CHANGE,
  buildContinuity,
  buildExperimentalSuggestions,
  compareOpinions
} from "./continuity.mjs";
import { extractOccurrences } from "./extraction.mjs";

/** Construit la suite de documents à partir de lignes brutes, comme le pipeline. */
function documents(entries) {
  return entries.map(([id, text]) => {
    const source = { source_id: id, content_available: true, content: text, pages: null };
    return { source, occurrences: extractOccurrences(source).occurrences };
  });
}

function itemFor(items, documentId, reference) {
  return items.find((item) => item.document_id === documentId && item.reference === reference);
}

test("cas 1 — même numéro, même avis : MATCHED et UNCHANGED", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 65 : Favorable — étanchéité conforme."],
      ["b", "Avis n° 65 : Favorable — étanchéité conforme."]
    ])
  );

  const second = itemFor(items, "b", "65");
  assert.equal(second.state, CONTINUITY_STATE.MATCHED);
  assert.equal(second.opinion_change, OPINION_CHANGE.UNCHANGED);
  assert.equal(second.previous_document_id, "a");
  assert.equal(second.match_method, MATCH_METHOD.EXACT_RAW);
});

test("un texte reformulé ne change pas l'avis, et la reformulation reste visible", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 66 : Favorable — étanchéité de toiture conforme au descriptif."],
      ["b", "Avis n° 66 : Favorable — étanchéité conforme, sans observation nouvelle."]
    ])
  );

  const second = itemFor(items, "b", "66");
  assert.equal(second.opinion_change, OPINION_CHANGE.UNCHANGED);
  assert.equal(second.description_changed, true);
});

test("cas 2 — même numéro, avis différent : MATCHED et CHANGED", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 65 : À préciser — note de calcul attendue."],
      ["b", "Avis n° 65 : Défavorable — note de calcul non conforme."]
    ])
  );

  const second = itemFor(items, "b", "65");
  assert.equal(second.state, CONTINUITY_STATE.MATCHED);
  assert.equal(second.opinion_change, OPINION_CHANGE.CHANGED);
});

test("un avis favorable après un avis défavorable est une transition comme une autre", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 65 : Défavorable — non justifié."],
      ["b", "Avis n° 65 : Favorable — PV reçu."]
    ])
  );

  assert.equal(itemFor(items, "b", "65").opinion_change, OPINION_CHANGE.CHANGED);
});

test("cas 3 — avis nouveau : NEW, sans document précédent", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 65 : Favorable — texte."],
      ["b", "Avis n° 65 : Favorable — texte.\nAvis n° 68 : À préciser — nouveau sujet."]
    ])
  );

  const item = itemFor(items, "b", "68");
  assert.equal(item.state, CONTINUITY_STATE.NEW);
  assert.equal(item.previous_document_id, null);
  assert.equal(item.opinion_change, null);
});

test("cas 4 — avis absent du rapport suivant : NOT_FOUND, jamais une levée", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 67 : Défavorable — désenfumage non justifié."],
      ["b", "Avis n° 65 : Favorable — autre sujet."]
    ])
  );

  const item = itemFor(items, "b", "67");
  assert.equal(item.state, CONTINUITY_STATE.NOT_FOUND);
  assert.equal(item.previous_document_id, "a");
  assert.equal(item.opinion_change, null, "une absence ne dit rien de l'évolution de l'avis");
  assert.equal(item.derived_from_absence, true);
  assert.notEqual(item.state, "CLOSED");
});

test("une absence répétée reste une absence, et cite toujours la dernière lecture", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 67 : Défavorable — texte."],
      ["b", "Avis n° 65 : Favorable — autre."],
      ["c", "Avis n° 65 : Favorable — autre."]
    ])
  );

  for (const documentId of ["b", "c"]) {
    const item = itemFor(items, documentId, "67");
    assert.equal(item.state, CONTINUITY_STATE.NOT_FOUND);
    assert.equal(item.previous_document_id, "a");
  }
});

test("cas 6 — référence ambiguë : AMBIGUOUS, aucune continuité affirmée", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 69 : Défavorable — garde-corps."],
      ["b", "Avis n° 69 : Défavorable — garde-corps.\nAvis n° 69 : À préciser — calepinage."]
    ])
  );

  const item = itemFor(items, "b", "69");
  assert.equal(item.state, CONTINUITY_STATE.AMBIGUOUS);
  assert.equal(item.confidence, null);
  assert.equal(item.opinion_change, null);
  assert.equal(item.candidates.length, 2);
});

test("après une lecture ambiguë, un NOT_FOUND garde une preuve citable", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 69 : Défavorable — première.\nAvis n° 69 : À préciser — seconde."],
      ["b", "Avis n° 65 : Favorable — autre."]
    ])
  );

  const item = itemFor(items, "b", "69");
  assert.equal(item.state, CONTINUITY_STATE.NOT_FOUND);
  assert.equal(item.previous_document_id, "a");
  assert.ok(item.last_seen_occurrence, "l'absence doit pouvoir montrer où l'avis avait été lu");
});

test("cas 5 — deux numéros proches ne fusionnent jamais", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 65 : Défavorable — a."],
      ["b", "Avis n° 65.1 : Favorable — b.\nAvis n° 651 : Favorable — c."]
    ])
  );

  assert.equal(itemFor(items, "b", "65-1").state, CONTINUITY_STATE.NEW);
  assert.equal(itemFor(items, "b", "651").state, CONTINUITY_STATE.NEW);
  assert.equal(itemFor(items, "b", "65").state, CONTINUITY_STATE.NOT_FOUND);
});

test("cas 7 — avis inconnus des deux côtés : UNCHANGED si graphie identique, UNKNOWN sinon", () => {
  assert.equal(
    compareOpinions({ opinion_normalized: null, opinion_raw: "Réservé au lot 04" }, { opinion_normalized: null, opinion_raw: "réservé au lot 04" }),
    OPINION_CHANGE.UNCHANGED
  );
  assert.equal(
    compareOpinions({ opinion_normalized: null, opinion_raw: "Réservé au lot 04" }, { opinion_normalized: null, opinion_raw: "Réservé au lot 07" }),
    OPINION_CHANGE.UNKNOWN,
    "deux formulations différentes non reconnues ne prouvent pas un changement d'avis"
  );
  assert.equal(
    compareOpinions({ opinion_normalized: null, opinion_raw: null }, { opinion_normalized: "favorable", opinion_raw: "Favorable" }),
    OPINION_CHANGE.UNKNOWN
  );
});

test("la continuité d'un avis jamais reconnu reste MATCHED avec un changement inconnu", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 70 : Réservé au lot 04."],
      ["b", "Avis n° 70 : Réservé au lot 07."]
    ])
  );

  const item = itemFor(items, "b", "70");
  assert.equal(item.state, CONTINUITY_STATE.MATCHED);
  assert.equal(item.opinion_change, OPINION_CHANGE.UNKNOWN);
});

test("les suggestions expérimentales n'appliquent aucun statut Mdall", () => {
  const items = buildContinuity(
    documents([
      ["a", "Avis n° 65 : Défavorable — non justifié."],
      ["b", "Avis n° 65 : Favorable — PV reçu."]
    ])
  );

  const suggestions = buildExperimentalSuggestions(items);
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].suggestion, "HUMAN_REVIEW_SUGGESTED");
  assert.equal(suggestions[0].applies_mdall_status, false);
  assert.ok(!JSON.stringify(suggestions).includes("closed"));
});
