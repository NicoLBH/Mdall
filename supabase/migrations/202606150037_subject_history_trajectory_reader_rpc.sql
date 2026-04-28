-- Reader RPC for trajectory view.
-- Goal: provide a stable, front-friendly read model for lifecycle/relation events across many subjects.

create or replace function public.list_subject_history_for_trajectory(
  p_project_id uuid,
  p_subject_ids uuid[]
)
returns table (
  id uuid,
  project_id uuid,
  subject_id uuid,
  event_type text,
  created_at timestamptz,
  event_payload jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    h.id,
    h.project_id,
    h.subject_id,
    h.event_type,
    h.created_at,
    h.event_payload
  from public.subject_history h
  where h.project_id = p_project_id
    and h.subject_id = any(coalesce(p_subject_ids, array[]::uuid[]))
    and h.event_type in (
      'subject_created',
      'subject_closed',
      'subject_reopened',
      'subject_rejected',
      'review_rejected',
      'subject_invalidated',
      'subject_parent_added',
      'subject_parent_removed',
      'subject_child_added',
      'subject_child_removed',
      'subject_blocked_by_added',
      'subject_blocked_by_removed',
      'subject_blocking_for_added',
      'subject_blocking_for_removed',
      'subject_objectives_changed'
    )
  order by h.created_at asc;
$$;

comment on function public.list_subject_history_for_trajectory(uuid, uuid[]) is
  'Trajectory reader for many subjects. Returns canonical event_payload from subject_history for lifecycle and relation rendering.';
