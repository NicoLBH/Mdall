-- Step 3: wire subject_history business timeline events for metadata collections.
-- `public.subject_history` is the single source of truth for business timeline activities.

create or replace function public.subject_history_actor_label(p_person_id uuid)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(trim(concat_ws(' ', coalesce(dp.first_name, ''), coalesce(dp.last_name, ''))), ''),
    nullif(trim(coalesce(dp.email, '')), ''),
    'Utilisateur'
  )
  from public.directory_people dp
  where dp.id = p_person_id;
$$;

create or replace function public.subject_history_collection_action(
  p_added_count integer,
  p_removed_count integer
)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_added_count, 0) > 0 and coalesce(p_removed_count, 0) = 0 then 'added'
    when coalesce(p_added_count, 0) = 0 and coalesce(p_removed_count, 0) > 0 then 'removed'
    else 'replaced'
  end;
$$;

create or replace function public.replace_subject_assignees(
  p_subject_id uuid,
  p_person_ids uuid[] default null,
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
begin
  select * into v_subject from public.subjects s where s.id = p_subject_id;
  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  if not public.can_access_project_subject_conversation(v_subject.project_id) then
    raise exception 'Insufficient rights to update subject assignees';
  end if;

  v_person_id := coalesce(p_actor_person_id, public.current_person_id());
  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  if not exists (select 1 from public.directory_people dp where dp.id = v_person_id) then
    raise exception 'Invalid actor person id';
  end if;

  select array_agg(sa.person_id order by sa.person_id)
    into v_before_ids
  from public.subject_assignees sa
  where sa.subject_id = v_subject.id;

  select array_agg(person_id order by person_id)
    into v_after_ids
  from (
    select distinct x as person_id
    from unnest(coalesce(p_person_ids, '{}'::uuid[])) as x
    where x is not null
  ) dedup;

  v_before_ids := coalesce(v_before_ids, '{}');
  v_after_ids := coalesce(v_after_ids, '{}');

  if v_before_ids = v_after_ids then
    return jsonb_build_object('changed', false, 'before_ids', v_before_ids, 'after_ids', v_after_ids);
  end if;

  v_added_ids := array(
    select x
    from unnest(v_after_ids) as x
    where not (x = any(v_before_ids))
    order by x
  );

  v_removed_ids := array(
    select x
    from unnest(v_before_ids) as x
    where not (x = any(v_after_ids))
    order by x
  );

  delete from public.subject_assignees sa
  where sa.subject_id = v_subject.id
    and not (sa.person_id = any(v_after_ids));

  insert into public.subject_assignees (project_id, subject_id, person_id)
  select v_subject.project_id, v_subject.id, x
  from unnest(v_after_ids) as x
  on conflict (subject_id, person_id) do nothing;

  update public.subjects s
  set
    assignee_person_id = v_after_ids[1],
    updated_at = now()
  where s.id = v_subject.id
  returning * into v_subject;

  v_added_count := cardinality(coalesce(v_added_ids, '{}'));
  v_removed_count := cardinality(coalesce(v_removed_ids, '{}'));
  v_action := public.subject_history_collection_action(v_added_count, v_removed_count);

  v_result_label := case
    when v_action = 'added' and v_added_count = 1 then 'a ajouté un assigné'
    when v_action = 'added' then format('a ajouté %s assignés', v_added_count)
    when v_action = 'removed' and v_removed_count = 1 then 'a retiré un assigné'
    when v_action = 'removed' then format('a retiré %s assignés', v_removed_count)
    else 'a remplacé les assignés'
  end;

  v_actor_label := public.subject_history_actor_label(v_person_id);

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
    'subject_assignees_changed',
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    auth.uid(),
    'Assignés modifiés',
    v_result_label,
    jsonb_build_object(
      'action', v_action,
      'field', 'assignees',
      'before', jsonb_build_object('ids', coalesce(to_jsonb(v_before_ids), '[]'::jsonb)),
      'after', jsonb_build_object('ids', coalesce(to_jsonb(v_after_ids), '[]'::jsonb)),
      'delta', jsonb_build_object(
        'added', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', dp.id,
            'label', coalesce(nullif(trim(concat_ws(' ', coalesce(dp.first_name, ''), coalesce(dp.last_name, ''))), ''), dp.email, dp.id::text)
          ) order by dp.id)
          from public.directory_people dp
          where dp.id = any(v_added_ids)
        ), '[]'::jsonb),
        'removed', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', dp.id,
            'label', coalesce(nullif(trim(concat_ws(' ', coalesce(dp.first_name, ''), coalesce(dp.last_name, ''))), ''), dp.email, dp.id::text)
          ) order by dp.id)
          from public.directory_people dp
          where dp.id = any(v_removed_ids)
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

grant execute on function public.replace_subject_assignees(uuid, uuid[], uuid) to authenticated;
revoke all on function public.replace_subject_assignees(uuid, uuid[], uuid) from public;

create or replace function public.replace_subject_labels(
  p_subject_id uuid,
  p_label_ids uuid[] default null,
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
begin
  select * into v_subject from public.subjects s where s.id = p_subject_id;
  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  if not public.can_access_project_subject_conversation(v_subject.project_id) then
    raise exception 'Insufficient rights to update subject labels';
  end if;

  v_person_id := coalesce(p_actor_person_id, public.current_person_id());
  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  if not exists (select 1 from public.directory_people dp where dp.id = v_person_id) then
    raise exception 'Invalid actor person id';
  end if;

  select array_agg(sl.label_id order by sl.label_id)
    into v_before_ids
  from public.subject_labels sl
  where sl.subject_id = v_subject.id;

  select array_agg(label_id order by label_id)
    into v_after_ids
  from (
    select distinct x as label_id
    from unnest(coalesce(p_label_ids, '{}'::uuid[])) as x
    where x is not null
  ) dedup;

  v_before_ids := coalesce(v_before_ids, '{}');
  v_after_ids := coalesce(v_after_ids, '{}');

  if v_before_ids = v_after_ids then
    return jsonb_build_object('changed', false, 'before_ids', v_before_ids, 'after_ids', v_after_ids);
  end if;

  v_added_ids := array(select x from unnest(v_after_ids) as x where not (x = any(v_before_ids)) order by x);
  v_removed_ids := array(select x from unnest(v_before_ids) as x where not (x = any(v_after_ids)) order by x);

  delete from public.subject_labels sl
  where sl.subject_id = v_subject.id
    and not (sl.label_id = any(v_after_ids));

  insert into public.subject_labels (project_id, subject_id, label_id)
  select v_subject.project_id, v_subject.id, x
  from unnest(v_after_ids) as x
  on conflict (subject_id, label_id) do nothing;

  update public.subjects s set updated_at = now() where s.id = v_subject.id returning * into v_subject;

  v_added_count := cardinality(coalesce(v_added_ids, '{}'));
  v_removed_count := cardinality(coalesce(v_removed_ids, '{}'));
  v_action := public.subject_history_collection_action(v_added_count, v_removed_count);

  v_result_label := case
    when v_action = 'added' and v_added_count = 1 then 'a ajouté un label'
    when v_action = 'added' then format('a ajouté %s labels', v_added_count)
    when v_action = 'removed' and v_removed_count = 1 then 'a retiré un label'
    when v_action = 'removed' then format('a retiré %s labels', v_removed_count)
    else 'a remplacé les labels'
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
    'subject_labels_changed',
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    auth.uid(),
    'Labels modifiés',
    v_result_label,
    jsonb_build_object(
      'action', v_action,
      'field', 'labels',
      'before', jsonb_build_object('ids', coalesce(to_jsonb(v_before_ids), '[]'::jsonb)),
      'after', jsonb_build_object('ids', coalesce(to_jsonb(v_after_ids), '[]'::jsonb)),
      'delta', jsonb_build_object(
        'added', coalesce((
          select jsonb_agg(jsonb_build_object('id', pl.id, 'label', coalesce(nullif(trim(pl.name), ''), pl.label_key, pl.id::text)) order by pl.id)
          from public.project_labels pl
          where pl.id = any(v_added_ids)
        ), '[]'::jsonb),
        'removed', coalesce((
          select jsonb_agg(jsonb_build_object('id', pl.id, 'label', coalesce(nullif(trim(pl.name), ''), pl.label_key, pl.id::text)) order by pl.id)
          from public.project_labels pl
          where pl.id = any(v_removed_ids)
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

grant execute on function public.replace_subject_labels(uuid, uuid[], uuid) to authenticated;
revoke all on function public.replace_subject_labels(uuid, uuid[], uuid) from public;

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

  if v_before_ids = v_after_ids then
    return jsonb_build_object('changed', false, 'before_ids', v_before_ids, 'after_ids', v_after_ids);
  end if;

  v_added_ids := array(select x from unnest(v_after_ids) as x where not (x = any(v_before_ids)) order by x);
  v_removed_ids := array(select x from unnest(v_before_ids) as x where not (x = any(v_after_ids)) order by x);

  delete from public.situation_subjects ss
  where ss.subject_id = v_subject.id
    and not (ss.situation_id = any(v_after_ids));

  insert into public.situation_subjects (project_id, situation_id, subject_id)
  select v_subject.project_id, x, v_subject.id
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
          select jsonb_agg(jsonb_build_object('id', si.id, 'label', coalesce(nullif(trim(si.title), ''), si.id::text)) order by si.id)
          from public.situations si
          where si.id = any(v_added_ids)
        ), '[]'::jsonb),
        'removed', coalesce((
          select jsonb_agg(jsonb_build_object('id', si.id, 'label', coalesce(nullif(trim(si.title), ''), si.id::text)) order by si.id)
          from public.situations si
          where si.id = any(v_removed_ids)
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

grant execute on function public.replace_subject_situations(uuid, uuid[], uuid) to authenticated;
revoke all on function public.replace_subject_situations(uuid, uuid[], uuid) from public;

create or replace function public.replace_subject_objectives(
  p_subject_id uuid,
  p_objective_ids uuid[] default null,
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
begin
  select * into v_subject from public.subjects s where s.id = p_subject_id;
  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  if not public.can_access_project_subject_conversation(v_subject.project_id) then
    raise exception 'Insufficient rights to update subject objectives';
  end if;

  v_person_id := coalesce(p_actor_person_id, public.current_person_id());
  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  if not exists (select 1 from public.directory_people dp where dp.id = v_person_id) then
    raise exception 'Invalid actor person id';
  end if;

  select array_agg(ms.milestone_id order by ms.milestone_id)
    into v_before_ids
  from public.milestone_subjects ms
  where ms.subject_id = v_subject.id;

  select array_agg(objective_id order by objective_id)
    into v_after_ids
  from (
    select distinct x as objective_id
    from unnest(coalesce(p_objective_ids, '{}'::uuid[])) as x
    where x is not null
  ) dedup;

  v_before_ids := coalesce(v_before_ids, '{}');
  v_after_ids := coalesce(v_after_ids, '{}');

  if v_before_ids = v_after_ids then
    return jsonb_build_object('changed', false, 'before_ids', v_before_ids, 'after_ids', v_after_ids);
  end if;

  v_added_ids := array(select x from unnest(v_after_ids) as x where not (x = any(v_before_ids)) order by x);
  v_removed_ids := array(select x from unnest(v_before_ids) as x where not (x = any(v_after_ids)) order by x);

  delete from public.milestone_subjects ms
  where ms.subject_id = v_subject.id
    and not (ms.milestone_id = any(v_after_ids));

  insert into public.milestone_subjects (milestone_id, subject_id)
  select x, v_subject.id
  from unnest(v_after_ids) as x
  on conflict (milestone_id, subject_id) do nothing;

  update public.subjects s
  set
    milestone_id = v_after_ids[1],
    updated_at = now()
  where s.id = v_subject.id
  returning * into v_subject;

  v_added_count := cardinality(coalesce(v_added_ids, '{}'));
  v_removed_count := cardinality(coalesce(v_removed_ids, '{}'));
  v_action := public.subject_history_collection_action(v_added_count, v_removed_count);

  v_result_label := case
    when v_action = 'added' and v_added_count = 1 then 'a ajouté un objectif'
    when v_action = 'added' then format('a ajouté %s objectifs', v_added_count)
    when v_action = 'removed' and v_removed_count = 1 then 'a retiré un objectif'
    when v_action = 'removed' then format('a retiré %s objectifs', v_removed_count)
    else 'a remplacé les objectifs'
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
    'subject_objectives_changed',
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    auth.uid(),
    'Objectifs modifiés',
    v_result_label,
    jsonb_build_object(
      'action', v_action,
      'field', 'objectives',
      'before', jsonb_build_object('ids', coalesce(to_jsonb(v_before_ids), '[]'::jsonb)),
      'after', jsonb_build_object('ids', coalesce(to_jsonb(v_after_ids), '[]'::jsonb)),
      'delta', jsonb_build_object(
        'added', coalesce((
          select jsonb_agg(jsonb_build_object('id', m.id, 'label', coalesce(nullif(trim(m.title), ''), m.id::text)) order by m.id)
          from public.milestones m
          where m.id = any(v_added_ids)
        ), '[]'::jsonb),
        'removed', coalesce((
          select jsonb_agg(jsonb_build_object('id', m.id, 'label', coalesce(nullif(trim(m.title), ''), m.id::text)) order by m.id)
          from public.milestones m
          where m.id = any(v_removed_ids)
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

grant execute on function public.replace_subject_objectives(uuid, uuid[], uuid) to authenticated;
revoke all on function public.replace_subject_objectives(uuid, uuid[], uuid) from public;

comment on function public.replace_subject_assignees(uuid, uuid[], uuid) is
  'Remplace les assignés d''un sujet et écrit une activité consolidée dans subject_history (source de vérité timeline métier).';

comment on function public.replace_subject_labels(uuid, uuid[], uuid) is
  'Remplace les labels d''un sujet et écrit une activité consolidée dans subject_history (source de vérité timeline métier).';

comment on function public.replace_subject_situations(uuid, uuid[], uuid) is
  'Remplace les situations d''un sujet et écrit une activité consolidée dans subject_history (source de vérité timeline métier).';

comment on function public.replace_subject_objectives(uuid, uuid[], uuid) is
  'Remplace les objectifs d''un sujet et écrit une activité consolidée dans subject_history (source de vérité timeline métier).';
