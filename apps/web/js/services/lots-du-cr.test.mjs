/**
 * Les lots d'un compte rendu, **exécutés**.
 *
 * Le défaut qu'on évite ici ne se voit pas : un lot manquant ne s'affiche pas,
 * ce qui s'affiche est une poignée de points sans rattachement qu'on croit mal
 * lus. Et le défaut inverse — trois lots créés pour un seul, parce que le
 * document l'écrit de trois façons — ne se voit pas davantage, jusqu'au jour où
 * la liste du projet en compte soixante.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  estUnLot, lotsAProposer, lotsDuCompteRendu, memeLot, nomDuLot, numeroDuLot, phraseDesLots
} from "./lots-du-cr.js";

/* ── Reconnaître un lot ──────────────────────────────────────────────────── */

test("le numéro d'un lot se lit sous toutes ses écritures", () => {
  assert.equal(numeroDuLot("02 — GROS ŒUVRE"), "2");
  assert.equal(numeroDuLot("LOT 02"), "2");
  assert.equal(numeroDuLot("Lot n° 2 - Gros oeuvre"), "2");
  assert.equal(numeroDuLot("2"), "2");
  assert.equal(numeroDuLot("GROS ŒUVRE"), "");
});

/**
 * **« 12.02.1 » est une référence de point, pas un numéro de lot.** En faire un
 * lot en créerait autant que le compte rendu a de points.
 */
test("une référence de point n'est pas un lot", () => {
  assert.equal(numeroDuLot("12.02.1"), "");
  assert.equal(estUnLot("12.02.1"), false);
  assert.equal(estUnLot("4.3"), false);
  assert.equal(estUnLot(""), false);
  assert.equal(estUnLot("02 — GROS ŒUVRE"), true);
  assert.equal(estUnLot("CHARPENTE"), true);
});

test("le nom d'un lot se compare sans son numéro ni ses accents", () => {
  assert.equal(nomDuLot("02 — GROS ŒUVRE"), "gros oeuvre");
  assert.equal(nomDuLot("Gros œuvre"), "gros oeuvre");
  assert.equal(nomDuLot("LOT 02 : Gros-oeuvre"), "gros oeuvre");
});

/**
 * **Le numéro tranche quand les deux en ont un.** « 02 gros œuvre » et « 03
 * gros œuvre démolition » existent sur les mêmes chantiers.
 */
test("deux écritures d'un même lot se reconnaissent, deux lots distincts non", () => {
  assert.equal(memeLot("02 — GROS ŒUVRE", "Gros œuvre"), true);
  assert.equal(memeLot("02 — GROS ŒUVRE", "LOT 02"), true);
  assert.equal(memeLot("02 — GROS ŒUVRE", "Lot n° 2 - Gros-oeuvre"), true);

  assert.equal(memeLot("02 — GROS ŒUVRE", "03 — GROS ŒUVRE DÉMOLITION"), false);
  assert.equal(memeLot("02 — GROS ŒUVRE", "05 — CHARPENTE"), false);
  assert.equal(memeLot("", "02"), false);
});

/* ── Les lots d'un compte rendu ──────────────────────────────────────────── */

const POINTS = [
  { lot: "05 — CHARPENTE" },
  { lot: "02 — GROS ŒUVRE" },
  { lot: "LOT 02" },
  { lot: "12.02.1" },
  { lot: "" }
];

test("un lot écrit de deux façons ne compte qu'une fois", () => {
  const lots = lotsDuCompteRendu(POINTS);

  assert.deepEqual(lots.map((lot) => lot.numero), ["2", "5"]);
  // Le premier intitulé rencontré fait foi : c'est celui qu'on proposerait.
  assert.equal(lots[0].intitule, "02 — GROS ŒUVRE");
  assert.equal(lots[0].points, 2);
  assert.equal(lots[1].points, 1);
});

/* ── Ce qui manque au projet ─────────────────────────────────────────────── */

test("un lot que le projet connaît sous un autre nom n'est pas proposé", () => {
  const proposition = lotsAProposer(POINTS, [
    { code: "GO", label: "Gros oeuvre" },
    { code: "PLA", label: "Plâtrerie" }
  ]);

  assert.equal(proposition.connu, true);
  assert.deepEqual(proposition.presents.map((lot) => lot.numero), ["2"]);
  assert.deepEqual(proposition.manquants.map((lot) => lot.numero), ["5"]);
  assert.match(phraseDesLots(proposition), /1 lot .* manque au projet/);
});

/**
 * **Ne pas savoir n'est pas « le projet n'en a aucun ».** Proposer d'ajouter
 * des lots qui sont peut-être déjà là ferait doubler la liste du projet, et
 * personne ne la nettoiera (règle 5).
 */
test("sans les lots du projet, on ne propose rien — et on le dit", () => {
  const proposition = lotsAProposer(POINTS, null);

  assert.equal(proposition.connu, false);
  assert.deepEqual(proposition.manquants, []);
  assert.equal(proposition.nommes.length, 2, "les lots nommés se comptent quand même");
  assert.match(phraseDesLots(proposition), /n'ont pas pu être lus/);
});

test("chaque situation a sa phrase, et elles diffèrent", () => {
  const dites = [
    phraseDesLots(lotsAProposer([], [])),
    phraseDesLots(lotsAProposer(POINTS, null)),
    phraseDesLots(lotsAProposer(POINTS, [{ label: "Gros oeuvre" }, { label: "Charpente" }])),
    phraseDesLots(lotsAProposer(POINTS, []))
  ];

  assert.equal(new Set(dites).size, 4);
  assert.match(dites[0], /ne nomme aucun lot/);
  assert.match(dites[2], /déjà dans le projet/);
  assert.match(dites[3], /2 lots .* manquent/);
});

/** Ajouter un lot est une écriture : elle passe par une proposition (règle 1). */
test("proposer des lots n'en crée aucun", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const source = readFileSync(fileURLToPath(new URL("./lots-du-cr.js", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /fetch\(|import\(|addCustomProjectLot/);
});
