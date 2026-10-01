-- Le socle : ce que Supabase fournit, réduit à ce que l'épreuve touche.
--
-- Il porte **les politiques telles qu'elles sont en base avant la migration** :
-- la porte ouverte posée à l'initialisation, et la règle du propriétaire posée
-- à côté d'elle en mai. C'est tout l'intérêt du banc — sans les deux, on
-- n'éprouve pas ce qui s'est réellement passé.
--
-- Il n'est pas la base : il n'a que les tables que la migration nomme, et leurs
-- colonnes utiles. Recopier le schéma entier l'aurait fait diverger du vrai dès
-- la migration suivante (règle 4), et personne ne l'aurait su.

create schema if not exists auth;
create extension if not exists pgcrypto;

create table if not exists auth.users (id uuid primary key default gen_random_uuid());
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  owner_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid references auth.users(id),
  deposant uuid references auth.users(id),
  folder_id uuid,
  storage_bucket text,
  storage_path text,
  mail_de text,
  -- **La proposition qui a fait entrer ce document en mémoire.** C'est par elle
  -- que `202611110001_...` décide de sa visibilité : sans la colonne, la règle
  -- ne se déploie pas, et sans elle dans le socle on ne l'éprouve pas.
  proposition_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- **L'identité telle qu'un jeton la porte.** `est_administrateur()` lit
-- l'adresse dans le jeton, pas l'identifiant : c'est par elle qu'on ouvre la
-- console. Sans cette fonction, la porte ne peut pas être éprouvée du tout.
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb)
$$;

create table if not exists public.administrateurs (
  courriel text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.project_assertions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  domain text,
  nature text,
  -- Ce que l'affirmation dit, en français : la matière dont les sujets
  -- techniques sont extraits.
  statement text not null default '',
  -- **Le contenu brut, tel que la revue le portait.** Un tiers des `statement`
  -- en base sont un repli fautif qui ne nomme qu'une clé mdall ; la vraie phrase
  -- est ici, et c'est elle que l'écran affiche. Les lectures la lisent aussi.
  payload jsonb,
  -- La clé métier, et d'où l'affirmation vient. Ce sont les colonnes de la
  -- table réelle (`202609020001_project_assertions.sql`), et elles sont ici
  -- parce que la répétition du corpus se mesure dessus : l'unicité porte sur
  -- (proposition, nature, sujet), et c'est de là que viennent les copies.
  kind text not null default 'avis',
  subject_key text not null default '',
  proposition_id uuid,
  -- Ce qui la remplace. L'affirmation remplacée reste en base (règle 6), et une
  -- lecture qui compte l'histoire comme le présent compte un sujet autant de
  -- fois qu'il a été tranché.
  superseded_by uuid references public.project_assertions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid references auth.users(id)
);

create table if not exists public.subject_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_user_id uuid references auth.users(id)
);

create table if not exists public.ct_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade
);

create table if not exists public.situations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id)
);

create table if not exists public.situation_subjects (
  id uuid primary key default gen_random_uuid(),
  situation_id uuid not null references public.situations(id) on delete cascade
);

create table if not exists public.project_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  geste text not null,
  owner_id uuid references auth.users(id) default auth.uid(),
  personnelle boolean not null default false,
  started_at timestamptz not null default now()
);

create table if not exists public.project_document_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_folder_id uuid references public.project_document_folders(id) on delete cascade,
  name text not null,
  prive boolean not null default false,
  created_by uuid references auth.users(id)
);

-- Les politiques telles qu'elles sont en base aujourd'hui : la porte ouverte
-- posée à l'initialisation, et la règle du propriétaire posée à côté.
alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_history enable row level security;
alter table public.ct_analysis_runs enable row level security;
alter table public.situations enable row level security;
alter table public.situation_subjects enable row level security;
alter table public.project_runs enable row level security;
alter table public.project_document_folders enable row level security;

create policy "projects_open_all" on public.projects for all to public using (true) with check (true);
create policy "documents_open_all" on public.documents for all to public using (true) with check (true);
create policy "subjects_open_all" on public.subjects for all to public using (true) with check (true);
create policy "subject_history_open_all" on public.subject_history for all to public using (true) with check (true);
create policy "ct_analysis_runs_open_all" on public.ct_analysis_runs for all to public using (true) with check (true);
create policy "situations_open_all" on public.situations for all to public using (true) with check (true);
create policy "situation_subjects_open_all" on public.situation_subjects for all to public using (true) with check (true);
create policy "project_runs_open_all" on public.project_runs for all to public using (true) with check (true);

create policy projects_owner_only on public.projects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy documents_by_project on public.documents for all
  using (project_id in (select id from public.projects where owner_id = auth.uid()))
  with check (project_id in (select id from public.projects where owner_id = auth.uid()));
create policy subjects_by_project on public.subjects for all
  using (project_id in (select id from public.projects where owner_id = auth.uid()))
  with check (project_id in (select id from public.projects where owner_id = auth.uid()));
create policy history_by_project on public.subject_history for all
  using (project_id in (select id from public.projects where owner_id = auth.uid()));
create policy project_document_folders_by_project on public.project_document_folders for all
  using (project_id in (select p.id from public.projects p where p.owner_id = auth.uid()))
  with check (project_id in (select p.id from public.projects p where p.owner_id = auth.uid()));
create policy project_runs_by_project on public.project_runs for all to public
  using (project_id in (select p.id from public.projects p where p.owner_id = auth.uid())
         and (personnelle = false or owner_id = auth.uid()))
  with check (project_id in (select p.id from public.projects p where p.owner_id = auth.uid())
              and (personnelle = false or owner_id = auth.uid()));


create role anon;
create role authenticated;
grant usage on schema public, auth to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;

-- **Et sur les tables que les migrations vont créer.** Supabase pose ces droits
-- par défaut ; sans eux, une table neuve rend « permission denied » — un refus
-- de *droit de table*, qui n'a rien à voir avec la politique qu'on éprouve, et
-- que l'on prendrait pour elle.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

-- ── Les vingt-six tables restées ouvertes, et la porte qu'elles portaient ──
--
-- Réduites à ce que la politique touche : leur clé, et ce par quoi elles
-- tiennent à un projet. Recopier leurs colonnes entières les ferait diverger du
-- vrai dès la migration suivante (règle 4).
--
-- **Avec leur porte**, sans quoi on n'éprouverait pas la fermeture : une
-- migration qui supprime une politique inexistante réussit sans rien faire.
create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.analysis_runs enable row level security;
create policy "analysis_runs_open_all" on public.analysis_runs
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.assertion_acts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.assertion_acts enable row level security;
create policy "assertion_acts_open_all" on public.assertion_acts
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.assertion_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.assertion_applications enable row level security;
create policy "assertion_applications_open_all" on public.assertion_applications
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.assertion_dependencies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.assertion_dependencies enable row level security;
create policy "assertion_dependencies_open_all" on public.assertion_dependencies
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.avis_figures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.avis_figures enable row level security;
create policy "avis_figures_open_all" on public.avis_figures
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.ct_avis (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.ct_avis enable row level security;
create policy "ct_avis_open_all" on public.ct_avis
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.milestones enable row level security;
create policy "milestones_open_all" on public.milestones
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.project_assertions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  statement text not null default ''
);
alter table public.project_assertions enable row level security;
create policy "project_assertions_open_all" on public.project_assertions
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.project_collaborators (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  person_id uuid
);
alter table public.project_collaborators enable row level security;
create policy "project_collaborators_open_all" on public.project_collaborators
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.project_identity_markers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.project_identity_markers enable row level security;
create policy "project_identity_markers_open_all" on public.project_identity_markers
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.project_labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.project_labels enable row level security;
create policy "project_labels_open_all" on public.project_labels
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.project_lots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.project_lots enable row level security;
create policy "project_lots_open_all" on public.project_lots
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.proposition_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.proposition_comments enable row level security;
create policy "proposition_comments_open_all" on public.proposition_comments
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.proposition_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.proposition_items enable row level security;
create policy "proposition_items_open_all" on public.proposition_items
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.proposition_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.proposition_notes enable row level security;
create policy "proposition_notes_open_all" on public.proposition_notes
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.propositions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.propositions enable row level security;
create policy "propositions_open_all" on public.propositions
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.subject_assertion_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.subject_assertion_links enable row level security;
create policy "subject_assertion_links_open_all" on public.subject_assertion_links
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.subject_assignees (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  person_id uuid
);
alter table public.subject_assignees enable row level security;
create policy "subject_assignees_open_all" on public.subject_assignees
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.subject_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.subject_evidence enable row level security;
create policy "subject_evidence_open_all" on public.subject_evidence
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.subject_labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.subject_labels enable row level security;
create policy "subject_labels_open_all" on public.subject_labels
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.subject_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.subject_links enable row level security;
create policy "subject_links_open_all" on public.subject_links
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.subject_observations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade
);
alter table public.subject_observations enable row level security;
create policy "subject_observations_open_all" on public.subject_observations
  for all to anon, authenticated using (true) with check (true);
create table if not exists public.milestone_subjects (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid references public.milestones(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade
);
alter table public.milestone_subjects enable row level security;
create policy "milestone_subjects_open_all" on public.milestone_subjects
  for all to anon, authenticated using (true) with check (true);

create table if not exists public.subject_cr_mentions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references public.subjects(id) on delete cascade
);
alter table public.subject_cr_mentions enable row level security;
create policy "subject_cr_mentions_open_all" on public.subject_cr_mentions
  for all to anon, authenticated using (true) with check (true);

create table if not exists public.lot_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null default ''
);
alter table public.lot_catalog enable row level security;
create policy "lot_catalog_open_all" on public.lot_catalog
  for all to anon, authenticated using (true) with check (true);

create table if not exists public.directory_people (
  id uuid primary key default gen_random_uuid(),
  email text not null default '',
  -- Générée et **unique sur toute la table** : c'est cette contrainte qui
  -- empêchait de fermer la lecture, et que la migration remplace.
  email_normalized text generated always as (lower(btrim(email))) stored,
  linked_user_id uuid references auth.users(id),
  created_by_user_id uuid references auth.users(id),
  constraint directory_people_email_normalized_unique unique (email_normalized)
);
alter table public.directory_people enable row level security;
create policy "directory_people_open_all" on public.directory_people
  for all to anon, authenticated using (true) with check (true);

-- La vue des collaborateurs, telle qu'elle est : **sans `security_invoker`**.
-- C'est tout l'objet de l'épreuve — une vue ordinaire lit ses tables de base
-- avec les droits de son propriétaire, et ignore leurs politiques.
create or replace view public.project_collaborators_view as
select pc.id, pc.project_id, dp.email
  from public.project_collaborators pc
  join public.directory_people dp on dp.id = pc.person_id;


-- ── Le casier, tel que Supabase le pose ────────────────────────────────────
--
-- `storage.objects` et `storage.foldername` : le banc en a besoin pour éprouver
-- la règle de lecture des octets. Sans eux, on relirait la politique au lieu de
-- l'essayer — et c'est précisément en la relisant qu'on a cru qu'elle tenait.

create schema if not exists storage;

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  owner uuid
);

-- La vraie rend les dossiers du chemin, sans le nom du fichier.
create or replace function storage.foldername(name text)
returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;

alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant all on storage.objects to authenticated;

-- La règle d'octobre, avant la migration qu'on éprouve.
drop policy if exists storage_documents_select on storage.objects;
create policy storage_documents_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1 from public.documents d
    where d.storage_bucket = storage.objects.bucket_id
      and d.storage_path = storage.objects.name
      and d.deleted_at is null
  )
);
