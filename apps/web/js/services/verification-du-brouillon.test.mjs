/**
 * Ce qui ne va pas dans un brouillon, nommé ligne par ligne.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ENNUI, verifierLeBrouillon, phraseDeLaVerification, nomsDeclares, domainesDeclares
} from "./verification-du-brouillon.js";

const DECLARATIONS = {
  nom: "variables-du-projet.ref",
  contenu: [
    "const Zone de vent = {",
    '   type: "texte",',
    '   valeurs possibles: "1" ou "2" ou "3" ou "4",',
    '   description: "Zone de vent de la commune.",',
    '   utilisation: "Entrée de la vitesse de référence.",',
    "};"
  ].join("\n")
};

const regle = (lignes) => ({ nom: "essai.ref", contenu: lignes.join("\n") });

const quoi = (remarques) => remarques.map((une) => une.quoi);

/* ── Ce qui ne se lit pas ────────────────────────────────────────────────── */

test("une ligne que la lecture refuse se dit, avec son numéro et sa raison", () => {
  const remarques = verifierLeBrouillon([{
    nom: "essai.ddb",
    contenu: ["Altitude du site = 890 m {", "   typo: 12", "}"].join("\n")
  }]);

  const illisible = remarques.find((une) => une.quoi === ENNUI.ILLISIBLE);
  assert.equal(illisible.ligne, 2);
  assert.match(illisible.dit, /n'est pas une provenance connue/);
  assert.equal(illisible.texte, "typo: 12");
});

test("une phrase en français se signale comme ne disant rien", () => {
  // La lecture est permissive par choix : « la zone de vent vaut trois » ne se
  // refuse pas, elle se lit comme un nom. Le taire laisserait croire qu'on a
  // écrit du Mdall — et ce nom entrerait dans la mémoire du brouillon.
  const remarques = verifierLeBrouillon([regle(["la zone de vent vaut trois"])]);

  assert.deepEqual(quoi(remarques).filter((une) => une === ENNUI.SANS_VALEUR).length, 1);
  assert.match(remarques.find((une) => une.quoi === ENNUI.SANS_VALEUR).dit, /est nommé et ne dit rien/);
});

/* ── Les noms ────────────────────────────────────────────────────────────── */

test("une condition sur un nom que rien ne déclare se dit, et porte sa ligne", () => {
  const remarques = verifierLeBrouillon([regle([
    "fonction Vitesse de référence(zones, Portance du sol) {",
    "   si (Portance du sol >= 0,2 MPa)",
    '   alors ("120 km/h");',
    "}"
  ])]);

  const inconnu = remarques.find((une) => une.quoi === ENNUI.NOM_INCONNU);
  assert.match(inconnu.dit, /« Portance du sol » n'est déclaré nulle part/);
  assert.equal(inconnu.ligne, 1);
});

test("un nom déclaré dans un autre fichier du brouillon ne se reproche pas", () => {
  // Une règle du `.ref` lit un nom déclaré dans le `.ddb`. Vérifier fichier par
  // fichier ferait crier au nom inconnu sur chaque entrée d'à côté, et l'écran
  // serait rouge de bout en bout.
  const remarques = verifierLeBrouillon([DECLARATIONS, regle([
    "fonction Vitesse de référence(zones, Zone de vent) {",
    '   si (Zone de vent = "3")',
    '   alors ("120 km/h");',
    "}"
  ])]);

  assert.deepEqual(quoi(remarques).filter((une) => une === ENNUI.NOM_INCONNU), []);
});

test("les deux façons de déclarer un nom comptent toutes les deux", () => {
  // Une affirmation qui le pose, et une déclaration de variable. N'en retenir
  // qu'une ferait crier au nom inconnu sur un brouillon qui le déclare juste
  // au-dessus.
  const noms = nomsDeclares([
    DECLARATIONS,
    { nom: "essai.ddb", contenu: "Altitude du site = 890 m" }
  ]);

  assert.equal(noms.has("zone de vent"), true);
  assert.equal(noms.has("altitude du site"), true);
});

/* ── Les domaines ────────────────────────────────────────────────────────── */

test("une comparaison hors du domaine déclaré se dit, avec les valeurs admises", () => {
  // Une zone de vent comparée à « 7 » est une condition qui ne sera jamais
  // vraie : la règle conclurait toujours `sinon`, et rien ne le dirait.
  const remarques = verifierLeBrouillon([DECLARATIONS, regle([
    "fonction Vitesse de référence(zones, Zone de vent) {",
    '   si (Zone de vent = "7")',
    '   alors ("120 km/h");',
    "}"
  ])]);

  const hors = remarques.find((une) => une.quoi === ENNUI.HORS_DU_DOMAINE);
  assert.match(hors.dit, /ne vaut que « 1 », « 2 », « 3 », « 4 »/);
  assert.match(hors.dit, /ne sera jamais vraie/);
});

test("sans domaine déclaré, aucune valeur n'est hors du domaine", () => {
  // Ne pas savoir n'autorise pas à prétendre. Une variable sans domaine accepte
  // tout, et c'est la vérité du moment (règle 5).
  const remarques = verifierLeBrouillon([
    { nom: "essai.ddb", contenu: "Portance du sol = 0,2 MPa" },
    regle([
      "fonction Fondations(zones, Portance du sol) {",
      '   si (Portance du sol = "n\'importe quoi")',
      '   alors ("oui");',
      "}"
    ])
  ]);

  assert.deepEqual(quoi(remarques).filter((une) => une === ENNUI.HORS_DU_DOMAINE), []);
});

test("le domaine se relit depuis la déclaration, et nulle part ailleurs", () => {
  assert.deepEqual([...domainesDeclares([DECLARATIONS]).entries()], [["zone de vent", ["1", "2", "3", "4"]]]);
  assert.deepEqual([...domainesDeclares([regle(["Altitude = 890 m"])]).entries()], []);
});

/* ── Les destinations ────────────────────────────────────────────────────── */

test("une fonction qui appelle un agent sans dire où va son résultat se signale", () => {
  // Elle calcule et n'écrit nulle part. Cela se voit au versement, jamais
  // avant — c'est-à-dire trop tard.
  const remarques = verifierLeBrouillon([regle([
    "fonction Résultat du calcul(zones) {",
    "   résultat = agent-D (",
    "      utilitaire: dimensionnement_V1,",
    "      version: 1.0",
    "   );",
    "}"
  ])]);

  assert.equal(quoi(remarques).includes(ENNUI.SANS_DESTINATION), true);
});

/* ── Les extensions ──────────────────────────────────────────────────────── */

test("un raisonnement écrit dans un .ctr se signale", () => {
  // Cela ne casse rien aujourd'hui : cela se verra au versement, quand le
  // rangement enverra la ligne ailleurs que là où on l'a écrite.
  const remarques = verifierLeBrouillon([{
    nom: "essai.ctr",
    contenu: ["fonction Degré coupe-feu(zones, Hauteur) {", "   si (Hauteur <= 28 m)", '   alors ("CF 1 h");', "}"].join("\n")
  }]);

  const ennui = remarques.find((une) => une.quoi === ENNUI.MAUVAISE_EXTENSION);
  assert.match(ennui.dit, /Un raisonnement s'écrit dans un « \.ref »/);
});

test("une extension que le langage ne connaît pas se signale", () => {
  const remarques = verifierLeBrouillon([{ nom: "essai.txt", contenu: "Altitude du site = 890 m" }]);

  assert.match(remarques.find((une) => une.quoi === ENNUI.MAUVAISE_EXTENSION).dit, /rien ici ne se versera/);
});

test("une règle dans un .ref ne se reproche pas", () => {
  const remarques = verifierLeBrouillon([DECLARATIONS, regle([
    "fonction Vitesse de référence(zones, Zone de vent) {",
    '   si (Zone de vent = "3")',
    '   alors ("120 km/h");',
    "}"
  ])]);

  assert.deepEqual(quoi(remarques), []);
});

test("une déclaration de variable est du raisonnement : elle reste dans un .ref", () => {
  assert.deepEqual(verifierLeBrouillon([DECLARATIONS]), []);
});

/* ── Ce qui se dit quand il n'y a rien à dire ────────────────────────────── */

test("le silence se dit, et se distingue du vide", () => {
  // Un écran qui n'affiche rien quand tout va bien laisse croire qu'il n'a pas
  // regardé — et l'on apprend alors à ne plus le croire quand il parle.
  assert.equal(phraseDeLaVerification([], { fichiers: 0 }), "Rien à vérifier : le brouillon est vide.");
  assert.equal(phraseDeLaVerification([], { fichiers: 2 }), "Tout se lit. Rien à signaler.");
});

test("la phrase s'accorde avec ce qu'elle compte", () => {
  assert.match(phraseDeLaVerification([{}], { fichiers: 1 }), /^1 remarque — elle ne bloque rien, elle se corrige/);
  assert.match(phraseDeLaVerification([{}, {}], { fichiers: 1 }), /^2 remarques — elles ne bloquent rien, elles se corrigent/);
});

test("un fichier vide n'entre pas dans ce qu'on vérifie", () => {
  // Un fichier vide n'a rien à dire, et le faire entrer ferait compter des
  // refus sur du néant.
  assert.deepEqual(verifierLeBrouillon([{ nom: "essai.ref", contenu: "" }]), []);
  assert.deepEqual(verifierLeBrouillon([]), []);
  assert.deepEqual(verifierLeBrouillon(null), []);
});

test("les remarques se rangent par fichier puis par ligne", () => {
  // C'est l'ordre où on les lira. Une liste rangée autrement oblige à chercher
  // chaque remarque sur l'écran.
  const remarques = verifierLeBrouillon([
    regle(["du français ici", "", "encore du français"]),
    { nom: "aaa.ddb", contenu: "du français là aussi" }
  ]);

  assert.deepEqual(remarques.map((une) => [une.fichier, une.ligne]),
    [["aaa.ddb", 1], ["essai.ref", 1], ["essai.ref", 3]]);
});

/* ── Les cas que la batterie a trouvés muets ─────────────────────────────── */

test("une règle qui conclut ne se signale pas comme ne disant rien", () => {
  // Le garde-fou doit tomber sur une phrase en français **sans** tomber sur un
  // raisonnement : un écran qui reproche quelque chose à toutes les lignes ne
  // reproche plus rien à personne.
  const remarques = verifierLeBrouillon([DECLARATIONS, regle([
    "fonction Vitesse de référence(zones, Zone de vent) {",
    '   si (Zone de vent = "3")',
    '   alors ("120 km/h");',
    "}"
  ])]);

  assert.deepEqual(quoi(remarques).filter((une) => une === ENNUI.SANS_VALEUR), []);
});

test("une affirmation qui porte une valeur ne se signale pas non plus", () => {
  assert.deepEqual(
    quoi(verifierLeBrouillon([{ nom: "essai.ddb", contenu: "Altitude du site = 890 m" }])),
    []
  );
});

test("ce qu'une fonction native enregistre déclare ce nom-là", () => {
  // **Une fonction pose ce qu'elle range, pas son propre nom** (fondamental 9) :
  // « Dimensionnement des semelles » écrit « Arase inférieure ». Le nom existe
  // dès que la fonction est écrite, et ne pas le compter ferait crier au nom
  // inconnu sur la règle qui le lit juste après.
  const fichiers = [regle([
    "fonction Dimensionnement des semelles(zones) {",
    "   résultat = agent-D (",
    "      utilitaire: dimensionnement_V1,",
    "      version: 1.0",
    "   );",
    "   enregistre (",
    "      Arase inférieure: résultat,",
    "      dans: structure.ctr,",
    "      zones: zones",
    "   )",
    "}",
    "",
    "fonction Reprise en sous-oeuvre(zones, Arase inférieure) {",
    '   si (Arase inférieure <= -3,00 m)',
    '   alors ("exigée");',
    "}"
  ])];

  assert.equal(nomsDeclares(fichiers).has("arase inferieure"), true);
  assert.deepEqual(quoi(verifierLeBrouillon(fichiers)).filter((une) => une === ENNUI.NOM_INCONNU), []);
});

test("une exception se vérifie comme une condition", () => {
  // `sauf si` borne la règle, et une borne posée sur un nom qui n'existe pas
  // est exactement aussi fausse qu'une condition qui l'est — avec ceci de pire
  // qu'elle ne se déclenchera jamais, donc que la règle s'appliquera toujours.
  const remarques = verifierLeBrouillon([DECLARATIONS, regle([
    "fonction Vitesse de référence(zones, Zone de vent) {",
    '   si (Zone de vent = "3")',
    '   sauf si (Portance du sol >= 0,2 MPa)',
    '   alors ("120 km/h");',
    "}"
  ])]);

  const inconnu = remarques.find((une) => une.quoi === ENNUI.NOM_INCONNU);
  assert.match(inconnu.dit, /« Portance du sol »/);
});

test("un fichier de déclarations n'est pas pris pour un fichier d'affirmations", () => {
  // `variables-du-projet.ref` ne porte que des `const`. Sans compter les
  // déclarations comme du raisonnement, il se voyait reprocher d'être un `.ref`
  // qui ne porte pas de règle — sur le fichier que le projet engendre lui-même.
  const remarques = verifierLeBrouillon([DECLARATIONS]);

  assert.deepEqual(quoi(remarques).filter((une) => une === ENNUI.MAUVAISE_EXTENSION), []);
});

test("un fichier vide ne fabrique pas de remarque sur son extension", () => {
  // Un fichier vide n'a rien à dire. Le faire entrer ferait reprocher à un
  // onglet qu'on n'a pas encore rempli de ne pas contenir ce qu'il faut.
  assert.deepEqual(verifierLeBrouillon([
    { nom: "essai.ref", contenu: "" },
    { nom: "essai.ddb", contenu: "   \n  " }
  ]), []);
});

test("une règle dont la conclusion n'est pas écrite ne s'entend pas dire qu'elle ne dit rien", () => {
  // Elle dit une condition. Lui reprocher de ne rien dire serait faux, et sur
  // une règle qu'on est en train d'écrire c'est le pire moment pour l'être.
  const remarques = verifierLeBrouillon([DECLARATIONS, regle([
    "fonction Vitesse de référence(zones, Zone de vent) {",
    '   si (Zone de vent = "3")',
    "}"
  ])]);

  assert.deepEqual(quoi(remarques).filter((une) => une === ENNUI.SANS_VALEUR), []);
});

test("des déclarations écrites dans un .ctr se signalent", () => {
  // Une déclaration est du raisonnement : elle nomme, elle n'affirme pas. Dans
  // un `.ctr` — un fichier de contraintes — elle sera rangée ailleurs au
  // versement que là où on l'a écrite, et l'on cherchera longtemps.
  const remarques = verifierLeBrouillon([{ nom: "essai.ctr", contenu: DECLARATIONS.contenu }]);

  assert.match(remarques.find((une) => une.quoi === ENNUI.MAUVAISE_EXTENSION).dit,
    /Un raisonnement s'écrit dans un « \.ref »/);
});

test("un onglet vide ne se voit pas reprocher son nom", () => {
  // Le lot qui gardera les brouillons dans `Documents/` laissera nommer les
  // fichiers. Un onglet qu'on vient d'ouvrir et qu'on n'a pas encore rempli
  // n'a pas à s'entendre dire qu'il ne se versera pas.
  assert.deepEqual(verifierLeBrouillon([{ nom: "notes.txt", contenu: "" }]), []);

  // Rempli, en revanche, il le dit.
  assert.equal(
    quoi(verifierLeBrouillon([{ nom: "notes.txt", contenu: "Altitude du site = 890 m" }]))
      .includes(ENNUI.MAUVAISE_EXTENSION),
    true
  );
});
