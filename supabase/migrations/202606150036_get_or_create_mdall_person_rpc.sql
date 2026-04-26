-- Lightweight RPC for mention system: ensure Mdall system person exists and return its id.

create or replace function public.get_or_create_mdall_person()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_person_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

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
  returning id into v_person_id;

  return jsonb_build_object(
    'person_id', v_person_id,
    'label', 'Mdall',
    'email', 'mdall@system.local'
  );
end;
$$;

grant execute on function public.get_or_create_mdall_person() to authenticated;
revoke all on function public.get_or_create_mdall_person() from public;
