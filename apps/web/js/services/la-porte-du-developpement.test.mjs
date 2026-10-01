import test from "node:test";
import assert from "node:assert/strict";

import {
  LA_DUREE_DE_LA_PORTE, ceQuiResteDeLaPorte, laPorteEstOuverte, phraseDeLaPorte
} from "./la-porte-du-developpement.js";

/* ── Elle se referme toute seule ─────────────────────────────────────────── */

/**
 * **Dix secondes, et non une minute.** Le temps de cliquer, pas le temps
 * d'oublier qu'on l'a ouverte.
 */
test("la porte s'ouvre, et se referme au bout de dix secondes", () => {
  const quand = 1_000_000;

  assert.equal(laPorteEstOuverte(quand, quand), true, "fermée à l'instant où on l'ouvre");
  assert.equal(laPorteEstOuverte(quand, quand + 9_999), true, "fermée une seconde trop tôt");
  assert.equal(laPorteEstOuverte(quand, quand + LA_DUREE_DE_LA_PORTE), false,
    "encore ouverte à l'échéance");
  assert.equal(laPorteEstOuverte(quand, quand + 60_000), false);
});

/**
 * **`null` et `0` ne sont pas des instants d'ouverture.**
 *
 * `Number(null)` vaut 0, qui est un instant fini : sans la question posée avant
 * la conversion, une porte jamais ouverte se serait trouvée ouverte en 1970 —
 * et donc fermée aujourd'hui, par chance. La chance n'est pas un garde-fou.
 */
test("une porte jamais ouverte est fermée", () => {
  // **Et pas par chance.** `Number(null)` vaut 0 ; avec un instant courant
  // lointain, la soustraction dépasse dix secondes et la porte se trouve
  // fermée sans que rien ne l'ait décidé. On l'éprouve donc **près de zéro**,
  // là où le défaut se voit : c'est le contrat de la fonction, et il ne dépend
  // pas de la grandeur de l'horloge qui l'appelle.
  assert.equal(laPorteEstOuverte(null, 5_000), false,
    "une porte jamais ouverte s'ouvre dans les dix premières secondes de 1970");
  assert.equal(laPorteEstOuverte("", 5_000), false);
  assert.equal(ceQuiResteDeLaPorte(null, 5_000), 0);

  assert.equal(laPorteEstOuverte(null, 1_000_000), false);
  assert.equal(laPorteEstOuverte(undefined, 1_000_000), false);
  assert.equal(laPorteEstOuverte("", 1_000_000), false);
  assert.equal(laPorteEstOuverte("tout à l'heure", 1_000_000), false);
  assert.equal(laPorteEstOuverte(), false);
});

/**
 * **Une horloge qui recule ne l'ouvre pas.** Un changement d'heure, une machine
 * remise à l'heure : l'instant courant passe avant l'ouverture, et la
 * soustraction rend un nombre négatif — inférieur à dix secondes, donc
 * « ouverte » si on ne regarde que cela.
 */
test("un instant antérieur à l'ouverture ne l'ouvre pas", () => {
  assert.equal(laPorteEstOuverte(1_000_000, 999_000), false);
});

/* ── Ce qu'il reste, et ce que l'écran en dit ────────────────────────────── */

test("le compte à rebours dit les secondes entières qui restent", () => {
  const quand = 1_000_000;

  assert.equal(ceQuiResteDeLaPorte(quand, quand), 10);
  assert.equal(ceQuiResteDeLaPorte(quand, quand + 1_000), 9);
  assert.equal(ceQuiResteDeLaPorte(quand, quand + 9_500), 1, "la dernière demi-seconde compte");
  assert.equal(ceQuiResteDeLaPorte(quand, quand + 10_000), 0);
  assert.equal(ceQuiResteDeLaPorte(null, quand), 0);
});

/**
 * **L'interrupteur dit ce qu'il laisse sortir**, ouvert comme fermé.
 *
 * Un interrupteur nommé « mode développement » sans un mot sur ce qu'il ouvre
 * est un interrupteur qu'on coche pour voir.
 */
test("la phrase dit toujours ce qui sortirait", () => {
  const quand = 1_000_000;

  const ouverte = phraseDeLaPorte(quand, quand + 3_000);
  assert.match(ouverte, /Ouverte encore 7 secondes/);
  assert.match(ouverte, /contenu de chantier/);
  assert.match(ouverte, /ne se partage pas/);

  const fermee = phraseDeLaPorte(null, quand);
  assert.match(fermee, /^Fermée/);
  assert.match(fermee, /contenu de chantier/,
    "une porte fermée ne dit plus ce qu'elle ouvrirait");
});

/** Une seconde restante se dit au singulier. */
test("une seconde se dit au singulier", () => {
  assert.match(phraseDeLaPorte(1_000_000, 1_009_500), /encore 1 seconde\./);
});
