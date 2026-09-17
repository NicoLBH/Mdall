import test from "node:test";
import assert from "node:assert/strict";

import {
  ORDRES_DU_PROJET, TRI, derniereActivite, motDuTri, normaliserLeTri, trierLesSujets, triSuivant
} from "./tri-des-sujets.js";

const sujet = (id, dates = {}) => ({ id, title: `Sujet ${id}`, ...dates });

/* ── Ce que le tri sert à savoir ─────────────────────────────────────────── */

/**
 * La question d'origine : « est-ce que des sujets continuent d'arriver ? ». Le
 * compteur seul n'y répond pas ; ce qui a bougé en dernier, en tête de liste,
 * y répond.
 */
test("ce qui a bougé en dernier passe devant", () => {
  const range = trierLesSujets([
    sujet("vieux", { updated_at: "2026-01-04T10:00:00Z" }),
    sujet("recent", { updated_at: "2026-03-02T09:00:00Z" }),
    sujet("moyen", { updated_at: "2026-02-11T18:00:00Z" })
  ], TRI.DERNIERE_ACTIVITE);

  assert.deepEqual(range.map((element) => element.id), ["recent", "moyen", "vieux"]);
});

test("sans tri demandé, l'ordre du projet reste intact", () => {
  const sujets = [sujet("b", { updated_at: "2026-01-01T00:00:00Z" }), sujet("a", { updated_at: "2026-09-01T00:00:00Z" })];
  assert.deepEqual(trierLesSujets(sujets, TRI.PROJET).map((element) => element.id), ["b", "a"]);
});

/* ── Ne pas savoir n'est pas « à l'instant » ─────────────────────────────── */

/**
 * **Règle 5.** La lecture qui sert à écrire « ouvert il y a trois jours »
 * retombe sur la date du jour quand elle ne trouve rien : tolérable pour une
 * phrase, ruineux pour un tri, où un sujet sans date remonterait en tête comme
 * s'il venait de bouger — exactement le contraire de ce qu'on cherche à voir.
 */
test("un sujet sans date ne se dit pas fraîchement modifié", () => {
  assert.equal(derniereActivite(sujet("nu")), "");
  assert.equal(derniereActivite(null), "");
});

test("les sujets sans date se rangent derrière, dans leur ordre", () => {
  const range = trierLesSujets([
    sujet("nu-1"),
    sujet("date", { updated_at: "2026-01-04T10:00:00Z" }),
    sujet("nu-2")
  ], TRI.DERNIERE_ACTIVITE);

  assert.deepEqual(range.map((element) => element.id), ["date", "nu-1", "nu-2"]);
});

test("une date illisible se traite comme une absence, pas comme un zéro", () => {
  // `Date.parse("bientôt")` rend `NaN` ; le laisser passer rangerait le sujet
  // à une place tirée au sort.
  const range = trierLesSujets([
    sujet("casse", { updated_at: "bientôt" }),
    sujet("date", { updated_at: "2020-01-01T00:00:00Z" })
  ], TRI.DERNIERE_ACTIVITE);

  assert.deepEqual(range.map((element) => element.id), ["date", "casse"]);
});

/* ── Où la date se lit ───────────────────────────────────────────────────── */

test("la modification prime sur la création", () => {
  assert.equal(
    derniereActivite(sujet("x", { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-05-05T00:00:00Z" })),
    "2026-05-05T00:00:00Z"
  );
});

test("un sujet jamais modifié se range à sa création", () => {
  assert.equal(derniereActivite(sujet("x", { created_at: "2026-01-01T00:00:00Z" })), "2026-01-01T00:00:00Z");
});

test("la date se lit aussi dans la ligne brute de la base", () => {
  assert.equal(derniereActivite({ id: "x", raw: { updated_at: "2026-04-04T00:00:00Z" } }), "2026-04-04T00:00:00Z");
});

/* ── Ce que le tri ne doit jamais faire ──────────────────────────────────── */

/**
 * Le compteur et la liste se lisent sur la même collection. Trier en place
 * changerait l'ordre sous les pieds de tout ce qui la parcourt, et perdre ou
 * dupliquer une ligne ferait diverger le compte de ce qui s'affiche — la panne
 * même qu'on vient de passer trois tours à poursuivre.
 */
test("trier ne change ni le nombre de sujets ni la liste d'origine", () => {
  const sujets = [sujet("a", { updated_at: "2026-01-01T00:00:00Z" }), sujet("b"), sujet("c", { updated_at: "2026-06-01T00:00:00Z" })];
  const range = trierLesSujets(sujets, TRI.DERNIERE_ACTIVITE);

  assert.equal(range.length, sujets.length);
  assert.deepEqual(sujets.map((element) => element.id), ["a", "b", "c"], "la liste d'origine a été triée en place");
  assert.deepEqual(new Set(range.map((element) => element.id)), new Set(["a", "b", "c"]));
});

test("sans rien lui donner, le tri ne se plaint pas", () => {
  assert.deepEqual(trierLesSujets(), []);
  assert.deepEqual(trierLesSujets(null, TRI.DERNIERE_ACTIVITE), []);
});

/* ── La bascule ──────────────────────────────────────────────────────────── */

test("le bouton met le tri, puis le retire", () => {
  // Deux ordres par défaut : c'est ce que proposent les écrans qui traversent
  // les projets, et ils ne peuvent pas proposer le troisième.
  assert.equal(triSuivant(TRI.PROJET), TRI.DERNIERE_ACTIVITE);
  assert.equal(triSuivant(TRI.DERNIERE_ACTIVITE), TRI.PROJET);
});

test("dans un projet, le bouton fait tourner les trois", () => {
  // Trois ordres, un seul bouton : « comment veux-tu que je range ? » se pose
  // une fois, et un troisième bouton aurait demandé une place et une icône de
  // plus pour la même question.
  assert.equal(triSuivant(TRI.PROJET, ORDRES_DU_PROJET), TRI.DERNIERE_ACTIVITE);
  assert.equal(triSuivant(TRI.DERNIERE_ACTIVITE, ORDRES_DU_PROJET), TRI.CE_QUE_CA_BLOQUE);
  assert.equal(triSuivant(TRI.CE_QUE_CA_BLOQUE, ORDRES_DU_PROJET), TRI.PROJET);
});

test("un ordre que l'écran ne propose pas ne coince pas le bouton", () => {
  // « Ce que ça coûte » lit la mémoire d'un projet : un écran qui en traverse
  // quarante ne peut pas le tenir. Y arriver avec cet ordre en poche ne doit pas
  // laisser le bouton sans rien à faire.
  assert.equal(triSuivant(TRI.CE_QUE_CA_BLOQUE), TRI.DERNIERE_ACTIVITE);
  assert.equal(triSuivant(TRI.CE_QUE_CA_BLOQUE, []), TRI.DERNIERE_ACTIVITE);
});

test("les trois ordres se distinguent, et un ordre inconnu ne prend pas leur place", () => {
  assert.equal(normaliserLeTri(TRI.CE_QUE_CA_BLOQUE), TRI.CE_QUE_CA_BLOQUE);
  assert.equal(new Set(Object.values(TRI)).size, 3);
});

/**
 * **La liste s'ouvre sur ce qui vient de bouger.**
 *
 * Elle s'ouvrait dans l'ordre du projet — celui d'arrivée —, et le plus récent
 * se trouvait donc tout en bas, après quatre-vingt-treize lignes. La question
 * qu'on se pose en ouvrant cet écran est pourtant toujours la même : qu'est-ce
 * qui a bougé ? L'ordre du projet reste à un clic ; il n'est plus celui par
 * lequel on commence.
 */
test("rien de choisi, c'est la dernière activité", () => {
  assert.equal(normaliserLeTri(undefined), TRI.DERNIERE_ACTIVITE);
  assert.equal(normaliserLeTri(""), TRI.DERNIERE_ACTIVITE);
  assert.equal(normaliserLeTri("par couleur"), TRI.DERNIERE_ACTIVITE);

  // Et l'ordre du projet se choisit, donc il se distingue de l'absence de
  // choix : c'est pour cela qu'il porte une valeur à lui.
  assert.equal(normaliserLeTri(TRI.PROJET), TRI.PROJET);
  assert.notEqual(TRI.PROJET, "");
});

/**
 * L'info-bulle annonce ce que le clic va faire. Décrire l'état courant se lit à
 * l'envers une fois sur deux : « trié par dernière activité » sur un bouton qui
 * va justement défaire ce tri.
 */
test("l'info-bulle annonce le geste, pas l'état", () => {
  assert.match(motDuTri(TRI.PROJET), /Trier par dernière activité/);
  assert.match(motDuTri(TRI.DERNIERE_ACTIVITE), /Revenir à l'ordre du projet/);

  const dansUnProjet = { ordres: ORDRES_DU_PROJET };
  assert.match(motDuTri(TRI.DERNIERE_ACTIVITE, "l'ordre du projet", dansUnProjet),
    /Trier par ce que ça coûte de ne pas trancher/);
  assert.match(motDuTri(TRI.CE_QUE_CA_BLOQUE, "l'ordre du projet", dansUnProjet),
    /Revenir à l'ordre du projet/);
});

test("aucune info-bulle ne promet un chiffre d'importance", () => {
  // Ce qu'un ingénieur a besoin de savoir n'est pas combien, c'est ce que ça
  // coûte de le casser.
  for (const tri of Object.values(TRI)) {
    assert.doesNotMatch(motDuTri(tri), /priorit|importance|poids|urgen/i);
  }
});

test("aucun mot du tri ne parle comme un outil de visa", () => {
  // Règle 12 : le mot du métier reste dans le code, jamais à l'écran.
  for (const tri of Object.values(TRI)) {
    for (const interdit of [/visa/i, /à valider/i, /approbation/i]) {
      assert.doesNotMatch(motDuTri(tri), interdit);
    }
  }
});

/* ── Ce que ça coûte de ne pas trancher ──────────────────────────────────── */

test("les sujets se rangent aux places qu'on leur donne", () => {
  // L'ordre n'est pas calculé ici, il est **donné** : ce fichier ne sait rien
  // des arêtes ni du graphe, et aller les y chercher en ferait un second
  // endroit qui décide ce qu'un sujet bloque (règle 4).
  const sujets = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const ordre = new Map([["c", 0], ["a", 1], ["b", 2]]);

  assert.deepEqual(
    trierLesSujets(sujets, TRI.CE_QUE_CA_BLOQUE, { ordre }).map((s) => s.id),
    ["c", "a", "b"]
  );
});

test("un sujet sans place reste derrière, dans son ordre d'origine", () => {
  // Les fermés n'ont pas de place : ce qu'il en coûte de ne pas trancher un
  // sujet déjà tranché ne veut rien dire.
  const sujets = [{ id: "ferme-1" }, { id: "ouvert" }, { id: "ferme-2" }];
  const ordre = new Map([["ouvert", 0]]);

  assert.deepEqual(
    trierLesSujets(sujets, TRI.CE_QUE_CA_BLOQUE, { ordre }).map((s) => s.id),
    ["ouvert", "ferme-1", "ferme-2"]
  );
});

test("tant qu'on ne sait pas, on ne range pas", () => {
  // Ranger au hasard en attendant les lectures serait affirmer un ordre qu'on
  // n'a pas — et retourner la liste deux fois ferait sauter les lignes sous les
  // yeux de quelqu'un qui vient de cliquer (règle 5).
  const sujets = [{ id: "a" }, { id: "b" }, { id: "c" }];

  assert.deepEqual(trierLesSujets(sujets, TRI.CE_QUE_CA_BLOQUE).map((s) => s.id), ["a", "b", "c"]);
  assert.deepEqual(
    trierLesSujets(sujets, TRI.CE_QUE_CA_BLOQUE, { ordre: new Map() }).map((s) => s.id),
    ["a", "b", "c"]
  );
  // Et pas davantage quand ce qu'on a ne parle pas de ces sujets-là.
  assert.deepEqual(
    trierLesSujets(sujets, TRI.CE_QUE_CA_BLOQUE, { ordre: new Map([["z", 0]]) }).map((s) => s.id),
    ["a", "b", "c"]
  );
});

test("ranger ne change jamais le nombre de sujets", () => {
  const sujets = [{ id: "a" }, { id: "b" }, { id: "c" }];
  for (const tri of Object.values(TRI)) {
    assert.equal(trierLesSujets(sujets, tri, { ordre: new Map([["b", 0]]) }).length, 3);
  }
});
