begin;

create or replace function public.replace_subject_situations(
  p_subject_id uuid,
  p_situation_ids uuid[] default null,
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
  v_before_ids uuid[] := '{}';
  v_after_ids uuid[] := '{}';
  v_added_ids uuid[] := '{}';
  v_removed_ids uuid[] := '{}';
  v_added_count integer := 0;
  v_removed_count integer := 0;
  v_action text;
  v_result_label text;
  v_invalid_count integer := 0;
begin
  select * into v_subject from public.subjects s where s.id = p_subject_id;
  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  if not public.can_access_project_subject_conversation(v_subject.project_id) then
    raise exception 'Insufficient rights to update subject situations';
  end if;

  v_person_id := coalesce(p_actor_person_id, public.current_person_id());
  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  if not exists (select 1 from public.directory_people dp where dp.id = v_person_id) then
    raise exception 'Invalid actor person id';
  end if;

  select array_agg(ss.situation_id order by ss.situation_id)
    into v_before_ids
  from public.situation_subjects ss
  where ss.subject_id = v_subject.id;

  select array_agg(situation_id order by situation_id)
    into v_after_ids
  from (
    select distinct x as situation_id
    from unnest(coalesce(p_situation_ids, '{}'::uuid[])) as x
    where x is not null
  ) dedup;

  v_before_ids := coalesce(v_before_ids, '{}');
  v_after_ids := coalesce(v_after_ids, '{}');

  select count(*)
    into v_invalid_count
  from unnest(v_after_ids) x
  where not exists (
    select 1
    from public.situations st
    where st.id = x
      and st.project_id = v_subject.project_id
  );

  if v_invalid_count > 0 then
    raise exception 'One or more situations are invalid for this subject';
  end if;

  if v_before_ids = v_after_ids then
    return jsonb_build_object('changed', false, 'before_ids', v_before_ids, 'after_ids', v_after_ids);
  end if;

  v_added_ids := array(select x from unnest(v_after_ids) as x where not (x = any(v_before_ids)) order by x);
  v_removed_ids := array(select x from unnest(v_before_ids) as x where not (x = any(v_after_ids)) order by x);

  delete from public.situation_subjects ss
  where ss.subject_id = v_subject.id
    and not (ss.situation_id = any(v_after_ids));

  insert into public.situation_subjects (situation_id, subject_id)
  select x, v_subject.id
  from unnest(v_after_ids) as x
  on conflict (situation_id, subject_id) do nothing;

  update public.subjects s set updated_at = now() where s.id = v_subject.id returning * into v_subject;

  v_added_count := cardinality(coalesce(v_added_ids, '{}'));
  v_removed_count := cardinality(coalesce(v_removed_ids, '{}'));
  v_action := public.subject_history_collection_action(v_added_count, v_removed_count);

  v_result_label := case
    when v_action = 'added' and v_added_count = 1 then 'a ajouté une situation'
    when v_action = 'added' then format('a ajouté %s situations', v_added_count)
    when v_action = 'removed' and v_removed_count = 1 then 'a retiré une situation'
    when v_action = 'removed' then format('a retiré %s situations', v_removed_count)
    else 'a remplacé les situations'
  end;

  v_actor_label := public.subject_history_actor_label(v_person_id);

  insert into public.subject_history (
    project_id, subject_id, analysis_run_id, document_id, subject_observation_id,
    event_type, actor_type, actor_label, actor_user_id, title, description, event_payload
  )
  values (
    v_subject.project_id,
    v_subject.id,
    v_subject.analysis_run_id,
    v_subject.document_id,
    null,
    'subject_situations_changed',
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    auth.uid(),
    'Situations modifiées',
    v_result_label,
    jsonb_build_object(
      'action', v_action,
      'field', 'situations',
      'before', jsonb_build_object('ids', coalesce(to_jsonb(v_before_ids), '[]'::jsonb)),
      'after', jsonb_build_object('ids', coalesce(to_jsonb(v_after_ids), '[]'::jsonb)),
      'delta', jsonb_build_object(
        'added', coalesce((
          select jsonb_agg(jsonb_build_object('id', st.id, 'label', coalesce(nullif(trim(st.title), ''), st.id::text)) order by st.id)
          from public.situations st
          where st.id = any(v_added_ids)
        ), '[]'::jsonb),
        'removed', coalesce((
          select jsonb_agg(jsonb_build_object('id', st.id, 'label', coalesce(nullif(trim(st.title), ''), st.id::text)) order by st.id)
          from public.situations st
          where st.id = any(v_removed_ids)
        ), '[]'::jsonb)
      ),
      'result_label', v_result_label,
      'display', jsonb_build_object('result_label', v_result_label),
      'actor_person_id', v_person_id
    )
  );

  return jsonb_build_object('changed', true, 'before_ids', v_before_ids, 'after_ids', v_after_ids);
end;
$$;

comment on function public.replace_subject_situations(uuid, uuid[], uuid) is
  'Remplace la liste de situations d''un sujet et journalise les deltas dans subject_history.';

commit;
