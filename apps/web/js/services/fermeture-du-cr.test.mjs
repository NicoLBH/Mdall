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

test("un sujet qui n'apparaît plus se relève", () => {
  const disparition = sujetsDisparus({
    confrontes: [{ titre: "Étanchéité", sujet: { id: "s-1" } }],
    sujetsDuProjet: SUJETS,
    sujetsDuLabel: ["s-1", "s-2"]
  });

  assert.equal(disparition.connu, true);
  assert.equal(disparition.suivis, 2);
  assert.deepEqual(disparition.disparus.map((sujet) => sujet.id), ["s-2"]);
});

/**
 * **Ce que la phrase doit avouer.** Fermer sur une disparition est une
 * déduction : le document n'a rien dit. La phrase le dit, et dit aussi
 * l'échappatoire — un retour rouvre le sujet. Les deux vont ensemble : la
 * déduction n'est acceptable que parce qu'elle se défait toute seule.
 */
test("la fermeture déduite s'annonce comme déduite, et réversible", () => {
  const dite = phraseDesDisparus(sujetsDisparus({
    confrontes: [{ sujet: { id: "s-1" } }],
    sujetsDuProjet: SUJETS,
    sujetsDuLabel: ["s-1", "s-2"]
  }));

  assert.match(dite, /fermerait/);
  assert.match(dite, /sur cette déduction, et non sur une phrase du document/);
  assert.match(dite, /rouvrira/);
  assert.match(dite, /avec son histoire/);

  // Jamais « le document les a réglés » : le document n'a rien dit du tout.
  assert.doesNotMatch(dite, /le document (les|le) (a )?(réglé|soldé)/i);
});

/** La phrase s'accorde : un sujet disparu ne se dit pas comme trois. */
test("la phrase des disparus s'accorde au nombre", () => {
  const une = phraseDesDisparus(sujetsDisparus({
    confrontes: [{ sujet: { id: "s-1" } }, { sujet: { id: "s-2" } }],
    sujetsDuProjet: SUJETS, sujetsDuLabel: ["s-1", "s-2", "s-3"]
  }));
  const plusieurs = phraseDesDisparus(sujetsDisparus({
    confrontes: [], sujetsDuProjet: SUJETS, sujetsDuLabel: ["s-1", "s-2", "s-3"]
  }));

  assert.match(une, /1 sujet suivi depuis les comptes rendus n'apparaît pas/);
  assert.match(une, /le fermerait/);
  assert.match(une, /S'il revient/);

  assert.match(plusieurs, /3 sujets suivis depuis les comptes rendus n'apparaissent pas/);
  assert.match(plusieurs, /les fermerait/);
  assert.match(plusieurs, /Ceux qui reviennent/);
});

/**
 * **La déduction est un état à part entière.** Confondre la fermeture déduite
 * avec celle que le document écrit ferait passer une supposition pour une
 * lecture — et l'on ne saurait plus, en relisant la proposition, laquelle des
 * deux on a acceptée.
 */
test("la fermeture déduite ne se confond pas avec la fermeture dite", () => {
  assert.notEqual(FERMETURE.DEDUITE, FERMETURE.DITE);

  assert.match(PHRASES_DE_LA_FERMETURE[FERMETURE.DEDUITE], /n'apparaît plus/);
  assert.match(EFFETS_DE_LA_FERMETURE[FERMETURE.DEDUITE], /déduction/);

  // Ce que le document écrit, lui, ne se dit pas déduit.
  assert.doesNotMatch(EFFETS_DE_LA_FERMETURE[FERMETURE.DITE], /déduction/);
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
