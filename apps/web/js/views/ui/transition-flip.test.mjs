/**
 * Le réagencement joué : ce qu'on marque, et ce qu'on respecte.
 *
 * Le glissement lui-même se voit à l'écran, pas dans un test : il tient à des
 * mesures de position, et un DOM sans mise en page n'en a pas. Ce qui se teste
 * ici, c'est la part qui décide — qui part, et si l'on a le droit d'animer.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { marquerLesPartants, mouvementAccepte } from "./transition-flip.js";

/** Un hôte minuscule : juste ce qu'il faut de DOM pour marquer des éléments. */
function faireUnHote(cles) {
  const elements = cles.map((cle) => ({
    attributs: { "data-x": cle },
    classes: new Set(),
    getAttribute(nom) { return this.attributs[nom] ?? null; },
    classList: { add(c) { this.proprietaire.classes.add(c); } }
  }));
  for (const element of elements) element.classList.proprietaire = element;
  return { querySelectorAll: () => elements, elements };
}

test("ce qui ne reste pas est marqué, et rien d'autre", () => {
  // Le module ne sait pas ce que l'appelant va masquer : c'est l'appelant qui
  // le dit, et il le dit avant que la mise en page ne change.
  const hote = faireUnHote(["a", "b", "c"]);
  const combien = marquerLesPartants(hote, "[data-x]", "data-x", ["a", "c"]);
  assert.equal(combien, 1);
  assert.deepEqual(hote.elements.map((e) => [...e.classes]), [[], ["est-en-sortie"], []]);
});

test("tout partir se marque aussi", () => {
  const hote = faireUnHote(["a", "b"]);
  assert.equal(marquerLesPartants(hote, "[data-x]", "data-x", []), 2);
});

test("sans hôte, on ne marque rien plutôt que de tomber", () => {
  assert.equal(marquerLesPartants(null, "[data-x]", "data-x", ["a"]), 0);
});

test("le réglage du système décide si l'on anime", () => {
  // « prefers-reduced-motion » n'est pas une préférence esthétique : mal de
  // cœur, migraine, trouble de l'attention. On l'honore.
  const ancien = globalThis.window;
  globalThis.window = { matchMedia: (requete) => ({ matches: /reduce/.test(requete) }) };
  assert.equal(mouvementAccepte(), false);
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  assert.equal(mouvementAccepte(), true);
  // Sans fenêtre du tout — un test, un rendu serveur — on suppose que oui.
  delete globalThis.window;
  assert.equal(mouvementAccepte(), true);
  if (ancien) globalThis.window = ancien;
});
