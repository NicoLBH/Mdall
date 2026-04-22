create or replace function public.create_manual_subject(
  p_project_id uuid,
  p_title text,
  p_actor_person_id uuid,
  p_subject_type text default 'explicit_problem'
)
returns table (
  id uuid,
  project_id uuid,
  title text,
  status text,
  priority text,
  created_at timestamptz,
  updated_at timestamptz,
  subject_number bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_project public.projects;
  v_subject public.subjects;
  v_manual_document public.documents;
  v_manual_analysis_run public.analysis_runs;
  v_person_id uuid;
  v_title text := trim(coalesce(p_title, ''));
  v_subject_type text := trim(coalesce(p_subject_type, 'explicit_problem'));
  v_document_storage_path text;
  v_actor_label text;
  v_result_label text;
begin
  if p_project_id is null then
    raise exception 'project_id is required';
  end if;

  select *
    into v_project
  from public.projects p
  where p.id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found';
  end if;

  if not public.can_access_project_subject_conversation(v_project.id) then
    raise exception 'Insufficient rights to create manual subject';
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

  if v_title = '' then
    raise exception 'Subject title cannot be empty';
  end if;

  if v_subject_type not in ('explicit_problem', 'validation_point', 'missing_or_inconsistency') then
    raise exception 'Invalid subject type';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_project.id::text, 0));

  v_document_storage_path := format('system/manual-subjects/%s.json', v_project.id::text);

  select *
    into v_manual_document
  from public.documents d
  where d.project_id = v_project.id
    and d.document_kind = 'manual_subjects_system'
  order by d.created_at asc
  limit 1;

  if v_manual_document.id is null then
    insert into public.documents (
      project_id,
      filename,
      original_filename,
      mime_type,
      storage_bucket,
      storage_path,
      upload_status,
      document_kind
    )
    values (
      v_project.id,
      'manual-subjects-system.json',
      'manual-subjects-system.json',
      'application/json',
      'documents',
      v_document_storage_path,
      'uploaded',
      'manual_subjects_system'
    )
    returning * into v_manual_document;
  end if;

  select *
    into v_manual_analysis_run
  from public.analysis_runs ar
  where ar.project_id = v_project.id
    and ar.document_id = v_manual_document.id
    and ar.trigger_source = 'manual_subjects_system'
  order by ar.created_at desc
  limit 1;

  if v_manual_analysis_run.id is null then
    insert into public.analysis_runs (
      project_id,
      document_id,
      status,
      trigger_source,
      started_at,
      finished_at
    )
    values (
      v_project.id,
      v_manual_document.id,
      'succeeded',
      'manual_subjects_system',
      now(),
      now()
    )
    returning * into v_manual_analysis_run;
  end if;

  insert into public.subjects (
    project_id,
    document_id,
    analysis_run_id,
    subject_type,
    title,
    normalized_title,
    priority,
    status
  )
  values (
    v_project.id,
    v_manual_document.id,
    v_manual_analysis_run.id,
    v_subject_type,
    v_title,
    v_title,
    'medium',
    'open'
  )
  returning * into v_subject;

  select coalesce(
    nullif(trim(concat_ws(' ', coalesce(dp.first_name, ''), coalesce(dp.last_name, ''))), ''),
    nullif(trim(coalesce(dp.email, '')), ''),
    'Utilisateur'
  )
    into v_actor_label
  from public.directory_people dp
  where dp.id = v_person_id;

  v_result_label := format('a créé le sujet « %s »', v_title);

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
    'subject_created',
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    auth.uid(),
    'Sujet créé',
    v_result_label,
    jsonb_build_object(
      'action', 'created',
      'field', 'subject',
      'before', '{}'::jsonb,
      'after', jsonb_build_object(
        'id', v_subject.id,
        'subject_number', v_subject.subject_number,
        'title', coalesce(v_subject.title, ''),
        'status', coalesce(v_subject.status, ''),
        'priority', coalesce(v_subject.priority, ''),
        'subject_type', coalesce(v_subject.subject_type, '')
      ),
      'delta', jsonb_build_object('created', true),
      'result_label', v_result_label,
      'display', jsonb_build_object('result_label', v_result_label),
      'actor_person_id', v_person_id
    )
  );

  return query
  select
    v_subject.id,
    v_subject.project_id,
    v_subject.title,
    v_subject.status,
    v_subject.priority,
    v_subject.created_at,
    v_subject.updated_at,
    v_subject.subject_number;
end;
$$;

grant execute on function public.create_manual_subject(uuid, text, uuid, text) to authenticated;
revoke all on function public.create_manual_subject(uuid, text, uuid, text) from public;

comment on function public.create_manual_subject(uuid, text, uuid, text) is
  'Creates a manual subject with per-project system document/analysis_run compatibility records, then appends business history event.';
