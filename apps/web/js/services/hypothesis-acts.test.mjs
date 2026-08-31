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

// Une vraie hypothèse : un essai la trancherait, et il n'a pas eu lieu. La
// zone de neige qui servait ici auparavant n'en était pas une — rien ne la
// mesure, un texte la fixe.
const hypothese = { id: "h1", project_id: "p", kind: "hypothesis", nature: "hypothese", statement: "Portance du sol : 0,2 MPa" };

const contrainte = { id: "c1", project_id: "p", kind: "constraint", nature: "contrainte", statement: "Zone de neige : A2" };

const constat = { id: "a1", project_id: "p", kind: "avis", nature: "constat", statement: "Fissure en pied de voile" };

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

test("on ne se prononce pas sur une contrainte", () => {
  // Cinq personnes d'accord ne déplacent pas une zone de neige, et cinq en
  // désaccord ne l'annulent pas. Ce qu'on peut faire à une contrainte fausse
  // est d'un autre ordre : la corriger.
  const plan = planAct({ assertion: contrainte, verdict: ACT.CONTESTED, proposedValue: "A1" });

  assert.equal(plan.ok, false);
  assert.match(plan.reason, /contrainte/i);
  assert.match(plan.reason, /tiers/i, "le refus dit ce qui la tranche, pas seulement qu'il refuse");
});

test("on ne conteste pas un constat : on en fait un autre, plus tard", () => {
  const plan = planAct({ assertion: constat, verdict: ACT.VALIDATED });

  assert.equal(plan.ok, false);
  assert.match(plan.reason, /constat/i);
});

test("une affirmation non classée ne se juge pas", () => {
  // Ne pas savoir ce que c'est n'autorise pas à s'y prononcer.
  const plan = planAct({ assertion: { id: "x", kind: "inconnu" }, verdict: ACT.VALIDATED });

  assert.equal(plan.ok, false);
  assert.match(plan.reason, /non class/i);
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

test("on compte des personnes, pas des actes", () => {
  // « validée 3 fois » ne dit pas si c'est trois avis ou trois clics du même.
  // La vérité n'est jamais absolue : ce qui compte est combien de gens la
  // tiennent, et combien la contestent.
  const suite = [
    acte(ACT.VALIDATED, "2026-08-01T00:00:00Z", { declared_by: "u-1" }),
    acte(ACT.VALIDATED, "2026-08-02T00:00:00Z", { declared_by: "u-2" }),
    acte(ACT.CONTESTED, "2026-08-03T00:00:00Z", { declared_by: "u-3" })
  ];

  const compte = corroboration("h1", suite);
  assert.equal(compte.validators, 2);
  assert.equal(compte.contesters, 1);

  const phrase = describeCorroboration(compte);
  assert.match(phrase, /2 personnes la valident/);
  assert.match(phrase, /1 personne la conteste/);
});

test("une personne qui se ravise ne compte que dans le camp où elle a fini", () => {
  const suite = [
    acte(ACT.VALIDATED, "2026-08-01T00:00:00Z", { declared_by: "u-1" }),
    acte(ACT.CONTESTED, "2026-08-05T00:00:00Z", { declared_by: "u-1" })
  ];

  const compte = corroboration("h1", suite);
  assert.equal(compte.validators, 0, "elle ne valide plus");
  assert.equal(compte.contesters, 1);
});

test("un acte sans auteur ne fait voter personne", () => {
  const compte = corroboration("h1", [acte(ACT.VALIDATED, "2026-08-01T00:00:00Z")]);

  assert.equal(compte.validations, 1, "l'acte existe");
  assert.equal(compte.validators, 0, "mais il ne compte pas comme une voix");
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
