/**
 * Ce que le classeur rend, figé.
 *
 * Ces valeurs n'ont pas été calculées de tête ni recopiées d'un manuel : elles
 * sont celles que `CALMAS__Fondations.xlsx` porte **en cache**, c'est-à-dire
 * celles que son propre tableur a calculées. L'étalon n'est pas une seconde
 * lecture du classeur : c'est le classeur lui-même.
 *
 * Une divergence ici ne se rattrape pas en ajustant la valeur attendue : elle
 * se cherche dans le classeur, à la case près — les commentaires de `calcul.js`
 * donnent les références.
 *
 * ## Ce qui est étalonné, et ce qui ne l'est pas
 *
 * Sont comparés, au dernier chiffre :
 *
 * - les seize grandeurs de sortie de la stabilité externe (R33, R41, R49, AK5,
 *   O36:O40, O45:O48, O52:O58, AO33, AO35, AO38, AO41) ;
 * - le poids propre et la butée (AV90, AW90, AX90, BM80, BN80, BM81, BN81) ;
 * - les cinquante cases de la table de pondération.
 *
 * Mais ces valeurs ne valent que pour **une** situation : celle que le classeur
 * porte — EC - NF P94-261, répartition Meyerhoff, sol drainé, ni séisme ni
 * charge accidentelle.
 *
 * ## Le second étalon : une note de calcul réelle
 *
 * Cinq massifs d'une affaire livrée, avec leurs entrées et leurs sorties
 * imprimées, ferment la lacune la plus grosse : la **répartition constante**,
 * dont le polygone de décompression se résout par une cubique. Voir
 * `note-reelle.js` pour ce qu'ils couvrent.
 *
 * ## Ce qui reste sans étalon
 *
 * Le Fascicule 62, le DTU 13.12, le sol non drainé et les combinaisons
 * sismiques ou accidentelles sont transcrits et ils tournent ; les tests
 * ci-dessous vérifient qu'ils ne divergent pas, mais aucune source ne les
 * confirme encore. Le chemin pour les fermer est le même : une note de calcul,
 * ou un classeur enregistré avec ces réglages.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { calculerStabiliteExterne, DEFAUTS, REGLEMENTS, NAPPES } from "./calcul.js";
import { COMBINAISONS } from "./combinaisons.js";
import { MASSIFS_NOTE_REELLE } from "./note-reelle.js";

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

test("une inclinaison sur un effort vertical nul sature au lieu d'empoisonner les 376 lignes", () => {
  // Un seul `NaN` traverserait tous les minimums qui suivent ; le classeur, lui,
  // signale une erreur de cellule. On sature, et le reste du calcul tient.
  const r = calculerStabiliteExterne({
    ...REFERENCE, inclinaison: "Sol frottant",
    charges: { ...REFERENCE.charges, G: { V: 0 } }
  });
  assert.ok(Number.isFinite(r.contrainte.ratio), "le ratio de contrainte reste un nombre");
  assert.ok(Number.isFinite(r.glissement.ratio), "le glissement n'est pas contaminé");
  assert.ok(Number.isFinite(r.bilan.ratio), "le bilan reste lisible");
});

test("un excentrement qui décomprime la semelle réduit la surface, sans planter", () => {
  const r = calculerStabiliteExterne({
    ...REFERENCE, repartition: "Constante", buteeMobilisee: 0,
    charges: { G: { V: 3000, Mx: 900, My: 1500 }, W2: { V: -900, Hx: 320, Mx: -600 } }
  });
  assert.ok(Number.isFinite(r.surfaces.elsRares.obtenue));
  assert.ok(r.surfaces.elsRares.obtenue >= 0 && r.surfaces.elsRares.obtenue <= 100);
  assert.ok(Number.isFinite(r.contrainte.ratio));
});

/**
 * La table de pondération, case à case.
 *
 * Ces cinquante valeurs sont celles que le classeur porte en cache pour le cas
 * qu'il embarque. Elles se comparent sans le recalculer, et c'est ce contrôle-là
 * qui attraperait une cascade de `IF` transcrite de travers — une erreur qui,
 * autrement, ne se verrait que par un ratio légèrement décalé.
 */
const PONDERATION_ATTENDUE = {
  AS48: 1, AS55: 1, AS62: 1, AS70: 1,
  AU48: 1, AU55: 1.35, AU62: 1, AU70: 1,
  AW48: 0, AW49: 0, AW50: 0, AW51: 0, AW52: 0, AW55: 0, AW56: 0, AW57: 0,
  AW58: 0, AW59: 0, AW62: 0, AW64: 0, AW70: 0, AW71: 0,
  AY49: 0.6, AY51: 1, AY52: 0.6, AY55: 0, AY56: 0, AY58: 1.5,
  AY59: 0.8999999999999999, AY62: 0, AY63: 0, AY64: 0, AY65: 0, AY66: 0,
  AY67: 0.3, AY72: 0.2,
  BA48: 0, BA49: 0, BA50: 1, BA51: 0.5, BA52: 1, BA56: 0, BA57: 1.5,
  BA58: 0.75, BA59: 1.5, BA63: 0, BA65: 0, BA66: 0, BA67: 0.3, BA71: 0.2
};

test("la table de pondération tombe case par case sur celle du classeur", async () => {
  const { tablePonderation, coefficientsReglementaires, DEFAUTS: D } = await import("./calcul.js");
  const e = { ...D, ...REFERENCE };
  // Les cas présents dans le jeu de référence : neige et vent, ni exploitation,
  // ni séisme, ni accidentelle.
  const presence = { q: false, sn: true, w: true, seisme: false, fa: false };
  const table = tablePonderation(e, presence, coefficientsReglementaires(e));

  for (const [cellule, attendu] of Object.entries(PONDERATION_ATTENDUE)) {
    proche(table[cellule], attendu, 1e-12);
  }
});

test("les cases BF61:BQ72 valent un Gmin unitaire et rien d'autre", async () => {
  const { tablePonderation, coefficientsReglementaires, DEFAUTS: D } = await import("./calcul.js");
  const e = { ...D, ...REFERENCE };
  const table = tablePonderation(e, { q: true, sn: true, w: true, seisme: true, fa: true }, coefficientsReglementaires(e));
  for (let ligne = 61; ligne <= 72; ligne += 1) {
    assert.equal(table[`BF${ligne}`], 1);
    for (const col of ["BG", "BH", "BI", "BJ", "BK", "BL", "BM", "BN", "BO", "BP", "BQ"]) {
      assert.equal(table[`${col}${ligne}`], 0, `${col}${ligne} devrait être nul`);
    }
  }
});


/**
 * Les cinq massifs d'une note de calcul réelle.
 *
 * Un test par massif plutôt qu'une boucle : quand l'un casse, on veut lire
 * lequel dans le nom du test, pas le déduire d'un message d'assertion.
 */
for (const massif of MASSIFS_NOTE_REELLE) {
  test(`note réelle — ${massif.nom} : les vingt-deux grandeurs concordent`, () => {
    const r = calculerStabiliteExterne(massif.entrees);
    const a = massif.attendu;

    // La note est imprimée à la décimale près : la tolérance est celle de
    // l'arrondi d'impression, pas une marge de confort.
    const impression = (obtenu, attendu) => proche(obtenu, attendu, Math.max(0.06 / Math.max(Math.abs(attendu), 1), 5e-4));

    assert.equal(r.glissement.combinaison, a.glissement);
    impression(r.glissement.HEd, a.HEd);
    impression(r.glissement.Rhd1, a.Rhd1);
    impression(r.glissement.Rhd2, a.Rhd2);
    impression(r.glissement.Rpd, a.Rpd);
    impression(r.glissement.HRd, a.HRd);

    assert.equal(r.basculement.combinaison, a.basculement);
    assert.equal(r.basculement.sens, a.sens);
    impression(r.basculement.MEd, a.MEd);
    impression(r.basculement.Mst0, a.Mst0);
    impression(r.basculement.Mstb, a.Mstb);
    impression(r.basculement.MRd, a.MRd);

    assert.equal(r.contrainte.combinaison, a.contrainte);
    impression(r.contrainte.Vd, a.Vd);
    impression(r.contrainte.Mdx, a.Mdx);
    impression(r.contrainte.Mdy, a.Mdy);
    impression(r.contrainte.sigmaRef, a.sref);
    impression(r.contrainte.sigmaLim, a.sLIM);
    impression(r.contrainte.id, a.id);

    impression(r.surfaces.eluEla.obtenue, a.sc[0]);
    impression(r.surfaces.elsRares.obtenue, a.sc[1]);
    impression(r.surfaces.elsQp.obtenue, a.sc[2]);
  });
}

test("la note réelle couvre les branches que le classeur ne montrait pas", () => {
  const sens = new Set(MASSIFS_NOTE_REELLE.map((m) => m.attendu.sens));
  assert.ok(sens.size >= 3, "au moins trois sens de basculement différents");
  assert.ok(MASSIFS_NOTE_REELLE.some((m) => m.entrees.sectionLx !== m.entrees.sectionLy),
    "au moins une semelle rectangulaire");
  assert.ok(MASSIFS_NOTE_REELLE.some((m) => m.attendu.sc[0] === 0),
    "au moins une semelle entièrement décomprimée à l'ELU");
  assert.ok(MASSIFS_NOTE_REELLE.every((m) => m.entrees.repartition === "Constante"),
    "les cinq sont en répartition constante : c'est ce qu'ils étalonnent");
});


/* ------------------------------------------------------------------ *
 * Stabilité interne : le ferraillage de la semelle
 * ------------------------------------------------------------------ */

/** Le ferraillage que le classeur porte, pour comparer ses colonnes IT à JC. */
const FERRAILLAGE_CLASSEUR = {
  AIX: { nombre: 2, barre: "HA14" }, AIY: { nombre: 6, barre: "HA12" },
  ASX: { nombre: 0, barre: "HA8" }, ASY: { nombre: 0, barre: "HA8" }
};

test("les trois familles de combinaison n'ont pas les mêmes coefficients de matériau", () => {
  // C'est le piège de cette partie : à l'ELU l'acier est minoré par 1,15, à
  // l'accidentel il ne l'est pas, au service c'est la fissuration qui plafonne
  // et le bras de levier vient de la section fissurée. Prendre les mêmes
  // partout se voit de 13 % sur une nappe — et ne se voit pas sur le maximum,
  // d'où ces relevés ligne à ligne.
  const r = calculerStabiliteExterne({ ...REFERENCE, enrobageSemelle: 5, ferraillage: FERRAILLAGE_CLASSEUR });
  const parLigne = Object.fromEntries(r.interne.parCombinaison.map((l) => [l.ligne, l.aciers]));

  proche(parLigne[22].AIX, 0.17513262206090457);   // IT22  — ELU
  proche(parLigne[22].AIY, 0.17513262206090457);   // IW22
  proche(parLigne[100].AIX, 0.15228300012056534);  // IT100 — accidentel
  proche(parLigne[320].AIX, 0.20354358272199286);  // IT320 — service
  proche(parLigne[320].AIY, 0.21008528398450235);  // IW320
});

test("la nappe supérieure suit le classeur, recopie manquée comprise", () => {
  // `IX` ne porte son facteur de largeur qu'à la ligne 22, et `JB` calcule son
  // bras de levier sur `IX` au lieu de `JA`. Ce sont des irrégularités de la
  // source ; les corriger rendrait autre chose qu'elle.
  const r = calculerStabiliteExterne({ ...REFERENCE, enrobageSemelle: 5, ferraillage: FERRAILLAGE_CLASSEUR });
  const parLigne = Object.fromEntries(r.interne.parCombinaison.map((l) => [l.ligne, l.aciers]));
  proche(parLigne[27].ASX, 0.11918490433093114);   // IZ27
  proche(parLigne[27].ASY, 0.14302188519711737);   // JC27
  assert.notEqual(parLigne[27].ASX, parLigne[27].ASY);
});

test("les sections requises sont les maximums du classeur", () => {
  const r = calculerStabiliteExterne({ ...REFERENCE, enrobageSemelle: 5, ferraillage: FERRAILLAGE_CLASSEUR });
  const maximums = Object.fromEntries(NAPPES.map((nappe) => [nappe.cle,
    Math.max(...r.interne.parCombinaison.map((l) => l.aciers[nappe.cle] ?? 0))]));
  proche(maximums.AIX, 0.5413358889020726);
  proche(maximums.AIY, 0.5413358889020726);
  proche(maximums.ASX, 0.11918490433093114);
  proche(maximums.ASY, 0.14302188519711737);
});

test("tant que la stabilité externe ne passe pas, le ferraillage ne se prononce pas", () => {
  // C'est la règle du classeur, et elle est juste : sur une semelle qui glisse,
  // la question du ferraillage ne se pose pas encore.
  const r = calculerStabiliteExterne({ ...REFERENCE, enrobageSemelle: 5, ferraillage: FERRAILLAGE_CLASSEUR });
  assert.equal(r.bilan.verifie, false);
  for (const nappe of r.interne.nappes) assert.equal(nappe.requise, null);
});

test("une nappe non déclarée n'a ni section fournie ni exigence", () => {
  const r = calculerStabiliteExterne({ ...MASSIFS_NOTE_REELLE[0].entrees, enrobageSemelle: 10,
    ferraillage: { AIX: { nombre: 5, barre: "HA10" } } });
  const par = Object.fromEntries(r.interne.nappes.map((n) => [n.cle, n]));
  assert.ok(par.AIX.fournie > 0);
  assert.equal(par.AIY.fournie, null);
  assert.equal(par.AIY.requise, null);
  assert.equal(par.AIY.ratio, null);
});

test("ce que la stabilité interne ne couvre pas est nommé, pas passé sous silence", () => {
  const r = calculerStabiliteExterne({});
  assert.ok(r.interne.horsPortee.includes("Armatures de fût"));
  assert.ok(r.interne.horsPortee.includes("Poinçonnement"));
});
