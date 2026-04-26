-- RPC to insert Mdall replies as conversation messages.

create or replace function public.insert_subject_mdall_reply(
  p_subject_id uuid,
  p_body_markdown text,
  p_mdall_person_id uuid,
  p_is_ephemeral boolean default false,
  p_parent_message_id uuid default null,
  p_llm_request_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subject public.subjects;
  v_visible_until timestamptz;
  v_inserted public.subject_messages;
  v_metadata jsonb;
  v_email_normalized text;
begin
  if p_subject_id is null then
    raise exception 'Subject is required';
  end if;

  if p_mdall_person_id is null then
    raise exception 'Mdall person id is required';
  end if;

  if nullif(btrim(coalesce(p_body_markdown, '')), '') is null then
    raise exception 'Message body cannot be empty';
  end if;

  select *
    into v_subject
  from public.subjects s
  where s.id = p_subject_id;

  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  if not public.can_access_project_subject_conversation(v_subject.project_id) then
    raise exception 'Not allowed to access this subject conversation';
  end if;

  if public.is_subject_conversation_locked(v_subject.id) then
    raise exception 'Subject conversation is locked';
  end if;

  select dp.email_normalized
    into v_email_normalized
  from public.directory_people dp
  where dp.id = p_mdall_person_id;

  if v_email_normalized is null then
    raise exception 'Mdall person not found';
  end if;

  if v_email_normalized <> 'mdall@system.local' then
    raise exception 'Only mdall@system.local can be used for Mdall replies';
  end if;

  v_visible_until := case when coalesce(p_is_ephemeral, false) then now() + interval '60 seconds' else null end;
  v_metadata := coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('mdall_reply', true);

  insert into public.subject_messages (
    project_id,
    subject_id,
    parent_message_id,
    author_person_id,
    author_user_id,
    body_markdown,
    visibility,
    visible_until,
    origin,
    llm_request_id,
    metadata
  )
  values (
    v_subject.project_id,
    v_subject.id,
    p_parent_message_id,
    p_mdall_person_id,
    null,
    btrim(p_body_markdown),
    case when coalesce(p_is_ephemeral, false) then 'ephemeral' else 'normal' end,
    v_visible_until,
    'mdall',
    p_llm_request_id,
    v_metadata
  )
  returning * into v_inserted;

  return jsonb_build_object(
    'message_id', v_inserted.id,
    'subject_id', v_inserted.subject_id,
    'project_id', v_inserted.project_id,
    'origin', v_inserted.origin,
    'visibility', v_inserted.visibility,
    'visible_until', v_inserted.visible_until,
    'llm_request_id', v_inserted.llm_request_id
  );
end;
$$;

grant execute on function public.insert_subject_mdall_reply(uuid, text, uuid, boolean, uuid, uuid, jsonb)
  to authenticated;
revoke all on function public.insert_subject_mdall_reply(uuid, text, uuid, boolean, uuid, uuid, jsonb)
  from public;
