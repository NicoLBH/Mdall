import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  READER,
  READERS,
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

/* ── Décisions et raisonnements : déclarés, vides, et qui disent pourquoi ── */

test("le rail suit un seul ordre, celui que le projet a demandé", () => {
  // Tout, puis ce qui s'impose, ce qu'on a tranché, le chemin qui y mène, **les
  // règles qu'il traverse**, ce qu'on a vu, ce qu'on suppose, ce que le projet
  // est.
  assert.deepEqual(READERS, [
    "all", "constraints", "decisions", "reasonings", "rules", "findings", "hypotheses", "base-data"
  ]);

  // Aucune lecture hors du rail : une lecture qu'aucune entrée ne montre serait
  // un filtre que personne ne peut atteindre.
  assert.deepEqual([...READERS].sort(), Object.values(READER).sort());
});

test("les deux lectures neuves ne rendent rien, et c'est la vérité du moment", () => {
  const memoire = [hypothese({ id: "h" }), avis({ id: "a" })];

  assert.deepEqual(readerRows(memoire, READER.DECISIONS), []);
  assert.deepEqual(readerRows(memoire, READER.REASONINGS), []);
});

test("une décision versée se lirait sans qu'on touche au filtre", () => {
  // Le filtre est écrit comme les autres : le jour où une ligne porte cette
  // nature, la lecture la montre. C'est ce qui rend l'étape 8 additive.
  const decision = { id: "d", kind: "decision", nature: "decision", statement: "Toiture en bac acier" };

  assert.deepEqual(readerRows([decision], READER.DECISIONS).map((ligne) => ligne.id), ["d"]);
  assert.deepEqual(readerRows([decision], READER.REASONINGS), []);
});

test("les deux entrées vides disent pourquoi elles sont vides", () => {
  // C'est tout leur objet : « aucune décision » laisserait croire que le projet
  // n'en a pas pris. Une lacune nommée vaut mieux qu'une absence silencieuse.
  const decisions = describeEmptyReader(READER.DECISIONS);
  assert.match(decisions, /Ce n'est pas qu'il n'en a pas pris/);
  assert.match(decisions, /Mdall ne savait pas encore les garder/);

  const raisonnements = describeEmptyReader(READER.REASONINGS);
  assert.match(raisonnements, /traverse des décisions humaines/);
  assert.match(raisonnements, /rien ne le devinera à partir du graphe/);
});

/* ── Les règles ont leur lecture ─────────────────────────────────────────────
 *
 * **Le défaut tel qu'il s'est vu.** On écrit un utilitaire, on en fait une
 * proposition, on la fusionne — et la fonction n'apparaît nulle part dans le
 * rail. On la cherche sous « Raisonnements », qui promettait pourtant « les
 * règles enchaînées », et l'on n'y trouve rien : une règle **n'a pas de
 * nature**, elle ne peut donc tomber sous aucune lecture qui filtre par nature.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Une règle versée : « si j'ai acheté une alèse, il faut la mettre ». */
const regle = (patch = {}) => ({
  id: patch.id ?? "r",
  subject_key: "mettre-alese-sur-lit",
  statement: "Mettre alèse sur lit = oui",
  status: "assumed",
  payload: {
    subject: "Mettre alèse sur lit",
    value: "oui",
    referentiel: true,
    regle: { conditions: [{ sujet: "Acheté alèse de lit", operateur: "=", valeur: ["oui"] }], sinon: "", sauf: [] }
  },
  ...patch
});

test("une règle versée se lit sous « Règles »", () => {
  const memoire = [regle(), hypothese({ id: "h" }), avis({ id: "a" })];

  assert.deepEqual(readerRows(memoire, READER.RULES).map((une) => une.id), ["r"]);
});

test("une règle ne tombe sous aucune lecture qui filtre par nature", () => {
  // Ce n'est pas un oubli : une règle n'affirme rien sur l'ouvrage. Lui donner
  // une nature ferait passer un texte pour un fait constaté.
  const memoire = [regle()];

  for (const lecture of [
    READER.CONSTRAINTS, READER.DECISIONS, READER.REASONINGS,
    READER.FINDINGS, READER.HYPOTHESES, READER.BASE_DATA
  ]) {
    assert.deepEqual(readerRows(memoire, lecture), [], lecture);
  }

  // Et « Tout » la montre, évidemment : elle est dans la mémoire.
  assert.equal(readerRows(memoire, READER.ALL).length, 1);
});

test("une règle remplacée ne se lit plus", () => {
  // Comme partout : une ligne remplacée ne décrit plus l'état du projet.
  const memoire = [regle({ id: "vieille", superseded_by: "r" }), regle({ id: "r" })];

  assert.deepEqual(readerRows(memoire, READER.RULES).map((une) => une.id), ["r"]);
});

test("« Raisonnements » ne promet plus les règles qu'il ne montre pas", () => {
  // **C'est l'intitulé qui envoyait chercher au mauvais endroit.** Il disait
  // « les règles enchaînées » et filtrait sur une nature qu'aucune règle ne
  // porte. Une phrase qui décrit autre chose que ce qu'elle liste coûte plus
  // cher qu'une phrase absente.
  assert.doesNotMatch(readerLead(READER.REASONINGS), /règles enchaînées/);
  assert.match(readerLead(READER.REASONINGS), /sous « Règles »/);

  // Et celui des règles dit ce qu'une règle est, et ce qu'elle n'est pas.
  assert.match(readerLead(READER.RULES), /Une règle n'affirme rien/);
  assert.equal(readerLabel(READER.RULES), "Règles");
});

test("chaque lecture du rail a sa requête, et son vocabulaire dans la barre", () => {
  /**
   * **Cette épreuve relit l'écran, et c'est l'exception qui le justifie.**
   *
   * `project-memory.js` ne se charge pas ici, et rien dans un rendu ne montre
   * ce défaut-là : le bouton du rail s'affiche, on clique, et il écrit dans la
   * barre une requête que la barre ne sait pas lire. La liste ne bouge pas, et
   * aucun message ne dit pourquoi.
   *
   * Les deux moitiés vont ensemble : une lecture sans requête ne se corrige pas
   * au clavier, et une requête sans vocabulaire ne se lit pas.
   */
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "..", "views", "project-memory.js"),
    "utf8"
  );

  const filtres = source.slice(source.indexOf("const READER_FILTERS = {"), source.indexOf("};", source.indexOf("const READER_FILTERS = {")));
  for (const lecture of READERS) {
    assert.match(filtres, new RegExp(`\\[READER\\.${
      Object.keys(READER).find((cle) => READER[cle] === lecture)}\\]`),
      `la lecture « ${readerLabel(lecture)} » n'a pas de requête équivalente`);
  }

  // Et le champ que la lecture des règles emploie existe dans la barre : sans
  // lui, `regle:oui` se lit comme du texte libre et ne filtre rien.
  assert.match(source, /\{ key: "regle", label: "Règles", values: \[\{ value: "oui"/);
});
