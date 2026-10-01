/**
 * Ce qu'on vérifie ici, c'est le **refus**.
 *
 * Un module qui range des idées est facile à croire : il rend des objets, ils
 * ont trois champs, l'écran les dessine. Ce qui décide de sa valeur est ce
 * qu'il laisse passer — une moitié de phrase, une tautologie, un lien sans
 * verbe. Chacune de ces trois choses, affichée, aurait l'air d'un résultat.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  LES_LIENS, LES_SORTES_DE_LIENS, cestUneIdee, laFonctionDite, leCote, leLienDit,
  lesIdeesRangees, phraseDeCeQueLesIdeesValent, phraseDuneIdee, uneIdee
} from "./une-idee.js";

const UNE = { avant: "terrain argileux", lien: "cause", apres: "plancher beton",
  affirmations: 12, chantiers: 4 };

test("chaque sorte de lien porte un nom, un verbe et ce qu'elle affirme", () => {
  assert.ok(LES_LIENS.length >= 2, "il n'y a pas de quoi distinguer deux liens");

  for (const un of LES_LIENS) {
    assert.ok(un.cle && typeof un.cle === "string", "une sorte sans clé");
    assert.ok(un.libelle, `« ${un.cle} » n'a pas de nom`);
    assert.ok(un.fleche, `« ${un.cle} » n'a pas de verbe : la flèche serait muette`);
    assert.ok(un.explication.length > 30,
      `« ${un.cle} » n'explique pas ce qu'elle affirme`);
  }

  const cles = LES_LIENS.map((un) => un.cle);
  assert.equal(new Set(cles).size, cles.length, "deux sortes portent la même clé");
  assert.deepEqual(LES_SORTES_DE_LIENS, cles);
});

/**
 * **Une sorte inconnue ne se range pas sous la première.** Elle viendrait d'une
 * base en avance sur cet écran ; l'afficher comme « entraîne » dirait un lien
 * faux avec l'aplomb d'un lien juste (règle 5).
 */
test("une sorte de lien inconnue ne se devine pas", () => {
  assert.equal(leLienDit("cause").libelle, "entraîne");
  assert.equal(leLienDit("concession"), null);
  assert.equal(leLienDit(""), null);
  assert.equal(leLienDit(null), null);
  assert.equal(leLienDit(undefined), null);
});

test("les deux côtés se comparent de la même façon", () => {
  assert.equal(leCote("  Plancher   Beton "), "plancher beton");
  assert.equal(leCote(null), "");
  assert.equal(leCote(undefined), "");
});

test("une idée a deux côtés et un lien, sinon ce n'en est pas une", () => {
  assert.equal(cestUneIdee(UNE), true);

  assert.equal(cestUneIdee({ ...UNE, avant: "" }), false, "un côté gauche vide est passé");
  assert.equal(cestUneIdee({ ...UNE, apres: "  " }), false, "un côté droit vide est passé");
  assert.equal(cestUneIdee({ ...UNE, lien: "concession" }), false,
    "un lien que l'écran ne sait pas nommer est passé");
  assert.equal(cestUneIdee({ ...UNE, lien: "" }), false);
  assert.equal(cestUneIdee(null), false);
  assert.equal(cestUneIdee({}), false);
});

/**
 * **« nappe entraîne nappe » est vrai, et c'est ce qui le rend inutile.**
 * C'est la même tautologie que la prédiction écarte sous le nom de banal.
 */
test("une idée dont les deux côtés sont le même ne dit rien", () => {
  assert.equal(cestUneIdee({ ...UNE, avant: "nappe", apres: "nappe" }), false);
  // Et la comparaison est celle de `leCote` : la casse et les espaces ne
  // sauvent pas une tautologie.
  assert.equal(cestUneIdee({ ...UNE, avant: "Nappe  Haute", apres: "nappe haute" }), false,
    "une tautologie est passée parce qu'elle était écrite autrement");
});

test("une ligne qui n'est pas une idée ne se range pas", () => {
  assert.deepEqual(uneIdee(UNE), {
    avant: "terrain argileux", lien: "cause", apres: "plancher beton",
    affirmations: 12, chantiers: 4
  });
  assert.equal(uneIdee({ ...UNE, apres: "" }), null);
  assert.equal(uneIdee(null), null);
});

/** Des comptes absents valent zéro, et ne font pas tomber le rangement. */
test("une idée sans comptes se range quand même", () => {
  const sans = uneIdee({ avant: "a", lien: "cause", apres: "b" });
  assert.equal(sans.affirmations, 0);
  assert.equal(sans.chantiers, 0);
});

/**
 * **Par occurrence décroissante.**
 *
 * Le seuil des deux chantiers est tenu par la base : rien n'arrive ici qui ne
 * l'ait passé. Reclasser par chantiers par-dessus ne protégerait de rien et
 * déformerait la lecture — trois idées à deux chantiers se rangeaient par ordre
 * alphabétique (règle 4).
 */
test("les idées se rangent par occurrence décroissante", () => {
  const range = lesIdeesRangees([
    { avant: "a", lien: "cause", apres: "b", affirmations: 900, chantiers: 2 },
    { avant: "c", lien: "cause", apres: "d", affirmations: 3, chantiers: 5 },
    { avant: "pas une idee", lien: "concession", apres: "x", affirmations: 90, chantiers: 9 }
  ]);

  assert.deepEqual(range.map((une) => une.avant), ["a", "c"],
    "le classement est reparti des chantiers, ou une non-idée est passée");
});

test("à occurrence égale, la plus répandue passe devant", () => {
  const range = lesIdeesRangees([
    { avant: "a", lien: "cause", apres: "b", affirmations: 30, chantiers: 2 },
    { avant: "c", lien: "cause", apres: "d", affirmations: 30, chantiers: 4 }
  ]);
  assert.deepEqual(range.map((une) => une.avant), ["c", "a"]);
});

test("un rangement sans lignes ne tombe pas", () => {
  assert.deepEqual(lesIdeesRangees(), []);
  assert.deepEqual(lesIdeesRangees(null), []);
  assert.deepEqual(lesIdeesRangees("des idées"), []);
});

test("une idée s'écrit comme une fonction, et une non-idée ne s'écrit pas", () => {
  assert.equal(laFonctionDite(UNE), "terrain argileux → plancher beton");
  assert.equal(laFonctionDite({ ...UNE, apres: "" }), "",
    "une flèche a été dessinée entre un terme et rien");
  assert.equal(phraseDuneIdee(UNE), "terrain argileux entraîne plancher beton");
  assert.equal(phraseDuneIdee({ ...UNE, lien: "empechement" }),
    "terrain argileux empêche plancher beton");
  assert.equal(phraseDuneIdee({ ...UNE, lien: "concession" }), "",
    "un lien sans verbe a quand même été écrit");
});

/* ── Ce que les idées valent, et ce qu'on n'a pas vu ──────────────────────── */

/**
 * **Trois listes vides, trois phrases différentes.**
 *
 * « rien à mesurer », « des liens mais rien de partagé » et « aucun lien » ne
 * mènent pas aux mêmes décisions. Une seule phrase pour les trois ferait
 * prendre un seuil pour un constat sur la matière (règle 5).
 */
test("une mesure absente ne se dit pas comme une mesure à zéro", () => {
  const sansMesure = phraseDeCeQueLesIdeesValent([], null);
  assert.match(sansMesure, /ne sait pas/);
  assert.doesNotMatch(sansMesure, /%/,
    "un pourcentage a été annoncé alors que rien n'a été mesuré");
});

test("des liens non partagés ne se disent pas comme une absence de liens", () => {
  const desLiens = phraseDeCeQueLesIdeesValent([],
    { affirmations: 100, liantes: 40, lisibles: 30 });
  assert.match(desLiens, /40 %/);
  assert.match(desLiens, /pas encore de quoi les comparer/);

  const aucun = phraseDeCeQueLesIdeesValent([],
    { affirmations: 100, liantes: 0, lisibles: 0 });
  assert.match(aucun, /0 %/);
  assert.match(aucun, /ne dit pas encore ce qu'elles se font/);
});

test("la part se compte sur les affirmations, et ne divise jamais par zéro", () => {
  const dit = phraseDeCeQueLesIdeesValent([UNE],
    { affirmations: 200, liantes: 50, lisibles: 44 });
  assert.match(dit, /25 %/);
  assert.match(dit, /1 idée en ressort/);

  const vide = phraseDeCeQueLesIdeesValent([],
    { affirmations: 0, liantes: 0, lisibles: 0 });
  assert.match(vide, /0 %/, `une division par zéro est passée : ${vide}`);
});

test("le pluriel suit le nombre d'idées", () => {
  const deux = phraseDeCeQueLesIdeesValent([UNE, { ...UNE, avant: "nappe" }],
    { affirmations: 10, liantes: 4, lisibles: 4 });
  assert.match(deux, /2 idées en ressortent/);
});

/**
 * **Ce qui est lisible n'est pas ce qui est liant.**
 *
 * Une affirmation peut porter « donc » et n'avoir aucun terme d'un côté. La
 * mesure les compte séparément, et la phrase annonce la part des **liantes** :
 * annoncer celle des lisibles laisserait croire que tout lien a été lu.
 */
test("la part annoncée est celle des affirmations qui portent un lien", () => {
  const dit = phraseDeCeQueLesIdeesValent([UNE],
    { affirmations: 100, liantes: 30, lisibles: 10 });
  assert.match(dit, /30 %/, `la part annoncée n'est pas celle des liantes : ${dit}`);
  assert.match(dit, /30 sur 100/);
});
