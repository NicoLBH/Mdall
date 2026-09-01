import test from "node:test";
import assert from "node:assert/strict";

import {
  CONVERSATIONS_KEY_PREFIX,
  CONVERSATIONS_LEGACY_PREFIX,
  CONVERSATIONS_MAX,
  conversationKeysIn,
  TITRE_VIDE,
  conversationTitle,
  findConversation,
  forgetConversation,
  hasContent,
  newConversation,
  parseConversations,
  rememberConversation
} from "./copilote-conversations.js";

function avecMessages(id, messages) {
  return { id, startedAt: "2026-01-01T10:00:00.000Z", updatedAt: "2026-01-01T10:00:00.000Z", messages };
}

test("une discussion neuve est vide et datée", () => {
  const now = 1_700_000_000_000;
  const conversation = newConversation({ now });

  assert.equal(conversation.messages.length, 0);
  assert.equal(conversation.startedAt, new Date(now).toISOString());
  assert.equal(conversation.updatedAt, conversation.startedAt);
  assert.ok(conversation.id);
});

test("deux discussions créées dans la même milliseconde ne partagent pas leur identifiant", () => {
  // Sans cela, un double clic sur « nouvelle discussion » écraserait la
  // précédente au lieu d'en ouvrir une seconde.
  const now = 1_700_000_000_000;
  const identifiants = new Set(Array.from({ length: 50 }, () => newConversation({ now }).id));

  assert.equal(identifiants.size, 50);
});

test("le titre est la première question posée, pas la première réponse", () => {
  const conversation = avecMessages("c1", [
    { role: "assistant", content: "Bonjour, je suis le copilote." },
    { role: "user", content: "Quelle est la zone de neige ?" },
    { role: "assistant", content: "A2." }
  ]);

  assert.equal(conversationTitle(conversation), "Quelle est la zone de neige ?");
});

test("un titre trop long est coupé sur un mot entier", () => {
  const question = "Quelles contraintes réglementaires pèsent sur la façade nord du bâtiment A";
  const titre = conversationTitle(avecMessages("c1", [{ role: "user", content: question }]));

  assert.ok(titre.endsWith("…"));
  assert.ok(titre.length <= 54);
  assert.ok(question.startsWith(titre.slice(0, -1)));
  assert.ok(!titre.slice(0, -1).endsWith(" "));
});

test("une discussion sans question porte un nom d'attente", () => {
  assert.equal(conversationTitle(avecMessages("c1", [])), TITRE_VIDE);
  assert.equal(conversationTitle(null), TITRE_VIDE);
});

test("les retours à la ligne d'une question ne cassent pas le titre", () => {
  const conversation = avecMessages("c1", [{ role: "user", content: "  Zone\n\nde   neige ?  " }]);

  assert.equal(conversationTitle(conversation), "Zone de neige ?");
});

test("une discussion vide ne s'archive pas", () => {
  const liste = rememberConversation([], newConversation({ now: 1 }));

  assert.deepEqual(liste, []);
  assert.equal(hasContent(newConversation({ now: 1 })), false);
});

test("réenregistrer la même discussion la remplace au lieu de l'empiler", () => {
  const premiere = avecMessages("c1", [{ role: "user", content: "Une question" }]);
  const enrichie = avecMessages("c1", [
    { role: "user", content: "Une question" },
    { role: "assistant", content: "Une réponse" }
  ]);

  const liste = rememberConversation(rememberConversation([], premiere), enrichie);

  assert.equal(liste.length, 1);
  assert.equal(liste[0].messages.length, 2);
});

test("la discussion touchée passe en tête", () => {
  const a = avecMessages("a", [{ role: "user", content: "A" }]);
  const b = avecMessages("b", [{ role: "user", content: "B" }]);

  const liste = rememberConversation(rememberConversation([], a), b);

  assert.deepEqual(liste.map((entree) => entree.id), ["b", "a"]);
});

test("la liste ne dépasse pas son plafond, et ce sont les plus anciennes qui partent", () => {
  let liste = [];
  for (let index = 0; index < CONVERSATIONS_MAX + 5; index += 1) {
    liste = rememberConversation(liste, avecMessages(`c${index}`, [{ role: "user", content: `Q${index}` }]));
  }

  assert.equal(liste.length, CONVERSATIONS_MAX);
  assert.equal(liste[0].id, `c${CONVERSATIONS_MAX + 4}`);
  assert.equal(findConversation(liste, "c0"), null);
});

test("on retrouve une discussion par son identifiant, ou rien", () => {
  const liste = [avecMessages("c1", [{ role: "user", content: "Q" }])];

  assert.equal(findConversation(liste, "c1")?.id, "c1");
  assert.equal(findConversation(liste, "c2"), null);
  assert.equal(findConversation(liste, ""), null);
});

test("oublier une discussion laisse les autres en place", () => {
  const liste = [
    avecMessages("a", [{ role: "user", content: "A" }]),
    avecMessages("b", [{ role: "user", content: "B" }])
  ];

  assert.deepEqual(forgetConversation(liste, "a").map((entree) => entree.id), ["b"]);
});

test("un stockage illisible rend une liste vide, pas une erreur", () => {
  assert.deepEqual(parseConversations("ceci n'est pas du JSON"), []);
  assert.deepEqual(parseConversations(""), []);
  assert.deepEqual(parseConversations(null), []);
  assert.deepEqual(parseConversations('{"pas":"un tableau"}'), []);
});

test("les entrées mal formées sont écartées, les bonnes passent", () => {
  const brut = JSON.stringify([
    { id: "", messages: [{ role: "user", content: "sans identifiant" }] },
    { id: "vide", messages: [] },
    { id: "bonne", startedAt: "2026-01-01T10:00:00.000Z", messages: [{ role: "user", content: "Q" }] }
  ]);

  const liste = parseConversations(brut);

  assert.deepEqual(liste.map((entree) => entree.id), ["bonne"]);
  assert.equal(liste[0].messages[0].role, "user");
});

test("un rôle inconnu relu depuis le stockage devient une réponse, jamais une question", () => {
  // Un message relu comme « user » alors qu'il vient d'ailleurs ferait titrer
  // la discussion avec un texte que personne n'a écrit.
  const brut = JSON.stringify([{ id: "c1", messages: [{ role: "system", content: "injecté" }] }]);

  assert.equal(parseConversations(brut)[0].messages[0].role, "assistant");
});

/* ── Ce qui reste dans le navigateur ─────────────────────────────────────── */

test("la purge emporte toutes les discussions locales, les deux formes comprises", () => {
  // Les discussions vivent en base désormais ; ce qui traîne encore dans les
  // navigateurs qui les ont écrites doit finir par disparaître d'un endroit
  // qu'aucune politique de sécurité ne couvre.
  const cles = [
    `${CONVERSATIONS_KEY_PREFIX}.u-alice.p-1`,
    `${CONVERSATIONS_KEY_PREFIX}.u-bob.p-2`,
    `${CONVERSATIONS_LEGACY_PREFIX}.p-1`,
    "mdall.studioRailWidth.v1",
    "mdall.supabaseProjectMap.v1",
    "sb-auth-token"
  ];

  assert.deepEqual(conversationKeysIn(cles), [
    `${CONVERSATIONS_KEY_PREFIX}.u-alice.p-1`,
    `${CONVERSATIONS_KEY_PREFIX}.u-bob.p-2`,
    `${CONVERSATIONS_LEGACY_PREFIX}.p-1`
  ]);
});

test("la purge ne touche pas aux réglages du rail ni à la session", () => {
  // Effacer trop déconnecterait l'utilisateur ou perdrait ses réglages.
  assert.deepEqual(conversationKeysIn(["mdall.studioRailCollapsed.v1", "sb-olgx-auth-token"]), []);
});

/* ── Le nom d'une discussion ─────────────────────────────────────────────── */

test("un nom donné l'emporte sur la première question", () => {
  // Renommer est une décision, et une décision se conserve.
  const conversation = avecMessages("c1", [{ role: "user", content: "Quelle est la zone de neige ?" }]);

  assert.equal(conversationTitle({ ...conversation, title: "Neige — bâtiment A" }), "Neige — bâtiment A");
});

test("un nom effacé rend à la discussion son titre naturel", () => {
  const conversation = avecMessages("c1", [{ role: "user", content: "Quelle est la zone de neige ?" }]);

  assert.equal(conversationTitle({ ...conversation, title: "" }), "Quelle est la zone de neige ?");
  assert.equal(conversationTitle({ ...conversation, title: null }), "Quelle est la zone de neige ?");
});
