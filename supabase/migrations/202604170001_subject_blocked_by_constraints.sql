create unique index if not exists idx_subject_links_blocked_by_pair_unique
  on public.subject_links (
    project_id,
    least(source_subject_id, target_subject_id),
    greatest(source_subject_id, target_subject_id)
  )
  where link_type = 'blocked_by';

create or replace function public.validate_subject_blocked_by_link()
returns trigger
language plpgsql
as $$
declare
  v_source_project_id uuid;
  v_target_project_id uuid;
begin
  if new.link_type is distinct from 'blocked_by' then
    return new;
  end if;

  if new.source_subject_id is null or new.target_subject_id is null then
    raise exception 'source_subject_id and target_subject_id are required for blocked_by links';
  end if;

  if new.source_subject_id = new.target_subject_id then
    raise exception 'A subject cannot block itself';
  end if;

  select s.project_id into v_source_project_id
  from public.subjects s
  where s.id = new.source_subject_id;

  select s.project_id into v_target_project_id
  from public.subjects s
  where s.id = new.target_subject_id;

  if v_source_project_id is null or v_target_project_id is null then
    raise exception 'Both source and target subjects must exist';
  end if;

  if v_source_project_id is distinct from v_target_project_id then
    raise exception 'Blocked_by relation must use subjects from the same project';
  end if;

  if new.project_id is distinct from v_source_project_id then
    raise exception 'project_id must match source subject project_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_subject_blocked_by_link on public.subject_links;
create trigger trg_validate_subject_blocked_by_link
before insert or update on public.subject_links
for each row execute function public.validate_subject_blocked_by_link();
