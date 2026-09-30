/**
 * Ce que les domaines reconnus disent du système — et ce qu'ils refusent
 * d'affirmer.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  NON_CLASSE, laPartReconnue, lesDomainesJamaisReconnus, lesDomainesRanges,
  phraseDeLaReconnaissance, phraseDunDomaineDuSysteme
} from "./les-domaines-du-systeme.js";

const DES_LIGNES = [
  { domaine: NON_CLASSE, affirmations: 400, chantiers: 12 },
  { domaine: "structure", affirmations: 120, chantiers: 9 },
  { domaine: "incendie", affirmations: 60, chantiers: 4 },
  { domaine: "acoustique", affirmations: 20, chantiers: 1 }
];

/**
 * **Le non-classé n'est pas un domaine**, c'est l'aveu qu'il n'y en a pas. Le
 * trier avec les autres le mettrait en tête — il est le plus nombreux — et
 * l'écran se lirait « le domaine le plus fréquent est : aucun ».
 */
test("le non-classé est mis à part, pas en tête des domaines", () => {
  const range = lesDomainesRanges(DES_LIGNES);
  assert.deepEqual(range.reconnus.map((une) => une.domaine),
    ["structure", "incendie", "acoustique"]);
  assert.equal(range.nonClasse.affirmations, 400);
});

test("une ligne sans domaine n'entre pas dans le rangement", () => {
  const range = lesDomainesRanges([{ domaine: "", affirmations: 9 }, { affirmations: 3 }]);
  assert.deepEqual(range.reconnus, []);
  assert.equal(range.nonClasse, null);
  assert.deepEqual(lesDomainesRanges(null).reconnus, []);
});

test("la part reconnue se compte sur le total, non-classé compris", () => {
  const range = lesDomainesRanges(DES_LIGNES);
  // 200 reconnues sur 600.
  assert.equal(Math.round(laPartReconnue(range) * 100), 33);
  assert.match(phraseDeLaReconnaissance(range), /33 % des affirmations portent un domaine/);
  assert.match(phraseDeLaReconnaissance(range), /200 sur 600/);
});

/**
 * **`null`, pas zéro.** « 0 % reconnu » accuse la classification d'un échec
 * qu'elle n'a pas eu l'occasion d'avoir (règle 5).
 */
test("sans aucune affirmation, on ne dit pas « 0 % »", () => {
  assert.equal(laPartReconnue(lesDomainesRanges([])), null);
  assert.equal(laPartReconnue(null), null);
  assert.doesNotMatch(phraseDeLaReconnaissance(lesDomainesRanges([])), /0 %/);
  assert.match(phraseDeLaReconnaissance(null), /rien à classer/);
});

/**
 * **Tout classé se dit aussi.** Sans non-classé, la part vaut 100 % — et non
 * `null`, qui voudrait dire qu'on n'a rien lu.
 */
test("quand tout porte un domaine, la part vaut cent pour cent", () => {
  const range = lesDomainesRanges([{ domaine: "structure", affirmations: 7, chantiers: 2 }]);
  assert.equal(laPartReconnue(range), 1);
  assert.match(phraseDeLaReconnaissance(range), /100 %/);
});

/**
 * **Et rien de classé se dit aussi**, sans passer pour « on n'a rien lu ».
 */
test("quand rien ne porte de domaine, la part vaut zéro et non null", () => {
  const range = lesDomainesRanges([{ domaine: NON_CLASSE, affirmations: 12, chantiers: 3 }]);
  assert.equal(laPartReconnue(range), 0);
  assert.match(phraseDeLaReconnaissance(range), /0 % des affirmations portent un domaine/);
  assert.match(phraseDeLaReconnaissance(range), /0 sur 12/);
});

test("les domaines du vocabulaire jamais reconnus se nomment", () => {
  const range = lesDomainesRanges(DES_LIGNES);
  assert.deepEqual(
    lesDomainesJamaisReconnus(range, ["structure", "incendie", "acoustique", "sol", "thermique"]),
    ["sol", "thermique"]
  );
  assert.deepEqual(lesDomainesJamaisReconnus(null, null), []);
});

/**
 * **Le nombre de chantiers compte autant que celui d'affirmations** : mille
 * `structure` venues d'un seul chantier ne disent pas qu'une taxonomie marche,
 * elles disent qu'un chantier parle de structure.
 */
test("un domaine dit sur combien de chantiers il se montre", () => {
  assert.equal(phraseDunDomaineDuSysteme({ chantiers: 9 }), "9 chantiers");
  assert.equal(phraseDunDomaineDuSysteme({ chantiers: 1 }), "1 chantier");
  assert.equal(phraseDunDomaineDuSysteme({ chantiers: 0 }), "");
  assert.equal(phraseDunDomaineDuSysteme(null), "");
});
