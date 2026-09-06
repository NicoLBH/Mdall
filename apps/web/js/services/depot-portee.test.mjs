import test from "node:test";
import assert from "node:assert/strict";

import { limiterAuDepot, documentDeLAvis, riensALire, PORTEE } from "./depot-portee.js";

const reports = [
  { sourceId: "doc-1", documentId: "uuid-a" },
  { sourceId: "doc-2", documentId: "uuid-b" }
];

const avis = (reference, sourceId) => ({ reference, external_reference: reference, sourceId });

test("un avis se rattache à son document par l'identifiant de lecture", () => {
  assert.equal(documentDeLAvis(avis("A-1", "doc-2"), reports), "uuid-b");
  assert.equal(documentDeLAvis(avis("A-1", ""), reports), "");
});

test("le dépôt ne porte que les avis lus dans ses propres livrables", () => {
  const diff = {
    added: [avis("A-1", "doc-1"), avis("A-2", "doc-2")],
    changed: [avis("B-1", "doc-2")],
    silent: [avis("C-1", "doc-1")],
    unchanged: 12
  };

  const limite = limiterAuDepot(diff, { documentIds: ["uuid-a"], reports });

  assert.deepEqual(limite.added.map((a) => a.reference), ["A-1"]);
  assert.deepEqual(limite.changed, []);
  assert.equal(limite.horsDepot, 2);
  assert.equal(limite.unchanged, 12);
});

test("le silence porte sur le corpus, pas sur le dépôt : il n'est pas filtré", () => {
  const limite = limiterAuDepot(
    { added: [], changed: [], silent: [avis("C-1", "doc-2")], unchanged: 0 },
    { documentIds: ["uuid-a"], reports }
  );
  assert.equal(limite.silent.length, 1);
});

test("un dépôt sans livrable ne porte aucun avis, et on compte ce qu'on écarte", () => {
  const limite = limiterAuDepot(
    { added: [avis("A-1", "doc-1"), avis("A-2", "doc-2")], changed: [avis("B-1", "doc-1")] },
    { documentIds: [], reports }
  );

  assert.deepEqual(limite.added, []);
  assert.deepEqual(limite.changed, []);
  assert.equal(limite.horsDepot, 3);
});

test("un avis dont on ne sait pas d'où il vient n'est pas attribué au dépôt", () => {
  const limite = limiterAuDepot(
    { added: [avis("A-9", "doc-inconnu")] },
    { documentIds: ["uuid-a"], reports }
  );
  assert.deepEqual(limite.added, []);
  assert.equal(limite.horsDepot, 1);
});

test("rien à lire se dit avant d'avoir relu cent vingt PDF", () => {
  assert.equal(riensALire([]), true);
  assert.equal(riensALire([{ id: "d1" }]), false);
  assert.equal(PORTEE.DEPOT, "depot");
});
