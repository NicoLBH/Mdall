/**
 * L'épreuve de la pastille mutualisée.
 *
 * **Le défaut qu'on cherche ici n'est pas visuel : c'est une affirmation qu'on
 * n'a pas faite.** Une pastille sans classe de ton sort grise, et le gris dit
 * « sans objet » — c'est-à-dire « il n'y a rien à faire ». Un état qu'on n'a pas
 * su lire s'y afficherait donc comme un état réglé (règle 5).
 */

import assert from "node:assert/strict";
import test from "node:test";

import { LES_TONS, leTonValide, renderUnTon } from "./un-ton.js";

test("les six tons existent, et « inconnu » en est un", () => {
  // `unknown` est celui qu'on oublie, et le seul qui ne soit pas un jugement :
  // il dit que personne n'a lu.
  assert.deepEqual(LES_TONS, ["ok", "pending", "danger", "info", "neutral", "unknown"]);
});

test("un ton inconnu retombe sur « inconnu », et jamais sur rien", () => {
  /**
   * **Et non sur une pastille sans classe.** Sans couleur, elle hérite du gris
   * de la page et se lit comme `neutral` — « sans objet » —, c'est-à-dire comme
   * une affirmation que personne n'a faite.
   */
  assert.equal(leTonValide("n'importe quoi"), "unknown");
  assert.equal(leTonValide(""), "unknown");
  assert.equal(leTonValide(null), "unknown");
  assert.equal(leTonValide(undefined), "unknown");

  assert.match(renderUnTon({ mot: "sans réponse", vaut: "violet" }), /un-ton--unknown/);
});

test("la casse ne change pas le ton", () => {
  assert.equal(leTonValide("OK"), "ok");
  assert.equal(leTonValide(" Danger "), "danger");
});

test("chaque ton sort sa classe, et le mot en toutes lettres", () => {
  for (const ton of LES_TONS) {
    const rendu = renderUnTon({ mot: "franchie", vaut: ton });
    assert.match(rendu, new RegExp(`class="un-ton un-ton--${ton}"`));
    assert.match(rendu, />franchie</);
  }
});

test("une pastille sans mot ne s'affiche pas du tout", () => {
  // Elle occuperait la place d'une information qu'on n'a pas, et un cadre vide
  // se lit comme une donnée qu'on n'arrive pas à déchiffrer.
  assert.equal(renderUnTon({ mot: "", vaut: "ok" }), "");
  assert.equal(renderUnTon({ mot: "   ", vaut: "ok" }), "");
  assert.equal(renderUnTon({}), "");
  assert.equal(renderUnTon(), "");
});

test("le mot et le survol sont échappés", () => {
  // Un intitulé de document ou un constat de bureau de contrôle passe par ici.
  const rendu = renderUnTon({ mot: `<b>S</b>`, vaut: "pending", titre: `l'avis "245"` });
  assert.doesNotMatch(rendu, /<b>/);
  assert.match(rendu, /&lt;b&gt;S&lt;\/b&gt;/);
  assert.match(rendu, /title="/);
  assert.doesNotMatch(rendu, /title="l'avis "245""/);
});

test("sans survol, aucun attribut de survol", () => {
  // Un `title` vide ajoute une infobulle qui s'ouvre sur rien.
  assert.doesNotMatch(renderUnTon({ mot: "franchie", vaut: "ok" }), /title=/);
  assert.doesNotMatch(renderUnTon({ mot: "franchie", vaut: "ok", titre: "  " }), /title=/);
});
