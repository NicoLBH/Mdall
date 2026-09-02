/**
 * Ce que le classeur rend, figé.
 *
 * Ces valeurs n'ont pas été calculées de tête ni recopiées d'un manuel : elles
 * sortent de `CALMAS__Fondations.xlsx` recalculé par LibreOffice sur les mêmes
 * entrées. Le classeur est l'étalon ; ces tests sont là pour qu'on s'aperçoive
 * le jour où le moteur s'en écarte, y compris dans une décimale lointaine.
 *
 * Une divergence ici ne se rattrape pas en ajustant la valeur attendue : elle
 * se cherche dans le classeur, à la case près — les commentaires de `calcul.js`
 * donnent les références.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { calculerStabiliteExterne, DEFAUTS, REGLEMENTS } from "./calcul.js";
import { COMBINAISONS } from "./combinaisons.js";

/** Le cas de référence : celui que le classeur porte tel qu'il nous est venu. */
const REFERENCE = {
  araseSuperieure: -0.1, hauteurLz: 1, sectionLx: 1.2, sectionLy: 1.2,
  reglement: "EC - NF P94-261", repartition: "Meyerhoff", drainage: "Sol drainé",
  inclinaison: "Sans objet", unites: "{ daN ; daNm }", typeExploitation: "Exploitation",
  charges: {
    G: { V: 4720, Hx: -61 }, Sn: { V: 4060, Hx: -71 },
    W1: { V: -5361, Hx: -298 }, W2: { V: -5784, Hx: 467 },
    W3: { V: -5301, Hx: -388 }, W4: { V: 2357, Hx: 173 }
  }
};

const proche = (obtenu, attendu, tolerance = 1e-9) => {
  const ecart = Math.abs(obtenu - attendu);
  const relatif = attendu === 0 ? ecart : ecart / Math.abs(attendu);
  assert.ok(relatif <= tolerance, `attendu ${attendu}, obtenu ${obtenu} (écart relatif ${relatif})`);
};

test("la table des combinaisons est celle du classeur : 376 pour la stabilité, 12 pour le quasi-permanent", () => {
  assert.equal(COMBINAISONS.length, 388);
  assert.equal(COMBINAISONS.filter(([ligne]) => ligne >= 22 && ligne <= 397).length, 376);
  assert.equal(COMBINAISONS.filter(([ligne]) => ligne >= 398).length, 12);
});

test("cas de référence : le glissement tombe sur la valeur du classeur", () => {
  const r = calculerStabiliteExterne(REFERENCE);
  proche(r.glissement.ratio, 1.053448519939227);        // R33
  proche(r.glissement.HEd, 639.5);                       // O36
  proche(r.glissement.Rhd1, 0);                          // O37
  proche(r.glissement.Rhd2, 0);                          // O38
  proche(r.glissement.Rpd, 639.5);                       // O39
  proche(r.glissement.HRd, 639.5);                       // O40
  assert.equal(r.glissement.combinaison, "ELU : Gmin + 1,5W2"); // E35
});

test("cas de référence : le basculement tombe sur la valeur du classeur", () => {
  const r = calculerStabiliteExterne(REFERENCE);
  proche(r.basculement.ratio, 0.9749579055102514);       // R41
  proche(r.basculement.MEd, 5906.1);                     // O45
  proche(r.basculement.Mst0, 5225.8);                    // O46
  proche(r.basculement.Mstb, 831.9999999999994);         // O47
  proche(r.basculement.MRd, 6057.799999999999);          // O48
  assert.equal(r.basculement.sens, "direction X > 0");   // M44
});

test("cas de référence : la contrainte tombe sur la valeur du classeur", () => {
  const r = calculerStabiliteExterne(REFERENCE);
  proche(r.contrainte.ratio, 0.9779305555555556);        // R49
  proche(r.contrainte.Vd, 14082.2);                      // O52
  proche(r.contrainte.Mdx, 0);                           // O53
  proche(r.contrainte.Mdy, 0);                           // O54
  proche(r.contrainte.sigmaRef, 0.9779305555555556);     // O55
  proche(r.contrainte.sigmaLim, 1);                      // O56
  proche(r.contrainte.id, 1);                            // O57
  assert.equal(r.contrainte.combinaison, "ELSR : Gmin + Sn + 0,6W4"); // E51
});

test("cas de référence : surfaces comprimées et bilan", () => {
  const r = calculerStabiliteExterne(REFERENCE);
  proche(r.surfaces.eluEla.obtenue, 0);                  // AO35
  proche(r.surfaces.elsRares.obtenue, 100);              // AO38
  proche(r.surfaces.elsQp.obtenue, 100);                 // AO41
  proche(r.surfaces.ratio, 10);                          // AO33
  proche(r.bilan.ratio, 10);                             // AK5
  assert.equal(r.bilan.verifie, false);
});

test("cas de référence : poids propre et butée", () => {
  const r = calculerStabiliteExterne(REFERENCE);
  proche(r.poidsPropre.V, 3888);                         // AV90
  proche(r.poidsPropre.MX, 0);                           // AW90
  proche(r.poidsPropre.MY, 0);                           // AX90
  proche(r.butee.Hx, 2303.999999999998);                 // BM80
  proche(r.butee.Hy, 2303.999999999998);                 // BN80
  proche(r.butee.Mx, 831.9999999999994);                 // BM81
  proche(r.butee.My, 831.9999999999994);                 // BN81
});

test("376 combinaisons sont bien parcourues", () => {
  assert.equal(calculerStabiliteExterne(REFERENCE).combinaisonsExaminees, 376);
});

test("une butée non mobilisée ne stabilise plus rien", () => {
  const r = calculerStabiliteExterne({ ...REFERENCE, buteeMobilisee: 0 });
  proche(r.butee.Hx, 0);
  proche(r.butee.Hy, 0);
  proche(r.butee.Mx, 0);
  proche(r.butee.My, 0);
  proche(r.glissement.Rpd, 0);
  proche(r.glissement.HRd, 0);
});

test("le ratio devient négatif quand la combinaison déterminante soulève la semelle", () => {
  // Ce n'est pas une anomalie du code : le classeur prend `MIN(DW22:DW397)` puis
  // son inverse, et une descente de charges négative rend un frottement négatif.
  // Un ratio négatif se lit donc « pire que tout », pas « largement vérifié » —
  // et l'écran doit le dire ainsi.
  const r = calculerStabiliteExterne({ ...REFERENCE, buteeMobilisee: 0 });
  assert.ok(r.glissement.ratio < 0, `ratio attendu négatif, obtenu ${r.glissement.ratio}`);
  assert.equal(r.bilan.verifie, false);
});

test("un sol non drainé retire le frottement et ouvre le terme de cohésion", () => {
  const draine = calculerStabiliteExterne(REFERENCE);
  const non = calculerStabiliteExterne({ ...REFERENCE, drainage: "Sol non drainé" });
  proche(draine.glissement.Rhd2, 0);          // drainé : aucune cohésion comptée
  proche(non.glissement.Rhd1, 0);             // non drainé : plus de frottement
  assert.notEqual(non.glissement.Rhd2, 0);    // le terme de cohésion joue
  assert.notEqual(non.glissement.ratio, draine.glissement.ratio);
});

test("changer de règlement change le résultat, sans jamais faire échouer le calcul", () => {
  for (const reglement of ["Fascicule 62", "DTU 13.12", "EC - NF P94-261"]) {
    const r = calculerStabiliteExterne({ ...REFERENCE, reglement });
    assert.ok(Number.isFinite(r.bilan.ratio), `${reglement} rend un ratio`);
  }
  const f62 = calculerStabiliteExterne({ ...REFERENCE, reglement: "Fascicule 62" });
  const ec = calculerStabiliteExterne(REFERENCE);
  assert.notEqual(f62.glissement.ratio, ec.glissement.ratio);
});

test("l'annexe F de l'EC8-5 est refusée, pas approximée", () => {
  assert.throws(() => calculerStabiliteExterne({ ...REFERENCE, reglement: "EC8-5 Annexe F" }), /EC8-5/);
  assert.ok(REGLEMENTS.includes("EC8-5 Annexe F"), "elle reste dans la liste : c'est un manque déclaré, pas un oubli");
});

test("un règlement, une répartition ou des unités inconnus sont refusés", () => {
  assert.throws(() => calculerStabiliteExterne({ ...REFERENCE, reglement: "Au jugé" }), /Règlement inconnu/);
  assert.throws(() => calculerStabiliteExterne({ ...REFERENCE, repartition: "Au jugé" }), /Répartition inconnue/);
  assert.throws(() => calculerStabiliteExterne({ ...REFERENCE, unites: "{ pouces }" }), /Unités inconnues/);
});

test("une semelle sans côté est refusée", () => {
  assert.throws(() => calculerStabiliteExterne({ ...REFERENCE, sectionLx: 0 }), /deux côtés/);
});

test("la répartition constante calcule, elle aussi", () => {
  const r = calculerStabiliteExterne({ ...REFERENCE, repartition: "Constante" });
  assert.ok(Number.isFinite(r.contrainte.ratio));
  assert.ok(Number.isFinite(r.surfaces.elsRares.obtenue));
});

test("sans aucune charge, rien ne diverge et rien n'est inventé", () => {
  const r = calculerStabiliteExterne({});
  assert.equal(r.combinaisonsExaminees, 376);
  assert.ok(Number.isFinite(r.bilan.ratio));
  // Le poids propre seul : la semelle par défaut, 1,2 × 1,2 × 1 à 2500.
  proche(r.poidsPropre.V, 2500 * 1.2 * 1.2 * 1 + 2000 * 0.1 * 1.2 * 1.2);
});

test("les défauts sont ceux de l'outil d'origine, pas des valeurs de projet", () => {
  assert.equal(DEFAUTS.reglement, "EC - NF P94-261");
  assert.equal(DEFAUTS.sectionLx, 1.2);
  assert.equal(DEFAUTS.contrainteLimite, 1);
  assert.deepEqual(DEFAUTS.charges, {});
});
