create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

drop trigger if exists trg_analysis_runs_updated_at on public.analysis_runs;
create trigger trg_analysis_runs_updated_at
before update on public.analysis_runs
for each row execute function public.set_updated_at();

drop trigger if exists trg_situations_updated_at on public.situations;
create trigger trg_situations_updated_at
before update on public.situations
for each row execute function public.set_updated_at();

drop trigger if exists trg_milestones_updated_at on public.milestones;
create trigger trg_milestones_updated_at
before update on public.milestones
for each row execute function public.set_updated_at();

drop trigger if exists trg_subjects_updated_at on public.subjects;
create trigger trg_subjects_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.situations enable row level security;
alter table public.milestones enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_observations enable row level security;
alter table public.subject_evidence enable row level security;
alter table public.subject_links enable row level security;
alter table public.subject_history enable row level security;

drop policy if exists "projects_open_all" on public.projects;
create policy "projects_open_all"
on public.projects
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "documents_open_all" on public.documents;
create policy "documents_open_all"
on public.documents
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "analysis_runs_open_all" on public.analysis_runs;
create policy "analysis_runs_open_all"
on public.analysis_runs
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "situations_open_all" on public.situations;
create policy "situations_open_all"
on public.situations
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "milestones_open_all" on public.milestones;
create policy "milestones_open_all"
on public.milestones
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "subjects_open_all" on public.subjects;
create policy "subjects_open_all"
on public.subjects
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "subject_observations_open_all" on public.subject_observations;
create policy "subject_observations_open_all"
on public.subject_observations
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "subject_evidence_open_all" on public.subject_evidence;
create policy "subject_evidence_open_all"
on public.subject_evidence
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "subject_links_open_all" on public.subject_links;
create policy "subject_links_open_all"
on public.subject_links
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "subject_history_open_all" on public.subject_history;
create policy "subject_history_open_all"
on public.subject_history
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "storage_documents_select_open" on storage.objects;
create policy "storage_documents_select_open"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'documents');

drop policy if exists "storage_documents_insert_open" on storage.objects;
create policy "storage_documents_insert_open"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'documents');

drop policy if exists "storage_documents_update_open" on storage.objects;
create policy "storage_documents_update_open"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'documents')
with check (bucket_id = 'documents');

drop policy if exists "storage_documents_delete_open" on storage.objects;
create policy "storage_documents_delete_open"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'documents');

create unique index if not exists idx_documents_sha256_hash_unique
  on public.documents(sha256_hash)
  where sha256_hash is not null;

create index if not exists idx_documents_project_id
  on public.documents(project_id);

create index if not exists idx_analysis_runs_project_id
  on public.analysis_runs(project_id);

create index if not exists idx_analysis_runs_document_id
  on public.analysis_runs(document_id);

create index if not exists idx_situations_project_id
  on public.situations(project_id);

create index if not exists idx_situations_status
  on public.situations(status);

create index if not exists idx_milestones_project_id
  on public.milestones(project_id);

create index if not exists idx_milestones_status
  on public.milestones(status);

create index if not exists idx_milestones_due_date
  on public.milestones(due_date);

create index if not exists idx_subjects_project_id
  on public.subjects(project_id);

create index if not exists idx_subjects_document_id
  on public.subjects(document_id);

create index if not exists idx_subjects_analysis_run_id
  on public.subjects(analysis_run_id);

create index if not exists idx_subjects_situation_id
  on public.subjects(situation_id);

create index if not exists idx_subjects_milestone_id
  on public.subjects(milestone_id);

create index if not exists idx_subjects_parent_subject_id
  on public.subjects(parent_subject_id);

create index if not exists idx_subjects_status
  on public.subjects(status);

create index if not exists idx_subjects_priority
  on public.subjects(priority);

create index if not exists idx_subjects_dedup_key
  on public.subjects(dedup_key);

create index if not exists idx_subjects_title_trgm
  on public.subjects using gin (title gin_trgm_ops);

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

create index if not exists idx_subject_evidence_subject_id
  on public.subject_evidence(subject_id);

create index if not exists idx_subject_evidence_subject_observation_id
  on public.subject_evidence(subject_observation_id);

create unique index if not exists idx_subject_links_unique_canonical
  on public.subject_links (project_id, source_subject_id, target_subject_id, link_type);

create index if not exists idx_subject_links_project_id
  on public.subject_links(project_id);

create index if not exists idx_subject_links_source_subject_id
  on public.subject_links(source_subject_id);

create index if not exists idx_subject_links_target_subject_id
  on public.subject_links(target_subject_id);

create index if not exists idx_subject_links_link_type
  on public.subject_links(link_type);

create index if not exists idx_subject_history_subject_id
  on public.subject_history(subject_id, created_at desc);

create index if not exists idx_subject_history_project_id
  on public.subject_history(project_id, created_at desc);

create index if not exists idx_subject_history_analysis_run_id
  on public.subject_history(analysis_run_id);

create index if not exists idx_subject_history_subject_observation_id
  on public.subject_history(subject_observation_id);
