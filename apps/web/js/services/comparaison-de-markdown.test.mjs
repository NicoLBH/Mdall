import test from "node:test";
import assert from "node:assert/strict";

import {
  ETAT, NOMS_DES_ETATS, comparerLesReconstitutions, mesureDeLaComparaison, pagesQuiDivergent
} from "./comparaison-de-markdown.js";
import { assemblerLeMarkdown } from "./reconstitution-markdown.js";

/** Les lignes d'une reconstitution, construites par le service qui les produit. */
function lignes(pages) {
  return assemblerLeMarkdown(pages).lignes;
}

/* ── Ne pas avoir les deux n'est pas « aucune différence » ───────────────── */

/**
 * Un alignement vide se lirait « les deux disent la même chose ». C'est
 * exactement le genre de silence qui trompe (règle 5).
 */
test("sans les deux reconstitutions, il n'y a pas de comparaison", () => {
  const une = lignes([{ page: 1, markdown: "# Un" }]);

  assert.equal(comparerLesReconstitutions(une, null), null);
  assert.equal(comparerLesReconstitutions(null, une), null);
  assert.equal(comparerLesReconstitutions(null, null), null);
});

/* ── Ce qui s'accorde ────────────────────────────────────────────────────── */

test("deux reconstitutions identiques n'ont aucune divergence", () => {
  const pages = [{ page: 1, markdown: "# Réunion n° 7\n\nReprise d'étanchéité." }];
  const { rangees } = comparerLesReconstitutions(lignes(pages), lignes(pages));
  const mesure = mesureDeLaComparaison(rangees);

  assert.equal(mesure.divergentes, 0);
  assert.equal(mesure.part, 1);
  assert.equal(mesure[ETAT.PAREIL], rangees.length);
});

/**
 * **Le même texte écrit autrement n'est pas une divergence de contenu.** Deux
 * reconstitutions honnêtes écrivent souvent le même titre, l'une avec des
 * dièses, l'autre en gras. Les compter comme des divergences noierait les
 * vraies — celles où un mot manque.
 */
test("un titre chez l'une et du gras chez l'autre est un désaccord de forme", () => {
  const { rangees } = comparerLesReconstitutions(
    lignes([{ page: 1, markdown: "## Lot 02 — GROS OEUVRE" }]),
    lignes([{ page: 1, markdown: "**Lot 02 — GROS OEUVRE**" }])
  );

  assert.equal(rangees.length, 1);
  assert.equal(rangees[0].etat, ETAT.FORME);
  assert.equal(mesureDeLaComparaison(rangees).divergentes, 0);
});

/* ── Ce qui diverge ──────────────────────────────────────────────────────── */

/**
 * **Une ligne que l'autre n'a pas**, c'est le cas qu'on vient chercher : l'une
 * des deux se trompe, et c'est là qu'on rouvre le PDF.
 */
test("une ligne absente d'un côté se voit, et de quel côté", () => {
  const { rangees } = comparerLesReconstitutions(
    lignes([{ page: 1, markdown: "Reprise étanchéité\nSondage linteaux\nMise à la terre" }]),
    lignes([{ page: 1, markdown: "Reprise étanchéité\nMise à la terre" }])
  );

  const manquante = rangees.find((rangee) => rangee.etat === ETAT.GAUCHE);
  assert.ok(manquante, "la ligne que la droite n'a pas doit se voir");
  assert.match(manquante.gauche.texte, /Sondage linteaux/);
  assert.equal(manquante.droite, null);

  // Et le reste s'apparie : un simple rang à rang aurait tout décalé.
  assert.equal(mesureDeLaComparaison(rangees)[ETAT.PAREIL], 2);
});

test("une ligne ajoutée à droite se range à droite", () => {
  const { rangees } = comparerLesReconstitutions(
    lignes([{ page: 1, markdown: "Reprise étanchéité" }]),
    lignes([{ page: 1, markdown: "Reprise étanchéité\nConclusion : reprise nécessaire" }])
  );

  const ajoutee = rangees.find((rangee) => rangee.etat === ETAT.DROITE);
  assert.ok(ajoutee);
  assert.match(ajoutee.droite.texte, /Conclusion/);
});

/**
 * **Un décalage ne se propage pas.** Une comparaison rang par rang ferait tout
 * diverger dès qu'une des deux ajoute une ligne en tête — et l'écran
 * signalerait quarante divergences pour une seule.
 */
test("une ligne ajoutée en tête ne décale pas tout le reste", () => {
  const suite = "Un\nDeux\nTrois\nQuatre\nCinq";
  const { rangees } = comparerLesReconstitutions(
    lignes([{ page: 1, markdown: suite }]),
    lignes([{ page: 1, markdown: `# Titre\n${suite}` }])
  );

  const mesure = mesureDeLaComparaison(rangees);
  assert.equal(mesure.divergentes, 1, "une seule ligne diverge, pas toute la page");
  assert.equal(mesure[ETAT.PAREIL], 5);
});

/* ── Les pages ───────────────────────────────────────────────────────────── */

/**
 * **Une page qu'une seule des deux a rendue est une page qui manque**, pas une
 * suite de divergences ligne à ligne.
 */
test("une page rendue d'un seul côté se voit entière", () => {
  const { rangees, pages } = comparerLesReconstitutions(
    lignes([{ page: 1, markdown: "Un" }, { page: 2, markdown: "Deux\nEncore" }]),
    lignes([{ page: 1, markdown: "Un" }])
  );

  assert.deepEqual(pages, [1, 2]);
  const dePage2 = rangees.filter((rangee) => rangee.page === 2);
  assert.ok(dePage2.length >= 2);
  assert.ok(dePage2.every((rangee) => rangee.droite === null));
});

test("l'alignement ne mélange pas deux pages", () => {
  const { rangees } = comparerLesReconstitutions(
    lignes([{ page: 1, markdown: "Commun" }, { page: 2, markdown: "Autre" }]),
    lignes([{ page: 1, markdown: "Autre" }, { page: 2, markdown: "Commun" }])
  );

  // « Commun » est page 1 à gauche et page 2 à droite : les deux divergent.
  assert.equal(mesureDeLaComparaison(rangees).divergentes, 4);
});

/**
 * Une comparaison de quarante pages ne se lit pas en entier. Trois pages
 * nommées se relisent.
 */
test("les pages qui divergent le plus se nomment", () => {
  const { rangees } = comparerLesReconstitutions(
    lignes([
      { page: 1, markdown: "Un" },
      { page: 2, markdown: "Deux\nTrois\nQuatre" },
      { page: 3, markdown: "Cinq" }
    ]),
    lignes([{ page: 1, markdown: "Un" }, { page: 2, markdown: "Deux" }, { page: 3, markdown: "Cinq" }])
  );

  const chaudes = pagesQuiDivergent(rangees, 2);
  assert.equal(chaudes[0].page, 2);
  assert.equal(chaudes[0].divergentes, 2);
});

/* ── Ce qui ne compte pas comme du texte ─────────────────────────────────── */

/**
 * Un filet de tableau — `|---|---|` — ne porte aucun texte. Une reconstitution
 * qui rend un tableau et l'autre une liste divergeraient d'une ligne de plus
 * pour rien.
 */
test("un filet de tableau n'est pas du texte qui manque", () => {
  const { rangees } = comparerLesReconstitutions(
    lignes([{ page: 1, markdown: "|N°|Lot|\n|---|---|\n|1|Gros œuvre|" }]),
    lignes([{ page: 1, markdown: "|N°|Lot|\n|1|Gros œuvre|" }])
  );

  assert.equal(mesureDeLaComparaison(rangees).divergentes, 0);
});

test("chaque état a son nom à l'écran", () => {
  for (const etat of Object.values(ETAT)) {
    assert.ok(NOMS_DES_ETATS[etat], `l'état « ${etat} » n'a pas de nom`);
  }
});

test("une comparaison vide vaut l'accord, et ne divise pas par zéro", () => {
  const mesure = mesureDeLaComparaison([]);
  assert.equal(mesure.total, 0);
  assert.equal(mesure.part, 1);
});
