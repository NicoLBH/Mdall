import test from "node:test";
import assert from "node:assert/strict";

import { DOMAIN, NATURE } from "./assertion-taxonomy.js";
import {
  DERIVED_CONSTRAINT_KIND,
  INPUTS,
  RESERVE,
  confidenceOf,
  constraintsFromContextFacts,
  describeReserves,
  inputsStateOf,
  plannedConstraintRows,
  reservesOf
} from "./derived-constraints.js";

const fait = (factKey, factValue, patch = {}) => ({
  fact_key: factKey,
  fact_value: factValue,
  source_type: "studio_tool",
  source_ref: "snow",
  updated_at: "2026-08-30T10:00:00.000Z",
  ...patch
});

const neige = (patch = {}) => fait("snow_zone", { zone: "A2", inputs: { altitude: 450, code_insee: "74010" } }, patch);

/* ── Une zone est une contrainte, pas une hypothèse ──────────────────────── */

test("une zone de neige entre comme contrainte", () => {
  const [contrainte] = constraintsFromContextFacts([neige()]);

  assert.equal(contrainte.statement, "Zone de neige : A2");
  assert.equal(contrainte.domain, DOMAIN.STRUCTURE);
});

test("une contrainte du site est versée avec la nature contrainte, sans proposition", () => {
  const [ligne] = plannedConstraintRows({
    projectId: "p1",
    candidates: constraintsFromContextFacts([neige()]),
    at: "2026-08-31T00:00:00.000Z"
  });

  assert.equal(ligne.nature, NATURE.CONTRAINTE);
  assert.equal(ligne.kind, DERIVED_CONSTRAINT_KIND);
  assert.equal(ligne.proposition_id, null, "elle ne vient d'aucun dépôt");
  assert.equal(ligne.subject_key, "site:snow_zone");
});

test("la clé porte le sujet et non la valeur", () => {
  // Sinon A2 puis B1 feraient deux contraintes en vigueur au lieu d'une qui a
  // été corrigée.
  const avant = constraintsFromContextFacts([neige()])[0];
  const apres = constraintsFromContextFacts([fait("snow_zone", { zone: "B1", inputs: { altitude: 450 } })])[0];

  assert.equal(avant.subjectKey, apres.subjectKey);
});

test("la profondeur hors gel relève du sol, pas de la structure", () => {
  const [gel] = constraintsFromContextFacts([
    fait("frost_depth", { frost_depth_m: 0.8125, inputs: { altitude: 450 } }, { source_ref: "frost" })
  ]);

  assert.equal(gel.domain, DOMAIN.SOL);
  assert.match(gel.statement, /0,81 m|0\.81 m/);
});

test("les contraintes sortent dans l'ordre du métier, pas dans celui de la table", () => {
  const rendu = constraintsFromContextFacts([
    fait("frost_depth", { frost_depth_m: 0.8, inputs: {} }),
    fait("seismic_zone", { value: "Zone 4" }, { source_type: "georisques" }),
    neige()
  ]);

  assert.deepEqual(rendu.map((c) => c.factKey), ["snow_zone", "seismic_zone", "frost_depth"]);
});

/* ── Ce que Géorisques ne produit pas ────────────────────────────────────── */

test("un risque naturel de Géorisques ne devient pas une contrainte", () => {
  // Géorisques répond par commune. « Un PPRi existe » n'est pas « votre
  // parcelle est en zone réglementée » — en faire une règle serait le pire des
  // faux positifs.
  const rendu = constraintsFromContextFacts([
    fait("natural_risks", { risks: ["PPRi", "Retrait-gonflement"] }, { source_type: "georisques" }),
    fait("georisques_summary", { datasetsCount: 12 }, { source_type: "georisques" })
  ]);

  assert.deepEqual(rendu, []);
});

test("un fait sans valeur lisible ne produit pas une contrainte vide", () => {
  assert.deepEqual(constraintsFromContextFacts([fait("snow_zone", { zone: "" })]), []);
  assert.deepEqual(constraintsFromContextFacts([fait("frost_depth", { frost_depth_m: null })]), []);
});

test("aucune contrainte n'est inventée : chaque ligne vient d'un fait", () => {
  assert.deepEqual(constraintsFromContextFacts([]), []);
  assert.deepEqual(constraintsFromContextFacts(), []);
});

/* ── La confiance porte sur les entrées, jamais sur la règle ─────────────── */

test("un canton qui a changé depuis 2014 abaisse la confiance et se dit", () => {
  const doute = neige();
  doute.fact_value = { zone: "A2", inputs: { altitude: 450 }, reserves: [RESERVE.CANTON_2014] };

  const [contrainte] = constraintsFromContextFacts([doute]);

  assert.equal(contrainte.inputsState, INPUTS.A_VERIFIER);
  assert.equal(contrainte.confidence, 0.5);
  assert.match(describeReserves(contrainte.reserves), /2014/);
});

test("la règle n'est jamais en doute : seule la valeur de la zone reste écrite", () => {
  const doute = neige();
  doute.fact_value = { zone: "A2", inputs: { altitude: 450 }, reserves: [RESERVE.CANTON_2014] };

  const [contrainte] = constraintsFromContextFacts([doute]);

  assert.equal(contrainte.statement, "Zone de neige : A2", "on ne dilue pas l'énoncé sous prétexte de réserve");
});

test("au-delà de 900 m, la valeur ne suffit plus — et ce n'est pas la même chose qu'une erreur", () => {
  const [contrainte] = constraintsFromContextFacts([
    fait("snow_zone", { zone: "C2", inputs: { altitude: 1240 } })
  ]);

  assert.ok(contrainte.reserves.includes(RESERVE.ALTITUDE_HORS_TABLE));
  assert.match(describeReserves(contrainte.reserves), /900 m/);
});

test("un hors-gel sans altitude le dit : la formule en avait besoin", () => {
  const [gel] = constraintsFromContextFacts([
    fait("frost_depth", { frost_depth_m: 0.6, inputs: { code_insee: "74010" } })
  ]);

  assert.ok(gel.reserves.includes(RESERVE.ALTITUDE_ABSENTE));
});

test("un fait qui ne dit pas sur quoi il a été calculé est déclaré inconnu, pas sûr", () => {
  // C'est le cas de tous les faits écrits avant qu'on conserve les entrées.
  const [contrainte] = constraintsFromContextFacts([fait("snow_zone", { zone: "A2", department_code: "74" })]);

  assert.deepEqual(contrainte.reserves, [RESERVE.ENTREES_INCONNUES]);
  assert.equal(contrainte.inputsState, INPUTS.INCONNUES);
  assert.equal(contrainte.confidence, null, "ne pas savoir ne s'annonce pas comme un demi");
});

test("aucune réserve ne se dit sans prétendre à la certitude", () => {
  assert.equal(confidenceOf([]), 1);
  assert.equal(inputsStateOf([]), INPUTS.SURES);
  assert.match(describeReserves([]), /Aucune réserve/);
});

test("une réserve inconnue du vocabulaire est ignorée plutôt que recopiée", () => {
  // Un producteur qui inventerait un code ne doit pas pouvoir écrire n'importe
  // quoi sur l'écran de quelqu'un.
  const bruit = neige();
  bruit.fact_value = { zone: "A2", inputs: {}, reserves: ["ciel-couvert"] };

  assert.deepEqual(constraintsFromContextFacts([bruit])[0].reserves, []);
});

/* ── Deux versions d'un même fait ne font pas deux règles ────────────────── */

test("le fait le plus récent l'emporte", () => {
  const rendu = constraintsFromContextFacts([
    fait("snow_zone", { zone: "A1", inputs: {} }, { updated_at: "2026-08-01T00:00:00.000Z" }),
    fait("snow_zone", { zone: "A2", inputs: {} }, { updated_at: "2026-08-30T00:00:00.000Z" })
  ]);

  assert.equal(rendu.length, 1);
  assert.equal(rendu[0].value, "A2");
});

/* ── Ce qui est versé garde de quoi être corrigé ─────────────────────────── */

test("la ligne versée garde ses réserves et ses entrées", () => {
  const doute = neige();
  doute.fact_value = { zone: "A2", inputs: { altitude: 450 }, reserves: [RESERVE.CANTON_2014] };

  const [ligne] = plannedConstraintRows({
    projectId: "p1",
    candidates: constraintsFromContextFacts([doute])
  });

  assert.deepEqual(ligne.payload.reserves, [RESERVE.CANTON_2014]);
  assert.equal(ligne.payload.factKey, "snow_zone");
  assert.equal(ligne.payload.computedAt, "2026-08-30T10:00:00.000Z");
  assert.match(ligne.detail, /2014/, "la réserve se lit sans ouvrir le payload");
});

test("rien ne se verse sans projet", () => {
  assert.deepEqual(plannedConstraintRows({ candidates: constraintsFromContextFacts([neige()]) }), []);
});

test("reservesOf ne suppose rien d'un fait vide", () => {
  assert.deepEqual(reservesOf({}), [RESERVE.ENTREES_INCONNUES]);
});
