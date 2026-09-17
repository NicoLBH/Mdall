import test from "node:test";
import assert from "node:assert/strict";

import {
  ECRITURE, JETON, MOTS, RETRAIT, OPERATEUR, PROVENANCE, STATUT,
  ligneDAffirmation, ligneDeDonnee, ligneDeCondition, ligneDeConsequence,
  ligneDeProvenance, ligneDePreuve, ligneDeStatut, ligneDeDate,
  blocDeRegle, blocDAffirmation, blocDeVariable,
  enTeteDeFichier, nomDeFichier, cheminDeFichier, enClair, texteDesLignes,
  natureDeLaLigne, couperLUnite, estMesuree, mesureEnFrancais
} from "./memoire-en-texte.js";

const clair = (jetons) => enClair(jetons);

test("une mesure s'écrit nue, un texte entre guillemets", () => {
  assert.equal(clair(ligneDAffirmation({ sujet: "Altitude du site", valeur: "490,03", unite: "m" })),
    "Altitude du site = 490,03 m");
  assert.equal(clair(ligneDAffirmation({ sujet: "Classement du bâtiment", valeur: "3e famille B" })),
    'Classement du bâtiment = "3e famille B"');
  // « CF 1/2 h » n'est pas une mesure : c'est un degré, et le couper produirait
  // « CF » suivi de « 1/2 h ».
  assert.equal(clair(ligneDAffirmation({ sujet: "Planchers", valeur: "CF 1/2 h" })),
    'Planchers = "CF 1/2 h"');
});

test("estMesuree distingue une cote d'une catégorie", () => {
  assert.equal(estMesuree("26 m"), true);
  assert.equal(estMesuree("490,03"), true);
  assert.equal(estMesuree("3e famille B"), false);
  assert.equal(estMesuree("CF 1 h"), false);
  assert.deepEqual(couperLUnite("490,03 m"), { nombre: "490,03", unite: "m" });
});

test("la portée n'est plus sur la ligne : c'est le dossier qui la porte", () => {
  assert.equal(
    clair(ligneDAffirmation({ sujet: "Degré coupe-feu", valeur: "CF 1 h" })),
    'Degré coupe-feu = "CF 1 h"'
  );
  // Une règle porte ses entrées, qui se calculent depuis ses conditions.
  assert.equal(
    clair(ligneDeDonnee("Classement du bâtiment", ["Logements superposés", "Hauteur"])),
    "Classement du bâtiment (Logements superposés, Hauteur)"
  );
  // Deux fois la même entrée ne s'écrit qu'une fois.
  assert.equal(clair(ligneDeDonnee("X", ["A", "A", ""])), "X (A)");
});

test("une condition porte son opérateur et son unité", () => {
  assert.equal(
    clair(ligneDeCondition("si", { sujet: "Hauteur du plancher bas", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" })),
    `${RETRAIT}si Hauteur du plancher bas <= 28 m`
  );
  assert.equal(
    clair(ligneDeCondition("et", { sujet: "Logements superposés", operateur: OPERATEUR.EGAL, valeur: "oui", logique: true })),
    `${RETRAIT}et Logements superposés = oui`
  );
  assert.equal(
    clair(ligneDeCondition("si", { sujet: "Voie-engins", operateur: OPERATEUR.PARMI, valeur: ["non conforme", "non décrite"] })),
    `${RETRAIT}si Voie-engins parmi "non conforme" ou "non décrite"`
  );
});

test("« renseigné » ne compare rien : il ferme la ligne", () => {
  assert.equal(
    clair(ligneDeCondition("si", { sujet: "Classement du bâtiment", operateur: OPERATEUR.RENSEIGNE })),
    `${RETRAIT}si Classement du bâtiment renseigné`
  );
});

test("une provenance dit son type, et le type est l'origine", () => {
  assert.equal(clair(ligneDeProvenance({ type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986, article 6" })),
    `${RETRAIT}texte: arrêté du 31 janvier 1986, article 6`);
  assert.equal(clair(ligneDeProvenance({ type: PROVENANCE.HYPOTHESE, quoi: "à confirmer par le G2" })),
    `${RETRAIT}hypothèse: à confirmer par le G2`);
  // Ce qui manque n'apparaît pas, plutôt que d'apparaître creux.
  assert.equal(ligneDeProvenance({ type: PROVENANCE.TEXTE, quoi: "" }), null);
});

test("la preuve s'indente sous la provenance qu'elle appuie", () => {
  assert.equal(clair(ligneDePreuve("Les planchers sont coupe-feu de degré une heure.")),
    `${RETRAIT}${RETRAIT}parce que: "Les planchers sont coupe-feu de degré une heure."`);
  // Les guillemets d'origine ne se doublent pas.
  assert.equal(clair(ligneDePreuve("« déjà cité »")), `${RETRAIT}${RETRAIT}parce que: "déjà cité"`);
  assert.equal(ligneDePreuve(""), null);
});

test("le statut est l'état du raisonnement dans ce projet, pas une propriété de la valeur", () => {
  assert.equal(clair(ligneDeStatut(STATUT.SUPPOSE)), `${RETRAIT}statut: supposé`);
  assert.equal(clair(ligneDeStatut(STATUT.SANS_OBJET)), `${RETRAIT}statut: sans objet`);
  assert.equal(ligneDeStatut(""), null);
});

test("une règle ne porte aucune valeur de projet", () => {
  const lignes = blocDeRegle({
    sujet: "Classement du bâtiment",
    conditions: [
      { sujet: "Logements superposés", operateur: OPERATEUR.EGAL, valeur: "oui", logique: true },
      { sujet: "Hauteur du plancher bas du logement le plus haut", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }
    ],
    alors: "3e famille B",
    sinon: "3e famille A",
    provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986 modifié, article 3, 3°)" },
    preuve: "Troisième famille B : habitations ne satisfaisant pas à l'une des conditions précédentes."
  });

  // Les locales d'abord, comme les `const` d'une fonction : ce qui fonde la
  // règle se lit avant ce qu'elle fait.
  assert.deepEqual(lignes.map(clair), [
    "fonction Classement du bâtiment(zones, Logements superposés, Hauteur du plancher bas du logement le plus haut) {",
    `${RETRAIT}soit texte = "arrêté du 31 janvier 1986 modifié, article 3, 3°)";`,
    `${RETRAIT}soit parce que = "Troisième famille B : habitations ne satisfaisant pas à l'une des conditions précédentes.";`,
    "",
    `${RETRAIT}si (Logements superposés = oui)`,
    `${RETRAIT}et (Hauteur du plancher bas du logement le plus haut <= 28 m)`,
    `${RETRAIT}alors ("3e famille B");`,
    `${RETRAIT}sinon ("3e famille A");`,
    "}"
  ]);

  // Aucune valeur de projet, et surtout aucun « ✓ retenu » : la branche prise
  // est un fait de projet, pas une propriété de la règle.
  assert.equal(texteDesLignes(lignes).includes("retenu"), false);
  assert.equal(texteDesLignes(lignes).includes("dépend de"), false);
});

test("une affirmation de projet ne recopie pas la règle", () => {
  const lignes = blocDAffirmation({
    sujet: "Colonne sèche",
    valeur: "exigée, une colonne sèche de 65 mm par escalier",
    provenance: { type: PROVENANCE.REGLE, quoi: "Colonne sèche — arrêté du 31 janvier 1986, article 98" },
    statut: STATUT.RETENU
  });

  assert.deepEqual(lignes.map(clair), [
    'Colonne sèche = "exigée, une colonne sèche de 65 mm par escalier" {',
    `${RETRAIT}règle: Colonne sèche — arrêté du 31 janvier 1986, article 98`,
    `${RETRAIT}statut: retenu`,
    "}"
  ]);

  // Une affirmation qui ne porte rien d'autre que sa valeur ne s'entoure pas
  // d'accolades : une paire de bornes autour de rien serait du bruit.
  assert.deepEqual(blocDAffirmation({ sujet: "Zone de neige", valeur: "E" }).map(clair),
    ['Zone de neige = "E"']);
  assert.equal(texteDesLignes(lignes).includes("si "), false);
});

test("une exception se lit sous la règle, dans les mots du texte", () => {
  const lignes = blocDeRegle({
    sujet: "Escalier protégé",
    conditions: [{ sujet: "Hauteur du dernier plancher", operateur: OPERATEUR.PLUS_DE, valeur: "8", unite: "m" }],
    alors: "exigé",
    sauf: [{ sujet: "Unités de passage", operateur: OPERATEUR.EGAL, valeur: "1" }]
  });

  assert.equal(clair(lignes[3]), `${RETRAIT}sauf si (Unités de passage = 1)`);
});

test("l'en-tête porte la version de l'écriture, pas seulement la date", () => {
  const lignes = enTeteDeFichier({
    chemin: ["Escalier B", "Incendie"], extension: "ctr",
    produitPar: "un agent", le: "7 septembre 2026"
  });
  assert.deepEqual(lignes.map(clair), [
    "fichier: escalier-b/incendie.ctr",
    "note: établi par un agent, le 7 septembre 2026",
    `note: écriture Mdall v${ECRITURE}`
  ]);
});

test("l'extension dit ce que le fichier contient, le chemin où il vit", () => {
  assert.equal(nomDeFichier(["Escalier B", "Structure"], "ddb"), "structure.ddb");
  assert.equal(cheminDeFichier(["Escalier B", "Incendie"], "ctr"), "escalier-b/incendie.ctr");
  assert.equal(cheminDeFichier(["Escalier B", "Incendie"], "ref"), "escalier-b/incendie.ref");
  assert.equal(cheminDeFichier(["Tout l'ouvrage", "Incendie — Habitation"], "ref"), "tout-l-ouvrage/incendie-habitation.ref");
});

test("le langage n'emprunte à la programmation que ce qu'il exécute", () => {
  // Trois mots empruntés, et ils vivent tous dans un `.ref` : `fonction` ouvre
  // une règle, `soit` déclare ce qui la fonde, `const` définit un nom du projet.
  // Un `.ref` est exécutable — c'est ce qui les justifie. Le reste du langage
  // vient de l'écrit technique et doit y rester : `return` ou `else`
  // annonceraient un programme là où il n'y a qu'un raisonnement transcrit.
  const empruntes = new Set(["fonction", "soit", "const"]);
  const interdits = ["function", "return", "if", "else", "true", "false", "null", "//", "=>", "{", "}"];
  for (const mot of MOTS) {
    assert.equal(interdits.includes(mot), false, `« ${mot} » vient de la programmation`);
  }
  // Et la liste des emprunts ne s'allonge pas toute seule : chaque mot de plus
  // rapproche le langage d'un langage de programmeur, ce qu'il n'est pas.
  assert.deepEqual(MOTS.filter((mot) => empruntes.has(mot)).sort(), ["const", "fonction", "soit"]);
  // « sauf si » avant « si » : sans cet ordre, « sauf si » se lirait comme
  // « sauf » suivi d'un sujet nommé « si ».
  assert.ok(MOTS.indexOf("sauf si") < MOTS.indexOf("si"));
});

test("la nature d'une ligne se lit à sa marque, numéros de colonne compris", () => {
  assert.equal(natureDeLaLigne("fichier: escalier-b/incendie.ctr"), "section");
  assert.equal(natureDeLaLigne("note: écriture Mdall v4.0"), "note");
  assert.equal(natureDeLaLigne("  12  - Zone de neige"), "retire");
  assert.equal(natureDeLaLigne("  12  + Zone de neige"), "ajoute");
  assert.equal(natureDeLaLigne("Zone de neige = \"E\""), "contexte");
});

test("chaque jeton porte un type que la feuille de style sait colorer", () => {
  const types = new Set(Object.values(JETON));
  const lignes = [
    ...blocDeRegle({
      sujet: "Classement du bâtiment",
      conditions: [{ sujet: "Hauteur", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }],
      alors: "3e famille B",
      sauf: [{ sujet: "Dérogation", operateur: OPERATEUR.EGAL, valeur: "oui", logique: true }],
      provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté, article 3" },
      preuve: "citation"
    }),
    ...blocDAffirmation({ sujet: "Colonne sèche", valeur: "exigée", le: "12 mars 2026", statut: STATUT.RETENU }),
    ...enTeteDeFichier({ chemin: ["Escalier B", "Incendie"], extension: "ctr" }),
    ligneDeDonnee("Une donnée"),
    ligneDeConsequence("alors", "12", "m")
  ];

  for (const ligne of lignes) {
    for (const jeton of ligne) {
      assert.ok(types.has(jeton.type), `type inconnu : ${jeton.type}`);
    }
  }
});

test("une fonction est auto-portée : elle dit ce qu'elle fait, d'où et vers où", () => {
  const lignes = blocDeRegle({
    sujet: "Accès des véhicules lourds",
    quoi: "Définit si un parc d'habitation peut accueillir des véhicules de plus de 3,5 t.",
    importe: [{ variable: "Champ d'application du titre VI", depuis: "donnees-de-base.ddb" }],
    conditions: [{ sujet: "Champ d'application du titre VI", operateur: OPERATEUR.EGAL, valeur: "dans le champ" }],
    alors: "interdit au-delà de 3,5 t",
    provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986 modifié, article 79" },
    enregistre: { dans: "incendie.ctr" }
  });

  assert.deepEqual(lignes.map(clair), [
    "fonction Accès des véhicules lourds(zones, Champ d'application du titre VI) {",
    `${RETRAIT}// Définit si un parc d'habitation peut accueillir des véhicules de plus de 3,5 t.`,
    "",
    `${RETRAIT}importe (variable: Champ d'application du titre VI, depuis: donnees-de-base.ddb, zones: zones);`,
    "",
    `${RETRAIT}soit texte = "arrêté du 31 janvier 1986 modifié, article 79";`,
    "",
    `${RETRAIT}si (Champ d'application du titre VI = "dans le champ")`,
    `${RETRAIT}alors (`,
    `${RETRAIT}${RETRAIT}enregistre (`,
    `${RETRAIT}${RETRAIT}${RETRAIT}Accès des véhicules lourds: "interdit au-delà de 3,5 t",`,
    `${RETRAIT}${RETRAIT}${RETRAIT}dans: incendie.ctr,`,
    `${RETRAIT}${RETRAIT}${RETRAIT}zones: zones`,
    `${RETRAIT}${RETRAIT})`,
    `${RETRAIT});`,
    "}"
  ]);
});

test("une règle peut conclure sans rien écrire", () => {
  // Toutes ne posent pas une valeur du projet : certaines produisent une donnée
  // intermédiaire que d'autres reprennent. Inventer un fichier pour celles-là
  // ferait lire « écrit dans incendie.ctr » là où rien n'est écrit.
  const lignes = blocDeRegle({
    sujet: "Classement du bâtiment",
    conditions: [{ sujet: "Hauteur", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }],
    alors: "3e famille B"
  });

  assert.equal(lignes.some((ligne) => clair(ligne).includes("enregistre")), false);
  assert.ok(lignes.some((ligne) => clair(ligne).includes('alors ("3e famille B");')));
});

test("une décision porte un nom et une date, sinon ce n'est plus une décision", () => {
  const signee = ligneDeProvenance(
    { type: PROVENANCE.DECISION, quoi: "réunion de chantier du 3 mars", par: "Nicolas L.", le: "12 mars 2026" }, 1
  );
  assert.equal(clair(signee),
    `${RETRAIT}décision humaine assumée (réunion de chantier du 3 mars, par: Nicolas L., le: 12 mars 2026);`);

  // Sans l'un ni l'autre, la ligne reste ce qu'elle était : on n'invente pas de
  // signataire.
  assert.equal(clair(ligneDeProvenance({ type: PROVENANCE.DECISION, quoi: "réunion" }, 1)),
    `${RETRAIT}décision: réunion`);
});

test("une déclaration de variable dit ce qu'elle désigne et où elle sert", () => {
  const lignes = blocDeVariable({
    nom: "Hauteur du plancher bas", type: "mesure", unite: "m",
    description: "Hauteur du dernier niveau accessible, depuis le sol.",
    utilisation: "Entrée du classement en famille.",
    usages: [{ fonction: "Classement du bâtiment", fichier: "incendie.ref" }]
  });

  assert.deepEqual(lignes.map(clair), [
    "const Hauteur du plancher bas = {",
    `${RETRAIT}type: "mesure",`,
    `${RETRAIT}unité: "m",`,
    `${RETRAIT}description: "Hauteur du dernier niveau accessible, depuis le sol.",`,
    `${RETRAIT}utilisation: "Entrée du classement en famille.",`,
    `${RETRAIT}déjà utilisé dans: [`,
    `${RETRAIT}${RETRAIT}Classement du bâtiment (incendie.ref)`,
    `${RETRAIT}]`,
    "};"
  ]);
});

test("ce qui manque à une déclaration s'appelle par son nom", () => {
  // Un champ absent ne se voit pas ; une question posée se voit. Sur douze
  // mille variables, c'est toute la différence entre en réutiliser une et en
  // recréer une treize millième.
  const lignes = blocDeVariable({ nom: "Logements superposés", type: "inconnu" }).map(clair);

  assert.ok(lignes.some((ligne) => ligne.includes('description: "À DÉCRIRE')));
  assert.ok(lignes.some((ligne) => ligne.includes('utilisation: "À DÉCRIRE')));
  assert.ok(lignes.some((ligne) => ligne.includes("déjà utilisé dans: []")));
});


test("une mesure s'écrit avec la virgule, et rien d'autre n'est touché", () => {
  // Un utilitaire versait « 0.5 m », un autre « 0,50 m », et les deux se
  // lisaient l'un sous l'autre dans le même fichier.
  assert.equal(mesureEnFrancais("0.5 m"), "0,5 m");
  assert.equal(mesureEnFrancais("13.22 m"), "13,22 m");
  assert.equal(mesureEnFrancais("0.466"), "0,466");
  assert.equal(mesureEnFrancais("0,47 m"), "0,47 m", "ce qui est déjà bon ne bouge pas");

  // Un point qui appartient à un nom reste un point : « NF DTU 13,1 »
  // inventerait une cote, et `structure,ctr` n'existe pas.
  assert.equal(mesureEnFrancais("NF DTU 13.1"), "NF DTU 13.1");
  assert.equal(mesureEnFrancais("structure.ctr"), "structure.ctr");
  assert.equal(mesureEnFrancais("V1"), "V1");
  assert.equal(mesureEnFrancais("3e famille B"), "3e famille B");

  // Deux points : séparateur de milliers ou décimale ? On ne devine pas.
  assert.equal(mesureEnFrancais("1.234.567"), "1.234.567");
  assert.equal(mesureEnFrancais(""), "");
});
