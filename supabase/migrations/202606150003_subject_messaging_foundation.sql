-- Subject messaging foundation: persisted messages, timeline events, reads, mentions,
-- attachments lifecycle, conversation lock and strict immutability rules.

create table if not exists public.subject_conversation_settings (
  subject_id uuid primary key references public.subjects(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  is_locked boolean not null default false,
  locked_at timestamptz,
  locked_by_person_id uuid references public.directory_people(id) on delete set null,
  locked_by_user_id uuid references auth.users(id) on delete set null,
  lock_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subject_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  parent_message_id uuid references public.subject_messages(id) on delete set null,
  author_person_id uuid not null references public.directory_people(id) on delete restrict,
  author_user_id uuid references auth.users(id) on delete set null,
  body_markdown text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  is_frozen boolean not null default false,
  frozen_at timestamptz,
  frozen_reason text,
  constraint subject_messages_body_not_empty check (length(btrim(body_markdown)) > 0)
);

create table if not exists public.subject_message_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  message_id uuid references public.subject_messages(id) on delete set null,
  upload_session_id uuid,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  sort_order integer not null default 0,
  uploaded_by_person_id uuid not null references public.directory_people(id) on delete restrict,
  created_at timestamptz not null default now(),
  linked_at timestamptz,
  deleted_at timestamptz,
  constraint subject_message_attachments_link_or_session_check check (
    message_id is not null or upload_session_id is not null
  ),
  constraint subject_message_attachments_size_non_negative check (size_bytes is null or size_bytes >= 0),
  constraint subject_message_attachments_dimensions_non_negative check (
    (width is null or width >= 0)
    and (height is null or height >= 0)
  )
);

create table if not exists public.subject_message_mentions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  message_id uuid not null references public.subject_messages(id) on delete cascade,
  mentioned_person_id uuid not null references public.directory_people(id) on delete restrict,
  display_label text,
  created_at timestamptz not null default now(),
  constraint subject_message_mentions_unique unique (message_id, mentioned_person_id)
);

create table if not exists public.subject_message_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  message_id uuid references public.subject_messages(id) on delete set null,
  event_type text not null,
  actor_person_id uuid references public.directory_people(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint subject_message_events_event_type_check check (
    event_type in (
      'message_posted',
      'message_edited',
      'message_deleted',
      'message_frozen',
      'conversation_locked',
      'conversation_unlocked',
      'attachments_linked'
    )
  )
);

create table if not exists public.subject_message_reads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  message_id uuid not null references public.subject_messages(id) on delete cascade,
  reader_person_id uuid not null references public.directory_people(id) on delete restrict,
  reader_user_id uuid references auth.users(id) on delete set null,
  read_at timestamptz not null default now(),
  constraint subject_message_reads_unique unique (message_id, reader_person_id)
);

-- Future in-app notification scaffold (no UX usage at this stage).
create table if not exists public.subject_notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  person_id uuid not null references public.directory_people(id) on delete cascade,
  notification_type text not null,
  message_id uuid references public.subject_messages(id) on delete set null,
  event_id uuid references public.subject_message_events(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint subject_notifications_type_check check (
    notification_type in ('new_message', 'reply_to_me', 'mention', 'conversation_lock_changed')
  )
);

create index if not exists idx_subject_conversation_settings_project_id
  on public.subject_conversation_settings(project_id);

create index if not exists idx_subject_messages_subject_created
  on public.subject_messages(subject_id, created_at asc);

create index if not exists idx_subject_messages_project_subject
  on public.subject_messages(project_id, subject_id, created_at asc);

create index if not exists idx_subject_messages_parent_message_id
  on public.subject_messages(parent_message_id);

create index if not exists idx_subject_messages_author_person_id
  on public.subject_messages(author_person_id);

create index if not exists idx_subject_messages_non_deleted
  on public.subject_messages(subject_id, created_at asc)
  where deleted_at is null;

create index if not exists idx_subject_message_attachments_subject_id
  on public.subject_message_attachments(subject_id, created_at asc);

create index if not exists idx_subject_message_attachments_message_id
  on public.subject_message_attachments(message_id, sort_order asc, created_at asc);

create index if not exists idx_subject_message_attachments_upload_session_id
  on public.subject_message_attachments(upload_session_id)
  where upload_session_id is not null and message_id is null and deleted_at is null;

create unique index if not exists idx_subject_message_attachments_storage_unique
  on public.subject_message_attachments(storage_bucket, storage_path)
  where deleted_at is null;

create index if not exists idx_subject_message_mentions_message_id
  on public.subject_message_mentions(message_id);

create index if not exists idx_subject_message_mentions_person_id
  on public.subject_message_mentions(mentioned_person_id, created_at desc);

create index if not exists idx_subject_message_events_subject_created
  on public.subject_message_events(subject_id, created_at asc);

create index if not exists idx_subject_message_events_type_created
  on public.subject_message_events(event_type, created_at desc);

create index if not exists idx_subject_message_reads_message_id
  on public.subject_message_reads(message_id, read_at desc);

create index if not exists idx_subject_message_reads_reader_person_id
  on public.subject_message_reads(reader_person_id, read_at desc);

create index if not exists idx_subject_notifications_person_unread
  on public.subject_notifications(person_id, is_read, created_at desc);

create index if not exists idx_subject_notifications_subject
  on public.subject_notifications(subject_id, created_at desc);

drop trigger if exists trg_subject_conversation_settings_updated_at on public.subject_conversation_settings;
create trigger trg_subject_conversation_settings_updated_at
before update on public.subject_conversation_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_subject_messages_updated_at on public.subject_messages;
create trigger trg_subject_messages_updated_at
before update on public.subject_messages
for each row execute function public.set_updated_at();

create or replace function public.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select dp.id
  from public.directory_people dp
  where dp.linked_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_active_project_collaborator(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_collaborators pc
    left join public.directory_people dp on dp.id = pc.person_id
    where pc.project_id = p_project_id
      and lower(coalesce(pc.status, '')) = 'actif'
      and pc.removed_at is null
      and (
        pc.collaborator_user_id = p_user_id
        or dp.linked_user_id = p_user_id
      )
  );
$$;

create or replace function public.can_access_project_subject_conversation(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        p.owner_id = auth.uid()
        or public.is_active_project_collaborator(p.id, auth.uid())
      )
  );
$$;

create or replace function public.can_lock_project_subject_conversation(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.project_collaborators pc
    join public.project_lots pl on pl.id = pc.project_lot_id
    join public.lot_catalog lc on lc.id = pl.lot_catalog_id
    left join public.directory_people dp on dp.id = pc.person_id
    where pc.project_id = p_project_id
      and lower(coalesce(pc.status, '')) = 'actif'
      and pc.removed_at is null
      and (
        pc.collaborator_user_id = auth.uid()
        or dp.linked_user_id = auth.uid()
      )
      and lc.group_code in ('groupe-maitrise-ouvrage', 'groupe-maitrise-oeuvre')
  );
$$;

create or replace function public.is_subject_conversation_locked(p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select scs.is_locked
    from public.subject_conversation_settings scs
    where scs.subject_id = p_subject_id
  ), false);
$$;

create or replace function public.subject_message_is_editable(p_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subject_messages sm
    where sm.id = p_message_id
      and sm.deleted_at is null
      and sm.is_frozen = false
      and not exists (
        select 1
        from public.subject_message_reads smr
        where smr.message_id = sm.id
          and smr.reader_person_id <> sm.author_person_id
      )
  );
$$;

create or replace function public.freeze_subject_message(
  p_message_id uuid,
  p_reason text default 'seen_by_other_user'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subject_messages sm
  set
    is_frozen = true,
    frozen_at = coalesce(sm.frozen_at, now()),
    frozen_reason = coalesce(sm.frozen_reason, nullif(btrim(p_reason), ''))
  where sm.id = p_message_id
    and sm.is_frozen = false;
end;
$$;

create or replace function public.lock_subject_conversation(
  p_subject_id uuid,
  p_lock_reason text default null
)
returns public.subject_conversation_settings
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subject public.subjects;
  v_person_id uuid;
  v_result public.subject_conversation_settings;
begin
  select *
    into v_subject
  from public.subjects s
  where s.id = p_subject_id;

  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  if not public.can_lock_project_subject_conversation(v_subject.project_id) then
    raise exception 'Insufficient rights to lock this conversation';
  end if;

  v_person_id := public.current_person_id();

  insert into public.subject_conversation_settings (
    subject_id,
    project_id,
    is_locked,
    locked_at,
    locked_by_person_id,
    locked_by_user_id,
    lock_reason
  )
  values (
    v_subject.id,
    v_subject.project_id,
    true,
    now(),
    v_person_id,
    auth.uid(),
    nullif(btrim(p_lock_reason), '')
  )
  on conflict (subject_id) do update
  set
    project_id = excluded.project_id,
    is_locked = true,
    locked_at = now(),
    locked_by_person_id = v_person_id,
    locked_by_user_id = auth.uid(),
    lock_reason = excluded.lock_reason,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.unlock_subject_conversation(
  p_subject_id uuid
)
returns public.subject_conversation_settings
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subject public.subjects;
  v_result public.subject_conversation_settings;
begin
  select *
    into v_subject
  from public.subjects s
  where s.id = p_subject_id;

  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  if not public.can_lock_project_subject_conversation(v_subject.project_id) then
    raise exception 'Insufficient rights to unlock this conversation';
  end if;

  insert into public.subject_conversation_settings (
    subject_id,
    project_id,
    is_locked,
    locked_at,
    locked_by_person_id,
    locked_by_user_id,
    lock_reason
  )
  values (
    v_subject.id,
    v_subject.project_id,
    false,
    null,
    null,
    null,
    null
  )
  on conflict (subject_id) do update
  set
    project_id = excluded.project_id,
    is_locked = false,
    locked_at = null,
    locked_by_person_id = null,
    locked_by_user_id = null,
    lock_reason = null,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.link_subject_message_attachments(
  p_subject_id uuid,
  p_message_id uuid,
  p_upload_session_id uuid
)
returns setof public.subject_message_attachments
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_message public.subject_messages;
  v_person_id uuid;
begin
  select *
    into v_message
  from public.subject_messages sm
  where sm.id = p_message_id
    and sm.subject_id = p_subject_id;

  if v_message.id is null then
    raise exception 'Message not found';
  end if;

  if not public.can_access_project_subject_conversation(v_message.project_id) then
    raise exception 'Not allowed to link attachments';
  end if;

  v_person_id := public.current_person_id();

  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  update public.subject_message_attachments sma
  set
    message_id = v_message.id,
    subject_id = v_message.subject_id,
    project_id = v_message.project_id,
    linked_at = now()
  where sma.message_id is null
    and sma.deleted_at is null
    and sma.upload_session_id = p_upload_session_id
    and sma.uploaded_by_person_id = v_person_id
    and sma.subject_id = p_subject_id;

  return query
  select sma.*
  from public.subject_message_attachments sma
  where sma.message_id = v_message.id
    and sma.deleted_at is null
  order by sma.sort_order asc, sma.created_at asc;
end;
$$;

create or replace function public.soft_delete_subject_message(
  p_message_id uuid
)
returns public.subject_messages
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_message public.subject_messages;
  v_person_id uuid;
begin
  select * into v_message
  from public.subject_messages sm
  where sm.id = p_message_id;

  if v_message.id is null then
    raise exception 'Message not found';
  end if;

  if not public.can_access_project_subject_conversation(v_message.project_id) then
    raise exception 'Not allowed to delete this message';
  end if;

  v_person_id := public.current_person_id();

  if v_person_id is distinct from v_message.author_person_id then
    raise exception 'Only author can delete this message';
  end if;

  if not public.subject_message_is_editable(v_message.id) then
    raise exception 'Message is already frozen and cannot be deleted';
  end if;

  update public.subject_messages sm
  set
    deleted_at = now(),
    body_markdown = '[message supprimé]',
    updated_at = now()
  where sm.id = v_message.id
  returning * into v_message;

  return v_message;
end;
$$;

create or replace function public.trg_validate_subject_conversation_setting_project()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_subject_project_id uuid;
begin
  select s.project_id
    into v_subject_project_id
  from public.subjects s
  where s.id = new.subject_id;

  if v_subject_project_id is null then
    raise exception 'Subject % not found', new.subject_id;
  end if;

  if new.project_id <> v_subject_project_id then
    raise exception 'Project mismatch for subject conversation setting';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_subject_conversation_setting_project on public.subject_conversation_settings;
create trigger trg_validate_subject_conversation_setting_project
before insert or update on public.subject_conversation_settings
for each row execute function public.trg_validate_subject_conversation_setting_project();

create or replace function public.trg_validate_subject_message_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_subject_project_id uuid;
  v_parent record;
begin
  select s.project_id
    into v_subject_project_id
  from public.subjects s
  where s.id = new.subject_id;

  if v_subject_project_id is null then
    raise exception 'Subject % not found', new.subject_id;
  end if;

  if new.project_id <> v_subject_project_id then
    raise exception 'Project mismatch for message and subject';
  end if;

  if new.parent_message_id is not null then
    select sm.id, sm.subject_id, sm.project_id
      into v_parent
    from public.subject_messages sm
    where sm.id = new.parent_message_id;

    if v_parent.id is null then
      raise exception 'Parent message % not found', new.parent_message_id;
    end if;

    if v_parent.subject_id <> new.subject_id or v_parent.project_id <> new.project_id then
      raise exception 'Parent message must belong to same subject and project';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_subject_message_consistency on public.subject_messages;
create trigger trg_validate_subject_message_consistency
before insert or update on public.subject_messages
for each row execute function public.trg_validate_subject_message_consistency();

create or replace function public.trg_enforce_subject_message_mutability()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_frozen = false
     and new.is_frozen = true
     and new.deleted_at is null
     and new.body_markdown = old.body_markdown
     and new.created_at = old.created_at
     and new.author_person_id = old.author_person_id
     and new.author_user_id is not distinct from old.author_user_id
     and new.project_id = old.project_id
     and new.subject_id = old.subject_id
     and new.parent_message_id is not distinct from old.parent_message_id then
    return new;
  end if;

  if old.is_frozen then
    raise exception 'Frozen messages cannot be updated';
  end if;

  if old.deleted_at is not null then
    raise exception 'Deleted messages cannot be updated';
  end if;

  if not public.subject_message_is_editable(old.id) then
    raise exception 'Message is frozen and no longer editable';
  end if;

  if new.created_at <> old.created_at
     or new.author_person_id <> old.author_person_id
     or new.author_user_id is distinct from old.author_user_id
     or new.project_id <> old.project_id
     or new.subject_id <> old.subject_id
     or new.parent_message_id is distinct from old.parent_message_id then
    raise exception 'Immutable message metadata cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_subject_message_mutability on public.subject_messages;
create trigger trg_enforce_subject_message_mutability
before update on public.subject_messages
for each row
when (old.deleted_at is null)
execute function public.trg_enforce_subject_message_mutability();

create or replace function public.trg_prevent_subject_message_hard_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Hard delete is not allowed for subject messages; use soft delete';
end;
$$;

drop trigger if exists trg_prevent_subject_message_hard_delete on public.subject_messages;
create trigger trg_prevent_subject_message_hard_delete
before delete on public.subject_messages
for each row execute function public.trg_prevent_subject_message_hard_delete();

create or replace function public.trg_validate_subject_child_table_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_message record;
begin
  select sm.project_id, sm.subject_id
    into v_message
  from public.subject_messages sm
  where sm.id = new.message_id;

  if v_message.project_id is null then
    raise exception 'Message % not found', new.message_id;
  end if;

  if new.project_id <> v_message.project_id or new.subject_id <> v_message.subject_id then
    raise exception 'Message/project/subject mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_subject_message_mentions_consistency on public.subject_message_mentions;
create trigger trg_validate_subject_message_mentions_consistency
before insert or update on public.subject_message_mentions
for each row execute function public.trg_validate_subject_child_table_consistency();

drop trigger if exists trg_validate_subject_message_reads_consistency on public.subject_message_reads;
create trigger trg_validate_subject_message_reads_consistency
before insert or update on public.subject_message_reads
for each row execute function public.trg_validate_subject_child_table_consistency();

create or replace function public.trg_validate_subject_message_event_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_message record;
begin
  if new.message_id is null then
    return new;
  end if;

  select sm.project_id, sm.subject_id
    into v_message
  from public.subject_messages sm
  where sm.id = new.message_id;

  if v_message.project_id is null then
    raise exception 'Message % not found', new.message_id;
  end if;

  if new.project_id <> v_message.project_id or new.subject_id <> v_message.subject_id then
    raise exception 'Event project/subject mismatch with message';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_subject_message_event_consistency on public.subject_message_events;
create trigger trg_validate_subject_message_event_consistency
before insert or update on public.subject_message_events
for each row execute function public.trg_validate_subject_message_event_consistency();

create or replace function public.trg_validate_subject_attachment_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_subject_project_id uuid;
  v_message record;
begin
  select s.project_id into v_subject_project_id
  from public.subjects s
  where s.id = new.subject_id;

  if v_subject_project_id is null then
    raise exception 'Subject % not found', new.subject_id;
  end if;

  if new.project_id <> v_subject_project_id then
    raise exception 'Attachment project mismatch with subject';
  end if;

  if new.storage_bucket <> 'subject-message-attachments' then
    raise exception 'Attachments must use bucket subject-message-attachments';
  end if;

  if new.message_id is not null then
    select sm.project_id, sm.subject_id
      into v_message
    from public.subject_messages sm
    where sm.id = new.message_id;

    if v_message.project_id is null then
      raise exception 'Message % not found', new.message_id;
    end if;

    if v_message.project_id <> new.project_id or v_message.subject_id <> new.subject_id then
      raise exception 'Attachment message mismatch';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_subject_attachment_consistency on public.subject_message_attachments;
create trigger trg_validate_subject_attachment_consistency
before insert or update on public.subject_message_attachments
for each row execute function public.trg_validate_subject_attachment_consistency();

create or replace function public.trg_freeze_message_when_seen_by_other()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_message public.subject_messages;
begin
  select *
    into v_message
  from public.subject_messages sm
  where sm.id = new.message_id;

  if v_message.id is null then
    return new;
  end if;

  if new.reader_person_id <> v_message.author_person_id then
    perform public.freeze_subject_message(v_message.id, 'seen_by_other_user');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_freeze_message_when_seen_by_other on public.subject_message_reads;
create trigger trg_freeze_message_when_seen_by_other
after insert on public.subject_message_reads
for each row execute function public.trg_freeze_message_when_seen_by_other();

alter table public.subject_conversation_settings enable row level security;
alter table public.subject_messages enable row level security;
alter table public.subject_message_attachments enable row level security;
alter table public.subject_message_mentions enable row level security;
alter table public.subject_message_events enable row level security;
alter table public.subject_message_reads enable row level security;
alter table public.subject_notifications enable row level security;

drop policy if exists subject_conversation_settings_select on public.subject_conversation_settings;
create policy subject_conversation_settings_select
on public.subject_conversation_settings
for select
to authenticated
using (public.can_access_project_subject_conversation(project_id));

drop policy if exists subject_conversation_settings_insert_lockers on public.subject_conversation_settings;
create policy subject_conversation_settings_insert_lockers
on public.subject_conversation_settings
for insert
to authenticated
with check (public.can_lock_project_subject_conversation(project_id));

drop policy if exists subject_conversation_settings_update_lockers on public.subject_conversation_settings;
create policy subject_conversation_settings_update_lockers
on public.subject_conversation_settings
for update
to authenticated
using (public.can_lock_project_subject_conversation(project_id))
with check (public.can_lock_project_subject_conversation(project_id));

drop policy if exists subject_messages_select on public.subject_messages;
create policy subject_messages_select
on public.subject_messages
for select
to authenticated
using (public.can_access_project_subject_conversation(project_id));

drop policy if exists subject_messages_insert on public.subject_messages;
create policy subject_messages_insert
on public.subject_messages
for insert
to authenticated
with check (
  public.can_access_project_subject_conversation(project_id)
  and public.is_subject_conversation_locked(subject_id) = false
  and author_person_id = public.current_person_id()
);

drop policy if exists subject_messages_update_author_unseen on public.subject_messages;
create policy subject_messages_update_author_unseen
on public.subject_messages
for update
to authenticated
using (
  public.can_access_project_subject_conversation(project_id)
  and author_person_id = public.current_person_id()
  and public.subject_message_is_editable(id)
)
with check (
  public.can_access_project_subject_conversation(project_id)
  and author_person_id = public.current_person_id()
  and public.subject_message_is_editable(id)
);

drop policy if exists subject_messages_delete_author_unseen on public.subject_messages;
create policy subject_messages_delete_author_unseen
on public.subject_messages
for delete
to authenticated
using (
  public.can_access_project_subject_conversation(project_id)
  and author_person_id = public.current_person_id()
  and public.subject_message_is_editable(id)
);

drop policy if exists subject_message_attachments_select on public.subject_message_attachments;
create policy subject_message_attachments_select
on public.subject_message_attachments
for select
to authenticated
using (public.can_access_project_subject_conversation(project_id));

drop policy if exists subject_message_attachments_insert on public.subject_message_attachments;
create policy subject_message_attachments_insert
on public.subject_message_attachments
for insert
to authenticated
with check (
  public.can_access_project_subject_conversation(project_id)
  and uploaded_by_person_id = public.current_person_id()
);

drop policy if exists subject_message_attachments_update_uploader on public.subject_message_attachments;
create policy subject_message_attachments_update_uploader
on public.subject_message_attachments
for update
to authenticated
using (
  public.can_access_project_subject_conversation(project_id)
  and uploaded_by_person_id = public.current_person_id()
)
with check (
  public.can_access_project_subject_conversation(project_id)
  and uploaded_by_person_id = public.current_person_id()
);

drop policy if exists subject_message_mentions_select on public.subject_message_mentions;
create policy subject_message_mentions_select
on public.subject_message_mentions
for select
to authenticated
using (public.can_access_project_subject_conversation(project_id));

drop policy if exists subject_message_mentions_insert on public.subject_message_mentions;
create policy subject_message_mentions_insert
on public.subject_message_mentions
for insert
to authenticated
with check (public.can_access_project_subject_conversation(project_id));

drop policy if exists subject_message_mentions_delete on public.subject_message_mentions;
create policy subject_message_mentions_delete
on public.subject_message_mentions
for delete
to authenticated
using (public.can_access_project_subject_conversation(project_id));

drop policy if exists subject_message_events_select on public.subject_message_events;
create policy subject_message_events_select
on public.subject_message_events
for select
to authenticated
using (public.can_access_project_subject_conversation(project_id));

drop policy if exists subject_message_events_insert on public.subject_message_events;
create policy subject_message_events_insert
on public.subject_message_events
for insert
to authenticated
with check (public.can_access_project_subject_conversation(project_id));

drop policy if exists subject_message_reads_select on public.subject_message_reads;
create policy subject_message_reads_select
on public.subject_message_reads
for select
to authenticated
using (public.can_access_project_subject_conversation(project_id));

drop policy if exists subject_message_reads_insert on public.subject_message_reads;
create policy subject_message_reads_insert
on public.subject_message_reads
for insert
to authenticated
with check (
  public.can_access_project_subject_conversation(project_id)
  and reader_person_id = public.current_person_id()
);

drop policy if exists subject_notifications_select_recipient on public.subject_notifications;
create policy subject_notifications_select_recipient
on public.subject_notifications
for select
to authenticated
using (
  person_id = public.current_person_id()
  and public.can_access_project_subject_conversation(project_id)
);

drop policy if exists subject_notifications_update_recipient on public.subject_notifications;
create policy subject_notifications_update_recipient
on public.subject_notifications
for update
to authenticated
using (person_id = public.current_person_id())
with check (person_id = public.current_person_id());

insert into storage.buckets (id, name, public)
values ('subject-message-attachments', 'subject-message-attachments', false)
on conflict (id) do nothing;

drop policy if exists storage_subject_message_attachments_select on storage.objects;
create policy storage_subject_message_attachments_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'subject-message-attachments'
  and exists (
    select 1
    from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and public.can_access_project_subject_conversation(p.id)
  )
);

drop policy if exists storage_subject_message_attachments_insert on storage.objects;
create policy storage_subject_message_attachments_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'subject-message-attachments'
  and (storage.foldername(name))[1] is not null
  and exists (
    select 1
    from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and public.can_access_project_subject_conversation(p.id)
  )
);

drop policy if exists storage_subject_message_attachments_update on storage.objects;
create policy storage_subject_message_attachments_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'subject-message-attachments'
  and exists (
    select 1
    from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and public.can_access_project_subject_conversation(p.id)
  )
)
with check (
  bucket_id = 'subject-message-attachments'
  and exists (
    select 1
    from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and public.can_access_project_subject_conversation(p.id)
  )
);

drop policy if exists storage_subject_message_attachments_delete on storage.objects;
create policy storage_subject_message_attachments_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'subject-message-attachments'
  and exists (
    select 1
    from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and public.can_access_project_subject_conversation(p.id)
  )
);

grant execute on function public.current_person_id() to authenticated;
grant execute on function public.is_active_project_collaborator(uuid, uuid) to authenticated;
grant execute on function public.can_access_project_subject_conversation(uuid) to authenticated;
grant execute on function public.can_lock_project_subject_conversation(uuid) to authenticated;
grant execute on function public.is_subject_conversation_locked(uuid) to authenticated;
grant execute on function public.subject_message_is_editable(uuid) to authenticated;
grant execute on function public.freeze_subject_message(uuid, text) to authenticated;
grant execute on function public.lock_subject_conversation(uuid, text) to authenticated;
grant execute on function public.unlock_subject_conversation(uuid) to authenticated;
grant execute on function public.link_subject_message_attachments(uuid, uuid, uuid) to authenticated;
grant execute on function public.soft_delete_subject_message(uuid) to authenticated;
