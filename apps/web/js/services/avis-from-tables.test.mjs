import test from "node:test";
import assert from "node:assert/strict";

import { readTableColumns } from "./avis-figures.js";
import {
  ROW_AVIS_PREFIX,
  SECTION_AVIS_PREFIX,
  avisFromReport,
  isTableAvisKey,
  readTableBands,
  readTableRows,
  tableAvisKey
} from "./avis-from-tables.js";

const item = (text, x, y, width = 100, height = 10) => ({ text, x, y, width, height });

/* La mise en page relevée sur le rapport préalable / APD réel, page 7 : quatre
   colonnes, la lettre **à la hauteur** de sa disposition, l'observation en
   face, et des intitulés de section sans lettre. */
const PAGE_APD = [
  item("Dispositions du projet", 101, 733, 105),
  item("Avis*", 274, 733, 24),
  item("Observations et commentaires", 343, 733, 146),
  item("N°", 542, 733, 11),

  item("4.1 PARAMÈTRES CLIMATIQUES", 37, 719, 160),
  item("4.1.1 Vent", 47, 704, 50),
  item("F", 281, 704, 6),
  item("Vent Région 1", 300, 704, 70),

  item("4.1.2 Neige", 47, 689, 55),
  item("F", 281, 689, 6),
  item("Neige Région E, altitude 980 m", 300, 689, 150),

  item("4.2.2 Connaissance du sol", 47, 621, 130),
  item("4.2.2.2 Nombre et maillage des", 57, 543, 150),
  item("sondages", 37, 531, 45),
  item("S", 281, 543, 6),
  item("Sondages à compléter", 300, 543, 110),
  item("43", 545, 545, 12)
];

const rapport = { documentId: "doc-1", pages: [{ page: 7, items: PAGE_APD }] };

/* ── Ce qui définit une ligne ────────────────────────────────────────────── */

test("chaque lettre de la colonne « Avis » ouvre une ligne", () => {
  const lignes = readTableRows(PAGE_APD, readTableColumns(PAGE_APD), 7);
  assert.equal(lignes.length, 3);
});

test("un intitulé de section ne devient pas un avis : il ne porte pas de lettre", () => {
  // « 4.1 PARAMÈTRES CLIMATIQUES », « 4.2.2 Connaissance du sol » sont des
  // regroupements. En faire des avis fabriquerait des points de contrôle que le
  // rapport n'émet pas.
  const titres = readTableRows(PAGE_APD, readTableColumns(PAGE_APD), 7).map((row) => row.title);

  assert.ok(!titres.includes("PARAMÈTRES CLIMATIQUES"));
  assert.ok(!titres.includes("Connaissance du sol"));
});

test("la ligne porte sa section, son intitulé, sa lettre et son observation", () => {
  const [premiere] = readTableRows(PAGE_APD, readTableColumns(PAGE_APD), 7);

  assert.equal(premiere.section, "4.1.1");
  assert.equal(premiere.title, "Vent");
  assert.equal(premiere.letter, "F");
  assert.equal(premiere.observation, "Vent Région 1");
  assert.equal(premiere.page, 7);
});

test("un intitulé qui passe à la ligne se recolle", () => {
  const lignes = readTableRows(PAGE_APD, readTableColumns(PAGE_APD), 7);
  const coupee = lignes.find((row) => row.section === "4.2.2.2");

  assert.equal(coupee.title, "Nombre et maillage des sondages");
});

test("un numéro posé deux points au-dessus de sa lettre reste sur sa ligne", () => {
  // Relevé sur le document : « 43 » est à y=545, sa lettre à y=543. Sans
  // tolérance au plancher de la bande, la ligne du dessus l'attrapait — et
  // l'avis 43 portait l'intitulé de la disposition précédente. Un numéro sur la
  // mauvaise ligne est un faux, pas une approximation.
  const lignes = readTableRows(PAGE_APD, readTableColumns(PAGE_APD), 7);

  assert.equal(lignes.find((row) => row.section === "4.2.2.2").number, "43");
  assert.equal(lignes.find((row) => row.section === "4.1.2").number, "");
});

/* ── La colonne des articles réglementaires ──────────────────────────────── */

test("la colonne des articles n'entre pas dans l'intitulé", () => {
  // Les rapports sur la sécurité ajoutent « Articles du règlement » à gauche.
  // Non reconnue, elle était avalée : l'intitulé devenait « PE6§1 Isolement… ».
  const page = [
    item("Articles", 43, 748, 30),
    item("du", 54, 738, 12),
    item("règlement", 38, 729, 45),
    item("Dispositions du projet", 140, 738, 105),
    item("Avis*", 301, 738, 24),
    item("Observations et commentaires", 356, 738, 146),
    item("N°", 542, 738, 11),

    item("PE6§1", 42, 658, 35),
    item("6.1.2.2.1 Isolement par rapport à des tiers contigus:", 119, 658, 190),
    item("SO", 308, 658, 14)
  ];

  const [ligne] = readTableRows(page, readTableColumns(page), 9);
  assert.equal(ligne.title, "Isolement par rapport à des tiers contigus:");
  assert.equal(ligne.letter, "SO");
});

/* ── La légende n'est pas une disposition ────────────────────────────────── */

test("la légende des lettres ne se colle pas au dernier intitulé", () => {
  const page = [
    item("Dispositions du projet", 101, 548, 105),
    item("Avis*", 274, 548, 24),
    item("Observations et commentaires", 343, 548, 146),

    item("7.1.7 Sanitaires:", 47, 204, 80),
    item("F", 281, 204, 6),
    item("* F: Favorable ,", 34, 190, 70),
    item(": Défavorable , S : Suspendu , HM: Hors Mission", 107, 190, 200)
  ];

  const [ligne] = readTableRows(page, readTableColumns(page), 12);
  assert.equal(ligne.title, "Sanitaires:");
});

/* ── Plusieurs tableaux sur une page ─────────────────────────────────────── */

test("une page à deux tableaux se lit avec deux géométries", () => {
  // La dernière page du rapport porte la fin d'un tableau à cinq colonnes et le
  // début d'un autre à quatre, décalé de quarante points. Lire les colonnes une
  // fois par page faisait tomber les lettres du second à côté de sa colonne.
  const page = [
    item("Articles", 43, 765, 30),
    item("Dispositions du projet", 140, 765, 105),
    item("Avis*", 301, 765, 24),
    item("Observations et commentaires", 356, 765, 146),
    item("6.1.6.2.4 Dispositions prévues", 119, 649, 154),
    item("PM", 303, 649, 16),

    item("Dispositions du projet", 101, 548, 105),
    item("Avis*", 274, 548, 24),
    item("Observations et commentaires", 343, 548, 146),
    item("7.1.7 Sanitaires:", 47, 204, 80),
    item("F", 281, 204, 6)
  ];

  const bandes = readTableBands(page, readTableColumns);
  assert.equal(bandes.length, 2);

  const lues = bandes.flatMap((bande) => readTableRows(bande.items, bande.columns, 12));
  assert.deepEqual(lues.map((row) => row.title), ["Dispositions prévues", "Sanitaires:"]);
});

/* ── Ce qu'on ne lit pas ─────────────────────────────────────────────────── */

test("une fiche d'avis travaux n'est pas lue par ce lecteur", () => {
  // Elle centre sa lettre au milieu d'une ligne haute, très en dessous de sa
  // rubrique, parce que cette ligne porte une photo. La lire avec cette
  // géométrie-ci prenait la ligne de références du document pour un intitulé.
  // Ses figures la lisent déjà, et bien.
  const fiche = [
    item("Éléments examinés", 106, 772, 95),
    item("Avis*", 274, 772, 25),
    item("Observations et commentaires", 334, 772, 149),
    item("Structure béton armé ou précontraint", 37, 759, 167),
    item("F", 281, 451, 6)
  ];

  assert.deepEqual(readTableBands(fiche, readTableColumns), []);
  assert.deepEqual(avisFromReport({ documentId: "d", pages: [{ page: 2, items: fiche }] }, readTableColumns), []);
});

test("une page sans tableau ne rend rien", () => {
  assert.deepEqual(readTableRows([item("du texte", 10, 500)], null, 1), []);
  assert.deepEqual(avisFromReport({ pages: [] }, readTableColumns), []);
});

/* ── L'identité d'une ligne ──────────────────────────────────────────────── */

test("le numéro imprimé est l'identité, quand il y en a un", () => {
  assert.equal(tableAvisKey({ number: "43", section: "4.2.2.2", title: "Vent", page: 7 }), "43");
  assert.equal(isTableAvisKey("43"), false);
});

test("à défaut, le numéro de section que le document publie", () => {
  const key = tableAvisKey({ number: "", section: "4.2.2.2", title: "Vent", page: 7 });
  assert.equal(key, `${SECTION_AVIS_PREFIX}4.2.2.2`);
  assert.equal(isTableAvisKey(key), true);
});

test("sans section, l'intitulé et le rang dans la page", () => {
  // Une même page peut porter deux fois le même intitulé avec deux avis
  // distincts : les confondre en ferait disparaître un.
  const premiere = tableAvisKey({ title: "Couverture", page: 3, rank: 0 }, { documentId: "d" });
  const seconde = tableAvisKey({ title: "Couverture", page: 3, rank: 1 }, { documentId: "d" });

  assert.notEqual(premiere, seconde);
  assert.ok(premiere.startsWith(ROW_AVIS_PREFIX));
});

test("une ligne sans rien d'identifiable n'entre pas", () => {
  assert.equal(tableAvisKey({ page: 3 }), "");
});

/* ── Bout en bout ────────────────────────────────────────────────────────── */

test("un rapport rend ses lignes comme des avis constatés", () => {
  const avis = avisFromReport(rapport, readTableColumns);

  assert.equal(avis.length, 3);
  assert.equal(avis[0].status, "REPORTED", "on constate, on ne traduit pas la lettre en état");
  assert.equal(avis[0].opinion_raw, "F");
  assert.equal(avis[0].sourceId, "doc-1");
  assert.equal(avis[0].page, 7);
  assert.equal(avis.find((entry) => entry.reference === "43").title, "Nombre et maillage des sondages");
});

test("deux lectures du même rapport rendent les mêmes avis", () => {
  const premiere = avisFromReport(rapport, readTableColumns).map((entry) => entry.key);
  const seconde = avisFromReport(rapport, readTableColumns).map((entry) => entry.key);

  assert.deepEqual(premiere, seconde);
});
