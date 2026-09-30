import test from "node:test";
import assert from "node:assert/strict";

import {
  AU_PLUS_DE_MESSAGES, LA_RESERVE, estUnMessageDepose, lesMessagesDeposes,
  phraseDeLaCorrespondance
} from "./la-correspondance-du-projet.js";
import { NATURE_DUNE_PIECE, NATURE_DUN_MAIL } from "./le-dossier-des-mails.js";

test("un message déposé se reconnaît à sa nature, pas à son extension", () => {
  assert.equal(estUnMessageDepose({ documentKind: NATURE_DUN_MAIL }), true);
  // La table écrit `document_kind` ; la vue rend `documentKind`. Les deux se
  // lisent, parce que ce service est appelé des deux côtés.
  assert.equal(estUnMessageDepose({ document_kind: NATURE_DUN_MAIL }), true);
  assert.equal(estUnMessageDepose({ documentKind: NATURE_DUNE_PIECE }), false);
  assert.equal(estUnMessageDepose({ name: "un.eml" }), false);
  assert.equal(estUnMessageDepose(null), false);
});

/**
 * **Les pièces jointes sont dans le même dossier privé.** Les donner au lecteur
 * de mails les compterait toutes « illisibles », et l'écran dirait que la moitié
 * de la correspondance a résisté.
 */
test("les pièces jointes ne sont pas relues comme des messages", () => {
  const dedans = [
    { name: "2026-03-12 09h14 — Étanchéité.eml", documentKind: NATURE_DUN_MAIL },
    { name: "PLAN-FONDATIONS.pdf", documentKind: NATURE_DUNE_PIECE },
    { name: "autre.msg", documentKind: NATURE_DUN_MAIL }
  ];
  assert.deepEqual(lesMessagesDeposes(dedans).map((un) => un.name),
    ["2026-03-12 09h14 — Étanchéité.eml", "autre.msg"]);
  assert.deepEqual(lesMessagesDeposes([]), []);
  assert.deepEqual(lesMessagesDeposes(null), []);
});

/**
 * **Le plafond se dit.** Un épisode silencieusement tronqué est pire qu'un
 * épisode partiel annoncé : on croirait tenir toute la chronologie (règle 5).
 */
test("quand il y a plus de messages que relus, la phrase le dit", () => {
  assert.match(
    phraseDeLaCorrespondance({ lus: AU_PLUS_DE_MESSAGES, tous: 1400 }),
    new RegExp(`sur 1400 déposés — les ${AU_PLUS_DE_MESSAGES} plus récents`)
  );
});

test("quand tout a été relu, rien ne parle de plafond", () => {
  const dite = phraseDeLaCorrespondance({ lus: 12, tous: 12 });
  assert.equal(dite, "12 messages relus");
  assert.doesNotMatch(dite, /plus récents/);
});

test("ce qui n'a pas pu être relu se compte, et s'accorde", () => {
  assert.match(phraseDeLaCorrespondance({ lus: 5, tous: 6, illisibles: 1 }),
    /1 ne s'est pas laissé relire/);
  assert.match(phraseDeLaCorrespondance({ lus: 5, tous: 8, illisibles: 3 }),
    /3 ne se sont pas laissé relire/);
});

test("le singulier tient au premier message", () => {
  assert.equal(phraseDeLaCorrespondance({ lus: 1, tous: 1 }), "1 message relu");
});

test("rien de relu ne fait pas de phrase", () => {
  assert.equal(phraseDeLaCorrespondance({ lus: 0, tous: 40 }), "");
  assert.equal(phraseDeLaCorrespondance(), "");
});

/**
 * **La réserve dit trois choses**, et les trois comptent : c'est privé, personne
 * d'autre ne le voit, et rien n'entre dans la mémoire. Quelqu'un montrera cet
 * écran en réunion.
 */
test("la réserve nomme le privé, les autres, et la mémoire", () => {
  assert.match(LA_RESERVE, /privé/);
  assert.match(LA_RESERVE, /personne d'autre/);
  assert.match(LA_RESERVE, /mémoire du chantier/);
});
