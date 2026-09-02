/**
 * Ce qui a cassé le journal des actions, et ce qui l'empêchera de recasser.
 *
 * PostgREST rejette **toute** une requête si une seule colonne demandée
 * n'existe pas. Une colonne rangée avec les obligatoires alors que sa migration
 * n'était pas passée a donc fait disparaître l'intégralité du journal — et non
 * le seul détail qu'elle porte. C'est une classe d'erreur, pas un accident :
 * elle se reproduira à chaque colonne ajoutée si rien ne la retient.
 */

import test from "node:test";
import assert from "node:assert/strict";

// Ce module lit `../../assets/js/auth.js`, qui importe le client Supabase
// depuis un CDN : Node ne sait pas le charger. On relit donc la source, comme
// le fait déjà le test de cloisonnement du Copilote.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(ICI, "project-supabase-sync.js"), "utf8");

/** On recharge la fonction pure sans son fichier, qui n'est pas chargeable ici. */
const essaisDeColonnes = new Function(
  `${SOURCE.slice(SOURCE.indexOf("export function essaisDeColonnes"))
    .split("\n\nexport async function")[0]
    .replace("export function", "function")}
  return essaisDeColonnes;`
)();

test("la liste la plus complète est essayée en premier", () => {
  const essais = essaisDeColonnes("id,nom", ["steps", "owner_id"]);
  assert.equal(essais[0], "id,nom,steps,owner_id");
});

test("on abandonne la colonne la plus récente d'abord", () => {
  // C'est celle dont la migration a le plus de chances de manquer.
  assert.deepEqual(essaisDeColonnes("id", ["steps", "owner_id"]), [
    "id,steps,owner_id",
    "id,steps",
    "id"
  ]);
});

test("la dernière tentative ne demande que le socle", () => {
  const essais = essaisDeColonnes("id,nom", ["a", "b", "c"]);
  assert.equal(essais.at(-1), "id,nom");
  assert.equal(essais.length, 4);
});

test("sans colonne récente, il n'y a qu'une tentative", () => {
  assert.deepEqual(essaisDeColonnes("id"), ["id"]);
});

test("les colonnes récentes sont déclarées, et le socle ne les contient pas", () => {
  // Le socle est ce qui existe depuis la création de la table : y glisser une
  // colonne récente, c'est refaire exactement la panne qu'on corrige.
  const recentes = SOURCE.match(/COLONNES_RECENTES_DES_COURSES = \[(.*?)\]/s)[1];
  const socle = SOURCE.match(/const CT_RUN_SOCLE =\s*([\s\S]*?);/)[1];
  for (const colonne of recentes.match(/"([a-z_]+)"/g).map((c) => c.replaceAll('"', ""))) {
    assert.ok(!socle.includes(colonne), `${colonne} est récente : elle n'a rien à faire dans le socle`);
  }
});

test("owner_id et steps sont bien traités comme récents", () => {
  assert.match(SOURCE, /COLONNES_RECENTES_DES_COURSES = \[[^\]]*"steps"/);
  assert.match(SOURCE, /COLONNES_RECENTES_DES_COURSES = \[[^\]]*"owner_id"/);
});
