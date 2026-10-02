/**
 * **Qui réveille le serveur, et quand.**
 *
 * ## Le défaut, et pourquoi il a tenu dix-huit minutes
 *
 * Une lecture de comptes rendus a été lancée, et elle « tournait toujours » un
 * quart d'heure plus tard. La fonction de bord avait été coupée net. Sa ligne
 * restait `en_cours`, et la reprise prévue au bout de dix minutes ne servait à
 * rien : **plus personne ne rappelait la fonction**.
 *
 * Ce module décide. Les épreuves portent sur ce qu'on réveille, ce qu'on laisse
 * travailler, et ce qu'on ne réveille pas deux fois.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { LES_FAMILLES, laFamilleQuiSeLit } from "./les-familles-de-document.js";
import {
  ABANDONNEE_APRES_MS,
  GESTE_DES_CR,
  GESTE_DES_MAILS,
  LA_FONCTION_DU_GESTE,
  PAS_PLUS_SOUVENT_QUE_MS,
  laLigneEstAbandonnee,
  leGesteDeLaLigne,
  leMotDeLaReprise,
  lesReveilsADemander
} from "./reveiller-la-file.js";

const MAINTENANT = Date.parse("2026-10-01T09:36:00Z");
const ilYA = (ms) => new Date(MAINTENANT - ms).toISOString();

test("une ligne qui attend réveille sa fonction", () => {
  assert.deepEqual(
    lesReveilsADemander([{ geste: GESTE_DES_CR, statut: "en_attente" }], { maintenant: MAINTENANT }),
    ["lire-les-comptes-rendus"]
  );
  assert.deepEqual(
    lesReveilsADemander([{ geste: GESTE_DES_MAILS, statut: "en_attente" }], { maintenant: MAINTENANT }),
    ["verser-les-mails"]
  );
});

/** Une ligne sans geste est un dépôt de messagerie, comme la base le pose. */
test("une ligne sans geste réveille le dépôt de messagerie", () => {
  assert.equal(leGesteDeLaLigne({}), GESTE_DES_MAILS);
  assert.equal(leGesteDeLaLigne({ geste: "" }), GESTE_DES_MAILS);
  assert.equal(leGesteDeLaLigne({ geste: GESTE_DES_CR }), GESTE_DES_CR);
  assert.deepEqual(
    lesReveilsADemander([{ statut: "en_attente" }], { maintenant: MAINTENANT }),
    ["verser-les-mails"]
  );
});

/**
 * **Le cas qui a coûté dix-huit minutes.** Prise, jamais finie, et personne pour
 * la rappeler.
 */
test("une ligne prise et abandonnée réveille sa fonction", () => {
  const ligne = { geste: GESTE_DES_CR, statut: "en_cours", pris_le: ilYA(18 * 60 * 1000) };

  assert.equal(laLigneEstAbandonnee(ligne, { maintenant: MAINTENANT }), true);
  assert.deepEqual(
    lesReveilsADemander([ligne], { maintenant: MAINTENANT }),
    ["lire-les-comptes-rendus"]
  );
});

/**
 * **Une ligne prise à l'instant travaille.** La réveiller ne prendrait rien — la
 * fonction marque sa ligne avant de travailler — mais l'appel serait payé.
 */
test("une ligne prise à l'instant ne se réveille pas", () => {
  const ligne = { geste: GESTE_DES_CR, statut: "en_cours", pris_le: ilYA(30 * 1000) };

  assert.equal(laLigneEstAbandonnee(ligne, { maintenant: MAINTENANT }), false);
  assert.deepEqual(lesReveilsADemander([ligne], { maintenant: MAINTENANT }), []);
});

/** Le bord du délai : à la seconde même, elle travaille encore. */
test("le délai d'abandon se compte pour de vrai", () => {
  const juste = { statut: "en_cours", pris_le: ilYA(ABANDONNEE_APRES_MS) };
  const apres = { statut: "en_cours", pris_le: ilYA(ABANDONNEE_APRES_MS + 1000) };

  assert.equal(laLigneEstAbandonnee(juste, { maintenant: MAINTENANT }), false);
  assert.equal(laLigneEstAbandonnee(apres, { maintenant: MAINTENANT }), true);
});

/**
 * **Prise sans date de prise est abandonnée.** On ne sait pas depuis quand elle
 * tourne, et ne pas savoir n'autorise pas à la croire vive (règle 5) : la
 * laisser là serait la laisser pour toujours.
 */
test("une ligne prise sans date est tenue pour abandonnée", () => {
  assert.equal(laLigneEstAbandonnee({ statut: "en_cours" }, { maintenant: MAINTENANT }), true);
  assert.equal(
    laLigneEstAbandonnee({ statut: "en_cours", pris_le: "pas une date" }, { maintenant: MAINTENANT }),
    true
  );
});

/** Une ligne finie ou en échec n'est pas abandonnée : elle est finie. */
test("une ligne finie ne se réveille pas", () => {
  for (const statut of ["fini", "echec", ""]) {
    assert.equal(laLigneEstAbandonnee({ statut, pris_le: ilYA(60 * 60 * 1000) }), false, statut);
    assert.deepEqual(lesReveilsADemander([{ statut, geste: GESTE_DES_CR }]), []);
  }
});

/**
 * **Un réveil par geste, pas un par ligne.** La fonction prend la plus ancienne
 * et se rappelle ensuite : dix-neuf lignes n'appellent pas dix-neuf fonctions.
 */
test("deux lignes du même geste ne font qu'un réveil", () => {
  const demandes = lesReveilsADemander([
    { geste: GESTE_DES_CR, statut: "en_attente" },
    { geste: GESTE_DES_CR, statut: "en_attente" },
    { geste: GESTE_DES_CR, statut: "en_cours", pris_le: ilYA(20 * 60 * 1000) }
  ], { maintenant: MAINTENANT });

  assert.deepEqual(demandes, ["lire-les-comptes-rendus"]);
});

test("deux gestes se réveillent tous les deux", () => {
  const demandes = lesReveilsADemander([
    { geste: GESTE_DES_MAILS, statut: "en_attente" },
    { geste: GESTE_DES_CR, statut: "en_attente" }
  ], { maintenant: MAINTENANT });

  assert.deepEqual([...demandes].sort(), ["lire-les-comptes-rendus", "verser-les-mails"]);
});

test("une file vide ne réveille rien", () => {
  assert.deepEqual(lesReveilsADemander([]), []);
  assert.deepEqual(lesReveilsADemander(null), []);
  assert.deepEqual(lesReveilsADemander(), []);
});

/**
 * **Les noms sont ceux du déploiement.** Un réveil envoyé à un nom que personne
 * ne sert ne rend pas d'erreur visible : il ne fait rien, et la file reste
 * bloquée sans que l'écran sache pourquoi.
 */
test("chaque geste nomme une fonction qui existe pour de bon", async () => {
  const { existsSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  assert.equal(LA_FONCTION_DU_GESTE[GESTE_DES_MAILS], "verser-les-mails");
  assert.equal(LA_FONCTION_DU_GESTE[GESTE_DES_CR], "lire-les-comptes-rendus");

  /**
   * **Et la fonction est déployable.**
   *
   * Un réveil envoyé à un nom que personne ne sert ne rend aucune erreur : il ne
   * fait rien, et la file reste bloquée sans que l'écran sache pourquoi. Le
   * registre peut donc déclarer une famille dont la fonction n'existe pas, et
   * tout paraîtra normal jusqu'à ce que quelqu'un attende une lecture qui ne
   * viendra jamais. On va voir.
   */
  for (const [geste, fonction] of Object.entries(LA_FONCTION_DU_GESTE)) {
    const ou = fileURLToPath(
      new URL(`../../../../supabase/functions/${fonction}/index.ts`, import.meta.url));
    assert.ok(existsSync(ou), `${geste} : la fonction « ${fonction} » n'existe pas`);
  }

  // Toute famille qui se lit a son geste dans la table : une famille sans geste
  // ne pourrait rien demander, et personne ne le dirait.
  assert.deepEqual(
    Object.keys(LA_FONCTION_DU_GESTE).sort(),
    LES_FAMILLES.filter((une) => laFamilleQuiSeLit(une)).sort()
  );
});

/** « Reprise » explique l'attente ; « en cours » pendant vingt minutes la nie. */
test("une reprise se dit, une marche en cours se tait", () => {
  assert.match(
    leMotDeLaReprise({ statut: "en_cours", pris_le: ilYA(20 * 60 * 1000) }, { maintenant: MAINTENANT }),
    /repris/
  );
  assert.equal(
    leMotDeLaReprise({ statut: "en_cours", pris_le: ilYA(30 * 1000) }, { maintenant: MAINTENANT }),
    ""
  );
  assert.equal(leMotDeLaReprise({ statut: "en_attente" }), "");
});

/**
 * **On ne redemande pas la même fonction à chaque relecture d'écran.**
 *
 * L'onglet Actions relit la file toutes les quelques secondes. Une ligne qui
 * reste `en_attente` — fonction non déployée, réseau coupé — ferait un appel par
 * relecture, indéfiniment, et chacun est payé.
 */
test("une fonction demandée à l'instant ne se redemande pas", () => {
  const attend = [{ geste: GESTE_DES_CR, statut: "en_attente" }];
  const deja = new Map([["lire-les-comptes-rendus", MAINTENANT - 5 * 1000]]);

  assert.deepEqual(
    lesReveilsADemander(attend, { maintenant: MAINTENANT, dejaReveille: deja }),
    []
  );
});

test("passé le délai, la fonction se redemande", () => {
  const attend = [{ geste: GESTE_DES_CR, statut: "en_attente" }];
  const deja = new Map([["lire-les-comptes-rendus", MAINTENANT - PAS_PLUS_SOUVENT_QUE_MS - 1]]);

  assert.deepEqual(
    lesReveilsADemander(attend, { maintenant: MAINTENANT, dejaReveille: deja }),
    ["lire-les-comptes-rendus"]
  );
});

/** Le frein porte sur une fonction, pas sur toutes : l'autre file n'attend pas. */
test("le frein d'une fonction ne retient pas l'autre", () => {
  const deja = new Map([["lire-les-comptes-rendus", MAINTENANT - 1000]]);

  assert.deepEqual(
    lesReveilsADemander([
      { geste: GESTE_DES_CR, statut: "en_attente" },
      { geste: GESTE_DES_MAILS, statut: "en_attente" }
    ], { maintenant: MAINTENANT, dejaReveille: deja }),
    ["verser-les-mails"]
  );
});

/** Sans mémoire des réveils, rien ne retient : le premier appel doit partir. */
test("sans mémoire des réveils, la demande part", () => {
  const attend = [{ geste: GESTE_DES_CR, statut: "en_attente" }];

  assert.deepEqual(
    lesReveilsADemander(attend, { maintenant: MAINTENANT, dejaReveille: null }),
    ["lire-les-comptes-rendus"]
  );
  assert.deepEqual(
    lesReveilsADemander(attend, { maintenant: MAINTENANT, dejaReveille: new Map() }),
    ["lire-les-comptes-rendus"]
  );
});
