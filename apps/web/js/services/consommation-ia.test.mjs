import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { readdirSync } from "node:fs";
import {
  CHANGE, NATURES, TARIFS, appelPourLEcran, bornesDuMois, coutDeLAppel, enEuros, enJetons,
  jourDeLAppel, moisEnCours, moisEnFrancais, nomDeLaNature, parJour, parNature, parProjet,
  partDeLaPersonne, quoiDeLaNature, tarifDuModele, totalDesAppels
} from "./consommation-ia.js";

const appel = (reste = {}) => ({
  projetId: "p1", ownerId: "u1", model: "gpt-4.1-mini",
  entree: 1_000_000, sortie: 1_000_000, le: "2026-09-03T10:00:00Z", ...reste
});

/* ── Le prix ─────────────────────────────────────────────────────────────── */

/**
 * Le tarif est publié **par million de jetons** : c'est l'unité du fournisseur,
 * et la convertir ici en prix au jeton ferait un nombre à sept zéros que
 * personne ne peut relire ni comparer à la page de tarifs.
 */
test("un million de jetons coûte le tarif annoncé, converti en euros", () => {
  const attendu = (TARIFS["gpt-4.1-mini"].entree + TARIFS["gpt-4.1-mini"].sortie) * CHANGE.taux;
  assert.ok(Math.abs(coutDeLAppel(toArgs(appel())) - attendu) < 1e-9);
});

const toArgs = (a) => ({ model: a.model, inputTokens: a.entree, outputTokens: a.sortie });

/**
 * **`null` et non un tarif par défaut.** Un modèle dont on ne connaît pas le
 * prix doit se voir comme tel : lui en prêter un ferait un montant inventé au
 * milieu de montants réels, sans rien qui les distingue (règle 5).
 */
test("un modèle sans tarif connu ne reçoit pas un prix inventé", () => {
  assert.equal(tarifDuModele("modele-jamais-vu"), null);
  assert.equal(coutDeLAppel({ model: "modele-jamais-vu", inputTokens: 9e9, outputTokens: 9e9 }), null);
});

/**
 * **Un taux de change figé, et daté.** Un taux du jour ferait changer le coût
 * d'hier chaque matin : on regarderait deux fois le même mois et l'on verrait
 * deux montants, sans qu'aucun appel n'ait eu lieu (règle 6).
 */
test("le change et les tarifs disent quand ils ont été relevés", () => {
  assert.match(CHANGE.releveLe, /^\d{4}-\d{2}-\d{2}$/);
  for (const [model, tarif] of Object.entries(TARIFS)) {
    assert.match(tarif.releveLe, /^\d{4}-\d{2}-\d{2}$/, model);
    assert.ok(tarif.sortie > tarif.entree, `${model} : la sortie devrait coûter plus que l'entrée`);
  }
});

/* ── Les totaux, et ce qu'ils avouent ────────────────────────────────────── */

/**
 * **Un appel sans décompte n'est pas un appel gratuit.** Le compter pour zéro
 * ferait un total faux d'un montant qu'on ne peut pas nommer ; le mettre à part,
 * c'est dire de combien on se trompe (règle 5).
 */
test("un appel sans décompte se compte à part, jamais pour zéro", () => {
  const total = totalDesAppels([appel(), appel({ entree: null, sortie: null })]);

  assert.equal(total.appels, 2);
  assert.equal(total.sansDecompte, 1);
  assert.equal(total.entree, 1_000_000, "le décompte manquant n'ajoute pas de jetons");
});

test("un appel sur un modèle sans tarif compte ses jetons, pas son montant", () => {
  const total = totalDesAppels([appel({ model: "modele-jamais-vu" })]);

  assert.equal(total.jetons, 2_000_000);
  assert.equal(total.euros, 0);
  assert.equal(total.sansTarif, 1);
});

test("un total vide est un total, pas une absence", () => {
  const total = totalDesAppels([]);
  assert.deepEqual(
    { ...total },
    { appels: 0, entree: 0, sortie: 0, jetons: 0, euros: 0, sansDecompte: 0, sansTarif: 0 }
  );
});

/* ── Jour par jour ───────────────────────────────────────────────────────── */

/**
 * **Tous les jours de la fenêtre, y compris les vides.** Une courbe qui saute
 * les jours sans appel rapproche visuellement deux dates éloignées : on lit une
 * activité continue là où il y a eu une semaine de silence.
 */
test("la courbe porte tous les jours du mois, même ceux sans appel", () => {
  const jours = parJour([appel({ le: "2026-09-03T10:00:00Z" })], bornesDuMois("2026-09"));

  assert.equal(jours.length, 30);
  assert.equal(jours[0].jour, "2026-09-01");
  assert.equal(jours[0].appels, 0);
  assert.equal(jours[2].jour, "2026-09-03");
  assert.equal(jours[2].appels, 1);
});

test("un appel hors de la fenêtre n'entre pas dans la courbe", () => {
  const jours = parJour([appel({ le: "2026-08-31T23:00:00Z" })], bornesDuMois("2026-09"));
  assert.equal(jours.reduce((somme, jour) => somme + jour.appels, 0), 0);
});

test("les bornes d'un mois tiennent compte de sa longueur", () => {
  assert.deepEqual(bornesDuMois("2026-02"), { du: "2026-02-01", au: "2026-02-28" });
  assert.deepEqual(bornesDuMois("2024-02"), { du: "2024-02-01", au: "2024-02-29" });
  assert.deepEqual(bornesDuMois("2026-12"), { du: "2026-12-01", au: "2026-12-31" });
  assert.deepEqual(bornesDuMois("n'importe quoi"), { du: "", au: "" });
});

/* ── Par projet, et par personne ─────────────────────────────────────────── */

/**
 * Les appels sans projet sont rendus **à part** : les fondre dans un projet
 * quelconque ferait porter à celui-ci une consommation qui n'est pas la sienne.
 */
test("les appels hors projet ne se rangent pas dans un projet au hasard", () => {
  const lignes = parProjet([appel(), appel({ projetId: "" })]);
  const horsProjet = lignes.find((ligne) => ligne.projetId === "");

  assert.ok(horsProjet);
  assert.equal(horsProjet.nom, "Hors projet");
});

/**
 * Un projet qu'on ne sait pas nommer garde son identifiant plutôt qu'un libellé
 * inventé : on peut alors aller voir lequel c'est.
 */
test("un projet sans nom connu garde son identifiant", () => {
  const [ligne] = parProjet([appel({ projetId: "abc-123" })], () => "");
  assert.equal(ligne.nom, "abc-123");
  assert.equal(parProjet([appel({ projetId: "abc-123" })], () => "Presbytère")[0].nom, "Presbytère");
});

test("les projets se rangent du plus consommateur au moins", () => {
  const lignes = parProjet([
    appel({ projetId: "petit", entree: 1000, sortie: 1000 }),
    appel({ projetId: "gros", entree: 5_000_000, sortie: 5_000_000 })
  ]);
  assert.deepEqual(lignes.map((ligne) => ligne.projetId), ["gros", "petit"]);
});

test("ma part ne compte que mes appels", () => {
  const part = partDeLaPersonne([appel({ ownerId: "moi" }), appel({ ownerId: "toi" })], "moi");

  assert.equal(part.appels, 1);
  assert.equal(partDeLaPersonne([appel()], "").appels, 0, "sans identité, aucune part");
});

/* ── Ce qui s'écrit ──────────────────────────────────────────────────────── */

/**
 * **Quatre décimales sous un centime.** La plupart des appels coûtent moins
 * d'un centime : « 0,00 € » sur un écran qui existe pour montrer un coût
 * donnerait l'impression que rien n'est compté.
 */
test("un montant sous le centime ne s'affiche pas « 0,00 € »", () => {
  assert.equal(enEuros(0.0043), "0,0043 €");
  assert.equal(enEuros(1.5), "1,50 €");
  assert.equal(enEuros(0), "0,00 €");
  assert.equal(enJetons(1234567), "1 234 567".replace(/ /g, " "));
});

test("le mois se dit en toutes lettres, à un seul endroit", () => {
  assert.equal(moisEnFrancais("2026-09"), "septembre 2026");
  assert.equal(moisEnFrancais("2026-01"), "janvier 2026");
  assert.equal(moisEnFrancais("bof"), "bof");
  assert.match(moisEnCours(), /^\d{4}-\d{2}$/);
});

/* ── Ce qu'une ligne de la base devient ──────────────────────────────────── */

/**
 * **Les jetons manquants restent `null`.** Les lire comme zéro à la traduction
 * annulerait tout le soin pris ailleurs : le total ne saurait plus qu'il ignore
 * quelque chose.
 */
test("un décompte absent en base reste absent à l'écran", () => {
  const lu = appelPourLEcran({ model: "gpt-4o", input_tokens: null, output_tokens: 12 });

  assert.equal(lu.entree, null);
  assert.equal(lu.sortie, 12);
  assert.equal(lu.nature, "inconnu");
});

test("le jour d'un appel se lit sur sa date", () => {
  assert.equal(jourDeLAppel({ le: "2026-09-03T22:59:00Z" }), "2026-09-03");
  assert.equal(jourDeLAppel({}), "");
});

/* ── Ce que la base garantit, et que l'écran ne refait pas ───────────────── */

/**
 * **Le compteur dit *combien*, jamais *quoi*.** Garder le contenu des échanges
 * pour faire une addition serait un troc inacceptable, et la discrétion promise
 * aux conversations du copilote l'interdit de toute façon.
 */
test("le registre ne garde ni la question ni la réponse", () => {
  // **Les colonnes, pas les commentaires.** Ceux-ci disent précisément que le
  // contenu n'est pas gardé : les lire comme du SQL faisait échouer le test sur
  // la phrase qui promet ce qu'il vérifie.
  const colonnes = colonnesDeLaTable();

  for (const interdit of [/question/i, /\breply\b/i, /prompt/i, /content/i, /message/i]) {
    assert.doesNotMatch(colonnes, interdit, `une colonne porte du contenu : ${colonnes}`);
  }

  // **Et la liste exhaustive, qui est le vrai garde-fou** : une colonne ajoutée
  // demain sous un nom auquel je n'ai pas pensé fera échouer ceci, là où une
  // liste de mots interdits l'aurait laissée passer.
  assert.deepEqual(
    colonnes.split("\n").map((ligne) => ligne.trim().split(/\s+/)[0]).filter(Boolean).sort(),
    ["created_at", "id", "input_tokens", "model", "output_tokens", "owner_id", "project_id", "usage_kind"]
  );
});

/**
 * **Personne n'écrit depuis le navigateur.** C'est le serveur qui appelle le
 * modèle et reçoit le décompte ; laisser le navigateur écrire son compteur
 * reviendrait à demander à chacun de déclarer sa consommation.
 */
test("la table n'accepte aucune écriture depuis le navigateur", () => {
  const migration = lisLaMigration();

  assert.doesNotMatch(migration, /for (insert|update|delete|all)\b/);
  assert.match(migration, /for select/);
  // Chacun voit les siennes, et celles des projets où il travaille.
  assert.match(migration, /owner_id = auth\.uid\(\)/);
  assert.match(migration, /collaborator_user_id = auth\.uid\(\)/);
  // Additive.
  assert.doesNotMatch(migration, /\bdrop\s+(table|column)\b/i);
});

/**
 * Les jetons sont **nullables en base** : le fournisseur ne les annonce pas
 * toujours, et `not null` aurait forcé à écrire zéro, c'est-à-dire à mentir.
 */
test("les jetons peuvent manquer en base sans devenir zéro", () => {
  const migration = lisLaMigration();
  assert.match(migration, /input_tokens bigint,/);
  assert.match(migration, /output_tokens bigint,/);
  assert.doesNotMatch(migration, /input_tokens bigint not null/);
});

/** Le corps de `create table`, commentaires ôtés. */
function colonnesDeLaTable() {
  const migration = lisLaMigration();
  const debut = migration.indexOf("create table if not exists public.ai_usages (");
  const corps = migration.slice(debut, migration.indexOf("\n);", debut));

  return corps
    .split("\n")
    .slice(1)
    .map((ligne) => ligne.replace(/--.*$/, "").trim())
    .filter(Boolean)
    .join("\n");
}

function lisLaMigration() {
  return readFileSync(
    fileURLToPath(new URL("../../../../supabase/migrations/202609250001_ai_usages.sql", import.meta.url)),
    "utf8"
  );
}

/* ── Où va l'argent : la question qui fait décider ───────────────────────── */

/**
 * **Un total par projet dit *combien*, jamais *pour quoi faire*.** Or on ne
 * change pas ses habitudes en apprenant qu'un chantier coûte douze euros ; on
 * les change en apprenant que dix de ces douze partent dans la lecture de PDF.
 */
test("la répartition par usage range du plus coûteux au moins", () => {
  const lignes = parNature([
    appel({ nature: "titre-de-proposition", entree: 2000, sortie: 200 }),
    appel({ nature: "extraction-sujets", entree: 5_000_000, sortie: 100_000 }),
    appel({ nature: "copilote", entree: 100_000, sortie: 20_000 })
  ]);

  assert.deepEqual(lignes.map((ligne) => ligne.code),
    ["extraction-sujets", "copilote", "titre-de-proposition"]);
  assert.ok(lignes[0].euros > lignes[2].euros * 100, "l'écart doit sauter aux yeux");
});

/**
 * Chaque ligne dit ce que l'appel **faisait**, pas quelle fonction s'exécutait :
 * « extract-sujets » n'apprend rien sur le geste qu'on pourrait faire autrement.
 */
test("une nature se nomme par le geste, pas par la fonction", () => {
  assert.equal(nomDeLaNature("extraction-sujets"), "Lecture des comptes rendus");
  assert.match(quoiDeLaNature("extraction-sujets"), /compte rendu/i);

  for (const [code, nature] of Object.entries(NATURES)) {
    assert.ok(nature.nom, code);
    assert.ok(nature.quoi, `${code} ne dit pas ce qu'il fait`);
    assert.doesNotMatch(nature.nom, /extract-|generate-|recognize-|resolve-/,
      `${code} porte un nom de fonction plutôt qu'un geste`);
  }
});

/**
 * **Un code inconnu garde son code**, et ne devient pas « Autre ». Une fonction
 * ajoutée demain sans son nom doit se voir : rangée sous « Autre », sa
 * consommation serait invisible au milieu du reste (règle 5).
 */
test("une nature inconnue se voit, elle ne se range pas sous « Autre »", () => {
  assert.equal(nomDeLaNature("une-fonction-toute-neuve"), "une-fonction-toute-neuve");
  assert.equal(nomDeLaNature(""), "Sans nature");
  assert.doesNotMatch(JSON.stringify(NATURES), /"Autre"/);
});

/**
 * **Le garde-fou de toute la répartition.**
 *
 * Le code d'une nature est écrit par la fonction de bord qui dépose ; le nom
 * vit dans le navigateur. Les deux ne peuvent pas partager de module —
 * l'orchestration du serveur ne descend jamais. Ce test relit donc les
 * fonctions : sans lui, une fonction ajoutée demain afficherait son code brut
 * dans la répartition, et personne ne saurait de quoi il s'agit.
 */
test("toute nature déposée par une fonction a son nom à l'écran", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const racine = fileURLToPath(new URL("../../../../supabase/functions/", import.meta.url));

  const codes = new Set();
  const parcourir = (dossier) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = `${dossier}${entree.name}${entree.isDirectory() ? "/" : ""}`;
      if (entree.isDirectory()) parcourir(chemin);
      else if (/\.(ts|js)$/.test(entree.name)) {
        for (const trouve of readFileSync(chemin, "utf8").matchAll(/usageKind:\s*"([^"]+)"/g)) {
          codes.add(trouve[1]);
        }
      }
    }
  };
  parcourir(racine);

  assert.ok(codes.size >= 10, `trop peu de natures trouvées : ${[...codes].join(", ")}`);
  for (const code of codes) {
    assert.ok(NATURES[code], `la nature « ${code} » est déposée mais n'a pas de nom à l'écran`);
  }
});

/**
 * **Et l'inverse : tout appel de modèle dépose.** Une fonction qui appelle
 * OpenAI sans compter rend le total faux en silence — et c'est exactement ce
 * qu'on ne veut plus.
 */
test("toute fonction qui appelle un modèle dépose sa consommation", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const racine = fileURLToPath(new URL("../../../../supabase/functions/", import.meta.url));

  const manquantes = [];
  for (const entree of readdirSync(racine, { withFileTypes: true })) {
    if (!entree.isDirectory() || entree.name === "_shared") continue;
    const chemin = `${racine}${entree.name}/index.ts`;
    if (!existsSync(chemin)) continue;

    const source = readFileSync(chemin, "utf8");
    const appelle = source.includes("api.openai.com");
    // **Un appel, pas une mention.** Chercher le nom seul laissait passer une
    // fonction dont il ne restait que l'import : le garde-fou se déclarait
    // satisfait par la ligne qui ne fait rien.
    const compte = /deposerLaConsommation\(\{/.test(source) || /tracage:\s*\{/.test(source);
    if (appelle && !compte) manquantes.push(entree.name);
  }

  assert.deepEqual(manquantes, [],
    `ces fonctions appellent un modèle sans compter : ${manquantes.join(", ")}`);
});
