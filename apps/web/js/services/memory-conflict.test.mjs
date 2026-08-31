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

test("les deux côtés disent ce qu'ils affirment, en français", () => {
  const [conflit] = findMemoryConflicts(
    [avisItem("234", { status: "OPEN", opinion: "S" })],
    [decision("234", ITEM.ACCEPTED, { status: "RESOLVED", opinion: "F" })]
  );
  const dit = describeConflict(conflit);

  assert.equal(dit.title, "Avis n° 234");
  assert.equal(dit.before.heading, "Ce que le projet retient");
  assert.equal(dit.before.statement, "Levé · avis F");
  assert.equal(dit.after.heading, "Ce que ce lot affirme");
  assert.equal(dit.after.statement, "Ouvert · avis S");
  assert.doesNotMatch(`${dit.before.statement} ${dit.after.statement}`, /OPEN|RESOLVED/);
});

test("chaque côté porte son extrait et sa provenance", () => {
  // Sans la phrase du rapport d'où sort l'affirmation, on demandait d'arbitrer
  // entre deux étiquettes sans montrer sur quoi elles reposent.
  const [conflit] = findMemoryConflicts(
    [
      avisItem("234", {
        status: "OPEN",
        opinion: "S",
        evidence: "Merci de confirmer que les cheminements font bien 1,40 m",
        sourceId: "doc-neuf",
        page: 11
      })
    ],
    [
      decision("234", ITEM.ACCEPTED, {
        status: "RESOLVED",
        opinion: "F",
        evidence: { text: "Cheminements conformes", page: 7, sourceId: "doc-ancien" }
      })
    ]
  );

  const dit = describeConflict(conflit);

  assert.equal(dit.after.excerpt, "Merci de confirmer que les cheminements font bien 1,40 m");
  assert.equal(dit.after.documentId, "doc-neuf");
  assert.equal(dit.after.page, 11);

  assert.equal(dit.before.excerpt, "Cheminements conformes", "l'extrait se lit sous ses deux formes");
  assert.equal(dit.before.page, 7);
  assert.equal(dit.before.documentId, "doc-ancien");
});

test("un extrait absent vaut `null`, jamais une chaîne vide", () => {
  // L'écran doit pouvoir dire « aucun extrait conservé » : un blanc se lirait
  // comme l'absence de preuve.
  const [conflit] = findMemoryConflicts(
    [avisItem("234", { status: "OPEN", opinion: "S" })],
    [decision("234", ITEM.ACCEPTED, { status: "RESOLVED", opinion: "F" })]
  );
  const dit = describeConflict(conflit);

  assert.equal(dit.before.excerpt, null);
  assert.equal(dit.after.excerpt, null);
  assert.equal(dit.after.page, null);
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
  assert.match(dit.before.statement, /c'est l'affaire du voisin/);
  assert.equal(dit.before.heading, "Ce que vous aviez écarté");
});

/* ── Un silence ne contredit rien ─────────────────────────────────────────
   Relevé sur un lot réel : vingt contradictions à arbitrer, toutes des
   bascules `OPEN` ↔ `NO_NEWS`, sans qu'un document du lot ait rien dit de
   ces avis. Un rapport d'étape ne rappelle que ce qui bouge : l'avis absent
   bascule d'un lot à l'autre au gré du corpus lu. */

const avisSilence = (key, status, opinion = null, itemStatus = ITEM.PROPOSED) => ({
  itemType: ITEM_TYPE.AVIS,
  itemKey: key,
  status: itemStatus,
  payload: { reference: key, status, opinion }
});

const decisionSur = (key, status, opinion = null, itemStatus = ITEM.ACCEPTED) => ({
  item_type: ITEM_TYPE.AVIS,
  item_key: key,
  status: itemStatus,
  decided_at: "2026-03-01T00:00:00.000Z",
  payload: { reference: key, status, opinion }
});

test("un avis dont le lot ne parle pas ne contredit pas ce qui était assumé", () => {
  const conflits = findMemoryConflicts([avisSilence("166", "NO_NEWS")], [decisionSur("166", "OPEN")]);
  assert.deepEqual(conflits, [], "NO_NEWS est un silence, pas un état");
});

test("un avis assumé sans nouvelles n'est pas contredit par une lecture qui le rouvre", () => {
  const conflits = findMemoryConflicts([avisSilence("166", "OPEN")], [decisionSur("166", "NO_NEWS")]);
  assert.deepEqual(conflits, [], "on n'oppose pas une parole à un silence");
});

test("un refus n'est pas réaffirmé par un silence", () => {
  const conflits = findMemoryConflicts(
    [avisSilence("166", "NO_NEWS")],
    [decisionSur("166", "OPEN", null, ITEM.REFUSED)]
  );
  assert.deepEqual(conflits, [], "rien n'est réaffirmé quand rien n'est dit");
});

test("une vraie contradiction reste une contradiction", () => {
  const conflits = findMemoryConflicts([avisSilence("166", "RESOLVED")], [decisionSur("166", "OPEN")]);
  assert.equal(conflits.length, 1);
  assert.equal(conflits[0].item.itemKey, "166");
});

test("un refus réaffirmé par une lecture qui dit quelque chose reste posé", () => {
  const conflits = findMemoryConflicts(
    [avisSilence("166", "OPEN")],
    [decisionSur("166", "OPEN", null, ITEM.REFUSED)]
  );
  assert.equal(conflits.length, 1);
});

test("le silence ne dispense que les avis : un document reste comparé", () => {
  const conflits = findMemoryConflicts(
    [{ itemType: ITEM_TYPE.DOCUMENT, itemKey: "doc-1", status: ITEM.PROPOSED, payload: { name: "a.pdf" } }],
    [{ item_type: ITEM_TYPE.DOCUMENT, item_key: "doc-1", status: ITEM.REFUSED, payload: { name: "a.pdf" }, decided_at: null }]
  );
  assert.equal(conflits.length, 1);
});
