create table if not exists public.subject_history (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,

  analysis_run_id uuid null references public.analysis_runs(id) on delete set null,
  document_id uuid null references public.documents(id) on delete set null,
  subject_observation_id uuid null references public.subject_observations(id) on delete set null,

  event_type text not null,
  actor_type text not null default 'system',
  actor_label text null,

  title text not null,
  description text null,

  event_payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);
