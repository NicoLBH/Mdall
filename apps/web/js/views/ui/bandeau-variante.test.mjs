/**
 * Le bandeau d'une variante dit deux choses différentes, et ne les confond pas.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { renderBandeauVariante } from "./bandeau-variante.js";

const gardee = (dessus = {}) => ({
  depart: [{ sujet: "Altitude du site", depuis: "490 m", vers: "890 m" }],
  recalculees: 1, aRevoir: 0,
  ...dessus
});

test("sans variante, le bandeau ne paraît pas", () => {
  assert.equal(renderBandeauVariante(null), "");
});

test("la mémoire qui bouge et ce dont la variante part sont deux phrases", () => {
  // « La mémoire a bougé » dit qu'il s'est passé quelque chose, n'importe quoi.
  // L'autre nomme la valeur de départ et depuis quel document elle a été revue :
  // c'est la seule des deux qui dise si l'hypothèse porte encore.
  const html = renderBandeauVariante(gardee(), {
    aBouge: true,
    suppose: "cette variante part d'une valeur revue depuis par un document plus récent : "
      + "Altitude du site (du 2026-03-04, revu au 2026-06-12)."
  });

  assert.match(html, /La mémoire a bougé depuis ce calcul/);
  assert.match(html, /Altitude du site \(du 2026-03-04, revu au 2026-06-12\)/);
});

test("rien à supposer, rien à l'écran", () => {
  // Une rubrique qui paraît vide fait chercher ce qu'elle veut dire.
  const html = renderBandeauVariante(gardee(), { aBouge: false, suppose: "   " });

  assert.doesNotMatch(html, /document plus récent/);
  assert.doesNotMatch(html, /La mémoire a bougé/);
});

test("la phrase supposée est échappée, jamais injectée", () => {
  // Elle porte des noms de sujets, et un sujet est du texte que quelqu'un a
  // écrit : le rendre tel quel ferait du balisage d'un nom de valeur.
  const html = renderBandeauVariante(gardee(), { suppose: "<script>alert(1)</script>" });

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
