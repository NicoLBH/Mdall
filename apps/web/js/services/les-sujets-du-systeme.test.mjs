/**
 * Les sujets techniques : ce qu'ils classent, et ce qu'ils refusent de taire.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CE_QUI_MANQUE_ENCORE, lesSujetsPrecis, lesSujetsRanges, phraseDeCeQuiEstCache,
  phraseDeCeQueCeNestPas, phraseDeLaGranulometrie, phraseDesFormes, phraseDuRegroupement,
  phraseDunSujet
} from "./les-sujets-du-systeme.js";

const DES_LIGNES = [
  { sujet: "beton", mots: 1, formes: 2, affirmations: 140, chantiers: 3 },
  { sujet: "plancher beton", mots: 2, formes: 4, affirmations: 42, chantiers: 3 },
  { sujet: "nappe phreatique", mots: 2, formes: 3, affirmations: 18, chantiers: 2 },
  { sujet: "cuvelage", mots: 1, formes: 1, affirmations: 9, chantiers: 2 }
];

/**
 * **Les termes qualifiés d'abord, et avant le nombre de chantiers.**
 *
 * Le classement partait des chantiers : en tête venaient donc les mots qu'on
 * trouve partout — « corpus », « portes », « locaux » —, qui sont sur tous les
 * chantiers parce qu'ils sont sur tous les chantiers, c'est-à-dire qu'ils ne
 * distinguent rien.
 *
 * > « Plafonds, dispositions, passage, portes… et alors ? »
 *
 * Un mot seul nomme un objet ; « plancher beton » nomme un ouvrage. C'est la
 * seule chose que ce comptage sache produire qui ressemble à une idée, et elle
 * se noyait derrière les mots les plus répandus.
 */
test("un terme qualifié passe devant un mot seul, même plus répandu", () => {
  const ranges = lesSujetsRanges(DES_LIGNES);
  assert.deepEqual(ranges.map((une) => une.sujet),
    ["plancher beton", "nappe phreatique", "beton", "cuvelage"]);

  // Et « beton » est sur trois chantiers quand « nappe phreatique » n'est que
  // sur deux : c'est bien le nombre de mots qui a tranché, pas l'étendue.
  const beton = ranges.find((une) => une.sujet === "beton");
  const nappe = ranges.find((une) => une.sujet === "nappe phreatique");
  assert.equal(beton.chantiers > nappe.chantiers, true);
});

test("une ligne vide ou sans occurrence n'entre pas", () => {
  assert.deepEqual(lesSujetsRanges([{ sujet: "", affirmations: 4 }]), []);
  assert.deepEqual(lesSujetsRanges([{ sujet: "beton", affirmations: 0 }]), []);
  assert.deepEqual(lesSujetsRanges(null), []);
});

test("les sujets précis sont ceux de plusieurs mots", () => {
  assert.deepEqual(lesSujetsPrecis(lesSujetsRanges(DES_LIGNES)).map((une) => une.sujet),
    ["plancher beton", "nappe phreatique"]);
  assert.deepEqual(lesSujetsPrecis(null), []);
});

/**
 * **Le rapport au nombre de cases, pas le total.** « 4 000 sujets » ne dit
 * rien ; « 4 000 sujets là où il y avait 8 cases » dit tout.
 */
test("la granulométrie se dit par rapport aux cases qu'elle remplace", () => {
  const dite = phraseDeLaGranulometrie(lesSujetsRanges(DES_LIGNES), 8);
  assert.match(dite, /4 sujets se dégagent/);
  assert.match(dite, /2 en plusieurs mots/);
  assert.match(dite, /8 cases/);
});

test("sans sujet partagé, on ne parle pas de vocabulaire", () => {
  assert.match(phraseDeLaGranulometrie([], 8), /pas de quoi parler de vocabulaire/);
  assert.doesNotMatch(phraseDeLaGranulometrie([], 8), /0 sujets se dégagent/);
});

/**
 * **Taire ce qu'on cache montrerait un vocabulaire plus pauvre qu'il n'est**
 * (règle 5).
 */
test("ce qui n'est pas montré se compte, et se dit", () => {
  // `toLocaleString` sépare les milliers par une espace fine insécable, que
  // `\s` reconnaît et qu'une espace ordinaire ne reconnaîtrait pas.
  assert.match(phraseDeCeQuiEstCache({ caches: 4210 }), /4\s210 autres termes/);
  assert.match(phraseDeCeQuiEstCache({ caches: 4210 }), /un seul chantier/);
  // Rien de caché : pas de phrase. « 0 terme caché » est du bruit.
  assert.equal(phraseDeCeQuiEstCache({ caches: 0 }), "");
  assert.equal(phraseDeCeQuiEstCache(null), "");
});

/* ── Le regroupement des synonymes ───────────────────────────────────────── */

/**
 * **Combien de formes se rangent sous un sujet** : « planchers betons »,
 * « plancher en beton », « beton plancher ». C'est la mesure du regroupement,
 * et elle voyage avec le sujet plutôt que de se recalculer à l'écran (règle 4).
 */
test("un sujet dit combien de formes s'y rangent", () => {
  assert.equal(phraseDesFormes({ formes: 4 }), "4 formes");
  // **Une seule forme ne se dit pas.** « 1 forme » est du bruit, et l'absence
  // dit mieux que rien n'a été regroupé là.
  assert.equal(phraseDesFormes({ formes: 1 }), "");
  assert.equal(phraseDesFormes({ formes: 0 }), "");
  assert.equal(phraseDesFormes(null), "");
});

/**
 * **Le compte voyage avec le sujet, il ne se recalcule pas à l'écran**
 * (règle 4). Éprouver `phraseDesFormes` sur une ligne écrite à la main ne dit
 * rien de ce qui arrive vraiment : le rangeur pouvait mettre tous les comptes à
 * un sans qu'aucune épreuve ne bouge. On part donc des lignes de la base et on
 * va jusqu'à la phrase.
 */
test("le compte des formes traverse le rangeur", () => {
  assert.deepEqual(
    lesSujetsRanges(DES_LIGNES).map((une) => `${une.sujet}:${phraseDesFormes(une)}`),
    ["plancher beton:4 formes", "nappe phreatique:3 formes", "beton:2 formes",
      "cuvelage:"]);
});

/**
 * **Ce comptage dit ce qu'il n'est pas**, avant qu'on le prenne pour autre chose.
 *
 * > « Le niveau de sémantique est très largement insuffisant pour porter du
 * > sens. Où sont les idées, les raisonnements, les fonctions ? »
 *
 * La critique porte sur la mesure, pas sur l'affichage : un terme n'est ni une
 * idée ni une fonction. Une couche présentée pour ce qu'elle n'est pas fait
 * croire la question résolue, et personne ne la rouvre (règle 12).
 */
test("le comptage de termes dit qu'il ne relève pas des idées", () => {
  const dite = phraseDeCeQueCeNestPas(lesSujetsRanges(DES_LIGNES));

  assert.match(dite, /des termes, pas des idées/);
  // Deux mots seuls sur quatre sujets.
  assert.match(dite, /50 %/);
  // Et ce à quoi cela sert quand même : la granulométrie de la prédiction.
  assert.match(dite, /huit cases/);

  // Rien à dire quand il n'y a rien : on n'invente pas un aveu sur du vide.
  assert.equal(phraseDeCeQueCeNestPas([]), "");
  assert.equal(phraseDeCeQueCeNestPas(null), "");
});

/**
 * **Et ce qui manque est nommé — à jour de ce qui a été fait.**
 *
 * Cette liste disait « relever des idées : nulle part » et « dire comment deux
 * idées s'enchaînent : nulle part ». Les deux existent maintenant, dans la
 * rubrique des idées. Les y laisser ferait annoncer comme absent ce qui est là,
 * c'est-à-dire mentir dans l'autre sens — et une liste de manques qu'on ne
 * corrige pas finit par n'être plus lue du tout.
 *
 * Ce qui la remplace est ce qui manque **vraiment** après ce tour : les liaisons
 * de tête, les idées qu'aucun mot n'annonce, et le geste qui ferait entrer une
 * idée dans la mémoire d'un chantier.
 */
test("ce qui manque est à jour de ce qui a été fait", () => {
  const dits = CE_QUI_MANQUE_ENCORE.map((un) => un.quoi).join(" | ");

  // Ce qui est fait n'est plus annoncé comme absent.
  assert.doesNotMatch(dits, /Relever des idées, et non des termes/,
    "relever des idées est annoncé comme nulle part, et la console en relève");

  // Ce qui reste est nommé, et la limite de méthode d'abord.
  assert.match(dits, /lien est en tête de phrase/);
  assert.match(dits, /par aucun mot/);

  // **Et le garde-fou de la règle 1** : une idée relevée est une lecture, pas
  // une vérité. Rien n'entre dans la mémoire sans une proposition signée.
  assert.match(dits, /entrer une idée dans la mémoire/);

  for (const un of CE_QUI_MANQUE_ENCORE) {
    assert.ok(un.quoi && un.ou && un.pourquoi, "une étape sans son pourquoi n'apprend rien");
  }
});

/**
 * **Le rapport, pas le total.** « 12 000 formes » ne dit rien ; « 12 000 formes
 * rangées sous 4 000 sujets » dit qu'on a divisé le vocabulaire par trois.
 */
test("le regroupement se dit par rapport au nombre de sujets", () => {
  const dite = phraseDuRegroupement(lesSujetsRanges(DES_LIGNES), { formes: 10 });
  assert.match(dite, /10 formes écrites/);
  assert.match(dite, /4 sujets/);
  assert.match(dite, /pluriels, ordre des mots/);
});

/**
 * **On ne se prononce pas sur un regroupement qui n'a pas eu lieu** (règle 5).
 * Autant de formes que de sujets veut dire que rien ne s'est regroupé.
 */
test("sans regroupement, on n'annonce rien", () => {
  assert.equal(phraseDuRegroupement(lesSujetsRanges(DES_LIGNES), { formes: 4 }), "");
  assert.equal(phraseDuRegroupement(lesSujetsRanges(DES_LIGNES), null), "");
  assert.equal(phraseDuRegroupement([], { formes: 900 }), "");
});

test("un sujet dit sur combien de chantiers il se montre", () => {
  assert.equal(phraseDunSujet({ chantiers: 3 }), "3 chantiers");
  assert.equal(phraseDunSujet({ chantiers: 1 }), "1 chantier");
  assert.equal(phraseDunSujet({ chantiers: 0 }), "");
  assert.equal(phraseDunSujet(null), "");
});

/**
 * **Une étape qui n'a pas été écrite n'avance pas de zéro pour cent, elle
 * n'existe pas** (règle 12). Nommer ce qui manque évite de laisser croire que
 * la question est réglée.
 */
test("ce qui manque est nommé, et dit où cela en est", () => {
  assert.equal(CE_QUI_MANQUE_ENCORE.length >= 3, true);
  // Ce qui vient d'être fait n'y figure plus comme à faire : une liste qui
  // promet un travail déjà livré ne se relit plus.
  assert.equal(
    CE_QUI_MANQUE_ENCORE.some((un) => /^Regrouper les synonymes$/.test(un.quoi)),
    false, "le regroupement des formes est livré, il ne s'annonce plus");
  for (const un of CE_QUI_MANQUE_ENCORE) {
    assert.equal(Boolean(un.quoi && un.ou && un.pourquoi), true, un.quoi);
  }
  // Aucune barre de progression : une étape qui n'existe pas n'avance pas.
  for (const un of CE_QUI_MANQUE_ENCORE) {
    assert.doesNotMatch(String(un.ou), /\d+\s*%/);
  }
});
