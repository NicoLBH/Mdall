import test from "node:test";
import assert from "node:assert/strict";

import {
  blocDeRegle, blocDAffirmation, blocDeFonction, enTeteDeFichier, corpsDuFichier,
  texteDesLignes, enClair, PROVENANCE, STATUT, OPERATEUR, TOUTES_ZONES
} from "./memoire-en-texte.js";
import {
  lireUnFichier, lireUneCondition, lireUneValeur, lireUneTete,
  dependancesDuBloc, grapheDesBlocs, aRevoirSi, jetonsDeLaLigne, lireUneLocale, estUnCommentaire,
  lireUnImport, lireUneDecision
} from "./memoire-en-lecture.js";
import { renvoisSansDeclaration } from "./memoire-identifiants.js";

/** Ce que le référentiel incendie porte, en petit. */
const REGLES = [
  {
    sujet: "Classement du bâtiment",
    conditions: [
      { sujet: "Logements superposés", operateur: OPERATEUR.EGAL, valeur: ["oui"], unite: "", logique: true },
      { sujet: "Hauteur du plancher bas du logement le plus haut", operateur: OPERATEUR.AU_PLUS, valeur: ["28"], unite: "m", logique: false, joint: "et" },
      { sujet: "Voie-échelles", operateur: OPERATEUR.PARMI, valeur: ["non conforme", "non décrite"], unite: "", logique: false, joint: "et" }
    ],
    alors: "3e famille B",
    sinon: "",
    sauf: [],
    provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986 modifié, article 3, 3°)" },
    preuve: "Troisième famille B : habitations ne satisfaisant pas à l'une des conditions précédentes."
  },
  {
    sujet: "Colonne sèche",
    conditions: [
      { sujet: "Classement du bâtiment", operateur: OPERATEUR.PARMI, valeur: ["3e famille B", "4e famille"], unite: "", logique: false }
    ],
    alors: "exigée, une colonne sèche de 65 mm par escalier",
    sinon: "",
    sauf: [],
    provenance: { type: PROVENANCE.TEXTE, quoi: "arrêté du 31 janvier 1986 modifié, article 98, premier alinéa" },
    preuve: "Les habitations de la 3ème famille B et de la 4ème famille doivent comporter une colonne sèche de 65 mm par escalier."
  }
];

/** Un bloc relu, ramené à la forme d'un bloc écrit — pour les comparer. */
const commeEcrit = (bloc) => ({
  sujet: bloc.sujet,
  conditions: bloc.conditions,
  alors: bloc.alors,
  sinon: bloc.sinon,
  sauf: bloc.sauf,
  provenance: bloc.provenance,
  preuve: bloc.preuve
});

test("lire(écrire(G)) = G — une règle traverse le texte sans rien perdre", () => {
  const texte = texteDesLignes(REGLES.flatMap((regle) => blocDeRegle(regle)));
  const { blocs, refus } = lireUnFichier(texte);

  assert.deepEqual(refus, []);
  assert.equal(blocs.length, REGLES.length);
  assert.deepEqual(blocs.map(commeEcrit), REGLES);
});

test("lire(écrire(G)) = G — une affirmation de projet aussi", () => {
  const affirmations = [
    { sujet: "Classement du bâtiment", valeur: "3e famille B", unite: "",
      provenance: { type: PROVENANCE.REGLE, quoi: "Classement du bâtiment, article 3, 3°)" },
      preuve: "", statut: STATUT.RETENU },
    { sujet: "Hauteur du plancher bas du logement le plus haut", valeur: "26", unite: "m",
      provenance: { type: PROVENANCE.DOCUMENT, quoi: "plan de coupe AA, indice C" },
      preuve: "niveau +26,00 au plancher du R+8", statut: "" },
    { sujet: "Portance du sol", valeur: "0,2", unite: "MPa",
      provenance: { type: PROVENANCE.HYPOTHESE, quoi: "à confirmer par le G2" },
      preuve: "", statut: STATUT.SUPPOSE }
  ];

  const texte = texteDesLignes(affirmations.flatMap((affirmation) => blocDAffirmation(affirmation)));
  const { blocs, refus } = lireUnFichier(texte);

  assert.deepEqual(refus, []);
  assert.deepEqual(
    blocs.map((bloc) => ({
      sujet: bloc.sujet, valeur: bloc.valeur, unite: bloc.unite,
      provenance: bloc.provenance, preuve: bloc.preuve, statut: bloc.statut
    })),
    affirmations
  );
});

test("l'en-tête ne produit aucun bloc, et le chemin se lit", () => {
  const texte = texteDesLignes([
    ...enTeteDeFichier({ chemin: ["Contraintes", "Incendie"], produitPar: "un agent", le: "6 septembre 2026" }),
    ...blocDAffirmation({ sujet: "Colonne sèche", valeur: "exigée", statut: STATUT.RETENU })
  ]);

  const { chemin, blocs, refus } = lireUnFichier(texte);
  assert.equal(chemin, "contraintes/incendie.mdall");
  assert.equal(blocs.length, 1);
  assert.deepEqual(refus, []);
});

test("« ou » dans un sujet n'est pas une disjonction", () => {
  const condition = lireUneCondition('Habitation individuelle ou collective = "collective"');
  assert.equal(condition.sujet, "Habitation individuelle ou collective");
  assert.deepEqual(condition.valeur, ["collective"]);
});

test("une mesure se lit nue, un texte entre guillemets", () => {
  assert.deepEqual(lireUneValeur("26 m"), { valeur: "26", unite: "m", citee: false });
  assert.deepEqual(lireUneValeur('"3e famille B"'), { valeur: "3e famille B", unite: "", citee: true });
  assert.deepEqual(lireUneValeur("« 3e famille B »"), { valeur: "3e famille B", unite: "", citee: true });
});

test("un architecte peut taper <= et des guillemets droits", () => {
  const aLaMain = lireUneCondition('Hauteur du plancher bas <= 28 m');
  assert.equal(aLaMain.operateur, OPERATEUR.AU_PLUS);
  assert.deepEqual(aLaMain.valeur, ["28"]);
  assert.equal(aLaMain.unite, "m");
});

test("la signature d'une règle nomme ses entrées, et ne fait pas partie du sujet", () => {
  const tete = lireUneTete("Classement du bâtiment (Logements superposés, Hauteur du plancher bas)");
  assert.equal(tete.sujet, "Classement du bâtiment");
  assert.deepEqual(tete.entrees, ["Logements superposés", "Hauteur du plancher bas"]);
  assert.equal(tete.valeur, "");

  // Une parenthèse qui appartient au sujet reste dans le sujet : elle ne se
  // lit comme une signature que collée à la fin.
  assert.equal(lireUneTete("Voie-engins (article 4) = \"non décrite\"").sujet, "Voie-engins (article 4)");
});

test("une date de constat se lit, parce qu'un constat sans date ne vaut rien", () => {
  const { blocs } = lireUnFichier([
    'Encloisonnement de l\'escalier = "non réalisé"',
    "   le: 12 mars 2026",
    "   document: rapport de visite n°4"
  ].join("\n"));

  assert.equal(blocs[0].le, "12 mars 2026");
  assert.deepEqual(blocs[0].provenance, { type: "document", quoi: "rapport de visite n°4" });
});

test("ce qui ne se comprend pas se dit, avec son numéro de ligne", () => {
  const { blocs, refus } = lireUnFichier([
    'Classement du bâtiment = "3e famille B"',
    "   oracle: une boule de cristal",
    "   statut: peut-être",
    "   pourquoi pas",
    "   dépend de Famille"
  ].join("\n"));

  assert.equal(blocs.length, 1);
  assert.deepEqual(refus.map((r) => r.ligne), [2, 3, 4, 5]);
  assert.match(refus[0].raison, /n'est pas une provenance connue/);
  assert.match(refus[1].raison, /n'est pas un statut connu/);
  assert.match(refus[3].raison, /aucun mot de la langue/);
});

test("les dépendances se déduisent des conditions, elles ne s'écrivent pas", () => {
  const { blocs } = lireUnFichier(texteDesLignes(REGLES.flatMap((regle) => blocDeRegle(regle))));

  assert.deepEqual(dependancesDuBloc(blocs[0]), [
    "Logements superposés",
    "Hauteur du plancher bas du logement le plus haut",
    "Voie-échelles"
  ]);
  assert.deepEqual(dependancesDuBloc(blocs[1]), ["Classement du bâtiment"]);
});

test("le graphe se reconstruit depuis le texte, entrées comprises", () => {
  const { blocs } = lireUnFichier(texteDesLignes(REGLES.flatMap((regle) => blocDeRegle(regle))));
  const { produits, entrees } = grapheDesBlocs(blocs);

  assert.deepEqual(produits, ["Classement du bâtiment", "Colonne sèche"]);
  assert.deepEqual(entrees, [
    "Hauteur du plancher bas du logement le plus haut",
    "Logements superposés",
    "Voie-échelles"
  ]);
});

test("changer une hauteur dit ce qu'il faut revérifier", () => {
  const { blocs } = lireUnFichier(texteDesLignes(REGLES.flatMap((regle) => blocDeRegle(regle))));

  assert.deepEqual(
    aRevoirSi("Hauteur du plancher bas du logement le plus haut", blocs),
    ["Classement du bâtiment", "Colonne sèche"]
  );
  assert.deepEqual(aRevoirSi("Colonne sèche", blocs), []);
});

test("un corpus circulaire ne fait pas boucler la lecture", () => {
  const blocs = [
    { sujet: "A", conditions: [{ sujet: "B" }], sauf: [] },
    { sujet: "B", conditions: [{ sujet: "A" }], sauf: [] }
  ];
  assert.deepEqual(aRevoirSi("A", blocs), ["B"]);
});

test("lire(écrire(G)) = G — un fichier entier, zones et accolades comprises", () => {
  const sections = [
    { zone: TOUTES_ZONES, blocs: [blocDeRegle(REGLES[0], 1)] },
    { zone: "Bâtiment A", blocs: [blocDeRegle(REGLES[1], 1)] }
  ];

  const texte = texteDesLignes([
    ...enTeteDeFichier({ chemin: ["Mémoire", "Incendie"], extension: "ref" }),
    [],
    ...corpsDuFichier(sections)
  ]);

  const { chemin, blocs, refus } = lireUnFichier(texte);
  assert.deepEqual(refus, []);
  assert.equal(chemin, "memoire/incendie.ref");
  assert.equal(blocs.length, 2);

  // La zone se lit sur chaque bloc : c'est la section qui la porte, pas la ligne.
  assert.equal(blocs[0].zone, TOUTES_ZONES);
  assert.equal(blocs[1].zone, "Bâtiment A");
  assert.deepEqual(blocs.map(commeEcrit), REGLES);
});

test("une accolade fermante de trop ne fait pas perdre le sens", () => {
  const { blocs, refus } = lireUnFichier([
    "zone: Bâtiment A {",
    '   Colonne sèche = "exigée" {',
    "      statut: retenu",
    "   }",
    "}",
    "}"
  ].join("\n"));

  assert.deepEqual(refus, []);
  assert.equal(blocs.length, 1);
  assert.equal(blocs[0].statut, "retenu");
  assert.equal(blocs[0].zone, "Bâtiment A");
});

test("une accolade fermante oubliée ne dérange pas le reste du fichier", () => {
  // Le cas qui cassait tout : la première a perdu son `}`. Sans règle, elle
  // avalait la seconde, puis l'accolade de la zone fermait ce bloc-là au lieu
  // de la zone — et la zone suivante n'existait plus.
  const { blocs, refus } = lireUnFichier([
    "zone: Toutes zones {",
    '   Colonne sèche = "exigée" {',
    "      statut: retenu",
    '   Degré coupe-feu = "CF 1 h" {',
    "      statut: retenu",
    "   }",
    "}",
    "",
    "zone: Bâtiment A {",
    '   Zone de neige = "E" {',
    "      document: carte",
    "   }",
    "}"
  ].join("\n"));

  assert.deepEqual(refus, []);
  assert.deepEqual(blocs.map((bloc) => [bloc.sujet, bloc.zone]), [
    ["Colonne sèche", "Toutes zones"],
    ["Degré coupe-feu", "Toutes zones"],
    ["Zone de neige", "Bâtiment A"]
  ]);
});

test("un architecte qui n'écrit pas d'accolades est lu quand même", () => {
  const { blocs, refus } = lireUnFichier([
    "zone: Bâtiment A",
    'Portance du sol = 0,2 MPa',
    "   hypothèse: à confirmer par le G2",
    "   statut: supposé",
    'Zone de neige = "E"',
    "   document: carte NF EN 1991-1-3"
  ].join("\n"));

  assert.deepEqual(refus, []);
  assert.equal(blocs.length, 2);
  assert.equal(blocs[0].statut, "supposé");
  assert.equal(blocs[1].provenance.type, "document");
  assert.equal(blocs[1].zone, "Bâtiment A");
});

test("un .ref se relit avec ou sans sa ponctuation", () => {
  // La ponctuation rend la règle exécutable ; elle ne la rend pas obligatoire.
  // Un architecte qui tape la règle à la main sans parenthèses doit être lu.
  const avecBornes = lireUnFichier([
    "fonction Classement du bâtiment(Hauteur du plancher bas) {",
    "   si (Hauteur du plancher bas <= 28 m)",
    '   alors ("3e famille B");',
    "}"
  ].join("\n"));

  const sansBornes = lireUnFichier([
    "Classement du bâtiment (Hauteur du plancher bas)",
    "   si Hauteur du plancher bas <= 28 m",
    '   alors "3e famille B"'
  ].join("\n"));

  for (const lu of [avecBornes, sansBornes]) {
    assert.deepEqual(lu.refus, []);
    assert.equal(lu.blocs[0].sujet, "Classement du bâtiment");
    assert.equal(lu.blocs[0].alors, "3e famille B");
    assert.deepEqual(lu.blocs[0].conditions.map((c) => c.sujet), ["Hauteur du plancher bas"]);
  }
});

test("colorer une ligne de règle la réécrit telle qu'elle était", () => {
  // Les jetons servent à peindre le diff : s'ils rendaient une autre ligne que
  // celle du fichier, l'écran montrerait un texte que personne n'a écrit.
  const rendre = (ligne) => jetonsDeLaLigne(ligne).map((j) => j.texte).join("");

  for (const ligne of [
    "fonction Classement du bâtiment(Hauteur du plancher bas)",
    "   si (Hauteur du plancher bas <= 28 m)",
    '   alors ("3e famille B");',
    "   sauf si (Dérogation = oui)"
  ]) {
    assert.equal(rendre(ligne), ligne);
  }
});

test("une locale de règle se relit comme la ligne qu'elle remplace", () => {
  // `soit texte = "…"` et `texte: …` disent la même chose. La première est la
  // forme d'un `.ref`, la seconde celle d'un fichier de projet ; les deux se
  // lisent, sinon un fichier écrit hier cesserait de se lire aujourd'hui.
  const enLocales = lireUnFichier([
    "fonction Colonne sèche(Classement du bâtiment) {",
    '   soit texte = "arrêté du 31 janvier 1986, article 98";',
    '   soit parce que = "Les habitations de la 3ème famille B…";',
    "   si (Classement du bâtiment = \"3e famille B\")",
    '   alors ("exigée");',
    "}"
  ].join("\n"));

  const enDeuxPoints = lireUnFichier([
    "Colonne sèche (Classement du bâtiment)",
    "   si Classement du bâtiment = \"3e famille B\"",
    '   alors "exigée"',
    "   texte: arrêté du 31 janvier 1986, article 98",
    '      parce que: "Les habitations de la 3ème famille B…"'
  ].join("\n"));

  for (const lu of [enLocales, enDeuxPoints]) {
    assert.deepEqual(lu.refus, []);
    assert.deepEqual(lu.blocs[0].provenance, { type: "texte", quoi: "arrêté du 31 janvier 1986, article 98" });
    assert.equal(lu.blocs[0].preuve, "Les habitations de la 3ème famille B…");
    assert.equal(lu.blocs[0].alors, "exigée");
  }
});

test("une locale qui ne pose rien se refuse en le disant", () => {
  const lu = lireUnFichier([
    "fonction Colonne sèche()",
    "   soit ceci",
    '   soit machin = "quelque chose";'
  ].join("\n"));

  assert.equal(lu.refus.length, 2);
  assert.match(lu.refus[0].raison, /ne pose aucune valeur/);
  // « machin » n'est pas une provenance : on nomme ce qu'on n'a pas su lire
  // plutôt que de le ranger quelque part au hasard.
  assert.match(lu.refus[1].raison, /machin/);
});

test("un commentaire ne dit rien au raisonnement, et ne se refuse jamais", () => {
  const lu = lireUnFichier([
    "// Pourquoi cette règle existe : le déclassement de l'article 4.",
    "fonction Colonne sèche(Classement du bâtiment) {",
    "   /* Trois branches y mènent ; celle-ci est la seule qui conclut. */",
    "   si (Classement du bâtiment = \"3e famille B\")",
    '   alors ("exigée");',
    "}"
  ].join("\n"));

  assert.deepEqual(lu.refus, []);
  assert.equal(lu.blocs.length, 1);
  assert.equal(lu.blocs[0].alors, "exigée");
  assert.equal(estUnCommentaire("// ceci"), true);
  assert.equal(estUnCommentaire("Colonne sèche = 1"), false);
});

test("colorer une locale ou un commentaire les réécrit tels quels", () => {
  const rendre = (ligne) => jetonsDeLaLigne(ligne).map((j) => j.texte).join("");
  for (const ligne of [
    '   soit texte = "arrêté du 31 janvier 1986, article 98";',
    '   soit parce que = "Les habitations de la 3ème famille B…";',
    "   // trois branches y mènent",
    "   /* et celle-ci est la seule qui conclut */"
  ]) {
    assert.equal(rendre(ligne), ligne);
  }
});

test("lireUneLocale rend le nom et la valeur, sans les bornes", () => {
  assert.deepEqual(lireUneLocale('texte = "arrêté, article 98";'), { nom: "texte", valeur: "arrêté, article 98" });
  assert.deepEqual(lireUneLocale('parce que = "une phrase"'), { nom: "parce que", valeur: "une phrase" });
  assert.equal(lireUneLocale("rien du tout"), null);
});

test("une fonction auto-portée se relit sans perdre son raisonnement", () => {
  // `importe`, `enregistre` et le commentaire portent ce qui se **déduit** :
  // ils rendent la fonction lisible seule, et ne se conservent pas. Ce qui se
  // conserve est la règle — ses conditions, ce qu'elle pose, ce qui la fonde.
  const lu = lireUnFichier([
    "fonction Accès des véhicules lourds(zones, Champ d'application du titre VI) {",
    "   // Définit si un parc peut accueillir des véhicules lourds.",
    "",
    "   importe (variable: Champ d'application du titre VI, depuis: donnees-de-base.ddb, zones: zones);",
    "",
    '   soit texte = "arrêté du 31 janvier 1986 modifié, article 79";',
    "",
    '   si (Champ d\'application du titre VI = "dans le champ")',
    "   alors (",
    "      enregistre (",
    '         Accès des véhicules lourds: "interdit au-delà de 3,5 t",',
    "         dans: incendie.ctr,",
    "         zones: zones",
    "      )",
    "   );",
    "}"
  ].join("\n"));

  assert.deepEqual(lu.refus, []);
  assert.equal(lu.blocs.length, 1);
  assert.equal(lu.blocs[0].sujet, "Accès des véhicules lourds");
  assert.equal(lu.blocs[0].alors, "interdit au-delà de 3,5 t");
  assert.deepEqual(lu.blocs[0].conditions.map((c) => c.sujet), ["Champ d'application du titre VI"]);
  assert.deepEqual(lu.blocs[0].provenance, { type: "texte", quoi: "arrêté du 31 janvier 1986 modifié, article 79" });
});

test("chaque ligne d'une fonction auto-portée se recolore telle quelle", () => {
  const rendre = (ligne) => jetonsDeLaLigne(ligne).map((j) => j.texte).join("");
  for (const ligne of [
    "   importe (variable: Champ d'application du titre VI, depuis: donnees-de-base.ddb, zones: zones);",
    "   alors (",
    "      enregistre (",
    '         Accès des véhicules lourds: "interdit au-delà de 3,5 t",',
    "         dans: incendie.ctr,",
    "         zones: zones",
    "      )",
    "   );",
    "   décision humaine assumée (réunion du 3 mars, par: Nicolas L., le: 12 mars 2026);"
  ]) {
    assert.equal(rendre(ligne), ligne);
  }
});

test("un import se lit, une décision aussi", () => {
  assert.deepEqual(
    lireUnImport("importe (variable: Hauteur du plancher bas, depuis: donnees-de-base.ddb, zones: Bâtiment A);"),
    // La zone fait partie de l'emprunt : une variable n'a pas une valeur, elle
    // en a une par partie d'ouvrage.
    { variable: "Hauteur du plancher bas", depuis: "donnees-de-base.ddb", zones: "Bâtiment A" }
  );
  assert.equal(lireUnImport("importe ();"), null);

  assert.deepEqual(
    lireUneDecision("décision humaine assumée (réunion du 3 mars, par: Nicolas L., le: 12 mars 2026);"),
    { quoi: "réunion du 3 mars", par: "Nicolas L.", le: "12 mars 2026" }
  );
  // Sans provenance, la ligne ne dit rien : on ne fabrique pas une décision vide.
  assert.equal(lireUneDecision("décision humaine assumée (par: Nicolas L.);"), null);
});

const FONCTION_AVEC_AGENT = {
  nom: "Prédimensionnement des fondations superficielles",
  quoi: "Dimensionne les massifs superficiels d'une zone.",
  // Volontairement présent, et volontairement ignoré : une déclaration ne porte
  // pas la zone du jour. Le garder ici fait échouer le test si quelqu'un
  // recâble la portée dans la signature.
  portee: "Bâtiment A",
  entrees: [
    { nom: "Profondeur hors gel", depuis: "structure.ctr" },
    { nom: "Données d'entrée des fondations superficielles", depuis: "donnees-de-base.ddb" }
  ],
  utilitaire: "dimensionnement_fondations_superficielles",
  version: "V1",
  enregistre: [{ sujet: "Résultat du calcul des fondations superficielles", dans: "structure.ctr" }]
};

test("lire(écrire(G)) = G — une fonction qui appelle un agent traverse le texte sans rien perdre", () => {
  // Ce qui se conserve est ce qui n'est pas déductible : quel agent, de quoi le
  // refaire, et le nom de ce qu'elle range. Sa signature, les entrées qu'elle retient, les arguments de
  // l'appel et le fichier d'arrivée se déduisent tous — et une signature
  // recopiée diverge.
  const { blocs, refus } = lireUnFichier(texteDesLignes(blocDeFonction(FONCTION_AVEC_AGENT)));
  assert.deepEqual(refus, [], "rien ne doit être refusé");
  assert.equal(blocs.length, 1);

  const [bloc] = blocs;
  assert.equal(bloc.sujet, FONCTION_AVEC_AGENT.nom);
  assert.equal(bloc.agent, "agent-D");
  assert.equal(bloc.utilitaire, "dimensionnement_fondations_superficielles");
  assert.equal(bloc.version, "V1");
  assert.deepEqual(bloc.enregistre, [
    { sujet: "Résultat du calcul des fondations superficielles", valeur: "résultat", unite: "" }
  ]);
  // Les branches qui retiennent une entrée ne sont **pas** des conditions : les
  // garder ferait une règle là où il n'y a qu'un appel.
  assert.deepEqual(bloc.conditions, []);
});

test("une fonction écrit son appel, jamais ses résultats", () => {
  // La première version dépliait quatre-vingts cotes dans le fichier de code :
  // on n'y lisait plus ni ce que la fonction consommait, ni comment l'appeler.
  const texte = texteDesLignes(blocDeFonction(FONCTION_AVEC_AGENT));

  // Il n'y a qu'un genre de fonction : `native` n'est plus dans la tête, et ce
  // qui est opaque est l'appel qu'elle contient.
  //
  // La portée s'écrit `zones` — le **nom du paramètre**. Écrire « Bâtiment A »
  // dans la déclaration en ferait une fonction propre à ce bâtiment, alors
  // qu'elle vaut pour tous : c'est l'appel qui dit sur quoi elle a tourné.
  assert.match(texte, /^fonction Prédimensionnement des fondations superficielles\(zones, Profondeur hors gel, Données d'entrée des fondations superficielles\) \{$/m);
  assert.doesNotMatch(texte, /fonction native/);
  assert.doesNotMatch(texte, /Bâtiment A/, "aucune zone du projet dans une déclaration");
  assert.match(texte, /^ {3}résultat = agent-D \($/m);
  assert.match(texte, /^ {6}zones: zones,$/m, "l'appel montre ses arguments");
  assert.match(texte, /^ {6}Profondeur hors gel: Profondeur hors gel à retenir,$/m);
  assert.equal((texte.match(/enregistre \(/g) ?? []).length, 1, "un seul enregistre, un seul résultat");
  assert.match(texte, /^ {6}Résultat du calcul des fondations superficielles: résultat,$/m);
});

test("l'entrée à retenir dit qu'un paramètre l'emporte sur la mémoire", () => {
  // C'est la variante écrite dans le langage : le même appel, avec ou sans
  // valeur essayée. Sans ces lignes, l'écran ferait au moment d'une variante
  // quelque chose que le code ne dit pas.
  const texte = texteDesLignes(blocDeFonction(FONCTION_AVEC_AGENT));

  assert.match(texte, /^ {3}const Profondeur hors gel à retenir;$/m);
  assert.match(texte, /^ {3}si \(Profondeur hors gel renseigné\)$/m);
  assert.match(texte, /^ {3}alors \(Profondeur hors gel à retenir = Profondeur hors gel\)$/m);
  assert.match(texte, /^ {3}sinon \(Profondeur hors gel à retenir = importe \(variable: Profondeur hors gel, depuis: structure\.ctr, zones: zones\)\);$/m);
});

test("une locale ne se lit pas comme un renvoi sans déclaration", () => {
  // « Profondeur hors gel à retenir » était souligné en rouge à la ligne même
  // où elle est déclarée : les locales portaient le jeton d'un sujet, et un
  // sujet que la mémoire ne déclare pas est une lacune.
  const lignes = texteDesLignes(blocDeFonction(FONCTION_AVEC_AGENT)).split("\n").map(jetonsDeLaLigne);
  // Ce que le projet déclare : les entrées de la fonction, et le sujet qu'elle
  // range. Les locales, elles, n'ont rien à y faire.
  const declares = new Set([
    "profondeur hors gel",
    "donnees d'entree des fondations superficielles",
    "resultat du calcul des fondations superficielles"
  ]);

  assert.deepEqual(renvoisSansDeclaration(lignes.map((jetons) => ({ jetons })), declares), []);
});

test("« renseigné » est un mot de la langue, pas un signe", () => {
  // En gris d'opérateur, il se lisait comme une partie du nom qui le précède.
  const jetons = jetonsDeLaLigne("   si (Profondeur hors gel renseigné)");
  assert.ok(jetons.some((j) => j.type === "mot-condition" && j.texte === "renseigné"));
});

test("une entrée sans adresse en mémoire ne fabrique pas d'emprunt", () => {
  // Inventer un `importe` vers un fichier qu'on ne connaît pas ferait lire
  // « va chercher là » là où il n'y a rien.
  const texte = texteDesLignes(blocDeFonction({
    ...FONCTION_AVEC_AGENT,
    entrees: [{ nom: "Profondeur hors gel" }]
  }));

  assert.doesNotMatch(texte, /importe/);
  assert.doesNotMatch(texte, /à retenir/);
  assert.match(texte, /^ {6}Profondeur hors gel: Profondeur hors gel$/m, "l'appel passe l'entrée telle quelle");
});

test("une règle ordinaire ne porte pas les champs d'un appel d'agent", () => {
  // Les laisser vides sur tous les blocs ferait croire qu'une règle a un
  // utilitaire, et il faudrait lire sa valeur pour savoir que non.
  const { blocs } = lireUnFichier(texteDesLignes(REGLES.flatMap((regle) => blocDeRegle(regle))));
  for (const bloc of blocs) {
    assert.equal("agent" in bloc, false);
    assert.equal("utilitaire" in bloc, false);
  }
});

test("une ligne de fonction se recolore avec sa signature, accolade comprise", () => {
  // L'accolade avalait la signature entière : « Classement du bâtiment(zones,
  // Hauteur) { » sortait en un seul jeton, et une règle apparaissait dans un
  // diff sans aucune de ses entrées colorées.
  const ligne = "fonction Classement du bâtiment(zones, Hauteur) {";
  const jetons = jetonsDeLaLigne(ligne);
  assert.equal(enClair(jetons), ligne, "la ligne se réécrit à l'identique");
  assert.deepEqual(jetons.filter((j) => j.type === "parametre").map((j) => j.texte), ["zones", "Hauteur"]);
  assert.ok(jetons.some((j) => j.type === "accolade" && j.texte === "{"));
});

test("un appel d'agent se colore comme un appel, pas comme une valeur", () => {
  const ligne = "   résultat = agent-IA (";
  const jetons = jetonsDeLaLigne(ligne);
  assert.equal(enClair(jetons), ligne);
  assert.ok(jetons.some((j) => j.type === "mot-natif" && j.texte === "agent-IA"));
  assert.ok(jetons.some((j) => j.type === "nom-local" && j.texte === "résultat"));
});

test("chaque ligne d'une fonction se recolore à l'identique", () => {
  // Le diff garde ses lignes en texte et les recolore en les relisant. Une
  // ligne qui ne se réécrit pas à l'identique s'affiche autrement qu'elle n'est
  // écrite — et c'est le diff entier qu'on cesse alors de croire.
  for (const ligne of texteDesLignes(blocDeFonction(FONCTION_AVEC_AGENT)).split("\n")) {
    assert.equal(enClair(jetonsDeLaLigne(ligne)), ligne, ligne);
  }
});

test("un nom passé en argument n'est pas un texte cité", () => {
  // Troisième loi de lecture, prolongée : un texte porte des guillemets, une
  // mesure n'en porte pas, et ce qui n'est ni l'un ni l'autre est un **nom**.
  const jetons = jetonsDeLaLigne("      Profondeur hors gel: Profondeur hors gel à retenir,");
  // Le nom du champ est une variable du **projet** ; ce qu'on lui passe est une
  // locale de la fonction. Deux couleurs, parce que ce sont deux choses : l'une
  // se cherche dans la mémoire, l'autre n'existe que dans cette fonction.
  assert.ok(jetons.some((j) => j.type === "sujet" && j.texte === "Profondeur hors gel"));
  assert.ok(jetons.some((j) => j.type === "nom-local" && j.texte === "Profondeur hors gel à retenir"));
  assert.ok(!jetons.some((j) => j.type === "valeur"));
});

test("« sinon si » se refuse, plutôt que de conclure une phrase", () => {
  // Le défaut tel qu'il s'est vu : un utilitaire de TVA marchait pour
  // « existant » et pas pour « neuf ». La ligne `sinon si (…)` était lue comme
  // une conclusion dont la valeur était le texte `si (Type de TVA = "neuf")` —
  // la fonction concluait une phrase au lieu d'un taux, et rien ne le disait.
  const lu = lireUnFichier([
    "fonction Taux de TVA(zones, Type de TVA) {",
    '   si (Type de TVA = "existant")',
    "   alors (5,5 %);",
    '   sinon si (Type de TVA = "neuf")',
    "   alors (20 %);",
    "}"
  ].join("\n"));

  const chaine = lu.refus.find((un) => un.ligne === 4);
  assert.ok(chaine, "« sinon si » est passé sans un mot");
  assert.match(chaine.raison, /« sinon si » n'existe pas/);

  // Et surtout : la fonction ne conclut plus une phrase.
  assert.equal(lu.blocs[0].sinon, "");
});

test("une seconde issue du même nom se refuse en situant la première", () => {
  // Elle écrasait la première sans un mot : la fonction concluait ce qu'on
  // avait écrit en dernier, et le fichier avait l'air juste.
  const lu = lireUnFichier([
    "fonction Taux de TVA(zones, Type de TVA) {",
    '   si (Type de TVA = "existant")',
    "   alors (5,5 %);",
    "   alors (20 %);",
    "}"
  ].join("\n"));

  const double = lu.refus.find((un) => un.ligne === 4);
  assert.ok(double, "la seconde conclusion est passée sans un mot");
  assert.match(double.raison, /déjà posé ligne 3/);

  // La première tient : c'est celle qu'on a écrite en connaissance de cause.
  assert.equal(lu.blocs[0].alors, "5,5 %");
});

test("« alors » et « sinon » se posent chacun une fois, dans la même fonction", () => {
  // Le refus ne doit pas mordre sur la forme juste : deux issues de noms
  // différents sont ce qu'une règle a de plus ordinaire.
  const lu = lireUnFichier([
    "fonction Taux de TVA(zones, Type de TVA) {",
    '   si (Type de TVA = "existant")',
    "   alors (5,5 %);",
    "   sinon (20 %);",
    "}"
  ].join("\n"));

  assert.deepEqual(lu.refus, []);
  assert.equal(lu.blocs[0].alors, "5,5 %");
  assert.equal(lu.blocs[0].sinon, "20 %");
});

test("deux fonctions concluent chacune la sienne", () => {
  // La mémoire de « déjà posé » appartient au bloc, pas au fichier : sans cela
  // le second `alors` du fichier serait refusé comme un doublon du premier.
  const lu = lireUnFichier([
    "fonction Taux de TVA(zones, Type de TVA) {",
    '   si (Type de TVA = "existant")',
    "   alors (5,5 %);",
    "}",
    "",
    "fonction Taux de taxe de séjour(zones, Catégorie) {",
    '   si (Catégorie = "hôtel")',
    "   alors (2 %);",
    "}"
  ].join("\n"));

  assert.deepEqual(lu.refus, []);
  assert.equal(lu.blocs.length, 2);
  assert.equal(lu.blocs[0].alors, "5,5 %");
  assert.equal(lu.blocs[1].alors, "2 %");
});

test("le bloc lu ne porte pas la mémoire de lecture des issues", () => {
  // `conclue` sert à refuser la seconde ; sorti du bloc, il finirait versé en
  // mémoire et lu comme quelque chose que la règle affirme.
  const lu = lireUnFichier([
    "fonction Taux de TVA(zones, Type de TVA) {",
    '   si (Type de TVA = "existant")',
    "   alors (5,5 %);",
    "}"
  ].join("\n"));

  assert.ok(!("conclue" in lu.blocs[0]), "la mémoire de lecture ressort du bloc");
});
