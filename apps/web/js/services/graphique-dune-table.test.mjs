/**
 * Regarder un tableau autrement, et ce que cela range où.
 *
 * **Les tableaux viennent d'une vraie boucle**, et jamais d'objets façonnés
 * ici : une table écrite à la main prendrait les hypothèses du code pour des
 * faits, et cesserait d'éprouver ce que le langage produit vraiment.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  DIT_DE_LA_LECTURE, LECTURE, SUGGESTIBLES,
  abscissesPossibles, choixGarde, ditDuGroupe, lectureDite, lectureQuiVaDeSoi,
  lectureRetenue, lectureSuggeree, lecturesPossibles, phraseDesCadres,
  phraseDesEcartees, seriesDuTableau
} from "./graphique-dune-table.js";
import { lancerLeBrouillon } from "./bac-dessai.js";

/** Le tableau qu'une fonction déroule vraiment, pour les réponses données. */
const tableauDe = (corps, reponses) => lancerLeBrouillon(
  [{ nom: "essai.ref", contenu: `fonction F(zones, Section, Charge) {\n${corps}\n}\n` }],
  reponses
)[0].tableau;

const DEUX_COLONNES = tableauDe([
  "   pour chaque Hauteur de 1 m à 4 m par pas de 1 m",
  "      calcule Volume = Hauteur * Section;",
  "      calcule Double = Volume * 2;",
  "   calcule Total = la somme de Volume;",
  "   si (Total > 0 m³)",
  "   alors (Total);"
].join("\n"), { Section: "0,5 m²" });

/** Un tableau dont les colonnes ne mesurent pas la même chose. */
const DEUX_GRANDEURS = tableauDe([
  "   pour chaque Niveau de 1 à 3 par pas de 1",
  "      calcule Surface = Niveau * Section;",
  "      calcule Poussée = Niveau * Charge;",
  "   calcule Total = la somme de Surface;",
  "   si (Total > 0 m²)",
  "   alors (Total);"
].join("\n"), { Section: "0,5 m²", Charge: "12 kN" });

/* ── Les séries ──────────────────────────────────────────────────────────── */

test("une colonne fait une série, et l'abscisse est la variable de boucle", () => {
  /**
   * **Il n'y a pas de choix à faire** : c'est ce qui change d'une ligne à
   * l'autre, et tout le reste en découle. C'est aussi ce qui distingue les
   * trois lectures ordinaires du nuage, qui, lui, choisit la sienne.
   */
  const rendu = seriesDuTableau(DEUX_COLONNES);

  assert.equal(rendu.abscisse, "Hauteur");
  assert.equal(rendu.unite, "m");
  assert.equal(rendu.groupes.length, 1, "deux colonnes de même grandeur font un cadre");
  assert.deepEqual(rendu.groupes[0].series.map((une) => une.nom), ["Volume", "Double"]);
  assert.deepEqual(rendu.groupes[0].series[0].points.map((un) => [un.x, un.y]),
    [[1, 0.5], [2, 1], [3, 1.5], [4, 2]]);
  // Ce qui était écrit voyage avec le point : c'est ce qu'on lit au survol.
  assert.deepEqual(rendu.groupes[0].series[0].points[0], { x: 1, y: 0.5, dit: "1 m", vaut: "0,5 m³" });
  assert.equal(rendu.dessinable, true);
});

test("deux grandeurs font deux cadres, et aucune n'est perdue", () => {
  /**
   * **C'est ce qui remplace l'écart.** Jusqu'ici la seconde colonne était
   * écartée, et le tableau perdait la moitié de ce qu'il portait. Les mettre
   * sur une grille les ferait se croiser là où elles ne se croisent pas ; un
   * second axe à droite reviendrait au même, en plus discret.
   */
  const brutes = DEUX_GRANDEURS.lignes.map((une) => une.cases.map((quoi) => quoi.connu));
  assert.ok(brutes.every((une) => une.every(Boolean)), "les deux colonnes se calculent");

  const rendu = seriesDuTableau(DEUX_GRANDEURS);
  assert.equal(rendu.groupes.length, 2);
  assert.deepEqual(rendu.groupes.map((un) => un.series.map((une) => une.nom)), [["Surface"], ["Poussée"]]);
  assert.deepEqual(rendu.ecartees, []);

  // Et chaque cadre dit ce qu'il mesure : sans un mot, deux cadres se lisent
  // comme un seul dessin coupé en deux.
  assert.deepEqual(rendu.groupes.map((un) => un.unite), ["m²", "kN"]);
  assert.deepEqual(rendu.groupes.map((un) => un.dit), ["une surface", "une force"]);

  // Et les deux varient vraiment : un cadre plat se dessinerait au milieu, et
  // l'épreuve tiendrait sans que le rangement soit juste.
  assert.deepEqual(rendu.groupes[1].series[0].points.map((un) => un.y), [12, 24, 36]);
  assert.match(phraseDesCadres(rendu.groupes), /un cadre par grandeur, la même abscisse pour tous/);
});

test("une seule grandeur ne s'annonce pas : il n'y a rien à distinguer", () => {
  // La phrase des cadres ne sert qu'à dire pourquoi il y en a plusieurs.
  assert.equal(phraseDesCadres(seriesDuTableau(DEUX_COLONNES).groupes), "");
  assert.equal(phraseDesCadres([]), "");
  assert.equal(phraseDesCadres(), "");
});

test("un nombre nu prend l'échelle du premier groupe qu'il peut partager", () => {
  /**
   * **C'est ce que le langage décide partout ailleurs** (`memeGrandeur`), et
   * une seconde décision ici finirait par ne plus dire la même chose
   * (règle 10). Un rang sans unité n'ouvre donc pas un cadre à lui seul.
   */
  const tableau = tableauDe([
    "   pour chaque Hauteur de 1 m à 3 m par pas de 1 m",
    "      calcule Volume = Hauteur * Section;",
    "      calcule Rang = Hauteur * 2;",
    "   calcule Total = la somme de Volume;",
    "   si (Total > 0 m³)",
    "   alors (Total);"
  ].join("\n"), { Section: "0,5 m²" });

  const rendu = seriesDuTableau(tableau);
  // « Rang » est en mètres — c'est une longueur, et le volume n'en est pas une.
  assert.equal(rendu.groupes.length, 2);
  assert.deepEqual(rendu.groupes.map((un) => un.unite), ["m³", "m"]);
});

test("un cadre ramène toutes ses colonnes à une seule unité", () => {
  /**
   * **Deux unités d'une même grandeur se dessinent ensemble, et c'est le point
   * du cadre** : un mètre et un centimètre mesurent la même chose. Encore
   * faut-il les ramener — cinquante centimètres posés tels quels à côté d'un
   * mètre se dessinent cinquante fois plus haut, et le dessin reste
   * parfaitement lisible.
   *
   * Le cadre est ouvert ici par une colonne **sans unité**, qui est le cas
   * fragile : elle n'en impose aucune, et le cadre doit prendre celle de la
   * première colonne qui en porte une. Sans cela il n'aurait pas d'unité de
   * référence, ne convertirait rien, et ne pourrait pas dire ce qu'il mesure.
   */
  const tableau = tableauDe([
    "   pour chaque Niveau de 1 à 3 par pas de 1",
    "      calcule Rang = Niveau * 2;",
    "      calcule Hauteur = Niveau * 1 m;",
    "      calcule Épaisseur = Niveau * 50 cm;",
    "   calcule Total = la somme de Hauteur;",
    "   si (Total > 0 m)",
    "   alors (Total);"
  ].join("\n"), {});

  const rendu = seriesDuTableau(tableau);
  assert.equal(rendu.groupes.length, 1, "une longueur et un nombre nu font un seul cadre");

  const groupe = rendu.groupes[0];
  assert.equal(groupe.unite, "m", "le cadre n'a pris aucune unité de référence");
  assert.equal(groupe.dit, "une longueur");

  // Cinquante centimètres valent un demi-mètre, et se dessinent comme tels.
  assert.deepEqual(groupe.series.map((une) => une.nom), ["Rang", "Hauteur", "Épaisseur"]);
  assert.deepEqual(groupe.series[2].points.map((un) => un.y), [0.5, 1, 1.5]);
  assert.deepEqual(groupe.series[1].points.map((un) => un.y), [1, 2, 3]);

  // Ce qui était écrit voyage intact : c'est le tableau qui porte l'exactitude,
  // pas le dessin.
  assert.deepEqual(groupe.series[2].points.map((un) => un.vaut), ["50 cm", "100 cm", "150 cm"]);
});

test("une colonne que rien n'a su calculer est écartée, et nommée", () => {
  // Elle reste au tableau, avec ses cases vides : c'est là qu'on la lit. Sur le
  // dessin, elle n'aurait aucun point à poser. Les taire ferait un dessin qui a
  // l'air complet (règle 5).
  const tableau = tableauDe([
    "   pour chaque Hauteur de 1 m à 3 m par pas de 1 m",
    "      calcule Volume = Hauteur * Section;",
    "      calcule Impossible = Hauteur * Charge;",
    "   calcule Total = la somme de Volume;",
    "   si (Total > 0 m³)",
    "   alors (Total);"
  ].join("\n"), { Section: "0,5 m²" });

  const rendu = seriesDuTableau(tableau);
  assert.deepEqual(rendu.groupes.flatMap((un) => un.series.map((une) => une.nom)), ["Volume"]);
  assert.deepEqual(rendu.ecartees, ["Impossible"]);
  assert.match(phraseDesEcartees(rendu.ecartees), /« Impossible » n'est pas dessinée : aucune ligne/);
});

test("une ligne manquée laisse un trou, et ne déplace pas les autres", () => {
  /**
   * **Le point n'est pas posé, et les suivants gardent leur abscisse.** Décaler
   * ferait glisser toute la fin de la courbe d'un cran, et le dessin serait
   * faux sans que rien ne le dise.
   */
  const tableau = tableauDe([
    "   pour chaque Hauteur de 1 m à 3 m par pas de 1 m",
    "      calcule Écart = Hauteur - Charge;",
    "   calcule Total = la somme de Écart;",
    "   si (Total > 0 m)",
    "   alors (Total);"
  ].join("\n"), { Charge: "1 m" });

  const troue = {
    ...tableau,
    lignes: tableau.lignes.map((une, rang) => (rang === 1
      ? { ...une, cases: une.cases.map((quoi) => ({ ...quoi, connu: false, valeur: "" })) }
      : une))
  };

  const rendu = seriesDuTableau(troue);
  assert.deepEqual(rendu.groupes[0].series[0].points.map((un) => un.x), [1, 3]);
  assert.deepEqual(rendu.groupes[0].series[0].points.map((un) => un.dit), ["1 m", "3 m"]);
});

test("un tableau qu'on ne peut pas dessiner le dit, et n'offre pas de bouton", () => {
  // Un bouton qui ouvre un cadre vide apprend à ne plus cliquer sur les
  // boutons.
  const unSeulPoint = tableauDe([
    "   pour chaque Hauteur de 1 m à 1 m par pas de 1 m",
    "      calcule Volume = Hauteur * Section;",
    "   calcule Total = la somme de Volume;",
    "   si (Total > 0 m³)",
    "   alors (Total);"
  ].join("\n"), { Section: "0,5 m²" });

  assert.equal(seriesDuTableau(unSeulPoint).dessinable, false);
  assert.deepEqual(lecturesPossibles(unSeulPoint), [LECTURE.TABLEAU]);
  assert.deepEqual(lecturesPossibles(DEUX_COLONNES),
    [LECTURE.TABLEAU, LECTURE.COURBE, LECTURE.BARRES, LECTURE.NUAGE]);
});

test("sans tableau, rien ne se dessine et rien ne tombe", () => {
  assert.equal(seriesDuTableau(null).dessinable, false);
  assert.deepEqual(seriesDuTableau().groupes, []);
  assert.deepEqual(lecturesPossibles(null), [LECTURE.TABLEAU]);
  assert.deepEqual(abscissesPossibles(null), []);
  assert.equal(phraseDesEcartees([]), "");
  assert.equal(phraseDesEcartees(), "");
  assert.equal(ditDuGroupe(""), "");
  assert.equal(ditDuGroupe("kN/m"), "", "une unité composée n'a pas de nom de grandeur");
});

/* ── Le nuage : une colonne contre une autre ─────────────────────────────── */

test("un nuage dessine une colonne contre une autre, et la variable dit d'où vient le point", () => {
  /**
   * **C'est une autre question que les trois premières** — non plus « comment
   * ça varie » mais « qu'est-ce qui va avec quoi ». L'abscisse cesse d'être la
   * variable de boucle, et c'est précisément pour cela qu'elle se choisit.
   */
  const rendu = seriesDuTableau(DEUX_COLONNES, { abscisse: "Volume" });

  assert.equal(rendu.abscisse, "Volume");
  assert.equal(rendu.unite, "m³");
  // La colonne mise en abscisse ne se dessine pas contre elle-même : ce serait
  // une diagonale parfaite, qui n'apprend rien.
  assert.deepEqual(rendu.groupes.flatMap((un) => un.series.map((une) => une.nom)), ["Double"]);
  assert.deepEqual(rendu.groupes[0].series[0].points.map((un) => [un.x, un.y]),
    [[0.5, 1], [1, 2], [1.5, 3], [2, 4]]);

  /**
   * **Sans la variable de boucle, on lit un nuage sans savoir lequel de ses
   * points est la troisième ligne.** En abscisse elle se lisait d'elle-même ;
   * ici elle est la seule chose qui rattache un point au tableau.
   */
  assert.equal(rendu.groupes[0].series[0].points[2].dit, "1,5 m³ (Hauteur 3 m)");
  assert.equal(rendu.groupes[0].series[0].points[2].vaut, "3 m³");
});

test("on n'offre en abscisse que ce qui se dessine vraiment", () => {
  // Une colonne qui ne laisserait rien à dessiner contre elle n'est pas une
  // question : un nuage d'une colonne contre elle-même est une diagonale.
  assert.deepEqual(abscissesPossibles(DEUX_COLONNES), ["Volume", "Double"]);

  const uneSeule = tableauDe([
    "   pour chaque Hauteur de 1 m à 3 m par pas de 1 m",
    "      calcule Volume = Hauteur * Section;",
    "   calcule Total = la somme de Volume;",
    "   si (Total > 0 m³)",
    "   alors (Total);"
  ].join("\n"), { Section: "0,5 m²" });

  assert.deepEqual(abscissesPossibles(uneSeule), [], "une colonne seule n'est pas un nuage");
  assert.deepEqual(lecturesPossibles(uneSeule), [LECTURE.TABLEAU, LECTURE.COURBE, LECTURE.BARRES]);
});

test("une colonne contre laquelle rien ne se dessine ne s'offre pas en abscisse", () => {
  /**
   * **Elle a pourtant tout pour plaire** : elle est mesurée, elle a trois
   * valeurs. Ce qui manque est en face — la seule autre colonne du tableau
   * n'a rien à montrer, et le nuage ouvrirait un cadre vide. Un bouton qui
   * ouvre un cadre vide apprend à ne plus cliquer sur les boutons.
   */
  const tableau = tableauDe([
    "   pour chaque Hauteur de 1 m à 3 m par pas de 1 m",
    "      calcule Volume = Hauteur * Section;",
    "      calcule Impossible = Hauteur * Charge;",
    "   calcule Total = la somme de Volume;",
    "   si (Total > 0 m³)",
    "   alors (Total);"
  ].join("\n"), { Section: "0,5 m²" });

  // « Volume » se mesure très bien, et « Impossible » ne se calcule pas.
  assert.equal(seriesDuTableau(tableau).groupes[0].series[0].nom, "Volume");
  assert.deepEqual(abscissesPossibles(tableau), []);
  assert.deepEqual(lecturesPossibles(tableau), [LECTURE.TABLEAU, LECTURE.COURBE, LECTURE.BARRES]);
});

test("un nuage garde les deux cadres quand les ordonnées ne mesurent pas la même chose", () => {
  const rendu = seriesDuTableau(DEUX_GRANDEURS, { abscisse: "Surface" });
  assert.deepEqual(rendu.groupes.map((un) => un.series.map((une) => une.nom)), [["Poussée"]]);
  assert.equal(rendu.unite, "m²");
  assert.equal(rendu.groupes[0].unite, "kN");
});

test("une abscisse qu'aucune colonne ne porte retombe sur la variable de boucle", () => {
  // La fonction a changé sous un choix qu'on avait fait. Refuser le dessin
  // ferait un cadre vide là où le tableau se lit très bien.
  const rendu = seriesDuTableau(DEUX_COLONNES, { abscisse: "Une colonne d'hier" });
  assert.equal(rendu.abscisse, "Hauteur");
  assert.equal(rendu.dessinable, true);
});

/* ── Ce qui s'ouvre en premier ───────────────────────────────────────────── */

test("le tableau reste le défaut, et ce n'est pas de la timidité", () => {
  /**
   * **C'est lui qui se compare au texte d'origine**, et c'est la vérification.
   * Un dessin qui s'ouvrirait tout seul ferait croire qu'on a vérifié parce
   * qu'on a regardé.
   */
  assert.equal(lectureQuiVaDeSoi(DEUX_COLONNES, ""), LECTURE.TABLEAU);
  assert.equal(lectureQuiVaDeSoi(DEUX_COLONNES), LECTURE.TABLEAU);
});

test("ce que la fonction suggère s'ouvre en premier, quand c'est dessinable", () => {
  assert.equal(lectureQuiVaDeSoi(DEUX_COLONNES, "courbe"), LECTURE.COURBE);
  assert.equal(lectureQuiVaDeSoi(DEUX_COLONNES, "barres"), LECTURE.BARRES);

  // Une suggestion qu'on ne peut pas dessiner retombe sur le tableau : un cadre
  // vide se lirait comme un dessin qui n'a pas su s'afficher.
  assert.equal(lectureQuiVaDeSoi(null, "courbe"), LECTURE.TABLEAU);
});

test("le nuage ne se suggère pas, et son refus ne se confond pas avec une faute de frappe", () => {
  /**
   * **Il choisit son abscisse parmi les colonnes**, et ce choix n'est pas dans
   * le texte de la fonction : `se lit en: nuage` devrait nommer une colonne,
   * c'est-à-dire porter une intention de mise en page — exactement ce que le
   * parti pris refuse.
   *
   * Et les deux refus ne disent pas la même chose : confondre « nuage » avec
   * une coquille ferait chercher longtemps une orthographe qui était juste.
   */
  assert.deepEqual(SUGGESTIBLES, [LECTURE.TABLEAU, LECTURE.COURBE, LECTURE.BARRES]);

  const refuse = lectureSuggeree("nuage");
  assert.equal(refuse.dite, "");
  assert.match(refuse.raison, /ne se suggère pas.*abscisse.*à la lecture/s);

  const coquille = lectureSuggeree("camembert");
  assert.equal(coquille.dite, "");
  assert.match(coquille.raison, /« tableau », « courbe », « barres »/);
  assert.doesNotMatch(coquille.raison, /nuage/);

  assert.equal(lectureSuggeree("courbe").dite, LECTURE.COURBE);
  assert.equal(lectureQuiVaDeSoi(DEUX_COLONNES, "nuage"), LECTURE.TABLEAU);
});

test("un mot qu'on n'a pas prévu ne se lit pas", () => {
  assert.equal(lectureDite("courbe"), LECTURE.COURBE);
  assert.equal(lectureDite("  BARRES "), LECTURE.BARRES);
  assert.equal(lectureDite("nuage"), LECTURE.NUAGE, "il se choisit, même s'il ne se suggère pas");
  assert.equal(lectureDite("camembert"), "");
  assert.equal(lectureDite(""), "");
});

test("chaque lecture dit ce qu'elle montre", () => {
  // Un bouton dont l'intitulé est le seul indice ne dit pas ce qu'on va voir :
  // « barres » et « nuage » ne se choisissent pas au hasard.
  for (const une of Object.values(LECTURE)) {
    assert.ok(DIT_DE_LA_LECTURE[une], `pas de phrase : ${une}`);
  }
  assert.equal(Object.keys(DIT_DE_LA_LECTURE).length, Object.values(LECTURE).length);
});

/* ── Ce qu'on retient ────────────────────────────────────────────────────── */

test("ce qu'on a choisi à la main gagne, et ne se perd pas à la frappe suivante", () => {
  /**
   * **Un dessin qui se refermerait à chaque caractère tapé ne se regarderait
   * jamais** — et c'est précisément quand on tape qu'on veut voir la courbe
   * bouger. Ce qu'on a choisi gagne donc sur ce que la fonction suggère.
   */
  assert.deepEqual(lectureRetenue(DEUX_COLONNES, { choisie: "barres", suggeree: "courbe" }),
    { lecture: LECTURE.BARRES, abscisse: "" });
  assert.deepEqual(lectureRetenue(DEUX_COLONNES, { suggeree: "courbe" }),
    { lecture: LECTURE.COURBE, abscisse: "" });
  assert.deepEqual(lectureRetenue(DEUX_COLONNES, {}), { lecture: LECTURE.TABLEAU, abscisse: "" });

  // Un choix devenu impossible — la fonction a changé, le tableau n'a plus
  // qu'une ligne — retombe sur ce qui va de soi plutôt que d'ouvrir un cadre
  // vide.
  assert.deepEqual(lectureRetenue(null, { choisie: "courbe", suggeree: "barres" }),
    { lecture: LECTURE.TABLEAU, abscisse: "" });
  assert.deepEqual(lectureRetenue(DEUX_COLONNES, { choisie: "camembert" }),
    { lecture: LECTURE.TABLEAU, abscisse: "" });
});

test("un nuage retenu porte son abscisse, et en prend une plutôt que d'ouvrir un cadre vide", () => {
  assert.deepEqual(lectureRetenue(DEUX_COLONNES, { choisie: "nuage", abscisse: "Double" }),
    { lecture: LECTURE.NUAGE, abscisse: "Double" });

  // Sans abscisse dite, la première qui se dessine : le bouton vient d'être
  // cliqué, et il doit montrer quelque chose.
  assert.deepEqual(lectureRetenue(DEUX_COLONNES, { choisie: "nuage" }),
    { lecture: LECTURE.NUAGE, abscisse: "Volume" });

  // Une abscisse périmée — la fonction a perdu cette colonne — ne fige pas un
  // cadre vide.
  assert.deepEqual(lectureRetenue(DEUX_COLONNES, { choisie: "nuage", abscisse: "Une colonne d'hier" }),
    { lecture: LECTURE.NUAGE, abscisse: "Volume" });

  // Et un tableau où aucun nuage n'est possible retombe sur ce qui va de soi,
  // plutôt que d'ouvrir un nuage sans abscisse.
  const uneSeule = tableauDe([
    "   pour chaque Hauteur de 1 m à 3 m par pas de 1 m",
    "      calcule Volume = Hauteur * Section;",
    "   calcule Total = la somme de Volume;",
    "   si (Total > 0 m³)",
    "   alors (Total);"
  ].join("\n"), { Section: "0,5 m²" });
  assert.deepEqual(lectureRetenue(uneSeule, { choisie: "nuage", suggeree: "courbe" }),
    { lecture: LECTURE.COURBE, abscisse: "" });
});

test("l'abscisse ne se garde que pour un nuage", () => {
  // Partout ailleurs c'est la variable de boucle, et la nommer ici en ferait un
  // second endroit où elle se décide (règle 10).
  assert.equal(lectureRetenue(DEUX_COLONNES, { choisie: "courbe", abscisse: "Volume" }).abscisse, "");
});

test("un clic garde ce que le précédent avait choisi", () => {
  /**
   * **On choisit un nuage contre « Volume », on va voir la courbe, on revient
   * au nuage : il doit revenir contre « Volume ».** Écraser l'un par l'autre
   * ferait reperdre au clic suivant le choix qu'on vient de faire — et c'est
   * le genre de perte qu'on met longtemps à s'expliquer, parce qu'on croit
   * avoir mal cliqué.
   */
  const apresLeNuage = choixGarde({}, { lecture: LECTURE.NUAGE });
  const apresLabscisse = choixGarde(apresLeNuage, { abscisse: "Volume" });
  assert.deepEqual(apresLabscisse, { lecture: LECTURE.NUAGE, abscisse: "Volume" });

  // On passe à la courbe : l'abscisse reste sous le coude.
  const enCourbe = choixGarde(apresLabscisse, { lecture: LECTURE.COURBE });
  assert.deepEqual(enCourbe, { lecture: LECTURE.COURBE, abscisse: "Volume" });

  // Et le nuage la retrouve.
  assert.deepEqual(choixGarde(enCourbe, { lecture: LECTURE.NUAGE }),
    { lecture: LECTURE.NUAGE, abscisse: "Volume" });

  // Rien de retenu, rien de cliqué : rien ne tombe.
  assert.deepEqual(choixGarde(), {});
  assert.deepEqual(choixGarde(null, null), {});
});
