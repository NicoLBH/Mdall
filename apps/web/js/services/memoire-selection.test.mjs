/**
 * Un seul état de filtrage, deux rendus.
 *
 * Ce qui se teste ici est ce qui pouvait diverger : la liste et le cerveau
 * doivent retenir **exactement** les mêmes lignes de la même requête.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { selectionDeLaMemoire, laRequeteRestreint } from "./memoire-selection.js";
import { NATURE, SETTLED_BY } from "./assertion-taxonomy.js";
import { FORME } from "./axes-de-la-memoire.js";

/** Le vocabulaire des `champ:valeur`, réduit à ce que ces cas emploient. */
const CHAMPS = [
  { key: "nature", label: "Nature", values: [
    { value: NATURE.DECISION, label: "Décision" },
    { value: NATURE.CONTRAINTE, label: "Contrainte" }
  ] },
  { key: "domaine", label: "Domaine", values: [
    { value: "incendie", label: "Incendie" },
    { value: "structure", label: "Structure" }
  ] },
  { key: "ouverts", label: "Ouverts", values: [{ value: "oui", label: "oui" }] },
  { key: "fonction", label: "Fonctions", values: [{ value: "oui", label: "Seulement" }] },
  { key: "autorite", label: "Autorité", values: [
    { value: SETTLED_BY.TIERS, token: "d'un-texte", label: "D'un texte" },
    { value: SETTLED_BY.ARBITRAGE, token: "décidé", label: "Décidé" },
    { value: SETTLED_BY.PROJET, token: "du-projet", label: "Du projet" }
  ] },
  { key: "forme", label: "Forme", values: [
    { value: FORME.POSEE, token: "posée", label: "Posée" },
    { value: FORME.DEDUITE, token: "déduite", label: "Déduite" }
  ] }
];

const ligne = (id, nature, domain, dessus = {}) => ({
  id, nature, domain, statement: `${id} — ${nature}`,
  payload: { subject: id, value: "x" }, ...dessus
});

const MEMOIRE = [
  ligne("Zone de neige", NATURE.CONTRAINTE, "structure"),
  ligne("Degré CF", NATURE.CONTRAINTE, "incendie"),
  ligne("Couverture", NATURE.DECISION, "structure"),
  ligne("Désenfumage", NATURE.DECISION, "incendie")
];

const sujets = (lignes) => lignes.map((l) => l.id);

/* ── La sélection ────────────────────────────────────────────────────────── */

test("sans requête, la sélection est la mémoire entière", () => {
  assert.deepEqual(sujets(selectionDeLaMemoire(MEMOIRE, { champs: CHAMPS })),
    ["Zone de neige", "Degré CF", "Couverture", "Désenfumage"]);
});

test("une nature retient sa nature, un domaine son domaine, les deux se cumulent", () => {
  const nature = selectionDeLaMemoire(MEMOIRE, { query: "nature:decision", champs: CHAMPS });
  assert.deepEqual(sujets(nature), ["Couverture", "Désenfumage"]);

  const domaine = selectionDeLaMemoire(MEMOIRE, { query: "domaine:incendie", champs: CHAMPS });
  assert.deepEqual(sujets(domaine), ["Degré CF", "Désenfumage"]);

  const deux = selectionDeLaMemoire(MEMOIRE, { query: "nature:decision domaine:incendie", champs: CHAMPS });
  assert.deepEqual(sujets(deux), ["Désenfumage"]);
});

test("le libellé d'un filtre vaut sa valeur : on tape ce qu'on lit", () => {
  // « nature:Décision » se tape aussi bien que « nature:decision » — la barre
  // accepte l'accent et la majuscule, et la sélection doit lire les deux.
  assert.deepEqual(
    sujets(selectionDeLaMemoire(MEMOIRE, { query: "nature:Décision", champs: CHAMPS })),
    ["Couverture", "Désenfumage"]
  );
});

test("la recherche plein texte est injectée, jamais réinventée ici", () => {
  // Elle vit avec la mémoire ; la refaire ici en ferait une deuxième, et deux
  // recherches finissent par ne pas trouver la même chose.
  let vu = null;
  const rendu = selectionDeLaMemoire(MEMOIRE, {
    query: "nature:decision zone",
    champs: CHAMPS,
    chercher: (lignes, options) => { vu = options; return lignes; }
  });

  assert.equal(vu.query, "zone");
  assert.deepEqual(sujets(rendu), ["Couverture", "Désenfumage"]);
});

test("« à revérifier » se pose par-dessus : c'est une urgence, pas une catégorie", () => {
  const rendu = selectionDeLaMemoire(MEMOIRE, {
    query: "nature:decision", champs: CHAMPS, pending: true,
    aRevoir: (lignes) => lignes.filter((l) => l.id === "Couverture")
  });
  assert.deepEqual(sujets(rendu), ["Couverture"]);
});

test("sans les fonctions injectées, la sélection filtre quand même ce qu'elle sait", () => {
  // Un appelant qui ne passe ni recherche ni « à revérifier » obtient la nature
  // et le domaine — pas une liste vide, et pas une panne.
  const rendu = selectionDeLaMemoire(MEMOIRE, { query: "nature:decision", champs: CHAMPS, pending: true });
  assert.deepEqual(sujets(rendu), ["Couverture", "Désenfumage"]);
});

test("ce qui n'est pas une liste ne fait pas tomber la sélection", () => {
  assert.deepEqual(selectionDeLaMemoire(null, { champs: CHAMPS }), []);
  assert.deepEqual(selectionDeLaMemoire(undefined, {}), []);
});

/* ── Savoir s'il faut le dire ────────────────────────────────────────────── */

test("une requête vide ne restreint rien, et n'a rien à annoncer", () => {
  assert.equal(laRequeteRestreint("", CHAMPS), false);
  assert.equal(laRequeteRestreint("   ", CHAMPS), false);
});

test("un filtre ou du texte libre restreignent, et se disent", () => {
  // Sans cette annonce, un dessin de douze nœuds ferait croire à un projet de
  // douze affirmations, et l'on chercherait longtemps ce qui manque.
  assert.equal(laRequeteRestreint("nature:decision", CHAMPS), true);
  assert.equal(laRequeteRestreint("altitude", CHAMPS), true);
});

test("« fonction:oui » ne garde que les fonctions", () => {
  // **Une lecture du rail sans requête équivalente serait la seule à ne pas se
  // corriger au clavier.** Le filtre s'écrit donc, comme celui des constats en
  // cours — et pour la même raison : ce qu'il désigne n'est pas une nature.
  const regle = {
    id: "r", status: "assumed",
    payload: { subject: "Mettre alèse sur lit", value: "oui", referentiel: true }
  };
  const valeur = {
    id: "v", status: "assumed",
    payload: { subject: "Profondeur hors gel", value: "0,47 m" }
  };

  const gardees = selectionDeLaMemoire([regle, valeur], {
    query: "fonction:oui", champs: CHAMPS
  });

  assert.deepEqual(gardees.map((une) => une.id), ["r"]);

  // Sans le filtre, les deux restent : il ne se pose que si on le demande.
  assert.equal(selectionDeLaMemoire([regle, valeur], { query: "", champs: CHAMPS }).length, 2);
});

test("les deux axes que la nature mélangeait se filtrent chacun pour soi", () => {
  // **La puce de la ligne dit l'autorité** : une puce qu'on ne peut pas
  // interroger est un cul-de-sac — on lit « D'un texte » sur douze lignes sans
  // pouvoir demander les autres.
  const fonction = {
    id: "f", kind: "base-datum", status: "assumed",
    payload: {
      subject: "Zones climatiques d'après la commune", value: "H1a", referentiel: true,
      regle: { conditions: [{ sujet: "Commune", operateur: "=", valeur: ["x"] }], sauf: [] }
    }
  };
  const tranchee = {
    id: "d", kind: "base-datum", status: "assumed",
    payload: {
      subject: "Couleur des volets", value: "violet",
      provenance: { type: "décision", quoi: "Couleur des volets", par: "Ourdine Ferrand", le: "12/03" }
    }
  };
  const posee = {
    id: "p", kind: "base-datum", status: "assumed",
    payload: { subject: "Commune", value: "Montholon (89110)" }
  };

  const memoire = [fonction, tranchee, posee];

  // Chaque axe retient ce qui est à lui, et les trois lignes se répartissent :
  // une requête qui rendrait tout, ou rien, ne mesurerait pas le filtre.
  assert.deepEqual(
    selectionDeLaMemoire(memoire, { query: "autorite:d'un-texte", champs: CHAMPS }).map((une) => une.id),
    ["f"]
  );
  assert.deepEqual(
    selectionDeLaMemoire(memoire, { query: "autorite:décidé", champs: CHAMPS }).map((une) => une.id),
    ["d"]
  );
  assert.deepEqual(
    selectionDeLaMemoire(memoire, { query: "forme:déduite", champs: CHAMPS }).map((une) => une.id),
    ["f"]
  );
  assert.deepEqual(
    selectionDeLaMemoire(memoire, { query: "forme:posée", champs: CHAMPS }).map((une) => une.id),
    ["d", "p"]
  );

  // **Les deux axes se cumulent avec la nature**, et ne la remplacent pas : la
  // colonne reste interrogeable, et une requête qui pose les deux rend
  // l'intersection. Sans cela, le dernier filtre écrit gagnerait en silence.
  assert.deepEqual(
    selectionDeLaMemoire(memoire, { query: "nature:contrainte autorite:d'un-texte", champs: CHAMPS }).map((une) => une.id),
    []
  );
});
