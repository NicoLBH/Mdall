/**
 * Fermer un point, et refuser d'en fermer un autre.
 *
 * **C'est la question la plus délicate du plan.** Un compte rendu ne ferme
 * presque jamais explicitement : il cesse d'en parler. Et une disparition ne
 * veut pas dire ce qu'on croit — un point sort d'un compte rendu parce qu'il
 * est réglé, parce qu'on l'a oublié, parce que le lot n'était pas convoqué, ou
 * parce que le document a changé de trame.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  EFFETS_DE_LA_FERMETURE, FERMETURE, PHRASES_DE_LA_FERMETURE, fermetureDuPoint,
  fermeturesDuCompteRendu, phraseDesDisparus, sujetsDisparus
} from "./fermeture-du-cr.js";

/* ── Ce que le document dit ──────────────────────────────────────────────── */

/**
 * Les mentions sont celles d'un compte rendu réel : la colonne « Fait le »
 * porte une date, un mot, un pourcentage, ou rien.
 */
test("une date ou une mention de fermeture ferme le point", () => {
  for (const dit of ["Fait", "fait", "19/01/2026", "Réalisé", "Soldé", "Levé", "100%"]) {
    assert.equal(fermetureDuPoint({ faitLe: dit }).etat, FERMETURE.DITE, `« ${dit} » ne ferme pas`);
  }

  // L'état déclaré ferme aussi, quand la colonne est vide.
  assert.equal(fermetureDuPoint({ etat: "soldé" }).etat, FERMETURE.DITE);
});

/**
 * **Ce qui retient l'emporte sur ce qui ferme.** « Fait à 50% » n'est pas fait,
 * et « réalisé, non achevé » non plus : le doute ne ferme pas.
 */
test("ce que le document dit non fini ne ferme rien", () => {
  for (const dit of ["En cours", "Non achevés", "Suspendu", "50%", "0%", "90%", "Fait à 50%", "reporté"]) {
    assert.equal(fermetureDuPoint({ faitLe: dit }).etat, FERMETURE.RETENUE, `« ${dit} » ferme`);
  }
});

/** Rien de dit n'est pas « réglé » : le point reste ouvert, et la marque est vide. */
test("un point dont le document ne dit rien reste ouvert", () => {
  const verdict = fermetureDuPoint({ faitLe: "", etat: "" });
  assert.equal(verdict.etat, FERMETURE.OUVERTE);
  assert.equal(verdict.signe, "");
  assert.equal(fermetureDuPoint({}).etat, FERMETURE.OUVERTE);
});

/** Le mot du document voyage avec le verdict : une fermeture se justifie. */
test("chaque verdict porte le mot qui le justifie", () => {
  assert.equal(fermetureDuPoint({ faitLe: "19/01/2026" }).signe, "19/01/2026");
  assert.equal(fermetureDuPoint({ faitLe: "Non achevés" }).signe, "Non achevés");

  for (const sort of Object.values(FERMETURE)) {
    assert.ok(PHRASES_DE_LA_FERMETURE[sort], `« ${sort} » n'a pas de phrase`);
    assert.ok(EFFETS_DE_LA_FERMETURE[sort], `« ${sort} » n'a pas d'effet`);
  }
});

test("le compte rendu sépare ce qu'il ferme de ce qu'il retient", () => {
  const { fermes, retenus } = fermeturesDuCompteRendu([
    { titre: "Trappe posée", faitLe: "23/01/2026" },
    { titre: "Carrelage", faitLe: "En cours" },
    { titre: "Étanchéité", faitLe: "" }
  ]);

  assert.deepEqual(fermes.map((point) => point.titre), ["Trappe posée"]);
  assert.deepEqual(retenus.map((point) => point.titre), ["Carrelage"]);
});

/* ── La disparition, qui pose une question ───────────────────────────────── */

const SUJETS = [
  { id: "s-1", title: "Étanchéité toiture" },
  { id: "s-2", title: "Linteaux bois" },
  { id: "s-3", title: "Ouvert à la main" }
];

/**
 * **La règle qui ne se négocie pas.** Fermer sur une disparition ferait
 * disparaître, sans trace, des points qu'on suit depuis des mois — et personne
 * ne s'en apercevrait, puisque ce qui disparaît ne laisse rien à voir.
 */
test("un sujet qui n'apparaît plus se relève, et ne se ferme pas", () => {
  const disparition = sujetsDisparus({
    confrontes: [{ titre: "Étanchéité", sujet: { id: "s-1" } }],
    sujetsDuProjet: SUJETS,
    sujetsDuLabel: ["s-1", "s-2"]
  });

  assert.equal(disparition.connu, true);
  assert.equal(disparition.suivis, 2);
  assert.deepEqual(disparition.disparus.map((sujet) => sujet.id), ["s-2"]);

  // La phrase pose la question et nomme les quatre raisons. Jamais un verbe de
  // fermeture : ce n'est pas une réponse.
  const dite = phraseDesDisparus(disparition);
  assert.match(dite, /Ce n'est pas une réponse/);
  assert.match(dite, /oublié/);
  assert.doesNotMatch(dite, /ferme|réglés|soldé/i);
});

/**
 * On ne compare que ce qui est comparable : un sujet ouvert à la main n'a
 * aucune raison de figurer dans un compte rendu de chantier.
 */
test("un sujet qui ne vient pas d'un compte rendu ne disparaît pas", () => {
  const disparition = sujetsDisparus({
    confrontes: [], sujetsDuProjet: SUJETS, sujetsDuLabel: ["s-1"]
  });

  assert.deepEqual(disparition.disparus.map((sujet) => sujet.id), ["s-1"]);
  assert.equal(disparition.suivis, 1);
});

/**
 * **Ne pas savoir d'où viennent les sujets n'autorise pas à les déclarer
 * disparus** (règle 5) : on ne compare pas, et l'écran dit pourquoi la liste
 * est vide.
 */
test("sans le label, aucune disparition ne se relève", () => {
  for (const options of [
    { sujetsDuProjet: SUJETS, sujetsDuLabel: null },
    { sujetsDuProjet: null, sujetsDuLabel: ["s-1"] },
    {}
  ]) {
    const disparition = sujetsDisparus({ confrontes: [], ...options });
    assert.equal(disparition.connu, false);
    assert.deepEqual(disparition.disparus, []);
    assert.match(phraseDesDisparus(disparition), /On ne sait pas/);
  }
});

test("chaque situation a sa phrase, et elles diffèrent", () => {
  const dites = [
    phraseDesDisparus(sujetsDisparus({ confrontes: [], sujetsDuProjet: SUJETS, sujetsDuLabel: null })),
    phraseDesDisparus(sujetsDisparus({ confrontes: [], sujetsDuProjet: SUJETS, sujetsDuLabel: [] })),
    phraseDesDisparus(sujetsDisparus({
      confrontes: [{ sujet: { id: "s-1" } }], sujetsDuProjet: SUJETS, sujetsDuLabel: ["s-1"]
    })),
    phraseDesDisparus(sujetsDisparus({ confrontes: [], sujetsDuProjet: SUJETS, sujetsDuLabel: ["s-1"] }))
  ];

  assert.equal(new Set(dites).size, 4);
  assert.match(dites[1], /rien à comparer/);
  assert.match(dites[2], /figurent tous/);
});

/* ── Ce qu'on ne sait pas faire, et qu'on ne prétend pas ─────────────────── */

/**
 * **Le barré ne parvient pas jusqu'ici.** Une rature est un trait dessiné
 * par-dessus le texte, pas une propriété de la police. Il n'y a donc pas d'état
 * « barré » : prétendre le détecter serait pire que de ne pas le détecter.
 */
test("aucun état ne prétend reconnaître un point barré", async () => {
  assert.equal(Object.values(FERMETURE).includes("barree"), false);

  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL("./fermeture-du-cr.js", import.meta.url)), "utf8");

  // La limite est écrite, là où on la cherchera.
  assert.match(source, /Le barré ne parvient pas jusqu'ici/);
});

/** Fermer un sujet est une écriture : elle passe par une proposition (règle 1). */
test("lire une fermeture n'en ferme aucune", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const source = readFileSync(fileURLToPath(new URL("./fermeture-du-cr.js", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /fetch\(|closeSubject|updateSubject/);
});
