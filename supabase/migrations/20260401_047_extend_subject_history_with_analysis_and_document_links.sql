alter table subject_history
add column if not exists analysis_run_id uuid null references analysis_runs(id) on delete set null;

alter table subject_history
add column if not exists document_id uuid null references documents(id) on delete set null;

alter table subject_history
add column if not exists subject_observation_id uuid null references subject_observations(id) on delete set null;

alter table subject_history
add column if not exists title text;

alter table subject_history
add column if not exists description text null;
