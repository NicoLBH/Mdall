/**
 * La note de calcul, lue : ce qui se range où, et ce qui ne se range nulle part.
 *
 * Une correspondance de cas fausse produit un résultat parfaitement plausible et
 * parfaitement faux — une neige accidentelle rangée en neige normale est
 * pondérée là où elle ne doit pas l'être, et absente là où elle doit être. Ces
 * tests sont donc la seule chose qui sépare le tableau livré d'une erreur de
 * transcription.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  casUtilitairePour, chargesPourLUtilitaire, casPerdus, normaliserLaNote, unitesDeLaNote,
  SCHEMA_NOTE, CAS_UTILITAIRE
} from "./note-de-calcul.js";

test("chaque nature de charge trouve sa case", () => {
  assert.equal(casUtilitairePour("CHARGE PERMANENTE").cas, "G");
  assert.equal(casUtilitairePour("NEIGE 2009 NORMAL").cas, "Sn");
  assert.equal(casUtilitairePour("Charge d'exploitation").cas, "Q");
  assert.equal(casUtilitairePour("SEISME X").cas, "Sx");
  assert.equal(casUtilitairePour(""), null);
  assert.equal(casUtilitairePour("Une ligne qui ne dit rien"), null);
});

test("la neige accidentelle n'est pas une neige", () => {
  // Rangée en Sn, elle serait majorée là où elle ne doit pas l'être et absente
  // des combinaisons accidentelles où elle doit être. L'ordre des motifs est ce
  // qui l'en empêche.
  assert.equal(casUtilitairePour("NEIGE 2009 ACCIDENT").cas, "Fa");
  assert.equal(casUtilitairePour("Neige exceptionnelle").cas, "Fa");
});

test("les cas de vent se numérotent à mesure, et restent distincts", () => {
  // Les fondre en un seul ferait disparaître le vent qui soulève au profit de
  // celui qui appuie.
  assert.equal(casUtilitairePour("VENT DROITE SURP.", 0).cas, "W1");
  assert.equal(casUtilitairePour("VENT GAUCHE DEPR.", 1).cas, "W2");
  assert.equal(casUtilitairePour("VENT PIGNON 1 DEPR.", 2).cas, "W3");
  assert.equal(casUtilitairePour("VENT PIGNON 2", 3).cas, "W4");
});

test("un cinquième vent est signalé, pas écrasé", () => {
  // Un cas de vent perdu ne se voit pas dans le résultat : il s'y déguise en
  // cas plus favorable.
  const cinquieme = casUtilitairePour("VENT LONG-PAN", 4);
  assert.equal(cinquieme.cas, null);
  assert.equal(cinquieme.deTrop, true);
});

const PORTIQUE_COURANT_FILE_B = {
  nom: "Portique courant — file B",
  quantite: 5,
  cas: [
    { libelle: "CHARGE PERMANENTE", V: 4.078, Hx: 0.416 },
    { libelle: "NEIGE 2009 NORMAL", V: 4.84, Hx: 0.522 },
    { libelle: "NEIGE 2009 ACCIDENT", V: 9.903, Hx: 1.068 },
    { libelle: "VENT DROITE SURP.", V: -4.923, Hx: -0.309 },
    { libelle: "VENT GAUCHE DEPR.", V: -0.051, Hx: -0.173 },
    { libelle: "VENT PIGNON 1 DEPR.", V: 0.109, Hx: 0.011 }
  ]
};

test("les charges d'un appui arrivent dans le vocabulaire de l'utilitaire", () => {
  const { charges, correspondances } = chargesPourLUtilitaire(PORTIQUE_COURANT_FILE_B);
  assert.deepEqual(Object.keys(charges).sort(), ["Fa", "G", "Sn", "W1", "W2", "W3"]);
  assert.equal(charges.G.V, 4.078);
  assert.equal(charges.G.Hx, 0.416);
  // Le signe part tel quel : un vent qui soulève donne un V négatif, et c'est
  // exactement ce que l'utilitaire attend.
  assert.equal(charges.W1.V, -4.923);
  // Ce que la note ne donne pas vaut zéro, pas NaN.
  assert.equal(charges.G.Mx, 0);
  assert.equal(charges.G.Hy, 0);
  assert.equal(correspondances.length, 6);
  assert.equal(correspondances[2].cas, "Fa");
});

test("deux lignes du même cas s'additionnent — c'est ce que « à superposer » veut dire", () => {
  const { charges } = chargesPourLUtilitaire({
    nom: "Massif de stabilité file A",
    cas: [
      { libelle: "CHARGE PERMANENTE", V: 1.709, Hx: 0.228 },
      { libelle: "VENT DROITE SURP.", V: -1.398, Hx: 0.446 },
      { libelle: "VENT DROITE SURP. — stabilité", V: 0, Hx: 3.077 }
    ]
  });
  assert.equal(charges.W1.Hx, 0.446 + 3.077);
  assert.equal(charges.W1.V, -1.398);
  // Et le second n'a pas consommé une case de vent supplémentaire.
  assert.equal(charges.W2, undefined);
});

test("une ligne qu'on ne sait pas ranger se dit, elle ne se devine pas", () => {
  const { charges, correspondances } = chargesPourLUtilitaire({
    cas: [{ libelle: "POUSSÉE DES TERRES", V: 2 }]
  });
  assert.deepEqual(charges, {});
  assert.equal(correspondances[0].cas, null);
  assert.equal(correspondances[0].dit, "non reconnu");
});

test("l'extraction se nettoie sans se compléter", () => {
  const note = normaliserLaNote({
    affaire: "  Garros à Labejan ",
    unites: "{ T ; Tm }",
    altitude: "241",
    appuis: [
      { nom: "", quantite: "3", cas: [{ libelle: "CHARGE PERMANENTE", V: "1,709", Hx: null }] },
      // Un appui sans aucune valeur n'est pas un appui : il n'y a rien à
      // dimensionner, et l'inventer donnerait une semelle sur du vide.
      { nom: "Vide", cas: [{ libelle: "NEIGE", V: null, Hx: null, Hy: null, Mx: null, My: null }] },
      { nom: "Sans cas", cas: [] }
    ]
  });
  assert.equal(note.affaire, "Garros à Labejan");
  assert.equal(note.altitude, 241);
  assert.equal(note.appuis.length, 1);
  assert.equal(note.appuis[0].nom, "Appui 1");
  assert.equal(note.appuis[0].quantite, 3);
  assert.equal(note.appuis[0].cas[0].V, 1.709);
  // Une composante absente reste absente : c'est la traduction qui la met à
  // zéro, pas la lecture.
  assert.equal(note.appuis[0].cas[0].Hx, null);
});

test("une unité inconnue n'est pas une unité", () => {
  // Une note en tonnes lue comme des daN donnerait des semelles mille fois trop
  // petites, et le ratio dirait que tout va bien.
  assert.equal(unitesDeLaNote({ unites: "{ T ; Tm }" }), "{ T ; Tm }");
  assert.equal(unitesDeLaNote({ unites: "tonnes" }), null);
  assert.equal(unitesDeLaNote({}), null);
  assert.equal(normaliserLaNote({ unites: "tonnes" }).unites, "");
});

test("le schéma décrit ce qui entre dans le calcul, et rien d'autre", () => {
  // Ce qui n'est pas dans le schéma n'arrive pas, et ce qui arrive hors schéma
  // est refusé par le modèle lui-même.
  assert.equal(SCHEMA_NOTE.additionalProperties, false);
  const ligne = SCHEMA_NOTE.properties.appuis.items.properties.cas.items;
  assert.deepEqual(ligne.required, ["libelle", "V", "Hx", "Hy", "Mx", "My"]);
  assert.equal(ligne.additionalProperties, false);
  // Les unités sont un choix fermé : le modèle ne peut pas en inventer une.
  assert.ok(SCHEMA_NOTE.properties.unites.enum.includes("{ T ; Tm }"));
});

test("les cas de l'utilitaire sont ceux que la déclaration connaît", () => {
  for (const cas of ["G", "Q", "Sn", "W1", "W2", "W3", "W4", "Sx", "Sy", "Sz", "Fa"]) {
    assert.ok(CAS_UTILITAIRE[cas], `${cas} doit être connu`);
  }
});


test("un cas qu'on ne sait pas ranger et qui porte des efforts se signale", () => {
  // Le cas réel : un massif de contreventement dont la note donne « Effort
  // normal ». Aucune règle ne le reconnaît, sa charge disparaît, et le massif
  // se dimensionne alors sur son seul poids propre. Le résultat a l'air d'un
  // résultat — c'est ce qui le rend dangereux.
  const { charges, perdus } = chargesPourLUtilitaire({
    nom: "Massif de stabilité", cas: [
      { libelle: "Effort normal", V: 3.5, Hx: 0 },
      { libelle: "Vent", V: 3.077, Hx: 0 }
    ]
  });

  assert.equal(charges.G, undefined);
  assert.deepEqual(perdus, [{ libelle: "Effort normal", raison: "cas non reconnu" }]);
});

test("une ligne qu'on ne sait pas ranger mais qui ne porte rien ne coûte rien", () => {
  // Refuser de calculer pour une ligne vide ferait perdre un appui pour rien.
  const { perdus } = chargesPourLUtilitaire({
    cas: [{ libelle: "Ligne de séparation", V: 0, Hx: 0 }, { libelle: "CHARGE PERMANENTE", V: 2, Hx: 1 }]
  });
  assert.deepEqual(perdus, []);
});

test("un cinquième vent qui n'a plus de case compte comme perdu", () => {
  const { perdus } = chargesPourLUtilitaire({
    cas: [
      { libelle: "VENT 1", V: 1, Hx: 1 }, { libelle: "VENT 2", V: 1, Hx: 1 },
      { libelle: "VENT 3", V: 1, Hx: 1 }, { libelle: "VENT 4", V: 1, Hx: 1 },
      { libelle: "VENT 5", V: 1, Hx: 1 }
    ]
  });
  assert.deepEqual(perdus, [{ libelle: "VENT 5", raison: "plus de case de vent libre" }]);
});

test("casPerdus ne compte que ce qui porte quelque chose", () => {
  assert.deepEqual(casPerdus([
    { libelle: "A", cas: null, porteDesEfforts: true },
    { libelle: "B", cas: null, porteDesEfforts: false },
    { libelle: "C", cas: "G", porteDesEfforts: true }
  ]), [{ libelle: "A", raison: "cas non reconnu" }]);
});
