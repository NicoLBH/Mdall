import test from "node:test";
import assert from "node:assert/strict";

import {
  brancherLaSaisieDeCode, combienDeLignes, renderGouttiere, renderSaisieDeCode
} from "./saisie-de-code.js";

/* ── Le compte des lignes ────────────────────────────────────────────────── */

test("un fichier vide a une première ligne", () => {
  // C'est là qu'on va écrire. Une gouttière vide se lirait comme une zone qui
  // n'accepte rien.
  assert.equal(combienDeLignes(""), 1);
  assert.equal(combienDeLignes(null), 1);
  assert.match(renderSaisieDeCode({}), /<span class="memoire-ligne__num">1<\/span>/);
});

test("une ligne de plus fait un numéro de plus", () => {
  assert.equal(combienDeLignes("un"), 1);
  assert.equal(combienDeLignes("un\ndeux"), 2);
  // Un texte qui finit par un retour ouvre une ligne : c'est là que le curseur
  // est, et ne pas la numéroter ferait disparaître la ligne qu'on écrit.
  assert.equal(combienDeLignes("un\n"), 2);
});

test("les trois fins de ligne se valent", () => {
  // Un collage venu de Word porte des retours Windows : les compter comme deux
  // caractères ferait deux fois trop de numéros.
  assert.equal(combienDeLignes("un\r\ndeux"), 2);
  assert.equal(combienDeLignes("un\rdeux"), 2);
});

test("la gouttière commence à 1 et n'en saute aucun", () => {
  const numeros = [...renderGouttiere(4).matchAll(/>(\d+)</g)].map((trouve) => Number(trouve[1]));

  assert.deepEqual(numeros, [1, 2, 3, 4]);
});

/* ── La zone ─────────────────────────────────────────────────────────────── */

test("c'est une zone de texte, et rien de plus savant", () => {
  // Un éditeur qui reconstruit la saisie casse le collage, la sélection et
  // l'annulation. Or le cas d'usage EST un collage.
  const html = renderSaisieDeCode({ contenu: "# Notice" });

  assert.match(html, /<textarea/);
  assert.equal(/contenteditable/.test(html), false);
});

test("ce qui est déjà écrit est échappé", () => {
  // Une notice qui parlerait de balises ne doit pas les voir exécutées — ni
  // fermer la zone de saisie, ce qui serait pire : le reste du texte deviendrait
  // du balisage.
  const html = renderSaisieDeCode({ contenu: "</textarea><script>alert(1)</script>" });

  assert.equal(html.includes("</textarea><script>"), false);
  assert.match(html, /&lt;\/textarea&gt;/);
});

test("la zone porte la marque que l'appelant lui donne", () => {
  assert.match(renderSaisieDeCode({ marque: "data-mon-champ" }), /data-mon-champ/);
});

/* ── La gouttière suit ───────────────────────────────────────────────────── */

test("la gouttière se recalcule à la frappe et au collage", () => {
  // `input` couvre les deux, là où `keyup` raterait un collage à la souris —
  // qui est justement le geste pour lequel cette zone existe.
  const ecoutes = {};
  const gouttiere = { innerHTML: "", scrollTop: 0 };
  const zone = {
    value: "un\ndeux\ntrois", scrollTop: 0,
    addEventListener(quoi, quand) { ecoutes[quoi] = quand; },
    removeEventListener() {}
  };
  const racine = { querySelector: (quoi) => (quoi.includes("gouttiere") ? gouttiere : zone) };

  let vu = "";
  brancherLaSaisieDeCode(racine, { surChangement: (valeur) => { vu = valeur; } });

  assert.equal((gouttiere.innerHTML.match(/memoire-ligne__num/g) ?? []).length, 3);
  assert.equal(vu, "un\ndeux\ntrois");

  // Un collage : la valeur change d'un coup, et `input` se déclenche.
  zone.value = "un\ndeux\ntrois\nquatre\ncinq";
  ecoutes.input();
  assert.equal((gouttiere.innerHTML.match(/memoire-ligne__num/g) ?? []).length, 5);
});

test("la gouttière se cale sur le défilement de la zone", () => {
  // Sans ce calage, elle reste en haut pendant que le texte descend, et les
  // numéros désignent d'autres lignes.
  const ecoutes = {};
  const gouttiere = { innerHTML: "", scrollTop: 0 };
  const zone = {
    value: "un", scrollTop: 0,
    addEventListener(quoi, quand) { ecoutes[quoi] = quand; },
    removeEventListener() {}
  };

  brancherLaSaisieDeCode({ querySelector: (quoi) => (quoi.includes("gouttiere") ? gouttiere : zone) });

  zone.scrollTop = 420;
  ecoutes.scroll();
  assert.equal(gouttiere.scrollTop, 420);
});

test("sans zone à l'écran, le branchement ne casse rien", () => {
  assert.doesNotThrow(() => brancherLaSaisieDeCode({ querySelector: () => null }));
  assert.doesNotThrow(() => brancherLaSaisieDeCode(null));
});
