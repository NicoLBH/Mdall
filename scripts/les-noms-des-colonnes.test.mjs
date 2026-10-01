/**
 * **Aucune migration ne nomme une colonne avec un mot réservé.**
 *
 * ## Le défaut, et il a refusé un déploiement
 *
 * Une migration ajoutait une colonne `analyse`. Elle a été refusée, en
 * production, au moment du déploiement :
 *
 *     ERROR: syntax error at or near "analyse" (SQLSTATE 42601)
 *
 * `ANALYSE` est un mot **réservé** de PostgreSQL — l'orthographe britannique
 * d'`ANALYZE`. Rien ne le disait avant : le mot est français, il est ordinaire,
 * et les épreuves qui relisent les migrations lisent du **texte**.
 *
 * ## Pourquoi relire le texte, ici, se justifie
 *
 * Le seul juge serait PostgreSQL, et l'intégration continue n'en a pas. Une
 * épreuve qui en demanderait un s'ignorerait là où elle sert : juste avant le
 * déploiement. On confronte donc les noms déclarés à une liste — écrite dans
 * `les-mots-reserves.mjs`, et **vérifiée contre `pg_get_keywords()`** par
 * `le-banc-des-politiques` partout où un serveur existe.
 *
 * C'est le cas que la règle de la maison réserve à la lecture de source : un
 * défaut précisément invisible, dans un fichier qu'aucune épreuve ne peut
 * exécuter.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { leSchema } from "./les-colonnes-du-schema.mjs";
import { LES_MOTS_RESERVES, cestUnMotReserve } from "./les-mots-reserves.mjs";

const SCHEMA = leSchema();

test("aucune table ni colonne ne porte un mot réservé", () => {
  const heurts = [];

  for (const [table, colonnes] of SCHEMA) {
    if (cestUnMotReserve(table)) {
      heurts.push(`la table « ${table} » porte un mot réservé`);
    }
    for (const colonne of colonnes) {
      if (cestUnMotReserve(colonne)) {
        heurts.push(`« ${table}.${colonne} » porte un mot réservé : la migration sera refusée`);
      }
    }
  }

  assert.deepEqual(heurts, [],
    `PostgreSQL refusera ces noms sans guillemets :\n${heurts.join("\n")}`);
});

/**
 * **Le compte est une garde, pas une décoration.** Un lecteur qui rendrait un
 * schéma vide ne trouverait aucun heurt, et l'épreuve passerait en n'ayant rien
 * relu (règle 12).
 */
test("le banc a bien relu le schéma", () => {
  assert.ok(SCHEMA.size > 20, `trop peu de tables relues : ${SCHEMA.size}`);

  const combien = [...SCHEMA.values()].reduce((total, une) => total + une.size, 0);
  assert.ok(combien > 200, `trop peu de colonnes relues : ${combien}`);
});

/**
 * **Et la liste reconnaît pour de vrai le mot qui a coûté le déploiement.**
 *
 * Sans ce témoin, une liste vidée — ou une comparaison qui ne replie pas la
 * casse — laisserait l'épreuve ci-dessus verte, et aveugle.
 */
test("la liste refuse les mots qui ont coûté, et laisse passer les autres", () => {
  for (const reserve of ["analyse", "ANALYSE", "AnAlYsE", "analyze", "check", "order", "user"]) {
    assert.equal(cestUnMotReserve(reserve), true, `« ${reserve} » devrait être refusé`);
  }

  for (const permis of ["analyse_gelee", "mesures", "document_id", "tenue_le", "lu_par", ""]) {
    assert.equal(cestUnMotReserve(permis), false, `« ${permis} » devrait passer`);
  }

  assert.ok(LES_MOTS_RESERVES.size > 90, `la liste est trop courte : ${LES_MOTS_RESERVES.size}`);
});
