/**
 * Ce qu'on dit d'un dépôt — et quand on ne dit rien.
 *
 * Le contrat est en tête de `le-mot-dun-depot.js`.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { DEPOT_ABOUTI, estUnDepotAbouti, phraseDuDepot } from "./le-mot-dun-depot.js";

/**
 * **Le défaut que ce module ferme.** La colonne du milieu de Fichiers répétait
 * « piece_de_mail » sur quatre-vingt-trois lignes : une clé de base de données,
 * en face de chaque nom, plus large que les noms eux-mêmes.
 */
test("un dépôt abouti ne dit rien", () => {
  assert.equal(phraseDuDepot(DEPOT_ABOUTI), "");
  assert.equal(phraseDuDepot("UPLOADED"), "", "la casse ne doit pas changer la réponse");
});

/**
 * **Un statut vide compte comme abouti.** Les documents écrits avant que la
 * colonne existe n'en portent pas : les déclarer tous en échec aurait peint en
 * rouge une mémoire entière, et une alarme qui se déclenche partout ne se lit
 * plus nulle part.
 */
test("un statut absent ne se lit pas comme un échec", () => {
  for (const rien of ["", "   ", null, undefined]) {
    assert.equal(estUnDepotAbouti(rien), true, `« ${rien} » passe pour un échec`);
    assert.equal(phraseDuDepot(rien), "");
  }
});

/**
 * **Ce qui ne s'est pas terminé se dit**, et c'est la seule chose que cette
 * colonne existe encore pour porter : elle ne se déduit ni du nom, ni du
 * dossier, ni de l'icône, et elle change ce qu'on fait — un document dont les
 * octets ne sont jamais montés ne s'ouvrira pas (règle 5).
 */
test("un dépôt qui n'a pas abouti se dit, en français", () => {
  assert.equal(estUnDepotAbouti("failed"), false);
  assert.equal(phraseDuDepot("failed"), "le dépôt n'a pas abouti");
  assert.equal(phraseDuDepot("pending"), "dépôt en attente");
  assert.equal(phraseDuDepot("uploading"), "dépôt en cours");
});

/**
 * **Un statut inconnu se dit quand même, et sans sa clé.** Le taire cacherait
 * une anomalie ; le montrer tel quel remettrait un mot de machine à l'écran —
 * c'est exactement ce qu'on vient d'enlever.
 */
test("un statut inattendu se signale sans montrer sa clé", () => {
  const dit = phraseDuDepot("quarantined_by_antivirus");
  assert.equal(dit, "le dépôt est dans un état inattendu");
  assert.doesNotMatch(dit, /_/, "une clé de base de données repart à l'écran");
});
