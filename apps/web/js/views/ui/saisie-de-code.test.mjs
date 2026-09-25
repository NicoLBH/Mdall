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

/* ── La couleur se pose derrière, jamais à la place ──────────────────────── */

/** Un coloreur de papier : il marque ce qu'il reçoit, et rien de plus. */
const enCouleur = (contenu) => String(contenu)
  .split("\n").map((ligne) => `<span class="t">${ligne || "&nbsp;"}</span>`).join("\n");

test("sans coloreur, la zone reste exactement ce qu'elle était", () => {
  // Les autres écrans qui s'en servent ne changent pas : la couleur est un
  // supplément, pas une refonte.
  const html = renderSaisieDeCode({ contenu: "fonction A() {" });

  assert.doesNotMatch(html, /saisie-code--coloree/);
  assert.doesNotMatch(html, /data-saisie-couleur/);
});

test("avec un coloreur, la couche se pose sous la zone, et la zone reste une zone", () => {
  // Reconstruire la saisie casserait le collage, la sélection et l'annulation :
  // c'est un `<textarea>`, et il le reste.
  const html = renderSaisieDeCode({ contenu: "fonction A() {", colorer: enCouleur });

  assert.match(html, /saisie-code--coloree/);
  assert.match(html, /data-saisie-couleur/);
  assert.match(html, /<textarea/);
  // La couche est cachée aux lecteurs d'écran : le texte, ils le lisent dans la
  // zone, et l'entendre deux fois n'apprend rien.
  assert.match(html, /aria-hidden="true"/);
  // Et elle vient **avant** la zone, donc dessous.
  assert.ok(html.indexOf("data-saisie-couleur") < html.indexOf("<textarea"));
});

test("la couche porte ce que le coloreur a peint, pas le texte brut", () => {
  const html = renderSaisieDeCode({ contenu: "si (x = 1)", colorer: enCouleur });
  assert.match(html, /<span class="t">si \(x = 1\)<\/span>/);
});

test("le coloreur reçoit le contenu tel quel, y compris vide", () => {
  const vus = [];
  renderSaisieDeCode({ contenu: "", colorer: (contenu) => { vus.push(contenu); return ""; } });
  renderSaisieDeCode({ contenu: null, colorer: (contenu) => { vus.push(contenu); return ""; } });

  assert.deepEqual(vus, ["", ""]);
});

/**
 * **Le défaut que ça répare : on écrivait en noir sur noir.**
 *
 * Le rendu posait bien la couche colorée, mais l'appelant ne passait pas son
 * coloreur au branchement : rien ne la repeignait à la frappe. Or le texte de
 * la zone est transparent — c'est ce qui permet de voir la couleur dessous — et
 * l'on tapait donc dans le vide, visiblement.
 *
 * L'épreuve tient le contrat des deux côtés : une zone rendue colorée **doit**
 * être branchée avec un coloreur, et une zone qui n'en a pas ne doit pas
 * cacher son texte.
 */
test("une zone rendue colorée porte la couche que la frappe repeindra", () => {
  const avec = renderSaisieDeCode({ contenu: "si (x = 1)", colorer: enCouleur });
  const sans = renderSaisieDeCode({ contenu: "si (x = 1)" });

  // La classe qui rend le texte transparent et la couche à repeindre vont
  // ensemble : l'une sans l'autre, on écrit sans se voir écrire.
  assert.equal(avec.includes("saisie-code--coloree"), avec.includes("data-saisie-couleur"));
  assert.equal(sans.includes("saisie-code--coloree"), sans.includes("data-saisie-couleur"));
  assert.equal(sans.includes("saisie-code--coloree"), false);
});
