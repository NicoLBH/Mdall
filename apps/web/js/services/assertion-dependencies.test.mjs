import test from "node:test";
import assert from "node:assert/strict";

import {
  dependenciesOf,
  dependentsOf,
  describeDependents,
  describeReviewFlag,
  needsReview,
  pendingReviews,
  planDependency,
  planReviewFlags
} from "./assertion-dependencies.js";

const hypothese = (id, patch = {}) => ({
  id,
  project_id: "projet-1",
  kind: "avis",
  nature: "hypothese",
  subject_key: "zone-neige",
  statement: "Zone de neige : A2",
  ...patch
});

const constat = (id, patch = {}) => ({
  id,
  project_id: "projet-1",
  kind: "avis",
  subject_key: "166",
  statement: "Avis 166 — Réserve béton",
  ...patch
});

const lien = (cible, source) => ({ assertion_id: cible, depends_on_assertion_id: source });

/* ── Le drapeau est une comparaison, pas un état ─────────────────────────── */

test("une affirmation jamais suspectée n'attend rien", () => {
  assert.equal(needsReview(constat("a")), false);
});

test("suspectée et jamais revérifiée : le drapeau est levé", () => {
  assert.equal(needsReview(constat("a", { needs_review_since: "2026-08-12T00:00:00.000Z" })), true);
});

test("revérifiée après la suspicion : le drapeau retombe", () => {
  const revue = constat("a", {
    needs_review_since: "2026-08-12T00:00:00.000Z",
    reviewed_at: "2026-08-14T00:00:00.000Z"
  });

  assert.equal(needsReview(revue), false);
});

test("une vérification antérieure à la suspicion ne compte pas", () => {
  // Elle portait sur un état du monde qui a changé depuis.
  const ancienne = constat("a", {
    needs_review_since: "2026-08-12T00:00:00.000Z",
    reviewed_at: "2026-08-01T00:00:00.000Z"
  });

  assert.equal(needsReview(ancienne), true);
});

test("une hypothèse qui rechange relève le drapeau sans rien effacer", () => {
  const revue = constat("a", {
    needs_review_since: "2026-08-14T00:00:00.000Z",
    reviewed_at: "2026-08-13T00:00:00.000Z"
  });

  assert.equal(needsReview(revue), true, "la nouvelle suspicion repasse devant l'ancienne vérification");
});

test("une date illisible ne lève pas de drapeau au hasard", () => {
  assert.equal(needsReview(constat("a", { needs_review_since: "bientôt" })), false);
});

/* ── Seules les hypothèses entraînent ────────────────────────────────────── */

test("une hypothèse remplacée rend suspect ce qui repose dessus", () => {
  const marques = planReviewFlags([hypothese("h1")], [lien("n1", "h1")], "2026-08-12T00:00:00.000Z");

  assert.equal(marques.length, 1);
  assert.equal(marques[0].assertionId, "n1");
  assert.equal(marques[0].since, "2026-08-12T00:00:00.000Z");
  assert.equal(marques[0].hypothesisId, "h1");
});

test("un constat remplacé n'entraîne rien", () => {
  // Une réserve levée ne rend pas la note de calcul suspecte. Si tout mouvement
  // propageait un drapeau, la moitié du projet serait « à revérifier » au
  // premier lot de rapports.
  assert.deepEqual(planReviewFlags([constat("c1")], [lien("n1", "c1")], "2026-08-12T00:00:00.000Z"), []);
});

test("une hypothèse sans dépendance ne dit rien de faux", () => {
  assert.deepEqual(planReviewFlags([hypothese("h1")], [], "2026-08-12T00:00:00.000Z"), []);
});

test("une affirmation qui repose sur deux hypothèses remplacées n'est marquée qu'une fois", () => {
  const marques = planReviewFlags(
    [hypothese("h1"), hypothese("h2", { subject_key: "portance" })],
    [lien("n1", "h1"), lien("n1", "h2")],
    "2026-08-12T00:00:00.000Z"
  );

  assert.equal(marques.length, 1);
});

test("rien ne se propage en cascade", () => {
  // A repose sur B qui repose sur l'hypothèse : changer l'hypothèse ne marque
  // que B. Marquer tout l'aval rendrait le signal inutilisable.
  const marques = planReviewFlags([hypothese("h1")], [lien("b", "h1"), lien("a", "b")], "2026-08-12T00:00:00.000Z");

  assert.deepEqual(marques.map((entry) => entry.assertionId), ["b"]);
});

/* ── Les deux sens du graphe ─────────────────────────────────────────────── */

test("on lit ce qui repose sur une affirmation, et ce sur quoi elle repose", () => {
  const liens = [lien("n1", "h1"), lien("n2", "h1"), lien("n1", "h2")];

  assert.deepEqual(dependentsOf("h1", liens), ["n1", "n2"]);
  assert.deepEqual(dependenciesOf("n1", liens), ["h1", "h2"]);
  assert.deepEqual(dependentsOf("", liens), []);
});

/* ── Ce qu'on refuse d'écrire ────────────────────────────────────────────── */

test("une affirmation ne peut pas reposer sur elle-même", () => {
  const plan = planDependency({ assertion: hypothese("h1"), dependsOn: hypothese("h1") });

  assert.equal(plan.ok, false);
  assert.match(plan.reason, /elle-même/);
});

test("on ne repose que sur une hypothèse", () => {
  // Dire qu'une note repose sur un avis de chantier serait un abus de langage
  // qui rendrait le signal illisible le jour où cet avis change.
  const plan = planDependency({ assertion: constat("n1"), dependsOn: constat("c1") });

  assert.equal(plan.ok, false);
  assert.match(plan.reason, /hypothèse/);
});

test("un lien déjà déclaré ne se redéclare pas", () => {
  const plan = planDependency({
    assertion: constat("n1"),
    dependsOn: hypothese("h1"),
    existing: [lien("n1", "h1")]
  });

  assert.equal(plan.ok, false);
});

test("un lien recevable porte son projet et son auteur", () => {
  const plan = planDependency({
    assertion: constat("n1"),
    dependsOn: hypothese("h1"),
    declaredBy: "u-1"
  });

  assert.equal(plan.ok, true);
  assert.deepEqual(plan.link, {
    project_id: "projet-1",
    assertion_id: "n1",
    depends_on_assertion_id: "h1",
    declared_by: "u-1"
  });
});

/* ── Ce que l'écran dit ──────────────────────────────────────────────────── */

test("le bandeau nomme l'hypothèse et la date", () => {
  // « À revérifier » sans dire pourquoi ni depuis quand est une inquiétude,
  // pas une information.
  const phrase = describeReviewFlag(
    constat("n1", { needs_review_since: "2026-08-12T00:00:00.000Z" }),
    hypothese("h1")
  );

  assert.match(phrase, /12 août 2026/);
  assert.match(phrase, /Zone de neige : A2/);
});

test("sans hypothèse connue, le bandeau dit au moins depuis quand", () => {
  const phrase = describeReviewFlag(constat("n1", { needs_review_since: "2026-08-12T00:00:00.000Z" }));

  assert.match(phrase, /12 août 2026/);
  assert.doesNotMatch(phrase, /:/);
});

test("une affirmation qui n'attend rien n'affiche pas de bandeau", () => {
  assert.equal(describeReviewFlag(constat("n1")), "");
});

test("le compteur d'une hypothèse s'accorde, et se tait à zéro", () => {
  assert.equal(describeDependents(0), "");
  assert.equal(describeDependents(1), "1 affirmation à revérifier");
  assert.equal(describeDependents(7), "7 affirmations à revérifier");
});

test("les affirmations en attente se lisent d'un coup", () => {
  const lignes = [
    constat("a", { needs_review_since: "2026-08-12T00:00:00.000Z" }),
    constat("b"),
    constat("c", { needs_review_since: "2026-08-12T00:00:00.000Z", reviewed_at: "2026-08-13T00:00:00.000Z" })
  ];

  assert.deepEqual(pendingReviews(lignes).map((entry) => entry.id), ["a"]);
});
