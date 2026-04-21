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
  v_person_id uuid;
  v_next_title text := trim(coalesce(p_title, ''));
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

  update public.subjects s
  set
    title = v_next_title,
    normalized_title = v_next_title,
    updated_at = now()
  where s.id = v_subject.id
  returning * into v_subject;

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
