/**
 * L'écran de la notice : ce qu'il propose, et dans quel ordre.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { propositionsDe, paragraphesDe, departementDe } from "./notice-ecran.js";

const CHAMP = { rubrique: "planchers.materiau", options: ["béton armé", "bois", "poutrelles-hourdis"] };

test("l'usage passe devant l'amorce", () => {
  // La bibliothèque ne se constitue pas à l'avance : les options écrites dans
  // la trame évitent seulement de partir d'une liste vide le premier jour.
  // Dès que quelqu'un a retenu quelque chose, c'est l'usage qui classe.
  const propositions = propositionsDe(CHAMP, {
    "planchers.materiau": [{ libelle: "poutrelles-hourdis", poids: 12 }, { libelle: "bois", poids: 3 }]
  });
  assert.deepEqual(propositions.map((p) => p.libelle),
    ["poutrelles-hourdis", "bois", "béton armé"]);
});

test("une réponse tapée à la main entre dans la liste", () => {
  // C'est ce qui fait qu'on n'a pas à écrire une bibliothèque de cent mille
  // composants : elle se construit à mesure.
  const propositions = propositionsDe(CHAMP, {
    "planchers.materiau": [{ libelle: "dalle alvéolaire précontrainte", poids: 1 }]
  });
  assert.equal(propositions[0].libelle, "dalle alvéolaire précontrainte");
  assert.equal(propositions.length, 4);
});

test("la liste ne dépasse pas huit propositions", () => {
  // Au-delà, ce n'est plus un raccourci : on relit une liste au lieu de cocher.
  const beaucoup = Array.from({ length: 20 }, (_, i) => ({ libelle: `matériau ${i}`, poids: 20 - i }));
  assert.equal(propositionsDe(CHAMP, { "planchers.materiau": beaucoup }).length, 8);
});

test("sans bibliothèque, l'amorce suffit", () => {
  assert.deepEqual(propositionsDe(CHAMP, {}).map((p) => p.libelle), CHAMP.options);
  assert.deepEqual(propositionsDe(null, {}), []);
});

test("les paragraphes se lisent à plat, dans l'ordre de la notice", () => {
  const notice = { sections: [
    { paragraphes: [{ cle: "a" }], sousSections: [{ paragraphes: [{ cle: "b" }, { cle: "c" }] }] },
    { paragraphes: [{ cle: "d" }], sousSections: [] }
  ] };
  assert.deepEqual(paragraphesDe(notice).map((p) => p.cle), ["a", "b", "c", "d"]);
  assert.deepEqual(paragraphesDe(null), []);
});

test("le territoire s'arrête au département", () => {
  // C'est la seule granularité qui sort du projet : une commune serait déjà
  // presque un chantier, et l'on saurait où.
  assert.equal(departementDe("43 Route du Pelloux, 74920 COMBLOUX"), "74");
  assert.equal(departementDe("12 rue des Lilas, 75011 Paris"), "75");
  assert.equal(departementDe("Lieu-dit Le Pré, 2A004 Ajaccio"), "2A");
  assert.equal(departementDe("sans code postal"), "");
  assert.equal(departementDe(null), "");
});
