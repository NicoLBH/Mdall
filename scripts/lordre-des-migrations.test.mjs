/**
 * L'ordre des migrations, et pourquoi il casse le déploiement.
 *
 * ## Le défaut, et pourquoi on ne le voit pas en écrivant
 *
 * `supabase db push` refuse **d'insérer une migration avant la dernière déjà
 * appliquée**. Une migration neuve doit donc porter un horodatage strictement
 * plus grand que toutes les autres — sinon le déploiement s'arrête net, avec un
 * message qui parle d'un *autre* fichier que celui qu'on vient d'écrire :
 *
 *     Found local migration files to be inserted before the last migration on
 *     remote database: supabase/migrations/202610050001_situations_perimetre.sql
 *
 * C'est exactement ce qui est arrivé. Le fichier neuf portait `202610050001`,
 * déjà pris par `situations_perimetre`, et se rangeait **avant** lui dans
 * l'ordre alphabétique — donc six migrations avant la dernière appliquée. Rien,
 * dans le dépôt, ne le signalait : le SQL était juste, les tests passaient, et
 * l'on ne s'en apercevait qu'au déploiement.
 *
 * ## Ce que cette garde vérifie
 *
 * Deux choses, sur les **vrais noms de fichiers** :
 *
 *  1. **aucun horodatage en double** — deux migrations du même instant se
 *     départagent par le reste du nom, ce qui n'a aucun sens et se range
 *     autrement chez chacun ;
 *  2. **l'ordre du disque est celui des horodatages** — c'est l'ordre dans
 *     lequel la base les appliquera, et il ne doit pas dépendre du libellé qui
 *     suit.
 *
 * Elle ne dit pas laquelle est la dernière appliquée en ligne — le dépôt ne le
 * sait pas. Mais une migration neuve qui respecte ces deux règles est, par
 * construction, la dernière du dossier.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");

const fichiers = readdirSync(MIGRATIONS).filter((nom) => nom.endsWith(".sql")).sort();

/** L'horodatage d'une migration : ce qui précède le premier tiret bas. */
const horodatageDe = (nom) => nom.split("_")[0];

test("chaque migration porte un horodatage lisible", () => {
  assert.ok(fichiers.length, "il y a des migrations");

  for (const nom of fichiers) {
    assert.match(
      horodatageDe(nom), /^\d{12}$/,
      `${nom} : l'horodatage précède le premier tiret bas, et fait douze chiffres`
    );
  }
});

/**
 * **Deux migrations du même instant n'ont pas d'ordre.** Elles se départagent
 * par le libellé qui suit — un détail de rédaction décide alors laquelle passe
 * en premier, et la seconde peut se retrouver avant une migration déjà
 * appliquée. Le déploiement s'arrête, et le message nomme l'autre fichier.
 */
test("aucun horodatage n'est employé deux fois", () => {
  const vus = new Map();

  for (const nom of fichiers) {
    const quand = horodatageDe(nom);
    assert.ok(
      !vus.has(quand),
      `${nom} porte le même horodatage que ${vus.get(quand)} : une migration neuve `
        + "en prend un strictement plus grand que toutes les autres"
    );
    vus.set(quand, nom);
  }
});

/** L'ordre du dossier est celui des horodatages, et de rien d'autre. */
test("l'ordre alphabétique des fichiers est celui des horodatages", () => {
  const parLeNom = fichiers.map(horodatageDe);
  const parLeTemps = [...parLeNom].sort();

  assert.deepEqual(parLeNom, parLeTemps, "le libellé ne décide de rien");
});

/* ── Ce que la base refuse, et qu'on n'apprend qu'au déploiement ─────────── */

/**
 * Un fichier de migration, **sans ses commentaires**.
 *
 * Indispensable ici : l'épreuve ci-dessous cherche du SQL interdit, et une
 * migration a toutes les raisons de **citer** ce SQL dans son en-tête pour
 * expliquer pourquoi elle ne le fait pas. Chercher dans le texte entier ferait
 * tomber l'épreuve sur la migration la mieux écrite du dossier.
 *
 * On retire les commentaires de ligne (`--`) et de bloc, dans cet ordre. Les
 * `--` qui vivraient à l'intérieur d'une chaîne survivraient à tort ; aucune
 * migration n'en porte, et une garde qui se contenterait de moins ne dirait
 * rien.
 */
function leSqlSeul(source) {
  return String(source)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((ligne) => ligne.replace(/--.*$/, ""))
    .join("\n");
}

/**
 * **Les tables de stockage ne se vident pas en SQL**, et on ne l'apprend qu'au
 * déploiement.
 *
 *     ERROR: Direct deletion from storage tables is not allowed.
 *     Use the Storage API instead. (SQLSTATE 42501)
 *
 * C'est arrivé, sur une migration qui supprimait un casier devenu inutile. Le
 * SQL était juste, les épreuves passaient, et `supabase db push` s'est arrêté
 * au neuvième ordre — après en avoir appliqué huit.
 *
 * Et la garde de Supabase a raison : un objet effacé par un `delete` laisse ses
 * octets dans le stockage de fond, qui ne connaît que l'API. La ligne
 * disparaîtrait, le fichier resterait — un casier vide en apparence, plein en
 * vérité.
 *
 * **Seule la suppression est refusée.** `insert into storage.buckets` crée les
 * casiers du dépôt depuis l'origine, et une migration met à jour le leur : ces
 * deux-là passent, et cette épreuve ne les concerne pas. Vider ou supprimer un
 * casier est un geste de l'API de stockage, à faire à la main, et la migration
 * qui s'arrête là doit le dire.
 */
const LES_TABLES_DE_STOCKAGE = ["storage.objects", "storage.buckets"];

/** Les tables de stockage dont ce SQL supprime des lignes. */
function lesSuppressionsDeStockage(source) {
  const sql = leSqlSeul(source);
  return LES_TABLES_DE_STOCKAGE.filter((table) =>
    new RegExp(`delete\\s+from\\s+${table.replace(".", "\\.")}`, "i").test(sql));
}

test("aucune migration ne supprime de lignes dans les tables de stockage", () => {
  for (const nom of fichiers) {
    assert.deepEqual(
      lesSuppressionsDeStockage(readFileSync(join(MIGRATIONS, nom), "utf8")), [],
      `${nom} : supprimer des lignes d'une table de stockage est refusé au `
        + "déploiement (« Use the Storage API instead »). Vider un casier est un "
        + "geste de l'API de stockage ; la migration retire les politiques et le dit."
    );
  }
});

/**
 * **L'épreuve ci-dessus doit pouvoir tomber, sur les deux tables, et ne pas
 * tomber sur un commentaire.**
 *
 * Les trois se vérifient ici, et il l'a fallu : aucune migration du dossier ne
 * supprime de lignes dans `storage.buckets`, donc cette moitié de la garde ne
 * pouvait pas tomber. Une garde qui ne peut pas tomber est une garde qu'on
 * retire sans s'en apercevoir (règle 4). C'est cette épreuve-ci qui la tient.
 */
test("la garde voit les deux tables, et ignore le SQL cité en commentaire", () => {
  for (const table of ["storage.objects", "storage.buckets"]) {
    assert.deepEqual(
      lesSuppressionsDeStockage(`delete from ${table} where id = 'x';`), [table]
    );
  }

  assert.deepEqual(lesSuppressionsDeStockage(`
    -- On écrivait : delete from storage.objects where bucket_id = 'archives';
    /* et aussi delete from storage.buckets where id = 'archives'; */
    drop policy if exists une_politique on storage.objects;
  `), []);
});
