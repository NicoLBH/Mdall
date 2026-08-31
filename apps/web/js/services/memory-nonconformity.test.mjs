import test from "node:test";
import assert from "node:assert/strict";

import { NATURE } from "./assertion-taxonomy.js";
import {
  ECART,
  describeEcart,
  findNonConformities,
  namedSubjectOf,
  summarizeEcarts
} from "./memory-nonconformity.js";

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

test("la règle contre la valeur retenue est une non-conformité, pas une contradiction", () => {
  // On ne « garde » pas A1 : il n'y a pas de différend, il y a une faute.
  const ecarts = findNonConformities([
    ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"),
    ligne("h", NATURE.HYPOTHESE, "zone de neige", "A1")
  ]);

  assert.equal(ecarts.length, 1);
  assert.equal(ecarts[0].type, ECART.NON_CONFORMITE);
  assert.equal(ecarts[0].ruleValue, "A2");
  assert.equal(ecarts[0].heldValue, "A1");
});

test("la phrase ne propose pas de trancher entre les deux", () => {
  // Dire « non-conformité » puis offrir d'arbitrer annulerait le mot.
  const [ecart] = findNonConformities([
    ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"),
    ligne("h", NATURE.HYPOTHESE, "Zone de neige", "A1")
  ]);
  const dit = describeEcart(ecart);

  assert.match(dit.sentence, /la règle du site donne A2/);
  assert.match(dit.sentence, /le projet retient A1/);
  assert.match(dit.ask, /corrige|fausse/);
  assert.doesNotMatch(dit.ask, /garde|assume/);
});

test("une règle et une valeur retenue identiques ne font aucun écart", () => {
  assert.deepEqual(
    findNonConformities([
      ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"),
      ligne("h", NATURE.HYPOTHESE, "Zone de neige", "a2")
    ]),
    []
  );
});

test("une virgule n'est pas un point : on n'interprète pas les valeurs", () => {
  // Décider en silence que « 0,2 » vaut « 0.2 » effacerait un écart réel le
  // jour où les deux écritures ne veulent pas dire la même chose.
  const ecarts = findNonConformities([
    ligne("c", NATURE.CONTRAINTE, "Profondeur hors gel", "0,80 m"),
    ligne("h", NATURE.HYPOTHESE, "Profondeur hors gel", "0.80 m")
  ]);

  assert.equal(ecarts.length, 1);
});

/* ── Sans règle, c'est un différend ──────────────────────────────────────── */

test("deux hypothèses divergentes restent une contradiction : personne n'est en faute", () => {
  const [ecart] = findNonConformities([
    ligne("h1", NATURE.HYPOTHESE, "Portance du sol", "0,2 MPa"),
    ligne("h2", NATURE.HYPOTHESE, "Portance du sol", "0,15 MPa")
  ]);

  assert.equal(ecart.type, ECART.CONTRADICTION);
  assert.equal(ecart.rule, null);
  assert.match(describeEcart(ecart).ask, /décider/);
});

test("deux règles pour un sujet ne s'arbitrent pas : l'une est fausse", () => {
  const [ecart] = findNonConformities([
    ligne("c1", NATURE.CONTRAINTE, "Zone de vent", "2"),
    ligne("c2", NATURE.CONTRAINTE, "Zone de vent", "3")
  ]);

  assert.equal(ecart.type, ECART.REGLE_DOUBLE);
  assert.match(describeEcart(ecart).ask, /ne se négocie pas/);
});

/* ── Rien n'est rapproché au jugé ────────────────────────────────────────── */

test("une affirmation qui ne nomme pas son sujet n'est comparée à rien", () => {
  // Rapprocher « Avis 166 » d'une zone de neige parce que deux mots se
  // ressemblent produirait des non-conformités imaginaires.
  const avis = { id: "a", nature: NATURE.CONSTAT, kind: "avis", statement: "Avis 166 — Zone de neige non justifiée", status: "assumed" };

  assert.equal(namedSubjectOf(avis), null);
  assert.deepEqual(findNonConformities([ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"), avis]), []);
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

  for (const ecart of findNonConformities(donnees)) {
    if (ecart.rule) assert.ok(ids.has(ecart.rule.id));
    if (ecart.held) assert.ok(ids.has(ecart.held.id));
  }
});

/* ── Ce qui ne vaut plus ne se dispute plus ──────────────────────────────── */

test("une valeur remplacée ne fait pas écart avec celle qui l'a remplacée", () => {
  assert.deepEqual(
    findNonConformities([
      ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"),
      ligne("vieille", NATURE.HYPOTHESE, "Zone de neige", "A1", { superseded_by: "h" }),
      ligne("h", NATURE.HYPOTHESE, "Zone de neige", "A2")
    ]),
    []
  );
});

test("une affirmation écartée par le projet ne fait pas écart", () => {
  assert.deepEqual(
    findNonConformities([
      ligne("c", NATURE.CONTRAINTE, "Zone de neige", "A2"),
      ligne("h", NATURE.HYPOTHESE, "Zone de neige", "A1", { status: "rejected" })
    ]),
    []
  );
});

/* ── Le compte sépare ce qui ne se traite pas pareil ─────────────────────── */

test("les non-conformités se comptent à part", () => {
  const resume = summarizeEcarts([
    { type: ECART.NON_CONFORMITE },
    { type: ECART.CONTRADICTION },
    { type: ECART.NON_CONFORMITE },
    { type: ECART.REGLE_DOUBLE }
  ]);

  assert.deepEqual(resume, { total: 4, nonConformities: 2, contradictions: 1, doubleRules: 1 });
});

test("une mémoire vide ne signale rien", () => {
  assert.deepEqual(findNonConformities([]), []);
  assert.deepEqual(findNonConformities(), []);
});
