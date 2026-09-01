import test from "node:test";
import assert from "node:assert/strict";

import {
  PRODUIT,
  UTILITAIRES,
  deductionsDeContrainte,
  derniereVersion,
  describeProvenance,
  numeroDeVersion,
  referenceOf,
  utilitaireByReference
} from "./catalogue.js";
import { RESERVE, RESERVES, phraseDeReserve } from "./reserves.js";

/* ── Le catalogue se tient ───────────────────────────────────────────────── */

test("chaque utilitaire porte un nom, une version et une source", () => {
  for (const outil of UTILITAIRES) {
    assert.ok(outil.nom, "un utilitaire sans nom est introuvable");
    assert.match(outil.version, /^V\d+$/, `version illisible : ${outil.nom}`);
    assert.ok(outil.source, `sans source, on ne sait pas quoi vérifier : ${outil.nom}`);
    assert.ok(outil.libelle, `sans libellé, l'écran ne peut rien dire : ${outil.nom}`);
  }
});

test("deux utilitaires ne partagent pas une référence", () => {
  // Deux fois la même référence, et la provenance d'une contrainte devient
  // ambiguë : on ne saurait plus quel code l'a produite.
  const references = UTILITAIRES.map(referenceOf);
  assert.equal(new Set(references).size, references.length);
});

test("le nom dit ce que fait l'utilitaire, pas seulement d'où il vient", () => {
  // « socotec_V1 » ne dit rien. « extraction_avis_rapports_socotec_V1 » si.
  for (const outil of UTILITAIRES) {
    assert.match(outil.nom, /^(deduction|extraction)_/, `nom peu parlant : ${outil.nom}`);
    assert.ok(outil.nom.split("_").length >= 3, `nom trop court pour être clair : ${outil.nom}`);
  }
});

test("une référence inconnue ne se rapproche pas de la plus proche", () => {
  assert.equal(utilitaireByReference("deduction_zone_neige_commune"), null, "sans version, ce n'est pas une référence");
  assert.equal(utilitaireByReference("deduction_zone_neige_commune_V9"), null);
  assert.ok(utilitaireByReference("deduction_zone_neige_commune_V1"));
});

test("V10 est postérieur à V2, et pas l'inverse", () => {
  // Comparer les textes ferait passer une montée de version pour un retour en
  // arrière, silencieusement.
  assert.ok(numeroDeVersion({ version: "V10" }) > numeroDeVersion({ version: "V2" }));
  assert.equal(numeroDeVersion({ version: "bientôt" }), 0);
});

test("la dernière version d'une lignée est celle de plus haut numéro", () => {
  const dernier = derniereVersion("deduction_zone_neige_commune");
  assert.equal(referenceOf(dernier), "deduction_zone_neige_commune_V1");
  assert.equal(derniereVersion("deduction_inexistante"), null);
});

test("la provenance nomme la source avant l'utilitaire", () => {
  // C'est la source qu'on va vérifier ; l'utilitaire dit comment on l'a lue.
  const dit = describeProvenance(utilitaireByReference("deduction_zone_sismique_georisques_V1"));
  assert.match(dit, /^Géorisques/);
  assert.match(dit, /deduction_zone_sismique_georisques_V1$/);
});

test("seules les déductions de contrainte sont parcourues au versement", () => {
  const contraintes = deductionsDeContrainte();
  assert.ok(contraintes.every((outil) => outil.produit === PRODUIT.CONTRAINTE));
  assert.ok(contraintes.every((outil) => outil.cleDonnee), "une déduction lit une donnée de base nommée");
  assert.ok(!contraintes.some((outil) => outil.nom.startsWith("extraction_")));
});

/* ── Chaque déduction s'abstient plutôt que d'inventer ───────────────────── */

test("aucune déduction ne rend de valeur sur un fait vide", () => {
  for (const outil of deductionsDeContrainte()) {
    assert.equal(outil.deduire({}), null, `${outil.nom} invente une valeur`);
    assert.equal(outil.deduire({ fact_value: {} }), null, `${outil.nom} invente une valeur`);
  }
});

test("aucune déduction n'émet une réserve hors vocabulaire", () => {
  // Un code inventé n'atteindrait l'écran sous aucune phrase, et le lecteur
  // verrait une réserve muette.
  const faits = {
    snow_zone: { fact_value: { zone: "A2", inputs: { altitude: 1200 } } },
    wind_zone: { fact_value: { zone: "2", inputs: {} } },
    frost_depth: { fact_value: { frost_depth_m: 0.81, inputs: {} } },
    seismic_zone: { fact_value: { value: "4 - Moyenne" } },
    argiles: { fact_value: { niveau: "Fort" } }
  };

  for (const outil of deductionsDeContrainte()) {
    const rendu = outil.deduire(faits[outil.cleDonnee] ?? {});
    assert.ok(rendu, `${outil.nom} n'a rien rendu sur son fait type`);
    for (const code of rendu.reserves) {
      assert.ok(RESERVES.includes(code), `${outil.nom} émet une réserve inconnue : ${code}`);
      assert.ok(phraseDeReserve(code), `${code} n'a pas de phrase`);
    }
  }
});

/* ── Ce que chaque déduction lit, et ce qu'elle refuse ───────────────────── */

test("une zone de neige au-dessus de 900 m ne suffit plus, sans être fausse", () => {
  const outil = utilitaireByReference("deduction_zone_neige_commune_V1");
  const rendu = outil.deduire({ fact_value: { zone: "C2", inputs: { altitude: 1240 } } });

  assert.equal(rendu.valeur, "C2", "on ne dilue pas l'énoncé sous prétexte de réserve");
  assert.ok(rendu.reserves.includes(RESERVE.ALTITUDE_HORS_TABLE));
});

test("une profondeur hors gel absente n'entre pas comme zéro", () => {
  // `Number(null)` vaut zéro : ce serait une cote de fondation au niveau du sol,
  // énoncée comme une règle.
  const outil = utilitaireByReference("deduction_profondeur_hors_gel_altitude_V1");

  assert.equal(outil.deduire({ fact_value: { frost_depth_m: null, inputs: {} } }), null);
  assert.equal(outil.deduire({ fact_value: { frost_depth_m: "", inputs: {} } }), null);
  assert.equal(outil.deduire({ fact_value: { frost_depth_m: 0.8125, inputs: {} } }).valeur, "0.81 m");
});

test("la zone sismique se lit quelle que soit la forme de la réponse", () => {
  const outil = utilitaireByReference("deduction_zone_sismique_georisques_V1");

  assert.match(outil.deduire({ fact_value: { value: "4 - Moyenne" } }).valeur, /^4 — Moyenne$/);
  assert.match(outil.deduire({ fact_value: { data: { data: [{ code_zone: "3", libelle: "Modérée" }] } } }).valeur, /^3 — Modérée$/);
  assert.match(outil.deduire({ fact_value: { data: { results: [{ zone_sismicite: "2" }] } } }).valeur, /^2$/);
});

test("la zone sismique s'abstient plutôt que de prendre un chiffre au hasard", () => {
  // Une population de 12 000 habitants n'est pas une zone de sismicité.
  const outil = utilitaireByReference("deduction_zone_sismique_georisques_V1");

  assert.equal(outil.deduire({ fact_value: { data: { data: [{ population: "12000" }] } } }), null);
  assert.equal(outil.deduire({ fact_value: { data: { data: [{ code_zone: "9" }] } } }), null, "hors de 1 à 5");
});

test("la zone sismique dit que sa portée est communale, et c'est la bonne portée", () => {
  // Le zonage sismique est réglementairement communal : la réserve informe, elle
  // n'accuse pas.
  const outil = utilitaireByReference("deduction_zone_sismique_georisques_V1");
  const rendu = outil.deduire({ fact_value: { value: "4 - Moyenne", codeInsee: "74010" } });

  assert.deepEqual(rendu.reserves, [RESERVE.PORTEE_COMMUNALE]);
});

test("l'argile retient le niveau le plus fort quand la réponse en porte plusieurs", () => {
  // Sur une parcelle à cheval, retenir le plus faible serait choisir
  // l'hypothèse la plus confortable.
  const outil = utilitaireByReference("deduction_retrait_gonflement_argiles_georisques_V1");
  const rendu = outil.deduire({
    fact_value: { data: { data: [{ exposition: "Faible" }, { exposition: "Fort" }] } }
  });

  assert.equal(rendu.valeur, "Fort");
});

test("l'argile n'invente pas un niveau hors du zonage", () => {
  // « Modéré » n'est pas « Moyen » : décider que si reviendrait à trancher à la
  // place de la carte.
  const outil = utilitaireByReference("deduction_retrait_gonflement_argiles_georisques_V1");

  assert.equal(outil.deduire({ fact_value: { data: { data: [{ exposition: "Modéré" }] } } }), null);
  assert.equal(outil.deduire({ fact_value: { data: { data: [{ commune: "Annecy" }] } } }), null);
  assert.equal(outil.deduire({ fact_value: { niveau: "A priori nul" } }).valeur, "Nul");
});

test("l'argile se lit au point du projet, et le dit", () => {
  const outil = utilitaireByReference("deduction_retrait_gonflement_argiles_georisques_V1");
  const rendu = outil.deduire({ fact_value: { niveau: "Moyen", latitude: 45.9, longitude: 6.1 } });

  assert.deepEqual(rendu.reserves, [RESERVE.PORTEE_PONCTUELLE]);
  assert.equal(rendu.entrees.latitude, 45.9);
});

/* ── Un fait sans entrées est déclaré inconnu, pas sûr ───────────────────── */

test("un fait écrit avant qu'on conserve les entrées se dit inconnu", () => {
  const outil = utilitaireByReference("deduction_zone_neige_commune_V1");
  const rendu = outil.deduire({ fact_value: { zone: "A2", department_code: "74" } });

  assert.deepEqual(rendu.reserves, [RESERVE.ENTREES_INCONNUES]);
});
