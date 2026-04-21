-- Step 2: wire subject_history business timeline events for title/description/close/reopen.
-- `public.subject_history` remains the source of truth for business timeline activities.

create or replace function public.update_subject_title(
  p_subject_id uuid,
  p_title text,
  p_actor_person_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subject public.subjects;
  v_previous_title text;
  v_person_id uuid;
  v_actor_label text;
  v_next_title text := trim(coalesce(p_title, ''));
  v_result_label text;
  v_result jsonb;
begin
  select *
    into v_subject
  from public.subjects s
  where s.id = p_subject_id;

  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  if not public.can_access_project_subject_conversation(v_subject.project_id) then
    raise exception 'Insufficient rights to update subject title';
  end if;

  v_person_id := coalesce(p_actor_person_id, public.current_person_id());
  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  if not exists (
    select 1
    from public.directory_people dp
    where dp.id = v_person_id
  ) then
    raise exception 'Invalid actor person id';
  end if;

  if v_next_title = '' then
    raise exception 'Subject title cannot be empty';
  end if;

  v_previous_title := coalesce(v_subject.title, '');
  if v_previous_title = v_next_title then
    return jsonb_build_object(
      'id', v_subject.id,
      'project_id', v_subject.project_id,
      'title', v_previous_title,
      'normalized_title', coalesce(v_subject.normalized_title, v_previous_title),
      'updated_at', v_subject.updated_at
    );
  end if;

  update public.subjects s
  set
    title = v_next_title,
    normalized_title = v_next_title,
    updated_at = now()
  where s.id = v_subject.id
  returning * into v_subject;

  select coalesce(
    nullif(trim(concat_ws(' ', coalesce(dp.first_name, ''), coalesce(dp.last_name, ''))), ''),
    nullif(trim(coalesce(dp.email, '')), ''),
    'Utilisateur'
  )
    into v_actor_label
  from public.directory_people dp
  where dp.id = v_person_id;

  v_result_label := format('a modifié le titre en « %s »', v_next_title);

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
    v_subject.project_id,
    v_subject.id,
    v_subject.analysis_run_id,
    v_subject.document_id,
    null,
    'subject_title_updated',
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    auth.uid(),
    'Titre du sujet modifié',
    v_result_label,
    jsonb_build_object(
      'action', 'updated',
      'field', 'title',
      'before', jsonb_build_object('title', v_previous_title),
      'after', jsonb_build_object('title', coalesce(v_subject.title, '')),
      'delta', jsonb_build_object('changed', true),
      'result_label', v_result_label,
      'display', jsonb_build_object('result_label', v_result_label),
      'actor_person_id', v_person_id
    )
  );

  select jsonb_build_object(
    'id', v_subject.id,
    'project_id', v_subject.project_id,
    'title', coalesce(v_subject.title, ''),
    'normalized_title', coalesce(v_subject.normalized_title, ''),
    'updated_at', v_subject.updated_at
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.update_subject_title(uuid, text, uuid) to authenticated;
revoke all on function public.update_subject_title(uuid, text, uuid) from public;

create or replace function public.update_subject_description(
  p_subject_id uuid,
  p_description text,
  p_upload_session_id uuid default null,
  p_actor_person_id uuid default null,
  p_debug_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_stage text := 'init';
  v_subject public.subjects;
  v_previous_description text;
  v_person_id uuid;
  v_actor_label text;
  v_attachment_count integer := 0;
  v_next_description text := coalesce(p_description, '');
  v_result jsonb;
  v_sqlstate text;
  v_sqlerrm text;
  v_detail text;
  v_hint text;
  v_debug_request_id text := nullif(trim(coalesce(p_debug_request_id, '')), '');
  v_result_label text := 'a modifié la description';
begin
  v_stage := 'load subject';
  select *
    into v_subject
  from public.subjects s
  where s.id = p_subject_id;

  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  v_stage := 'access check';
  if not public.can_access_project_subject_conversation(v_subject.project_id) then
    raise exception 'Insufficient rights to update subject description';
  end if;

  v_stage := 'resolve actor person';
  v_person_id := coalesce(p_actor_person_id, public.current_person_id());
  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  if not exists (
    select 1
    from public.directory_people dp
    where dp.id = v_person_id
  ) then
    raise exception 'Invalid actor person id';
  end if;

  v_stage := 'capture previous description';
  v_previous_description := coalesce(v_subject.description, '');

  v_stage := 'update subjects.description';
  update public.subjects s
  set
    description = v_next_description,
    updated_at = now()
  where s.id = v_subject.id
  returning * into v_subject;

  if p_upload_session_id is not null then
    v_stage := 'link description attachments';
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

    get diagnostics v_attachment_count = row_count;
  end if;

  v_stage := 'resolve actor label';
  select coalesce(
    nullif(trim(concat_ws(' ', coalesce(dp.first_name, ''), coalesce(dp.last_name, ''))), ''),
    nullif(trim(coalesce(dp.email, '')), ''),
    'Utilisateur'
  )
    into v_actor_label
  from public.directory_people dp
  where dp.id = v_person_id;

  v_stage := 'insert subject_description_versions';
  insert into public.subject_description_versions (
    project_id,
    subject_id,
    description_markdown,
    actor_user_id,
    actor_person_id,
    created_at
  )
  values (
    v_subject.project_id,
    v_subject.id,
    coalesce(v_subject.description, ''),
    auth.uid(),
    v_person_id,
    now()
  );

  v_stage := 'insert subject_history';
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
    v_subject.project_id,
    v_subject.id,
    v_subject.analysis_run_id,
    v_subject.document_id,
    null,
    'subject_description_updated',
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    auth.uid(),
    'Description du sujet modifiée',
    v_result_label,
    jsonb_build_object(
      'action', 'updated',
      'field', 'description',
      'before', jsonb_build_object('description', v_previous_description),
      'after', jsonb_build_object('description', coalesce(v_subject.description, '')),
      'delta', jsonb_build_object(
        'changed', v_previous_description is distinct from coalesce(v_subject.description, ''),
        'attachment_count', v_attachment_count
      ),
      'result_label', v_result_label,
      'display', jsonb_build_object(
        'result_label', v_result_label,
        'redact_full_text', true
      ),
      'upload_session_id', p_upload_session_id,
      'format', 'markdown',
      'debug_request_id', v_debug_request_id,
      'actor_person_id', v_person_id
    )
  );

  v_stage := 'build rpc payload';
  select jsonb_build_object(
    'id', v_subject.id,
    'project_id', v_subject.project_id,
    'description', coalesce(v_subject.description, ''),
    'updated_at', v_subject.updated_at,
    'debug_request_id', v_debug_request_id,
    'description_attachments', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', sma.id,
          'subject_id', sma.subject_id,
          'project_id', sma.project_id,
          'file_name', sma.file_name,
          'mime_type', sma.mime_type,
          'size_bytes', sma.size_bytes,
          'storage_bucket', sma.storage_bucket,
          'storage_path', sma.storage_path,
          'sort_order', sma.sort_order,
          'created_at', sma.created_at,
          'linked_at', sma.linked_at
        )
        order by sma.sort_order asc, sma.created_at asc
      )
      from public.subject_message_attachments sma
      where sma.subject_id = v_subject.id
        and sma.message_id is null
        and sma.deleted_at is null
        and sma.linked_at is not null
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
exception
  when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate,
      v_sqlerrm = message_text,
      v_detail = pg_exception_detail,
      v_hint = pg_exception_hint;

    raise exception using
      message = format(
        'update_subject_description failed at stage "%s" [debug_request_id=%s]: %s',
        v_stage,
        coalesce(v_debug_request_id, 'n/a'),
        coalesce(v_sqlerrm, 'unknown error')
      ),
      detail = format(
        'sqlstate=%s; detail=%s; hint=%s; debug_request_id=%s',
        coalesce(v_sqlstate, 'n/a'),
        coalesce(v_detail, ''),
        coalesce(v_hint, ''),
        coalesce(v_debug_request_id, 'n/a')
      );
end;
$$;

grant execute on function public.update_subject_description(uuid, text, uuid, uuid, text) to authenticated;
revoke all on function public.update_subject_description(uuid, text, uuid, uuid, text) from public;

create or replace function public.update_subject_issue_status(
  p_subject_id uuid,
  p_action text,
  p_actor_person_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subject public.subjects;
  v_person_id uuid;
  v_actor_label text;
  v_prev_status text;
  v_prev_closure_reason text;
  v_prev_closed_at timestamptz;
  v_next_status text;
  v_next_closure_reason text;
  v_next_closed_at timestamptz;
  v_event_type text;
  v_action text;
  v_result_label text;
  v_payload jsonb;
begin
  select *
    into v_subject
  from public.subjects s
  where s.id = p_subject_id;

  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  if not public.can_access_project_subject_conversation(v_subject.project_id) then
    raise exception 'Insufficient rights to update subject status';
  end if;

  v_person_id := coalesce(p_actor_person_id, public.current_person_id());
  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  if not exists (
    select 1
    from public.directory_people dp
    where dp.id = v_person_id
  ) then
    raise exception 'Invalid actor person id';
  end if;

  v_prev_status := coalesce(v_subject.status, 'open');
  v_prev_closure_reason := v_subject.closure_reason;
  v_prev_closed_at := v_subject.closed_at;

  case trim(coalesce(p_action, ''))
    when 'issue:reopen' then
      v_next_status := 'open';
      v_next_closure_reason := null;
      v_next_closed_at := null;
      v_event_type := 'subject_reopened';
      v_action := 'reopened';
      v_result_label := 'a rouvert le sujet';
    when 'issue:close:realized' then
      v_next_status := 'closed';
      v_next_closure_reason := 'realized';
      v_next_closed_at := now();
      v_event_type := 'subject_closed';
      v_action := 'closed';
      v_result_label := 'a fermé le sujet';
    when 'issue:close:dismissed' then
      v_next_status := 'closed_invalid';
      v_next_closure_reason := 'non_pertinent';
      v_next_closed_at := now();
      v_event_type := 'subject_closed';
      v_action := 'closed';
      v_result_label := 'a fermé le sujet';
    when 'issue:close:duplicate' then
      v_next_status := 'closed_duplicate';
      v_next_closure_reason := 'duplicate';
      v_next_closed_at := now();
      v_event_type := 'subject_closed';
      v_action := 'closed';
      v_result_label := 'a fermé le sujet';
    else
      raise exception 'Unsupported subject issue action: %', p_action;
  end case;

  if v_prev_status = v_next_status
     and coalesce(v_prev_closure_reason, '') = coalesce(v_next_closure_reason, '')
     and (
       (v_prev_closed_at is null and v_next_closed_at is null)
       or (v_prev_closed_at is not null and v_next_closed_at is not null and v_prev_closed_at <= now() and v_next_closed_at <= now())
     ) then
    return jsonb_build_object(
      'id', v_subject.id,
      'project_id', v_subject.project_id,
      'status', v_prev_status,
      'closure_reason', v_prev_closure_reason,
      'closed_at', v_prev_closed_at,
      'updated_at', v_subject.updated_at,
      'history_inserted', false
    );
  end if;

  update public.subjects s
  set
    status = v_next_status,
    closure_reason = v_next_closure_reason,
    closed_at = v_next_closed_at,
    updated_at = now()
  where s.id = v_subject.id
  returning * into v_subject;

  select coalesce(
    nullif(trim(concat_ws(' ', coalesce(dp.first_name, ''), coalesce(dp.last_name, ''))), ''),
    nullif(trim(coalesce(dp.email, '')), ''),
    'Utilisateur'
  )
    into v_actor_label
  from public.directory_people dp
  where dp.id = v_person_id;

  v_payload := jsonb_build_object(
    'action', v_action,
    'field', 'status',
    'before', jsonb_build_object(
      'status', v_prev_status,
      'closure_reason', v_prev_closure_reason,
      'closed_at', v_prev_closed_at
    ),
    'after', jsonb_build_object(
      'status', v_subject.status,
      'closure_reason', v_subject.closure_reason,
      'closed_at', v_subject.closed_at
    ),
    'delta', jsonb_build_object(
      'from', v_prev_status,
      'to', coalesce(v_subject.status, ''),
      'closure_reason_changed', coalesce(v_prev_closure_reason, '') is distinct from coalesce(v_subject.closure_reason, '')
    ),
    'closure_reason', v_subject.closure_reason,
    'result_label', v_result_label,
    'display', jsonb_build_object('result_label', v_result_label),
    'actor_person_id', v_person_id
  );

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
    v_subject.project_id,
    v_subject.id,
    v_subject.analysis_run_id,
    v_subject.document_id,
    null,
    v_event_type,
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    auth.uid(),
    case when v_event_type = 'subject_reopened' then 'Sujet rouvert' else 'Sujet fermé' end,
    v_result_label,
    v_payload
  );

  return jsonb_build_object(
    'id', v_subject.id,
    'project_id', v_subject.project_id,
    'status', v_subject.status,
    'closure_reason', v_subject.closure_reason,
    'closed_at', v_subject.closed_at,
    'updated_at', v_subject.updated_at,
    'history_inserted', true
  );
end;
$$;

grant execute on function public.update_subject_issue_status(uuid, text, uuid) to authenticated;
revoke all on function public.update_subject_issue_status(uuid, text, uuid) from public;
