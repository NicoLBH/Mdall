/**
 * Le rail des discussions, et sa seule différence entre les deux écrans.
 *
 * ## Ce que ces gardes attrapent
 *
 * **« Créer un sujet » proposé sur une discussion qui n'est d'aucun projet.**
 * Ce geste rend les messages visibles par l'équipe d'un chantier — c'est le seul
 * endroit de l'application où une conversation privée devient publique. Sans
 * projet, il n'y en a aucun où verser : le bouton mènerait soit nulle part, soit
 * au dernier projet ouvert, c'est-à-dire dans le fil de gens qui n'ont rien
 * demandé. Il n'existe donc pas, et c'est ce qu'on vérifie ici.
 *
 * **Un historique qui perd son identifiant.** Il est écrit au rendu et relu au
 * rafraîchissement ; s'ils cessent de dire le même mot, la liste ne se réécrit
 * plus — et rien ne le signale, sinon une discussion qui n'apparaît pas dans le
 * rail après l'avoir ouverte.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  renderHistoriqueDesDiscussions, renderRailDesDiscussionsHtml
} from "./rail-des-discussions-rendu.js";

const FILS = [
  { id: "c-1", title: "Coupe-feu des circulations", messages: [] },
  { id: "c-2", title: "Descente de charges", messages: [] }
];

/**
 * **Le seul endroit où une discussion privée devient publique.** Sans projet,
 * il n'y a nulle part où la verser.
 */
test("« Créer un sujet » n'est proposé que dans un projet", () => {
  const dansUnProjet = renderRailDesDiscussionsHtml({ conversations: FILS, avecSujet: true });
  assert.match(dansUnProjet, /data-copilote-en-sujet="c-1"/);
  assert.match(dansUnProjet, /Créer un sujet/);

  const sansProjet = renderRailDesDiscussionsHtml({ conversations: FILS, avecSujet: false });
  assert.doesNotMatch(sansProjet, /data-copilote-en-sujet/);
  assert.doesNotMatch(sansProjet, /Créer un sujet/);
});

/** Les autres gestes restent : renommer et effacer n'ont pas besoin de projet. */
test("renommer, copier et effacer restent proposés sans projet", () => {
  const html = renderRailDesDiscussionsHtml({ conversations: FILS, avecSujet: false });

  for (const geste of ["rename", "copy", "delete"]) {
    assert.match(html, new RegExp(`data-copilote-${geste}="c-1"`), geste);
  }
});

test("l'historique porte l'identifiant qu'on lui donne", () => {
  const html = renderHistoriqueDesDiscussions({ conversations: FILS, id: "monHistorique" });

  assert.match(html, /id="monHistorique"/);
});

/** Le fil ouvert porte le repère ; les autres, non. */
test("la discussion ouverte est celle qui est marquée", () => {
  const html = renderHistoriqueDesDiscussions({ conversations: FILS, courante: "c-2" });

  const lignes = html.split('<li class="nav-list__item').slice(1);
  assert.equal(lignes.length, 2);
  assert.match(lignes[0], /data-active="false"/);
  assert.match(lignes[1], /data-active="true"/);
});

/**
 * L'écran transverse n'a pas de routeur de panneaux : sa ligne porte le geste
 * lui-même. L'Atelier y met la cible de son routeur. Le rendu ne tranche pas,
 * il pose ce qu'on lui donne.
 */
test("l'entrée « Nouvelle discussion » porte ce que l'écran lui met", () => {
  const html = renderRailDesDiscussionsHtml({
    conversations: [], attributsDeLEntree: { "data-copilote-new": "1" }
  });

  assert.match(html, /Nouvelle discussion/);
  assert.match(html, /data-copilote-new="1"/);
  // Le bouton d'action, lui, est toujours là : c'est par lui qu'on ouvre une
  // discussion neuve sans quitter celle qu'on lit.
  assert.match(html, /aria-label="Nouvelle discussion"/);
});

test("sans discussion, le rail montre l'entrée neuve et rien d'autre", () => {
  const html = renderRailDesDiscussionsHtml({ conversations: [] });

  assert.match(html, /Nouvelle discussion/);
  assert.doesNotMatch(html, /data-copilote-conversation/);
});
