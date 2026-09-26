import test from "node:test";
import assert from "node:assert/strict";

import {
  DOUTE, VERDICT, evaluerLaCondition, evaluerLaRegle, lecteurDeValeurs, phraseDuDoute, rejouerLaRegle
} from "./memoire-evaluateur.js";
import { OPERATEUR } from "./memoire-en-texte.js";

/** Une règle appliquée, telle que la mémoire garde son instantané. */
const regle = (sujet, alors, conditions, { sinon = "", sauf = [] } = {}) => ({
  id: `r-${sujet}`,
  payload: { subject: sujet, value: alors, referentiel: true, regle: { conditions, sinon, sauf } }
});

const lu = (valeur) => ({ connu: true, valeur });
const inconnu = { connu: false, valeur: "" };

/* ── Les clauses ─────────────────────────────────────────────────────────── */

test("l'égalité plie la casse, les accents et les espaces", () => {
  const clause = { sujet: "Classement", operateur: OPERATEUR.EGAL, valeur: "3e famille B" };
  assert.equal(evaluerLaCondition(clause, lu("3E  Famille B")).verite, true);
  assert.equal(evaluerLaCondition(clause, lu("2e famille")).verite, false);
});

test("une liste se lit « ou », que l'opérateur soit « = » ou « parmi »", () => {
  const valeurs = ["3e famille A", "3e famille B"];
  assert.equal(evaluerLaCondition({ sujet: "C", operateur: OPERATEUR.EGAL, valeur: valeurs }, lu("3e famille B")).verite, true);
  assert.equal(evaluerLaCondition({ sujet: "C", operateur: OPERATEUR.PARMI, valeur: valeurs }, lu("4e famille")).verite, false);
  // « différent de » nie la liste entière : différent de A **et** de B.
  assert.equal(evaluerLaCondition({ sujet: "C", operateur: OPERATEUR.DIFFERENT, valeur: valeurs }, lu("4e famille")).verite, true);
  assert.equal(evaluerLaCondition({ sujet: "C", operateur: OPERATEUR.DIFFERENT, valeur: valeurs }, lu("3e famille A")).verite, false);
});

test("les comparaisons lisent le nombre sous l'unité et la virgule", () => {
  const seuil = { sujet: "Hauteur", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" };
  assert.equal(evaluerLaCondition(seuil, lu("26 m")).verite, true);
  assert.equal(evaluerLaCondition(seuil, lu("28 m")).verite, true);
  assert.equal(evaluerLaCondition(seuil, lu("31,5 m")).verite, false);
  // L'espace fine des milliers ne fait pas un autre nombre.
  assert.equal(evaluerLaCondition({ sujet: "A", operateur: OPERATEUR.PLUS_DE, valeur: "900" }, lu("1 200 m")).verite, true);
});

test("deux unités différentes rendent la comparaison indécidable, pas fausse", () => {
  // Comparer 26 à 28 rendrait « vrai » par accident, et une cote de fondation
  // fausse se lit exactement comme une cote juste.
  const clause = { sujet: "Hauteur", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" };
  const rendu = evaluerLaCondition(clause, lu("26 cm"));
  assert.equal(rendu.verite, null);
  assert.equal(rendu.doute, DOUTE.UNITES_INCOMPARABLES);
  assert.match(phraseDuDoute(rendu.doute), /même unité/);
});

test("une comparaison de nombres sur ce qui n'en est pas ne tranche rien", () => {
  const rendu = evaluerLaCondition({ sujet: "H", operateur: OPERATEUR.AU_MOINS, valeur: "3" }, lu("trois"));
  assert.equal(rendu.verite, null);
  assert.equal(rendu.doute, DOUTE.PAS_UN_NOMBRE);
});

test("une entrée absente rend la clause indécidable, jamais fausse", () => {
  const rendu = evaluerLaCondition({ sujet: "Portance", operateur: OPERATEUR.EGAL, valeur: "0,2 MPa" }, inconnu);
  assert.equal(rendu.verite, null);
  assert.equal(rendu.doute, DOUTE.ENTREE_ABSENTE);
});

test("« renseigné » se tranche justement quand la réponse manque", () => {
  const pose = { sujet: "Sous-sol", operateur: OPERATEUR.RENSEIGNE };
  assert.equal(evaluerLaCondition(pose, inconnu).verite, false);
  assert.equal(evaluerLaCondition(pose, lu("oui")).verite, true);

  const absent = { sujet: "Sous-sol", operateur: OPERATEUR.NON_RENSEIGNE };
  assert.equal(evaluerLaCondition(absent, inconnu).verite, true);
  assert.equal(evaluerLaCondition(absent, lu("oui")).verite, false);
});

test("un opérateur qui n'est pas du langage ne se devine pas", () => {
  const rendu = evaluerLaCondition({ sujet: "C", operateur: "≈", valeur: "3" }, lu("3"));
  assert.equal(rendu.verite, null);
  assert.equal(rendu.doute, DOUTE.OPERATEUR_INCONNU);
});

/* ── La règle ────────────────────────────────────────────────────────────── */

const lireDepuis = (table) => lecteurDeValeurs(new Map(Object.entries(table)));

test("une règle conclut quand toutes ses conditions tiennent", () => {
  const r = regle("Degré CF", "CF 1 h", [
    { sujet: "Habitation", operateur: OPERATEUR.EGAL, valeur: "collective" },
    { sujet: "Hauteur", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }
  ]);

  const rendu = evaluerLaRegle(r, lireDepuis({ Habitation: "collective", Hauteur: "26 m" }));
  assert.equal(rendu.decidable, true);
  assert.equal(rendu.tient, true);
  assert.equal(rendu.valeur, "CF 1 h");
});

test("une condition fausse tranche, même si une autre est indécidable", () => {
  // `faux et ?` vaut faux : inutile de savoir le reste, la règle ne s'applique
  // pas. Refuser de conclure ici fabriquerait un doute qui n'existe pas.
  const r = regle("Degré CF", "CF 1 h", [
    { sujet: "Habitation", operateur: OPERATEUR.EGAL, valeur: "collective" },
    { sujet: "Hauteur", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }
  ], { sinon: "sans objet" });

  const rendu = evaluerLaRegle(r, lireDepuis({ Habitation: "individuelle" }));
  assert.equal(rendu.tient, false);
  assert.equal(rendu.valeur, "sans objet");
});

test("une condition indécidable empêche de conclure quand tout le reste tient", () => {
  const r = regle("Degré CF", "CF 1 h", [
    { sujet: "Habitation", operateur: OPERATEUR.EGAL, valeur: "collective" },
    { sujet: "Hauteur", operateur: OPERATEUR.AU_PLUS, valeur: "28", unite: "m" }
  ], { sinon: "sans objet" });

  const rendu = evaluerLaRegle(r, lireDepuis({ Habitation: "collective" }));
  assert.equal(rendu.decidable, false);
  assert.equal(rendu.tient, null);
  // Surtout pas « sans objet » : ce serait conclure une règle qu'on n'a pas
  // pu évaluer.
  assert.equal(rendu.valeur, "");
  assert.deepEqual(rendu.manquants, ["Hauteur"]);
});

test("les clauses se combinent de gauche à droite, et le mélange se signale", () => {
  const r = regle("X", "oui", [
    { sujet: "A", operateur: OPERATEUR.EGAL, valeur: "oui" },
    { sujet: "B", operateur: OPERATEUR.EGAL, valeur: "oui", joint: "et" },
    { sujet: "C", operateur: OPERATEUR.EGAL, valeur: "oui", joint: "ou" }
  ]);

  // (A et B) ou C : A faux, B faux, C vrai → vrai.
  const rendu = evaluerLaRegle(r, lireDepuis({ A: "non", B: "non", C: "oui" }));
  assert.equal(rendu.tient, true);
  // Le référentiel ne produit que des « et » : un mélange vient d'une règle
  // écrite à la main, et mérite d'être relu.
  assert.equal(rendu.melange, true);
});

test("une seule exception suffit à écarter la règle", () => {
  const r = regle("Colonne sèche", "exigée", [
    { sujet: "Classement", operateur: OPERATEUR.EGAL, valeur: "3e famille B" }
  ], {
    sinon: "non exigée",
    sauf: [
      { sujet: "Accès pompiers", operateur: OPERATEUR.EGAL, valeur: "direct" },
      { sujet: "Hauteur", operateur: OPERATEUR.MOINS_DE, valeur: "8", unite: "m" }
    ]
  });

  const tenue = evaluerLaRegle(r, lireDepuis({ Classement: "3e famille B", "Accès pompiers": "indirect", Hauteur: "26 m" }));
  assert.equal(tenue.valeur, "exigée");

  const ecartee = evaluerLaRegle(r, lireDepuis({ Classement: "3e famille B", "Accès pompiers": "direct", Hauteur: "26 m" }));
  assert.equal(ecartee.tient, false);
  assert.equal(ecartee.valeur, "non exigée");
});

test("une exception indécidable empêche de conclure une règle qui tiendrait", () => {
  const r = regle("Colonne sèche", "exigée", [
    { sujet: "Classement", operateur: OPERATEUR.EGAL, valeur: "3e famille B" }
  ], { sauf: [{ sujet: "Accès pompiers", operateur: OPERATEUR.EGAL, valeur: "direct" }] });

  const rendu = evaluerLaRegle(r, lireDepuis({ Classement: "3e famille B" }));
  assert.equal(rendu.decidable, false);
  assert.deepEqual(rendu.manquants, ["Accès pompiers"]);
});

test("la trace garde toutes les clauses, y compris celles qu'un court-circuit sauterait", () => {
  // Une trace qui s'arrête au premier faux n'explique rien, et c'est pour
  // comprendre qu'on la lit.
  const r = regle("X", "oui", [
    { sujet: "A", operateur: OPERATEUR.EGAL, valeur: "oui" },
    { sujet: "B", operateur: OPERATEUR.EGAL, valeur: "oui" }
  ]);

  const rendu = evaluerLaRegle(r, lireDepuis({ A: "non", B: "oui" }));
  assert.equal(rendu.conditions.length, 2);
  assert.deepEqual(rendu.conditions.map((c) => c.verite), [false, true]);
  assert.equal(rendu.conditions[0].lu, "non");
});

test("une règle sans condition ne conclut rien plutôt que tout", () => {
  const rendu = evaluerLaRegle(regle("X", "oui", []), lireDepuis({}));
  assert.equal(rendu.decidable, false);
  assert.equal(rendu.valeur, "");
});

/* ── Le rejeu ────────────────────────────────────────────────────────────── */

test("rejouer une règle sur les valeurs d'aujourd'hui rend l'un des quatre verdicts", () => {
  const r = regle("Degré CF", "CF 1 h", [{ sujet: "Classement", operateur: OPERATEUR.EGAL, valeur: "3e famille B" }],
    { sinon: "CF 1/2 h" });

  assert.equal(rejouerLaRegle(r, lireDepuis({ Classement: "3e famille B" })).verdict, VERDICT.IDENTIQUE);

  const autre = rejouerLaRegle(r, lireDepuis({ Classement: "2e famille" }));
  assert.equal(autre.verdict, VERDICT.DIFFERENTE);
  assert.equal(autre.avant, "CF 1 h");
  assert.equal(autre.apres, "CF 1/2 h");

  const muette = rejouerLaRegle(r, lireDepuis({}));
  assert.equal(muette.verdict, VERDICT.INDECIDABLE);
  // Aucune valeur nouvelle : un chiffre inventé ici serait indiscernable d'un
  // chiffre calculé.
  assert.equal(muette.apres, "");
});

test("une règle sans « sinon » qui ne s'applique plus n'efface rien", () => {
  // « si A alors B », sans `sinon`, ne dit rien quand A est faux. Lui faire
  // conclure une valeur vide effacerait ce que le projet tient — et une valeur
  // effacée se lit comme une valeur.
  const r = regle("Colonne sèche", "exigée", [{ sujet: "Classement", operateur: OPERATEUR.EGAL, valeur: "3e famille B" }]);

  const rendu = rejouerLaRegle(r, lireDepuis({ Classement: "2e famille" }));
  assert.equal(rendu.verdict, VERDICT.SANS_OBJET);
  assert.equal(rendu.apres, "");
  assert.equal(rendu.avant, "exigée");
  assert.equal(rendu.evaluation.applique, false);
});

test("un sujet absent se distingue d'un sujet vide", () => {
  const lire = lecteurDeValeurs(new Map([["Hauteur", ""]]));
  assert.deepEqual(lire("Hauteur"), { connu: false, valeur: "" });
  assert.deepEqual(lire("Inconnu"), { connu: false, valeur: "" });
  assert.deepEqual(lire("hauteur du  plancher"), { connu: false, valeur: "" });

  const rempli = lecteurDeValeurs({ "Hauteur du plancher bas": "26 m" });
  // La clé se normalise : deux écritures d'un même nom désignent la même entrée.
  assert.deepEqual(rempli("hauteur du  plancher  bas"), { connu: true, valeur: "26 m" });
});

/* ── Les branches enchaînées ─────────────────────────────────────────────────
 *
 * `si A alors X; sinon si B alors Y; sinon Z;` — la première branche qui tient
 * l'emporte, et l'ordre écrit est donc le sens.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Une règle à branches, montée comme la mémoire la porte. */
const enchainee = (sinonSi, { sinon = "", sauf = [] } = {}) => ({
  id: "r-Taux de TVA",
  payload: {
    subject: "Taux de TVA",
    value: "5,5 %",
    referentiel: true,
    regle: {
      conditions: [{ sujet: "Type", operateur: OPERATEUR.EGAL, valeur: "existant" }],
      sinonSi, sinon, sauf
    }
  }
});

const BRANCHES = [
  { conditions: [{ sujet: "Type", operateur: OPERATEUR.EGAL, valeur: "rénovation" }], alors: "10 %" },
  { conditions: [{ sujet: "Type", operateur: OPERATEUR.EGAL, valeur: "neuf" }], alors: "20 %" }
];

test("la première branche qui tient l'emporte, et elle seule conclut", () => {
  for (const [type, attendu, rang] of [
    ["existant", "5,5 %", 0], ["rénovation", "10 %", 1], ["neuf", "20 %", 2]
  ]) {
    const rendu = evaluerLaRegle(enchainee(BRANCHES), lireDepuis({ Type: type }));
    assert.equal(rendu.tient, true, type);
    assert.equal(rendu.valeur, attendu, type);
    assert.equal(rendu.branche, rang, type);
  }
});

test("aucune branche ne tenant, c'est le « sinon » — ou rien", () => {
  const avec = evaluerLaRegle(enchainee(BRANCHES, { sinon: "0 %" }), lireDepuis({ Type: "autre" }));
  assert.equal(avec.tient, false);
  assert.equal(avec.valeur, "0 %");
  assert.equal(avec.branche, -1);

  // Sans `sinon`, la règle ne dit **rien** : lui faire conclure une valeur vide
  // effacerait ce que le projet tient, et une valeur effacée se lit comme une
  // valeur.
  const sans = evaluerLaRegle(enchainee(BRANCHES), lireDepuis({ Type: "autre" }));
  assert.equal(sans.applique, false);
  assert.equal(sans.valeur, "");
});

test("une branche qu'on ne sait pas trancher arrête la lecture", () => {
  // **Le point délicat.** Passer à la branche suivante reviendrait à dire « la
  // première est fausse » alors qu'on n'en sait rien, et à conclure sur une
  // supposition. La règle est indécidable, et elle le dit (règle 5).
  const rendu = evaluerLaRegle(enchainee(BRANCHES), lireDepuis({}));

  assert.equal(rendu.tient, null);
  assert.equal(rendu.valeur, "");
  assert.equal(rendu.branche, -1);
  // Et l'on n'a pas lu les suivantes : on s'est arrêté à la première.
  assert.deepEqual(rendu.sinonSi, []);
});

test("une branche qu'on n'a pas atteinte ne réclame pas ses entrées", () => {
  // La règle n'en a pas eu besoin : les demander ferait un formulaire qui
  // réclame des valeurs dont la réponse ne dépend pas.
  const autreNom = [
    { conditions: [{ sujet: "Surface", operateur: OPERATEUR.AU_MOINS, valeur: "100", unite: "m²" }], alors: "10 %" }
  ];
  const rendu = evaluerLaRegle(enchainee(autreNom), lireDepuis({ Type: "existant" }));

  assert.equal(rendu.valeur, "5,5 %");
  assert.deepEqual(rendu.manquants, [], "une branche jamais lue réclame une entrée");
});

test("« sauf si » écarte la règle entière, branches comprises", () => {
  // Une exception qui ne vaudrait que pour un cas sur trois ne serait pas une
  // exception de la règle : ce serait une condition de plus sur une branche.
  const sauf = [{ sujet: "Exonéré", operateur: OPERATEUR.EGAL, valeur: "oui" }];
  const rendu = evaluerLaRegle(
    enchainee(BRANCHES, { sinon: "0 %", sauf }),
    lireDepuis({ Type: "neuf", Exonéré: "oui" })
  );

  assert.equal(rendu.tient, false, "la branche « neuf » a pris la main malgré l'exception");
  assert.equal(rendu.valeur, "0 %");
});

test("la trace porte ce que chaque branche a lu, dans l'ordre", () => {
  // Sans elle, l'écran montre une condition fausse au-dessus d'une conclusion
  // juste, et rien pour les relier.
  const rendu = evaluerLaRegle(enchainee(BRANCHES), lireDepuis({ Type: "neuf" }));

  assert.deepEqual(rendu.conditions.map((une) => une.verite), [false]);
  assert.deepEqual(rendu.sinonSi.map((une) => une.verite), [false, true]);
});
