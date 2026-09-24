/**
 * Le formulaire déduit, et ce que les fonctions répondent.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  SAISIE, champsDuBrouillon, valeursPosees, nomsLus, valeursDuLancement
} from "./formulaire-du-brouillon.js";
import {
  ISSUE, lancerLeBrouillon, fonctionsDuBrouillon, phraseDuLancement
} from "./bac-dessai.js";

const DECLARATIONS = { nom: "variables-du-projet.ref", contenu: [
  "const Zone de vent = {",
  '   type: "texte",',
  '   valeurs possibles: "1" ou "2" ou "3" ou "4",',
  '   description: "Zone de vent de la commune, au sens de l\'annexe nationale.",',
  "};",
  "",
  "const Hauteur du plancher bas = {",
  '   type: "mesure",',
  '   unité: "m",',
  "};",
  "",
  "const Sprinklé = {",
  '   type: "logique",',
  "};"
].join("\n") };

const REGLES = { nom: "essai.ref", contenu: [
  "fonction Vitesse de référence(zones, Zone de vent) {",
  '   si (Zone de vent = "3")',
  '   alors ("120 km/h");',
  '   sinon ("100 km/h");',
  "}"
].join("\n") };

const champ = (champs, nom) => champs.find((un) => un.nom === nom);

/* ── Le formulaire se déduit ─────────────────────────────────────────────── */

test("un domaine fermé devient une liste, et rien d'autre ne l'a demandé", () => {
  // C'est l'exemple de la demande, obtenu sans un mot d'affichage dans le
  // langage : le nom est l'étiquette, la description est l'aide, le domaine est
  // la liste.
  const champs = champsDuBrouillon([DECLARATIONS, REGLES]);
  const vent = champ(champs, "Zone de vent");

  assert.equal(vent.saisie, SAISIE.LISTE);
  assert.deepEqual(vent.choix, ["1", "2", "3", "4"]);
  assert.match(vent.aide, /annexe nationale/);
  assert.equal(vent.declare, true);
});

test("un type dicte la forme du champ, et l'unité l'accompagne", () => {
  const regles = { nom: "essai.ref", contenu: [
    "fonction Degré coupe-feu(zones, Hauteur du plancher bas) {",
    "   si (Hauteur du plancher bas <= 28 m)",
    '   alors ("CF 1 h");',
    "}",
    "",
    "fonction Désenfumage(zones, Sprinklé) {",
    '   si (Sprinklé = "oui")',
    '   alors ("mécanique");',
    "}"
  ].join("\n") };
  const champs = champsDuBrouillon([DECLARATIONS, regles]);

  assert.equal(champ(champs, "Hauteur du plancher bas").saisie, SAISIE.MESURE);
  assert.equal(champ(champs, "Hauteur du plancher bas").unite, "m");
  assert.equal(champ(champs, "Sprinklé").saisie, SAISIE.LOGIQUE);
});

test("un nom qu'aucune ligne ne déclare reste remplissable, et se dit tel quel", () => {
  // Le refuser rendrait la règle indécidable pour toujours, et l'on ne saurait
  // pas si elle marche. Mais ce qu'on tape là ne tient sur rien, et l'écran le
  // dit (règle 5).
  const champs = champsDuBrouillon([{ nom: "essai.ref", contenu: [
    "fonction Fondations(zones, Portance du sol) {",
    "   si (Portance du sol >= 0,2 MPa)",
    '   alors ("superficielles");',
    "}"
  ].join("\n") }]);

  assert.equal(champs.length, 1);
  assert.equal(champs[0].saisie, SAISIE.TEXTE);
  assert.equal(champs[0].declare, false);
  assert.equal(champs[0].aide, "");
});

test("on ne redemande pas ce que le brouillon dit déjà", () => {
  // Une valeur écrite dans le `.ddb` est une réponse. La redemander en ferait
  // deux, et les deux divergeraient au premier essai (règle 4).
  const champs = champsDuBrouillon([
    DECLARATIONS, REGLES,
    { nom: "essai.ddb", contenu: "Zone de vent = 3" }
  ]);

  assert.deepEqual(champs.map((un) => un.nom), []);
});

test("une règle ne pose rien : sa conclusion n'est pas une réponse", () => {
  // Elle conclut, et c'est justement ce qu'on va calculer. La compter parmi ce
  // que le brouillon dit ferait répondre à la question avant de la poser.
  const posees = valeursPosees([REGLES, { nom: "essai.ddb", contenu: "Zone de vent = 3" }]);

  assert.deepEqual([...posees.entries()], [["zone de vent", "3"]]);
});

test("chaque nom lu n'est demandé qu'une fois, dans l'ordre de lecture", () => {
  const lus = nomsLus([{ nom: "essai.ref", contenu: [
    "fonction A(zones, Zone de vent) {",
    '   si (Zone de vent = "3")',
    '   alors ("x");',
    "}",
    "",
    "fonction B(zones, Zone de vent) {",
    '   si (Zone de vent = "1")',
    '   sauf si (Hauteur du plancher bas <= 28 m)',
    '   alors ("y");',
    "}"
  ].join("\n") }]);

  assert.deepEqual(lus, ["Zone de vent", "Hauteur du plancher bas"]);
});

test("ce qu'on répond l'emporte sur ce que le fichier dit", () => {
  // Le formulaire est là pour varier ce qu'on ne veut pas écrire dans le
  // fichier. Une valeur du fichier qui gagnerait ferait un formulaire décoratif.
  const valeurs = valeursDuLancement(
    [{ nom: "essai.ddb", contenu: "Zone de vent = 1" }],
    { "Zone de vent": "3" }
  );

  assert.equal(valeurs.get("zone de vent"), "3");
});

/* ── Le lancement ────────────────────────────────────────────────────────── */

test("sans réponse, la fonction ne sait pas — elle ne conclut pas `sinon`", () => {
  // C'est l'intérêt de l'écran, et c'est par cette réponse-là qu'on apprend le
  // langage : une entrée qui manque n'est pas une entrée fausse.
  const [resultat] = lancerLeBrouillon([DECLARATIONS, REGLES]);

  assert.equal(resultat.issue, ISSUE.INDECIDABLE);
  assert.equal(resultat.valeur, "");
  assert.deepEqual(resultat.manquants, ["Zone de vent"]);
  assert.equal(resultat.lectures[0].verite, null);
  assert.match(resultat.lectures[0].pourquoi, /personne n'a versé de valeur/);
});

test("avec la réponse, elle conclut — et montre ce qu'elle a lu", () => {
  const [resultat] = lancerLeBrouillon([DECLARATIONS, REGLES], { "Zone de vent": "3" });

  assert.equal(resultat.issue, ISSUE.TIENT);
  assert.equal(resultat.valeur, "120 km/h");
  assert.equal(resultat.lectures[0].lu, "3");
  assert.equal(resultat.lectures[0].verite, true);
});

test("une condition fausse conclut le `sinon`, et le dit comme tel", () => {
  const [resultat] = lancerLeBrouillon([DECLARATIONS, REGLES], { "Zone de vent": "1" });

  assert.equal(resultat.issue, ISSUE.SINON);
  assert.equal(resultat.valeur, "100 km/h");
  assert.equal(resultat.lectures[0].verite, false);
});

test("une fonction qui appelle un agent ne s'évalue pas : sa loi est ailleurs", () => {
  // Sans cette sortie, elle s'évaluerait sur zéro condition — donc « vraie » —
  // et l'écran annoncerait qu'elle tient sans avoir rien calculé (fondamental 9).
  const [resultat] = lancerLeBrouillon([{ nom: "essai.ref", contenu: [
    "fonction Résultat du calcul(zones) {",
    "   résultat = agent-D (",
    "      utilitaire: dimensionnement_V1,",
    "      version: 1.0",
    "   );",
    "   enregistre (",
    "      Arase inférieure: résultat,",
    "      dans: structure.ctr,",
    "      zones: zones",
    "   )",
    "}"
  ].join("\n") }]);

  assert.equal(resultat.issue, ISSUE.AU_SERVEUR);
  assert.equal(resultat.valeur, "");
  assert.deepEqual(resultat.ou, ["Arase inférieure"]);
});

test("une affirmation n'est pas une fonction : elle ne se lance pas", () => {
  // La lancer reviendrait à évaluer une valeur contre elle-même.
  assert.deepEqual(fonctionsDuBrouillon([{ nom: "essai.ddb", contenu: "Zone de vent = 3" }]), []);
  assert.deepEqual(lancerLeBrouillon([{ nom: "essai.ddb", contenu: "Zone de vent = 3" }]), []);
});

test("chaque résultat dit où le trouver dans le brouillon", () => {
  const fichiers = [DECLARATIONS, { nom: "essai.ref", contenu: `\n\n${REGLES.contenu}` }];
  const [resultat] = lancerLeBrouillon(fichiers, { "Zone de vent": "3" });

  assert.equal(resultat.fichier, "essai.ref");
  assert.equal(resultat.ligne, 3);
});

test("une exception écarte la règle, et se lit dans la trace", () => {
  const [resultat] = lancerLeBrouillon([DECLARATIONS, { nom: "essai.ref", contenu: [
    "fonction Vitesse de référence(zones, Zone de vent) {",
    '   si (Zone de vent = "3")',
    '   sauf si (Sprinklé = "oui")',
    '   alors ("120 km/h");',
    "}"
  ].join("\n") }], { "Zone de vent": "3", "Sprinklé": "oui" });

  assert.equal(resultat.issue, ISSUE.SINON);
  assert.equal(resultat.lectures.length, 2);
  assert.equal(resultat.lectures[1].sujet, "Sprinklé");
  assert.equal(resultat.lectures[1].verite, true);
});

/* ── Ce que le lancement dit en une ligne ────────────────────────────────── */

test("la phrase met devant ce qui ne sait pas", () => {
  // C'est ce qu'on vient voir : une règle qui conclut a fait son travail, une
  // règle qui ne sait pas dit qu'il manque quelque chose.
  const fichiers = [DECLARATIONS, { nom: "essai.ref", contenu: [
    REGLES.contenu,
    "",
    "fonction Degré coupe-feu(zones, Hauteur du plancher bas) {",
    "   si (Hauteur du plancher bas <= 28 m)",
    '   alors ("CF 1 h");',
    "}"
  ].join("\n") }];

  const phrase = phraseDuLancement(lancerLeBrouillon(fichiers, { "Zone de vent": "3" }));
  assert.match(phrase, /^2 fonctions — 1 ne sait pas, 1 conclut\.$/);
});

test("sans fonction, on le dit plutôt que de rendre une liste vide", () => {
  assert.match(phraseDuLancement([]), /ne raisonne pas encore/);
});

test("la conclusion d'une règle appliquée n'est pas une entrée du formulaire", () => {
  // La mémoire écrit une règle **avec sa valeur en tête** — `Degré coupe-feu =
  // "CF 1 h" { si … }` —, et c'est cette forme qu'un brouillon copie d'un
  // fichier du projet. La compter parmi ce que le brouillon pose reviendrait à
  // redonner en entrée ce que la règle doit conclure : elle se vérifierait
  // elle-même, et tiendrait toujours.
  const applique = { nom: "essai.ref", contenu: [
    'Degré coupe-feu = "CF 1 h" {',
    "   si (Hauteur du plancher bas <= 28 m)",
    '   alors ("CF 1 h");',
    "}"
  ].join("\n") };

  assert.deepEqual([...valeursPosees([applique]).entries()], []);

  // Et la hauteur, elle, reste demandée.
  assert.deepEqual(champsDuBrouillon([applique]).map((un) => un.nom), ["Hauteur du plancher bas"]);
});
