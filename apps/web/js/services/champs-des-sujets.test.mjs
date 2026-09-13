/**
 * Les champs interrogeables d'un sujet.
 *
 * **Une recherche qui ment est pire qu'une recherche vide** : des lignes
 * disparaissent, et personne ne comprend pourquoi. Ces tests portent surtout
 * là-dessus — sur ce que la barre refuse d'interpréter.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  AUCUN, BLOCAGES, MOI, PRIORITES, STATUTS, champsDesSujets, phraseDesIgnores, sujetsFiltres
} from "./champs-des-sujets.js";

const VOCABULAIRE = {
  labels: [{ key: "l-1", name: "CR chantier" }, { key: "l-2", name: "Urgent" }],
  objectifs: [{ id: "o-1", title: "Livraison lot 3" }],
  lots: [{ id: "lot-3", name: "03 Gros œuvre" }],
  personnes: [{ id: "p-1", name: "J. Dupanloup" }, { id: "p-2", name: "M. Cambuzat" }]
};

const SUJETS = [
  { id: "s1", title: "Reprise d'étanchéité en toiture", status: "open", priority: "high" },
  { id: "s2", title: "Carrelage cuisine", status: "closed", priority: "low" },
  { id: "s3", title: "Étanchéité du mur pignon", status: "open", priority: "medium" }
];

const META = {
  s1: { labels: ["l-1"], objectifs: ["o-1"], lots: ["lot-3"], assignes: ["p-1"], bloque: true },
  s2: { labels: ["l-2"], assignes: ["p-2"] },
  s3: { labels: [] }
};

const champs = champsDesSujets(VOCABULAIRE);
const retenus = (requete, options = {}) =>
  sujetsFiltres({ sujets: SUJETS, requete, champs, meta: META, moi: "p-1", ...options })
    .sujets.map((sujet) => sujet.id);

/* ── Ce que le projet déclare ────────────────────────────────────────────── */

test("les champs couvrent ce que le projet porte", () => {
  assert.deepEqual(champs.map((champ) => champ.key),
    ["statut", "priorité", "bloqué", "label", "objectif", "lot", "assigné"]);
});

/**
 * **Un champ sans valeur n'est pas déclaré.** Un projet sans objectif ne doit
 * pas proposer `objectif:` : le filtre ne rendrait jamais rien, et l'on
 * chercherait ce qu'on a mal tapé.
 */
test("un projet sans vocabulaire ne propose que ce qui existe partout", () => {
  assert.deepEqual(champsDesSujets().map((champ) => champ.key), ["statut", "priorité", "bloqué"]);
  assert.deepEqual(champsDesSujets({ labels: [{ key: "", name: "" }] }).map((champ) => champ.key),
    ["statut", "priorité", "bloqué"]);
});

/** Les trois champs de partout ont leurs valeurs, et elles se tapent en français. */
test("les valeurs se tapent comme elles se lisent", () => {
  assert.deepEqual(STATUTS.map((valeur) => valeur.token), ["ouvert", "fermé"]);
  assert.deepEqual(PRIORITES.map((valeur) => valeur.value), ["critical", "high", "medium", "low"]);
  assert.deepEqual(BLOCAGES.map((valeur) => valeur.token), ["oui", "non"]);
});

/** « Aucun » n'existe que là où l'absence se cherche : un sujet sans statut, non. */
test("« aucun » ne se propose que pour ce qui peut manquer", () => {
  const valeursDe = (cle) => champs.find((champ) => champ.key === cle).values.map((valeur) => valeur.value);

  for (const cle of ["label", "objectif", "lot"]) {
    assert.ok(valeursDe(cle).includes(AUCUN), `« ${cle} » ne propose pas « aucun »`);
  }
  assert.equal(valeursDe("statut").includes(AUCUN), false);
  assert.equal(valeursDe("priorité").includes(AUCUN), false);
});

/* ── Ce qui filtre ───────────────────────────────────────────────────────── */

test("chaque champ retient ce qu'il annonce", () => {
  assert.deepEqual(retenus("statut:ouvert"), ["s1", "s3"]);
  assert.deepEqual(retenus("priorité:haute"), ["s1"]);
  assert.deepEqual(retenus("label:cr-chantier"), ["s1"]);
  assert.deepEqual(retenus("objectif:livraison-lot-3"), ["s1"]);
  assert.deepEqual(retenus("lot:03-gros-œuvre"), ["s1"]);
  assert.deepEqual(retenus("assigné:m.-cambuzat"), ["s2"]);
  assert.deepEqual(retenus("bloqué:oui"), ["s1"]);
  assert.deepEqual(retenus("bloqué:non"), ["s2", "s3"]);
});

/** « Aucun » trouve ce qui manque — et un sujet dont on ne sait rien manque. */
test("« aucun » trouve les sujets sans rien", () => {
  assert.deepEqual(retenus("label:aucun"), ["s3"]);
  // s2 et s3 n'ont pas d'objectif : celui qui n'a aucune méta non plus.
  assert.deepEqual(retenus("objectif:aucun"), ["s2", "s3"]);
});

/** Les filtres s'additionnent : chacun restreint ce que le précédent a laissé. */
test("deux filtres se cumulent", () => {
  assert.deepEqual(retenus("statut:ouvert label:aucun"), ["s3"]);
  assert.deepEqual(retenus("statut:ouvert priorité:basse"), []);
});

/**
 * **Le texte libre cherche dans le titre**, sans accent ni casse. Pas dans la
 * description : un sujet qui remonte sans porter le mot cherché se lit comme une
 * erreur, et l'on ne voit pas où le mot se cache.
 */
test("le texte libre cherche dans le titre, accents et casse mis à part", () => {
  assert.deepEqual(retenus("étanchéité"), ["s1", "s3"]);
  assert.deepEqual(retenus("ETANCHEITE"), ["s1", "s3"]);
  // Deux mots : les deux doivent être là.
  assert.deepEqual(retenus("étanchéité toiture"), ["s1"]);
});

test("le texte et les filtres se combinent", () => {
  assert.deepEqual(retenus("statut:ouvert étanchéité"), ["s1", "s3"]);
  assert.deepEqual(retenus("label:cr-chantier carrelage"), []);
});

/* ── Ce qui n'est pas interprété ─────────────────────────────────────────── */

/**
 * **Rien n'est deviné.** Un jeton dont la valeur est inconnue reste du texte
 * ordinaire, et cherche donc le mot. Interpréter au plus proche ferait
 * disparaître des lignes sans que personne comprenne pourquoi.
 */
test("un jeton inconnu reste du texte", () => {
  // Personne ne s'appelle « zoiseau » : le jeton entier devient un mot cherché.
  assert.deepEqual(retenus("label:zoiseau"), []);
  // Et un champ non déclaré aussi.
  assert.deepEqual(retenus("auteur:moi"), []);

  const { filtres, texte } = sujetsFiltres({ sujets: SUJETS, requete: "label:zoiseau", champs, meta: META });
  assert.deepEqual(filtres, {});
  assert.equal(texte, "label:zoiseau");
});

/**
 * **Un filtre qu'on ne peut pas appliquer est annoncé, pas appliqué de
 * travers.** `assigné:moi` sans savoir qui regarde rendrait une liste vide, et
 * l'on croirait n'avoir aucun sujet.
 */
test("« assigné:moi » sans savoir qui regarde ne vide pas la liste", () => {
  const sans = sujetsFiltres({ sujets: SUJETS, requete: "assigné:moi", champs, meta: META });

  assert.deepEqual(sans.sujets.map((sujet) => sujet.id), ["s1", "s2", "s3"]);
  assert.deepEqual(sans.ignores, ["assigné"]);
  assert.match(phraseDesIgnores(sans.ignores), /n'a pas pu être appliqué/);
  assert.match(phraseDesIgnores(sans.ignores), /on ne sait pas qui regarde/);

  // Et quand on le sait, il s'applique, sans rien annoncer.
  const avec = sujetsFiltres({ sujets: SUJETS, requete: "assigné:moi", champs, meta: META, moi: "p-1" });
  assert.deepEqual(avec.sujets.map((sujet) => sujet.id), ["s1"]);
  assert.deepEqual(avec.ignores, []);
  assert.equal(phraseDesIgnores(avec.ignores), "");
});

test("« moi » est une valeur du champ, pas un nom de personne", () => {
  const assigne = champs.find((champ) => champ.key === "assigné");
  assert.equal(assigne.values[0].value, MOI);
  assert.equal(assigne.values[0].token, "moi");
  // Et « personne » ferme la liste : c'est l'absence, pas quelqu'un.
  assert.equal(assigne.values.at(-1).value, AUCUN);
});

/** Une requête vide ne retire rien : c'est la liste entière. */
test("une requête vide rend tout", () => {
  assert.deepEqual(retenus(""), ["s1", "s2", "s3"]);
  assert.deepEqual(sujetsFiltres().sujets, []);
});

/** Un sujet dont on ne sait rien ne disparaît pas des filtres qu'il ne porte pas. */
test("un sujet sans méta se comporte comme un sujet vide", () => {
  const seul = [{ id: "x", title: "Sans rien", status: "open" }];
  assert.deepEqual(
    sujetsFiltres({ sujets: seul, requete: "label:aucun", champs }).sujets.map((sujet) => sujet.id), ["x"]);
  assert.deepEqual(
    sujetsFiltres({ sujets: seul, requete: "label:cr-chantier", champs }).sujets, []);
});
