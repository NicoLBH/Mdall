import test from "node:test";
import assert from "node:assert/strict";

import { contextFactsFromGeorisques } from "./georisques-context-facts.js";

const reponse = (datasets = []) => ({
  commune: { name: "Annecy", codeInsee: "74010", lat: 45.8992, lon: 6.1294 },
  requestedAt: "2026-09-01T10:00:00.000Z",
  datasets
});

const jeu = (key, data, status = "success") => ({ key, label: key, status, url: `https://x/${key}`, data });

test("le zonage sismique et l'argile sont conservés", () => {
  const faits = contextFactsFromGeorisques(reponse([
    jeu("zonage_sismique", { data: [{ code_zone: "4" }] }),
    jeu("retrait_gonflement_argiles", { data: [{ exposition: "Moyen" }] })
  ]));

  assert.deepEqual(faits.map((f) => f.factKey), ["seismic_zone", "argiles"]);
});

test("les treize autres jeux ne deviennent pas des données de base", () => {
  // « Un PPRi existe sur cette commune » n'établit rien sur une parcelle, et un
  // fait conservé finit toujours par être lu comme un fait établi.
  const faits = contextFactsFromGeorisques(reponse([
    jeu("ppr", { data: [{ libelle: "PPRi du Fier" }] }),
    jeu("catnat", { data: [{ libelle: "Inondation 1999" }] }),
    jeu("radon", { data: [{ classe: "3" }] }),
    jeu("cavites", { data: [] })
  ]));

  assert.deepEqual(faits, []);
});

test("on conserve la réponse brute, pas notre lecture", () => {
  // Enregistrer une valeur déjà interprétée figerait la lecture d'aujourd'hui
  // dans une donnée censée durer : une V2 ne pourrait plus rien y corriger.
  const brut = { data: [{ code_zone: "4", libelle: "Moyenne" }] };
  const [sismique] = contextFactsFromGeorisques(reponse([jeu("zonage_sismique", brut)]));

  assert.deepEqual(sismique.factValue.data, brut);
  assert.equal(sismique.factValue.codeInsee, "74010");
});

test("l'argile garde le point où l'aléa a été lu", () => {
  const [argile] = contextFactsFromGeorisques(reponse([
    jeu("retrait_gonflement_argiles", { data: [{ alea: "Fort" }] })
  ]));

  assert.equal(argile.factValue.latitude, 45.8992);
  assert.equal(argile.factValue.longitude, 6.1294);
});

test("un jeu en erreur ne produit pas de donnée de base vide", () => {
  // Mieux vaut aucune donnée qu'une donnée vide, qu'une déduction lirait ensuite
  // comme « on a regardé et il n'y a rien ».
  const faits = contextFactsFromGeorisques(reponse([
    jeu("zonage_sismique", null, "error"),
    jeu("retrait_gonflement_argiles", null)
  ]));

  assert.deepEqual(faits, []);
});

test("une réponse vide ne conserve rien", () => {
  assert.deepEqual(contextFactsFromGeorisques({}), []);
  assert.deepEqual(contextFactsFromGeorisques(), []);
});
