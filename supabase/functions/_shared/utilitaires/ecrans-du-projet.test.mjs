import test from "node:test";
import assert from "node:assert/strict";

import {
  CLES_DES_ECRANS, ECRANS_DU_PROJET, ecranDuProjet, routeDeLEcran
} from "./ecrans-du-projet.js";

test("une clé inconnue n'ouvre rien, et ne s'approche pas de la plus proche", () => {
  // « memoire » et « documents » n'ouvrent pas le même écran. Rapprocher une
  // clé mal orthographiée enverrait quelqu'un ailleurs que là où il a demandé,
  // et l'écran ne dirait pas qu'il s'est trompé de porte.
  assert.equal(ecranDuProjet("sujets")?.cle, "sujets");
  assert.equal(ecranDuProjet("Sujets"), null);
  assert.equal(ecranDuProjet("sujet"), null);
  assert.equal(ecranDuProjet(""), null);
  assert.equal(routeDeLEcran("p1", "sujet"), "");
});

test("sans projet, il n'y a pas d'adresse", () => {
  // `#project//sujets` mène au routeur avec un identifiant vide : on arriverait
  // sur un écran de projet sans projet, et rien ne dirait pourquoi.
  assert.equal(routeDeLEcran("", "sujets"), "");
  assert.equal(routeDeLEcran(null, "sujets"), "");
});

test("l'identifiant traverse l'adresse sans la casser", () => {
  // Un identifiant qui porterait une barre oblique inventerait un segment de
  // route, et l'on ouvrirait un écran qui n'existe pas.
  assert.equal(routeDeLEcran("a/b", "sujets"), "#project/a%2Fb/sujets");
});

test("chaque écran déclaré compose une adresse, et une seule", () => {
  // Une destination offerte au modèle qui ne mènerait nulle part serait une
  // porte qui n'ouvre sur rien : il la proposerait, et le clic ne ferait rien.
  const muets = CLES_DES_ECRANS.filter((cle) => !routeDeLEcran("p1", cle));
  assert.deepEqual(muets, []);

  const adresses = CLES_DES_ECRANS.map((cle) => routeDeLEcran("p1", cle));
  // Deux clés qui mèneraient au même endroit seraient deux noms pour une chose,
  // donc deux réponses possibles à une même question (règle 10). Sauf l'Atelier
  // et son Copilote, qui sont l'onglet et l'un de ses panneaux.
  assert.equal(new Set(adresses).size, adresses.length);
});

test("le Copilote est le seul à vivre dans un onglet", () => {
  // C'est ce qui justifie le quatrième segment. Si un second écran en gagnait
  // un, il faudrait que `route-de-latelier.js` sache le relire — et ce test
  // tombe pour le rappeler.
  const dansUnOnglet = ECRANS_DU_PROJET.filter((ecran) => ecran.panneau).map((ecran) => ecran.cle);
  assert.deepEqual(dansUnOnglet, ["copilote"]);
  assert.equal(routeDeLEcran("p1", "copilote"), "#project/p1/atelier/copilote");
  assert.equal(routeDeLEcran("p1", "atelier"), "#project/p1/atelier");
});

test("tout écran sait dire ce qu'il montre", () => {
  // `quoi` s'adresse au modèle : c'est ce qui fait qu'« ouvre-moi les fichiers »
  // et « montre-moi ce qui est déposé » mènent au même endroit. Un écran muet
  // se ferait choisir au hasard.
  const muets = ECRANS_DU_PROJET.filter((ecran) => !ecran.quoi || !ecran.onglet);
  assert.deepEqual(muets, []);
  assert.deepEqual(CLES_DES_ECRANS, ECRANS_DU_PROJET.map((ecran) => ecran.cle));
});
