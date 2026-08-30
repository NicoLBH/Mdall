import test from "node:test";
import assert from "node:assert/strict";

import {
  ITEM,
  PROPOSITION,
  acceptsDocuments,
  canTransition,
  decideItem,
  describeMerge,
  mergeOutcome
} from "./proposition-state.js";

test("une proposition ouverte peut être fusionnée ou close", () => {
  assert.equal(canTransition(PROPOSITION.OPEN, PROPOSITION.MERGED), true);
  assert.equal(canTransition(PROPOSITION.OPEN, PROPOSITION.CLOSED), true);
});

test("une proposition fusionnée ne se refusionne pas", () => {
  // Elle a déjà changé le corpus : la rejouer le changerait deux fois.
  assert.equal(canTransition(PROPOSITION.MERGED, PROPOSITION.MERGED), false);
  assert.equal(canTransition(PROPOSITION.MERGED, PROPOSITION.OPEN), false);
  assert.equal(canTransition(PROPOSITION.MERGED, PROPOSITION.CLOSED), false);
});

test("une proposition close ne se rouvre pas", () => {
  // Rouvrir reviendrait à réécrire une décision datée plutôt qu'à en prendre
  // une nouvelle. On en ouvre une autre.
  assert.equal(canTransition(PROPOSITION.CLOSED, PROPOSITION.OPEN), false);
  assert.equal(canTransition(PROPOSITION.CLOSED, PROPOSITION.MERGED), false);
});

test("un état inconnu ne mène nulle part", () => {
  assert.equal(canTransition("brouillon", PROPOSITION.MERGED), false);
  assert.equal(canTransition(undefined, PROPOSITION.OPEN), false);
});

test("on ne dépose que dans une proposition ouverte", () => {
  assert.equal(acceptsDocuments({ status: PROPOSITION.OPEN }), true);
  assert.equal(acceptsDocuments({ status: PROPOSITION.MERGED }), false);
  assert.equal(acceptsDocuments({ status: PROPOSITION.CLOSED }), false);
  assert.equal(acceptsDocuments(null), false);
});

test("un item laissé sans réponse vaut acceptation", () => {
  // Ne rien dire d'une affirmation qu'on a sous les yeux, c'est ne pas s'y
  // opposer. Mais cela doit être annoncé avant le clic, jamais découvert après.
  const items = [
    { item_key: "a", status: ITEM.ACCEPTED },
    { item_key: "b", status: ITEM.PROPOSED },
    { item_key: "c", status: ITEM.REFUSED }
  ];

  const { accepted, refused, undecided } = mergeOutcome(items);

  assert.deepEqual(accepted.map((item) => item.item_key), ["a", "b"]);
  assert.deepEqual(refused.map((item) => item.item_key), ["c"]);
  assert.equal(undecided, 1);
});

test("la phrase de fusion nomme les trois nombres, pas un seul", () => {
  // « 12 acceptés » cacherait que trois n'ont pas été regardés — et c'est
  // exactement ce qu'il faut dire à qui s'apprête à trancher.
  const phrase = describeMerge([
    { status: ITEM.ACCEPTED },
    { status: ITEM.PROPOSED },
    { status: ITEM.PROPOSED },
    { status: ITEM.REFUSED }
  ]);

  assert.match(phrase, /3 acceptés/);
  assert.match(phrase, /1 refusé/);
  assert.match(phrase, /2 que vous n'avez pas tranchés/);
});

test("quand tout a été tranché, la phrase ne parle pas de ce qui ne l'a pas été", () => {
  const phrase = describeMerge([{ status: ITEM.ACCEPTED }, { status: ITEM.REFUSED }]);

  assert.match(phrase, /1 accepté, 1 refusé\.$/);
  assert.doesNotMatch(phrase, /tranché/);
});

test("une proposition vide le dit", () => {
  assert.match(describeMerge([]), /ne contient rien/);
});

test("un refus exige une raison", () => {
  // C'est ce qui permettra de contester la décision plutôt que de la subir.
  assert.equal(decideItem(ITEM.REFUSED, "   "), null);
  assert.equal(decideItem(ITEM.REFUSED, ""), null);
  assert.deepEqual(decideItem(ITEM.REFUSED, " autre affaire "), {
    status: ITEM.REFUSED,
    reason: "autre affaire"
  });
});

test("une acceptation se passe de raison, mais l'accepte", () => {
  assert.deepEqual(decideItem(ITEM.ACCEPTED), { status: ITEM.ACCEPTED, reason: null });
  assert.deepEqual(decideItem(ITEM.ACCEPTED, "vérifié avec le BC"), {
    status: ITEM.ACCEPTED,
    reason: "vérifié avec le BC"
  });
});

test("revenir en arrière est une décision comme une autre", () => {
  // Se raviser doit rester possible tant que la proposition est ouverte : c'est
  // le contraire d'effacer une réponse.
  assert.deepEqual(decideItem(ITEM.PROPOSED), { status: ITEM.PROPOSED, reason: null });
  assert.equal(decideItem("annulé"), null, "mais seulement vers un état qui existe");
});
