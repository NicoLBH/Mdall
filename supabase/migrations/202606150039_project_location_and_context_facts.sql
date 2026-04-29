-- Étape 1: Persistance robuste de la localisation projet et miroir de contexte enrichi.
-- Cette migration ajoute:
-- 1) des colonnes de localisation « classique » dans public.projects,
-- 2) une table dédiée public.project_context_facts qui joue le rôle de miroir enrichi
--    du contexte projet, alimenté progressivement par la Localisation, l'Atelier,
--    l'extraction PDF, les messages et les sujets.

alter table if exists public.projects
  add column if not exists address text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists altitude double precision,
  add column if not exists code_insee text;

create table if not exists public.project_context_facts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  fact_key text not null,
  fact_value jsonb not null default '{}'::jsonb,
  source_type text not null default 'manual',
  source_ref text,
  confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.project_context_facts is
  'Miroir enrichi du contexte projet (adresse, zones sismiques/neige/vent/gel, risques, étages, etc.), alimenté progressivement par Localisation, Atelier, extraction PDF, messages et sujets.';

comment on column public.project_context_facts.fact_key is
  'Clé métier normalisée (ex: address, seismic_zone, snow_zone, wind_zone, frost_depth, floors_count, natural_risks).';

comment on column public.project_context_facts.fact_value is
  'Valeur enrichie en JSONB pouvant évoluer selon la source et la maturité des données.';

comment on column public.project_context_facts.source_type is
  'Origine de la donnée (manual, studio, pdf_extraction, message, subject_description, georisques, etc.).';

create index if not exists idx_project_context_facts_project_id
  on public.project_context_facts(project_id);

create index if not exists idx_project_context_facts_fact_key
  on public.project_context_facts(fact_key);

create index if not exists idx_project_context_facts_source_type
  on public.project_context_facts(source_type);

create unique index if not exists ux_project_context_facts_project_key_source_ref
  on public.project_context_facts(project_id, fact_key, source_type, coalesce(source_ref, ''));

alter table if exists public.project_context_facts enable row level security;

drop trigger if exists trg_project_context_facts_updated_at on public.project_context_facts;
create trigger trg_project_context_facts_updated_at
before update on public.project_context_facts
for each row execute function public.set_updated_at();

-- Lecture: propriétaires + collaborateurs actifs (par user direct ou via directory_people lié).
drop policy if exists project_context_facts_select_project_members on public.project_context_facts;
create policy project_context_facts_select_project_members
on public.project_context_facts
for select
to authenticated
using (
  project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
  or project_id in (
    select pc.project_id
    from public.project_collaborators pc
    left join public.directory_people dp on dp.id = pc.person_id
    where pc.status = 'Actif'
      and (
        pc.collaborator_user_id = auth.uid()
        or dp.linked_user_id = auth.uid()
      )
  )
);

-- Écriture: uniquement les acteurs pouvant modifier le projet (modèle actuel: propriétaire).
drop policy if exists project_context_facts_insert_project_owner on public.project_context_facts;
create policy project_context_facts_insert_project_owner
on public.project_context_facts
for insert
to authenticated
with check (
  project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
);

drop policy if exists project_context_facts_update_project_owner on public.project_context_facts;
create policy project_context_facts_update_project_owner
on public.project_context_facts
for update
to authenticated
using (
  project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
)
with check (
  project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
);

drop policy if exists project_context_facts_delete_project_owner on public.project_context_facts;
create policy project_context_facts_delete_project_owner
on public.project_context_facts
for delete
to authenticated
using (
  project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
);
