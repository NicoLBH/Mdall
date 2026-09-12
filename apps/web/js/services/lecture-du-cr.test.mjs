import test from "node:test";
import assert from "node:assert/strict";

import {
  MANQUE, PHRASES_DU_MANQUE, SORT, citationRetrouvee, comptesDeLaConfrontation,
  confrontation, intitulesAmbigus, lectureAssemblee, manquesDuPoint, mesureDeLaLecture,
  rubriquesDesPoints
} from "./lecture-du-cr.js";

/** Un point tel que le modèle le rend. Textes inventés. */
const point = (reste = {}) => ({
  lot: "02 — CHARPENTE",
  reference: "2.1",
  titre: "Établir les plans de fabrication",
  description: "Établir les plans de fabrication et les notes de calcul.",
  qui: "Entreprise du lot 02",
  echeance: "10/09",
  etat: "en cours",
  page: 3,
  citation: "Établir les plans de fabrication",
  ...reste
});

const PAGES = [
  { page: 3, text: "Lot 2 — Établir les plans de fabrication et les notes de calcul. Assister au prochain RDV." }
];

/* ── La citation est la preuve ───────────────────────────────────────────── */

/**
 * **C'est la seule vérification qui ne dépende pas du modèle.** Un point sans
 * citation est une affirmation, pas une lecture du document — et cela ne se
 * voit qu'en le disant.
 */
test("une citation se retrouve, ou ne se retrouve pas, dans le document", () => {
  assert.equal(citationRetrouvee(point(), PAGES), true);
  assert.equal(citationRetrouvee(point({ citation: "Refaire la toiture" }), PAGES), false);
  assert.equal(citationRetrouvee(point({ citation: "" }), PAGES), false);
});

/**
 * Un point juste mais **mal paginé** n'est pas un point inventé : on cherche
 * d'abord la page annoncée, puis le document entier. Les confondre effacerait
 * la distinction qui compte.
 */
test("une citation mal paginée reste une citation retrouvée", () => {
  assert.equal(citationRetrouvee(point({ page: 9 }), PAGES), true);
});

/** Les espaces et la casse ne décident pas de ce qui est vrai. */
test("la citation se retrouve malgré la casse et les espaces", () => {
  assert.equal(citationRetrouvee(point({ citation: "ÉTABLIR   LES  PLANS" }), PAGES), true);
});

/* ── Ce qui manque se voit ───────────────────────────────────────────────── */

test("les trous d'un point se nomment, la citation en premier", () => {
  const trous = manquesDuPoint({ titre: "Quelque chose" });

  assert.equal(trous[0], MANQUE.CITATION);
  assert.ok(trous.includes(MANQUE.PAGE));
  assert.ok(trous.includes(MANQUE.LOT));
  assert.match(PHRASES_DU_MANQUE[MANQUE.CITATION], /rien ne prouve/);
});

test("un point complet n'a aucun trou", () => {
  assert.deepEqual(manquesDuPoint(point()), []);
});

/* ── La mesure, qui rend les paliers comparables ─────────────────────────── */

/**
 * **Ce sont ces nombres qu'on compare d'une version à l'autre.** Sans eux, une
 * amélioration se juge au ressenti — « ça a l'air mieux » — et l'on ne sait
 * jamais si le palier suivant a progressé ou reculé.
 */
test("la lecture se mesure en nombres comparables", () => {
  const lu = lectureAssemblee({
    points: [point(), point({ citation: "", titre: "Autre chose" }), point({ citation: "inventé" })],
    pages: PAGES
  });

  assert.deepEqual(lu.mesure, {
    points: 3, retrouves: 1, sansCitation: 1, sansLot: 0, pages: 1, caracteres: PAGES[0].text.length
  });
});

test("une lecture vide reste une lecture, avec ses zéros", () => {
  const lu = lectureAssemblee({});
  assert.equal(lu.mesure.points, 0);
  assert.deepEqual(lu.points, []);
  assert.deepEqual(lu.rubriques, []);
});

test("ce que le serveur a déjà écarté se reporte", () => {
  assert.equal(lectureAssemblee({ points: [point()], pages: PAGES, ecartes: 4 }).ecartes, 4);
});

/* ── Le contexte perdu, rendu visible ────────────────────────────────────── */

/**
 * **C'est le défaut connu, et l'écran doit le montrer.** « Assister au prochain
 * rendez-vous » sous trois lots, ce sont trois points différents qui s'écrivent
 * pareil : ouverts comme sujets, on obtient trois titres identiques, ou un seul
 * qui en efface deux.
 */
test("un intitulé qui revient sous plusieurs lots se signale", () => {
  const ambigus = intitulesAmbigus([
    point({ titre: "Assister au prochain RDV", lot: "02 — CHARPENTE" }),
    point({ titre: "Assister au prochain RDV", lot: "10 — ELECTRICITE" }),
    point({ titre: "Un point bien à lui" })
  ]);

  assert.equal(ambigus.length, 1);
  assert.equal(ambigus[0].lots.length, 2);
});

test("un intitulé qui ne revient que sous un lot n'est pas ambigu", () => {
  assert.deepEqual(intitulesAmbigus([point(), point({ titre: "Autre" })]), []);
});

/** Un point sans lot se range quand même, sous un intitulé qui le dit. */
test("les points sans lot se rangent sous un intitulé qui l'avoue", () => {
  const rubriques = rubriquesDesPoints([point({ lot: "" })]);
  assert.equal(rubriques[0].lot, "(sans lot)");
});

/* ── La confrontation aux sujets du projet ───────────────────────────────── */

const aplatir = (valeur) => String(valeur ?? "").trim().toLowerCase();

test("un point sans sujet correspondant ouvrirait un sujet", () => {
  const [confronte] = confrontation([point()], [], aplatir);

  assert.equal(confronte.sort, SORT.NOUVEAU);
  assert.equal(confronte.sujet, null);
});

test("un point identique à un sujet ouvert le reprend sans rien y changer", () => {
  const sujets = [{ id: "s-1", title: point().titre, etat: "en cours" }];
  const [confronte] = confrontation([point()], sujets, aplatir);

  assert.equal(confronte.sort, SORT.REPRIS);
  assert.equal(confronte.sujet.id, "s-1");
});

test("un point dont l'état diffère en dit autre chose", () => {
  const sujets = [{ id: "s-1", title: point().titre, etat: "nouveau" }];
  assert.equal(confrontation([point({ etat: "soldé" })], sujets, aplatir)[0].sort, SORT.CHANGE);
});

test("les sorts se comptent d'un coup d'œil", () => {
  const sujets = [{ id: "s-1", title: point().titre, etat: "en cours" }];
  const comptes = comptesDeLaConfrontation(
    confrontation([point(), point({ titre: "Tout neuf" })], sujets, aplatir)
  );

  assert.deepEqual(comptes, { [SORT.NOUVEAU]: 1, [SORT.REPRIS]: 1, [SORT.CHANGE]: 0 });
});

/**
 * **La mise à plat est passée, pas recopiée.** Deux mises à plat différentes
 * rapprocheraient différemment, et l'écran dirait autre chose que ce que la
 * fusion fera (règle 4).
 */
test("la mise à plat des titres vient de l'appelant", async () => {
  const { titreAplati } = await import("./sujets-du-cr.js");
  const sujets = [{ id: "s-1", title: "  ÉTABLIR les PLANS de fabrication  ", etat: "en cours" }];

  assert.equal(confrontation([point()], sujets, titreAplati)[0].sort, SORT.REPRIS);
});

/* ── Ce que cet écran ne fait pas ────────────────────────────────────────── */

/**
 * **Rien n'entre directement dans la mémoire** (règle 1). Le chemin reste
 * copilote → atelier → proposition → mémoire : un utilitaire qui ouvrirait les
 * sujets lui-même court-circuiterait la seule porte que Mdall possède.
 */
test("la lecture n'ouvre rien et n'écrit rien", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  for (const chemin of ["./lecture-du-cr.js", "../views/studio/dev/lecture-des-cr.js"]) {
    const source = readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
    assert.doesNotMatch(source, /createManualSubject|createSubject|insert\(|method:\s*"POST"/,
      `${chemin} écrit quelque chose`);
  }
});

/**
 * **L'appel de cet utilitaire est compté comme les autres.**
 *
 * Il passe par `extract-sujets`, qui dépose sous la nature
 * « extraction-sujets ». Un utilitaire qui lirait par un chemin non compté
 * ferait grossir la facture sans apparaître nulle part — et c'est précisément
 * ce que le compteur existe pour empêcher.
 */
test("la lecture passe par le chemin compté, pas par un raccourci à elle", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const ecran = readFileSync(
    fileURLToPath(new URL("../views/studio/dev/lecture-des-cr.js", import.meta.url)), "utf8"
  );

  assert.match(ecran, /sujets-par-le-modele\.js/);
  // Aucun appel direct au modèle : il ne saurait pas se compter.
  assert.doesNotMatch(ecran, /api\.openai\.com|OPENAI/);

  const service = readFileSync(
    fileURLToPath(new URL("./sujets-par-le-modele.js", import.meta.url)), "utf8"
  );
  assert.match(service, /project_id: await projetCourant\(\)/);
});
