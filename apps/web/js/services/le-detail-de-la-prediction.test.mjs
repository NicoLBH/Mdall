import test from "node:test";
import assert from "node:assert/strict";

import {
  laPhraseDesJamaisVus, leBilanParDomaine, lesDomainesJamaisVus, lesPointsDeLaPrediction,
  phraseDunDomaine
} from "./le-detail-de-la-prediction.js";

const unRendu = (des = {}) => ({
  quand: "2025-01-10T00:00:00.000Z", predit: [], venu: [], notable: true, ...des
});

test("un point où rien n'est arrivé n'est pas un point", () => {
  // Un mois calme n'est pas une erreur du prédicteur, et l'afficher ferait une
  // liste où l'on cherche les lignes qui comptent.
  const points = lesPointsDeLaPrediction([
    unRendu({ predit: ["structure"], venu: [], notable: false }),
    unRendu({ predit: ["structure"], venu: [{ quoi: "structure" }] })
  ]);
  assert.equal(points.length, 1);
});

test("un point dit ce qui a été annoncé, ce qui est venu, et ce qui s'est rencontré", () => {
  const [point] = lesPointsDeLaPrediction([unRendu({
    predit: ["structure", "incendie", "sol"],
    venu: [{ quoi: "structure" }, { quoi: "acoustique" }]
  })]);

  assert.deepEqual(point.candidats, ["structure", "incendie", "sol"]);
  assert.deepEqual(point.venus, ["structure", "acoustique"]);
  assert.deepEqual(point.vises, ["structure"]);
  assert.deepEqual(point.manques, ["acoustique"]);
  assert.deepEqual(point.pourRien, ["incendie", "sol"]);
  assert.equal(point.juste, true);
});

test("ce qui est annoncé au-delà du rang regardé se dit à part", () => {
  // Le prédicteur le proposait, mais pas assez haut pour compter : c'est
  // différent de ne pas l'avoir vu.
  const [point] = lesPointsDeLaPrediction([unRendu({
    predit: ["structure", "incendie", "sol", "thermique"],
    venu: [{ quoi: "thermique" }]
  })], 3);
  assert.deepEqual(point.candidats, ["structure", "incendie", "sol"]);
  assert.deepEqual(point.pluLoin, ["thermique"]);
  assert.deepEqual(point.manques, ["thermique"]);
  assert.equal(point.juste, false);
});

test("un domaine venu deux fois le même jour ne compte qu'une", () => {
  const [point] = lesPointsDeLaPrediction([unRendu({
    predit: ["structure"], venu: [{ quoi: "structure" }, { quoi: "structure" }]
  })]);
  assert.deepEqual(point.venus, ["structure"]);
});

/**
 * **Le tableau qui répond à « le système fait-il son travail ».** Un chiffre de
 * précision ne le dit pas : un prédicteur qui annonce toujours le domaine le
 * plus courant obtient un bon chiffre sans rien avoir compris.
 */
test("le bilan range du plus venu au moins venu", () => {
  const points = lesPointsDeLaPrediction([
    unRendu({ predit: ["structure"], venu: [{ quoi: "structure" }] }),
    unRendu({ predit: ["structure"], venu: [{ quoi: "acoustique" }] }),
    unRendu({ predit: ["incendie"], venu: [{ quoi: "acoustique" }] })
  ]);
  const bilan = leBilanParDomaine(points);
  assert.deepEqual(bilan.map((une) => une.domaine), ["acoustique", "structure", "incendie"]);
  assert.deepEqual(bilan[0], { domaine: "acoustique", annonce: 0, venu: 2, vise: 0 });
});

test("les trois cas se disent, et aucun ne se dit « mauvais »", () => {
  assert.equal(phraseDunDomaine({ annonce: 2, venu: 0, vise: 0 }), "annoncé, jamais venu");
  assert.equal(phraseDunDomaine({ annonce: 0, venu: 3, vise: 0 }), "venu, jamais annoncé");
  assert.equal(phraseDunDomaine({ annonce: 5, venu: 3, vise: 0 }), "annoncé ailleurs, jamais quand il est venu");
  assert.equal(phraseDunDomaine({ annonce: 5, venu: 4, vise: 3 }), "3 fois sur 4");
  assert.equal(phraseDunDomaine(null), "");

  for (const cas of [{ annonce: 2, venu: 0 }, { annonce: 0, venu: 3 }, { annonce: 5, venu: 3 }]) {
    assert.doesNotMatch(phraseDunDomaine(cas), /mauvais|bon\b|échec/);
  }
});

/**
 * **Un chantier qui ne parle jamais d'acoustique n'a rien à y prédire.** Le
 * savoir évite de chercher une panne là où il n'y a que le chantier.
 */
test("les domaines du vocabulaire jamais vus se nomment", () => {
  const points = lesPointsDeLaPrediction([
    unRendu({ predit: ["structure"], venu: [{ quoi: "incendie" }] })
  ]);
  assert.deepEqual(
    lesDomainesJamaisVus(points, ["structure", "incendie", "acoustique", "sol"]),
    ["acoustique", "sol"]
  );
});

test("la phrase des jamais vus tient sur une ligne", () => {
  const dite = laPhraseDesJamaisVus(["acoustique", "sol"]);
  // Sans espace ni saut parasite : le gabarit HTML la coupait en trois morceaux,
  // ce qui la rendait illisible à l'écran comme à la recherche.
  assert.match(dite, /^Jamais rencontrés sur ce chantier : acoustique, sol\./);
  assert.doesNotMatch(dite, /\n|  /);
  assert.equal(laPhraseDesJamaisVus([]), "");
  assert.equal(laPhraseDesJamaisVus(null), "");
});

test("rien n'entre, rien ne sort", () => {
  assert.deepEqual(lesPointsDeLaPrediction([]), []);
  assert.deepEqual(lesPointsDeLaPrediction(null), []);
  assert.deepEqual(leBilanParDomaine(null), []);
  assert.deepEqual(lesDomainesJamaisVus(null, null), []);
});
