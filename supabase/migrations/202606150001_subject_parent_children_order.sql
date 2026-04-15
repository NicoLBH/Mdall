alter table if exists public.subjects
  add column if not exists parent_linked_at timestamptz,
  add column if not exists parent_child_order integer;

comment on column public.subjects.parent_linked_at is
  'Date de rattachement du sujet à son sujet parent (lien hiérarchique).';

comment on column public.subjects.parent_child_order is
  'Position ordonnée du sujet dans la liste des sous-sujets de son parent.';

update public.subjects s
set parent_linked_at = coalesce(s.parent_linked_at, s.updated_at, s.created_at, now())
where s.parent_subject_id is not null
  and s.parent_linked_at is null;

with ranked as (
  select
    s.id,
    row_number() over (
      partition by s.parent_subject_id
      order by s.parent_linked_at asc nulls last, s.created_at asc nulls last, s.id asc
    ) as next_parent_child_order
  from public.subjects s
  where s.parent_subject_id is not null
)
update public.subjects s
set parent_child_order = ranked.next_parent_child_order
from ranked
where ranked.id = s.id
  and s.parent_subject_id is not null
  and s.parent_child_order is null;

create index if not exists idx_subjects_parent_subject_order
  on public.subjects(parent_subject_id, parent_child_order);

create or replace function public.reorder_subject_children(
  p_parent_subject_id uuid,
  p_child_subject_ids uuid[]
)
returns table(child_subject_id uuid, parent_child_order integer)
language plpgsql
as $$
declare
  v_parent_project_id uuid;
  v_expected_count integer;
  v_distinct_count integer;
begin
  if p_parent_subject_id is null then
    raise exception 'p_parent_subject_id is required';
  end if;

  if p_child_subject_ids is null or array_length(p_child_subject_ids, 1) is null then
    raise exception 'p_child_subject_ids is required';
  end if;

  select s.project_id
  into v_parent_project_id
  from public.subjects s
  where s.id = p_parent_subject_id;

  if v_parent_project_id is null then
    raise exception 'Parent subject not found: %', p_parent_subject_id;
  end if;

  select array_length(p_child_subject_ids, 1),
         cardinality(array(select distinct x from unnest(p_child_subject_ids) as x))
  into v_expected_count, v_distinct_count;

  if v_expected_count <> v_distinct_count then
    raise exception 'p_child_subject_ids contains duplicates';
  end if;

  if exists (
    select 1
    from public.subjects s
    where s.id = any(p_child_subject_ids)
      and (s.parent_subject_id is distinct from p_parent_subject_id or s.project_id is distinct from v_parent_project_id)
  ) then
    raise exception 'All children must belong to the same parent and project';
  end if;

  if (
    select count(*)
    from public.subjects s
    where s.id = any(p_child_subject_ids)
      and s.parent_subject_id = p_parent_subject_id
      and s.project_id = v_parent_project_id
  ) <> v_expected_count then
    raise exception 'Some child subjects are missing or invalid';
  end if;

  return query
  with ordered as (
    select child_id, ord::integer as next_order
    from unnest(p_child_subject_ids) with ordinality as t(child_id, ord)
  ),
  updated as (
    update public.subjects s
    set parent_child_order = ordered.next_order
    from ordered
    where s.id = ordered.child_id
      and s.parent_subject_id = p_parent_subject_id
    returning s.id, s.parent_child_order
  )
  select updated.id, updated.parent_child_order
  from updated
  order by updated.parent_child_order asc;
end;
$$;
