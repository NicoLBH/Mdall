import test from "node:test";
import assert from "node:assert/strict";

import { bindOverlayChromeCompact } from "./overlay-chrome.js";

/**
 * Un DOM de papier, juste assez pour ce qui est en jeu ici : des classes qui
 * basculent, un défilement qu'on déclenche à la main, et un écouteur qu'on peut
 * compter. Ce mécanisme s'est cassé deux fois sans qu'aucun test ne le voie —
 * il y a de quoi lui en écrire.
 */
function fakeClassList() {
  const set = new Set();
  return {
    set,
    toggle(name, on) {
      if (on) set.add(name);
      else set.delete(name);
    },
    contains: (name) => set.has(name),
    add: (name) => set.add(name)
  };
}

function fakeChrome() {
  const head = { classList: fakeClassList() };
  return {
    head,
    isConnected: true,
    classList: fakeClassList(),
    matches: () => false,
    querySelectorAll: () => [head]
  };
}

function fakeEnvironment() {
  const root = { scrollTop: 0 };
  const listeners = [];
  const body = { classList: fakeClassList() };

  globalThis.window = {
    addEventListener: (type, handler) => listeners.push({ type, handler }),
    removeEventListener: () => {}
  };
  globalThis.document = { documentElement: root, scrollingElement: root, body };

  return {
    root,
    body,
    listeners,
    scrollTo(value) {
      root.scrollTop = value;
      for (const { handler } of listeners) handler();
    }
  };
}

test("un re-rendu fait suivre le défilement au nouvel en-tête, pas à l'ancien", () => {
  // Le défaut qui a tenu deux fois : l'écouteur gardait la référence du premier
  // en-tête, remplacé depuis dans le DOM. Les classes basculaient sur un nœud
  // détaché — le code paraissait juste et l'écran ne bougeait pas.
  const dom = fakeEnvironment();
  const premier = fakeChrome();
  const second = fakeChrome();

  bindOverlayChromeCompact(dom.root, premier, "propositions");
  premier.isConnected = false;
  bindOverlayChromeCompact(dom.root, second, "propositions");

  dom.scrollTo(400);

  assert.ok(second.classList.contains("overlay-chrome--compact"));
  assert.ok(second.head.classList.contains("details-head--compact"));
  assert.ok(!second.head.classList.contains("details-head--expanded"));
});

test("un seul écouteur, quel que soit le nombre de rendus", () => {
  // Sans cela, chaque affichage en laisserait un de plus : la page ralentit
  // sans que rien ne se voie.
  const dom = fakeEnvironment();

  for (let rendu = 0; rendu < 5; rendu += 1) {
    bindOverlayChromeCompact(dom.root, fakeChrome(), "propositions");
  }

  assert.equal(dom.listeners.length, 1);
});

test("deux écrans écoutent le même défilement sans se remplacer", () => {
  const dom = fakeEnvironment();
  const sujet = fakeChrome();
  const proposition = fakeChrome();

  bindOverlayChromeCompact(dom.root, sujet, "details");
  bindOverlayChromeCompact(dom.root, proposition, "propositions");

  dom.scrollTo(200);

  assert.ok(sujet.classList.contains("overlay-chrome--compact"));
  assert.ok(proposition.classList.contains("overlay-chrome--compact"));
});

test("quand la coque du projet se compacte, l'en-tête suit sans attendre un défilement", () => {
  // Quel élément défile n'est pas une évidence ici : `#app` a son propre
  // ascenseur, que la route projet neutralise. Un en-tête qui n'écouterait
  // qu'une seule source se tairait dès que ce n'est pas la bonne — sans rien
  // signaler.
  const dom = fakeEnvironment();
  const chrome = fakeChrome();
  dom.body.classList.add("project-shell-compact");

  bindOverlayChromeCompact(dom.root, chrome, "propositions", {
    alsoCompactWhen: () => dom.body.classList.contains("project-shell-compact")
  });

  assert.equal(dom.root.scrollTop, 0, "rien n'a défilé");
  assert.ok(chrome.classList.contains("overlay-chrome--compact"));
  assert.ok(chrome.head.classList.contains("details-head--compact"));
});

test("la synchronisation rendue permet de rejouer l'état depuis une autre source", () => {
  const dom = fakeEnvironment();
  const chrome = fakeChrome();

  const sync = bindOverlayChromeCompact(dom.root, chrome, "propositions", {
    alsoCompactWhen: () => dom.body.classList.contains("project-shell-compact")
  });

  assert.ok(!chrome.classList.contains("overlay-chrome--compact"));

  dom.body.classList.add("project-shell-compact");
  sync();

  assert.ok(chrome.classList.contains("overlay-chrome--compact"));
});

test("un en-tête retiré de la page cesse d'être synchronisé", () => {
  // Sa synchronisation s'efface plutôt que de tourner à vide jusqu'à la fin de
  // la session.
  const dom = fakeEnvironment();
  const chrome = fakeChrome();
  let lectures = 0;
  chrome.querySelectorAll = () => {
    lectures += 1;
    return [chrome.head];
  };

  bindOverlayChromeCompact(dom.root, chrome, "propositions");
  const apresLiaison = lectures;

  chrome.isConnected = false;
  dom.scrollTo(300);
  dom.scrollTo(600);

  assert.equal(lectures, apresLiaison, "plus aucune lecture après le retrait");
});

test("sans en-tête, on ne s'abonne à rien", () => {
  const dom = fakeEnvironment();

  assert.equal(bindOverlayChromeCompact(dom.root, null, "propositions"), undefined);
  assert.equal(dom.listeners.length, 0);
});
