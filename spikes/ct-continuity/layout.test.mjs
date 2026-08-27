import test from "node:test";
import assert from "node:assert/strict";

import { deriveColumns, extractAvisFromLayout, readTableRows, splitDispositionBand, toParagraphs } from "./layout.mjs";

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

    item("PREVENTION DES BRULURES,", 37, 662),
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

test("un intertitre écrit sur trois lignes reste un seul intertitre", () => {
  // Sans regroupement, seul le dernier fragment survivait et l'arborescence
  // affichait « CONSTRUCTION » au lieu du titre entier.
  const paragraphs = toParagraphs([
    { x: 37, y: 662, text: "DISPOSITIONS RELATIVES A LA", italic: false },
    { x: 37, y: 650, text: "SECURITE DES PERSONNES", italic: false },
    { x: 37, y: 638, text: "DANS LA CONSTRUCTION", italic: false },
    { x: 37, y: 620, text: "AUTRE CHAPITRE", italic: false }
  ]);

  assert.equal(paragraphs.length, 2, "l'air entre deux paragraphes les sépare");
  assert.equal(paragraphs[0].text, "DISPOSITIONS RELATIVES A LA SECURITE DES PERSONNES DANS LA CONSTRUCTION");
  assert.equal(paragraphs[1].text, "AUTRE CHAPITRE");
});

test("un retour à gauche annonce la ligne suivante, pas celle en cours", () => {
  const band = [
    { x: 75, y: 540, text: "Intitulé de la ligne", italic: false },
    { x: 75, y: 528, text: "suite de l'intitulé", italic: false },
    { x: 60, y: 510, text: "NOUVEAU CHAPITRE", italic: false }
  ];

  const { title, outlineUpdates } = splitDispositionBand(band);

  assert.deepEqual(title, ["Intitulé de la ligne", "suite de l'intitulé"]);
  assert.deepEqual(outlineUpdates.map((entry) => entry.text), ["NOUVEAU CHAPITRE"]);
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
