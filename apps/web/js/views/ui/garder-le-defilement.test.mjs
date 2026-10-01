/**
 * Garder la place de ce qui défile.
 *
 * Le contrat est en tête de `garder-le-defilement.js`. Cette règle vivait au
 * milieu d'un `innerHTML`, dans une fonction de rendu : un cassage a montré
 * qu'elle pouvait disparaître sans qu'aucune épreuve ne bouge.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { MARQUE, garderLesPlaces } from "./garder-le-defilement.js";

/**
 * Un hôte de pacotille — juste ce que la règle demande.
 *
 * `remplacer` refait des panneaux **neufs**, à `scrollTop` nul : c'est
 * exactement ce que fait `innerHTML`, et c'est tout le défaut qu'on éprouve.
 */
function unHote(noms = []) {
  let panneaux = noms.map((nom) => ({ dataset: { gardeLeDefilement: nom }, scrollTop: 0 }));
  return {
    querySelectorAll: (quoi) => (quoi === `[${MARQUE}]` ? panneaux : []),
    remplacer: (suivants = noms) => {
      panneaux = suivants.map((nom) => ({ dataset: { gardeLeDefilement: nom }, scrollTop: 0 }));
    },
    places: () => panneaux.map((un) => [un.dataset.gardeLeDefilement, un.scrollTop])
  };
}

/**
 * **Le défaut, et il rendait le geste impraticable.** Cocher le douzième
 * document d'un dossier renvoyait en haut de la liste.
 */
test("un panneau retrouve sa place après un redessin", () => {
  const hote = unHote(["choix-des-fichiers"]);
  hote.querySelectorAll(`[${MARQUE}]`)[0].scrollTop = 420;

  const reposer = garderLesPlaces(hote);
  hote.remplacer();
  assert.deepEqual(hote.places(), [["choix-des-fichiers", 0]], "le témoin ne part pas de zéro");

  reposer();
  assert.deepEqual(hote.places(), [["choix-des-fichiers", 420]]);
});

/**
 * **Chaque panneau garde la sienne.** Deux listes qui échangeraient leurs
 * places sont pires qu'une liste qui remonte : on croirait avoir défilé.
 */
test("deux panneaux ne se partagent pas une place", () => {
  const hote = unHote(["haut", "bas"]);
  const [haut, bas] = hote.querySelectorAll(`[${MARQUE}]`);
  haut.scrollTop = 100;
  bas.scrollTop = 900;

  const reposer = garderLesPlaces(hote);
  hote.remplacer();
  reposer();

  assert.deepEqual(hote.places(), [["haut", 100], ["bas", 900]]);
});

/**
 * **Zéro est une place.** Un test de vérité aurait sauté le haut de liste — ce
 * qui ne se voit pas, puisque c'est déjà là que l'élément neuf se trouve, et qui
 * aurait donc rendu la garde à moitié muette.
 */
test("une place à zéro se repose comme les autres", () => {
  const hote = unHote(["liste"]);
  const reposer = garderLesPlaces(hote);

  hote.remplacer();
  hote.querySelectorAll(`[${MARQUE}]`)[0].scrollTop = 777;
  reposer();

  assert.deepEqual(hote.places(), [["liste", 0]], "le haut de liste n'a pas été reposé");
});

/**
 * **Un panneau qui n'est plus là ne repose rien**, et un panneau neuf ne prend
 * pas la place d'un autre : on change de dossier, la liste doit repartir en
 * haut.
 */
test("un panneau qui disparaît ou qui naît ne hérite de rien", () => {
  const hote = unHote(["ancien"]);
  hote.querySelectorAll(`[${MARQUE}]`)[0].scrollTop = 300;

  const reposer = garderLesPlaces(hote);
  hote.remplacer(["neuf"]);
  reposer();

  assert.deepEqual(hote.places(), [["neuf", 0]]);
});

test("un hôte sans panneau, ou absent, ne lève pas", () => {
  garderLesPlaces(null)();
  garderLesPlaces({})();
  garderLesPlaces(unHote([]))();
});
