/**
 * La stabilité externe d'une fondation superficielle : glissement, basculement,
 * contrainte de référence, surfaces comprimées.
 *
 * ## D'où vient ce calcul
 *
 * Il ne sort pas d'un manuel : il est relevé, formule par formule, dans le
 * classeur `CALMAS__Fondations.xlsx` qui sert aujourd'hui à le faire à la main.
 * Le classeur reste la référence — c'est lui qui a la jurisprudence des projets
 * déjà rendus. Le code doit donc rendre **ce que le classeur rend**, y compris
 * là où le classeur surprend ; là où c'est le cas, on le dit en commentaire au
 * lieu de le corriger en silence. Corriger sans le dire, ce serait remplacer un
 * outil éprouvé par un outil différent portant le même nom.
 *
 * Les noms de cases (`I11`, `BA150`, `AV80`…) sont conservés dans les
 * commentaires : c'est ce qui permet d'ouvrir le classeur à côté et de chercher
 * une divergence à la case près.
 *
 * ## Ce que ce fichier ne fait pas
 *
 * Ni la stabilité interne (ferraillage), ni la capacité portante sismique de
 * l'annexe F de l'EC8-5. Le classeur les porte ; ce module ne les prétend pas.
 * `EC8-5 Annexe F` est refusé explicitement plutôt que calculé de travers.
 *
 * ## Où il tourne
 *
 * Côté serveur. Il est en JavaScript nu, sans dépendance, pour que Deno
 * l'exécute dans la fonction et que Node le vérifie dans les tests contre le
 * classeur lui-même.
 */

import { COMBINAISONS } from "./combinaisons.js";

/** Les quatre règlements que la liste déroulante du classeur propose. */
export const REGLEMENTS = ["Fascicule 62", "DTU 13.12", "EC - NF P94-261", "EC8-5 Annexe F"];
export const REPARTITIONS = ["Meyerhoff", "Constante"];
export const TYPES_EXPLOITATION = ["Exploitation", "Archives / stockage", "Température"];
export const INCLINAISONS = ["Sans objet", "Sol cohérent", "Sol frottant"];
export const DRAINAGES = ["Sol drainé", "Sol non drainé"];
export const UNITES = ["{ T ; Tm }", "{ kN ; kNm }", "{ daN ; daNm }"];

/** Les douze cas de charge, dans l'ordre où les combinaisons les citent. */
export const CAS = ["Gmax", "Gmin", "Q", "Sn", "W1", "W2", "W3", "W4", "Sx", "Sy", "Sz", "Fa"];

/** Les cinq composantes d'un cas de charge, au niveau où il est appliqué. */
export const COMPOSANTES = ["V", "Hx", "Hy", "Mx", "My"];

const abs = Math.abs;
const min = Math.min;
const max = Math.max;

function nombre(valeur, defaut = 0) {
  const n = typeof valeur === "number" ? valeur : Number.parseFloat(String(valeur ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : defaut;
}

function texte(valeur, defaut = "") {
  const t = String(valeur ?? "").trim();
  return t || defaut;
}

/**
 * Les valeurs par défaut du classeur, dans l'ordre de ses écrans.
 *
 * Elles sont ici pour que le module se lise seul : un lecteur voit d'un coup
 * l'intégralité de ce qui entre dans le calcul, et non seulement ce que
 * l'écran de saisie propose.
 */
export const DEFAUTS = {
  // Géométrie (A8:X15)
  araseSuperieure: -0.1,   // L9  — cote de l'arase supérieure du massif [m]
  hauteurLz: 1,            // L10 — hauteur de la semelle [m]
  sectionLx: 1.2,          // I11 — côté de la semelle suivant x [m]
  sectionLy: 1.2,          // L11 — côté de la semelle suivant y [m]
  hauteurFut: 0,           // L12 — hauteur du fût [m]
  futA: 0,                 // I13 — côté du fût suivant x [m]
  futB: 0,                 // L13 — côté du fût suivant y [m]
  excentrementChargeX: 0,  // I14 — excentrement charge/fût suivant x [m]
  excentrementChargeY: 0,  // L14 — idem suivant y [m]
  excentrementFutX: 0,     // I15 — excentrement fût/semelle suivant x [m]
  excentrementFutY: 0,     // L15 — idem suivant y [m]

  // Charges (A17:X29). Chaque cas vaut { V, Hx, Hy, Mx, My }.
  lestMin: 0,              // R17
  lestMax: 0,              // U17
  typeExploitation: "Exploitation", // C20 — pilote A20 ∈ { Q, Qa, T }
  charges: {},

  // Hypothèses (AI9:AL29)
  densiteSemelle: 2500,    // AI9
  densiteFut: 2500,        // AL9
  poidsVolumiqueSol: 2000, // AL15 — gR
  contrainteLimite: 1,     // AL16 — sELS
  angleFrottement: 30,     // AL17 — jS [°]
  buteeMobilisee: 60,      // AL18 — K'/Kp [%]
  angleButee: 30,          // AL19 — jB [°]
  poidsVolumiqueButee: 2000, // AL20 — gB
  buteeZi: -0.1,           // AL21
  buteeZf: -1.1,           // AL22

  reglement: "EC - NF P94-261",  // AI25
  repartition: "Meyerhoff",      // AI26
  inclinaison: "Sans objet",     // AI27
  drainage: "Sol drainé",        // AI28
  unites: "{ daN ; daNm }",      // AI29

  // Paramètres d'expert (AS10:AU26). Le classeur les laisse rarement bouger.
  gminElu: 1,              // AU11
  wElu: 1.8,               // AU12
  newmark: 0.3,            // AU13
  deSurB: 1,               // AU14
  cohesionNonDrainee: 30,  // AU15 — cu,k
  secuGlissementElu: 1,    // AU23
  secuGlissementEla: 1,    // AU24
  secuRenversementElu: 1,  // AU25
  secuRenversementEla: 1   // AU26
};

/**
 * Les coefficients réglementaires (AS34:BB45).
 *
 * Deux jeux : BAEL/Fascicule 62 dans les colonnes AU:AX, Eurocode dans AY:BB.
 * Le choix entre les deux se fait, partout dans le classeur, par le test
 * `AI25 = BC13`, c'est-à-dire « le règlement retenu est-il l'EC - NF P94-261 ».
 * L'EC8-5 annexe F ne le déclenche pas : c'est voulu par le classeur.
 */
function coefficientsReglementaires(e) {
  return {
    AU34: 1, AV34: e.gminElu, AW34: 1, AY34: 1, AZ34: 1.8,
    AU35: 1, AV35: 1.35, AW35: 1, AY35: 0.9, AZ35: 1.75,

    AU41: 1.5, AV41: 1 / 1.3, AW41: 0.15, AX41: 0,       // Sn, BAEL
    AU42: e.wElu, AV42: 1 / 1.3, AW42: 0.2, AX42: 0,     // W,  BAEL
    AU43: 1.5, AV43: 1 / 1.3, AW43: 0.75, AX43: 0.65,    // Q,  BAEL
    AU44: 1.5, AV44: 0.9, AW44: 0.9, AX44: 0.8,          // Qa, BAEL
    AU45: 1.35, AV45: 0.6, AW45: 0.5, AX45: 0,           // T,  BAEL

    AY41: 1.5, AZ41: 0.5, BA41: 0.2, BB41: 0,            // Sn, Eurocode
    AY42: 1.5, AZ42: 0.6, BA42: 0.2, BB42: 0,            // W,  Eurocode
    AY43: 1.5, AZ43: 0.7, BA43: 0.5, BB43: 0.3,          // Q,  Eurocode
    AY44: 1.5, AZ44: 1, BA44: 0.9, BB44: 0.8,            // Qa, Eurocode
    AY45: 1.5, AZ45: 0.6, BA45: 0.5, BB45: 0,            // T,  Eurocode

    AU82: 1, AV82: 1.5, AW82: e.reglement === "EC - NF P94-261" ? 1.5 : 2
  };
}

/**
 * La table de pondération (AS48:BB77 et BF61:BQ72).
 *
 * C'est elle qui décide, combinaison par combinaison, du coefficient de chaque
 * cas. Deux choses la font varier : le règlement, et **la présence effective**
 * d'un cas de charge — un vent nul ne pondère rien, et le classeur le teste par
 * `SUMSQ` sur la ligne de saisie.
 *
 * Une bizarrerie assumée : `AY49`, coefficient de vent, teste la présence de la
 * neige (`SUMSQ(H21:X21)`) et non celle du vent. Le classeur fait ainsi ; on le
 * suit, sans quoi les deux outils ne rendraient plus la même chose.
 */
function tablePonderation(e, presence, k) {
  const ec = e.reglement === "EC - NF P94-261";
  const a20 = { "Exploitation": "Q", "Archives / stockage": "Qa", "Température": "T" }[e.typeExploitation] || "T";
  const { q, sn, w, seisme, fa } = presence;

  // Le coefficient d'exploitation se lit dans l'une des trois lignes Q / Qa / T
  // du tableau réglementaire, selon le type de charge d'exploitation déclaré.
  const trip = (q1, qa, t1) => (a20 === "Q" ? k[q1] : a20 === "Qa" ? k[qa] : k[t1]);

  const t = {
    // ELS Rares (lignes 48 à 52)
    AS48: k.AU34, AU48: k.AU35,
    AW48: q ? 1 : 0,
    BA48: (!q || !sn) ? 0 : (ec ? k.AZ41 : k.AV41),
    AW49: q ? 1 : 0,
    AY49: sn ? (ec ? k.AZ42 : k.AV42) : 0,
    BA49: (!q || !sn) ? 0 : (ec ? 1 / 2 : k.AV41 / 2),
    AW50: (!sn || !q) ? 0 : (ec ? trip("AZ43", "AZ44", "AZ45") : trip("AV43", "AV44", "AV45")),
    BA50: sn ? 1 : 0,
    AW51: (!w || !q) ? 0 : (ec ? trip("AZ43", "AZ44", "AZ45") : trip("AV43", "AV44", "AV45")),
    AY51: w ? 1 : 0,
    BA51: (!w || !sn) ? 0 : (ec ? 1 / 2 : k.AV41 / 2),
    AW52: (!sn || !q) ? 0 : (ec ? trip("AZ43", "AZ44", "AZ45") : trip("AV43", "AV44", "AV45")),
    AY52: (!sn || !w) ? 0 : (ec ? k.AZ42 : k.AV42),
    BA52: sn ? (ec ? 1 : 0.5) : 0,

    // ELU Fondamentales (lignes 55 à 59)
    AS55: k.AV34, AU55: k.AV35,
    AW55: q ? (ec ? k.AY43 : (a20 === "T" ? k.AU45 : k.AU43)) : 0,
    AY55: (!q || !sn) ? 0 : (ec ? k.AY41 * k.AZ41 : 1.3 * k.AV41),
    AW56: q ? (ec ? k.AY43 : (a20 === "T" ? k.AU45 : k.AU43)) : 0,
    AY56: (!q || !w) ? 0 : (ec ? k.AY42 / k.AY43 * k.AY42 * k.AZ42 : k.AU42 / k.AU43 * 1.3 * k.AV42),
    BA56: (!q || !sn) ? 0 : (ec ? k.AY41 * k.AZ41 : 1 / 2),
    AW57: (!sn || !q) ? 0 : (ec
      ? trip("AY43", "AY44", "AY45") * trip("AZ43", "AZ44", "AZ45")
      : 1.3 * trip("AV43", "AV44", "AV45")),
    BA57: sn ? (ec ? k.AY41 : k.AU41) : 0,
    AW58: (!w || !q) ? 0 : (ec
      ? trip("AY43", "AY44", "AY45") * trip("AZ43", "AZ44", "AZ45")
      : 1.3 * trip("AV43", "AV44", "AV45")),
    AY58: w ? (ec ? k.AY42 : k.AU42) : 0,
    BA58: (!w || !sn) ? 0 : (ec ? k.AY41 * k.AZ41 : 1 / 2),
    AW59: (!sn || !q) ? 0 : (ec
      ? trip("AY43", "AY44", "AY45") * trip("AZ43", "AZ44", "AZ45")
      : 1.3 * trip("AV43", "AV44", "AV45")),
    AY59: (!sn || !w) ? 0 : (ec ? k.AY42 / k.AY43 * k.AY42 * k.AZ42 : k.AU42 / k.AU43 * 1.3 * k.AV42),
    BA59: sn ? (ec ? k.AY41 : k.AU41 / 2) : 0,

    // ELU Accidentelles (lignes 62 à 67)
    AS62: k.AW34, AU62: k.AW35,
    AW62: seisme ? 1 : 0,
    AY62: (!seisme || !q) ? 0 : (ec ? trip("BB43", "BB44", "BB45") : trip("AW43", "AW44", "AW45")),
    AY63: (!seisme || !q) ? 0 : (ec ? trip("BB43", "BB44", "BB45") : trip("AX43", "AX44", "AX45")),
    BA63: (!seisme || !sn) ? 0 : (ec ? k.BA41 : k.AW41),
    AW64: fa ? 1 : 0,
    AY64: (!seisme || !q) ? 0 : (ec ? trip("BA43", "BA44", "BA45") : trip("AW43", "AW44", "AW45")),
    AY65: (!fa || !q) ? 0 : (ec ? trip("BB43", "BB44", "BB45") : trip("AX43", "AX44", "AX45")),
    BA65: (!fa || !sn) ? 0 : (ec ? k.BA41 : k.AW41),
    AY66: (!fa || !q) ? 0 : (ec ? trip("BB43", "BB44", "BB45") : trip("AX43", "AX44", "AX45")),
    BA66: (!fa || !w) ? 0 : (ec ? k.BA42 : k.AW42 * k.AU42 / k.AU41),
    AY67: e.newmark, BA67: e.newmark,

    // ELS Fréquentes (lignes 70 à 72)
    AS70: k.AU34, AU70: k.AU35,
    AW70: q ? (ec ? trip("BA43", "BA44", "BA45") : trip("AW43", "AW44", "AW45")) : 0,
    AW71: (!q || !sn) ? 0 : (ec ? trip("BB43", "BB44", "BB45") : trip("AX43", "AX44", "AX45")),
    BA71: sn ? (ec ? k.BA41 : k.AW41) : 0,
    AY72: w ? (ec ? k.BA42 : k.AW42) : 0
  };

  // Les lignes 61 à 72 du bloc BF:BQ ne portent qu'un Gmin unitaire ; tout le
  // reste y est vide, donc nul.
  for (let ligne = 61; ligne <= 72; ligne += 1) {
    t[`BF${ligne}`] = 1;
    for (const col of ["BG", "BH", "BI", "BJ", "BK", "BL", "BM", "BN", "BO", "BP", "BQ"]) t[`${col}${ligne}`] = 0;
  }
  return t;
}

/** Le coefficient d'une case, avec le produit et le signe que la table cite. */
function coefficient(expression, pond) {
  if (typeof expression === "number") return expression;
  let e = String(expression);
  let signe = 1;
  if (e.startsWith("-")) { signe = -1; e = e.slice(1); }
  const facteurs = e.split("*");
  let valeur = signe;
  for (const facteur of facteurs) {
    const v = pond[facteur];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(`Case de pondération inconnue : ${facteur}`);
    }
    valeur *= v;
  }
  return valeur;
}

/**
 * Le poids propre du massif (AS86:AX90) et la descente de charges (BA81:BE92).
 *
 * La descente ramène chaque cas de charge sous la semelle : le poids des
 * terres, du fût et de la semelle s'ajoute au permanent, et les excentrements
 * transforment un effort vertical en moment.
 */
function descenteDeCharges(e, charges) {
  const { araseSuperieure: L9, hauteurLz: L10, sectionLx: I11, sectionLy: L11,
    hauteurFut: L12, futA: I13, futB: L13,
    excentrementChargeX: I14, excentrementChargeY: L14,
    excentrementFutX: I15, excentrementFutY: L15 } = e;

  // Volume de terres au-dessus de la semelle, fût déduit (AV87).
  const volumeTerres = max(0, (-L9 - max(0, L12)) * I11 * L11)
    + max(0, min(-L9, max(0, L12)) * (I11 * L11 - I13 * L13));
  const terresV = e.poidsVolumiqueSol * volumeTerres;
  const recouvrementFut = L13 * min(max(0, L12), max(-L9, 0));
  const terresMX = (terresV === 0 || L9 >= 0) ? 0 : -I13 * terresV * recouvrementFut / volumeTerres * L15;
  const terresMY = (terresV === 0 || L9 >= 0) ? 0 : -I13 * terresV * recouvrementFut / volumeTerres * I15;

  const futV = e.densiteFut * I13 * L13 * L12;                 // AV88
  const semelleV = e.densiteSemelle * I11 * L11 * L10;         // AV89

  const pp = {
    V: terresV + futV + semelleV,                              // AV90
    MX: terresMX + futV * L15,                                 // AW90
    MY: terresMY + futV * I15                                  // AX90
  };

  const g = charges.G;
  const lestMax = max(e.lestMin, e.lestMax);
  const lestMin = min(e.lestMin, e.lestMax);

  const derive = (c) => ({
    V: c.V, Hx: c.Hx, Hy: c.Hy,
    Mx: c.Mx + c.V * (L15 + L14),
    My: c.My + c.V * (I15 + I14)
  });

  return {
    poidsPropre: pp,
    lignes: {
      // Gmax prend le lest le plus favorable au poids, Gmin le lest minimal —
      // mais son moment reste calculé sur `MIN(R17,U17)`, comme au classeur.
      Gmax: { V: g.V + lestMax + pp.V, Hx: g.Hx, Hy: g.Hy,
        Mx: g.Mx + pp.MX + (g.V + lestMax) * (L15 + L14),
        My: g.My + pp.MY + (g.V + lestMax) * (I15 + I14) },
      Gmin: { V: g.V + e.lestMin + pp.V, Hx: g.Hx, Hy: g.Hy,
        Mx: g.Mx + pp.MX + (g.V + lestMin) * (L15 + L14),
        My: g.My + pp.MY + (g.V + lestMin) * (I15 + I14) },
      Q: derive(charges.Q), Sn: derive(charges.Sn),
      W1: derive(charges.W1), W2: derive(charges.W2),
      W3: derive(charges.W3), W4: derive(charges.W4),
      Sx: derive(charges.Sx), Sy: derive(charges.Sy), Sz: derive(charges.Sz),
      Fa: derive(charges.Fa)
    }
  };
}

/**
 * La butée mobilisable devant la semelle (BI78:BN85).
 *
 * Elle n'existe que si l'on accepte de la mobiliser (`K'/Kp` non nul) ; sinon
 * le bras de levier `BL` s'annule et avec lui le moment stabilisant.
 */
function butee(e) {
  const L9 = e.araseSuperieure, L10 = e.hauteurLz;
  const zi = abs(e.buteeZi) < abs(L9) ? -abs(L9)
    : abs(e.buteeZi) > (abs(L9) + L10) ? -(abs(L9) + L10)
      : -abs(e.buteeZi);                                                   // BJ79
  const zf = abs(e.buteeZf) > abs(L9) + abs(L10) ? -(abs(L9) + abs(L10))
    : abs(e.buteeZf) < abs(L9) ? -abs(L9)
      : -abs(e.buteeZf);                                                   // BJ80
  const phi = e.angleButee * Math.PI / 180;                                // BJ81
  const kp = e.buteeMobilisee / 100
    * (Math.tan(Math.PI / 4 + phi / 2) ** 2 - Math.tan(Math.PI / 4 - phi / 2) ** 2); // BJ82
  const sigmaI = -kp * e.poidsVolumiqueSol * zi;                           // BJ83
  const sigmaF = sigmaI + kp * e.poidsVolumiqueButee * (zi - zf);          // BJ84
  const brasLevier = e.buteeMobilisee === 0 ? 0
    : (zi - zf) * (2 / 3 * sigmaI + sigmaF / 3) / (sigmaI + sigmaF) + abs(L9) + L10 - abs(zf); // BJ85

  const Hx = (sigmaI + sigmaF) / 2 * e.sectionLy * (zi - zf);              // BM80
  const Hy = (sigmaI + sigmaF) / 2 * e.sectionLx * (zi - zf);              // BN80
  return { Hx, Hy, Mx: Hy * brasLevier, My: Hx * brasLevier };             // BM81, BN81
}

/**
 * La surface comprimée en répartition trapézoïdale (colonnes FU à HG).
 *
 * Cinq cas se succèdent, du plus simple au plus retors : soulèvement suivant un
 * seul axe, diagramme triangulaire, deux cas de coin, et enfin le cas général
 * qui demande de résoudre une cubique. Le classeur la résout par Cardan ; on
 * fait de même, avec ses trois branches selon le discriminant.
 */
function surfaceComprimeeConstante(FO, FP, FQ, FR, FJ, I11, L11) {
  if (FQ === 0 && FR === 0 && FJ > 0) return 100;
  if (FO > I11 / 2 || FP > L11 / 2 || FJ <= 0) return 0;

  // FU : soulèvement suivant x seul.
  if (FO > I11 / 2 || FP > L11 / 2 || (FO !== 0 && FP === 0)) {
    return max(0, I11 - 2 * FO) * max(0, L11 - 2 * FP) * 100 / I11 / L11;
  }
  // FY : diagramme triangulaire dans les deux directions.
  if (FQ >= 1 / 6 && FR >= 1 / 6) {
    return 3 * I11 * (0.5 - FQ) * (3 * L11 * (0.5 - FR)) / 2 * 100 / I11 / L11;
  }
  // GC / GG : un coin décomprimé, suivant l'axe le plus excentré.
  if (FQ > FR && FR < 1 / 6 && FQ > 3 * FR * (1 - 2 * FR) / (1 + 6 * FR)) {
    const a = I11 * (1 - 2 * FQ) * (1 + 6 * FR) / (1 + 12 * FR ** 2);
    const b = I11 * (1 - 2 * FQ) * (1 - 6 * FR) / (1 + 12 * FR ** 2);
    return L11 * (a + b) / 2 * 100 / I11 / L11;
  }
  if (FQ < FR && FQ < 1 / 6 && FR > 3 * FQ * (1 - 2 * FQ) / (1 + 6 * FQ)) {
    const a = L11 * (1 - 2 * FR) * (1 + 6 * FQ) / (1 + 12 * FQ ** 2);
    const b = L11 * (1 - 2 * FR) * (1 - 6 * FQ) / (1 + 12 * FQ ** 2);
    return I11 * (a + b) / 2 * 100 / I11 / L11;
  }
  // GK : le cas général, par la cubique GL·x³ + GM·x² + GN·x + GO.
  if (!(FQ > 0 && FR > 0)) return 0;
  const GL = 4 * FQ;
  const GM = 6 * L11 * (FR - 2 * FQ - 2 * FQ * FR);
  const GN = -9 * L11 ** 2 * (FR - FQ) * (1 + 2 * FR);
  const GO = 24 * L11 ** 3 * FR ** 2;
  const p = -(GM ** 2) / (3 * GL ** 2) + GN / GL;                          // GP
  const q = GM / (27 * GL) * (2 * GM ** 2 / GL ** 2 - 9 * GN / GL) + GO / GL; // GQ
  const d = q ** 2 + 4 / 27 * p ** 3;                                      // GR

  let racine = null;
  if (d === 0) {
    racine = p * q > 0 ? 3 * q / p - GM / 3 / GL : -3 * q / 2 / p - GM / 3 / GL;  // GT
  } else if (d > 0) {
    const cbrt = (x) => Math.cbrt(x);
    racine = cbrt((-q + Math.sqrt(d)) / 2) + cbrt((-q - Math.sqrt(d)) / 2) - GM / 3 / GL; // GY
  } else {
    const r = 2 * Math.sqrt(-p / 3);
    const theta = Math.acos(-q / 2 * Math.sqrt(27 / -(p ** 3)));
    const candidat = (k) => r * Math.cos(theta / 3 + 2 * k * Math.PI / 3) - GM / 3 / GL;
    racine = [1, 2, 3].map(candidat).find((x, i) => i === 2 || (x > 0 && x < L11));
    if (racine === undefined) racine = candidat(3);                        // HD
  }
  if (!Number.isFinite(racine)) return 0;

  const hauteur = L11 - racine;
  const largeur = I11 * FQ * (3 * L11 - 2 * racine) / (2 * L11 * FR) - I11 / 2;
  const aire = largeur * L11 + (I11 - largeur) * (L11 + hauteur) / 2;
  const pourcentage = aire * 100 / I11 / L11;
  return pourcentage < 0 ? 0 : pourcentage;
}

const DIVISEUR_UNITE = { "{ T ; Tm }": 10, "{ kN ; kNm }": 1e3, "{ daN ; daNm }": 1e4 };

/**
 * Le calcul complet.
 *
 * Il rend, pour chacune des trois vérifications, le ratio sollicitation sur
 * résistance, la combinaison qui l'a produit, et les efforts qui le composent —
 * de quoi refaire le calcul à la main sans rouvrir le classeur. `10` est la
 * valeur sentinelle du classeur pour « pas vérifié du tout ».
 */
export function calculerStabiliteExterne(entrees = {}) {
  const e = { ...DEFAUTS, ...entrees };
  if (e.reglement === "EC8-5 Annexe F") {
    throw new Error("EC8-5 Annexe F : la capacité portante sismique n'est pas portée par cet utilitaire.");
  }
  if (!REGLEMENTS.includes(e.reglement)) throw new Error(`Règlement inconnu : ${e.reglement}`);
  if (!REPARTITIONS.includes(e.repartition)) throw new Error(`Répartition inconnue : ${e.repartition}`);
  if (!UNITES.includes(e.unites)) throw new Error(`Unités inconnues : ${e.unites}`);

  for (const cle of ["araseSuperieure", "hauteurLz", "sectionLx", "sectionLy", "hauteurFut",
    "futA", "futB", "excentrementChargeX", "excentrementChargeY", "excentrementFutX", "excentrementFutY",
    "lestMin", "lestMax", "densiteSemelle", "densiteFut", "poidsVolumiqueSol", "contrainteLimite",
    "angleFrottement", "buteeMobilisee", "angleButee", "poidsVolumiqueButee", "buteeZi", "buteeZf",
    "gminElu", "wElu", "newmark", "deSurB", "cohesionNonDrainee",
    "secuGlissementElu", "secuGlissementEla", "secuRenversementElu", "secuRenversementEla"]) {
    e[cle] = nombre(e[cle], DEFAUTS[cle]);
  }
  if (e.sectionLx <= 0 || e.sectionLy <= 0) throw new Error("La semelle doit avoir deux côtés strictement positifs.");

  const cas = ["G", "Q", "Sn", "W1", "W2", "W3", "W4", "Sx", "Sy", "Sz", "Fa"];
  const charges = {};
  for (const nom of cas) {
    const brut = e.charges?.[nom] ?? {};
    charges[nom] = Object.fromEntries(COMPOSANTES.map((c) => [c, nombre(brut[c], 0)]));
  }

  const somme2 = (c) => COMPOSANTES.reduce((t, k) => t + charges[c][k] ** 2, 0);
  const presence = {
    q: somme2("Q") !== 0,
    sn: somme2("Sn") !== 0,
    w: ["W1", "W2", "W3", "W4"].some((c) => somme2(c) !== 0),
    seisme: ["Sx", "Sy", "Sz"].some((c) => somme2(c) !== 0),
    fa: somme2("Fa") !== 0
  };

  const k = coefficientsReglementaires(e);
  const pond = tablePonderation(e, presence, k);
  const { poidsPropre, lignes } = descenteDeCharges(e, charges);
  const bu = butee(e);

  const I11 = e.sectionLx, L11 = e.sectionLy;
  const BA150 = e.hauteurLz + e.hauteurFut;
  const ec = e.reglement === "EC - NF P94-261";
  const meyerhoff = e.repartition === "Meyerhoff";
  const diviseur = DIVISEUR_UNITE[e.unites];
  const BA146 = e.deSurB;

  // tg j (AV80) : la part de frottement mobilisable sous la semelle.
  const tgPhi = e.drainage === "Sol non drainé" ? 0
    : e.reglement === "DTU 13.12" ? 0.5
      : e.reglement === "Fascicule 62" ? Math.tan(Math.PI * e.angleFrottement / 180) / 1.2
        : Math.tan(Math.PI * e.angleFrottement / 180) / 1.1 ** 2;

  const ordre = CAS.map((nom) => lignes[nom]);
  const resultats = [];

  for (const [ligne, familleFigee, sources] of COMBINAISONS) {
    const c = sources.map((s) => coefficient(s, pond));
    const famille = familleFigee ?? (c[1] === 0.9 ? "EQU" : "ELU");

    // Charges pondérées (DP:DT). Le moment reprend le Mx de Gmax pour Gmax
    // *et* Gmin, comme le classeur, puis l'effort tranchant remonte le bras.
    let V = 0, Hx = 0, Hy = 0, Mx = 0, My = 0;
    for (let i = 0; i < 12; i += 1) {
      V += c[i] * ordre[i].V;
      Hx += c[i] * ordre[i].Hx;
      Hy += c[i] * ordre[i].Hy;
      if (i >= 2) { Mx += c[i] * ordre[i].Mx; My += c[i] * ordre[i].My; }
    }
    Mx += (c[0] + c[1]) * ordre[0].Mx + Hy * BA150;
    My += (c[0] + c[1]) * ordre[0].My + Hx * BA150;

    // Contrainte de référence (FJ:FR, FA:FF). L'excentrement se mesure moment
    // résiduel sur effort vertical, la butée ayant déjà repris ce qu'elle peut.
    const FJ = V;
    const FK = abs(Mx), FL = abs(My);
    const FM = min(FK, bu.Mx), FN = min(FL, bu.My);
    const FO = FJ <= 0 ? 1000 : (FL - FN) / FJ;
    const FP = FJ <= 0 ? 1000 : (FK - FM) / FJ;
    const FQ = abs(FO / I11), FR = abs(FP / L11);

    const FC = (abs(FO) > I11 / 2 || abs(FP) > L11 / 2 || FJ <= 0) ? 0
      : (I11 - 2 * abs(FO)) * (L11 - 2 * abs(FP)) / I11 / L11 * 100;
    const FF = surfaceComprimeeConstante(FO, FP, FQ, FR, FJ, I11, L11);
    const Sc = meyerhoff ? FC : FF;

    const FB = FJ <= 0 ? 0
      : ((abs(FO) >= I11 / 2 || abs(FP) >= L11 / 2 || FC === 0) ? 1000
        : FJ / (FC * L11 * I11 / 100) / diviseur);
    const FE = FJ <= 0 ? 0
      : ((FO >= I11 / 2 || FP >= L11 / 2 || FF === 0) ? 1000
        : FJ / (FF * I11 * L11 / 100) / diviseur);

    // Glissement (DW:ED).
    const DX = V * tgPhi;
    const DZ = abs(Hx), EA = abs(Hy);
    const EC = min(DZ, bu.Hx), ED = min(EA, bu.Hy);
    const DY = e.drainage === "Sol drainé" ? 0
      : ec ? min(0.4 * V, Sc / 100 * I11 * L11 * e.cohesionNonDrainee / 1.1 / 1.1)
        : Sc / 100 * I11 * L11 * e.cohesionNonDrainee / 1.5;
    const DW = (DZ ** 2 + EA ** 2) === 0 ? 1000
      : (DX + DY + Math.sqrt(EC ** 2 + ED ** 2)) / Math.sqrt(DZ ** 2 + EA ** 2) / e.secuGlissementElu;

    // Basculement (EE:EX), quatre sens. Le coefficient sismique entre dans le
    // MIN/MAX : c'est son signe, pas celui de la charge, qui décide du camp.
    const part = (i, comp, sensPositif, demi) => {
      const m = comp === "My" ? ordre[i].My : ordre[i].Mx;
      const h = comp === "My" ? ordre[i].Hx : ordre[i].Hy;
      const sismique = i >= 8 && i <= 10;
      const cm = sismique ? c[i] * m : m, cv = sismique ? c[i] * ordre[i].V : ordre[i].V, ch = sismique ? c[i] * h : h;
      const bloc = sensPositif
        ? abs(min(cm, 0)) + max(cv, 0) * demi + abs(min(ch, 0)) * BA150
        : max(cm, 0) + abs(min(cv, 0)) * demi + max(ch, 0) * BA150;
      return sismique ? bloc : c[i] * bloc;
    };
    const partOpposee = (i, comp, sensPositif, demi) => {
      const m = comp === "My" ? ordre[i].My : ordre[i].Mx;
      const h = comp === "My" ? ordre[i].Hx : ordre[i].Hy;
      const sismique = i >= 8 && i <= 10;
      const cm = sismique ? c[i] * m : m, cv = sismique ? c[i] * ordre[i].V : ordre[i].V, ch = sismique ? c[i] * h : h;
      const bloc = sensPositif
        ? max(cm, 0) + max(cv, 0) * demi + max(ch, 0) * BA150
        : abs(min(cm, 0)) + abs(min(cv, 0)) * demi + abs(min(ch, 0)) * BA150;
      return sismique ? bloc : c[i] * bloc;
    };
    const cumul = (f, ...args) => { let t = 0; for (let i = 0; i < 12; i += 1) t += f(i, ...args); return t; };

    const EG = cumul(part, "My", true, I11 / 2);
    const EH = cumul(part, "My", false, I11 / 2);
    const EI = min(EH, bu.My);
    const EE = EH === 0 ? 1000 : (EG + EI) / EH / e.secuRenversementElu;

    const EL = cumul(partOpposee, "My", true, I11 / 2);
    const EM = cumul(partOpposee, "My", false, I11 / 2);
    const EN = min(EM, bu.My);
    const EJ = EM === 0 ? 1000 : (EL + EN) / EM / e.secuRenversementElu;

    const EQ = cumul(part, "Mx", true, L11 / 2);
    const ER = cumul(part, "Mx", false, L11 / 2);
    const ES = min(ER, bu.Mx);
    const EO = ER === 0 ? 1000 : (EQ + ES) / ER / e.secuRenversementElu;

    const EV = cumul(partOpposee, "Mx", true, L11 / 2);
    const EW = cumul(partOpposee, "Mx", false, L11 / 2);
    const EX = min(EW, bu.Mx);
    const ET = EW === 0 ? 1000 : (EV + EX) / EW / e.secuRenversementElu;

    // Coefficients de la contrainte (HH:HJ).
    const HH = (e.reglement === "DTU 13.12" && [4, 5, 6, 7].some((i) => c[i] === k.AU42)) ? 4 / 3 : 1;
    const inclinaisonReduite = Math.sqrt((DZ - EC) ** 2 + (EA - ED) ** 2);
    const HI = e.inclinaison === "Sans objet" ? 1
      : e.inclinaison === "Sol cohérent"
        ? (1 - 2 * Math.atan(inclinaisonReduite / V) / Math.PI) ** 2
        : (1 - 2 * Math.atan(inclinaisonReduite / V) / Math.PI) ** 2 * (1 - Math.exp(-BA146))
          + max((1 - 4 * Math.atan(inclinaisonReduite / V) / Math.PI) ** 2, 0) * Math.exp(-BA146);

    // HJ ramène la contrainte ELS à l'échelle de la contrainte admissible ELU,
    // sans quoi une combinaison de service et une combinaison ultime ne se
    // compareraient pas : c'est ce qui fait de EZ un ratio et non une pression.
    const HJ = (ligne >= 320 && e.reglement !== "DTU 13.12") ? 1.5 : 1;
    const FA = min(1000, FB / HH / HI * HJ);
    const FD = min(1000, FE / HH / HI * HJ);
    const EZ = meyerhoff ? FA : FD;

    // Bloc ELS Quasi-permanent (lignes 398 à 409) : le classeur n'y garde que
    // la surface comprimée, et la déclare pleine tant que la résultante reste
    // dans le noyau central (EU, EV, EW).
    const EU = I11 / 6 - FO, EV398 = L11 / 6 - FP;
    const EWqp = min(EU, EV398) < 0 ? Sc : 100;

    resultats.push({ ligne, famille, c, V, Hx, Hy, Mx, My,
      FK, FM, FL, FN, EWqp,
      DW, DX, DY, DZ, EA, EC, ED,
      EE, EG, EH, EI, EJ, EL, EM, EN, EO, EQ, ER, ES, ET, EV, EW, EX,
      EZ, FB, FE, FC, FF, HI, libelle: libelleCombinaison(famille, c, ordre) });
  }

  const bloc = (a, b) => resultats.filter((r) => r.ligne >= a && r.ligne <= b);
  const stabilite = bloc(22, 397);           // le classeur s'arrête à 397
  const argmin = (rangee, cle) => rangee.reduce((best, r) => (r[cle] < best[cle] ? r : best), rangee[0]);
  const minimum = (rangee, cle) => rangee.reduce((m, r) => min(m, r[cle]), Infinity);

  // --- Glissement (R33:O40)
  const gl = argmin(stabilite, "DW");
  const R35 = gl.DW;
  const glissement = {
    ratio: 1 / R35,
    combinaison: gl.libelle,
    HEd: Math.sqrt(gl.DZ ** 2 + gl.EA ** 2),
    Rhd1: max(0, gl.DX),
    Rhd2: gl.DY,
    Rpd: Math.sqrt(gl.EC ** 2 + gl.ED ** 2)
  };
  glissement.HRd = glissement.Rhd1 + glissement.Rpd + glissement.Rhd2;

  // --- Basculement (R41:O48). Douze colonnes : quatre sens × trois familles.
  const SENS = [
    ["ELU Fondamentale", "X > 0", "EE", 22, 99, "EH", "EG", "EI"],
    ["ELU Fondamentale", "X < 0", "EJ", 22, 99, "EM", "EL", "EN"],
    ["ELU Fondamentale", "Y > 0", "EO", 22, 99, "ER", "EQ", "ES"],
    ["ELU Fondamentale", "Y < 0", "ET", 22, 99, "EW", "EV", "EX"],
    ["ELU Accidentelle", "X > 0", "EE", 100, 319, "EH", "EG", "EI"],
    ["ELU Accidentelle", "X < 0", "EJ", 100, 319, "EM", "EL", "EN"],
    ["ELU Accidentelle", "Y > 0", "EO", 100, 319, "ER", "EQ", "ES"],
    ["ELU Accidentelle", "Y < 0", "ET", 100, 319, "EW", "EV", "EX"],
    ["ELS", "X > 0", "EE", 320, 397, "EH", "EG", "EI"],
    ["ELS", "X < 0", "EJ", 320, 397, "EM", "EL", "EN"],
    ["ELS", "Y > 0", "EO", 320, 397, "ER", "EQ", "ES"],
    ["ELS", "Y < 0", "ET", 320, 397, "EW", "EV", "EX"]
  ];
  const colonnes = SENS.map(([cas, sens, cle, a, b, mrv, mst1, mst2]) => {
    const rangee = bloc(a, b);
    const r = argmin(rangee, cle);
    return { cas, sens, rv: r[cle], Mrv: r[mrv], Mst1: r[mst1], Mst2: r[mst2], combinaison: r.libelle };
  });
  const gagnante = colonnes.reduce((best, col) => (col.rv < best.rv ? col : best), colonnes[0]);
  const basculement = {
    ratio: gagnante.rv === 0 ? 10 : 1 / gagnante.rv,
    combinaison: gagnante.combinaison,
    sens: `direction ${gagnante.sens}`,
    MEd: gagnante.Mrv,
    Mst0: gagnante.Mst1,
    Mstb: gagnante.Mst2
  };
  basculement.MRd = basculement.Mst0 + basculement.Mstb;

  // --- Contrainte (R49:O58)
  const ct = stabilite.reduce((best, r) => (r.EZ > best.EZ ? r : best), stabilite[0]);
  const brut = meyerhoff ? stabilite.map((r) => r.FB) : stabilite.map((r) => r.FE);
  const sigmaRef = min(...brut) < 0 ? min(...brut)
    : max(...brut) === 1000 ? Infinity
      : (meyerhoff ? ct.FB : ct.FE);
  const gamma = ct.famille === "ELU" ? k.AV82 : ct.famille === "ELA" ? k.AW82 : k.AU82;
  const sigmaLim = e.contrainteLimite * gamma;
  const contrainte = {
    ratio: sigmaRef === Infinity ? 10 : sigmaRef / (ct.HI * sigmaLim),
    combinaison: ct.libelle,
    // Les moments affichés sont ceux qui restent après ce que la butée a repris.
    Vd: ct.V, Mdx: ct.FK - ct.FM, Mdy: ct.FL - ct.FN,
    sigmaRef, sigmaLim, id: ct.HI,
    sigmaRefLim: ct.HI * sigmaLim
  };

  // --- Surfaces comprimées (AO33:AL43)
  const scCle = meyerhoff ? "FC" : "FF";
  const scEluEla = minimum(bloc(22, 319), scCle);
  const scElsRares = minimum(bloc(320, 397), scCle);
  // AO41 : la surface du bloc quasi-permanent, prise à la ligne où la
  // répartition constante est la plus défavorable — le classeur classe sur FF
  // quelle que soit la répartition retenue.
  const qp = bloc(398, 409);
  const scElsQp = qp.reduce((best, r) => (r.FF < best.FF ? r : best), qp[0]).EWqp;

  const AL36 = scEluEla / 100, AL37 = seuilSc(e, "elu");
  const AL39 = scElsRares / 100, AL40 = seuilSc(e, "elsRares");
  const AL42 = scElsQp / 100, AL43 = seuilSc(e, "elsQp");
  const surfaces = {
    eluEla: { obtenue: scEluEla, minimale: AL37 * 100 },
    elsRares: { obtenue: scElsRares, minimale: AL40 * 100 },
    elsQp: { obtenue: scElsQp, minimale: AL43 * 100 },
    ratio: (AL36 * AL39 * AL42 === 0) ? 10 : max(AL37 / AL36, AL40 / AL39, AL43 / AL42)
  };

  const ratio = max(glissement.ratio, basculement.ratio, contrainte.ratio, surfaces.ratio);
  const uniteEffort = { "{ T ; Tm }": "T", "{ kN ; kNm }": "kN", "{ daN ; daNm }": "daN" }[e.unites];
  const uniteMoment = { "{ T ; Tm }": "Tm", "{ kN ; kNm }": "kNm", "{ daN ; daNm }": "daNm" }[e.unites];

  return {
    bilan: { ratio, verifie: ratio <= 1 },
    glissement, basculement, contrainte, surfaces,
    poidsPropre, butee: bu,
    unites: { effort: uniteEffort, moment: uniteMoment, contrainte: e.unites === "{ kN ; kNm }" ? "MPa" : "bar" },
    combinaisonsExaminees: stabilite.length
  };
}

/** Les surfaces comprimées minimales exigées (AT83, AU83, AW83). */
function seuilSc(e, quel) {
  const dtu = e.reglement === "DTU 13.12";
  const ec = e.reglement === "EC - NF P94-261";
  if (quel === "elu") return dtu ? 1e-4 / 100 : (ec ? (100 / 15) / 100 : 10 / 100);
  if (quel === "elsRares") return dtu ? 1e-4 / 100 : (ec ? 50 / 100 : 75 / 100);
  return dtu ? 1e-4 / 100 : (ec ? (200 / 3) / 100 : 100 / 100);
}

/** Le libellé d'une combinaison, tel que le classeur le compose (CP). */
function libelleCombinaison(famille, c, ordre) {
  const noms = CAS;
  const parts = [];
  const nul = (i) => COMPOSANTES.reduce((t, k) => t + ordre[i][k] ** 2, 0) === 0;
  for (let i = 0; i < 12; i += 1) {
    if (c[i] === 0) continue;
    // Le classeur efface un terme dont la ligne de descente est nulle ; les
    // trois cas sismiques se jugent tous sur la ligne Sx, comme chez lui.
    if (nul(i >= 8 && i <= 10 ? 8 : i)) continue;
    const coef = Math.round(c[i] * 100) / 100;
    parts.push(coef === 1 ? noms[i] : `${String(coef).replace(".", ",")}${noms[i]}`);
  }
  return `${famille} : ${parts.join(" + ")}`;
}
