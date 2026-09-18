import test from "node:test";
import assert from "node:assert/strict";

import { ceQueLePointAExamine } from "./ce-que-le-point-a-examine.js";

const POINT = { id: "p-1" };

const message = (id, plus = {}) => ({
  id, subject_id: "p-1", body_markdown: "voici la note",
  created_at: "2026-03-12T10:00:00Z", visibility: "normal", deleted_at: null, ...plus
});

const jointe = (id, nom, messageId, plus = {}) => ({
  id, subject_id: "p-1", message_id: messageId, file_name: nom,
  created_at: "2026-03-12T10:00:00Z", deleted_at: null, ...plus
});

/* ── Ce qu'on a regardé ──────────────────────────────────────────────────── */

test("un document versé dans la discussion a été examiné", () => {
  // Quand on débat d'une profondeur de fondation, l'étude géotechnique est
  // jointe au fil : c'est précisément ce qu'on est allé regarder.
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1")],
    piecesJointes: [jointe("a-1", "etude-geotechnique.pdf", "m-1")]
  });

  assert.deepEqual(dit, [{ quoi: "etude-geotechnique.pdf", ou: "" }]);
});

test("ils se lisent dans l'ordre où ils sont entrés dans la discussion", () => {
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1"), message("m-2", { created_at: "2026-04-02T10:00:00Z" })],
    piecesJointes: [
      jointe("a-2", "releve-topo.pdf", "m-2", { created_at: "2026-04-02T10:00:00Z" }),
      jointe("a-1", "etude-geotechnique.pdf", "m-1")
    ]
  });

  assert.deepEqual(dit.map((e) => e.quoi), ["etude-geotechnique.pdf", "releve-topo.pdf"]);
});

test("le même document joint deux fois n'a été regardé qu'une fois", () => {
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1"), message("m-2")],
    piecesJointes: [
      jointe("a-1", "etude-geotechnique.pdf", "m-1"),
      jointe("a-2", "etude-geotechnique.pdf", "m-2")
    ]
  });

  assert.equal(dit.length, 1);
});

/* ── Les trois refus ─────────────────────────────────────────────────────── */

test("une pièce jointe à un échange avec le copilote ne se montre jamais", () => {
  // Ces conversations sont privées par construction, et le seul nom de fichier
  // d'un document qu'on y a déposé suffirait à trahir ce qui s'y est dit.
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-prive", { visibility: "ephemeral" })],
    piecesJointes: [jointe("a-1", "note-confidentielle.pdf", "m-prive")]
  });

  assert.deepEqual(dit, []);
});

test("une pièce jointe à un message effacé ne se montre pas non plus", () => {
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1", { deleted_at: "2026-03-13T10:00:00Z" })],
    piecesJointes: [jointe("a-1", "brouillon.pdf", "m-1")]
  });

  assert.deepEqual(dit, []);
});

test("un dépôt que personne n'a posté ne compte pas", () => {
  // Une pièce sans `message_id` est un envoi en cours : le fichier existe,
  // personne ne l'a mis dans la discussion. Dire « on a examiné ceci » d'un
  // brouillon serait faux.
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1")],
    piecesJointes: [jointe("a-1", "en-cours.pdf", null, { upload_session_id: "u-1" })]
  });

  assert.deepEqual(dit, []);
});

test("un message qu'on n'a pas lu ne se juge pas", () => {
  // Sans les messages, on ne peut pas savoir lesquels étaient privés. Montrer
  // dans le doute est exactement ce qu'on ne fait pas : l'étape reste creuse et
  // le dit (règle 5).
  //
  // `null` autant que `[]` : c'est la forme qu'une lecture ratée rend, et c'est
  // **ici** que la ligne tient — l'appelant qui vérifierait de son côté ajoute
  // une ceinture, il ne la remplace pas.
  const pieces = [jointe("a-1", "etude-geotechnique.pdf", "m-1")];

  assert.deepEqual(ceQueLePointAExamine({ point: POINT, messages: [], piecesJointes: pieces }), []);
  assert.deepEqual(ceQueLePointAExamine({ point: POINT, messages: null, piecesJointes: pieces }), []);
});

test("une pièce retirée ne parle plus", () => {
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1")],
    piecesJointes: [jointe("a-1", "retire.pdf", "m-1", { deleted_at: "2026-03-14T10:00:00Z" })]
  });

  assert.deepEqual(dit, []);
});

test("les pièces d'un autre point ne remontent pas", () => {
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1")],
    piecesJointes: [jointe("a-1", "ailleurs.pdf", "m-1", { subject_id: "p-autre" })]
  });

  assert.deepEqual(dit, []);
});

test("une pièce sans nom de fichier ne se dit pas", () => {
  // Une ligne vide dans « Examine » se lirait comme un document dont on aurait
  // perdu le nom : c'est moins qu'un trou nommé.
  const dit = ceQueLePointAExamine({
    point: POINT,
    messages: [message("m-1")],
    piecesJointes: [jointe("a-1", "   ", "m-1")]
  });

  assert.deepEqual(dit, []);
});

test("sans rien, rien ne se dit — et sans casser", () => {
  assert.deepEqual(ceQueLePointAExamine(), []);
  assert.deepEqual(ceQueLePointAExamine({ point: POINT }), []);
});
