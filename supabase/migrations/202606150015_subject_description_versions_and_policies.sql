create table if not exists public.subject_description_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  description_markdown text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_person_id uuid references public.directory_people(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_subject_description_versions_subject_created
  on public.subject_description_versions(subject_id, created_at desc);

alter table public.subject_description_versions enable row level security;

drop policy if exists subject_description_versions_select on public.subject_description_versions;
create policy subject_description_versions_select
on public.subject_description_versions
for select
to authenticated
using (public.can_access_project_subject_conversation(project_id));

drop policy if exists subject_description_versions_insert on public.subject_description_versions;
create policy subject_description_versions_insert
on public.subject_description_versions
for insert
to authenticated
with check (public.can_access_project_subject_conversation(project_id));

drop policy if exists subjects_update_conversation_members on public.subjects;
create policy subjects_update_conversation_members
on public.subjects
for update
to authenticated
using (public.can_access_project_subject_conversation(project_id))
with check (public.can_access_project_subject_conversation(project_id));

create or replace function public.trg_log_subject_description_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_person_id uuid;
  v_actor_label text;
begin
  if coalesce(old.description, '') is not distinct from coalesce(new.description, '') then
    return new;
  end if;

  v_person_id := public.current_person_id();

  insert into public.subject_description_versions (
    project_id,
    subject_id,
    description_markdown,
    actor_user_id,
    actor_person_id,
    created_at
  )
  values (
    new.project_id,
    new.id,
    coalesce(new.description, ''),
    auth.uid(),
    v_person_id,
    now()
  );

  select coalesce(dp.display_name, dp.full_name, dp.email, 'Utilisateur')
    into v_actor_label
  from public.directory_people dp
  where dp.id = v_person_id;

  insert into public.subject_history (
    project_id,
    subject_id,
    analysis_run_id,
    document_id,
    subject_observation_id,
    event_type,
    actor_type,
    actor_label,
    actor_user_id,
    title,
    description,
    event_payload
  )
  values (
    new.project_id,
    new.id,
    new.analysis_run_id,
    new.document_id,
    null,
    'subject_description_updated',
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    auth.uid(),
    'Description du sujet mise à jour',
    'La description du sujet a été mise à jour.',
    jsonb_build_object(
      'previous_description', coalesce(old.description, ''),
      'next_description', coalesce(new.description, ''),
      'format', 'markdown'
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_log_subject_description_update on public.subjects;
create trigger trg_log_subject_description_update
after update of description on public.subjects
for each row
execute function public.trg_log_subject_description_update();

create or replace function public.link_subject_description_attachments(
  p_subject_id uuid,
  p_upload_session_id uuid
)
returns setof public.subject_message_attachments
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subject public.subjects;
  v_person_id uuid;
begin
  select *
    into v_subject
  from public.subjects s
  where s.id = p_subject_id;

  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  if not public.can_access_project_subject_conversation(v_subject.project_id) then
    raise exception 'Not allowed to link description attachments';
  end if;

  v_person_id := public.current_person_id();
  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  update public.subject_message_attachments sma
  set
    project_id = v_subject.project_id,
    subject_id = v_subject.id,
    message_id = null,
    linked_at = now()
  where sma.deleted_at is null
    and sma.upload_session_id = p_upload_session_id
    and sma.uploaded_by_person_id = v_person_id
    and sma.subject_id = v_subject.id;

  return query
  select sma.*
  from public.subject_message_attachments sma
  where sma.subject_id = v_subject.id
    and sma.message_id is null
    and sma.deleted_at is null
    and sma.linked_at is not null
  order by sma.sort_order asc, sma.created_at asc;
end;
$$;

grant execute on function public.link_subject_description_attachments(uuid, uuid) to authenticated;
revoke all on function public.link_subject_description_attachments(uuid, uuid) from public;
