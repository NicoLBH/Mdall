-- Step 4: relation timeline activities (double-sens) for parent/child and blocked_by/blocking_for.
-- `public.subject_history` remains the source of truth for business timeline activities.

create or replace function public.set_subject_parent_with_history(
  p_subject_id uuid,
  p_parent_subject_id uuid default null,
  p_actor_person_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subject public.subjects;
  v_previous_parent public.subjects;
  v_next_parent public.subjects;
  v_actor_person_id uuid;
  v_actor_label text;
  v_now timestamptz := now();
  v_next_child_order integer := null;
begin
  select *
    into v_subject
  from public.subjects s
  where s.id = p_subject_id
  for update;

  if v_subject.id is null then
    raise exception 'Subject not found';
  end if;

  if not public.can_access_project_subject_conversation(v_subject.project_id) then
    raise exception 'Insufficient rights to update subject parent';
  end if;

  v_actor_person_id := coalesce(p_actor_person_id, public.current_person_id());
  if v_actor_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  if not exists (select 1 from public.directory_people p where p.id = v_actor_person_id) then
    raise exception 'Invalid actor person id';
  end if;

  v_actor_label := public.subject_history_actor_label(v_actor_person_id);

  if v_subject.parent_subject_id is not null then
    select * into v_previous_parent
    from public.subjects s
    where s.id = v_subject.parent_subject_id;
  end if;

  if p_parent_subject_id is not null then
    select * into v_next_parent
    from public.subjects s
    where s.id = p_parent_subject_id
    for update;

    if v_next_parent.id is null then
      raise exception 'Parent subject not found';
    end if;

    if v_next_parent.id = v_subject.id then
      raise exception 'A subject cannot be its own parent';
    end if;

    if v_next_parent.project_id is distinct from v_subject.project_id then
      raise exception 'Parent subject must belong to the same project';
    end if;

    if exists (
      with recursive ancestors as (
        select s.id, s.parent_subject_id
        from public.subjects s
        where s.id = v_next_parent.id
        union all
        select parent.id, parent.parent_subject_id
        from public.subjects parent
        join ancestors a on a.parent_subject_id = parent.id
      )
      select 1
      from ancestors
      where id = v_subject.id
    ) then
      raise exception 'Parent relation would create a cycle';
    end if;
  end if;

  if v_subject.parent_subject_id is not distinct from p_parent_subject_id then
    return jsonb_build_object(
      'changed', false,
      'subject_id', v_subject.id,
      'previous_parent_subject_id', v_subject.parent_subject_id,
      'next_parent_subject_id', p_parent_subject_id
    );
  end if;

  if p_parent_subject_id is not null then
    select coalesce(max(s.parent_child_order), 0) + 1
      into v_next_child_order
    from public.subjects s
    where s.parent_subject_id = p_parent_subject_id;
  end if;

  update public.subjects s
  set
    parent_subject_id = p_parent_subject_id,
    parent_linked_at = case when p_parent_subject_id is null then null else v_now end,
    parent_child_order = case when p_parent_subject_id is null then null else v_next_child_order end,
    updated_at = v_now
  where s.id = v_subject.id
  returning * into v_subject;

  if v_previous_parent.id is not null and v_previous_parent.id is distinct from p_parent_subject_id then
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
      'subject_parent_removed',
      'user',
      coalesce(v_actor_label, 'Utilisateur'),
      auth.uid(),
      'Parent supprimé',
      format('a retiré le sujet #%s des parents', coalesce(v_previous_parent.subject_number::text, '')),
      jsonb_build_object(
        'action', 'removed',
        'field', 'parent',
        'before', jsonb_build_object('parent_subject_id', v_previous_parent.id),
        'after', jsonb_build_object('parent_subject_id', null),
        'counterpart_subject_id', v_previous_parent.id,
        'counterpart_subject_number', v_previous_parent.subject_number,
        'counterpart_subject_title', v_previous_parent.title,
        'result_label', format('a retiré le sujet %s des parents', coalesce(v_previous_parent.title, concat('#', coalesce(v_previous_parent.subject_number::text, '')))),
        'display', jsonb_build_object('result_label', format('a retiré le sujet %s des parents', coalesce(v_previous_parent.title, concat('#', coalesce(v_previous_parent.subject_number::text, ''))))),
        'actor_person_id', v_actor_person_id
      )
    );

    insert into public.subject_history (
      project_id, subject_id, analysis_run_id, document_id, subject_observation_id,
      event_type, actor_type, actor_label, actor_user_id, title, description, event_payload
    )
    values (
      v_previous_parent.project_id,
      v_previous_parent.id,
      v_previous_parent.analysis_run_id,
      v_previous_parent.document_id,
      null,
      'subject_child_removed',
      'user',
      coalesce(v_actor_label, 'Utilisateur'),
      auth.uid(),
      'Sous-sujet supprimé',
      format('a retiré le sujet #%s des sous-sujets', coalesce(v_subject.subject_number::text, '')),
      jsonb_build_object(
        'action', 'removed',
        'field', 'child',
        'before', jsonb_build_object('child_subject_id', v_subject.id),
        'after', jsonb_build_object('child_subject_id', null),
        'counterpart_subject_id', v_subject.id,
        'counterpart_subject_number', v_subject.subject_number,
        'counterpart_subject_title', v_subject.title,
        'result_label', format('a retiré le sujet %s des sous-sujets', coalesce(v_subject.title, concat('#', coalesce(v_subject.subject_number::text, '')))),
        'display', jsonb_build_object('result_label', format('a retiré le sujet %s des sous-sujets', coalesce(v_subject.title, concat('#', coalesce(v_subject.subject_number::text, ''))))),
        'actor_person_id', v_actor_person_id
      )
    );
  end if;

  if v_next_parent.id is not null and v_next_parent.id is distinct from coalesce(v_previous_parent.id, '00000000-0000-0000-0000-000000000000'::uuid) then
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
      'subject_parent_added',
      'user',
      coalesce(v_actor_label, 'Utilisateur'),
      auth.uid(),
      'Parent ajouté',
      format('a ajouté le sujet #%s comme parent', coalesce(v_next_parent.subject_number::text, '')),
      jsonb_build_object(
        'action', 'added',
        'field', 'parent',
        'before', jsonb_build_object('parent_subject_id', v_previous_parent.id),
        'after', jsonb_build_object('parent_subject_id', v_next_parent.id),
        'counterpart_subject_id', v_next_parent.id,
        'counterpart_subject_number', v_next_parent.subject_number,
        'counterpart_subject_title', v_next_parent.title,
        'result_label', format('a ajouté le sujet %s comme parent', coalesce(v_next_parent.title, concat('#', coalesce(v_next_parent.subject_number::text, '')))),
        'display', jsonb_build_object('result_label', format('a ajouté le sujet %s comme parent', coalesce(v_next_parent.title, concat('#', coalesce(v_next_parent.subject_number::text, ''))))),
        'actor_person_id', v_actor_person_id
      )
    );

    insert into public.subject_history (
      project_id, subject_id, analysis_run_id, document_id, subject_observation_id,
      event_type, actor_type, actor_label, actor_user_id, title, description, event_payload
    )
    values (
      v_next_parent.project_id,
      v_next_parent.id,
      v_next_parent.analysis_run_id,
      v_next_parent.document_id,
      null,
      'subject_child_added',
      'user',
      coalesce(v_actor_label, 'Utilisateur'),
      auth.uid(),
      'Sous-sujet ajouté',
      format('a ajouté le sujet #%s comme sous-sujet', coalesce(v_subject.subject_number::text, '')),
      jsonb_build_object(
        'action', 'added',
        'field', 'child',
        'before', jsonb_build_object('child_subject_id', null),
        'after', jsonb_build_object('child_subject_id', v_subject.id),
        'counterpart_subject_id', v_subject.id,
        'counterpart_subject_number', v_subject.subject_number,
        'counterpart_subject_title', v_subject.title,
        'result_label', format('a ajouté le sujet %s comme sous-sujet', coalesce(v_subject.title, concat('#', coalesce(v_subject.subject_number::text, '')))),
        'display', jsonb_build_object('result_label', format('a ajouté le sujet %s comme sous-sujet', coalesce(v_subject.title, concat('#', coalesce(v_subject.subject_number::text, ''))))),
        'actor_person_id', v_actor_person_id
      )
    );
  end if;

  return jsonb_build_object(
    'changed', true,
    'subject_id', v_subject.id,
    'previous_parent_subject_id', v_previous_parent.id,
    'next_parent_subject_id', p_parent_subject_id,
    'parent_child_order', v_subject.parent_child_order,
    'parent_linked_at', v_subject.parent_linked_at
  );
end;
$$;

grant execute on function public.set_subject_parent_with_history(uuid, uuid, uuid) to authenticated;
revoke all on function public.set_subject_parent_with_history(uuid, uuid, uuid) from public;

create or replace function public.set_subject_blocked_by_relation_with_history(
  p_subject_id uuid,
  p_blocked_by_subject_id uuid,
  p_should_exist boolean,
  p_actor_person_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_source public.subjects;
  v_target public.subjects;
  v_actor_person_id uuid;
  v_actor_label text;
  v_exists boolean := false;
  v_now timestamptz := now();
begin
  if p_subject_id is null or p_blocked_by_subject_id is null then
    raise exception 'Both p_subject_id and p_blocked_by_subject_id are required';
  end if;

  if p_subject_id = p_blocked_by_subject_id then
    raise exception 'A subject cannot block itself';
  end if;

  select * into v_source from public.subjects s where s.id = p_subject_id for update;
  select * into v_target from public.subjects s where s.id = p_blocked_by_subject_id for update;

  if v_source.id is null or v_target.id is null then
    raise exception 'Source and target subjects must exist';
  end if;

  if v_source.project_id is distinct from v_target.project_id then
    raise exception 'Blocked_by relation must use subjects from the same project';
  end if;

  if not public.can_access_project_subject_conversation(v_source.project_id) then
    raise exception 'Insufficient rights to update blocked_by relation';
  end if;

  v_actor_person_id := coalesce(p_actor_person_id, public.current_person_id());
  if v_actor_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  if not exists (select 1 from public.directory_people p where p.id = v_actor_person_id) then
    raise exception 'Invalid actor person id';
  end if;

  v_actor_label := public.subject_history_actor_label(v_actor_person_id);

  select exists (
    select 1
    from public.subject_links l
    where l.source_subject_id = p_subject_id
      and l.target_subject_id = p_blocked_by_subject_id
      and l.link_type = 'blocked_by'
  ) into v_exists;

  if p_should_exist then
    if exists (
      select 1
      from public.subject_links l
      where l.source_subject_id = p_blocked_by_subject_id
        and l.target_subject_id = p_subject_id
        and l.link_type = 'blocked_by'
    ) then
      raise exception 'This relation is invalid because reverse blocked_by already exists';
    end if;

    if v_exists then
      return jsonb_build_object('changed', false, 'exists', true);
    end if;

    insert into public.subject_links (project_id, source_subject_id, target_subject_id, link_type, created_at)
    values (v_source.project_id, p_subject_id, p_blocked_by_subject_id, 'blocked_by', v_now)
    on conflict do nothing;

    insert into public.subject_history (
      project_id, subject_id, analysis_run_id, document_id, subject_observation_id,
      event_type, actor_type, actor_label, actor_user_id, title, description, event_payload
    )
    values (
      v_source.project_id,
      v_source.id,
      v_source.analysis_run_id,
      v_source.document_id,
      null,
      'subject_blocked_by_added',
      'user',
      coalesce(v_actor_label, 'Utilisateur'),
      auth.uid(),
      'Relation bloqué par ajoutée',
      format('a ajouté le sujet #%s dans « bloqué par »', coalesce(v_target.subject_number::text, '')),
      jsonb_build_object(
        'action', 'added',
        'field', 'blocked_by',
        'before', jsonb_build_object('linked', false),
        'after', jsonb_build_object('linked', true),
        'counterpart_subject_id', v_target.id,
        'counterpart_subject_number', v_target.subject_number,
        'counterpart_subject_title', v_target.title,
        'result_label', format('a ajouté le sujet %s dans « bloqué par »', coalesce(v_target.title, concat('#', coalesce(v_target.subject_number::text, '')))),
        'display', jsonb_build_object('result_label', format('a ajouté le sujet %s dans « bloqué par »', coalesce(v_target.title, concat('#', coalesce(v_target.subject_number::text, ''))))),
        'actor_person_id', v_actor_person_id
      )
    );

    insert into public.subject_history (
      project_id, subject_id, analysis_run_id, document_id, subject_observation_id,
      event_type, actor_type, actor_label, actor_user_id, title, description, event_payload
    )
    values (
      v_target.project_id,
      v_target.id,
      v_target.analysis_run_id,
      v_target.document_id,
      null,
      'subject_blocking_for_added',
      'user',
      coalesce(v_actor_label, 'Utilisateur'),
      auth.uid(),
      'Relation bloquant pour ajoutée',
      format('a ajouté le sujet #%s dans « bloquant pour »', coalesce(v_source.subject_number::text, '')),
      jsonb_build_object(
        'action', 'added',
        'field', 'blocking_for',
        'before', jsonb_build_object('linked', false),
        'after', jsonb_build_object('linked', true),
        'counterpart_subject_id', v_source.id,
        'counterpart_subject_number', v_source.subject_number,
        'counterpart_subject_title', v_source.title,
        'result_label', format('a ajouté le sujet %s dans « bloquant pour »', coalesce(v_source.title, concat('#', coalesce(v_source.subject_number::text, '')))),
        'display', jsonb_build_object('result_label', format('a ajouté le sujet %s dans « bloquant pour »', coalesce(v_source.title, concat('#', coalesce(v_source.subject_number::text, ''))))),
        'actor_person_id', v_actor_person_id
      )
    );

    return jsonb_build_object('changed', true, 'exists', true);
  end if;

  if not v_exists then
    return jsonb_build_object('changed', false, 'exists', false);
  end if;

  delete from public.subject_links l
  where l.source_subject_id = p_subject_id
    and l.target_subject_id = p_blocked_by_subject_id
    and l.link_type = 'blocked_by';

  insert into public.subject_history (
    project_id, subject_id, analysis_run_id, document_id, subject_observation_id,
    event_type, actor_type, actor_label, actor_user_id, title, description, event_payload
  )
  values (
    v_source.project_id,
    v_source.id,
    v_source.analysis_run_id,
    v_source.document_id,
    null,
    'subject_blocked_by_removed',
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    auth.uid(),
    'Relation bloqué par supprimée',
    format('a retiré le sujet #%s de « bloqué par »', coalesce(v_target.subject_number::text, '')),
    jsonb_build_object(
      'action', 'removed',
      'field', 'blocked_by',
      'before', jsonb_build_object('linked', true),
      'after', jsonb_build_object('linked', false),
      'counterpart_subject_id', v_target.id,
      'counterpart_subject_number', v_target.subject_number,
      'counterpart_subject_title', v_target.title,
      'result_label', format('a retiré le sujet %s de « bloqué par »', coalesce(v_target.title, concat('#', coalesce(v_target.subject_number::text, '')))),
      'display', jsonb_build_object('result_label', format('a retiré le sujet %s de « bloqué par »', coalesce(v_target.title, concat('#', coalesce(v_target.subject_number::text, ''))))),
      'actor_person_id', v_actor_person_id
    )
  );

  insert into public.subject_history (
    project_id, subject_id, analysis_run_id, document_id, subject_observation_id,
    event_type, actor_type, actor_label, actor_user_id, title, description, event_payload
  )
  values (
    v_target.project_id,
    v_target.id,
    v_target.analysis_run_id,
    v_target.document_id,
    null,
    'subject_blocking_for_removed',
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    auth.uid(),
    'Relation bloquant pour supprimée',
    format('a retiré le sujet #%s de « bloquant pour »', coalesce(v_source.subject_number::text, '')),
    jsonb_build_object(
      'action', 'removed',
      'field', 'blocking_for',
      'before', jsonb_build_object('linked', true),
      'after', jsonb_build_object('linked', false),
      'counterpart_subject_id', v_source.id,
      'counterpart_subject_number', v_source.subject_number,
      'counterpart_subject_title', v_source.title,
      'result_label', format('a retiré le sujet %s de « bloquant pour »', coalesce(v_source.title, concat('#', coalesce(v_source.subject_number::text, '')))),
      'display', jsonb_build_object('result_label', format('a retiré le sujet %s de « bloquant pour »', coalesce(v_source.title, concat('#', coalesce(v_source.subject_number::text, ''))))),
      'actor_person_id', v_actor_person_id
    )
  );

  return jsonb_build_object('changed', true, 'exists', false);
end;
$$;

grant execute on function public.set_subject_blocked_by_relation_with_history(uuid, uuid, boolean, uuid) to authenticated;
revoke all on function public.set_subject_blocked_by_relation_with_history(uuid, uuid, boolean, uuid) from public;

comment on function public.set_subject_parent_with_history(uuid, uuid, uuid) is
  'Met à jour la relation parent/sous-sujet et écrit les événements double-sens atomiques dans subject_history.';

comment on function public.set_subject_blocked_by_relation_with_history(uuid, uuid, boolean, uuid) is
  'Ajoute/supprime une relation blocked_by et écrit les événements double-sens atomiques dans subject_history.';
