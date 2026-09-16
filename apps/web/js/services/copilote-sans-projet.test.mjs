/**
 * La chaîne d'une discussion qui n'est d'aucun projet.
 *
 * ## Pourquoi on lit des sources ici
 *
 * Toute cette chaîne parle à la base ou au serveur : elle ne s'importe pas. Ce
 * qui est vérifié n'est donc pas du raisonnement — celui-là est dans
 * `projets-actifs.test.mjs` et `profil-de-travail.test.mjs`, et il s'exécute —
 * mais **quatre défauts strictement invisibles**, du genre qu'aucune exécution
 * ne montre et qu'aucune erreur ne lève :
 *
 *  1. un filtre absent dans une requête : `listConversations(null)` sans
 *     `.is("project_id", null)` rendrait **toutes** mes discussions, celles de
 *     tous mes projets mêlées, dans un rail qui promet le contraire ;
 *  2. un identifiant de projet envoyé quand il n'y en a pas : le serveur lirait
 *     un chantier et joindrait sa mémoire à une question qui n'en parlait pas ;
 *  3. une garde restée côté serveur : un refus sec sur toute question sans
 *     projet, et l'écran transverse ne répondrait jamais ;
 *  4. une migration qui durcit au lieu d'ajouter.
 *
 * Trois d'entre eux se voient à l'écran comme « ça ne marche pas », sans dire
 * où, et le premier ne se voit pas du tout.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), "utf8");

const porte = lire("./copilote-conversations-supabase.js");
const service = lire("./copilote-service.js");
const ecran = lire("../views/studio/copilote/copilote.js");
const fonction = lire("../../../../supabase/functions/project-copilot/index.ts");
const migration = lire("../../../../supabase/migrations/202610050001_copilot_conversations_sans_projet.sql");

/* ── La lecture en base ──────────────────────────────────────────────────── */

/**
 * **`null` et `""` ne disent pas la même chose**, et c'est tout l'enjeu :
 * « aucun projet » est une question qui a une réponse, « je ne sais pas de quel
 * projet il s'agit » n'en a pas.
 */
test("les discussions sans projet se demandent par is(null), pas par égalité", () => {
  assert.match(porte, /\.is\("project_id", null\)/, "le filtre qui les retient");
  assert.match(porte, /sansProjet = projectId === null/, "`null` vaut « aucun projet »");
  assert.match(
    porte, /if \(!projet && !sansProjet\) return \[\]/,
    "`\"\"` reste « on ne sait pas », et ne rend rien"
  );
});

test("créer une discussion sans projet écrit NULL, et non une chaîne vide", () => {
  const creation = porte.slice(porte.indexOf("export async function createConversation"));

  assert.match(creation, /projectId !== null/, "`null` est accepté, `\"\"` refusé");
  assert.match(creation, /project_id: projet \|\| null/, "la colonne reçoit NULL");
});

/* ── L'écran ─────────────────────────────────────────────────────────────── */

/**
 * Trois réponses, et non deux. Confondre `null` et `""` ferait un écran
 * transverse éternellement vide — sans jamais dire pourquoi.
 */
test("l'écran distingue « aucun projet » de « projet non relié »", () => {
  const resolution = ecran.slice(ecran.indexOf("async function projetEnBase"));

  assert.match(resolution.slice(0, 260), /store\.currentProjectId[\s\S]{0,80}return null/);
  assert.match(ecran, /projet === "" \? \[\] : await listConversations\(projet\)/);
  assert.match(ecran, /if \(projet === ""\) throw new Error/);
});

/* ── L'envoi ─────────────────────────────────────────────────────────────── */

/**
 * **La marque est `currentProjectId`**, comme partout ailleurs. Un second
 * drapeau dirait un jour autre chose que le premier (règle 4).
 */
test("sans projet, l'envoi ne porte aucun identifiant de chantier", () => {
  assert.match(service, /const transversal = !String\(store\.currentProjectId \|\| ""\)\.trim\(\)/);
  assert.match(service, /const projectId = transversal\s*\n?\s*\? null/);
  assert.match(
    service, /transversal \? await contexteTransversal\(\) : await buildAssistContext\(\)/,
    "et le contexte envoyé est la façon de travailler, pas une mémoire vide"
  );
});

/* ── Le serveur ──────────────────────────────────────────────────────────── */

/**
 * La fonction exigeait un projet et refusait tout le reste. Elle ne l'exige
 * plus — mais **elle ne doit pas se taire pour autant** : un contexte sans
 * titre laisserait le modèle croire qu'on a oublié de joindre la mémoire, et il
 * la remplacerait par une invention plausible.
 */
test("le serveur accepte une question sans projet, et dit qu'il n'y en a pas", () => {
  assert.doesNotMatch(fonction, /project_id est requis/, "plus de refus sec");
  assert.match(fonction, /# Aucun projet/, "le contexte le dit en toutes lettres");
  assert.match(fonction, /# Façon de travailler/);

  // Le droit de lire le projet reste vérifié **quand il y en a un** : c'est la
  // garde qui empêche d'interroger la mémoire d'un chantier qui n'est pas le
  // sien, et elle n'a pas à sauter parce qu'une autre route existe.
  assert.match(fonction, /if \(projectId\)/);
  assert.match(fonction, /\.from\("projects"\)/);
});

/* ── La migration ────────────────────────────────────────────────────────── */

test("la migration est additive : elle desserre, elle ne supprime rien", () => {
  assert.match(migration, /alter column project_id drop not null/);
  assert.match(migration, /create index if not exists/);

  assert.doesNotMatch(migration, /drop table|drop column|drop policy/i);
  // La politique ne bouge pas d'une ligne : elle n'a jamais regardé le projet,
  // seulement le propriétaire. La rouvrir ici serait la fuite même qu'on refuse.
  assert.doesNotMatch(migration, /create policy|alter policy/i);
});
