alter table public.documents
add constraint documents_upload_status_check
check (upload_status in ('uploaded', 'processing', 'failed', 'deleted'));

alter table public.analysis_runs
add constraint analysis_runs_status_check
check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled'));
