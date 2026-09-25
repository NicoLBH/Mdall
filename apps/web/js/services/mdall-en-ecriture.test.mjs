/**
 * La couche colorée d'une zone de saisie : elle peint ce qui est écrit.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { jetonsEcrits } from "./mdall-en-ecriture.js";
import { jetonsDeLaLigne } from "./memoire-en-lecture.js";

const recompose = (ligne) => jetonsEcrits(ligne).map((jeton) => jeton.texte).join("");
const types = (ligne) => jetonsEcrits(ligne).map((jeton) => jeton.type);
const typeDe = (ligne, mot) =>
  jetonsEcrits(ligne).find((jeton) => jeton.texte === mot)?.type ?? "";

/** Un fichier d'essai qui porte tout ce qu'on tape vraiment. */
const FICHIER = [
  "fonction Vitesse de référence(zones, Zone de vent) {",
  "   // La vitesse de référence, par zone.",
  "   importe (variable: Zone de vent, depuis: vent.ctr, zones: zones);",
  '   si (Zone de vent = "3")',
  '   alors ("120 km/h");',
  '   sinon ("100 km/h");',
  "   sauf si (Altitude du site > 1000 m)",
  "   enregistre (sujet: Vitesse de référence, vers: vent.ctr);",
  "}",
  "",
  "const Prix HT = {",
  '   type: "mesure",',
  '   unité: "€",',
  '   valeurs possibles: "1" ou "2" ou "3",',
  '   description: "Prix hors taxes saisi par l\'utilisateur.",',
  "};",
  "",
  "   soit TVA = Prix HT * 0,2",
  "   statut: retenu",
  '   parce que: "arrêté du 3 mars 2026"',
  "Altitude du site = 890 m"
].join("\n");

/* ── La seule loi : ce qui est peint est ce qui est écrit ─────────────────── */

test("chaque frappe d'un fichier entier se repeint caractère pour caractère", () => {
  // **C'est l'épreuve du défaut.** La couche se pose sous un texte transparent :
  // un caractère de plus ou de moins, et le curseur cesse de tomber en face de
  // ce qu'on voit. On rejoue donc la saisie du fichier, du premier caractère au
  // dernier, et l'on exige l'égalité à chaque frappe.
  const lignes = FICHIER.split("\n");

  for (const ligne of lignes) {
    for (let jusqua = 0; jusqua <= ligne.length; jusqua += 1) {
      const tape = ligne.slice(0, jusqua);
      assert.equal(recompose(tape), tape, `désaligné après ${jusqua} caractères : ${JSON.stringify(tape)}`);
    }
  }

  // Et le compte des frappes est écrit en dur : une épreuve qui déduirait son
  // propre parcours du texte qu'elle mesure ne mesurerait rien.
  assert.equal(lignes.length, 21);
  assert.equal(FICHIER.length, 604);
});

test("ce que le peintre de la mémoire changeait, celui-ci le garde", () => {
  // Les six écarts mesurés, un par un. Chacun a un symptôme au clavier : un
  // guillemet qu'on ne peut pas viser, une flèche qui semble immobile.
  const cas = [
    '   si (A = "3")',
    '   si (A = "3',
    '   alors ("120 km/h");',
    "   importe (variable: Zone de vent);",
    "   si (x = 1)   ",
    "   soit TVA = Prix HT * 0,2",
    "   si (Zone de vent =  3)"
  ];

  for (const ligne of cas) {
    assert.equal(recompose(ligne), ligne, `réécrit : ${JSON.stringify(ligne)}`);
    // Et l'autre peintre, lui, le change : c'est ce qui fonde ce module.
    const memoire = jetonsDeLaLigne(ligne).map((jeton) => jeton.texte).join("");
    assert.notEqual(memoire, ligne,
      `${JSON.stringify(ligne)} n'est plus recomposé par la mémoire : ce module n'a plus de raison d'être`);
  }
});

test("une ligne vide ne rend aucun jeton, et n'en invente pas", () => {
  assert.deepEqual(jetonsEcrits(""), []);
  assert.deepEqual(jetonsEcrits(null), []);
  assert.equal(recompose("   "), "   ");
});

test("un caractère qu'on ne sait pas nommer se peint quand même", () => {
  // Le refuser laisserait un trou dans la couche, et le curseur cesserait de
  // tomber en face de ce qu'on voit — c'est-à-dire le défaut qu'on répare.
  for (const bizarre of ["§", "→", "«»", "\u0000", "🙂", "A\\B"]) {
    assert.equal(recompose(`si (x = ${bizarre})`), `si (x = ${bizarre})`);
  }
});

/* ── Les couleurs restent celles de la mémoire ───────────────────────────── */

test("les mots du langage prennent chacun leur couleur, pas une seule", () => {
  // Écrites en dur : les déduire du module les ferait bouger avec lui.
  assert.equal(typeDe("fonction X(zones) {", "fonction"), "mot-fonction");
  assert.equal(typeDe("const Prix = {", "const"), "mot-const");
  assert.equal(typeDe("   soit x = 2", "soit"), "mot-soit");
  assert.equal(typeDe("   si (A = 1)", "si"), "mot-condition");
  assert.equal(typeDe("   sauf si (A = 1)", "sauf si"), "mot-exception");
  assert.equal(typeDe("   importe (variable: A);", "importe"), "mot-importe");
  assert.equal(typeDe("   enregistre (sujet: A);", "enregistre"), "mot-natif");
});

test("un mot collé à un deux-points est une étiquette, jamais un sujet", () => {
  // Sans quoi l'étiquette `zones:` prendrait la couleur de la portée qu'elle
  // annonce, et l'on ne distinguerait plus la question de la réponse.
  assert.equal(typeDe('   type: "mesure",', "type"), "locale");
  assert.equal(typeDe("   importe (zones: zones);", "zones"), "locale");
  assert.equal(jetonsEcrits("   importe (zones: zones);")
    .filter((jeton) => jeton.texte === "zones").map((jeton) => jeton.type).join(","),
  "locale,portee");
});

test("les mots qui relient valent partout, ceux qui ouvrent une ligne non", () => {
  // « le », « note », « zone » sont des mots français ordinaires : les colorer
  // au milieu d'un nom ferait clignoter « Hauteur de la note de calcul ».
  assert.equal(typeDe('   valeurs possibles: "1" ou "2",', "ou"), "mot-condition");
  assert.equal(typeDe("   si (A et B)", "et"), "mot-condition");
  assert.equal(typeDe("   le: 3 mars 2026", "le"), "mot-date");
  assert.equal(typeDe("Hauteur de la note = 3 m", "note"), "sujet");
  assert.equal(typeDe("Surface de la zone = 3 m", "zone"), "sujet");
});

test("une unité ne se reconnaît qu'à sa place : derrière un nombre", () => {
  assert.equal(typeDe("Altitude du site = 890 m", "m"), "unite");
  assert.equal(typeDe("   si (P >= 0,2 MPa)", "MPa"), "unite");
  // « 3 ou 4 » n'a pas d'unité : le mot qui relie passe devant.
  assert.equal(typeDe('   valeurs possibles: 3 ou 4,', "ou"), "mot-condition");
  // Et un mot qui ne suit aucun nombre reste un sujet.
  assert.equal(typeDe("Mur = ossature", "ossature"), "sujet");
});

test("une chaîne se colore dès le premier guillemet, avant le second", () => {
  // C'est l'état de toute chaîne qu'on est en train d'écrire.
  assert.equal(typeDe('   alors ("120', '"120'), "valeur");
  assert.equal(typeDe('   alors ("120 km/h")', '"120 km/h"'), "valeur");
});

test("un commentaire prend la fin de la ligne, telle quelle", () => {
  assert.equal(typeDe('   // si (A = "3") et le reste', '// si (A = "3") et le reste'), "commentaire");
  assert.equal(recompose("   // rien à interpréter"), "   // rien à interpréter");
});

test("un chemin de fichier du projet se colore comme tel", () => {
  assert.equal(typeDe("   importe (depuis: vent.ctr);", "vent.ctr"), "chemin");
  // Un point qui n'ouvre pas une extension du projet n'en fait pas un chemin.
  assert.equal(typeDe("Prix = 1.5", "1.5"), "valeur");
});

test("l'arithmétique et les comparateurs prennent la couleur des opérateurs", () => {
  for (const signe of ["+", "-", "*", "/", "^", "%", "=", "<", ">", "<=", ">=", "!="]) {
    assert.equal(typeDe(`   soit x = a ${signe} b`, signe), "operateur", `signe : ${signe}`);
  }
});

test("une accolade et une parenthèse ne se confondent pas", () => {
  assert.deepEqual(types("{}"), ["accolade", "accolade"]);
  assert.deepEqual(types("();"), ["ponctuation", "ponctuation", "ponctuation"]);
  // Une accolade seule reste une accolade : le peintre de la mémoire en
  // faisait un sujet, ce qui colorait la fermeture d'une fonction en bleu.
  assert.deepEqual(types("}"), ["accolade"]);
});
