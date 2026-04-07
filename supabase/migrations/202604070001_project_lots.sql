-- Lots catalog + project lots association (idempotent)

create table if not exists public.lot_catalog (
  id uuid primary key default gen_random_uuid(),
  group_code text not null,
  group_label text not null,
  code text not null unique,
  label text not null,
  default_activated boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_lots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  lot_catalog_id uuid not null references public.lot_catalog(id) on delete cascade,
  activated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_lots_project_lot_unique unique (project_id, lot_catalog_id)
);

alter table public.lot_catalog enable row level security;
alter table public.project_lots enable row level security;

create index if not exists idx_lot_catalog_group_sort
  on public.lot_catalog(group_code, sort_order, label);

create index if not exists idx_project_lots_project_id
  on public.project_lots(project_id);

create index if not exists idx_project_lots_lot_catalog_id
  on public.project_lots(lot_catalog_id);

create index if not exists idx_project_lots_activated
  on public.project_lots(project_id, activated);

drop trigger if exists trg_lot_catalog_updated_at on public.lot_catalog;
create trigger trg_lot_catalog_updated_at
before update on public.lot_catalog
for each row execute function public.set_updated_at();

drop trigger if exists trg_project_lots_updated_at on public.project_lots;
create trigger trg_project_lots_updated_at
before update on public.project_lots
for each row execute function public.set_updated_at();

drop policy if exists "lot_catalog_open_all" on public.lot_catalog;
create policy "lot_catalog_open_all"
on public.lot_catalog
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "project_lots_open_all" on public.project_lots;
create policy "project_lots_open_all"
on public.project_lots
for all
to anon, authenticated
using (true)
with check (true);

insert into public.lot_catalog (group_code, group_label, code, label, default_activated, sort_order)
values
  ('groupe-maitrise-ouvrage', 'Groupe Maitrise d''Ouvrage', 'maitre-ouvrage', 'Maitre d''ouvrage', true, 10),
  ('groupe-maitrise-ouvrage', 'Groupe Maitrise d''Ouvrage', 'chef-etablissement', 'Chef d''établissement', false, 20),
  ('groupe-maitrise-ouvrage', 'Groupe Maitrise d''Ouvrage', 'maitre-ouvrage-chef-etablissement', 'Maître d''ouvrage & chef d''établissement', false, 30),
  ('groupe-maitrise-ouvrage', 'Groupe Maitrise d''Ouvrage', 'maitre-ouvrage-delegue', 'Maître d''ouvrage délégué', false, 40),
  ('groupe-maitrise-ouvrage', 'Groupe Maitrise d''Ouvrage', 'assistant-maitre-ouvrage', 'Assistant maître d''ouvrage', false, 50),

  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'controle-technique', 'Contrôle technique', false, 110),
  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'architecte-maitre-oeuvre', 'Architecte - Maître d''oeuvre', true, 120),
  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'economiste', 'Economiste', false, 130),
  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'geotechnicien', 'Géotechnicien', false, 140),
  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'bet-structure', 'BET structure', false, 150),
  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'bet-electricite', 'BET électricité', false, 160),
  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'bet-energie-fluide', 'BET Energie fluide', false, 170),
  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'bet-acoustique', 'BET Acoustique', false, 180),
  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'opc', 'OPC', false, 190),
  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'bim-manager', 'BIM manager', false, 200),
  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'coordinateur-ssi', 'Coordinateur SSI', false, 210),
  ('groupe-maitrise-oeuvre', 'Groupe Maîtrise d''Oeuvre', 'coordinateur-sps', 'Coordinateur SPS', false, 220),

  ('groupe-entreprise', 'Groupe Entreprise', 'lot-gros-oeuvre', 'Lot Gros Oeuvre', false, 310),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-demolition', 'Lot Démolition', false, 320),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-maconnerie', 'Lot Maçonnerie', false, 330),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-plomberie-sanitaire', 'Lot Plomberie - Sanitaire', false, 340),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-facade', 'Lot Façade', false, 350),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-toiture', 'Lot Toiture', false, 360),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-cloisons-doublage', 'Lot Cloisons - Doublage', false, 370),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-menuiseries-interieures', 'Lot Menuiseries Intérieures', false, 380),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-menuiseries-exterieures', 'Lot Menuiseries Extérieures', false, 390),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-serrurerie-metallerie', 'Lot Serrurerie - Métallerie', false, 400),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-revetements-sol', 'Lot Revêtements de sol', false, 410),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-peinture', 'Lot Peinture', false, 420),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-electricite', 'Lot Electrcité', false, 430),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-cvc', 'Lot Chauffage - Ventilation - Climatisation', false, 440),
  ('groupe-entreprise', 'Groupe Entreprise', 'lot-vrd', 'Lot Voirie - Réseaux Divers', false, 450),

  ('groupe-divers', 'Groupe Divers', 'bet-execution', 'BET exécution', false, 510),
  ('groupe-divers', 'Groupe Divers', 'laboratoire', 'Laboratoire', false, 520),
  ('groupe-divers', 'Groupe Divers', 'preventionniste-sdis', 'Préventionniste - SDIS', false, 530),
  ('groupe-divers', 'Groupe Divers', 'commission-accessibilite', 'Commission d''accessibilité', false, 540),
  ('groupe-divers', 'Groupe Divers', 'entreprise-generale', 'Entreprise Générale', false, 550),
  ('groupe-divers', 'Groupe Divers', 'services-administratifs', 'Services administratifs', false, 560)
on conflict (code) do update
set group_code = excluded.group_code,
    group_label = excluded.group_label,
    label = excluded.label,
    default_activated = excluded.default_activated,
    sort_order = excluded.sort_order;

create or replace function public.seed_project_lots_for_project(p_project_id uuid)
returns void
language sql
as $$
  insert into public.project_lots (project_id, lot_catalog_id, activated)
  select
    p_project_id,
    lc.id,
    lc.default_activated
  from public.lot_catalog lc
  where not exists (
    select 1
    from public.project_lots pl
    where pl.project_id = p_project_id
      and pl.lot_catalog_id = lc.id
  );
$$;

create or replace function public.trg_seed_project_lots()
returns trigger
language plpgsql
as $$
begin
  perform public.seed_project_lots_for_project(new.id);
  return new;
end;
$$;

drop trigger if exists trg_projects_seed_lots on public.projects;
create trigger trg_projects_seed_lots
after insert on public.projects
for each row execute function public.trg_seed_project_lots();

select public.seed_project_lots_for_project(p.id)
from public.projects p;
