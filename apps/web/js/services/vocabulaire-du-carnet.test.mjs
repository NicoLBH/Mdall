import test from "node:test";
import assert from "node:assert/strict";

import { champsDuCarnet } from "./vocabulaire-du-carnet.js";
import { situationsDeLecture } from "./lectures-du-carnet.js";
import { CLES_DE_LA_CHARGE } from "./charge-des-sujets.js";

const CHARGE = {
  subjects: [
    { id: "s-1", project_id: "p-bertrand", title: "Étanchéité" },
    { id: "s-2", project_id: "p-novaclim", title: "Chaufferie" }
  ],
  labels: [{ id: "l-cr", name: "CR chantier" }],
  objectives: [{ id: "o-1", title: "Livraison" }]
};

const PERSONNES = [{ personId: "u-1", name: "Manoa" }, { personId: "u-2", name: "Camille" }];

/**
 * **Les personnes commandent trois lectures du rail.** `champsDesSujets` ne
 * déclare un champ que s'il a des valeurs : sans personne connue, « Assigné à
 * moi », « Créé par moi » et « Mentions » disparaissent — un rail qui ne montre
 * qu'une entrée sur quatre, sans que rien ne dise pourquoi (règle 5).
 */
test("sans les personnes, trois lectures du rail disparaissent", () => {
  const avec = situationsDeLecture(champsDuCarnet({ charge: CHARGE, personnes: PERSONNES }));
  const sans = situationsDeLecture(champsDuCarnet({ charge: CHARGE, personnes: [] }));

  assert.deepEqual(avec.map((s) => s.title), ["Assigné à moi", "Créé par moi", "Mentions", "Activité récente"]);
  assert.deepEqual(sans.map((s) => s.title), ["Activité récente"], "c'est pour cela qu'on les charge");
});

test("le carnet parle des labels et des objectifs de ses chantiers", () => {
  const cles = champsDuCarnet({ charge: CHARGE, personnes: PERSONNES }).map((champ) => champ.key);

  assert.ok(cles.includes("label"));
  assert.ok(cles.includes("objectif"));
  assert.ok(cles.includes("statut"), "et de ce que tout écran sait dire");
});

/**
 * Les chantiers proposés sont ceux que la liste contient — en proposer un qui
 * n'y est pas promettrait un résultat vide.
 */
test("le champ des chantiers ne propose que ceux qui sont là", () => {
  const champ = champsDuCarnet({
    charge: CHARGE,
    personnes: PERSONNES,
    nomsDesProjets: { "p-bertrand": "Résidence Bertrand", "p-novaclim": "Novaclim", "p-absent": "Ailleurs" }
  }).find((entree) => entree.key === "projet");

  assert.deepEqual(champ.values.map((valeur) => valeur.label), ["Résidence Bertrand", "Novaclim"]);
});

/**
 * **Ce que la base n'a pas su lire ne se propose pas.** `false` n'est pas
 * « aucun signal » : c'est « on ne sait pas », et « Mentions » comme « Activité
 * récente » ne rendraient jamais rien (règle 5).
 */
test("sans les signaux, on ne propose pas ce qu'on ne peut pas tenir", () => {
  const muette = { ...CHARGE, [CLES_DE_LA_CHARGE.signauxLus]: false };
  const cles = champsDuCarnet({ charge: muette, personnes: PERSONNES }).map((champ) => champ.key);

  assert.ok(!cles.includes("mention"));
  assert.ok(!cles.includes("activité"));
  assert.ok(cles.includes("assigné"), "mais ce qui ne dépend pas des signaux reste");
});

/**
 * Un carnet vide se dessine quand même : on ne lève pas avant d'avoir chargé.
 *
 * **« Activité récente » y est, et c'est juste.** Sans charge, on ne sait pas
 * si la base a su lire les signaux — et ne pas savoir n'est pas savoir qu'ils
 * manquent (règle 5). C'est `signauxLus: false` qui retire la lecture, pas
 * l'absence de réponse.
 */
test("sans charge, le vocabulaire est court mais existe", () => {
  const cles = champsDuCarnet().map((champ) => champ.key);

  assert.deepEqual(cles, ["statut", "priorité", "bloqué", "activité"]);
  assert.ok(!cles.includes("assigné"), "aucune personne connue : le champ ne se déclare pas");
  assert.ok(!cles.includes("label"));
});
