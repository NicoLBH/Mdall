/**
 * L'établi : ce que la table garantit, et ce que le module n'envoie jamais.
 *
 * ## Pourquoi cette épreuve relit du SQL et du source
 *
 * Elle ne peut pas appeler la base — il n'y en a pas ici. Mais les trois
 * promesses de l'établi ne sont **ni dans un rendu ni dans une fonction pure** :
 * elles sont dans la politique de sécurité de la table, dans l'absence d'une
 * colonne, et dans ce que le navigateur s'interdit d'envoyer. Aucune épreuve de
 * rendu ne peut les voir, et chacune se perdrait en silence.
 *
 *  1. **Aucun projet.** C'est la décision qui laisse la porte ouverte à un
 *     établi hors projet. Une colonne `project_id` ajoutée « parce que c'est
 *     pratique » la refermerait, et il faudrait une migration pour revenir.
 *  2. **Propriétaire seul, dans les deux sens.** Sans `with check`, on ne
 *     verrait pas l'établi des autres mais on pourrait leur y poser des outils.
 *  3. **La migration est additive.** C'est la règle du dépôt.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SQL = readFileSync(
  fileURLToPath(new URL("../../../../supabase/migrations/202610170001_letabli_des_utilitaires.sql", import.meta.url)),
  "utf8"
);

const SOURCE = readFileSync(fileURLToPath(new URL("./etabli-supabase.js", import.meta.url)), "utf8");

test("l'établi n'appartient à aucun projet, et rien dans la table n'en parle", () => {
  // **C'est la décision, et elle se perd en une ligne.** Un utilitaire de
  // l'établi paraît dans tous les projets de son propriétaire parce qu'il est à
  // lui. Le rattacher à un chantier l'enfermerait dans celui où il a été écrit.
  // Hors commentaires : la migration **parle** de `project_id` pour dire qu'il
  // n'y en a pas, et c'est exactement ce qu'on veut lire dans six mois.
  const code = SQL.split("\n").filter((ligne) => !ligne.trimStart().startsWith("--")).join("\n");
  assert.doesNotMatch(code, /project_id/,
    "la table de l'établi porte un projet : elle ne devrait pas");
  assert.match(SQL, /Aucune colonne `project_id`/,
    "la migration ne dit pas pourquoi elle n'en porte pas");
  assert.doesNotMatch(SOURCE, /project/i,
    "le module de l'établi parle de projet : il ne devrait pas");
});

test("la politique est propriétaire seul, dans les deux sens", () => {
  for (const table of ["etabli_utilitaires", "etabli_versions"]) {
    assert.match(SQL, new RegExp(`alter table public\\.${table} enable row level security`),
      `${table} n'a pas de politique du tout`);
  }

  // On ne lit que les siens…
  assert.match(SQL, /using \(owner_id = auth\.uid\(\)\)/);
  // … et l'on n'en écrit que pour soi. Sans cela, on pourrait poser un outil
  // sur l'établi de quelqu'un d'autre.
  assert.match(SQL, /with check \(owner_id = auth\.uid\(\)\)/);

  // Une version appartient à qui possède l'utilitaire, et ne porte pas de
  // second propriétaire : deux colonnes pour une vérité divergent (règle 4).
  assert.doesNotMatch(SQL.slice(SQL.indexOf("create table if not exists public.etabli_versions")),
    /owner_id uuid/);
});

test("le propriétaire n'est jamais envoyé par le navigateur", () => {
  // La base le pose (`default auth.uid()`), et la politique refuse toute autre
  // valeur. L'envoyer laisserait croire que l'appelant peut le choisir.
  assert.match(SQL, /owner_id uuid not null default auth\.uid\(\)/);
  assert.doesNotMatch(SOURCE, /owner_id:/);
});

test("la fonction d'enregistrement s'applique la politique à elle-même", () => {
  // `security definer` aurait été une seconde porte, qu'il aurait fallu garder
  // séparément — et par laquelle on aurait pu écrire sur l'établi d'un autre.
  const fonction = SQL.slice(SQL.indexOf("create or replace function public.etabli_enregistrer"));
  assert.match(fonction, /security invoker/);
  assert.doesNotMatch(fonction, /security definer/);

  // Elle refuse un utilitaire sans nom et un utilitaire sans Mdall : sinon la
  // liste se remplirait d'outils vides que personne ne sait rouvrir.
  assert.match(fonction, /porte un nom/);
  assert.match(fonction, /porte du Mdall/);

  // Et le numéro de version se décide là, jamais dans le navigateur : lu puis
  // écrit ici, deux enregistrements simultanés produiraient le même.
  assert.match(fonction, /version = u\.version \+ 1/);
  assert.doesNotMatch(SOURCE, /version \+ 1/);
});

test("une version ne se réécrit jamais : on en ajoute une", () => {
  // Écrire les fichiers dans la table d'identité aurait effacé l'histoire à
  // chaque enregistrement, et « monter de version » n'aurait plus rien voulu
  // dire — ni « la v2 que le projet a signée ».
  const versions = SQL.slice(SQL.indexOf("create table if not exists public.etabli_versions"));
  assert.match(versions, /unique \(utilitaire_id, version\)/);
  assert.match(versions, /fichiers jsonb not null/);

  const identite = SQL.slice(
    SQL.indexOf("create table if not exists public.etabli_utilitaires"),
    SQL.indexOf("create table if not exists public.etabli_versions")
  );
  assert.doesNotMatch(identite, /fichiers/, "le texte vit dans les versions, pas dans l'identité");
  // Deux outils du même nom sur le même établi ne se distinguent plus.
  assert.match(identite, /unique \(owner_id, nom\)/);
});

test("la migration est additive, et le dit", () => {
  // La règle du dépôt : on ajoute, on ne retire pas. Une migration qui
  // modifierait une table existante se verrait ici.
  assert.match(SQL, /[Aa]dditive/);
  assert.doesNotMatch(SQL, /\bdrop table\b/i);
  assert.doesNotMatch(SQL, /\bdrop column\b/i);
  // `drop policy if exists` avant `create policy` est la façon dont le dépôt
  // rejoue une politique ; elle ne retire rien à qui y avait droit.
  for (const ligne of SQL.split("\n").filter((une) => /drop policy/i.test(une))) {
    assert.match(ligne, /drop policy if exists/i, ligne);
  }
});

test("le module dit « rien » et « je ne sais pas » de deux façons différentes", () => {
  // Confondre les deux ferait afficher « votre établi est vide » à quelqu'un
  // qui y a posé douze outils — et il en réécrirait un treizième (règle 5).
  //
  // Le corps de `listerLetabli` seul : pris jusqu'à la fin du fichier, le
  // `catch` d'une autre fonction aurait répondu à sa place, et la garde
  // n'aurait rien gardé (règle 12).
  const debut = SOURCE.indexOf("export async function listerLetabli");
  const lister = SOURCE.slice(debut, SOURCE.indexOf("\n}\n", debut));

  assert.match(lister, /catch \{\s*return null;/, "une lecture ratée doit rendre null");
  assert.match(lister, /\?\? \[\]/, "une lecture réussie sans ligne doit rendre []");
});

test("le navigateur n'envoie jamais de numéro de version", () => {
  // Lu puis écrit ici, deux enregistrements simultanés produiraient le même
  // numéro, et la contrainte d'unicité ferait échouer le second sans que
  // personne sache pourquoi. C'est la base qui décide, et elle seule.
  assert.doesNotMatch(SOURCE, /p_version/);
  assert.doesNotMatch(SOURCE, /version:/);
});

test("un refus de la base remonte avec son corps, et non comme un silence", () => {
  // **Le défaut que ça répare.** Un `409` — un nom déjà pris — se perdait dans
  // un `catch` qui rendait `null`, et l'écran disait « réessayez ». Réessayer
  // échouait exactement pareil : rien dans l'écran ne pouvait dire qu'il
  // suffisait de changer trois lettres.
  assert.match(SOURCE, /erreur\.dit = await reponse\.json\(\)/,
    "le corps de l'erreur est jeté : personne ne saura ce que la base a refusé");
  assert.match(SOURCE, /refusDeLaBase\(erreur\?\.dit\)/);

  // Et l'enregistrement rend un refus nommé, jamais `null` tout court : « ça
  // n'a pas marché » n'est pas une réponse.
  const debut = SOURCE.indexOf("export async function enregistrerSurLetabli");
  const garder = SOURCE.slice(debut, SOURCE.indexOf("\n}\n", debut));
  assert.doesNotMatch(garder, /return null;/);
  assert.match(garder, /ok: true, utilitaire/);
  assert.match(garder, /ok: false, motif:/);
});

test("la lecture, elle, rend toujours null ou une liste", () => {
  // Les deux questions ne se posent pas pareil : une liste qu'on n'a pas pu
  // lire n'a pas de motif à donner — on ne sait pas, et c'est tout.
  const debut = SOURCE.indexOf("export async function listerLetabli");
  const lister = SOURCE.slice(debut, SOURCE.indexOf("\n}\n", debut));
  assert.match(lister, /return null;/);
  assert.doesNotMatch(lister, /motif/);
});

/* ── Le cahier des charges ───────────────────────────────────────────────────
 *
 * La zone de français est le cahier des charges de l'utilitaire, et elle ne
 * montait pas jusqu'à la base. Ce que cette migration promet ne se voit dans
 * aucun rendu : une colonne nouvelle, une comparaison qui la prend en compte,
 * et une signature de fonction refaite plutôt que doublée.
 * ──────────────────────────────────────────────────────────────────────────── */

const SQL_DU_CAHIER = readFileSync(
  fileURLToPath(new URL(
    "../../../../supabase/migrations/202610180001_le_cahier_des_charges_dun_utilitaire.sql",
    import.meta.url
  )),
  "utf8"
);

test("le cahier des charges se pose sur la version, jamais sur la fiche", () => {
  // La `v3` répond à son cahier des charges, pas à celui de la `v5`. Posé sur
  // l'identité, il aurait décrit l'outil en général — et relire une version
  // avec l'intention d'une autre, c'est relire deux choses qui ne se
  // correspondent pas, et le croire.
  assert.match(SQL_DU_CAHIER, /alter table public\.etabli_versions\s*\n\s*add column if not exists dit text not null default ''/);
  assert.doesNotMatch(SQL_DU_CAHIER, /alter table public\.etabli_utilitaires/);

  // `default ''` et non `null` : les versions déjà posées n'en ont pas, et « pas
  // de cahier des charges » est une zone vide, non une inconnue (règle 5).
  assert.doesNotMatch(SQL_DU_CAHIER, /add column if not exists dit text\s*;/);
});

test("le cahier des charges compte dans la montée de version", () => {
  // Une version ne se réécrit jamais. Sans cette comparaison, le seul moyen de
  // corriger le cahier des charges d'une version déjà posée serait de l'écraser.
  const fonction = SQL_DU_CAHIER.slice(
    SQL_DU_CAHIER.indexOf("create or replace function public.etabli_enregistrer")
  );

  assert.match(fonction, /select v\.fichiers, v\.dit into derniere, dernier_dit/);
  assert.match(fonction, /coalesce\(dernier_dit, ''\) is distinct from coalesce\(p_dit, ''\)/);
  // **Et il s'écrit dans les deux chemins : la v1 comme la suivante.** Sur les
  // valeurs, pas sur la liste des colonnes — une colonne déclarée et jamais
  // remplie laisse la v1 sans cahier des charges, et rien ne le dit : c'est
  // précisément le premier enregistrement, celui qu'on fait après avoir écrit
  // le cahier des charges, qui le perdrait.
  assert.equal(
    (fonction.match(/values \(ligne\.id, 1, p_fichiers, coalesce\(p_dit, ''\)\)/g) ?? []).length,
    1, "la v1 s'écrit sans son cahier des charges"
  );
  assert.equal(
    (fonction.match(/values \(ligne\.id, ligne\.version, p_fichiers, coalesce\(p_dit, ''\)\)/g) ?? []).length,
    1, "la version suivante s'écrit sans son cahier des charges"
  );
});

test("la fonction est refaite, et non doublée", () => {
  // **Ajouté avec une valeur par défaut, `p_dit` aurait fabriqué une seconde
  // fonction du même nom** : l'ancienne à cinq arguments, la nouvelle à six, et
  // un appel qui en nomme cinq aurait convenu aux deux. PostgreSQL refuse alors
  // de choisir, et l'enregistrement aurait cessé de marcher sans qu'une ligne de
  // code ait bougé.
  assert.match(SQL_DU_CAHIER,
    /drop function if exists public\.etabli_enregistrer\(text, jsonb, uuid, text, text\);/);

  // Le droit d'exécution se repose sur la nouvelle signature : la révocation et
  // l'octroi portent le nombre d'arguments, et l'ancien couple est parti avec
  // l'ancienne fonction.
  assert.match(SQL_DU_CAHIER,
    /grant execute on function public\.etabli_enregistrer\(text, jsonb, uuid, text, text, text\) to authenticated;/);

  // Elle reste `security invoker` : une seconde porte à garder séparément n'a
  // pas plus de raison d'exister aujourd'hui qu'hier.
  assert.match(SQL_DU_CAHIER, /security invoker/);
  assert.doesNotMatch(SQL_DU_CAHIER, /security definer/);
});

test("la migration du cahier des charges est additive, et le dit", () => {
  assert.match(SQL_DU_CAHIER, /[Aa]dditive/);
  assert.doesNotMatch(SQL_DU_CAHIER, /\bdrop table\b/i);
  assert.doesNotMatch(SQL_DU_CAHIER, /\bdrop column\b/i);
  // Et elle dit pourquoi la fonction, elle, se retire : c'est du code, pas des
  // données — sans quoi la ligne se lirait dans six mois comme une exception
  // qu'on s'est autorisée sans raison.
  assert.match(SQL_DU_CAHIER, /Aucune\s*\n?--\s*donnée n'est en jeu/);
});

test("le navigateur lit et renvoie le cahier des charges de la version", () => {
  // Les deux se lisent ensemble : pris dans deux passes, l'un pourrait venir de
  // la v3 et l'autre de la v4 — et l'on relirait un code avec l'intention d'un
  // autre.
  assert.match(SOURCE, /etabli_versions\(version,fichiers,dit\)/);

  const debut = SOURCE.indexOf("function laDerniereVersion");
  const derniere = SOURCE.slice(debut, SOURCE.indexOf("\n}\n", debut));
  assert.match(derniere, /dit: String\(derniere\?\.dit \?\? ""\)/);
  // Une ligne sans version rend une paire vide, pas `undefined` : la zone
  // afficherait « undefined » à l'écran.
  assert.match(derniere, /return \{ fichiers: \[\], dit: "" \};/);

  // Et il l'envoie **sans le rogner** : une zone de français se termine souvent
  // par une ligne vide qu'on a laissée là en écrivant, et `texte()` la couperait
  // — ce qui monterait une version pour un retour à la ligne.
  assert.match(SOURCE, /p_dit: String\(dit \?\? ""\)/);
  assert.doesNotMatch(SOURCE, /p_dit: texte\(/);
});
