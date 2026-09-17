import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  STATUT_MANQUE, estUneQuestion, renderCarteSansResultat
} from "./carte-sans-resultat.js";

test("une demande de précision ne porte pas le cadre de l'alarme", () => {
  // Le défaut : « Test d'une variante — il faut dire ce qu'on change » sortait
  // encadré de rouge, au milieu d'une réponse qui s'était bien passée. On
  // cherchait la panne, il n'y en avait pas, et la peur restait après qu'on
  // avait compris.
  const html = renderCarteSansResultat({
    statut: "manque", titre: "Test d'une variante", message: "il faut dire ce qu'on change"
  });

  assert.match(html, /copilote-outil--manque/);
  assert.doesNotMatch(html, /copilote-outil--refus/);
  assert.match(html, /il faut dire ce qu&#39;on change|il faut dire ce qu'on change/);
});

test("ce qui a vraiment échoué le porte toujours", () => {
  // L'inverse compte autant : effacer le rouge partout ferait lire une panne
  // comme une question, et l'on attendrait une réponse qui ne viendra pas.
  const html = renderCarteSansResultat({
    statut: "refus", titre: "Test d'une variante", message: "cette adresse n'a pas été trouvée"
  });

  assert.match(html, /copilote-outil--refus/);
  assert.doesNotMatch(html, /copilote-outil--manque/);
});

test("le statut qui distingue les deux est écrit d'un seul côté", () => {
  // `copilote-variante.js` écrit ce statut, cette carte le relit. Deux chaînes
  // recopiées finiraient par ne plus se répondre — et le cadre redeviendrait
  // rouge sans que personne ne touche à cette carte (règle 10).
  const variante = readFileSync(
    new URL("../../../services/copilote-variante.js", import.meta.url), "utf8"
  );

  assert.match(variante, new RegExp(`statut: "${STATUT_MANQUE}"`));
  assert.equal(estUneQuestion({ statut: STATUT_MANQUE }), true);
  assert.equal(estUneQuestion({ statut: "refus" }), false);
  assert.equal(estUneQuestion({ statut: "fait" }), false);
  assert.equal(estUneQuestion(null), false);
});

test("un agent sans message dit quand même quelque chose", () => {
  // Une carte vide se lit comme un écran à moitié rendu, et l'on ne sait pas
  // s'il faut attendre (règle 5).
  const html = renderCarteSansResultat({ statut: "refus" });
  assert.match(html, /Agent/);
  assert.match(html, /n&#39;a pas conclu|n'a pas conclu/);
  assert.equal(renderCarteSansResultat(null), "");
});

test("le dépliant vient de l'écran, la carte ne le fabrique pas", () => {
  // Il a besoin des icônes et de la mise en page de l'écran ; le porter ici
  // aurait tiré tout le Copilote derrière ce fichier, qui ne s'importerait plus
  // dans un test.
  const html = renderCarteSansResultat({ statut: "manque", titre: "T" }, "<details>ici</details>");
  assert.match(html, /<details>ici<\/details>/);
});

test("un titre venu d'un agent ne s'échappe pas dans le HTML", () => {
  const html = renderCarteSansResultat({ statut: "refus", titre: '<img src=x onerror="alert(1)">' });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});
