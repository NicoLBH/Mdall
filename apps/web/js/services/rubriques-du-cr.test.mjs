/**
 * Sous quels titres un compte rendu range ses points.
 *
 * Les fixtures reprennent **la forme** d'un compte rendu de chantier réel — sept
 * rubriques administratives numérotées, puis un titre par lot, puis une section
 * par intervenant — avec des noms d'entreprise inventés : c'est le découpage
 * qu'on vérifie, pas les sociétés.
 *
 * Ce qui est éprouvé ici : le piège du paragraphe numéroté, le refus de croire
 * le modèle sur parole, l'identité qui tient d'un compte rendu au suivant, et
 * le sort d'un point qu'on ne sait pas ranger.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  GENRE,
  MOTS_DU_GENRE,
  estUneRubriqueDeLot,
  genreDeLaRubrique,
  identiteDeLaRubrique,
  mesuresDesRubriques,
  nomDeLaRubrique,
  numeroDeLaRubrique,
  rangerLesPoints,
  rubriquesDuCompteRendu,
  societeDeLaRubrique
} from "./rubriques-du-cr.js";

/* ── Le piège du numéro ──────────────────────────────────────────────────── */

/**
 * **« 2. Installation de chantier » n'est pas le lot n° 2.**
 *
 * C'est le défaut qui coûterait le plus cher : les sept rubriques
 * administratives d'un compte rendu sont numérotées de 1 à 7, et les prendre
 * pour des lots créerait sept lots fantômes dans lesquels on rangerait les
 * points d'installation de chantier, de situations et d'échange de documents.
 */
test("un paragraphe numéroté n'est pas un lot", () => {
  const administratives = [
    { ordre: 1, intitule: "1. Marché de travaux" },
    { ordre: 2, intitule: "2. Installation de chantier" },
    { ordre: 3, intitule: "3. Situation de travaux" },
    { ordre: 6, intitule: "6. Echange de documents" },
    { ordre: 7, intitule: "7. Documents exécutions" }
  ];

  for (const rubrique of administratives) {
    assert.equal(estUneRubriqueDeLot(rubrique), false, rubrique.intitule);
    assert.equal(numeroDeLaRubrique(rubrique), "", rubrique.intitule);
    assert.equal(genreDeLaRubrique(rubrique), GENRE.ADMINISTRATIVE, rubrique.intitule);
  }
});

test("le mot « lot » en tête fait le lot, avec ou sans numéro", () => {
  assert.equal(numeroDeLaRubrique({ intitule: "Lot n° 1 : Démolition / Gros Œuvre" }), "1");
  assert.equal(numeroDeLaRubrique({ intitule: "LOT 02 — CHARPENTE" }), "2");
  assert.equal(numeroDeLaRubrique({ intitule: "Lot n° 12 : VENTILATION" }), "12");

  // Un lot sans numéro reste un lot : il s'identifiera par son nom.
  const sansNumero = { intitule: "Lot Gros Œuvre" };
  assert.equal(estUneRubriqueDeLot(sansNumero), true);
  assert.equal(numeroDeLaRubrique(sansNumero), "");
  assert.equal(identiteDeLaRubrique(sansNumero), "lot:gros oeuvre");
});

/**
 * **Le mot doit être en tête.** Ailleurs dans la phrase il ne prouve rien :
 * « Documents d'exécution par lot » est une rubrique administrative, et en
 * faire un lot en créerait un que le marché ne connaît pas.
 */
test("le mot « lot » au milieu d'une phrase ne fait pas un lot", () => {
  const rubrique = { ordre: 7, intitule: "7. Documents d'exécution par lot" };
  assert.equal(estUneRubriqueDeLot(rubrique), false);
  assert.equal(genreDeLaRubrique(rubrique), GENRE.ADMINISTRATIVE);
});

/* ── Ce que le modèle dit, et ce qu'on en croit ──────────────────────────── */

/**
 * **Le modèle est cru appuyé, pas sur parole.** Sans le mot « lot » dans le
 * titre, il faut qu'il ait rendu un numéro de lot — et un numéro scruté dans
 * l'intitulé ne compte pas, puisque c'est exactement le piège ci-dessus.
 */
test("le modèle fait un lot quand il rend un numéro, pas quand il l'affirme", () => {
  // Il dit « lot » et rend le numéro : on le suit.
  const appuye = { ordre: 9, intitule: "02 — GROS ŒUVRE", genre: "lot", numero: "2" };
  assert.equal(estUneRubriqueDeLot(appuye), true);
  assert.equal(numeroDeLaRubrique(appuye), "2");

  // Il dit « lot » sur un paragraphe numéroté, sans rendre de numéro : on ne
  // le suit pas — c'est le cas où il se trompe, et il se trompe ainsi.
  const affirme = { ordre: 2, intitule: "2. Installation de chantier", genre: "lot", numero: null };
  assert.equal(estUneRubriqueDeLot(affirme), false);
  assert.equal(genreDeLaRubrique(affirme), GENRE.ADMINISTRATIVE);
});

/**
 * **L'écrit l'emporte sur le mot du modèle.** Une rubrique dont le titre nomme
 * une entreprise désigne quelqu'un, quoi qu'en dise le modèle : le confondre
 * avec une procédure ferait perdre l'assignation de tous ses points.
 */
test("un titre qui nomme une entreprise désigne quelqu'un", () => {
  const dite = { ordre: 5, intitule: "Contrôle technique : Entreprise VERIFAS", genre: "administrative" };
  assert.equal(societeDeLaRubrique(dite), "VERIFAS");
  assert.equal(genreDeLaRubrique(dite), GENRE.INTERVENANT);
});

/**
 * **L'inverse n'est pas vrai.** « Coordonnateur SPS » ne nomme aucune société
 * et désigne pourtant un intervenant : là, le modèle a vu la page, et le
 * classer administratif ferait d'un homme une procédure.
 */
test("un intervenant sans société nommée reste un intervenant", () => {
  const sps = { ordre: 4, intitule: "4. Coordonnateur SPS", genre: "intervenant" };
  assert.equal(societeDeLaRubrique(sps), "");
  assert.equal(genreDeLaRubrique(sps), GENRE.INTERVENANT);

  // Et sans rien du tout, la rubrique ne désigne personne.
  assert.equal(genreDeLaRubrique({ ordre: 6, intitule: "6. Echange de documents" }), GENRE.ADMINISTRATIVE);
});

test("la société se lit dans le titre, et le mot du modèle passe devant", () => {
  assert.equal(
    societeDeLaRubrique({ intitule: "Lot n° 1 : Gros Œuvre : Entreprise BERTRAND" }),
    "BERTRAND"
  );
  // Le modèle a lu l'en-tête en entier ; l'intitulé peut n'en être qu'un bout.
  assert.equal(
    societeDeLaRubrique({ intitule: "Lot n° 1 : Gros Œuvre", societe: "BERTRAND" }),
    "BERTRAND"
  );
  assert.equal(societeDeLaRubrique({ intitule: "3. Situation de travaux" }), "");
});

/* ── L'identité, qui doit tenir d'un compte rendu au suivant ─────────────── */

/**
 * **Le numéro du lot, jamais le nom de l'entreprise.** Une société mal recopiée
 * d'une réunion à l'autre ferait deux lots n° 1, donc deux sujets pères, avec
 * des fils des deux côtés et aucun moyen de les réunir.
 */
test("un lot mal orthographié reste le même lot", () => {
  const dixneuf = { ordre: 8, intitule: "Lot n° 1 : Démolition / Gros Œuvre : Entreprise BERTRAND" };
  const vingt = { ordre: 9, intitule: "Lot n°01 : GROS OEUVRE : Entreprise BERTAND" };

  assert.equal(identiteDeLaRubrique(dixneuf), "lot:1");
  assert.equal(identiteDeLaRubrique(vingt), "lot:1");
});

/** Un numéro de paragraphe qui bouge ne change pas la rubrique. */
test("une rubrique administrative s'identifie par son nom, numéro ôté", () => {
  assert.equal(identiteDeLaRubrique({ intitule: "2. Installation de chantier" }), "rubrique:installation de chantier");
  assert.equal(identiteDeLaRubrique({ intitule: "Installation de chantier" }), "rubrique:installation de chantier");
});

/**
 * **Une rubrique qu'on ne sait pas nommer ne se propose pas.** Créer un sujet
 * père appelé « / » serait pire que de n'en créer aucun : il resterait.
 */
test("sans rien de lisible, il n'y a pas d'identité", () => {
  assert.equal(identiteDeLaRubrique({ ordre: 3, intitule: "/" }), "");
  assert.equal(identiteDeLaRubrique({ ordre: 3, intitule: "" }), "");
  assert.equal(identiteDeLaRubrique(null), "");
  // « 12.02.1 » est une référence de point : mise à plat elle ferait un nom.
  assert.equal(identiteDeLaRubrique({ intitule: "12.02.1" }), "");
});

test("une rubrique porte toujours un nom à l'écran", () => {
  assert.equal(nomDeLaRubrique({ ordre: 4, intitule: "4. Coordonnateur SPS" }), "4. Coordonnateur SPS");
  assert.equal(nomDeLaRubrique({ ordre: 4, intitule: "   " }), "Rubrique 4");
  assert.equal(nomDeLaRubrique(null), "Rubrique sans titre");
  assert.equal(MOTS_DU_GENRE[GENRE.ADMINISTRATIVE], "Dispositions générales");
});

/* ── Le rangement ────────────────────────────────────────────────────────── */

/** La forme d'un compte rendu de chantier, en petit. */
const RUBRIQUES = [
  { ordre: 1, intitule: "1. Marché de travaux" },
  { ordre: 4, intitule: "4. Coordonnateur SPS", genre: "intervenant" },
  { ordre: 8, intitule: "Lot n° 1 : Démolition / Gros Œuvre : Entreprise BERTRAND" },
  { ordre: 12, intitule: "Lot n° 12 : VENTILATION TRAITEMENT D'AIR : Entreprise NOVACLIM" }
];

const POINTS = [
  { titre: "Ordre de service notifié", rubrique: 1 },
  { titre: "Mettre en place les inspections communes", rubrique: 4 },
  { titre: "Structure coffrage dalle R+1 réalisé à 30 %", rubrique: 8 },
  { titre: "Engager dès semaine prochaine reprise embrasure du RDC", rubrique: 8 },
  { titre: "Relevé des observations du compte rendu précédent", rubrique: null }
];

test("chaque point se range sous la rubrique qu'il vise", () => {
  const { groupes, orphelins } = rangerLesPoints(POINTS, RUBRIQUES);

  assert.deepEqual(
    groupes.map((groupe) => [groupe.rubrique.identite, groupe.points.length]),
    [["rubrique:marche de travaux", 1], ["rubrique:coordonnateur sps", 1], ["lot:1", 2], ["lot:12", 0]]
  );
  assert.equal(orphelins.length, 1);
  assert.equal(orphelins[0].titre, "Relevé des observations du compte rendu précédent");
});

/**
 * **Un lot vide figure quand même.** Le compte rendu qui ne dit rien d'un lot à
 * cette réunion — son contenu se réduit à « / » — dit tout de même que ce lot
 * existe. C'est ce qui fait qu'il s'ouvre, se ferme, et rouvre à la réunion où
 * il reçoit un point.
 */
test("une rubrique sans point figure au rangement", () => {
  const { groupes } = rangerLesPoints(POINTS, RUBRIQUES);
  const vide = groupes.find((groupe) => groupe.rubrique.identite === "lot:12");

  assert.ok(vide, "le lot n° 12 doit figurer");
  assert.deepEqual(vide.points, []);
  assert.equal(vide.rubrique.societe, "NOVACLIM");
});

/**
 * **Un point qui vise une rubrique qui n'existe pas reste orphelin.** On ne le
 * range pas « au plus proche » : mal rangé ne se voit jamais, orphelin se
 * compte (règle 5).
 */
test("un point qui vise une rubrique inconnue ne se range pas au hasard", () => {
  const { groupes, orphelins } = rangerLesPoints(
    [{ titre: "Reprise d'étanchéité", rubrique: 99 }],
    RUBRIQUES
  );

  assert.equal(orphelins.length, 1);
  assert.equal(groupes.reduce((total, groupe) => total + groupe.points.length, 0), 0);
});

/**
 * **Un doublon n'orpheline pas ses points.** Un compte rendu qui écrit deux
 * fois le même en-tête de lot ne fait qu'un lot — mais les points de la seconde
 * occurrence visent son ordre à elle, et les perdre serait payer une faute de
 * mise en page par des sujets égarés.
 */
test("une rubrique écrite deux fois garde les points des deux", () => {
  const rubriques = [
    { ordre: 8, intitule: "Lot n° 1 : Démolition / Gros Œuvre : Entreprise BERTRAND" },
    { ordre: 21, intitule: "LOT 01 — GROS OEUVRE (suite)" }
  ];
  const points = [{ titre: "Coffrage", rubrique: 8 }, { titre: "Embrasure", rubrique: 21 }];

  const relues = rubriquesDuCompteRendu(rubriques);
  assert.equal(relues.length, 1, "deux écritures d'un lot ne font qu'un lot");
  assert.deepEqual(relues[0].ordres, [8, 21]);

  const { groupes, orphelins } = rangerLesPoints(points, rubriques);
  assert.equal(groupes.length, 1);
  assert.equal(groupes[0].points.length, 2);
  assert.equal(orphelins.length, 0);
});

/** Une rubrique illisible disparaît, et ses points deviennent orphelins. */
test("les rubriques illisibles ne comptent pas, et leurs points non plus", () => {
  const relues = rubriquesDuCompteRendu([
    { ordre: 1, intitule: "1. Marché de travaux" },
    { ordre: 2, intitule: "/" },
    { ordre: 3, intitule: "" }
  ]);

  assert.deepEqual(relues.map((rubrique) => rubrique.identite), ["rubrique:marche de travaux"]);
  assert.deepEqual(rubriquesDuCompteRendu(null), []);
});

/* ── Les mesures ─────────────────────────────────────────────────────────── */

/**
 * **L'orphelin est le chiffre qu'on surveille.** Trois sur cinquante est
 * normal — l'ouverture d'un compte rendu n'a pas de rubrique. Trente dit que la
 * lecture a dérivé, et rien d'autre ne le montrerait.
 */
test("les mesures disent ce qui a été rangé, et ce qui ne l'a pas été", () => {
  assert.deepEqual(mesuresDesRubriques(POINTS, RUBRIQUES), {
    rubriques: 4,
    points: 5,
    rattaches: 4,
    orphelins: 1
  });

  // Sans rubrique lue, tout est orphelin — et cela se dit plutôt que de
  // se présenter comme un document qui n'aurait rien à ranger.
  assert.deepEqual(mesuresDesRubriques(POINTS, []), {
    rubriques: 0,
    points: 5,
    rattaches: 0,
    orphelins: 5
  });

  assert.deepEqual(mesuresDesRubriques(), { rubriques: 0, points: 0, rattaches: 0, orphelins: 0 });
});

/**
 * **Deux absences ne font pas un rangement.**
 *
 * `Number(null)` vaut zéro, et zéro est un ordre comme un autre : un point qui
 * ne vise aucune rubrique viserait la rubrique n° 0, et une rubrique sans ordre
 * l'y accueillerait. Le point serait rangé sous un titre qui n'a rien à voir —
 * et rien ne le dirait, puisqu'il ne serait pas orphelin.
 */
test("une rubrique sans ordre n'attrape pas les points sans rubrique", () => {
  const { groupes, orphelins } = rangerLesPoints(
    [{ titre: "Ouverture de séance", rubrique: null }, { titre: "Préambule" }],
    [{ ordre: null, intitule: "1. Marché de travaux" }]
  );

  assert.deepEqual(groupes[0].rubrique.ordres, []);
  assert.deepEqual(groupes[0].points, []);
  assert.equal(orphelins.length, 2);
});

/**
 * **Relire une liste déjà relue ne la change pas.**
 *
 * Sans cela, un appelant qui aurait déjà normalisé sa liste la verrait
 * disparaître en silence : les rubriques relues ne portent plus le champ
 * `intitule` brut, et l'identité se serait refaite sur du vide. Le rangement
 * serait alors vide, et tous les points orphelins — sans qu'aucune erreur ne
 * soit levée.
 */
test("relire des rubriques déjà relues rend les mêmes", () => {
  const unePasse = rubriquesDuCompteRendu(RUBRIQUES);
  const deuxPasses = rubriquesDuCompteRendu(unePasse);

  assert.deepEqual(deuxPasses, unePasse);

  // Et le rangement tient, quelle que soit la liste qu'on lui donne.
  assert.deepEqual(
    mesuresDesRubriques(POINTS, unePasse),
    mesuresDesRubriques(POINTS, RUBRIQUES)
  );
});

/** Un doublon déjà absorbé le reste au repassage. */
test("les ordres absorbés par un doublon survivent au repassage", () => {
  const relues = rubriquesDuCompteRendu([
    { ordre: 8, intitule: "Lot n° 1 : Démolition / Gros Œuvre : Entreprise BERTRAND" },
    { ordre: 21, intitule: "LOT 01 — GROS OEUVRE (suite)" }
  ]);

  assert.deepEqual(rubriquesDuCompteRendu(relues)[0].ordres, [8, 21]);
});
