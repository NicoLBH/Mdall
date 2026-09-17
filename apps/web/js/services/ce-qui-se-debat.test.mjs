import test from "node:test";
import assert from "node:assert/strict";

import { ceQuiSeDebat, phraseDeCeQuiSeDebat } from "./ce-qui-se-debat.js";

/** Un portage confirmé, tel que l'écran du sujet le construit. */
const porte = (sujet, valeur, portees = []) => ({
  assertion: { payload: { subject: sujet, value: valeur } },
  histoire: { ou: portees }
});

test("deux valeurs du même nom se rangent côte à côte", () => {
  // Quatre lignes dans l'ordre de la base, il faut lire les quatre et comparer
  // de tête. Rangées par nom, l'opposition se voit.
  const debat = ceQuiSeDebat([
    porte("Profondeur hors gel", "0,69 m", ["Bâtiment A"]),
    porte("Profondeur hors gel", "0,466 m", ["Préau"])
  ]);

  assert.equal(debat.partages, 1);
  assert.equal(debat.noms.length, 1);
  assert.deepEqual(debat.noms[0].versions.map((v) => v.valeur), ["0,69 m", "0,466 m"]);
});

test("la même valeur à deux endroits n'est pas un débat", () => {
  // C'est la même réponse pour deux parties de l'ouvrage. La compter comme une
  // opposition ferait chercher un désaccord qui n'existe pas (règle 5).
  const debat = ceQuiSeDebat([
    porte("Profondeur hors gel", "0,466 m", ["Bâtiment A"]),
    porte("Profondeur hors gel", "0,466 m", ["Préau"])
  ]);

  assert.equal(debat.partages, 0);
  assert.equal(debat.noms[0].versions.length, 1);
  assert.deepEqual(debat.noms[0].versions[0].portees, ["Bâtiment A", "Préau"]);
});

test("une portée citée deux fois ne se répète pas", () => {
  const debat = ceQuiSeDebat([
    porte("Altitude", "742,30", ["Bâtiment A"]),
    porte("Altitude", "742,30", ["Bâtiment A", "Préau"])
  ]);

  assert.deepEqual(debat.noms[0].versions[0].portees, ["Bâtiment A", "Préau"]);
});

test("les noms qui portent plusieurs valeurs viennent en premier", () => {
  // Ce sont ceux qu'on est venu regarder. Les enterrer sous les autres ferait
  // défiler pour trouver la seule chose qui demande un arbitrage.
  const debat = ceQuiSeDebat([
    porte("Classe de sol", "C"),
    porte("Profondeur hors gel", "0,69 m"),
    porte("Profondeur hors gel", "0,466 m")
  ]);

  assert.deepEqual(debat.noms.map((entree) => entree.nom),
    ["Profondeur hors gel", "Classe de sol"]);
});

test("une valeur sans nom ne se range sous aucun titre", () => {
  // Un titre vide fait une colonne que personne ne sait lire.
  const debat = ceQuiSeDebat([{ assertion: { payload: { value: "0,69 m" } }, histoire: { ou: [] } }]);

  assert.deepEqual(debat.noms, []);
});

test("une valeur sans histoire ne casse rien, et ne porte nulle part", () => {
  const debat = ceQuiSeDebat([{ assertion: { payload: { subject: "Altitude", value: "742,30" } } }]);

  assert.deepEqual(debat.noms[0].versions[0].portees, []);
});

/* ── Ce que la phrase dit, et ce qu'elle se garde de conclure ────────────── */

test("la phrase compte les valeurs, elle ne les déclare pas contradictoires", () => {
  // « 0,466 m au Préau » et « 0,69 m au Bâtiment A » peuvent être justes toutes
  // les deux. Conclure à la place du projet ferait dire à l'outil ce que seul
  // le projet sait.
  const dit = phraseDeCeQuiSeDebat(ceQuiSeDebat([
    porte("Profondeur hors gel", "0,69 m", ["Bâtiment A"]),
    porte("Profondeur hors gel", "0,466 m", ["Préau"])
  ]));

  assert.match(dit, /2 valeurs différentes portent le nom « Profondeur hors gel »/);
  assert.match(dit, /peuvent être justes toutes les deux/);
  assert.doesNotMatch(dit, /contradict|se contredisent|s'opposent/);
});

test("trois valeurs se comptent pour trois", () => {
  // « Deux valeurs » écrit d'avance mentirait dès qu'il y en a trois, et c'est
  // justement le cas qui demande un arbitrage.
  const dit = phraseDeCeQuiSeDebat(ceQuiSeDebat([
    porte("Profondeur hors gel", "0,69 m"),
    porte("Profondeur hors gel", "0,466 m"),
    porte("Profondeur hors gel", "0,80 m")
  ]));

  assert.match(dit, /3 valeurs différentes/);
});

test("plusieurs noms partagés se comptent en noms", () => {
  const dit = phraseDeCeQuiSeDebat(ceQuiSeDebat([
    porte("Profondeur hors gel", "0,69 m"),
    porte("Profondeur hors gel", "0,466 m"),
    porte("Classe de sol", "C"),
    porte("Classe de sol", "D")
  ]));

  assert.match(dit, /2 noms portent chacun plusieurs valeurs/);
});

test("sans opposition, la phrase le dit au lieu de se taire", () => {
  // Se taire laisserait croire qu'on n'a pas regardé. Dire « rien ne s'y
  // oppose » est une information (règle 5).
  const une = phraseDeCeQuiSeDebat(ceQuiSeDebat([porte("Altitude", "742,30")]));
  const deux = phraseDeCeQuiSeDebat(ceQuiSeDebat([
    porte("Altitude", "742,30"), porte("Classe de sol", "C")
  ]));

  assert.match(une, /Une seule valeur est en débat/);
  assert.match(deux, /aucune ne contredit une autre ici/);
});

test("sans valeur en débat, la phrase se tait", () => {
  assert.equal(phraseDeCeQuiSeDebat(ceQuiSeDebat([])), "");
  assert.equal(phraseDeCeQuiSeDebat(null), "");
});
