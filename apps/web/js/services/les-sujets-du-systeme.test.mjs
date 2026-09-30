/**
 * Les sujets techniques : ce qu'ils classent, et ce qu'ils refusent de taire.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CE_QUI_MANQUE_ENCORE, lesSujetsPrecis, lesSujetsRanges, phraseDeCeQuiEstCache,
  phraseDeLaGranulometrie, phraseDunSujet
} from "./les-sujets-du-systeme.js";

const DES_LIGNES = [
  { sujet: "beton", mots: 1, affirmations: 140, chantiers: 3 },
  { sujet: "plancher beton", mots: 2, affirmations: 42, chantiers: 3 },
  { sujet: "nappe phreatique", mots: 2, affirmations: 18, chantiers: 2 },
  { sujet: "cuvelage", mots: 1, affirmations: 9, chantiers: 2 }
];

/**
 * **Les couples avant les mots seuls, à nombre de chantiers égal.** « plancher
 * beton » dit ce que « beton » ne dit pas, et c'est toute la granulométrie
 * qu'on cherche : un classement qui remonte les mots seuls redonnerait le
 * sommaire qu'on essaie de quitter.
 */
test("à chantiers égaux, le couple passe devant le mot seul", () => {
  const ranges = lesSujetsRanges(DES_LIGNES);
  assert.deepEqual(ranges.map((une) => une.sujet),
    ["plancher beton", "beton", "nappe phreatique", "cuvelage"]);
});

test("une ligne vide ou sans occurrence n'entre pas", () => {
  assert.deepEqual(lesSujetsRanges([{ sujet: "", affirmations: 4 }]), []);
  assert.deepEqual(lesSujetsRanges([{ sujet: "beton", affirmations: 0 }]), []);
  assert.deepEqual(lesSujetsRanges(null), []);
});

test("les sujets précis sont ceux de plusieurs mots", () => {
  assert.deepEqual(lesSujetsPrecis(lesSujetsRanges(DES_LIGNES)).map((une) => une.sujet),
    ["plancher beton", "nappe phreatique"]);
  assert.deepEqual(lesSujetsPrecis(null), []);
});

/**
 * **Le rapport au nombre de cases, pas le total.** « 4 000 sujets » ne dit
 * rien ; « 4 000 sujets là où il y avait 8 cases » dit tout.
 */
test("la granulométrie se dit par rapport aux cases qu'elle remplace", () => {
  const dite = phraseDeLaGranulometrie(lesSujetsRanges(DES_LIGNES), 8);
  assert.match(dite, /4 sujets se dégagent/);
  assert.match(dite, /2 en plusieurs mots/);
  assert.match(dite, /8 cases/);
});

test("sans sujet partagé, on ne parle pas de vocabulaire", () => {
  assert.match(phraseDeLaGranulometrie([], 8), /pas de quoi parler de vocabulaire/);
  assert.doesNotMatch(phraseDeLaGranulometrie([], 8), /0 sujets se dégagent/);
});

/**
 * **Taire ce qu'on cache montrerait un vocabulaire plus pauvre qu'il n'est**
 * (règle 5).
 */
test("ce qui n'est pas montré se compte, et se dit", () => {
  // `toLocaleString` sépare les milliers par une espace fine insécable, que
  // `\s` reconnaît et qu'une espace ordinaire ne reconnaîtrait pas.
  assert.match(phraseDeCeQuiEstCache({ caches: 4210 }), /4\s210 autres termes/);
  assert.match(phraseDeCeQuiEstCache({ caches: 4210 }), /un seul chantier/);
  // Rien de caché : pas de phrase. « 0 terme caché » est du bruit.
  assert.equal(phraseDeCeQuiEstCache({ caches: 0 }), "");
  assert.equal(phraseDeCeQuiEstCache(null), "");
});

test("un sujet dit sur combien de chantiers il se montre", () => {
  assert.equal(phraseDunSujet({ chantiers: 3 }), "3 chantiers");
  assert.equal(phraseDunSujet({ chantiers: 1 }), "1 chantier");
  assert.equal(phraseDunSujet({ chantiers: 0 }), "");
  assert.equal(phraseDunSujet(null), "");
});

/**
 * **Une étape qui n'a pas été écrite n'avance pas de zéro pour cent, elle
 * n'existe pas** (règle 12). Nommer ce qui manque évite de laisser croire que
 * la question est réglée.
 */
test("ce qui manque est nommé, et dit où cela en est", () => {
  assert.equal(CE_QUI_MANQUE_ENCORE.length >= 3, true);
  for (const un of CE_QUI_MANQUE_ENCORE) {
    assert.equal(Boolean(un.quoi && un.ou && un.pourquoi), true, un.quoi);
  }
  // Aucune barre de progression : une étape qui n'existe pas n'avance pas.
  for (const un of CE_QUI_MANQUE_ENCORE) {
    assert.doesNotMatch(String(un.ou), /\d+\s*%/);
  }
});
