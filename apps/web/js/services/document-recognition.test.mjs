import test from "node:test";
import assert from "node:assert/strict";

import { discoverLegend } from "../../../../spikes/ct-continuity/legend.mjs";
import { readDocumentMeta } from "../../../../spikes/ct-continuity/document-meta.mjs";

import { CONFIDENCE, RECOGNITION, isExploitable, recognizeDocument } from "./document-recognition.js";
import { createCtReportRecognizer } from "./document-recognizer-ct.js";

const CT = createCtReportRecognizer({ readDocumentMeta, discoverLegend });
const LEGEND = "* F: Favorable , D: Défavorable , S: Suspendu , HM: Hors Mission";

/** Un rapport tel que le lecteur de PDF le rend : des pages, du texte. */
function rapport(lines) {
  return { pages: [{ page: 1, text: lines.join("\n") }], filename: "rapport.pdf", mimeType: "application/pdf" };
}

const RICT = rapport([
  "RAPPORT INITIAL DE CONTROLE TECHNIQUE",
  "CONTROLE TECHNIQUE",
  "Date d’émission : 27/08/2024",
  "Référence du chrono: CT/13860/0824/0139",
  "Dispositions du projet Avis* Observations et commentaires N°",
  LEGEND,
  "SOCOTEC Construction - S.A.S. au capital de 9 116 700 euros"
]);

test("un document sans texte se refuse pour ce qu'il est : une image", () => {
  const verdict = recognizeDocument({ pages: [{ page: 1, text: "  " }] }, { recognizers: [CT] });

  assert.equal(verdict.status, RECOGNITION.NO_TEXT_LAYER);
  assert.match(verdict.reason, /numérisé/);
  // Ce n'est pas un jugement sur le document : c'est une impossibilité
  // technique, et la distinction décide de ce qu'il y a à faire ensuite.
  assert.equal(verdict.kind, null);
});

test("un document que personne ne réclame le dit, plutôt que de ne rien dire", () => {
  const verdict = recognizeDocument(
    rapport(["Facture n° 2024-118", "Prestation de conseil", "Total TTC : 1 200 €"]),
    { recognizers: [CT] }
  );

  assert.equal(verdict.status, RECOGNITION.UNRECOGNIZED);
  assert.match(verdict.reason, /Aucun émetteur reconnu/);
  assert.equal(isExploitable(verdict), false);
});

test("un livrable de bureau de contrôle se reconnaît, et dit sur quoi", () => {
  const verdict = recognizeDocument(RICT, { recognizers: [CT] });

  assert.equal(verdict.status, RECOGNITION.RECOGNIZED);
  assert.equal(verdict.kind, "ct_report");
  assert.equal(verdict.kindLabel, "Rapport initial (RICT)");
  assert.equal(verdict.author, "socotec");
  assert.equal(verdict.confidence, CONFIDENCE.CERTAIN);
  assert.equal(verdict.declaredReference, "CT/13860/0824/0139");
  assert.equal(verdict.issuedAt, "2024-08-27");
  assert.equal(verdict.recognizer, "ct-report");
  // Un verdict sans preuve ne vaut pas mieux qu'une intuition.
  assert.match(verdict.evidence.text, /SOCOTEC/);
  assert.equal(verdict.evidence.page, 1);
});

test("reconnu sans contenu exploitable n'est pas un rejet", () => {
  // Une attestation ou une fiche de correspondance ne portent aucune légende
  // d'avis. Ce sont des pièces légitimes du dossier, et les confondre avec un
  // document étranger les ferait écarter à tort.
  const verdict = recognizeDocument(
    rapport([
      "FICHE DE CORRESPONDANCE",
      "CONTROLE TECHNIQUE",
      "Date d’émission : 12/03/2025",
      "Référence du chrono: CT/13860/0325/0311",
      "SOCOTEC Construction - S.A.S. au capital de 9 116 700 euros"
    ]),
    { recognizers: [CT] }
  );

  assert.equal(verdict.status, RECOGNITION.RECOGNIZED_WITHOUT_CONTENT);
  assert.equal(verdict.kindLabel, "Fiche de correspondance");
  assert.equal(verdict.author, "socotec");
  assert.match(verdict.reason, /aucune légende d'avis/);
  assert.equal(isExploitable(verdict), false);
});

test("sans nom d'émetteur, il faut plus qu'un indice pour affirmer", () => {
  // Une référence chrono seule ne suffit pas : c'est un format, pas une
  // signature. Il y faut aussi un type de livrable ou une légende d'avis.
  const chronoSeul = recognizeDocument(
    rapport(["Note de synthèse", "Référence du chrono: CT/13860/0824/0139"]),
    { recognizers: [CT] }
  );
  assert.equal(chronoSeul.status, RECOGNITION.UNRECOGNIZED);

  const chronoEtLegende = recognizeDocument(
    rapport(["Note de synthèse", "Référence du chrono: CT/13860/0824/0139", LEGEND]),
    { recognizers: [CT] }
  );
  assert.equal(chronoEtLegende.status, RECOGNITION.RECOGNIZED);
  assert.equal(chronoEtLegende.confidence, CONFIDENCE.PROBABLE);
  assert.equal(chronoEtLegende.author, null, "on ne nomme pas un émetteur qu'on n'a pas lu");
});

test("un reconnaisseur qui échoue n'emporte pas les autres avec lui", () => {
  const casse = { id: "casse", version: 1, recognize() { throw new Error("boum"); } };
  const verdict = recognizeDocument(RICT, { recognizers: [casse, CT] });

  assert.equal(verdict.status, RECOGNITION.RECOGNIZED);
  assert.equal(verdict.recognizer, "ct-report");
});

test("quand deux reconnaisseurs réclament un document, la certitude tranche", () => {
  const vague = {
    id: "vague",
    version: 3,
    recognize: () => ({ kind: "autre", kindLabel: "Autre chose", confidence: CONFIDENCE.PROBABLE })
  };

  assert.equal(recognizeDocument(RICT, { recognizers: [vague, CT] }).recognizer, "ct-report");
  assert.equal(recognizeDocument(RICT, { recognizers: [CT, vague] }).recognizer, "ct-report");
});

test("le registre ne connaît aucune nature de document par lui-même", () => {
  // Sans reconnaisseur, aucun document n'est reconnu — y compris celui que le
  // reconnaisseur CT revendique. C'est la garantie qu'aucune nature n'est
  // câblée en dur ici, et donc qu'en ajouter une ne demandera pas d'y toucher.
  assert.equal(recognizeDocument(RICT, { recognizers: [] }).status, RECOGNITION.UNRECOGNIZED);
});

/**
 * Les colonnes écrites en base sont un contrat : une clé mal orthographiée
 * n'échoue pas, elle écrit à côté et se découvre des semaines plus tard.
 */
test("un verdict se traduit en colonnes, une absence de verdict en rien", async () => {
  const { toDocumentColumns } = await import("./document-recognizers.js");

  assert.deepEqual(toDocumentColumns(null), {}, "une reconnaissance non faite n'est pas une reconnaissance négative");

  const columns = toDocumentColumns(recognizeDocument(RICT, { recognizers: [CT] }));

  assert.equal(columns.detection_status, RECOGNITION.RECOGNIZED);
  assert.equal(columns.detected_kind, "ct_report");
  assert.equal(columns.detected_kind_label, "Rapport initial (RICT)");
  assert.equal(columns.detected_author, "socotec");
  assert.equal(columns.detection_confidence, CONFIDENCE.CERTAIN);
  assert.equal(columns.declared_reference, "CT/13860/0824/0139");
  assert.equal(columns.issued_at, "2024-08-27");
  assert.equal(columns.detector, "ct-report");
  assert.equal(columns.detector_version, "1");
  assert.match(columns.detection_evidence.text, /SOCOTEC/);
  assert.ok(columns.detected_at);

  // Les colonnes doivent exister dans la migration : les nommer ici les fige.
  assert.deepEqual(Object.keys(columns).sort(), [
    "declared_reference",
    "detected_at",
    "detected_author",
    "detected_kind",
    "detected_kind_label",
    "detection_confidence",
    "detection_evidence",
    "detection_reason",
    "detection_status",
    "detector",
    "detector_version",
    "issued_at"
  ]);
});
