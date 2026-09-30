/**
 * **Essayer d'entrer**, plutôt que relire la règle qui l'interdit.
 *
 * ## Ce que ce banc existe pour ne plus jamais laisser passer
 *
 * `projects_owner_only` était écrite, juste, et n'a **jamais rien restreint
 * pendant cinq mois**. Une politique « tout ouvert » posée à l'initialisation
 * vivait à côté, et PostgreSQL combine les politiques permissives par un OU :
 * `true OR owner_id = auth.uid()` vaut `true`.
 *
 * Personne ne pouvait le voir en relisant les migrations — j'en ai écrit trois
 * par-dessus sans m'en apercevoir. Une politique est une **affirmation sur qui
 * voit quoi** : la seule façon de la vérifier est de prendre l'identité de
 * quelqu'un et d'essayer.
 *
 * Deux migrations ont par ailleurs été refusées **au déploiement**
 * (`delete from storage.objects`, puis `min(uuid)`), parce qu'un texte ne dit
 * pas si une fonction existe.
 *
 * ## Ce qu'il n'est pas
 *
 * Il ne rejoue pas la base entière : il pose le socle que la migration touche,
 * applique la migration, et essaie. Un banc qui recopierait tout le schéma
 * aurait divergé du vrai dès la migration suivante, et personne ne l'aurait su.
 *
 * **Sans PostgreSQL sur la machine, il se saute.** Une épreuve qui échoue faute
 * d'outil apprend à ignorer les échecs.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { unPostgresJetable } from "./le-banc-des-politiques/un-postgres-jetable.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEDIATHEQUE = "11111111-1111-4111-8111-111111111111";

/** Les quatre cas du propriétaire, et ce qu'on attend de chacun. */
const LES_CHANTIERS = `
insert into auth.users (id) values ('${A}'), ('${B}');

insert into public.projects (id, name, owner_id) values
  -- sans propriétaire, un seul auteur : rendu à cet auteur
  ('${MEDIATHEQUE}', 'Montholon_Médiathèque', null),
  -- sans propriétaire, deux auteurs : on ne touche à rien
  ('22222222-2222-4222-8222-222222222222', 'Montholon_Groupe scolaire', null),
  -- déjà un propriétaire : il ne bouge pas, même si un autre a déposé chez lui
  ('33333333-3333-4333-8333-333333333333', 'Montholon_Gymnase', '${B}'),
  -- aucune trace : reste orphelin
  ('44444444-4444-4444-8444-444444444444', 'Montholon_Vestiaires', null);

insert into public.documents (project_id, created_by) values
  ('${MEDIATHEQUE}', '${A}'),
  ('22222222-2222-4222-8222-222222222222', '${A}'),
  ('22222222-2222-4222-8222-222222222222', '${B}'),
  ('33333333-3333-4333-8333-333333333333', '${A}');
`;

/** Le banc, posé une fois : démarrer un serveur coûte quelques secondes. */
function leBanc() {
  const pg = unPostgresJetable();
  if (!pg) return null;

  pg.sql(readFileSync(join(ICI, "le-banc-des-politiques", "le-socle.sql"), "utf8"));
  pg.sql(LES_CHANTIERS);
  pg.sql(readFileSync(join(
    RACINE, "supabase", "migrations", "202610290001_les_portes_restees_ouvertes.sql"
  ), "utf8"));

  /** Poser une question en étant quelqu'un. */
  pg.enTantQue = (qui, texte) => pg.sql(
    `set role authenticated;\n`
    + (qui ? `set request.jwt.claim.sub = '${qui}';\n` : "reset request.jwt.claim.sub;\n")
    + texte,
    { doitTenir: false }
  );

  return pg;
}

const banc = leBanc();
const sansPostgres = banc ? false : "PostgreSQL n'est pas sur cette machine";
test.after(() => banc?.fermer());

test("la migration est acceptée par un vrai PostgreSQL", { skip: sansPostgres }, () => {
  // Elle ne l'était pas : `min(uuid)` n'existe pas, et le déploiement l'a
  // refusé. Le banc l'aurait dit en trois secondes.
  assert.ok(banc, "le banc n'a pas démarré");
});

test("le projet sans propriétaire est rendu à son auteur", { skip: sansPostgres }, () => {
  const dit = banc.sql(
    `select coalesce(owner_id::text, 'orphelin') from public.projects where id = '${MEDIATHEQUE}';`
  );
  assert.equal(dit.sortie, A);
});

test("un projet à deux auteurs n'est donné à personne", { skip: sansPostgres }, () => {
  // Se tromper de propriétaire donnerait un chantier à quelqu'un d'autre.
  const dit = banc.sql(
    "select coalesce(owner_id::text, 'orphelin') from public.projects"
    + " where id = '22222222-2222-4222-8222-222222222222';"
  );
  assert.equal(dit.sortie, "orphelin");
});

test("un projet qui a déjà un propriétaire le garde", { skip: sansPostgres }, () => {
  // Son seul document a été déposé par quelqu'un d'autre : sans le garde
  // `owner_id is null`, il aurait changé de mains.
  const dit = banc.sql(
    "select owner_id::text from public.projects where id = '33333333-3333-4333-8333-333333333333';"
  );
  assert.equal(dit.sortie, B);
});

test("chacun ne voit que ses chantiers", { skip: sansPostgres }, () => {
  // C'est **le** défaut : avant la migration, les quatre étaient visibles de
  // tous, et `projects_owner_only` était écrite depuis cinq mois.
  assert.equal(banc.enTantQue(A, "select name from public.projects;").sortie, "Montholon_Médiathèque");
  assert.equal(banc.enTantQue(B, "select name from public.projects;").sortie, "Montholon_Gymnase");
});

test("sans session, la base ne rend plus rien", { skip: sansPostgres }, () => {
  const projets = banc.enTantQue("", "select count(*) from public.projects;");
  const documents = banc.enTantQue("", "select count(*) from public.documents;");
  assert.equal(projets.sortie, "0", "les projets se lisaient avec la seule clé publique");
  assert.equal(documents.sortie, "0", "les documents aussi");
});

test("créer un dossier chez soi est permis — c'est le geste qui refusait", { skip: sansPostgres }, () => {
  const dit = banc.enTantQue(A,
    "insert into public.project_document_folders (project_id, name, prive, created_by)"
    + ` values ('${MEDIATHEQUE}', 'Mails', true, auth.uid()) returning name;`);
  assert.equal(dit.ok, true, `le dépôt refuse encore :\n${dit.motif}`);
  assert.equal(dit.sortie, "Mails");
});

test("créer un dossier chez un autre reste refusé", { skip: sansPostgres }, () => {
  const dit = banc.enTantQue(B,
    `insert into public.project_document_folders (project_id, name) values ('${MEDIATHEQUE}', 'Intrusion');`);
  assert.equal(dit.ok, false, "on écrit dans le chantier d'un autre");
  assert.match(dit.motif, /row-level security/);
});

test("un versement ne se lit que par celui qui l'a fait", { skip: sansPostgres }, () => {
  const pose = banc.enTantQue(A,
    `insert into public.project_runs (project_id, geste, personnelle)`
    + ` values ('${MEDIATHEQUE}', 'versement', true) returning geste;`);
  assert.equal(pose.ok, true, `le versement ne s'écrit pas :\n${pose.motif}`);

  const parSonAuteur = banc.enTantQue(A,
    `select count(*) from public.project_runs where project_id = '${MEDIATHEQUE}';`);
  const parUnAutre = banc.enTantQue(B,
    `select count(*) from public.project_runs where project_id = '${MEDIATHEQUE}';`);

  assert.equal(parSonAuteur.sortie, "1");
  assert.equal(parUnAutre.sortie, "0", "la correspondance d'un chantier n'est pas partagée");
});

test("l'histoire d'un sujet peut s'écrire", { skip: sansPostgres }, () => {
  // `history_by_project` n'avait qu'un `using` : sans `with check`, aucune ligne
  // ne s'écrit. La porte ouverte à côté l'acceptait, et la fermer sans réparer
  // cela aurait cassé l'historique le jour du déploiement.
  const dit = banc.enTantQue(A,
    `insert into public.subject_history (project_id, actor_user_id)`
    + ` values ('${MEDIATHEQUE}', auth.uid()) returning 'écrite';`);
  assert.equal(dit.ok, true, `l'histoire ne s'écrit plus :\n${dit.motif}`);
});
