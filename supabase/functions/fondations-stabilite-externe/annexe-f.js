/**
 * La capacité portante sismique d'une fondation superficielle — EN 1998-5,
 * annexe F.
 *
 * ## Ce que c'est
 *
 * Une seule inégalité, mais qui remplace tout le reste : sous séisme, on ne
 * vérifie plus séparément le glissement, le basculement et la contrainte — on
 * vérifie que le triplet (effort normal, effort tranchant, moment), réduit par
 * la capacité portante ultime, reste à l'intérieur d'une surface limite. C'est
 * pour cela que le classeur bascule de bilan quand on choisit ce règlement : ce
 * n'est pas une vérification de plus, c'en est une autre.
 *
 * ## D'où viennent ces nombres
 *
 * De l'onglet `EC8-F` du classeur, relevé formule par formule. Les quatorze
 * coefficients du tableau F1 y sont écrits en clair, en deux colonnes — sol
 * cohérent, sol frottant —, et c'est la catégorie de sol qui choisit laquelle.
 *
 * ## Les irrégularités reproduites
 *
 * Le calcul suivant Y emprunte trois grandeurs au calcul suivant X : la
 * longueur `L`, la capacité `Nmax` et la largeur `B` du moment réduit. Une
 * semelle carrée ne le montre pas ; une semelle rectangulaire, si. C'est ce que
 * le classeur écrit, et c'est ce qu'on rend — en le disant.
 */

/** Le tableau F1 de l'annexe F : quatorze coefficients, deux natures de sol. */
export const TABLEAU_F1 = {
  "Sol cohérent": { a: 0.70, b: 1.29, c: 2.14, d: 1.81, e: 0.21, f: 0.44, m: 0.21,
    k: 1.22, kPrime: 1.00, cT: 2.00, cM: 2.00, cMPrime: 1.00, beta: 2.57, gamma: 1.85 },
  "Sol frottant": { a: 0.92, b: 1.25, c: 0.92, d: 1.25, e: 0.41, f: 0.32, m: 0.96,
    k: 1.00, kPrime: 0.39, cT: 1.14, cM: 1.01, cMPrime: 1.01, beta: 2.90, gamma: 2.80 }
};

/** L'accélération de référence par zone. La zone 1 n'y figure pas : voir plus bas. */
export const AGR_PAR_ZONE = { "2": 0.7, "3": 1.1, "4": 1.6, "5": 3 };

/** Le coefficient d'importance. La catégorie I n'y figure pas non plus. */
export const GAMMA_PAR_CATEGORIE = { "II": 1, "III": 1.2, "IV": 1.4 };

/** Le paramètre de sol S, hors zone 5 puis en zone 5. */
export const S_PAR_SOL = {
  A: [1, 1], B: [1.35, 1.2], C: [1.5, 1.15], D: [1.6, 1.35], E: [1.8, 1.4]
};

/** Le coefficient de modèle gRd, par sous-catégorie de sol. */
export const GAMMA_RD = {
  "Sable dense": 1, "Sable lâche sec": 1.15, "Sable lâche saturé": 1.5,
  "Argile non sensible": 1, "Argile sensible": 1.15
};

export const CATEGORIES_SOL = ["Sol cohérent", "Sol frottant"];
export const NATURES_CISAILLEMENT = ["Cisaillement non drainé", "Cisaillement cyclique"];

/**
 * Le critère de l'annexe F pour une combinaison, dans une direction.
 *
 * Rend `Infinity` quand la parenthèse centrale devient négative ou nulle : la
 * fondation est alors au-delà de la surface limite, et une puissance de nombre
 * négatif ne rendrait pas un chiffre plus juste, seulement un chiffre.
 */
export function critereAnnexeF({ N, V, M, F }, k) {
  const noyau = (1 - k.m * F ** k.k) ** k.kPrime - N;
  if (!(noyau > 0) || !(N > 0)) return Infinity;

  const premier = ((1 - k.e * F) ** k.cT) * ((k.beta * V) ** k.cT) / (N ** k.a * noyau ** k.b);
  const second = ((1 - k.f * F) ** k.cMPrime) * ((k.gamma * M) ** k.cM) / (N ** k.c * noyau ** k.d);
  const total = premier + second;
  return Number.isFinite(total) ? total : Infinity;
}

/**
 * La vérification complète, sur les combinaisons accidentelles.
 *
 * @param combinaisons les lignes 100 à 319 déjà pondérées, avec `V`, `Hx`,
 *   `Hy`, `Mx`, `My` et leur libellé.
 */
export function verifierAnnexeF(e, combinaisons) {
  const zone = String(e.zoneSismique ?? "");
  const categorie = String(e.categorieImportance ?? "");
  const typeSol = String(e.typeSolEc8 ?? "");

  if (!AGR_PAR_ZONE[zone]) {
    throw new Error("Annexe F : seules les zones sismiques 2 à 5 sont couvertes — en zone 1 aucun dimensionnement parasismique n'est demandé.");
  }
  if (!GAMMA_PAR_CATEGORIE[categorie]) {
    throw new Error("Annexe F : seules les catégories d'importance II à IV sont couvertes.");
  }
  if (!S_PAR_SOL[typeSol]) throw new Error(`Annexe F : type de sol inconnu — ${typeSol}`);
  const k = TABLEAU_F1[e.categorieSol];
  if (!k) throw new Error(`Annexe F : catégorie de sol inconnue — ${e.categorieSol}`);
  const gammaRd = GAMMA_RD[e.sousCategorieSol];
  if (!gammaRd) throw new Error(`Annexe F : sous-catégorie de sol inconnue — ${e.sousCategorieSol}`);

  const agr = AGR_PAR_ZONE[zone];
  const gammaI = GAMMA_PAR_CATEGORIE[categorie];
  const S = S_PAR_SOL[typeSol][zone === "5" ? 1 : 0];
  const ag = gammaI * agr;                                        // F55
  const av = 0.5 * gammaI * agr * S;                              // F56
  const g = 9.81;

  const cohérent = e.categorieSol === "Sol cohérent";
  const cisaillement = Number(e.resistanceCisaillement) || 0;
  // La résistance entre par l'un ou l'autre coefficient partiel, jamais les deux.
  const c = e.natureCisaillement === "Cisaillement non drainé"
    ? cisaillement / 1.4
    : cisaillement / 1.25;                                        // F51

  const phi = Number(e.angleFrottement) || 0;
  const rad = phi * Math.PI / 180;
  const Nq = Math.exp(Math.PI * Math.tan(rad)) * Math.tan(Math.PI / 4 + rad / 2) ** 2; // F57
  const Ngamma = 2 * (Nq - 1) * Math.tan(rad);                    // F58

  const capacite = (B) => cohérent
    ? (Math.PI + 2) * c * B                                       // F52
    : 0.5 * e.poidsVolumiqueSol * g * (1 + av / g) * B ** 2 * Ngamma; // F59
  const inertie = (B) => cohérent
    ? (c === 0 ? Infinity : e.poidsVolumiqueSol * agr * gammaI * S * B / c) // F53
    : (Math.tan(rad) === 0 ? Infinity : ag / (g * Math.tan(rad))); // F60

  const B = { X: e.sectionLx, Y: e.sectionLy };                   // F47, G47
  // `L` vaut Ly dans les deux directions : le calcul suivant Y emprunte celui
  // suivant X (F48). C'est le classeur, pas un raccourci.
  const L = e.sectionLy;                                          // F48
  const Nmax = { X: capacite(B.X), Y: capacite(B.Y) };            // F49, G49
  const F = { X: inertie(B.X), Y: inertie(B.Y) };                 // F50, G50

  const examiner = (ligne, direction) => {
    const suivantX = direction === "X";
    const NEd = ligne.V / L;
    const VEd = Math.abs(suivantX ? ligne.Hx : ligne.Hy) / L;
    const MEd = Math.abs(suivantX ? ligne.My : ligne.Mx) / L;
    // Le moment réduit se divise, dans les deux directions, par le `Nmax` et le
    // `B` de la direction X. Suivant Y c'est un emprunt — le classeur écrit
    // `F$49` et `F$47` là où l'on attendrait `G$49` et `G$47`.
    const capaciteMoment = Nmax.X;
    const largeurMoment = B.X;
    return {
      NEd, VEd, MEd,
      N: gammaRd * NEd / Nmax[direction],
      V: gammaRd * VEd / Nmax[direction],
      M: gammaRd * MEd / capaciteMoment / largeurMoment
    };
  };

  const directions = ["X", "Y"].map((direction) => {
    let pire = null;
    for (const ligne of combinaisons) {
      const reduits = examiner(ligne, direction);
      const critere = critereAnnexeF({ ...reduits, F: F[direction] }, k);
      if (pire === null || critere > pire.critere) pire = { ...reduits, critere, combinaison: ligne.libelle };
    }
    return { direction, ...(pire ?? { critere: 0, combinaison: null }) };
  });

  const pire = directions.reduce((a, b) => (b.critere > a.critere ? b : a));

  return {
    // Le ratio brut. Le classeur l'arrondit à l'unité dans sa case de bilan, ce
    // qui ferait passer 1,4 pour « vérifié » : on rend le nombre, et on dit que
    // la source l'arrondit.
    ratio: pire.critere,
    verifie: pire.critere <= 1,
    arrondiDeLaSource: Math.round(pire.critere),
    direction: pire.direction,
    combinaison: pire.combinaison,
    parametres: { agr, gammaI, S, ag, av, gammaRd, Nq, Ngamma, cohesion: c },
    directions
  };
}
