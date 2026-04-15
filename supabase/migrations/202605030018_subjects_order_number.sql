alter table if exists public.subjects
  add column if not exists subject_number bigint;

create table if not exists public.project_subject_counters (
  project_id uuid primary key references public.projects(id) on delete cascade,
  last_subject_number bigint not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.project_subject_counters is
  'Compteur monotone des numéros d’ordre de sujets par projet.';

comment on column public.subjects.subject_number is
  'Numéro d’ordre immuable du sujet dans son projet (#1, #2, #3…).';

insert into public.project_subject_counters (project_id, last_subject_number)
select
  s.project_id,
  coalesce(max(s.subject_number), 0)
from public.subjects s
group by s.project_id
on conflict (project_id) do update
set
  last_subject_number = greatest(public.project_subject_counters.last_subject_number, excluded.last_subject_number),
  updated_at = now();

with ordered_subjects as (
  select
    s.id,
    row_number() over (
      partition by s.project_id
      order by s.created_at asc nulls last, s.id asc
    ) as next_subject_number
  from public.subjects s
  where s.subject_number is null
)
update public.subjects s
set subject_number = ordered_subjects.next_subject_number
from ordered_subjects
where ordered_subjects.id = s.id;

insert into public.project_subject_counters (project_id, last_subject_number)
select
  s.project_id,
  coalesce(max(s.subject_number), 0)
from public.subjects s
group by s.project_id
on conflict (project_id) do update
set
  last_subject_number = greatest(public.project_subject_counters.last_subject_number, excluded.last_subject_number),
  updated_at = now();

create or replace function public.assign_subject_number()
returns trigger
language plpgsql
as $$
declare
  v_next_subject_number bigint;
begin
  if new.subject_number is not null then
    insert into public.project_subject_counters (project_id, last_subject_number)
    values (new.project_id, new.subject_number)
    on conflict (project_id) do update
    set
      last_subject_number = greatest(public.project_subject_counters.last_subject_number, excluded.last_subject_number),
      updated_at = now();
    return new;
  end if;

  insert into public.project_subject_counters (project_id, last_subject_number)
  values (new.project_id, 0)
  on conflict (project_id) do nothing;

  update public.project_subject_counters
  set
    last_subject_number = last_subject_number + 1,
    updated_at = now()
  where project_id = new.project_id
  returning last_subject_number into v_next_subject_number;

  if v_next_subject_number is null then
    raise exception 'Impossible d''attribuer un numéro de sujet pour le projet %', new.project_id;
  end if;

  new.subject_number := v_next_subject_number;
  return new;
end;
$$;

drop trigger if exists trg_subjects_assign_subject_number on public.subjects;
create trigger trg_subjects_assign_subject_number
before insert on public.subjects
for each row
execute function public.assign_subject_number();

alter table public.subjects
  alter column subject_number set not null;

create unique index if not exists subjects_project_subject_number_uidx
  on public.subjects(project_id, subject_number);
