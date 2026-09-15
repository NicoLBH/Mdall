/**
 * Le rangement des exécutions, et ce qu'il refuse d'affirmer.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { ORIGINE, ONGLETS, partitionnerActions, ongletValide, decrireVisibilite } from "./run-partition.js";

const PROJET = { id: "a", origine: "projet", privee: false };
const ATELIER = { id: "b", origine: "atelier", privee: true };
const ATELIER_ANCIEN = { id: "c", origine: "atelier", privee: false };

test("les exécutions se rangent par origine, sans en perdre", () => {
  const range = partitionnerActions([PROJET, ATELIER, ATELIER_ANCIEN]);
  assert.deepEqual(range[ORIGINE.PROJET].map((e) => e.id), ["a"]);
  assert.deepEqual(range[ORIGINE.ATELIER].map((e) => e.id), ["b", "c"]);
});

test("une exécution sans origine déclarée est un acte du projet", () => {
  // C'est le cas sûr : ranger dans l'Atelier ce dont on ne sait rien
  // reviendrait à masquer une action que tout le monde devrait voir.
  const range = partitionnerActions([{ id: "x" }, { id: "y", origine: "n'importe quoi" }]);
  assert.deepEqual(range[ORIGINE.PROJET].map((e) => e.id), ["x", "y"]);
  assert.equal(range[ORIGINE.ATELIER].length, 0);
});

test("l'ordre d'arrivée est conservé dans chaque pile", () => {
  const range = partitionnerActions([ATELIER_ANCIEN, PROJET, ATELIER]);
  assert.deepEqual(range[ORIGINE.ATELIER].map((e) => e.id), ["c", "b"]);
});

test("un onglet inconnu retombe sur les actions partagées", () => {
  assert.equal(ongletValide("atelier"), ORIGINE.ATELIER);
  assert.equal(ongletValide("projet"), ORIGINE.PROJET);
  assert.equal(ongletValide(""), ORIGINE.PROJET);
  assert.equal(ongletValide(undefined), ORIGINE.PROJET);
  assert.equal(ongletValide("brouillon"), ORIGINE.PROJET);
});

test("une action du projet ne porte aucune marque de visibilité", () => {
  assert.equal(decrireVisibilite(PROJET), null);
  assert.equal(decrireVisibilite({}), null);
});

test("une exécution d'Atelier qui a un propriétaire est marquée comme vôtre", () => {
  const v = decrireVisibilite(ATELIER);
  assert.equal(v.marque, true);
  assert.match(v.titre, /visible par vous seul/);
});

test("une exécution d'Atelier sans propriétaire ne se prétend pas privée", () => {
  // Elle date d'avant le cloisonnement : tout le monde la lit encore, et
  // l'écran doit le dire plutôt que promettre une confidentialité inexistante.
  const v = decrireVisibilite(ATELIER_ANCIEN);
  assert.equal(v.marque, false);
  assert.match(v.titre, /encore visible par le projet/);
  assert.equal(v.note, "antérieure au cloisonnement");
});

test("les deux onglets portent un libellé et une explication", () => {
  assert.equal(ONGLETS.length, 2);
  for (const onglet of ONGLETS) {
    assert.ok(onglet.libelle, "un onglet sans libellé ne se clique pas");
    assert.ok(onglet.explication.length > 20, "l'onglet doit dire ce qu'il change pour le lecteur");
  }
});

/**
 * La séparation est-elle vraiment tenue, ou seulement affichée ?
 *
 * Un onglet qui range bien ne protège rien : il suffirait d'un écran qui
 * oublie de filtrer. Ce test lit la migration pour vérifier que la règle est
 * posée là où elle ne peut pas être contournée — dans la base.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const MIGRATION = readFileSync(
  join(RACINE, "supabase", "migrations", "202609110001_ct_analysis_runs_atelier.sql"), "utf8"
);

test("la base connaît le propriétaire d'une exécution, et le pose elle-même", () => {
  assert.match(MIGRATION, /add column if not exists owner_id uuid/);
  // Demander au client d'envoyer le propriétaire, ce serait accepter qu'il
  // envoie celui d'un autre.
  assert.match(MIGRATION, /alter column owner_id set default auth\.uid\(\)/);
});

test("la lecture des exécutions d'Atelier est restreinte par la base, pas par l'écran", () => {
  assert.match(MIGRATION, /drop policy if exists ct_analysis_runs_open_all/);
  assert.match(MIGRATION, /for select/);
  assert.match(MIGRATION, /owner_id = auth\.uid\(\)/);
  assert.match(MIGRATION, /trigger_source is distinct from 'atelier'/);
});

test("les exécutions déjà écrites ne disparaissent pas du journal", () => {
  // Les cacher rétroactivement ferait s'évanouir des lignes que des gens ont
  // vues hier, sans que personne l'ait demandé.
  assert.match(MIGRATION, /owner_id is null/);
});

/* ── Une fusion en cours ne disparaît pas quand on va la regarder ────────── */

/**
 * **Le défaut qui a fait croire que le journal ne marchait pas.**
 *
 * On cliquait « Fusionner », la ligne apparaissait avec son sablier — et elle
 * disparaissait dès qu'on ouvrait l'onglet Actions. L'onglet relit la base à
 * chaque venue, et la relecture remplaçait la liste entière : une fusion qui
 * dure une minute et demie n'est écrite en base qu'à la fin.
 */
test("une exécution en cours survit à la relecture de la base", async () => {
  const { executionsAGarder } = await import("./run-partition.js");

  const vivantes = [
    { id: "vive-1", status: "running" },
    { id: "finie-1", status: "completed" }
  ];
  const lues = [{ id: "ancienne-1", status: "completed" }];

  assert.deepEqual(executionsAGarder(vivantes, lues).map((e) => e.id), ["vive-1"]);
});

/**
 * **La version écrite l'emporte dès qu'elle existe.** Elle est complète ;
 * garder la vive à côté ferait deux lignes pour un seul geste (règle 4).
 */
test("une exécution que la base porte déjà ne se double pas", async () => {
  const { executionsAGarder } = await import("./run-partition.js");

  const gardees = executionsAGarder(
    [{ id: "vive-1", status: "running" }],
    [{ id: "vive-1", status: "completed" }]
  );

  assert.deepEqual(gardees, []);
});

/** Rien en mémoire, rien à garder — et aucune exception sur des listes absentes. */
test("sans exécution vive, il n'y a rien à garder", async () => {
  const { executionsAGarder } = await import("./run-partition.js");

  assert.deepEqual(executionsAGarder([], []), []);
  assert.deepEqual(executionsAGarder(null, null), []);
  assert.deepEqual(executionsAGarder(), []);
  // Une exécution finie n'est pas vive : elle vient de la base ou elle n'existe pas.
  assert.deepEqual(executionsAGarder([{ id: "x", status: "completed" }], []), []);
});
