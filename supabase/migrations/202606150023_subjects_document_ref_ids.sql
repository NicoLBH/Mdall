alter table public.subjects
  add column if not exists document_ref_ids uuid[] not null default '{}'::uuid[];

comment on column public.subjects.document_ref_ids is
  'Consolidated document reference ids linked to the subject for front-end document reference workflows.';

update public.subjects
set document_ref_ids = '{}'::uuid[]
where document_ref_ids is null;
