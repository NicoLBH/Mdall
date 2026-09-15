import test from "node:test";
import assert from "node:assert/strict";

import { avancementDe, detailDeLAvancement, phraseDeLAvancement } from "./avancement-dune-situation.js";

const ouvert = (id) => ({ id, status: "open" });
const clos = (id) => ({ id, status: "closed" });

test("l'avancement se compte sur les sujets retenus", () => {
  assert.deepEqual(avancementDe([ouvert("a"), clos("b"), clos("c"), ouvert("d")]), {
    total: 4, clos: 2, pourcentage: 50
  });
});

/** Les formes de clôture de la base comptent toutes comme closes. */
test("toutes les façons d'être clos comptent", () => {
  const sujets = [{ id: "a", status: "closed_invalid" }, { id: "b", status: "closed_replaced" }];
  assert.equal(avancementDe(sujets).pourcentage, 100);
});

/**
 * **Un doublon n'est pas du travail**, ni fait ni à faire. Le laisser au total
 * ferait baisser l'avancement à chaque doublon repéré — c'est-à-dire punirait
 * le rangement.
 */
test("un doublon ne compte ni d'un côté ni de l'autre", () => {
  const avec = avancementDe([ouvert("a"), clos("b"), { id: "c", status: "closed_duplicate" }]);

  assert.equal(avec.total, 2, "le doublon sort du total");
  assert.equal(avec.clos, 1);
  assert.equal(avec.pourcentage, 50);
});

/**
 * **Le piège que le plan nomme.** Si je quitte un chantier, ses sujets sortent
 * de mon périmètre : l'avancement baisse, au lieu de compter des choses que je
 * ne peux plus ouvrir. Le calcul ne connaît que ce qu'on lui donne — c'est ce
 * qui le rend juste sans qu'on ait à le lui demander.
 */
test("un sujet sorti du périmètre sort du compte", () => {
  const avant = avancementDe([clos("a"), clos("b"), ouvert("c")]);
  // Le chantier qui portait « a » et « b » n'est plus le mien.
  const apres = avancementDe([ouvert("c")]);

  assert.equal(avant.pourcentage, 67);
  assert.equal(apres.pourcentage, 0, "l'avancement baisse, il ne reste pas acquis");
  assert.equal(apres.total, 1);
});

/**
 * **Ne pas savoir n'est pas zéro.** Une situation dont les sujets n'ont pas pu
 * être lus n'est pas à 0 % : « 0 % » se lit comme « rien n'a avancé », et l'on
 * irait chercher pourquoi le chantier dort (règle 5).
 */
test("des sujets qu'on n'a pas su lire ne font pas un avancement nul", () => {
  assert.equal(avancementDe(null), null);
  assert.equal(avancementDe(), null);
  assert.equal(avancementDe(undefined), null);
  assert.equal(phraseDeLAvancement(null), "", "et rien ne s'affiche");
});

/** Une situation vide, elle, est bien vide : c'est un fait, pas une absence. */
test("une situation sans sujet est un fait, pas une ignorance", () => {
  assert.deepEqual(avancementDe([]), { total: 0, clos: 0, pourcentage: 0 });
  assert.equal(phraseDeLAvancement(avancementDe([])), "", "rien à montrer sur une situation vide");
});

test("l'avancement s'écrit court, et se détaille au survol", () => {
  const avancement = avancementDe([clos("a"), ouvert("b"), ouvert("c"), ouvert("d")]);

  assert.equal(phraseDeLAvancement(avancement), "25 %");
  assert.equal(detailDeLAvancement(avancement), "1 sujet clos sur 4");
  assert.equal(detailDeLAvancement(avancementDe([clos("a"), clos("b")])), "2 sujets clos sur 2");
  assert.equal(detailDeLAvancement(null), "");
});
