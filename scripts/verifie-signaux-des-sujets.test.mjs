import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Le **raccord** entre la fonction de la base et l'écran qui la lit.
 *
 * ## Ce que ce fichier vérifie, et ce qu'il ne vérifie pas
 *
 * Ce que la fonction *fait* est rejoué sur un vrai Postgres, dans
 * `signaux-des-sujets.test.mjs` : la recherche des `@`, le pli des accents, les
 * échanges privés qui ne comptent pas. Rien de cela n'est redit ici — deux
 * expressions d'une même règle divergent à la première qui bouge (règle 4).
 *
 * Reste une chose qu'aucune exécution ne couvre : **les noms**. Le client
 * appelle une fonction par son nom et lit ses colonnes par les leurs, et un nom
 * changé d'un seul côté ne lève rien — la clé rend `undefined`, `undefined`
 * devient une liste vide, et le filtre cesse de filtrer en silence. C'est
 * exactement ce qui a coûté un tour entier sur cet écran.
 *
 * C'est donc un garde-fou de nom, et rien de plus.
 */

const lis = (chemin) => readFileSync(new URL(chemin, import.meta.url), "utf8");

const MIGRATION = lis("../supabase/migrations/202609290001_signaux_des_sujets.sql");
const CHARGEUR = lis("../apps/web/js/services/project-subjects-supabase.js");
const CHARGE = lis("../apps/web/js/services/charge-des-sujets.js");

/**
 * La migration sans ses commentaires : ils nomment des choses pour dire
 * pourquoi on ne s'en sert pas, et un test qui lirait le fichier entier
 * prendrait l'explication pour la chose.
 */
const SQL = MIGRATION.split("\n").filter((ligne) => !ligne.trim().startsWith("--")).join("\n");

/** Les trois colonnes que la fonction rend, et que le client lit. */
const COLONNES = ["subject_id", "last_activity_at", "mention_person_ids"];

test("la migration déclare la fonction que le client appelle", () => {
  assert.match(SQL, /create or replace function public\.project_subject_signals\(p_project_id uuid\)/);
  assert.match(CHARGEUR, /rpcCall\("project_subject_signals", \{ p_project_id: projectId \}\)/);
});

test("les colonnes rendues sont celles qui sont lues", () => {
  for (const colonne of COLONNES) {
    assert.ok(SQL.includes(colonne), `la migration ne rend pas « ${colonne} »`);
    assert.ok(CHARGE.includes(colonne), `« ${colonne} » n'est lu nulle part dans la charge`);
  }
});

/**
 * **Le coût que ce tour existe pour supprimer.** Le navigateur rapatriait le
 * corps de tous les messages du projet pour y chercher les `@` et y lire les
 * dates ; c'est ce qui a fait descendre le calcul en base.
 */
test("le chargeur ne redemande plus le texte des messages", () => {
  // Ce qu'on vérifie est **ce qu'il demande à la base**, et non que le nom de
  // la colonne n'apparaisse nulle part : ce fichier a d'autres raisons
  // légitimes d'écrire un corps de message, et les lui interdire ferait tomber
  // le test sur autre chose que ce qu'il surveille.
  const demandes = [...CHARGEUR.matchAll(/set\("select",\s*"([^"]*)"/g)].map(([, quoi]) => quoi);

  assert.ok(demandes.length > 3, `le chargeur ne demande que ${demandes.length} listes de colonnes`);
  for (const demande of demandes) {
    assert.ok(!demande.includes("body_markdown"),
      `le chargeur redemande le corps des messages : « ${demande} »`);
  }
});
