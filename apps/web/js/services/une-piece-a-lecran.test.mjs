/**
 * Ce qu'on montre d'une pièce jointe : quand elle date, si elle se regarde, et
 * laquelle on ouvre.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  cestUneImageAffichable, laDateDunePiece, lesLignesDuMessage, lesMessagesParId,
  lesPiecesAppariees, lextension
} from "./une-piece-a-lecran.js";

/* ── Ce qui se regarde ───────────────────────────────────────────────────── */

test("le type déclaré décide, quel que soit le format", () => {
  assert.equal(cestUneImageAffichable({ mimeType: "image/png" }), true);
  assert.equal(cestUneImageAffichable({ mimeType: "image/webp" }), true);
  assert.equal(cestUneImageAffichable({ mimeType: "image/svg+xml" }), true);
  assert.equal(cestUneImageAffichable({ mimeType: "application/pdf" }), false);
});

/**
 * **Une pièce versée avant qu'on garde le type n'en a pas.** L'extension est
 * alors tout ce qui reste ; l'ignorer rendrait ces photos-là inouvrables pour
 * toujours.
 */
test("sans type déclaré, l'extension rattrape", () => {
  assert.equal(cestUneImageAffichable({ fileName: "desordre-acrotere.JPG" }), true);
  assert.equal(cestUneImageAffichable({ name: "plan.webp" }), true);
  assert.equal(cestUneImageAffichable({ originalFilename: "relevé.tiff" }), true);
  assert.equal(cestUneImageAffichable({ fileName: "note.pdf" }), false);
  assert.equal(cestUneImageAffichable({ fileName: "sans-extension" }), false);
  assert.equal(cestUneImageAffichable(null), false);
});

/**
 * **Un type déclaré non-image ferme la question.** Sans cela, un `.pdf`
 * renommé `.png` s'ouvrirait comme une image et resterait noir.
 */
test("un type déclaré qui n'est pas une image l'emporte sur l'extension", () => {
  assert.equal(cestUneImageAffichable({ mimeType: "application/pdf", fileName: "plan.png" }), false);
});

test("l'extension se lit en minuscules, et pas dans un dossier", () => {
  assert.equal(lextension("Plan R+1.PDF"), "pdf");
  assert.equal(lextension("dossier.v2/plan"), "");
  assert.equal(lextension(""), "");
});

/* ── Quand elle date ─────────────────────────────────────────────────────── */

const LE_MESSAGE = { id: "m-1", mailQuand: "2026-03-12T08:14:00.000Z" };

/**
 * **La date du message, pas celle du dépôt.** Verser six mois de correspondance
 * en une fois donne six mois de pièces à la même seconde : trier là-dessus ne
 * range rien.
 */
test("une pièce prend la date de son message", () => {
  const parId = lesMessagesParId([LE_MESSAGE]);
  const dite = laDateDunePiece(
    { pieceDuMessage: "m-1", createdAt: "2026-09-30T10:00:00.000Z" }, parId);
  assert.equal(dite.quand, "2026-03-12T08:14:00.000Z");
  assert.equal(dite.duMessage, true);
});

/**
 * **Et l'on dit laquelle des deux on montre.** Une date de repli qui se lirait
 * comme une date sûre est pire que pas de date (règle 5).
 */
test("sans message connu, la date du dépôt — et on le dit", () => {
  const parId = lesMessagesParId([LE_MESSAGE]);
  const orpheline = laDateDunePiece(
    { pieceDuMessage: "m-inconnu", createdAt: "2026-09-30T10:00:00.000Z" }, parId);
  assert.equal(orpheline.quand, "2026-09-30T10:00:00.000Z");
  assert.equal(orpheline.duMessage, false);

  // Un message sans date lisible ne vaut pas mieux qu'un message inconnu.
  const sansDate = laDateDunePiece(
    { pieceDuMessage: "m-2", createdAt: "2026-09-30T10:00:00.000Z" },
    lesMessagesParId([{ id: "m-2", mailQuand: "" }]));
  assert.equal(sansDate.duMessage, false);
  assert.equal(sansDate.quand, "2026-09-30T10:00:00.000Z");
});

/* ── Laquelle on ouvre ───────────────────────────────────────────────────── */

/**
 * **Le fil est lu dans le fichier** : ses pièces sont des noms et des tailles,
 * pas des lignes de base. Sans appariement, on voit la pastille d'un plan sans
 * pouvoir l'ouvrir — la pire façon de montrer qu'un plan existe.
 */
test("une pièce du fichier retrouve sa ligne en base par son nom", () => {
  const appariees = lesPiecesAppariees(
    [{ nom: "plan-r+1.pdf", taille: 12 }, { nom: "photo.JPG", taille: 40 }],
    [{ id: "d-1", originalFilename: "plan-r+1.pdf" }, { id: "d-2", originalFilename: "photo.jpg" }]
  );
  assert.deepEqual(appariees.map((une) => une.id), ["d-1", "d-2"]);
  // Ce que le fichier portait n'est pas perdu au passage.
  assert.equal(appariees[0].taille, 12);
});

/**
 * **Une pièce sans ligne garde sa pastille**, et ne prétend pas s'ouvrir : la
 * faire disparaître ferait douter d'une pièce perdue.
 */
test("une pièce qu'aucune ligne ne porte reste affichée, sans lien", () => {
  const appariees = lesPiecesAppariees([{ nom: "absent.pdf" }], []);
  assert.equal(appariees.length, 1);
  assert.equal(appariees[0].id, "");
});

/**
 * **Deux pièces du même nom ne pointent pas sur la même ligne.** Un message en
 * porte souvent deux — `image001.png` et `image001.png`.
 */
test("deux pièces du même nom prennent deux lignes différentes", () => {
  const appariees = lesPiecesAppariees(
    [{ nom: "image001.png" }, { nom: "image001.png" }],
    [{ id: "d-1", originalFilename: "image001.png" }, { id: "d-2", originalFilename: "image001.png" }]
  );
  assert.deepEqual(appariees.map((une) => une.id), ["d-1", "d-2"]);
});

test("les lignes d'un message se retrouvent par le lien de la pièce", () => {
  const tous = [
    { id: "p-1", pieceDuMessage: "m-1" },
    { id: "p-2", pieceDuMessage: "m-2" },
    { id: "m-1" }
  ];
  assert.deepEqual(lesLignesDuMessage(tous, "m-1").map((un) => un.id), ["p-1"]);
  assert.deepEqual(lesLignesDuMessage(tous, ""), []);
  assert.deepEqual(lesLignesDuMessage(null, "m-1"), []);
});
