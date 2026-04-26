-- RPC for subject -> Mdall exchange bootstrap (creates human message only).

create or replace function public.create_subject_mdall_exchange(
  p_subject_id uuid,
  p_body_markdown text,
  p_is_ephemeral boolean default false,
  p_parent_message_id uuid default null,
  p_mentions jsonb default '[]'::jsonb,
  p_client_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subject public.subjects;
  v_person_id uuid;
  v_mdall_person_id uuid;
  v_user_message public.subject_messages;
  v_visible_until timestamptz;
  v_mentions jsonb;
  v_mention_item jsonb;
  v_mentioned_person_id_text text;
  v_mentioned_person_id uuid;
  v_display_label text;
  v_client_request_id uuid;
begin
  if p_subject_id is null then
    raise exception 'Subject is required';
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

  v_person_id := public.current_person_id();

  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  v_client_request_id := coalesce(p_client_request_id, gen_random_uuid());
  v_visible_until := case when coalesce(p_is_ephemeral, false) then now() + interval '60 seconds' else null end;

  insert into public.directory_people (
    email,
    first_name,
    linked_user_id,
    created_by_user_id
  )
  values (
    'mdall@system.local',
    'Mdall',
    null,
    auth.uid()
  )
  on conflict (email_normalized) do update
  set
    first_name = coalesce(public.directory_people.first_name, excluded.first_name),
    linked_user_id = null,
    updated_at = now()
  returning id into v_mdall_person_id;

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
    v_person_id,
    auth.uid(),
    btrim(p_body_markdown),
    case when coalesce(p_is_ephemeral, false) then 'ephemeral' else 'normal' end,
    v_visible_until,
    'human',
    null,
    jsonb_build_object(
      'mdall_exchange', true,
      'client_request_id', v_client_request_id
    )
  )
  returning * into v_user_message;

  v_mentions := coalesce(p_mentions, '[]'::jsonb);

  if jsonb_typeof(v_mentions) <> 'array' then
    raise exception 'Mentions must be a JSON array';
  end if;

  for v_mention_item in
    select value
    from jsonb_array_elements(v_mentions)
  loop
    v_mentioned_person_id_text := nullif(
      coalesce(
        v_mention_item->>'personId',
        v_mention_item->>'mentioned_person_id',
        v_mention_item->>'mentionedPersonId'
      ),
      ''
    );

    if v_mentioned_person_id_text is null
       or v_mentioned_person_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      continue;
    end if;

    v_mentioned_person_id := v_mentioned_person_id_text::uuid;
    v_display_label := nullif(
      btrim(
        coalesce(
          v_mention_item->>'label',
          v_mention_item->>'display_label',
          v_mention_item->>'displayLabel',
          ''
        )
      ),
      ''
    );

    insert into public.subject_message_mentions (
      project_id,
      subject_id,
      message_id,
      mentioned_person_id,
      display_label
    )
    values (
      v_subject.project_id,
      v_subject.id,
      v_user_message.id,
      v_mentioned_person_id,
      v_display_label
    )
    on conflict (message_id, mentioned_person_id) do nothing;
  end loop;

  return jsonb_build_object(
    'user_message_id', v_user_message.id,
    'mdall_person_id', v_mdall_person_id,
    'subject_id', v_subject.id,
    'project_id', v_subject.project_id,
    'is_ephemeral', coalesce(p_is_ephemeral, false),
    'visible_until', v_visible_until,
    'client_request_id', v_client_request_id
  );
end;
$$;

grant execute on function public.create_subject_mdall_exchange(uuid, text, boolean, uuid, jsonb, uuid)
to authenticated;
