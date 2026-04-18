create or replace function public.mark_subject_message_read(
  p_message_id uuid
)
returns public.subject_message_reads
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_message public.subject_messages;
  v_person_id uuid;
  v_read public.subject_message_reads;
begin
  select *
    into v_message
  from public.subject_messages sm
  where sm.id = p_message_id;

  if v_message.id is null then
    raise exception 'Message not found';
  end if;

  if not public.can_access_project_subject_conversation(v_message.project_id) then
    raise exception 'Not allowed to read this message';
  end if;

  v_person_id := public.current_person_id();
  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  insert into public.subject_message_reads (
    project_id,
    subject_id,
    message_id,
    reader_person_id,
    reader_user_id,
    read_at
  )
  values (
    v_message.project_id,
    v_message.subject_id,
    v_message.id,
    v_person_id,
    auth.uid(),
    now()
  )
  on conflict (message_id, reader_person_id) do update
  set
    read_at = excluded.read_at,
    reader_user_id = excluded.reader_user_id
  returning * into v_read;

  return v_read;
end;
$$;

create or replace function public.trg_log_subject_message_frozen_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_frozen = false and new.is_frozen = true then
    insert into public.subject_message_events (
      project_id,
      subject_id,
      message_id,
      event_type,
      actor_person_id,
      actor_user_id,
      event_payload,
      created_at
    )
    values (
      new.project_id,
      new.subject_id,
      new.id,
      'message_frozen',
      new.author_person_id,
      new.author_user_id,
      jsonb_build_object(
        'reason', coalesce(new.frozen_reason, 'seen_by_other_user'),
        'frozen_at', coalesce(new.frozen_at, now())
      ),
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_subject_message_frozen_event on public.subject_messages;
create trigger trg_log_subject_message_frozen_event
after update on public.subject_messages
for each row
when (old.is_frozen is distinct from new.is_frozen)
execute function public.trg_log_subject_message_frozen_event();

grant execute on function public.mark_subject_message_read(uuid) to authenticated;
