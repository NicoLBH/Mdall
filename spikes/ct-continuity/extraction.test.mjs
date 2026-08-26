import test from "node:test";
import assert from "node:assert/strict";

import { CONFIDENCE, EXTRACTION_STATE, extractOccurrences, matchOpinion, toLines } from "./extraction.mjs";

function source(text, { id = "doc", pages = null } = {}) {
  return pages
    ? { source_id: id, content_available: true, content: pages.map((p) => p.text).join("\n"), pages }
    : { source_id: id, content_available: true, content: text, pages: null };
}

test("extrait référence, avis et description d'une ligne standard", () => {
  const { occurrences } = extractOccurrences(
    source("Avis n° 65 : Défavorable — la note de calcul n'est pas conforme.")
  );

  assert.equal(occurrences.length, 1);
  const [occurrence] = occurrences;
  assert.equal(occurrence.external_reference_raw, "65");
  assert.equal(occurrence.external_reference_normalized, "65");
  assert.equal(occurrence.opinion_raw, "Défavorable");
  assert.equal(occurrence.opinion_normalized, "defavorable");
  assert.equal(occurrence.description_raw, "la note de calcul n'est pas conforme.");
  assert.equal(occurrence.extraction_state, EXTRACTION_STATE.EXTRACTED);
});

test("l'avis est restitué avec sa graphie d'origine, accents compris", () => {
  const { occurrences } = extractOccurrences(source("Avis n° 65 : À préciser — en attente du PV."));

  assert.equal(occurrences[0].opinion_raw, "À préciser", "la graphie source ne doit pas être normalisée");
  assert.equal(occurrences[0].opinion_normalized, "a_preciser");
});

test("cas 7 — statut inconnu : l'avis n'est jamais inventé", () => {
  const { occurrences } = extractOccurrences(
    source("Avis n° 70 : Réservé au lot 04 dans l'attente de la désignation.")
  );

  assert.equal(occurrences[0].opinion_raw, null, "aucune catégorie ne doit être inventée");
  assert.equal(occurrences[0].opinion_normalized, null);
  assert.equal(occurrences[0].opinion_confidence, null);
  assert.equal(occurrences[0].extraction_state, EXTRACTION_STATE.UNKNOWN_OPINION);
  assert.equal(
    occurrences[0].description_raw,
    "Réservé au lot 04 dans l'attente de la désignation.",
    "le texte source reste intégralement accessible"
  );
});

test("un avis non reconnu ne dégrade pas la confiance de lecture de l'occurrence", () => {
  const { occurrences } = extractOccurrences(
    source("Avis n° 70 : Réservé au lot 04.\nAvis n° 71 : Favorable — rien à signaler.")
  );

  assert.equal(occurrences[0].confidence, occurrences[1].confidence);
  assert.equal(occurrences[0].opinion_confidence, null);
  assert.equal(occurrences[1].opinion_confidence, CONFIDENCE.OPINION_RECOGNIZED);
});

test("cas 6 — deux fois la même référence dans un document : ambiguïté, pas d'arbitrage", () => {
  const { occurrences } = extractOccurrences(
    source("Avis n° 69 : Défavorable — garde-corps.\nAvis n° 69 : À préciser — calepinage.")
  );

  assert.equal(occurrences.length, 2);
  for (const occurrence of occurrences) {
    assert.equal(occurrence.extraction_state, EXTRACTION_STATE.AMBIGUOUS_REFERENCE);
    assert.equal(occurrence.confidence, null);
  }
});

test("cas 5 — références proches : 65, 65.1 et 651 restent trois avis distincts", () => {
  const { occurrences } = extractOccurrences(
    source("Avis n° 65 : Favorable — a.\nAvis n° 65.1 : Favorable — b.\nAvis n° 651 : Favorable — c.")
  );

  const normalized = occurrences.map((occurrence) => occurrence.external_reference_normalized);
  assert.deepEqual(normalized, ["65", "65-1", "651"]);
  assert.equal(new Set(normalized).size, 3, "aucune fusion entre références proches");
  for (const occurrence of occurrences) {
    assert.notEqual(occurrence.extraction_state, EXTRACTION_STATE.AMBIGUOUS_REFERENCE);
  }
});

test("une référence mal lue reste une référence distincte, jamais rapprochée", () => {
  const { occurrences } = extractOccurrences(source("Avis n° 6S : Favorable — lecture dégradée."));

  assert.equal(occurrences[0].external_reference_raw, "6S");
  assert.equal(occurrences[0].external_reference_normalized, "6S");
  assert.notEqual(occurrences[0].external_reference_normalized, "65");
});

test("cas 8 — sans pagination, la page reste nulle et la confiance en tient compte", () => {
  const { occurrences } = extractOccurrences(source("Avis n° 65 : Favorable — texte."));

  assert.equal(occurrences[0].source_page, null);
  assert.equal(occurrences[0].confidence, CONFIDENCE.OCCURRENCE_WITHOUT_PAGE);
});

test("avec pagination, chaque occurrence porte son numéro de page réel", () => {
  const { occurrences } = extractOccurrences(
    source(null, {
      pages: [
        { page: 1, text: "Page de garde, aucun avis." },
        { page: 4, text: "Avis n° 65 : Favorable — texte." }
      ]
    })
  );

  assert.equal(occurrences[0].source_page, 4);
  assert.equal(occurrences[0].confidence, CONFIDENCE.OCCURRENCE_WITH_PAGE);
});

test("une mise en page en tableau est reconnue par un second motif", () => {
  const { occurrences } = extractOccurrences(
    source("| 66 | Favorable | Étanchéité de toiture : aucune observation. |")
  );

  assert.equal(occurrences[0].external_reference_raw, "66");
  assert.equal(occurrences[0].opinion_raw, "Favorable");
  assert.equal(occurrences[0].pattern_id, "pipe-table");
});

test("les lignes d'en-tête ne produisent pas de fausses occurrences", () => {
  const { occurrences } = extractOccurrences(
    source("RAPPORT DE CONTRÔLE TECHNIQUE\nOrganisme fictif — Affaire n° 0000\nDate : 12/03/2026\n\nSUIVI DES AVIS")
  );

  assert.deepEqual(occurrences, []);
});

test("matchOpinion préfère la formulation la plus longue", () => {
  assert.equal(matchOpinion("non levée — reprise attendue").opinionId, "non_leve");
  assert.equal(matchOpinion("levée — travaux réalisés").opinionId, "leve");
  assert.equal(matchOpinion("Rien de connu ici"), null);
});

test("une source sans contenu ne produit rien, sans erreur", () => {
  assert.deepEqual(toLines({ source_id: "x", content_available: false, content: null }), []);
  assert.deepEqual(
    extractOccurrences({ source_id: "x", content_available: false, content: null }).occurrences,
    []
  );
});
