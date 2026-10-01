import test from "node:test";
import assert from "node:assert/strict";

import {
  laSyntheseDunDocument, lesLiaisonsRelevees, lesTermesReleves, phraseDeLaSynthese
} from "./la-synthese-dun-document.js";

/** Une idée relevée, telle qu'une lecture la garde. */
const une = (avant, lien, apres, mot) => ({
  avant, lien, apres, mot,
  phrase: `${avant} ${mot} ${apres}.`,
  document: "1824_CR_12.pdf",
  page: 3
});

/* ── Les liaisons expliquent le relevé ───────────────────────────────────── */

/**
 * **C'est la première explication d'un relevé maigre.**
 *
 * « Deux idées » ne se corrige pas. « Deux idées, par deux mots de liaison, et
 * le document en emploie dix » se corrige : il dit où regarder.
 */
test("les liaisons employées se comptent, de la plus fréquente à la plus rare", () => {
  const liaisons = lesLiaisonsRelevees([
    une("terrain argileux", "obligation", "etude de sol", "exige"),
    une("plancher beton", "obligation", "controle", "exige"),
    une("nappe", "cause", "reprise", "donc")
  ]);

  assert.deepEqual(liaisons.map((un) => [un.mot, un.combien]), [["exige", 2], ["donc", 1]]);
  // Le verbe du lien accompagne le mot : « exige » n'apprend rien à qui ne
  // connaît pas les six sortes.
  assert.equal(liaisons[0].libelle, "impose");
  assert.equal(liaisons[0].lien, "obligation");
});

/**
 * **« donc » et « car » ne se fondent pas.**
 *
 * Tous deux portent une cause, et ils ne vont pas dans le même sens : l'un de
 * gauche à droite, l'autre à l'envers. Les compter ensemble ferait croire que
 * le document emploie deux fois le même tour.
 */
test("deux mots de la même sorte restent deux lignes", () => {
  const liaisons = lesLiaisonsRelevees([
    une("a", "cause", "b", "donc"),
    une("c", "cause", "d", "car")
  ]);

  assert.equal(liaisons.length, 2);
});

/**
 * **Sans mot, pas de ligne.** Une idée dont on ne sait pas par quel tour elle a
 * été coupée n'explique aucun découpage : la ranger sous un mot vide ferait une
 * ligne qui compte sans rien nommer (règle 5).
 */
test("une idée sans mot de liaison n'invente pas de ligne", () => {
  assert.deepEqual(lesLiaisonsRelevees([une("a", "cause", "b", "")]), []);
  assert.deepEqual(lesLiaisonsRelevees([]), []);
  assert.deepEqual(lesLiaisonsRelevees(null), []);
});

/** Et une sorte de lien que l'écran ne sait pas nommer ne sort pas non plus. */
test("un lien inconnu ne fait pas de ligne", () => {
  assert.deepEqual(lesLiaisonsRelevees([{ ...une("a", "cause", "b", "donc"), lien: "concession" }]), []);
});

/* ── Les termes, et le pivot d'un document ───────────────────────────────── */

/**
 * **Un terme qui revient des deux côtés est le pivot du document.** C'est ce
 * qu'on cherche pour savoir de quoi une réunion a parlé *en conséquences*, et
 * non en intitulés.
 */
test("un terme qui entre et qui sort se compte deux fois", () => {
  const termes = lesTermesReleves([
    une("terrain argileux", "cause", "plancher beton", "donc"),
    une("plancher beton", "obligation", "etude de sol", "exige")
  ]);

  assert.deepEqual(termes[0], { terme: "plancher beton", entre: 1, sort: 1, combien: 2 });
});

/* ── Ce qui s'enchaîne ───────────────────────────────────────────────────── */

/**
 * **Un raisonnement n'est pas relevé : il est obtenu.** C'est le seul endroit
 * où quelque chose qui n'est écrit dans aucun document apparaît.
 */
test("deux idées qui se composent font un raisonnement", () => {
  const synthese = laSyntheseDunDocument([
    une("terrain argileux", "cause", "plancher beton", "donc"),
    une("plancher beton", "obligation", "etude de sol", "exige")
  ]);

  assert.equal(synthese.raisonnements.length, 1);
  assert.deepEqual(synthese.raisonnements[0].idees.map((un) => un.avant),
    ["terrain argileux", "plancher beton"]);
});

/** Deux idées sans terme commun ne composent rien, et rien ne s'invente. */
test("ce qui ne s'enchaîne pas ne s'enchaîne pas", () => {
  const synthese = laSyntheseDunDocument([
    une("a", "cause", "b", "donc"),
    une("c", "cause", "d", "donc")
  ]);

  assert.deepEqual(synthese.raisonnements, []);
});

/* ── Ce que la synthèse dit d'elle-même ──────────────────────────────────── */

/**
 * **Une synthèse vide ne dit pas « ce document n'enchaîne rien ».** Le
 * découpage ne lit que les liaisons placées entre les deux membres d'une
 * phrase : prendre une limite de méthode pour un constat sur le document est
 * exactement ce que règle 5 interdit.
 */
test("aucune idée se dit comme une limite, pas comme un constat", () => {
  const dite = phraseDeLaSynthese(laSyntheseDunDocument([]));

  assert.match(dite, /n'énonce aucune idée que le découpage sache lire/);
  assert.match(dite, /placées entre les deux membres/);
});

/** Et quand il y en a, elle dit les trois nombres qui ne se devinent pas. */
test("la phrase dit les liaisons, les idées et les raisonnements", () => {
  const dite = phraseDeLaSynthese(laSyntheseDunDocument([
    une("terrain argileux", "cause", "plancher beton", "donc"),
    une("plancher beton", "obligation", "etude de sol", "exige")
  ]));

  assert.match(dite, /2 idées/);
  assert.match(dite, /2 mots de liaison/);
  assert.match(dite, /1 raisonnement s'en compose/);
});

/** Des idées qui ne s'enchaînent pas le disent, plutôt que de se taire. */
test("sans enchaînement, la phrase le dit", () => {
  const dite = phraseDeLaSynthese(laSyntheseDunDocument([une("a", "cause", "b", "donc")]));
  assert.match(dite, /Aucune ne s'enchaîne/);
});
