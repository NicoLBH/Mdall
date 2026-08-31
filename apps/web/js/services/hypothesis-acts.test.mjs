import test from "node:test";
import assert from "node:assert/strict";

import {
  ACT,
  HYPOTHESIS_STATE,
  actsOf,
  corroboration,
  describeCorroboration,
  planAct,
  planContestationFlags,
  stateLabel,
  stateOf
} from "./hypothesis-acts.js";

const hypothese = { id: "h1", project_id: "p", kind: "hypothesis", nature: "hypothese", statement: "Zone de neige : A1" };

const acte = (verdict, at, patch = {}) => ({
  assertion_id: "h1",
  verdict,
  created_at: at,
  ...patch
});

/* ── L'état se déduit, il ne se stocke pas ───────────────────────────────── */

test("une hypothèse que personne n'a jugée est candidate", () => {
  assert.equal(stateOf("h1", []).state, HYPOTHESIS_STATE.CANDIDATE);
  assert.equal(stateOf("h1", [acte(ACT.EMITTED, "2026-08-01T00:00:00Z")]).state, HYPOTHESIS_STATE.CANDIDATE);
});

test("une émission ne se prononce pas sur elle-même", () => {
  // Sans quoi toute hypothèse serait « validée » par sa propre déclaration, ce
  // qui viderait le mot de son sens.
  const etat = stateOf("h1", [acte(ACT.EMITTED, "2026-08-01T00:00:00Z")]);
  assert.equal(etat.state, HYPOTHESIS_STATE.CANDIDATE);
  assert.equal(etat.since, null);
});

test("le dernier acte fait foi", () => {
  const suite = [
    acte(ACT.EMITTED, "2026-08-01T00:00:00Z"),
    acte(ACT.VALIDATED, "2026-08-05T00:00:00Z"),
    acte(ACT.CONTESTED, "2026-08-12T00:00:00Z")
  ];

  assert.equal(stateOf("h1", suite).state, HYPOTHESIS_STATE.CONTESTED);
});

test("une validation postérieure rétablit une hypothèse contestée", () => {
  const suite = [
    acte(ACT.CONTESTED, "2026-08-12T00:00:00Z"),
    acte(ACT.VALIDATED, "2026-08-20T00:00:00Z")
  ];

  assert.equal(stateOf("h1", suite).state, HYPOTHESIS_STATE.VALIDATED);
});

test("on ne compte pas les voix", () => {
  // Trois validations puis une contestation : l'hypothèse est contestée. Faire
  // voter des gens qui ne se sont pas prononcés en même temps sur la même chose
  // n'aurait aucun sens.
  const suite = [
    acte(ACT.VALIDATED, "2026-08-01T00:00:00Z"),
    acte(ACT.VALIDATED, "2026-08-02T00:00:00Z"),
    acte(ACT.VALIDATED, "2026-08-03T00:00:00Z"),
    acte(ACT.CONTESTED, "2026-08-04T00:00:00Z")
  ];

  assert.equal(stateOf("h1", suite).state, HYPOTHESIS_STATE.CONTESTED);
});

test("les actes d'une autre hypothèse ne comptent pas", () => {
  const suite = [acte(ACT.CONTESTED, "2026-08-12T00:00:00Z", { assertion_id: "h2" })];
  assert.equal(stateOf("h1", suite).state, HYPOTHESIS_STATE.CANDIDATE);
});

test("les actes se lisent dans l'ordre du temps, quel que soit leur ordre d'arrivée", () => {
  const suite = [
    acte(ACT.CONTESTED, "2026-08-12T00:00:00Z"),
    acte(ACT.EMITTED, "2026-08-01T00:00:00Z"),
    acte(ACT.VALIDATED, "2026-08-20T00:00:00Z")
  ];

  assert.deepEqual(actsOf("h1", suite).map((entry) => entry.verdict), [ACT.EMITTED, ACT.CONTESTED, ACT.VALIDATED]);
  assert.equal(stateOf("h1", suite).state, HYPOTHESIS_STATE.VALIDATED);
});

/* ── Une contestation peut avancer une valeur, sans la faire entrer ──────── */

test("la valeur avancée par une contestation se lit sur l'état", () => {
  const suite = [
    acte(ACT.CONTESTED, "2026-08-12T00:00:00Z", { proposed_value: "E", note: "le projet est en zone E" })
  ];

  const etat = stateOf("h1", suite);
  assert.equal(etat.proposedValue, "E");
  assert.equal(etat.note, "le projet est en zone E");
});

test("une validation ne peut pas avancer une valeur concurrente", () => {
  // Valider une valeur et en proposer une autre dans le même geste n'a pas de
  // sens.
  const plan = planAct({ assertion: hypothese, verdict: ACT.VALIDATED, proposedValue: "E" });

  assert.equal(plan.ok, true);
  assert.equal(plan.act.proposed_value, null);
});

test("une contestation garde ce qu'elle avance", () => {
  const plan = planAct({
    assertion: hypothese,
    verdict: ACT.CONTESTED,
    proposedValue: "E",
    note: "le projet est en zone E",
    sourceAssertionId: "avis-166",
    declaredBy: "u-1"
  });

  assert.equal(plan.act.proposed_value, "E");
  assert.equal(plan.act.source_assertion_id, "avis-166", "on remonte de la validation au document qui l'établit");
});

test("un verdict inconnu est refusé, et le refus est nommé", () => {
  const plan = planAct({ assertion: hypothese, verdict: "peut-être" });
  assert.equal(plan.ok, false);
  assert.match(plan.reason, /émission|validation|contestation/);
});

test("un acte sans hypothèse est refusé", () => {
  assert.equal(planAct({ verdict: ACT.VALIDATED }).ok, false);
});

/* ── La répétition n'est pas une validation ──────────────────────────────── */

test("la corroboration compte les sources distinctes", () => {
  // Un même document qui reprend dix fois la même valeur ne compte qu'une fois,
  // sinon la mise en page d'un rapport ferait sa crédibilité.
  const suite = [
    acte(ACT.EMITTED, "2026-08-01T00:00:00Z", { source_assertion_id: "a1" }),
    acte(ACT.EMITTED, "2026-08-02T00:00:00Z", { source_assertion_id: "a1" }),
    acte(ACT.EMITTED, "2026-08-03T00:00:00Z", { source_assertion_id: "a2" })
  ];

  assert.equal(corroboration("h1", suite).sources, 2);
});

test("une hypothèse reprise mais jamais validée le dit", () => {
  const suite = [
    acte(ACT.EMITTED, "2026-08-01T00:00:00Z", { source_assertion_id: "a1" }),
    acte(ACT.EMITTED, "2026-08-02T00:00:00Z", { source_assertion_id: "a2" }),
    acte(ACT.EMITTED, "2026-08-03T00:00:00Z", { source_assertion_id: "a3" })
  ];

  const phrase = describeCorroboration(corroboration("h1", suite));
  assert.match(phrase, /jamais validée/);
  assert.match(phrase, /3 sources/);
  assert.doesNotMatch(phrase, /validée \d/, "la répétition ne se convertit pas en validation");
});

test("une hypothèse sans le moindre acte ne prétend rien", () => {
  assert.equal(describeCorroboration(corroboration("h1", [])), "jamais validée");
});

test("validations et contestations se disent ensemble", () => {
  const suite = [
    acte(ACT.VALIDATED, "2026-08-01T00:00:00Z", { declared_by: "u-1" }),
    acte(ACT.CONTESTED, "2026-08-02T00:00:00Z", { declared_by: "u-2" })
  ];

  const phrase = describeCorroboration(corroboration("h1", suite));
  assert.match(phrase, /validée 1 fois/);
  assert.match(phrase, /contestée 1 fois/);
});

/* ── On marque dès la contestation ───────────────────────────────────────── */

test("une contestation rend suspect ce qui repose sur l'hypothèse", () => {
  // Attendre le remplacement, c'est laisser passer des semaines pendant
  // lesquelles quelqu'un bâtit sur une valeur qu'on sait déjà douteuse.
  const marques = planContestationFlags(
    { assertion_id: "h1", verdict: ACT.CONTESTED, created_at: "2026-08-12T00:00:00Z" },
    [{ assertion_id: "n1", depends_on_assertion_id: "h1" }]
  );

  assert.deepEqual(marques, [{ assertionId: "n1", since: "2026-08-12T00:00:00Z", hypothesisId: "h1" }]);
});

test("une validation ne marque rien : elle rassure, elle n'invalide pas", () => {
  const marques = planContestationFlags(
    { assertion_id: "h1", verdict: ACT.VALIDATED, created_at: "2026-08-12T00:00:00Z" },
    [{ assertion_id: "n1", depends_on_assertion_id: "h1" }]
  );

  assert.deepEqual(marques, []);
});

test("une contestation sans dépendance ne dit rien de faux", () => {
  const marques = planContestationFlags(
    { assertion_id: "h1", verdict: ACT.CONTESTED, created_at: "2026-08-12T00:00:00Z" },
    []
  );

  assert.deepEqual(marques, []);
});

test("les états portent un nom français", () => {
  assert.equal(stateLabel(HYPOTHESIS_STATE.CANDIDATE), "Candidate");
  assert.equal(stateLabel(HYPOTHESIS_STATE.VALIDATED), "Validée");
  assert.equal(stateLabel(HYPOTHESIS_STATE.CONTESTED), "Contestée");
  assert.equal(stateLabel("n'importe quoi"), "Candidate");
});
