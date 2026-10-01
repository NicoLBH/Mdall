/**
 * Deux prédicteurs qui ne jouent pas au même jeu, comparés honnêtement.
 *
 * Le contrat est en tête de `la-granulometrie-dun-chantier.js`. Ce qu'on
 * éprouve ici est le piège : deux pourcentages mis face à face disent l'inverse
 * de la vérité quand les jeux n'ont pas la même taille.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  combienDeFoisMieuxQueLeHasard, combienDeSujetsRepetes, laChanceEnFace,
  phraseDeLaDistanceAuHasard, phraseDeLaGranulometrieDuChantier
} from "./la-granulometrie-dun-chantier.js";
import { episodeDuProjet } from "./episode-du-projet.js";
import { lesSujetsLesPlusFrequents, lesSujetsVenus } from "./ligne-de-base.js";
import { mesureDuPredicteur } from "./mesure-du-passe.js";

/** Un constat, tel que la mémoire le porte. */
const constat = (id, le) => ({
  id, project_id: "p1", subject_key: id, kind: "avis", nature: "constat",
  domain: "structure", status: "assumed", superseded_by: null,
  created_at: le, decided_at: le,
  payload: { subject: `Constat ${id}`, value: "à traiter", status: "REPORTED" }
});

test("la chance en face se calcule, et se borne à un", () => {
  // Trois candidats sur huit cases : plus du tiers du jeu.
  assert.equal(laChanceEnFace(8, 3), 3 / 8);
  // Trois candidats sur trois cents : un centième.
  assert.equal(laChanceEnFace(300, 3), 0.01);
  // Trois candidats sur deux cases : on ne tombe pas juste 150 % du temps.
  assert.equal(laChanceEnFace(2, 3), 1);
  // Sans jeu, pas de chance — et non une division par zéro.
  assert.equal(laChanceEnFace(0, 3), 0);
});

/**
 * **Le défaut que ce module existe pour empêcher.**
 *
 * 44 % sur huit domaines est à peine mieux que le hasard ; 20 % sur trois cents
 * sujets est vingt fois le hasard. Lus comme deux notes du même devoir, les deux
 * chiffres font conclure que la granulométrie fine a tout gâché — l'inverse
 * exact de ce qui s'est passé.
 */
test("le pourcentage brut mène à la conclusion inverse", () => {
  const surDomaines = combienDeFoisMieuxQueLeHasard(0.44, 8, 3);
  const surSujets = combienDeFoisMieuxQueLeHasard(0.20, 300, 3);

  // Le pourcentage brut dit que les domaines gagnent…
  assert.ok(0.44 > 0.20);
  // …et la distance au hasard dit le contraire, massivement.
  assert.ok(surSujets > surDomaines * 15,
    `44 % sur 8 cases devrait être très loin derrière 20 % sur 300 : `
    + `${surDomaines} contre ${surSujets}`);
});

test("sans mesure ou sans jeu, on ne se prononce pas", () => {
  assert.equal(combienDeFoisMieuxQueLeHasard(null, 300, 3), null);
  assert.equal(combienDeFoisMieuxQueLeHasard(0.2, 0, 3), null);
});

test("un prédicteur plus mauvais que le hasard se dit comme tel", () => {
  const dite = phraseDeLaDistanceAuHasard({ precision3: 0.1 }, 8);
  assert.match(dite, /fois pire que le hasard/);
  assert.match(dite, /38 % au hasard sur 8 cases/);
});

test("un prédicteur meilleur que le hasard se dit en multiples", () => {
  const dite = phraseDeLaDistanceAuHasard({ precision3: 0.2 }, 300);
  assert.match(dite, /20,0 fois le hasard/);
  assert.match(dite, /1 % au hasard sur 300 cases/);
});

/**
 * **Une mesure froide ne se rapporte à rien** (règle 5). « 2 fois le hasard sur
 * trois points » n'informe personne, et l'afficher apprendrait à ne plus lire
 * les lignes.
 *
 * **La mesure est construite par l'instrument**, et non écrite à la main. Un
 * objet `{froid: true, precision3: 1}` n'existe pas : `precisionA` rend `null`
 * exactement quand `froid` est vrai, et une épreuve posée sur une forme
 * impossible éprouvait une garde qui ne pouvait pas tomber (règle 4).
 */
test("une mesure froide ne se rapporte pas au hasard", () => {
  // Deux constats : sous les cinq points qu'il faut pour se prononcer.
  const episode = episodeDuProjet({
    assertions: [
      constat("a1", "2026-01-01T09:00:00Z"),
      constat("a2", "2026-01-04T09:00:00Z")
    ],
    sujetsParAffirmation: new Map([["a1", ["cuvelage"]], ["a2", ["radier"]]])
  });
  const froide = mesureDuPredicteur(episode, {
    predire: lesSujetsLesPlusFrequents, arrive: lesSujetsVenus, jours: 1
  });

  assert.equal(froide.froid, true, "la mesure témoin n'est pas froide");
  assert.equal(phraseDeLaDistanceAuHasard(froide, 8), "");

  assert.equal(phraseDeLaDistanceAuHasard(null, 8), "");
  assert.equal(phraseDeLaDistanceAuHasard({ precision3: 0.3 }, 0), "");
});

/**
 * **La phrase de comparaison ne dit jamais « mieux ».** Les deux prédicteurs ne
 * répondent pas à la même question ; le seul énoncé qui tient est « plus loin du
 * hasard ».
 */
test("la granulométrie se compare par la distance au hasard, jamais par les taux", () => {
  const dite = phraseDeLaGranulometrieDuChantier({
    surDomaines: { precision3: 0.44 },
    surSujets: { precision3: 0.20 },
    combienDeDomaines: 8,
    combienDeSujets: 300
  });

  assert.match(dite, /plus loin du hasard/);
  assert.match(dite, /ne se comparent pas/);
  assert.match(dite, /300/);
  // **Jamais « mieux » ni « moins bien » :** ce serait noter deux devoirs
  // différents sur la même échelle.
  assert.doesNotMatch(dite, /mieux|moins bien/);
});

test("quand une mesure manque, on ne compare pas", () => {
  // Une mesure froide porte `precision3: null` : c'est par là qu'on le sait.
  assert.equal(phraseDeLaGranulometrieDuChantier({
    surDomaines: { froid: true, precision1: null, precision3: null },
    surSujets: { precision3: 0.2 },
    combienDeDomaines: 8, combienDeSujets: 300
  }), "");
  assert.equal(phraseDeLaGranulometrieDuChantier({}), "");
});

test("la taille du jeu se compte sur ce que la base a rendu", () => {
  const lus = new Map([
    ["a1", ["plancher beton", "beton"]],
    ["a2", ["beton", "nappe phreatique"]],
    ["a3", ["", "  "]]
  ]);
  assert.equal(combienDeSujetsRepetes(lus), 3);
  // Pas lu : zéro case, et non une taille inventée.
  assert.equal(combienDeSujetsRepetes(null), 0);
});
