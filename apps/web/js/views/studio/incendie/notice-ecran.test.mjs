/**
 * L'écran de la notice : ce qu'il propose, et dans quel ordre.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { propositionsDe, paragraphesDe, departementDe, dessinerLaNotice, noticeEnHtml } from "./notice-ecran.js";

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

const NOTICE = {
  entete: [{ cle: "adresse", libelle: "Adresse", valeur: "74920 Combloux" }],
  sections: [{
    cle: "structures", numero: 2, titre: "Structures",
    paragraphes: [{ cle: "planchers", texte: "Les planchers seront **CF 1/2 h**.", propose: "Les planchers seront CF 1/2 h.", repris: true, champ: { cle: "materiau", libelle: "Nature des planchers", rubrique: "planchers.materiau", options: ["béton armé"], multiple: true } }],
    sousSections: [{ titre: "Façades", paragraphes: [{ cle: "facades", texte: "Les façades seront en enduit.", champ: null }] }]
  }]
};

test("le markdown d'une phrase reprise s'affiche en forme, pas en astérisques", () => {
  const html = dessinerLaNotice({ notice: NOTICE, complements: {}, bibliotheque: {} });
  assert.match(html, /<strong>CF 1\/2 h<\/strong>/);
  assert.doesNotMatch(html, /\*\*CF/);
});

test("une phrase s'annonce cliquable, et une phrase reprise se voit", () => {
  const html = dessinerLaNotice({ notice: NOTICE, complements: {}, bibliotheque: {} });
  assert.match(html, /data-notice-paragraphe="planchers"/);
  assert.match(html, /role="button"/);
  assert.match(html, /est-reprise/);
});

test("l'éditeur ne s'ouvre que sur la phrase désignée, et porte son texte entier", () => {
  const ferme = dessinerLaNotice({ notice: NOTICE, complements: {}, bibliotheque: {} });
  assert.doesNotMatch(ferme, /data-champ-texte/);

  const ouvert = dessinerLaNotice({ notice: NOTICE, complements: {}, bibliotheque: {}, ouvert: "planchers" });
  assert.match(ouvert, /data-champ-texte="planchers"/);
  assert.match(ouvert, /Les planchers seront \*\*CF 1\/2 h\*\*\./);
});

test("une phrase sans champ se reprend quand même", () => {
  // Notre aide sert à remplir vite ; elle ne doit pas empêcher de reprendre.
  const ouvert = dessinerLaNotice({ notice: NOTICE, complements: {}, bibliotheque: {}, ouvert: "facades" });
  assert.match(ouvert, /data-champ-texte="facades"/);
  assert.match(ouvert, /Reprendre la phrase/);
});

test("le presse-papier porte aussi du HTML, pour que Word garde la mise en forme", () => {
  const html = noticeEnHtml(NOTICE);
  assert.match(html, /<h2>2\. Structures<\/h2>/);
  assert.match(html, /<h3>2\.1 Façades<\/h3>/);
  assert.match(html, /<strong>CF 1\/2 h<\/strong>/);
  assert.match(html, /74920 Combloux/);
});
