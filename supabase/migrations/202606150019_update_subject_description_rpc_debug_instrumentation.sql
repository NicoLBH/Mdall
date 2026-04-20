-- Add debug correlation id support and a read-only diagnostic preflight RPC
-- for update_subject_description troubleshooting.

drop function if exists public.update_subject_description(uuid, text, uuid, uuid);

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
  select coalesce(dp.display_name, dp.full_name, dp.email, 'Utilisateur')
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
    'Description du sujet mise à jour',
    'La description du sujet a été mise à jour depuis l''éditeur riche.',
    jsonb_build_object(
      'previous_description', v_previous_description,
      'next_description', coalesce(v_subject.description, ''),
      'attachment_count', v_attachment_count,
      'upload_session_id', p_upload_session_id,
      'format', 'markdown',
      'debug_request_id', v_debug_request_id
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

create or replace function public.debug_update_subject_description_context(
  p_subject_id uuid,
  p_upload_session_id uuid default null,
  p_actor_person_id uuid default null,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subject public.subjects;
  v_subject_found boolean := false;
  v_subject_project_id uuid := null;
  v_can_access boolean := null;
  v_current_person_id uuid := null;
  v_provided_actor_person_exists boolean := false;
  v_effective_actor_person_id uuid := null;
  v_upload_session_attachment_count integer := 0;
  v_attachments_match_actor integer := 0;
  v_attachments_match_subject integer := 0;
  v_notes text[] := array[]::text[];
  v_warnings text[] := array[]::text[];
begin
  if p_subject_id is null then
    return jsonb_build_object(
      'auth_uid', auth.uid(),
      'subject_found', false,
      'subject_project_id', null,
      'can_access_project_subject_conversation', null,
      'current_person_id', public.current_person_id(),
      'provided_actor_person_id', p_actor_person_id,
      'provided_actor_person_exists', false,
      'effective_actor_person_id', coalesce(p_actor_person_id, public.current_person_id()),
      'upload_session_attachment_count', 0,
      'attachments_match_actor', 0,
      'attachments_match_subject', 0,
      'rpc_signature_expected', 'public.update_subject_description(uuid, text, uuid, uuid, text)',
      'description_length', length(coalesce(p_description, '')),
      'notes', jsonb_build_array('missing_subject_id'),
      'warnings', jsonb_build_array('cannot evaluate subject/project access without subject id')
    );
  end if;

  select * into v_subject
  from public.subjects s
  where s.id = p_subject_id;

  v_subject_found := v_subject.id is not null;
  v_subject_project_id := v_subject.project_id;
  v_current_person_id := public.current_person_id();

  if p_actor_person_id is not null then
    select exists(
      select 1 from public.directory_people dp where dp.id = p_actor_person_id
    ) into v_provided_actor_person_exists;
  end if;

  v_effective_actor_person_id := coalesce(p_actor_person_id, v_current_person_id);

  if v_subject_found then
    v_can_access := public.can_access_project_subject_conversation(v_subject.project_id);
  else
    v_warnings := array_append(v_warnings, 'subject_not_found');
  end if;

  if p_upload_session_id is not null then
    select count(*)
      into v_upload_session_attachment_count
    from public.subject_message_attachments sma
    where sma.deleted_at is null
      and sma.upload_session_id = p_upload_session_id;

    if v_effective_actor_person_id is not null then
      select count(*)
        into v_attachments_match_actor
      from public.subject_message_attachments sma
      where sma.deleted_at is null
        and sma.upload_session_id = p_upload_session_id
        and sma.uploaded_by_person_id = v_effective_actor_person_id;
    end if;

    if p_subject_id is not null then
      select count(*)
        into v_attachments_match_subject
      from public.subject_message_attachments sma
      where sma.deleted_at is null
        and sma.upload_session_id = p_upload_session_id
        and sma.subject_id = p_subject_id;
    end if;
  else
    v_notes := array_append(v_notes, 'no_upload_session_id');
  end if;

  if not v_subject_found then
    v_warnings := array_append(v_warnings, 'subject_not_visible_or_not_found');
  end if;
  if v_subject_found and v_can_access is false then
    v_warnings := array_append(v_warnings, 'access_check_failed');
  end if;
  if v_effective_actor_person_id is null then
    v_warnings := array_append(v_warnings, 'effective_actor_person_is_null');
  end if;
  if p_actor_person_id is not null and not v_provided_actor_person_exists then
    v_warnings := array_append(v_warnings, 'provided_actor_person_missing');
  end if;

  return jsonb_build_object(
    'auth_uid', auth.uid(),
    'subject_found', v_subject_found,
    'subject_project_id', v_subject_project_id,
    'can_access_project_subject_conversation', v_can_access,
    'current_person_id', v_current_person_id,
    'provided_actor_person_id', p_actor_person_id,
    'provided_actor_person_exists', v_provided_actor_person_exists,
    'effective_actor_person_id', v_effective_actor_person_id,
    'upload_session_attachment_count', v_upload_session_attachment_count,
    'attachments_match_actor', v_attachments_match_actor,
    'attachments_match_subject', v_attachments_match_subject,
    'rpc_signature_expected', 'public.update_subject_description(uuid, text, uuid, uuid, text)',
    'description_length', length(coalesce(p_description, '')),
    'notes', to_jsonb(v_notes),
    'warnings', to_jsonb(v_warnings)
  );
end;
$$;

grant execute on function public.debug_update_subject_description_context(uuid, uuid, uuid, text) to authenticated;
revoke all on function public.debug_update_subject_description_context(uuid, uuid, uuid, text) from public;
