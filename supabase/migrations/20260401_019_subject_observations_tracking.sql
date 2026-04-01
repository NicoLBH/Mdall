create table if not exists public.subject_observations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  title text not null,
  description text not null,
  observation_type text,
  priority text,
  confidence_score numeric,
  source_excerpt text,
  source_page integer,
  normalized_title text,
  normalized_description text,
  dedup_key text,
  raw_llm_payload jsonb,
  resolution_status text not null default 'pending',
  resolved_subject_id uuid references public.subjects(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint subject_observations_resolution_status_check
    check (resolution_status in ('pending', 'resolved', 'ignored', 'error')),
  constraint subject_observations_priority_check
    check (priority is null or priority in ('low', 'medium', 'high', 'critical'))
);
