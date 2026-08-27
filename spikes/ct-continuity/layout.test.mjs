import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveColumns,
  extractAvisFromLayout,
  mergeWrappedLines,
  outlineDepth,
  pickExcerpt,
  readTableRows,
  toRowCandidates
} from "./layout.mjs";

/**
 * Une page de RICT, telle que le PDF la décrit : des fragments avec leur
 * position. Les abscisses reproduisent celles d'un rapport réel — 37 à 75 pour
 * l'arborescence, 280 pour l'avis, 300 pour l'observation, 542 pour le numéro.
 */
function item(text, x, y, extra = {}) {
  return { text, x, y, width: text.length * 5, height: 10, italic: false, bold: false, ...extra };
}

const PAGE = {
  page: 13,
  items: [
    item("Dispositions du projet", 101, 676),
    item("Avis*", 274, 676),
    item("Observations et commentaires", 343, 676),
    item("N°", 542, 676),

    // La virgule finale dit que la ligne était pleine : « INCENDIES » n'y
    // tenait plus. La largeur le dit aussi, et c'est elle que le module lit.
    item("PREVENTION DES BRULURES,", 37, 662, { width: 168 }),
    item("INCENDIES ET EXPLOSIONS D'ORIGINE", 37, 650),
    item("ELECTRIQUE", 37, 638),
    item("Prescriptions spécifiques pour les", 45, 620),
    item("installations électriques des locaux et", 45, 608),
    item("emplacements à risques d'incendie", 45, 596),

    item("protection des circuits par DDR au", 52, 578),
    item("plus égal à 300 mA en schémas TT et", 52, 566),
    item("TN,", 52, 554),
    item("Chaufferie.", 52, 542, { italic: true }),
    item("S", 280, 578),
    item("Les circuits terminaux de la chaufferie", 300, 578),
    item("devront être protégés par dispositif", 300, 566),
    item("249", 542, 578)
  ]
};

const LEGEND = {
  codes: [
    { code: "S", id: "SUSPENDU", label: "Suspendu" },
    { code: "F", id: "FAVORABLE", label: "Favorable" },
    { code: "D", id: "DEFAVORABLE", label: "Défavorable" }
  ]
};

test("les colonnes se déduisent du contenu, pas des en-têtes centrés", () => {
  // « Observations et commentaires » commence à x=343 alors que son texte
  // commence à x=300 : prendre le milieu entre en-têtes rangeait les
  // observations dans la colonne des avis, et le tableau ressortait vide.
  const columns = deriveColumns(PAGE.items, ["S", "F", "D"]);

  assert.equal(columns.opinionX, 280);
  assert.equal(columns.referenceX, 542);
});

test("sans code d'avis reconnaissable, aucune colonne n'est inventée", () => {
  assert.equal(deriveColumns(PAGE.items, []), null);
});

test("une ligne de tableau rend son intitulé réel, pas le chapitre qui la porte", () => {
  const { rows } = readTableRows(PAGE, ["S", "F", "D"]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].title_lines.join(" "), "protection des circuits par DDR au plus égal à 300 mA en schémas TT et TN,");
  assert.equal(rows[0].opinion_raw, "S");
  assert.equal(rows[0].reference_raw, "249");
});

test("l'arborescence du référentiel se lit dans l'indentation", () => {
  const { rows } = readTableRows(PAGE, ["S", "F", "D"]);

  assert.deepEqual(rows[0].ancestors, [
    "PREVENTION DES BRULURES, INCENDIES ET EXPLOSIONS D'ORIGINE ELECTRIQUE",
    "Prescriptions spécifiques pour les installations électriques des locaux et emplacements à risques d'incendie"
  ]);
});

test("le complément d'observation est ce qui est écrit en italique", () => {
  const { rows } = readTableRows(PAGE, ["S", "F", "D"]);

  assert.deepEqual(rows[0].complement_lines, ["Chaufferie."]);
  assert.ok(
    !rows[0].title_lines.join(" ").includes("Chaufferie"),
    "le complément ne doit pas grossir l'intitulé"
  );
});

test("l'observation vient de sa colonne, jamais du texte voisin", () => {
  const { rows } = readTableRows(PAGE, ["S", "F", "D"]);

  assert.equal(
    rows[0].comment_lines.join(" "),
    "Les circuits terminaux de la chaufferie devront être protégés par dispositif"
  );
});

test("une page sans en-tête de tableau n'est pas découpée au jugé", () => {
  const prose = { page: 2, items: [item("Le présent rapport constitue…", 40, 700)] };

  assert.equal(readTableRows(prose, ["S"]), null);
});

test("une page sans fragments positionnés ne produit rien", () => {
  assert.equal(readTableRows({ page: 1, items: [] }, ["S"]), null);
  assert.equal(readTableRows({ page: 1 }, ["S"]), null);
});

/** Une ligne de colonne, telle que la lecture des fragments la rend. */
function ligne(text, x, y, right, extra = {}) {
  return { text, x, y, right, italic: false, ...extra };
}

test("un intertitre écrit sur trois lignes reste un seul intertitre", () => {
  // Sans regroupement, seul le dernier fragment survivait et l'arborescence
  // affichait « CONSTRUCTION » au lieu du titre entier.
  const paragraphs = toRowCandidates(
    [
      ligne("DISPOSITIONS RELATIVES A LA", 37, 662, 260),
      ligne("SECURITE DES PERSONNES", 37, 650, 258),
      ligne("DANS LA CONSTRUCTION", 37, 638, 120),
      ligne("AUTRE CHAPITRE", 37, 620, 130)
    ],
    { numbered: false, columnRight: 268 }
  );

  assert.equal(paragraphs.length, 2, "« CONSTRUCTION » ne tenait pas au bout de la ligne précédente");
  assert.equal(paragraphs[0].text, "DISPOSITIONS RELATIVES A LA SECURITE DES PERSONNES DANS LA CONSTRUCTION");
  assert.equal(paragraphs[1].text, "AUTRE CHAPITRE");
});

test("un intitulé qui porte son avis ouvre sa propre ligne de tableau", () => {
  // « Nombre et maillage des sondages » s'arrête si près du bord que
  // « Profondeur » n'y tenait pas : la règle typographique concluait au
  // débordement. Mais chacun des deux porte son F, et le tableau a le dernier
  // mot — sans quoi soixante-dix intitulés se recollaient deux à deux.
  const lines = [
    ligne("Nombre et maillage des sondages", 52, 509, 227),
    ligne("Profondeur des sondages", 52, 494, 182)
  ];

  assert.equal(toRowCandidates(lines, { numbered: false, columnRight: 269 }).length, 1);
  assert.equal(
    toRowCandidates(lines, { numbered: false, columnRight: 269, scored: [509, 494] }).length,
    2
  );
});

test("les occurrences produites portent l'arborescence et le complément", () => {
  const { occurrences } = extractAvisFromLayout(
    { source_id: "doc", pages: [PAGE] },
    { legend: LEGEND }
  );

  assert.equal(occurrences.length, 1);
  assert.equal(occurrences[0].opinion_label, "Suspendu");
  assert.equal(occurrences[0].external_reference_raw, "249");
  assert.equal(occurrences[0].complement_raw, "Chaufferie.");
  assert.equal(occurrences[0].ancestors.length, 2);
  assert.equal(occurrences[0].source_page, 13);
});

test("sans coordonnées, la géométrie se retire et laisse la place", () => {
  // Un PDF scanné, ou un format que pdf.js n'a pas su positionner : rendre
  // `null` fait reprendre la lecture par lignes plutôt que de ne rien produire.
  assert.equal(extractAvisFromLayout({ source_id: "doc", pages: [{ page: 1, items: [] }] }, { legend: LEGEND }), null);
  assert.equal(extractAvisFromLayout({ source_id: "doc", pages: [] }, { legend: LEGEND }), null);
  assert.equal(extractAvisFromLayout({ source_id: "doc", pages: [PAGE] }, { legend: { codes: [] } }), null);
});

/**
 * Une page de rapport APD. Même tableau, deux différences qui changent tout :
 * une colonne « Articles du règlement » tout à gauche, et un référentiel
 * numéroté dont les lignes de continuation reviennent à la marge de la cellule
 * — donc **plus à gauche** que l'intitulé qu'elles poursuivent.
 */
const APD = {
  page: 9,
  items: [
    item("Articles", 43, 690),
    item("du", 54, 676),
    item("Dispositions du projet", 140, 676),
    item("Avis*", 301, 676),
    item("Observations et commentaires", 356, 676),
    item("N°", 542, 676),
    item("règlement", 38, 662),

    item("6.1 ETABLISSEMENTS RECEVANT", 90, 640),
    item("DU PUBLIC DE 5E CATÉGORIE", 90, 628),

    item("GN5", 50, 616),
    item("6.1.1 Bilan dans le cas", 109, 616),
    item("F", 308, 616),
    item("Restaurant scolaire", 327, 616),

    item("PE4", 50, 604),
    item("6.1.2 Nombre et maillage des", 109, 604),
    item("F", 308, 604),
    item("sondages", 90, 592),

    item("GN8", 50, 580),
    item("6.1.3 Choix des principes", 109, 580),
    item("F", 308, 580)
  ]
};

const APD_LEGEND = { codes: [{ code: "F", id: "FAVORABLE", label: "Favorable" }] };

test("la numérotation d'un intitulé dit sa profondeur, sa continuation n'en a pas", () => {
  assert.equal(outlineDepth("6.1.1.1 Établissements assujettis"), 4);
  assert.equal(outlineDepth("6.1 ETABLISSEMENTS RECEVANT"), 2);
  assert.equal(outlineDepth("sondages"), null);
  // Le RICT porte son propre référentiel dans la même colonne, mais suivi d'une
  // barre : le confondre avec une numérotation d'intitulé ferait lire un
  // rapport pour l'autre.
  assert.equal(outlineDepth("15.20.5 | Zone"), null);
});

test("une ligne sans numéro poursuit la précédente, fût-elle cadrée plus à gauche", () => {
  const merged = mergeWrappedLines([
    { x: 109, y: 604, text: "6.1.2 Nombre et maillage des", italic: false },
    { x: 90, y: 592, text: "sondages", italic: false },
    { x: 109, y: 580, text: "6.1.3 Choix des principes", italic: false }
  ]);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].text, "6.1.2 Nombre et maillage des sondages");
  assert.equal(merged[0].x, 109, "l'indentation reste celle de la première ligne");
});

test("la colonne des articles du règlement ne se mêle pas à l'arborescence", () => {
  const { occurrences } = extractAvisFromLayout(
    { source_id: "apd", pages: [APD] },
    { legend: APD_LEGEND }
  );

  assert.equal(occurrences.length, 3);
  assert.deepEqual(
    occurrences.map((entry) => entry.regulation_article_raw),
    ["GN5", "PE4", "GN8"]
  );
  // Sans colonne reconnue, « règlement » — le mot de l'en-tête resté sous sa
  // ligne — et les sigles eux-mêmes ouvraient l'arborescence de chaque avis.
  for (const occurrence of occurrences) {
    assert.deepEqual(occurrence.ancestors, ["6.1 ETABLISSEMENTS RECEVANT DU PUBLIC DE 5E CATÉGORIE"]);
  }
});

test("un intitulé numéroté se recolle, même revenu à la marge", () => {
  const { occurrences } = extractAvisFromLayout(
    { source_id: "apd", pages: [APD] },
    { legend: APD_LEGEND }
  );

  // La numérotation se détache de l'intitulé, comme partout ailleurs : elle dit
  // la place dans le référentiel, pas ce qui est prescrit.
  assert.equal(occurrences[1].title_raw, "Nombre et maillage des sondages");
  assert.equal(occurrences[1].section_number_raw, "6.1.2");
});

test("un intertitre court n'est pas avalé par l'intitulé qui le précède", () => {
  // Deux lignes à la même abscisse, dans un rapport qui ne numérote pas : rien
  // ne les distingue, sinon que la première s'arrête au tiers de la colonne.
  // « MOYENS » y tenait vingt fois : elle n'a donc pas débordé.
  const paragraphs = toRowCandidates(
    [ligne("ASCENSEURS", 45, 573, 121), ligne("MOYENS DE SECOURS", 45, 559, 170)],
    { numbered: false, columnRight: 267 }
  );

  assert.deepEqual(paragraphs.map((entry) => entry.text), ["ASCENSEURS", "MOYENS DE SECOURS"]);
});

test("un intitulé qui a vraiment débordé garde sa suite", () => {
  // « déverrouillage » ne tenait pas au bout de la première ligne : elle a bien
  // débordé, et les deux lignes sont un seul intitulé.
  const paragraphs = toRowCandidates(
    [
      ligne("Signal sonore et lumineux du", 52, 545, 202),
      ligne("déverrouillage des portes à verrouillage", 52, 533, 256)
    ],
    { numbered: false, columnRight: 267 }
  );

  assert.deepEqual(paragraphs.map((entry) => entry.text), [
    "Signal sonore et lumineux du déverrouillage des portes à verrouillage"
  ]);
});

test("l'extrait cité est celui que le document contient vraiment", () => {
  const row = {
    opinion_raw: "F",
    comment_lines: [],
    title_lines: ["6.1.2 Nombre et maillage des sondages"]
  };

  // Le PDF aplati recolle le code derrière l'intitulé dans un rapport APD…
  assert.equal(
    pickExcerpt("6.1.2 Nombre et maillage des\nsondages\nF\n", row),
    "6.1.2 Nombre et maillage des sondages F"
  );
  // …et devant dans un autre. On ne parie sur aucun des deux.
  assert.equal(
    pickExcerpt("m1.\nF 6.1.2 Nombre et maillage des sondages\n", row),
    "F 6.1.2 Nombre et maillage des sondages"
  );
});

test("une page qui porte deux tableaux est lue comme deux tableaux", () => {
  const items = [
    ...APD.items,
    item("* F: Favorable", 34, 560),

    item("Dispositions du projet", 101, 540),
    item("Avis*", 274, 540),
    item("Observations et commentaires", 343, 540),
    item("N°", 542, 540),
    item("7.1.1 Largeur ≥ 1,40 m", 57, 520),
    item("F", 280, 520),
    item("Conforme", 300, 520),
    item("7.1.2 Ressaut", 57, 508),
    item("F", 280, 508),
    item("Conforme", 300, 508),
    item("7.1.3 Pente", 57, 496),
    item("F", 280, 496),
    item("Conforme", 300, 496)
  ];

  const table = readTableRows({ page: 9, items }, ["F"]);

  // Les deux tableaux n'ont ni les mêmes colonnes ni la même géométrie : lus
  // comme un seul, la colonne des avis se plaçait entre les deux, là où il n'y
  // a rien, et le tableau ressortait vide.
  assert.equal(table.rows.length, 6);
  assert.deepEqual(
    table.rows.slice(3).map((row) => row.title_lines.join(" ")),
    ["7.1.1 Largeur ≥ 1,40 m", "7.1.2 Ressaut", "7.1.3 Pente"]
  );
});

test("un chapitre ouvert en bas de page porte encore les avis de la suivante", () => {
  const suite = {
    page: 10,
    items: [
      item("Articles", 43, 690),
      item("du", 54, 676),
      item("Dispositions du projet", 140, 676),
      item("Avis*", 301, 676),
      item("Observations et commentaires", 356, 676),
      item("N°", 542, 676),
      item("règlement", 38, 662),

      item("GN1", 50, 640),
      item("6.1.4 Vérifications techniques", 109, 640),
      item("F", 308, 640),
      item("PE5", 50, 628),
      item("6.1.5 Évacuation", 109, 628),
      item("F", 308, 628),
      item("PE6", 50, 616),
      item("6.1.6 Désenfumage", 109, 616),
      item("F", 308, 616)
    ]
  };

  const { occurrences } = extractAvisFromLayout(
    { source_id: "apd", pages: [APD, suite] },
    { legend: APD_LEGEND }
  );

  assert.equal(occurrences.length, 6);
  assert.deepEqual(
    occurrences[3].ancestors,
    ["6.1 ETABLISSEMENTS RECEVANT DU PUBLIC DE 5E CATÉGORIE"],
    "le chapitre ouvert page 9 vaut encore page 10"
  );
});

test("la cellule d'où l'avis a été lu est consignée", () => {
  const { occurrences } = extractAvisFromLayout(
    { source_id: "apd", pages: [APD] },
    { legend: APD_LEGEND }
  );

  assert.deepEqual(occurrences[0].opinion_cell, { page: 9, x: 308, y: 616, text: "F" });
});

/**
 * Une fiche d'avis travaux, telle que le PDF la décrit.
 *
 * Deux différences avec un rapport, et chacune défaisait une hypothèse : sa
 * première colonne s'intitule « Éléments examinés », et son intitulé est
 * centré verticalement dans sa cellule quand l'observation, elle, part du
 * haut. La deuxième ligne, enfin, n'a pas d'appréciation — le bureau de
 * contrôle a laissé la case vide tout en lui donnant un numéro.
 */
const FICHE = {
  page: 1,
  items: [
    item("Éléments examinés", 98, 394),
    item("Avis*", 274, 394),
    item("Observations et commentaires", 320, 394),
    item("N°", 533, 394),

    item("Rappel de l'observation précédente :", 300, 378),
    item("La distance de 40 cm n'est pas respectée", 300, 366),
    item("Ext > 40 cm angle rentrant", 37, 360),
    item("F", 282, 354),
    item("pour la porte WC Scol. 1", 300, 354),
    item("L'avis 171 est levé.", 300, 331),

    item("Couche de fondation du dallage", 37, 313),
    item("Présence de matières organiques au", 300, 313),
    item("niveau de l'arase de terrassement:", 300, 302),
    item("des purges seront à prévoir avant la", 300, 290),
    item("234", 532, 217),

    item("SOCOTEC Construction - S.A.S. au capital de 9 116 700 euros", 34, 52),
    item("Siège social : Immeuble Mirabeau - 5, place des Frères Montgolfier", 34, 44)
  ]
};

const FICHE_LEGEND = { codes: [{ code: "F", id: "FAVORABLE", label: "Favorable" }] };

/** La seconde page d'une fiche : sa légende, et le même pied de page. */
const FICHE_SUITE = {
  page: 2,
  items: [
    item("* F: Favorable , D: Défavorable", 34, 776),
    item("Date d’émission : 20/05/2025", 34, 614),
    item("SOCOTEC Construction - S.A.S. au capital de 9 116 700 euros", 34, 52),
    item("Siège social : Immeuble Mirabeau - 5, place des Frères Montgolfier", 34, 44)
  ]
};

test("une fiche nomme sa première colonne autrement, et c'est le même tableau", () => {
  const table = readTableRows(FICHE, ["F"]);

  assert.ok(table, "« Éléments examinés » vaut « Dispositions du projet »");
  assert.equal(table.rows.length, 2);
});

test("une observation écrite au-dessus de son intitulé lui revient tout entière", () => {
  const [premiere] = readTableRows(FICHE, ["F"]).rows;

  // Ancrée sur le F, la ligne perdait les deux premières lignes de son
  // observation : elles sont écrites plus haut que l'intitulé qu'elles
  // commentent.
  assert.equal(premiere.title_lines.join(" "), "Ext > 40 cm angle rentrant");
  assert.deepEqual(premiere.comment_lines, [
    "Rappel de l'observation précédente :",
    "La distance de 40 cm n'est pas respectée",
    "pour la porte WC Scol. 1",
    "L'avis 171 est levé."
  ]);
});

test("une ligne numérotée sans appréciation reste une ligne", () => {
  const { occurrences } = extractAvisFromLayout(
    { source_id: "fiche", pages: [FICHE, FICHE_SUITE] },
    { legend: FICHE_LEGEND }
  );

  const numerotee = occurrences.find((entry) => entry.external_reference_raw === "234");

  // Le bureau de contrôle ne numérote que ce qu'il entend suivre. Taire cette
  // ligne faisait disparaître la création de l'avis : il ne réapparaissait
  // qu'au récapitulatif suivant, un an plus tard, sans commencement.
  assert.ok(numerotee, "l'avis numéroté existe, même sans code lu");
  assert.equal(numerotee.title_raw, "Couche de fondation du dallage");
  assert.equal(numerotee.opinion_raw, null);
  assert.equal(numerotee.opinion_normalized, null);
  assert.equal(numerotee.opinion_confidence, null, "aucun avis reconnu n'est pas un avis douteux");
  assert.equal(numerotee.opinion_cell, null);
});

test("ce qu'un document répète à chaque page n'est pas le contenu d'un tableau", () => {
  const { occurrences } = extractAvisFromLayout(
    { source_id: "fiche", pages: [FICHE, FICHE_SUITE] },
    { legend: FICHE_LEGEND }
  );

  // Raison sociale et siège social sont cadrés tout à gauche, sous le tableau :
  // ils devenaient le premier chapitre de l'arborescence de chaque avis.
  for (const occurrence of occurrences) {
    assert.deepEqual(occurrence.ancestors, [], "le cadre du document n'est pas son référentiel");
  }
});
