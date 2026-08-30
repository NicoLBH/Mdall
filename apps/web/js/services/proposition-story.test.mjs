import test from "node:test";
import assert from "node:assert/strict";

import { ITEM, PROPOSITION } from "./proposition-state.js";
import { ITEM_TYPE } from "./proposition-review.js";
import { STORY, buildStory, nameSome } from "./proposition-story.js";

const NAMES = new Map([
  ["u-nico", "Nicolas Le Bihan"],
  ["u-ana", "Ana Ferreira"]
]);

const OUVERTE = {
  id: "p-1",
  status: PROPOSITION.OPEN,
  created_at: "2026-08-20T09:00:00Z",
  created_by: "u-nico",
  description: "Livrables SOCOTEC d'août"
};

test("l'histoire commence par l'ouverture, signée", () => {
  const [premier] = buildStory({ proposition: OUVERTE, names: NAMES });

  assert.equal(premier.kind, STORY.OPENED);
  assert.equal(premier.who, "Nicolas Le Bihan");
  assert.equal(premier.text, "a ouvert cette proposition");
});

test("un auteur inconnu se dit, il ne s'affiche pas en identifiant", () => {
  // « 8f3c-… a fusionné cette proposition » ne raconte rien.
  const [premier] = buildStory({ proposition: { ...OUVERTE, created_by: "u-inconnu" }, names: NAMES });

  assert.equal(premier.who, "Un collaborateur");
});

test("dix-sept fichiers déposés d'un geste font une ligne, pas dix-sept", () => {
  // Les raconter un par un noierait la décision sous la mécanique.
  const documents = Array.from({ length: 17 }, (_, index) => ({
    original_filename: `RICT-${index + 1}.pdf`,
    created_at: "2026-08-20T09:05:00Z",
    created_by: "u-nico"
  }));

  const depots = buildStory({ proposition: OUVERTE, documents, names: NAMES }).filter(
    (event) => event.kind === STORY.DEPOSIT
  );

  assert.equal(depots.length, 1);
  assert.equal(depots[0].text, "a déposé 17 livrables");
  assert.match(depots[0].detail, /RICT-1\.pdf, RICT-2\.pdf, RICT-3\.pdf et 14 autre\(s\)/);
});

test("deux dépôts séparés restent deux gestes", () => {
  // C'est la raison d'être d'une proposition : elle accumule.
  const documents = [
    { original_filename: "a.pdf", created_at: "2026-08-20T09:05:00Z", created_by: "u-nico" },
    { original_filename: "b.pdf", created_at: "2026-08-22T14:30:00Z", created_by: "u-ana" }
  ];

  const depots = buildStory({ proposition: OUVERTE, documents, names: NAMES }).filter(
    (event) => event.kind === STORY.DEPOSIT
  );

  assert.equal(depots.length, 2);
  assert.deepEqual(depots.map((event) => event.who), ["Nicolas Le Bihan", "Ana Ferreira"]);
});

test("les décisions d'un même geste se comptent ensemble, et s'accordent", () => {
  const decisions = [
    { item_type: ITEM_TYPE.AVIS, item_key: "1", status: ITEM.REFUSED, decided_at: "2026-08-21T10:00:00Z", decided_by: "u-ana" },
    { item_type: ITEM_TYPE.AVIS, item_key: "2", status: ITEM.REFUSED, decided_at: "2026-08-21T10:00:30Z", decided_by: "u-ana" },
    { item_type: ITEM_TYPE.AVIS, item_key: "3", status: ITEM.ACCEPTED, decided_at: "2026-08-21T10:00:10Z", decided_by: "u-ana" }
  ];

  const [geste] = buildStory({ proposition: OUVERTE, decisions, names: NAMES }).filter(
    (event) => event.kind === STORY.DECISION
  );

  assert.equal(geste.who, "Ana Ferreira");
  assert.equal(geste.text, "a tranché : 1 affirmation acceptée, 2 affirmations écartées");
});

test("le gel de la fusion ne se raconte pas deux fois", () => {
  // Fermer écrit d'un coup toutes les affirmations : en faire une ligne de plus,
  // une seconde avant la fusion, aurait l'air d'un doublon.
  const fusionnee = {
    ...OUVERTE,
    status: PROPOSITION.MERGED,
    merged_at: "2026-08-25T16:00:00Z",
    merged_by: "u-nico",
    snapshot: { acceptedCount: 15, refusedCount: 2 }
  };
  const decisions = [
    { item_key: "1", status: ITEM.ACCEPTED, decided_at: "2026-08-25T15:59:59Z", decided_by: "u-nico" },
    { item_key: "2", status: ITEM.ACCEPTED, decided_at: "2026-08-25T16:00:00Z", decided_by: "u-nico" }
  ];

  const histoire = buildStory({ proposition: fusionnee, decisions, names: NAMES });

  assert.equal(histoire.filter((event) => event.kind === STORY.DECISION).length, 0);
  const fusion = histoire.at(-1);
  assert.equal(fusion.kind, STORY.MERGED);
  assert.equal(fusion.text, "a fusionné la proposition");
  assert.equal(fusion.detail, "15 affirmations acceptées, 2 refusées.");
});

test("un abandon se signe comme une fusion", () => {
  const abandonnee = {
    ...OUVERTE,
    status: PROPOSITION.CLOSED,
    closed_at: "2026-08-26T08:00:00Z",
    closed_by: "u-ana"
  };

  const dernier = buildStory({ proposition: abandonnee, names: NAMES }).at(-1);

  assert.equal(dernier.kind, STORY.CLOSED);
  assert.equal(dernier.who, "Ana Ferreira");
  assert.match(dernier.detail, /marqués refusés/);
});

test("l'histoire se lit dans l'ordre du temps", () => {
  const documents = [{ original_filename: "a.pdf", created_at: "2026-08-22T09:00:00Z", created_by: "u-nico" }];
  const decisions = [{ item_key: "1", status: ITEM.REFUSED, decided_at: "2026-08-21T09:00:00Z", decided_by: "u-ana" }];

  const kinds = buildStory({ proposition: OUVERTE, documents, decisions, names: NAMES }).map((event) => event.kind);

  assert.deepEqual(kinds, [STORY.OPENED, STORY.DECISION, STORY.DEPOSIT]);
});

test("trois noms, puis un compte", () => {
  assert.equal(nameSome(["a", "b"]), "a, b");
  assert.equal(nameSome([]), "");
});
