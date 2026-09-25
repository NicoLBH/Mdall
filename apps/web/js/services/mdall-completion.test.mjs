/**
 * Ce que l'écran propose pendant qu'on écrit : où, quoi, et surtout quand rien.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  propositionsDeSaisie, motEnCours, ceQuAttendLaLigne, sujetCompare,
  appliquerLaProposition, ouEstLeCurseur, localesAuDessus, contexteDuBrouillon,
  ATTEND, QUOI
} from "./mdall-completion.js";

const DECLARES = [
  { nom: "Zone de vent", valeurs: ["1", "2", "3", "4"], description: "Zone de vent de la commune." },
  { nom: "Prix HT", valeurs: [], description: "Prix hors taxes." },
  { nom: "Niveau du sol", valeurs: [], description: "Cote NGF du terrain." }
];

const propose = (ligne, colonne = ligne.length, reste = {}) =>
  propositionsDeSaisie({
    ligne, colonne, declares: DECLARES, locales: ["TVA"], fichiers: ["essai.ref", "prix.ddb"], ...reste
  }).map((une) => une.texte);

/* ── Ce que la ligne attend ──────────────────────────────────────────────── */

test("le début d'une ligne attend un mot du langage", () => {
  assert.equal(ceQuAttendLaLigne("   fonc", 7), ATTEND.MOT);
  assert.equal(ceQuAttendLaLigne("", 0), ATTEND.MOT);
  assert.equal(ceQuAttendLaLigne("   ", 3), ATTEND.MOT);
});

test("une condition ouverte attend un nom, un comparateur une valeur", () => {
  assert.equal(ceQuAttendLaLigne("   si (Zone", 11), ATTEND.NOM);
  assert.equal(ceQuAttendLaLigne("   si (Zone de vent = ", 22), ATTEND.VALEUR);
  assert.equal(ceQuAttendLaLigne("   si (Hauteur <= ", 18), ATTEND.VALEUR);
});

test("un fichier, un statut : chacun a sa place", () => {
  assert.equal(ceQuAttendLaLigne("   importe (depuis: ", 20), ATTEND.FICHIER);
  assert.equal(ceQuAttendLaLigne("   statut: ret", 14), ATTEND.STATUT);
});

test("dans une chaîne, dans un commentaire, sur une provenance : rien", () => {
  // Ce qu'on écrit là est du texte, et le langage n'a rien à y dire.
  assert.equal(ceQuAttendLaLigne("   // fonc", 10), ATTEND.RIEN);
  assert.equal(ceQuAttendLaLigne('   alors ("fonc', 15), ATTEND.RIEN);
  assert.equal(ceQuAttendLaLigne("   texte: NF EN 1991", 20), ATTEND.RIEN);
  // La chaîne refermée rend la parole au langage.
  assert.notEqual(ceQuAttendLaLigne('   alors ("120 km/h") ', 22), ATTEND.RIEN);
});

/* ── Le mot en cours ─────────────────────────────────────────────────────── */

test("le mot en cours traverse les espaces, parce qu'un nom en porte", () => {
  // Le couper au premier espace ne proposerait jamais rien au-delà du premier
  // mot, ce qui est précisément le moment où l'on a besoin d'aide.
  assert.deepEqual(motEnCours("   si (Zone de v", 16), { debut: 7, mot: "Zone de v" });
  assert.equal(motEnCours("   fonc", 7).mot, "fonc");
  assert.equal(motEnCours("   si (", 7).mot, "");
  assert.equal(motEnCours("   calcule TVA = Prix", 21).mot, "Prix");
});

test("le nom comparé se lit à gauche du signe", () => {
  assert.equal(sujetCompare("   si (Zone de vent = ", 22), "Zone de vent");
  assert.equal(sujetCompare("   si (Hauteur du plancher bas <= 8", 35), "Hauteur du plancher bas");
  assert.equal(sujetCompare("   si (", 7), "");
});

/* ── Ce qu'on propose ────────────────────────────────────────────────────── */

test("un mot du langage se propose sur ce qu'on a commencé à taper", () => {
  assert.ok(propose("   fonc").includes("fonction"));
  assert.ok(propose("   calcu").includes("calcule"));
  assert.ok(propose("   sauf").includes("sauf si"));
});

test("les noms déclarés se proposent dans une condition, et les locales avec", () => {
  assert.deepEqual(propose("   si (Prix"), ["Prix HT"]);
  assert.deepEqual(propose("   alors (TV"), ["TVA"]);
  // Le nom du projet et la locale se distinguent, parce qu'ils ne se cherchent
  // pas au même endroit.
  const [une] = propositionsDeSaisie({ ligne: "   alors (TV", colonne: 12, locales: ["TVA"] });
  assert.equal(une.quoi, QUOI.LOCALE);
});

test("derrière un comparateur, on ne propose que le domaine du nom comparé", () => {
  // Proposer toutes les valeurs du projet ferait une liste où l'on ne trouve
  // rien, et où l'on choisirait la mauvaise.
  assert.deepEqual(propose("   si (Zone de vent = "), ['"1"', '"2"', '"3"', '"4"']);
  // Un nom sans domaine fermé n'a rien à proposer : inventer une valeur se
  // taperait plus vite qu'elle ne se vérifie.
  assert.deepEqual(propose("   si (Prix HT > "), []);
});

test("un nom qui n'existe nulle part ne se propose jamais", () => {
  assert.deepEqual(propose("   si (Zzz"), []);
  assert.deepEqual(propose("   si (Hauteur", 13, { declares: [], locales: [] }), []);
});

test("rien ne se propose dans un commentaire ni dans une chaîne", () => {
  assert.deepEqual(propose("   // fonc"), []);
  assert.deepEqual(propose('   alors ("Prix'), []);
});

test("ce qui commence par ce qu'on tape passe devant ce qui le contient", () => {
  // **L'ordre alphabétique dirait le contraire**, et c'est ce qui rend cette
  // épreuve utile : on cherche d'abord ce qu'on a commencé à écrire.
  const declares = [{ nom: "Altitude du bas" }, { nom: "bas de pente" }];
  assert.deepEqual(
    propositionsDeSaisie({ ligne: "   si (bas", colonne: 10, declares }).map((u) => u.texte),
    ["bas de pente", "Altitude du bas"]
  );
});

test("la casse et les accents ne comptent pas", () => {
  assert.deepEqual(propose("   si (zone de VENT"), ["Zone de vent"]);
  assert.deepEqual(propose("   si (Niveau du SOL"), ["Niveau du sol"]);
});

test("on ne propose jamais plus que ce qui se lit d'un coup d'œil", () => {
  const beaucoup = Array.from({ length: 40 }, (_, rang) => ({ nom: `Nom ${rang}` }));
  assert.equal(propositionsDeSaisie({ ligne: "   si (Nom", colonne: 10, declares: beaucoup }).length, 8);
  assert.equal(
    propositionsDeSaisie({ ligne: "   si (Nom", colonne: 10, declares: beaucoup, combien: 3 }).length, 3
  );
});

/* ── Poser une proposition ───────────────────────────────────────────────── */

test("la proposition remplace le mot en cours, elle ne s'y ajoute pas", () => {
  // On a pu taper « vent » pour trouver « Zone de vent » : coller derrière
  // aurait donné « ventZone de vent ».
  assert.deepEqual(appliquerLaProposition("   si (Zone de v", 16, "Zone de vent"),
    { ligne: "   si (Zone de vent", colonne: 19 });
  assert.deepEqual(appliquerLaProposition("   fonc", 7, "fonction"),
    { ligne: "   fonction", colonne: 11 });
  // Ce qui suit le curseur reste.
  assert.deepEqual(appliquerLaProposition("   si (Zone)", 11, "Zone de vent"),
    { ligne: "   si (Zone de vent)", colonne: 19 });
});

test("poser rien ne touche à rien", () => {
  assert.deepEqual(appliquerLaProposition("   si (", 7, ""), { ligne: "   si (", colonne: 7 });
  assert.deepEqual(appliquerLaProposition("", 0, "si"), { ligne: "si", colonne: 2 });
});

test("le curseur se dit en ligne et en colonne", () => {
  assert.deepEqual(ouEstLeCurseur("ab\ncde\nf", 0), { rang: 0, colonne: 0 });
  assert.deepEqual(ouEstLeCurseur("ab\ncde\nf", 5), { rang: 1, colonne: 2 });
  assert.deepEqual(ouEstLeCurseur("ab\ncde\nf", 8), { rang: 2, colonne: 1 });
});

/* ── Le contexte d'un brouillon ──────────────────────────────────────────── */

const FONCTIONS = [
  "fonction Prix TTC(zones, Prix HT) {",
  "   calcule TVA = Prix HT * 20%;",
  "   calcule Prix TTC = Prix HT + TVA;",
  "   si (",
  "}",
  "",
  "fonction Autre(zones) {",
  "   si ("
].join("\n");

test("une locale ne se propose que dans sa fonction", () => {
  // Elle ne vit que là : la proposer ailleurs ferait écrire un renvoi vers rien.
  assert.deepEqual(localesAuDessus(FONCTIONS, FONCTIONS.indexOf("   si (") + 7), ["TVA", "Prix TTC"]);
  assert.deepEqual(localesAuDessus(FONCTIONS, FONCTIONS.length), []);
  assert.deepEqual(localesAuDessus("si (A = 1)", 5), []);

  // **Hors de toute fonction, rien.** Un `calcule` qui n'est dans aucune
  // fonction est refusé à la lecture ; le proposer ferait écrire une ligne dont
  // on sait déjà qu'elle ne se lira pas.
  assert.deepEqual(localesAuDessus("calcule Orphelin = 2;\n   si (", 30), []);
});

test("une locale écrite plus bas ne se propose pas plus haut", () => {
  // On lit un fichier de haut en bas ; proposer ce qui n'est pas encore posé
  // ferait écrire une ligne qui ne se lit pas.
  const tot = FONCTIONS.indexOf("   calcule TVA") + 5;
  assert.deepEqual(localesAuDessus(FONCTIONS, tot), []);
});

test("le contexte se déduit du brouillon, déclarations comprises", () => {
  const variables = [
    "const Zone de vent = {",
    '   type: "texte",',
    '   valeurs possibles: "1" ou "2",',
    '   description: "La zone de vent.",',
    "};"
  ].join("\n");
  const contexte = contexteDuBrouillon(
    [{ nom: "variables-du-projet.ref", contenu: variables }, { nom: "essai.ref", contenu: FONCTIONS }],
    { contenu: FONCTIONS, position: FONCTIONS.indexOf("   si (") + 7 }
  );

  assert.deepEqual(contexte.declares, [
    { nom: "Zone de vent", valeurs: ["1", "2"], description: "La zone de vent." }
  ]);
  assert.deepEqual(contexte.locales, ["TVA", "Prix TTC"]);
  assert.deepEqual(contexte.fichiers, ["variables-du-projet.ref", "essai.ref"]);
});

test("un brouillon vide ne propose rien, et ne casse rien", () => {
  const contexte = contexteDuBrouillon([], {});
  assert.deepEqual(contexte, { declares: [], locales: [], fichiers: [] });
  assert.deepEqual(propositionsDeSaisie({ ligne: "   si (A", colonne: 8 }), []);
});

test("une ligne vide ne déplie pas les quarante mots du langage", () => {
  // La liste est demandée à chaque frappe, donc à chaque retour à la ligne :
  // une liste qui se déplie toute seule se referme à l'aveugle, et l'on
  // apprend à l'ignorer. Il faut une lettre.
  assert.deepEqual(propositionsDeSaisie({}), []);
  assert.deepEqual(propose("   "), []);
  assert.ok(propose("   s").length > 0);

  // Les autres contextes proposent sans rien attendre : c'est tout l'intérêt.
  assert.deepEqual(propose("   si (Zone de vent = "), ['"1"', '"2"', '"3"', '"4"']);
  assert.ok(propose("   importe (depuis: ").length > 0);
});
