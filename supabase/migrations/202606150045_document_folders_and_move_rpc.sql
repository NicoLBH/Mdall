create table if not exists public.project_document_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_folder_id uuid null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id),
  constraint project_document_folders_name_not_blank check (btrim(name) <> ''),
  constraint project_document_folders_unique_name_per_parent unique nulls not distinct (project_id, parent_folder_id, name),
  constraint project_document_folders_project_id_id_unique unique (project_id, id),
  constraint project_document_folders_parent_folder_fkey
    foreign key (parent_folder_id) references public.project_document_folders(id) on delete cascade,
  constraint project_document_folders_parent_same_project_fkey
    foreign key (project_id, parent_folder_id) references public.project_document_folders(project_id, id) on delete cascade
);

create index if not exists idx_project_document_folders_project_id
  on public.project_document_folders(project_id);

create index if not exists idx_project_document_folders_parent_folder_id
  on public.project_document_folders(parent_folder_id);

create index if not exists idx_project_document_folders_project_parent
  on public.project_document_folders(project_id, parent_folder_id);

drop trigger if exists trg_project_document_folders_updated_at on public.project_document_folders;
create trigger trg_project_document_folders_updated_at
before update on public.project_document_folders
for each row execute function public.set_updated_at();

alter table public.documents
  add column if not exists folder_id uuid null references public.project_document_folders(id) on delete set null;

create index if not exists idx_documents_folder_id
  on public.documents(folder_id);

alter table public.project_document_folders enable row level security;

-- Folder access follows the same project owner predicate currently used for documents.
drop policy if exists project_document_folders_by_project on public.project_document_folders;
create policy project_document_folders_by_project
on public.project_document_folders
for all
using (
  project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
)
with check (
  project_id in (
    select p.id
    from public.projects p
    where p.owner_id = auth.uid()
  )
);

create or replace function public.move_project_document_file(
  file_id uuid,
  target_folder_id uuid default null
)
returns public.documents
language plpgsql
security invoker
as $$
declare
  v_document public.documents;
  v_target_folder public.project_document_folders;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select d.*
  into v_document
  from public.documents d
  where d.id = file_id;

  if not found then
    raise exception 'Document file not found: %', file_id;
  end if;

  if target_folder_id is not null then
    select f.*
    into v_target_folder
    from public.project_document_folders f
    where f.id = target_folder_id;

    if not found then
      raise exception 'Target folder not found: %', target_folder_id;
    end if;

    if v_target_folder.project_id <> v_document.project_id then
      raise exception 'Target folder belongs to another project';
    end if;
  end if;

  update public.documents d
  set folder_id = target_folder_id
  where d.id = v_document.id
  returning * into v_document;

  return v_document;
end;
$$;
