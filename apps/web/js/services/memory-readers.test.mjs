import test from "node:test";
import assert from "node:assert/strict";

import {
  READER,
  currentHypotheses,
  describeEmptyReader,
  groupByDomain,
  isOpenFinding,
  readerLabel,
  readerLead,
  readerRows,
  summarizeReader
} from "./memory-readers.js";

const avis = (patch = {}) => ({
  id: patch.id ?? "a",
  kind: "avis",
  subject_key: patch.subject_key ?? "43",
  statement: "Avis 43",
  status: "assumed",
  payload: { status: "OPEN", ...(patch.payload ?? {}) },
  ...patch
});

const hypothese = (patch = {}) => ({
  id: patch.id ?? "h",
  kind: "hypothesis",
  nature: "hypothese",
  subject_key: patch.subject_key ?? "zone-de-neige",
  statement: "Zone de neige : A2",
  status: "assumed",
  ...patch
});

const contrainte = (patch = {}) => ({
  id: patch.id ?? "c",
  kind: "avis",
  nature: "contrainte",
  subject_key: "plu-art-11",
  statement: "PLU article 11 : toiture en tuiles",
  status: "assumed",
  ...patch
});

/* ── Une lecture ne peut pas inventer une ligne ──────────────────────────── */

test("chaque lecture est un sous-ensemble de ce qu'on lui donne", () => {
  const memoire = [avis(), hypothese(), contrainte(), { id: "d", kind: "document", status: "assumed" }];

  for (const lecture of Object.values(READER)) {
    const lues = readerRows(memoire, lecture);
    assert.ok(lues.every((ligne) => memoire.includes(ligne)), `${lecture} a inventé une ligne`);
    assert.ok(lues.length <= memoire.length);
  }
});

test("« Tout » ne retire rien, pas même ce qui a été remplacé", () => {
  const memoire = [avis(), hypothese({ superseded_by: "autre" })];
  assert.equal(readerRows(memoire, READER.ALL).length, 2);
});

/* ── Les hypothèses ──────────────────────────────────────────────────────── */

test("une hypothèse remplacée n'apparaît qu'à sa valeur en vigueur", () => {
  // C'est tout l'objet de cette lecture : montrer ce qui vaut, pas l'histoire
  // des valeurs successives. L'histoire se lit dans le détail.
  const memoire = [
    hypothese({ id: "h1", statement: "Zone de neige : A2", superseded_by: "h2" }),
    hypothese({ id: "h2", statement: "Zone de neige : E" })
  ];

  const lues = readerRows(memoire, READER.HYPOTHESES);
  assert.equal(lues.length, 1);
  assert.equal(lues[0].statement, "Zone de neige : E");
});

test("les hypothèses ne ramassent ni constats ni documents", () => {
  const memoire = [avis(), hypothese(), { id: "d", kind: "document", status: "assumed" }];
  assert.deepEqual(currentHypotheses(memoire).map((entry) => entry.id), ["h"]);
});

/* ── Les constats en cours ───────────────────────────────────────────────── */

test("un avis levé n'est plus en cours", () => {
  assert.equal(isOpenFinding(avis({ payload: { status: "RESOLVED" } })), false);
  assert.equal(isOpenFinding(avis({ payload: { status: "OPEN" } })), true);
});

test("un avis constaté reste en cours", () => {
  // `REPORTED` veut dire que le rapport l'a constaté, pas qu'il est levé. Le
  // compter comme clos ferait disparaître les deux tiers d'un rapport de
  // contrôle sous prétexte qu'il porte des F.
  assert.equal(isOpenFinding(avis({ payload: { status: "REPORTED", opinion: "F" } })), true);
});

test("un constat écarté par le projet n'est pas en cours", () => {
  assert.equal(isOpenFinding(avis({ status: "rejected" })), false);
});

test("une hypothèse n'est pas un constat en cours", () => {
  assert.equal(isOpenFinding(hypothese()), false);
});

test("un constat remplacé ne compte plus", () => {
  const memoire = [avis({ id: "a1", superseded_by: "a2" }), avis({ id: "a2" })];
  assert.deepEqual(readerRows(memoire, READER.FINDINGS).map((entry) => entry.id), ["a2"]);
});

/* ── Les contraintes ─────────────────────────────────────────────────────── */

test("les contraintes ne ramassent que ce qui est déclaré contrainte", () => {
  const memoire = [avis(), hypothese(), contrainte()];
  assert.deepEqual(readerRows(memoire, READER.CONSTRAINTS).map((entry) => entry.id), ["c"]);
});

/* ── Le regroupement par domaine ─────────────────────────────────────────── */

test("les domaines gardent l'ordre du métier, jamais celui du nombre", () => {
  // Un classement qui bouge à chaque dépôt ne se mémorise pas.
  const groupes = groupByDomain([
    avis({ id: "a1", domain: "incendie" }),
    avis({ id: "a2", domain: "structure" }),
    avis({ id: "a3", domain: "incendie" }),
    avis({ id: "a4", domain: "incendie" })
  ]);

  assert.deepEqual(groupes.map((groupe) => groupe.domain), ["structure", "incendie"]);
});

test("ce qui n'est pas classé vient en dernier, et porte son groupe", () => {
  const groupes = groupByDomain([avis({ id: "a1" }), avis({ id: "a2", domain: "sol" })]);

  assert.equal(groupes[groupes.length - 1].domain, null);
  assert.equal(groupes[groupes.length - 1].label, "Sans domaine");
  assert.equal(groupes[groupes.length - 1].rows.length, 1);
});

test("un domaine sans ligne ne s'affiche pas : c'est une liste, pas un inventaire", () => {
  const groupes = groupByDomain([avis({ domain: "sol" })]);
  assert.equal(groupes.length, 1);
});

test("le regroupement ne perd aucune ligne", () => {
  const lignes = [avis({ id: "a1" }), avis({ id: "a2", domain: "sol" }), avis({ id: "a3", domain: "incendie" })];
  const total = groupByDomain(lignes).reduce((somme, groupe) => somme + groupe.rows.length, 0);

  assert.equal(total, lignes.length);
});

/* ── Ce que la lecture dit d'elle-même ───────────────────────────────────── */

test("le nombre de non classés se compte à part", () => {
  const resume = summarizeReader([avis({ id: "a1" }), avis({ id: "a2", domain: "sol" })]);

  assert.equal(resume.total, 2);
  assert.equal(resume.domains, 1);
  assert.equal(resume.unclassified, 1);
});

test("une lecture vide ne dit pas la même chose selon la lecture", () => {
  // « Aucune contrainte » ne dit pas que le projet n'en a pas : il n'en a
  // encore versé aucune.
  assert.match(describeEmptyReader(READER.CONSTRAINTS), /rien ne les extrait encore/);
  assert.match(describeEmptyReader(READER.HYPOTHESES), /se déclarent/);
  assert.match(describeEmptyReader(READER.FINDINGS), /levé ou écarté/);
});

test("chaque lecture porte un nom et une promesse", () => {
  for (const lecture of Object.values(READER)) {
    assert.ok(readerLabel(lecture).length > 0);
    assert.ok(readerLead(lecture).length > 20, `${lecture} ne dit pas ce qu'elle filtre`);
  }
});
