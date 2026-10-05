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
import { LES_SORTES_DE_LIENS } from "../apps/web/js/services/une-idee.js";

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
  // Les idées : le découpage d'une affirmation par ses mots de liaison. Il
  // s'appuie sur `les_mots_outils()`, que la migration des sujets pose.
  "202611130001_les_idees_du_systeme.sql",
  // Le découpage, écrit une seule fois, et de quoi savoir où il casse.
  "202611140001_la_coupe_dun_texte.sql",
  // La coupe, écrite une fois pour un ensemble de textes : appelée affirmation
  // par affirmation, elle coûtait vingt-huit fois plus et ne revenait pas.
  "202611150001_la_coupe_passe_sur_tout_le_corpus.sql",
  // Le corpus en clair : du contenu de chantier, pour la mise au point du
  // découpage. C'est la porte la plus ouverte du produit — elle a sa règle.
  "202611160001_le_corpus_en_clair.sql",
  // Les lectures de fils de mails : privées, comme celles des comptes rendus,
  // et pour une raison de plus — un fil dit qui a écrit quoi à qui.
  "202611170001_une_lecture_de_fil_se_garde.sql",
  // Le corpus rendu en UN document : un ensemble de lignes se faisait tronquer
  // à mille par PostgREST, sans le dire.
  "202611180001_le_corpus_tient_dans_un_document.sql",
  // Combien de phrases distinctes pour combien de lignes, et d'où viennent les
  // copies : le dénominateur de tout ce que la console annonce.
  "202611180002_la_repetition_du_corpus.sql",
  // « au-delà » devenait le terme « delà » : les morceaux de locution rejoignent
  // les mots-outils.
  "202611180003_les_locutions_ne_sont_pas_des_termes.sql",
  // Une seule normalisation : la ligature « œ » coupait « manœuvre » en deux, et
  // le correctif n'aurait touché qu'un chemin sur cinq.
  "202611190001_une_seule_normalisation.sql",
  // Les lectures lisent ce que l'écran lit : un tiers des phrases versées sont
  // un repli fautif, et la vraie phrase est dans le payload.
  "202611190002_les_lectures_lisent_ce_que_lecran_lit.sql",
  // « non conforme » ne devient plus « conforme » : une idée qui dit le
  // contraire du texte est pire qu'une idée manquante.
  "202611190003_une_negation_ne_devient_pas_son_contraire.sql",
  // Toutes les natures se relisent : 2 274 affirmations ne se lisaient que par
  // leur identifiant, parce que la lecture n'avait qu'une branche sur cinq.
  "202611200001_toutes_les_natures_se_relisent.sql",
  // Le lot est un intitulé : la coupe lit la phrase, le lexique lit tout.
  "202611200002_le_lot_est_un_intitule_pas_un_sujet.sql",
  // « aucun degré exigé » n'est pas une obligation : une négation devant la
  // liaison la nie.
  "202611200003_une_liaison_niee_nest_pas_une_liaison.sql",
  // La lecture d'un rapport de contrôle se garde : privée, comme celles des CR
  // et des fils, et pour une raison de plus — elle porte le verdict d'un tiers.
  "202611210001_une_lecture_de_rapport_se_garde.sql",
  // Les comptes de Mdall, et le journal des accès administrateurs. Trois
  // fonctions `security definer` qui lisent des **personnes** : c'est le cas où
  // il faut essayer d'entrer, pas relire la règle.
  "202611220001_les_comptes_de_mdall.sql",
  // Le journal des refus : c'est la seule trace de ce qui n'a **pas** abouti, et
  // la santé des systèmes ne lit rien d'autre. Sans lui, la fonction ne se
  // déploie pas.
  "202610190001_le_journal_des_refus.sql",
  // L'exploitation : la santé des systèmes, le journal des consultations, et le
  // stockage. Trois fonctions `security definer` de plus — dont une qui rend
  // lisible un journal posé sans aucune politique.
  "202611230001_lexploitation_de_mdall.sql",
  // Les venues : le trafic et le temps passé. Une table de présence, écrite par
  // le navigateur — donc celle où il faut essayer d'écrire la venue d'un autre.
  "202611240001_les_venues_de_mdall.sql",
  // Les mesures de justesse : la table où les quatre outils déposent leur bilan.
  // Sa contrainte `bilan_sans_contenu` est une promesse tenue par la structure,
  // et une promesse de ce genre ne se relit pas — elle s'essaie.
  "202611250001_les_mesures_de_justesse.sql",
  // Celle du dossier des mails pose la politique que la suivante élargit :
  // sans elle, on éprouverait un élargissement de rien.
  "202610160001_le_dossier_des_mails_est_prive.sql",
  "202611110001_ce_qui_entre_en_memoire_se_partage.sql"
];

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/**
 * **Les comptes derrière les deux adresses du banc.**
 *
 * `sousLadresse` ne posait qu'un courriel dans le jeton, parce que la console
 * se garde par le courriel. C'était un jeton que Supabase n'émet jamais : une
 * session en porte toujours un `sub`, et `auth.uid()` le lit. Le banc entrait
 * donc avec une identité à moitié vide, et toute politique écrite
 * `owner_id = auth.uid()` était refusée pour une raison qui n'existe pas en
 * production — une table se serait déclarée imprenable alors qu'elle s'ouvre.
 *
 * Ces deux comptes **ne possèdent aucun chantier**, pour que leur venue
 * n'ouvre rien d'autre que ce que leur adresse ouvre déjà.
 */
const LES_COMPTES_DU_BANC = {
  "patron@mdall.example": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  "quelquun@ailleurs.example": "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
};
const MEDIATHEQUE = "11111111-1111-4111-8111-111111111111";
const GYMNASE = "33333333-3333-4333-8333-333333333333";

/** Les quatre cas du propriétaire, et ce qu'on attend de chacun. */
const LES_CHANTIERS = `
insert into auth.users (id) values ('${A}'), ('${B}'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd');

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
  pg.sousLadresse = (courriel, texte) => {
    // Le `sub` va avec le courriel, comme dans un vrai jeton. Une adresse que
    // le banc ne connaît pas entre sans compte : c'est le cas du jeton forgé.
    const qui = LES_COMPTES_DU_BANC[courriel];
    return pg.sql(
      `set role authenticated;\n`
      + (courriel
        ? `set request.jwt.claims = '${JSON.stringify({ email: courriel, sub: qui })}';\n`
        : "reset request.jwt.claims;\n")
      + (qui
        ? `set request.jwt.claim.sub = '${qui}';\n`
        : "reset request.jwt.claim.sub;\n")
      + texte,
      { doitTenir: false }
    );
  };

  return pg;
}

/**
 * Les cas de « ce que dit une affirmation », partagés avec l'épreuve
 * JavaScript. Voir le champ `pourquoi` du fichier.
 */
const LES_CAS = JSON.parse(readFileSync(
  new URL("../apps/web/js/services/ce-que-dit-une-affirmation.cas.json", import.meta.url),
  "utf8"));

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

/* ── Les idées : ce qui entraîne quoi ─────────────────────────────────────── */

/**
 * Le découpage d'une affirmation par son mot de liaison.
 *
 * On ne vérifie pas que « ça marche » : on vérifie que la **flèche va dans le
 * bon sens**. « A car B » va de B vers A, « A donc B » va de A vers B — et
 * c'est la seule erreur qui rende un raisonnement exactement faux plutôt
 * qu'approximatif.
 */
test("« donc » et « car » ne mettent pas la cause du même côté",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_assertions;");
    // « sol » fait trois lettres : le découpage l'écarte, comme pour les sujets.
    // C'est « terrain » qui porte le terme, et la première version de cette
    // épreuve l'ignorait — elle attendait ce que je croyais, pas ce qui est.
    for (const projet of [MEDIATHEQUE, GYMNASE]) {
      desAffirmations(projet, [
        "Le terrain argileux est confirme donc le plancher beton sera repris",
        "Le plancher beton sera repris car le terrain argileux est confirme"
      ]);
    }

    const lu = banc.sousLadresse("patron@mdall.example",
      "select avant || ' > ' || apres from public.les_idees_du_systeme();");
    assert.equal(lu.ok, true, lu.motif);

    const idees = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
    // Les deux phrases disent la même chose dans les deux sens : elles doivent
    // donner **la même** idée, et non deux idées opposées.
    assert.deepEqual(idees, ["terrain argileux > plancher beton"],
      `le sens de la flèche est faux : ${idees.join(" | ")}`);
  });

/**
 * **Le mot de liaison ne se trouve pas au milieu d'un autre mot.**
 *
 * La phrase porte un terme **avant** « carrelage », et c'est tout le sujet :
 * la première version de cette épreuve disait « Le carrelage grand format… ».
 * « car » s'y lisait bel et bien, mais le membre de gauche n'avait alors aucun
 * terme, et l'idée tombait pour une raison qui n'était pas la bonne. L'épreuve
 * passait **par accident** : retirer les espaces autour des mots de liaison ne
 * la faisait pas tomber.
 */
test("« car » ne se lit pas dans « carrelage »", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  for (const projet of [MEDIATHEQUE, GYMNASE]) {
    desAffirmations(projet, ["La reprise du carrelage grand format reste a valider"]);
  }

  const lu = banc.sousLadresse("patron@mdall.example",
    "select count(*) from public.les_idees_du_systeme();");
  assert.equal(lu.ok, true, lu.motif);
  assert.equal(lu.sortie.trim(), "0", "un mot de liaison a été lu dans un autre mot");
});

/**
 * **La première liaison de la phrase, et pas une autre.**
 *
 * Une affirmation qui en porte deux énonce deux idées. On lit la première, et
 * l'on dit ce qu'on ne lit pas. Lire la seconde, ou n'importe laquelle,
 * donnerait une idée vraie découpée au mauvais endroit — et dans un
 * raisonnement, un maillon mal coupé contamine toute la chaîne.
 */
test("une affirmation qui porte deux liaisons se coupe sur la première",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_assertions;");
    for (const projet of [MEDIATHEQUE, GYMNASE]) {
      desAffirmations(projet, [
        "Le terrain argileux impose un cuvelage renforce donc le delai augmente"
      ]);
    }

    const lu = banc.sousLadresse("patron@mdall.example",
      "select avant || ' > ' || apres || ' > ' || lien from public.les_idees_du_systeme();");
    assert.equal(lu.ok, true, lu.motif);
    // Coupée sur « donc », elle dirait « cuvelage renforce entraîne delai » —
    // vrai aussi, et ce n'est pas ce qu'on a demandé.
    assert.equal(lu.sortie.trim(), "terrain argileux > cuvelage renforce > obligation");
  });

/** Une idée vue sur un seul chantier est son contenu, pas une idée de métier. */
test("une idée vue sur un seul chantier ne sort pas", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  desAffirmations(MEDIATHEQUE, [
    "Le sol argileux est confirme donc le plancher beton sera repris"
  ]);
  desAffirmations(GYMNASE, [
    "La nappe phreatique remonte donc le cuvelage devient obligatoire"
  ]);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select count(*) from public.les_idees_du_systeme();");
  assert.equal(lu.ok, true, lu.motif);
  assert.equal(lu.sortie.trim(), "0",
    "une idée propre à un chantier est sortie de la console");
});

/**
 * **Ce qu'on cache se compte.** Une liste vide veut dire deux choses opposées :
 * le corpus n'énonce aucun lien, ou il en énonce et aucun n'est partagé.
 */
test("la mesure dit ce que la liste ne montre pas", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  desAffirmations(MEDIATHEQUE, [
    "Le sol argileux est confirme donc le plancher beton sera repris",
    "Les menuiseries exterieures restent a chiffrer"
  ]);
  desAffirmations(GYMNASE, [
    "La nappe phreatique remonte donc le cuvelage devient obligatoire"
  ]);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select montrees || '/' || cachees || '/' || affirmations || '/' || liantes"
    + " || '/' || lisibles from public.la_mesure_des_idees();");
  assert.equal(lu.ok, true, lu.motif);
  // Aucune idée partagée, deux cachées, trois affirmations, deux porteuses d'un
  // lien, deux lisibles entièrement.
  assert.equal(lu.sortie.trim(), "0/2/3/2/2");
});

/**
 * **La porte de la console tient sur les quatre lectures.**
 *
 * `security definer` veut dire que la fonction travaille avec les droits de
 * celui qui l'a écrite : sans la porte, n'importe quel compte authentifié
 * lirait les comptes de tous les chantiers. Chaque fonction nouvelle doit donc
 * être nommée ici — une porte posée sur trois des quatre est une porte ouverte.
 */
test("les idées ne se lisent pas sans être administrateur", { skip: sansPostgres }, () => {
  for (const appel of [
    "public.les_idees_du_systeme()",
    "public.la_mesure_des_idees()",
    "public.le_detail_des_liaisons()",
    "public.la_forme_des_affirmations()"
  ]) {
    const refuse = banc.sousLadresse("quelquun@ailleurs.example",
      `select count(*) from ${appel};`);
    assert.equal(refuse.ok, false, `un compte quelconque a lu ${appel}`);
  }
});

/**
 * **Et la coupe du corpus n'est accordée à personne.**
 *
 * Elle est `security definer` et rend toutes les affirmations de tous les
 * chantiers : c'est ce qu'il faut aux quatre lectures, et c'est exactement ce
 * qu'il ne faut à personne d'autre. Elle ne porte pas de porte à elle — elle
 * n'en a pas besoin, puisque rien ne peut l'appeler.
 *
 * PostgreSQL accorde `execute` à tout le monde par défaut : sans le retrait
 * explicite, n'importe quel compte authentifié lirait le contenu de tous les
 * chantiers, sans qu'aucune règle de lecture ne s'y oppose. Une porte fermée
 * par un retrait qu'on oublie d'écrire est une porte grande ouverte.
 */
test("la coupe du corpus n'est accordée à personne", { skip: sansPostgres }, () => {
  const refuse = banc.sousLadresse("quelquun@ailleurs.example",
    "select count(*) from public.la_coupe_du_corpus();");
  assert.equal(refuse.ok, false, "un compte quelconque a lu tout le corpus");

  // Et l'administrateur non plus : il passe par les quatre lectures, qui
  // nomment ce qu'elles rendent.
  const patron = banc.sousLadresse("patron@mdall.example",
    "select count(*) from public.la_coupe_du_corpus();");
  assert.equal(patron.ok, false, "la console lit le corpus en direct");
});

/**
 * **Les sortes de liens que la base produit sont celles que l'écran nomme.**
 *
 * La liste des mots vit dans la base ; l'écran ne connaît que les sortes
 * (`apps/web/js/services/une-idee.js`). Une sorte ajoutée d'un côté et pas de
 * l'autre afficherait une flèche sans verbe, sans que rien ne tombe (règle 4).
 */
test("l'écran sait nommer chaque sorte de lien que la base produit",
  { skip: sansPostgres }, () => {
    const lu = banc.sql(
      "select distinct lien from public.les_mots_de_liaison() order by 1;");
    const duServeur = lu.sortie.split("\n").map((un) => un.trim()).filter(Boolean);

    assert.ok(duServeur.length > 0, "la base ne produit aucune sorte de lien");

    const inconnues = duServeur.filter((une) => !LES_SORTES_DE_LIENS.includes(une));
    assert.deepEqual(inconnues, [],
      `la base produit des liens que l'écran ne sait pas nommer : ${inconnues.join(", ")}`);

    const jamaisProduites = LES_SORTES_DE_LIENS.filter((une) => !duServeur.includes(une));
    assert.deepEqual(jamaisProduites, [],
      `l'écran annonce des liens que rien ne produit : ${jamaisProduites.join(", ")}`);
  });

/* ── Où le découpage casse ────────────────────────────────────────────────── */

/**
 * **Un chiffre qu'on ne sait pas expliquer ne sert à rien.**
 *
 * La console annonçait « 1 % des affirmations énoncent un lien » sans rien
 * pour dire où cela casse : le corpus n'énonce rien, ou le découpage ne sait
 * pas lire ? Les deux mènent à des travaux opposés (règle 12).
 */
test("le détail dit quel mot promet et ne rend rien", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  desAffirmations(MEDIATHEQUE, [
    // Coupée, et entière.
    "Le terrain argileux est confirme donc le plancher beton sera repris",
    // Porte « donc », mais rien de technique à droite — « on le met » n'a
    // aucun mot d'au moins quatre lettres. Elle échoue, et on veut savoir que
    // c'est pour cette raison-là, et non parce que le mot manquait.
    "Le terrain argileux est confirme donc on le met",
    // Ne porte aucun mot de liaison.
    "Menuiseries exterieures"
  ]);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select mot || ':' || contenues || '/' || premieres || '/' || entieres"
    + " || '/' || sans_terme from public.le_detail_des_liaisons()"
    + " where contenues > 0 order by mot;");
  assert.equal(lu.ok, true, lu.motif);

  const lignes = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
  // « donc » est dans deux affirmations, coupe les deux, n'en rend qu'une
  // entière, et la seconde échoue faute de terme à droite.
  assert.deepEqual(lignes, ["donc:2/2/1/1"],
    `le détail ne dit pas où le découpage casse : ${lignes.join(" | ")}`);
});

/**
 * **Un mot de liaison en bout de phrase se compte quand même.**
 *
 * Le texte est encadré d'espaces avant qu'on y cherche les mots : sans cela, un
 * « donc » en fin de phrase n'est trouvé par aucune recherche de « espace donc
 * espace », et le détail dirait que le mot n'est jamais employé. Rien ne serait
 * coupé de toute façon — il n'y a rien à droite — mais le détail existe
 * précisément pour dire où les mots sont, pas seulement où ils marchent.
 */
test("un mot de liaison en bout de phrase se compte", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  desAffirmations(MEDIATHEQUE, ["Le plancher beton sera repris donc"]);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select contenues || '/' || premieres || '/' || entieres"
    + " from public.le_detail_des_liaisons() where mot = 'donc';");
  assert.equal(lu.ok, true, lu.motif);
  // Porté par une affirmation, coupé sur elle, et aucune idée entière : il n'y
  // a rien à droite du mot.
  assert.equal(lu.sortie.trim(), "1/1/0",
    "un mot de liaison en bout de phrase n'est pas compté");
});

/** Un mot qu'aucune affirmation ne porte sort quand même, à zéro. */
test("un mot de liaison jamais rencontré sort à zéro", { skip: sansPostgres }, () => {
  const lu = banc.sousLadresse("patron@mdall.example",
    "select count(*) from public.le_detail_des_liaisons() where contenues = 0;");
  assert.equal(lu.ok, true, lu.motif);
  assert.ok(Number(lu.sortie.trim()) > 0,
    "les mots jamais rencontrés sont absents : on ne saurait pas qu'ils ne servent à rien");
});

/**
 * **Avant d'accuser le découpage, savoir sur quoi il travaille.** Un corpus
 * d'intitulés ne porte aucun lien, et ce n'est pas le découpage qu'il faut
 * corriger.
 */
test("la forme des affirmations dit si ce sont des phrases ou des intitulés",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.project_assertions;");
    desAffirmations(MEDIATHEQUE, [
      "Le terrain argileux est confirme donc le plancher beton sera repris",
      "Menuiseries exterieures",
      "Plancher haut du R+1"
    ]);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select affirmations || '/' || mots_moyens || '/' || au_moins_dix_mots"
      + " || '/' || sans_liaison from public.la_forme_des_affirmations();");
    assert.equal(lu.ok, true, lu.motif);

    // Trois affirmations ; une seule dépasse dix mots ; deux ne portent aucun
    // mot de liaison. La moyenne tombe à cause des deux intitulés.
    const [combien, , dixMots, sansLien] = lu.sortie.trim().split("/");
    assert.equal(combien, "3");
    assert.equal(dixMots, "1", "le compte des phrases longues est faux");
    assert.equal(sansLien, "2", "le compte des affirmations sans liaison est faux");
  });

/** La coupe se lit aussi texte par texte : c'est ainsi qu'un document s'analyse. */
test("les idées se relèvent texte par texte, avec le rang de chacun",
  { skip: sansPostgres }, () => {
    const lu = banc.sql(
      "select rang || ':' || avant || '>' || apres || ':' || lien"
      + " from public.les_idees_des_textes(array["
      + "'Menuiseries exterieures',"
      + "'Le terrain argileux est confirme donc le plancher beton sera repris',"
      + "'La nappe phreatique remonte donc on le met'"
      + "]) order by rang;");

    const lignes = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
    // Le premier texte n'énonce rien, le troisième n'a pas de terme à droite :
    // ni l'un ni l'autre ne sort, et le rang du second le situe quand même.
    assert.deepEqual(lignes, ["2:terrain argileux>plancher beton:cause"],
      `le relevé texte par texte est faux : ${lignes.join(" | ")}`);

    /**
     * **Et une ligne de moins, c'est une ligne de moins.**
     *
     * La première version de cette épreuve ne lisait que la liste. Or une idée
     * incomplète concatène à `NULL` en SQL, donc à une ligne vide — que le
     * nettoyage ci-dessus jetait. Laisser sortir les idées à moitié n'y
     * changeait rien : l'épreuve passait **par accident**.
     */
    const combien = banc.sql(
      "select count(*) from public.les_idees_des_textes(array["
      + "'Menuiseries exterieures',"
      + "'Le terrain argileux est confirme donc le plancher beton sera repris',"
      + "'La nappe phreatique remonte donc on le met'"
      + "]);");
    assert.equal(combien.sortie.trim(), "1",
      "des idées incomplètes sortent du relevé texte par texte");
  });

/**
 * **Le découpage n'est écrit qu'à un seul endroit.**
 *
 * Il l'était deux fois, par copie de sept lignes de CTE. Une seconde copie
 * finit par ne plus dire la même chose, et c'est la seconde qu'on oublie de
 * corriger (règle 4). Les deux lectures doivent donc tomber d'accord.
 */
test("la liste et la mesure comptent la même chose", { skip: sansPostgres }, () => {
  banc.sql("delete from public.project_assertions;");
  for (const projet of [MEDIATHEQUE, GYMNASE]) {
    desAffirmations(projet, [
      "Le terrain argileux est confirme donc le plancher beton sera repris",
      "La nappe phreatique remonte donc le cuvelage renforce devient obligatoire"
    ]);
  }

  const liste = banc.sousLadresse("patron@mdall.example",
    "select count(*) from public.les_idees_du_systeme();");
  const mesure = banc.sousLadresse("patron@mdall.example",
    "select montrees from public.la_mesure_des_idees();");

  assert.equal(liste.ok, true, liste.motif);
  assert.equal(mesure.ok, true, mesure.motif);
  assert.equal(liste.sortie.trim(), mesure.sortie.trim(),
    "la liste et la mesure ne comptent pas la même chose : le découpage a divergé");
});

/* ── La console doit répondre sur un vrai corpus ─────────────────────────── */

/**
 * **Une lecture qui ne revient pas est une lecture qui ment.**
 *
 * La console annonçait « 64 affirmations énoncent un lien » en haut, et
 * « aucun mot de liaison n'apparaît dans le corpus » trois cartes plus bas.
 * La seconde phrase n'était pas un compte : c'était `le_detail_des_liaisons()`
 * qui n'avait pas répondu dans le délai accordé, recopié en liste vide.
 *
 * ## Pourquoi un délai, et pas un chronomètre
 *
 * Un chronomètre dans une épreuve mesure la machine qui la fait tourner, et
 * finit par tomber un jour de forte charge pour rien. Un **délai** pose la
 * question qui se posait vraiment : la base rend-elle cette lecture dans le
 * temps qu'on lui accorde ? C'est PostgreSQL qui tranche, pas l'horloge de
 * l'épreuve.
 *
 * Deux secondes sur quatre mille affirmations, c'est quinze fois ce que la
 * coupe en une passe demande, et moins de la moitié de ce que la coupe
 * affirmation par affirmation demandait. L'écart est tel qu'aucune machine ne
 * le franchit par hasard, dans un sens comme dans l'autre.
 *
 * ## Le corpus est rendu avant de sortir
 *
 * Les autres épreuves comptent les affirmations du banc. Quatre mille lignes
 * laissées derrière soi les feraient toutes tomber, et pour une raison qui
 * n'aurait aucun rapport avec ce qu'elles vérifient.
 */
test("les quatre lectures de la console répondent sur quatre mille affirmations",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);

    // Ce que le banc portait déjà : les autres épreuves ont posé leurs
    // affirmations, et quelques-unes énoncent un lien. On compte donc ce que
    // ce corpus-ci ajoute, pas ce que la table contient.
    const liantesAvant = Number(banc.sousLadresse("patron@mdall.example",
      "select liantes from public.la_mesure_des_idees();").sortie.trim());

    // Un corpus réaliste : une affirmation sur cent énonce un lien, les autres
    // sont des intitulés. C'est la forme du vrai corpus, et c'est elle qui rend
    // la lecture coûteuse — cinquante-sept mots cherchés dans quatre mille
    // textes qui, pour la plupart, n'en portent aucun.
    banc.sql(`insert into public.project_assertions (project_id, statement)
      select '${MEDIATHEQUE}',
        case when g % 100 = 0
          then 'le terrain argileux donc le plancher beton reprend la charge'
          else 'menuiseries exterieures du niveau ' || g
               || ' plancher haut du R plus un lot gros oeuvre' end
      from generate_series(1, 4000) g;`);

    try {
      for (const lecture of [
        "le_detail_des_liaisons()",
        "la_mesure_des_idees()",
        "les_idees_du_systeme()",
        "la_forme_des_affirmations()"
      ]) {
        // **`set`, et non `set local`.** Hors transaction, `set local` ne vaut
        // que pour la transaction implicite de l'instruction où il est posé :
        // il s'annonce, il ne s'applique pas, et le délai ne s'imposait à rien.
        // La garde était écrite et ne gardait rien — c'est la batterie qui l'a
        // montré, pas la relecture (règle 12).
        const lu = banc.sousLadresse("patron@mdall.example",
          `set statement_timeout = '2s';\n`
          + `select count(*) from public.${lecture};`);

        assert.equal(lu.ok, true,
          `${lecture} n'a pas répondu dans le délai accordé : ${lu.motif}`);
      }

      // **Et elle répond juste.** Une lecture rapide qui compterait faux serait
      // pire que lente. Quarante des quatre mille énoncent un lien (une sur
      // cent), et pas une de plus : les trois mille neuf cent soixante autres
      // sont des intitulés.
      const liantes = Number(banc.sousLadresse("patron@mdall.example",
        "select liantes from public.la_mesure_des_idees();").sortie.trim());
      assert.equal(liantes - liantesAvant, 40,
        "les affirmations que ce corpus ajoute et qui portent un lien");
    } finally {
      banc.sql(`delete from public.project_assertions
                 where statement like 'menuiseries exterieures du niveau %'
                    or statement = 'le terrain argileux donc le plancher beton reprend la charge';`);
    }
  });

/* ── Ce que la coupe commune décide, et qu'on ne voyait pas ──────────────── */

/**
 * **Le plus long mot l'emporte, à égalité de place.**
 *
 * « permet » et « permet de » commencent au même endroit de la phrase. Si le
 * court gagne, le lien change de sorte — une permission au lieu d'un but — et
 * le terme de droite commence un mot plus tôt. Rien ne tombe : on lit une idée
 * juste de forme et fausse de sens.
 */
test("à égalité de place, le mot le plus long décide", { skip: sansPostgres }, () => {
  const lu = banc.sql(
    "select mot from public.les_idees_des_textes(array["
    + "'le garde corps permet de proteger la circulation'"
    + "]);");

  assert.equal(lu.sortie.trim(), "permet de",
    "le mot court l'emporte sur celui qui le contient");
});

/**
 * **« nappe entraîne nappe » est vrai, et c'est ce qui le rend inutile.**
 *
 * Une tautologie passe toutes les vérifications de forme : deux termes, un
 * lien, une citation. Elle entrerait en mémoire comme les autres, et n'y
 * apprendrait rien à personne.
 */
test("une tautologie ne sort pas du relevé d'un document", { skip: sansPostgres }, () => {
  const lu = banc.sql(
    "select count(*) from public.les_idees_des_textes(array["
    + "'la nappe phreatique donc la nappe phreatique'"
    + "]);");

  assert.equal(lu.sortie.trim(), "0", "une tautologie est relevée comme une idée");
});

/* ── Le corpus en clair, et la porte qui le tient ────────────────────────── */

/**
 * **C'est la porte la plus ouverte du produit, et elle doit être la mieux
 * gardée.**
 *
 * `le_corpus_en_clair()` rend le **texte** des affirmations — du contenu de
 * chantier. C'est nécessaire : on ne peut pas améliorer le découpage sans voir
 * ce qu'il n'a pas su lire, et ce qu'il n'a pas su lire est précisément ce qui
 * ne sort jamais. Mais un compte ordinaire qui l'atteindrait lirait tous les
 * chantiers d'un coup.
 *
 * L'écran y ajoute un interrupteur qui se referme au bout de dix secondes.
 * Cet interrupteur empêche un clic distrait ; il n'est pas une porte. Celle-ci
 * l'est, et c'est elle qu'on éprouve.
 */
test("le corpus en clair ne se lit pas sans être administrateur",
  { skip: sansPostgres }, () => {
    const refuse = banc.sousLadresse("quelquun@ailleurs.example",
      "select public.le_corpus_en_clair();");
    assert.equal(refuse.ok, false, "un compte quelconque a lu le corpus en clair");
    assert.match(refuse.motif, /réservé à la console/);

    const sansJeton = banc.sousLadresse("", "select public.le_corpus_en_clair();");
    assert.equal(sansJeton.ok, false, "le corpus en clair se lit sans session");
  });

/**
 * **Un document, et non un ensemble de lignes — et c'est PostgreSQL qui le dit.**
 *
 * Le premier fichier emporté portait mille affirmations sur neuf mille quatre
 * cent quatre-vingt-huit. Mille n'est pas un nombre de hasard : c'est
 * `db-max-rows`, le plafond que PostgREST applique à toute réponse en lignes.
 * Il s'applique **après** la fonction, sur le transport, et la fonction ne le
 * voit pas — sa propre limite de vingt mille n'y changeait rien.
 *
 * On ne vérifie donc pas un nombre de lignes rendues ici : le banc parle à
 * PostgreSQL en direct, où le plafond n'existe pas, et le défaut ne s'y verrait
 * jamais. Ce qui se vérifie, c'est **la forme du retour** : une valeur unique.
 * Une ligne ne se fait pas tronquer à mille lignes.
 *
 * Le jour où quelqu'un remettra `returns table` pour la commodité d'un `where`,
 * ce test tombera — et c'est tout ce qu'on lui demande.
 */
test("le corpus en clair rend un document, pas un ensemble de lignes",
  { skip: sansPostgres }, () => {
    const dit = banc.sql(
      "select pg_catalog.pg_get_function_result("
      + "'public.le_corpus_en_clair(integer)'::regprocedure);");

    assert.equal(dit.sortie.trim(), "jsonb",
      "le corpus revient en lignes : PostgREST en coupera mille, sans le dire");
  });

/**
 * **Et il dit ce qu'il ne porte pas.**
 *
 * Le défaut n'était pas la troncature, c'était son silence : le fichier
 * annonçait « 1 000 affirmations, dont 998 dont le découpage ne tire rien ».
 * Une phrase juste sur un corpus faux, et de quoi conclure qu'un seul chantier
 * écrit (règle 12).
 *
 * `affirmations` compte le corpus entier, `rendues` ce que le document porte.
 * On demande ici une seule affirmation sur deux chantiers qui en portent
 * plusieurs : l'écart doit se lire.
 */
test("le corpus en clair dit combien il n'a pas rendu", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;`);
  banc.sql(`insert into public.project_assertions (project_id, statement) values
    ('${MEDIATHEQUE}', 'la trappe donne sur la centrale'),
    ('${MEDIATHEQUE}', 'le garde corps borde la circulation'),
    ('${GYMNASE}', 'la toiture couvre les gradins');`);

  try {
    const dit = banc.sousLadresse("patron@mdall.example",
      "select (public.le_corpus_en_clair(1))->>'rendues',"
      + " (public.le_corpus_en_clair(1))->>'affirmations',"
      + " jsonb_array_length((public.le_corpus_en_clair(1))->'corpus');");

    const [rendues, affirmations, dedans] = dit.sortie.trim().split("|");
    assert.equal(rendues, "1", "la limite demandée n'est pas tenue");
    assert.equal(dedans, "1", "le document ne porte pas ce qu'il annonce rendre");
    assert.ok(Number(affirmations) >= 3,
      `le corpus entier n'est pas compté : ${affirmations}`);
    assert.notEqual(rendues, affirmations,
      "l'écart ne se lit pas : un fichier tronqué repasserait en silence");
  } finally {
    banc.sql(`delete from public.project_assertions
               where statement in ('la trappe donne sur la centrale',
                                   'le garde corps borde la circulation',
                                   'la toiture couvre les gradins');`);
  }
});

/**
 * **Un numéro d'ordre, jamais l'identifiant du chantier.**
 *
 * Savoir que deux affirmations viennent du même chantier sert : on voit si l'un
 * d'eux écrit autrement. Savoir **lequel** ne sert à rien pour corriger un
 * découpage, et c'est la différence entre un corpus de mise au point et un
 * export de base.
 */
test("le corpus en clair ne nomme aucun chantier", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;`);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select une->>'chantier' || '|' || coalesce(une->>'dit', '')"
    + " from jsonb_array_elements((public.le_corpus_en_clair(50))->'corpus') as une;");
  assert.equal(lu.ok, true, lu.motif);

  // Ni l'identifiant du chantier, ni celui de l'affirmation : la signature ne
  // les porte pas, et c'est ce qui le garantit.
  assert.doesNotMatch(lu.sortie, new RegExp(MEDIATHEQUE));
  assert.doesNotMatch(lu.sortie, new RegExp(GYMNASE));
  // Et le rang est un entier, pas un identifiant déguisé.
  for (const ligne of lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean)) {
    assert.match(ligne, /^\d+\|/, `« ${ligne} » ne commence pas par un rang`);
  }
});

/**
 * **Et il rend bien ce qu'on vient y chercher** : le texte, et ce que la coupe
 * en a tiré — ou rien, quand elle n'a rien tiré. C'est cette colonne vide qui
 * est la matière du travail : ce sont les affirmations que le découpage n'a
 * pas su lire.
 */
test("le corpus en clair rend le texte, coupé ou non", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;`);
  banc.sql(`insert into public.project_assertions (project_id, statement) values
    ('${MEDIATHEQUE}', 'le garde corps permet de proteger la circulation'),
    ('${MEDIATHEQUE}', 'Menuiseries exterieures du hall');`);

  try {
    const coupee = banc.sousLadresse("patron@mdall.example",
      "select (une->>'avant') || '|' || (une->>'lien') || '|' || (une->>'apres')"
      + " || '|' || (une->>'mot')"
      + " from jsonb_array_elements((public.le_corpus_en_clair())->'corpus') as une"
      + " where une->>'dit' = 'le garde corps permet de proteger la circulation';");
    assert.equal(coupee.sortie.trim(), "garde corps|permet|proteger|permet de");

    // Et celle que la coupe n'a pas su lire sort quand même, sans idée. `null`
    // et non la chaîne vide : relu dans un tableur, le second se compterait.
    const nue = banc.sousLadresse("patron@mdall.example",
      "select coalesce(une->>'avant', '—')"
      + " from jsonb_array_elements((public.le_corpus_en_clair())->'corpus') as une"
      + " where une->>'dit' = 'Menuiseries exterieures du hall';");
    assert.equal(nue.sortie.trim(), "—",
      "une affirmation sans idée ne sort pas du corpus : c'est pourtant elle qu'on vient lire");
  } finally {
    banc.sql(`delete from public.project_assertions
               where statement in ('le garde corps permet de proteger la circulation',
                                   'Menuiseries exterieures du hall');`);
  }
});

/* ── Les lectures lisent ce que l'écran lit ──────────────────────────────── */

/**
 * **Un tiers de la mémoire était muet pour la console.**
 *
 * Trois mille quatre cent vingt-huit affirmations sur 9 488 portent un
 * `statement` de repli : « Document au corpus : <clé mdall> ». L'écran ne le lit
 * plus depuis longtemps — il lit le `payload`, qui porte le sujet et la valeur.
 * Les lectures de la console, elles, lisaient toujours la phrase : elles
 * mesuraient un corpus que personne ne voit (règle 4).
 */
test("ce que dit une affirmation se lit dans le payload", { skip: sansPostgres }, () => {
  // **Les cas viennent du fichier que l'épreuve JavaScript lit aussi.** Faute de
  // pouvoir n'avoir qu'une définition, on n'a au moins qu'un jeu de cas : un cas
  // ajouté éprouve les deux à la fois. Deux listes recopiées auraient divergé à
  // la première retouche (règle 4).
  assert.ok(LES_CAS.cas.length >= 18,
    `le fichier des cas en porte ${LES_CAS.cas.length} : la liste a été raccourcie`);

  const enSql = (valeur) => (valeur === null || valeur === undefined
    ? "null"
    : `'${String(valeur).replaceAll("'", "''")}'`);

  for (const un of LES_CAS.cas) {
    const charge = un.payload === null
      ? "null"
      : `'${JSON.stringify(un.payload).replaceAll("'", "''")}'`;
    const lu = banc.sql(
      "select public.le_dit_dune_affirmation("
      + `${enSql(un.kind)}, ${enSql(un.cle)}, ${enSql(un.statement)}, ${charge}::jsonb);`);
    assert.equal(lu.sortie.trim(), un.dit, `${un.quoi} — rendu « ${lu.sortie.trim()} »`);
  }
});

/**
 * **Et les lectures la lisent pour de bon.**
 *
 * Vérifier la fonction seule ne suffit pas : c'est d'avoir branché les huit
 * lectures dessus qui compte, et une lecture qu'on oublie de brancher laisse le
 * banc vert. On pose donc une affirmation dont la phrase versée ne porte **aucun
 * mot de liaison** et dont le payload en porte un : l'idée ne peut venir que du
 * payload.
 */
test("la coupe et le corpus en clair lisent le payload", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;`);
  banc.sql(`insert into public.project_assertions (project_id, statement, payload) values
    ('${MEDIATHEQUE}', 'Document au corpus : le-garde-corps@batiment-a',
     '{"subject":"le garde corps","value":"permet de proteger la circulation"}'::jsonb);`);

  try {
    // **La coupe : l'idée vient du payload, et de nulle part ailleurs.**
    // `la_coupe_du_corpus` n'est accordée à personne — c'est voulu, elle lit tous
    // les chantiers —, donc on la lit en direct et non sous une adresse.
    const coupe = banc.sql(
      "select avant || '|' || lien || '|' || apres from public.la_coupe_du_corpus()"
      + " where avant = 'garde corps';");
    assert.equal(coupe.sortie.trim(), "garde corps|permet|proteger",
      "la coupe lit encore la phrase de repli : il n'y a rien à couper dedans");

    // Le corpus en clair : il montre ce que l'écran montre.
    const clair = banc.sousLadresse("patron@mdall.example",
      "select count(*) from jsonb_array_elements("
      + "(public.le_corpus_en_clair())->'corpus') as une"
      + " where une->>'dit' like 'Document au corpus : le-garde-corps%';");
    assert.equal(clair.sortie.trim(), "0",
      "le corpus emporté montre encore la clé mdall, et non la phrase");

    // Et les sujets : « garde corps » est un terme, « batiment a » n'en est pas un.
    const sujets = banc.sql(
      "select count(*) from public.les_sujets_dun_texte("
      + "public.le_dit_dune_affirmation('base-datum', 'le-garde-corps@batiment-a',"
      + " 'Document au corpus : le-garde-corps@batiment-a',"
      + `'{"subject":"le garde corps","value":"permet de proteger la circulation"}'::jsonb))`
      + " where sujet = 'garde corps';");
    assert.equal(sujets.sortie.trim(), "1", "les sujets ne lisent pas le payload");
  } finally {
    banc.sql(`delete from public.project_assertions
               where statement = 'Document au corpus : le-garde-corps@batiment-a';`);
  }
});

/**
 * **Et les lectures du lexique aussi, pas seulement l'extraction.**
 *
 * La batterie l'a montré : vérifier `les_sujets_dun_texte(le_dit_dune_affirmation(…))`
 * n'éprouve que la composition des deux fonctions. Remettre `a.statement` dans
 * `les_sujets_du_systeme` ne cassait rien — la lecture pouvait redevenir aveugle
 * sans qu'aucun test ne tombe.
 *
 * On pose donc le même terme, caché dans le `payload`, sur **deux** chantiers :
 * il doit franchir le seuil et apparaître dans le lexique. La phrase versée, elle,
 * ne porte que des mots-outils et une clé à tirets.
 */
test("le lexique du système lit le payload", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;`);
  // Un terme qu'aucun jeu d'essai du banc ne porte, et introuvable dans la phrase.
  banc.sql(`insert into public.project_assertions (project_id, statement, payload) values
    ('${MEDIATHEQUE}', 'Document au corpus : cle-a-tirets-sans-mot',
     '{"subject":"palplanche jointive","value":"profondeur 6 m"}'::jsonb),
    ('${GYMNASE}', 'Document au corpus : cle-a-tirets-sans-mot',
     '{"subject":"palplanche jointive","value":"profondeur 4 m"}'::jsonb);`);

  try {
    const lexique = banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.les_sujets_du_systeme()"
      + " where sujet = 'palplanche jointive';");
    assert.equal(lexique.sortie.trim(), "1",
      "« palplanche jointive » n'entre pas au lexique : la lecture relit la phrase versée");

    // **Et la mesure compte la même chose.** Deux lectures qui ne lisent pas le
    // même texte donneraient deux dénominateurs pour un seul corpus.
    const mesure = banc.sousLadresse("patron@mdall.example",
      "select montres > 0 from public.la_mesure_des_sujets();");
    assert.equal(mesure.sortie.trim(), "t", mesure.motif);

    // **Et le prédicteur d'un chantier**, qui est la troisième lecture branchée.
    // Le seuil y est interne : il faut le terme deux fois dans le même chantier.
    banc.sql(`insert into public.project_assertions (project_id, statement, payload) values
      ('${MEDIATHEQUE}', 'Document au corpus : cle-a-tirets-sans-mot-bis',
       '{"subject":"palplanche jointive","value":"profondeur 8 m"}'::jsonb);`);
    const sien = banc.sql(
      `select count(*) from public.les_sujets_de_ce_chantier('${MEDIATHEQUE}')`
      + " where sujet = 'palplanche jointive';");
    assert.ok(Number(sien.sortie.trim()) >= 2,
      `le prédicteur du chantier ne lit pas le payload : ${sien.sortie.trim()}`);
  } finally {
    banc.sql(`delete from public.project_assertions
               where statement like 'Document au corpus : cle-a-tirets-sans-mot%';`);
  }
});

/**
 * **Les quatre lectures qui restaient aveugles sans que rien ne tombe.**
 *
 * La batterie l'a montré quatre fois de suite : brancher une lecture sur
 * `le_dit_dune_affirmation` et ne pas l'éprouver revient à ne rien brancher — on
 * remettait `a.statement` et le banc restait vert. Chacune se mesure donc par son
 * écart : on lit, on pose, on relit.
 *
 * Le jeu d'essai est fait pour cela : la phrase versée ne porte **aucun** mot
 * technique et **aucun** mot de liaison, et le `payload` porte les deux. Une
 * lecture qui lit la phrase ne voit rien bouger.
 */
test("les six lectures du corpus lisent toutes le payload", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;`);

  const lire = (sql) => banc.sousLadresse("patron@mdall.example", sql).sortie.trim().split("|");

  const [montresAvant] = lire("select montres from public.la_mesure_des_sujets();");
  const [porteesAvant] = lire(
    "select contenues from public.le_detail_des_liaisons() where mot = 'sous reserve de';");
  const [dixAvant, formeAvant] = lire(
    "select au_moins_dix_mots, affirmations from public.la_forme_des_affirmations();");
  const [distinctesAvant] = lire("select distinctes from public.la_repetition_du_corpus();");

  // **Deux affirmations à la phrase identique et au payload différent.** La même
  // clé de repli, deux sujets distincts : c'est ce qui sépare une lecture qui lit
  // la phrase d'une lecture qui lit le payload.
  banc.sql(`insert into public.project_assertions (project_id, statement, payload) values
    ('${MEDIATHEQUE}', 'Document au corpus : meme-cle-de-repli',
     '{"subject":"blindage berlinoise",
       "value":"la pose du blindage est tenue sous reserve de la note de calcul du bureau"}'::jsonb),
    ('${GYMNASE}', 'Document au corpus : meme-cle-de-repli',
     '{"subject":"blindage berlinoise",
       "value":"le blindage de la berlinoise descend a six metres sous le niveau du radier"}'::jsonb);`);

  try {
    // **Le lexique, et sa mesure.** Un écart ne suffit pas : la phrase de repli
    // porte elle aussi des mots (« corpus », « repli »), donc `montres` monte
    // dans les deux cas — la batterie l'a montré. Ce qui tient, c'est l'égalité :
    // `montres` compte exactement ce que `les_sujets_du_systeme` rend, et les
    // deux lectures doivent lire le même texte ou elles se contredisent (règle 4).
    const [montres] = lire("select montres from public.la_mesure_des_sujets();");
    const [rendus] = lire("select count(*) from public.les_sujets_du_systeme();");
    assert.ok(Number(montres) > Number(montresAvant),
      `la mesure des sujets ne voit rien de neuf (${montresAvant} → ${montres})`);
    assert.equal(Number(montres), Number(rendus),
      `la mesure annonce ${montres} sujets montrés et le lexique en rend ${rendus} :`
      + " les deux ne lisent pas le même texte");

    // **Et le compte des formes, qui dépend du texte lu et non du nombre de clés.**
    // L'égalité des comptes seule ne suffisait pas : deux jeux de clés différents
    // peuvent en avoir autant, et la batterie l'a montré deux fois. La somme des
    // formes, elle, change dès que le texte change.
    const [formes] = lire("select formes from public.la_mesure_des_sujets();");
    const [formesRendues] = lire(
      "select coalesce(sum(formes), 0) from public.les_sujets_du_systeme();");
    assert.equal(Number(formes), Number(formesRendues),
      `la mesure annonce ${formes} formes et le lexique en rend ${formesRendues} :`
      + " les deux ne lisent pas le même texte");

    // **Le détail mot à mot.** « sous réserve de » n'est que dans le payload.
    const [portees] = lire(
      "select contenues from public.le_detail_des_liaisons() where mot = 'sous reserve de';");
    assert.equal(Number(portees), Number(porteesAvant) + 1,
      `le détail des liaisons ne compte pas la liaison du payload (${porteesAvant} → ${portees})`);

    // **La forme.** La phrase versée fait cinq mots, le dit en fait plus de dix.
    const [dix, forme] = lire(
      "select au_moins_dix_mots, affirmations from public.la_forme_des_affirmations();");
    assert.equal(Number(forme), Number(formeAvant) + 2, "les deux lignes ne sont pas comptées");
    assert.equal(Number(dix), Number(dixAvant) + 2,
      `la forme mesure la phrase de repli, pas le dit (${dixAvant} → ${dix})`);

    // **La répétition.** Même phrase versée, deux dits différents : deux textes
    // distincts de plus. Une lecture qui lit la phrase n'en verrait qu'un.
    const [distinctes] = lire("select distinctes from public.la_repetition_du_corpus();");
    assert.equal(Number(distinctes), Number(distinctesAvant) + 2,
      `la répétition compte la phrase de repli, pas le dit (${distinctesAvant} → ${distinctes})`);
  } finally {
    banc.sql(`delete from public.project_assertions
               where statement = 'Document au corpus : meme-cle-de-repli';`);
  }
});

/**
 * **Un avis, un rattachement, un point de chantier se relisent aussi.**
 *
 * La lecture ne connaissait qu'une branche sur cinq : celle de l'affirmation
 * (`payload->>'subject'`). D'où 2 274 lignes — 24 % de la mémoire — qui se
 * relisaient « Document au corpus : 02b81e88-8a77-… ».
 *
 * Les cas du fichier partagé couvrent les cinq natures ; ici on vérifie que les
 * **lectures** en profitent, et non la seule fonction.
 */
test("les lectures relisent toutes les natures", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;`);

  // Un avis dont la phrase versée n'est qu'un identifiant, et dont la charge
  // porte le numéro et la rubrique. Un mot de liaison dans la rubrique : l'idée
  // ne peut venir que de là.
  banc.sql(`insert into public.project_assertions
              (project_id, kind, subject_key, statement, payload) values
    ('${MEDIATHEQUE}', 'avis', 'A12',
     'Document au corpus : 02b81e88-8a77-4dd0-96a2-d25a78127665',
     '{"reference":"A12","title":"le garde corps permet de proteger la circulation"}'::jsonb),
    ('${GYMNASE}', 'sujet', '12.02.1',
     'Document au corpus : 7f3c9a10-0000-4000-8000-000000000001',
     '{"lot":"09 CLOISONS","titre":"palplanche jointive au R+2"}'::jsonb);`);

  try {
    const avis = banc.sousLadresse("patron@mdall.example",
      "select une->>'dit'"
      + " from jsonb_array_elements((public.le_corpus_en_clair())->'corpus') as une"
      + " where une->>'dit' like 'Avis A12%';");
    assert.match(avis.sortie, /Avis A12 — le garde corps permet/,
      "un avis se relit encore par son identifiant");

    // **Le point de chantier aussi**, et son lot se lit devant son titre.
    const point = banc.sousLadresse("patron@mdall.example",
      "select une->>'dit'"
      + " from jsonb_array_elements((public.le_corpus_en_clair())->'corpus') as une"
      + " where une->>'dit' like '09 CLOISONS%';");
    assert.match(point.sortie, /09 CLOISONS — palplanche jointive au R\+2/,
      "un point de chantier se relit encore par son identifiant");

    // Et la coupe tire bien l'idée du titre de l'avis.
    const coupe = banc.sql(
      "select avant || '|' || lien || '|' || apres from public.la_coupe_du_corpus()"
      + " where avant = 'garde corps';");
    assert.equal(coupe.sortie.trim(), "garde corps|permet|proteger",
      "la coupe ne lit pas le titre de l'avis");
  } finally {
    banc.sql(`delete from public.project_assertions
               where statement like 'Document au corpus : 02b81e88%'
                  or statement like 'Document au corpus : 7f3c9a10%';`);
  }
});

/**
 * **Et une reconstruction qui ne porte rien ne remplace pas ce qui est écrit.**
 *
 * Un avis sans numéro ni rubrique rendrait « Avis relevé sur une fiche ». Mille
 * cent quatre-vingt-cinq lignes du corpus sont dans ce cas : elles se liraient
 * toutes **identiquement**, et l'on croirait à une seule. Un identifiant
 * illisible reste au moins distinct, et leur nombre est la mesure honnête de ce
 * que la mémoire ne sait pas dire (règle 5).
 */
test("une reconstruction vide n'écrase pas la phrase versée", { skip: sansPostgres }, () => {
  const garde = banc.sql(
    "select public.le_dit_dune_affirmation('avis', 'fiche:ab12',"
    + " 'Document au corpus : 02b81e88-8a77-4dd0-96a2-d25a78127665', '{}'::jsonb);");
  assert.match(garde.sortie, /02b81e88/,
    "mille lignes distinctes se liraient « Avis relevé sur une fiche »");

  // **Mais à l'écriture, il n'y a rien à garder** : c'est là que la phrase vaut.
  const neuve = banc.sql(
    "select public.le_dit_dune_affirmation('avis', 'fiche:ab12', '', '{}'::jsonb);");
  assert.equal(neuve.sortie.trim(), "Avis relevé sur une fiche",
    "une ligne neuve n'a plus de phrase du tout");
});

/* ── Le lot est un intitulé, pas le sujet de l'idée ──────────────────────── */

/**
 * **La coupe lit la phrase, le lexique lit tout.**
 *
 * Retirer l'intitulé partout faisait tomber les termes partagés de 627 à 597 :
 * les noms de lots sont du vocabulaire de métier partagé entre chantiers. Les
 * garder dans la coupe donnait « démolition gros —vise→ … », le lot pour sujet.
 *
 * Les deux lectures sont donc séparées, et c'est cette séparation qu'on éprouve :
 * le même terme doit être **absent** de l'idée et **présent** au lexique.
 */
test("l'intitulé de lot sort de la coupe et reste au lexique",
  { skip: sansPostgres }, () => {
    for (const [dit, attendue] of [
      ["01 Terrassements-VRD — le radier permet de drainer la nappe",
       "le radier permet de drainer la nappe"],
      ["Lot n° 1 : Démolition / Gros Œuvre — le radier permet de drainer la nappe",
       "le radier permet de drainer la nappe"],
      ["Lot 13 — le radier permet de drainer la nappe",
       "le radier permet de drainer la nappe"],
      // **« Avis » est l'autre marqueur**, et pour la même raison : c'est une
      // étiquette que le versement a écrite. Sans cela, « avis » devenait un
      // terme d'idée sur des milliers de lignes.
      ["Avis 146 — Hauteur des marches de 16 cm", "Hauteur des marches de 16 cm"],
      ["Avis — le radier permet de drainer la nappe", "le radier permet de drainer la nappe"],
      ["Revêtements de la cage d'escalier : M2 — avis favorable",
       "Revêtements de la cage d'escalier : M2 — avis favorable"],
      // Un numéro sans tiret : il n'y a pas d'intitulé à détacher.
      ["01 le radier permet de drainer la nappe",
       "01 le radier permet de drainer la nappe"]
    ]) {
      const lu = banc.sql(
        `select public.la_phrase_dune_affirmation('${dit.replaceAll("'", "''")}');`);
      assert.equal(lu.sortie.trim(), attendue, `« ${dit} » se coupe mal`);
    }

    // **Et l'intitulé est rendu, pas jeté** : c'est la dimension qu'on dégage.
    const tete = banc.sql(
      "select coalesce(public.lintitule_dune_affirmation("
      + "'01 Terrassements-VRD — le radier permet de drainer la nappe'), '—');");
    assert.equal(tete.sortie.trim(), "01 Terrassements-VRD");
    const sans = banc.sql(
      "select coalesce(public.lintitule_dune_affirmation("
      + "'Revetements de la cage d escalier : M2 — avis favorable'), '—');");
    assert.equal(sans.sortie.trim(), "—",
      "le sujet d'une affirmation passe pour un intitulé : on jetterait ce dont elle parle");
  });

/**
 * **Et la séparation se voit sur les deux lectures, pas seulement sur la
 * fonction.**
 *
 * Une affirmation dont l'intitulé porte un terme qu'aucune autre ne porte : il
 * doit être au lexique et absent de l'idée.
 */
test("le lot n'est pas le sujet de l'idée, et reste du vocabulaire",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);
    banc.sql(`insert into public.project_assertions (project_id, statement) values
      ('${MEDIATHEQUE}', '07 Palplanche Berlinoise — le radier permet de drainer la nappe'),
      ('${GYMNASE}', '07 Palplanche Berlinoise — la nappe remonte au printemps');`);

    try {
      // **L'idée ne nomme pas le lot.**
      const idee = banc.sql(
        "select coalesce(string_agg(avant, '|'), '—') from public.la_coupe_du_corpus()"
        + " where avant like '%palplanche%';");
      assert.equal(idee.sortie.trim(), "—",
        `le lot est encore le sujet de l'idée : ${idee.sortie.trim()}`);
      const vraie = banc.sql(
        "select avant || '|' || apres from public.la_coupe_du_corpus()"
        + " where avant = 'radier';");
      assert.equal(vraie.sortie.trim(), "radier|drainer",
        "la phrase n'est plus lue du tout");

      // **Le lexique, lui, le porte** : vu sur deux chantiers, il franchit le seuil.
      const lexique = banc.sousLadresse("patron@mdall.example",
        "select count(*) from public.les_sujets_du_systeme()"
        + " where sujet = 'palplanche berlinoise';");
      assert.equal(lexique.sortie.trim(), "1",
        "le nom du lot a été jeté : le lexique s'appauvrit");
    } finally {
      banc.sql(`delete from public.project_assertions
                 where statement like '07 Palplanche Berlinoise%';`);
    }
  });

/* ── Une liaison niée n'est pas une liaison ──────────────────────────────── */

/**
 * **« aucun degré exigé » n'est pas une obligation.**
 *
 * Dès que les avis ont retrouvé leur phrase, celle-ci est sortie : « Parois
 * séparant les ensembles de celliers ou caves : aucun degré exigé par cet
 * alinéa » rendait `parois séparant —impose→ alinéa`. La règle du round
 * précédent ne pouvait pas l'attraper : « aucun » ne précède aucun des deux
 * termes — il précède **le mot de liaison**.
 */
test("une liaison niée ne rend rien", { skip: sansPostgres }, () => {
  for (const texte of [
    "Parois separant les ensembles de celliers : aucun degre exige par cet alinea",
    "le radier ne permet pas de drainer la nappe",
    "la dalle n est plus exigee par le reglement"
  ]) {
    const lu = banc.sql(
      `select count(*) from public.les_idees_des_textes(array['${texte}']);`);
    assert.equal(lu.sortie.trim(), "0", `« ${texte} » rend encore une idée`);
  }

  // **La fenêtre est de deux mots, et pas plus.** Une négation plus loin que cela
  // porte sur autre chose, et refuser serait perdre une idée vraie.
  const loin = banc.sql(
    "select avant || '|' || apres from public.les_idees_des_textes(array["
    + "'le radier n est pas fissure et le drainage permet de secher la nappe'"
    + "]);");
  // Le terme de gauche est « radier », le premier mot technique du membre : la
  // négation n'y change rien, et c'est ce qu'on vérifie — l'idée est rendue.
  assert.equal(loin.sortie.trim(), "radier|secher",
    "une négation éloignée refuse une idée vraie");

  // Et l'idée de référence de la doctrine tient toujours.
  const refer = banc.sql(
    "select avant || '|' || lien || '|' || apres from public.les_idees_des_textes(array["
    + "'le garde corps permet de proteger la circulation'"
    + "]);");
  assert.equal(refer.sortie.trim(), "garde corps|permet|proteger");
});

/* ── La ligature ne coupe plus les mots ──────────────────────────────────── */

/**
 * **« manœuvre » devenait « uvre ».**
 *
 * `le_texte_normalise` remplaçait par une espace tout ce qui n'est pas a-z, et
 * la ligature « œ » n'était dans aucune des deux listes. Mesuré sur le corpus :
 * quarante et un termes distincts abîmés, deux cent deux occurrences, dont
 * « manœuvre » quatre-vingt-trois fois et « gros œuvre » soixante-cinq.
 *
 * « Gros œuvre » est le lot le plus courant d'un chantier français. Le lexique
 * de la console ne le portait pas.
 */
test("la ligature œ ne coupe plus les mots", { skip: sansPostgres }, () => {
  const lu = banc.sql(
    "select public.le_texte_normalise('Manœuvre de grue — Gros Œuvre');");
  assert.equal(lu.sortie.trim(), "manoeuvre de grue gros oeuvre",
    "la ligature coupe encore le mot en deux");

  // **« æ » aussi**, et le corpus n'en porte aucun aujourd'hui : on l'éprouve
  // directement, parce que `translate` ne saura jamais le faire.
  const ae = banc.sql("select public.le_texte_normalise('ex æquo');");
  assert.equal(ae.sortie.trim(), "ex aequo", "« æ » coupe encore le mot");

  // Et l'extraction des sujets en profite, parce qu'elle passe par là.
  const sujets = banc.sql(
    "select string_agg(sujet, '|' order by sujet)"
    + " from public.les_sujets_dun_texte('Gros Œuvre : coulage du radier')"
    + " where sujet like '%oeuvre%';");
  assert.match(sujets.sortie.trim(), /gros oeuvre/,
    "« gros œuvre » n'est toujours pas un sujet");

  // **Et le terme de tête aussi** : c'est la seconde copie de la normalisation
  // qu'on a ramenée sur la première.
  const terme = banc.sql("select public.le_terme_de_tete('Manœuvre de grue');");
  assert.equal(terme.sortie.trim(), "manoeuvre",
    "le terme de tête garde sa propre normalisation, abîmée");
});

/* ── Une négation ne devient pas son contraire ───────────────────────────── */

/**
 * **L'idée qui affirmait l'inverse du texte.**
 *
 * « Escalier prévu et escalier exigé : non conforme » rendait
 * `escalier prévu —obligation→ conforme`. Le « non » fait trois lettres : il
 * tombait sous le seuil, et le sens de la phrase avec lui.
 *
 * C'est pire qu'une idée manquante : celle-ci, on la cherche ; celle-là, on la
 * croit — et rien à l'écran ne la distingue d'une vraie.
 */
test("un terme nié ne se rend pas", { skip: sansPostgres }, () => {
  for (const [bout, attendu] of [
    ["non conforme", "—"],
    ["ne plus perdre de temps", "—"],
    ["ne pas fragiliser les pierres", "—"],
    ["aucune reservation ne sera faite", "—"],
    ["sans reprise du mortier", "—"]
  ]) {
    const lu = banc.sql(
      `select coalesce(public.le_terme_de_tete('${bout}'), '—');`);
    assert.equal(lu.sortie.trim(), attendu,
      `« ${bout} » rend encore un terme : l'idée dira le contraire du texte`);
  }

  // **Et la phrase entière ne rend plus l'idée fausse.**
  const idee = banc.sql(
    "select count(*) from public.les_idees_des_textes(array["
    + "'Escalier prevu et escalier exige : non conforme'"
    + "]);");
  assert.equal(idee.sortie.trim(), "0",
    "« escalier prévu —obligation→ conforme » sort encore");
});

/**
 * **Et un refus de trop est une idée vraie qu'on ne verra jamais.**
 *
 * C'est la moitié qui compte : la règle ne regarde que le mot immédiatement
 * précédent, et c'est mesuré. Une fenêtre de trois mots refusait « afin de
 * libérer » et « afin de drainer » parce que « Lot n°1 » laisse un « n »
 * derrière lui.
 */
test("une négation éloignée ne refuse rien", { skip: sansPostgres }, () => {
  for (const [bout, attendu] of [
    // « plus de » : « de » s'intercale, et « plus » ne touche pas le terme.
    // Le terme rendu est « trois metres » — « trois » fait cinq lettres et n'est
    // pas un mot-outil. Ce qui compte ici, c'est qu'il soit rendu.
    ["plus de trois metres de hauteur", "trois metres"],
    // La négation porte sur un autre membre que le terme.
    ["Lot n 1 : coulage du radier", "coulage"],
    ["le radier n est pas coule", "radier"],
    ["conforme", "conforme"]
  ]) {
    const lu = banc.sql(
      `select coalesce(public.le_terme_de_tete('${bout}'), '—');`);
    assert.equal(lu.sortie.trim(), attendu,
      `« ${bout} » devrait rendre « ${attendu} »`);
  }

  // Et l'idée canonique de la doctrine tient toujours.
  const idee = banc.sql(
    "select avant, lien, apres from public.les_idees_des_textes(array["
    + "'le garde corps permet de proteger la circulation'"
    + "]);");
  assert.equal(idee.sortie.trim(), "garde corps|permet|proteger",
    "l'idée de référence est tombée avec la règle de négation");
});

/* ── La répétition du corpus ─────────────────────────────────────────────── */

/**
 * **Elle compte des répétitions, et c'est une lecture de la console comme les
 * autres** : réservée aux administrateurs.
 *
 * Elle ne rend aucun texte — mais « combien de fois la phrase la plus recopiée
 * revient » reste une mesure sur le contenu de tous les chantiers, et un compte
 * ordinaire n'y a rien à faire.
 */
test("la répétition du corpus ne se lit pas sans être administrateur",
  { skip: sansPostgres }, () => {
    const refuse = banc.sousLadresse("quelquun@ailleurs.example",
      "select count(*) from public.la_repetition_du_corpus();");
    assert.equal(refuse.ok, false, "un compte quelconque a lu la répétition du corpus");
    assert.match(refuse.motif, /réservé à la console/);

    const sansJeton = banc.sousLadresse("",
      "select count(*) from public.la_repetition_du_corpus();");
    assert.equal(sansJeton.ok, false, "la répétition du corpus se lit sans session");
  });

/**
 * **Et elle compte juste.**
 *
 * Sur le corpus réel : mille affirmations lues, quatre-vingt-quatorze textes
 * distincts, jusqu'à trente-quatre copies du même. Le banc pose la même forme
 * en petit, avec un compte connu à l'avance.
 *
 * Les trois causes sont posées séparément, parce que c'est séparément qu'on
 * veut les lire : trois copies d'une même étiquette versées par trois
 * propositions sur le même sujet, une affirmation remplacée, et un texte porté
 * par deux sujets différents.
 */
test("la répétition du corpus compte les copies et dit d'où elles viennent",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);
    // Le corpus du banc n'est pas vide : on compte l'écart, pas l'absolu.
    const avant = banc.sousLadresse("patron@mdall.example",
      "select affirmations, distinctes, textes_sur_plusieurs_sujets,"
      + " remplacees, sujets_reverses from public.la_repetition_du_corpus();");
    const [affirmationsAvant, distinctesAvant, etalesAvant, remplaceesAvant,
      reversesAvant] = avant.sortie.trim().split("|").map(Number);

    const trois = "'a1b2c3d4-0000-4000-8000-000000000001'";
    banc.sql(`insert into public.project_assertions
                (id, project_id, statement, kind, subject_key, proposition_id)
              values
                (${trois}, '${MEDIATHEQUE}', 'Avis — Amenee d''air',
                 'avis', 'A12', '11111111-0000-4000-8000-000000000001'),
                (gen_random_uuid(), '${MEDIATHEQUE}', 'Avis — Amenee d''air',
                 'avis', 'A12', '11111111-0000-4000-8000-000000000002'),
                (gen_random_uuid(), '${MEDIATHEQUE}', 'Avis — Amenee d''air',
                 'avis', 'A12', '11111111-0000-4000-8000-000000000003'),
                -- Le même texte sous un **autre** sujet : l'intitulé partagé.
                (gen_random_uuid(), '${MEDIATHEQUE}', 'Avis — Amenee d''air',
                 'avis', 'B07', '11111111-0000-4000-8000-000000000004'),
                -- Et une phrase qui ne se répète pas, pour que « distinctes »
                -- ne soit pas trivialement égal à 1.
                (gen_random_uuid(), '${GYMNASE}', 'la trappe donne sur la centrale',
                 'avis', 'C01', '11111111-0000-4000-8000-000000000005'),
                -- **La même étiquette, écrite autrement.** Accents, majuscule,
                -- ponctuation : c'est la même phrase recopiée, et la compter
                -- pour deux rendrait un corpus plus riche qu'il n'est. C'est
                -- la normalisation qui le garantit, et c'est cette ligne qui
                -- l'éprouve — sans elle, compter sur le texte brut passait.
                (gen_random_uuid(), '${GYMNASE}', 'AVIS -- Amenée d''air.',
                 'avis', 'C02', '11111111-0000-4000-8000-000000000006');`);
    // Celle-ci est remplacée : elle reste en base, et c'est l'histoire.
    banc.sql(`update public.project_assertions
                 set superseded_by = (select id from public.project_assertions
                                       where subject_key = 'B07' limit 1)
               where id = ${trois};`);

    try {
      const dit = banc.sousLadresse("patron@mdall.example",
        "select affirmations, distinctes, copies_max, remplacees, courantes,"
        + " distinctes_courantes, sujets, sujets_reverses, textes_sur_plusieurs_sujets"
        + " from public.la_repetition_du_corpus();");
      assert.equal(dit.ok, true, dit.motif);

      const [affirmations, distinctes, copiesMax, remplacees, courantes,
        distinctesCourantes, sujets, reverses, etales] =
        dit.sortie.trim().split("|").map(Number);

      assert.equal(affirmations, affirmationsAvant + 6, "les lignes ne sont pas comptées");
      // **Deux textes neufs, pas six.** Quatre copies exactes, une cinquième
      // écrite avec ses accents et sa ponctuation, et une phrase à part.
      assert.equal(distinctes, distinctesAvant + 2,
        "le même texte compte pour plusieurs phrases : les écritures ne sont pas "
        + "ramenées l'une à l'autre");
      assert.equal(copiesMax, 5, `la phrase la plus recopiée l'est 5 fois : ${copiesMax}`);

      // **L'histoire.** Une seule remplacée de plus, et le reste est courant.
      assert.equal(remplacees, remplaceesAvant + 1,
        "l'affirmation remplacée n'est pas comptée");
      assert.equal(courantes, affirmations - remplacees,
        "les courantes ne complètent pas les lignes");
      assert.ok(distinctesCourantes <= distinctes,
        "il y aurait plus de phrases distinctes au présent que dans toute l'histoire");

      // **Le ré-versement.** « A12 » a été versé par trois propositions.
      assert.ok(sujets >= 4, `les sujets ne sont pas comptés : ${sujets}`);
      assert.equal(reverses, reversesAvant + 1,
        `un seul sujet de plus est versé par plusieurs propositions : ${reverses}`);

      // **L'intitulé partagé.** « Avis — Amenee d'air » porte A12 et B07. Le
      // banc en porte déjà : on mesure l'écart, comme pour le reste — un chiffre
      // absolu ici se casserait au premier jeu d'essai qui change.
      assert.equal(etales, etalesAvant + 1,
        `un seul texte de plus est porté par deux sujets : ${etales}`);
    } finally {
      banc.sql(`update public.project_assertions set superseded_by = null
                 where id = ${trois};`);
      banc.sql(`delete from public.project_assertions
                 where statement in ('Avis — Amenee d''air',
                                     'AVIS -- Amenée d''air.',
                                     'la trappe donne sur la centrale');`);
    }
  });

/**
 * **Un corpus vide rend zéro copie, et non « null copie ».**
 *
 * C'est l'état d'une installation neuve, et il n'est pas théorique. Sans le
 * `coalesce`, `max()` rend `null` sur un ensemble vide, et la carte de la
 * console écrirait « jusqu'à null ». Le compte à vide se vérifie à vide : on
 * efface dans une transaction, on lit, et on défait.
 */
test("un corpus vide se compte à zéro, pas à null", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;`);

  // **Une ligne d'abord, et c'est elle qui rend le test honnête.** Sans elle,
  // le corpus pourrait déjà être vide selon l'ordre des tests, et l'épreuve
  // passerait sans rien éprouver.
  banc.sql(`insert into public.project_assertions (project_id, statement)
            values ('${MEDIATHEQUE}', 'la trappe donne sur la centrale');`);

  try {
    const plein = banc.sql("select count(*) > 0 from public.project_assertions;");
    assert.equal(plein.sortie.trim(), "t", "le corpus est vide avant l'épreuve");

    // **L'effacement se fait avant d'endosser le rôle**, et non après : les
    // politiques de `project_assertions` ne laissent voir à un compte
    // authentifié que ses propres chantiers, et un administrateur de la console
    // n'est pas pour autant collaborateur. Un `delete` passé sous ce rôle-là
    // n'effacerait rien, et l'épreuve passerait sur un corpus intact.
    const dit = banc.sql(
      "begin;\n"
      + "delete from public.project_assertions;\n"
      + "set role authenticated;\n"
      + `set request.jwt.claims = '{"email":"patron@mdall.example"}';\n`
      + "select affirmations, distinctes, copies_max"
      + " from public.la_repetition_du_corpus();\n"
      + "reset role;\n"
      + "rollback;\n", { doitTenir: false });
    assert.equal(dit.ok, true, dit.motif);
    assert.equal(dit.sortie.trim(), "0|0|0",
      "sur un corpus vide, la carte écrira « jusqu'à null »");

    // Et le corpus est bien revenu : la transaction a été défaite.
    const apres = banc.sql("select count(*) > 0 from public.project_assertions;");
    assert.equal(apres.sortie.trim(), "t", "le corpus du banc a été effacé pour de bon");
  } finally {
    banc.sql(`delete from public.project_assertions
               where statement = 'la trappe donne sur la centrale';`);
  }
});

/* ── « au-delà » ne donne pas le terme « delà » ──────────────────────────── */

/**
 * **L'idée fausse qu'il fallait faire tomber.**
 *
 * Sur tout le corpus, deux idées sortaient. L'une était `accès —empêchement→
 * delà`, et elle vient de « Accès des véhicules lourds : interdit au-delà de
 * 3,5 t ». Le découpage a bien travaillé ; c'est le terme de droite qui est un
 * morceau de locution.
 *
 * `le_terme_de_tete` normalise le trait d'union en espace, écarte les mots de
 * moins de quatre lettres — « au » tombe — puis les mots-outils. « dela » fait
 * quatre lettres et passait.
 *
 * Une idée fausse rendue avec l'aplomb des vraies est pire qu'une idée
 * manquante : celle-ci on la cherche, celle-là on la croit.
 */
test("« au-delà » ne devient pas un terme", { skip: sansPostgres }, () => {
  const dit = banc.sql(
    "select coalesce(public.le_terme_de_tete('au-dela de 3,5 t'), '—');");
  assert.equal(dit.sortie.trim(), "—",
    "« au-delà » rend encore un terme : l'idée fausse se refabriquera");

  // Et la phrase entière ne rend plus l'idée fausse.
  const idee = banc.sql(
    "select count(*) from public.les_idees_des_textes(array["
    + "'Acces des vehicules lourds : interdit au-dela de 3,5 t'"
    + "]);");
  assert.equal(idee.sortie.trim(), "0",
    "« accès —empêchement→ delà » sort encore");
});

/**
 * **Ses pareils aussi**, et un terme technique continue de passer.
 *
 * C'est la seconde moitié du test, et la plus importante : un mot-outil retiré
 * de trop est un terme technique qu'on ne verra plus jamais, et cela ne se
 * rattrape pas en regardant l'écran — l'idée manquante ne s'affiche pas.
 */
test("les morceaux de locution tombent, les termes restent", { skip: sansPostgres }, () => {
  for (const morceau of ["au-dela", "en-deca", "ci-dessus", "par-dessous",
    "en dedans", "au dehors"]) {
    const dit = banc.sql(
      `select coalesce(public.le_terme_de_tete('${morceau} du seuil'), '—');`);
    assert.equal(dit.sortie.trim(), "seuil",
      `« ${morceau} » prend la tête du terme devant « seuil »`);
  }

  // **Et « joint » reste un terme.** Il vient de « ci-joint » aussi souvent que
  // d'un joint de dilatation, et on ne l'écarte pas pour autant.
  const joint = banc.sql(
    "select public.le_terme_de_tete('joint de dilatation');");
  // « de » fait deux lettres : elle tombe avant d'être un voisin, et le terme
  // s'arrête à « joint ». C'est bien un terme, et c'est ce qu'on vérifie.
  assert.equal(joint.sortie.trim(), "joint",
    "« joint » a été écarté : un terme de chantier est perdu");
});

/* ── Une lecture de rapport de contrôle n'appartient qu'à qui l'a faite ──── */

/**
 * **C'est ce qu'il y a de plus délicat à montrer d'un chantier.**
 *
 * Un rapport de contrôle technique porte le verdict d'un tiers sur l'ouvrage. Un
 * avis défavorable mal relu, montré à l'entreprise concernée avant d'avoir été
 * vérifié, est exactement ce qui discréditerait l'outil.
 *
 * Et c'est en outre un brouillon d'Atelier : il n'appartient qu'à qui l'a fait.
 * Un écran qui oublierait de filtrer ne pourrait pas montrer ce qu'il ne doit pas
 * — la séparation est tenue par la base, ou elle n'est pas tenue.
 */
test("la lecture d'un rapport ne se lit pas par un autre", { skip: sansPostgres }, () => {
  banc.enTantQue(A,
    `insert into public.rapport_lectures (project_id, document, numero_de_rapport)`
    + ` values ('${MEDIATHEQUE}', 'rapport-initial.pdf', 'RICT-01');`);

  const sien = banc.enTantQue(A, "select count(*) from public.rapport_lectures;");
  assert.equal(sien.sortie.trim(), "1", "son auteur ne lit plus sa propre lecture");

  // **B est collaborateur du même chantier**, et cela ne lui ouvre rien : une
  // lecture d'Atelier n'appartient qu'à qui l'a faite, pas au projet.
  const autre = banc.enTantQue(B, "select count(*) from public.rapport_lectures;");
  assert.equal(autre.sortie.trim(), "0", "un collaborateur lit la lecture d'un autre");

  const sansCompte = banc.sansCompte("select count(*) from public.rapport_lectures;");
  assert.equal(sansCompte.ok === false || sansCompte.sortie.trim() === "0", true,
    `la clé anonyme lit les lectures de rapports : ${sansCompte.sortie}`);
});

/** Et on ne peut pas en écrire une au nom d'un autre. */
test("on n'écrit pas une lecture de rapport au nom d'un autre", { skip: sansPostgres }, () => {
  const vole = banc.enTantQue(B,
    `insert into public.rapport_lectures (project_id, document, owner_id)`
    + ` values ('${MEDIATHEQUE}', 'Au nom de quelqu''un d''autre', '${A}');`);

  assert.equal(vole.ok, false, "une lecture a été écrite au nom d'un autre");
});

/**
 * **La table porte bien ce que la migration annonce.**
 *
 * L'ajouter à la liste ne suffit pas : une liste qu'on raccourcit laisse le banc
 * vert. On demande donc les colonnes à PostgreSQL.
 *
 * `legende` en est une, et c'est la pièce du lot : sans elle, les avis d'un
 * rapport ne se lisent pas, et la légende d'un autre rapport du même bureau n'est
 * pas celle-ci.
 */
test("une lecture de rapport porte sa légende et ce qu'elle a vu",
  { skip: sansPostgres }, () => {
    const dit = banc.sql(
      "select column_name from information_schema.columns"
      + " where table_schema = 'public' and table_name = 'rapport_lectures'"
      + " order by column_name;");
    const colonnes = dit.sortie.split("\n").map((un) => un.trim()).filter(Boolean);

    for (const attendue of ["document", "document_id", "numero_de_rapport", "etabli_le",
      "nature", "legende", "mesures", "lu_par", "analyse_gelee", "proposition_id",
      "owner_id"]) {
      assert.ok(colonnes.includes(attendue),
        `« rapport_lectures » n'a pas « ${attendue} » : la migration n'a pas tourné`);
    }

    // **Et pas sous le mot réservé**, celui que PostgreSQL refuse.
    assert.ok(!colonnes.includes("analyse"),
      "la colonne porte le mot réservé : le déploiement sera refusé");
  });

/* ── Une lecture de fil de mails n'appartient qu'à qui l'a faite ─────────── */

/**
 * **C'est ce qu'il y a de plus personnel dans un chantier.**
 *
 * Un fil de mails dit qui a écrit quoi, à qui, et ce qu'on en a déduit. Une
 * lecture d'Atelier est déjà un brouillon qu'on ne publie pas ; celle-ci est en
 * outre de la correspondance.
 *
 * Un écran qui oublierait de filtrer ne pourrait pas montrer ce qu'il ne doit
 * pas : la séparation est tenue par la base, ou elle n'est pas tenue.
 */
test("la lecture d'un fil ne se lit pas par un autre", { skip: sansPostgres }, () => {
  banc.enTantQue(A,
    `insert into public.fil_lectures (project_id, objet, messages, finit_le)`
    + ` values ('${MEDIATHEQUE}', 'Trappe face à la centrale', 4, '2026-03-14');`);

  const sien = banc.enTantQue(A, "select count(*) from public.fil_lectures;");
  assert.equal(sien.sortie.trim(), "1", "son auteur ne lit plus sa propre lecture");

  // **B est collaborateur du même chantier**, et cela ne lui ouvre rien : une
  // lecture d'Atelier n'appartient qu'à qui l'a faite, pas au projet.
  const autre = banc.enTantQue(B, "select count(*) from public.fil_lectures;");
  assert.equal(autre.sortie.trim(), "0", "un collaborateur lit la correspondance d'un autre");

  const sansCompte = banc.sansCompte("select count(*) from public.fil_lectures;");
  assert.equal(sansCompte.ok === false || sansCompte.sortie.trim() === "0", true,
    `la clé anonyme lit les lectures de fils : ${sansCompte.sortie}`);
});

/**
 * **Et on ne peut pas en écrire une au nom d'un autre.**
 *
 * Sans la règle d'écriture, on ne lit pas les lectures des autres mais on peut
 * leur en déposer une — ou modifier la leur en devinant un identifiant.
 */
test("on n'écrit pas une lecture de fil au nom d'un autre", { skip: sansPostgres }, () => {
  const vole = banc.enTantQue(B,
    `insert into public.fil_lectures (project_id, objet, owner_id)`
    + ` values ('${MEDIATHEQUE}', 'Au nom de quelqu''un d''autre', '${A}');`);

  assert.equal(vole.ok, false, "une lecture a été écrite au nom d'un autre");
});

/**
 * **La table porte bien ce que la migration annonce.**
 *
 * L'ajouter à la liste ne suffit pas : une liste qu'on raccourcit laisse le
 * banc vert. On demande donc les colonnes à PostgreSQL.
 */
test("une lecture de fil porte ce qu'elle a vu", { skip: sansPostgres }, () => {
  const dit = banc.sql(
    "select column_name from information_schema.columns"
    + " where table_schema = 'public' and table_name = 'fil_lectures' order by column_name;");
  const colonnes = dit.sortie.split("\n").map((un) => un.trim()).filter(Boolean);

  for (const attendue of ["analyse_gelee", "objet", "fichiers", "messages",
    "commence_le", "finit_le", "mesures", "lu_par", "proposition_id", "owner_id"]) {
    assert.ok(colonnes.includes(attendue),
      `« fil_lectures » n'a pas « ${attendue} » : la migration n'a pas tourné`);
  }

  // **Et pas sous le mot réservé**, celui que PostgreSQL refuse.
  assert.ok(!colonnes.includes("analyse"),
    "la colonne porte le mot réservé : le déploiement sera refusé");
});

/* ── Les comptes de Mdall, et le journal qui dit qui les a vus ───────────── */

/**
 * **Trois fonctions `security definer` qui lisent des personnes.**
 *
 * Les autres fonctions de la console rendent des agrégats anonymes : même
 * ouvertes à tort, elles ne nomment personne. Celles-ci rendent un nom, un
 * prénom, une adresse. Une porte qui ne tiendrait pas ici publierait l'annuaire
 * des comptes de Mdall à toute session authentifiée — et c'est le genre de trou
 * qu'on ne voit pas en relisant, seulement en essayant d'entrer.
 */
test("les comptes se refusent à qui n'est pas administrateur",
  { skip: sansPostgres }, () => {
    for (const requete of [
      "select count(*) from public.les_comptes_de_mdall(1, 25, null);",
      `select count(*) from public.le_compte_de_mdall('${A}');`,
      `select count(*) from public.la_consommation_dun_compte('${A}', '2026-10-01', '2026-10-31', 'day');`
    ]) {
      const etranger = banc.sousLadresse("quelquun@ailleurs.example", requete);
      assert.equal(etranger.ok, false, `ouverte à un compte ordinaire : ${requete}`);
      assert.match(etranger.motif, /réservé à la console/);

      const sansJeton = banc.sousLadresse("", requete);
      assert.equal(sansJeton.ok, false, `ouverte sans session : ${requete}`);
    }
  });

/**
 * **Une tentative refusée n'est pas un accès.**
 *
 * Si la porte journalisait avant de refuser, le journal se remplirait de lignes
 * qui n'ont rien vu — et celles qui ont vu quelque chose s'y noieraient. C'est
 * un journal qu'on ne relit plus, donc un journal pour rien.
 */
test("un refus ne laisse pas de ligne au journal", { skip: sansPostgres }, () => {
  banc.sql("delete from public.acces_administrateurs;");

  banc.sousLadresse("quelquun@ailleurs.example",
    "select count(*) from public.les_comptes_de_mdall(1, 25, null);");

  const combien = banc.sql("select count(*) from public.acces_administrateurs;");
  assert.equal(combien.sortie.trim(), "0", "un refus a été journalisé comme un accès");
});

/**
 * **Et un accès, lui, en laisse une** — avec qui, quelle page, et quel filtre.
 *
 * C'est le § 5.4 de `docs/la-console-de-ladministrateur.md`, et il est
 * irrattrapable : un journal ajouté six mois plus tard ne dit rien des six
 * premiers mois, qui sont précisément ceux qu'on voudra expliquer.
 */
test("un accès aux comptes se journalise, avec son filtre", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;
            delete from public.acces_administrateurs;`);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select count(*) from public.les_comptes_de_mdall(2, 10, 'ourdine');");
  assert.equal(lu.ok, true, lu.motif);

  const journal = banc.sql(
    "select courriel, page, filtre from public.acces_administrateurs order by quand desc limit 1;");
  assert.match(journal.sortie, /patron@mdall\.example/);
  assert.match(journal.sortie, /utilisateurs\/comptes/);
  // Le filtre tel qu'il a été reçu : la page demandée, la taille, la recherche.
  assert.match(journal.sortie, /page=2/);
  assert.match(journal.sortie, /par_page=10/);
  assert.match(journal.sortie, /cherche=ourdine/);
});

/**
 * **Le journal ne se lit pas depuis un navigateur**, pas même par un
 * administrateur.
 *
 * Un journal des accès que son sujet peut relire est un journal qu'il peut
 * vérifier avant d'effacer. Il n'a donc aucune politique de lecture : on le
 * consulte avec les clés, là où l'on ne peut pas se journaliser soi-même une
 * exception.
 */
test("le journal des accès ne se lit par aucune clé du navigateur",
  { skip: sansPostgres }, () => {
    for (const essai of [
      banc.sousLadresse("patron@mdall.example", "select count(*) from public.acces_administrateurs;"),
      banc.enTantQue(A, "select count(*) from public.acces_administrateurs;"),
      banc.sansCompte("select count(*) from public.acces_administrateurs;")
    ]) {
      assert.equal(essai.ok === false || essai.sortie.trim() === "0", true,
        `le journal se lit : ${essai.sortie}`);
    }

    // Et l'on n'y écrit pas non plus une ligne à la main : une ligne qu'on peut
    // fabriquer ne prouve rien de celles qu'on n'a pas fabriquées.
    const faux = banc.sousLadresse("patron@mdall.example",
      "insert into public.acces_administrateurs (page) values ('inventée');");
    assert.equal(faux.ok, false, "une ligne de journal a été écrite à la main");
  });

/**
 * **Possédé n'est pas collaboré.**
 *
 * Un déclencheur inscrit le propriétaire comme collaborateur de son propre
 * chantier (`ensure_project_owner_collaborator`). Les compter ensemble dirait
 * que chacun collabore à tout ce qu'il possède — un chiffre qui monte avec le
 * premier et n'apprend rien de plus.
 */
test("un administrateur lit les comptes, et les deux rôles se distinguent",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;
      update auth.users set email = 'ourdine@entreprise.example' where id = '${A}';
      update auth.users set email = 'bertrand@novaclim.example' where id = '${B}';
      insert into public.user_public_profiles (user_id, first_name, last_name, company)
        values ('${A}', 'Ourdine', 'Ferrand', 'VERIFAS') on conflict do nothing;
      -- A possède la Médiathèque ; B y collabore, et ne possède rien.
      insert into public.project_collaborators (project_id, collaborator_user_id, status)
        values ('${MEDIATHEQUE}', '${B}', 'Actif'),
               -- Le propriétaire est inscrit chez lui par le déclencheur : il ne
               -- doit pas en devenir « collaborateur ».
               ('${MEDIATHEQUE}', '${A}', 'Actif');`);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select courriel, prenom, nom, societe, projets_possedes, projets_collabores,"
      + " combien_en_tout from public.les_comptes_de_mdall(1, 25, null)"
      + " where courriel is not null order by courriel;");
    assert.equal(lu.ok, true, lu.motif);

    const champs = (une) => une.split("|").map((un) => un.trim());
    const lignes = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean).map(champs);
    const bertrand = lignes.find((une) => une[0].startsWith("bertrand@"));
    const ourdine = lignes.find((une) => une[0].startsWith("ourdine@"));

    assert.ok(ourdine, lu.sortie);
    assert.deepEqual(ourdine.slice(1, 4), ["Ourdine", "Ferrand", "VERIFAS"]);
    // **A est inscrit comme collaborateur de son propre chantier** — le
    // déclencheur le fait —, et il ne doit pas en devenir « collaborateur » pour
    // autant : sinon le chiffre monterait avec le nombre de chantiers possédés
    // et n'apprendrait rien de plus que la colonne d'à côté.
    assert.equal(ourdine[5], "0", `Ourdine collabore chez lui : ${ourdine}`);
    assert.ok(Number(ourdine[4]) >= 1, `Ourdine ne possède rien : ${ourdine}`);

    assert.ok(bertrand, lu.sortie);
    // Il collabore à la Médiathèque, qui est à A — et à celui-là seulement.
    assert.equal(bertrand[5], "1", `${bertrand}`);
  });

/**
 * **La recherche cherche, et la page coupe.**
 *
 * Le total voyage avec chaque ligne : sans lui, l'écran ne sait pas combien de
 * pages il reste et n'ose pas proposer la suivante. Et il compte **avant** la
 * coupe — un total égal à la taille de la page ferait croire qu'on voit tout.
 */
test("la liste se cherche et se coupe, et dit combien il y en a en tout",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);

    const cherche = banc.sousLadresse("patron@mdall.example",
      "select courriel, combien_en_tout from public.les_comptes_de_mdall(1, 25, 'novaclim');");
    assert.equal(cherche.ok, true, cherche.motif);
    const trouves = cherche.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
    assert.equal(trouves.length, 1, cherche.sortie);
    assert.match(trouves[0], /bertrand@novaclim\.example\s*\|\s*1/);

    // Une page de un : une ligne rendue, et le total qui dit qu'il y en a plus.
    const coupee = banc.sousLadresse("patron@mdall.example",
      "select combien_en_tout from public.les_comptes_de_mdall(1, 1, null);");
    const total = Number(coupee.sortie.trim());
    assert.equal(coupee.sortie.trim().split("\n").length, 1, "la page n'a pas été coupée");
    assert.ok(total >= 2, `le total compte après la coupe : ${total}`);

    // **Une taille délirante est ramenée à cent.** Sans borne, un appelant
    // demanderait la base entière en une requête — et la rendrait au navigateur.
    //
    // On pose donc assez de comptes pour dépasser la borne, et l'on vérifie
    // **ce qui revient**. Vérifier que l'appel aboutit ne prouvait rien : il
    // aboutit tout aussi bien sans borne.
    banc.sql(`insert into auth.users (id, email)
      select gen_random_uuid(), 'foule' || i || '@chantier.example'
      from generate_series(1, 140) as i;`);

    const enorme = banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.les_comptes_de_mdall(1, 100000, null);");
    assert.equal(enorme.ok, true, enorme.motif);
    assert.equal(Number(enorme.sortie.trim()) <= 100, true,
      `une page a rendu ${enorme.sortie.trim()} comptes : la borne ne tient pas`);

    // Et une taille absurde dans l'autre sens rend au moins une ligne, plutôt
    // qu'une page vide qui se lirait « aucun compte ».
    const minuscule = banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.les_comptes_de_mdall(1, 0, null);");
    assert.equal(Number(minuscule.sortie.trim()), 1, minuscule.sortie);

    banc.sql("delete from auth.users where email like 'foule%@chantier.example';");
  });

/**
 * **Le détail d'un compte nomme ses chantiers et compte ses sujets.**
 *
 * Il compte, il ne lit pas : le titre d'un sujet n'entre pas ici. C'est la règle
 * de la console — la forme et les comptes traversent, le contenu reste.
 */
test("le détail d'un compte porte ses projets, ses sujets et sa consommation",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;
      insert into public.ai_usages (owner_id, model, input_tokens, output_tokens, created_at)
        values ('${A}', 'claude-sonnet-5-5', 1000, 200, '2026-10-02T10:00:00Z'),
               ('${A}', 'claude-sonnet-5-5', 3000, 400, '2026-10-02T18:00:00Z'),
               ('${A}', 'claude-opus-5-5', 500, 100, '2026-09-15T10:00:00Z'),
               ('${B}', 'claude-sonnet-5-5', 70, 10, '2026-10-02T10:00:00Z');`);

    const lu = banc.sousLadresse("patron@mdall.example",
      `select courriel, sujets, appels, jetons, jsonb_array_length(projets)`
      + ` from public.le_compte_de_mdall('${A}');`);
    assert.equal(lu.ok, true, lu.motif);
    assert.match(lu.sortie, /ourdine@entreprise\.example/);
    // Trois appels à lui, pas les quatre de la base.
    assert.match(lu.sortie, /\|\s*3\s*\|\s*5200\s*\|/, lu.sortie);

    // Les chantiers viennent avec leur rôle, et c'est ce qui les distingue.
    const roles = banc.sousLadresse("patron@mdall.example",
      `select distinct un ->> 'role' from public.le_compte_de_mdall('${A}'),`
      + ` jsonb_array_elements(projets) as un order by 1;`);
    assert.match(roles.sortie, /proprietaire/);

    // Un compte qui n'existe pas rend zéro ligne, et non une ligne vide : une
    // ligne de zéros se lirait comme un compte sans activité.
    const inconnu = banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.le_compte_de_mdall('99999999-9999-4999-8999-999999999999');");
    assert.equal(inconnu.sortie.trim(), "0");
  });

/**
 * **La consommation est groupée en base, et l'axe reste au JavaScript.**
 *
 * Ce qui est ici est une réduction de volume : `date_trunc` ramène chaque appel
 * au début de son pas, et l'on somme par pas et par modèle. Le tarif, les pas
 * vides et les libellés restent dans `services/consommation-ia.js` — un second
 * barème en SQL divergerait de la facture au premier tarif relevé (règle 4).
 */
test("la consommation d'un compte se groupe par pas et par modèle",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);

    const parJour = banc.sousLadresse("patron@mdall.example",
      `select to_char(le, 'YYYY-MM-DD'), model, entree, sortie, combien`
      + ` from public.la_consommation_dun_compte('${A}', '2026-09-01', '2026-10-31', 'day')`
      + ` order by 1, 2;`);
    assert.equal(parJour.ok, true, parJour.motif);
    const jours = parJour.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
    // Deux appels du même modèle le même jour ne font qu'une ligne, et elle
    // porte combien ils étaient.
    assert.ok(jours.some((une) => /2026-10-02\s*\|\s*claude-sonnet-5-5\s*\|\s*4000\s*\|\s*600\s*\|\s*2/.test(une)),
      parJour.sortie);

    // Par mois, les deux jours d'octobre se réunissent — et les deux modèles
    // restent distincts, parce que le coût dépend du modèle.
    const parMois = banc.sousLadresse("patron@mdall.example",
      `select to_char(le, 'YYYY-MM'), model, entree, combien`
      + ` from public.la_consommation_dun_compte('${A}', '2026-01-01', '2026-12-31', 'month')`
      + ` order by 1, 2;`);
    const mois = parMois.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
    assert.ok(mois.some((une) => /2026-09\s*\|\s*claude-opus-5-5\s*\|\s*500\s*\|\s*1/.test(une)), parMois.sortie);
    assert.ok(mois.some((une) => /2026-10\s*\|\s*claude-sonnet-5-5\s*\|\s*4000\s*\|\s*2/.test(une)), parMois.sortie);

    // **La borne de fin est incluse.** Un appel du dernier jour de la fenêtre
    // qui disparaîtrait ferait une facture qui s'arrête la veille.
    const dernier = banc.sousLadresse("patron@mdall.example",
      `select coalesce(sum(combien), 0) from public.la_consommation_dun_compte(`
      + `'${A}', '2026-10-02', '2026-10-02', 'day');`);
    assert.equal(dernier.sortie.trim(), "2", dernier.sortie);
  });

/**
 * **Trois pas, et pas un de plus.**
 *
 * `date_trunc` accepte bien d'autres mots — `week`, `quarter`, `millennium`.
 * Laisser passer celui qu'on reçoit reviendrait à laisser l'appelant choisir une
 * granularité que l'axe du JavaScript ne sait pas dessiner : la courbe
 * s'afficherait vide, ce qui se lit « rien n'a été consommé » (règle 5).
 */
test("un pas que l'écran ne sait pas dessiner est refusé", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;`);

  for (const pas of ["week", "quarter", "millennium", "'; drop table projects; --"]) {
    const essai = banc.sousLadresse("patron@mdall.example",
      `select count(*) from public.la_consommation_dun_compte('${A}', '2026-10-01', '2026-10-31',`
      + ` ${pas.includes("'") ? "$$" + pas + "$$" : `'${pas}'`});`);
    assert.equal(essai.ok, false, `le pas « ${pas} » est passé`);
    assert.match(essai.motif, /pas inconnu/);
  }

  // Les trois qui existent passent.
  for (const pas of ["day", "month", "year"]) {
    const essai = banc.sousLadresse("patron@mdall.example",
      `select count(*) from public.la_consommation_dun_compte('${A}', '2026-10-01', '2026-10-31', '${pas}');`);
    assert.equal(essai.ok, true, `${pas} : ${essai.motif}`);
  }

  // Et la table des projets est toujours là.
  assert.equal(banc.sql("select count(*) > 0 from public.projects;").sortie.trim(), "t");
});

/**
 * **Un compte effacé ne reparaît pas dans l'annuaire.**
 *
 * Le droit à l'effacement n'est pas « on ne le montre plus à l'écran de
 * l'utilisateur » : c'est aussi, et surtout, « la console ne le liste plus ».
 */
test("un compte effacé quitte la liste des comptes", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;
    update auth.users set deleted_at = now() where id = '${B}';`);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select courriel from public.les_comptes_de_mdall(1, 100, null);");
  assert.doesNotMatch(lu.sortie, /bertrand@novaclim\.example/,
    "un compte effacé est encore listé");

  const detail = banc.sousLadresse("patron@mdall.example",
    `select count(*) from public.le_compte_de_mdall('${B}');`);
  assert.equal(detail.sortie.trim(), "0", "un compte effacé a encore un détail");

  banc.sql(`update auth.users set deleted_at = null where id = '${B}';`);
});

// ── L'exploitation de Mdall ─────────────────────────────────────────────────
//
// Trois fonctions qui disent l'état de l'installation. Elles sont `security
// definer` : elles lisent par-dessus les politiques, dont celles d'une table
// posée **sans aucune politique**. C'est exactement le cas où il faut essayer
// d'entrer, pas relire la règle.

/** De quoi faire parler la santé : un appel abouti, deux refus, deux files. */
function desTraces() {
  banc.sql(`
    insert into public.administrateurs (courriel) values ('patron@mdall.example')
      on conflict do nothing;
    delete from public.refus_des_fonctions;
    delete from public.versements;

    insert into public.refus_des_fonctions (owner_id, fonction, motif, survenu_le) values
      -- Deux fois le même genre sur la même fonction : ils se regroupent.
      ('${A}', 'extract-avis', 'quota', now() - interval '20 minutes'),
      ('${A}', 'extract-avis', 'quota', now() - interval '40 minutes'),
      -- Un autre genre sur la même fonction : il ne se confond pas avec le premier.
      ('${A}', 'extract-avis', 'surcharge', now() - interval '1 hour'),
      -- Hors de la fenêtre de 24 h, dans celle de 7 jours.
      ('${A}', 'project-copilot', 'injoignable', now() - interval '4 days'),
      -- Cinquante jours : au-delà de la semaine que la borne haute impose, et en
      -- deçà des mille heures qu'on peut demander. C'est lui qui fait tomber la
      -- borne si on l'enlève.
      ('${A}', 'verser-les-mails', 'mal-forme', now() - interval '50 days');

    insert into public.versements (project_id, owner_id, geste, statut, cree_le, pris_le) values
      -- Prise il y a vingt minutes et jamais refermée : abandonnée en route.
      ('${MEDIATHEQUE}', '${A}', 'mails', 'en_cours', now() - interval '30 minutes',
        now() - interval '20 minutes'),
      -- Prise il y a deux minutes : elle travaille, elle ne bloque rien.
      ('${MEDIATHEQUE}', '${A}', 'mails', 'en_cours', now() - interval '3 minutes',
        now() - interval '2 minutes'),
      -- Jamais prises : l'autre moitié, celle qui dit que rien ne tourne. **Deux,
      -- d'âges différents** : avec une seule, « la plus vieille » et « la plus
      -- récente » seraient la même ligne, et l'épreuve ne verrait pas la
      -- différence (règle 4).
      ('${MEDIATHEQUE}', '${A}', 'mails', 'en_attente', now() - interval '2 days', null),
      ('${MEDIATHEQUE}', '${A}', 'mails', 'en_attente', now() - interval '5 minutes', null);
  `);
}

/** Un champ d'une ligne rendue par une fonction de la console. */
function leChamp(sortie, rang) {
  return sortie.split("\n").map((une) => une.trim()).filter(Boolean)[0]
    ?.split("|").map((un) => un.trim())[rang] ?? "";
}

/**
 * **La santé rend ce qu'on a vu, pas un verdict.**
 *
 * Les derniers succès et les refus groupés par genre et par fonction. Le
 * regroupement est le point : « trois pannes » ne dit rien, « deux quotas et une
 * surcharge sur extract-avis » dit quoi faire (règle 12).
 */
test("la santé des systèmes groupe les refus par fonction et par genre",
  { skip: sansPostgres }, () => {
    desTraces();

    const lu = banc.sousLadresse("patron@mdall.example",
      "select jsonb_pretty(refus_recents) from public.la_sante_des_systemes(24);");
    assert.equal(lu.ok, true, lu.motif);

    // Deux quotas d'un côté, une surcharge de l'autre : deux entrées, pas trois.
    assert.match(lu.sortie, /"motif":\s*"quota"[\s\S]*?"combien":\s*2/, lu.sortie);
    assert.match(lu.sortie, /"motif":\s*"surcharge"[\s\S]*?"combien":\s*1/, lu.sortie);
    // Le refus de mercredi n'est pas dans la fenêtre de vingt-quatre heures.
    assert.doesNotMatch(lu.sortie, /injoignable/,
      "un refus hors fenêtre est compté dans les refus récents");

    // Et il est bien dans celle de sept jours : les deux fenêtres ne disent pas
    // la même chose, et c'est pour cela qu'il y en a deux.
    const semaine = banc.sousLadresse("patron@mdall.example",
      "select refus_semaine::text from public.la_sante_des_systemes(24);");
    assert.match(semaine.sortie, /injoignable/,
      "un refus de la semaine est absent de la fenêtre de sept jours");
  });

/**
 * **Prise et abandonnée n'est pas prise et en train de travailler.**
 *
 * Les dix minutes viennent de `ABANDONNEE_APRES_MS`. Compter la ligne prise il y
 * a deux minutes ferait dire « une file bloquée » de chaque lecture en cours — et
 * l'indicateur deviendrait du bruit qu'on apprend à ignorer.
 */
test("la santé distingue une file abandonnée d'une file qui travaille",
  { skip: sansPostgres }, () => {
    desTraces();

    const lu = banc.sousLadresse("patron@mdall.example",
      "select files_bloquees, files_en_attente,"
      + " (now() - plus_vieille_attente) > interval '1 day'"
      + " from public.la_sante_des_systemes(24);");
    assert.equal(lu.ok, true, lu.motif);

    assert.equal(leChamp(lu.sortie, 0), "1",
      `une file qui travaille est comptée bloquée, ou l'abandonnée ne l'est pas : ${lu.sortie}`);
    assert.equal(leChamp(lu.sortie, 1), "2", lu.sortie);
    assert.equal(leChamp(lu.sortie, 2), "t",
      "la plus vieille attente n'est pas celle d'il y a deux jours, mais la plus récente");
  });

/**
 * **La fenêtre est bornée, et l'heure est celle du serveur.**
 *
 * Mille heures feraient un balayage sans index utile. Et `regarde_le` vient de
 * la base : sans elle l'écran daterait ses phrases de l'horloge du navigateur,
 * qui peut être fausse de deux heures — et « rien depuis 2 h » se lirait panne.
 */
test("la fenêtre de la santé se borne, et l'heure vient de la base",
  { skip: sansPostgres }, () => {
    desTraces();

    for (const heures of [1000, 0, -5, null]) {
      const essai = banc.sousLadresse("patron@mdall.example",
        `select count(*) from public.la_sante_des_systemes(${heures ?? "null"});`);
      assert.equal(essai.ok, true, `${heures} : ${essai.motif}`);
      assert.equal(essai.sortie.trim(), "1", `${heures} rend ${essai.sortie}`);
    }

    /**
     * **La borne haute se mesure à ce qu'elle écarte.**
     *
     * Mille heures font quarante et un jours. Un refus d'il y a cinquante jours
     * reste dehors de toute façon — mais sans la borne, la fenêtre de « récent »
     * s'étendrait à quarante et un jours, et « ce qui casse en ce moment »
     * mélangerait une panne de ce matin à une d'il y a six semaines (règle 12).
     */
    const mille = banc.sousLadresse("patron@mdall.example",
      "select refus_recents::text from public.la_sante_des_systemes(1000);");
    assert.doesNotMatch(mille.sortie, /mal-forme/,
      "la fenêtre de « récent » dépasse la semaine : la borne haute ne tient pas");

    /**
     * **Et la borne basse à ce qu'elle garde.** Zéro heure ferait une fenêtre
     * de largeur nulle : zéro refus, ce qui se lit « tout va bien » — le seul
     * mensonge que ce tableau ne doit jamais dire (règle 5).
     */
    const zero = banc.sousLadresse("patron@mdall.example",
      "select refus_recents::text from public.la_sante_des_systemes(0);");
    assert.match(zero.sortie, /quota/,
      "une fenêtre de zéro heure rend zéro refus : cela se lit « tout va bien »");

    const quand = banc.sousLadresse("patron@mdall.example",
      "select (now() - regarde_le) < interval '10 seconds' from public.la_sante_des_systemes(24);");
    assert.equal(quand.sortie.trim(), "t", "la santé ne dit pas quand on a regardé");
  });

/** La porte de la console tient sur les trois fonctions de l'exploitation. */
test("l'exploitation se refuse à qui n'est pas administrateur",
  { skip: sansPostgres }, () => {
    const appels = [
      "public.la_sante_des_systemes(24)",
      "public.les_consultations_de_la_console(null, null, 50)",
      "public.lexploitation_de_mdall()"
    ];

    for (const appel of appels) {
      const etranger = banc.sousLadresse("quelquun@ailleurs.example",
        `select count(*) from ${appel};`);
      assert.equal(etranger.ok, false, `${appel} s'ouvre à un étranger`);

      const sansJeton = banc.sansCompte(`select count(*) from ${appel};`);
      assert.equal(sansJeton.ok, false, `${appel} s'ouvre à la clé publique`);
    }
  });

/**
 * **Le journal se lit, et il reste ineffaçable.**
 *
 * La table a été posée sans aucune politique, et la propriété à tenir n'était
 * pas « illisible » : c'était **ineffaçable**. Cette épreuve vérifie les deux
 * moitiés d'un coup — la lecture passe par la fonction gardée, et personne ne
 * peut ni ajouter une ligne ni en retirer une.
 */
test("le journal des consultations se lit sans devenir effaçable",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.les_consultations_de_la_console(null, null, 50);");
    assert.equal(lu.ok, true, lu.motif);
    assert.ok(Number(lu.sortie.trim()) > 0,
      "le journal se lit vide alors que la console vient d'être consultée");

    /**
     * **On mesure ce qui reste, pas si l'ordre a crié.**
     *
     * Avec RLS active et aucune politique, un `delete` ne lève rien : il touche
     * zéro ligne et rend la main. Éprouver l'erreur aurait éprouvé le mécanisme ;
     * la propriété à tenir est qu'**aucune ligne ne disparaisse** — et c'est elle
     * qu'on compte, avant et après.
     */
    const combien = () => Number(banc.sql(
      "select count(*) from public.acces_administrateurs;").sortie.trim());
    const avant = combien();

    for (const essai of [
      "insert into public.acces_administrateurs (courriel, page) values ('faux@mdall.example', 'x')",
      "delete from public.acces_administrateurs",
      "update public.acces_administrateurs set courriel = 'autre@mdall.example'"
    ]) {
      banc.sousLadresse("patron@mdall.example", essai + ";");
      banc.sansCompte(essai + ";");
    }

    assert.equal(combien(), avant,
      "le journal a changé de taille : il n'est plus ineffaçable");
    assert.equal(
      banc.sql("select count(*) from public.acces_administrateurs"
        + " where courriel in ('faux@mdall.example', 'autre@mdall.example');").sortie.trim(),
      "0", "une ligne de journal a été écrite ou réécrite à la main");
  });

/**
 * **Elle journalise sa propre lecture.**
 *
 * C'est ce qui rend la lecture sans danger : on peut voir qui a regardé le
 * journal, dans le journal. Une lecture muette aurait fait du journal un endroit
 * où l'on peut fouiller sans laisser de trace — et c'est précisément ce que le
 * journal existe pour empêcher.
 */
test("lire le journal des consultations laisse sa propre trace",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;
      delete from public.acces_administrateurs;`);

    banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.les_consultations_de_la_console(null, null, 50);");

    const laTrace = banc.sql(
      "select page from public.acces_administrateurs order by quand desc limit 1;");
    assert.match(laTrace.sortie, /exploitation\/consultations/,
      "une lecture du journal ne s'y inscrit pas");
  });

/**
 * **Parcourir tout le journal, et voir chaque ligne une fois.**
 *
 * La borne de deux cents lignes, et le parcours au curseur — c'est l'épreuve qui
 * a trouvé le défaut de l'`offset`.
 */
test("le journal des consultations se parcourt sans se répéter ni se perdre",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;
      delete from public.acces_administrateurs;
      -- **Soixante instants, cinq lignes chacun.** Les ex æquo sont le cas que
      -- l'identifiant du curseur existe pour tenir : avec une comparaison sur la
      -- seule date, quatre lignes sur cinq de chaque instant se feraient sauter
      -- — et ce sont des lignes de journal qui disparaîtraient.
      insert into public.acces_administrateurs (courriel, page, filtre, quand)
      select 'patron@mdall.example', 'console/x', '', now() - (n || ' minutes')::interval
      from generate_series(1, 60) as n, generate_series(1, 5) as copie;`);

    // La borne tient : deux cents lignes au plus, quoi qu'on demande.
    const large = banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.les_consultations_de_la_console(null, null, 5000);");
    assert.equal(large.ok, true, large.motif);
    assert.ok(Number(large.sortie.trim()) <= 200,
      `une page rend ${large.sortie.trim()} lignes : la borne ne tient pas`);

    // Et le total dit combien il y en a, au-delà de la page rendue.
    const total = banc.sousLadresse("patron@mdall.example",
      "select max(combien_en_tout) from public.les_consultations_de_la_console(null, null, 10);");
    assert.ok(Number(total.sortie.trim()) >= 300, total.sortie);

    /**
     * **Six pages de dix, et chaque ligne vue une fois.**
     *
     * C'est l'épreuve qui a trouvé le défaut : la fonction **écrit dans la table
     * qu'elle pagine**, donc chaque lecture posait une ligne en tête et décalait
     * la suivante d'un cran. La page 2 répétait la dernière ligne de la page 1,
     * et d'autres glissaient hors de portée sans jamais être vues. Une seule
     * paire de pages ne l'aurait pas montré assez fort : on en parcourt six.
     */
    const vues = [];
    let avant = "null";
    let avantId = "null";
    for (let page = 0; page < 6; page += 1) {
      const lu = banc.sousLadresse("patron@mdall.example",
        `select id::text || '|' || quand::text from public.les_consultations_de_la_console(`
        + `${avant}, ${avantId}, 10);`);
      assert.equal(lu.ok, true, lu.motif);
      const lignes = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean)
        .map((une) => une.split("|").map((un) => un.trim()));
      assert.equal(lignes.length, 10, `la page ${page + 1} rend ${lignes.length} lignes`);
      for (const [id] of lignes) vues.push(id);
      const derniere = lignes[lignes.length - 1];
      avantId = `'${derniere[0]}'`;
      avant = `'${derniere[1]}'`;
    }

    assert.equal(new Set(vues).size, vues.length,
      "une ligne du journal est rendue deux fois : la pagination décale sous elle-même");

    /**
     * **Et rien n'a été sauté.** Les soixante vues doivent être les soixante plus
     * récentes — journaux de lecture compris. Vérifié en les comparant à ce que la
     * table rend directement : une ligne manquante ici est une consultation qu'on
     * ne verra jamais.
     */
    const attendues = banc.sql(
      "select id::text from public.acces_administrateurs order by quand desc, id desc limit 60;")
      .sortie.split("\n").map((une) => une.trim()).filter(Boolean);
    // La table a grandi de six lignes pendant le parcours — une par lecture —, et
    // ces six-là sont en tête : on compare donc sur ce que les deux ont en commun.
    const communes = attendues.filter((un) => vues.includes(un));
    assert.ok(communes.length >= 54,
      `${60 - communes.length} lignes du journal ont été sautées`);
  });

/**
 * **La moyenne recouvre deux mondes, et la médiane dit lequel.**
 *
 * Quatre chantiers à un document et un à vingt donnent la même moyenne que cinq
 * à cinq — et ce n'est pas le même produit : le premier appelle un tarif à
 * l'usage, le second un forfait. C'est l'épreuve qui justifie de rendre quatre
 * nombres au lieu d'un.
 */
test("les documents par chantier donnent moyenne, médiane et extrêmes",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;
      delete from public.documents;
      delete from public.projects where id not in
        ('${MEDIATHEQUE}', '22222222-2222-4222-8222-222222222222', '${GYMNASE}',
         '44444444-4444-4444-8444-444444444444');

      -- Quatre chantiers à un document, un à vingt. Moyenne 4,8 ; médiane 1.
      insert into public.documents (project_id, created_by, storage_bucket, file_size_bytes)
      select '${MEDIATHEQUE}', '${A}', 'documents', 1000 from generate_series(1, 20);
      insert into public.documents (project_id, created_by, storage_bucket, file_size_bytes)
        values ('22222222-2222-4222-8222-222222222222', '${A}', 'documents', 500),
               ('${GYMNASE}', '${A}', 'documents', 500),
               ('44444444-4444-4444-8444-444444444444', '${A}', 'mails', 2000);`);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select documents_par_chantier ->> 'moyenne', documents_par_chantier ->> 'mediane',"
      + " documents_par_chantier ->> 'minimum', documents_par_chantier ->> 'maximum'"
      + " from public.lexploitation_de_mdall();");
    assert.equal(lu.ok, true, lu.motif);

    // Quatre chantiers : 20, 1, 1, 1. Moyenne 5,8 ; médiane 1 ; de 1 à 20.
    assert.equal(leChamp(lu.sortie, 0), "5.8", lu.sortie);
    assert.equal(leChamp(lu.sortie, 1), "1",
      `la médiane suit la moyenne : la forme de la distribution est perdue (${lu.sortie})`);
    assert.equal(leChamp(lu.sortie, 2), "1", lu.sortie);
    assert.equal(leChamp(lu.sortie, 3), "20", lu.sortie);
  });

/**
 * **Les octets se comptent par casier, et les effacés à part.**
 *
 * Un document effacé occupe encore des octets tant que rien ne l'a retiré du
 * casier. Le compter avec les vivants ferait une jauge fausse ; ne pas le
 * compter du tout ferait croire un effacement RGPD accompli alors que les octets
 * sont toujours là (règle 5).
 */
test("le stockage se compte par casier, et les effacés se comptent à part",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;
      update public.documents set deleted_at = now()
      where project_id = '${GYMNASE}';`);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select octets_par_casier::text, documents, documents_effaces"
      + " from public.lexploitation_de_mdall();");
    assert.equal(lu.ok, true, lu.motif);

    // Vingt documents à mille octets dans « documents », plus un à cinq cents
    // — l'effacé n'y est plus. Et deux mille dans « mails ».
    assert.match(lu.sortie, /"casier":\s*"documents",\s*"octets":\s*20500/, lu.sortie);
    assert.match(lu.sortie, /"casier":\s*"mails",\s*"octets":\s*2000/, lu.sortie);
    assert.equal(leChamp(lu.sortie, 1), "22", lu.sortie);
    assert.equal(leChamp(lu.sortie, 2), "1",
      `un effacé n'est pas compté à part : ${lu.sortie}`);

    banc.sql(`update public.documents set deleted_at = null where project_id = '${GYMNASE}';`);
  });

/**
 * **Inscrit et jamais revenu, c'est le premier chiffre d'une cohorte.**
 *
 * `last_sign_in_at` est la seule trace que Mdall garde sans la fabriquer : il n'y
 * a pas de table de séances. Rendre `0` pour qui n'est jamais revenu le
 * confondrait avec quelqu'un venu à l'époque zéro (règle 5).
 */
test("l'exploitation distingue qui est revenu de qui n'est jamais revenu",
  { skip: sansPostgres }, () => {
    /**
     * **Toutes les venues sont posées, et non seulement celles de A et B.**
     *
     * Les comptes des autres épreuves vivent dans la même base. Compter sur eux
     * aurait donné une épreuve qui passe ou tombe selon ce qui a tourné avant —
     * et une épreuve qui dépend de son voisin ne prouve rien.
     */
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;
      update auth.users set last_sign_in_at = null, deleted_at = null;
      update auth.users set last_sign_in_at = now() - interval '2 days' where id = '${A}';
      update auth.users set last_sign_in_at = now() - interval '15 days' where id = '${B}';`);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select comptes, venus_7j, venus_30j, jamais_revenus"
      + " from public.lexploitation_de_mdall();");
    assert.equal(lu.ok, true, lu.motif);

    const comptes = Number(leChamp(lu.sortie, 0));

    /**
     * **Quinze jours, c'est dans le mois et pas dans la semaine.**
     *
     * Les deux fenêtres doivent donc rendre deux nombres différents. Avec un seul
     * compte venu il y a deux jours, elles auraient rendu le même — et l'une des
     * deux aurait pu lire la fenêtre de l'autre sans que rien ne le dise.
     */
    assert.equal(leChamp(lu.sortie, 1), "1",
      `la fenêtre de sept jours compte autre chose que la venue d'avant-hier : ${lu.sortie}`);
    assert.equal(leChamp(lu.sortie, 2), "2",
      `la fenêtre de trente jours n'attrape pas la venue d'il y a quinze jours : ${lu.sortie}`);

    // Tous les autres comptes n'ont aucune venue : ils sont « jamais revenus ».
    assert.equal(Number(leChamp(lu.sortie, 3)), comptes - 2, lu.sortie);

    /**
     * **Une venue d'il y a deux mois n'est dans aucune des deux fenêtres, et ne
     * devient pas « jamais revenu » pour autant.**
     *
     * Les confondre effacerait la différence entre quelqu'un qui n'est jamais
     * venu et quelqu'un qui ne revient plus — et c'est le second qu'une cohorte
     * de retour cherche (règle 5).
     */
    banc.sql(`update auth.users set last_sign_in_at = now() - interval '60 days'
              where id = '${A}';
      update auth.users set last_sign_in_at = null where id = '${B}';`);
    const vieux = banc.sousLadresse("patron@mdall.example",
      "select comptes, venus_7j, venus_30j, jamais_revenus from public.lexploitation_de_mdall();");
    assert.equal(leChamp(vieux.sortie, 1), "0", vieux.sortie);
    assert.equal(leChamp(vieux.sortie, 2), "0", vieux.sortie);
    assert.equal(Number(leChamp(vieux.sortie, 3)), Number(leChamp(vieux.sortie, 0)) - 1,
      `le revenant d'il y a deux mois est compté « jamais revenu » : ${vieux.sortie}`);
  });

/**
 * **Signée veut dire entrée en mémoire.**
 *
 * Une proposition ouverte n'a rien versé ; une abandonnée n'a rien versé non
 * plus. Compter les trois ferait annoncer une mémoire qui n'existe pas, et le
 * chiffre serait celui qu'on montre pour dire ce que le produit a fait.
 */
test("l'exploitation ne compte que les propositions signées",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;
      delete from public.propositions;
      insert into public.propositions (project_id, status) values
        ('${MEDIATHEQUE}', 'merged'), ('${MEDIATHEQUE}', 'merged'),
        ('${MEDIATHEQUE}', 'open'), ('${MEDIATHEQUE}', 'closed');`);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select propositions_signees from public.lexploitation_de_mdall();");
    assert.equal(lu.ok, true, lu.motif);
    assert.equal(lu.sortie.trim(), "2",
      `les propositions non signées sont comptées : ${lu.sortie}`);
  });

/**
 * **Chaque regard sur l'exploitation laisse sa trace.**
 *
 * C'est la règle de la console : on ne consulte pas sans que cela se sache. Les
 * trois fonctions de l'exploitation passent par la même porte, et chacune nomme
 * sa page — sans quoi le journal dirait « quelqu'un a regardé » sans dire quoi.
 */
test("chaque page de l'exploitation s'inscrit au journal sous son nom",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;
      delete from public.acces_administrateurs;`);

    banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.la_sante_des_systemes(12);");
    banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.lexploitation_de_mdall();");

    const pages = banc.sql(
      "select page || '[' || filtre || ']' from public.acces_administrateurs order by page;");
    const lignes = pages.sortie.split("\n").map((une) => une.trim()).filter(Boolean);

    assert.ok(lignes.some((une) => une === "exploitation/sante[heures=12]"),
      `la santé ne nomme pas sa fenêtre : ${lignes.join(" | ")}`);
    assert.ok(lignes.some((une) => une === "exploitation/usage[]"),
      `l'usage ne nomme pas sa page : ${lignes.join(" | ")}`);
  });

// ── Les venues ──────────────────────────────────────────────────────────────
//
// **La seule table du produit qu'un navigateur remplit sur lui-même.** Le
// journal des refus est écrit par le navigateur aussi, mais il ne porte que des
// mots d'un domaine fermé ; celle-ci porte la présence d'une personne. C'est
// exactement le cas où il faut essayer d'écrire celle d'un autre.

/** Deux venues à A, une à B, d'empans et de durées différents. */
function desVenues() {
  banc.sql(`
    insert into public.administrateurs (courriel) values ('patron@mdall.example')
      on conflict do nothing;
    delete from public.venues;

    insert into public.venues (owner_id, commencee_le, vue_le, secondes_actives) values
      -- A, hier : une longue et une courte.
      ('${A}', now() - interval '1 day', now() - interval '1 day' + interval '40 minutes', 2100),
      ('${A}', now() - interval '1 day' + interval '3 hours',
        now() - interval '1 day' + interval '3 hours' + interval '4 minutes', 240),
      -- B, hier aussi : c'est ce qui distingue « 3 venues » de « 2 personnes ».
      ('${B}', now() - interval '1 day' + interval '2 hours',
        now() - interval '1 day' + interval '2 hours' + interval '12 minutes', 700),
      -- A, il y a deux ans : hors de toute fenêtre qu'on regardera.
      ('${A}', now() - interval '2 years', now() - interval '2 years', 60);
  `);
}

/**
 * **Personne n'écrit la présence d'un autre.**
 *
 * C'est la raison d'être de cette épreuve : si on le pouvait, la seule table où
 * « quelqu'un était là » se lit comme un fait serait falsifiable par n'importe
 * quelle session. `owner_id` vient de la base ; la politique interdit qu'on le
 * remplace.
 */
test("une venue ne s'écrit que pour soi", { skip: sansPostgres }, () => {
  desVenues();

  // A, pour A : cela passe, et `owner_id` se pose tout seul.
  const sien = banc.enTantQue(A,
    "insert into public.venues (commencee_le) values (now()) returning owner_id;");
  assert.equal(sien.ok, true, sien.motif);
  assert.match(sien.sortie, new RegExp(A));

  // A, pour B : refusé.
  const lautre = banc.enTantQue(A,
    `insert into public.venues (owner_id) values ('${B}');`);
  assert.equal(lautre.ok, false, "on peut écrire la présence de quelqu'un d'autre");

  // Et la clé publique, pour personne.
  const anonyme = banc.sansCompte(
    `insert into public.venues (owner_id) values ('${A}');`);
  assert.equal(anonyme.ok, false, "la clé publique écrit des venues");
});

/**
 * **Et personne ne lit celles d'un autre.**
 *
 * Savoir quand un collègue était devant son écran n'est pas une information de
 * chantier. Le trafic se lit **agrégé**, par la console et par elle seule.
 */
test("une venue ne se lit que par celui qu'elle compte", { skip: sansPostgres }, () => {
  desVenues();

  const lesSiennes = banc.enTantQue(A, "select count(*) from public.venues;");
  assert.equal(lesSiennes.ok, true, lesSiennes.motif);
  // A en a trois : il ne voit pas celle de B.
  assert.equal(lesSiennes.sortie.trim(), "3", lesSiennes.sortie);

  const celleDeB = banc.enTantQue(A,
    `select count(*) from public.venues where owner_id = '${B}';`);
  assert.equal(celleDeB.sortie.trim(), "0", "on lit la présence de quelqu'un d'autre");

  const anonyme = banc.sansCompte("select count(*) from public.venues;");
  assert.ok(!anonyme.ok || anonyme.sortie.trim() === "0",
    "la clé publique lit des venues");
});

/**
 * **Chacun efface les siennes, et c'est voulu.**
 *
 * Le droit à l'effacement rendu réel plutôt qu'écrit dans une politique : la
 * mesure de ma présence m'appartient. Le prix est que le trafic est diminuable
 * par ceux qu'il compte, et c'est le bon prix.
 */
test("chacun peut effacer ses propres venues, et seulement elles",
  { skip: sansPostgres }, () => {
    desVenues();

    const avant = Number(banc.sql("select count(*) from public.venues;").sortie.trim());
    const efface = banc.enTantQue(A, "delete from public.venues;");
    assert.equal(efface.ok, true, efface.motif);

    // Celle de B est toujours là : A n'a effacé que les siennes.
    const reste = Number(banc.sql("select count(*) from public.venues;").sortie.trim());
    assert.equal(reste, 1, `${avant} venues, ${reste} après l'effacement de A`);
    assert.equal(banc.sql(
      `select count(*) from public.venues where owner_id = '${B}';`).sortie.trim(), "1");
  });

/**
 * **La base borne ce que le navigateur déclare.**
 *
 * Il envoie un nombre, donc il peut envoyer n'importe lequel : un onglet
 * réveillé après une heure de veille déclarerait une heure d'un coup, et le
 * « temps moyen d'utilisation » monterait d'une heure sans que personne n'ait
 * travaillé une minute (règle 12).
 */
test("un battement ne peut pas déclarer plus de cinq minutes",
  { skip: sansPostgres }, () => {
    desVenues();

    const sienne = banc.sql(
      `insert into public.venues (owner_id, secondes_actives) values ('${A}', 0)
       returning id;`).sortie.trim();

    // Une heure déclarée d'un coup : la base n'en prend que trois cents secondes.
    const triche = banc.enTantQue(A,
      `select public.prolonger_une_venue('${sienne}', 3600);`);
    assert.equal(triche.ok, true, triche.motif);
    assert.equal(
      banc.sql(`select secondes_actives from public.venues where id = '${sienne}';`)
        .sortie.trim(),
      "300", "la borne du battement ne tient pas");

    /**
     * **Un battement négatif n'enlève rien, et n'échoue pas.**
     *
     * La contrainte `check` empêcherait de toute façon un total négatif — mais
     * elle le ferait en **levant**, et la fonction rendrait alors `null` : le
     * navigateur en conclurait que sa venue n'est plus à lui et en ouvrirait une
     * neuve. Une venue fragmentée à chaque horloge qui recule, pour rien.
     *
     * Ce qu'on mesure est donc que l'appel **aboutit** et rend un instant, pas
     * seulement que le total n'a pas bougé.
     */
    const negatif = banc.enTantQue(A, `select public.prolonger_une_venue('${sienne}', -1000);`);
    assert.equal(negatif.ok, true, `un battement négatif lève : ${negatif.motif}`);
    assert.notEqual(negatif.sortie.trim(), "",
      "un battement négatif rend « rien » : le navigateur ouvrirait une venue de plus");
    assert.equal(
      banc.sql(`select secondes_actives from public.venues where id = '${sienne}';`)
        .sortie.trim(),
      "300", "un battement négatif retire du temps");

    // Et l'ajout s'accumule : deux battements normaux font deux minutes.
    banc.enTantQue(A, `select public.prolonger_une_venue('${sienne}', 60);`);
    banc.enTantQue(A, `select public.prolonger_une_venue('${sienne}', 60);`);
    assert.equal(
      banc.sql(`select secondes_actives from public.venues where id = '${sienne}';`)
        .sortie.trim(),
      "420", "les battements ne s'ajoutent pas");
  });

/**
 * **Prolonger la venue d'un autre ne fait rien, et le dit.**
 *
 * `null` plutôt qu'une erreur : le navigateur en ouvre alors une neuve plutôt
 * que de battre dans le vide. Une erreur l'aurait fait renoncer, et la venue
 * suivante n'aurait jamais été comptée (règle 5).
 */
test("prolonger la venue d'un autre ne touche à rien", { skip: sansPostgres }, () => {
  desVenues();

  const celleDeB = banc.sql(
    `select id from public.venues where owner_id = '${B}' limit 1;`).sortie.trim();
  const avant = banc.sql(
    `select secondes_actives from public.venues where id = '${celleDeB}';`).sortie.trim();

  const essai = banc.enTantQue(A, `select public.prolonger_une_venue('${celleDeB}', 300);`);
  assert.equal(essai.ok, true, essai.motif);
  // Elle rend `null` — rien n'a bougé, et c'est l'information.
  assert.equal(essai.sortie.trim(), "", `elle rend « ${essai.sortie.trim()} » au lieu de rien`);

  assert.equal(
    banc.sql(`select secondes_actives from public.venues where id = '${celleDeB}';`)
      .sortie.trim(),
    avant, "le temps de quelqu'un d'autre a bougé");
});

/**
 * **Dix venues d'une personne ne font pas dix personnes.**
 *
 * C'est le chiffre qu'on croit lire sur un trafic, et c'est celui qui décide
 * d'un tarif. Les rendre fondus aurait donné un produit dix fois plus fréquenté
 * qu'il ne l'est.
 */
test("le trafic distingue les venues des comptes", { skip: sansPostgres }, () => {
  desVenues();

  const lu = banc.sousLadresse("patron@mdall.example",
    "select venues, comptes, secondes_actives from public.le_trafic_de_mdall("
    + "(now() - interval '2 days')::date, now()::date, 'day');");
  assert.equal(lu.ok, true, lu.motif);

  // Trois venues hier, deux comptes. Et 2100 + 240 + 700 secondes.
  assert.equal(leChamp(lu.sortie, 0), "3", lu.sortie);
  assert.equal(leChamp(lu.sortie, 1), "2",
    `les venues sont comptées comme des personnes : ${lu.sortie}`);
  assert.equal(leChamp(lu.sortie, 2), "3040", lu.sortie);

  // La venue d'il y a deux ans n'est pas dans la fenêtre.
  const lignes = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
  assert.equal(lignes.length, 1, `la fenêtre déborde : ${lignes.join(" | ")}`);
});

/**
 * **La médiane et le maximum, parce que la moyenne recouvre deux usages.**
 *
 * Vingt visites d'une minute et une d'une heure donnent la même moyenne qu'une
 * poignée de sessions de travail — et ce ne sont pas les mêmes gens.
 */
test("le trafic rend la médiane et le plus long, pas seulement la somme",
  { skip: sansPostgres }, () => {
    desVenues();

    const lu = banc.sousLadresse("patron@mdall.example",
      "select secondes_medianes, secondes_maximum from public.le_trafic_de_mdall("
      + "(now() - interval '2 days')::date, now()::date, 'day');");
    assert.equal(lu.ok, true, lu.motif);

    // 240, 700, 2100 : médiane 700, maximum 2100.
    assert.equal(leChamp(lu.sortie, 0), "700", lu.sortie);
    assert.equal(leChamp(lu.sortie, 1), "2100",
      `le plus long n'est pas rendu : ${lu.sortie}`);
  });

/** La borne de fin est incluse : un trafic qui s'arrête la veille est faux. */
test("la dernière journée de la fenêtre compte", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;
    delete from public.venues;
    insert into public.venues (owner_id, commencee_le, vue_le, secondes_actives)
      values ('${A}', now(), now(), 120);`);

  const lu = banc.sousLadresse("patron@mdall.example",
    "select venues from public.le_trafic_de_mdall(now()::date, now()::date, 'day');");
  assert.equal(lu.ok, true, lu.motif);
  assert.equal(lu.sortie.trim(), "1", "la venue du dernier jour disparaît");
});

/** Trois pas, et pas un de plus : l'axe du JavaScript n'en dessine pas d'autre. */
test("le trafic refuse un pas que l'écran ne sait pas dessiner",
  { skip: sansPostgres }, () => {
    desVenues();

    for (const pas of ["week", "quarter", "millennium"]) {
      const essai = banc.sousLadresse("patron@mdall.example",
        `select count(*) from public.le_trafic_de_mdall('2026-01-01', '2026-12-31', '${pas}');`);
      assert.equal(essai.ok, false, `le pas « ${pas} » est passé`);
      assert.match(essai.motif, /pas inconnu/);
    }

    for (const pas of ["day", "month", "year"]) {
      const essai = banc.sousLadresse("patron@mdall.example",
        `select count(*) from public.le_trafic_de_mdall('2026-01-01', '2026-12-31', '${pas}');`);
      assert.equal(essai.ok, true, `${pas} : ${essai.motif}`);
    }
  });

/** La porte de la console tient sur le trafic comme sur le reste. */
test("le trafic se refuse à qui n'est pas administrateur", { skip: sansPostgres }, () => {
  desVenues();

  const etranger = banc.sousLadresse("quelquun@ailleurs.example",
    "select count(*) from public.le_trafic_de_mdall('2026-01-01', '2026-12-31', 'day');");
  assert.equal(etranger.ok, false, "le trafic s'ouvre à un étranger");

  const sansJeton = banc.sansCompte(
    "select count(*) from public.le_trafic_de_mdall('2026-01-01', '2026-12-31', 'day');");
  assert.equal(sansJeton.ok, false, "le trafic s'ouvre à la clé publique");

  // Et la purge aussi : elle efface, c'est le geste le plus dangereux de la console.
  const purge = banc.sousLadresse("quelquun@ailleurs.example",
    "select public.effacer_les_vieilles_venues();");
  assert.equal(purge.ok, false, "n'importe qui peut effacer les venues");
});

/**
 * **La conservation est de treize mois, et la purge n'emporte rien d'autre.**
 *
 * Treize pour comparer un mois à celui de l'an passé. Une purge qui prendrait
 * aussi le mois d'il y a douze effacerait la seule chose que la durée existe
 * pour permettre.
 */
test("la purge n'emporte que ce qui dépasse treize mois", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;
    delete from public.venues;
    insert into public.venues (owner_id, commencee_le, vue_le) values
      ('${A}', now() - interval '14 months', now() - interval '14 months'),
      ('${A}', now() - interval '2 years', now() - interval '2 years'),
      -- Douze mois : dans la durée, et c'est celle-là qu'on garde pour comparer.
      ('${A}', now() - interval '12 months', now() - interval '12 months'),
      ('${A}', now(), now());`);

  const purge = banc.sousLadresse("patron@mdall.example",
    "select public.effacer_les_vieilles_venues();");
  assert.equal(purge.ok, true, purge.motif);
  assert.equal(purge.sortie.trim(), "2", `elle a effacé ${purge.sortie.trim()} lignes`);

  assert.equal(banc.sql("select count(*) from public.venues;").sortie.trim(), "2");
  assert.equal(
    banc.sql("select count(*) from public.venues "
      + "where commencee_le < now() - interval '13 months';").sortie.trim(),
    "0", "une venue de plus de treize mois a survécu");
});

/**
 * **Une venue ne porte aucun contenu, et la table n'en a pas la place.**
 *
 * C'est la garantie de structure : « qui a passé combien de temps sur quel
 * chantier » serait utile et serait un journal de navigation. Quatre colonnes,
 * et aucune ne peut porter un écran, un projet ni un document.
 */
test("la table des venues n'a aucune colonne où du contenu tiendrait",
  { skip: sansPostgres }, () => {
    const colonnes = banc.sql(
      "select column_name from information_schema.columns "
      + "where table_schema = 'public' and table_name = 'venues' order by 1;")
      .sortie.split("\n").map((une) => une.trim()).filter(Boolean);

    assert.deepEqual(colonnes,
      ["commencee_le", "id", "owner_id", "secondes_actives", "vue_le"],
      `la table des venues a changé de forme : ${colonnes.join(", ")}`);
  });

/* ── Les mesures de justesse ──────────────────────────────────────────────── */

/**
 * **La console ne lit pas un contenu de chantier, et cette table ne peut pas en
 * porter.**
 *
 * `bilan_sans_contenu` est la promesse tenue par la structure. Une promesse de
 * ce genre ne se relit pas — elle s'essaie : on tente d'y poser le bilan le plus
 * utile que ces outils produisent, « RICT-03 a manqué l'avis A-23 », et la base
 * doit le refuser.
 */
test("un bilan qui nomme un document est refusé par la base",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);

    for (const [quoi, bilan] of [
      ["un document nommé", `'{"document": "RICT-03.pdf"}'`],
      ["une citation", `'{"citations": ["est conforme a l instruction"]}'`],
      ["des relevés manqués", `'{"manques": ["a 23"]}'`],
      ["des pièges tombés", `'{"piegesTombes": ["la legende prise pour des avis"]}'`],
      ["des écarts nominatifs", `'{"ecarts": ["a 07 : marque F vers D"]}'`],
      ["un chantier", `'{"project_id": "${MEDIATHEQUE}"}'`]
    ]) {
      const pose = banc.sousLadresse("patron@mdall.example",
        `insert into public.mesures_de_justesse (quoi, bilan) values ('derive', ${bilan});`);
      assert.equal(pose.ok, false, `« ${quoi} » entre dans la console`);
      assert.match(pose.motif, /bilan_sans_contenu/,
        `« ${quoi} » est refusé pour une autre raison que la contrainte`);
    }
  });

/** Et des comptes passent : la contrainte refuse le contenu, pas la mesure. */
test("un bilan qui ne porte que des nombres se dépose",
  { skip: sansPostgres }, () => {
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);
    banc.sql("delete from public.mesures_de_justesse;");

    const pose = banc.sousLadresse("patron@mdall.example",
      "insert into public.mesures_de_justesse (quoi, procede, combien, bilan) values "
      + `('jeu_de_reference', 'modele A · v2', 9, '{"rappel": 0.94, "precision": 0.97}');`);
    assert.equal(pose.ok, true, pose.motif);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select quoi, procede, combien from public.mesures_de_justesse;");
    assert.match(lu.sortie, /jeu_de_reference\s*\|\s*modele A · v2\s*\|\s*9/);
  });

/**
 * **Un outil qu'on n'a pas écrit ne dépose pas.** Une valeur inconnue dans
 * `quoi` serait une ligne que l'écran ne saurait pas nommer — et qu'il
 * afficherait quand même, sous un libellé vide (règle 5).
 */
test("un outil de mesure inconnu ne dépose pas", { skip: sansPostgres }, () => {
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;`);

  const pose = banc.sousLadresse("patron@mdall.example",
    "insert into public.mesures_de_justesse (quoi) values ('un_outil_quon_na_pas_ecrit');");
  assert.equal(pose.ok, false, "n'importe quel outil dépose dans la console");
});

/**
 * **La porte, des deux côtés.** Ouvrir la lecture à tous ferait d'un taux
 * d'erreur interne une information publique du produit ; ouvrir l'écriture
 * laisserait n'importe qui choisir les chiffres de la console.
 */
test("les mesures se refusent à qui n'est pas administrateur",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.mesures_de_justesse;");
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);
    banc.sousLadresse("patron@mdall.example",
      "insert into public.mesures_de_justesse (quoi, combien) values ('derive', 3);");

    const lu = banc.sousLadresse("quelquun@ailleurs.example",
      "select count(*) from public.mesures_de_justesse;");
    assert.equal(lu.sortie.trim(), "0", "un compte ordinaire lit les mesures de la console");

    const pose = banc.sousLadresse("quelquun@ailleurs.example",
      "insert into public.mesures_de_justesse (quoi, combien) values ('derive', 99);");
    assert.equal(pose.ok, false, "un compte ordinaire dépose une mesure");
  });

/**
 * **Une mesure qui a eu lieu ne devient pas fausse** (règle 6). Ni mise à jour,
 * ni effacement : aucune politique ne les ouvre, et une table sous RLS sans
 * politique pour un verbe le refuse à tous. Une suite dont on retire les
 * mauvais points n'est plus une suite.
 */
test("une mesure déposée ne se corrige ni ne s'efface",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.mesures_de_justesse;");
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);
    banc.sousLadresse("patron@mdall.example",
      "insert into public.mesures_de_justesse (quoi, combien) values ('derive', 3);");

    banc.sousLadresse("patron@mdall.example",
      "update public.mesures_de_justesse set combien = 0;");
    banc.sousLadresse("patron@mdall.example", "delete from public.mesures_de_justesse;");

    const reste = banc.sousLadresse("patron@mdall.example",
      "select combien from public.mesures_de_justesse;");
    assert.equal(reste.sortie.trim(), "3",
      "un administrateur réécrit ou efface une mesure : il choisirait ses résultats");
  });

/** La purge existe, elle est réservée, et **rien ne l'appelle** (règle 12). */
test("la purge des vieilles mesures est réservée à l'administrateur",
  { skip: sansPostgres }, () => {
    const etranger = banc.sousLadresse("quelquun@ailleurs.example",
      "select public.effacer_les_vieilles_mesures();");
    assert.equal(etranger.ok, false, "n'importe qui purge les mesures");

    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);
    const purge = banc.sousLadresse("patron@mdall.example",
      "select public.effacer_les_vieilles_mesures();");
    assert.equal(purge.ok, true, purge.motif);
  });

/* ── Déposer une mesure : ce que la fonction laisse passer ─────────────────── */

/**
 * **La contrainte ne regarde que les noms de clés** — c'est sa limite, et c'est
 * pour cela que `deposer_une_mesure` existe.
 *
 * `{"tombees": "RICT-03 a manqué l'avis A-23"}` passe `bilan_sans_contenu` sans
 * la moindre difficulté : `tombees` n'est pas un nom interdit. La phrase est
 * pourtant exactement ce que la console ne doit pas porter. La fonction ne garde
 * donc d'une clé permise que ce qui est **un nombre**, et c'est la deuxième
 * serrure sur la même porte — la première ferme les noms, la seconde les types.
 */
test("une phrase rangée sous une clé permise n'entre pas dans la console",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.mesures_de_justesse;");
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);

    // La preuve que la contrainte, seule, la laisserait entrer.
    const brut = banc.sousLadresse("patron@mdall.example",
      `insert into public.mesures_de_justesse (quoi, bilan) values
       ('perturbations', '{"tombees": "RICT-03 a manqué l avis A-23"}');`);
    assert.equal(brut.ok, true,
      "la contrainte refuse déjà une phrase sous une clé permise : la fonction "
      + "ne serait alors la serrure de rien");

    banc.sql("delete from public.mesures_de_justesse;");

    const pose = banc.sousLadresse("patron@mdall.example",
      `select public.deposer_une_mesure('perturbations', 'modele A · v2', 6,
         '{"tombees": "RICT-03 a manqué l avis A-23", "epreuves": 6}');`);
    assert.equal(pose.ok, true, pose.motif);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select bilan::text from public.mesures_de_justesse;");
    assert.match(lu.sortie, /"epreuves":\s*6/, "l'assiette n'a pas été gardée");
    assert.doesNotMatch(lu.sortie, /RICT-03|A-23/,
      "une phrase est entrée dans la console par une clé permise");
  });

/**
 * **Une clé qu'aucun outil n'a déclarée ne traverse pas**, même si elle porte un
 * nombre. Un outil qui ajoute un chiffre en ajoute un à l'écran, et l'écran
 * l'afficherait sans savoir ce qu'il mesure (règle 5) : passer par une migration
 * est le prix d'une relecture.
 */
test("une clé non déclarée est jetée, même si c'est un nombre",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.mesures_de_justesse;");
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);

    banc.sousLadresse("patron@mdall.example",
      `select public.deposer_une_mesure('derive', '', 4,
         '{"derives": 1, "unChiffreQuePersonneNaDeclare": 42}');`);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select bilan::text from public.mesures_de_justesse;");
    assert.match(lu.sortie, /"derives":\s*1/);
    assert.doesNotMatch(lu.sortie, /unChiffreQuePersonneNaDeclare|42/,
      "un outil ajoute un chiffre à la console sans passer par une migration");
  });

/**
 * **`etapes` est le seul objet admis**, et c'est ce qui interdit au jeu de
 * référence de rendre un score unique : un nombre par étape, et l'écran ne peut
 * pas les fondre puisqu'il ne reçoit jamais leur somme.
 *
 * Ses valeurs sont filtrées comme les autres : une étape dont le chiffre est une
 * phrase disparaît, l'étape avec.
 */
test("les étapes passent une par une, et seulement en nombres",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.mesures_de_justesse;");
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);

    banc.sousLadresse("patron@mdall.example",
      `select public.deposer_une_mesure('jeu_de_reference', 'modele A · v2', 2,
         '{"etapes": {"forme": 1.0, "releves": 0.86, "quoiRate": "l avis A-23"}}');`);

    const lu = banc.sousLadresse("patron@mdall.example",
      "select bilan::text from public.mesures_de_justesse;");
    assert.match(lu.sortie, /"forme":\s*1\.0/);
    assert.match(lu.sortie, /"releves":\s*0\.86/);
    assert.doesNotMatch(lu.sortie, /A-23|quoiRate/,
      "une phrase est entrée par une étape du jeu de référence");
  });

/** Le dépôt est un geste d'administration : il se refuse, et il se journalise. */
test("déposer une mesure se refuse aux autres, et laisse une ligne",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.mesures_de_justesse;");
    banc.sql("delete from public.acces_administrateurs;");
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);

    const etranger = banc.sousLadresse("quelquun@ailleurs.example",
      "select public.deposer_une_mesure('derive', '', 1, '{}');");
    assert.equal(etranger.ok, false, "n'importe qui dépose une mesure dans la console");

    banc.sousLadresse("patron@mdall.example",
      "select public.deposer_une_mesure('derive', '', 1, '{\"derives\": 0}');");

    const journal = banc.sql("select page from public.acces_administrateurs;");
    assert.match(journal.sortie, /justesse\/depot/,
      "un dépôt de mesure ne laisse aucune trace");
    assert.doesNotMatch(journal.sortie, /quelquun@ailleurs/,
      "un refus s'est journalisé : le journal compterait des accès qui n'ont pas eu lieu");
  });

/* ── Relire la justesse ───────────────────────────────────────────────────── */

/**
 * **Le rang est posé par outil ET par procédé.**
 *
 * Sans le procédé dans la partition, le dernier bilan d'un procédé qu'on
 * n'emploie plus se serait trouvé au rang 2, donc rangé dans « l'histoire » :
 * l'écran aurait montré la justesse du procédé en service et celle de l'ancien
 * dans la même colonne, en présentant la plus récente des deux comme l'état du
 * système. C'est précisément la confusion que la dérive existe pour trancher.
 */
test("le dernier bilan de chaque procédé est au rang 1", { skip: sansPostgres }, () => {
  banc.sql("delete from public.mesures_de_justesse;");
  banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
            on conflict do nothing;`);

  for (const [procede, quand, combien] of [
    ["modele A · v1", "2026-01-01", 4],
    ["modele A · v1", "2026-02-01", 5],
    ["modele A · v2", "2026-03-01", 6]
  ]) {
    banc.sql(
      "insert into public.mesures_de_justesse (owner_id, quoi, procede, quand, combien) values "
      + `('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'perturbations', '${procede}', `
      + `'${quand}'::timestamptz, ${combien});`);
  }

  const lu = banc.sousLadresse("patron@mdall.example",
    "select procede, combien, rang from public.la_justesse_des_analyses(60) order by rang, procede;");

  // Deux au rang 1 : un par procédé. Le v1 de janvier est au rang 2.
  const lignes = lu.sortie.split("\n").map((une) => une.trim()).filter(Boolean);
  const premiers = lignes.filter((une) => une.endsWith("|1"));
  assert.equal(premiers.length, 2, `deux procédés, deux rangs 1 — lu :\n${lu.sortie}`);
  assert.ok(premiers.some((une) => une.startsWith("modele A · v1|5")),
    "le dernier bilan du procédé retiré n'est pas au rang 1");
  assert.ok(premiers.some((une) => une.startsWith("modele A · v2|6")),
    "le dernier bilan du procédé en service n'est pas au rang 1");
});

/** La lecture se garde par la porte, et s'inscrit au journal comme les autres. */
test("relire la justesse se refuse aux autres, et laisse une ligne",
  { skip: sansPostgres }, () => {
    banc.sql("delete from public.acces_administrateurs;");
    banc.sql(`insert into public.administrateurs (courriel) values ('patron@mdall.example')
              on conflict do nothing;`);

    const etranger = banc.sousLadresse("quelquun@ailleurs.example",
      "select count(*) from public.la_justesse_des_analyses(60);");
    assert.equal(etranger.ok, false, "un compte ordinaire lit la justesse de Mdall");

    banc.sousLadresse("patron@mdall.example",
      "select count(*) from public.la_justesse_des_analyses(60);");

    const journal = banc.sql("select page from public.acces_administrateurs;");
    assert.match(journal.sortie, /exploitation\/justesse/,
      "lire la justesse ne laisse aucune trace");
  });
