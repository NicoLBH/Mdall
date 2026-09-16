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
import { readdirSync } from "node:fs";
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
