import test from "node:test";
import assert from "node:assert/strict";

import { ITEM } from "./proposition-state.js";
import { ITEM_TYPE } from "./proposition-review.js";
import {
  buildSnapshot,
  defaultMergeMessage,
  describeSnapshotGap,
  freezeDecisions,
  itemsFromDecisions
} from "./proposition-freeze.js";

function item(status, reason = null) {
  return { itemType: ITEM_TYPE.AVIS, itemKey: "234", payload: { reference: "234" }, status, reason };
}

test("le silence devient explicite : ce qui n'a pas été tranché est écrit accepté", () => {
  // C'est ce que la fusion en a fait. Le laisser « proposé » conserverait une
  // question à laquelle on a répondu en fusionnant.
  const [gele] = freezeDecisions([item(ITEM.PROPOSED)]);

  assert.equal(gele.status, ITEM.ACCEPTED);
});

test("un refus garde son motif, une acceptation n'en invente pas", () => {
  const decisions = freezeDecisions([item(ITEM.REFUSED, "autre chantier"), item(ITEM.PROPOSED)]);

  assert.equal(decisions[0].reason, "autre chantier");
  assert.equal(decisions[1].reason, null);
});

test("une acceptation explicite reste une acceptation, sans motif traînant", () => {
  // Se raviser après un refus ne doit pas laisser derrière soi le motif du
  // refus qu'on vient d'annuler.
  const [gele] = freezeDecisions([item(ITEM.ACCEPTED, "un motif d'avant")]);

  assert.equal(gele.status, ITEM.ACCEPTED);
  assert.equal(gele.reason, null);
});

test("le résumé compte ce que les affirmations ne portent pas", () => {
  const resume = buildSnapshot({
    items: [item(ITEM.REFUSED), item(ITEM.PROPOSED), item(ITEM.ACCEPTED)],
    diff: { unchanged: 14 },
    unreachable: [{ original_filename: "RICT-3.pdf" }],
    result: { engineVersion: "ct-continuity/1", packsUsed: { socotec: { pack_id: "socotec", pack_version: 3 } } }
  });

  assert.equal(resume.itemCount, 3);
  assert.equal(resume.refusedCount, 1);
  assert.equal(resume.acceptedCount, 2);
  assert.equal(resume.unchangedAvis, 14);
  assert.deepEqual(resume.unreachable, ["RICT-3.pdf"]);
  assert.deepEqual(resume.packs, ["socotec v3"]);
});

test("ne pas savoir combien d'avis restaient en l'état ne se dit pas « zéro »", () => {
  // Zéro est une affirmation ; l'ignorance en est une autre, et l'écran doit
  // pouvoir les distinguer.
  assert.equal(buildSnapshot({ items: [], diff: {} }).unchangedAvis, null);
});

test("les décisions conservées reprennent la forme que l'écran sait lire", () => {
  // Un seul rendu pour l'écran vivant et l'écran gelé : deux divergeraient au
  // premier ajustement.
  const [rendu] = itemsFromDecisions([
    {
      item_type: ITEM_TYPE.DOCUMENT,
      item_key: "u-1",
      payload: { name: "RICT.pdf" },
      status: ITEM.ACCEPTED,
      reason: null,
      decided_at: "2026-08-30T10:00:00Z"
    }
  ]);

  assert.equal(rendu.itemType, ITEM_TYPE.DOCUMENT);
  assert.equal(rendu.itemKey, "u-1");
  assert.equal(rendu.payload.name, "RICT.pdf");
  assert.equal(rendu.status, ITEM.ACCEPTED);
  assert.equal(rendu.decidedAt, "2026-08-30T10:00:00Z");
});

test("une proposition close avant le gel le dit, plutôt que de faire semblant", () => {
  // La taire ferait passer une trace partielle pour un procès-verbal ; la
  // recalculer présenterait la lecture d'aujourd'hui comme la décision d'hier.
  assert.match(describeSnapshotGap({ status: "merged" }, 3), /décisions explicites/);
  assert.match(describeSnapshotGap({ status: "merged" }, 0), /n'a pas été retenu/);
  assert.equal(describeSnapshotGap({ snapshot: { itemCount: 3 } }, 3), "");
});

test("la fusion propose son message plutôt que de laisser un champ vide", () => {
  // Un champ vide obtient une ligne bâclée ; un champ pré-rempli obtient soit un
  // accord — et la phrase est juste —, soit une correction, qui vaut mieux
  // qu'une invention.
  const message = defaultMergeMessage({
    proposition: { number: 3, title: "Rapports d'étape SOCOTEC" },
    items: [
      { itemType: "document", status: ITEM.ACCEPTED },
      { itemType: "document", status: ITEM.ACCEPTED },
      { itemType: "avis", status: ITEM.REFUSED },
      { itemType: "avis", status: ITEM.PROPOSED }
    ]
  });

  assert.equal(message.title, "Fusion de la proposition #3 — Rapports d'étape SOCOTEC");
  assert.equal(message.note, "3 affirmations acceptées, 1 refusée, 2 livrables entrent au corpus.");
});

test("sans rien à fusionner, la note ne raconte rien", () => {
  const message = defaultMergeMessage({ proposition: { number: 1, title: "Vide" }, items: [] });

  assert.equal(message.title, "Fusion de la proposition #1 — Vide");
  assert.equal(message.note, "");
});
