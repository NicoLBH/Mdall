import test from "node:test";
import assert from "node:assert/strict";

import { passerLesControles, resumeDesControles, CONTROLES, ISSUE } from "./depot-controles.js";

const issueDe = (rendu, id) => rendu.lignes.find((ligne) => ligne.id === id).issue;

const CONTEXTE = {
  depot: { affirmations: 3, provenance: "verifie", pourquoi: "" },
  conflits: [],
  blocage: "",
  documents: [{ id: "d1" }],
  unreachable: [],
  analyseFaite: true,
  pile: "moteur v3 · incendie v2",
  avis: 4,
  avisHorsDepot: 0
};

test("un dépôt complet tient tous ses contrôles", () => {
  const rendu = passerLesControles(CONTEXTE);
  assert.equal(rendu.bilan.tenu, CONTROLES.length);
  assert.equal(rendu.bloque, false);
});

test("une provenance non établie retient la fusion", () => {
  const rendu = passerLesControles({
    ...CONTEXTE,
    depot: { affirmations: 3, provenance: "partiel", pourquoi: "1 affirmation ne dit pas d'où elle vient." }
  });

  assert.equal(issueDe(rendu, "provenance"), ISSUE.NON_TENU);
  assert.equal(rendu.bloque, true);
});

test("un livrable non rapatrié n'est ni un succès ni un échec : il n'est pas vérifiable", () => {
  const rendu = passerLesControles({ ...CONTEXTE, unreachable: [{ original_filename: "R.pdf" }] });

  assert.equal(issueDe(rendu, "lecture"), ISSUE.NON_VERIFIABLE);
  // Ne pas savoir ne bloque pas éternellement : cela s'affiche, et l'humain
  // décide s'il signe sans savoir.
  assert.equal(rendu.bloque, false);
});

test("un contrôle qui ne s'applique pas se déclare sans objet, il n'échoue pas", () => {
  const rendu = passerLesControles({ ...CONTEXTE, documents: [], depot: { affirmations: 0 } });

  assert.equal(issueDe(rendu, "lecture"), ISSUE.SANS_OBJET);
  assert.equal(issueDe(rendu, "avis"), ISSUE.SANS_OBJET);
  assert.equal(issueDe(rendu, "provenance"), ISSUE.SANS_OBJET);
  assert.equal(rendu.bloque, false);
});

test("tant que l'analyse tourne, aucun contrôle ne se déclare tenu", () => {
  const rendu = passerLesControles({ ...CONTEXTE, enCours: true });

  assert.equal(rendu.bilan["en-cours"], CONTROLES.length);
  assert.equal(rendu.bilan.tenu, 0);
  assert.match(resumeDesControles(rendu), /en attente/i);
});

test("une contradiction non tranchée retient la fusion", () => {
  const rendu = passerLesControles({ ...CONTEXTE, blocage: "2 affirmations en attente d'arbitrage" });

  assert.equal(issueDe(rendu, "memoire"), ISSUE.NON_TENU);
  assert.equal(rendu.bloque, true);
});

test("un référentiel inconnu se dit non vérifiable plutôt que de se taire", () => {
  const rendu = passerLesControles({ ...CONTEXTE, pile: "" });
  assert.equal(issueDe(rendu, "referentiel"), ISSUE.NON_VERIFIABLE);
});

test("les avis du corpus écartés du dépôt se disent dans le contrôle", () => {
  const rendu = passerLesControles({ ...CONTEXTE, avis: 4, avisHorsDepot: 485 });
  const ligne = rendu.lignes.find((l) => l.id === "avis");

  assert.equal(ligne.issue, ISSUE.TENU);
  assert.match(ligne.detail, /485 avis du corpus ne lui sont pas attribués/);
});

test("un contrôle qui jette n'emporte pas les autres", () => {
  const casse = { id: "casse", label: "Casse", bloquant: false, verifier: () => { throw new Error("boum"); } };
  CONTROLES.push(casse);
  try {
    const rendu = passerLesControles(CONTEXTE);
    assert.equal(issueDe(rendu, "casse"), ISSUE.NON_VERIFIABLE);
    assert.equal(rendu.bilan.tenu, CONTROLES.length - 1);
  } finally {
    CONTROLES.pop();
  }
});

test("le résumé met ce qui ne va pas en tête", () => {
  const rendu = passerLesControles({ ...CONTEXTE, pile: "", unreachable: [{}] });
  assert.match(resumeDesControles(rendu), /^2 non vérifiables/);
});
