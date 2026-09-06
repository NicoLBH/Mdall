import test from "node:test";
import assert from "node:assert/strict";

import {
  ECRITURE, JETON, ligneDAffirmation, ligneDeSection, ligneDeNote, enTeteDeFichier,
  lignesDeDecision, blocDeRaisonnement, GESTE, enClair, couperLUnite, natureDeLaLigne
} from "./memoire-en-texte.js";

const typeDe = (jetons, type) => jetons.filter((j) => j.type === type).map((j) => j.texte);

test("une affirmation s'écrit sujet, valeur, puis ce qui la fonde", () => {
  const jetons = ligneDAffirmation({
    sujet: "altitude du site", valeur: "490,03 m", source: "relevé IGN, feuille 3430 OT"
  });

  assert.equal(enClair(jetons), "altitude du site  490,03 m  ← relevé IGN, feuille 3430 OT");
  assert.deepEqual(typeDe(jetons, JETON.SUJET), ["altitude du site"]);
  assert.deepEqual(typeDe(jetons, JETON.VALEUR), ["490,03"]);
  assert.deepEqual(typeDe(jetons, JETON.UNITE), ["m"]);
  assert.deepEqual(typeDe(jetons, JETON.DEPUIS), ["←"]);
});

test("une valeur sans provenance n'écrit pas de flèche vide", () => {
  const jetons = ligneDAffirmation({ sujet: "zone de vent", valeur: "2" });
  assert.equal(enClair(jetons), "zone de vent  2");
  assert.deepEqual(typeDe(jetons, JETON.DEPUIS), []);
});

test("ce qui n'a pas d'unité reste d'un bloc : on n'en invente pas une", () => {
  assert.deepEqual(couperLUnite("A2"), { nombre: "A2", unite: "" });
  assert.deepEqual(couperLUnite("3e famille A"), { nombre: "3e famille A", unite: "" });
  assert.deepEqual(couperLUnite("490,03 m"), { nombre: "490,03", unite: "m" });
  assert.deepEqual(couperLUnite("0,80 m"), { nombre: "0,80", unite: "m" });
});

test("l'en-tête dit ce qui a produit le fichier, et comment il s'écrit", () => {
  const lignes = enTeteDeFichier({
    chemin: ["Données de base", "Structure"],
    produitPar: "l'utilitaire neige-vent-gel v3",
    le: "6 septembre 2026"
  });

  assert.deepEqual(lignes.map(enClair), [
    "§ Données de base · Structure",
    "¶ établi par l'utilitaire neige-vent-gel v3, le 6 septembre 2026",
    `¶ écriture Mdall v${ECRITURE}`
  ]);
});

test("un fichier sans producteur connu ne l'invente pas, mais dit son écriture", () => {
  const lignes = enTeteDeFichier({ chemin: ["Avis", "Incendie"] });
  assert.deepEqual(lignes.map(enClair), ["§ Avis · Incendie", `¶ écriture Mdall v${ECRITURE}`]);
});

test("une décision s'écrit dans les mots de l'arrêté, et marque la branche prise", () => {
  const lignes = lignesDeDecision({
    condition: "hauteur du dernier plancher > 8 m",
    alors: "escalier encloisonné",
    sinon: "escalier à l'air libre",
    retenu: "escalier encloisonné"
  });

  assert.deepEqual(lignes.map(enClair), [
    "   si hauteur du dernier plancher > 8 m",
    "      alors escalier encloisonné  ✓ retenu",
    "      sinon escalier à l'air libre"
  ]);
});

test("aucun mot n'est emprunté à un langage de programmation", () => {
  const tout = [
    ...enTeteDeFichier({ chemin: ["A"], produitPar: "x" }),
    ligneDAffirmation({ sujet: "s", valeur: "1 m", source: "t" }),
    ...lignesDeDecision({ condition: "c", alors: "a", sinon: "b", retenu: "a" })
  ].map(enClair).join("\n");

  for (const emprunt of ["const", "function", "return", "=>", "//", "{", "}", ";"]) {
    assert.equal(tout.includes(emprunt), false, `« ${emprunt} » n'a rien à faire dans l'écriture Mdall`);
  }
});

test("l'écriture n'aligne jamais avec des espaces : un sujet plus long ne bouge rien", () => {
  const courte = enClair(ligneDAffirmation({ sujet: "h0", valeur: "0,9 m" }));
  const longue = enClair(ligneDAffirmation({ sujet: "profondeur hors gel retenue", valeur: "0,80 m" }));

  // Deux espaces entre le sujet et la valeur, quelle que soit la longueur du
  // sujet : sinon, déposer une affirmation au nom plus long réécrirait toutes
  // les lignes du fichier.
  assert.equal(courte, "h0  0,9 m");
  assert.equal(longue, "profondeur hors gel retenue  0,80 m");
});

test("la nature d'une ligne se relit à sa marque de tête", () => {
  assert.equal(natureDeLaLigne("§ Données de base"), "section");
  assert.equal(natureDeLaLigne("¶ écriture Mdall v1.0"), "note");
  assert.equal(natureDeLaLigne("- zone de neige  A1"), "retire");
  assert.equal(natureDeLaLigne("+ zone de neige  A2"), "ajoute");
  assert.equal(natureDeLaLigne("  zone de vent  2"), "contexte");
});

test("une section sans chemin se nomme plutôt que de rester vide", () => {
  assert.equal(enClair(ligneDeSection([])), "§ Sans rubrique");
  assert.equal(enClair(ligneDeNote("quelque chose")), "¶ quelque chose");
});

test("la marque se lit après les colonnes de numéros d'un extrait cité", () => {
  assert.equal(natureDeLaLigne("      1  + altitude du site  490,03 m"), "ajoute");
  assert.equal(natureDeLaLigne("  1      - zone de neige  A1"), "retire");
  assert.equal(natureDeLaLigne("  2   3    zone de vent  1"), "contexte");
});

test("un geste précède le sujet : une décision ne se lit pas comme une mesure", () => {
  assert.equal(enClair(ligneDAffirmation({ geste: GESTE.DECISION, sujet: "hauteur retenue", valeur: "8,00 m" })),
    "on retient hauteur retenue  8,00 m");
  assert.equal(enClair(ligneDAffirmation({ geste: GESTE.HYPOTHESE, sujet: "portance du sol", valeur: "0,2 MPa" })),
    "on suppose portance du sol  0,2 MPa");
  // Un relevé n'annonce rien : c'est le cas ordinaire.
  assert.equal(enClair(ligneDAffirmation({ sujet: "altitude", valeur: "490 m" })), "altitude  490 m");
});

test("un raisonnement porte sa raison, son exception et ses dépendances", () => {
  const lignes = blocDeRaisonnement({
    condition: "hauteur du dernier plancher > 8 m",
    alors: "escalier protégé", sinon: "aucun escalier protégé exigé", retenu: "escalier protégé",
    parceQue: "au-delà de 8 m l'échelle des secours n'atteint plus les baies",
    saufSi: ["le bâtiment ne comporte qu'une seule unité de passage"],
    dependDe: ["hauteur du dernier plancher", "classement du bâtiment"]
  });

  assert.deepEqual(lignes.map(enClair), [
    "   si hauteur du dernier plancher > 8 m",
    "      alors escalier protégé  ✓ retenu",
    "      sinon aucun escalier protégé exigé",
    "   parce que au-delà de 8 m l'échelle des secours n'atteint plus les baies",
    "   sauf si le bâtiment ne comporte qu'une seule unité de passage",
    "   dépend de hauteur du dernier plancher · classement du bâtiment"
  ]);
});

test("ce qu'un raisonnement n'a pas ne s'écrit pas en creux", () => {
  const lignes = blocDeRaisonnement({ condition: "c", alors: "a", retenu: "a" });
  assert.deepEqual(lignes.map(enClair), ["   si c", "      alors a  ✓ retenu"]);
});

test("les dépendances se séparent d'un point médian : un sujet peut porter une virgule", () => {
  const lignes = blocDeRaisonnement({ condition: "c", alors: "a", dependDe: ["hauteur, mesurée", "classement"] });
  assert.match(lignes.map(enClair).join("\n"), /dépend de hauteur, mesurée · classement/);
});

test("l'écriture a changé de version : le diff doit pouvoir le dire", () => {
  assert.equal(ECRITURE, "2.0");
});
