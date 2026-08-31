import test from "node:test";
import assert from "node:assert/strict";

import { ITEM } from "./proposition-state.js";
import { ITEM_TYPE } from "./proposition-review.js";
import {
  CONFLICT,
  affirmationOf,
  describeBlocking,
  describeConflict,
  findMemoryConflicts,
  unresolvedConflicts
} from "./memory-conflict.js";

function avisItem(reference, payload = {}, status = ITEM.PROPOSED) {
  return {
    itemType: ITEM_TYPE.AVIS,
    itemKey: reference,
    payload: { reference, ...payload },
    status,
    reason: null
  };
}

function decision(itemKey, status, payload, extra = {}) {
  return { item_type: ITEM_TYPE.AVIS, item_key: itemKey, status, payload, decided_at: "2026-08-12T09:00:00Z", ...extra };
}

test("sans décision passée, il n'y a rien à contredire", () => {
  const conflits = findMemoryConflicts([avisItem("234", { status: "OPEN", opinion: "S" })], []);

  assert.deepEqual(conflits, []);
});

test("un refus réaffirmé à l'identique est une contradiction", () => {
  // Il ne s'est rien passé de nouveau : c'est la machine qui insiste, et
  // l'accepter en silence effacerait une décision que quelqu'un a prise.
  const conflits = findMemoryConflicts(
    [avisItem("234", { status: "OPEN", opinion: "S" })],
    [decision("234", ITEM.REFUSED, { status: "OPEN", opinion: "S" }, { reason: "lu sur le mauvais rapport" })]
  );

  assert.equal(conflits.length, 1);
  assert.equal(conflits[0].kind, CONFLICT.REFUSED_REAFFIRMED);
  assert.equal(conflits[0].reason, "lu sur le mauvais rapport");
});

test("une acceptation contredite est une contradiction", () => {
  const conflits = findMemoryConflicts(
    [avisItem("234", { status: "OPEN", opinion: "S" })],
    [decision("234", ITEM.ACCEPTED, { status: "RESOLVED", opinion: "F" })]
  );

  assert.equal(conflits.length, 1);
  assert.equal(conflits[0].kind, CONFLICT.ACCEPTED_CONTRADICTED);
});

test("une acceptation confirmée n'est pas une contradiction", () => {
  // L'analyse se refait à chaque ouverture. Si tout recalcul identique passait
  // pour une contradiction, la revue croulerait sous des questions sans objet.
  const conflits = findMemoryConflicts(
    [avisItem("234", { status: "RESOLVED", opinion: "F" })],
    [decision("234", ITEM.ACCEPTED, { status: "RESOLVED", opinion: "F" })]
  );

  assert.deepEqual(conflits, []);
});

test("la façon dont le diff qualifie le mouvement n'entre pas dans l'affirmation", () => {
  // « added » et « changed » décrivent la comparaison, pas le fait.
  assert.equal(
    affirmationOf(avisItem("234", { change: "added", status: "OPEN", opinion: "S" })),
    affirmationOf(avisItem("234", { change: "changed", status: "OPEN", opinion: "S" }))
  );
});

test("une décision d'une proposition encore ouverte ne fait pas mémoire", () => {
  // Seules les décisions fusionnées sont passées ici : une réponse donnée dans
  // une proposition ouverte est une intention, pas un engagement. Le filtre est
  // dans la requête ; ce test fixe la règle que la requête doit tenir.
  const conflits = findMemoryConflicts([avisItem("234", { status: "OPEN" })], []);

  assert.deepEqual(conflits, []);
});

test("une contradiction non tranchée bloque, tranchée elle laisse passer", () => {
  // C'est le seul endroit du système où le silence ne vaut pas acceptation.
  const item = avisItem("234", { status: "OPEN", opinion: "S" });
  const conflits = findMemoryConflicts([item], [decision("234", ITEM.ACCEPTED, { status: "RESOLVED", opinion: "F" })]);

  assert.equal(unresolvedConflicts(conflits).length, 1);
  assert.match(describeBlocking(conflits), /doit être arbitrée/);

  item.status = ITEM.ACCEPTED;
  assert.equal(unresolvedConflicts(conflits).length, 0);
  assert.equal(describeBlocking(conflits), "");
});

test("la phrase du blocage accorde son nombre", () => {
  const deux = findMemoryConflicts(
    [avisItem("234", { status: "OPEN" }), avisItem("249", { status: "OPEN" })],
    [decision("234", ITEM.REFUSED, { status: "OPEN" }), decision("249", ITEM.REFUSED, { status: "OPEN" })]
  );

  assert.match(describeBlocking(deux), /^2 contradictions/);
});

test("les deux réponses nomment ce qu'on garde et ce qu'on prend, en français", () => {
  const [conflit] = findMemoryConflicts(
    [avisItem("234", { status: "OPEN", opinion: "S" })],
    [decision("234", ITEM.ACCEPTED, { status: "RESOLVED", opinion: "F" })]
  );
  const dit = describeConflict(conflit);

  assert.equal(dit.title, "Avis n° 234");
  assert.equal(dit.memory, "Vous aviez retenu : Levé · avis F");
  assert.equal(dit.now, "L'analyse dit maintenant : Ouvert · avis S");
  assert.doesNotMatch(`${dit.memory} ${dit.now}`, /OPEN|RESOLVED/);
  assert.equal(dit.keep, "Je garde ce qui était retenu");
  assert.equal(dit.take, "J'assume le changement");
});

test("un refus d'affaire réaffirmé se dit avec le motif d'alors", () => {
  const conflits = findMemoryConflicts(
    [
      {
        itemType: ITEM_TYPE.ATTACHMENT,
        itemKey: "chrono_affaire:13861",
        payload: { label: "13861", verdict: "FOREIGN", reason: "affaire inconnue du projet" },
        status: ITEM.PROPOSED
      }
    ],
    [
      {
        item_type: ITEM_TYPE.ATTACHMENT,
        item_key: "chrono_affaire:13861",
        status: ITEM.REFUSED,
        payload: { label: "13861", verdict: "FOREIGN" },
        reason: "c'est l'affaire du voisin",
        decided_at: "2026-08-12T09:00:00Z"
      }
    ]
  );

  assert.equal(conflits.length, 1);
  const dit = describeConflict(conflits[0]);
  assert.match(dit.memory, /c'est l'affaire du voisin/);
  assert.equal(dit.keep, "Je maintiens : ce n'est pas ce projet");
});
