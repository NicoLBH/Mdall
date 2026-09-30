import test from "node:test";
import assert from "node:assert/strict";

import {
  cestUneImage, cestUnePieceJointe, laGalerie, lesPiecesRegardables,
  phraseDeLaGalerie, phraseDesSansProvenance
} from "./la-galerie-des-pieces.js";

const piece = (dessus = {}) => ({
  id: "p", name: "PLAN.pdf", mimeType: "application/pdf",
  pieceDansLeTexte: false, pieceDuMessage: "m1", createdAt: "2026-09-30T10:00:00Z", ...dessus
});
const message = (dessus = {}) => ({
  id: "m1", mailQuand: "2026-03-12T08:14:00Z",
  mailDe: "Ourdine Ferrand (o.ferrand@novaclim.example)",
  mailObjet: "Étanchéité toiture", ...dessus
});

/** **Le type déclaré, pas l'extension.** Une photo arrive parfois sans extension. */
test("une image se reconnaît à son type, pas à son nom", () => {
  assert.equal(cestUneImage({ mimeType: "image/jpeg" }), true);
  assert.equal(cestUneImage({ mimeType: "IMAGE/PNG" }), true);
  assert.equal(cestUneImage({ mimeType: "application/pdf", name: "photo.jpg" }), false);
  assert.equal(cestUneImage(null), false);
});

test("une pièce jointe se distingue d'un document ordinaire", () => {
  assert.equal(cestUnePieceJointe(piece()), true);
  assert.equal(cestUnePieceJointe(piece({ pieceDansLeTexte: true })), true);
  assert.equal(cestUnePieceJointe({ name: "CR-12.pdf" }), false);
  assert.equal(cestUnePieceJointe({ pieceDansLeTexte: null }), false);
});

/**
 * **Les images du corps noieraient la galerie.** Huit exemplaires du même logo
 * par message, et l'on ne verrait plus les photos de chantier.
 */
test("les signatures et bandeaux n'entrent pas dans la galerie", () => {
  const dedans = lesPiecesRegardables([
    piece({ id: "a" }),
    piece({ id: "logo", pieceDansLeTexte: true, mimeType: "image/png" }),
    { id: "cr", name: "CR-12.pdf" }
  ]);
  assert.deepEqual(dedans.map((une) => une.id), ["a"]);
});

/**
 * **Ne pas savoir n'autorise pas à écarter** (règle 5). Une pièce déposée avant
 * qu'on garde cette information entre : l'écarter ferait disparaître des plans.
 */
test("une pièce dont on ignore la nature entre quand même", () => {
  const dedans = lesPiecesRegardables([piece({ id: "vieille", pieceDansLeTexte: false })]);
  assert.equal(dedans.length, 1);
});

/**
 * **La date est celle du message, pas celle du dépôt.** Deux cents mails
 * déposés le même jour porteraient tous la même, et l'on ne retrouverait rien.
 */
test("une pièce porte la date de son message, et de qui il vient", () => {
  const { documents } = laGalerie([piece()], [message()]);
  assert.equal(documents[0].quand, "2026-03-12T08:14:00Z");
  assert.equal(documents[0].quandEstCelleDuMessage, true);
  assert.match(documents[0].de, /Ourdine Ferrand/);
  assert.equal(documents[0].objet, "Étanchéité toiture");
});

test("sans message connu, la pièce porte la date de son dépôt et le dit", () => {
  const { documents } = laGalerie([piece({ pieceDuMessage: null })], [message()]);
  assert.equal(documents[0].quand, "2026-09-30T10:00:00Z");
  assert.equal(documents[0].quandEstCelleDuMessage, false);
});

test("les photos et les documents ne se mélangent pas", () => {
  const galerie = laGalerie([
    piece({ id: "photo", mimeType: "image/jpeg" }),
    piece({ id: "plan", mimeType: "application/pdf" })
  ], [message()]);

  assert.deepEqual(galerie.images.map((une) => une.id), ["photo"]);
  assert.deepEqual(galerie.documents.map((une) => une.id), ["plan"]);
});

test("chaque famille va du plus récent au plus ancien", () => {
  const galerie = laGalerie([
    piece({ id: "vieux", pieceDuMessage: "m-vieux" }),
    piece({ id: "neuf", pieceDuMessage: "m-neuf" })
  ], [
    message({ id: "m-vieux", mailQuand: "2026-01-02T08:00:00Z" }),
    message({ id: "m-neuf", mailQuand: "2026-08-02T08:00:00Z" })
  ]);
  assert.deepEqual(galerie.documents.map((une) => une.id), ["neuf", "vieux"]);
});

/**
 * **Ce qui n'a pas de date lisible passe à la fin.** Lui inventer un moment le
 * mettrait au milieu des autres sans qu'on sache pourquoi.
 */
test("une pièce sans date lisible ne s'intercale pas", () => {
  const galerie = laGalerie([
    piece({ id: "sansDate", pieceDuMessage: null, createdAt: "" }),
    piece({ id: "date", pieceDuMessage: "m1" })
  ], [message()]);
  assert.deepEqual(galerie.documents.map((une) => une.id), ["date", "sansDate"]);
});

test("la galerie se dit, et ne dit pas les zéros", () => {
  assert.equal(phraseDeLaGalerie({ images: [1, 2], documents: [] }), "2 photos");
  assert.equal(phraseDeLaGalerie({ images: [], documents: [1] }), "1 document");
  assert.equal(phraseDeLaGalerie({ images: [1], documents: [1, 2] }), "1 photo · 2 documents");
  assert.equal(phraseDeLaGalerie({ images: [], documents: [] }), "");
  assert.equal(phraseDeLaGalerie(null), "");
});

/**
 * **On ne se tait pas sur une provenance manquante.** Une date de dépôt
 * présentée comme une date de message ferait chercher un échange qui n'existe
 * pas à ce moment-là (règle 5).
 */
test("les pièces sans provenance se comptent, et s'accordent", () => {
  const une = laGalerie([piece({ pieceDuMessage: null })], []);
  assert.match(phraseDesSansProvenance(une), /^1 pièce ne sait pas de quel message elle vient/);

  const deux = laGalerie(
    [piece({ id: "a", pieceDuMessage: null }), piece({ id: "b", pieceDuMessage: null })], []);
  assert.match(phraseDesSansProvenance(deux), /^2 pièces ne savent pas/);

  assert.equal(phraseDesSansProvenance(laGalerie([piece()], [message()])), "");
});
