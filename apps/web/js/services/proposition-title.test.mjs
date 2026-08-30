import test from "node:test";
import assert from "node:assert/strict";

import { proposeTitle } from "./proposition-title.js";

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
