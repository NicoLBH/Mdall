/**
 * Le schéma : ce qu'il place, et ce qu'il refuse de laisser passer.
 *
 * On teste le modèle en mètres, pas le SVG : une semelle de 1,20 m reste une
 * semelle de 1,20 m quel que soit le cadre qui l'affiche, et un test qui
 * compterait des pixels casserait au premier ajustement de marge.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { modeleSchema, zoneComprimee, dessinerSchema, modeleFerraillage } from "./fondations-schema.js";

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

test("le tracé rend quatre vues, et le dit quand il n'a rien à tracer", () => {
  const svg = dessinerSchema({ ...SEMELLE_SEULE, sectionLx: 1.2, sectionLy: 1.8 });
  assert.equal((svg.match(/<svg/g) || []).length, 4);
  assert.match(svg, /Ferraillage — coupe suivant X/);
  assert.match(svg, /Coupe suivant l'axe X/);
  // Deux coupes plutôt qu'un interrupteur : sans quoi Ly ne se voit qu'après
  // un clic qu'on ne pense pas à faire, et on ne compare plus rien.
  assert.match(svg, /Coupe suivant l'axe Y/);
  assert.match(svg, /Vue en plan/);
  assert.match(svg, /Lx = 1,20 m/);
  assert.match(svg, /Ly = 1,80 m/);

  const rien = dessinerSchema({ sectionLx: 0, sectionLy: 0, hauteurLz: 0 });
  assert.match(rien, /demande une semelle/);
  assert.ok(!rien.includes("<svg"));
});

test("l'échelle est commune aux deux vues, et elle est écrite", () => {
  const svg = dessinerSchema({ ...SEMELLE_SEULE, sectionLx: 4, sectionLy: 1 });
  assert.match(svg, /1 m ≈ \d+ px/);
});

/* ── Le ferraillage ──────────────────────────────────────────────────────── */

const FERRAILLEE = {
  sectionLx: 2, sectionLy: 1.5, hauteurLz: 0.6, araseSuperieure: -0.5, enrobageSemelle: 5,
  ferraillage: {
    AIX: { nombre: 6, barre: "HA12" },
    AIY: { nombre: 8, barre: "HA10" },
    ASX: { nombre: 0, barre: "HA8" },
    ASY: { nombre: 4, barre: "HA8" }
  }
};

test("chaque nappe se pose à sa face, derrière son enrobage", () => {
  const mf = modeleFerraillage(FERRAILLEE);
  const par = Object.fromEntries(mf.nappes.map((n) => [n.cle, n]));

  // Les inférieures se comptent depuis le dessus : elles sont vers le bas.
  assert.ok(par.AIX.profondeur > 0.5 && par.AIX.profondeur < 0.6);
  // Les supérieures sont à l'enrobage sous l'arase.
  assert.ok(par.ASY.profondeur > 0 && par.ASY.profondeur < 0.1);
  // La nappe X touche le coffrage, la nappe Y se pose dessus : plus à l'intérieur.
  assert.ok(par.AIY.profondeur < par.AIX.profondeur);
});

test("les barres se répartissent sur la portée qui les concerne", () => {
  const par = Object.fromEntries(modeleFerraillage(FERRAILLEE).nappes.map((n) => [n.cle, n]));
  // Six barres suivant X se répartissent sur Ly (1,50 m) moins deux enrobages.
  assert.equal(par.AIX.abscisses.length, 6);
  assert.equal(Number(par.AIX.abscisses.at(-1).toFixed(3)), 0.7);
  assert.equal(Number(par.AIX.espacement.toFixed(3)), 0.28);
  // Huit barres suivant Y se répartissent sur Lx (2,00 m).
  assert.equal(Number(par.AIY.abscisses.at(-1).toFixed(3)), 0.95);
});

test("une barre seule se pose au milieu, pas au bord", () => {
  const mf = modeleFerraillage({ ...FERRAILLEE, ferraillage: { AIX: { nombre: 1, barre: "HA12" } } });
  assert.deepEqual(mf.nappes.find((n) => n.cle === "AIX").abscisses, [0]);
});

test("une nappe sans barre reste dessinée : « aucune » est une information", () => {
  const svg = dessinerSchema(FERRAILLEE);
  assert.match(svg, /data-schema-nappe="ASX"/);
  assert.match(svg, /fondations-schema__nappe-absente/);
  assert.match(svg, /aucune barre posée/);
});

test("la nappe survolée est la seule marquée, et elle se nomme", () => {
  const svg = dessinerSchema(FERRAILLEE, null, { nappe: "AIY" });
  assert.equal((svg.match(/est-survolee/g) || []).length, 1);
  assert.match(svg, /Nappe inférieure axe Y — 8 HA10/);

  // Sans survol, le dessin invite plutôt que de désigner une nappe au hasard.
  assert.doesNotMatch(dessinerSchema(FERRAILLEE), /est-survolee/);
  assert.match(dessinerSchema(FERRAILLEE), /Survolez une nappe/);
});

test("les barres suivant X se voient en long, celles suivant Y en bout", () => {
  const svg = dessinerSchema(FERRAILLEE);
  // Huit barres AIY en bout, plus quatre ASY : douze cercles.
  assert.equal((svg.match(/fondations-schema__barre-bout/g) || []).length, 12);
  // AIX en long : un seul trait, quel que soit son nombre de barres.
  assert.equal((svg.match(/fondations-schema__barre-long/g) || []).length, 1);
});
