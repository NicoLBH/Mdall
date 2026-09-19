import assert from "node:assert/strict";
import test from "node:test";

import { TROU, phraseDuTrou, unTrou } from "./trous-dun-mail.js";

test("un trou dit ce qui manque et où", () => {
  assert.deepEqual(unTrou(TROU.SANS_DATE, "l'en-tête Date"), { quoi: TROU.SANS_DATE, ou: "l'en-tête Date" });
});

test("un trou porte ce qui était écrit à cet endroit, quand il y a quelque chose", () => {
  assert.deepEqual(unTrou(TROU.DATE_ILLISIBLE, "l'en-tête Date", "hier matin"),
    { quoi: TROU.DATE_ILLISIBLE, ou: "l'en-tête Date", detail: "hier matin" });
});

test("chaque trou possible porte sa phrase", () => {
  // Ajouter un trou sans sa phrase le ferait s'afficher « quelque chose n'a
  // pas pu être placé », ce qui n'aide personne.
  for (const quoi of Object.values(TROU)) {
    assert.notEqual(phraseDuTrou({ quoi }), "quelque chose n'a pas pu être placé", quoi);
  }
});

test("la phrase d'un trou nomme l'endroit", () => {
  assert.equal(
    phraseDuTrou({ quoi: TROU.SANS_DATE, ou: "l'en-tête Date" }),
    "ce message ne porte pas de date (l'en-tête Date)"
  );
});

test("un trou inconnu ne fait pas échouer l'affichage", () => {
  assert.equal(phraseDuTrou({ quoi: "inconnu" }), "quelque chose n'a pas pu être placé");
  assert.equal(phraseDuTrou(null), "quelque chose n'a pas pu être placé");
});
