/**
 * Ce que la liste des situations dit d'elle-même.
 *
 * Les sélecteurs s'exécutent ici pour de vrai : on leur donne un magasin, on
 * lit ce qu'ils rendent.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSituationsSelectors } from "./project-situations-selectors.js";

function selecteurs({ counts = {}, loading = false, data = [] } = {}) {
  return createProjectSituationsSelectors({
    store: { situationsView: { data } },
    uiState: { countsBySituationId: counts, loading }
  });
}

/**
 * **Zéro serait un mensonge.**
 *
 * Une situation dont personne n'a compté les sujets n'en a pas zéro : on ne
 * sait pas. « 0 » se lit comme un chantier sans travail, et l'on va chercher la
 * panne ailleurs — dans le filtre, dans la base, partout sauf là où elle est
 * (règle 5). Dans le carnet, les situations automatiques sont exactement dans
 * ce cas : leurs sujets vivent dans des chantiers qui ne sont pas chargés là.
 */
test("un compte qu'on n'a pas fait ne vaut pas zéro", () => {
  assert.equal(selecteurs().renderSituationCount("inconnue"), "—");
});

/** Un vrai zéro se dit zéro : compté, et vide. C'est un fait, pas une absence. */
test("un vrai zéro se dit zéro", () => {
  assert.equal(selecteurs({ counts: { "s-1": 0 } }).renderSituationCount("s-1"), "0");
  assert.equal(selecteurs({ counts: { "s-1": 7 } }).renderSituationCount("s-1"), "7");
});

/** Et pendant qu'on compte, on dit qu'on compte. */
test("pendant le chargement, le compte patiente", () => {
  assert.equal(selecteurs({ loading: true }).renderSituationCount("s-1"), "…");
});
