create table if not exists public.subject_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_subject_id uuid not null references public.subjects(id) on delete cascade,
  target_subject_id uuid not null references public.subjects(id) on delete cascade,
  link_type text not null,
  score numeric,
  explanation text,
  created_at timestamptz not null default now(),
  constraint subject_links_type_check
    check (link_type in ('related_to', 'duplicate_of', 'blocked_by', 'contradicts', 'replaces', 'child_of')),
  constraint subject_links_no_self_link_check
    check (source_subject_id <> target_subject_id)
);
