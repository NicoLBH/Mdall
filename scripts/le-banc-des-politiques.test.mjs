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
import { LES_MOTS_RESERVES } from "./les-mots-reserves.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");

/**
 * Les migrations que ce banc applique.
 *
 * Pas toutes : celles dont on veut éprouver la règle, posées sur un socle qui
 * porte ce qu'elles touchent. Une migration qu'on ajoute ici s'ajoute aussi au
 * socle si elle s'appuie sur une table qu'il n'a pas.
 *
 * **Elles sont triées avant d'être appliquées**, parce que c'est ainsi qu'elles
 * se déploient. La liste était lue dans l'ordre où on l'avait écrite, et il ne
 * correspondait plus : une migration d'octobre venait après une de novembre.
 * Rien n'en souffrait encore — et c'est exactement le moment de le régler.
 */
const LES_MIGRATIONS = [
  // Elle porte `est_administrateur()`, dont la porte de la console dépend.
  // L'oublier ferait tomber les épreuves de la console sur « la fonction
  // n'existe pas » — ce qui ressemble à un refus sans en être un.
  "202610250001_les_comptes_du_carburant.sql",
  "202610290001_les_portes_restees_ouvertes.sql",
  "202610300001_la_file_des_versements.sql",
  "202610310001_les_octets_qui_attendent_leur_tour.sql",
  "202611010001_les_expediteurs_deja_ecrits.sql",
  "202611020001_les_domaines_du_systeme.sql",
  "202611030001_les_enchainements_du_systeme.sql",
  "202611040001_les_vingt_six_portes.sql",
  "202611050001_lannuaire_a_son_proprietaire.sql",
  "202611060001_un_chantier_qui_se_range.sql",
  "202611070001_les_sujets_du_systeme.sql",
  "202611080001_les_synonymes_regroupes.sql",
  "202611090001_les_sujets_dun_chantier.sql",
  "202611100001_la_file_lit_les_comptes_rendus.sql",
  // **La table des lectures, et ce qui s'y ajoute.**
  //
  // `202611120001` a été **refusée au déploiement** : elle ajoutait une colonne
  // nommée `analyse`, un mot réservé de PostgreSQL. Aucune épreuve ne pouvait le
  // voir, puisqu'aucune ne faisait lire la migration à PostgreSQL. Maintenant
  // si : appliquée ici, elle tombe chez moi.
  "202610030001_cr_lectures.sql",
  "202611120001_une_lecture_de_cr_se_garde.sql",
  // Celle du dossier des mails pose la politique que la suivante élargit :
  // sans elle, on éprouverait un élargissement de rien.
  "202610160001_le_dossier_des_mails_est_prive.sql",
  "202611110001_ce_qui_entre_en_memoire_se_partage.sql"
];

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEDIATHEQUE = "11111111-1111-4111-8111-111111111111";
const GYMNASE = "33333333-3333-4333-8333-333333333333";

/** Les quatre cas du propriétaire, et ce qu'on attend de chacun. */
const LES_CHANTIERS = `
insert into auth.users (id) values ('${A}'), ('${B}');

insert into public.projects (id, name, owner_id) values
  -- sans propriétaire, un seul auteur : rendu à cet auteur
  ('${MEDIATHEQUE}', 'Montholon_Médiathèque', null),
  -- sans propriétaire, deux auteurs : on ne touche à rien
  ('22222222-2222-4222-8222-222222222222', 'Montholon_Groupe scolaire', null),
  -- déjà un propriétaire : il ne bouge pas, même si un autre a déposé chez lui
  ('${GYMNASE}', 'Montholon_Gymnase', '${B}'),
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
  for (const migration of [...LES_MIGRATIONS].sort()) {
    pg.sql(readFileSync(join(RACINE, "supabase", "migrations", migration), "utf8"));
  }

  /** Poser une question en étant quelqu'un. */
  pg.enTantQue = (qui, texte) => pg.sql(
    `set role authenticated;\n`
    + (qui ? `set request.jwt.claim.sub = '${qui}';\n` : "reset request.jwt.claim.sub;\n")
    + texte,
    { doitTenir: false }
  );

  /**
   * **Une question posée avec la seule clé publique du navigateur.**
   *
   * `anon` est le rôle de la clé qui est dans le code de la page, lisible par
   * quiconque ouvre les outils de développement. C'est elle qui lisait et
   * écrivait vingt-six tables ; c'est donc elle qu'il faut faire entrer pour
   * savoir si la porte est fermée.
   */
  pg.sansCompte = (texte) => pg.sql(
    "set role anon;\nreset request.jwt.claim.sub;\n" + texte,
    { doitTenir: false }
  );

  /**
   * La même chose, sous une adresse : la console se garde par le courriel du
   * jeton, pas par l'identifiant.
   */
  pg.sousLadresse = (courriel, texte) => pg.sql(
    `set role authenticated;\n`
    + (courriel
      ? `set request.jwt.claims = '{"email":"${courriel}"}';\n`
      : "reset request.jwt.claims;\n")
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

/* ── La console : des comptes, et une porte qui tient ────────────────────── */

/**
 * **La fonction contourne les politiques de lecture**, `security definer`
 * oblige : sans sa porte, n'importe quel compte authentifié lirait les domaines
 * de tous les chantiers. C'est exactement le genre de trou qu'on ne voit pas en
 * relisant, et que le banc trouve en essayant d'entrer.
 */
test("les domaines du système se refusent à qui n'est pas administrateur",
  { skip: sansPostgres }, () => {
    banc.sql(
      `insert into public.project_assertions (project_id, domain) values `
      + `('${MEDIATHEQUE}', 'structure'), ('${MEDIATHEQUE}', 'structure'),`
      + `('${MEDIATHEQUE}', 'incendie'), ('${MEDIATHEQUE}', null);`
    );

    const etranger = banc.sousLadresse("quelquun@ailleurs.example",
      "select count(*) from public.les_domaines_du_systeme();");
    assert.equal(etranger.ok, false, "la console s'ouvre à un compte ordinaire");
    assert.match(etranger.motif, /réservé à la console/);

    const sansJeton = banc.sousLadresse("", "select count(*) from public.les_domaines_du_systeme();");
    assert.equal(sansJeton.ok, false, "la console s'ouvre sans session");
  });

/**
 * **Et elle rend bien ce qu'on est venu chercher** : un mot d'un vocabulaire
 * fermé et des nombres. Une porte qui tient sur une fonction qui ne répond rien
 * ne prouverait rien.
 */
test("un administrateur lit les domaines, et rien que des comptes",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select domaine, affirmations, chantiers from public.les_domaines_du_systeme() order by 2 desc;");
    assert.equal(lu.ok, true, lu.motif);

    const lignes = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
    assert.match(lignes[0], /^structure\s*\|\s*2\s*\|\s*1$/);
    // **Le non-classé est une ligne comme les autres** : le rapport entre ce qui
    // est classé et ce qui ne l'est pas *est* le niveau de développement du
    // système. Le taire montrerait une taxonomie qui marche toujours (règle 5).
    assert.equal(lignes.some((une) => une.startsWith("non-classe")), true,
      "ce qu'on n'a pas su classer disparaît de l'écran");
    // Aucun identifiant de projet ne peut sortir : la signature ne le porte pas.
    assert.doesNotMatch(lu.sortie, new RegExp(MEDIATHEQUE));
  });

/**
 * **Les couples se forment dans un chantier, jamais en travers.**
 *
 * C'est la seule chose que ce calcul peut se permettre de rater, et il la
 * raterait en silence : sans `partition by project_id`, la dernière
 * affirmation d'un chantier formerait un couple avec la première d'un autre —
 * un enchaînement qui n'a eu lieu nulle part, et qui ressemblerait à tous les
 * autres dans le tableau.
 */
test("les enchaînements ne traversent pas deux chantiers", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  // Médiathèque : incendie → structure → incendie.
  // Gymnase : sol → thermique. Le passage de l'un à l'autre ne doit rien former.
  banc.sql(
    `insert into public.project_assertions (project_id, domain, created_at) values `
    + `('${MEDIATHEQUE}', 'incendie',  '2026-01-01T00:00:00Z'),`
    + `('${MEDIATHEQUE}', 'structure', '2026-01-02T00:00:00Z'),`
    + `('${MEDIATHEQUE}', 'incendie',  '2026-01-03T00:00:00Z'),`
    + `('${GYMNASE}',     'sol',       '2026-01-04T00:00:00Z'),`
    + `('${GYMNASE}',     'thermique', '2026-01-05T00:00:00Z');`
  );

  const lu = banc.sousLadresse("patron@mdall.example",
    "select avant || '>' || apres || ':' || combien || ':' || chantiers"
    + " from public.les_enchainements_du_systeme() order by 1;");
  assert.equal(lu.ok, true, lu.motif);

  const couples = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
  assert.deepEqual(couples.sort(), [
    "incendie>structure:1:1",
    "sol>thermique:1:1",
    "structure>incendie:1:1"
  ]);
  // Le couple qui aurait traversé les deux chantiers.
  assert.equal(couples.some((une) => une.startsWith("incendie>sol")), false,
    "un enchaînement s'est formé entre deux chantiers");
});

/**
 * **Un domaine peut se suivre lui-même**, et cela se compte : un prédicteur
 * dont le meilleur coup est « ce qui vient de venir reviendra » ne prédit pas
 * grand-chose, et il faut pouvoir s'en apercevoir (règle 12).
 */
test("un domaine qui se répète forme un couple", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  banc.sql(
    `insert into public.project_assertions (project_id, domain, created_at) values `
    + `('${MEDIATHEQUE}', 'incendie', '2026-02-01T00:00:00Z'),`
    + `('${MEDIATHEQUE}', 'incendie', '2026-02-02T00:00:00Z'),`
    // Sans domaine : elle n'entre pas dans la suite, et ne coupe donc pas le
    // couple qui l'enjambe.
    + `('${MEDIATHEQUE}', null,       '2026-02-03T00:00:00Z'),`
    + `('${MEDIATHEQUE}', 'structure','2026-02-04T00:00:00Z');`
  );

  const lu = banc.sousLadresse("patron@mdall.example",
    "select avant || '>' || apres || ':' || combien"
    + " from public.les_enchainements_du_systeme() order by 1;");
  const couples = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
  assert.deepEqual(couples.sort(), ["incendie>incendie:1", "incendie>structure:1"]);
});

/**
 * **Combien de fois n'est pas sur combien de chantiers.**
 *
 * Un enchaînement vu six fois sur un seul chantier est l'habitude de ce
 * chantier-là ; vu six fois sur six chantiers, c'est une régularité du
 * bâtiment. Les deux comptes disent des choses opposées, et une fonction qui
 * rendrait le même nombre pour les deux les confondrait en silence.
 */
test("un couple répété dans un chantier ne fait pas deux chantiers",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_assertions;");
    // Trois fois incendie → structure, toutes dans la Médiathèque.
    banc.sql(
      `insert into public.project_assertions (project_id, domain, created_at) values `
      + `('${MEDIATHEQUE}', 'incendie',  '2026-03-01T00:00:00Z'),`
      + `('${MEDIATHEQUE}', 'structure', '2026-03-02T00:00:00Z'),`
      + `('${MEDIATHEQUE}', 'incendie',  '2026-03-03T00:00:00Z'),`
      + `('${MEDIATHEQUE}', 'structure', '2026-03-04T00:00:00Z');`
    );

    const lu = banc.sousLadresse("patron@mdall.example",
      "select avant || '>' || apres || ':' || combien || ':' || chantiers"
      + " from public.les_enchainements_du_systeme() where avant = 'incendie';");
    assert.equal(lu.sortie.trim(), "incendie>structure:2:1",
      "deux occurrences dans un seul chantier passent pour deux chantiers");
  });

/** La même porte que le reste de la console, et elle tient. */
test("les enchaînements se refusent à qui n'est pas administrateur",
  { skip: sansPostgres }, () => {
    const etranger = banc.sousLadresse("quelquun@ailleurs.example",
      "select count(*) from public.les_enchainements_du_systeme();");
    assert.equal(etranger.ok, false, "la console s'ouvre à un compte ordinaire");
    assert.match(etranger.motif, /réservé à la console/);
  });

/* ── Les vingt-six portes ─────────────────────────────────────────────────── */

/**
 * Les vingt-six tables qui n'avaient que la porte pour politique.
 *
 * Nommées ici parce que l'épreuve doit toutes les essayer : en éprouver
 * quelques-unes « représentatives » laisserait les autres ouvertes sans que
 * rien le dise (règle 5).
 */
const LES_VINGT_SIX = [
  "analysis_runs", "assertion_acts", "assertion_applications", "assertion_dependencies",
  "avis_figures", "ct_avis", "directory_people", "lot_catalog", "milestone_subjects",
  "milestones", "project_assertions", "project_collaborators", "project_identity_markers",
  "project_labels", "project_lots", "proposition_comments", "proposition_items",
  "proposition_notes", "propositions", "subject_assertion_links", "subject_assignees",
  "subject_cr_mentions", "subject_evidence", "subject_labels", "subject_links",
  "subject_observations"
];

/** Celles qui restent lisibles par tout compte connecté, et pourquoi. */
const LES_COMMUNES = new Set([
  // Un catalogue de codes de lots : la même liste pour tout le monde.
  "lot_catalog",
  // Un registre de personnes à unicité globale : voir la migration.
  "directory_people"
]);

/**
 * **Le cœur de ce tour.** `anon` est la clé publique du navigateur. Si elle lit
 * une seule de ces tables, tout ce qui a été écrit par-dessus ne vaut rien.
 */
test("aucune des vingt-six ne se lit plus sans compte", { skip: sansPostgres }, () => {
  for (const table of LES_VINGT_SIX) {
    const lu = banc.sansCompte(`select count(*) from public.${table};`);
    assert.equal(lu.ok, true, `${table} : ${lu.motif}`);
    assert.equal(lu.sortie, "0", `${table} se lit encore avec la clé publique`);
  }
});

/**
 * **Lire n'est que la moitié.** Une table qu'on ne lit pas mais où l'on écrit
 * laisse poser n'importe quoi dans le chantier de n'importe qui.
 */
test("aucune des vingt-six ne s'écrit plus sans compte", { skip: sansPostgres }, () => {
  for (const table of LES_VINGT_SIX) {
    const pose = banc.sansCompte(`insert into public.${table} (id) values (gen_random_uuid());`);
    assert.equal(pose.ok, false, `${table} s'écrit encore avec la clé publique`);
  }
});

/**
 * **Et elles ne sont pas devenues muettes pour autant.** Fermer une porte sans
 * écrire de règle rendrait la table vide pour tout le monde — c'est-à-dire
 * casserait l'écran qui la lit, sans que rien dise pourquoi.
 */
test("chacune se lit encore par son propriétaire, et pas par l'autre",
  { skip: sansPostgres }, () => {
    for (const table of LES_VINGT_SIX) {
      if (LES_COMMUNES.has(table)) continue;

      banc.sql(`delete from public.${table};`);
      const colonne = table === "milestone_subjects" ? "milestone_id"
        : table === "subject_cr_mentions" ? "subject_id"
          : "project_id";

      if (colonne === "project_id") {
        banc.sql(`insert into public.${table} (project_id) values ('${MEDIATHEQUE}');`);
      } else if (colonne === "milestone_id") {
        banc.sql("delete from public.milestones;");
        const jalon = banc.sql(
          `insert into public.milestones (project_id) values ('${MEDIATHEQUE}') returning id;`);
        banc.sql(`insert into public.${table} (milestone_id) values ('${jalon.sortie.trim()}');`);
      } else {
        banc.sql("delete from public.subjects;");
        const sujet = banc.sql(
          `insert into public.subjects (project_id) values ('${MEDIATHEQUE}') returning id;`);
        banc.sql(`insert into public.${table} (subject_id) values ('${sujet.sortie.trim()}');`);
      }

      // La Médiathèque appartient à A après la migration d'octobre.
      assert.equal(banc.enTantQue(A, `select count(*) from public.${table};`).sortie, "1",
        `${table} est devenue muette pour son propriétaire`);
      assert.equal(banc.enTantQue(B, `select count(*) from public.${table};`).sortie, "0",
        `${table} se lit depuis un autre compte`);
    }
  });

/**
 * **Le catalogue reste commun, et c'est dit.** Les codes de lots du bâtiment
 * sont la même liste pour tout le monde ; ce qu'on leur a retiré est `anon` et
 * l'écriture. L'épreuve constate ce que la migration laisse ouvert autant que
 * ce qu'elle ferme (règle 12).
 */
test("le catalogue reste lisible par tout compte connecté, et ne s'écrit plus",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.lot_catalog;");
    banc.sql("insert into public.lot_catalog (code) values ('GO');");
    assert.equal(banc.enTantQue(A, "select count(*) from public.lot_catalog;").sortie, "1");
    assert.equal(banc.enTantQue(B, "select count(*) from public.lot_catalog;").sortie, "1");
    assert.equal(banc.enTantQue(A, "insert into public.lot_catalog (code) values ('X');").ok,
      false, "le catalogue se laisse encore réécrire");
  });

/* ── L'annuaire des personnes ─────────────────────────────────────────────── */

/**
 * **Ce que le tour précédent laissait ouvert.** Tout compte connecté lisait le
 * nom et l'adresse de toutes les personnes de tous les chantiers, parce que
 * l'unicité globale sur l'adresse interdisait de fermer sans casser l'écriture.
 */
test("une fiche n'est lue que par celui qui l'a écrite", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_collaborators;");
  banc.sql("delete from public.subject_assignees;");
  banc.sql("delete from public.directory_people;");
  banc.sql(
    "insert into public.directory_people (email, created_by_user_id) values "
    + `('o.ferrand@novaclim.example', '${A}');`
  );

  assert.equal(banc.enTantQue(A, "select count(*) from public.directory_people;").sortie, "1");
  assert.equal(banc.enTantQue(B, "select count(*) from public.directory_people;").sortie, "0",
    "l'annuaire d'un autre se lit encore");
  assert.equal(banc.sansCompte("select count(*) from public.directory_people;").sortie, "0");
});

/**
 * **Et deux carnets peuvent tenir la même adresse.** C'est ce que l'unicité
 * globale interdisait, et c'est ce qui rend la fermeture possible : chacun
 * écrit sa fiche sans heurter celle d'un autre.
 */
test("deux comptes tiennent chacun la fiche de la même adresse", { skip: sansPostgres }, () => {
  banc.sql("delete from public.directory_people;");
  const chezA = banc.enTantQue(A,
    "insert into public.directory_people (email, created_by_user_id)"
    + ` values ('o.ferrand@novaclim.example', '${A}');`);
  assert.equal(chezA.ok, true, chezA.motif);

  const chezB = banc.enTantQue(B,
    "insert into public.directory_people (email, created_by_user_id)"
    + ` values ('o.ferrand@novaclim.example', '${B}');`);
  assert.equal(chezB.ok, true, "l'unicité globale bloque encore le second carnet");

  // Mais deux fois la même adresse dans le même carnet, non.
  assert.equal(banc.enTantQue(A,
    "insert into public.directory_people (email, created_by_user_id)"
    + ` values ('o.ferrand@novaclim.example', '${A}');`).ok, false);
});

/**
 * **On n'écrit qu'en son propre nom.** Sans `with check`, on poserait une fiche
 * au nom de quelqu'un d'autre — et on la relirait par la première clause.
 */
test("on ne pose pas une fiche au nom d'un autre", { skip: sansPostgres }, () => {
  banc.sql("delete from public.directory_people;");
  const pose = banc.enTantQue(A,
    `insert into public.directory_people (email, created_by_user_id) values ('x@y.example', '${B}');`);
  assert.equal(pose.ok, false, "une fiche s'écrit au nom d'un autre compte");
});

/**
 * **Les trois autres façons d'avoir affaire à une personne.** Fermer à celles-ci
 * rendrait muets des écrans qui marchent : la vue des collaborateurs joint cette
 * table, et les assignés d'un sujet aussi.
 */
test("une personne se lit aussi par le chantier où elle collabore",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_collaborators;");
    banc.sql("delete from public.directory_people;");
    const qui = banc.sql(
      `insert into public.directory_people (email, created_by_user_id)
         values ('contact@verifas.example', '${B}') returning id;`).sortie.trim();
    // Écrite par B, mais elle collabore à la Médiathèque, qui est à A.
    banc.sql(`insert into public.project_collaborators (project_id, person_id)
                values ('${MEDIATHEQUE}', '${qui}');`);

    assert.equal(banc.enTantQue(A, "select count(*) from public.directory_people;").sortie, "1",
      "le propriétaire du chantier ne voit plus ses collaborateurs");
  });

test("une personne se lit aussi quand elle est l'assignée d'un sujet",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_collaborators;");
    banc.sql("delete from public.subject_assignees;");
    banc.sql("delete from public.directory_people;");
    const qui = banc.sql(
      `insert into public.directory_people (email, created_by_user_id)
         values ('atelier@bertrand.example', '${B}') returning id;`).sortie.trim();
    banc.sql(`insert into public.subject_assignees (project_id, person_id)
                values ('${MEDIATHEQUE}', '${qui}');`);

    assert.equal(banc.enTantQue(A, "select count(*) from public.directory_people;").sortie, "1",
      "les assignés d'un sujet ne se lisent plus");
  });

/**
 * **Et c'est moi.** Une personne dont la fiche me désigne se lit, même écrite
 * par quelqu'un d'autre : c'est ainsi qu'on se retrouve dans l'annuaire d'un
 * chantier où l'on a été invité.
 */
test("chacun lit la fiche qui le désigne", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_collaborators;");
  banc.sql("delete from public.subject_assignees;");
  banc.sql("delete from public.directory_people;");
  banc.sql(`insert into public.directory_people (email, created_by_user_id, linked_user_id)
              values ('moi@bertrand.example', '${A}', '${B}');`);
  assert.equal(banc.enTantQue(B, "select count(*) from public.directory_people;").sortie, "1");
});

/**
 * **La vingt-septième porte, qu'aucun compte de politiques ne pouvait voir.**
 *
 * `project_collaborators_view` est une vue. Une vue PostgreSQL ordinaire lit
 * ses tables de base avec les droits de son propriétaire, sans consulter leurs
 * politiques : fermer `project_collaborators` sans toucher à la vue n'aurait
 * donc rien fermé.
 */
test("la vue des collaborateurs ne contourne plus les politiques",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_collaborators;");
    banc.sql("delete from public.subject_assignees;");
    banc.sql("delete from public.directory_people;");
    const qui = banc.sql(
      `insert into public.directory_people (email, created_by_user_id)
         values ('o.ferrand@novaclim.example', '${A}') returning id;`).sortie.trim();
    banc.sql(`insert into public.project_collaborators (project_id, person_id)
                values ('${MEDIATHEQUE}', '${qui}');`);

    const sansCompte = banc.sansCompte("select count(*) from public.project_collaborators_view;");
    assert.equal(sansCompte.ok === false || sansCompte.sortie === "0", true,
      "les collaborateurs se lisent encore avec la clé publique");

    // Le propriétaire les voit ; un autre compte non.
    assert.equal(
      banc.enTantQue(A, "select count(*) from public.project_collaborators_view;").sortie, "1");
    assert.equal(
      banc.enTantQue(B, "select count(*) from public.project_collaborators_view;").sortie, "0");
  });

/* ── Les sujets techniques ────────────────────────────────────────────────── */

/** Poser des affirmations dans un chantier, en une fois. */
function desAffirmations(projet, phrases) {
  banc.sql(
    "insert into public.project_assertions (project_id, statement) values "
    + phrases.map((une) => `('${projet}', '${une.replace(/'/g, "''")}')`).join(",") + ";"
  );
}

/**
 * **Le garde-fou qui rend ceci montrable.** Un mot vu sur un seul chantier est
 * son contenu, pas du vocabulaire. Il ne sort pas.
 */
test("un terme vu sur un seul chantier ne sort pas", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  desAffirmations(MEDIATHEQUE, [
    "Le plancher beton du R+1 reste a valider",
    "Reprise du plancher beton en zone C"
  ]);
  desAffirmations(GYMNASE, ["Charpente bois lamelle colle a confirmer"]);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select sujet from public.les_sujets_du_systeme();");
  assert.equal(lu.ok, true, lu.motif);

  const sujets = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
  // « plancher beton » n'est que sur la Médiathèque : il ne sort pas.
  assert.equal(sujets.includes("plancher beton"), false,
    "un terme propre à un chantier est sorti de la console");
  assert.equal(sujets.includes("charpente bois"), false);
});

/**
 * **Et ce qu'on écarte se compte.** Taire ce qu'on cache montrerait un
 * vocabulaire plus pauvre qu'il n'est (règle 5).
 */
test("ce qui est écarté est dit", { skip: sansPostgres }, () => {
  const lu = banc.sousLadresse("patron@mdall.example",
    "select caches > 0 from public.la_mesure_des_sujets();");
  // Le motif dans le message : une épreuve qui cache l'erreur de la base fait
  // chercher dans le mauvais endroit.
  assert.equal(lu.ok, true, lu.motif);
  assert.equal(lu.sortie.trim(), "t", "la console ne dit pas ce qu'elle cache");
});

/**
 * **Le couple porte le sens, pas le mot seul.** « plancher » et « beton »
 * disent bien moins que « plancher beton » — c'est toute la granulométrie qui
 * manquait aux huit domaines.
 */
test("un terme partagé par deux chantiers sort, en mot et en couple",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_assertions;");
    desAffirmations(MEDIATHEQUE, ["Niveau de nappe phreatique releve a 3 m"]);
    desAffirmations(GYMNASE, ["La nappe phreatique impose un cuvelage"]);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select sujet || ':' || mots || ':' || affirmations || ':' || chantiers"
      + " from public.les_sujets_du_systeme() order by 1;");
    const sujets = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);

    assert.equal(sujets.includes("nappe phreatique:2:2:2"), true,
      `le couple n'est pas sorti : ${sujets.join(" | ")}`);
    assert.equal(sujets.includes("nappe:1:2:2"), true, "le mot seul n'est pas sorti");
  });

/**
 * **Les mots-outils ne sont pas des sujets.** Sans cette liste, « cordialement »
 * serait le premier terme du système.
 */
test("les mots-outils et les mots trop courts ne sont pas des sujets",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_assertions;");
    desAffirmations(MEDIATHEQUE, ["Bonjour, merci pour ce document sur le desenfumage"]);
    desAffirmations(GYMNASE, ["Bonjour, le desenfumage reste a trancher"]);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select sujet from public.les_sujets_du_systeme();");
    const sujets = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);

    assert.equal(sujets.includes("desenfumage"), true, "le terme technique n'est pas sorti");
    for (const outil of ["bonjour", "merci", "document", "pour", "sur"]) {
      assert.equal(sujets.includes(outil), false, `« ${outil} » est compté comme un sujet`);
    }
  });

/** La même porte que le reste de la console, et elle tient. */
test("les sujets se refusent à qui n'est pas administrateur", { skip: sansPostgres }, () => {
  const etranger = banc.sousLadresse("quelquun@ailleurs.example",
    "select count(*) from public.les_sujets_du_systeme();");
  assert.equal(etranger.ok, false, "la console s'ouvre à un compte ordinaire");
  assert.match(etranger.motif, /réservé à la console/);

  const mesure = banc.sousLadresse("quelquun@ailleurs.example",
    "select count(*) from public.la_mesure_des_sujets();");
  assert.equal(mesure.ok, false);
});

/* ── Les synonymes regroupés ──────────────────────────────────────────────── */

/**
 * **Le mot-outil intercalé ne coupe plus le couple.**
 *
 * Il le coupait : le couple se formait sur des mots voisins **dans la phrase
 * d'origine**, et « en », retiré juste avant, laissait un trou entre
 * « plancher » et « beton ». « plancher en beton » ne formait donc aucun sujet.
 */
test("« plancher en beton » et « plancher beton » sont le même sujet",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_assertions;");
    desAffirmations(MEDIATHEQUE, ["Le plancher en beton du R+1 reste a valider"]);
    desAffirmations(GYMNASE, ["Reprise du plancher beton en zone C"]);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select sujet || ':' || formes || ':' || chantiers"
      + " from public.les_sujets_du_systeme() where sujet like '%plancher%';");
    assert.equal(lu.ok, true, lu.motif);
    const sujets = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);

    // **Une seule forme, et c'est le regroupement le plus complet possible** :
    // le couple se fabrique sur les mots qui restent, si bien que « plancher en
    // beton » s'écrit déjà « plancher beton ». Les deux phrases ne produisent
    // donc pas deux formes à rapprocher — elles produisent la même.
    assert.equal(sujets.includes("plancher beton:1:2"), true,
      `le couple ne s'est pas formé des deux côtés : ${sujets.join(" | ")}`);
  });

/**
 * **Le pluriel ne fait pas un sujet de plus.** Et le radical reste pauvre : il
 * ne touche qu'à la marque de nombre.
 */
test("le pluriel se range sous le singulier", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  desAffirmations(MEDIATHEQUE, ["Les planchers betons sont coules"]);
  desAffirmations(GYMNASE, ["Le plancher beton est coule"]);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select count(*) from public.les_sujets_du_systeme() where sujet like '%plancher%beton%';");
  assert.equal(lu.sortie.trim(), "1", "le pluriel fait encore un sujet de plus");

  // Le radical ne va pas plus loin que le nombre.
  const radical = banc.sql(
    "select public.le_radical('portails') || ':' || public.le_radical('porte')"
    + " || ':' || public.le_radical('locaux') || ':' || public.le_radical('mur');");
  assert.equal(radical.sortie.trim(), "portail:porte:local:mur");
});

/**
 * **L'ordre des deux mots ne compte pas, et l'affichage garde ce qui a été
 * écrit.** On regroupe sans réécrire ce que les gens ont écrit.
 */
test("« beton plancher » se range avec « plancher beton »", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  desAffirmations(MEDIATHEQUE, ["plancher beton fissure", "plancher beton repris"]);
  desAffirmations(GYMNASE, ["beton plancher a controler"]);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select sujet || ':' || formes from public.les_sujets_du_systeme()"
    + " where sujet like '%plancher%' and sujet like '%beton%';");
  const sujets = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);

  assert.equal(sujets.length, 1, `deux sujets pour un seul : ${sujets.join(" | ")}`);
  // La forme la plus écrite gagne : « plancher beton », vue deux fois.
  assert.equal(sujets[0], "plancher beton:2");
});

/* ── La prédiction portée sur les sujets ──────────────────────────────────── */

/**
 * **Le même calcul que sur les domaines, sur les sujets.** C'est ce qui donne
 * « après une question de nappe, une question de cuvelage » là où les domaines
 * ne savent dire que « après le sol, la structure ».
 */
test("les sujets s'enchaînent d'une affirmation à la suivante",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_assertions;");
    // **Les deux chantiers s'entrelacent dans le temps**, exprès. Rangés bout à
    // bout, un rang calculé sur tout le système donnerait par hasard le même
    // résultat qu'un rang calculé par chantier, et le banc ne verrait pas la
    // différence : une mutation a survécu ainsi. Entrelacés, « la suivante »
    // n'a de sens qu'à l'intérieur d'un chantier.
    banc.sql(
      "insert into public.project_assertions (project_id, statement, created_at) values "
      + `('${MEDIATHEQUE}', 'nappe phreatique relevee', '2026-01-01T00:00:00Z'),`
      + `('${GYMNASE}',     'nappe phreatique haute',   '2026-01-02T00:00:00Z'),`
      + `('${MEDIATHEQUE}', 'cuvelage a prevoir',       '2026-01-03T00:00:00Z'),`
      + `('${GYMNASE}',     'cuvelage impose',          '2026-01-04T00:00:00Z'),`
      // Un sujet d'un seul chantier : il ne doit entrer dans aucun couple.
      + `('${MEDIATHEQUE}', 'garde corps vitre',        '2026-01-05T00:00:00Z');`
    );

    const lu = banc.sousLadresse("patron@mdall.example",
      "select avant || '>' || apres || ':' || combien || ':' || chantiers"
      + " from public.les_enchainements_des_sujets()"
      + " where avant = 'nappe phreatique' and apres = 'cuvelage';");
    assert.equal(lu.ok, true, lu.motif);
    assert.equal(lu.sortie.trim(), "nappe phreatique>cuvelage:2:2",
      "l'enchaînement de sujets ne se forme pas");
  });

/**
 * **Les couples ne traversent pas deux chantiers**, comme pour les domaines :
 * la dernière affirmation de l'un ne suit pas la première de l'autre.
 */
test("un enchaînement de sujets ne traverse pas deux chantiers",
  { skip: sansPostgres }, () => {
    const lu = banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.les_enchainements_des_sujets()"
      + " where avant = 'cuvelage' and apres = 'nappe phreatique';");
    assert.equal(lu.sortie.trim(), "0",
      "un enchaînement s'est formé entre la fin d'un chantier et le début d'un autre");
  });

/**
 * **Le seuil tient aussi sur les enchaînements.** Un sujet vu dans un seul
 * chantier n'est pas un sujet du système : c'est le vocabulaire d'un chantier,
 * et le faire entrer dans les couples rendrait à la console des prédictions
 * tirées d'un seul dossier — exactement ce qu'on ne veut pas montrer.
 */
test("un sujet d'un seul chantier n'entre dans aucun enchaînement",
  { skip: sansPostgres }, () => {
    const lu = banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.les_enchainements_des_sujets()"
      + " where avant like '%garde%' or apres like '%garde%'"
      + " or avant like '%vitre%' or apres like '%vitre%';");
    assert.equal(lu.ok, true, lu.motif);
    assert.equal(lu.sortie.trim(), "0",
      "un sujet vu sur un seul chantier s'est enchaîné");
  });

/** La même porte, et elle tient. */
test("les enchaînements de sujets se refusent à qui n'est pas administrateur",
  { skip: sansPostgres }, () => {
    const etranger = banc.sousLadresse("quelquun@ailleurs.example",
      "select count(*) from public.les_enchainements_des_sujets();");
    assert.equal(etranger.ok, false, "la console s'ouvre à un compte ordinaire");
    assert.match(etranger.motif, /réservé à la console/);
  });

/**
 * **La mesure du regroupement est vérifiable, pas promise.**
 *
 * « Pluriels, ordre des mots, mots-outils intercalés » est une affirmation ; le
 * nombre de formes rangées sous les sujets montrés la vérifie (règle 12).
 */
test("le nombre de formes rangées se compte", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  // Trois écritures de la même chose, sur deux chantiers.
  desAffirmations(MEDIATHEQUE, ["planchers betons coules", "beton plancher repris"]);
  desAffirmations(GYMNASE, ["plancher beton fissure"]);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select montres || ':' || formes from public.la_mesure_des_sujets();");
  assert.equal(lu.ok, true, lu.motif);

  const [montres, formes] = lu.sortie.trim().split(":").map(Number);
  assert.equal(montres > 0, true, "aucun sujet n'est montré");
  assert.equal(formes > montres, true,
    `rien ne s'est regroupé : ${formes} formes pour ${montres} sujets`);
});

/* ── Les sujets d'un chantier, pour son propre prédicteur ─────────────────── */

/**
 * **Le prédicteur d'un chantier a besoin des sujets de ce chantier**, par
 * affirmation : c'est sur eux qu'il prédira au lieu des huit domaines.
 *
 * Le seuil est **interne au chantier** — « répété ici », et non « vu ailleurs ».
 */
test("les sujets d'un chantier sortent par affirmation", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  // Le gymnase appartient à B : c'est lui qui pourra lire.
  desAffirmations(GYMNASE, [
    "plancher beton fissure en sous-sol",
    "plancher beton repris au niveau bas",
    // Vu une seule fois dans ce chantier : rien à prédire, il ne sort pas.
    "garde corps vitre a reprendre"
  ]);

  const lu = banc.enTantQue(B,
    `select sujet from public.les_sujets_de_ce_chantier('${GYMNASE}') order by 1;`);
  assert.equal(lu.ok, true, lu.motif);

  const sujets = lu.sortie.split("\n").map((un) => un.trim()).filter(Boolean);
  assert.ok(sujets.includes("plancher beton"),
    `« plancher beton » ne sort pas : ${sujets.join(" | ")}`);
  assert.ok(!sujets.some((un) => un.includes("garde")),
    `un sujet vu une seule fois sort quand même : ${sujets.join(" | ")}`);
});

/**
 * **Le chantier demandé, et lui seul.**
 *
 * Une mutation a survécu ici, et elle disait quelque chose : le banc n'avait
 * qu'un propriétaire par chantier, si bien que la politique de la table
 * suffisait à ne rendre qu'un projet. Retirer `where project_id = le_chantier`
 * ne changeait donc rien — alors qu'un vrai compte en possède dix, et aurait vu
 * les sujets des neuf autres sous l'onglet du premier.
 *
 * B possède maintenant deux chantiers, et c'est ce qui rend la clause visible.
 */
test("les sujets d'un chantier ne sont que les siens", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  // Les vestiaires n'avaient pas de propriétaire : on les donne à B, qui tient
  // déjà le gymnase.
  banc.sql(
    "update public.projects set owner_id = '" + B + "'"
    + " where id = '44444444-4444-4444-8444-444444444444';");

  desAffirmations(GYMNASE, ["plancher beton fissure", "plancher beton repris"]);
  desAffirmations("44444444-4444-4444-8444-444444444444",
    ["charpente bois deposee", "charpente bois remontee"]);

  const lu = banc.enTantQue(B,
    `select coalesce(string_agg(distinct sujet, '|' order by sujet), '')`
    + ` from public.les_sujets_de_ce_chantier('${GYMNASE}');`);
  assert.equal(lu.ok, true, lu.motif);

  const sujets = lu.sortie.trim().split("|").filter(Boolean);
  // Les siens sont là — « plancher » seul autant que le couple : les deux sont
  // des sujets de ce chantier, et le banc n'a pas à en préférer un.
  assert.ok(sujets.includes("plancher beton"), `les siens manquent : ${sujets.join(" ")}`);
  // Ceux de l'autre chantier, non — et c'est toute la clause.
  assert.deepEqual(sujets.filter((un) => un.includes("charpente")), [],
    `les sujets d'un autre chantier du même propriétaire sont sortis : ${sujets.join(" ")}`);
});

/**
 * **Un sujet écrit deux fois dans la même phrase est un sujet, pas deux.**
 *
 * Sans le dédoublonnage, une phrase bavarde pèserait deux fois dans les
 * fréquences du prédicteur — et les tournures verbeuses remonteraient devant les
 * sujets réellement fréquents.
 */
test("un sujet répété dans une phrase ne sort qu'une fois",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_assertions;");
    desAffirmations(GYMNASE, [
      "plancher beton fissure et autre plancher beton repris",
      "plancher beton a controler"
    ]);

    const lu = banc.enTantQue(B,
      "select count(*) from public.les_sujets_de_ce_chantier"
      + `('${GYMNASE}') where sujet = 'plancher beton';`);
    assert.equal(lu.sortie.trim(), "2",
      "« plancher beton » sort plus d'une fois par affirmation");
  });

/**
 * **Chaque affirmation porte ses sujets**, et c'est ce qui rend la séquence
 * mesurable : « après cette affirmation-là, celle-ci est venue ». Rendre les
 * sujets du chantier sans dire de quelle affirmation ils sortent aurait donné
 * un sac de mots, dont aucun prédicteur ne tire de suite.
 */
test("un sujet se rattache à l'affirmation d'où il sort", { skip: sansPostgres }, () => {
  const lu = banc.enTantQue(B,
    "select count(distinct affirmation) || ':' || count(*)"
    + ` from public.les_sujets_de_ce_chantier('${GYMNASE}');`);
  const [affirmations, lignes] = lu.sortie.trim().split(":").map(Number);
  assert.equal(affirmations, 2,
    `les deux affirmations qui répètent un sujet devraient sortir : ${affirmations}`);
  assert.ok(lignes > affirmations,
    `une affirmation porte plusieurs sujets : ${lignes} lignes pour ${affirmations}`);
});

/**
 * **Le seuil est interne au chantier, et cela se vérifie.**
 *
 * Un sujet écrit une fois ici et une fois ailleurs passerait le seuil du
 * système — « vu sur deux chantiers » — et ne passe pas celui-ci. C'est voulu :
 * le faire sortir aurait appris au membre d'un projet qu'une de ses tournures
 * se retrouve dans un autre, ce qui est une inférence sur un contenu qu'il n'a
 * pas le droit de lire.
 */
test("un sujet vu ailleurs mais pas répété ici ne sort pas",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_assertions;");
    desAffirmations(GYMNASE, ["etancheite toiture terrasse a revoir"]);
    desAffirmations(MEDIATHEQUE, ["etancheite toiture terrasse reprise"]);

    // Le système le montrerait : deux chantiers l'emploient.
    const systeme = banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.les_sujets_du_systeme()"
      + " where sujet like '%etancheite%toiture%';");
    assert.ok(Number(systeme.sortie.trim()) > 0,
      "le seuil du système devrait retenir ce terme");

    // Le chantier, non : il ne l'a écrit qu'une fois.
    const chantier = banc.enTantQue(B,
      "select count(*) from public.les_sujets_de_ce_chantier"
      + `('${GYMNASE}') where sujet like '%etancheite%';`);
    assert.equal(chantier.sortie.trim(), "0",
      "un sujet vu ailleurs est sorti sans avoir été répété ici");
  });

/**
 * **La porte est celle qui existait déjà**, et c'est tout l'intérêt de laisser
 * cette fonction en `security invoker` : un `security definer` aurait demandé un
 * second garde-fou écrit à la main, qui aurait un jour cessé de dire la même
 * chose que la politique de la table.
 */
test("les sujets d'un chantier ne sortent pas pour qui n'y a pas droit",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_assertions;");
    desAffirmations(GYMNASE, ["plancher beton fissure", "plancher beton repris"]);

    // A n'est pas propriétaire du gymnase : la politique ne lui rend rien.
    const etranger = banc.enTantQue(A,
      `select count(*) from public.les_sujets_de_ce_chantier('${GYMNASE}');`);
    assert.equal(etranger.sortie.trim(), "0",
      "un compte qui n'a pas le chantier en lit les sujets");

    // Et la clé publique du navigateur, encore moins.
    const sans = banc.sansCompte(
      `select count(*) from public.les_sujets_de_ce_chantier('${GYMNASE}');`);
    assert.equal(sans.ok === false || sans.sortie.trim() === "0", true,
      `la clé anonyme lit les sujets d'un chantier : ${sans.sortie}`);
  });

/**
 * **L'extraction vit à un seul endroit** (règle 4). Elle était écrite trois
 * fois ; une quatrième copie serait partie avec la fonction par chantier.
 *
 * On l'éprouve directement : c'est elle que les quatre fonctions appellent, et
 * la vérifier ici vérifie les quatre d'un coup.
 */
test("l'extraction d'une phrase est la même pour tout le monde",
  { skip: sansPostgres }, () => {
    const lu = banc.sql(
      "select string_agg(sujet || '/' || cle || '/' || mots, ' | ' order by sujet)"
      + " from public.les_sujets_dun_texte('Les planchers en beton');");

    // « les » et « en » sont des mots-outils ; « planchers » et « beton » sont
    // donc voisins, et le couple se forme sur les radicaux rangés.
    assert.equal(lu.sortie.trim(),
      "beton/beton/1 | planchers/plancher/1 | planchers beton/beton plancher/2");
  });

/* ── La file lit aussi les comptes rendus ─────────────────────────────────── */

/**
 * **Les lignes déjà posées sont des dépôts de messagerie**, et le défaut le dit.
 *
 * Sans défaut, la colonne serait nulle sur tout l'existant, et la fonction des
 * mails — qui ne prend que son geste — aurait cessé de trouver ce qui l'attend.
 */
test("une ligne de file posée sans geste est un dépôt de messagerie",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.versements;");
    const pose = banc.enTantQue(A,
      `insert into public.versements (project_id) values ('${MEDIATHEQUE}')`
      + " returning geste || ':' || documents::text;");
    assert.equal(pose.ok, true, pose.motif);
    assert.equal(pose.sortie.trim(), "mails:[]");
  });

/**
 * **Une lecture de comptes rendus porte des identifiants, jamais des octets.**
 * Ces documents sont déjà dans le projet ; recopier un chemin de stockage ici
 * aurait fait un second endroit où l'on sait où vit un document (règle 10).
 */
test("une lecture de comptes rendus se pose avec ses documents",
  { skip: sansPostgres }, () => {
    const pose = banc.enTantQue(A,
      "insert into public.versements (project_id, geste, documents) values "
      + `('${MEDIATHEQUE}', 'comptes_rendus',`
      + ` '[{"id":"d1","nom":"CR 01.pdf"},{"id":"d2","nom":"CR 02.pdf"}]'::jsonb)`
      + " returning jsonb_array_length(documents)::text;");
    assert.equal(pose.ok, true, pose.motif);
    assert.equal(pose.sortie.trim(), "2");
  });

/**
 * **La porte ne s'est pas ouverte en s'élargissant.** Trois colonnes de plus ne
 * doivent rien changer à qui lit la file : c'est son auteur, et personne
 * d'autre — pas même les autres membres du projet.
 */
test("les colonnes neuves ne rouvrent pas la file", { skip: sansPostgres }, () => {
  const parUnAutre = banc.enTantQue(B,
    "select count(*) from public.versements where geste = 'comptes_rendus';");
  assert.equal(parUnAutre.sortie.trim(), "0",
    "un autre compte lit la file de comptes rendus");

  const sans = banc.sansCompte("select count(*) from public.versements;");
  assert.equal(sans.ok === false || sans.sortie.trim() === "0", true,
    `la clé publique du navigateur lit la file : ${sans.sortie}`);
});

/**
 * **Une seule proposition pour toute la file**, et la ligne la porte : c'est
 * par elle qu'on retrouve ce qu'une mise à niveau a ouvert, trois semaines plus
 * tard.
 */
test("la ligne porte la proposition qu'elle a ouverte", { skip: sansPostgres }, () => {
  const proposition = banc.sql(
    `insert into public.propositions (project_id) values ('${MEDIATHEQUE}') returning id;`);
  const id = proposition.sortie.trim();

  const lie = banc.enTantQue(A,
    `update public.versements set proposition_id = '${id}'`
    + " where geste = 'comptes_rendus' returning proposition_id::text;");
  assert.equal(lie.ok, true, lie.motif);
  assert.equal(lie.sortie.trim(), id);

  // Elle ne naît pas liée : la proposition n'existe qu'à la fin, quand on sait
  // ce qu'il y a à proposer.
  const neuve = banc.enTantQue(A,
    `insert into public.versements (project_id, geste) values ('${MEDIATHEQUE}', 'comptes_rendus')`
    + " returning coalesce(proposition_id::text, 'aucune');");
  assert.equal(neuve.sortie.trim(), "aucune");
});

/* ── Ce qui entre en mémoire cesse d'être privé ───────────────────────────── */

/**
 * **Une mémoire dont la source est invisible n'est pas vérifiable.**
 *
 * Tout tient sur « chaque point se remonte au compte rendu dont il sort ». Un
 * collaborateur qui lit une affirmation doit pouvoir ouvrir le document qui la
 * porte ; si ce document reste caché parce qu'il est arrivé par le dossier des
 * mails, l'affirmation devient une parole qu'on croit sur parole.
 *
 * La règle du dossier privé ne bouge pas — elle gagne une **fin** : tant qu'il
 * n'est pas entré en mémoire.
 */
test("un document du dossier privé reste privé tant qu'il n'est pas en mémoire",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.documents;");
    // Le gymnase appartient à B. A y a déposé un document dans un dossier privé.
    const dossier = banc.sql(
      "insert into public.project_document_folders (project_id, name, prive)"
      + ` values ('${GYMNASE}', 'Mails', true) returning id;`).sortie.trim();
    banc.sql(
      "insert into public.documents (project_id, folder_id, deposant, proposition_id)"
      + ` values ('${GYMNASE}', '${dossier}', '${A}', null);`);

    // B possède le chantier, et ne voit pourtant pas ce que A y a déposé.
    const parLeProprietaire = banc.enTantQue(B,
      `select count(*) from public.documents where folder_id = '${dossier}';`);
    assert.equal(parLeProprietaire.sortie.trim(), "0",
      "la correspondance d'un autre se lit : la règle d'octobre est tombée");

    // Son déposant, lui, le voit toujours.
    const parSonDeposant = banc.enTantQue(A,
      `select count(*) from public.documents where folder_id = '${dossier}';`);
    assert.equal(parSonDeposant.sortie.trim(), "0",
      "A ne possède pas ce chantier : la règle du projet passe avant");
  });

/**
 * **Et le jour où quelqu'un signe, il se partage.**
 *
 * `proposition_id` ne se pose que lorsqu'une proposition est signée (règle 1) :
 * il n'existe aucun chemin par lequel un document devienne partagé sans que
 * quelqu'un l'ait décidé.
 */
test("un document entré en mémoire se lit par l'équipe", { skip: sansPostgres }, () => {
  banc.sql("delete from public.documents;");
  const dossier = banc.sql(
    "insert into public.project_document_folders (project_id, name, prive)"
    + ` values ('${GYMNASE}', 'Mails signés', true) returning id;`).sortie.trim();
  const proposition = banc.sql(
    `insert into public.propositions (project_id) values ('${GYMNASE}') returning id;`)
    .sortie.trim();

  // Deux documents dans le même dossier privé, déposés par le même tiers : un
  // seul est entré en mémoire. C'est la seule différence entre les deux.
  banc.sql(
    "insert into public.documents (project_id, folder_id, deposant, proposition_id) values "
    + `('${GYMNASE}', '${dossier}', '${A}', null),`
    + `('${GYMNASE}', '${dossier}', '${A}', '${proposition}');`);

  const lu = banc.enTantQue(B,
    `select count(*) from public.documents where folder_id = '${dossier}';`);
  assert.equal(lu.ok, true, lu.motif);
  assert.equal(lu.sortie.trim(), "1",
    "le document signé ne se partage pas, ou celui qui ne l'est pas se partage");

  // Et c'est bien celui-là.
  const lequel = banc.enTantQue(B,
    `select proposition_id::text from public.documents where folder_id = '${dossier}';`);
  assert.equal(lequel.sortie.trim(), proposition);
});

/**
 * **Un dossier ordinaire ne change pas de régime.** La règle ne s'applique
 * qu'aux dossiers privés : l'élargir aux autres n'aurait rien élargi, et
 * l'aurait rendue impossible à relire.
 */
test("un dossier ordinaire se lit comme avant", { skip: sansPostgres }, () => {
  banc.sql("delete from public.documents;");
  const dossier = banc.sql(
    "insert into public.project_document_folders (project_id, name, prive)"
    + ` values ('${GYMNASE}', 'Comptes rendus', false) returning id;`).sortie.trim();
  banc.sql(
    "insert into public.documents (project_id, folder_id, deposant, proposition_id)"
    + ` values ('${GYMNASE}', '${dossier}', '${A}', null);`);

  const lu = banc.enTantQue(B,
    `select count(*) from public.documents where folder_id = '${dossier}';`);
  assert.equal(lu.sortie.trim(), "1", "un dossier ordinaire s'est mis à cacher");
});

/** Et la clé publique du navigateur ne lit toujours rien. */
test("l'élargissement n'ouvre rien à qui n'a pas de compte", { skip: sansPostgres }, () => {
  const sans = banc.sansCompte("select count(*) from public.documents;");
  assert.equal(sans.ok === false || sans.sortie.trim() === "0", true,
    `la clé anonyme lit les documents : ${sans.sortie}`);
});


/* ── Ce qu'une migration pose vraiment ───────────────────────────────────── */

/**
 * **La migration qui a été refusée au déploiement est bien appliquée ici.**
 *
 * L'ajouter à la liste ne suffit pas : une liste qu'on raccourcit laisse le banc
 * vert, puisque rien d'autre ne dépend de ce qu'elle pose. On demande donc à
 * PostgreSQL les colonnes qu'elle doit avoir ajoutées — c'est la seule façon de
 * dire qu'elle a tourné, et non qu'on l'a nommée.
 */
test("une lecture de compte rendu porte ce qu'elle a vu", { skip: sansPostgres }, () => {
  const dit = banc.sql(
    "select column_name from information_schema.columns"
    + " where table_schema = 'public' and table_name = 'cr_lectures' order by column_name;"
  );
  const colonnes = dit.sortie.split("\n").map((un) => un.trim()).filter(Boolean);

  for (const attendue of ["analyse_gelee", "document_id", "proposition_id", "mesures", "tenue_le"]) {
    assert.ok(colonnes.includes(attendue),
      `« cr_lectures » n'a pas « ${attendue} » : la migration n'a pas tourné`);
  }

  // **Et pas sous son ancien nom**, celui que PostgreSQL refusait.
  assert.ok(!colonnes.includes("analyse"),
    "la colonne porte encore le mot réservé : le déploiement sera refusé");
});

/* ── Ce que PostgreSQL refuse de laisser nommer ──────────────────────────── */

/**
 * **La liste des mots réservés ne dérive pas.**
 *
 * `les-mots-reserves.mjs` porte une copie écrite : l'intégration continue n'a
 * pas de serveur PostgreSQL, et une épreuve qui en demanderait un s'ignorerait
 * là où elle sert — juste avant le déploiement.
 *
 * Mais une liste écrite et jamais vérifiée dérive (règle 4). Ici, où il y a un
 * serveur, on la confronte à `pg_get_keywords()` : les deux catégories qu'un
 * identifiant ne peut pas porter, `R` (réservé) et `T` (réservé, utilisable
 * comme nom de fonction ou de type).
 */
test("la liste des mots réservés est celle de PostgreSQL", { skip: sansPostgres }, () => {
  const dit = banc.sql(
    "select word from pg_get_keywords() where catcode in ('R', 'T') order by word;"
  );
  const duServeur = dit.sortie.split("\n").map((un) => un.trim()).filter(Boolean);

  assert.ok(duServeur.length > 90, `pg_get_keywords n'a rien rendu : ${duServeur.length}`);

  const manquants = duServeur.filter((mot) => !LES_MOTS_RESERVES.has(mot));
  assert.deepEqual(manquants, [],
    `ces mots sont réservés et la liste les laisserait passer : ${manquants.join(", ")}`);

  const enTrop = [...LES_MOTS_RESERVES].filter((mot) => !duServeur.includes(mot));
  assert.deepEqual(enTrop, [],
    `ces mots ne sont plus réservés : la liste refuserait des noms permis — ${enTrop.join(", ")}`);
});
