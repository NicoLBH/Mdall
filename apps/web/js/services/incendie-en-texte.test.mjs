import test from "node:test";
import assert from "node:assert/strict";

import {
  fichierDeLEtude, fichierDesRegles, regleDuModule, affirmationDuModule,
  conditionsDuModule, sourceDuModule
} from "./incendie-en-texte.js";
import { enClair, ECRITURE, texteDesLignes } from "./memoire-en-texte.js";
import { lireUnFichier, grapheDesBlocs, aRevoirSi } from "./memoire-en-lecture.js";

/** Ce que le corpus renvoie, en petit : trois modules, dont un enchaîné. */
const VUE = {
  modules: [
    {
      id: "classement", titre: "Classement du bâtiment", produit: "classement",
      statut: "conclu", valeur: "3e famille B", exigence: true,
      conditions: [
        { fait: "logementsSuperposes", sujet: "Logements superposés", operateur: "=", valeur: "oui", unite: null, logique: true },
        { fait: "hauteur", sujet: "Hauteur du plancher bas du logement le plus haut", operateur: "<=", valeur: 28, unite: "m", logique: false }
      ],
      pourquoi: { article: "3", paragraphe: "3°)", citation: "Troisième famille B : habitations ne satisfaisant pas à l'une des conditions précédentes." }
    },
    {
      id: "colonne", titre: "Colonne sèche", produit: "colonne",
      statut: "conclu", valeur: "exigée", exigence: true,
      conditions: [
        { fait: "classement", sujet: "Classement du bâtiment", operateur: "parmi", valeur: ["3e famille B", "4e famille"], unite: null, logique: false }
      ],
      pourquoi: { article: "98", paragraphe: "premier alinéa", citation: "Les habitations de la 3ème famille B et de la 4ème famille doivent comporter une colonne sèche de 65 mm par escalier." }
    },
    {
      id: "sous-sol", titre: "Le bâtiment comporte un sous-sol", produit: "sousSol",
      statut: "conclu", valeur: "avec sous-sol", exigence: false, conditions: []
    }
  ]
};

test("une reformulation du cas n'est ni une règle ni une exigence", () => {
  const reformulation = VUE.modules[2];
  assert.equal(regleDuModule(reformulation, "arrêté"), null);
  assert.equal(affirmationDuModule(reformulation, "arrêté"), null);
});

test("la règle porte le seuil du texte, jamais la cote du projet", () => {
  const regle = regleDuModule(VUE.modules[0], "arrêté du 31 janvier 1986 modifié");

  assert.equal(regle.sujet, "Classement du bâtiment");
  assert.equal(regle.alors, "3e famille B");
  assert.deepEqual(regle.conditions.map((c) => [c.sujet, c.operateur, c.valeur]), [
    ["Logements superposés", "=", ["oui"]],
    ["Hauteur du plancher bas du logement le plus haut", "<=", ["28"]]
  ]);
  assert.equal(regle.provenance.type, "texte");
  assert.match(regle.provenance.quoi, /article 3, 3°\)/);
});

test("le fichier de règles ne contient aucune valeur de ce projet", () => {
  const fichier = fichierDesRegles(VUE, { le: "7 septembre 2026" });
  const texte = texteDesLignes(fichier.lignes.map((ligne) => ligne.jetons));

  assert.equal(fichier.chemin, "memoire/incendie.ref");
  assert.equal(fichier.compte.regles, 2);
  assert.equal(texte.includes("statut"), false);
  assert.equal(texte.includes("retenu"), false);
  assert.equal(texte.includes("dépend de"), false);
  assert.match(texte, /si \(Logements superposés = oui\)/);
  assert.match(texte, /et \(Hauteur du plancher bas du logement le plus haut <= 28 m\)/);
});

test("le fichier de projet renvoie à la règle sans la recopier", () => {
  const fichier = fichierDeLEtude(VUE, { le: "7 septembre 2026" });
  const texte = texteDesLignes(fichier.lignes.map((ligne) => ligne.jetons));

  assert.equal(fichier.chemin, "memoire/incendie.ctr");
  assert.deepEqual(fichier.compte, { affirmations: 2, sansObjet: 0, attente: 0 });
  assert.match(texte, /^\s+Classement du bâtiment = "3e famille B" \{$/m);
  assert.match(texte, /^zone: Toutes zones \{$/m);
  assert.match(texte, /règle: Classement du bâtiment — arrêté/);
  assert.match(texte, /statut: retenu/);
  // La règle est ailleurs : elle vaut pour mille bâtiments, cette valeur pour un.
  assert.equal(texte.includes("si "), false);
  assert.equal(texte.includes("<= 28"), false);
});

test("une valeur sans exigence garde sa valeur : c'est le statut qui dit l'absence", () => {
  const module = {
    id: "voie", titre: "Voie-engins", statut: "conclu", valeur: "non décrite", exigence: true,
    sansObjet: "Les première et deuxième familles ne sont soumises à aucune prescription d'accès.",
    conditions: [], pourquoi: { article: "4" }
  };

  const entree = affirmationDuModule(module, "arrêté du 31 janvier 1986 modifié", 0);
  const texte = texteDesLignes(entree.lignes);

  assert.equal(entree.nature, "sans-objet");
  // La valeur reste : « Voie-échelles » en dépend, et l'effacer casserait le graphe.
  assert.match(texte, /^Voie-engins = "non décrite" \{$/m);
  assert.match(texte, /statut: sans objet/);
  assert.match(texte, /parce que: "Les première et deuxième familles/);
});

test("ce qui attend une réponse s'écrit, avec ce qui le retient", () => {
  const module = {
    id: "escalier", titre: "Type d'escalier exigé", statut: "enAttente", exigence: true,
    manque: ["Hauteur du dernier plancher"], conditions: [], pourquoi: { article: "26" }
  };

  const texte = texteDesLignes(affirmationDuModule(module, "arrêté", 0).lignes);
  assert.match(texte, /^Type d'escalier exigé \{$/m);
  assert.match(texte, /statut: en attente/);
  assert.match(texte, /parce que: "Il manque : Hauteur du dernier plancher\."/);
});

test("un référentiel non cité ne s'invente pas d'article", () => {
  assert.equal(sourceDuModule({ titre: "x" }, ""), "");
  assert.equal(sourceDuModule({ pourquoi: { article: "6" } }, "arrêté"), "arrêté, article 6");
});

test("des conditions absentes ne produisent pas un si vide", () => {
  assert.deepEqual(conditionsDuModule({}), []);
  assert.deepEqual(conditionsDuModule({ conditions: [{ sujet: "" }] }), []);
});

test("une étude vide rend deux fichiers vides, pas une erreur", () => {
  assert.deepEqual(fichierDeLEtude(null).lignes, []);
  assert.deepEqual(fichierDeLEtude(null).compte, { affirmations: 0, sansObjet: 0, attente: 0 });
  assert.deepEqual(fichierDesRegles(null).lignes, []);
});

test("l'en-tête dit toujours ce qui a produit le fichier, et dans quelle écriture", () => {
  const fichier = fichierDeLEtude(VUE, { le: "7 septembre 2026" });
  const entete = fichier.enTete.map(enClair);
  assert.match(entete[1], /établi par l'agent incendie — habitation, le 7 septembre 2026/);
  assert.equal(entete[2], `note: écriture Mdall v${ECRITURE}`);
});

test("le graphe du référentiel se reconstruit depuis son texte", () => {
  const fichier = fichierDesRegles(VUE);
  const { blocs, refus } = lireUnFichier(texteDesLignes(fichier.lignes.map((ligne) => ligne.jetons)));

  assert.deepEqual(refus, []);
  const graphe = grapheDesBlocs(blocs);
  assert.deepEqual(graphe.produits, ["Classement du bâtiment", "Colonne sèche"]);
  assert.deepEqual(graphe.entrees, ["Hauteur du plancher bas du logement le plus haut", "Logements superposés"]);

  // La question qui fait tout l'intérêt de la mémoire : « la hauteur change,
  // qu'est-ce qui tombe ? »
  assert.deepEqual(
    aRevoirSi("Hauteur du plancher bas du logement le plus haut", blocs),
    ["Classement du bâtiment", "Colonne sèche"]
  );
});
