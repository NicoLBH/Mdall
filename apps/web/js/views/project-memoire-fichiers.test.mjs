import test from "node:test";
import assert from "node:assert/strict";

import {
  lignesDeLAssertion, gesteDeLAssertion, jetonsDeLAssertion, octets, ilYA
} from "./project-memoire-fichiers.js";
import { enClair, GESTE } from "../services/memoire-en-texte.js";

const clair = (ligne) => enClair(ligne.jetons);

test("une valeur sans raisonnement reste une seule ligne", () => {
  const lignes = lignesDeLAssertion({
    payload: { subject: "Zone de neige", value: "A1", source: "Zonages réglementaires" }
  });

  assert.equal(lignes.length, 1);
  assert.equal(lignes[0].nature, "affirmation");
  assert.match(clair(lignes[0]), /^Zone de neige {2}A1 {2}← Zonages réglementaires$/);
});

test("le raisonnement s'indente sous l'affirmation qu'il justifie", () => {
  const lignes = lignesDeLAssertion({
    payload: {
      subject: "Degré coupe-feu des planchers",
      value: "CF 1 h",
      raisonnement: {
        condition: "Classement du bâtiment = 3e famille B",
        parceQue: "« …coupe-feu de degré une heure… »",
        saufSi: ["le bâtiment ne comporte qu'une seule unité de passage"],
        dependDe: ["Classement du bâtiment"]
      }
    }
  });

  const textes = lignes.map(clair);
  assert.equal(lignes[0].nature, "affirmation");
  assert.equal(lignes[1].nature, "raisonnement");
  assert.deepEqual(textes, [
    "Degré coupe-feu des planchers  CF 1 h",
    "   si Classement du bâtiment = 3e famille B",
    "      alors CF 1 h  ✓ retenu",
    "   parce que « …coupe-feu de degré une heure… »",
    "   sauf si le bâtiment ne comporte qu'une seule unité de passage",
    "   dépend de Classement du bâtiment"
  ]);
});

test("une hypothèse se suppose, une décision se retient", () => {
  assert.equal(gesteDeLAssertion({ nature: "hypothese" }), GESTE.HYPOTHESE);
  assert.equal(gesteDeLAssertion({ nature: "constat" }), GESTE.FAIT);
  assert.equal(gesteDeLAssertion({ payload: { geste: GESTE.DECISION } }), GESTE.DECISION);

  const supposee = lignesDeLAssertion({
    nature: "hypothese",
    payload: { subject: "Portance du sol", value: "0,2 MPa" }
  });
  assert.equal(clair(supposee[0]), "on suppose Portance du sol  0,2 MPa");
});

test("jetonsDeLAssertion rend la ligne de valeur, pas le raisonnement", () => {
  const jetons = jetonsDeLAssertion({
    payload: { subject: "Zone de vent", value: "2", raisonnement: { dependDe: ["Commune du projet"] } }
  });
  assert.equal(enClair(jetons), "Zone de vent  2");
});

test("le poids d'un fichier se dit en octets, accents compris", () => {
  assert.equal(octets("abc"), "3 octets");
  assert.equal(octets("é"), "2 octets");
  assert.match(octets("x".repeat(2048)), /^2\.0 Ko$/);
});

test("une date se lit en durée, pas en calendrier", () => {
  const jours = (n) => new Date(Date.now() - n * 86400000).toISOString();
  assert.equal(ilYA(jours(0)), "aujourd'hui");
  assert.equal(ilYA(jours(1)), "hier");
  assert.equal(ilYA(jours(10)), "il y a 10 jours");
  assert.equal(ilYA(jours(150)), "il y a 5 mois");
  assert.equal(ilYA("n'importe quoi"), "date inconnue");
});
