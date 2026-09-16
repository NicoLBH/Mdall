/**
 * Ce qui relie la courbe à la base.
 *
 * ## Pourquoi on lit des sources ici
 *
 * La lecture parle à la base et ne s'importe pas ; la fonction SQL, elle, ne
 * s'exécute pas sans base. Le raisonnement est ailleurs et il s'exécute
 * (`activite-des-projets.test.mjs`). Ce qui est vérifié ici, ce sont **trois
 * défauts que rien ne montre** :
 *
 *  1. un **nom d'appel** qui ne correspond pas au nom de la fonction : la base
 *     répond en erreur, la lecture retombe sur `null`, et toutes les courbes
 *     disparaissent en silence — exactement comme si personne n'avait rien fait
 *     de l'année ;
 *  2. une fonction **`security definer`** : elle compterait les projets qu'on
 *     n'a pas le droit de voir, et rendrait leur existence par la bande. Une
 *     courbe est déjà une information ;
 *  3. une lecture qui **déguise une erreur en liste vide** : l'écran dessinerait
 *     une ligne plate pour chaque projet, ce qui est une affirmation — et
 *     fausse (règle 5).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), "utf8");

const lecture = lire("./activite-des-projets-supabase.js");

/**
 * Le SQL **sans ses commentaires**.
 *
 * Une prose qui explique pourquoi on n'a pas choisi `security definer` n'est
 * pas une fonction `security definer` — et la garde qui lisait le fichier entier
 * tombait sur son propre commentaire.
 */
const sansProse = (source) => source.replace(/^\s*--.*$/gm, "");

const migration = sansProse(
  lire("../../../../supabase/migrations/202610120001_activite_des_projets.sql")
);

/**
 * **Le nom est dit à deux endroits**, et deux écritures d'un même nom se
 * renomment un jour d'un seul côté (règle 10). Ici, le décalage ne lève pas :
 * la base répond en erreur et l'écran se tait.
 */
test("le nom appelé est celui de la fonction déclarée", () => {
  const appele = lecture.match(/supabase\.rpc\("([^"]+)"/)?.[1];
  const declaree = migration.match(/create or replace function public\.([a-z_]+)\(/)?.[1];

  assert.ok(appele, "la lecture appelle bien une fonction");
  assert.equal(appele, declaree);
});

/** Et le nom du paramètre avec : un paramètre inconnu fait échouer l'appel. */
test("le paramètre passé est celui que la fonction déclare", () => {
  const passe = lecture.match(/\{\s*(p_[a-z_]+):/)?.[1];

  assert.ok(passe, "la lecture passe bien un paramètre nommé");
  assert.match(migration, new RegExp(`${passe} integer`), "la fonction le déclare");
});

/**
 * **La fonction ne donne aucun droit.** `security invoker` la fait s'exécuter
 * avec les droits de qui l'appelle : les politiques des trois tables
 * s'appliquent comme sur une lecture directe. En `definer`, elle compterait ce
 * qu'on n'a pas le droit de voir — et la courbe le dirait.
 */
test("la fonction s'exécute avec les droits de qui l'appelle", () => {
  assert.match(migration, /security invoker/);
  assert.doesNotMatch(migration, /security definer/);

  // Elle ne peut rien écrire non plus : `stable` l'interdit au niveau du moteur,
  // ce qu'aucune relecture ne garantit.
  assert.match(migration, /\bstable\b/);
});

/** Additive : rien n'est supprimé, aucune politique n'est touchée. */
test("la migration n'ajoute qu'une fonction", () => {
  assert.doesNotMatch(migration, /drop table|drop column|drop policy|alter table/i);
  assert.doesNotMatch(migration, /create policy|alter policy/i);
});

/**
 * **Une erreur n'est pas une liste vide.** La première laisse la cellule vide,
 * la seconde dessine une ligne à zéro — qui affirme quelque chose.
 */
test("une lecture qui échoue rend null, pas une liste", () => {
  assert.match(lecture, /if \(error\) return null;/);
});

/** Ce qui est supprimé n'a pas fait vivre le projet : il ne se compte pas. */
test("les lignes supprimées ne comptent pas", () => {
  assert.equal((migration.match(/deleted_at is null/g) || []).length, 2,
    "les documents et les commentaires, qui portent tous deux une suppression douce");
});
