import test from "node:test";
import assert from "node:assert/strict";

import { quiParle, corpsDuMessage, titreDuSujet, descriptionDuSujet } from "./copilote-en-sujet.js";

test("un commentaire dit qui parlait", () => {
  // Sans cela, on lirait une réponse du copilote comme un avis du projet.
  assert.equal(quiParle({ role: "user" }), "Question");
  assert.equal(quiParle({ role: "assistant" }), "Copilote");

  const corps = corpsDuMessage({
    role: "assistant", content: "La cote hors gel est de 0,99 m.", ts: "2026-09-04T10:30:00Z"
  });
  assert.match(corps, /^\*\*Copilote\*\* · /);
  assert.match(corps, /La cote hors gel est de 0,99 m\./);
});

test("l'horodatage est celui du message, pas celui de la transformation", () => {
  const corps = corpsDuMessage({ role: "user", content: "et à 2 bars ?", ts: "2026-09-04T10:30:00Z" });
  assert.match(corps, /04\/09\/2026/);
});

test("un message sans contenu ne fait pas un commentaire vide", () => {
  assert.equal(corpsDuMessage({ role: "user", content: "  " }), "");
  assert.equal(corpsDuMessage(null), "");
});

test("une date illisible ne fait pas tomber le commentaire", () => {
  const corps = corpsDuMessage({ role: "user", content: "bonjour", ts: "pas une date" });
  assert.equal(corps, "**Question**\n\nbonjour");
});

test("le titre du sujet est celui de la discussion", () => {
  assert.equal(titreDuSujet({ title: "Hors gel du site" }), "Hors gel du site");
  assert.equal(titreDuSujet({ title: "  " }, "Discussion du 4 septembre"), "Discussion du 4 septembre");
  assert.equal(titreDuSujet(null), "Discussion avec le copilote");
});

test("la description dit d'où le sujet vient, et ce que ses commentaires valent", () => {
  const texte = descriptionDuSujet({
    messages: [{ content: "a" }, { content: "b" }, { content: "  " }],
    le: new Date("2026-09-04T10:00:00Z")
  });

  assert.match(texte, /discussion privée avec le copilote, le 4 septembre 2026/);
  assert.match(texte, /Les 2 messages/);
  // Ce que le copilote a répondu n'a pas été tranché : le sujet le dit.
  assert.match(texte, /n'a \*\*pas été tranché\*\*/);
  assert.match(texte, /La discussion d'origine reste privée/);
});
