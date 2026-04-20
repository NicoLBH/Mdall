-- Align first description version actor with subject provenance (system vs user).
-- This migration corrects legacy backfilled rows where actor_user_id was set from subjects.created_by,
-- which can incorrectly show a human author for an AI/system-generated initial description.

with version_rank as (
  select
    v.id,
    v.subject_id,
    row_number() over (partition by v.subject_id order by v.created_at asc, v.id asc) as rn
  from public.subject_description_versions v
),
first_subject_history as (
  select distinct on (h.subject_id)
    h.subject_id,
    lower(coalesce(h.actor_type, '')) as actor_type,
    h.actor_user_id
  from public.subject_history h
  where h.subject_id is not null
  order by h.subject_id, h.created_at asc, h.id asc
),
actor_person_map as (
  select distinct on (dp.linked_user_id)
    dp.linked_user_id as actor_user_id,
    dp.id as actor_person_id
  from public.directory_people dp
  where dp.linked_user_id is not null
  order by dp.linked_user_id, dp.created_at asc nulls last, dp.id asc
),
candidates as (
  select
    v.id,
    fs.actor_type,
    fs.actor_user_id as history_actor_user_id,
    apm.actor_person_id as history_actor_person_id
  from version_rank vr
  join public.subject_description_versions v on v.id = vr.id
  left join first_subject_history fs on fs.subject_id = vr.subject_id
  left join actor_person_map apm on apm.actor_user_id = fs.actor_user_id
  where vr.rn = 1
)
update public.subject_description_versions v
set
  actor_user_id = case
    when c.actor_type = 'system' then null
    else c.history_actor_user_id
  end,
  actor_person_id = case
    when c.actor_type = 'system' then null
    else c.history_actor_person_id
  end
from candidates c
where v.id = c.id
  and (
    v.actor_user_id is distinct from case when c.actor_type = 'system' then null else c.history_actor_user_id end
    or v.actor_person_id is distinct from case when c.actor_type = 'system' then null else c.history_actor_person_id end
  );
