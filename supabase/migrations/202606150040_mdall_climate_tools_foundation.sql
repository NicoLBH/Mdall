-- Étape 1: Socle Supabase des outils Mdall Atelier (Neige, Vent, Gel).
-- Objectifs:
-- 1) Héberger les référentiels climatiques côté base (hors bundle front).
-- 2) Conserver une table de résultats d'outils par projet.
-- 3) Activer RLS partout avec verrou strict des tables climatiques (pas de SELECT authenticated).

create table if not exists public.mdall_tool_definitions (
  tool_key text primary key,
  name text not null,
  category text not null default 'climate',
  is_active boolean not null default true,
  required_plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mdall_tool_definitions_tool_key_check
    check (tool_key in ('snow', 'wind', 'frost'))
);

comment on table public.mdall_tool_definitions is
  'Catalogue global des outils Mdall (au-dessus des projets/utilisateurs), ex: snow, wind, frost.';

comment on column public.mdall_tool_definitions.required_plan is
  'Niveau d’abonnement minimal requis (nullable pour activation progressive).';

create table if not exists public.mdall_climate_commune_cantons (
  id bigint generated always as identity primary key,
  insee_code text not null,
  canton_code_2014 text,
  canton_name_2014 text,
  canton_name_current text,
  canton_name_normalized text,
  department_code text,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mdall_climate_commune_cantons is
  'Correspondance commune -> canton pour la résolution climatique (source métier globale Mdall).';

create table if not exists public.mdall_climate_snow_departments (
  id bigint generated always as identity primary key,
  department_code text not null,
  resolved_zone text not null,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mdall_climate_snow_departments is
  'Zones neige par département (règle par défaut).';

create table if not exists public.mdall_climate_snow_canton_overrides (
  id bigint generated always as identity primary key,
  department_code text not null,
  canton_name text not null,
  canton_name_normalized text not null,
  resolved_zone text not null,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mdall_climate_snow_canton_overrides is
  'Surcharges cantonales de zone neige (prioritaires sur la règle départementale).';

create table if not exists public.mdall_climate_wind_departments (
  id bigint generated always as identity primary key,
  department_code text not null,
  resolved_zone text not null,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mdall_climate_wind_departments is
  'Zones vent par département (règle par défaut).';

create table if not exists public.mdall_climate_wind_canton_overrides (
  id bigint generated always as identity primary key,
  department_code text not null,
  canton_name text not null,
  canton_name_normalized text not null,
  resolved_zone text not null,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mdall_climate_wind_canton_overrides is
  'Surcharges cantonales de zone vent (prioritaires sur la règle départementale).';

create table if not exists public.mdall_climate_frost_departments (
  id bigint generated always as identity primary key,
  department_code text not null,
  h0_min_m numeric,
  h0_max_m numeric,
  h0_default_m numeric,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mdall_climate_frost_departments is
  'Profondeurs hors gel par département (H0), base de calcul de H = H0 + ((altitude - 150) / 4000).';

create table if not exists public.project_tool_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  tool_key text not null references public.mdall_tool_definitions(tool_key),
  input_signature text not null,
  input_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  markdown_summary text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_tool_results_tool_key_check
    check (tool_key in ('snow', 'wind', 'frost'))
);

comment on table public.project_tool_results is
  'Résultats persistés des outils Mdall par projet et signature d’entrée, réutilisables dans le Studio.';

-- Index métier demandés.
create index if not exists idx_project_tool_results_project_tool
  on public.project_tool_results(project_id, tool_key);

create unique index if not exists ux_project_tool_results_project_tool_signature
  on public.project_tool_results(project_id, tool_key, input_signature);

-- Index climatiques pour résolution performante.
create index if not exists idx_mdall_climate_commune_cantons_insee_code
  on public.mdall_climate_commune_cantons(insee_code);

create index if not exists idx_mdall_climate_commune_cantons_department_code
  on public.mdall_climate_commune_cantons(department_code);

create index if not exists idx_mdall_climate_commune_cantons_canton_name_normalized
  on public.mdall_climate_commune_cantons(canton_name_normalized);

create index if not exists idx_mdall_climate_snow_departments_department_code
  on public.mdall_climate_snow_departments(department_code);

create index if not exists idx_mdall_climate_snow_canton_overrides_department_code
  on public.mdall_climate_snow_canton_overrides(department_code);

create index if not exists idx_mdall_climate_snow_canton_overrides_canton_name_normalized
  on public.mdall_climate_snow_canton_overrides(canton_name_normalized);

create index if not exists idx_mdall_climate_wind_departments_department_code
  on public.mdall_climate_wind_departments(department_code);

create index if not exists idx_mdall_climate_wind_canton_overrides_department_code
  on public.mdall_climate_wind_canton_overrides(department_code);

create index if not exists idx_mdall_climate_wind_canton_overrides_canton_name_normalized
  on public.mdall_climate_wind_canton_overrides(canton_name_normalized);

create index if not exists idx_mdall_climate_frost_departments_department_code
  on public.mdall_climate_frost_departments(department_code);

-- Triggers updated_at.
drop trigger if exists trg_mdall_tool_definitions_updated_at on public.mdall_tool_definitions;
create trigger trg_mdall_tool_definitions_updated_at
before update on public.mdall_tool_definitions
for each row execute function public.set_updated_at();

drop trigger if exists trg_mdall_climate_commune_cantons_updated_at on public.mdall_climate_commune_cantons;
create trigger trg_mdall_climate_commune_cantons_updated_at
before update on public.mdall_climate_commune_cantons
for each row execute function public.set_updated_at();

drop trigger if exists trg_mdall_climate_snow_departments_updated_at on public.mdall_climate_snow_departments;
create trigger trg_mdall_climate_snow_departments_updated_at
before update on public.mdall_climate_snow_departments
for each row execute function public.set_updated_at();

drop trigger if exists trg_mdall_climate_snow_canton_overrides_updated_at on public.mdall_climate_snow_canton_overrides;
create trigger trg_mdall_climate_snow_canton_overrides_updated_at
before update on public.mdall_climate_snow_canton_overrides
for each row execute function public.set_updated_at();

drop trigger if exists trg_mdall_climate_wind_departments_updated_at on public.mdall_climate_wind_departments;
create trigger trg_mdall_climate_wind_departments_updated_at
before update on public.mdall_climate_wind_departments
for each row execute function public.set_updated_at();

drop trigger if exists trg_mdall_climate_wind_canton_overrides_updated_at on public.mdall_climate_wind_canton_overrides;
create trigger trg_mdall_climate_wind_canton_overrides_updated_at
before update on public.mdall_climate_wind_canton_overrides
for each row execute function public.set_updated_at();

drop trigger if exists trg_mdall_climate_frost_departments_updated_at on public.mdall_climate_frost_departments;
create trigger trg_mdall_climate_frost_departments_updated_at
before update on public.mdall_climate_frost_departments
for each row execute function public.set_updated_at();

drop trigger if exists trg_project_tool_results_updated_at on public.project_tool_results;
create trigger trg_project_tool_results_updated_at
before update on public.project_tool_results
for each row execute function public.set_updated_at();

-- RLS partout.
alter table if exists public.mdall_tool_definitions enable row level security;
alter table if exists public.mdall_climate_commune_cantons enable row level security;
alter table if exists public.mdall_climate_snow_departments enable row level security;
alter table if exists public.mdall_climate_snow_canton_overrides enable row level security;
alter table if exists public.mdall_climate_wind_departments enable row level security;
alter table if exists public.mdall_climate_wind_canton_overrides enable row level security;
alter table if exists public.mdall_climate_frost_departments enable row level security;
alter table if exists public.project_tool_results enable row level security;

-- Bibliothèque climatique: aucune policy SELECT authenticated (données non exposées navigateur).
-- On n'ajoute volontairement aucune policy sur les tables mdall_climate_* ni mdall_tool_definitions.

-- project_tool_results: mêmes règles d'accès que project_context_facts.
drop policy if exists project_tool_results_select_project_members on public.project_tool_results;
create policy project_tool_results_select_project_members
on public.project_tool_results
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

drop policy if exists project_tool_results_insert_project_owner on public.project_tool_results;
create policy project_tool_results_insert_project_owner
on public.project_tool_results
for insert
to authenticated
with check (
  project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
);

drop policy if exists project_tool_results_update_project_owner on public.project_tool_results;
create policy project_tool_results_update_project_owner
on public.project_tool_results
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

-- Seed catalogue outils (idempotent).
insert into public.mdall_tool_definitions (tool_key, name, category, is_active, required_plan)
values
  ('snow', 'Neige', 'climate', true, null),
  ('wind', 'Vent', 'climate', true, null),
  ('frost', 'Gel', 'climate', true, null)
on conflict (tool_key)
do update set
  name = excluded.name,
  category = excluded.category,
  is_active = excluded.is_active,
  required_plan = excluded.required_plan,
  updated_at = now();
