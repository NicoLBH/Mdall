import test from "node:test";
import assert from "node:assert/strict";

import {
  cestUneAdresseDannuaire, cestUneAdresseDeMessagerie, lAliasDeLannuaire,
  lidentiteDite, lidentiteLisible
} from "./une-adresse-lisible.js";

const X500 = "/O=EXCHANGELABS/OU=EXCHANGE ADMINISTRATIVE GROUP"
  + " (FYDIBOHF23SPDLT)/CN=RECIPIENTS/CN=2130423FA9EF43C6B5B78421F4C7D6A2-NICOLAS.LEB";

test("une adresse d'annuaire n'est pas une adresse de messagerie", () => {
  assert.equal(cestUneAdresseDannuaire(X500), true);
  assert.equal(cestUneAdresseDeMessagerie(X500), false);
});

test("une vraie adresse en est une", () => {
  assert.equal(cestUneAdresseDeMessagerie("ourdine.ferrand@exemple.example"), true);
  assert.equal(cestUneAdresseDeMessagerie("contact@novaclim.example"), true);
});

test("ce qui n'a ni arobase ni point n'en est pas une", () => {
  assert.equal(cestUneAdresseDeMessagerie(""), false);
  assert.equal(cestUneAdresseDeMessagerie("Ourdine Ferrand"), false);
  assert.equal(cestUneAdresseDeMessagerie("deux@arobases@ici.example"), false);
  assert.equal(cestUneAdresseDeMessagerie("sans-point@domaine"), false);
  assert.equal(cestUneAdresseDeMessagerie("avec espace@exemple.example"), false);
});

test("l'alias se tire du dernier morceau, sans son identifiant de boîte", () => {
  assert.equal(lAliasDeLannuaire(X500), "NICOLAS.LEB");
  assert.equal(lAliasDeLannuaire("/o=x/cn=RECIPIENTS/cn=sansTiret"), "sansTiret");
  assert.equal(lAliasDeLannuaire("ourdine@exemple.example"), "");
});

/**
 * **Le défaut tel qu'il s'est vu.** Trois lignes de titre dans la liste des
 * mails, pour un nom de trois syllabes, et rien qui permette de deviner à quoi
 * cela correspond.
 */
test("une adresse d'annuaire ne s'affiche pas", () => {
  const dit = lidentiteDite({ nom: "Nicolas Lebihan", adresse: X500 });
  assert.equal(dit, "Nicolas Lebihan");
  assert.doesNotMatch(dit, /EXCHANGELABS/);
  assert.doesNotMatch(dit, /CN=/);
  assert.doesNotMatch(dit, /\//);
});

test("sans nom, l'alias vaut mieux que l'identifiant entier", () => {
  assert.equal(lidentiteDite({ nom: "", adresse: X500 }), "NICOLAS.LEB");
});

test("sans nom ni alias lisible, on le dit plutôt que de l'inventer", () => {
  const dit = lidentiteDite({ nom: "", adresse: "/o=x/cn=RECIPIENTS/cn=" });
  assert.equal(dit, "expéditeur interne");
});

test("une vraie adresse garde son nom et son adresse", () => {
  assert.deepEqual(
    lidentiteLisible({ nom: "Clément Boche", adresse: "Clement.BOCHE@socotec.example" }),
    { nom: "Clément Boche", adresse: "Clement.BOCHE@socotec.example" }
  );
});

test("un nom qui répète l'adresse ne s'écrit pas deux fois", () => {
  assert.equal(
    lidentiteDite({ nom: "ourdine@exemple.example", adresse: "Ourdine@exemple.example" }),
    "ourdine@exemple.example"
  );
});

test("une chaîne qu'on ne sait pas qualifier se garde telle quelle", () => {
  // Elle dit peut-être quelque chose ; la jeter serait perdre le peu qu'on a.
  assert.equal(lidentiteDite({ nom: "", adresse: "Accueil Chantier" }), "Accueil Chantier");
  assert.equal(lidentiteDite("Ourdine Ferrand"), "Ourdine Ferrand");
  assert.equal(lidentiteDite(null), "");
});

test("quand le nom n'est que l'adresse, sa casse l'emporte", () => {
  // C'est celle que l'expéditeur a choisi d'afficher, et l'écran la respectait
  // avant ce module : un comportement éprouvé ne change pas au passage.
  assert.equal(lidentiteDite({ nom: "A@B.EXAMPLE", adresse: "a@b.example" }), "A@B.EXAMPLE");
  assert.equal(lidentiteDite({ nom: "a@b.example", adresse: "a@b.example" }), "a@b.example");
});
