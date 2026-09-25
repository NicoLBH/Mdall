/**
 * L'arithmétique du Mdall : ce qu'elle calcule, et ce qu'elle refuse de faire.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  lireUnCalcul, evaluerUnCalcul, calculer, ecrireLeCalcul, nomsDuCalcul,
  lireUneUnite, ecrireUneUnite, phraseDuRefus, REFUS_DU_CALCUL, FONCTIONS
} from "./mdall-calcul.js";
import { lecteurDeValeurs } from "./memoire-evaluateur.js";

const LIRE = lecteurDeValeurs({
  "Prix HT": "1200 €",
  "Altitude du site": "890 m",
  "Largeur": "4 m",
  "Longueur": "5 m",
  "Surface": "20 m²",
  "Famille": "3e famille B"
});

const dit = (source, lire = LIRE) => ecrireLeCalcul(calculer(source, lire));
const refusDe = (source, lire = LIRE) => calculer(source, lire).refus;

/* ── Ce qu'un projet demande vraiment ────────────────────────────────────── */

test("la TVA, qui est la phrase la plus ordinaire d'un projet", () => {
  // C'est l'exemple qui a fait ouvrir ce module : « un prix, puis un calcul de
  // TVA à 20 %, on affiche le résultat en euros ».
  assert.equal(dit("Prix HT * 20%"), "240 €");
  assert.equal(dit("Prix HT + Prix HT * 20%"), "1440 €");
  assert.equal(dit("Prix HT * 1,2"), "1440 €");
});

test("un plancher bas à un mètre au-dessus du sol", () => {
  assert.equal(dit("Altitude du site + 1 m"), "891 m");
});

test("une surface, et la racine d'une surface", () => {
  assert.equal(dit("Largeur * Longueur"), "20 m²");
  assert.equal(dit("racine(Surface)"), "4,472135955 m");
  assert.equal(dit("Surface / Largeur"), "5 m");
});

/* ── Les priorités, les parenthèses, les signes ──────────────────────────── */

test("les priorités sont celles des mathématiques", () => {
  assert.equal(dit("2 + 3 * 4"), "14");
  assert.equal(dit("(2 + 3) * 4"), "20");
  assert.equal(dit("2 * 3 + 4 * 5"), "26");
  assert.equal(dit("10 - 2 - 3"), "5");
  assert.equal(dit("100 / 5 / 2"), "10");
});

test("la puissance s'associe à droite, comme en mathématiques", () => {
  // `2^3^2` vaut `2^9`, et non `8^2`.
  assert.equal(dit("2^3^2"), "512");
  assert.equal(dit("(2^3)^2"), "64");
});

test("la racine s'écrit aussi en puissance un demi", () => {
  assert.equal(dit("4 ^ (1/2)"), "2");
  assert.equal(dit("racine(4)"), "2");
  assert.equal(dit("9 ^ 0,5"), "3");
});

test("le moins qui ouvre une expression est un signe, pas une soustraction", () => {
  assert.equal(dit("-3 + 5"), "2");
  assert.equal(dit("2 * -3"), "-6");
  assert.equal(dit("--3"), "3");
});

test("les signes se tapent au clavier, et les jolis se lisent aussi", () => {
  assert.equal(dit("6 × 7"), "42");
  assert.equal(dit("84 ÷ 2"), "42");
});

test("un nombre s'écrit à la française, et le résultat aussi", () => {
  assert.equal(dit("0,1 + 0,2"), "0,3");
  assert.equal(dit("1 200 + 300"), "1500");
  assert.equal(dit("1.5 * 2"), "3");
});

/* ── Les fonctions de base ───────────────────────────────────────────────── */

test("les sept fonctions, et pas une de plus", () => {
  // Chaque fonction de plus est une loi de plus qu'il faut enseigner, écrire
  // dans le wiki, et qu'un relecteur doit connaître pour signer.
  assert.deepEqual(Object.keys(FONCTIONS).sort(),
    ["abs", "arrondi", "max", "min", "plafond", "plancher", "racine"]);
});

test("chacune fait ce que son nom dit", () => {
  assert.equal(dit("abs(-3 m)"), "3 m");
  assert.equal(dit("arrondi(240,06)"), "240");
  assert.equal(dit("arrondi(240,06; 1)"), "240,1");
  assert.equal(dit("plafond(2,1 m)"), "3 m");
  assert.equal(dit("plancher(2,9 m)"), "2 m");
  assert.equal(dit("min(3 m; 5 m)"), "3 m");
  assert.equal(dit("max(3 m; 5 m; 4 m)"), "5 m");
});

test("les arguments se séparent d'un point-virgule, et la virgule le dit", () => {
  // `min(1,5)` serait le minimum de un et cinq, ou bien un et demi : aucune
  // règle ne tranche, donc on refuse en nommant le point-virgule.
  assert.equal(dit("min(1,5; 2)"), "1,5");
  assert.equal(refusDe("min(1,5, 2)"), REFUS_DU_CALCUL.VIRGULE_ARGUMENT);
  assert.match(phraseDuRefus(REFUS_DU_CALCUL.VIRGULE_ARGUMENT), /point-virgule/);
});

test("une fonction qu'on n'a pas, ou mal servie, se refuse", () => {
  assert.equal(refusDe("moyenne(1; 2)"), REFUS_DU_CALCUL.RESTE);
  assert.equal(refusDe("racine(4; 2)"), REFUS_DU_CALCUL.ARGUMENTS);
  assert.equal(refusDe("min(4)"), REFUS_DU_CALCUL.ARGUMENTS);
});

/* ── Les unités : ce qui se compose, et ce qui se refuse ─────────────────── */

test("on n'additionne que ce qui est dans la même unité", () => {
  // `3 m + 2` n'est pas cinq mètres : c'est une ligne qu'il faut relire.
  assert.equal(dit("3 m + 2 m"), "5 m");
  assert.equal(refusDe("3 m + 2"), REFUS_DU_CALCUL.UNITES);
  assert.equal(refusDe("3 m + 2 €"), REFUS_DU_CALCUL.UNITES);
  assert.match(calculer("3 m + 2 €").ou, /m et €/);
});

test("un produit compose les unités, ou refuse de les composer", () => {
  assert.equal(dit("3 m * 2"), "6 m");
  assert.equal(dit("3 m * 2 m"), "6 m²");
  assert.equal(dit("2 m² * 3 m"), "6 m³");
  assert.equal(dit("6 m² / 2 m"), "3 m");
  assert.equal(dit("6 m / 2 m"), "3");
  // Deux unités étrangères l'une à l'autre : personne n'a demandé des
  // mètres-euros, et les inventer serait pire que refuser.
  assert.equal(refusDe("2 m * 3 €"), REFUS_DU_CALCUL.UNITES);
  // Une unité composée est opaque : on sait l'ajouter à elle-même, rien de plus.
  assert.equal(dit("120 km/h + 10 km/h"), "130 km/h");
  assert.equal(dit("120 km/h * 2"), "240 km/h");
  assert.equal(refusDe("120 km/h * 2 km/h"), REFUS_DU_CALCUL.UNITES);
});

test("une puissance suit l'unité quand l'unité peut la suivre", () => {
  assert.equal(dit("3 m ^ 2"), "9 m²");
  assert.equal(dit("2 m ^ 3"), "8 m³");
  assert.equal(dit("Surface ^ 0,5"), "4,472135955 m");
  // La racine d'un mètre n'a pas de nom, et l'on n'en invente pas un.
  assert.equal(refusDe("4 m ^ 0,5"), REFUS_DU_CALCUL.PUISSANCE_ET_UNITE);
  // Mais la racine cubique d'un mètre cube en a un, et c'est le mètre.
  assert.equal(dit("8 m³ ^ (1/3)"), "2 m");
  // Un exposant en mètres ne veut rien dire.
  assert.equal(refusDe("2 ^ 3 m"), REFUS_DU_CALCUL.PUISSANCE_ET_UNITE);
  // Et une unité composée ne s'élève pas : « km/h² » ne se lit pas comme des
  // kilomètres par heure au carré, et l'écrire serait inventer une algèbre.
  assert.equal(refusDe("120 km/h ^ 2"), REFUS_DU_CALCUL.PUISSANCE_ET_UNITE);
  assert.equal(refusDe("racine(4 km/h)"), REFUS_DU_CALCUL.PUISSANCE_ET_UNITE);
});

test("min et max comparent, donc ils exigent la même unité", () => {
  assert.equal(refusDe("min(3 m; 5 €)"), REFUS_DU_CALCUL.UNITES);
  assert.equal(refusDe("max(3 m; 5)"), REFUS_DU_CALCUL.UNITES);
});

test("une unité se lit et se réécrit avec son exposant", () => {
  assert.deepEqual(lireUneUnite("m²"), { base: "m", exposant: 2, opaque: false });
  assert.deepEqual(lireUneUnite("m"), { base: "m", exposant: 1, opaque: false });
  assert.deepEqual(lireUneUnite(""), { base: "", exposant: 0, opaque: false });
  assert.equal(lireUneUnite("km/h").opaque, true);
  assert.equal(ecrireUneUnite({ base: "m", exposant: 3 }), "m³");
  assert.equal(ecrireUneUnite({ base: "m", exposant: 0 }), "");
  // Au-delà du cube, aucun signe ne s'écrit : on ne rend pas « m4 ».
  assert.equal(ecrireUneUnite({ base: "m", exposant: 4 }), null);
});

/* ── Les trois issues ne se confondent jamais ────────────────────────────── */

test("un nom qu'on n'a pas rend indécidable, jamais zéro", () => {
  // `Number("")` vaut zéro, et une altitude à zéro se calcule sans broncher
  // jusqu'à une cote de fondation fausse — c'est arrivé.
  const rendu = calculer("Zone de vent * 2");

  assert.equal(rendu.connu, false);
  assert.equal(rendu.nombre, null);
  assert.equal(rendu.refus, "");
  assert.deepEqual(rendu.manquants, ["Zone de vent"]);
  assert.equal(ecrireLeCalcul(rendu), "");
});

test("les deux manques se disent ensemble, pas l'un après l'autre", () => {
  // Corriger l'un pour découvrir l'autre au lancement suivant fait deux
  // allers-retours là où un suffit.
  assert.deepEqual(calculer("A + B").manquants, ["A", "B"]);
});

test("une valeur textuelle n'est pas un nombre, même si elle porte un chiffre", () => {
  // **Le piège.** « 3e famille B » commence par un chiffre, et `lireUnNombre`
  // gratte les chiffres de ce qu'on lui donne : il en tire **3**, et
  // « Famille * 2 » aurait valu six. Une famille de bâtiment n'est pas le
  // nombre trois. C'est `estMesuree` qui tranche — le même jugement que la
  // mémoire porte sur ses propres valeurs.
  assert.deepEqual(calculer("Famille * 2").manquants, ["Famille"]);
  assert.equal(calculer("Famille * 2").connu, false);

  const avecDesChiffres = lecteurDeValeurs({
    "Classement": "M1", "Référence": "NF EN 1991", "Cote": "12,5 m"
  });
  assert.deepEqual(calculer("Classement + 1", avecDesChiffres).manquants, ["Classement"]);
  assert.deepEqual(calculer("Référence + 1", avecDesChiffres).manquants, ["Référence"]);
  assert.equal(ecrireLeCalcul(calculer("Cote + 1 m", avecDesChiffres)), "13,5 m");
});

test("on ne divise pas par zéro, et l'infini ne traverse pas l'écran", () => {
  assert.equal(refusDe("10 / 0"), REFUS_DU_CALCUL.DIVISION_PAR_ZERO);
  assert.equal(refusDe("Prix HT / (2 - 2)"), REFUS_DU_CALCUL.DIVISION_PAR_ZERO);
  assert.equal(refusDe("racine(-4)"), REFUS_DU_CALCUL.HORS_DOMAINE);
  assert.equal(ecrireLeCalcul(calculer("10 / 0")), "");
});

test("un refus l'emporte sur un manque : on répare ce qui ne veut rien dire", () => {
  assert.equal(refusDe("Zone de vent + 10 / 0"), REFUS_DU_CALCUL.DIVISION_PAR_ZERO);
});

/* ── Ce qui ne se lit pas ────────────────────────────────────────────────── */

test("une expression tronquée, mal fermée ou vide se refuse en le disant", () => {
  assert.equal(refusDe(""), REFUS_DU_CALCUL.VIDE);
  assert.equal(refusDe("   "), REFUS_DU_CALCUL.VIDE);
  assert.equal(refusDe("2 +"), REFUS_DU_CALCUL.MEMBRE_MANQUANT);
  assert.equal(refusDe("(2 + 3"), REFUS_DU_CALCUL.PARENTHESE);
  assert.equal(refusDe("2 + 3)"), REFUS_DU_CALCUL.PARENTHESE);
  assert.equal(refusDe("2 @ 3"), REFUS_DU_CALCUL.CARACTERE_INCONNU);
});

test("chaque refus a sa phrase, et aucune n'est muette", () => {
  for (const code of Object.values(REFUS_DU_CALCUL)) {
    const phrase = phraseDuRefus(code);
    assert.ok(phrase.length > 8, `refus sans phrase : ${code}`);
    assert.notEqual(phrase, "ce calcul ne se lit pas", `refus sans phrase propre : ${code}`);
  }
  assert.equal(Object.keys(REFUS_DU_CALCUL).length, 12);
});

/* ── Ce qu'un calcul demande avant d'être lancé ──────────────────────────── */

test("les noms d'un calcul se listent, pour savoir quoi demander", () => {
  const lu = lireUnCalcul("Prix HT + Prix HT * 20% - min(Remise; Plafond)");

  assert.equal(lu.ok, true);
  assert.deepEqual(nomsDuCalcul(lu.arbre), ["Prix HT", "Remise", "Plafond"]);
  assert.deepEqual(nomsDuCalcul(null), []);
});

test("un nom du projet porte ses espaces, et reste un seul nom", () => {
  const lu = lireUnCalcul("Hauteur du plancher bas + 1 m");
  assert.deepEqual(nomsDuCalcul(lu.arbre), ["Hauteur du plancher bas"]);
});

/* ── L'écriture du résultat ──────────────────────────────────────────────── */

test("le résultat s'écrit comme la mémoire écrit ses mesures", () => {
  assert.equal(ecrireLeCalcul({ connu: true, nombre: 1440, unite: "€" }), "1440 €");
  assert.equal(ecrireLeCalcul({ connu: true, nombre: 0.3, unite: "" }), "0,3");
  assert.equal(ecrireLeCalcul({ connu: false, nombre: null }), "");
  assert.equal(ecrireLeCalcul(), "");
});

test("le bruit du binaire ne passe pas pour de la précision", () => {
  // `0,1 + 0,2` fait `0.30000000000000004` en binaire. Écrire cela au lieu de
  // `0,3` ferait douter d'un calcul juste.
  assert.equal(dit("0,1 + 0,2"), "0,3");
  assert.equal(dit("1,1 * 3"), "3,3");
});

/* ── L'arbre se lit sans lire la mémoire ─────────────────────────────────── */

test("lire et évaluer sont deux gestes, et le premier ne lit rien", () => {
  // C'est ce qui permet de vérifier un fichier sans valeurs — la console le
  // fait à chaque frappe, et elle n'a pas de projet sous la main.
  const lu = lireUnCalcul("Prix HT * 20%");
  assert.equal(lu.ok, true);
  assert.equal(evaluerUnCalcul(lu.arbre, () => ({ connu: false, valeur: "" })).connu, false);
  assert.equal(evaluerUnCalcul(lu.arbre, LIRE).nombre, 240);
});

test("un pourcentage lu dans un nom vaut ce qu'un pourcentage écrit vaut", () => {
  // **Le défaut que ça répare.** `20 %` tapé dans l'expression vaut `0,2` sans
  // unité. Lu dans un nom — parce qu'une autre fonction l'a conclu —, il valait
  // 20 avec « % » pour unité, et `Prix HT * Taux de TVA` était refusé pour des
  // unités qui ne se composent pas… alors que la même ligne avec `20 %` en
  // toutes lettres passait. Une règle changeait donc de sens selon qu'on lui
  // donnait son taux à la main ou qu'une autre le concluait (règle 4).
  const lire = (nom) => (nom === "Taux de TVA"
    ? { connu: true, valeur: "20 %" }
    : { connu: true, valeur: "120 €" });

  const lu = calculer("Prix HT * Taux de TVA", lire);
  assert.equal(lu.refus, "");
  assert.equal(ecrireLeCalcul(lu), "24 €");

  // Et c'est bien la même chose qu'écrit en toutes lettres.
  assert.equal(ecrireLeCalcul(calculer("120 € * 20 %")), "24 €");

  // Les autres unités ne bougent pas : « 3 m » lu reste trois mètres.
  assert.equal(ecrireLeCalcul(calculer("A * 2", () => ({ connu: true, valeur: "3 m" }))), "6 m");
});
