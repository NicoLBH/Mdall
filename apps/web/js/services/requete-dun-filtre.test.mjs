/**
 * Un ancien filtre de situation, dit en requête.
 *
 * ## Le vocabulaire n'est pas écrit à la main
 *
 * `champsDesSujets` le construit, ici comme à l'écran. Une fixture qui
 * recopierait la forme d'un champ ne testerait que la fixture : c'est la
 * grammaire réelle qui décide ce qui se dit et ce qui se perd.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { champsDesSujets, sujetsFiltres } from "./champs-des-sujets.js";
import {
  filtresVoulus, laRequeteSuffit, phraseDesPerdus, requeteDunFiltre
} from "./requete-dun-filtre.js";

/** Le vocabulaire d'un écran qui connaît ses labels, ses gens et ses objectifs. */
const CHAMPS = champsDesSujets({
  labels: [
    { key: "cr-chantier", name: "CR chantier" },
    { key: "etancheite", name: "Étanchéité" }
  ],
  objectifs: [{ id: "obj-1", title: "Permis de construire" }],
  personnes: [
    { id: "p-1", name: "A. Martin" },
    { id: "p-2", name: "B. Rivière" }
  ]
});

/** Et celui d'un écran qui n'a rien chargé : trois champs, pas un de plus. */
const CHAMPS_NUS = champsDesSujets({});

/* ── Ce qu'on veut écrire ────────────────────────────────────────────────── */

test("un filtre vide ne demande rien", () => {
  assert.deepEqual(filtresVoulus(null), {});
  assert.deepEqual(filtresVoulus({}), {});
  assert.deepEqual(filtresVoulus({ status: [], labelIds: [] }), {});
});

/**
 * **Toutes les valeurs d'un champ fermé, ce n'est pas une condition.**
 *
 * Le filtre des situations proposait quatre cases de priorité ; les quatre
 * cochées ne retiraient rien. Les écrire aurait transformé un « tout » en une
 * énumération que la barre ne sait pas porter — et la liste se serait vidée de
 * trois priorités sur quatre.
 */
test("tout coché ne s'écrit pas", () => {
  assert.deepEqual(filtresVoulus({ status: ["open", "closed"] }), {});
  assert.deepEqual(
    filtresVoulus({ priorities: ["low", "medium", "high", "critical"] }),
    {}
  );
  assert.deepEqual(filtresVoulus({ status: ["open"] }), { statut: ["open"] });
});

/** `blockedOnly: false` ne demandait pas les sujets libres : il ne demandait rien. */
test("seul un blocage exigé s'écrit", () => {
  assert.deepEqual(filtresVoulus({ blockedOnly: false }), {});
  assert.deepEqual(filtresVoulus({ blockedOnly: true }), { "bloqué": ["bloques"] });
});

/* ── La requête produite ─────────────────────────────────────────────────── */

test("un filtre de statut et de labels s'écrit dans la grammaire de la barre", () => {
  const { requete, perdus } = requeteDunFiltre({
    status: ["open"], labelIds: ["cr-chantier", "etancheite"]
  }, CHAMPS);

  assert.deepEqual(perdus, []);
  assert.match(requete, /statut:ouvert/);
  assert.match(requete, /label:cr-chantier/);
  assert.match(requete, /label:étanchéité/);
});

test("un blocage, une priorité, un objectif et un assigné passent aussi", () => {
  const { requete, perdus } = requeteDunFiltre({
    priorities: ["high"], objectiveIds: ["obj-1"], assigneeIds: ["p-2"], blockedOnly: true
  }, CHAMPS);

  assert.deepEqual(perdus, []);
  assert.match(requete, /priorité:haute/);
  assert.match(requete, /objectif:permis-de-construire/);
  assert.match(requete, /assigné:b.-rivière/);
  assert.match(requete, /bloqué:oui/);
});

/**
 * **La preuve est faite sur les sujets, pas sur la chaîne.**
 *
 * Une requête qui ressemble à la bonne n'est pas la bonne : ce qui compte est
 * qu'elle retienne les mêmes sujets que le filtre retenait. On la fait donc
 * tourner pour de vrai.
 */
test("la requête retient ce que le filtre retenait", () => {
  const sujets = [
    { id: "s1", title: "Toiture", status: "open", priority: "high" },
    { id: "s2", title: "Façade", status: "open", priority: "low" },
    { id: "s3", title: "Sol", status: "closed", priority: "high" }
  ];
  const meta = { s1: { labels: ["cr-chantier"] }, s2: { labels: ["etancheite"] }, s3: {} };

  const { requete } = requeteDunFiltre({
    status: ["open"], labelIds: ["cr-chantier"]
  }, CHAMPS);
  const { sujets: retenus } = sujetsFiltres({ sujets, requete, champs: CHAMPS, meta });

  assert.deepEqual(retenus.map((sujet) => sujet.id), ["s1"]);
});

/* ── Ce qu'elle n'a pas su dire ──────────────────────────────────────────── */

/**
 * **On ne prétend pas : on relit.**
 *
 * Un écran qui n'a pas chargé ses labels ne déclare pas `label:`. La requête
 * sort alors sans lui, et la situation retiendrait tous les sujets ouverts au
 * lieu des seuls CR de chantier — un élargissement silencieux que personne
 * n'a demandé.
 */
test("un champ que l'écran ne déclare pas est nommé, pas oublié", () => {
  const { perdus } = requeteDunFiltre({ status: ["open"], labelIds: ["cr-chantier"] }, CHAMPS_NUS);

  assert.equal(perdus.length, 1);
  assert.equal(perdus[0].champ, "label");
  assert.deepEqual(perdus[0].valeurs, ["cr-chantier"]);
  assert.equal(laRequeteSuffit({ status: ["open"], labelIds: ["cr-chantier"] }, CHAMPS_NUS), false);
});

/** Un identifiant que le vocabulaire ne connaît plus se perd de la même façon. */
test("une valeur inconnue du vocabulaire est nommée", () => {
  const { perdus } = requeteDunFiltre({ labelIds: ["un-label-supprimé"] }, CHAMPS);

  assert.equal(perdus.length, 1);
  assert.equal(perdus[0].champ, "label");
});

/**
 * **Une priorité partielle ne s'écrit pas.** `priorité` est à choix simple :
 * deux jetons posés, le dernier gagne, et la liste perdrait une priorité sur
 * deux sans que rien ne le dise.
 */
test("deux priorités sur quatre ne se disent pas, et on le dit", () => {
  const { perdus } = requeteDunFiltre({ priorities: ["high", "critical"] }, CHAMPS);

  assert.equal(perdus.length, 1);
  assert.equal(perdus[0].champ, "priorité");
});

/** Une seule priorité, elle, passe sans rien perdre. */
test("une priorité seule passe", () => {
  assert.equal(laRequeteSuffit({ priorities: ["critical"] }, CHAMPS), true);
});

/** Un filtre vide n'a rien perdu : il n'avait rien à dire. */
test("un filtre vide suffit toujours", () => {
  assert.equal(laRequeteSuffit(null, CHAMPS), true);
  assert.equal(requeteDunFiltre(null, CHAMPS).requete, "");
});

/* ── Ce qu'on en dit ─────────────────────────────────────────────────────── */

test("la phrase nomme les conditions, pas les identifiants", () => {
  const { perdus } = requeteDunFiltre({
    labelIds: ["cr-chantier"], objectiveIds: ["obj-1"]
  }, CHAMPS_NUS);
  const dite = phraseDesPerdus(perdus);

  assert.match(dite, /les labels et les objectifs/);
  assert.match(dite, /continue donc de s'appliquer/);
  assert.ok(!dite.includes("cr-chantier"), "un identifiant ne se comprend pas");
});

test("rien de perdu ne se commente pas", () => {
  assert.equal(phraseDesPerdus([]), "");
  assert.equal(phraseDesPerdus(), "");
});
