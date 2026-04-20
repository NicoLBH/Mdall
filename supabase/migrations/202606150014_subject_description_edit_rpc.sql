create or replace function public.update_subject_description(
  p_subject_id uuid,
  p_description text,
  p_upload_session_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subject public.subjects;
  v_previous_description text;
  v_person_id uuid;
  v_actor_label text;
  v_attachment_count integer := 0;
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
    raise exception 'Insufficient rights to update subject description';
  end if;

  v_person_id := public.current_person_id();
  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  v_previous_description := coalesce(v_subject.description, '');

  update public.subjects s
  set
    description = coalesce(p_description, ''),
    updated_at = now()
  where s.id = v_subject.id
  returning * into v_subject;

  if p_upload_session_id is not null then
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
    'Description du sujet mise à jour',
    'La description du sujet a été mise à jour depuis l\'éditeur riche.',
    jsonb_build_object(
      'previous_description', v_previous_description,
      'next_description', coalesce(v_subject.description, ''),
      'attachment_count', v_attachment_count,
      'upload_session_id', p_upload_session_id
    )
  );

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
end;
$$;

grant execute on function public.update_subject_description(uuid, text, uuid) to authenticated;
revoke all on function public.update_subject_description(uuid, text, uuid) from public;
