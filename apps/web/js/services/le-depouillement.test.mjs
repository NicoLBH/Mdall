import test from "node:test";
import assert from "node:assert/strict";

import {
  LES_DESTINATIONS, ceQuiIraOu, cheminDit, lePartageDuDepot, lesPiecesDistinctes,
  phraseDeLaConfidentialite, phraseDuProjet
} from "./le-depouillement.js";
import { DOSSIER_DES_MAILS, DOSSIER_DES_PIECES } from "./le-dossier-des-mails.js";

const unFichier = (name, size = 1) => ({ name, size });

test("le dépôt se partage en deux, et rien ne se perd", () => {
  const depot = [
    unFichier("un.msg"), unFichier("PLAN.pdf"), unFichier("historique.zip"),
    unFichier("CR-12.pdf"), unFichier("fil.eml")
  ];
  const { porteurs, ordinaires } = lePartageDuDepot(depot);

  assert.deepEqual(porteurs.map((un) => un.name), ["un.msg", "historique.zip", "fil.eml"]);
  assert.deepEqual(ordinaires.map((un) => un.name), ["PLAN.pdf", "CR-12.pdf"]);
  assert.equal(porteurs.length + ordinaires.length, depot.length);
});

test("un dépôt sans porteur ne fait pas de dépouillement", () => {
  const { porteurs, ordinaires } = lePartageDuDepot([unFichier("a.pdf"), unFichier("b.xlsx")]);
  assert.equal(porteurs.length, 0);
  assert.equal(ordinaires.length, 2);
});

/**
 * **La première de chaque empreinte, et le poids de ce qu'on évite.** Le même
 * plan attaché à quinze réponses est un fichier, et quatorze téléversements
 * qu'on ne fait pas.
 */
test("les pièces se dédoublonnent par l'empreinte, jamais par le nom", () => {
  const { distinctes, repetees, poidsEvite } = lesPiecesDistinctes([
    { nom: "Plan.pdf", empreinte: "aa", taille: 1000 },
    { nom: "Plan-v2.pdf", empreinte: "aa", taille: 1000 },
    { nom: "Plan.pdf", empreinte: "bb", taille: 2000 },
    { nom: "Autre.pdf", empreinte: "aa", taille: 1000 }
  ]);

  assert.deepEqual(distinctes.map((une) => une.nom), ["Plan.pdf", "Plan.pdf"]);
  assert.deepEqual(distinctes.map((une) => une.empreinte), ["aa", "bb"]);
  assert.equal(repetees, 2);
  assert.equal(poidsEvite, 2000);
});

/**
 * **Sans empreinte, jamais « déjà vu ».** Une page servie sans TLS n'a pas
 * `crypto.subtle` : traiter « je ne sais pas » comme « c'est le même » ferait
 * disparaître des pièces sans que rien ne le dise (règle 5).
 */
test("une pièce sans empreinte part toujours, même en plusieurs exemplaires", () => {
  const { distinctes, repetees } = lesPiecesDistinctes([
    { nom: "a.pdf", empreinte: "", taille: 10 },
    { nom: "a.pdf", empreinte: "", taille: 10 },
    { nom: "b.pdf", empreinte: null, taille: 10 }
  ]);

  assert.equal(distinctes.length, 3);
  assert.equal(repetees, 0);
});

test("les destinations annoncées sont dans le dossier privé, les deux", () => {
  for (const une of LES_DESTINATIONS) {
    assert.equal(une.chemin[0], DOSSIER_DES_MAILS, une.cle);
  }
  const pieces = LES_DESTINATIONS.find((une) => une.cle === "pieces");
  assert.deepEqual(pieces.chemin, [DOSSIER_DES_MAILS, DOSSIER_DES_PIECES]);
});

test("un chemin se lit avec ses dossiers séparés", () => {
  assert.equal(cheminDit([DOSSIER_DES_MAILS, DOSSIER_DES_PIECES]), "Mails / Pièces jointes");
  assert.equal(cheminDit([DOSSIER_DES_MAILS]), "Mails");
  assert.equal(cheminDit([]), "");
});

test("ce qui ira où se compte, et se pèse", () => {
  const ou = ceQuiIraOu({ messages: 187, pieces: 42, poidsDesPieces: 1_200_000 });

  assert.deepEqual(ou.map((une) => une.cle), ["messages", "pieces"]);
  assert.equal(ou[0].dit, "187 messages");
  assert.match(ou[1].dit, /^42 pièces jointes \(1,2 Mo\)$/);
});

/**
 * **Un dossier qui restera vide ne s'annonce pas.** Promettre « Pièces
 * jointes » pour un dépôt de messages sans pièce ferait chercher un dossier qui
 * n'existera pas.
 */
test("une destination sans rien à recevoir n'est pas annoncée", () => {
  const ou = ceQuiIraOu({ messages: 3, pieces: 0 });
  assert.deepEqual(ou.map((une) => une.cle), ["messages"]);

  assert.deepEqual(ceQuiIraOu({ messages: 0, pieces: 0 }), []);
  assert.deepEqual(ceQuiIraOu(), []);
});

test("le singulier et le pluriel s'accordent des deux côtés", () => {
  const un = ceQuiIraOu({ messages: 1, pieces: 1, poidsDesPieces: 0 });
  assert.equal(un[0].dit, "1 message");
  assert.equal(un[1].dit, "1 pièce jointe");
});

/**
 * **La phrase nomme l'équipe, et dit comment sortir.** « Privé » tout seul
 * laisse deviner de qui on se protège, et un régime dont on ne sait pas sortir
 * se contourne en ne l'utilisant pas.
 */
test("la phrase du régime dit les deux moitiés, et le geste qui partage", () => {
  const dite = phraseDeLaConfidentialite();
  // **Le dossier se voit, son contenu non.** N'en dire qu'une moitié laisse
  // croire à l'autre : « tout va dans Mails, vous seul y avez accès » promettait
  // que le dossier lui-même était caché, ce qu'il n'est plus.
  assert.match(dite, /visible par\s+l'équipe/);
  assert.match(dite, /vous seul verrez ce que vous y déposez/);
  assert.match(dite, /déplacez/);
  assert.match(dite, new RegExp(DOSSIER_DES_MAILS));
});

test("le projet du dépouillement se dit, et ne dit pas les zéros", () => {
  assert.equal(phraseDuProjet({ fichiers: 1, messages: 1, pieces: 0 }), "1 fichier déposé · 1 message");
  assert.equal(
    phraseDuProjet({ fichiers: 3, messages: 187, pieces: 42, poidsDesPieces: 1_200_000 }),
    "3 fichiers déposés · 187 messages · 42 pièces jointes (1,2 Mo)"
  );
  assert.doesNotMatch(phraseDuProjet({ fichiers: 2, messages: 5, pieces: 0 }), /0 /);
  assert.equal(phraseDuProjet({ fichiers: 0, messages: 0, pieces: 0 }), "");
  assert.equal(phraseDuProjet(), "");
});
