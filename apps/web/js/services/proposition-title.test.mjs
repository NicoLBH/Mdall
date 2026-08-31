import test from "node:test";
import assert from "node:assert/strict";

import { describePeriod, proposeTitle } from "./proposition-title.js";

/** Un fichier examiné, réduit à ce que le titre regarde. */
const doc = (kindLabel, kindLabelPlural, authorLabel = "SOCOTEC") => ({
  recognition: { kindLabel, kindLabelPlural, authorLabel }
});

const rapport = () => doc("Rapport d'étape", "Rapports d'étape");
const rict = () => doc("Rapport initial (RICT)", "Rapports initiaux (RICT)");
const fiche = () => doc("Fiche avis travaux", "Fiches avis travaux");

test("un lot d'une seule nature se dit en trois mots", () => {
  assert.equal(proposeTitle([rapport(), rapport(), rapport()]), "3 rapports d'étape — SOCOTEC");
});

test("un document seul garde le singulier", () => {
  assert.equal(proposeTitle([rict()]), "1 rapport initial (RICT) — SOCOTEC");
});

test("le pluriel vient du pack, jamais d'un « s » ajouté au premier mot", () => {
  // « Rapports initial (RICT) » est le genre de faute qu'une règle mécanique
  // produirait, et qu'on lirait à chaque dépôt.
  assert.match(proposeTitle([rict(), rict()]), /2 rapports initiaux \(RICT\)/);
});

test("deux natures se lisent « a et b », la plus nombreuse en tête", () => {
  const titre = proposeTitle([fiche(), rapport(), rapport(), rapport(), fiche()]);

  assert.equal(titre, "3 rapports d'étape et 2 fiches avis travaux — SOCOTEC");
});

test("au-delà de deux natures, on cesse d'énumérer", () => {
  // Un titre n'est pas un inventaire : le détail se lit dans la proposition.
  const titre = proposeTitle([rapport(), rapport(), fiche(), fiche(), rict(), doc("Attestation", "Attestations")]);

  assert.equal(titre, "2 rapports d'étape, 2 fiches avis travaux et 2 autres livrables — SOCOTEC");
});

test("l'émetteur n'est nommé que s'il n'y en a qu'un", () => {
  // Deux bureaux de contrôle dans un même lot méritent d'être lus dans le
  // détail, pas résumés à l'un d'eux.
  const melange = [rapport(), doc("Rapport d'étape", "Rapports d'étape", "APAVE")];

  assert.equal(proposeTitle(melange), "2 rapports d'étape");
});

test("les documents que personne n'a reconnus sont comptés à part", () => {
  const titre = proposeTitle([rapport(), rapport(), { recognition: null }, { recognition: null }]);

  assert.equal(titre, "2 rapports d'étape — SOCOTEC, et 2 autres documents");
});

test("un lot dont rien n'est reconnu se dit simplement", () => {
  assert.equal(proposeTitle([{ recognition: null }, { recognition: null }]), "Dépôt de 2 documents");
  assert.equal(proposeTitle([{ recognition: null }]), "Dépôt d'un document");
});

test("avant tout examen, le nombre de fichiers suffit", () => {
  // L'examen tourne en arrière-plan : le champ ne doit pas rester vide en
  // attendant, ni afficher un nom de fichier.
  assert.equal(proposeTitle([], { fallbackCount: 5 }), "Dépôt de 5 documents");
  assert.equal(proposeTitle([], { fallbackCount: 1 }), "Dépôt d'un document");
});

test("une reconnaissance sans pluriel retombe sur le singulier plutôt que d'inventer", () => {
  const sansPluriel = { recognition: { kindLabel: "Note de synthèse", authorLabel: "SOCOTEC" } };

  assert.equal(proposeTitle([sansPluriel, sansPluriel]), "2 note de synthèse — SOCOTEC");
});

/* ── Ce qui distingue vingt dépôts SOCOTEC les uns des autres ─────────────
   Le titre disait « 1 fiche avis travaux — SOCOTEC », vingt fois. On ne
   pouvait reconnaître une proposition qu'en l'ouvrant. La date d'émission est
   celle du document, pas celle du dépôt : deux lots déposés le même
   après-midi peuvent porter des rapports séparés de deux ans. */

const date = (kindLabel, kindLabelPlural, issuedAt, extra = {}) => ({
  recognition: { kindLabel, kindLabelPlural, authorLabel: "SOCOTEC", issuedAt, ...extra }
});

test("un document daté porte sa date dans le titre", () => {
  assert.equal(
    proposeTitle([date("Fiche avis travaux", "Fiches avis travaux", "2022-09-08")]),
    "1 fiche avis travaux — SOCOTEC, du 8 septembre 2022"
  );
});

test("plusieurs documents du même jour se disent au jour", () => {
  const lot = [
    date("Fiche avis travaux", "Fiches avis travaux", "2022-09-08"),
    date("Fiche avis travaux", "Fiches avis travaux", "2022-09-08")
  ];

  assert.equal(proposeTitle(lot), "2 fiches avis travaux — SOCOTEC, du 8 septembre 2022");
});

test("plusieurs dates d'un même mois se disent au mois", () => {
  const lot = [
    date("Rapport d'étape", "Rapports d'étape", "2024-06-03"),
    date("Rapport d'étape", "Rapports d'étape", "2024-06-21")
  ];

  assert.equal(proposeTitle(lot), "2 rapports d'étape — SOCOTEC, de juin 2024");
});

test("une période s'annonce comme une période", () => {
  const lot = [
    date("Rapport d'étape", "Rapports d'étape", "2024-03-04"),
    date("Rapport d'étape", "Rapports d'étape", "2024-06-21")
  ];

  assert.equal(proposeTitle(lot), "2 rapports d'étape — SOCOTEC, de mars à juin 2024");
});

test("une période à cheval sur deux années nomme les deux", () => {
  const lot = [
    date("Rapport d'étape", "Rapports d'étape", "2023-10-04"),
    date("Rapport d'étape", "Rapports d'étape", "2024-03-21")
  ];

  assert.equal(proposeTitle(lot), "2 rapports d'étape — SOCOTEC, d'octobre 2023 à mars 2024");
});

test("l'élision se lit : « d'octobre », jamais « de octobre »", () => {
  assert.equal(describePeriod(["2023-10-04", "2024-03-21"]), "d'octobre 2023 à mars 2024");
  assert.equal(describePeriod(["2023-03-04", "2024-06-21"]), "de mars 2023 à juin 2024");
});

test("sans date, le numéro déclaré repère le lot", () => {
  const lot = [
    {
      recognition: {
        kindLabel: "Fiche avis travaux",
        kindLabelPlural: "Fiches avis travaux",
        authorLabel: "SOCOTEC",
        declaredReference: "13860/0922/0069"
      }
    }
  ];

  assert.equal(proposeTitle(lot), "1 fiche avis travaux — SOCOTEC, n° 13860/0922/0069");
});

test("deux numéros différents ne repèrent plus rien : on n'en nomme aucun", () => {
  const avecNumero = (reference) => ({
    recognition: {
      kindLabel: "Fiche avis travaux",
      kindLabelPlural: "Fiches avis travaux",
      authorLabel: "SOCOTEC",
      declaredReference: reference
    }
  });

  assert.equal(proposeTitle([avecNumero("A"), avecNumero("B")]), "2 fiches avis travaux — SOCOTEC");
});

test("une date invalide n'invente pas de repère", () => {
  assert.equal(describePeriod(["pas une date"]), "");
  assert.equal(describePeriod([null, ""]), "");
});

test("sans émetteur nommé, le repère ouvre sa propre incise", () => {
  const lot = [
    { recognition: { kindLabel: "Rapport d'étape", kindLabelPlural: "Rapports d'étape", authorLabel: "SOCOTEC", issuedAt: "2024-06-03" } },
    { recognition: { kindLabel: "Rapport d'étape", kindLabelPlural: "Rapports d'étape", authorLabel: "APAVE", issuedAt: "2024-06-03" } }
  ];

  assert.equal(proposeTitle(lot), "2 rapports d'étape, du 3 juin 2024");
});

test("les documents non reconnus restent comptés après le repère", () => {
  const lot = [
    date("Rapport d'étape", "Rapports d'étape", "2024-06-03"),
    { recognition: null }
  ];

  assert.equal(proposeTitle(lot), "1 rapport d'étape — SOCOTEC, du 3 juin 2024, et 1 autre document");
});
