/**
 * Une seule liste de colonnes, et personne qui écrive la sienne.
 *
 * Deux écrans lisaient les situations, chacun avec sa chaîne de `select`. Le
 * jour où `owner_id` est arrivée, un seul des deux l'a demandée — et l'écran
 * servi par l'autre affichait « créée avant le cloisonnement » sur chacune de
 * ses situations, y compris celles écrites la veille.
 *
 * Rien n'avait levé. C'est la règle 4 appliquée à une liste de noms, et c'est
 * le genre de panne qu'on ne trouve qu'en la cherchant.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { COLONNES_DUNE_SITUATION, clauseDesSituations } from "./colonnes-dune-situation.js";

const SERVICES = dirname(fileURLToPath(import.meta.url));
const WEB = join(SERVICES, "..", "..");

/* ── Ce que la liste doit contenir ───────────────────────────────────────── */

/**
 * Les colonnes dont un écran dépend, nommées une par une.
 *
 * La liste ci-dessous n'est pas une copie de l'autre : c'est **ce dont on a
 * besoin**, tandis que l'autre est **ce qu'on demande**. Quand elles se
 * séparent, c'est qu'une colonne est partie sans qu'on regarde qui la lisait.
 */
const INDISPENSABLES = {
  id: "sans elle, la ligne n'existe pas",
  owner_id: "sans elle, tout se lit « créée avant le cloisonnement »",
  perimetre: "sans elle, les situations trans-projets rétrécissent en silence",
  project_id: "le repli des situations qui n'ont pas encore de périmètre",
  status: "l'écran sépare les ouvertes des fermées",
  mode: "manuelle ou automatique, et la pastille le dit",
  filter_definition: "une situation automatique n'est que ça",
  title: "le nom qu'on lit",
  updated_at: "« mis à jour hier » se calcule dessus"
};

test("la liste porte ce dont les écrans dépendent", () => {
  const manquantes = Object.entries(INDISPENSABLES)
    .filter(([colonne]) => !COLONNES_DUNE_SITUATION.includes(colonne))
    .map(([colonne, pourquoi]) => `${colonne} (${pourquoi})`);

  assert.deepEqual(manquantes, []);
});

test("la clause est la liste, et rien d'autre", () => {
  assert.equal(clauseDesSituations(), COLONNES_DUNE_SITUATION.join(","));
  assert.equal(new Set(COLONNES_DUNE_SITUATION).size, COLONNES_DUNE_SITUATION.length, "aucun doublon");
});

/* ── Et personne n'écrit la sienne ───────────────────────────────────────── */

function fichiersJs(dossier, acc = []) {
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) {
      if (entree.name === "vendor" || entree.name === "node_modules") continue;
      fichiersJs(chemin, acc);
    } else if (entree.name.endsWith(".js")) {
      acc.push(chemin);
    }
  }
  return acc;
}

/**
 * **Le seul défaut qu'aucune exécution ne révèle : une chose absente.**
 *
 * Cette vérification lit du texte, et c'est assumé. Un module qui interroge
 * `rest/v1/situations` avec sa propre liste de colonnes ne lève rien — il rend
 * simplement moins que les autres, et l'écart ne se voit que sur l'écran qu'on
 * n'a pas ouvert ce jour-là.
 */
test("aucun lecteur des situations n'écrit sa propre liste de colonnes", () => {
  void statSync(WEB);
  const fautifs = [];

  // On n'interroge pas les noms de colonnes — `closed_at` appartient aussi aux
  // jalons, `progress_percent` aux sujets. On regarde **où** la clause est
  // posée : autour d'une URL qui vise `rest/v1/situations`.
  const AUTOUR = 700;

  for (const chemin of fichiersJs(join(WEB, "js"))) {
    const source = readFileSync(chemin, "utf8");

    for (const vise of source.matchAll(/rest\/v1\/situations/g)) {
      const fenetre = source.slice(vise.index, vise.index + AUTOUR);
      // Une clause littérale : `set("select", "id,project_id,…")`. Celle qui
      // appelle `clauseDesSituations()` n'est pas une chaîne, et ne matche pas.
      const ecriteAlaMain = fenetre.match(/["']select["']\s*,\s*\n?\s*"([a-z_]+(?:,[a-z_]+)+)"/);
      if (ecriteAlaMain) {
        fautifs.push(`${relative(WEB, chemin)} → "${ecriteAlaMain[1].slice(0, 60)}…"`);
      }
    }
  }

  assert.deepEqual(fautifs, [], "ces modules doivent appeler clauseDesSituations()");
});

/** Et les deux lecteurs connus s'en servent pour de bon. */
test("les deux lecteurs appellent la liste commune", () => {
  for (const nom of ["project-situations-supabase.js", "analysis-runner.js"]) {
    const source = readFileSync(join(SERVICES, nom), "utf8");
    assert.match(source, /rest\/v1\/situations/, `${nom} lit bien les situations`);
    assert.match(source, /clauseDesSituations\(\)/, `${nom} doit demander la liste commune`);
  }
});
