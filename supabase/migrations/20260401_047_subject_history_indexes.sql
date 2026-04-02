create index if not exists idx_subject_history_subject_id
on subject_history(subject_id, created_at desc);

create index if not exists idx_subject_history_project_id
on subject_history(project_id, created_at desc);

create index if not exists idx_subject_history_analysis_run_id
on subject_history(analysis_run_id);

create index if not exists idx_subject_history_subject_observation_id
on subject_history(subject_observation_id);
