import test from "node:test";
import assert from "node:assert/strict";

import { discoverLegend, isLegendLine, legendToLexicon } from "./legend.mjs";

const SOCOTEC_LEGEND =
  "* F: Favorable , D: Défavorable , S: Suspendu , HM: Hors Mission , PM: Pour Mémoire , SO: Sans Objet";

test("la légende d'un rapport est lue dans le document, pas présumée", () => {
  const { codes } = discoverLegend(`Texte quelconque\n${SOCOTEC_LEGEND}\nAutre texte`);

  assert.deepEqual(codes.map((entry) => entry.code), ["F", "D", "S", "HM", "PM", "SO"]);
  assert.equal(codes.find((entry) => entry.code === "HM").label, "Hors Mission");
  assert.equal(codes.find((entry) => entry.code === "SO").id, "sans_objet");
});

test("un vocabulaire différent est lu tel quel, sans être ramené à un autre", () => {
  const { codes } = discoverLegend("C: Conforme , NC: Non conforme , SO: Sans objet , HM: Hors mission");

  assert.deepEqual(codes.map((entry) => entry.code), ["C", "NC", "SO", "HM"]);
  assert.equal(codes.find((entry) => entry.code === "NC").label, "Non conforme");
});

test("aucun code n'est inventé quand le document n'en déclare pas", () => {
  const { codes } = discoverLegend("Un rapport sans légende.\nAvis favorable sur la charpente.");

  assert.deepEqual(codes, []);
});

test("deux couples ne font pas une légende : c'est une phrase ordinaire", () => {
  const { codes } = discoverLegend("Contact: Jean Dupont , Tel: 0102030405");

  assert.deepEqual(codes, []);
});

test("une légende répétée de page en page ne produit qu'un jeu de codes", () => {
  const { codes, lines } = discoverLegend([SOCOTEC_LEGEND, "…", SOCOTEC_LEGEND, "…", SOCOTEC_LEGEND].join("\n"));

  assert.equal(codes.length, 6);
  assert.equal(lines.length, 3);
});

test("isLegendLine reconnaît la ligne, espaces multiples compris", () => {
  const { lines } = discoverLegend(SOCOTEC_LEGEND);

  assert.equal(isLegendLine(`*  F: Favorable ,   D: Défavorable , S: Suspendu , HM: Hors Mission , PM: Pour Mémoire , SO: Sans Objet`, lines), true);
  assert.equal(isLegendLine("Une autre ligne", lines), false);
});

test("legendToLexicon garde le libellé et le code comme graphies acceptées", () => {
  const { codes } = discoverLegend(SOCOTEC_LEGEND);
  const lexicon = legendToLexicon(codes);

  assert.deepEqual(lexicon.find((entry) => entry.id === "favorable").labels, ["Favorable", "F"]);
});
