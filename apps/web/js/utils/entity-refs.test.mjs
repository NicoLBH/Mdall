import test from "node:test";
import assert from "node:assert/strict";

import {
  REF,
  applyRefSuggestion,
  formatRef,
  linkifyRefsInHtml,
  parseRef,
  resolveRefTriggerContext,
  searchRefSuggestions
} from "./entity-refs.js";

const ENTRIES = [
  { kind: REF.SUBJECT, id: "s-12", number: 12, title: "Étanchéité de la toiture" },
  { kind: REF.SUBJECT, id: "s-13", number: 13, title: "Ventilation du parking" },
  { kind: REF.PROPOSITION, id: "p-4", number: 4, title: "Rapports d'étape SOCOTEC" },
  { kind: REF.PROPOSITION, id: "p-12", number: 12, title: "Fiches avis travaux" }
];

test("un sujet garde son dièse nu, une proposition prend le sien", () => {
  // `#12` désigne un sujet dans tous les commentaires déjà écrits : en changer
  // le sens réécrirait le passé.
  assert.equal(formatRef(REF.SUBJECT, 12), "#12");
  assert.equal(formatRef(REF.PROPOSITION, 4), "#P4");
});

test("un jeton se relit, et ce qui n'en est pas un ne se devine pas", () => {
  assert.deepEqual(parseRef("12"), { kind: REF.SUBJECT, number: 12 });
  assert.deepEqual(parseRef("P4"), { kind: REF.PROPOSITION, number: 4 });
  assert.deepEqual(parseRef("p4"), { kind: REF.PROPOSITION, number: 4 });
  assert.equal(parseRef("tranche"), null);
  assert.equal(parseRef("0"), null);
});

test("un dièse collé à un mot n'ouvre pas de citation", () => {
  // `abc#12` n'est pas une citation, c'est une chaîne.
  assert.equal(resolveRefTriggerContext("abc#12", 6), null);
  assert.ok(resolveRefTriggerContext("voir #12", 8));
});

test("un dièse suivi d'un mot n'ouvre rien non plus", () => {
  // « #tranche » n'est pas une référence, et ouvrir un menu dessus le ferait
  // clignoter pour rien.
  assert.equal(resolveRefTriggerContext("#tranche", 8), null);
  assert.ok(resolveRefTriggerContext("#p", 2), "une lettre de famille, elle, cherche");
});

test("la lettre P suffit à ne plus vouloir que des propositions", () => {
  // C'est le sens qu'on lui donne en la tapant ; attendre un chiffre ferait
  // défiler des sujets sous les doigts de quelqu'un qui n'en cherche pas.
  const trouves = searchRefSuggestions(ENTRIES, "p");

  assert.deepEqual(trouves.map((entry) => entry.id), ["p-4", "p-12"]);
});

test("un numéro nu cherche dans les deux familles, sujets d'abord", () => {
  // `#12` sans préfixe désigne un sujet : l'ordre du menu doit dire la même
  // chose que le jeton qu'il insère.
  const trouves = searchRefSuggestions(ENTRIES, "12");

  assert.deepEqual(trouves.map((entry) => entry.id), ["s-12", "p-12"]);
});

test("un numéro préfixé ne cherche que sa famille", () => {
  assert.deepEqual(searchRefSuggestions(ENTRIES, "p12").map((entry) => entry.id), ["p-12"]);
});

test("des mots cherchent dans les titres des deux familles", () => {
  assert.deepEqual(searchRefSuggestions(ENTRIES, "socotec").map((entry) => entry.id), ["p-4"]);
  assert.deepEqual(searchRefSuggestions(ENTRIES, "toiture").map((entry) => entry.id), ["s-12"]);
});

test("une recherche vide propose tout, dans l'ordre", () => {
  assert.deepEqual(searchRefSuggestions(ENTRIES, "").map((entry) => entry.id), ["s-12", "s-13", "p-4", "p-12"]);
});

test("choisir une proposition écrit son jeton à la place du dièse", () => {
  const contexte = resolveRefTriggerContext("voir #p4", 8);
  const resultat = applyRefSuggestion("voir #p4", contexte, { kind: REF.PROPOSITION, number: 4 });

  assert.equal(resultat.nextText, "voir #P4");
  assert.equal(resultat.nextCursorIndex, 8);
});

test("l'espace ne s'ajoute que s'il manque", () => {
  // Coller le jeton au mot suivant casserait la citation qu'on vient d'écrire.
  const avecEspace = applyRefSuggestion("voir # ensuite", { triggerStart: 5, triggerEnd: 6 }, {
    kind: REF.SUBJECT,
    number: 12
  });
  assert.equal(avecEspace.nextText, "voir #12 ensuite", "un espace suit déjà");

  const enFin = applyRefSuggestion("voir #", { triggerStart: 5, triggerEnd: 6 }, {
    kind: REF.PROPOSITION,
    number: 4
  });
  assert.equal(enFin.nextText, "voir #P4", "rien ne suit : rien à séparer");

  const colle = applyRefSuggestion("voir #x)", { triggerStart: 5, triggerEnd: 7 }, {
    kind: REF.SUBJECT,
    number: 12
  });
  assert.equal(colle.nextText, "voir #12)", "une parenthèse ferme déjà la citation");
});

test("sans DOM, la transformation en liens rend le texte inchangé", () => {
  // Le module reste chargeable hors navigateur : les tests des autres modules
  // l'importent par ricochet.
  assert.equal(linkifyRefsInHtml("<p>voir #12</p>", { resolveRef: () => ({ id: "s-12" }) }), "<p>voir #12</p>");
});

test("une référence qui ne résout pas reste du texte", () => {
  // Un lien mort promet une page qui n'existe pas — pire que pas de lien.
  assert.equal(linkifyRefsInHtml("<p>voir #999</p>", { resolveRef: () => null }), "<p>voir #999</p>");
});
