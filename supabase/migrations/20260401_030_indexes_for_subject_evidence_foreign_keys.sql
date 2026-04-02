create index if not exists idx_subject_evidence_subject_id
  on public.subject_evidence(subject_id);

create index if not exists idx_subject_evidence_subject_observation_id
  on public.subject_evidence(subject_observation_id);

create index if not exists idx_subject_evidence_project_id
  on public.subject_evidence(project_id);
