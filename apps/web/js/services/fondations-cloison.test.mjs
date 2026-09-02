/**
 * L'étude de fondations est privée. Ce test le rend vérifiable.
 *
 * On y essaie, on fait varier une cote, on relance. Publier ces essais
 * reviendrait à afficher le brouillon de quelqu'un, et la première conséquence
 * serait qu'on cesse d'essayer. La garantie ne repose pas sur une intention
 * mais sur la politique de sécurité de la table — et sur le fait qu'une seule
 * porte y mène.
 *
 * Une règle écrite dans un commentaire se perd ; une règle qui casse la
 * construction, non.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..", "..", "..");
const MIGRATION = readFileSync(
  join(RACINE, "supabase", "migrations", "202609120001_fondation_semelles.sql"), "utf8"
);

test("la table n'est lisible et modifiable que par son propriétaire", () => {
  assert.match(MIGRATION, /enable row level security/);
  assert.match(MIGRATION, /using \(owner_id = auth\.uid\(\)\)/);
  // `with check` autant que `using` : sans lui, on pourrait écrire une ligne au
  // nom d'un autre, et la lire ensuite depuis son compte.
  assert.match(MIGRATION, /with check \(owner_id = auth\.uid\(\)\)/);
});

test("le propriétaire est posé par la base, jamais par le client", () => {
  assert.match(MIGRATION, /owner_id uuid not null default auth\.uid\(\)/);
});

test("aucun accès n'est ouvert aux comptes anonymes", () => {
  assert.match(MIGRATION, /to authenticated/);
  assert.doesNotMatch(MIGRATION, /to anon/);
  assert.doesNotMatch(MIGRATION, /using \(true\)/);
});

test("appartenir au projet ne donne aucun droit sur ces lignes", () => {
  // Le projet range les semelles ; il n'y ouvre pas la porte. Une politique qui
  // citerait `project_id` sans `owner_id` rendrait l'étude visible par l'équipe.
  const politiques = MIGRATION.split("create policy").slice(1);
  assert.ok(politiques.length > 0, "il faut au moins une politique");
  for (const politique of politiques) {
    assert.ok(politique.includes("owner_id = auth.uid()"),
      "chaque politique doit se refermer sur le propriétaire");
  }
});

/** Tous les fichiers du navigateur, pour vérifier qui parle à la table. */
function fichiersDuNavigateur() {
  const trouves = [];
  const parcourir = (chemin) => {
    for (const entree of readdirSync(chemin, { withFileTypes: true })) {
      const complet = join(chemin, entree.name);
      if (entree.isDirectory()) parcourir(complet);
      else if (entree.name.endsWith(".js") || entree.name.endsWith(".mjs")) trouves.push(complet);
    }
  };
  parcourir(join(RACINE, "apps", "web", "js"));
  return trouves;
}

test("une seule porte mène à la table", () => {
  const autorises = new Set(["fondations-etude-supabase.js", "fondations-cloison.test.mjs"]);
  const intrus = fichiersDuNavigateur().filter((fichier) => {
    if (autorises.has(fichier.split("/").pop())) return false;
    return readFileSync(fichier, "utf8").includes("fondation_semelles");
  });
  assert.deepEqual(intrus, [], "seul le service dédié doit nommer la table");
});

test("la porte ne propose aucune lecture qui ne soit pas la mienne", () => {
  const porte = readFileSync(join(ICI, "fondations-etude-supabase.js"), "utf8");
  // Elle filtre par projet ; c'est la base qui ajoute « et à moi ». Aucune
  // fonction ne doit offrir de lire par propriétaire choisi.
  assert.doesNotMatch(porte, /owner_id/, "le client n'a pas à manipuler le propriétaire");
  assert.doesNotMatch(porte, /service_role|SERVICE_ROLE/);
});

test("le calcul en lot ne reçoit pas plus que ce qu'il peut porter", () => {
  const fonction = readFileSync(
    join(RACINE, "supabase", "functions", "fondations-stabilite-externe", "index.ts"), "utf8"
  );
  assert.match(fonction, /SEMELLES_MAX/);
  assert.match(fonction, /Au plus \$\{SEMELLES_MAX\} semelles/);
});
