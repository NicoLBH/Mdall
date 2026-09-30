/**
 * Ce que l'écran des Indicateurs montre de la prédiction.
 *
 * Un pourcentage ne dit pas si le système travaille : ce fichier éprouve le
 * face-à-face — annoncé, venu, visé — qui, lui, le dit.
 */

import test from "node:test";
import assert from "node:assert/strict";

/* ── Ce que la prédiction voit ───────────────────────────────────────────── */

const unePrediction = (rendus) => ([{
  cle: "frequent", dit: "Le plus fréquent", quoi: "compte les domaines",
  mesure: { froid: false, sur: 6, precision1: 0.4, precision3: 0.6, fausseAlerte: 0.2, avance: 12, rendus }
}]);

test("le tableau nomme les domaines, et ce qu'ils ont valu", async () => {
  const { renderCeQueLaPredictionVoit } = await import("./forme-du-chantier.js");
  const dessine = renderCeQueLaPredictionVoit(unePrediction([
    { quand: "2025-01-10T00:00:00Z", predit: ["structure", "incendie"], venu: [{ quoi: "structure" }], notable: true },
    { quand: "2025-02-10T00:00:00Z", predit: ["structure"], venu: [{ quoi: "acoustique" }], notable: true }
  ]), ["structure", "incendie", "acoustique", "sol"]);

  // Le libellé de la taxonomie, pas la clé : « Structure », comme partout.
  assert.match(dessine, /Structure/);
  assert.match(dessine, /annoncé 2 · venu 1 · visé 1/);
  // Celui qui est venu sans jamais être annoncé : c'est ce qu'un pourcentage
  // ne dit pas.
  assert.match(dessine, /venu, jamais annoncé/);
  // Et celui que le chantier n'a jamais rencontré : pas une panne.
  assert.match(dessine, /Jamais rencontrés sur ce chantier : Sol/);
});

test("un domaine hors taxonomie garde sa clé plutôt que de devenir « Non classé »", async () => {
  // `domainLabel` rend « Non classé » à tout ce qu'il ne connaît pas. Deux
  // domaines inconnus porteraient alors le même nom dans le tableau, et l'on ne
  // saurait plus lequel le prédicteur propose pour rien — c'est l'unique
  // question à laquelle ce tableau sert à répondre.
  const { renderCeQueLaPredictionVoit } = await import("./forme-du-chantier.js");
  const dessine = renderCeQueLaPredictionVoit(unePrediction([
    { quand: "2025-01-10T00:00:00Z", predit: ["etancheite"], venu: [{ quoi: "vrd" }], notable: true }
  ]), ["structure"]);

  assert.match(dessine, /etancheite/);
  assert.match(dessine, /vrd/);
  assert.doesNotMatch(dessine, /Non classé/);
});

test("une mesure trop froide ne dessine rien", async () => {
  // « 100 % sur deux points » serait un mensonge par omission, et le détail de
  // ces deux points aussi.
  const { renderCeQueLaPredictionVoit } = await import("./forme-du-chantier.js");
  const froide = [{ dit: "Le plus fréquent", mesure: { froid: true, sur: 2, rendus: [] } }];
  assert.equal(renderCeQueLaPredictionVoit(froide, ["structure"]), "");
  assert.equal(renderCeQueLaPredictionVoit([], ["structure"]), "");
  assert.equal(renderCeQueLaPredictionVoit(null, null), "");
});

test("un prédicteur sans point notable ne dessine pas un tableau vide", async () => {
  const { renderCeQueLaPredictionVoit } = await import("./forme-du-chantier.js");
  const dessine = renderCeQueLaPredictionVoit(unePrediction([
    { quand: "2025-01-10T00:00:00Z", predit: ["structure"], venu: [], notable: false }
  ]), ["structure"]);
  // **Ni ligne, ni section.** Sans bilan, `bilan.map` ne rend rien de lui-même :
  // ce que la garde évite, c'est le titre « Le plus fréquent » posé au-dessus
  // du vide, et la phrase des jamais vus qui nommerait alors tout le
  // vocabulaire — un écran qui dit « jamais rencontré » de huit domaines quand
  // il n'a simplement rien mesuré.
  assert.doesNotMatch(dessine, /forme-reference__ligne/);
  assert.doesNotMatch(dessine, /prediction-vue__titre|Le plus fréquent/);
  assert.doesNotMatch(dessine, /Jamais rencontrés/);
});
