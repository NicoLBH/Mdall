import test from "node:test";
import assert from "node:assert/strict";

import { fichierDeLEtude, ligneDuModule, sourceDuModule, raisonnementDuModule } from "./incendie-en-texte.js";
import { enClair, ECRITURE } from "./memoire-en-texte.js";

const VUE = {
  modules: [
    { id: "classement", titre: "Classement du bâtiment", statut: "conclu", exigence: true, valeur: "3e famille B",
      pourquoi: { article: "3", paragraphe: "3°" } },
    { id: "planchers", titre: "Degré coupe-feu des planchers", statut: "conclu", exigence: true, valeur: "CF 1 h",
      pourquoi: { article: "6" } },
    { id: "circulation", titre: "Circulation horizontale protégée", statut: "conclu", exigence: true,
      valeur: null, sansObjet: "aucune circulation protégée n'est exigée" },
    { id: "conduits", titre: "Conduits", statut: "enAttente", exigence: true, valeur: null,
      manque: ["diamètre du conduit"] },
    { id: "sousSol", titre: "Sous-sol du bâtiment", statut: "conclu", exigence: false, valeur: "avec sous-sol" }
  ]
};

const clair = (fichier) => fichier.lignes.map((ligne) => enClair(ligne.jetons));

test("une conclusion s'écrit avec l'article qui la fonde", () => {
  const fichier = fichierDeLEtude(VUE);
  assert.equal(clair(fichier)[0],
    "Classement du bâtiment  3e famille B  ← arrêté du 31 janvier 1986 modifié, article 3, 3°");
});

test("« sans objet » est une conclusion, pas une valeur manquante : elle s'écrit", () => {
  const fichier = fichierDeLEtude(VUE);
  assert.equal(clair(fichier)[2],
    "Circulation horizontale protégée  sans objet  — aucune circulation protégée n'est exigée"
    + "  ← arrêté du 31 janvier 1986 modifié");
  assert.equal(fichier.compte.sansObjet, 1);
});

test("ce qui attend une réponse le dit, et nomme ce qui manque", () => {
  const fichier = fichierDeLEtude(VUE);
  assert.equal(clair(fichier)[3], "Conduits  en attente  — il manque diamètre du conduit");
  assert.equal(fichier.compte.attente, 1);
});

test("une reformulation du cas n'entre pas dans un fichier d'exigences", () => {
  assert.equal(ligneDuModule({ titre: "Sous-sol du bâtiment", statut: "conclu", exigence: false, valeur: "avec sous-sol" }), null);
  assert.equal(fichierDeLEtude(VUE).lignes.length, 4);
});

test("le fichier porte un nom, un chemin, et dit ce qui l'a produit", () => {
  const fichier = fichierDeLEtude(VUE, { chemin: ["Incendie", "Habitation"], le: "6 septembre 2026" });

  assert.equal(fichier.nom, "habitation.mdall");
  assert.equal(fichier.chemin, "incendie/habitation.mdall");
  assert.deepEqual(fichier.enTete.map(enClair), [
    "§ Incendie · Habitation",
    "¶ établi par l'utilitaire incendie — habitation, le 6 septembre 2026",
    `¶ écriture Mdall v${ECRITURE}`
  ]);
});

test("un module sans titre ne fabrique pas une ligne vide", () => {
  assert.equal(ligneDuModule({ statut: "conclu", exigence: true, valeur: "x" }), null);
  assert.equal(ligneDuModule({ titre: "Sans valeur", statut: "conclu", exigence: true, valeur: "" }), null);
});

test("un référentiel non cité ne s'invente pas d'article", () => {
  assert.equal(sourceDuModule({ titre: "x" }, ""), "");
  assert.equal(sourceDuModule({ pourquoi: { article: "6" } }, "arrêté"), "arrêté, article 6");
});

test("une étude vide rend un fichier vide, pas une erreur", () => {
  const fichier = fichierDeLEtude(null);
  assert.deepEqual(fichier.lignes, []);
  assert.deepEqual(fichier.compte, { affirmations: 0, sansObjet: 0, attente: 0, raisonnements: 0 });
});

test("un raisonnement se lit dans le graphe : condition, raison, socles", () => {
  const vue = {
    graphe: { liens: [{ de: "m-classement", vers: "m-planchers", fait: "famille" }] },
    modules: [
      { id: "m-classement", titre: "Classement du bâtiment", statut: "conclu",
        valeur: "3e famille B", exigence: false },
      { id: "m-planchers", titre: "Degré coupe-feu des planchers", statut: "conclu",
        valeur: "CF 1 h", exigence: true,
        pourquoi: { article: "6", citation: "Les planchers sont coupe-feu de degré une heure." } }
    ]
  };

  const raisonnement = raisonnementDuModule(vue.modules[1], vue);
  assert.equal(raisonnement.condition, "Classement du bâtiment = 3e famille B");
  assert.equal(raisonnement.alors, "CF 1 h");
  assert.equal(raisonnement.retenu, "CF 1 h");
  assert.equal(raisonnement.parceQue, "« Les planchers sont coupe-feu de degré une heure. »");
  assert.deepEqual(raisonnement.dependDe, ["Classement du bâtiment"]);
});

test("le raisonnement s'écrit avant la valeur qu'il produit", () => {
  const vue = {
    graphe: { liens: [{ de: "m-classement", vers: "m-planchers" }] },
    modules: [
      { id: "m-classement", titre: "Classement du bâtiment", statut: "conclu",
        valeur: "3e famille B", exigence: false },
      { id: "m-planchers", titre: "Degré coupe-feu des planchers", statut: "conclu",
        valeur: "CF 1 h", exigence: true, pourquoi: { article: "6", citation: "…une heure…" } }
    ]
  };

  const fichier = fichierDeLEtude(vue);
  const natures = fichier.lignes.map((ligne) => ligne.nature);
  assert.deepEqual(natures, ["raisonnement", "raisonnement", "raisonnement", "raisonnement", "affirmation"]);
  assert.equal(fichier.compte.affirmations, 1);
  assert.equal(fichier.compte.raisonnements, 4);
});

test("sans amont ni citation, une conclusion reste une simple ligne", () => {
  assert.equal(raisonnementDuModule({ id: "seul", titre: "x", valeur: "y" }, { modules: [], graphe: {} }), null);
});
