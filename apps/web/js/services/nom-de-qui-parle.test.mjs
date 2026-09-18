import test from "node:test";
import assert from "node:assert/strict";

import { QUELQUUN, nomDeQuiParle } from "./nom-de-qui-parle.js";

test("prénom et nom d'abord : c'est ainsi qu'on se désigne", () => {
  assert.equal(nomDeQuiParle({ firstName: "Ourdine", lastName: "Ferrand", email: "o@x.fr" }),
    "Ourdine Ferrand");
});

test("un prénom seul vaut mieux qu'une adresse", () => {
  assert.equal(nomDeQuiParle({ firstName: "Ourdine", email: "o@x.fr" }), "Ourdine");
  assert.equal(nomDeQuiParle({ lastName: "Ferrand", email: "o@x.fr" }), "Ferrand");
});

test("les replis se suivent dans l'ordre, et l'adresse se reconnaît encore", () => {
  assert.equal(nomDeQuiParle({ fullName: "Ourdine Ferrand" }), "Ourdine Ferrand");
  assert.equal(nomDeQuiParle({ name: "Ourdine" }), "Ourdine");
  assert.equal(nomDeQuiParle({ email: "ourdine@exemple.fr" }), "ourdine@exemple.fr");
});

test("sans rien, on dit qu'un humain a signé", () => {
  // Le vide se lirait comme une signature automatique, et c'est exactement ce
  // qu'il ne faut pas laisser croire.
  assert.equal(nomDeQuiParle({}), QUELQUUN);
  assert.equal(nomDeQuiParle(null), QUELQUUN);
  assert.equal(nomDeQuiParle("Ourdine"), QUELQUUN);
  assert.equal(nomDeQuiParle({ firstName: "  ", email: " " }), QUELQUUN);
});
