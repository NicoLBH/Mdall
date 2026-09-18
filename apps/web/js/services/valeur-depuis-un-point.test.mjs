import test from "node:test";
import assert from "node:assert/strict";

import {
  MANQUE, cequiManquePourProposer, phraseDeCeQuiManque, titreDeLaProposition,
  valeurVersableDepuisUnPoint
} from "./valeur-depuis-un-point.js";

const POINT = { id: "p-1", title: "Profondeur hors gel : l'entreprise annonce 0,60 m" };

const avancee = (plus = {}) => valeurVersableDepuisUnPoint({
  sujet: "Profondeur hors gel", valeur: "0,60 m", point: POINT,
  par: "Ourdine Ferrand", quand: "12 mars 2026", ...plus
})[0];

/* ── Ce qu'on exige, et pourquoi ─────────────────────────────────────────── */

test("un nom sans valeur et une valeur sans nom se refusent tous les deux", () => {
  // Deux refus, deux raisons : un nom sans valeur n'apprend rien, une valeur
  // sans nom ne se retrouve pas.
  assert.deepEqual(cequiManquePourProposer({ sujet: "Altitude" }), [MANQUE.VALEUR]);
  assert.deepEqual(cequiManquePourProposer({ valeur: "742,30" }), [MANQUE.NOM]);
  assert.deepEqual(cequiManquePourProposer({}), [MANQUE.NOM, MANQUE.VALEUR]);
  assert.deepEqual(cequiManquePourProposer({ sujet: "  ", valeur: " " }), [MANQUE.NOM, MANQUE.VALEUR]);
});

test("rien d'autre n'est exigé", () => {
  // Forcer un motif ferait écrire des motifs inventés pour passer l'écran, et
  // un motif fabriqué est pire qu'un motif absent (règle 5).
  assert.deepEqual(cequiManquePourProposer({ sujet: "Altitude", valeur: "742,30" }), []);
});

test("un refus dit pourquoi, jamais « champ obligatoire »", () => {
  // Un refus qu'on ne comprend pas se contourne au lieu de se corriger.
  const dit = phraseDeCeQuiManque([MANQUE.NOM, MANQUE.VALEUR]);

  assert.match(dit, /ne se retrouvera jamais dans la mémoire/);
  assert.match(dit, /il n'y a rien à retenir/);
  assert.equal(phraseDeCeQuiManque([]), "");
});

test("rien à proposer tant qu'il manque quelque chose", () => {
  assert.deepEqual(valeurVersableDepuisUnPoint({ sujet: "Altitude" }), []);
  assert.deepEqual(valeurVersableDepuisUnPoint({ valeur: "742,30" }), []);
  assert.deepEqual(valeurVersableDepuisUnPoint({}), []);
});

/* ── Supposée, jamais acquise ────────────────────────────────────────────── */

test("ce qu'un débat ouvert avance entre comme supposé", () => {
  // La faire entrer comme acquise réglerait le débat en l'ouvrant : c'est
  // l'inverse de ce que ce sujet existe pour faire.
  const ligne = avancee();

  assert.equal(ligne.nature, "hypothese");
  assert.equal(ligne.statut, "supposé");
});

test("la provenance dit d'où elle vient, avec qui et quand", () => {
  // « Quelqu'un, un jour » ne se vérifie auprès de personne.
  const ligne = avancee();

  assert.equal(ligne.provenance.type, "hypothèse");
  assert.match(ligne.provenance.quoi, /avancée dans le sujet « Profondeur hors gel/);
  assert.equal(ligne.provenance.par, "Ourdine Ferrand");
  assert.equal(ligne.provenance.le, "12 mars 2026");
});

test("elle ne prétend pas avoir été tranchée par ce sujet", () => {
  // `reference` porte l'arête aval — « cette valeur vient de ce débat-là ». Le
  // débat est ouvert : l'écrire ferait lire la valeur comme tranchée par un
  // sujet qui n'a rien tranché (règle 6).
  assert.equal(avancee().reference, undefined);
});

test("une seule ligne : une valeur avancée n'est pas une décision", () => {
  // La décision viendra à la fermeture, écrite par le seul fichier qui sait
  // l'écrire. Deux endroits qui versent des décisions finiraient par ne pas
  // verser la même (règle 4).
  const lignes = valeurVersableDepuisUnPoint({ sujet: "Altitude", valeur: "742,30" });

  assert.equal(lignes.length, 1);
  assert.equal(lignes[0].decision, undefined);
});

/* ── Ce qu'elle porte du sujet ───────────────────────────────────────────── */

test("elle dit de quel sujet elle sort", () => {
  assert.match(avancee().atelier, /^Sujet « Profondeur hors gel/);
});

test("un sujet sans intitulé ne fait pas écrire un atelier vide", () => {
  // « Sujet «  » » se lit comme un défaut d'affichage. « Sujet » tout court est
  // moins précis et reste vrai.
  const ligne = valeurVersableDepuisUnPoint({ sujet: "Altitude", valeur: "742,30", point: { id: "p-1" } })[0];

  assert.equal(ligne.atelier, "Sujet");
  assert.equal(ligne.provenance.quoi, "avancée dans un sujet");
});

test("le pourquoi est repris tel quel, et vide quand il n'y en a pas", () => {
  // L'histoire de la valeur nommera le trou plutôt que de le combler.
  assert.equal(avancee({ pourquoi: "annoncé en réunion de chantier" }).citation,
    "annoncé en réunion de chantier");
  assert.equal(avancee().citation, "");
});

test("la portée suit, et une portée absente vaut l'ouvrage entier", () => {
  assert.deepEqual(avancee({ zones: ["Bâtiment A"] }).zones, ["Bâtiment A"]);
  assert.deepEqual(avancee().zones, []);
});

/* ── Le titre qu'on relira sans contexte ─────────────────────────────────── */

test("le titre de la proposition dit quoi, et ce que ça vaut", () => {
  // C'est une ligne de liste qu'on relira six mois plus tard dans le tableau
  // des propositions, sans rien autour.
  assert.equal(titreDeLaProposition({ sujet: "Profondeur hors gel", valeur: "0,60 m" }),
    "Valeur avancée — Profondeur hors gel = 0,60 m");
});

test("un titre ne s'écrit pas à moitié", () => {
  assert.equal(titreDeLaProposition({ sujet: "Altitude" }), "");
  assert.equal(titreDeLaProposition({ valeur: "742,30" }), "");
  assert.equal(titreDeLaProposition({}), "");
});
