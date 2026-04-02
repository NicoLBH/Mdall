create index if not exists idx_subject_observations_project_id
  on public.subject_observations(project_id);

create index if not exists idx_subject_observations_document_id
  on public.subject_observations(document_id);

create index if not exists idx_subject_observations_analysis_run_id
  on public.subject_observations(analysis_run_id);

create index if not exists idx_subject_observations_resolution_status
  on public.subject_observations(resolution_status);

create index if not exists idx_subject_observations_dedup_key
  on public.subject_observations(dedup_key);

create index if not exists idx_subject_observations_title_trgm
  on public.subject_observations using gin (title gin_trgm_ops);
