create table if not exists public.subject_assignees (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  person_id uuid not null references public.directory_people(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (subject_id, person_id)
);

create index if not exists idx_subject_assignees_project_id
  on public.subject_assignees(project_id);

create index if not exists idx_subject_assignees_subject_id
  on public.subject_assignees(subject_id);

create index if not exists idx_subject_assignees_person_id
  on public.subject_assignees(person_id);

alter table if exists public.subject_assignees enable row level security;

drop policy if exists "subject_assignees_open_all" on public.subject_assignees;
create policy "subject_assignees_open_all"
on public.subject_assignees
for all
using (true)
with check (true);

comment on table public.subject_assignees is
  'Jointure many-to-many entre sujets et personnes collaboratrices assignées.';

insert into public.subject_assignees (project_id, subject_id, person_id, created_at)
select
  s.project_id,
  s.id,
  s.assignee_person_id,
  coalesce(s.updated_at, s.created_at, now())
from public.subjects s
where s.assignee_person_id is not null
on conflict (subject_id, person_id) do nothing;
