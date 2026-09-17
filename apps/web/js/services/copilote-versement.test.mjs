import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  aProposerDeLaConversation, phraseDeLaProposition, phraseDesSansRetour
} from "./copilote-versement.js";
import { normalizeSubjectKey } from "./project-memory.js";

const REGIME = {
  sujet: "Régime de sécurité incendie",
  cles: ["regime-de-securite-incendie"],
  valeur: "habitation",
  unite: "",
  quoi: "Le corps de règles dont relève le bâtiment."
};

test("une valeur donnée dans la conversation devient une affirmation à proposer", () => {
  // Sans elle, la valeur repart avec la discussion : on la retape à la
  // suivante, et la troisième saisie diverge de la première.
  const { affirmations } = aProposerDeLaConversation(
    { statut: "fait", titre: "Incendie — Habitation", aVerser: [REGIME] },
    { par: "Ourdine Ferrand", le: "2026-03-01T09:00:00Z" }
  );

  assert.equal(affirmations.length, 1);
  const [dite] = affirmations;
  assert.equal(dite.sujet, REGIME.sujet);
  assert.equal(dite.valeur, "habitation");
  assert.equal(dite.nature, "donnee-de-base");
  // **Quelqu'un a tranché**, dans une conversation, à une date. Pas un calcul,
  // pas une règle : une personne. Sans cela, une valeur posée à la main se
  // relit six mois plus tard comme un fait établi.
  assert.equal(dite.provenance.type, "décision");
  assert.equal(dite.provenance.par, "Ourdine Ferrand");
  assert.equal(dite.provenance.le, "2026-03-01T09:00:00Z");
  assert.match(dite.provenance.quoi, /Copilote/);
});

test("le nom doit mener à la clé que l'agent relit", () => {
  // Le défaut qu'on refuse : la proposition range sous `normalizeSubjectKey`,
  // l'agent relit sous la clé qu'il déclare. Quand les deux divergent, la valeur
  // entre en mémoire **et la question se repose quand même** — le projet
  // s'enrichit d'un sujet que personne ne relit.
  const boiteux = { sujet: "Un nom que personne ne relit", cles: ["h0-hors-gel"], valeur: "0.50", unite: "m" };
  assert.ok(!boiteux.cles.includes(normalizeSubjectKey(boiteux.sujet)), "le cas n'est plus celui qu'on teste");

  const { affirmations, sansRetour } = aProposerDeLaConversation({ aVerser: [REGIME, boiteux] });

  assert.deepEqual(affirmations.map((a) => a.sujet), [REGIME.sujet]);
  // Et on le **dit** : une valeur écartée en silence se lit comme une valeur
  // qui n'avait rien à donner (règle 5).
  assert.deepEqual(sansRetour, [boiteux.sujet]);
  assert.match(phraseDesSansRetour(sansRetour), /reste dans la conversation/);
});

test("le nom peut mener à n'importe laquelle des clés que l'agent relit", () => {
  // Un même fait s'écrit sous plusieurs noms selon qui l'a établi, et l'agent
  // les lit tous. « H0 retenu pour le département » se range sous la troisième
  // clé déclarée : exiger la première l'aurait écartée alors qu'elle revient
  // très bien.
  const h0 = {
    sujet: "H0 retenu pour le département",
    cles: ["h0-hors-gel", "h0", "h0-retenu-pour-le-departement"],
    valeur: "0.50",
    unite: "m"
  };
  assert.notEqual(normalizeSubjectKey(h0.sujet), h0.cles[0], "le cas n'est plus celui qu'on teste");

  const { affirmations, sansRetour } = aProposerDeLaConversation({ aVerser: [h0] });
  assert.deepEqual(affirmations.map((a) => a.sujet), [h0.sujet]);
  assert.deepEqual(sansRetour, []);
});

test("l'unité colle à la valeur", () => {
  // « 24,5 » et « 24,5 m » ne se relisent pas pareil, et c'est la seconde que la
  // mémoire doit porter.
  const { affirmations } = aProposerDeLaConversation({
    aVerser: [{ sujet: "Altitude du site", cles: ["altitude-du-site"], valeur: "450", unite: "m" }]
  });

  assert.equal(affirmations[0].valeur, "450 m");
});

test("sans portée : l'ouvrage entier, et c'est une réponse", () => {
  // Personne n'a désigné de zone en répondant à la question. En choisir une à sa
  // place poserait la valeur là où elle n'a pas été dite.
  const { affirmations } = aProposerDeLaConversation({ aVerser: [REGIME] });
  assert.deepEqual(affirmations[0].zones, []);
});

test("une exécution sans rien à proposer ne propose rien", () => {
  assert.deepEqual(aProposerDeLaConversation(null).affirmations, []);
  assert.deepEqual(aProposerDeLaConversation({}).affirmations, []);
  assert.deepEqual(aProposerDeLaConversation({ aVerser: [] }).affirmations, []);
  // Une ligne incomplète n'invente pas ce qui lui manque.
  assert.deepEqual(
    aProposerDeLaConversation({ aVerser: [{ sujet: "Altitude du site", cles: ["altitude-du-site"] }] }).affirmations,
    []
  );
  assert.equal(phraseDeLaProposition([]), "");
  assert.equal(phraseDesSansRetour([]), "");
});

test("la phrase du bouton nomme ce qu'elle emporte", () => {
  assert.match(phraseDeLaProposition([{ sujet: "Régime de sécurité incendie" }]),
    /Proposer « Régime de sécurité incendie »/);
  assert.match(phraseDeLaProposition([{ sujet: "A" }, { sujet: "B" }]), /Proposer 2 valeurs/);
});

/* ── La règle 1, tenue par le code ───────────────────────────────────────── */

test("aucun chemin d'ici ne mène à une écriture dans la mémoire", () => {
  // **La garde qui compte.** Ce fichier prépare une proposition ; il n'écrit
  // rien, et rien de ce qu'il importe n'écrit non plus. Une valeur de projet
  // apparue sans proposition serait une valeur sans auteur — exactement ce que
  // la mémoire existe pour empêcher (`docs/fondamentaux.md`, règle 1).
  const source = readFileSync(new URL("./copilote-versement.js", import.meta.url), "utf8");

  for (const ecriture of ["writeAssertions", "upsert", ".insert(", "propositions-supabase", "project-memory-supabase"]) {
    assert.ok(!source.includes(ecriture), `copilote-versement.js touche à « ${ecriture} »`);
  }

  // Et l'écran, lui, ne connaît qu'un seul chemin vers la base : la préparation
  // d'une proposition. Un second chemin serait celui qu'on oublierait de relire.
  const ecran = readFileSync(
    new URL("../views/studio/copilote/copilote.js", import.meta.url), "utf8"
  );
  assert.ok(ecran.includes("preparerUneProposition"), "l'écran ne propose plus rien");
  for (const ecriture of ["writeAssertions", "project-memory-supabase"]) {
    assert.ok(!ecran.includes(ecriture), `l'écran du Copilote touche à « ${ecriture} »`);
  }
});
