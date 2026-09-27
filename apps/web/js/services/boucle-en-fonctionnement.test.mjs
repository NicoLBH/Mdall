/**
 * `pour chaque`, de bout en bout : lu, déroulé, agrégé, réécrit.
 *
 * **Ce fichier éprouve le câblage**, et c'est ce qui manque le plus souvent :
 * une fonction pure s'éprouve par son résultat, un câblage ne s'éprouve que par
 * le code qui le porte. Une boucle que la lecture range bien, que l'évaluateur
 * ne reçoit pas, ne casse rien : elle rend une fonction qui ne conclut rien.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { jetonsDeLaLigne, lireUnFichier, nomsLusParLeBloc } from "./memoire-en-lecture.js";
import { blocDeRegle, ligneDePourChaque, texteDesLignes } from "./memoire-en-texte.js";
import { lireUnePourChaque } from "./boucle-du-mdall.js";
import { deroulerLaBoucle, poserLesLocales, DOUTE } from "./memoire-evaluateur.js";
import { lancerLeBrouillon, ISSUE } from "./bac-dessai.js";
import { champsDuBrouillon } from "./formulaire-du-brouillon.js";

const SOURCE = [
  "fonction Volume le plus gros(zones, Section, Hauteur maximale) {",
  "   // Le poteau le plus volumineux de la trame.",
  "   importe (variable: Section, depuis: variables-du-projet.ref, zones: zones);",
  "",
  "   pour chaque Hauteur de 2,5 m à Hauteur maximale par pas de 0,5 m",
  "      calcule Volume = Hauteur * Section;",
  "",
  "   calcule Le plus gros = le plus grand de Volume;",
  "   si (Le plus gros > 0 m³)",
  "   alors (Le plus gros);",
  "}",
  ""
].join("\n");

const FICHIERS = [{ nom: "essai.ref", contenu: SOURCE }];
const REPONSES = { Section: "0,09 m²", "Hauteur maximale": "4 m" };

const bloc = (source) => lireUnFichier(source).blocs[0];

/** La couleur de chaque caractère d'une ligne, telle qu'un peintre la rend. */
const couleurs = (jetons) => jetons.flatMap((un) => [...un.texte].map(() => un.type));

/* ── Ce que la lecture range ─────────────────────────────────────────────── */

test("une boucle et son corps se rangent à part, et les agrégats restent dehors", () => {
  /**
   * **Le corps s'écrit trois espaces plus loin**, et c'est la seule chose que
   * l'indentation décide dans ce langage. Un agrégat écrit au même retrait que
   * le `pour chaque` est donc **hors** de la boucle — ce qu'il doit être,
   * puisqu'il lit le tableau entier.
   */
  const lu = lireUnFichier(SOURCE);
  assert.deepEqual(lu.refus, []);

  assert.deepEqual(lu.blocs[0].boucle, {
    nom: "Hauteur",
    de: "2,5 m",
    a: "Hauteur maximale",
    pas: "0,5 m",
    calculs: [{ nom: "Volume", expression: "Hauteur * Section", ligne: 6 }],
    ligne: 5
  });

  assert.deepEqual(lu.blocs[0].calculs, [{
    nom: "Le plus gros",
    agregat: { quoi: "plus-grand", colonne: "Volume" },
    ligne: 8
  }]);
});

test("un `calcule` au même retrait que la boucle n'entre pas dans son corps", () => {
  // Sans cette borne, le tableau gagnerait une colonne que personne n'a écrite
  // dedans — et l'agrégat lirait une colonne qui n'existe qu'une fois.
  const lu = bloc([
    "fonction F(zones, A) {",
    "   pour chaque X de 1 à 3 par pas de 1",
    "      calcule Dedans = X * A;",
    "   calcule Dehors = A * 2;",
    "   calcule Total = la somme de Dedans;",
    "   si (Total > 0)",
    "   alors (Total);",
    "}"
  ].join("\n"));

  assert.deepEqual(lu.boucle.calculs.map((un) => un.nom), ["Dedans"]);
  assert.deepEqual(lu.calculs.map((un) => un.nom), ["Dehors", "Total"]);
});

test("un `calcule` d'un `alors` ne se glisse pas dans le corps d'une boucle", () => {
  // La première ligne qui n'est pas un `calcule` referme le corps, où qu'elle
  // soit indentée : un `si` ou un `alors` appartiennent à la fonction.
  const lu = bloc([
    "fonction F(zones, A) {",
    "   pour chaque X de 1 à 3 par pas de 1",
    "      calcule Dedans = X * A;",
    "   si (A > 0)",
    "   alors (",
    "      enregistre (",
    "         F: \"oui\",",
    "         dans: essai.ctr,",
    "         zones: zones",
    "      )",
    "   );",
    "}"
  ].join("\n"));

  assert.deepEqual(lu.boucle.calculs.map((un) => un.nom), ["Dedans"]);
});

test("un `calcule` écrit après un `si` ne rejoint pas le corps de la boucle", () => {
  /**
   * **La première ligne qui n'est pas un `calcule` referme le corps**, où
   * qu'elle soit indentée. Sans cette fermeture, un `calcule` écrit plus bas et
   * plus loin — sous un `si`, par exemple — se glissait dans la boucle : le
   * tableau gagnait une colonne que personne n'y a écrite, et elle se
   * recalculait quarante-cinq fois.
   */
  const lu = bloc([
    "fonction F(zones, A) {",
    "   pour chaque X de 1 à 3 par pas de 1",
    "      calcule Dedans = X * A;",
    "   si (A > 0)",
    "      calcule Après = A * 2;",
    "   alors (Après);",
    "}"
  ].join("\n"));

  assert.deepEqual(lu.boucle.calculs.map((un) => un.nom), ["Dedans"]);
  assert.deepEqual(lu.calculs.map((un) => un.nom), ["Après"]);
});

test("deux boucles dans une fonction se refusent, en disant quoi faire", () => {
  // Deux niveaux demandent deux fonctions, comme il n'y a pas de condition
  // imbriquée : une boucle dans une boucle est ce qu'on ne relit plus.
  const lu = lireUnFichier([
    "fonction F(zones, A) {",
    "   pour chaque X de 1 à 3 par pas de 1",
    "      calcule Un = X * A;",
    "   pour chaque Y de 1 à 3 par pas de 1",
    "      calcule Deux = Y * A;",
    "}"
  ].join("\n"));

  assert.equal(lu.refus.length, 1);
  assert.match(lu.refus[0].raison, /qu'un « pour chaque »/);
});

test("une boucle sans corps se refuse : elle ne rend rien", () => {
  // On ne peut le savoir qu'à la fermeture, le corps s'écrivant après la tête.
  const lu = lireUnFichier([
    "fonction F(zones, A) {",
    "   pour chaque X de 1 à 3 par pas de 1",
    "   si (A > 0)",
    "   alors (A);",
    "}"
  ].join("\n"));

  assert.equal(lu.refus.length, 1);
  assert.match(lu.refus[0].raison, /ne calcule rien/);
  assert.equal(lu.refus[0].ligne, 2);
});

test("un agrégat sans boucle se refuse : il n'a aucun tableau à lire", () => {
  const lu = lireUnFichier([
    "fonction F(zones, A) {",
    "   calcule Total = la somme de A;",
    "   si (Total > 0)",
    "   alors (Total);",
    "}"
  ].join("\n"));

  assert.equal(lu.refus.length, 1);
  assert.match(lu.refus[0].raison, /n'a pas de « pour chaque »/);
});

test("une tête de boucle fausse se refuse à la lecture, et non au lancement", () => {
  /**
   * Un pas nul ou un tableau de dix mille lignes laissé passer ferait une
   * fonction qui ne conclut rien sans qu'on sache pourquoi (règle 5). Ce qui est
   * écrit en clair se vérifie donc **là où la faute de frappe se corrige**.
   */
  const refuse = (tete) => {
    const lu = lireUnFichier(`fonction F(zones) {\n   ${tete}\n      calcule X = 1;\n}`);
    return lu.refus[0]?.raison ?? "";
  };

  assert.match(refuse("pour chaque X de 1 à 10 par pas de 0"), /un pas de zéro/);
  assert.match(refuse("pour chaque X de 10 à 1 par pas de 1"), /s'éloigne de la fin/);
  assert.match(refuse("pour chaque X de 1 à 10000 par pas de 1"), /il ne se relit plus/);
  assert.match(refuse("pour chaque X de 1 m à 10 kN par pas de 1 m"), /une longueur et une force/);
  assert.match(refuse("pour chaque X de 1 à 10"), /pour chaque <nom> de <début>/);

  // Une borne qui est un **nom** passe : sa valeur vient du projet, et la
  // lecture d'un fichier ne connaît aucune valeur.
  assert.equal(refuse("pour chaque X de 1 m à Portée par pas de 1 m"), "");
});

/* ── Ce que la fonction demande ──────────────────────────────────────────── */

test("une boucle lit par ses bornes et par son corps, et ne demande pas sa variable", () => {
  /**
   * **Trois défauts d'un coup si l'un des trois manque** : une borne qui vient
   * du projet et qu'on ne demande pas rend la fonction indécidable pour
   * toujours ; un nom lu par le corps et qu'on ne demande pas fait la même
   * chose ; et la variable de boucle demandée ferait un champ qu'on ne sait pas
   * remplir, qui masquerait l'entrée réellement absente.
   */
  assert.deepEqual(nomsLusParLeBloc(bloc(SOURCE)),
    ["Hauteur maximale", "Hauteur", "Section", "Le plus gros"]);

  assert.deepEqual(champsDuBrouillon(FICHIERS).map((un) => un.nom),
    ["Hauteur maximale", "Section"]);
});

test("une colonne du tableau ne se demande pas non plus : elle vaut par ligne", () => {
  /**
   * **Une colonne n'a pas une valeur, elle en a quarante-cinq.** Offrir un
   * champ « Volume » demanderait laquelle, et la réponse masquerait l'entrée
   * réellement absente — le défaut que le formulaire déduit existe pour éviter.
   */
  const source = [
    "fonction F(zones, Section) {",
    "   pour chaque X de 1 m à 3 m par pas de 1 m",
    "      calcule Aire = X * Section;",
    "   calcule Total = la somme de Aire;",
    "   si (Aire > 0 m²)",
    "   alors (Total);",
    "}"
  ].join("\n");

  assert.ok(nomsLusParLeBloc(bloc(source)).includes("Aire"), "la condition lit bien « Aire »");
  assert.deepEqual(
    champsDuBrouillon([{ nom: "e.ref", contenu: source }]).map((un) => un.nom),
    ["Section"]
  );
});

/* ── Ce que le déroulement rend ──────────────────────────────────────────── */

const lire = (valeurs) => (sujet) => (valeurs[sujet]
  ? { connu: true, valeur: valeurs[sujet] }
  : { connu: false, valeur: "" });

test("le tableau porte une ligne par valeur et une colonne par `calcule`", () => {
  const tableau = deroulerLaBoucle(bloc(SOURCE).boucle, lire(REPONSES));

  assert.equal(tableau.nom, "Hauteur");
  assert.deepEqual(tableau.colonnes, ["Volume"]);
  assert.deepEqual(tableau.lignes.map((une) => [une.valeur, une.cases[0].valeur]), [
    ["2,5 m", "0,225 m³"],
    ["3 m", "0,27 m³"],
    ["3,5 m", "0,315 m³"],
    ["4 m", "0,36 m³"]
  ]);
});

test("une ligne qui ne se calcule pas reste, avec sa case vide et sa raison", () => {
  /**
   * **La retirer ferait un tableau plus court que la suite annoncée**, et l'on
   * ne verrait pas laquelle des quarante-cinq portées a échoué — c'est
   * précisément la ligne qu'on cherche.
   */
  const source = [
    "fonction F(zones, Seuil) {",
    "   pour chaque X de 1 m à 3 m par pas de 1 m",
    "      calcule Écart = X - Seuil;",
    "   calcule Total = la somme de Écart;",
    "   si (Total > 0 m)",
    "   alors (Total);",
    "}"
  ].join("\n");

  const tableau = deroulerLaBoucle(bloc(source).boucle, lire({ Seuil: "2 kN" }));
  assert.equal(tableau.lignes.length, 3);
  for (const ligne of tableau.lignes) {
    assert.equal(ligne.cases[0].connu, false);
    assert.match(ligne.cases[0].pourquoi, /ne se composent pas|ne mesurent pas/);
  }
});

test("ce qui manque à quarante-cinq lignes se dit une fois, pas quarante-cinq", () => {
  const source = [
    "fonction F(zones, Section) {",
    "   pour chaque X de 1 m à 3 m par pas de 1 m",
    "      calcule Aire = X * Section;",
    "   calcule Total = la somme de Aire;",
    "   si (Total > 0 m²)",
    "   alors (Total);",
    "}"
  ].join("\n");

  const tableau = deroulerLaBoucle(bloc(source).boucle, lire({}));
  assert.deepEqual(tableau.manquants, ["Section"]);
  // Et jamais la variable de boucle : c'est la boucle qui la pose.
  assert.ok(!tableau.manquants.includes("X"));
});

test("une borne qui vient du projet et qu'on n'a pas fait dire ce qui manque", () => {
  const tableau = deroulerLaBoucle(bloc(SOURCE).boucle, lire({ Section: "0,09 m²" }));
  assert.deepEqual(tableau.lignes, []);
  assert.deepEqual(tableau.manquants, ["Hauteur maximale"]);
  assert.match(tableau.pourquoi, /il manque Hauteur maximale/);
});

/* ── Ce que la fonction conclut ──────────────────────────────────────────── */

test("un agrégat pose une locale comme n'importe quel calcul", () => {
  // C'est ce qui permet à tout ce qui suit — condition, conclusion, trace — de
  // ne pas savoir lequel des deux l'a posée.
  const un = bloc(SOURCE);
  const locales = poserLesLocales(un.calculs, lire(REPONSES), un.boucle);

  assert.equal(locales.lire("Le plus gros").valeur, "0,36 m³");
  assert.deepEqual(locales.traces.map((une) => [une.nom, une.expression, une.valeur]),
    [["Le plus gros", "le plus grand de Volume", "0,36 m³"]]);
});

test("la boucle se déroule à sa place : ce qui est au-dessus la nourrit", () => {
  /**
   * **L'ordre est le numéro de ligne**, et il n'y a pas d'autre règle à
   * apprendre : on lit de haut en bas, comme partout dans ce langage.
   */
  const source = [
    "fonction F(zones, Charge) {",
    "   calcule Pondérée = Charge * 1,35;",
    "   pour chaque X de 1 m à 3 m par pas de 1 m",
    "      calcule Effort = X * Pondérée;",
    "   calcule Le plus fort = le plus grand de Effort;",
    "   si (Le plus fort > 0)",
    "   alors (Le plus fort);",
    "}"
  ].join("\n");

  const un = bloc(source);
  const locales = poserLesLocales(un.calculs, lire({ Charge: "10" }), un.boucle);
  assert.equal(locales.lire("Pondérée").valeur, "13,5");
  assert.equal(locales.lire("Le plus fort").valeur, "40,5 m");
});

test("une boucle ne lit pas ce qui est écrit sous elle", () => {
  /**
   * **On lit de haut en bas, et la boucle se déroule à sa place.** Un `calcule`
   * écrit en dessous d'elle ne la nourrit pas : le lui laisser voir ferait un
   * fichier dont le sens dépend de ce qu'on n'a pas encore lu, et c'est
   * exactement ce qu'un ordre de lecture existe pour empêcher.
   */
  const source = [
    "fonction F(zones, Charge) {",
    "   pour chaque X de 1 m à 3 m par pas de 1 m",
    "      calcule Effort = X * Pondérée;",
    "   calcule Pondérée = Charge * 1,35;",
    "   calcule Le plus fort = le plus grand de Effort;",
    "   si (Le plus fort > 0 m)",
    "   alors (Le plus fort);",
    "}"
  ].join("\n");

  const un = bloc(source);
  const locales = poserLesLocales(un.calculs, lire({ Charge: "10" }), un.boucle);

  // `Pondérée` se calcule bien — mais après la boucle, qui ne l'a donc pas vue.
  assert.equal(locales.lire("Pondérée").valeur, "13,5");
  for (const ligne of locales.tableau.lignes) assert.equal(ligne.cases[0].connu, false);
  assert.ok(locales.traces.find((une) => une.nom === "Le plus fort").connu === false);
});

test("un agrégat sur une colonne qui n'existe pas dit ce que le tableau porte", () => {
  // C'est une faute de frappe neuf fois sur dix, et la taire ferait chercher
  // dans la boucle un défaut qui est dans son nom.
  const source = SOURCE.replace("le plus grand de Volume", "le plus grand de Volumes");
  const un = bloc(source);
  const locales = poserLesLocales(un.calculs, lire(REPONSES), un.boucle);

  assert.equal(locales.traces[0].connu, false);
  assert.match(locales.traces[0].pourquoi, /pas de colonne « Volumes » — il porte Volume/);
  assert.ok(locales.doutes.includes(DOUTE.TABLEAU_MUET));
});

test("le bac d'essai conclut, et montre le tableau qui l'a mené là", () => {
  /**
   * **C'est le câblage qui compte ici.** La lecture range bien la boucle,
   * l'évaluateur sait la dérouler — et si le bac ne la lui passe pas, la
   * fonction ne conclut rien sans qu'un mot dise que c'est le tableau qui
   * manque.
   */
  const [rendu] = lancerLeBrouillon(FICHIERS, REPONSES);

  assert.equal(rendu.issue, ISSUE.TIENT);
  assert.equal(rendu.valeur, "0,36 m³");
  assert.equal(rendu.tableau.lignes.length, 4);
  assert.deepEqual(rendu.tableau.colonnes, ["Volume"]);
});

test("une fonction sans boucle n'a pas de tableau, et ne prétend pas le contraire", () => {
  const [rendu] = lancerLeBrouillon(
    [{ nom: "e.ref", contenu: "fonction F(zones, A) {\n   si (A > 0)\n   alors (A);\n}\n" }],
    { A: "1" }
  );
  assert.equal(rendu.tableau, null);
});

/* ── Aller et retour ─────────────────────────────────────────────────────── */

test("une boucle se réécrit comme elle a été écrite, agrégat compris", () => {
  /**
   * **Une règle versée se relit dans l'écran des fichiers**, et c'est par là
   * qu'on la compare à ce qu'on a signé. Une boucle qui s'y réécrirait sans son
   * corps, ou un agrégat sans sa phrase, ferait une fonction qui conclut sans
   * que rien ne dise d'où sort ce qu'elle conclut.
   */
  const un = bloc(SOURCE);
  const ecrit = texteDesLignes(blocDeRegle({
    sujet: un.sujet,
    conditions: un.conditions,
    alors: un.alors,
    calculs: un.calculs,
    boucle: un.boucle
  }));

  assert.match(ecrit, /^ {3}pour chaque Hauteur de 2,5 m à Hauteur maximale par pas de 0,5 m$/m);
  assert.match(ecrit, /^ {6}calcule Volume = Hauteur \* Section;$/m);
  assert.match(ecrit, /^ {3}calcule Le plus gros = le plus grand de Volume;$/m);

  // Et ce qui est réécrit se relit : la boucle et l'agrégat reviennent
  // identiques, ce qui est la seule preuve que rien ne s'est perdu en route.
  const relu = bloc(ecrit);
  assert.deepEqual(relu.boucle.calculs.map((une) => une.nom), ["Volume"]);
  assert.deepEqual(relu.boucle.de, un.boucle.de);
  assert.deepEqual(relu.boucle.a, un.boucle.a);
  assert.deepEqual(relu.boucle.pas, un.boucle.pas);
  assert.deepEqual(relu.calculs[0].agregat, un.calculs[0].agregat);
});

test("la ligne écrite et la ligne relue se colorent pareil, caractère par caractère", () => {
  /**
   * **Deux peintres, une seule ligne.** Le module d'écriture compose la tête
   * d'une boucle jeton par jeton ; la lecture, elle, la confie au peintre de la
   * saisie. Rien ne les oblige à tomber d'accord — et le jour où ils divergent,
   * la même fonction change de couleur selon l'écran qui la montre, sans qu'une
   * seule épreuve ne tombe (règle 10).
   */
  for (const tete of [
    "   pour chaque Hauteur de 2,5 m à 4 m par pas de 0,5 m",
    "   pour chaque Point de 0 m à Portée par pas de 0,5 m",
    "   pour chaque Rang de 1 à 10 par pas de 1"
  ]) {
    const ecrit = texteDesLignes([ligneDePourChaque(lireUnePourChaque(tete.trim().slice("pour chaque".length)), 1)]);
    assert.equal(ecrit, tete, "la tête ne se réécrit pas telle qu'elle a été lue");

    /**
     * **La comparaison se fait caractère par caractère**, et non jeton par
     * jeton : l'un rend « par pas de » d'un seul tenant, l'autre en trois mots,
     * et c'est sans importance — ce qui compte est que chaque caractère de la
     * ligne porte la même couleur des deux côtés.
     */
    assert.deepEqual(
      couleurs(jetonsDeLaLigne(tete)),
      couleurs(ligneDePourChaque(lireUnePourChaque(tete.trim().slice("pour chaque".length)), 1)),
      `les deux peintres ne colorent pas pareil :\n${tete}`
    );
  }
});

test("les calculs d'une fonction sans boucle se réécrivent aussi", () => {
  /**
   * **Ils ne s'écrivaient pas du tout.** Une fonction versée qui posait
   * `calcule TVA = Prix HT * 20%` se réécrivait sans une seule de ses lignes de
   * calcul : l'écran des fichiers montrait une fonction qui conclut `Prix TTC`
   * sans que rien ne dise ce que `Prix TTC` vaut. Le défaut est de la même
   * famille que les branches oubliées, et il se voyait aussi peu.
   */
  const source = [
    "fonction Prix TTC(zones, Prix HT) {",
    "   calcule TVA = Prix HT * 20%;",
    "   calcule Prix TTC = Prix HT + TVA;",
    "   si (Prix HT >= 0 €)",
    "   alors (Prix TTC);",
    "}"
  ].join("\n");

  const un = bloc(source);
  const ecrit = texteDesLignes(blocDeRegle({
    sujet: un.sujet, conditions: un.conditions, alors: un.alors, calculs: un.calculs
  }));

  assert.match(ecrit, /^ {3}calcule TVA = Prix HT \* 20%;$/m);
  assert.match(ecrit, /^ {3}calcule Prix TTC = Prix HT \+ TVA;$/m);
});
