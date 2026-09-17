import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  EXECUTEURS_DU_NAVIGATEUR, ROLES_QUE_CE_NAVIGATEUR_SAIT
} from "./copilote-executeurs.js";
import {
  DECLARATIONS_DU_NAVIGATEUR, ROLES_DU_NAVIGATEUR, ROLES_HISTORIQUES,
  declarationsPourCeNavigateur, roleDuNavigateur
} from "../../../../supabase/functions/_shared/utilitaires/variante-outil.js";

/* ── Les deux tables se répondent ────────────────────────────────────────── */

test("chaque rôle que le serveur écrit est un rôle que le navigateur sait exécuter", () => {
  // Le serveur nomme un rôle appel par appel ; cette table dit ce qu'on en
  // fait. Un outil ajouté d'un côté seulement partait au navigateur avec un
  // rôle qu'il ne connaissait pas — et l'ancien aiguillage, « cerveau ou sinon
  // variante », lançait alors l'outil d'à côté.
  assert.deepEqual(
    [...Object.values(ROLES_DU_NAVIGATEUR)].sort(),
    [...ROLES_QUE_CE_NAVIGATEUR_SAIT].sort()
  );

  // Et chaque entrée s'exécute : une clé qui ne serait pas une fonction
  // échouerait au moment de l'appel, c'est-à-dire devant l'utilisateur.
  for (const role of ROLES_QUE_CE_NAVIGATEUR_SAIT) {
    assert.equal(typeof EXECUTEURS_DU_NAVIGATEUR[role], "function", role);
  }
});

test("la liste annoncée est la table elle-même, pas une recopie", () => {
  // Deux listes — l'une pour exécuter, l'autre pour annoncer — auraient divergé
  // au premier rôle ajouté, et le serveur aurait offert ce que la page ne sait
  // pas faire (règle 4).
  assert.deepEqual(ROLES_QUE_CE_NAVIGATEUR_SAIT, Object.keys(EXECUTEURS_DU_NAVIGATEUR));
});

/* ── Le décalage de déploiement, reproduit ───────────────────────────────── */

test("un navigateur d'avant ne se voit pas offrir l'outil qu'il ne sait pas exécuter", () => {
  // **Le défaut, tel qu'il s'est produit.** Le serveur a été déployé avant le
  // site ; le modèle a appelé `ouvrir_un_ecran` ; l'appel est parti au
  // navigateur avec le rôle `navigation` ; l'ancien aiguillage a lancé le
  // moteur de variante. On lisait « Test d'une variante — il faut dire ce qu'on
  // change » après avoir demandé d'ouvrir un projet.
  const offerts = declarationsPourCeNavigateur(ROLES_HISTORIQUES).map((outil) => outil.name);

  assert.ok(offerts.length, "un navigateur d'avant garde ses outils");
  const navigation = DECLARATIONS_DU_NAVIGATEUR
    .find((outil) => roleDuNavigateur(outil.name) === "navigation");
  assert.ok(navigation, "l'outil de navigation existe");
  assert.equal(offerts.includes(navigation.name), false);
});

test("un navigateur qui ne dit rien est un navigateur d'avant", () => {
  // Lui supposer les rôles du jour lui enverrait celui qu'il ne sait pas faire,
  // c'est-à-dire exactement le défaut qu'on répare (règle 5).
  const sansRien = declarationsPourCeNavigateur(null).map((outil) => outil.name);
  assert.deepEqual(sansRien, declarationsPourCeNavigateur(ROLES_HISTORIQUES).map((o) => o.name));
  assert.deepEqual(declarationsPourCeNavigateur([]).map((o) => o.name), sansRien);
});

test("ce navigateur-ci se voit offrir tout ce qu'il sait exécuter", () => {
  // L'inverse compte autant : un filtre trop strict priverait le modèle d'un
  // outil que la page sait faire, et personne ne saurait pourquoi.
  const offerts = declarationsPourCeNavigateur(ROLES_QUE_CE_NAVIGATEUR_SAIT);
  assert.equal(offerts.length, DECLARATIONS_DU_NAVIGATEUR.length);

  // Et chaque outil offert porte un rôle que la table sait exécuter.
  const orphelins = offerts
    .map((outil) => roleDuNavigateur(outil.name))
    .filter((role) => !EXECUTEURS_DU_NAVIGATEUR[role]);
  assert.deepEqual(orphelins, []);
});

/* ── La cloison ──────────────────────────────────────────────────────────── */

test("le navigateur route sur le rôle, et n'apprend aucun nom d'outil", () => {
  const client = readFileSync(new URL("./copilote-service.js", import.meta.url), "utf8");
  const executeurs = readFileSync(new URL("./copilote-executeurs.js", import.meta.url), "utf8");
  const serveur = readFileSync(
    new URL("../../../../supabase/functions/project-copilot/index.ts", import.meta.url), "utf8"
  );

  assert.match(serveur, /quoi: roleDuNavigateur\(item\.name\)/, "le serveur écrit un rôle");
  assert.match(client, /appel\?\.quoi/, "le navigateur lit ce rôle");
  // Ce que la page annonce savoir faire part avec chaque question : sans cela,
  // le serveur retomberait sur les rôles d'avant et n'offrirait jamais rien de
  // neuf.
  assert.match(client, /browser_roles: ROLES_QUE_CE_NAVIGATEUR_SAIT/);

  // Et le régime de sécurité incendie du projet, qui décide quels agents
  // incendie sont déclarés. Un champ absent d'un corps de requête ne se voit
  // nulle part : le serveur lirait `undefined`, offrirait tous les agents, et
  // le routage serait mort sans qu'aucun test ne tombe.
  assert.match(client, /fire_regime: regimeDeLaMemoire\(assertions\)/);
  assert.match(serveur, /declarationsPourModele\(\{ regimeIncendie: texte\(payload\.fire_regime\) \}\)/);

  for (const nom of Object.keys(ROLES_DU_NAVIGATEUR)) {
    assert.ok(!client.includes(nom), `${nom} est écrit dans le navigateur`);
    assert.ok(!executeurs.includes(nom), `${nom} est écrit dans la table des exécuteurs`);
  }
});
