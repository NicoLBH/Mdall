create index if not exists idx_subjects_project_id
  on public.subjects(project_id);

create index if not exists idx_subjects_project_status
  on public.subjects(project_id, status);

create index if not exists idx_subjects_situation_id
  on public.subjects(situation_id);

create index if not exists idx_subjects_milestone_id
  on public.subjects(milestone_id);

create index if not exists idx_subjects_parent_subject_id
  on public.subjects(parent_subject_id);

create index if not exists idx_subjects_duplicate_of_subject_id
  on public.subjects(duplicate_of_subject_id);

create index if not exists idx_subjects_replaced_by_subject_id
  on public.subjects(replaced_by_subject_id);

create index if not exists idx_subjects_dedup_key
  on public.subjects(dedup_key);
