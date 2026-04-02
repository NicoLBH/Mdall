create index if not exists idx_subjects_current_title_trgm
  on public.subjects using gin (current_title gin_trgm_ops);
