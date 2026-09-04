import test from "node:test";
import assert from "node:assert/strict";

import { messageQuiADemande } from "./fil.js";

const QUESTION = { role: "user", content: "dimensionne les massifs" };
const DEMANDE = {
  role: "assistant", content: "Il me manque la contrainte admissible du sol.",
  executions: [{ statut: "manquant", outil: "fondations_predimensionnement_V1" }]
};

test("le rang que le formulaire porte l'emporte", () => {
  const fil = [QUESTION, DEMANDE, { role: "assistant", content: "autre chose" }];
  assert.equal(messageQuiADemande(fil, 2), fil[2]);
  assert.equal(messageQuiADemande(fil, 1), fil[1]);
});

test("un rang qui désigne l'utilisateur n'est pas retenu", () => {
  // On ne reprend pas la question de quelqu'un pour y écrire une réponse.
  const fil = [QUESTION, DEMANDE];
  assert.equal(messageQuiADemande(fil, 0), DEMANDE);
});

test("sans rang, c'est la demande restée ouverte", () => {
  const fil = [QUESTION, { role: "assistant", content: "un calcul", executions: [{ statut: "fait" }] }, DEMANDE];
  assert.equal(messageQuiADemande(fil, null), DEMANDE);
  assert.equal(messageQuiADemande(fil, Number.NaN), DEMANDE);
});

test("un fil qui a perdu ses calculs reprend quand même le dernier message du copilote", () => {
  // C'est le cas qui produisait deux bulles. Une discussion relue depuis la
  // base ne porte que le rôle et le texte : plus de formulaire, plus de
  // résultat, et le rang peut ne plus rien désigner. On répond malgré tout dans
  // le message du copilote — c'est à lui qu'on répond.
  const fil = [
    QUESTION,
    { role: "assistant", content: "Il me manque la contrainte admissible du sol." }
  ];
  const repris = messageQuiADemande(fil, Number.NaN);
  assert.equal(repris, fil[1]);
  assert.equal(repris.role, "assistant");
});

test("un rang hors du fil ne fait pas ouvrir un message neuf", () => {
  const fil = [QUESTION, { role: "assistant", content: "une réponse" }];
  assert.equal(messageQuiADemande(fil, 7), fil[1]);
});

test("un fil sans copilote ne rend rien, plutôt que n'importe quoi", () => {
  assert.equal(messageQuiADemande([QUESTION], null), null);
  assert.equal(messageQuiADemande([], 0), null);
  assert.equal(messageQuiADemande(null, 0), null);
});
