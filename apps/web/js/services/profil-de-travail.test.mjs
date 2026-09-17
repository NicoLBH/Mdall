/**
 * Ce que le Copilote sait de vous quand il ne parle d'aucun projet.
 *
 * ## Ce que ces gardes attrapent
 *
 * Un contexte transversal **qui se tait sur ce qu'il n'a pas**. Le Copilote d'un
 * projet hérite d'une mémoire ; sorti du projet, il n'a plus rien — et un
 * assistant sans matière répond quand même. C'est là qu'il invente : une
 * altitude plausible, un classement vraisemblable, et rien à l'écran ne le
 * dément.
 *
 * La consigne doit donc être **dans le texte envoyé**, pas dans la retenue du
 * modèle. C'est la leçon du catalogue des agents : une consigne absente se
 * remplace par une invention plausible.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { profilDeTravail } from "./profil-de-travail.js";
import { GENRE } from "./projets-actifs.js";

const MAINTENANT = Date.parse("2026-06-01T12:00:00Z");
const jour = (rang) => new Date(MAINTENANT - rang * 24 * 60 * 60 * 1000).toISOString();

const PROJETS = [
  { id: "p-a", name: "NOVACLIM", city: "Chamonix", currentPhase: "Conception" },
  { id: "p-b", name: "VERIFAS", city: "Annecy" }
];

const TRACES = [
  { projet: "p-a", genre: GENRE.DISCUSSION, quoi: "Coupe-feu", quand: jour(1) },
  { projet: "p-a", genre: GENRE.ETUDE, quoi: "Incendie", quand: jour(3) },
  { projet: "p-b", genre: GENRE.PROPOSITION, quoi: "Toiture", quand: jour(10) }
];

const profil = (reste = {}) => profilDeTravail({
  nom: "Ourdine Ferrand", projets: PROJETS, traces: TRACES, maintenant: MAINTENANT, ...reste
});

test("le profil dit qui regarde, et ses projets", () => {
  const { texte, lue } = profil();

  assert.equal(lue, true);
  assert.match(texte, /Ourdine Ferrand/);
  assert.match(texte, /NOVACLIM/);
  assert.match(texte, /Chamonix/);
  assert.match(texte, /phase : Conception/);
  assert.match(texte, /2 projets/);
});

/**
 * **Des jours, pas un score.** Un nombre sans unité ne se vérifie pas, et le
 * modèle le citerait tel quel — « votre indice d'activité est de 3 ».
 */
test("le profil dit où le travail a lieu, en jours", () => {
  const { texte } = profil();

  assert.match(texte, /NOVACLIM : 2 jours/);
  assert.match(texte, /VERIFAS : 1 jour/);
  assert.match(texte, /jours distincts/, "et ce que « jour » veut dire");
});

/** Trois verbes disent le métier mieux qu'une phrase de présentation. */
test("le profil dit ce qu'on y fait", () => {
  const { texte } = profil();

  assert.match(texte, /discussions avec le Copilote/);
  assert.match(texte, /études d'agent/);
  assert.match(texte, /propositions déposées/);
});

/**
 * **La section la plus importante du fichier.** Sans elle, le Copilote
 * transversal répond sur un projet avec des valeurs qu'il n'a pas.
 */
test("le profil dit en toutes lettres ce qu'il n'a pas", () => {
  const { texte } = profil();

  assert.match(texte, /Aucune mémoire de projet n'est jointe/);
  assert.match(texte, /N'en cite aucune, même plausible/);
  // Et il dit quoi faire à la place : renvoyer là où la mémoire est.
  assert.match(texte, /dis lequel ouvrir/);
});

/** Aucune valeur d'aucun projet : ni altitude, ni classement, ni document. */
test("le profil ne porte aucune valeur de projet", () => {
  const { texte } = profil();
  const apresLaConsigne = texte.slice(0, texte.indexOf("## Ce que tu n'as pas"));

  // Ce qui est nommé est du repérage — des noms de projets, des dates, des
  // comptes de jours. Rien qui ressemble à une valeur tranchée.
  assert.ok(!/altitude|classement|coupe-feu|m\/s|kN/i.test(apresLaConsigne));
});

/**
 * **Sans projet, on ne prétend pas le contraire.** Un profil qui dirait « vous
 * suivez 0 projet : » suivi de rien se lirait comme une panne.
 */
test("sans projet, le profil le dit et tient debout", () => {
  const { texte } = profilDeTravail({ nom: "", projets: [], traces: [], maintenant: MAINTENANT });

  assert.match(texte, /Aucun projet ne lui est rattaché/);
  assert.match(texte, /Aucune mémoire de projet n'est jointe/, "et la consigne tient toujours");
  assert.ok(!texte.includes("undefined"));
});

/** Rien ne s'écrit à la place d'une absence. */
test("un projet sans nom ni ville se dit quand même", () => {
  const { texte } = profilDeTravail({
    projets: [{ id: "p-z" }], traces: [], maintenant: MAINTENANT
  });

  assert.match(texte, /p-z/);
  assert.ok(!texte.includes("undefined"));
});
