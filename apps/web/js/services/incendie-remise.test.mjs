import test from "node:test";
import assert from "node:assert/strict";

import {
  reponsesDeLaRemise, planDeLaRemiseIncendie, etudeCompletee, nomDeLEtudeVenueDuCopilote
} from "./incendie-remise.js";

const ETUDE = {
  logementsSuperposes: true,
  etagesSurRdc: 3,
  niveauxEnSousSol: 1
};

test("les réponses viennent du serveur, pas d'une traduction faite ici", () => {
  assert.deepEqual(reponsesDeLaRemise({ pourLAtelier: { reponses: { etagesSurRdc: 3 } } }),
    { etagesSurRdc: 3 });
  // Un résultat qui n'en porte pas ne se devine pas : la correspondance entre
  // une entrée d'utilitaire et une question du référentiel reste au serveur.
  assert.equal(reponsesDeLaRemise({ valeurs: { reponse: "CF 1/2 h" } }), null);
  assert.equal(reponsesDeLaRemise(null), null);
});

test("ce que l'étude ignore s'ajoute, ce qu'elle dit déjà ne bouge pas", () => {
  const plan = planDeLaRemiseIncendie(
    { etagesSurRdc: 3, duplexOuTriplexAuDernierEtage: false, typeEscalierRetenu: "encloisonne" },
    ETUDE);

  assert.deepEqual(plan.neuves, { duplexOuTriplexAuDernierEtage: false, typeEscalierRetenu: "encloisonne" });
  assert.equal(plan.combienNeuves, 2);
  assert.equal(plan.identiques, 1);
  assert.deepEqual(plan.differentes, []);
});

test("« 3 » et 3 sont d'accord — un écart de forme n'est pas un désaccord", () => {
  const plan = planDeLaRemiseIncendie({ etagesSurRdc: "3", logementsSuperposes: "true" }, ETUDE);
  assert.equal(plan.identiques, 2);
  assert.deepEqual(plan.differentes, []);
});

test("ce que l'étude dit autrement s'affiche, et ne s'écrase pas", () => {
  // « Et si c'était une 2e famille ? » : la discussion a exploré autre chose.
  // Les deux réponses ont un auteur, ce n'est pas au copilote de trancher.
  const plan = planDeLaRemiseIncendie({ etagesSurRdc: 1 }, ETUDE);

  assert.deepEqual(plan.neuves, {});
  assert.deepEqual(plan.differentes, [{ cle: "etagesSurRdc", dansLEtude: 3, dansLaDiscussion: 1 }]);
  assert.equal(etudeCompletee(ETUDE, plan).etagesSurRdc, 3);
});

test("une remise qui n'apporte rien le dit", () => {
  assert.equal(planDeLaRemiseIncendie({ etagesSurRdc: 3 }, ETUDE).rienAFaire, true);
  assert.equal(planDeLaRemiseIncendie({ etagesSurRdc: 1 }, ETUDE).rienAFaire, false);
  assert.equal(planDeLaRemiseIncendie({ sousSol: "oui" }, ETUDE).rienAFaire, false);
});

test("une réponse vide n'est pas une réponse", () => {
  const plan = planDeLaRemiseIncendie({ implantation: "", surfaceParc: null, quadruplexOuPlus: false }, {});
  assert.deepEqual(plan.neuves, { quadruplexOuPlus: false });
});

test("sans étude ouverte, tout est neuf", () => {
  const plan = planDeLaRemiseIncendie({ etagesSurRdc: 3, logementsSuperposes: true }, {});
  assert.equal(plan.combienNeuves, 2);
  assert.deepEqual(etudeCompletee(undefined, plan), { etagesSurRdc: 3, logementsSuperposes: true });
});

test("une étude ouverte depuis une discussion le dit dans son nom", () => {
  assert.equal(nomDeLEtudeVenueDuCopilote(new Date("2026-09-04T10:00:00Z")),
    "Depuis une discussion — 4 septembre 2026");
});
