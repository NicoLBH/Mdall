import test from "node:test";
import assert from "node:assert/strict";

import { videDeLaListeDesSujets } from "./liste-vide-des-sujets.js";

/* ── Le silence qui se prend pour une panne ──────────────────────────────── */

/**
 * Le cas qui a fait douter du filtre pendant deux tours. On clique « Fermés »,
 * rien n'apparaît, et deux lectures sont possibles : le projet n'a fermé aucun
 * sujet, ou le filtre ne fait pas son travail. Rien à l'écran ne permettait de
 * trancher.
 *
 * Ce qui tranche est **le nombre de l'autre côté** : il répond sans qu'on ait
 * à cliquer l'autre bouton.
 */
test("aucun sujet fermé se dit, et dit combien il y en a d'ouverts", () => {
  const dit = videDeLaListeDesSujets({ statut: "closed", comptes: { open: 63, closed: 0 } });

  assert.equal(dit.titre, "Aucun sujet fermé");
  assert.match(dit.explication, /63 sujets/);
  assert.match(dit.explication, /ouverts/);
});

test("un projet sans aucun sujet ne prétend pas en avoir ailleurs", () => {
  const dit = videDeLaListeDesSujets({ statut: "closed", comptes: { open: 0, closed: 0 } });
  assert.match(dit.explication, /ne porte encore aucun sujet/);
});

test("tout fermé se dit comme une bonne nouvelle, pas comme un vide", () => {
  const dit = videDeLaListeDesSujets({ statut: "open", comptes: { open: 0, closed: 12 } });

  assert.equal(dit.titre, "Aucun sujet ouvert");
  assert.match(dit.explication, /12 sujets/);
});

/* ── Ce qu'on vient de faire d'abord ─────────────────────────────────────── */

/**
 * Une recherche en cours explique une liste vide mieux que tout le reste :
 * c'est le dernier geste, et c'est celui qu'on défait en premier.
 */
test("une recherche en cours passe avant le reste", () => {
  const dit = videDeLaListeDesSujets({
    statut: "closed", recherche: "étanchéité", priorite: "high",
    comptes: { open: 63, closed: 0 }
  });

  assert.match(dit.explication, /« étanchéité »/);
  assert.doesNotMatch(dit.explication, /63/, "le compte ne sert à rien tant qu'on cherche");
});

test("la priorité se dit en français, pas dans le vocabulaire du moteur", () => {
  const dit = videDeLaListeDesSujets({
    statut: "open", priorite: "critical", comptes: { open: 5, closed: 2 }
  });

  assert.match(dit.explication, /priorité critique/);
  assert.doesNotMatch(dit.explication, /critical/);
});

/* ── La page vide n'est pas une liste vide ───────────────────────────────── */

test("une page au-delà de la dernière se dit comme telle", () => {
  const dit = videDeLaListeDesSujets({
    statut: "open", paginee: true, comptes: { open: 63, closed: 4 }
  });

  assert.match(dit.explication, /Cette page/);
  assert.match(dit.explication, /précédentes/);
});

test("sans pagination, la phrase ne parle pas de pages", () => {
  const dit = videDeLaListeDesSujets({ statut: "open", comptes: { open: 63, closed: 4 } });
  assert.doesNotMatch(dit.explication, /page/i);
});

/* ── Le vocabulaire ──────────────────────────────────────────────────────── */

test("aucune phrase ne parle comme un outil de visa", () => {
  // Règle 12 : le mot du métier reste dans le code, jamais à l'écran.
  const cas = [
    { statut: "closed", comptes: { open: 3, closed: 0 } },
    { statut: "open", comptes: { open: 0, closed: 3 } },
    { statut: "open", recherche: "x" },
    { statut: "open", priorite: "low", comptes: { open: 3, closed: 1 } },
    { statut: "open", paginee: true, comptes: { open: 3, closed: 1 } }
  ];

  for (const entree of cas) {
    const dit = videDeLaListeDesSujets(entree);
    assert.ok(dit.titre && dit.explication, "une liste vide dit toujours quelque chose");
    for (const interdit of [/visa/i, /à valider/i, /approbation/i, /erreur/i]) {
      assert.doesNotMatch(`${dit.titre} ${dit.explication}`, interdit);
    }
  }
});

test("sans rien lui donner, elle ne raconte pas d'histoire", () => {
  const dit = videDeLaListeDesSujets();
  assert.equal(dit.titre, "Aucun sujet ouvert");
  assert.match(dit.explication, /ne porte encore aucun sujet/);
});
