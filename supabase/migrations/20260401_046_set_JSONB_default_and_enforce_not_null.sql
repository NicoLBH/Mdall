alter table subject_history
alter column event_payload set default '{}'::jsonb;

alter table subject_history
alter column event_payload set not null;
