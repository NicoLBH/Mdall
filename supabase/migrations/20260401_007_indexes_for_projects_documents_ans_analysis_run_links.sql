create index if not exists idx_documents_project_id
on public.documents(project_id);

create index if not exists idx_analysis_runs_project_id
on public.analysis_runs(project_id);

create index if not exists idx_analysis_runs_document_id
on public.analysis_runs(document_id);

create index if not exists idx_subjects_project_id
on public.subjects(project_id);

create index if not exists idx_subjects_document_id
on public.subjects(document_id);

create index if not exists idx_subjects_analysis_run_id
on public.subjects(analysis_run_id);
