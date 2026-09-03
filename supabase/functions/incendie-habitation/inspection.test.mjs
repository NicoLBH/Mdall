/**
 * Le dépouillement montré — et la serrure qui le garde fermé.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { peutInspecter, inspecteursAutorises, lireCondition, expliquerModule, INSPECTEURS_DU_REFERENTIEL } from "./inspection.js";
import { CORPUS, consulter, expliquer, questionDe } from "./corpus.js";

test("sans secret, personne n'inspecte — sauf les auteurs du référentiel", () => {
  // C'est le point du dispositif : un mode de vérification ouvert à tous les
  // collaborateurs d'un projet serait exactement ce qu'on refusait de faire.
  for (const secret of [undefined, "", "   ", ","]) {
    assert.equal(peutInspecter({ id: "u1", email: "a@b.c" }, secret), false, JSON.stringify(secret));
  }
  // Les auteurs gardent la clé sans qu'un secret ait à être déployé : on ne
  // vérifie pas un dépouillement une fois, on le vérifie en l'écrivant.
  for (const auteur of INSPECTEURS_DU_REFERENTIEL) {
    assert.equal(peutInspecter({ email: auteur }, undefined), true, auteur);
  }
});

test("le secret s'ajoute à la liste des auteurs, il ne la remplace pas", () => {
  const secret = "collegue@bureau.fr";
  assert.equal(peutInspecter({ email: "collegue@bureau.fr" }, secret), true);
  assert.equal(peutInspecter({ email: INSPECTEURS_DU_REFERENTIEL[0] }, secret), true);
  assert.equal(peutInspecter({ email: "quelqu-un-dautre@ailleurs.fr" }, secret), false);
});

test("le secret nomme les comptes, par identifiant ou par adresse", () => {
  const secret = "a@b.c, 11111111-2222-3333-4444-555555555555";
  assert.equal(peutInspecter({ email: "a@b.c" }, secret), true);
  assert.equal(peutInspecter({ id: "11111111-2222-3333-4444-555555555555" }, secret), true);
  // Une majuscule dans une adresse n'a jamais changé personne.
  assert.equal(peutInspecter({ email: "A@B.C" }, secret), true);
  assert.equal(peutInspecter({ email: "autre@b.c" }, secret), false);
  assert.equal(peutInspecter(null, secret), false);
  assert.deepEqual(inspecteursAutorises("a@b.c;  d@e.f\ng@h.i").slice(INSPECTEURS_DU_REFERENTIEL.length),
    ["a@b.c", "d@e.f", "g@h.i"]);
});

test("une condition se relit à voix haute, sinon autant lire le code", () => {
  assert.equal(lireCondition("famille", ["3", "4"], "la famille"), "la famille vaut « 3 » ou « 4 »");
  assert.equal(lireCondition("surfaceParc", { auPlus: 100 }, "la surface"), "la surface est au plus 100");
  assert.equal(lireCondition("n", { auMoins: 6 }, "n"), "n est au moins 6");
  assert.equal(lireCondition("n", { plusDe: 28 }, "n"), "n dépasse 28");
  assert.equal(lireCondition("n", { moinsDe: 8 }, "n"), "n est inférieur à 8");
  assert.equal(lireCondition("x", { differentDe: "y" }, "x"), "x n'est pas « y »");
  assert.equal(lireCondition("x", { renseigne: true }, "x"), "x a été renseigné");
  assert.equal(lireCondition("x", true, "x"), "x : oui");
  assert.equal(lireCondition("x", false, "x"), "x : non");
  assert.equal(lireCondition("x", "2e famille", "x"), "x vaut « 2e famille »");
});

test("les règles sortent dans leur ordre, et l'ordre est la moitié du sens", () => {
  // La première qui mord l'emporte : une règle relue hors de son rang se juge
  // fausse alors qu'elle est simplement précédée d'une autre.
  const module = CORPUS.find((m) => m.id === "planchers");
  const explique = expliquerModule(module, consulter({}), questionDe);
  assert.deepEqual(explique.regles.map((r) => r.rang), module.regles.map((_, i) => i + 1));
  assert.equal(explique.regles.length, module.regles.length);
});

test("la règle qui a décidé pour ce cas-là est désignée, et elle seule", () => {
  const cas = { logementsSuperposes: true, duplexOuTriplexAuDernierEtage: false, etagesSurRdc: 3,
    hauteurPlancherBasLogementLePlusHaut: 7.5, hauteurPlancherBasNiveauLePlusHaut: 7.5 };
  const rendu = expliquer("planchers", cas);
  assert.equal(rendu.ok, true);
  assert.equal(rendu.valeur, "CF 1/2 h");
  const retenues = rendu.regles.filter((r) => r.retenue);
  assert.equal(retenues.length, 1);
  assert.match(retenues[0].source.citation, /2ème famille/);
});

test("l'inspection nomme les faits en clair, pas en clés", () => {
  const rendu = expliquer("planchers", {});
  const conditions = rendu.regles.flatMap((r) => r.conditions);
  assert.ok(conditions.some((c) => c.libelle.includes("« Famille »")), "un fait produit se nomme par son module");
  assert.ok(conditions.some((c) => c.libelle.includes("sous-sol")), "une question se nomme par son énoncé");
  // Et l'on peut remonter au module amont : c'est ce qui rend le graphe navigable.
  assert.ok(conditions.some((c) => c.produitPar === "famille"));
});

test("l'inspection rend les liaisons du module, pas le graphe entier", () => {
  const rendu = expliquer("planchers", {});
  assert.ok(rendu.liaisons.amont.every((l) => l.vers === "planchers"));
  assert.ok(rendu.liaisons.aval.every((l) => l.de === "planchers"));
  assert.ok(rendu.documentation?.texte?.length > 100, "l'article accompagne le dépouillement");
});

test("un module inconnu se refuse plutôt que de rendre du vide", () => {
  assert.equal(expliquer("ce-module-n-existe-pas", {}).ok, false);
});

test("la serrure ne ferme que les règles, pas le détail entier", () => {
  // Refuser le panneau entier faisait croire à une panne, et privait tout le
  // monde de ce qui pouvait se montrer : la question à laquelle le module
  // répond, ce dont il dépend, ce qui dépend de lui, l'article. Seule la table
  // des conditions est le travail, et elle seule attend la clé.
  const ferme = expliquer("planchers", {}, { avecRegles: false });
  assert.equal(ferme.ok, true);
  assert.equal(ferme.regles, null);
  assert.equal(ferme.reglesFermees, true);
  assert.ok(ferme.repond);
  assert.ok(ferme.liaisons.amont.length > 0);
  assert.ok(ferme.documentation.texte.length > 100);

  const ouvert = expliquer("planchers", {});
  assert.equal(ouvert.reglesFermees, false);
  assert.ok(ouvert.regles.length > 0);
});
