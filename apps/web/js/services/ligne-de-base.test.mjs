/**
 * La ligne de base — le prédicteur bête, et le mur contre lequel cogner.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  LIGNES_DE_BASE, LIGNES_DE_BASE_DES_SUJETS, ceQuiSuitHabituellement,
  ceQuiSuitHabituellementEnSujets, leplusFrequent, lesDomainesVenus,
  lesSujetsLesPlusFrequents, lesSujetsVenus
} from "./ligne-de-base.js";
import { episodeDuProjet } from "./episode-du-projet.js";
import { mesureDuPredicteur } from "./mesure-du-passe.js";

const jour = (rang) => new Date(Date.UTC(2026, 0, rang, 9)).toISOString();

const constat = (id, le, domaine) => ({
  id, project_id: "p1", subject_key: id, kind: "avis", nature: "constat", domain: domaine,
  status: "assumed", superseded_by: null, decided_at: le,
  payload: { subject: `Constat ${id}`, value: "à traiter", status: "REPORTED" }
});

/**
 * Une suite de constats, **espacés de trois jours**.
 *
 * L'espacement compte : avec une fenêtre d'un jour, chaque point de rejeu ne
 * voit arriver qu'un seul constat. Collés jour après jour, la fenêtre en
 * attraperait deux — et sur une suite qui alterne, les deux domaines seraient
 * toujours présents : n'importe quel prédicteur viserait juste.
 */
const suite = (...domaines) => episodeDuProjet({
  assertions: domaines.map((domaine, rang) => constat(`c${rang}`, jour(3 * rang + 1), domaine))
});

/* ── Le plus fréquent ────────────────────────────────────────────────────── */

test("le plus fréquent compte, et ne regarde pas l'ordre", () => {
  const episode = suite("structure", "incendie", "structure", "acoustique", "structure");

  assert.deepEqual(leplusFrequent(episode), ["structure", "acoustique", "incendie"]);
});

test("à égalité, l'ordre alphabétique — la liste ne bouge pas d'un rejeu à l'autre", () => {
  // Deux lectures du même passé doivent rendre la même liste, sinon la mesure
  // changerait d'un rejeu à l'autre sans que rien n'ait bougé.
  const episode = suite("sol", "incendie", "acoustique");

  assert.deepEqual(leplusFrequent(episode), ["acoustique", "incendie", "sol"]);
  assert.deepEqual(leplusFrequent(suite("incendie", "sol", "acoustique")),
    ["acoustique", "incendie", "sol"]);
});

test("un constat sans domaine ne devient pas un domaine", () => {
  // Compter « sans domaine » le ferait arriver en tête des fréquences sur une
  // mémoire mal rangée, et le prédicteur annoncerait du vide.
  const episode = suite("structure", "", "structure", "");

  assert.deepEqual(leplusFrequent(episode), ["structure"]);
});

test("sans rien, on ne prédit rien", () => {
  // Rendre « structure » par défaut, parce que c'est le plus courant en
  // général, ferait mesurer un préjugé.
  assert.deepEqual(leplusFrequent(episodeDuProjet({})), []);
  assert.deepEqual(leplusFrequent(null), []);
});

/* ── Ce qui suit habituellement ──────────────────────────────────────────── */

test("ce qui suit regarde la séquence, et part du dernier vu", () => {
  // Après `structure`, on a vu `incendie` deux fois et `sol` une.
  const episode = suite(
    "structure", "incendie",
    "structure", "incendie",
    "structure", "sol",
    "acoustique", "structure"
  );

  assert.deepEqual(ceQuiSuitHabituellement(episode), ["incendie", "sol"]);
});

test("le dernier constat n'a pas encore de suite : il ne compte pas comme couple", () => {
  // Le compter ferait croire qu'on a vu ce qui vient après lui.
  const episode = suite("structure", "incendie");

  // Après `incendie`, on n'a jamais rien vu.
  assert.deepEqual(ceQuiSuitHabituellement(episode), []);
});

test("sans suite connue pour le dernier domaine, on ne dit rien", () => {
  /**
   * Se rabattre sur le plus fréquent ferait mesurer deux prédicteurs pour un,
   * et l'on ne saurait plus lequel a marché.
   */
  const episode = suite("structure", "structure", "acoustique");

  assert.deepEqual(leplusFrequent(episode), ["structure", "acoustique"]);
  assert.deepEqual(ceQuiSuitHabituellement(episode), [],
    "le prédicteur de séquence s'est rabattu sur les fréquences");
});

test("un seul constat ne fait pas un couple", () => {
  assert.deepEqual(ceQuiSuitHabituellement(suite("structure")), []);
  assert.deepEqual(ceQuiSuitHabituellement(episodeDuProjet({})), []);
});

/* ── Ce qui est réellement arrivé ────────────────────────────────────────── */

test("ce qui est venu porte son domaine et sa date", () => {
  // Sans la date, on saurait qu'on a visé juste et pas de combien on était en
  // avance — or un moteur qui prévient la veille ne sert à rien.
  const venus = lesDomainesVenus({
    constats: [
      { domaine: "structure", quand: jour(3) },
      { domaine: "", quand: jour(4) },
      { domaine: "incendie", quand: jour(5) }
    ]
  });

  assert.deepEqual(venus, [
    { quoi: "structure", quand: jour(3) },
    { quoi: "incendie", quand: jour(5) }
  ]);
  assert.deepEqual(lesDomainesVenus(null), []);
});

/* ── Les deux, mesurées l'une contre l'autre ─────────────────────────────── */

test("sur une suite qui alterne, la séquence bat le comptage", () => {
  /**
   * **C'est la question que la mesure existe pour trancher.** Sur une mémoire
   * qui alterne strictement, compter les occurrences ne départage rien ; suivre
   * la séquence vise juste à chaque fois. Un chiffre le dit, enfin.
   */
  const alterne = suite(
    "structure", "incendie", "structure", "incendie",
    "structure", "incendie", "structure", "incendie",
    "structure", "incendie", "structure", "incendie"
  );

  const parLeCompte = mesureDuPredicteur(alterne,
    { predire: leplusFrequent, arrive: lesDomainesVenus, jours: 1 });
  const parLaSuite = mesureDuPredicteur(alterne,
    { predire: ceQuiSuitHabituellement, arrive: lesDomainesVenus, jours: 1 });

  assert.equal(parLeCompte.froid, false);
  assert.equal(parLaSuite.froid, false);

  // Le comptage ne vise **jamais** juste sur une alternance stricte : à chaque
  // pas, le domaine le plus fréquent est celui qui vient de passer.
  assert.equal(parLeCompte.precision1, 0);
  assert.ok(parLaSuite.precision1 > 0.8,
    `la séquence n'a pas battu le comptage : ${parLaSuite.precision1}`);

  // **Elle ne fait pas cent pour cent, et c'est exact** : aux deux premiers
  // pas, aucun couple ne se termine par le domaine qu'on vient de voir, et le
  // prédicteur se tait plutôt que de deviner. Un silence compte comme un coup
  // manqué — mais jamais comme une fausse alerte.
  assert.ok(parLaSuite.precision1 < 1);
});

test("sur une suite dominée par un domaine, le comptage suffit", () => {
  // Et c'est tout l'intérêt d'avoir les deux : sur ce chantier-là, un moteur
  // qui ne bat pas le comptage n'a rien appris.
  const dominee = suite(
    "structure", "structure", "structure", "structure",
    "structure", "structure", "incendie", "structure",
    "structure", "structure", "structure", "structure"
  );

  const parLeCompte = mesureDuPredicteur(dominee,
    { predire: leplusFrequent, arrive: lesDomainesVenus, jours: 1 });

  assert.equal(parLeCompte.froid, false);
  assert.ok(parLeCompte.precision1 > 0.8, `le comptage devrait viser juste presque partout : ${parLeCompte.precision1}`);
});

test("un prédicteur qui se tait n'est jamais accusé de fausse alerte", () => {
  /**
   * Se taire est une réponse : « je ne sais pas » vaut mieux qu'une
   * recommandation inventée (règle 5). Le silence coûte un coup manqué, ce qui
   * est juste ; le compter comme une fausse alerte punirait la prudence — et
   * pousserait à deviner.
   */
  const muet = mesureDuPredicteur(suite(
    "structure", "incendie", "structure", "incendie",
    "structure", "incendie", "structure", "incendie"
  ), { predire: () => [], arrive: lesDomainesVenus, jours: 1 });

  assert.equal(muet.precision1, 0);
  assert.equal(muet.fausseAlerte, null, "un silence a été compté comme une fausse alerte");
});

test("les deux lignes de base se nomment, et chacune dit ce qu'elle regarde", () => {
  // Un écran qui afficherait deux taux sans dire ce qui les sépare ne
  // permettrait pas de comprendre lequel a gagné, ni pourquoi.
  assert.equal(LIGNES_DE_BASE.length, 2);

  for (const ligne of LIGNES_DE_BASE) {
    assert.ok(ligne.cle, "une ligne de base n'a pas de clé");
    assert.ok(ligne.dit, `« ${ligne.cle} » ne se dit pas`);
    assert.ok(ligne.quoi, `« ${ligne.cle} » ne dit pas ce qu'elle regarde`);
    assert.equal(typeof ligne.predire, "function", `« ${ligne.cle} » ne prédit rien`);
  }

  assert.equal(new Set(LIGNES_DE_BASE.map((une) => une.cle)).size, 2);
  assert.equal(new Set(LIGNES_DE_BASE.map((une) => une.dit)).size, 2);

  /**
   * **Et elles ne prédisent pas la même chose.** Deux entrées qui portent deux
   * noms et rendent la même liste donneraient deux fois le même taux, et l'on
   * croirait avoir comparé quelque chose.
   */
  const alterne = suite("structure", "incendie", "structure", "incendie");
  const [parLeCompte, parLaSuite] = LIGNES_DE_BASE.map((une) => une.predire(alterne));

  assert.deepEqual(parLeCompte, ["incendie", "structure"]);
  assert.deepEqual(parLaSuite, ["structure"]);
});

/* ── Les mêmes deux bêtises, sur les sujets ───────────────────────────────── */

/**
 * Une suite de constats qui portent **plusieurs sujets chacun**.
 *
 * Les sujets viennent de la base, jamais d'un découpage refait ici : on les
 * injecte donc comme la base les rend, par identifiant d'affirmation. Refaire
 * l'extraction dans ce fixtureur aurait éprouvé le découpage du fixtureur, pas
 * celui du système.
 */
const suiteDeSujets = (...paquets) => episodeDuProjet({
  assertions: paquets.map((_, rang) => constat(`c${rang}`, jour(3 * rang + 1), "structure")),
  sujetsParAffirmation: new Map(paquets.map((siens, rang) => [`c${rang}`, siens]))
});

test("le sujet le plus fréquent compte les sujets, pas les constats", () => {
  const episode = suiteDeSujets(
    ["nappe phreatique", "cuvelage"],
    ["nappe phreatique"],
    ["plancher beton", "nappe phreatique"]
  );

  assert.deepEqual(lesSujetsLesPlusFrequents(episode),
    ["nappe phreatique", "cuvelage", "plancher beton"]);
});

/**
 * **Un sujet répété dans une affirmation ne compte qu'une fois — et la règle
 * vit dans l'épisode**, qui réunit les sujets d'un constat dans un ensemble.
 *
 * Elle était redite ici, et un cassage l'a montré : la garde ne pouvait pas
 * tomber, puisque `suiteDeSujets` passe par `episodeDuProjet`. L'épreuve est
 * donc allée où la règle vit — `episode-du-projet.test.mjs` —, et ce qu'on
 * vérifie ici est que le classement **s'appuie** dessus plutôt que de la refaire.
 */
test("le classement s'appuie sur l'épisode pour ne compter qu'une fois", () => {
  const episode = suiteDeSujets(
    ["cuvelage", "cuvelage", "cuvelage"],
    ["nappe phreatique"],
    ["nappe phreatique"]
  );

  assert.deepEqual(lesSujetsLesPlusFrequents(episode), ["nappe phreatique", "cuvelage"]);
});

/**
 * **Un constat sans sujet ne fait pas un pas vide dans la suite.** Le garder
 * décalerait les couples d'un cran : « après cuvelage, rien », puis « après
 * rien, plancher » — deux couples faux pour un vrai.
 */
test("un constat sans sujet ne décale pas la suite", () => {
  const episode = suiteDeSujets(["cuvelage"], [], ["plancher beton"]);

  assert.deepEqual(ceQuiSuitHabituellementEnSujets(episode), []);
  // Le couple s'est bien formé par-dessus le pas vide : « plancher beton » suit
  // « cuvelage », et c'est le dernier pas qui n'a pas encore de suite.
  const avant = suiteDeSujets(["cuvelage"], [], ["plancher beton"], ["cuvelage"]);
  assert.deepEqual(ceQuiSuitHabituellementEnSujets(avant), ["plancher beton"]);
});

/**
 * **Les couples se forment de chaque sujet d'un pas vers chaque sujet du
 * suivant.** C'est la généralisation honnête de « après ceci, il est venu
 * cela », et ce que fait déjà `les_enchainements_des_sujets()` en base.
 */
test("ce qui suit croise les sujets d'un pas avec ceux du suivant", () => {
  const episode = suiteDeSujets(
    ["nappe phreatique"],
    ["cuvelage", "radier"],
    ["nappe phreatique"]
  );

  // Après « nappe phreatique », on a vu « cuvelage » et « radier », une fois
  // chacun. Le dernier pas n'a pas encore de suite.
  assert.deepEqual(ceQuiSuitHabituellementEnSujets(episode), ["cuvelage", "radier"]);
});

/**
 * **Les suites des derniers sujets se somment.**
 *
 * Le dernier constat porte plusieurs sujets, chacun avec sa suite connue. Un
 * sujet qui revient dans deux de ces suites est plus probable qu'un qui n'est
 * que dans une — et prendre la suite du premier sujet seulement aurait jeté
 * cette information.
 */
test("les suites des derniers sujets s'additionnent", () => {
  const episode = suiteDeSujets(
    ["nappe phreatique"], ["cuvelage"],
    ["radier"], ["cuvelage"],
    ["radier"], ["drainage"],
    // Le dernier pas porte les deux : « cuvelage » est connu après « nappe
    // phreatique » (1) et après « radier » (1) → 2 ; « drainage » après
    // « radier » seulement → 1.
    ["nappe phreatique", "radier"]
  );

  assert.deepEqual(ceQuiSuitHabituellementEnSujets(episode), ["cuvelage", "drainage"]);
});

test("sans suite connue, le prédicteur sur les sujets se tait", () => {
  assert.deepEqual(ceQuiSuitHabituellementEnSujets(suiteDeSujets(["cuvelage"])), []);
  assert.deepEqual(ceQuiSuitHabituellementEnSujets(null), []);
  assert.deepEqual(lesSujetsLesPlusFrequents(null), []);
});

/**
 * **Les sujets ne sont jamais devinés.** Sans lecture en base, le prédicteur
 * rend une liste vide et l'instrument compte le point comme non noté. Un
 * découpage improvisé ici aurait fait mesurer deux vocabulaires (règle 4).
 */
test("sans sujets lus en base, on ne prédit rien", () => {
  const episode = suite("structure", "incendie", "structure");
  assert.deepEqual(lesSujetsLesPlusFrequents(episode), []);
  assert.deepEqual(ceQuiSuitHabituellementEnSujets(episode), []);
});

/**
 * **Un constat qui porte trois sujets en a trois à confronter**, tous à la date
 * du constat : c'est elle qui donne le délai d'avance.
 */
test("ce qui est venu rend un sujet par ligne, à la date du constat", () => {
  // La suite telle que l'instrument la rend : des constats de l'épisode, dont
  // les sujets sont déjà réunis. Une liste écrite à la main qui porterait deux
  // fois le même sujet éprouverait un cas qui ne se produit pas.
  const suiteVenue = {
    constats: [
      { quand: jour(4), sujets: ["cuvelage", "radier"] },
      { quand: jour(7), sujets: [] }
    ]
  };

  assert.deepEqual(lesSujetsVenus(suiteVenue), [
    { quoi: "cuvelage", quand: jour(4) },
    { quoi: "radier", quand: jour(4) }
  ]);
  assert.deepEqual(lesSujetsVenus(null), []);
});

/**
 * **L'instrument ne change pas d'un caractère**, et c'est tout le portage. Si
 * la mesure sur les sujets ne passait pas par `mesureDuPredicteur`, elle
 * n'aurait ni la coupe stricte, ni le froid, ni la fenêtre — et son chiffre ne
 * se comparerait à rien.
 */
test("le même instrument mesure les sujets", () => {
  // Une alternance franche : la séquence doit y battre le comptage, exactement
  // comme sur les domaines.
  const episode = suiteDeSujets(
    ["nappe phreatique"], ["cuvelage"], ["nappe phreatique"], ["cuvelage"],
    ["nappe phreatique"], ["cuvelage"], ["nappe phreatique"], ["cuvelage"],
    ["nappe phreatique"], ["cuvelage"], ["nappe phreatique"], ["cuvelage"]
  );

  const parComptage = mesureDuPredicteur(episode, {
    predire: lesSujetsLesPlusFrequents, arrive: lesSujetsVenus, jours: 1
  });
  const parSequence = mesureDuPredicteur(episode, {
    predire: ceQuiSuitHabituellementEnSujets, arrive: lesSujetsVenus, jours: 1
  });

  assert.equal(parSequence.froid, false, "la mesure sur les sujets reste froide");
  assert.ok(parSequence.precision1 > parComptage.precision1,
    `la séquence devrait battre le comptage : ${parSequence.precision1} contre ${parComptage.precision1}`);
});

test("les deux lignes de base des sujets se nomment, et disent ce qu'elles regardent", () => {
  assert.deepEqual(LIGNES_DE_BASE_DES_SUJETS.map((une) => une.cle),
    ["les-sujets-les-plus-frequents", "ce-qui-suit-en-sujets"]);
  for (const une of LIGNES_DE_BASE_DES_SUJETS) {
    assert.equal(typeof une.predire, "function", `${une.cle} ne prédit rien`);
    assert.ok(une.dit && une.quoi, `${une.cle} ne se dit pas`);
  }
});
