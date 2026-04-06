create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  filename text not null,
  original_filename text not null,
  mime_type text not null,
  storage_bucket text not null,
  storage_path text not null,
  file_size_bytes bigint,
  sha256_hash text,
  upload_status text not null default 'uploaded',
  document_kind text,
  page_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint documents_upload_status_check
    check (upload_status in ('uploaded', 'processing', 'failed', 'deleted'))
);

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  status text not null default 'queued',
  trigger_source text not null default 'manual',
  extractor_version text,
  pipeline_version text,
  prompt_version text,
  llm_model text,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  raw_text text,
  normalized_text_json jsonb,
  llm_output_raw jsonb,
  structured_output_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint analysis_runs_status_check
    check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled'))
);

create table if not exists public.situations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  objective_text text,
  status text not null default 'open',
  progress_percent numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint situations_status_check
    check (status in ('open', 'in_progress', 'closed')),
  constraint situations_progress_percent_check
    check (progress_percent >= 0 and progress_percent <= 100)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint milestones_status_check
    check (status in ('open', 'closed'))
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  situation_id uuid null references public.situations(id) on delete set null,
  milestone_id uuid null references public.milestones(id) on delete set null,
  parent_subject_id uuid null,
  duplicate_of_subject_id uuid null,
  replaced_by_subject_id uuid null,
  origin_subject_observation_id uuid null,
  assignee_user_id uuid,
  subject_type text not null,
  title text not null,
  description text,
  priority text not null default 'medium',
  status text not null default 'open',
  closure_reason text,
  normalized_title text,
  normalized_description text,
  confidence_score numeric,
  rationale text,
  source_excerpt text,
  source_page integer,
  source_anchor_json jsonb,
  dedup_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint subjects_type_check
    check (subject_type in ('explicit_problem', 'validation_point', 'missing_or_inconsistency')),
  constraint subjects_priority_check
    check (priority in ('low', 'medium', 'high', 'critical')),
  constraint subjects_status_check
    check (status in ('open', 'closed', 'closed_duplicate', 'closed_invalid', 'closed_replaced'))
);

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
  resolved_subject_id uuid null,
  created_at timestamptz not null default now(),
  constraint subject_observations_resolution_status_check
    check (resolution_status in ('pending', 'resolved', 'ignored', 'error')),
  constraint subject_observations_priority_check
    check (priority is null or priority in ('low', 'medium', 'high', 'critical'))
);

alter table public.subjects
  add constraint subjects_parent_subject_id_fkey
    foreign key (parent_subject_id) references public.subjects(id) on delete set null,
  add constraint subjects_duplicate_of_subject_id_fkey
    foreign key (duplicate_of_subject_id) references public.subjects(id) on delete set null,
  add constraint subjects_replaced_by_subject_id_fkey
    foreign key (replaced_by_subject_id) references public.subjects(id) on delete set null,
  add constraint subjects_origin_subject_observation_id_fkey
    foreign key (origin_subject_observation_id) references public.subject_observations(id) on delete set null;

alter table public.subject_observations
  add constraint subject_observations_resolved_subject_id_fkey
    foreign key (resolved_subject_id) references public.subjects(id) on delete set null;

create table if not exists public.subject_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  subject_observation_id uuid not null references public.subject_observations(id) on delete cascade,
  evidence_role text not null,
  summary text,
  created_at timestamptz not null default now(),
  constraint subject_evidence_role_check
    check (evidence_role in ('origin', 'confirming', 'complement', 'contradicting', 'duplicate_signal', 'reopen_signal'))
);

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
  created_at timestamptz not null default now(),
  constraint subject_history_event_type_check
    check (
      event_type in (
        'subject_created',
        'subject_enriched',
        'subject_reopened',
        'subject_closed',
        'subject_marked_duplicate',
        'subject_replaced',
        'subject_link_created',
        'subject_child_created',
        'subject_parent_assigned',
        'subject_moved_to_situation',
        'subject_moved_to_milestone',
        'subject_assignee_changed',
        'subject_title_updated',
        'subject_description_updated',
        'subject_status_changed'
      )
    ),
  constraint subject_history_actor_type_check
    check (actor_type in ('system', 'workflow', 'user', 'assistant'))
);
