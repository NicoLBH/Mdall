import test from "node:test";
import assert from "node:assert/strict";

import {
  renderEspaceDuRaisonnement, ancresDuCode, espaceParDefaut, BORNES
} from "./project-memoire-raisonnement.js";
// **Les filets et les paires ont quitté cet écran.** Ils servent partout où
// l'on lit du Mdall ; les éprouver depuis la vue qui les a vus naître ferait
// croire qu'ils lui appartiennent encore.
import { niveauxDesPaires } from "../services/mdall-retrait.js";

/** Une ligne de code, telle que l'écriture la rend. */
const ligne = (...jetons) => ({ jetons: jetons.map(([type, texte]) => ({ type, texte })) });

/** Le retrait est un jeton neutre : il ouvre chaque ligne, et ne dit rien. */
const retrait = ["neutre", "   "];

const CODE = [
  ligne(["neutre", ""], ["mot-fonction", "fonction"], ["neutre", " "], ["sujet", "Colonne sèche"]),
  ligne(retrait, ["mot-importe", "importe"], ["neutre", " "], ["sujet", "Classement du bâtiment"]),
  ligne(retrait, ["mot-condition", "si"], ["neutre", " "], ["sujet", "Classement du bâtiment"])
];

const TRACE = [
  { sujet: "Colonne sèche", valeur: "exigée", zone: "Bâtiment A", manquant: false, deduite: false },
  { sujet: "Classement du bâtiment", valeur: "3e famille B", zone: "Bâtiment A", manquant: false, deduite: true },
  { sujet: "Classement du bâtiment", valeur: "", zone: "", manquant: true, deduite: false }
];

const GRAPHE = {
  noeuds: [
    { id: "donnee:classement du batiment", produit: "classement du batiment", demande: [],
      entete: "donnees-de-base.ddb", titre: "Classement du bâtiment", valeur: "3e famille B", etat: "conclu" },
    { id: "regle:colonne seche", produit: "colonne seche", demande: ["classement du batiment"],
      entete: "incendie.ref", titre: "Colonne sèche", valeur: "exigée", etat: "conclu" }
  ],
  liens: [{ de: "donnee:classement du batiment", vers: "regle:colonne seche", fait: "Classement du bâtiment" }]
};

test("chaque rangée porte la valeur, son numéro et le code — dans cet ordre", () => {
  // C'est ce qui rend le décalage impossible : deux fenêtres côte à côte, l'une
  // qui replie une ligne et pas l'autre, comparaient la condition d'une ligne à
  // la valeur d'une autre sans que rien ne le signale.
  //
  // Et les valeurs viennent **en premier** : on lit d'abord ce que le projet
  // dit, puis pourquoi. L'inverse obligeait à traverser cent caractères de code
  // avant d'atteindre la valeur qu'on était venu vérifier.
  const html = renderEspaceDuRaisonnement({
    graphe: GRAPHE, lignes: CODE, trace: TRACE,
    ancres: ancresDuCode(CODE, TRACE, GRAPHE).parRang, etat: espaceParDefaut()
  });

  const rangee = html.slice(html.indexOf('data-raison-rang="0"'));
  const ordre = ["raison-ligne__etat", "raison-ligne__num", "raison-ligne__code"]
    .map((classe) => rangee.indexOf(classe));
  assert.deepEqual(ordre, [...ordre].sort((a, b) => a - b));

  // Et la valeur du jour se lit sur la même rangée que sa ligne.
  assert.match(rangee.slice(0, 400), /exigée/);
});

test("ce que personne n'a versé se dit, et ne se laisse pas vide", () => {
  const html = renderEspaceDuRaisonnement({
    graphe: GRAPHE, lignes: CODE, trace: TRACE, etat: espaceParDefaut()
  });

  assert.match(html, /raison-ligne--manquante/);
  assert.match(html, /personne ne l'a versée/);
  // Déduite, et non relevée : les confondre ferait prendre une conclusion de
  // règle pour un constat de terrain.
  assert.match(html, /déduit/);
});

test("le schéma sait où chaque carte tombe dans le code", () => {
  // C'est ce qui permet de cliquer une étape pour y aller. Le premier jeton
  // d'une ligne est le **retrait**, pas le mot : le chercher là ne trouvait
  // aucune tête de fonction, et le geste ne faisait rien.
  const { parCarte, parRang } = ancresDuCode(CODE, TRACE, GRAPHE);

  assert.equal(parCarte.get("regle:colonne seche"), 0);
  // Une donnée de base n'a pas de fonction à elle : elle vise la première ligne
  // qui la cite, c'est-à-dire l'`importe` de la règle qui la lit.
  assert.equal(parCarte.get("donnee:classement du batiment"), 1);
  assert.equal(parRang.get(0), "regle:colonne seche");
});

test("l'espace ne dessine sa discussion que lorsqu'on l'appelle", () => {
  // Une colonne de discussion ouverte par défaut prendrait le tiers de l'écran
  // à quelqu'un qui vient lire un raisonnement.
  const ferme = renderEspaceDuRaisonnement({ graphe: GRAPHE, lignes: CODE, trace: TRACE, etat: espaceParDefaut() });
  assert.equal(ferme.includes("data-raison-discussion"), false);

  const ouvert = renderEspaceDuRaisonnement({
    graphe: GRAPHE, lignes: CODE, trace: TRACE,
    etat: { ...espaceParDefaut(), copiloteOuvert: true }
  });
  assert.match(ouvert, /data-raison-discussion/);
  // Le bouton et l'hôte ne partagent pas leur attribut : le même pour les deux
  // faisait monter le fil de discussion à l'intérieur du bouton.
  assert.match(ouvert, /data-raison-panneau="copiloteOuvert"/);
  assert.equal(ouvert.includes('data-raison-discussion="'), false);
});

test("les trois zones se tirent, et leurs bornes sont dites", () => {
  const html = renderEspaceDuRaisonnement({
    graphe: GRAPHE, lignes: CODE, trace: TRACE,
    etat: { ...espaceParDefaut(), copiloteOuvert: true }
  });

  for (const nom of ["schema", "etat", "copilote"]) {
    assert.match(html, new RegExp(`data-raison-poignee="${nom}"`));
    assert.ok(BORNES[nom].min < BORNES[nom].defaut && BORNES[nom].defaut < BORNES[nom].max);
  }
});

test("sans schéma, l'espace montre quand même le code", () => {
  // Une valeur relevée n'a pas de chaîne : ce n'est pas une raison pour ne rien
  // montrer de ce qui la porte.
  const html = renderEspaceDuRaisonnement({
    graphe: { noeuds: [], liens: [] }, lignes: CODE, trace: TRACE, etat: espaceParDefaut()
  });

  assert.equal(html.includes("data-raison-schema"), false);
  assert.match(html, /data-raison-code/);
});

test("une ouverture et sa fermeture portent la même teinte", () => {
  // `si (Sujet = "x") alors ( enregistre ( … ) );` : trois niveaux, et trois
  // fermetures de suite. Sans couleur, retrouver quelle fermeture répond à
  // quelle ouverture se fait en comptant à voix basse.
  const bloc = [
    ligne(["mot-fonction", "fonction"], ["sujet", "X"], ["ponctuation", "("], ["parametre", "zones"], ["ponctuation", ")"], ["accolade", "{"]),
    ligne(["mot-condition", "alors"], ["ponctuation", "("]),
    ligne(["mot-natif", "enregistre"], ["ponctuation", "("]),
    ligne(["ponctuation", ")"]),
    ligne(["ponctuation", ")"]),
    ligne(["accolade", "}"])
  ];

  const paires = niveauxDesPaires(bloc);

  // La parenthèse des paramètres ouvre et se referme au même niveau…
  assert.equal(paires.get(0).get(2), paires.get(0).get(4));
  // …et l'accolade de la fonction retrouve la sienne six lignes plus bas.
  assert.equal(paires.get(0).get(5), paires.get(5).get(0));
  // Deux niveaux imbriqués n'ont jamais la même teinte.
  assert.notEqual(paires.get(1).get(1), paires.get(2).get(1));
  // Et une fermeture retrouve son ouverture, pas sa voisine.
  assert.equal(paires.get(2).get(1), paires.get(3).get(0));
  assert.equal(paires.get(1).get(1), paires.get(4).get(0));
});

test("une fermeture orpheline ne prend aucune teinte", () => {
  // Mentir sur l'appariement est pire que de ne rien dire : un extrait de code
  // peut commencer au milieu d'un bloc.
  const paires = niveauxDesPaires([ligne(["ponctuation", ")"])]);
  assert.equal(paires.get(0), undefined);
});

test("le sélecteur de vue ne peut pas produire un écran vide", async () => {
  const { VUES, vueCourante, vueSuivante } = await import("./project-memoire-raisonnement.js");

  // Deux bascules séparées auraient permis de fermer le schéma **et** le code,
  // et l'écran serait devenu vide — ce qui n'arrive dans aucun logiciel qu'on
  // respecte. Le bouton tourne donc sur trois états, et le vide n'en est pas un.
  assert.equal(VUES.every((vue) => vue.schema || vue.code), true);

  // Le tour se referme : trois clics ramènent où l'on était.
  let etat = espaceParDefaut();
  const vues = [];
  for (let clic = 0; clic < 3; clic += 1) {
    const suivante = vueSuivante(etat);
    vues.push(suivante.cle);
    etat = { ...etat, schemaOuvert: suivante.schema, codeOuvert: suivante.code };
  }
  assert.deepEqual(vues, ["code-seul", "schema-seul", "les-deux"]);
  assert.equal(vueCourante(etat).cle, "les-deux");
});

test("l'icône du sélecteur dit ce qu'on voit, pas ce qu'on va faire", () => {
  const dessin = (etat) => {
    const html = renderEspaceDuRaisonnement({ graphe: GRAPHE, lignes: CODE, trace: TRACE, etat });
    return html.slice(html.indexOf("data-raison-vue")).match(/#(panneaux-[a-z-]+)/)?.[1];
  };

  assert.equal(dessin(espaceParDefaut()), "panneaux-les-deux");
  assert.equal(dessin({ ...espaceParDefaut(), schemaOuvert: false }), "panneaux-code-seul");
  assert.equal(dessin({ ...espaceParDefaut(), codeOuvert: false }), "panneaux-schema-seul");
});

test("le bandeau porte le constat et ses caractéristiques", () => {
  // En plein écran, la barre de titre n'est plus là : sans elles, on ne sait
  // plus de quelle nature ni de quelle zone on lit le raisonnement.
  const html = renderEspaceDuRaisonnement({
    graphe: GRAPHE, lignes: CODE, trace: TRACE, etat: espaceParDefaut(),
    titre: "Colonne sèche : exigée",
    pastilles: `<span class="memory-tag">Contrainte</span>`
  });

  assert.match(html, /Colonne sèche : exigée/);
  assert.match(html, /raison-espace__pastilles/);
});
