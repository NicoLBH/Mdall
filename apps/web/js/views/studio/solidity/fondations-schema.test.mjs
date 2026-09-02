/**
 * Le schéma : ce qu'il place, et ce qu'il refuse de laisser passer.
 *
 * On teste le modèle en mètres, pas le SVG : une semelle de 1,20 m reste une
 * semelle de 1,20 m quel que soit le cadre qui l'affiche, et un test qui
 * compterait des pixels casserait au premier ajustement de marge.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { modeleSchema, zoneComprimee, dessinerSchema } from "./fondations-schema.js";

const SEMELLE_SEULE = { araseSuperieure: -0.1, hauteurLz: 1, sectionLx: 1.2, sectionLy: 1.2 };

test("sans fût, les charges s'appliquent sur l'arase de la semelle", () => {
  const m = modeleSchema(SEMELLE_SEULE);
  assert.equal(m.futExiste, false);
  assert.equal(m.fut, null);
  assert.equal(m.pointCharge.z, -0.1);
  assert.deepEqual(m.alertes, []);
});

test("les quatre niveaux se déduisent des cotes, dans l'ordre du terrain vers l'assise", () => {
  const m = modeleSchema({ ...SEMELLE_SEULE, araseSuperieure: -0.4, hauteurLz: 0.8, hauteurFut: 0.2, futA: 0.3, futB: 0.3 });
  assert.equal(m.niveaux.terrain, 0);
  assert.equal(m.niveaux.teteFut, -0.2);          // L9 + L12
  assert.equal(m.niveaux.arase, -0.4);            // L9
  assert.ok(Math.abs(m.niveaux.assise - -1.2) < 1e-12); // L9 - L10
  // Les charges montent en tête de fût : c'est ce que `BA150 = L10 + L12` dit.
  assert.equal(m.pointCharge.z, m.niveaux.teteFut);
});

test("un fût sans section n'existe pas, comme dans le calcul", () => {
  // Le classeur annule le poids propre et les aciers du fût par `I13*L13*L12 = 0`.
  for (const nul of [{ futA: 0 }, { futB: 0 }, { hauteurFut: 0 }]) {
    const m = modeleSchema({ ...SEMELLE_SEULE, hauteurFut: 0.5, futA: 0.3, futB: 0.3, ...nul });
    assert.equal(m.futExiste, false);
  }
});

test("le point d'application cumule les deux excentrements", () => {
  const m = modeleSchema({ ...SEMELLE_SEULE, hauteurFut: 0.3, futA: 0.3, futB: 0.3,
    excentrementFutX: 0.1, excentrementChargeX: 0.05,
    excentrementFutY: -0.2, excentrementChargeY: 0.05 });
  assert.ok(Math.abs(m.pointCharge.x - 0.15) < 1e-12);
  assert.ok(Math.abs(m.pointCharge.y - -0.15) < 1e-12);
});

test("la butée est ramenée dans la hauteur de semelle, comme BJ79 et BJ80", () => {
  const m = modeleSchema({ ...SEMELLE_SEULE, buteeMobilisee: 60, buteeZi: -0.05, buteeZf: -9 });
  assert.equal(m.butee.haut, -0.1);   // remontée à l'arase
  assert.ok(Math.abs(m.butee.bas - -1.1) < 1e-12); // descendue à l'assise
});

test("une butée non mobilisée n'est pas dessinée", () => {
  assert.equal(modeleSchema({ ...SEMELLE_SEULE, buteeMobilisee: 0 }).butee, null);
});

test("le schéma nomme les géométries que le calcul accepterait en silence", () => {
  const debordant = modeleSchema({ ...SEMELLE_SEULE, hauteurFut: 0.3, futA: 2, futB: 2 });
  assert.ok(debordant.alertes.some((a) => /plus large/.test(a)));

  const horsSol = modeleSchema({ ...SEMELLE_SEULE, araseSuperieure: -0.1, hauteurFut: 0.5, futA: 0.2, futB: 0.2 });
  assert.ok(horsSol.alertes.some((a) => /dépasse le niveau/.test(a)));

  const chargeDehors = modeleSchema({ ...SEMELLE_SEULE, excentrementFutX: 3 });
  assert.ok(chargeDehors.alertes.some((a) => /hors de la semelle/.test(a)));

  const decalé = modeleSchema({ ...SEMELLE_SEULE, hauteurFut: 0.05, futA: 0.4, futB: 0.4, excentrementFutX: 0.5 });
  assert.ok(decalé.alertes.some((a) => /déborde/.test(a)));
});

test("la surface d'appui se déduit des excentrements rendus par le calcul", () => {
  const zone = zoneComprimee(
    { contrainte: { excentrements: { ex: 0.2, ey: -0.1 } } },
    { sectionLx: 1.6, sectionLy: 1 }
  );
  // Meyerhoff : le rectangle réduit vaut (Lx − 2ex) × (Ly − 2ey), centré sur la résultante.
  assert.ok(Math.abs(zone.rectangle.largeur - 1.2) < 1e-12);
  assert.ok(Math.abs(zone.rectangle.profondeur - 0.8) < 1e-12);
  assert.ok(Math.abs(zone.rectangle.cx - 0.2) < 1e-12);
  assert.ok(Math.abs(zone.rectangle.cy - -0.1) < 1e-12);
  assert.ok(Math.abs(zone.pourcentage - 60) < 1e-9);
});

test("une résultante hors de la semelle donne une surface nulle, pas un rectangle négatif", () => {
  const zone = zoneComprimee(
    { contrainte: { excentrements: { ex: 0.9, ey: 0 } } },
    { sectionLx: 1.6, sectionLy: 1 }
  );
  assert.equal(zone.rectangle, null);
  assert.equal(zone.pourcentage, 0);
});

test("sans excentrements rendus, rien n'est dessiné plutôt qu'une surface supposée", () => {
  assert.equal(zoneComprimee(null, { sectionLx: 1.2, sectionLy: 1.2 }), null);
  assert.equal(zoneComprimee({ contrainte: {} }, { sectionLx: 1.2, sectionLy: 1.2 }), null);
});

test("le tracé rend deux vues, et le dit quand il n'a rien à tracer", () => {
  const svg = dessinerSchema(SEMELLE_SEULE);
  assert.equal((svg.match(/<svg/g) || []).length, 2);
  assert.match(svg, /Coupe suivant l'axe X/);
  assert.match(svg, /Vue en plan/);
  assert.match(svg, /Lx = 1,20 m/);

  const rien = dessinerSchema({ sectionLx: 0, sectionLy: 0, hauteurLz: 0 });
  assert.match(rien, /demande une semelle/);
  assert.ok(!rien.includes("<svg"));
});

test("l'échelle est commune aux deux vues, et elle est écrite", () => {
  const svg = dessinerSchema({ ...SEMELLE_SEULE, sectionLx: 4, sectionLy: 1 });
  assert.match(svg, /1 m ≈ \d+ px/);
});
