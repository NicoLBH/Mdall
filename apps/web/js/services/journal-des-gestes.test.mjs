import test from "node:test";
import assert from "node:assert/strict";

import {
  MARQUE, faitLisible, journal, journalEnTexte, ligneDuJournal, noter, noterLEchec, oublierLeJournal
} from "./journal-des-gestes.js";

test.beforeEach(() => oublierLeJournal());

/* ── La suite des faits, dans l'ordre ────────────────────────────────────── */

/**
 * Ce qu'on cherche à lire est **le maillon qui manque** : geste reçu, état
 * écrit, rendu entré, rendu sorti. Un journal qui perd l'ordre ne répond pas à
 * la question.
 */
test("les faits se suivent dans l'ordre où ils sont arrivés", () => {
  noter("geste reçu", { quoi: "subjects-status-filter=closed" });
  noter("filtre écrit", { avant: "open", apres: "closed" });
  noter("rendu · entrée");

  assert.deepEqual(journal().map((entree) => entree.quoi), ["geste reçu", "filtre écrit", "rendu · entrée"]);
});

/**
 * Le temps se lit **depuis le premier fait** : l'écart entre le geste et ce qui
 * aurait dû le suivre est la mesure utile, pas l'heure qu'il était.
 */
test("le temps se compte depuis le premier fait", () => {
  const texte = ligneDuJournal({ quand: 1_700_000_050, quoi: "rendu · sortie" }, { depuis: 1_700_000_000 });

  assert.match(texte, /\+\s*50 ms/);
  assert.match(texte, /rendu · sortie/);
});

test("un fait sans détail ne traîne pas de séparateur vide", () => {
  assert.equal(ligneDuJournal({ quand: 10, quoi: "rendu · entrée" }, { depuis: 10 }), "+    0 ms  rendu · entrée");
});

/* ── Ce qu'un journal ne doit pas emporter ───────────────────────────────── */

/**
 * Il est fait pour être collé dans un message. Un journal qui emporte le
 * contenu d'un chantier au passage est un journal qu'on ne peut pas envoyer.
 */
test("un fait trop long est tronqué", () => {
  const dit = faitLisible("x".repeat(400));
  assert.ok(dit.length <= 120, `${dit.length} caractères`);
});

test("un objet se dit par ses clés, et reste borné", () => {
  const dit = faitLisible({ avant: "open", apres: "closed", lignes: 3 });

  assert.match(dit, /avant=open/);
  assert.match(dit, /apres=closed/);
  assert.match(dit, /lignes=3/);
  assert.ok(dit.length <= 120);
});

/**
 * **Règle 5.** « Je n'ai pas mesuré » et « il y en a zéro » envoient chercher à
 * deux endroits différents. Un journal qui écrit `0` pour une absence est pire
 * qu'un journal muet.
 */
test("une absence se dit, et ne se lit pas zéro", () => {
  assert.equal(faitLisible(null), "—");
  assert.equal(faitLisible(undefined), "—");
  assert.equal(faitLisible(0), "0");
  assert.equal(faitLisible(false), "false");
});

/* ── Les échecs, qui autrement se perdent ────────────────────────────────── */

/**
 * Une exception dans un écouteur ne fait rien tomber : elle s'écrit dans la
 * console et la page continue, l'air de rien. C'est ainsi qu'un rendu qui ne
 * s'est jamais produit peut passer cinq tours durant pour un bouton sans
 * écoute.
 */
test("un échec se note, avec son nom et ce qu'il dit", () => {
  noterLEchec("rendu · échec", new TypeError("rerenderPanels is not a function"));

  const dernier = journal().at(-1);
  assert.equal(dernier.quoi, "rendu · échec");
  assert.equal(dernier.faits.echec, "TypeError");
  assert.match(dernier.faits.dit, /is not a function/);
});

test("un échec sans message se note quand même", () => {
  noterLEchec("rendu · échec", {});
  assert.equal(journal().at(-1).faits.dit, "sans message");
});

/* ── Le journal en texte ─────────────────────────────────────────────────── */

test("le journal se copie, et dit quand il est vide", () => {
  assert.match(journalEnTexte(), /vide/);

  noter("geste reçu", { par: "pointerdown" });
  const dit = journalEnTexte();

  assert.match(dit, /journal des gestes/);
  assert.match(dit, /geste reçu/);
  assert.match(dit, /par=pointerdown/);
});

/**
 * Un journal qui grandit sans fin finit par peser sur la page qu'il observe.
 * Ce qui compte est la fin — les derniers gestes —, pas le début d'une session
 * d'une heure.
 */
test("le journal ne grandit pas sans fin, et garde la fin", () => {
  for (let rang = 0; rang < 400; rang += 1) noter(`fait ${rang}`);

  const garde = journal();
  assert.ok(garde.length <= 240, `${garde.length} entrées`);
  assert.equal(garde.at(-1).quoi, "fait 399");
});

test("la marque rend le journal repérable dans une console pleine", () => {
  assert.equal(MARQUE, "[mdall]");
});
