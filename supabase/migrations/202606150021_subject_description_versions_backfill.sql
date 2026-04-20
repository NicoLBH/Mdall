-- Backfill a first historical description version for legacy subjects.
-- Timestamp choice: reuse subjects.updated_at when available (closest signal of current persisted description),
-- otherwise fallback to subjects.created_at and finally now().

insert into public.subject_description_versions (
  project_id,
  subject_id,
  description_markdown,
  actor_user_id,
  actor_person_id,
  created_at
)
select
  s.project_id,
  s.id as subject_id,
  s.description as description_markdown,
  s.created_by as actor_user_id,
  dp.id as actor_person_id,
  coalesce(s.updated_at, s.created_at, now()) as created_at
from public.subjects s
left join lateral (
  select p.id
  from public.directory_people p
  where p.linked_user_id = s.created_by
  order by p.created_at asc nulls last, p.id asc
  limit 1
) dp on true
where nullif(trim(coalesce(s.description, '')), '') is not null
  and not exists (
    select 1
    from public.subject_description_versions v
    where v.subject_id = s.id
  );
