/**
 * Un seul état de filtrage, deux rendus.
 *
 * Ce qui se teste ici est ce qui pouvait diverger : la liste et le cerveau
 * doivent retenir **exactement** les mêmes lignes de la même requête.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { selectionDeLaMemoire, laRequeteRestreint } from "./memoire-selection.js";
import { NATURE } from "./assertion-taxonomy.js";

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
  { key: "regle", label: "Règles", values: [{ value: "oui", label: "Seulement" }] }
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

test("« regle:oui » ne garde que les règles", () => {
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
    query: "regle:oui", champs: CHAMPS
  });

  assert.deepEqual(gardees.map((une) => une.id), ["r"]);

  // Sans le filtre, les deux restent : il ne se pose que si on le demande.
  assert.equal(selectionDeLaMemoire([regle, valeur], { query: "", champs: CHAMPS }).length, 2);
});
