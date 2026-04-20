-- Align subject description RPC actor resolution with frontend identity bootstrap.
-- Accept an explicit directory person id and only fallback to current_person_id().

drop function if exists public.update_subject_description(uuid, text, uuid);

create or replace function public.update_subject_description(
  p_subject_id uuid,
  p_description text,
  p_upload_session_id uuid default null,
  p_actor_person_id uuid default null
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
      'format', 'markdown'
    )
  );

  v_stage := 'build rpc payload';
  select jsonb_build_object(
    'id', v_subject.id,
    'project_id', v_subject.project_id,
    'description', coalesce(v_subject.description, ''),
    'updated_at', v_subject.updated_at,
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
      message = format('update_subject_description failed at stage "%s": %s', v_stage, coalesce(v_sqlerrm, 'unknown error')),
      detail = format(
        'sqlstate=%s; detail=%s; hint=%s',
        coalesce(v_sqlstate, 'n/a'),
        coalesce(v_detail, ''),
        coalesce(v_hint, '')
      );
end;
$$;

grant execute on function public.update_subject_description(uuid, text, uuid, uuid) to authenticated;
revoke all on function public.update_subject_description(uuid, text, uuid, uuid) from public;
