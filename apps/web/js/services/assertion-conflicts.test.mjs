import test from "node:test";
import assert from "node:assert/strict";

import { NATURE } from "./assertion-taxonomy.js";
import {
  CONFLIT,
  describeConflict,
  findConflicts,
  namedSubjectOf,
  summarizeConflicts
} from "./assertion-conflicts.js";

const ligne = (id, nature, subject, value, patch = {}) => ({
  id,
  project_id: "p1",
  nature,
  kind: nature === NATURE.CONTRAINTE ? "site-constraint" : "hypothesis",
  statement: `${subject} : ${value}`,
  status: "assumed",
  payload: { subject, value },
  ...patch
});

/* ── Une contrainte contre ce que le projet retient ──────────────────────── */

test("une règle et une valeur retenue font un conflit nommé comme tel", () => {
  // Mdall ne prononce pas de conformité : il constate que deux informations se
  // contredisent, et laisse quelqu'un décider.
  const conflits = findConflicts([
    ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"),
    ligne("h", NATURE.HYPOTHESE, "zone de neige", "A1")
  ]);

  assert.equal(conflits.length, 1);
  assert.equal(conflits[0].type, CONFLIT.REGLE_ET_VALEUR);
  assert.equal(conflits[0].ruleValue, "A2");
  assert.equal(conflits[0].heldValue, "A1");
});

test("la phrase décrit le conflit, elle ne juge pas qui a tort", () => {
  // Dire « non-conformité » reviendrait à avoir déjà jugé, donc à décider à la
  // place de celui qui sait.
  const [conflit] = findConflicts([
    ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"),
    ligne("h", NATURE.HYPOTHESE, "Zone de neige", "A1")
  ]);
  const dit = describeConflict(conflit);

  assert.match(dit.sentence, /la règle du site donne A2/);
  assert.match(dit.sentence, /le projet retient A1/);
  assert.match(dit.ask, /reprendre/);
  assert.doesNotMatch(dit.ask, /conform|faute|tort/i, "aucun vocabulaire de conformité");
  assert.doesNotMatch(dit.label, /conform/i);
});

test("une règle et une valeur retenue identiques ne font aucun écart", () => {
  assert.deepEqual(
    findConflicts([
      ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"),
      ligne("h", NATURE.HYPOTHESE, "Zone de neige", "a2")
    ]),
    []
  );
});

test("une virgule n'est pas un point : on n'interprète pas les valeurs", () => {
  // Décider en silence que « 0,2 » vaut « 0.2 » effacerait un écart réel le
  // jour où les deux écritures ne veulent pas dire la même chose.
  const conflits = findConflicts([
    ligne("c", NATURE.CONTRAINTE, "Profondeur hors gel", "0,80 m"),
    ligne("h", NATURE.HYPOTHESE, "Profondeur hors gel", "0.80 m")
  ]);

  assert.equal(conflits.length, 1);
});

/* ── Sans règle, c'est un différend ──────────────────────────────────────── */

test("deux valeurs de même rang font un conflit que rien ne départage", () => {
  const [conflit] = findConflicts([
    ligne("h1", NATURE.HYPOTHESE, "Portance du sol", "0,2 MPa"),
    ligne("h2", NATURE.HYPOTHESE, "Portance du sol", "0,15 MPa")
  ]);

  assert.equal(conflit.type, CONFLIT.DEUX_VALEURS);
  assert.equal(conflit.rule, null);
  assert.match(describeConflict(conflit).ask, /décider/);
  assert.doesNotMatch(describeConflict(conflit).ask, /faute/i);
});

test("deux règles pour un sujet renvoient à leur origine", () => {
  const [conflit] = findConflicts([
    ligne("c1", NATURE.CONTRAINTE, "Zone de vent", "2"),
    ligne("c2", NATURE.CONTRAINTE, "Zone de vent", "3")
  ]);

  assert.equal(conflit.type, CONFLIT.DEUX_REGLES);
  assert.match(describeConflict(conflit).ask, /ne se négocie pas/);
});

/* ── Rien n'est rapproché au jugé ────────────────────────────────────────── */

test("une affirmation qui ne nomme pas son sujet n'est comparée à rien", () => {
  // Rapprocher « Avis 166 » d'une zone de neige parce que deux mots se
  // ressemblent produirait des non-conformités imaginaires.
  const avis = { id: "a", nature: NATURE.CONSTAT, kind: "avis", statement: "Avis 166 — Zone de neige non justifiée", status: "assumed" };

  assert.equal(namedSubjectOf(avis), null);
  assert.deepEqual(findConflicts([ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"), avis]), []);
});

test("un sujet sans valeur ne se compare pas non plus", () => {
  assert.equal(namedSubjectOf({ payload: { subject: "Zone de neige" } }), null);
  assert.equal(namedSubjectOf({ payload: { value: "A2" } }), null);
});

test("chaque écart désigne des affirmations qu'on lui a données", () => {
  const donnees = [
    ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"),
    ligne("h", NATURE.HYPOTHESE, "Zone de neige", "A1")
  ];
  const ids = new Set(donnees.map((entry) => entry.id));

  for (const conflit of findConflicts(donnees)) {
    if (conflit.rule) assert.ok(ids.has(conflit.rule.id));
    if (conflit.held) assert.ok(ids.has(conflit.held.id));
  }
});

/* ── Ce qui ne vaut plus ne se dispute plus ──────────────────────────────── */

test("une valeur remplacée ne fait pas écart avec celle qui l'a remplacée", () => {
  assert.deepEqual(
    findConflicts([
      ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"),
      ligne("vieille", NATURE.HYPOTHESE, "Zone de neige", "A1", { superseded_by: "h" }),
      ligne("h", NATURE.HYPOTHESE, "Zone de neige", "A2")
    ]),
    []
  );
});

test("une affirmation écartée par le projet ne fait pas écart", () => {
  assert.deepEqual(
    findConflicts([
      ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"),
      ligne("h", NATURE.HYPOTHESE, "Zone de neige", "A1", { status: "rejected" })
    ]),
    []
  );
});

/* ── Le compte sépare ce qui ne se traite pas pareil ─────────────────────── */

test("chaque forme de conflit se compte à part", () => {
  // Un total unique ferait croire à une seule pile à traiter, alors qu'elles ne
  // se résolvent pas de la même façon.
  const resume = summarizeConflicts([
    { type: CONFLIT.REGLE_ET_VALEUR },
    { type: CONFLIT.DEUX_VALEURS },
    { type: CONFLIT.REGLE_ET_VALEUR },
    { type: CONFLIT.DEUX_REGLES }
  ]);

  assert.deepEqual(resume, { total: 4, ruleAgainstValue: 2, twoValues: 1, twoRules: 1 });
});

test("une mémoire vide ne signale rien", () => {
  assert.deepEqual(findConflicts([]), []);
  assert.deepEqual(findConflicts(), []);
});
