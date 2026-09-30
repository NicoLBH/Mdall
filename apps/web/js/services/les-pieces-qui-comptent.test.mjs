import test from "node:test";
import assert from "node:assert/strict";

import {
  lesPiecesDuFil, lesPiecesQuiComptent, phraseDesPiecesCachees
} from "./les-pieces-qui-comptent.js";

/** Ce que le fil réel portait : onze pièces, deux qui comptent. */
const LES_ONZE = [
  { nom: "image001.png", taille: 1200, dansLeTexte: true },
  { nom: "image002.png", taille: 900, dansLeTexte: true },
  { nom: "image003.png", taille: 1100, dansLeTexte: true },
  { nom: "image004.png", taille: 1500, dansLeTexte: true },
  { nom: "image005.png", taille: 800, dansLeTexte: true },
  { nom: "image006.png", taille: 700, dansLeTexte: true },
  { nom: "image007.png", taille: 640, dansLeTexte: true },
  { nom: "image009.png", taille: 980, dansLeTexte: true },
  { nom: "image011.png", taille: 1020, dansLeTexte: true },
  { nom: "bon de commande socotec.pdf", taille: 221_000 },
  { nom: "23-154-PP-003-f BPAURA Chamonix.pdf", taille: 1_048_576 }
];

test("neuf morceaux de logo ne sont pas neuf pièces jointes", () => {
  const { gardees, cachees } = lesPiecesQuiComptent(LES_ONZE);
  assert.deepEqual(gardees.map((une) => une.nom),
    ["bon de commande socotec.pdf", "23-154-PP-003-f BPAURA Chamonix.pdf"]);
  assert.equal(cachees.length, 9);
});

/**
 * **On ne devine pas sur le nom.** La photo d'un désordre appelée
 * `image012.png` est exactement ce qu'on veut voir.
 */
test("une pièce que le message ne déclare pas compte", () => {
  const { gardees, cachees } = lesPiecesQuiComptent([
    { nom: "image012.png", taille: 2_000_000 },
    { nom: "image013.png", taille: 1_000, dansLeTexte: false }
  ]);
  assert.equal(gardees.length, 2);
  assert.equal(cachees.length, 0);
});

test("« ne pas savoir » n'est pas « non »", () => {
  // `undefined` veut dire que le message n'a rien dit — un `.eml` sans corps
  // HTML est dans ce cas, et ses pièces comptent.
  const { gardees } = lesPiecesQuiComptent([{ nom: "plan.pdf", taille: 10, dansLeTexte: undefined }]);
  assert.equal(gardees.length, 1);
});

test("ce qu'on ne nomme pas se compte, et se dit", () => {
  assert.equal(phraseDesPiecesCachees(new Array(9)), "et 9 images de mise en page");
  assert.equal(phraseDesPiecesCachees(new Array(1)), "et 1 image de mise en page");
  // Une phrase « et 0 image » serait du bruit.
  assert.equal(phraseDesPiecesCachees([]), "");
  assert.equal(phraseDesPiecesCachees(null), "");
});

test("une pièce sans nom en reçoit un plutôt que de disparaître", () => {
  const { gardees } = lesPiecesQuiComptent([{ taille: 12 }]);
  assert.deepEqual(gardees, [{ nom: "sans nom", taille: 12, type: "", id: "" }]);
});

test("un même plan attaché à trois réponses ne se montre qu'une fois", () => {
  const pieces = lesPiecesDuFil([
    { quand: "2025-02-20T09:00:00Z", pieces: [{ nom: "plan.pdf", taille: 500 }] },
    { quand: "2025-02-21T09:00:00Z", pieces: [{ nom: "plan.pdf", taille: 500 }] },
    { quand: "2025-02-22T09:00:00Z", pieces: [{ nom: "plan.pdf", taille: 900 }] }
  ]);
  // Le troisième porte le même nom mais pas la même taille : ce n'est pas le
  // même fichier.
  assert.equal(pieces.length, 2);
  assert.deepEqual(pieces.map((une) => une.taille), [500, 900]);
});

test("les images de mise en page ne remontent pas dans les pièces du fil", () => {
  const pieces = lesPiecesDuFil([{ quand: "2025-02-20T09:00:00Z", pieces: LES_ONZE }]);
  assert.equal(pieces.length, 2);
  assert.equal(pieces.every((une) => !une.nom.startsWith("image0")), true);
});

test("rien n'entre, rien ne sort", () => {
  assert.deepEqual(lesPiecesQuiComptent([]), { gardees: [], cachees: [] });
  assert.deepEqual(lesPiecesQuiComptent(null), { gardees: [], cachees: [] });
  assert.deepEqual(lesPiecesDuFil(null), []);
});

/**
 * **L'identifiant de la ligne survit au rangement.**
 *
 * `uneFois` recompose chaque pièce champ par champ — c'est ce qui la normalise
 * — et il jetait donc l'identifiant que `lesPiecesAppariees` venait d'y poser.
 * Aucune épreuve ne l'a vu : les deux modules étaient justes séparément. Le
 * banc, lui, a montré deux pastilles mortes.
 */
test("une pièce garde l'identifiant de sa ligne en base", () => {
  const { gardees } = lesPiecesQuiComptent([
    { nom: "plan.pdf", taille: 12, id: "d-1" },
    { nom: "sans-ligne.pdf", taille: 4 }
  ]);
  assert.equal(gardees[0].id, "d-1");
  // Une pièce qu'aucune ligne ne porte vaut `""`, et non `undefined` : l'écran
  // décide d'en faire un bouton ou non, et il ne doit pas avoir à distinguer
  // deux façons de ne rien avoir.
  assert.equal(gardees[1].id, "");
});
