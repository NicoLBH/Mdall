import test from "node:test";
import assert from "node:assert/strict";

import {
  corpsDuMessage, titreDuSujet, descriptionDuSujet, messagesACommenter, origineDuMessage
} from "./copilote-en-sujet.js";

const DISCUSSION = {
  id: "c1",
  title: "Hors gel du site",
  messages: [
    { role: "user", content: "quelle profondeur hors gel pour ce projet ?", ts: "2026-09-04T19:58:00Z" },
    { role: "assistant", content: "0,99 m — H0 0,45 m, altitude 241 m.", ts: "2026-09-04T19:58:30Z" },
    { role: "user", content: "et à 450 m d'altitude ?", ts: "2026-09-04T20:01:00Z" }
  ]
};

test("le titre est celui de la discussion, y compris renommée", () => {
  assert.equal(titreDuSujet(DISCUSSION), "Hors gel du site");
  // Sans nom donné, c'est la première question qui nomme la discussion dans le
  // rail : le sujet porte le même nom, sans qu'on ait à renommer deux fois.
  assert.equal(
    titreDuSujet({ messages: [{ role: "user", content: "quelle profondeur hors gel ?" }] }),
    "quelle profondeur hors gel ?");
});

test("la description du sujet est la première question, telle qu'elle a été posée", () => {
  // Pas une notice d'utilisation de l'application : c'est le premier bloc,
  // modifiable et versionné, celui que l'équipe lit en arrivant.
  assert.equal(descriptionDuSujet(DISCUSSION.messages), "quelle profondeur hors gel pour ce projet ?");
  assert.equal(descriptionDuSujet([{ role: "assistant", content: "bonjour" }]), "");
  assert.equal(descriptionDuSujet(null), "");
});

test("la première question ne se répète pas en commentaire", () => {
  const suite = messagesACommenter(DISCUSSION.messages);
  assert.equal(suite.length, 2);
  assert.equal(suite[0].content, "0,99 m — H0 0,45 m, altitude 241 m.");
  assert.equal(suite[1].content, "et à 450 m d'altitude ?");
});

test("un commentaire ne porte que ce qui a été dit", () => {
  // Ni auteur ni horodatage dans le texte : les écrire les conserverait en
  // base, et l'heure d'une conversation privée n'a pas à voyager.
  const corps = corpsDuMessage(DISCUSSION.messages[1]);
  assert.equal(corps, "0,99 m — H0 0,45 m, altitude 241 m.");
  assert.doesNotMatch(corps, /Copilote/);
  assert.doesNotMatch(corps, /2026/);
  assert.doesNotMatch(corps, /19:58/);
});

test("un message vide ne fait pas un commentaire vide", () => {
  assert.equal(corpsDuMessage({ role: "user", content: "  " }), "");
  assert.equal(corpsDuMessage(null), "");
});

test("ce que le copilote a dit porte sa marque", () => {
  // Sans elle, une réponse du copilote se lirait comme un avis du projet.
  assert.equal(origineDuMessage({ role: "assistant" }), "copilote");
  assert.equal(origineDuMessage({ role: "user" }), "human");
});
