/**
 * `calcule` : l'arithmétique branchée dans le langage, de la lecture au verdict.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { lireUnFichier, lireUnCalculDeFonction } from "./memoire-en-lecture.js";
import {
  evaluerLaRegle, lecteurDeValeurs, poserLesLocales, conclusionDeLaRegle, DOUTE, phraseDuDoute
} from "./memoire-evaluateur.js";
import { lancerLeBrouillon, fonctionsDuBrouillon, ISSUE } from "./bac-dessai.js";
import { champsDuBrouillon, nomsLus } from "./formulaire-du-brouillon.js";
import { ligneDeCalcul, texteDesLignes, VERBES } from "./memoire-en-texte.js";
import { jetonsEcrits } from "./mdall-en-ecriture.js";
import { jetonsDeLaLigne } from "./memoire-en-lecture.js";

/** La TVA : la phrase la plus ordinaire d'un projet, écrite en entier. */
const TVA = [
  "fonction Prix TTC(zones, Prix HT) {",
  "   // Le prix toutes taxes, au taux normal.",
  "   importe (variable: Prix HT, depuis: prix.ddb, zones: zones);",
  "   calcule TVA = Prix HT * 20%;",
  "   calcule Prix TTC = Prix HT + TVA;",
  "   si (Prix HT >= 0 €)",
  "   alors (Prix TTC);",
  '   sinon ("rien à facturer");',
  "}"
].join("\n");

const fichiers = (contenu) => [{ nom: "essai.ref", contenu }];
const regleDe = (contenu) => {
  const bloc = lireUnFichier(contenu).blocs[0];
  return {
    payload: {
      subject: bloc.sujet,
      value: bloc.alors,
      regle: { conditions: bloc.conditions, sinon: bloc.sinon, sauf: bloc.sauf, calculs: bloc.calculs }
    }
  };
};

/* ── La lecture ──────────────────────────────────────────────────────────── */

test("une fonction lit ses calculs, dans l'ordre où ils sont écrits", () => {
  // L'ordre est le sens : le second calcul lit le premier, et résoudre un
  // graphe de dépendances rendrait indécidable un fichier qu'on lit de haut
  // en bas.
  const lu = lireUnFichier(TVA);

  assert.deepEqual(lu.refus, []);
  assert.deepEqual(lu.blocs[0].calculs.map((un) => un.nom), ["TVA", "Prix TTC"]);
  assert.equal(lu.blocs[0].calculs[0].expression, "Prix HT * 20%");
  assert.equal(lu.blocs[0].calculs[0].ligne, 4);
});

test("l'expression ne se met pas entre guillemets, et se garde telle quelle", () => {
  // Un `soit` cite une provenance ; un `calcule` porte une arithmétique. Les
  // guillemets en feraient un texte, et un texte ne se rejoue pas.
  assert.deepEqual(lireUnCalculDeFonction("TVA = Prix HT * 20%;"),
    { nom: "TVA", expression: "Prix HT * 20%" });
  assert.equal(lireUnCalculDeFonction("TVA ="), null);
  assert.equal(lireUnCalculDeFonction("Prix HT * 20%"), null);
  assert.equal(lireUnCalculDeFonction(""), null);
});

test("une expression qui ne se lit pas est refusée à la lecture, en le disant", () => {
  // La laisser passer jusqu'au lancement ferait une règle qui ne conclut rien
  // sans qu'on sache pourquoi (règle 5).
  const lu = lireUnFichier("fonction X(zones) {\n   calcule A = 2 +;\n}");

  assert.equal(lu.refus.length, 1);
  assert.equal(lu.refus[0].ligne, 2);
  assert.match(lu.refus[0].raison, /« A » ne se calcule pas/);
  assert.match(lu.refus[0].raison, /second membre/);
});

test("un calcul sans nom ni expression se refuse plutôt que de s'inventer", () => {
  assert.match(lireUnFichier("fonction X(zones) {\n   calcule TVA;\n}").refus[0].raison,
    /ni nom ni expression/);
  assert.match(lireUnFichier("fonction X(zones) {\n   calcule = 2;\n}").refus[0].raison,
    /ni nom ni expression/);
});

test("« calcule » n'est pas « soit », et la lecture ne les confond pas", () => {
  // `soit` déclare une provenance — le nom **est** le type. C'est pour cela
  // qu'il ne pouvait pas porter un calcul.
  const avecSoit = lireUnFichier('fonction X(zones) {\n   soit TVA = "2";\n}');
  assert.match(avecSoit.refus[0].raison, /n'est pas une provenance connue/);

  const avecCalcule = lireUnFichier("fonction X(zones) {\n   calcule TVA = 2;\n}");
  assert.deepEqual(avecCalcule.refus, []);

  // Et `soit texte = …` continue de poser une provenance, comme avant.
  const provenance = lireUnFichier('fonction X(zones) {\n   soit texte = "NF EN 1991";\n}');
  assert.deepEqual(provenance.refus, []);
  assert.equal(provenance.blocs[0].provenance.type, "texte");
});

/* ── L'écriture et la couleur ────────────────────────────────────────────── */

test("la ligne canonique s'écrit, et se relit telle qu'elle a été écrite", () => {
  const ecrite = texteDesLignes([ligneDeCalcul("Prix TTC", "Prix HT + TVA")]);

  assert.equal(ecrite, "   calcule Prix TTC = Prix HT + TVA;");
  assert.deepEqual(lireUnFichier(`fonction X(zones) {\n${ecrite}\n}`).blocs[0].calculs,
    [{ nom: "Prix TTC", expression: "Prix HT + TVA", ligne: 2 }]);
  assert.equal(ligneDeCalcul("", "A + B"), null);
  assert.equal(ligneDeCalcul("A", ""), null);
});

test("le verbe se colore comme un verbe, et l'expression au caractère près", () => {
  const ligne = "   calcule Prix TTC = Prix HT + TVA;";
  const jetons = jetonsDeLaLigne(ligne);

  assert.equal(jetons.map((un) => un.texte).join(""), ligne);
  assert.equal(jetons.find((un) => un.texte === VERBES.CALCULE)?.type, "mot-natif");
  assert.equal(jetons.find((un) => un.texte === "+")?.type, "operateur");
  // La Mémoire et la saisie peignent la même ligne de la même façon : c'est le
  // même peintre, et non deux lectures qui divergeraient (règle 10).
  assert.deepEqual(jetons, jetonsEcrits(ligne));
});

/* ── L'évaluation ────────────────────────────────────────────────────────── */

test("la TVA se calcule, et la règle conclut ce que le calcul a posé", () => {
  const rendu = evaluerLaRegle(regleDe(TVA), lecteurDeValeurs({ "Prix HT": "1200 €" }));

  assert.equal(rendu.tient, true);
  assert.equal(rendu.valeur, "1440 €");
  assert.deepEqual(rendu.calculs.map((un) => `${un.nom} = ${un.valeur}`),
    ["TVA = 240 €", "Prix TTC = 1440 €"]);
});

test("le second calcul lit le premier", () => {
  const { lire, noms } = poserLesLocales([
    { nom: "TVA", expression: "Prix HT * 20%" },
    { nom: "Prix TTC", expression: "Prix HT + TVA" }
  ], lecteurDeValeurs({ "Prix HT": "1200 €" }));

  assert.equal(lire("TVA").valeur, "240 €");
  assert.equal(lire("Prix TTC").valeur, "1440 €");
  assert.equal(noms.size, 2);
});

test("une condition porte sur une valeur calculée", () => {
  const regle = regleDe([
    "fonction Cher(zones, Prix HT) {",
    "   calcule Prix TTC = Prix HT * 1,2;",
    "   si (Prix TTC > 1000 €)",
    '   alors ("cher");',
    '   sinon ("raisonnable");',
    "}"
  ].join("\n"));

  assert.equal(evaluerLaRegle(regle, lecteurDeValeurs({ "Prix HT": "1200 €" })).valeur, "cher");
  assert.equal(evaluerLaRegle(regle, lecteurDeValeurs({ "Prix HT": "100 €" })).valeur, "raisonnable");
});

test("une entrée qui manque rend indécidable, et se demande — la locale non", () => {
  // Une locale que le calcul n'a pas su poser manque aussi à celui qui la lit,
  // mais personne ne peut la saisir : elle se calcule.
  const rendu = evaluerLaRegle(regleDe(TVA), lecteurDeValeurs({}));

  assert.equal(rendu.tient, null);
  assert.equal(rendu.valeur, "");
  assert.deepEqual(rendu.manquants, ["Prix HT"]);
  assert.equal(rendu.calculs.every((un) => !un.connu), true);
});

test("une expression citée n'est pas une expression", () => {
  // Un `soit` cite une provenance ; un `calcule` porte une arithmétique. Des
  // guillemets en feraient un texte, et un texte ne se rejoue pas — la lecture
  // le refuse plutôt que de les retirer en silence.
  const lu = lireUnFichier('fonction X(zones) {\n   calcule A = "2 + 2";\n}');

  assert.equal(lu.refus.length, 1);
  assert.match(lu.refus[0].raison, /« A » ne se calcule pas/);
  assert.match(lu.refus[0].raison, /n'est pas du langage/);
});

test("une locale qu'on n'a pas su calculer n'existe pas, et ne vaut pas zéro", () => {
  // **Le piège.** Poser la locale à zéro ferait tenir une condition sur une
  // valeur que personne n'a — et une altitude à zéro se calcule sans broncher
  // jusqu'à une cote de fondation fausse (règle 5).
  const regle = regleDe([
    "fonction Surélevé(zones, Niveau du sol) {",
    "   calcule Cote = Niveau du sol + 1 m;",
    "   si (Cote > 0 m)",
    '   alors ("oui");',
    '   sinon ("non");',
    "}"
  ].join("\n"));

  const sansRien = evaluerLaRegle(regle, lecteurDeValeurs({}));
  assert.equal(sansRien.tient, null, "la règle a conclu sur une locale qu'elle n'a pas");
  assert.equal(sansRien.valeur, "");

  // **Et ce que le calcul n'a pas pu lire se demande**, même si aucune
  // condition ne le nomme : sinon le formulaire ne demande pas ce dont il a
  // besoin, et l'on cherche longtemps.
  assert.deepEqual(sansRien.manquants, ["Niveau du sol"]);

  // Avec la valeur, la règle conclut de nouveau.
  assert.equal(evaluerLaRegle(regle, lecteurDeValeurs({ "Niveau du sol": "108,2 m" })).valeur, "oui");
});

test("un calcul refusé se dit comme tel, et non comme une valeur qui manque", () => {
  // On chercherait la valeur, et elle est là : c'est l'arithmétique qui ne
  // veut rien dire.
  const regle = regleDe([
    "fonction X(zones, A) {",
    "   calcule B = A + 2 €;",
    "   si (B > 0 m)",
    "   alors (B);",
    "}"
  ].join("\n"));
  const rendu = evaluerLaRegle(regle, lecteurDeValeurs({ A: "3 m" }));

  assert.ok(rendu.doutes.includes(DOUTE.CALCUL_REFUSE));
  assert.equal(rendu.tient, null);
  assert.match(rendu.calculs[0].pourquoi, /ne se composent pas/);
  assert.equal(phraseDuDoute(DOUTE.CALCUL_REFUSE), "ce calcul ne se fait pas");
});

test("une conclusion ne nomme une locale que si la fonction l'a posée", () => {
  // Sans cette borne, `alors (Zone de vent)` cesserait d'être une chaîne du
  // jour où quelqu'un verse une valeur pour ce sujet, et un fichier changerait
  // de sens sans avoir bougé.
  const locales = poserLesLocales([{ nom: "TVA", expression: "2 €" }], lecteurDeValeurs({ "Zone de vent": "3" }));

  assert.equal(conclusionDeLaRegle("TVA", locales), "2 €");
  assert.equal(conclusionDeLaRegle("Zone de vent", locales), "Zone de vent");
  assert.equal(conclusionDeLaRegle("3e famille B", locales), "3e famille B");
  assert.equal(conclusionDeLaRegle("TVA", null), "TVA");
  assert.equal(conclusionDeLaRegle("", locales), "");
});

test("pour conclure avec la valeur d'un nom du projet, on la calcule", () => {
  // `alors (Niveau du sol)` rend le **texte** « Niveau du sol », et c'est
  // voulu : sinon un fichier changerait de sens le jour où quelqu'un verse une
  // valeur pour ce sujet. Le chemin explicite tient en une ligne, et il se lit.
  const parLeTexte = regleDe([
    "fonction X(zones, Niveau du sol) {",
    '   si (Niveau du sol > 0 m)',
    "   alors (Niveau du sol);",
    "}"
  ].join("\n"));
  assert.equal(evaluerLaRegle(parLeTexte, lecteurDeValeurs({ "Niveau du sol": "108,2 m" })).valeur,
    "Niveau du sol");

  const parLeCalcul = regleDe([
    "fonction X(zones, Niveau du sol) {",
    "   calcule Cote = Niveau du sol;",
    '   si (Niveau du sol > 0 m)',
    "   alors (Cote);",
    "}"
  ].join("\n"));
  assert.equal(evaluerLaRegle(parLeCalcul, lecteurDeValeurs({ "Niveau du sol": "108,2 m" })).valeur,
    "108,2 m");
});

test("une règle sans calcul se comporte exactement comme avant", () => {
  // Le langage d'hier ne bouge pas : un `alors` cité reste un texte.
  const regle = regleDe([
    "fonction Vitesse(zones, Zone de vent) {",
    '   si (Zone de vent = "3")',
    '   alors ("120 km/h");',
    "}"
  ].join("\n"));
  const rendu = evaluerLaRegle(regle, lecteurDeValeurs({ "Zone de vent": "3" }));

  assert.equal(rendu.valeur, "120 km/h");
  assert.deepEqual(rendu.calculs, []);
});

/* ── Le bac d'essai ──────────────────────────────────────────────────────── */

test("une fonction qui ne fait que calculer se lance quand même", () => {
  // Une affirmation ne raisonne pas ; un calcul, si. La laisser dehors
  // reviendrait à dire que l'arithmétique n'est pas du langage.
  const sansCondition = "fonction Aire(zones, Largeur) {\n   calcule Aire = Largeur * 2 m;\n}";

  assert.equal(fonctionsDuBrouillon(fichiers(sansCondition)).length, 1);
  assert.equal(fonctionsDuBrouillon(fichiers("Altitude du site = 890 m")).length, 0);
});

test("le formulaire demande ce qu'un calcul lit, et jamais ce qu'il pose", () => {
  assert.deepEqual(nomsLus(fichiers(TVA)), ["Prix HT"]);
  assert.deepEqual(champsDuBrouillon(fichiers(TVA)).map((un) => un.nom), ["Prix HT"]);

  // Un nom lu par un calcul et par aucune condition se demande quand même.
  const seulementCalcule = "fonction X(zones, A) {\n   calcule B = A + 1 m;\n   si (B > 0 m)\n   alors (B);\n}";
  assert.deepEqual(nomsLus(fichiers(seulementCalcule)), ["A"]);
});

test("le bac rend la trace du calcul avec celle des conditions", () => {
  // Un nombre sorti de nulle part est exactement ce qu'on refuse à un agent :
  // on ne va pas l'accepter d'une règle sous prétexte qu'elle est écrite.
  const [resultat] = lancerLeBrouillon(fichiers(TVA), { "Prix HT": "1200 €" });

  assert.equal(resultat.issue, ISSUE.TIENT);
  assert.equal(resultat.valeur, "1440 €");
  assert.deepEqual(resultat.calculs.map((un) => un.expression), ["Prix HT * 20%", "Prix HT + TVA"]);
  assert.equal(resultat.calculs[1].valeur, "1440 €");
});

test("le plancher bas en zone inondable, écrit en entier", () => {
  // La seconde phrase d'essai : « si la situation du projet est en zone
  // inondable, le plancher bas du niveau le plus bas doit être 1 m au-dessus
  // du niveau du sol ».
  const inondable = [
    "fonction Cote du plancher bas(zones, Zone inondable, Niveau du sol) {",
    "   importe (variable: Zone inondable, depuis: site.ddb, zones: zones);",
    "   importe (variable: Niveau du sol, depuis: site.ddb, zones: zones);",
    "   calcule Cote imposée = Niveau du sol + 1 m;",
    '   si (Zone inondable = "oui")',
    "   alors (Cote imposée);",
    "   sinon (Niveau du sol);",
    "}"
  ].join("\n");

  assert.deepEqual(lireUnFichier(inondable).refus, []);

  const [resultat] = lancerLeBrouillon(fichiers(inondable),
    { "Zone inondable": "oui", "Niveau du sol": "108,2 m" });

  assert.equal(resultat.valeur, "109,2 m");
  assert.equal(resultat.calculs[0].valeur, "109,2 m");
});
