import assert from "node:assert/strict";
import test from "node:test";

import { REFUS, leReleveLu, motifDuStatut, phraseDuRefus, queFaire } from "./le-releve-rendu.js";

// Aucun mail réel : les noms, les sociétés et les domaines sont inventés.
const rendu = (dessus = {}) => ({ prises: [{ key: "p1", intitule: "la cote est arrêtée" }], ...dessus });

// ── La température, et ce qu'elle promet ───────────────────────────────────

test("la température tenue descend telle quelle", () => {
  assert.equal(leReleveLu(rendu({ temperature: 0 })).temperature, 0);
});

test("une température refusée par le modèle ne devient pas zéro", () => {
  // Zéro voudrait dire « reproductible », et ce relevé ne l'est pas : une
  // preuve qui change alors que le document n'a pas changé n'est plus une
  // preuve (règle 1).
  assert.equal(leReleveLu(rendu({ temperature: null })).temperature, null);
  assert.equal(leReleveLu(rendu()).temperature, null);
  assert.equal(leReleveLu(rendu({ temperature: "0" })).temperature, null);
});

// ── Ce que le serveur rend, et ce qu'on refuse d'inventer ──────────────────

test("un compte message par message absent reste une ignorance", () => {
  // `null` n'est pas `[]` : on ne transforme pas « je ne sais pas » en « il
  // n'y en a aucun » (règle 5).
  const lu = leReleveLu(rendu());
  assert.equal(lu.muets, null);
  assert.equal(lu.oublies, null);
});

test("un compte message par message vide est une déclaration", () => {
  const lu = leReleveLu(rendu({ messages_muets: [], messages_oublies: [2] }));
  assert.deepEqual(lu.muets, []);
  assert.deepEqual(lu.oublies, [2]);
});

test("le compte des écartées se dérive de la liste, et jamais d'ailleurs", () => {
  // Deux nombres qui disent la même chose finissent par ne plus la dire
  // (règle 4).
  const lu = leReleveLu(rendu({ ecartees: [{ motif: "introuvable" }, { motif: "vide" }] }));
  assert.equal(lu.ecartees, 2);
  assert.equal(lu.lesEcartees.length, 2);
});

test("une couverture absente ne se fabrique pas", () => {
  assert.deepEqual(leReleveLu(rendu()).couverture, []);
  assert.deepEqual(leReleveLu(rendu({ couverture: [{ message: 1, caracteres: 10, couverts: 3 }] }))
    .couverture, [{ message: 1, caracteres: 10, couverts: 3 }]);
});

test("les comptes du serveur se lisent sous leur nom, et non sous un autre", () => {
  const lu = leReleveLu(rendu({
    renvois_ecartes: 2, messages_corriges: 1, duree_ms: 3400, coupee: true,
    modele: "gpt-4.1-mini", jetons: { entree: 4200, sortie: 800 }
  }));
  assert.equal(lu.renvoisEcartes, 2);
  assert.equal(lu.messagesCorriges, 1);
  assert.equal(lu.dureeMs, 3400);
  assert.equal(lu.coupee, true);
  assert.equal(lu.modele, "gpt-4.1-mini");
  assert.equal(lu.entree, 4200);
  assert.equal(lu.sortie, 800);
});

test("un coût non annoncé n'est pas un coût nul", () => {
  // « le fournisseur n'a rien décompté » n'est pas « c'était gratuit »
  // (règle 5).
  const lu = leReleveLu(rendu({ jetons: {} }));
  assert.equal(lu.entree, null);
  assert.equal(lu.sortie, null);
});

// ── Ce qui n'a rien su citer n'est pas un fil vide ─────────────────────────

test("aucune prise retenue alors que le modèle en a rendu est un refus nommé", () => {
  // Cela se répare autrement qu'un fil qui ne porte rien.
  const lu = leReleveLu({ prises: [], ecartees: [{ motif: "introuvable" }], coupee: true });
  assert.equal(lu.ok, false);
  assert.equal(lu.motif, REFUS.RIEN_DE_VERIFIE);
  assert.equal(lu.coupee, true);
});

test("aucune prise et aucune écartée n'est pas ce refus-là", () => {
  // Le pendant : un fil qui ne porte rien à relever est autre chose.
  assert.equal(leReleveLu({ prises: [], ecartees: [] }).ok, true);
});

test("une réponse illisible ne fait pas semblant d'être lue", () => {
  const lu = leReleveLu(null);
  assert.equal(lu.ok, true);
  assert.deepEqual(lu.prises, []);
  assert.equal(lu.temperature, null);
});

// ── Ce qu'un code de réponse dit ───────────────────────────────────────────

test("un délai dépassé n'est pas un refus", () => {
  // Un refus a une cause nommée, un dépassement n'en a aucune : les confondre
  // envoie chercher ce qui n'existe pas.
  for (const code of [408, 504, 524]) assert.equal(motifDuStatut(code), REFUS.TROP_LONG);
  assert.equal(motifDuStatut(404), REFUS.INJOIGNABLE);
  assert.equal(motifDuStatut(500), REFUS.REFUSE);
});

test("chaque refus a sa phrase", () => {
  for (const motif of Object.values(REFUS)) {
    assert.ok(phraseDuRefus(motif), `pas de phrase pour ${motif}`);
  }
  assert.equal(phraseDuRefus("inconnu"), "");
});

test("un refus du fournisseur n'a pas de suite inventée", () => {
  // **C'est délibéré.** Il porte déjà sa cause nommée ; lui ajouter un conseil
  // générique serait inventer une suite qu'on n'a pas (règle 5). Les autres en
  // ont une, parce qu'il y a vraiment quelque chose à faire.
  assert.equal(queFaire(REFUS.REFUSE), "");
  for (const motif of Object.values(REFUS)) {
    if (motif === REFUS.REFUSE) continue;
    assert.ok(queFaire(motif), `pas de suite pour ${motif}`);
  }
  assert.equal(queFaire("inconnu"), "");
});

// ── Les sujets déclarés ────────────────────────────────────────────────────

test("les sujets du fil descendent tels que le serveur les a rendus", () => {
  const lu = leReleveLu(rendu({
    sujets: [{ numero: 1, intitule: "humidité de l'acrotère" }], sujets_ecartes: 0
  }));
  assert.deepEqual(lu.sujets, [{ numero: 1, intitule: "humidité de l'acrotère" }]);
  assert.equal(lu.sujetsEcartes, 0);
});

test("une réponse sans sujets rend une liste vide, et non une absence de champ", () => {
  // L'écran boucle dessus : `undefined` le ferait tomber, et le relevé entier
  // disparaîtrait alors pour un champ que le serveur n'a pas dit.
  assert.deepEqual(leReleveLu(rendu()).sujets, []);
});

test("un compte de sujets écartés absent reste nul, et non zéro", () => {
  // Zéro est une déclaration : « aucune prise n'a raté son rattachement ». Une
  // version plus ancienne de la fonction n'a rien déclaré du tout (règle 5).
  assert.equal(leReleveLu(rendu()).sujetsEcartes, null);
  assert.equal(leReleveLu(rendu({ sujets_ecartes: 3 })).sujetsEcartes, 3);
});
