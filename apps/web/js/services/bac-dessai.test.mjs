/**
 * Le formulaire déduit, et ce que les fonctions répondent.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  SAISIE, champsDuBrouillon, valeursPosees, nomsLus, valeursDuLancement,
  reponseAvecSonUnite
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

/* ── Une fonction lit ce qu'une autre conclut ────────────────────────────── */

/**
 * Le brouillon de la demande : un prix, un type de travaux, et le taux **déduit**.
 *
 * C'est exactement ce qu'on a écrit à l'écran en français — « on écrit le prix
 * hors taxe, on choisit entre existant ou neuf, selon le cas on calcule la TVA
 * et on affiche le taux, le montant et le prix TTC » — et c'est là que le
 * défaut s'est vu : le bac demandait le taux.
 */
const TVA = [
  { nom: "variables-du-projet.ref", contenu: [
    "const Prix HT = {",
    '   type: "mesure",',
    '   unité: "€",',
    '   description: "Le prix hors taxes des travaux.",',
    "};",
    "",
    "const Type de TVA = {",
    '   type: "texte",',
    '   valeurs possibles: "existant" ou "neuf",',
    "};"
  ].join("\n") },
  { nom: "essai.ref", contenu: [
    "fonction Taux de TVA(zones, Type de TVA) {",
    "   importe (variable: Type de TVA, depuis: variables-du-projet.ref, zones: zones);",
    '   si (Type de TVA = "existant")',
    "   alors (5 %);",
    "   sinon (20 %);",
    "}",
    "",
    "fonction Prix TTC(zones, Prix HT, Taux de TVA) {",
    "   importe (variable: Prix HT, depuis: variables-du-projet.ref, zones: zones);",
    "   importe (variable: Taux de TVA, depuis: essai.ref, zones: zones);",
    "   calcule TVA = Prix HT * Taux de TVA;",
    "   calcule Prix TTC = Prix HT + TVA;",
    "   si (Prix HT >= 0 €)",
    "   alors (Prix TTC);",
    "}"
  ].join("\n") }
];

const conclusion = (resultats, sujet) => resultats.find((un) => un.sujet === sujet);

test("le formulaire ne demande pas ce qu'une règle conclut", () => {
  // **Le défaut qu'on a vu à l'écran.** On décrivait un taux déduit, et le bac
  // offrait un champ « taux » — non déclaré — à remplir à la main : on tapait
  // la réponse qu'on venait chercher. Le graphe des blocs disait déjà la règle,
  // « un sujet qu'aucun bloc ne produit est une entrée » ; elle est appliquée.
  const demandes = champsDuBrouillon(TVA).map((un) => un.nom);

  assert.deepEqual(demandes, ["Type de TVA", "Prix HT"]);
  assert.equal(demandes.includes("Taux de TVA"), false);
  assert.equal(demandes.includes("TVA"), false);
  assert.equal(demandes.includes("Prix TTC"), false);
});

test("une fonction lit la conclusion d'une autre, sans un mot de plus dans le langage", () => {
  // La mémoire verse la conclusion d'une règle comme valeur de son sujet, et
  // les autres la relisent. Le bac ne le faisait pas : il évaluait tout le
  // monde avec les seules réponses du formulaire, et une règle qui dépendait
  // d'une autre restait indécidable pour toujours.
  const lance = lancerLeBrouillon(TVA, { "Prix HT": "120", "Type de TVA": "existant" });

  assert.equal(conclusion(lance, "Taux de TVA").valeur, "5 %");
  assert.equal(conclusion(lance, "Prix TTC").issue, ISSUE.TIENT);
  assert.equal(conclusion(lance, "Prix TTC").valeur, "126 €");

  // Et l'autre branche conclut l'autre taux : la chaîne suit la réponse.
  const neuf = lancerLeBrouillon(TVA, { "Prix HT": "120", "Type de TVA": "neuf" });
  assert.equal(conclusion(neuf, "Taux de TVA").valeur, "20 %");
  assert.equal(conclusion(neuf, "Prix TTC").valeur, "144 €");
});

test("le montant de la TVA se montre, et pas seulement le prix TTC", () => {
  // « on affiche le taux de la TVA, le montant de la TVA et le prix TTC » : les
  // trois sont là sans un verbe d'affichage — deux conclusions et une étape de
  // calcul, que la trace montre déjà.
  const lance = lancerLeBrouillon(TVA, { "Prix HT": "120", "Type de TVA": "neuf" });
  const etapes = conclusion(lance, "Prix TTC").calculs.map((un) => [un.nom, un.valeur]);

  assert.deepEqual(etapes, [["TVA", "24 €"], ["Prix TTC", "144 €"]]);
});

test("une conclusion n'écrase jamais une réponse du formulaire", () => {
  // Le formulaire est là pour varier ce qu'on ne veut pas écrire. Une
  // conclusion qui gagnerait sur lui le rendrait décoratif, et l'on ne
  // comprendrait pas pourquoi changer un champ ne change rien.
  const lance = lancerLeBrouillon(TVA, {
    "Prix HT": "120", "Type de TVA": "existant", "Taux de TVA": "20 %"
  });

  assert.equal(conclusion(lance, "Prix TTC").valeur, "144 €");
});

test("une chaîne circulaire s'arrête au lieu de tourner", () => {
  // Un graphe écrit à la main finira par en contenir une. Les passes sont
  // bornées par le nombre de fonctions : ce qui reste indécidable le reste, et
  // le dit — une page qui gèle est pire qu'une réponse incomplète.
  const boucle = [{ nom: "essai.ref", contenu: [
    "fonction A(zones, B) {",
    '   si (B = "oui")',
    '   alors ("oui");',
    "}",
    "",
    "fonction B(zones, A) {",
    '   si (A = "oui")',
    '   alors ("oui");',
    "}"
  ].join("\n") }];

  const lance = lancerLeBrouillon(boucle, {});
  assert.deepEqual(lance.map((un) => un.issue), [ISSUE.INDECIDABLE, ISSUE.INDECIDABLE]);
});

/* ── L'unité déclarée part avec la réponse ───────────────────────────────── */

test("ce qu'on tape prend l'unité que l'écran montre à côté du champ", () => {
  // **Le défaut que ça répare.** L'écran affiche « € » à droite du champ parce
  // que la déclaration le dit ; on tape « 120 », et c'est « 120 » qui partait.
  // Le verdict annonçait « 250 » là où la mémoire aurait écrit « 250 € », et
  // l'unité ne servait qu'à décorer.
  const mesure = { unite: "€" };

  assert.equal(reponseAvecSonUnite("120", mesure), "120 €");
  // Une unité tapée à la main est celle qu'on a voulu dire : on ne la double
  // pas, et on ne la corrige pas non plus — le calcul sait refuser deux unités
  // qui ne se composent pas, et c'est à lui de le dire.
  assert.equal(reponseAvecSonUnite("120 €", mesure), "120 €");
  assert.equal(reponseAvecSonUnite("120 m", mesure), "120 m");
  // « 3e famille B » n'est pas une mesure : lui coller « € » en ferait une, et
  // le calcul se mettrait à compter dessus.
  assert.equal(reponseAvecSonUnite("3e famille B", mesure), "3e famille B");
  assert.equal(reponseAvecSonUnite("", mesure), "");
  assert.equal(reponseAvecSonUnite("120", null), "120");
});

test("la réponse entre dans le lancement avec son unité", () => {
  assert.equal(valeursDuLancement(TVA, { "Prix HT": "120" }).get("prix ht"), "120 €");
});

test("la condition en euros tient sur une réponse tapée sans unité", () => {
  // `si (Prix HT >= 0 €)` comparait une mesure à un nombre nu : indécidable,
  // et l'écran disait « ne sait pas » sur un brouillon parfaitement écrit.
  const lance = lancerLeBrouillon(TVA, { "Prix HT": "120", "Type de TVA": "neuf" });
  const lecture = conclusion(lance, "Prix TTC").lectures[0];

  assert.equal(lecture.lu, "120 €");
  assert.equal(lecture.verite, true);
});

test("ce qu'un agent range se demande quand même : le bac ne sait pas le calculer", () => {
  // **Le piège du chaînage.** Une fonction qui appelle un agent *produit* bien
  // « Arase inférieure » dans la mémoire du projet — l'agent y est appelé pour
  // de bon. Ici, non : sa loi n'est pas dans le fichier (fondamental 9), et la
  // retirer du formulaire laisserait la règle d'en face indécidable pour
  // toujours, sans qu'un mot dise pourquoi. On la demande, et l'on éprouve.
  const fichiers = [{ nom: "essai.ref", contenu: [
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
    "}",
    "",
    "fonction Profondeur suffisante(zones, Arase inférieure) {",
    "   importe (variable: Arase inférieure, depuis: structure.ctr, zones: zones);",
    "   si (Arase inférieure <= -1 m)",
    '   alors ("oui");',
    '   sinon ("non");',
    "}"
  ].join("\n") }];

  assert.deepEqual(champsDuBrouillon(fichiers).map((un) => un.nom), ["Arase inférieure"]);

  // Et remplie à la main, la règle d'en face conclut.
  const lance = lancerLeBrouillon(fichiers, { "Arase inférieure": "-1,40 m" });
  assert.equal(lance.find((un) => un.sujet === "Profondeur suffisante").valeur, "oui");
});

test("une conclusion vide n'est pas une réponse", () => {
  // Une règle qui ne sait pas rend une conclusion vide. La poser quand même
  // ferait lire « rien » comme une valeur connue, et la règle d'en face
  // conclurait sur du vide — le contraire de ce que le bac existe pour montrer.
  const fichiers = [{ nom: "essai.ref", contenu: [
    "fonction Zone sismique(zones, Commune) {",
    '   si (Commune = "Montholon")',
    '   alors ("2");',
    "}",
    "",
    "fonction Étude exigée(zones, Zone sismique) {",
    "   importe (variable: Zone sismique, depuis: essai.ref, zones: zones);",
    '   si (Zone sismique = "2")',
    '   alors ("oui");',
    '   sinon ("non");',
    "}"
  ].join("\n") }];

  // Sans commune, la première ne sait pas — et la seconde ne doit pas conclure
  // « non » sur une zone sismique qu'on n'a jamais calculée.
  const muet = lancerLeBrouillon(fichiers, {});
  assert.deepEqual(muet.map((un) => un.issue), [ISSUE.INDECIDABLE, ISSUE.INDECIDABLE]);

  // Avec une commune qui ne tient pas la condition : la première ne conclut
  // rien non plus — elle n'a pas de `sinon` —, et la seconde le dit aussi.
  const ailleurs = lancerLeBrouillon(fichiers, { Commune: "Auxerre" });
  assert.deepEqual(ailleurs.map((un) => un.issue), [ISSUE.SINON, ISSUE.INDECIDABLE]);
});

test("une chaîne de trois se résout, et une conclusion vide ne bloque pas la place", () => {
  // **Le piège de la valeur vide.** À la première passe, seule la première
  // règle conclut : les deux autres ne savent pas encore. Retenir leur « rien »
  // comme une réponse occuperait la place — on ne remplace jamais une valeur —,
  // et la deuxième passe ne pourrait plus y écrire ce qu'elle vient enfin de
  // conclure. La chaîne s'arrêterait au premier maillon, sans un mot.
  const fichiers = [{ nom: "essai.ref", contenu: [
    "fonction Zone sismique(zones, Commune) {",
    '   si (Commune = "Montholon")',
    '   alors ("2");',
    "}",
    "",
    "fonction Catégorie d'importance(zones, Zone sismique) {",
    "   importe (variable: Zone sismique, depuis: essai.ref, zones: zones);",
    '   si (Zone sismique = "2")',
    '   alors ("II");',
    "}",
    "",
    "fonction Étude exigée(zones, Catégorie d'importance) {",
    "   importe (variable: Catégorie d'importance, depuis: essai.ref, zones: zones);",
    '   si (Catégorie d\'importance = "II")',
    '   alors ("oui");',
    '   sinon ("non");',
    "}"
  ].join("\n") }];

  const lance = lancerLeBrouillon(fichiers, { Commune: "Montholon" });

  assert.deepEqual(lance.map((un) => un.valeur), ["2", "II", "oui"]);
  assert.deepEqual(lance.map((un) => un.issue), [ISSUE.TIENT, ISSUE.TIENT, ISSUE.TIENT]);
});
