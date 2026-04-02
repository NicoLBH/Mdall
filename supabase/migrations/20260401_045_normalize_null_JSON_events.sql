update subject_history
set event_payload = '{}'::jsonb
where event_payload is null;
