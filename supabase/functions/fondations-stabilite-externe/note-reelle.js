/**
 * Cinq massifs d'une note de calcul réelle.
 *
 * `ARK_Doc_DimFondations24B02335` : neuf massifs dimensionnés pour un bâtiment
 * de neuf portiques, sortis de l'outil dont cet utilitaire est repris, et
 * imprimés avec toutes leurs entrées et toutes leurs sorties. Cinq d'entre eux
 * sont repris ici — ceux dont le PDF rend la saisie sans ambiguïté.
 *
 * ## Ce qu'ils ferment
 *
 * La répartition **Constante** n'était pas étalonnée : son polygone de
 * décompression se résout par une cubique de Cardan, et rien ne prouvait qu'on
 * l'avait transcrite juste. Ces cinq cas sont tous en répartition constante, et
 * ils couvrent en plus ce que le cas du classeur ne montrait pas :
 *
 * - une semelle rectangulaire (1,30 × 1,40) ;
 * - un basculement suivant `Y < 0` et suivant `Y > 0`, pas seulement `X > 0` ;
 * - une descente de charges qui **soulève** la semelle, donc un frottement
 *   négatif ramené à zéro à l'affichage ;
 * - des surfaces comprimées de 0 %, 16 %, 19 %, 21 %, 36 %, 54 %, 85 %, 97 % —
 *   c'est-à-dire toutes les branches du solveur, et pas seulement le cas plein.
 *
 * Vingt-deux grandeurs comparées par massif, combinaisons déterminantes et sens
 * de basculement compris.
 *
 * Aucune donnée nominative n'est reprise : ni le nom de l'affaire, ni celui du
 * client, ni celui de l'auteur. Ce qui est ici, ce sont des cotes et des
 * efforts.
 */

const commun = {
  reglement: "EC - NF P94-261", repartition: "Constante", inclinaison: "Sans objet",
  drainage: "Sol drainé", unites: "{ daN ; daNm }", typeExploitation: "Exploitation",
  densiteSemelle: 2500, densiteFut: 2500, poidsVolumiqueSol: 2000, contrainteLimite: 1.5,
  angleFrottement: 30, buteeMobilisee: 70, angleButee: 35, poidsVolumiqueButee: 2000,
  araseSuperieure: -0.1, hauteurFut: 0, futA: 0, futB: 0
};

export const MASSIFS_NOTE_REELLE = [
  { nom: "Massifs courants Sud",
    entrees: { ...commun, hauteurLz: 0.8, sectionLx: 1.3, sectionLy: 1.3, buteeZi: -0.1, buteeZf: -0.9,
      charges: { G: { V: 1717, Hx: 281 }, Sn: { V: 1385, Hx: 318 },
        W1: { V: -97, Hx: 2684 }, W2: { V: -195, Hx: -1718 }, W3: { V: 97, Hx: -346 } } },
    attendu: { glissement: "ELU : Gmin + 1,5W1", HEd: 4307.0, Rhd1: 2523.9, Rhd2: 0, Rpd: 2489.2, HRd: 5013.0,
      basculement: "ELU : Gmin + 1,5W1", sens: "direction X > 0", MEd: 3540.2, Mst0: 3532.8, Mstb: 730.2, MRd: 4262.9,
      contrainte: "ELU : Gmin + 1,5W1", Vd: 5289.5, Mdx: 0, Mdy: 2715.4, sref: 1.49, sLIM: 2.25, id: 1,
      sc: [21.0, 52.7, 100.0] } },

  { nom: "Massifs courants Centre",
    entrees: { ...commun, hauteurLz: 1.3, sectionLx: 1.3, sectionLy: 1.3, buteeZi: -0.1, buteeZf: -1.4,
      charges: { G: { V: 4144 }, Sn: { V: 4579, Hx: 30 }, W1: { V: -8913, Hx: 1308 }, W2: { V: 2600, Hx: -590 } } },
    attendu: { glissement: "ELU : Gmin + 1,5W1", HEd: 1962.0, Rhd1: 0, Rhd2: 0, Rpd: 1962.0, HRd: 1962.0,
      basculement: "ELU : Gmin + 1,5W1", sens: "direction X > 0", MEd: 11240.8, Mst0: 6483.4, Mstb: 2804.5, MRd: 9287.9,
      contrainte: "ELSR : Gmin + Sn + 0,6W2", Vd: 16113.5, Mdx: 0, Mdy: 0, sref: 0.95, sLIM: 1.5, id: 1,
      sc: [0.0, 100.0, 100.0] } },

  { nom: "Massifs CVt",
    entrees: { ...commun, hauteurLz: 1.4, sectionLx: 1.4, sectionLy: 1.4, buteeZi: -0.1, buteeZf: -1.5,
      charges: { G: { V: 1867, Hx: -281 }, Sn: { V: 1943, Hx: -348 },
        W1: { V: -3397, Hx: 675 }, W2: { V: 892, Hx: -196 }, W3: { V: -2728, Hy: -3123 } } },
    attendu: { glissement: "ELU : Gmin + 1,5W3", HEd: 4692.9, Rhd1: 2398.6, Rhd2: 0, Rpd: 4692.9, HRd: 7091.5,
      basculement: "ELU : Gmin + 1,5W3", sens: "direction Y < 0", MEd: 9422.7, Mst0: 6383.3, Mstb: 3721.6, MRd: 10104.9,
      contrainte: "ELU : Gmin + 1,5W3", Vd: 5027.0, Mdx: 2836.7, Mdy: 0, sref: 1.32, sLIM: 2.25, id: 1,
      sc: [19.4, 85.5, 100.0] } },

  { nom: "Massifs pignon sud",
    entrees: { ...commun, hauteurLz: 0.8, sectionLx: 0.9, sectionLy: 0.9, buteeZi: -0.1, buteeZf: -0.9,
      charges: { G: { V: 1100, Hx: 166 }, Sn: { V: 651, Hx: 182 },
        W1: { V: -113, Hx: 1163, Hy: 231 }, W2: { V: -77, Hx: -807, Hy: 10 }, W3: { V: 63, Hx: -128, Hy: -197 } } },
    attendu: { glissement: "ELU : Gmin + 1,5W1", HEd: 1941.7, Rhd1: 1294.3, Rhd2: 0, Rpd: 1757.8, HRd: 3052.1,
      basculement: "ELU : Gmin + 1,5W1", sens: "direction X > 0", MEd: 1604.7, Mst0: 1296.9, Mstb: 505.5, MRd: 1802.4,
      contrainte: "ELU : Gmin + 1,5W1", Vd: 2712.5, Mdx: 0, Mdy: 1022.9, sref: 2.07, sLIM: 2.25, id: 1,
      sc: [16.2, 54.7, 100.0] } },

  { nom: "Massifs pignon Centre",
    entrees: { ...commun, hauteurLz: 0.8, sectionLx: 1.3, sectionLy: 1.4, buteeZi: -0.1, buteeZf: -0.9,
      charges: { G: { V: 2676, Hx: -10 }, Sn: { V: 1958, Hx: 3 },
        W1: { V: -3804, Hx: 635, Hy: 972 }, W2: { V: 1118, Hx: -291, Hy: 41 }, W3: { V: 944, Hx: -124, Hy: -826 } } },
    attendu: { glissement: "ELU : Gmin + 1,5W1", HEd: 1736.1, Rhd1: 464.7, Rhd2: 0, Rpd: 1736.1, HRd: 2200.9,
      basculement: "ELU : Gmin + 1,5W1", sens: "direction Y > 0", MEd: 5160.6, Mst0: 4676.0, Mstb: 730.2, MRd: 5406.2,
      contrainte: "ELSR : Gmin + Sn + 0,6W2", Vd: 9308.8, Mdx: 0, Mdy: 0, sref: 0.51, sLIM: 1.5, id: 1,
      sc: [36.0, 97.6, 100.0] } }
];
