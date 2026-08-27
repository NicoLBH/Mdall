import test from "node:test";
import assert from "node:assert/strict";

import {
  APPEARANCE,
  AVIS_STATUS,
  OPEN_REASON,
  RESOLUTION_REASON,
  classifyAppearance,
  countByStatus,
  summariseAvisStatus
} from "./status.mjs";

/**
 * Deux fiches, puis un rapport d'étape. Seul le troisième est un point de
 * contrôle : lui seul avait vocation à reprendre l'état complet des avis.
 */
const DOCUMENTS = [
  { source_id: "r1", issued_at: "2024-01-10", recapitulative: false },
  { source_id: "r2", issued_at: "2024-06-10", recapitulative: false },
  { source_id: "r3", issued_at: "2025-01-10", recapitulative: true }
];

/** Un lot de fiches seules : aucun document ne fait le point. */
const FICHES_ONLY = DOCUMENTS.map((document) => ({ ...document, recapitulative: false }));

function continuity(documentId, reference, value, extra = {}) {
  return { key: `continuity:${documentId}:${reference}`, kind: "continuity", state: "PREDICTED", value, ...extra };
}

test("un avis encore listé reste ouvert, avec son ancienneté", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "56", { state: "NEW" }),
      continuity("r3", "56", { state: "MATCHED", previous_document_id: "r1" })
    ],
    DOCUMENTS
  );

  assert.equal(summary.status, AVIS_STATUS.OPEN);
  assert.equal(summary.raised_in, "r1");
  assert.equal(summary.raised_at, "2024-01-10");
  assert.equal(summary.age_days, 366);
});

test("un avis déclaré levé est résolu, et cite sa preuve", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "57", { state: "NEW" }),
      continuity("r2", "57", { state: "NOT_FOUND", previous_document_id: "r1" }, {
        lifting_statement: { sentence: "L'avis 57 est levé.", source_page: 4, source_document_id: "r2" }
      })
    ],
    DOCUMENTS
  );

  assert.equal(summary.status, AVIS_STATUS.RESOLVED);
  assert.equal(summary.resolution_reason, RESOLUTION_REASON.DECLARED_LIFTED);
  assert.match(summary.evidence.sentence, /L'avis 57 est levé/);
});

test("un avis repassé favorable est résolu, sans qu'aucune phrase ne le déclare", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "146", { state: "NEW" }),
      continuity("r2", "146", { state: "MATCHED_BY_TITLE", previous_document_id: "r1" }, {
        matched_opinion_raw: "F"
      })
    ],
    DOCUMENTS
  );

  assert.equal(summary.status, AVIS_STATUS.RESOLVED);
  assert.equal(summary.resolution_reason, RESOLUTION_REASON.BACK_TO_FAVOURABLE);
});

test("un avis absent du récapitulatif qui devait le reprendre est sans nouvelles", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "62", { state: "NEW" }),
      continuity("r2", "62", { state: "NOT_FOUND", previous_document_id: "r1" }),
      continuity("r3", "62", { state: "NOT_FOUND", previous_document_id: "r1" })
    ],
    DOCUMENTS
  );

  assert.equal(summary.status, AVIS_STATUS.NO_NEWS, "l'absence ne vaut pas clôture");
  assert.equal(summary.resolution_reason, null);
  assert.equal(summary.last_seen_document_id, "r1");
  assert.equal(summary.missed_checkpoint_id, "r3", "on cite le document qui aurait dû le porter");
  assert.equal(summary.missed_checkpoint_at, "2025-01-10");
  assert.equal(summary.missed_checkpoints, 1);
});

test("hors récapitulatif, l'absence d'un avis ne prouve rien : il reste ouvert", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "62", { state: "NEW" }),
      continuity("r2", "62", { state: "NOT_FOUND", previous_document_id: "r1" }),
      continuity("r3", "62", { state: "NOT_FOUND", previous_document_id: "r1" })
    ],
    FICHES_ONLY
  );

  assert.equal(summary.status, AVIS_STATUS.OPEN);
  assert.equal(summary.open_reason, OPEN_REASON.NO_CHECKPOINT_SINCE);
  assert.equal(summary.missed_checkpoint_id, null);
  assert.equal(
    summary.last_seen_document_id,
    "r1",
    "une fiche qui ne le mentionne pas n'est pas une fiche qui le retire"
  );
});

test("une fiche qui ne reprend pas un avis ne le fait pas disparaître", () => {
  // Le cas qui faisait basculer un chantier entier en « sans nouvelles » :
  // 102 des 206 numéros d'un corpus réel n'apparaissent que dans une fiche.
  // Ici le rapport d'étape est le premier document : rien depuis n'a fait le
  // point, donc rien ne permet de conclure.
  const [summary] = summariseAvisStatus(
    [continuity("r1", "80", { state: "NEW" }), continuity("r2", "80", { state: "NOT_FOUND", previous_document_id: "r1" })],
    [
      { source_id: "r1", issued_at: "2024-01-10", recapitulative: true },
      { source_id: "r2", issued_at: "2024-06-10", recapitulative: false },
      { source_id: "r3", issued_at: "2025-01-10", recapitulative: false }
    ]
  );

  assert.equal(summary.status, AVIS_STATUS.OPEN);
  assert.equal(summary.open_reason, OPEN_REASON.NO_CHECKPOINT_SINCE);
});

test("un avis encore listé dans le dernier récapitulatif est ouvert sans réserve", () => {
  const [summary] = summariseAvisStatus(
    [continuity("r1", "81", { state: "NEW" }), continuity("r3", "81", { state: "MATCHED", previous_document_id: "r1" })],
    DOCUMENTS
  );

  assert.equal(summary.status, AVIS_STATUS.OPEN);
  assert.equal(summary.open_reason, OPEN_REASON.STILL_LISTED);
});

test("une levée déclarée prime sur le silence d'un récapitulatif", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "63", { state: "NEW" }),
      continuity("r2", "63", { state: "NOT_FOUND", previous_document_id: "r1" }, {
        lifting_statement: { sentence: "L'avis 63 est levé.", source_document_id: "r2" }
      }),
      continuity("r3", "63", { state: "NOT_FOUND", previous_document_id: "r1" })
    ],
    DOCUMENTS
  );

  assert.equal(summary.status, AVIS_STATUS.RESOLVED);
  assert.equal(summary.resolution_reason, RESOLUTION_REASON.DECLARED_LIFTED);
  assert.equal(summary.missed_checkpoint_id, null);
});

test("les avis sont classés : ouverts d'abord, puis sans nouvelles, puis résolus", () => {
  const summaries = summariseAvisStatus(
    [
      continuity("r1", "1", { state: "NEW" }),
      continuity("r3", "1", { state: "NOT_FOUND", previous_document_id: "r1" }),
      continuity("r1", "2", { state: "NEW" }),
      continuity("r3", "2", { state: "MATCHED", previous_document_id: "r1" }),
      continuity("r1", "3", { state: "NEW" }),
      continuity("r2", "3", { state: "NOT_FOUND", previous_document_id: "r1" }, {
        lifting_statement: { sentence: "L'avis 3 est levé." }
      })
    ],
    DOCUMENTS
  );

  assert.deepEqual(summaries.map((summary) => summary.status), [
    AVIS_STATUS.OPEN,
    AVIS_STATUS.NO_NEWS,
    AVIS_STATUS.RESOLVED
  ]);
  assert.deepEqual(countByStatus(summaries), { OPEN: 1, RESOLVED: 1, NO_NEWS: 1 });
});

test("les documents hors de la chronologie retenue sont ignorés", () => {
  const summaries = summariseAvisStatus(
    [continuity("r1", "9", { state: "NEW" }), continuity("hors-lot", "9", { state: "MATCHED" })],
    DOCUMENTS
  );

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].last_document_id, "r1");
});

test("la déclaration globale d'un rapport final lève les avis qui la précèdent", () => {
  // Le cas qui décidait de tout sur un corpus réel : 138 avis « sans
  // nouvelles » alors que le rapport final déclare l'ensemble suivi d'effet.
  const clearance = {
    sentence: "À notre connaissance, l'ensemble des avis ont été suivis d'effet.",
    source_document_id: "r3",
    source_page: 14,
    scope: "ALL_AVIS"
  };

  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "70", { state: "NEW" }),
      continuity("r2", "70", { state: "NOT_FOUND", previous_document_id: "r1" }),
      continuity("r3", "70", { state: "NOT_FOUND", previous_document_id: "r1" })
    ],
    DOCUMENTS,
    { globalClearances: [clearance] }
  );

  assert.equal(summary.status, AVIS_STATUS.RESOLVED);
  assert.equal(summary.resolution_reason, RESOLUTION_REASON.DECLARED_GLOBALLY);
  assert.equal(summary.resolved_in, "r3");
  assert.equal(summary.resolved_at, "2025-01-10");
  assert.match(summary.evidence.sentence, /suivis d'effet/);
});

test("une clôture globale ne couvre pas un avis ressorti après elle", () => {
  const clearance = {
    sentence: "L'ensemble des avis ont été suivis d'effet.",
    source_document_id: "r2",
    source_page: 3,
    scope: "ALL_AVIS"
  };

  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "71", { state: "NEW" }),
      continuity("r2", "71", { state: "NOT_FOUND", previous_document_id: "r1" }),
      continuity("r3", "71", { state: "MATCHED", previous_document_id: "r1" })
    ],
    DOCUMENTS,
    { globalClearances: [clearance] }
  );

  assert.equal(summary.status, AVIS_STATUS.OPEN, "le dernier document le liste à nouveau");
  assert.equal(summary.open_reason, OPEN_REASON.STILL_LISTED);
});

test("une levée nominative prime sur la déclaration globale", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "72", { state: "NEW" }),
      continuity("r2", "72", { state: "NOT_FOUND", previous_document_id: "r1" }, {
        lifting_statement: { sentence: "L'avis 72 est levé.", source_document_id: "r2" }
      })
    ],
    DOCUMENTS,
    {
      globalClearances: [
        { sentence: "L'ensemble des avis ont été suivis d'effet.", source_document_id: "r3", scope: "ALL_AVIS" }
      ]
    }
  );

  assert.equal(summary.resolution_reason, RESOLUTION_REASON.DECLARED_LIFTED, "la preuve la plus précise l'emporte");
  assert.equal(summary.resolved_in, "r2");
});

test("une clôture portée par un document hors du lot retenu est ignorée", () => {
  const [summary] = summariseAvisStatus(
    [
      continuity("r1", "73", { state: "NEW" }),
      continuity("r3", "73", { state: "NOT_FOUND", previous_document_id: "r1" })
    ],
    DOCUMENTS,
    { globalClearances: [{ sentence: "Tous les avis ont été suivis d'effet.", source_document_id: "hors-lot" }] }
  );

  assert.equal(summary.status, AVIS_STATUS.NO_NEWS, "une preuve écartée par la date ne clôt rien");
});

test("un avis rappelé par un rapport d'étape n'est pas un avis rouvert", () => {
  // Le cas qui annonçait « RÉOUVERT » à chaque récapitulatif : l'avis reparaît
  // après plusieurs fiches muettes, mais il n'a jamais cessé d'être suspendu.
  const suspendu = { opinion_raw: "S", opinion_label: "Suspendu" };

  assert.equal(classifyAppearance(suspendu, suspendu, { afterGap: true }), APPEARANCE.RECALLED);
  assert.equal(classifyAppearance(suspendu, suspendu, { afterGap: false }), APPEARANCE.TRACKED);
});

test("une réouverture est un retour en arrière du dossier", () => {
  const favorable = { opinion_raw: "F", opinion_label: "Favorable" };
  const defavorable = { opinion_raw: "D", opinion_label: "Défavorable" };

  assert.equal(classifyAppearance(favorable, defavorable, { afterGap: true }), APPEARANCE.REOPENED);
  assert.equal(
    classifyAppearance(favorable, defavorable, { afterGap: false }),
    APPEARANCE.REOPENED,
    "sans absence non plus : c'est l'appréciation qui fait la réouverture"
  );
  assert.equal(
    classifyAppearance({ opinion_raw: "SO", opinion_label: "Sans Objet" }, { opinion_raw: "NC", opinion_label: "Non conforme" }),
    APPEARANCE.REOPENED
  );
});

test("passer de suspendu à favorable n'est pas une réouverture", () => {
  assert.equal(
    classifyAppearance({ opinion_raw: "S", opinion_label: "Suspendu" }, { opinion_raw: "F", opinion_label: "Favorable" }),
    APPEARANCE.TRACKED
  );
});

test("la première apparition n'a rien derrière elle", () => {
  assert.equal(classifyAppearance(null, { opinion_raw: "S", opinion_label: "Suspendu" }), APPEARANCE.NEW);
});
