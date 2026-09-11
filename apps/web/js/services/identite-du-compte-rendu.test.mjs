import test from "node:test";
import assert from "node:assert/strict";

import {
  identiteDuCompteRendu, numeroDuCompteRendu, tenueLeDuCompteRendu
} from "./identite-du-compte-rendu.js";

/* ── Le numéro, tel que les comptes rendus l'écrivent ────────────────────── */

test("« COMPTE RENDU DE RÉUNION N° 14 »", () => {
  assert.equal(numeroDuCompteRendu("COMPTE RENDU DE RÉUNION N° 14\nObjet : suivi de chantier"), "14");
});

test("« CR n°3 », sans espace", () => {
  assert.equal(numeroDuCompteRendu("CR n°3 — réunion de chantier"), "3");
});

test("« Procès-verbal n° 7 »", () => {
  assert.equal(numeroDuCompteRendu("Procès-verbal n° 7 de la réunion de chantier"), "7");
});

test("« Réunion de chantier n° 22 »", () => {
  assert.equal(numeroDuCompteRendu("RÉUNION DE CHANTIER N° 22"), "22");
});

/**
 * **Le piège qu'un compte rendu tend à chaque page.** Il est plein de nombres :
 * des lots, des articles, des cotes, des numéros de point. Prendre le premier
 * venu donnerait « compte rendu n° 3 » pour « Lot n° 3 », et deux comptes rendus
 * successifs porteraient le même numéro — la ligne « du n° 3 au n° 3 » ne
 * voudrait plus rien dire.
 */
test("un numéro de lot n'est pas un numéro de compte rendu", () => {
  assert.equal(numeroDuCompteRendu("Lot n° 3 : Démolition\nLot n° 4 : Gros œuvre"), "");
});

test("un numéro de point non plus", () => {
  assert.equal(numeroDuCompteRendu("12.02.1 Reprise de l'étanchéité\n12.02.2 Calfeutrement"), "");
});

test("le numéro doit rester collé à ce qui l'annonce", () => {
  // Une page entière entre « compte rendu » et un « n° » quelconque : ce n'est
  // plus le numéro du compte rendu.
  const loin = `Compte rendu${"\n".repeat(3)}${"x".repeat(200)} n° 9`;
  assert.equal(numeroDuCompteRendu(loin), "");
});

test("sans rien à lire, le numéro reste vide", () => {
  assert.equal(numeroDuCompteRendu(""), "");
  assert.equal(numeroDuCompteRendu(null), "");
  assert.equal(numeroDuCompteRendu("Un document quelconque"), "");
});

/* ── La date de la réunion ───────────────────────────────────────────────── */

test("« Réunion du 12/03/2026 »", () => {
  assert.equal(tenueLeDuCompteRendu("Réunion du 12/03/2026"), "2026-03-12");
});

test("« Réunion du 12 mars 2026 », en lettres", () => {
  assert.equal(tenueLeDuCompteRendu("Compte rendu de la réunion du 12 mars 2026"), "2026-03-12");
});

test("« Date : 08.09.2026 »", () => {
  assert.equal(tenueLeDuCompteRendu("Date : 08.09.2026\nPrésents :"), "2026-09-08");
});

test("le 1er du mois s'écrit comme les autres", () => {
  assert.equal(tenueLeDuCompteRendu("Réunion du 1er août 2026"), "2026-08-01");
});

/**
 * **La date de la prochaine réunion est une date future.** La prendre daterait
 * le compte rendu d'une réunion qui n'a pas eu lieu, et le rangerait après
 * celui qui le suit.
 */
test("la prochaine réunion ne date pas le compte rendu", () => {
  assert.equal(tenueLeDuCompteRendu("Prochaine réunion : 19/03/2026"), "");
});

/**
 * Les échéances des points sont des dates elles aussi, et il y en a trente. On
 * ne lit donc que ce qui suit **immédiatement** une annonce.
 */
test("une échéance de point n'est pas la date de la réunion", () => {
  assert.equal(
    tenueLeDuCompteRendu("Lot n° 3 : reprise de l'étanchéité — pour le 30/04/2026"),
    ""
  );
});

test("une date impossible n'en est pas une", () => {
  assert.equal(tenueLeDuCompteRendu("Réunion du 45/13/2026"), "");
});

test("sans date annoncée, on ne dit rien", () => {
  assert.equal(tenueLeDuCompteRendu("COMPTE RENDU DE RÉUNION N° 14"), "");
  assert.equal(tenueLeDuCompteRendu(""), "");
});

/* ── Les deux ensemble ───────────────────────────────────────────────────── */

test("un compte rendu réel dit les deux", () => {
  const document = [
    "MAÎTRE D'ŒUVRE",
    "COMPTE RENDU DE RÉUNION N° 14",
    "Objet : suivi de chantier",
    "Réunion du 12/03/2026",
    "Présents : ...",
    "Lot n° 3 : Gros œuvre",
    "Prochaine réunion : 19/03/2026"
  ].join("\n");

  assert.deepEqual(identiteDuCompteRendu(document), { numero: "14", tenueLe: "2026-03-12" });
});

/**
 * **Règle 5.** Un compte rendu qui ne se nomme pas rend deux chaînes vides, et
 * c'est une réponse. Un numéro déduit d'un rang dans une liste ferait écrire
 * « du n° 14 au n° 15 » sur deux documents qui n'ont rien à voir.
 */
test("un document muet rend deux réponses vides, pas une invention", () => {
  assert.deepEqual(identiteDuCompteRendu("Un texte sans en-tête"), { numero: "", tenueLe: "" });
});
