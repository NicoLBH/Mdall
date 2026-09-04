import test from "node:test";
import assert from "node:assert/strict";

import { recolleurDeLignes, lireLeFlux } from "./flux-ndjson.js";

/** Une réponse minimale qui rend les morceaux qu'on lui donne, dans l'ordre. */
function reponseDe(morceaux) {
  const encodeur = new TextEncoder();
  let rang = 0;
  return {
    body: {
      getReader() {
        return {
          async read() {
            if (rang >= morceaux.length) return { done: true, value: undefined };
            return { done: false, value: encodeur.encode(morceaux[rang++]) };
          }
        };
      }
    }
  };
}

test("une ligne coupée en deux morceaux ne se lit qu'une fois entière", () => {
  const recolleur = recolleurDeLignes();
  assert.deepEqual(recolleur.pousser('{"a":'), []);
  assert.deepEqual(recolleur.pousser('1}\n{"b":2}\n'), ['{"a":1}', '{"b":2}']);
  assert.deepEqual(recolleur.fin(), []);
});

test("ce qui traîne après le dernier saut de ligne n'est pas perdu", () => {
  const recolleur = recolleurDeLignes();
  assert.deepEqual(recolleur.pousser('{"a":1}\n{"b":2}'), ['{"a":1}']);
  assert.deepEqual(recolleur.fin(), ['{"b":2}']);
  // Une seconde fin ne redonne pas la même ligne.
  assert.deepEqual(recolleur.fin(), []);
});

test("les étapes arrivent dans l'ordre, et le résultat à la fin", async () => {
  const vus = [];
  const enFlux = await lireLeFlux(
    reponseDe([
      '{"etape":{"texte":"Lecture de la note"}}\n{"etape":{"texte":"Hors gel"',
      ',"detail":"0,99 m"}}\n{"fin":{"resultat":{"statut":"fait"}}}\n'
    ]),
    (objet) => vus.push(objet)
  );

  assert.equal(enFlux, true);
  assert.deepEqual(vus, [
    { etape: { texte: "Lecture de la note" } },
    { etape: { texte: "Hors gel", detail: "0,99 m" } },
    { fin: { resultat: { statut: "fait" } } }
  ]);
});

test("un caractère accentué coupé entre deux morceaux se recolle", async () => {
  const encodeur = new TextEncoder();
  const octets = encodeur.encode('{"etape":{"texte":"Répondu"}}\n');
  const vus = [];

  const enFlux = await lireLeFlux({
    body: {
      getReader() {
        // La coupure tombe au milieu du « é » : deux octets, un caractère.
        const morceaux = [octets.slice(0, 15), octets.slice(15)];
        let rang = 0;
        return {
          async read() {
            if (rang >= morceaux.length) return { done: true, value: undefined };
            return { done: false, value: morceaux[rang++] };
          }
        };
      }
    }
  }, (objet) => vus.push(objet));

  assert.equal(enFlux, true);
  assert.deepEqual(vus, [{ etape: { texte: "Répondu" } }]);
});

test("une ligne illisible ne fait pas perdre celles qui suivent", async () => {
  const vus = [];
  await lireLeFlux(reponseDe(['{"etape":{"texte":"A"}}\nceci n\'est pas du JSON\n{"fin":{"resultat":1}}\n']),
    (objet) => vus.push(objet));

  assert.deepEqual(vus, [{ etape: { texte: "A" } }, { fin: { resultat: 1 } }]);
});

test("un corps qui ne se lit pas en flux le dit, plutôt que de rendre vide", async () => {
  assert.equal(await lireLeFlux({}, () => {}), false);
  assert.equal(await lireLeFlux({ body: {} }, () => {}), false);
});
