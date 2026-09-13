/**
 * La page reposée sur sa grille, **exécutée**.
 *
 * Le défaut que ces modules corrigent ne se voit pas en relisant du code : il
 * se voit en regardant une date de la colonne de droite tomber au milieu d'une
 * phrase de gauche. Les tests le reproduisent donc, fragment par fragment, avec
 * les coordonnées qu'un PDF donne vraiment.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  lignesDeLaPage, misesEnEvidence, pageEnGrille, pageEnMiseEnPage, pagesEnMiseEnPage, pasDeLaGrille
} from "./page-en-grille.js";
import { accorderLesCouleurs, enHexadecimal, nomDeLaCouleur } from "./couleurs-du-pdf.js";

/**
 * Un tableau déguisé, tel qu'un compte rendu de chantier en porte : une
 * remarque à gauche sur deux lignes, deux dates à droite sur une seule.
 */
const TABLEAU_DEGUISE = [
  { text: "Reprise d'étanchéité en toiture, angle", x: 56, y: 730, width: 165, height: 10 },
  { text: "12/03/2026", x: 400, y: 730, width: 50, height: 10 },
  { text: "30/04/2026", x: 470, y: 730, width: 50, height: 10 },
  { text: "nord-ouest, avant réception", x: 56, y: 716, width: 121, height: 10 }
];

/* ── Les colonnes ────────────────────────────────────────────────────────── */

/**
 * **C'est le défaut principal de l'extraction aplatie.** Dans l'ordre du
 * fichier, les deux dates tombent entre « angle » et « nord-ouest » : la phrase
 * de gauche perd son sens, et les dates perdent la leur — on ne sait plus à
 * quelle remarque elles se rapportent.
 */
test("la date de droite ne coupe plus la phrase de gauche", () => {
  const grille = pageEnGrille(TABLEAU_DEGUISE);
  const lignes = grille.split("\n");

  assert.equal(lignes.length, 2);
  // La phrase de gauche est entière sur sa ligne, avant les dates.
  assert.match(lignes[0], /^Reprise d'étanchéité en toiture, angle {4,}12\/03\/2026 {2,}30\/04\/2026$/);
  assert.equal(lignes[1], "nord-ouest, avant réception");

  // **L'écart doit se voir.** Un simple espace se lirait comme un espace de
  // texte, et le modèle recollerait la date à la phrase — ce qu'on corrige ici.
  assert.ok(lignes[0].indexOf("12/03/2026") > 45, "la colonne de droite n'est pas à droite");

  // Et les deux dates restent distinctes : elles ne se collent pas.
  assert.doesNotMatch(grille, /12\/03\/202630\/04\/2026/);
});

/** Une colonne est une colonne : les deux dates se lisent l'une sous l'autre. */
test("deux lignes d'un même tableau alignent leurs colonnes", () => {
  const lignes = pageEnGrille([
    ...TABLEAU_DEGUISE,
    { text: "Sondage réalisé sur linteaux bois", x: 56, y: 700, width: 148, height: 10 },
    { text: "05/03/2026", x: 400, y: 700, width: 50, height: 10 }
  ]).split("\n");

  assert.equal(lignes[0].indexOf("12/03/2026"), lignes[2].indexOf("05/03/2026"));
});

/**
 * **Les listes de chantier ne sont pas numérotées.** Elles se tiennent par un
 * décalage d'alignement : la reprise indentée sous une remarque appartient à
 * cette remarque. Remise à plat, elle devient une remarque indépendante qui
 * n'existe pas.
 */
test("l'indentation d'une liste crantée survit", () => {
  const lignes = pageEnGrille([
    { text: "Étanchéité à reprendre", x: 56, y: 700, width: 100, height: 10 },
    { text: "Relance du 12/03", x: 86, y: 686, width: 70, height: 10 },
    { text: "Relance du 19/03", x: 116, y: 672, width: 70, height: 10 }
  ]).split("\n");

  const decalage = (ligne) => ligne.length - ligne.trimStart().length;
  assert.equal(decalage(lignes[0]), 0);
  assert.ok(decalage(lignes[1]) > 0, "le premier cran a disparu");
  assert.ok(decalage(lignes[2]) > decalage(lignes[1]), "le second cran a disparu");
});

/** L'ordonnée d'un PDF croît vers le haut : la page se lit du haut vers le bas. */
test("les lignes se rendent de haut en bas", () => {
  const lignes = lignesDeLaPage([
    { text: "bas", x: 56, y: 100, width: 20, height: 10 },
    { text: "haut", x: 56, y: 700, width: 20, height: 10 }
  ]);

  assert.deepEqual(lignes.map((ligne) => ligne.fragments[0].text), ["haut", "bas"]);
});

/** Deux fragments d'un même mot, à deux corps différents, restent sur leur ligne. */
test("un exposant ne fabrique pas une ligne à lui seul", () => {
  const lignes = lignesDeLaPage([
    { text: "Réunion n", x: 56, y: 700, width: 45, height: 11 },
    { text: "o", x: 102, y: 703, width: 4, height: 7 },
    { text: "7", x: 107, y: 700, width: 5, height: 11 }
  ]);

  assert.equal(lignes.length, 1);
  assert.equal(lignes[0].fragments.map((fragment) => fragment.text).join(""), "Réunion no7");
});

/**
 * Le pas se mesure sur la page. Trop grand, deux colonnes se collent ; trop
 * petit, la ligne s'étale et le tableau devient illisible.
 */
test("le pas se mesure, et ne dégénère jamais", () => {
  assert.ok(pasDeLaGrille(TABLEAU_DEGUISE) > 3 && pasDeLaGrille(TABLEAU_DEGUISE) < 8);
  // Sans largeur exploitable, un pas de repli plutôt qu'une division par zéro.
  assert.equal(pasDeLaGrille([{ text: "abc", x: 1, y: 1, width: 0 }]), 5);
  assert.equal(pasDeLaGrille([]), 5);
});

/* ── Les mises en évidence ───────────────────────────────────────────────── */

/**
 * **Au bout de sa ligne, et non en légende de page.**
 *
 * La première version listait les passages colorés en bas de page, sous un
 * titre. Le modèle les a pris pour du contenu et les a recopiés là, à la fin,
 * hors de tout contexte — le document doublé, et des encadrés entiers de
 * fragments sans suite. C'était le pire défaut de la restitution.
 */
test("la couleur reste sur sa ligne, et ne bouge pas les colonnes", () => {
  const fragments = [
    { text: "LOT 02 — GROS ŒUVRE", x: 56, y: 750, width: 110, height: 11, bold: true },
    { text: "Présence obligatoire", x: 56, y: 700, width: 95, height: 10, couleur: "#c00000" },
    { text: "12/03/2026", x: 400, y: 700, width: 50, height: 10 }
  ];

  const lignes = pageEnMiseEnPage(fragments).split("\n");

  // La marque est au bout de la ligne colorée, et nulle part ailleurs.
  assert.match(lignes[1], /⟨rouge⟩$/);
  assert.doesNotMatch(lignes[0], /⟨/);
  // Aucune légende de page : c'est elle qui doublait le document.
  assert.doesNotMatch(pageEnMiseEnPage(fragments), /MISES EN ÉVIDENCE/);

  // Et la colonne de droite n'a pas bougé d'un caractère.
  assert.equal(
    lignes[1].indexOf("12/03/2026"),
    pageEnGrille(fragments.map((f) => ({ ...f, couleur: "" }))).split("\n")[1].indexOf("12/03/2026")
  );
});

/**
 * **Le gras n'est pas relevé.** Sur un compte rendu réel il y en a quarante
 * fragments par page — des numéros, des tirets, des en-têtes — et pas un ne dit
 * rien de plus que ce que la grille montre déjà. Les mentions qui comptent
 * (« URGENT ») sont en capitales : elles se lisent telles quelles.
 */
test("le gras ne marque rien, et une page sans couleur ne porte aucune marque", () => {
  const gras = pageEnMiseEnPage([
    { text: "URGENT", x: 56, y: 700, width: 40, height: 10, bold: true }
  ]);

  assert.equal(gras, "URGENT");
  assert.doesNotMatch(pageEnMiseEnPage(TABLEAU_DEGUISE), /⟨/);
});

/** Deux couleurs sur une même ligne se disent toutes les deux, une fois chacune. */
test("une ligne à deux couleurs les nomme toutes les deux", () => {
  const ligne = pageEnMiseEnPage([
    { text: "à faire", x: 56, y: 700, width: 30, height: 10, couleur: "#0000ff" },
    { text: "encore", x: 120, y: 700, width: 30, height: 10, couleur: "#0000ff" },
    { text: "URGENT", x: 200, y: 700, width: 30, height: 10, couleur: "#ff0000" }
  ]);

  assert.match(ligne, /⟨bleu rouge⟩$/);
});

/**
 * `null` — police non résolue — n'est pas « droit ». Les confondre annoncerait
 * en gras tout ce dont on ignore le relief (règle 5).
 */
test("un relief inconnu ne devient pas du gras", () => {
  const relevees = misesEnEvidence([
    { text: "inconnu", bold: null, italic: null },
    { text: "droit", bold: false, italic: false }
  ]);

  assert.deepEqual(relevees.gras, []);
  assert.deepEqual(relevees.italique, []);
});

/* ── Les couleurs ────────────────────────────────────────────────────────── */

test("une couleur se nomme, et le noir ne se nomme pas", () => {
  assert.equal(nomDeLaCouleur("#ff0000"), "rouge");
  assert.equal(nomDeLaCouleur("#c00000"), "rouge");
  assert.equal(nomDeLaCouleur("#0000ff"), "bleu");
  assert.equal(nomDeLaCouleur("#008000"), "vert");
  // Le noir et les gris sombres sont la couleur du texte ordinaire : les
  // annoncer noierait les trois mentions qui comptent.
  assert.equal(nomDeLaCouleur("#000000"), "");
  assert.equal(nomDeLaCouleur("#1a1a1a"), "");
  assert.equal(nomDeLaCouleur(""), "");
});

test("une couleur se normalise, quelle que soit sa forme", () => {
  assert.equal(enHexadecimal("#FF0000"), "#ff0000");
  assert.equal(enHexadecimal("ff0000"), "#ff0000");
  assert.equal(enHexadecimal([1, 0, 0]), "#ff0000");
  assert.equal(enHexadecimal([255, 0, 0]), "#ff0000");
  assert.equal(enHexadecimal(0), "#000000");
  assert.equal(enHexadecimal("bleu"), "");
});

/**
 * **Le refus est le cœur du fichier.** Une couleur mal recollée est bien pire
 * que pas de couleur : un « fait » colorié en rouge inverse le sens d'une
 * ligne, et rien à l'écran ne permettrait de s'en apercevoir (règle 5).
 */
test("deux lectures qui ne disent pas le même texte ne rendent aucune couleur", () => {
  assert.equal(
    accorderLesCouleurs([{ text: "Fait le 12/03", couleur: "#ff0000" }], [{ text: "Fait le 19/03" }]),
    null
  );
  assert.equal(accorderLesCouleurs([], [{ text: "Fait" }]), null);
});

/** Un fragment que pdf.js a scindé au milieu d'un mot garde sa couleur. */
test("les couleurs se recollent malgré un découpage différent", () => {
  const couleurs = accorderLesCouleurs(
    [{ text: "Présence obligatoire ", couleur: "#c00000" }, { text: "au prochain rendez-vous", couleur: "#000000" }],
    [{ text: "Présence" }, { text: " " }, { text: "obligatoire au" }, { text: " prochain rendez-vous" }]
  );

  assert.deepEqual(couleurs, ["#c00000", "", "#c00000", "#000000"]);
});

/* ── Le document entier ──────────────────────────────────────────────────── */

/**
 * **Ne pas avoir la géométrie n'empêche pas de transcrire.** La page repart sur
 * son texte aplati, comme avant — et elle est comptée, pour que l'écran puisse
 * dire que les colonnes n'y sont pas garanties.
 */
test("une page sans géométrie repart à plat, et se compte", () => {
  const { pages, posees, aplaties } = pagesEnMiseEnPage([
    { page: 1, text: "aplati", items: TABLEAU_DEGUISE },
    { page: 2, text: "texte de secours", items: null },
    { page: 3, text: "vide aussi", items: [] }
  ]);

  assert.deepEqual(posees, [1]);
  assert.deepEqual(aplaties, [2, 3]);
  assert.match(pages[0].text, /Reprise d'étanchéité/);
  assert.equal(pages[1].text, "texte de secours");
  assert.equal(pages[2].text, "vide aussi");
});

/** Rien ici n'appelle quoi que ce soit : des fragments entrent, du texte sort. */
test("reposer une page se vérifie sans réseau", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  for (const chemin of ["./page-en-grille.js", "./couleurs-du-pdf.js"]) {
    const source = readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
    assert.doesNotMatch(source, /fetch\(|await import\(/, `${chemin} appelle quelque chose`);
  }
});
