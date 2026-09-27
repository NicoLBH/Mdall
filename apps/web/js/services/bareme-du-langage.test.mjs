/**
 * Le barème : le tableau d'une norme, recopié tel qu'il est imprimé.
 *
 * ## Pourquoi cette forme existe
 *
 * Quatre-vingt-dix pour cent des utilitaires du bâtiment sont un tableau à
 * double entrée et trois notes — une norme, un DTU, un Eurocode, un arrêté.
 * Écrit en `si … sinon si …`, l'article 96 de l'arrêté du 31 janvier 1986 fait
 * quarante lignes que personne ne compare à l'original. Écrit en barème, il
 * **ressemble à l'arrêté**, et le contrôleur lit les deux côte à côte.
 *
 * ## Ce qui s'éprouve ici
 *
 * Que la forme se lise, qu'elle s'évalue comme les branches qu'elle remplace, et
 * qu'elle se **réécrive à l'identique** — un tableau qui reviendrait en quatre-
 * vingts lignes de `sinon si` après un enregistrement ne servirait à rien.
 *
 * Aucun texte réel n'est recopié : les valeurs sont plausibles et inventées.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { casesDuBareme, clauseDuBareme, jetonsDeLaLigne, lireUnFichier } from "./memoire-en-lecture.js";
import { blocDeRegle } from "./memoire-en-texte.js";
import { evaluerLaRegle, lecteurDeValeurs } from "./memoire-evaluateur.js";

/** Le fichier d'essai, avec ses cas difficiles : un libellé numérique, une case
 *  blanche, une disjonction, un constat. */
const BAREME = `fonction Degré coupe-feu des blocs-portes(zones) {
  selon (Famille, Hauteur du plancher bas)
    | 3e famille A | ≤ 28 m | CF 1/2 h |
    | 3e famille B | ≤ 28 m | CF 1 h |
    | 4e famille   | > 28 m | CF 1 h |
  sinon (non traité);
}`;

const lu = (source) => lireUnFichier(source);
const bloc = (source) => lireUnFichier(source).blocs[0];

/** Ce que la fonction conclut pour ces entrées-là. */
function conclut(source, valeurs) {
  const b = bloc(source);
  const rendu = evaluerLaRegle(
    { payload: { value: b.alors, regle: b } },
    lecteurDeValeurs(valeurs)
  );
  return rendu.valeur;
}

/** Le fichier réécrit à partir de ce qui a été lu. */
function reecrit(b) {
  return blocDeRegle({
    sujet: b.sujet, conditions: b.conditions, alors: b.alors,
    sinonSi: b.sinonSi, sinon: b.sinon, sauf: b.sauf, selon: b.selon
  }).map((ligne) => ligne.map((jeton) => jeton.texte).join("")).join("\n");
}

/* ── Lire ─────────────────────────────────────────────────────────────────── */

test("un barème se range dans les branches, et l'évaluateur n'en sait rien", () => {
  /**
   * **C'est ce qui rend la forme sûre.** Les lignes deviennent exactement ce
   * qu'un `si … sinon si …` aurait produit : l'évaluateur, la trace, le graphe
   * et le rejeu ne changent pas d'une ligne. `selon` ne dit que la **forme
   * d'écriture**, et garder les cases à côté des branches en ferait deux
   * vérités (règle 4).
   */
  const b = bloc(BAREME);

  assert.deepEqual(lu(BAREME).refus, []);
  assert.deepEqual(b.selon, ["Famille", "Hauteur du plancher bas"]);

  // La première ligne reste la tête de la règle, comme pour un `si`.
  assert.deepEqual(b.conditions.map((c) => `${c.sujet} ${c.operateur} ${c.valeur}`),
    ["Famille = 3e famille A", "Hauteur du plancher bas <= 28"]);
  assert.equal(b.alors, "CF 1/2 h");

  // Les suivantes enchaînent, dans l'ordre écrit — et l'ordre est le sens.
  assert.equal(b.sinonSi.length, 2);
  assert.deepEqual(b.sinonSi.map((branche) => branche.alors), ["CF 1 h", "CF 1 h"]);
});

test("une case nue est un libellé, jamais un nombre suivi d'une unité", () => {
  /**
   * **C'est le défaut qu'on a vu tourner.** `3e famille B` se lisait comme le
   * nombre **3** suivi de l'unité « e famille B » — la lecture des mesures, qui
   * a raison sur `28 m`. Deux lignes voisines portaient donc la même valeur, le
   * barème tombait dans son `sinon`, et le tableau avait l'air juste.
   */
  const b = bloc(BAREME);

  assert.deepEqual(b.conditions[0].valeur, ["3e famille A"]);
  assert.equal(b.conditions[0].unite, "");

  // Et la mesure, elle, garde son unité : sans cette moitié, l'épreuve
  // passerait sur un lecteur qui citerait tout, y compris les hauteurs.
  assert.deepEqual(b.conditions[1].valeur, ["28"]);
  assert.equal(b.conditions[1].unite, "m");

  // La règle en une phrase : pour comparer un nombre, on écrit son comparateur.
  assert.equal(clauseDuBareme("Hauteur", "= 28 m").unite, "m");
  assert.equal(clauseDuBareme("Famille", "2e famille").unite, "");
});

test("deux lignes qui ne diffèrent que d'une lettre concluent différemment", () => {
  // La conséquence de ce qui précède, mesurée là où elle se voit : la valeur
  // rendue. C'est ce qu'un contrôleur vérifierait, et c'est ce qui tombait.
  assert.equal(conclut(BAREME, { "Famille": "3e famille A", "Hauteur du plancher bas": "12 m" }), "CF 1/2 h");
  assert.equal(conclut(BAREME, { "Famille": "3e famille B", "Hauteur du plancher bas": "12 m" }), "CF 1 h");
  assert.equal(conclut(BAREME, { "Famille": "4e famille", "Hauteur du plancher bas": "40 m" }), "CF 1 h");

  // Ce qu'aucune ligne ne couvre tombe dans le `sinon`, et le dit.
  assert.equal(conclut(BAREME, { "Famille": "2e famille", "Hauteur du plancher bas": "6 m" }), "non traité");
});

test("une case blanche ne contraint rien, et c'est ce que les normes impriment", () => {
  // Une ligne qui vaut quelle que soit la hauteur laisse la colonne blanche.
  // L'inventer en « = vide » ferait une ligne qui ne tient jamais, et le barème
  // aurait l'air juste.
  const source = `fonction Degré(zones) {
  selon (Famille, Hauteur)
    | 4e famille |        | CF 1 h |
  sinon (non traité);
}`;

  assert.deepEqual(bloc(source).conditions.map((c) => c.sujet), ["Famille"]);
  assert.equal(conclut(source, { Famille: "4e famille", Hauteur: "150 m" }), "CF 1 h");
});

test("une case porte une disjonction ou un constat, comme partout ailleurs", () => {
  const source = `fonction Traitement(zones) {
  selon (Nature, Classement)
    | bois ou métal | renseigné | PF 1/2 h |
  sinon (sans objet);
}`;

  const b = bloc(source);
  assert.deepEqual(b.conditions[0].valeur, ["bois", "métal"]);
  assert.equal(b.conditions[1].operateur, "renseigné");
  assert.equal(conclut(source, { Nature: "métal", Classement: "ERP" }), "PF 1/2 h");
});

/* ── Refuser ──────────────────────────────────────────────────────────────── */

test("ce qu'un barème refuse, il le dit et le situe", () => {
  /**
   * Un tableau mal recopié est la faute la plus probable de cette forme — on
   * colle d'un PDF, une colonne saute. Le refus doit donc **compter** et non
   * dire « ligne invalide ».
   */
  const refus = (source) => lireUnFichier(source).refus.map((un) => un.raison);

  assert.match(refus(`fonction D(zones) {
  selon (Famille, Hauteur)
    | 3e famille B | CF 1 h |
}`)[0], /2 colonnes et une conclusion : 3 cases attendues, 2 écrites/);

  assert.match(refus(`fonction D(zones) {
    | 3e famille B | CF 1 h |
}`)[0], /se pose sous un « selon \(…\) »/);

  assert.match(refus(`fonction D(zones) {
  selon ()
}`)[0], /« selon » nomme les colonnes du barème/);

  assert.match(refus(`fonction D(zones) {
  selon (Famille, Hauteur)
    | 3e famille B | ≤ 28 m |  |
}`)[0], /la dernière case d'un barème est ce qu'il conclut, et elle est vide/);
});

test("un barème ou des branches, jamais les deux", () => {
  // Mêlés, on ne peut lire la règle ni comme l'un ni comme l'autre — et l'ordre
  // des cas ne se verrait nulle part.
  assert.match(lireUnFichier(`fonction D(zones) {
  selon (Famille)
    | 3e famille B | CF 1 h |
  sinon si (Famille = 4e famille)
  alors (CF 2 h);
}`).refus[0].raison, /« sinon si » ne s'écrit pas dans un barème/);

  assert.match(lireUnFichier(`fonction D(zones) {
  si (Famille = 4e famille)
  alors (CF 2 h);
  selon (Famille)
    | 3e famille B | CF 1 h |
}`).refus[0].raison, /cette fonction a déjà une condition/);

  assert.match(lireUnFichier(`fonction D(zones) {
  selon (Famille)
  selon (Hauteur)
}`).refus[0].raison, /a déjà un « selon »/);

  // **`sauf si` reste admis** : il écarte la règle entière, et les normes en
  // portent. L'interdire aurait retiré une forme que le métier emploie.
  assert.deepEqual(lireUnFichier(`fonction D(zones) {
  selon (Famille)
    | 3e famille B | CF 1 h |
  sauf si (Bâtiment existant = oui);
}`).refus, []);
});

/* ── Réécrire ─────────────────────────────────────────────────────────────── */

test("un barème enregistré revient un barème, à l'identique", () => {
  /**
   * **Sans cela, la forme ne sert à rien.** Un tableau de quarante lignes
   * recopié d'un arrêté qui reviendrait en quatre-vingts lignes de `sinon si`
   * ne se rapprocherait plus jamais de son texte, et l'on aurait gagné dix
   * minutes une seule fois.
   */
  const source = `fonction Degré(zones) {
  selon (Famille, Hauteur)
    | 3e famille A | ≤ 28 m | CF 1/2 h |
    | bois ou métal |  | PF 1/2 h |
    |  | renseigné | à vérifier |
  sinon (non traité);
}`;

  const premier = bloc(source);
  const ecrit = reecrit(premier);

  assert.match(ecrit, /selon \(Famille, Hauteur\)/);
  assert.match(ecrit, /\| 3e famille A\s+\| <= 28 m\s+\| CF 1\/2 h \|/);

  const second = bloc(ecrit);
  assert.deepEqual(lireUnFichier(ecrit).refus, []);

  const compte = (b) => JSON.stringify({
    selon: b.selon, conditions: b.conditions, alors: b.alors, sinonSi: b.sinonSi, sinon: b.sinon
  });
  assert.equal(compte(second), compte(premier));
});

test("les colonnes s'alignent, parce que c'est ce pour quoi la forme existe", () => {
  // Un tableau qu'on ne peut pas lire en colonnes n'est plus un tableau : c'est
  // une suite de lignes, et l'œil ne compare plus rien.
  const ecrit = reecrit(bloc(`fonction D(zones) {
  selon (Famille)
    | 3e famille B | CF 1 h |
    | 4e | CF 2 h |
}`));

  const rangees = ecrit.split("\n").filter((ligne) => ligne.includes("|"));
  assert.equal(rangees.length, 2);
  assert.deepEqual(
    rangees.map((ligne) => ligne.indexOf("|", ligne.indexOf("|") + 1)),
    [rangees[0].indexOf("|", rangees[0].indexOf("|") + 1),
      rangees[0].indexOf("|", rangees[0].indexOf("|") + 1)]
  );
});

test("les cases se découpent, les barres du bord sont facultatives", () => {
  // Un tableau se recopie d'un texte, et tous ne les impriment pas.
  assert.deepEqual(casesDuBareme("| a | b | c |"), ["a", "b", "c"]);
  assert.deepEqual(casesDuBareme("a | b | c"), ["a", "b", "c"]);
  assert.deepEqual(casesDuBareme("| a |  | c |"), ["a", "", "c"]);
});

/* ── Colorer ──────────────────────────────────────────────────────────────── */

test("un barème se colore comme il se lit, et se recompose au caractère près", () => {
  /**
   * **Sans cela, le tableau qu'on vient d'écrire pour être comparé à sa norme
   * s'affiche en un seul bloc gris**, indistinct d'un commentaire. La couleur
   * n'est pas un ornement ici : c'est ce qui fait qu'on lit un tableau.
   *
   * Et la recomposition doit être exacte, alignement compris : l'éditeur écrit
   * ces jetons à la place de la ligne, et un espace perdu décalerait la colonne
   * qu'on est venu comparer.
   */
  const types = (ligne) => jetonsDeLaLigne(ligne).map((jeton) => jeton.type);
  const recompose = (ligne) => jetonsDeLaLigne(ligne).map((jeton) => jeton.texte).join("");

  const entete = "   selon (Famille, Hauteur du plancher bas)";
  assert.deepEqual(types(entete).filter((type) => type === "mot-condition"), ["mot-condition"]);
  assert.deepEqual(types(entete).filter((type) => type === "sujet").length, 2);
  assert.equal(recompose(entete), entete);

  // Les cases sont des conditions, la dernière est ce qu'on conclut : deux
  // couleurs, les mêmes que partout ailleurs dans la langue.
  const rangee = "      | 3e famille B  | <= 28 m   | CF 1 h |";
  assert.deepEqual(types(rangee).filter((type) => type === "operateur").length, 2);
  assert.deepEqual(types(rangee).filter((type) => type === "valeur"), ["valeur"]);
  assert.equal(recompose(rangee), rangee);

  /**
   * **Deux colonnes qui portent le même mot.** `| oui | oui |` est un tableau
   * parfaitement normal, et retrouver chaque case par une expression régulière
   * y rendait deux fois la première — la ligne se recomposait de travers.
   */
  for (const ligne of ["| oui | oui |", "|  | renseigné | à vérifier |", "| a | b"]) {
    assert.equal(recompose(ligne), ligne, ligne);
  }
});
