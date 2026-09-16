/**
 * L'activité d'un projet sur douze mois.
 *
 * ## Ce que ces gardes attrapent
 *
 * Une courbe qui **ne trace que les semaines vues** : les creux disparaîtraient
 * en se refermant, et deux projets n'auraient pas la même échelle de temps —
 * l'un montrerait une année, l'autre trois semaines, sur la même largeur.
 *
 * Une **semaine qui ne commence pas le lundi** : toute la courbe se décale d'un
 * cran, et rien à l'écran ne le montre.
 *
 * Des lignes **hors fenêtre ou sans projet** comptées quand même : les premières
 * gonflent la dernière semaine, les secondes prennent la place d'un autre.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  SEMAINES, courbesParProjet, lundiDe, semainesDeLaFenetre, totalDeLaCourbe
} from "./activite-des-projets.js";

/** Un lundi, pour que la fenêtre ait des bornes qu'on puisse dire. */
const MAINTENANT = Date.parse("2026-06-01T12:00:00Z");

const SEMAINE = 7 * 24 * 60 * 60 * 1000;
const ilYA = (semaines) => new Date(MAINTENANT - semaines * SEMAINE).toISOString();

/* ── Le découpage ────────────────────────────────────────────────────────── */

/**
 * **Lundi, et non dimanche.** C'est la semaine du calendrier français ; partir
 * du dimanche décale toute la courbe d'un cran.
 */
test("la semaine commence le lundi", () => {
  assert.equal(lundiDe("2026-06-01T12:00:00Z"), "2026-06-01", "un lundi reste son propre lundi");
  assert.equal(lundiDe("2026-06-07T23:00:00Z"), "2026-06-01", "le dimanche appartient à la semaine qui l'ouvre");
  assert.equal(lundiDe("2026-06-02T00:30:00Z"), "2026-06-01");
  assert.equal(lundiDe("2026-06-08T00:00:00Z"), "2026-06-08", "le lundi suivant change de semaine");
  assert.equal(lundiDe("avant-hier"), "");
  assert.equal(lundiDe(""), "");
});

/**
 * **Toutes les semaines, y compris les vides.** Ne poser que celles qu'on a
 * vues serrerait les creux jusqu'à les faire disparaître.
 */
test("la fenêtre porte une case par semaine, la plus ancienne d'abord", () => {
  const semaines = semainesDeLaFenetre(MAINTENANT);

  assert.equal(semaines.length, SEMAINES);
  assert.equal(semaines.at(-1), "2026-06-01", "la dernière case est la semaine en cours");
  assert.equal(semaines[0], lundiDe(ilYA(SEMAINES - 1)), "et la première ouvre les douze mois");
  assert.deepEqual([...semaines].sort(), semaines, "de la plus ancienne à la plus récente");
});

/* ── Le compte ───────────────────────────────────────────────────────────── */

test("chaque projet reçoit une courbe de la longueur de la fenêtre", () => {
  const courbes = courbesParProjet({
    lignes: [
      { projet: "p-a", semaine: lundiDe(ilYA(0)), combien: 3 },
      { projet: "p-b", semaine: lundiDe(ilYA(10)), combien: 1 }
    ],
    maintenant: MAINTENANT
  });

  assert.deepEqual(Object.keys(courbes).sort(), ["p-a", "p-b"]);
  assert.equal(courbes["p-a"].length, SEMAINES);
  assert.equal(courbes["p-a"].at(-1), 3, "la semaine en cours est la dernière case");
  assert.equal(courbes["p-b"].at(-11), 1, "dix semaines en arrière, dix cases avant");
  assert.equal(totalDeLaCourbe(courbes["p-b"]), 1, "et rien ailleurs");
});

/** Deux sources tombées la même semaine s'additionnent dans la même case. */
test("les comptes d'une même semaine s'additionnent", () => {
  const courbes = courbesParProjet({
    lignes: [
      { projet: "p-a", semaine: lundiDe(ilYA(2)), combien: 4 },
      { projet: "p-a", semaine: lundiDe(ilYA(2)), combien: 6 }
    ],
    maintenant: MAINTENANT
  });

  assert.equal(courbes["p-a"].at(-3), 10);
  assert.equal(totalDeLaCourbe(courbes["p-a"]), 10);
});

/**
 * **Ce qui est hors de la fenêtre ne compte pas.** Le ranger dans la case la
 * plus proche gonflerait la dernière semaine du travail de l'an dernier.
 */
test("au-delà de douze mois, une ligne ne compte plus", () => {
  const courbes = courbesParProjet({
    lignes: [
      { projet: "p-a", semaine: lundiDe(ilYA(SEMAINES + 4)), combien: 40 },
      { projet: "p-b", semaine: lundiDe(ilYA(3)), combien: 2 }
    ],
    maintenant: MAINTENANT
  });

  assert.deepEqual(Object.keys(courbes), ["p-b"], "le projet trop vieux n'a pas de courbe du tout");
});

/** Une ligne sans projet, ou dont la date est illisible, ne se range nulle part. */
test("ce qui ne dit ni où ni quand ne compte pas", () => {
  const courbes = courbesParProjet({
    lignes: [
      { projet: "", semaine: lundiDe(ilYA(1)), combien: 9 },
      { projet: "p-a", semaine: "la semaine dernière", combien: 9 },
      { projet: "p-a", semaine: lundiDe(ilYA(1)), combien: 2 }
    ],
    maintenant: MAINTENANT
  });

  assert.deepEqual(Object.keys(courbes), ["p-a"]);
  assert.equal(totalDeLaCourbe(courbes["p-a"]), 2);
});

/**
 * La base rend une semaine ; un instant brut marche aussi. C'est ce qui permet
 * de tracer la courbe depuis d'autres traces sans un second découpage — deux
 * découpages finiraient par ne plus ranger au même endroit (règle 4).
 */
test("un instant brut se range dans sa semaine", () => {
  const courbes = courbesParProjet({
    lignes: [{ projet: "p-a", quand: "2026-05-27T09:00:00Z" }],
    maintenant: MAINTENANT
  });

  assert.equal(courbes["p-a"].at(-2), 1, "le mercredi 27 mai est la semaine du lundi 25");
});

/** Sans ligne, aucune courbe — et ce n'est pas une erreur. */
test("sans ligne, aucune courbe", () => {
  assert.deepEqual(courbesParProjet({ maintenant: MAINTENANT }), {});
  assert.deepEqual(courbesParProjet(), {});
  assert.equal(totalDeLaCourbe(), 0);
});
