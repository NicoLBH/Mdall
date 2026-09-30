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

/**
 * Les migrations que ce banc applique.
 *
 * Pas toutes : celles dont on veut éprouver la règle, posées sur un socle qui
 * porte ce qu'elles touchent. Une migration qu'on ajoute ici s'ajoute aussi au
 * socle si elle s'appuie sur une table qu'il n'a pas.
 */
const LES_MIGRATIONS = [
  "202610290001_les_portes_restees_ouvertes.sql",
  "202610300001_la_file_des_versements.sql",
  "202610310001_les_octets_qui_attendent_leur_tour.sql",
  "202611010001_les_expediteurs_deja_ecrits.sql"
];

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
  // Les migrations que le banc éprouve, dans l'ordre où elles se déploient.
  for (const migration of LES_MIGRATIONS) {
    pg.sql(readFileSync(join(RACINE, "supabase", "migrations", migration), "utf8"));
  }

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


/* ── La file des versements ──────────────────────────────────────────────── */

test("une ligne de file se pose, et son auteur est posé par la base", { skip: sansPostgres }, () => {
  const dit = banc.enTantQue(A,
    `insert into public.versements (project_id, fichiers)`
    + ` values ('${MEDIATHEQUE}', '[{"nom":"un.eml","chemin":"a/b/un.eml","taille":12}]'::jsonb)`
    + ` returning statut, owner_id = auth.uid() as "le mien";`);
  assert.equal(dit.ok, true, `la file refuse une ligne :\n${dit.motif}`);
  assert.equal(dit.sortie, "en_attente|t");
});

test("la file d'un autre ne se lit pas", { skip: sansPostgres }, () => {
  // Le nom d'un fichier de messagerie est souvent l'objet du mail : la file dit
  // donc qui verse quoi, et cela ne regarde que celui qui verse.
  const parSonAuteur = banc.enTantQue(A, "select count(*) from public.versements;");
  const parUnAutre = banc.enTantQue(B, "select count(*) from public.versements;");
  assert.equal(parSonAuteur.sortie, "1");
  assert.equal(parUnAutre.sortie, "0");
});

test("on ne pose pas une ligne au nom de quelqu'un d'autre", { skip: sansPostgres }, () => {
  const dit = banc.enTantQue(A,
    `insert into public.versements (project_id, owner_id) values ('${MEDIATHEQUE}', '${B}');`);
  assert.equal(dit.ok, false, "on verse au nom d'un autre");
  assert.match(dit.motif, /row-level security/);
});

test("on ne pose pas une ligne dans le chantier d'un autre", { skip: sansPostgres }, () => {
  const dit = banc.enTantQue(B,
    `insert into public.versements (project_id) values ('${MEDIATHEQUE}');`);
  assert.equal(dit.ok, false, "on verse dans le chantier d'un autre");
});

test("une ligne de file change d'état, et c'est ce qui la distingue du journal", { skip: sansPostgres }, () => {
  const avance = banc.enTantQue(A,
    "update public.versements set statut = 'en_cours', pris_le = now()"
    + " where statut = 'en_attente' returning statut;");
  assert.equal(avance.ok, true, `la file ne s'avance pas :\n${avance.motif}`);
  assert.equal(avance.sortie, "en_cours");
});


/* ── Les octets qui attendent leur tour ──────────────────────────────────── */

/**
 * **Le défaut du premier vrai dépôt.** Six mails envoyés, « Versement de 0
 * fichier — Réussi ». La règle de lecture du casier exigeait une ligne
 * `documents` pour l'objet lu ; or des octets en attente de versement n'en ont
 * aucune, par construction. L'écriture passait, la lecture était refusée, le
 * serveur versait ce qu'il avait : rien.
 *
 * On ne pouvait pas le voir en relisant la politique — elle était juste pour ce
 * qu'elle couvrait. Il fallait essayer de lire.
 */
test("ses propres octets en attente se relisent", { skip: sansPostgres }, () => {
  const chemin = `${A}/${MEDIATHEQUE}/versements/v-1/RE__Lot_3.msg`;
  const pose = banc.sql(
    `insert into storage.objects (bucket_id, name) values ('documents', '${chemin}');`
  );
  assert.equal(pose.ok, true);

  const lu = banc.enTantQue(A,
    `select count(*) from storage.objects where name = '${chemin}';`);
  assert.equal(lu.sortie, "1", "le serveur ne peut pas relire ce que le navigateur vient de déposer");
});

test("les octets en attente d'un autre ne se lisent pas", { skip: sansPostgres }, () => {
  const chemin = `${A}/${MEDIATHEQUE}/versements/v-1/RE__Lot_3.msg`;
  const lu = banc.enTantQue(B, `select count(*) from storage.objects where name = '${chemin}';`);
  assert.equal(lu.sortie, "0");
});

test("un objet du casier sans ligne `documents` reste illisible hors de la file", { skip: sansPostgres }, () => {
  // La règle d'octobre ne bouge pas : un document ne se lit qu'à travers sa
  // ligne, qui porte elle-même la règle du dossier privé.
  const chemin = `${A}/${MEDIATHEQUE}/autre-chose/plan.pdf`;
  banc.sql(`insert into storage.objects (bucket_id, name) values ('documents', '${chemin}');`);
  const lu = banc.enTantQue(A, `select count(*) from storage.objects where name = '${chemin}';`);
  assert.equal(lu.sortie, "0", "le casier s'est ouvert plus largement que la file");
});

test("un document rangé se lit toujours par sa ligne", { skip: sansPostgres }, () => {
  const chemin = `${A}/${MEDIATHEQUE}/mails/message.eml`;
  banc.sql(`insert into storage.objects (bucket_id, name) values ('documents', '${chemin}');`);
  const pose = banc.enTantQue(A,
    `insert into public.documents (project_id, created_by, storage_bucket, storage_path)`
    + ` values ('${MEDIATHEQUE}', auth.uid(), 'documents', '${chemin}');`);
  assert.equal(pose.ok, true, pose.motif);

  const lu = banc.enTantQue(A, `select count(*) from storage.objects where name = '${chemin}';`);
  assert.equal(lu.sortie, "1");
});


/* ── Les expéditeurs déjà écrits ─────────────────────────────────────────── */

const X500 = "/O=EXCHANGELABS/OU=EXCHANGE ADMINISTRATIVE GROUP"
  + " (FYDIBOHF23SPDLT)/CN=RECIPIENTS/CN=2130423FA9EF43C6B5B78421F4C7D6A2-NICOLAS.LEB";

/**
 * **La colonne sur laquelle on cherche et on trie** portait trois lignes
 * d'identifiant d'annuaire. Corriger la lecture ne corrige pas ce qui est
 * écrit : `mail_de` est posé au dépôt, une fois, et ne se recalcule jamais.
 */
test("un identifiant d'annuaire est retiré des lignes déjà versées", { skip: sansPostgres }, () => {
  const pose = banc.sql(
    `insert into public.documents (project_id, mail_de) values `
    + `('${MEDIATHEQUE}', 'Nicolas Lebihan (${X500})'),`
    + `('${MEDIATHEQUE}', 'Clément Boche (clement.boche@socotec.example)'),`
    + `('${MEDIATHEQUE}', 'Société GLOBALIS (Savoie)'),`
    + `('${MEDIATHEQUE}', '(${X500})')`
    + ` returning 1;`
  );
  assert.equal(pose.ok, true, pose.motif);

  // La migration est rejouable : on la repasse sur les lignes qu'on vient de
  // poser, comme elle passera sur celles de la base.
  banc.sql(readFileSync(join(
    RACINE, "supabase", "migrations", "202611010001_les_expediteurs_deja_ecrits.sql"
  ), "utf8"));

  const dits = banc.sql("select mail_de from public.documents order by mail_de;").sortie.split("\n");

  assert.equal(dits.includes("Nicolas Lebihan"), true, "l'identifiant n'a pas été retiré");
  assert.equal(dits.some((un) => un.includes("EXCHANGELABS") && un.startsWith("Nicolas")), false);
  // Une vraie adresse ne bouge pas.
  assert.equal(dits.includes("Clément Boche (clement.boche@socotec.example)"), true);
  // Des parenthèses qui ne portent pas une adresse font partie du nom.
  assert.equal(dits.includes("Société GLOBALIS (Savoie)"), true);
  // **Sans nom, on garde l'identifiant** : l'effacer supprimerait la seule
  // chose qu'on sache de l'expéditeur.
  assert.equal(dits.some((un) => un.includes("EXCHANGELABS")), true);
});
