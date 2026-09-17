/**
 * La chaîne d'une variante : ce qui découle de quoi.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { enchainementDeLaVariante, TON } from "./variante-enchainement.js";
import { ICONE_DE_LA_DECISION } from "./assertion-taxonomy.js";

const DEPART = { sujet: "Altitude du site", valeur: "13,22 m", essaye: "800 m" };

const rendu = (dessus = {}) => ({
  ok: true, recalculees: [], rejouees: [], aRevoir: [], relectures: { recalculees: [], refusees: [] }, ...dessus
});

const recalculee = (sujet, utilitaire, bouge = true) => ({
  sujet, utilitaire, valeurABouge: bouge, reservesOntBouge: false, assertion: { id: `a-${sujet}` }
});

test("la chaîne part de ce qu'on essaie et suit l'ordre du rejeu", () => {
  // C'est tout l'objet : altitude → hors gel → fondations. En liste, rien ne
  // disait que la troisième découlait de la deuxième — et c'est ce qui a fait
  // qu'un enchaînement correct a été lu comme s'il ne s'était rien passé.
  const etapes = enchainementDeLaVariante(rendu({
    recalculees: [
      recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1"),
      recalculee("Zone de neige", "deduction_zone_neige_commune_V1", false),
      recalculee("Résultat du calcul des fondations superficielles",
        "dimensionnement_fondations_superficielles_V1")
    ]
  }), DEPART);

  assert.deepEqual(etapes.map((etape) => etape.id), [
    "depart",
    "recalculee:a-Profondeur hors gel",
    "recalculee:a-Zone de neige",
    "recalculee:a-Résultat du calcul des fondations superficielles"
  ]);
  assert.deepEqual(etapes[0].sorties, ["Altitude du site"]);
  assert.equal(etapes[0].detail, "13,22 m → 800 m");
});

test("une étape dit ce qu'elle lit, d'après ce que l'agent a déclaré", () => {
  // Les entrées ne se devinent pas de la chaîne : elles viennent du `lit` de
  // l'utilitaire, et un utilitaire qui déclare mal se voit ici.
  const [, horsGel] = enchainementDeLaVariante(rendu({
    recalculees: [recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1")]
  }), DEPART);

  assert.deepEqual(horsGel.entrees, [
    "Localisation du projet", "H0 retenu pour le département", "Altitude du site"
  ]);
  assert.deepEqual(horsGel.sorties, ["Profondeur hors gel"]);
  assert.equal(horsGel.detail, "a recalculé");
});

test("une valeur relue sans changement le dit, et ne se déguise pas en recalcul", () => {
  const [, neige] = enchainementDeLaVariante(rendu({
    recalculees: [recalculee("Zone de neige", "deduction_zone_neige_commune_V1", false)]
  }), DEPART);

  assert.equal(neige.detail, "a relu, sans changement");
  assert.equal(neige.icon, "check");
});

test("ce qui reste en suspens et ce qui a refusé ferment la chaîne, avec leur ton", () => {
  const etapes = enchainementDeLaVariante(rendu({
    recalculees: [recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1")],
    rejouees: [{ sujet: "Fondations profondes" }, { sujet: "Degré CF" }],
    aRevoir: [{ sujet: "Ancrage des semelles" }],
    relectures: { recalculees: [], refusees: [{ sujet: "Zone de vent" }] }
  }), DEPART);

  const par = (id) => etapes.find((etape) => etape.id === id);
  assert.deepEqual(par("rejouees").sorties, ["Fondations profondes", "Degré CF"]);
  assert.equal(par("rejouees").label, "2 règles du projet rejouées");
  assert.equal(par("a-revoir").tone, TON.DOUTE);
  assert.equal(par("refusees").tone, TON.ROMPU);
  // Les noms, jamais un compte seul : « 1 à revérifier » sans dire laquelle
  // laisserait la chercher dans le tableau.
  assert.deepEqual(par("a-revoir").entrees, ["Ancrage des semelles"]);
});

test("une variante qui n'enchaîne rien ne dessine pas de chaîne", () => {
  // « Ce que vous essayez », seul, ne montre aucun enchaînement et occuperait
  // une colonne pour rien.
  assert.deepEqual(enchainementDeLaVariante(rendu(), DEPART), []);
  assert.deepEqual(enchainementDeLaVariante({ ok: false }, DEPART), []);
  assert.deepEqual(enchainementDeLaVariante(null, DEPART), []);
});

/* ── L'arbre : une valeur changée fourche ────────────────────────────────── */

test("deux étapes qui lisent la même chose sont sœurs, pas l'une après l'autre", () => {
  // La démonstration : changer l'altitude change la zone de neige **et** la cote
  // hors gel — deux branches du même rang —, et la cote hors gel change ensuite
  // les fondations, un rang plus loin. En file, cela se lirait « neige, puis
  // hors gel, puis fondations », ce qui est faux : la neige ne commande rien.
  const etapes = enchainementDeLaVariante(rendu({
    recalculees: [
      recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1"),
      recalculee("Zone de neige", "deduction_zone_neige_commune_V1"),
      recalculee("Résultat du calcul des fondations superficielles",
        "dimensionnement_fondations_superficielles_V1")
    ]
  }), DEPART);

  assert.deepEqual(etapes.map((etape) => [etape.rang, etape.sorties?.[0] ?? etape.label]), [
    [0, "Altitude du site"],
    [1, "Profondeur hors gel"],
    [1, "Zone de neige"],
    [2, "Résultat du calcul des fondations superficielles"]
  ]);
});

test("chaque étape dit de qui elle découle", () => {
  const etapes = enchainementDeLaVariante(rendu({
    recalculees: [
      recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1"),
      recalculee("Résultat du calcul des fondations superficielles",
        "dimensionnement_fondations_superficielles_V1")
    ]
  }), DEPART);

  // Les fondations lisent la cote hors gel — pas l'altitude. Le parent est donc
  // l'étape qui vient d'écrire la cote, et c'est ce qui les met un rang plus bas.
  assert.equal(etapes[1].parent, "depart");
  assert.equal(etapes[2].parent, "recalculee:a-Profondeur hors gel");
});

test("une étape qui lit ce que rien d'ici n'a écrit est au rang 1", () => {
  // Elle découle de ce qu'on essaie, par un chemin qu'on ne voit pas. Le dire au
  // rang 1 vaut mieux que de la ranger au hasard, et bien mieux que de la
  // ranger sous une sœur qui ne la commande pas.
  const [, orpheline] = enchainementDeLaVariante(rendu({
    recalculees: [recalculee("Zone de sismicité", "deduction_zone_sismique_georisques_V1")]
  }), DEPART);

  assert.equal(orpheline.rang, 1);
  assert.equal(orpheline.parent, "depart");
});

test("un récapitulatif ferme la chaîne au tronc, sous aucune branche", () => {
  // « 3 à revérifier » n'est pas une étape de la chaîne : elle ne découle
  // d'aucune en particulier, et la ranger sous la plus profonde la dessinerait
  // comme sa fille — le défaut même qu'on ferme ici. Elle vient en dernier, et
  // au rang du tronc : c'est là que les branches se rejoignent.
  const etapes = enchainementDeLaVariante(rendu({
    recalculees: [
      recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1"),
      recalculee("Résultat du calcul des fondations superficielles",
        "dimensionnement_fondations_superficielles_V1")
    ],
    aRevoir: [{ sujet: "Note de calcul" }]
  }), DEPART);

  const dernier = etapes[etapes.length - 1];
  assert.equal(dernier.id, "a-revoir");
  assert.equal(dernier.rang, 0);
  // Et le tronc ne se confond pas avec la branche la plus profonde, qui reste
  // là où elle est : le récapitulatif ne l'a ni aplatie ni emportée.
  assert.equal(etapes[2].rang, 2);
});

test("la localisation est la tête de la cascade", () => {
  // C'est ce que l'étape 4 a rendu possible : la localisation est un sujet de la
  // mémoire, les trois utilitaires climatiques déclarent la lire, et la changer
  // fait donc partir trois branches à la fois.
  const etapes = enchainementDeLaVariante(rendu({
    recalculees: [
      recalculee("Zone de neige", "deduction_zone_neige_commune_V1"),
      recalculee("Zone de vent", "deduction_zone_vent_commune_V1"),
      recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1"),
      recalculee("Résultat du calcul des fondations superficielles",
        "dimensionnement_fondations_superficielles_V1")
    ]
  }), { sujet: "Localisation du projet", valeur: "Annecy", essaye: "Briançon" });

  assert.deepEqual(etapes.map((etape) => etape.rang), [0, 1, 1, 1, 2]);
});

/* ── Là où la chaîne bute ────────────────────────────────────────────────── */

test("un choix humain a son étape, pas une place dans un compte", () => {
  // C'est là que la chaîne s'arrête : elle avance, elle arrive sur un arbitrage
  // que rien ne détermine, et elle doit dire qui doit répondre. Le fondre dans
  // « 3 à revérifier » perdrait ce pour quoi la décision a été enregistrée.
  const etapes = enchainementDeLaVariante(rendu({
    recalculees: [recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1")],
    aRevoir: [
      { sujet: "H0 retenu pour le département", assertion: { id: "d1" },
        decision: { question: "Quelle cote dans la fourchette ?", phrase: "Le 12 mars, Marie D. a retenu 0,50 m." } },
      { sujet: "Note de calcul" }
    ]
  }), DEPART);

  const choix = etapes.find((etape) => etape.id === "decision:d1");
  assert.equal(choix.label, "Quelle cote dans la fourchette ?");
  assert.equal(choix.detail, "Le 12 mars, Marie D. a retenu 0,50 m.");
  // La même icône que partout ailleurs pour une décision : le rail de la
  // mémoire la pose déjà, et deux dessins pour une chose n'en font pas deux.
  assert.equal(choix.icon, ICONE_DE_LA_DECISION);
  assert.equal(choix.tone, TON.DOUTE);
});

test("les choix humains sortis du compte n'y sont pas recomptés", () => {
  // Sinon la même décision se lirait deux fois : une fois comme question, une
  // fois comme unité d'un doute général.
  const etapes = enchainementDeLaVariante(rendu({
    recalculees: [recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1")],
    aRevoir: [
      { sujet: "H0 retenu", assertion: { id: "d1" }, decision: { question: "Q", phrase: "P" } },
      { sujet: "Note de calcul" }
    ]
  }), DEPART);

  assert.equal(etapes.find((etape) => etape.id === "a-revoir").label, "1 à revérifier");
});

test("sans aucun choix humain, le compte reste ce qu'il était", () => {
  const etapes = enchainementDeLaVariante(rendu({
    recalculees: [recalculee("Profondeur hors gel", "deduction_profondeur_hors_gel_altitude_V1")],
    aRevoir: [{ sujet: "Note de calcul" }, { sujet: "Ancrage" }]
  }), DEPART);

  assert.equal(etapes.find((etape) => etape.id === "a-revoir").label, "2 à revérifier");
  assert.equal(etapes.some((etape) => etape.id.startsWith("decision:")), false);
});
