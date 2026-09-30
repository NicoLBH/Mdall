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
  deleted_at timestamptz,
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

create role authenticated;
grant usage on schema public, auth to authenticated;
grant all on all tables in schema public to authenticated;

-- **Et sur les tables que les migrations vont créer.** Supabase pose ces droits
-- par défaut ; sans eux, une table neuve rend « permission denied » — un refus
-- de *droit de table*, qui n'a rien à voir avec la politique qu'on éprouve, et
-- que l'on prendrait pour elle.
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;

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
