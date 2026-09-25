/**
 * Le retrait du Mdall : les crans, les paires, et la touche de tabulation.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  profondeursDuRetrait, profondeursDuTexte, niveauxDesPaires, poserUnRetrait,
  PAS_DU_RETRAIT, TEINTES_DE_PAIRE
} from "./mdall-retrait.js";

const enLignes = (contenu) => contenu.split("\n").map((ligne) => ({ jetons: [{ texte: ligne }] }));

const FONCTION = [
  "fonction Prix TTC(zones, Prix HT) {",
  "   calcule TVA = Prix HT * 20%;",
  "   alors (",
  "      enregistre (",
  "         Prix TTC: \"1440 €\",",
  "      )",
  "",
  "   );",
  "}"
].join("\n");

/* ── Les crans ───────────────────────────────────────────────────────────── */

test("le retrait se compte en crans de trois espaces", () => {
  assert.equal(PAS_DU_RETRAIT, 3);
  assert.deepEqual(profondeursDuTexte(FONCTION), [0, 1, 1, 2, 3, 2, 1, 1, 0]);
});

test("une ligne vide hérite du niveau qui la contient", () => {
  // Lui donner zéro couperait les filets en deux et ferait croire à deux blocs
  // là où il n'y en a qu'un.
  // Entre `)` (deux crans) et `);` (un cran), la ligne vide prend **un** : le
  // niveau qui les contient tous les deux, et non le plus profond des deux.
  assert.equal(profondeursDuTexte(FONCTION)[6], 1);
  // Entre deux niveaux différents, c'est le plus petit : celui qui les contient
  // tous les deux.
  assert.deepEqual(profondeursDuTexte("      a\n\n   b"), [2, 1, 1]);
});

test("une ligne vide au bord d'un fichier ne prétend à aucun niveau", () => {
  assert.deepEqual(profondeursDuTexte("\n   a\n"), [0, 1, 0]);
  assert.deepEqual(profondeursDuTexte(""), [0]);
});

test("les crans se comptent aussi bien sur des jetons que sur du texte", () => {
  // C'est la même question posée par deux écrans : la Mémoire a des jetons, la
  // zone d'écriture a du texte, et le compte doit être le même (règle 4).
  assert.deepEqual(profondeursDuRetrait(enLignes(FONCTION)), profondeursDuTexte(FONCTION));
  assert.deepEqual(profondeursDuRetrait([]), []);
  assert.deepEqual(profondeursDuRetrait(null), []);
});

/* ── Les paires ──────────────────────────────────────────────────────────── */

const jetons = (...textes) => ({ jetons: textes.map((texte) => ({ type: "ponctuation", texte })) });

test("une ouverture et sa fermeture portent la même teinte", () => {
  const paires = niveauxDesPaires([jetons("(", "a", "(", "b", ")", ")")]);
  const ligne = paires.get(0);

  assert.equal(ligne.get(0), ligne.get(5), "la paire extérieure n'est pas appariée");
  assert.equal(ligne.get(2), ligne.get(4), "la paire intérieure n'est pas appariée");
  assert.notEqual(ligne.get(0), ligne.get(2), "deux niveaux voisins portent la même teinte");
});

test("une paire s'apparie à travers les lignes", () => {
  // Une `(` s'apparie à une `)` qui est souvent trente lignes plus bas :
  // calculer ligne à ligne ne dirait rien.
  const paires = niveauxDesPaires([jetons("("), jetons("a"), jetons(")")]);

  assert.equal(paires.get(0).get(0), paires.get(2).get(0));
  assert.equal(paires.has(1), false);
});

test("une fermeture orpheline ne prend aucune teinte plutôt qu'une fausse", () => {
  // Mentir sur l'appariement est pire que de ne rien dire.
  assert.equal(niveauxDesPaires([jetons(")")]).size, 0);
  assert.equal(niveauxDesPaires([jetons("(", ")", ")")]).get(0).has(2), false);
});

test("les teintes tournent, et ne se répètent qu'au-delà du lisible", () => {
  assert.equal(TEINTES_DE_PAIRE, 3);
  const paires = niveauxDesPaires([jetons("(", "(", "(", "(")]).get(0);
  assert.deepEqual([0, 1, 2, 3].map((rang) => paires.get(rang)), [0, 1, 2, 0]);
});

test("les trois sortes de bornes comptent, et elles seules", () => {
  const paires = niveauxDesPaires([jetons("(", "[", "{", "}", "]", ")")]).get(0);
  assert.equal(paires.size, 6);
  assert.equal(niveauxDesPaires([jetons("<", ">")]).size, 0);
});

/* ── La tabulation ───────────────────────────────────────────────────────── */

const CODE = "fonction X(zones) {\n   si (A = 1)\n\n   alors (B);\n}";

test("Tab pose un cran de trois espaces, jamais une tabulation", () => {
  // Le langage s'indente de trois espaces : une zone qui poserait une
  // tabulation ferait un fichier que la lecture ne compte pas pareil.
  const pose = poserUnRetrait({ contenu: CODE, debut: 24, fin: 24, sens: 1 });

  assert.ok(pose.contenu.includes("\n      si (A = 1)"));
  assert.doesNotMatch(pose.contenu, /\t/);
  // Le curseur suit son texte.
  assert.equal(pose.debut, 27);
  assert.equal(pose.fin, 27);
});

test("Maj+Tab retire un cran, et rend exactement le texte d'avant", () => {
  const pose = poserUnRetrait({ contenu: CODE, debut: 24, fin: 24, sens: 1 });
  const rendu = poserUnRetrait({ contenu: pose.contenu, debut: pose.debut, fin: pose.fin, sens: -1 });

  assert.equal(rendu.contenu, CODE);
  assert.equal(rendu.debut, 24);
});

test("Maj+Tab ne mange jamais le premier mot d'une ligne sans retrait", () => {
  const pose = poserUnRetrait({ contenu: CODE, debut: 2, fin: 2, sens: -1 });

  assert.equal(pose.contenu, CODE);
  assert.equal(pose.debut, 2);
});

test("une ligne qui porte moins d'un cran perd ce qu'elle a, et pas plus", () => {
  const pose = poserUnRetrait({ contenu: " a", debut: 2, fin: 2, sens: -1 });

  assert.equal(pose.contenu, "a");
  assert.equal(pose.debut, 1);
});

test("le curseur ne remonte jamais avant le début de sa ligne", () => {
  const pose = poserUnRetrait({ contenu: "      a", debut: 1, fin: 1, sens: -1 });

  assert.equal(pose.contenu, "   a");
  assert.equal(pose.debut, 0);
});

test("une sélection décale toutes ses lignes, et se retrouve entière", () => {
  // C'est ce qu'on attend en déplaçant un bloc : le faire ligne à ligne
  // reviendrait à ne pas avoir la touche.
  const pose = poserUnRetrait({ contenu: CODE, debut: 20, fin: 45, sens: 1 });

  assert.equal(pose.contenu, "fonction X(zones) {\n      si (A = 1)\n\n      alors (B);\n}");
  assert.equal(pose.debut, 23);
  assert.equal(pose.fin, 51);
});

test("une ligne vide ne se décale pas", () => {
  // Un retrait sur du vide est un espace en fin de ligne : rien ne le relit, et
  // tout le monde l'efface.
  assert.equal(poserUnRetrait({ contenu: "a\n\nb", debut: 0, fin: 4, sens: 1 }).contenu,
    "   a\n\n   b");
});

test("une sélection qui s'arrête au début d'une ligne ne la touche pas", () => {
  // On n'a rien sélectionné dessus.
  const CODE_TROIS = "a\nb\nc";
  assert.equal(poserUnRetrait({ contenu: CODE_TROIS, debut: 0, fin: 4, sens: 1 }).contenu,
    "   a\n   b\nc");
});

test("sans rien qu'on lui dise, la tabulation ne touche à rien de ce qui existe", () => {
  assert.deepEqual(poserUnRetrait(), { contenu: "", debut: 0, fin: 0 });
  assert.equal(poserUnRetrait({ contenu: "a", debut: 99, fin: -5, sens: 1 }).contenu, "   a");
});
