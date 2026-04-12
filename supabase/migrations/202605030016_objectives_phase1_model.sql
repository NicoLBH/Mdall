begin;

create table if not exists public.milestone_subjects (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint milestone_subjects_milestone_id_subject_id_key unique (milestone_id, subject_id)
);

create index if not exists idx_milestone_subjects_milestone_id
  on public.milestone_subjects(milestone_id);

create index if not exists idx_milestone_subjects_subject_id
  on public.milestone_subjects(subject_id);

alter table if exists public.milestone_subjects enable row level security;

drop policy if exists "milestone_subjects_open_all" on public.milestone_subjects;
create policy "milestone_subjects_open_all"
on public.milestone_subjects
for all
to anon, authenticated
using (true)
with check (true);

comment on table public.milestone_subjects is
  'Jointure many-to-many entre objectifs (milestones) et sujets.';

comment on column public.milestone_subjects.milestone_id is
  'Objectif backend de rattachement.';

comment on column public.milestone_subjects.subject_id is
  'Sujet rattaché à un ou plusieurs objectifs.';

create or replace function public.ensure_default_project_objectives(p_project_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_title text;
begin
  if p_project_id is null then
    return;
  end if;

  foreach v_title in array array[
    'Permis de construire',
    'Autorisation de travaux',
    'Avant Projet Sommaire',
    'Avant Projet Détaillé',
    'Projet',
    'Dossier de Consultation des Entreprises',
    'Marchés',
    'Démarrage Chantier',
    'Fin de Terrassement',
    'Installation du Gros Oeuvre',
    'Fin des Fondations',
    'Fin des élévations',
    'Fin du Gros Oeuvre',
    'Pose de Charpente',
    'Fin de Couverture',
    'Fin des Menuiseries Extérieures',
    'Fin de Cloisonnement',
    'Démarrage des Chapes',
    'Fin Electricité',
    'Fin Chauffage Ventilation Climatisation',
    'Tests et Essais',
    'Dossier des Ouvrages Exécutés',
    'Réception',
    'Année de Garantie de Parfait Achèvement',
    'Exploitation'
  ]
  loop
    insert into public.milestones (
      project_id,
      title,
      description,
      due_date,
      status,
      closed_at
    )
    select
      p_project_id,
      v_title,
      null,
      null,
      'open',
      null
    where not exists (
      select 1
      from public.milestones m
      where m.project_id = p_project_id
        and lower(trim(regexp_replace(coalesce(m.title, ''), '\s+', ' ', 'g')))
          = lower(trim(regexp_replace(coalesce(v_title, ''), '\s+', ' ', 'g')))
    );
  end loop;
end;
$$;

comment on function public.ensure_default_project_objectives(uuid) is
  'Assure la présence des objectifs backend par défaut d''un projet, de manière idempotente.';

create or replace function public.handle_project_default_objectives()
returns trigger
language plpgsql
as $$
begin
  perform public.ensure_default_project_objectives(new.id);
  return new;
end;
$$;

drop trigger if exists trg_projects_default_objectives on public.projects;
create trigger trg_projects_default_objectives
after insert on public.projects
for each row execute function public.handle_project_default_objectives();

insert into public.milestone_subjects (milestone_id, subject_id)
select distinct
  s.milestone_id,
  s.id
from public.subjects s
join public.milestones m
  on m.id = s.milestone_id
 and m.project_id = s.project_id
where s.milestone_id is not null
on conflict (milestone_id, subject_id) do nothing;

select public.ensure_default_project_objectives(p.id)
from public.projects p;

commit;
