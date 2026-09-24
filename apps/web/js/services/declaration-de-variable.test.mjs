/**
 * Une déclaration de variable s'écrit, se relit, et dit ce qu'un nom peut valoir.
 *
 * ## Le fichier qui s'écrivait et ne se relisait pas
 *
 * `variables-du-projet.ref` s'engendre depuis les autres fichiers, et personne
 * ne le reparsait : la lecture refusait chacune de ses lignes — `type` n'est
 * pas une provenance, `déjà utilisé dans` n'ouvre rien — sans que ça se voie,
 * puisque rien ne le lui demandait.
 *
 * Le bac d'essai, lui, laisse en **écrire** une à la main. `lire(écrire(G)) = G`
 * vaut pour cette forme comme pour les autres.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { blocDeVariable, texteDesLignes } from "./memoire-en-texte.js";
import { lireUnFichier, jetonsDeLaLigne } from "./memoire-en-lecture.js";

const ecrire = (variable) => texteDesLignes(blocDeVariable(variable));

const ZONE_DE_VENT = {
  nom: "Zone de vent",
  type: "texte",
  description: "Zone de vent de la commune, au sens de l'annexe nationale.",
  utilisation: "Entrée de la vitesse de référence.",
  valeurs: ["1", "2", "3", "4"]
};

/* ── L'aller-retour ──────────────────────────────────────────────────────── */

test("une déclaration écrite se relit sans un seul refus", () => {
  const { refus } = lireUnFichier(ecrire(ZONE_DE_VENT));

  assert.deepEqual(refus, []);
});

test("elle se relit avec ce qu'elle porte, champ par champ", () => {
  const { declarations } = lireUnFichier(ecrire(ZONE_DE_VENT));

  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].nom, "Zone de vent");
  assert.equal(declarations[0].type, "texte");
  assert.deepEqual(declarations[0].valeurs, ["1", "2", "3", "4"]);
  assert.match(declarations[0].description, /annexe nationale/);
  assert.match(declarations[0].utilisation, /vitesse de référence/);
});

test("une déclaration n'affirme rien sur le projet", () => {
  // Ce fichier définit des noms. En faire des affirmations donnerait à chaque
  // nom une valeur qu'il n'a pas — et une variable en prend plusieurs au fil
  // d'une étude.
  const { blocs } = lireUnFichier(ecrire(ZONE_DE_VENT));

  assert.deepEqual(blocs, []);
});

test("l'unité et les usages font l'aller-retour aussi", () => {
  const texte = ecrire({
    nom: "Hauteur du plancher bas", type: "mesure", unite: "m",
    description: "Hauteur du plancher bas du dernier niveau.",
    utilisation: "Entrée du classement en famille.",
    usages: [{ fonction: "Classement du bâtiment", fichier: "incendie.ref" }]
  });
  const { refus, declarations } = lireUnFichier(texte);

  assert.deepEqual(refus, []);
  assert.equal(declarations[0].unite, "m");
  // Les usages se **recalculent** à chaque nouvelle utilisation : les relire
  // pour les reposer ferait deux vérités (règle 4). On les traverse, on ne les
  // garde pas — et surtout on ne les refuse pas.
  assert.equal(declarations[0].usages, undefined);
});

test("deux déclarations à la suite ne se mélangent pas", () => {
  const { refus, declarations } = lireUnFichier(`${ecrire(ZONE_DE_VENT)}\n\n${ecrire({
    nom: "Commune", type: "texte", description: "La commune.", utilisation: "Entrée des zones climatiques."
  })}`);

  assert.deepEqual(refus, []);
  assert.deepEqual(declarations.map((une) => une.nom), ["Zone de vent", "Commune"]);
  assert.deepEqual(declarations[1].valeurs, []);
});

/* ── Le domaine d'un nom ─────────────────────────────────────────────────── */

test("le domaine s'écrit avec le « ou » du langage, pas entre crochets", () => {
  // Le langage énumère déjà ainsi les choix fermés d'un tableau. Une seconde
  // façon ferait deux grammaires pour la même idée (règle 4), et celle qu'on
  // lit le moins finirait par ne plus être comprise.
  assert.match(ecrire(ZONE_DE_VENT), /valeurs possibles: "1" ou "2" ou "3" ou "4",/);
});

test("sans domaine déclaré, le champ ne paraît pas", () => {
  // Un champ vide ferait croire à un domaine fermé dont on aurait oublié les
  // valeurs — c'est-à-dire à une variable qui n'accepte rien.
  assert.doesNotMatch(ecrire({ ...ZONE_DE_VENT, valeurs: [] }), /valeurs possibles/);
  assert.doesNotMatch(ecrire({ ...ZONE_DE_VENT, valeurs: undefined }), /valeurs possibles/);
});

test("un domaine d'une seule valeur s'écrit sans « ou »", () => {
  assert.match(ecrire({ ...ZONE_DE_VENT, valeurs: ["3"] }), /valeurs possibles: "3",/);
});

/* ── Ce qui se refuse, et ce qui ne se refuse pas ────────────────────────── */

test("un champ inventé se refuse, et se nomme", () => {
  // Sans cette fermeture, `typo: "mesure"` passerait sans un mot : la variable
  // n'aurait pas de type, et l'on chercherait longtemps pourquoi elle ne se
  // compare à rien.
  const { refus } = lireUnFichier([
    "const Zone de vent = {",
    '   typo: "texte",',
    "};"
  ].join("\n"));

  assert.equal(refus.length, 1);
  assert.match(refus[0].raison, /« typo » n'est pas un champ d'une déclaration/);
  assert.equal(refus[0].ligne, 2);
});

test("un commentaire dans une déclaration ne se refuse jamais", () => {
  // Refuser un commentaire serait dire qu'écrire pour soi est une faute.
  const { refus } = lireUnFichier([
    "const Zone de vent = {",
    "   // l'annexe nationale en compte quatre",
    '   type: "texte",',
    "};"
  ].join("\n"));

  assert.deepEqual(refus, []);
});

test("une déclaration sans borne fermante rend quand même ce qu'elle porte", () => {
  // Une variable entière ne disparaît pas pour une accolade oubliée — et un
  // architecte qui tape à la main n'en met pas toujours.
  const { declarations } = lireUnFichier([
    "const Zone de vent = {",
    '   type: "texte",',
    '   valeurs possibles: "1" ou "2"'
  ].join("\n"));

  assert.equal(declarations.length, 1);
  assert.deepEqual(declarations[0].valeurs, ["1", "2"]);
});

/* ── La coloration ───────────────────────────────────────────────────────── */

test("le mot du langage se colore comme un mot, pas comme un nom du projet", () => {
  const types = jetonsDeLaLigne("const Zone de vent = {").map((jeton) => jeton.type);

  assert.equal(types[0], "mot-const");
  assert.equal(types.includes("sujet"), true);
});

test("un champ de déclaration se colore en locale, jamais en sujet", () => {
  // C'est le défaut qui rendait ces fichiers illisibles : la Mémoire peint en
  // rouge ce qu'aucune ligne ne déclare, et `description:` lu comme un sujet
  // peignait **chaque champ de chaque déclaration**. Un fichier entièrement en
  // alerte n'alerte plus de rien.
  for (const ligne of ['   type: "texte",', '   description: "…",', '   utilisation: "…",']) {
    const types = jetonsDeLaLigne(ligne).map((jeton) => jeton.type);
    assert.equal(types.includes("locale"), true, ligne);
    assert.equal(types.includes("sujet"), false, ligne);
  }
});

test("chaque valeur du domaine se colore à part, et le « ou » avec", () => {
  const jetons = jetonsDeLaLigne('   valeurs possibles: "1" ou "2" ou "3",');

  assert.equal(jetons.filter((jeton) => jeton.type === "valeur").length, 3);
  assert.equal(jetons.filter((jeton) => jeton.type === "mot-condition").length, 2);
});

test("la fermeture d'une déclaration n'est pas un sujet", () => {
  assert.deepEqual(jetonsDeLaLigne("};").map((jeton) => jeton.type), ["ponctuation", "ponctuation"]);
});

test("ce qui ressemble à un champ hors d'une déclaration garde sa lecture d'avant", () => {
  // `Accès des véhicules: "interdit"` dans un `enregistre` reste un sujet. La
  // liste fermée des champs de déclaration ne doit pas déborder sur le reste du
  // langage.
  const types = jetonsDeLaLigne('   Accès des véhicules lourds: "interdit",').map((jeton) => jeton.type);

  assert.equal(types.includes("sujet"), true);
  assert.equal(types.includes("locale"), false);
});
