/**
 * Les trois actions à venir, les mêmes aux deux endroits.
 *
 * ## Ce que ces gardes attrapent
 *
 * **Un bouton qui ferait semblant de fonctionner.** Ces trois-là ne cliquent
 * pas : ils disent ce qui vient. `disabled` porte la vérité ; sans lui, on
 * clique, rien ne se passe, et l'on doute du reste de l'écran.
 *
 * **Deux listes qui divergent.** L'accueil et le Copilote d'un projet montrent
 * la même saisie, donc les mêmes boutons : c'est ce qui dit que c'est le même
 * outil. Le Copilote parle à la base et ne s'importe pas — on lit donc sa
 * source pour vérifier qu'il prend bien la liste d'ici, et non une copie.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  ACTIONS_A_VENIR, renderActionsAVenirHtml, renderActionsAVenirMenuHtml
} from "./actions-du-copilote.js";

test("les trois actions sont nommées, dans l'ordre où on les lit", () => {
  assert.deepEqual(ACTIONS_A_VENIR.map((action) => action.id), ["conflits", "sujet", "proposition"]);
  assert.deepEqual(ACTIONS_A_VENIR.map((action) => action.label), [
    "Résoudre conflits", "Créer un sujet", "Proposition"
  ]);
});

/** `disabled` porte la vérité : ces boutons ne cliquent pas. */
test("les trois boutons sont éteints, étalés comme en menu", () => {
  for (const html of [renderActionsAVenirHtml(), renderActionsAVenirMenuHtml()]) {
    assert.equal((html.match(/disabled/g) || []).length, ACTIONS_A_VENIR.length);
    for (const action of ACTIONS_A_VENIR) {
      assert.match(html, new RegExp(`data-copilote-action="${action.id}"`));
    }
  }
});

/** Chacun porte son icône : trois boutons gris identiques ne se distinguent pas. */
test("chaque action porte son icône", () => {
  const html = renderActionsAVenirHtml();

  for (const action of ACTIONS_A_VENIR) {
    assert.match(html, new RegExp(`octicon-${action.icon}|#${action.icon}`), action.icon);
  }
});

/**
 * **Le Copilote prend la liste d'ici.** Une copie chez lui serait à tenir
 * d'accord avec celle-ci, et celle qu'on oublie est celle qu'on ne regarde pas
 * (règle 10).
 */
test("le Copilote d'un projet ne garde pas sa propre copie", async () => {
  const copilote = await readFile(
    new URL("../studio/copilote/copilote.js", import.meta.url), "utf8"
  );

  assert.match(copilote, /from "\.\.\/\.\.\/ui\/actions-du-copilote\.js"/);
  assert.match(copilote, /renderActionsAVenirHtml\(\)/);
  assert.doesNotMatch(copilote, /const ACTIONS_A_VENIR = \[/, "plus de seconde liste");
});
